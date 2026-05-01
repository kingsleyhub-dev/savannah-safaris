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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          add_ons: Json
          addons_cents: number
          amount_kes_cents: number | null
          check_in: string
          check_out: string
          cleaning_cents: number
          created_at: string
          currency: string
          discount_cents: number
          discount_percent: number
          furnished_option: string | null
          guest_country: string | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          guests: number
          id: string
          nights: number
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          promo_code: string | null
          property_id: string | null
          rental_type: string
          status: string
          subtotal_cents: number
          total_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          add_ons?: Json
          addons_cents?: number
          amount_kes_cents?: number | null
          check_in: string
          check_out: string
          cleaning_cents?: number
          created_at?: string
          currency?: string
          discount_cents?: number
          discount_percent?: number
          furnished_option?: string | null
          guest_country?: string | null
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          guests?: number
          id?: string
          nights: number
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          promo_code?: string | null
          property_id?: string | null
          rental_type?: string
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          add_ons?: Json
          addons_cents?: number
          amount_kes_cents?: number | null
          check_in?: string
          check_out?: string
          cleaning_cents?: number
          created_at?: string
          currency?: string
          discount_cents?: number
          discount_percent?: number
          furnished_option?: string | null
          guest_country?: string | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          guests?: number
          id?: string
          nights?: number
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          promo_code?: string | null
          property_id?: string | null
          rental_type?: string
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      content_fields: {
        Row: {
          created_at: string
          draft_value: string | null
          field_type: Database["public"]["Enums"]["field_type"]
          id: string
          key: string
          label: string
          published_at: string | null
          published_value: string | null
          section_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_value?: string | null
          field_type?: Database["public"]["Enums"]["field_type"]
          id?: string
          key: string
          label: string
          published_at?: string | null
          published_value?: string | null
          section_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_value?: string | null
          field_type?: Database["public"]["Enums"]["field_type"]
          id?: string
          key?: string
          label?: string
          published_at?: string | null
          published_value?: string | null
          section_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_fields_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string | null
          created_at: string
          filename: string
          gallery_category: string | null
          gallery_sort_order: number
          id: string
          is_published: boolean
          kind: Database["public"]["Enums"]["media_kind"]
          mime_type: string | null
          public_url: string
          published_at: string | null
          show_in_gallery: boolean
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          filename: string
          gallery_category?: string | null
          gallery_sort_order?: number
          id?: string
          is_published?: boolean
          kind: Database["public"]["Enums"]["media_kind"]
          mime_type?: string | null
          public_url: string
          published_at?: string | null
          show_in_gallery?: boolean
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          filename?: string
          gallery_category?: string | null
          gallery_sort_order?: number
          id?: string
          is_published?: boolean
          kind?: Database["public"]["Enums"]["media_kind"]
          mime_type?: string | null
          public_url?: string
          published_at?: string | null
          show_in_gallery?: boolean
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      pages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          booking_id: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          provider: string
          provider_reference: string | null
          provider_request: Json | null
          provider_response: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          provider: string
          provider_reference?: string | null
          provider_request?: Json | null
          provider_response?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          provider?: string
          provider_reference?: string | null
          provider_request?: Json | null
          provider_response?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          amenities_inherit: boolean
          bathrooms: number
          bedrooms: number
          block_label: string | null
          created_at: string
          description: string | null
          hero_image_url: string | null
          hero_video_url: string | null
          id: string
          is_active: boolean
          location: string
          max_guests: number
          name: string
          price_monthly_furnished_kes_cents: number | null
          price_monthly_kes_cents: number | null
          price_nightly_kes_cents: number | null
          price_per_night_usd: number | null
          slug: string
          sort_order: number
          supports_furnished_option: boolean
          supports_monthly: boolean
          supports_nightly: boolean
          tagline: string | null
          updated_at: string
        }
        Insert: {
          amenities_inherit?: boolean
          bathrooms?: number
          bedrooms?: number
          block_label?: string | null
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          hero_video_url?: string | null
          id?: string
          is_active?: boolean
          location: string
          max_guests?: number
          name: string
          price_monthly_furnished_kes_cents?: number | null
          price_monthly_kes_cents?: number | null
          price_nightly_kes_cents?: number | null
          price_per_night_usd?: number | null
          slug: string
          sort_order?: number
          supports_furnished_option?: boolean
          supports_monthly?: boolean
          supports_nightly?: boolean
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          amenities_inherit?: boolean
          bathrooms?: number
          bedrooms?: number
          block_label?: string | null
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          hero_video_url?: string | null
          id?: string
          is_active?: boolean
          location?: string
          max_guests?: number
          name?: string
          price_monthly_furnished_kes_cents?: number | null
          price_monthly_kes_cents?: number | null
          price_nightly_kes_cents?: number | null
          price_per_night_usd?: number | null
          slug?: string
          sort_order?: number
          supports_furnished_option?: boolean
          supports_monthly?: boolean
          supports_nightly?: boolean
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      receipt_downloads: {
        Row: {
          booking_id: string
          downloaded_at: string
          id: string
          user_id: string
        }
        Insert: {
          booking_id: string
          downloaded_at?: string
          id?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          downloaded_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          page_id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          page_id: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          page_id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      sync_admin_roles: {
        Args: { _email: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "editor"
      field_type:
        | "text"
        | "textarea"
        | "richtext"
        | "image"
        | "video"
        | "url"
        | "number"
      media_kind: "image" | "video"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["super_admin", "admin", "editor"],
      field_type: [
        "text",
        "textarea",
        "richtext",
        "image",
        "video",
        "url",
        "number",
      ],
      media_kind: ["image", "video"],
    },
  },
} as const
