export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_number: string
          account_title: string
          bank_name: string
          created_at: string
          iban: string | null
          id: string
          instructions: string
          is_active: boolean
        }
        Insert: {
          account_number: string
          account_title: string
          bank_name: string
          created_at?: string
          iban?: string | null
          id?: string
          instructions?: string
          is_active?: boolean
        }
        Update: {
          account_number?: string
          account_title?: string
          bank_name?: string
          created_at?: string
          iban?: string | null
          id?: string
          instructions?: string
          is_active?: boolean
        }
        Relationships: []
      }
      item_pickups: {
        Row: {
          actual_paid_pkr: number | null
          created_at: string | null
          id: string
          order_item_id: string
          picked_at: string | null
          pickup_proof_name: string | null
          pickup_proof_url: string | null
          receipt_name: string | null
          receipt_url: string | null
          rider_id: string
          updated_at: string | null
        }
        Insert: {
          actual_paid_pkr?: number | null
          created_at?: string | null
          id?: string
          order_item_id: string
          picked_at?: string | null
          pickup_proof_name?: string | null
          pickup_proof_url?: string | null
          receipt_name?: string | null
          receipt_url?: string | null
          rider_id: string
          updated_at?: string | null
        }
        Update: {
          actual_paid_pkr?: number | null
          created_at?: string | null
          id?: string
          order_item_id?: string
          picked_at?: string | null
          pickup_proof_name?: string | null
          pickup_proof_url?: string | null
          receipt_name?: string | null
          receipt_url?: string | null
          rider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_pickups_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          channel: string
          created_at: string
          dedupe_key: string | null
          error: string | null
          event_type: string | null
          id: string
          notification_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          dedupe_key?: string | null
          error?: string | null
          event_type?: string | null
          id?: string
          notification_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          error?: string | null
          event_type?: string | null
          id?: string
          notification_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          categories: Json
          created_at: string
          in_app_enabled: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
          whatsapp_enabled: boolean
        }
        Insert: {
          categories?: Json
          created_at?: string
          in_app_enabled?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
          whatsapp_enabled?: boolean
        }
        Update: {
          categories?: Json
          created_at?: string
          in_app_enabled?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          dedupe_key: string | null
          event_type: string | null
          id: string
          is_read: boolean | null
          link_url: string | null
          message: string
          metadata: Json
          order_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dedupe_key?: string | null
          event_type?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message: string
          metadata?: Json
          order_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dedupe_key?: string | null
          event_type?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message?: string
          metadata?: Json
          order_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string
          id: string
          order_id: string
          rider_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by: string
          id?: string
          order_id: string
          rider_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string
          id?: string
          order_id?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_url: string
          id: string
          order_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_url: string
          id?: string
          order_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          order_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_expense_receipts: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          order_id: string
          rider_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          order_id: string
          rider_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          order_id?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_expense_receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_expense_receipts_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_financial_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          new_value: Json | null
          note: string | null
          old_value: Json | null
          order_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          new_value?: Json | null
          note?: string | null
          old_value?: Json | null
          order_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          new_value?: Json | null
          note?: string | null
          old_value?: Json | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_financial_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          image_url: string | null
          item_data: Json
          item_type: string
          manager_feedback: string | null
          manager_price_pkr: number | null
          order_id: string
          pickup_latitude: number | null
          pickup_longitude: number | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          item_data: Json
          item_type: string
          manager_feedback?: string | null
          manager_price_pkr?: number | null
          order_id: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          item_data?: Json
          item_type?: string
          manager_feedback?: string | null
          manager_price_pkr?: number | null
          order_id?: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payment_proofs: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          order_id: string
          submitted_amount_pkr: number | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          order_id: string
          submitted_amount_pkr?: number | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          order_id?: string
          submitted_amount_pkr?: number | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payment_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          id: string
          order_id: string
          status: string
          timestamp: string | null
        }
        Insert: {
          id?: string
          order_id: string
          status: string
          timestamp?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          status?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          additional_charges: number | null
          charges_description: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          customer_balance_pkr: number | null
          customer_submitted_amount_pkr: number
          delivered_at: string | null
          delivery_address: string
          delivery_charges: number
          delivery_charges_set_at: string | null
          delivery_charges_set_by: string | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          delivery_payment_confirmed_at: string | null
          delivery_payment_confirmed_by: string | null
          delivery_payment_proof_name: string | null
          delivery_payment_proof_url: string | null
          delivery_payment_status: string
          delivery_payment_submitted_at: string | null
          delivery_proof_name: string | null
          delivery_proof_url: string | null
          delivery_type: string
          expense_notes: string | null
          expense_rejection_reason: string | null
          expense_status: string | null
          expense_submitted_at: string | null
          expense_submitted_by: string | null
          expense_verified_at: string | null
          expense_verified_by: string | null
          id: string
          manager_feedback: string | null
          order_total_pkr: number | null
          paid_amount_pkr: number
          payment_confirmed_at: string | null
          payment_confirmed_by: string | null
          payment_proof_name: string | null
          payment_proof_url: string | null
          payment_rejection_reason: string | null
          payment_status: string | null
          payment_submitted_at: string | null
          payment_verification: string
          payment_verified_at: string | null
          payment_verified_by: string | null
          ready_for_delivery_at: string | null
          ready_for_delivery_by: string | null
          refund_account_bank: string | null
          refund_account_number: string | null
          refund_account_title: string | null
          refund_completed_at: string | null
          refund_completed_by: string | null
          refund_method: string | null
          refund_notes: string | null
          refund_proof_name: string | null
          refund_proof_url: string | null
          refund_reference: string | null
          refund_status: string
          shopping_expense_pkr: number | null
          status: string
          total_weight_kg: number | null
          user_id: string
        }
        Insert: {
          additional_charges?: number | null
          charges_description?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer_balance_pkr?: number | null
          customer_submitted_amount_pkr?: number
          delivered_at?: string | null
          delivery_address: string
          delivery_charges?: number
          delivery_charges_set_at?: string | null
          delivery_charges_set_by?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_payment_confirmed_at?: string | null
          delivery_payment_confirmed_by?: string | null
          delivery_payment_proof_name?: string | null
          delivery_payment_proof_url?: string | null
          delivery_payment_status?: string
          delivery_payment_submitted_at?: string | null
          delivery_proof_name?: string | null
          delivery_proof_url?: string | null
          delivery_type?: string
          expense_notes?: string | null
          expense_rejection_reason?: string | null
          expense_status?: string | null
          expense_submitted_at?: string | null
          expense_submitted_by?: string | null
          expense_verified_at?: string | null
          expense_verified_by?: string | null
          id?: string
          manager_feedback?: string | null
          order_total_pkr?: number | null
          paid_amount_pkr?: number
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_proof_name?: string | null
          payment_proof_url?: string | null
          payment_rejection_reason?: string | null
          payment_status?: string | null
          payment_submitted_at?: string | null
          payment_verification?: string
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          ready_for_delivery_at?: string | null
          ready_for_delivery_by?: string | null
          refund_account_bank?: string | null
          refund_account_number?: string | null
          refund_account_title?: string | null
          refund_completed_at?: string | null
          refund_completed_by?: string | null
          refund_method?: string | null
          refund_notes?: string | null
          refund_proof_name?: string | null
          refund_proof_url?: string | null
          refund_reference?: string | null
          refund_status?: string
          shopping_expense_pkr?: number | null
          status?: string
          total_weight_kg?: number | null
          user_id: string
        }
        Update: {
          additional_charges?: number | null
          charges_description?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer_balance_pkr?: number | null
          customer_submitted_amount_pkr?: number
          delivered_at?: string | null
          delivery_address?: string
          delivery_charges?: number
          delivery_charges_set_at?: string | null
          delivery_charges_set_by?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_payment_confirmed_at?: string | null
          delivery_payment_confirmed_by?: string | null
          delivery_payment_proof_name?: string | null
          delivery_payment_proof_url?: string | null
          delivery_payment_status?: string
          delivery_payment_submitted_at?: string | null
          delivery_proof_name?: string | null
          delivery_proof_url?: string | null
          delivery_type?: string
          expense_notes?: string | null
          expense_rejection_reason?: string | null
          expense_status?: string | null
          expense_submitted_at?: string | null
          expense_submitted_by?: string | null
          expense_verified_at?: string | null
          expense_verified_by?: string | null
          id?: string
          manager_feedback?: string | null
          order_total_pkr?: number | null
          paid_amount_pkr?: number
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_proof_name?: string | null
          payment_proof_url?: string | null
          payment_rejection_reason?: string | null
          payment_status?: string | null
          payment_submitted_at?: string | null
          payment_verification?: string
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          ready_for_delivery_at?: string | null
          ready_for_delivery_by?: string | null
          refund_account_bank?: string | null
          refund_account_number?: string | null
          refund_account_title?: string | null
          refund_completed_at?: string | null
          refund_completed_by?: string | null
          refund_method?: string | null
          refund_notes?: string | null
          refund_proof_name?: string | null
          refund_proof_url?: string | null
          refund_reference?: string | null
          refund_status?: string
          shopping_expense_pkr?: number | null
          status?: string
          total_weight_kg?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      pricing_bundles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          items_allowed: number
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          items_allowed: number
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          items_allowed?: number
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id: string
          phone: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          device_label: string | null
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string | null
          platform: string
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string
          device_label?: string | null
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh?: string | null
          platform: string
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string
          device_label?: string | null
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string | null
          platform?: string
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rider_locations: {
        Row: {
          id: string
          latitude: number
          longitude: number
          rider_id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          latitude: number
          longitude: number
          rider_id: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          latitude?: number
          longitude?: number
          rider_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_details: {
        Row: {
          alternative_contact: string | null
          cnic_number: string | null
          created_at: string | null
          id: string
          id_card_name: string | null
          id_card_url: string | null
          permanent_address: string | null
          updated_at: string | null
          user_id: string
          utility_bill_name: string | null
          utility_bill_url: string | null
        }
        Insert: {
          alternative_contact?: string | null
          cnic_number?: string | null
          created_at?: string | null
          id?: string
          id_card_name?: string | null
          id_card_url?: string | null
          permanent_address?: string | null
          updated_at?: string | null
          user_id: string
          utility_bill_name?: string | null
          utility_bill_url?: string | null
        }
        Update: {
          alternative_contact?: string | null
          cnic_number?: string | null
          created_at?: string | null
          id?: string
          id_card_name?: string | null
          id_card_url?: string | null
          permanent_address?: string | null
          updated_at?: string | null
          user_id?: string
          utility_bill_name?: string | null
          utility_bill_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_contacts: {
        Row: {
          created_at: string
          last_inbound_at: string
          phone: string
        }
        Insert: {
          created_at?: string
          last_inbound_at?: string
          phone: string
        }
        Update: {
          created_at?: string
          last_inbound_at?: string
          phone?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          created_at: string
          customer_user_id: string | null
          display_name: string | null
          id: string
          last_inbound_at: string | null
          last_message_at: string
          last_message_preview: string | null
          phone: string
          unread_count: number
        }
        Insert: {
          created_at?: string
          customer_user_id?: string | null
          display_name?: string | null
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string
          last_message_preview?: string | null
          phone: string
          unread_count?: number
        }
        Update: {
          created_at?: string
          customer_user_id?: string | null
          display_name?: string | null
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string
          last_message_preview?: string | null
          phone?: string
          unread_count?: number
        }
        Relationships: []
      }
      whatsapp_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          direction: string
          error: string | null
          id: string
          media_filename: string | null
          media_id: string | null
          media_mime: string | null
          msg_type: string
          sent_by: string | null
          status: string
          status_updated_at: string | null
          wa_message_id: string | null
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          error?: string | null
          id?: string
          media_filename?: string | null
          media_id?: string | null
          media_mime?: string | null
          msg_type?: string
          sent_by?: string | null
          status?: string
          status_updated_at?: string | null
          wa_message_id?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          media_filename?: string | null
          media_id?: string | null
          media_mime?: string | null
          msg_type?: string
          sent_by?: string | null
          status?: string
          status_updated_at?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_save_user_details: {
        Args: {
          p_address: string
          p_alternative: string
          p_bill_name: string
          p_bill_url: string
          p_cnic: string
          p_full_name: string
          p_id_name: string
          p_id_url: string
          p_phone: string
          p_user_id: string
        }
        Returns: undefined
      }
      assign_admin_created_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      can_read_legacy_pickup_proof: {
        Args: { p_path: string }
        Returns: boolean
      }
      can_read_order_attachment: { Args: { p_path: string }; Returns: boolean }
      check_signup_contact: {
        Args: { p_email: string; p_phone: string }
        Returns: Json
      }
      get_customer_ids_for_rider_orders: {
        Args: { _rider_id: string }
        Returns: string[]
      }
      get_rider_ids_for_user_orders: {
        Args: { _user_id: string }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_ready_for_delivery: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      normalize_profile_phone: { Args: { raw: string }; Returns: string }
      reopen_shopping_expense: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: undefined
      }
      review_order_item: {
        Args: {
          p_feedback: string
          p_item_id: string
          p_manager_price: number
          p_status: string
        }
        Returns: undefined
      }
      rider_assigned_to_order: {
        Args: { _order_id: string; _rider_id: string }
        Returns: boolean
      }
      save_refund_account: {
        Args: {
          p_bank: string
          p_number: string
          p_order_id: string
          p_title: string
        }
        Returns: undefined
      }
      submit_customer_payment: {
        Args: {
          p_amount: number
          p_file_name: string
          p_file_path: string
          p_order_id: string
        }
        Returns: undefined
      }
      submit_item_purchase: {
        Args: {
          p_amount: number
          p_item_id: string
          p_pickup_name: string
          p_pickup_path: string
          p_receipt_name: string
          p_receipt_path: string
        }
        Returns: boolean
      }
      submit_shopping_expense: {
        Args: { p_amount: number; p_notes?: string; p_order_id: string }
        Returns: undefined
      }
      update_order_status: {
        Args: { p_new_status: string; p_order_id: string }
        Returns: undefined
      }
      update_refund_status: {
        Args: {
          p_method?: string
          p_notes?: string
          p_order_id: string
          p_proof_name?: string
          p_proof_url?: string
          p_reference?: string
          p_status: string
        }
        Returns: undefined
      }
      user_owns_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      verify_order_payment: {
        Args: {
          p_approved: boolean
          p_order_id: string
          p_paid_amount: number
          p_reason: string
        }
        Returns: undefined
      }
      verify_shopping_expense: {
        Args: { p_approved: boolean; p_order_id: string; p_reason?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "rider" | "customer" | "manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "rider", "customer", "manager"],
    },
  },
} as const
