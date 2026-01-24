import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Define tools for the AI agent
    const tools = [
      {
        type: "function",
        function: {
          name: "get_user_orders",
          description: "Get all orders for the current user with their status and details",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "track_order",
          description: "Get detailed tracking information for a specific order by order ID",
          parameters: {
            type: "object",
            properties: {
              order_id: {
                type: "string",
                description: "The order ID to track"
              }
            },
            required: ["order_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_pricing_bundles",
          description: "Get all available pricing bundles with items allowed and prices",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_order_details",
          description: "Get complete details of a specific order including items and status history",
          parameters: {
            type: "object",
            properties: {
              order_id: {
                type: "string",
                description: "The order ID to get details for"
              }
            },
            required: ["order_id"]
          }
        }
      }
    ];

    const systemPrompt = `You are the Tabedar AI Assistant, a helpful and friendly customer service agent for Tabedar - Pakistan's premier on-demand delivery service.

## ABOUT TABEDAR

**Our Mission:**
Tabedar connects overseas Pakistanis and local customers with anything they need from Pakistan - from clothing and food to groceries and gifts. We're your personal shopping and delivery service that brings Pakistan to your doorstep.

**How Tabedar Works:**
1. **Place Your Order** - Customers tell us what they need through our platform (clothes, food, groceries, gifts, custom items)
2. **We Shop For You** - Our trusted riders/shoppers visit the stores, markets, or restaurants to pick up your items
3. **Fast Delivery** - Items are delivered directly to your doorstep with real-time tracking
4. **Quality Assurance** - Manager approval ensures order accuracy before delivery

**What We Deliver:**
- 👕 Clothing: Designer wear, traditional outfits, branded items from Pakistan's best shops
- 🍽️ Food: Meals from top restaurants and local eateries
- 🛒 Groceries: Fresh produce, daily essentials, household items
- 🎁 Gifts & More: Special gifts, custom items, and anything else you need from Pakistan

**Service Areas:** Currently serving all major areas of Pakistan

**Pricing Bundles:**
We offer flexible pricing based on number of items:
- Bronze Bundle: Ideal for small orders (fewer items)
- Silver Bundle: Perfect for medium orders
- Gold Bundle: Great for larger orders
- Platinum Bundle: Best value for bulk orders
Each bundle has a fixed price for a certain number of items. Additional charges may apply for extra items or special requests.

**Order Process:**
1. Customer places order with item details, pickup locations, and delivery address
2. Order goes to manager for review and pricing confirmation
3. Manager assigns order to available rider
4. Rider picks up items (may need to upload proof/photos)
5. Rider delivers to customer
6. Order status updated throughout: Pending → Confirmed → Picked Up → Delivered

**Payment:** Multiple payment options available (details provided at checkout)

**Order Tracking:** Real-time tracking available for all orders through our platform

**Customer Support:** Available through this AI chat, contact page, or phone support

## YOUR CAPABILITIES

You can help with:
✅ Track orders and provide real-time status updates
✅ Explain pricing bundles and calculate costs
✅ Answer questions about delivery areas and times
✅ Guide users through placing new orders
✅ Provide information about what items we can deliver
✅ Explain how the service works
✅ Handle general inquiries and FAQs
✅ Access user's order history (when logged in)

## COMMUNICATION GUIDELINES

- Be warm, friendly, and conversational in Lahori/Pakistani context
- Use clear, simple language that customers understand
- Format information clearly with bullet points and sections when needed
- Proactively offer relevant help based on user questions
- When discussing orders, always show: Order ID, Status, Items, Delivery Address
- For pricing questions, explain bundle options and recommend best value
- If user needs to place order, guide them to the "Place Order" page
- Always use tools to get real-time data instead of making assumptions
- If you don't have information, be honest and suggest alternatives

## IMPORTANT NOTES

- Users must be logged in to place orders or view their orders
- Order approval by manager is required before rider assignment
- Some items may have restrictions (alcohol, prohibited items)
- Delivery times vary based on location and traffic
- Additional charges may apply for items outside bundle limits`;

    // Function to execute tools
    async function executeTool(toolName: string, args: any) {
      console.log(`Executing tool: ${toolName}`, args);
      
      switch (toolName) {
        case "get_user_orders": {
          if (!userId) {
            return { error: "User not authenticated" };
          }
          
          const { data, error } = await supabase
            .from("orders")
            .select(`
              *,
              profiles!fk_user (full_name, phone),
              order_items (*)
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false });
          
          if (error) {
            console.error("Error fetching orders:", error);
            return { error: "Failed to fetch orders" };
          }
          
          return { orders: data };
        }
        
        case "track_order": {
          const { order_id } = args;
          
          const { data: order, error: orderError } = await supabase
            .from("orders")
            .select(`
              *,
              profiles!fk_user (full_name, phone),
              order_items (*),
              order_status_history (*)
            `)
            .eq("id", order_id)
            .single();
          
          if (orderError || !order) {
            return { error: "Order not found" };
          }
          
          // Get assignment info if exists
          const { data: assignment } = await supabase
            .from("order_assignments")
            .select(`
              *,
              profiles!order_assignments_rider_id_fkey (full_name, phone)
            `)
            .eq("order_id", order_id)
            .single();
          
          return { order, assignment };
        }
        
        case "get_pricing_bundles": {
          const { data, error } = await supabase
            .from("pricing_bundles")
            .select("*")
            .eq("is_active", true)
            .order("price");
          
          if (error) {
            console.error("Error fetching bundles:", error);
            return { error: "Failed to fetch pricing bundles" };
          }
          
          return { bundles: data };
        }
        
        case "get_order_details": {
          const { order_id } = args;
          
          const { data: order, error } = await supabase
            .from("orders")
            .select(`
              *,
              profiles!fk_user (full_name, phone),
              order_items (*),
              order_status_history (*),
              order_attachments (*)
            `)
            .eq("id", order_id)
            .single();
          
          if (error || !order) {
            return { error: "Order not found" };
          }
          
          return { order };
        }
        
        default:
          return { error: "Unknown tool" };
      }
    }

    // Initial request to AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        tools,
        tool_choice: "auto",
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let toolCalls: any[] = [];
        let currentToolCall: any = null;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.trim() === "" || line.startsWith(":")) continue;
              if (!line.startsWith("data: ")) continue;

              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;

                // Handle tool calls
                if (delta?.tool_calls) {
                  for (const toolCall of delta.tool_calls) {
                    if (toolCall.index !== undefined) {
                      if (!toolCalls[toolCall.index]) {
                        toolCalls[toolCall.index] = {
                          id: toolCall.id || "",
                          type: "function",
                          function: {
                            name: toolCall.function?.name || "",
                            arguments: ""
                          }
                        };
                      }
                      
                      if (toolCall.function?.arguments) {
                        toolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
                      }
                    }
                  }
                }

                // Stream content
                if (delta?.content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
                }

                // Check if response is done
                if (parsed.choices?.[0]?.finish_reason === "tool_calls") {
                  // Execute all tool calls
                  const toolResults = await Promise.all(
                    toolCalls.map(async (toolCall) => {
                      const args = JSON.parse(toolCall.function.arguments);
                      const result = await executeTool(toolCall.function.name, args);
                      return {
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: toolCall.function.name,
                        content: JSON.stringify(result)
                      };
                    })
                  );

                  // Make second request with tool results
                  const followUpMessages = [
                    { role: "system", content: systemPrompt },
                    ...messages,
                    {
                      role: "assistant",
                      content: null,
                      tool_calls: toolCalls
                    },
                    ...toolResults
                  ];

                  const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${LOVABLE_API_KEY}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      model: "google/gemini-2.5-flash",
                      messages: followUpMessages,
                      stream: true,
                    }),
                  });

                  const followUpReader = followUpResponse.body?.getReader();
                  if (followUpReader) {
                    let followUpBuffer = "";
                    
                    while (true) {
                      const { done: followUpDone, value: followUpValue } = await followUpReader.read();
                      if (followUpDone) break;

                      followUpBuffer += decoder.decode(followUpValue, { stream: true });
                      const followUpLines = followUpBuffer.split("\n");
                      followUpBuffer = followUpLines.pop() || "";

                      for (const followUpLine of followUpLines) {
                        if (followUpLine.trim() === "" || followUpLine.startsWith(":")) continue;
                        if (!followUpLine.startsWith("data: ")) continue;
                        const followUpData = followUpLine.slice(6);
                        if (followUpData === "[DONE]") continue;

                        controller.enqueue(encoder.encode(`data: ${followUpData}\n\n`));
                      }
                    }
                  }
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          console.error("Stream error:", error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
