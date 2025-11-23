-- Create order_attachments table for rider proof uploads
CREATE TABLE IF NOT EXISTS public.order_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on order_attachments
ALTER TABLE public.order_attachments ENABLE ROW LEVEL SECURITY;

-- Add feedback field to orders table for manager feedback
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS manager_feedback TEXT,
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- RLS policies for order_attachments
CREATE POLICY "Riders can insert attachments for assigned orders"
ON public.order_attachments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'rider'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.order_assignments
    WHERE order_id = order_attachments.order_id
    AND rider_id = auth.uid()
  )
);

CREATE POLICY "Users can view attachments for their orders"
ON public.order_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_attachments.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Riders can view attachments for assigned orders"
ON public.order_attachments
FOR SELECT
USING (
  has_role(auth.uid(), 'rider'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.order_assignments
    WHERE order_id = order_attachments.order_id
    AND rider_id = auth.uid()
  )
);

CREATE POLICY "Admins and managers can view all attachments"
ON public.order_attachments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- RLS policies for managers
CREATE POLICY "Managers can view all orders"
ON public.orders
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update orders"
ON public.orders
FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can view all order items"
ON public.order_items
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can view all order status history"
ON public.order_status_history
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- Update order_assignments policies for managers
CREATE POLICY "Managers can view all order assignments"
ON public.order_assignments
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));