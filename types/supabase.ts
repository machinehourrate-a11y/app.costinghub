






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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id: string
          name: string
          properties: Json
          "subCategory"?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          properties?: Json
          "subCategory"?: string | null
          user_id?: string
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
          name: string
          parameters: Json
          formula: string | null
          user_id: string
        }
        Insert: {
          compatibleMachineTypes: string[]
          created_at?: string
          group: string
          id: string
          name: string
          parameters: Json
          formula?: string | null
          user_id: string
        }
        Update: {
          compatibleMachineTypes?: string[]
          created_at?: string
          group?: string
          id?: string
          name?: string
          parameters?: Json
          formula?: string | null
          user_id?: string
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
          address: string | null
          calcNextNumber: number | null
          calcPrefix: string | null
          calculations_created_this_period: number
          companyName: string | null
          currency: string | null
          email: string
          id: string
          name: string
          phone: string | null
          plan_id: string | null
          subscription_status: string | null
        }
        Insert: {
          address?: string | null
          calcNextNumber?: number | null
          calcPrefix?: string | null
          calculations_created_this_period?: number
          companyName?: string | null
          currency?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
          plan_id?: string | null
          subscription_status?: string | null
        }
        Update: {
          address?: string | null
          calcNextNumber?: number | null
          calcPrefix?: string | null
          calculations_created_this_period?: number
          companyName?: string | null
          currency?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          plan_id?: string | null
          subscription_status?: string | null
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
          user_id: string
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
          user_id: string
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
          user_id?: string
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