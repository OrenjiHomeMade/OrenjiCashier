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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          created_at: string
          email: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          updated_at?: string
          user_id: string
          username?: string
        }
        Update: {
          created_at?: string
          email?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      business_expense: {
        Row: {
          business_expense_id: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          expense_amount: number
          expense_category: string
          expense_description: string | null
          expense_reference: string | null
          expense_time: string
          expense_type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          business_expense_id?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          expense_amount: number
          expense_category: string
          expense_description?: string | null
          expense_reference?: string | null
          expense_time?: string
          expense_type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          business_expense_id?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          expense_amount?: number
          expense_category?: string
          expense_description?: string | null
          expense_reference?: string | null
          expense_time?: string
          expense_type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_expense_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_expense_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      business_settlement: {
        Row: {
          business_settlement_id: number
          created_at: string | null
          deficit_covered: number | null
          deleted_at: string | null
          deleted_by: string | null
          profit_distributed: number | null
          profit_retained: number | null
          sales_ingredient_cost: number
          sales_labor_cost: number
          sales_margin: number
          sales_packaging_cost: number
          sales_revenue: number
          sales_utility_cost: number
          settled_ingredient_cost: number | null
          settled_labor_cost: number | null
          settled_packaging_cost: number | null
          settled_utility_cost: number | null
          settlement_additional_selector: Json | null
          settlement_end: string | null
          settlement_name: string
          settlement_start: string | null
          settlement_status: string
          total_additional_expenses: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          business_settlement_id?: number
          created_at?: string | null
          deficit_covered?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          profit_distributed?: number | null
          profit_retained?: number | null
          sales_ingredient_cost: number
          sales_labor_cost: number
          sales_margin: number
          sales_packaging_cost: number
          sales_revenue: number
          sales_utility_cost: number
          settled_ingredient_cost?: number | null
          settled_labor_cost?: number | null
          settled_packaging_cost?: number | null
          settled_utility_cost?: number | null
          settlement_additional_selector?: Json | null
          settlement_end?: string | null
          settlement_name: string
          settlement_start?: string | null
          settlement_status?: string
          total_additional_expenses?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          business_settlement_id?: number
          created_at?: string | null
          deficit_covered?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          profit_distributed?: number | null
          profit_retained?: number | null
          sales_ingredient_cost?: number
          sales_labor_cost?: number
          sales_margin?: number
          sales_packaging_cost?: number
          sales_revenue?: number
          sales_utility_cost?: number
          settled_ingredient_cost?: number | null
          settled_labor_cost?: number | null
          settled_packaging_cost?: number | null
          settled_utility_cost?: number | null
          settlement_additional_selector?: Json | null
          settlement_end?: string | null
          settlement_name?: string
          settlement_start?: string | null
          settlement_status?: string
          total_additional_expenses?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_settlement_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_settlement_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      business_settlement_expense: {
        Row: {
          allocated_amount: number
          allocation_note: string | null
          business_expense_id: number
          business_settlement_expense_id: number
          business_settlement_id: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allocated_amount: number
          allocation_note?: string | null
          business_expense_id: number
          business_settlement_expense_id: number
          business_settlement_id: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allocated_amount?: number
          allocation_note?: string | null
          business_expense_id?: number
          business_settlement_expense_id?: number
          business_settlement_id?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_settlement_expense_business_expense_id_fkey"
            columns: ["business_expense_id"]
            isOneToOne: false
            referencedRelation: "business_expense"
            referencedColumns: ["business_expense_id"]
          },
          {
            foreignKeyName: "business_settlement_expense_business_expense_id_fkey"
            columns: ["business_expense_id"]
            isOneToOne: false
            referencedRelation: "business_expense_summary"
            referencedColumns: ["business_expense_id"]
          },
          {
            foreignKeyName: "business_settlement_expense_business_settlement_id_fkey"
            columns: ["business_settlement_id"]
            isOneToOne: false
            referencedRelation: "business_settlement"
            referencedColumns: ["business_settlement_id"]
          },
          {
            foreignKeyName: "business_settlement_expense_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_settlement_expense_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_stock: {
        Row: {
          product_id: number
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          product_id: number
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          product_id?: number
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          cost_ingredient: number
          cost_labor: number
          cost_packaging: number
          cost_utilities: number
          created_at: string
          deleted_at: string | null
          description: string | null
          is_active: boolean
          product_category: string | null
          product_code: string
          product_id: number
          product_name: string
          product_price: number
          updated_at: string
        }
        Insert: {
          cost_ingredient?: number
          cost_labor?: number
          cost_packaging?: number
          cost_utilities?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          is_active?: boolean
          product_category?: string | null
          product_code: string
          product_id?: number
          product_name: string
          product_price: number
          updated_at?: string
        }
        Update: {
          cost_ingredient?: number
          cost_labor?: number
          cost_packaging?: number
          cost_utilities?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          is_active?: boolean
          product_category?: string | null
          product_code?: string
          product_id?: number
          product_name?: string
          product_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          adjustment_type: string
          created_at: string
          note: string | null
          product_id: number
          quantity: number
          stock_adjustment_id: number
        }
        Insert: {
          adjustment_type: string
          created_at?: string
          note?: string | null
          product_id: number
          quantity: number
          stock_adjustment_id?: number
        }
        Update: {
          adjustment_type?: string
          created_at?: string
          note?: string | null
          product_id?: number
          quantity?: number
          stock_adjustment_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      transaction_items: {
        Row: {
          business_settlement_id: number | null
          created_at: string
          deleted_at: string | null
          product_id: number
          quantity: number
          subtotal: number | null
          total_cogs: number | null
          transaction_id: number
          transaction_item_id: number
          unit_cost_ingredient: number
          unit_cost_labor: number
          unit_cost_packaging: number
          unit_cost_utilities: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          business_settlement_id?: number | null
          created_at?: string
          deleted_at?: string | null
          product_id: number
          quantity: number
          subtotal?: number | null
          total_cogs?: number | null
          transaction_id: number
          transaction_item_id?: number
          unit_cost_ingredient?: number
          unit_cost_labor?: number
          unit_cost_packaging?: number
          unit_cost_utilities?: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          business_settlement_id?: number | null
          created_at?: string
          deleted_at?: string | null
          product_id?: number
          quantity?: number
          subtotal?: number | null
          total_cogs?: number | null
          transaction_id?: number
          transaction_item_id?: number
          unit_cost_ingredient?: number
          unit_cost_labor?: number
          unit_cost_packaging?: number
          unit_cost_utilities?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_business_settlement_id_fkey"
            columns: ["business_settlement_id"]
            isOneToOne: false
            referencedRelation: "business_settlement"
            referencedColumns: ["business_settlement_id"]
          },
          {
            foreignKeyName: "transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      transactions: {
        Row: {
          cashier: string | null
          created_at: string
          deleted_at: string | null
          payment_method: string
          transaction_amount: number
          transaction_code: string
          transaction_id: number
          transaction_time: string
          updated_at: string
        }
        Insert: {
          cashier?: string | null
          created_at?: string
          deleted_at?: string | null
          payment_method: string
          transaction_amount: number
          transaction_code: string
          transaction_id?: number
          transaction_time?: string
          updated_at?: string
        }
        Update: {
          cashier?: string | null
          created_at?: string
          deleted_at?: string | null
          payment_method?: string
          transaction_amount?: number
          transaction_code?: string
          transaction_id?: number
          transaction_time?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      business_expense_summary: {
        Row: {
          allocated_amount: number | null
          business_expense_id: number | null
          created_at: string | null
          expense_amount: number | null
          expense_category: string | null
          expense_description: string | null
          expense_reference: string | null
          expense_time: string | null
          expense_type: string | null
          remaining_amount: number | null
          settlement_status: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_product_qty: {
        Args: {
          p_adjustment_quantity: number
          p_adjustment_type: string
          p_note?: string
          p_product_id: number
        }
        Returns: number
      }
      create_business_settlement: {
        Args: {
          p_settlement_additional_selector?: Json
          p_settlement_end?: string
          p_settlement_name: string
          p_settlement_start?: string
          p_transaction_item_ids?: number[]
        }
        Returns: {
          business_settlement_id: number
          created_at: string | null
          deficit_covered: number | null
          deleted_at: string | null
          deleted_by: string | null
          profit_distributed: number | null
          profit_retained: number | null
          sales_ingredient_cost: number
          sales_labor_cost: number
          sales_margin: number
          sales_packaging_cost: number
          sales_revenue: number
          sales_utility_cost: number
          settled_ingredient_cost: number | null
          settled_labor_cost: number | null
          settled_packaging_cost: number | null
          settled_utility_cost: number | null
          settlement_additional_selector: Json | null
          settlement_end: string | null
          settlement_name: string
          settlement_start: string | null
          settlement_status: string
          total_additional_expenses: number
          updated_at: string | null
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "business_settlement"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_transaction: {
        Args: {
          p_cashier: string
          p_items: Json
          p_payment_method: string
          p_transaction_amount: number
          p_transaction_code: string
          p_transaction_time: string
        }
        Returns: number
      }
      delete_business_settlement: {
        Args: { p_business_settlement_id: number }
        Returns: undefined
      }
      delete_transaction: {
        Args: { p_transaction_id: number }
        Returns: boolean
      }
      get_business_settlement_lists: {
        Args: never
        Returns: {
          business_settlement_id: number
          created_at: string
          product_category_count: number
          settlement_name: string
          settlement_status: string
          transaction_item_count: number
          updated_at: string
        }[]
      }
      get_email_by_username: { Args: { p_username: string }; Returns: string }
      get_flattened_transaction_items: {
        Args: {
          p_cashier?: string
          p_end_date?: string
          p_page?: number
          p_page_size?: number
          p_product_category?: string
          p_search?: string
          p_start_date?: string
        }
        Returns: {
          cashier: string
          item_created_at: string
          item_updated_at: string
          payment_method: string
          product_category: string
          product_id: number
          product_name: string
          quantity: number
          subtotal: number
          total_count: number
          transaction_amount: number
          transaction_code: string
          transaction_id: number
          transaction_item_id: number
          transaction_time: string
          unit_price: number
        }[]
      }
      get_product_categories: {
        Args: { p_is_active?: boolean }
        Returns: {
          product_category: string
        }[]
      }
      get_sales_summary: { Args: { report_date: string }; Returns: Json }
      get_transaction_items_settlement_breakdown: {
        Args: { p_group_by?: string; p_transaction_item_ids: number[] }
        Returns: {
          ingredient_cost: number
          labor_cost: number
          margin: number
          packaging_cost: number
          product_category: string
          product_id: number
          product_name: string
          quantity: number
          revenue: number
          total_cogs: number
          utility_cost: number
        }[]
      }
      get_transaction_items_settlement_summary: {
        Args: { p_transaction_item_ids: number[] }
        Returns: {
          sales_ingredient_cost: number
          sales_labor_cost: number
          sales_margin: number
          sales_packaging_cost: number
          sales_revenue: number
          sales_utility_cost: number
          selected_item_count: number
        }[]
      }
      get_transactions: {
        Args: {
          p_cashier?: string
          p_end_date?: string
          p_max_amount?: number
          p_min_amount?: number
          p_page?: number
          p_page_size?: number
          p_payment_method?: string
          p_search?: string
          p_start_date?: string
        }
        Returns: {
          cashier: string
          created_at: string
          items: Json
          payment_method: string
          total_count: number
          transaction_amount: number
          transaction_code: string
          transaction_id: number
          transaction_time: string
          updated_at: string
        }[]
      }
      is_username_available: { Args: { p_username: string }; Returns: boolean }
      sync_products: {
        Args: never
        Returns: {
          action: string
          created_at: string
          deleted_at: string
          description: string
          is_active: boolean
          product_category: string
          product_code: string
          product_id: number
          product_image: string
          product_name: string
          product_price: number
          updated_at: string
        }[]
      }
      update_business_settlement_expenses: {
        Args: { p_business_settlement_id: number; p_expenses: Json }
        Returns: {
          allocated_amount: number
          allocation_note: string | null
          business_expense_id: number
          business_settlement_expense_id: number
          business_settlement_id: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          updated_at: string | null
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "business_settlement_expense"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_business_settlement_result: {
        Args: {
          p_business_settlement_id: number
          p_deficit_covered: number
          p_profit_distributed: number
          p_profit_retained: number
          p_settled_ingredient_cost: number
          p_settled_labor_cost: number
          p_settled_packaging_cost: number
          p_settled_utility_cost: number
        }
        Returns: {
          business_settlement_id: number
          created_at: string | null
          deficit_covered: number | null
          deleted_at: string | null
          deleted_by: string | null
          profit_distributed: number | null
          profit_retained: number | null
          sales_ingredient_cost: number
          sales_labor_cost: number
          sales_margin: number
          sales_packaging_cost: number
          sales_revenue: number
          sales_utility_cost: number
          settled_ingredient_cost: number | null
          settled_labor_cost: number | null
          settled_packaging_cost: number | null
          settled_utility_cost: number | null
          settlement_additional_selector: Json | null
          settlement_end: string | null
          settlement_name: string
          settlement_start: string | null
          settlement_status: string
          total_additional_expenses: number
          updated_at: string | null
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "business_settlement"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_business_settlement_selection: {
        Args: {
          p_business_settlement_id: number
          p_settlement_additional_selector?: Json
          p_settlement_end: string
          p_settlement_start: string
          p_transaction_item_ids: number[]
        }
        Returns: {
          business_settlement_id: number
          created_at: string | null
          deficit_covered: number | null
          deleted_at: string | null
          deleted_by: string | null
          profit_distributed: number | null
          profit_retained: number | null
          sales_ingredient_cost: number
          sales_labor_cost: number
          sales_margin: number
          sales_packaging_cost: number
          sales_revenue: number
          sales_utility_cost: number
          settled_ingredient_cost: number | null
          settled_labor_cost: number | null
          settled_packaging_cost: number | null
          settled_utility_cost: number | null
          settlement_additional_selector: Json | null
          settlement_end: string | null
          settlement_name: string
          settlement_start: string | null
          settlement_status: string
          total_additional_expenses: number
          updated_at: string | null
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "business_settlement"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_business_settlement_status: {
        Args: { p_business_settlement_id: number; p_settlement_status: string }
        Returns: {
          business_settlement_id: number
          created_at: string | null
          deficit_covered: number | null
          deleted_at: string | null
          deleted_by: string | null
          profit_distributed: number | null
          profit_retained: number | null
          sales_ingredient_cost: number
          sales_labor_cost: number
          sales_margin: number
          sales_packaging_cost: number
          sales_revenue: number
          sales_utility_cost: number
          settled_ingredient_cost: number | null
          settled_labor_cost: number | null
          settled_packaging_cost: number | null
          settled_utility_cost: number | null
          settlement_additional_selector: Json | null
          settlement_end: string | null
          settlement_name: string
          settlement_start: string | null
          settlement_status: string
          total_additional_expenses: number
          updated_at: string | null
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "business_settlement"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_transaction_item_costs: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
