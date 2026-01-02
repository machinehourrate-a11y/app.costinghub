
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Added calculation_shares table definition
      calculation_shares: {
        Row: {
          created_at: string
          id: string
          calculation_id: string
          shared_with_email: string
          shared_by_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          calculation_id: string
          shared_with_email: string
          shared_by_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          calculation_id?: string
          shared_with_email?: string
          shared_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculation_shares_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculation_shares_shared_by_user_id_fkey"
            columns: ["shared_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      calculations: {
        Row: {
          created_at: string
          id: string
          inputs: Json
          results: Json | null
          status: 'draft' | 'final';
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          inputs: Json
          results?: Json | null
          status: 'draft' | 'final';
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inputs?: Json
          results?: Json | null
          status?: 'draft' | 'final';
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      documentation_content: {
        Row: {
          content: string
          created_at: string
          id: string
          image_caption: string
          image_url: string | null
          step: number
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id: string
          image_caption: string
          image_url?: string | null
          step: number
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_caption?: string
          image_url?: string | null
          step?: number
          title?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          feature_requests: string | null
          id: string
          suggested_changes: string | null
          usage_duration: string
          usage_experience: string
          user_email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_requests?: string | null
          id?: string
          suggested_changes?: string | null
          usage_duration: string
          usage_experience: string
          user_email: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_requests?: string | null
          id?: string
          suggested_changes?: string | null
          usage_duration?: string
          usage_experience?: string
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          additionalAxis: string
          brand: string
          model: string
          created_at: string
          hourlyRate: number
          id: string
          machineType: string
          name: string
          powerKw: number
          user_id: string | null
          xAxis: number
          yAxis: number
          zAxis: number
        }
        Insert: {
          additionalAxis: string
          brand: string
          model: string
          created_at?: string
          hourlyRate: number
          id: string
          machineType: string
          name: string
          powerKw: number
          user_id: string | null
          xAxis: number
          yAxis: number
          zAxis: number
        }
        Update: {
          additionalAxis?: string
          brand?: string
          model?: string
          created_at?: string
          hourlyRate?: number
          id?: string
          machineType?: string
          name?: string
          powerKw?: number
          user_id?: string | null
          xAxis?: number
          yAxis?: number
          zAxis?: number
        }
        Relationships: [
          {
            foreignKeyName: "machines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      materials: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          properties: Json
          "subCategory": string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id: string
          name: string
          properties: Json
          "subCategory"?: string | null
          user_id: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          properties?: Json
          "subCategory"?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      processes: {
        Row: {
          compatibleMachineTypes: string[]
          created_at: string
          group: string
          id: string
          imageUrl: string | null
          name: string
          parameters: Json
          formula: string | null
          user_id: string | null
        }
        Insert: {
          compatibleMachineTypes: string[]
          created_at?: string
          group: string
          id: string
          imageUrl?: string | null
          name: string
          parameters: Json
          formula?: string | null
          user_id: string | null
        }
        Update: {
          compatibleMachineTypes?: string[]
          created_at?: string
          group?: string
          id?: string
          imageUrl?: string | null
          name?: string
          parameters?: Json
          formula?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          address_line1: string | null
          calcNextNumber: number | null
          calcPrefix: string | null
          calculations_created_this_period: number
          city: string | null
          companyName: string | null
          company_logo_url: string | null
          country: string | null
          email: string
          id: string
          name: string
          phone: string | null
          phone_country_code: string | null
          plan_id: string | null
          postal_code: string | null
          state: string | null
          subscription_status: string | null
          subscription_expires_on: string | null
          company_website: string | null
          industry: string | null
          company_size: string | null
          tax_id: string | null
        }
        Insert: {
          address_line1?: string | null
          calcNextNumber?: number | null
          calcPrefix?: string | null
          calculations_created_this_period?: number
          city?: string | null
          companyName?: string | null
          company_logo_url?: string | null
          country?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
          phone_country_code?: string | null
          plan_id?: string | null
          postal_code?: string | null
          state?: string | null
          subscription_status?: string | null
          subscription_expires_on?: string | null
          company_website?: string | null
          industry?: string | null
          company_size?: string | null
          tax_id?: string | null
        }
        Update: {
          address_line1?: string | null
          calcNextNumber?: number | null
          calcPrefix?: string | null
          calculations_created_this_period?: number
          city?: string | null
          companyName?: string | null
          company_logo_url?: string | null
          country?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          phone_country_code?: string | null
          plan_id?: string | null
          postal_code?: string | null
          state?: string | null
          subscription_status?: string | null
          subscription_expires_on?: string | null
          company_website?: string | null
          industry?: string | null
          company_size?: string | null
          tax_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          }
        ]
      }
      region_costs: {
        Row: {
          created_at: string
          currency: string
          id: string
          item_id: string
          item_type: "material" | "machine" | "tool"
          price: number
          region: string
          user_id: string
          valid_from: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          item_id: string
          item_type: "material" | "machine" | "tool"
          price: number
          region: string
          user_id: string
          valid_from: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          item_id?: string
          item_type?: "material" | "machine" | "tool"
          price?: number
          region?: string
          user_id?: string
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_costs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      region_currency_map: {
        Row: {
          created_at: string
          currency: string
          id: string
          region: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          region: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          region?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_currency_map_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subscription_plans: {
        Row: {
          calculation_limit: number
          created_at: string
          cta: string
          features: string[]
          id: string
          is_custom_price: boolean
          most_popular: boolean
          name: string
          period: "mo" | "yr" | ""
          prices: Json | null
        }
        Insert: {
          calculation_limit: number
          created_at?: string
          cta: string
          features: string[]
          id: string
          is_custom_price: boolean
          most_popular?: boolean
          name: string
          period: "mo" | "yr" | ""
          prices?: Json | null
        }
        Update: {
          calculation_limit?: number
          created_at?: string
          cta?: string
          features?: string[]
          id?: string
          is_custom_price?: boolean
          most_popular?: boolean
          name?: string
          period?: "mo" | "yr" | ""
          prices?: Json | null
        }
        Relationships: []
      }
      tools: {
        Row: {
          arborOrInsert: string
          brand: string
          model: string
          compatibleMachineTypes: string[]
          cornerRadius: number | null
          created_at: string
          cuttingSpeedVc: number | null
          diameter: number
          estimatedLife: number | null
          price: number | null
          feedPerTooth: number | null
          feedRate: number | null
          id: string
          material: string
          name: string
          numberOfTeeth: number | null
          speedRpm: number | null
          toolType: string
          user_id: string | null
        }
        Insert: {
          arborOrInsert: string
          brand: string
          model: string
          compatibleMachineTypes: string[]
          cornerRadius?: number | null
          created_at?: string
          cuttingSpeedVc?: number | null
          diameter: number
          estimatedLife?: number | null
          price?: number | null
          feedPerTooth?: number | null
          feedRate?: number | null
          id: string
          material: string
          name: string
          numberOfTeeth?: number | null
          speedRpm?: number | null
          toolType: string
          user_id: string | null
        }
        Update: {
          arborOrInsert?: string
          brand?: string
          model?: string
          compatibleMachineTypes?: string[]
          cornerRadius?: number | null
          created_at?: string
          cuttingSpeedVc?: number | null
          diameter?: number
          estimatedLife?: number | null
          price?: number | null
          feedPerTooth?: number | null
          feedRate?: number | null
          id?: string
          material?: string
          name?: string
          numberOfTeeth?: number | null
          speedRpm?: number | null
          toolType?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_subscribers_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          email: string
          company_name: string
          plan_name: string
          subscription_status: string
          calculation_count: number
          subscribed_on: string
          subscription_expires_on: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never