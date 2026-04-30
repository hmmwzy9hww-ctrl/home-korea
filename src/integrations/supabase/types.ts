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
      cities: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name_en: string
          name_ko: string
          name_mn: string
          name_ru: string
          name_vi: string
          name_zh: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id: string
          name_en?: string
          name_ko?: string
          name_mn?: string
          name_ru?: string
          name_vi?: string
          name_zh?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name_en?: string
          name_ko?: string
          name_mn?: string
          name_ru?: string
          name_vi?: string
          name_zh?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_options: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name_en: string
          name_ko: string
          name_mn: string
          name_ru: string
          name_vi: string
          name_zh: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id: string
          name_en?: string
          name_ko?: string
          name_mn?: string
          name_ru?: string
          name_vi?: string
          name_zh?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name_en?: string
          name_ko?: string
          name_mn?: string
          name_ru?: string
          name_vi?: string
          name_zh?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      listing_amenities: {
        Row: {
          created_at: string
          icon: string
          id: string
          name_en: string
          name_ko: string
          name_mn: string
          name_ru: string
          name_vi: string
          name_zh: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id: string
          name_en?: string
          name_ko?: string
          name_mn?: string
          name_ru?: string
          name_vi?: string
          name_zh?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name_en?: string
          name_ko?: string
          name_mn?: string
          name_ru?: string
          name_vi?: string
          name_zh?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          address: string
          address_translations: Json
          approval_status: string
          area: string
          area_translations: Json
          available_from: string
          bus_minutes: number
          bus_stop: string
          city: string
          created_at: number
          deposit: number
          description: string
          description_translations: Json
          featured: boolean
          floor: string
          id: string
          latitude: number | null
          longitude: number | null
          maintenance_fee: number
          maintenance_included: boolean | null
          messenger_url: string | null
          monthly_rent: number
          naver_map_url: string | null
          options: Json
          options_translations: Json
          payment_type: string
          photos: Json
          rejection_reason: string
          room_type: string
          size: number
          status: string
          submitted_by: string | null
          subway_minutes: number
          subway_station: string
          title: string
          title_translations: Json
        }
        Insert: {
          address?: string
          address_translations?: Json
          approval_status?: string
          area?: string
          area_translations?: Json
          available_from?: string
          bus_minutes?: number
          bus_stop?: string
          city: string
          created_at?: number
          deposit?: number
          description?: string
          description_translations?: Json
          featured?: boolean
          floor?: string
          id: string
          latitude?: number | null
          longitude?: number | null
          maintenance_fee?: number
          maintenance_included?: boolean | null
          messenger_url?: string | null
          monthly_rent?: number
          naver_map_url?: string | null
          options?: Json
          options_translations?: Json
          payment_type?: string
          photos?: Json
          rejection_reason?: string
          room_type: string
          size?: number
          status?: string
          submitted_by?: string | null
          subway_minutes?: number
          subway_station?: string
          title: string
          title_translations?: Json
        }
        Update: {
          address?: string
          address_translations?: Json
          approval_status?: string
          area?: string
          area_translations?: Json
          available_from?: string
          bus_minutes?: number
          bus_stop?: string
          city?: string
          created_at?: number
          deposit?: number
          description?: string
          description_translations?: Json
          featured?: boolean
          floor?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          maintenance_fee?: number
          maintenance_included?: boolean | null
          messenger_url?: string | null
          monthly_rent?: number
          naver_map_url?: string | null
          options?: Json
          options_translations?: Json
          payment_type?: string
          photos?: Json
          rejection_reason?: string
          room_type?: string
          size?: number
          status?: string
          submitted_by?: string | null
          subway_minutes?: number
          subway_station?: string
          title?: string
          title_translations?: Json
        }
        Relationships: []
      }
      payment_types: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name_en: string
          name_ko: string
          name_mn: string
          name_ru: string
          name_vi: string
          name_zh: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id: string
          name_en?: string
          name_ko?: string
          name_mn?: string
          name_ru?: string
          name_vi?: string
          name_zh?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name_en?: string
          name_ko?: string
          name_mn?: string
          name_ru?: string
          name_vi?: string
          name_zh?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_types: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name_en: string
          name_ko: string
          name_mn: string
          name_ru: string
          name_vi: string
          name_zh: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id: string
          name_en?: string
          name_ko?: string
          name_mn?: string
          name_ru?: string
          name_vi?: string
          name_zh?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name_en?: string
          name_ko?: string
          name_mn?: string
          name_ru?: string
          name_vi?: string
          name_zh?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          cover_image_url: string
          id: string
          text_overrides: Json
          updated_at: string
        }
        Insert: {
          cover_image_url?: string
          id?: string
          text_overrides?: Json
          updated_at?: string
        }
        Update: {
          cover_image_url?: string
          id?: string
          text_overrides?: Json
          updated_at?: string
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
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
