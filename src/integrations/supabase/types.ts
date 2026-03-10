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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          country: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          display_order: number | null
          id: string
          institution: string
          is_active: boolean
          liquidity_class: Database["public"]["Enums"]["liquidity_class"]
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          country?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          display_order?: number | null
          id?: string
          institution: string
          is_active?: boolean
          liquidity_class?: Database["public"]["Enums"]["liquidity_class"]
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          country?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          display_order?: number | null
          id?: string
          institution?: string
          is_active?: boolean
          liquidity_class?: Database["public"]["Enums"]["liquidity_class"]
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      balances: {
        Row: {
          account_id: string
          amount_aud: number
          amount_native: number
          balance_date: string
          created_at: string
          id: string
        }
        Insert: {
          account_id: string
          amount_aud: number
          amount_native: number
          balance_date: string
          created_at?: string
          id?: string
        }
        Update: {
          account_id?: string
          amount_aud?: number
          amount_native?: number
          balance_date?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_import_logs: {
        Row: {
          account_id: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          file_name: string
          id: string
          rows_duplicates: number
          rows_imported: number
          rows_total: number
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          file_name: string
          id?: string
          rows_duplicates?: number
          rows_imported?: number
          rows_total?: number
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          file_name?: string
          id?: string
          rows_duplicates?: number
          rows_imported?: number
          rows_total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_import_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      category_rules: {
        Row: {
          created_at: string
          id: string
          is_internal_transfer: boolean
          keyword: string
          l1_category: string
          l2_category: string | null
          needs_review: boolean
          priority: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal_transfer?: boolean
          keyword: string
          l1_category: string
          l2_category?: string | null
          needs_review?: boolean
          priority?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal_transfer?: boolean
          keyword?: string
          l1_category?: string
          l2_category?: string | null
          needs_review?: boolean
          priority?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fire_settings: {
        Row: {
          created_at: string
          fire_multiple: number
          id: string
          include_business: boolean
          include_crypto: boolean
          include_offset: boolean
          include_retirement: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fire_multiple?: number
          id?: string
          include_business?: boolean
          include_crypto?: boolean
          include_offset?: boolean
          include_retirement?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fire_multiple?: number
          id?: string
          include_business?: boolean
          include_crypto?: boolean
          include_offset?: boolean
          include_retirement?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          created_at: string
          from_currency: Database["public"]["Enums"]["currency_code"]
          id: string
          rate: number
          rate_date: string
          to_currency: Database["public"]["Enums"]["currency_code"]
        }
        Insert: {
          created_at?: string
          from_currency: Database["public"]["Enums"]["currency_code"]
          id?: string
          rate: number
          rate_date: string
          to_currency: Database["public"]["Enums"]["currency_code"]
        }
        Update: {
          created_at?: string
          from_currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          rate?: number
          rate_date?: string
          to_currency?: Database["public"]["Enums"]["currency_code"]
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          current_value: number | null
          description: string | null
          display_order: number | null
          id: string
          is_completed: boolean | null
          metric_config: Json | null
          metric_type: string
          target_date: string
          target_value: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_completed?: boolean | null
          metric_config?: Json | null
          metric_type: string
          target_date: string
          target_value: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_completed?: boolean | null
          metric_config?: Json | null
          metric_type?: string
          target_date?: string
          target_value?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      holdings: {
        Row: {
          account_id: string
          cost_basis_aud: number | null
          cost_basis_native: number | null
          created_at: string
          id: string
          name: string | null
          quantity: number
          symbol: string
          updated_at: string
        }
        Insert: {
          account_id: string
          cost_basis_aud?: number | null
          cost_basis_native?: number | null
          created_at?: string
          id?: string
          name?: string | null
          quantity?: number
          symbol: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          cost_basis_aud?: number | null
          cost_basis_native?: number | null
          created_at?: string
          id?: string
          name?: string | null
          quantity?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      liabilities: {
        Row: {
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          institution: string | null
          interest_rate: number | null
          is_active: boolean
          liability_type: Database["public"]["Enums"]["liability_type"]
          name: string
          offset_account_id: string | null
          original_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          institution?: string | null
          interest_rate?: number | null
          is_active?: boolean
          liability_type: Database["public"]["Enums"]["liability_type"]
          name: string
          offset_account_id?: string | null
          original_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          institution?: string | null
          interest_rate?: number | null
          is_active?: boolean
          liability_type?: Database["public"]["Enums"]["liability_type"]
          name?: string
          offset_account_id?: string | null
          original_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liabilities_offset_account_id_fkey"
            columns: ["offset_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      liability_balances: {
        Row: {
          balance: number
          balance_date: string
          created_at: string
          id: string
          liability_id: string
        }
        Insert: {
          balance: number
          balance_date: string
          created_at?: string
          id?: string
          liability_id: string
        }
        Update: {
          balance?: number
          balance_date?: string
          created_at?: string
          id?: string
          liability_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liability_balances_liability_id_fkey"
            columns: ["liability_id"]
            isOneToOne: false
            referencedRelation: "liabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_overrides: {
        Row: {
          created_at: string
          effective_from: string | null
          entity_key: string
          entity_type: string
          field_key: string
          id: string
          updated_at: string
          user_id: string
          value_json: Json
        }
        Insert: {
          created_at?: string
          effective_from?: string | null
          entity_key: string
          entity_type: string
          field_key: string
          id?: string
          updated_at?: string
          user_id: string
          value_json: Json
        }
        Update: {
          created_at?: string
          effective_from?: string | null
          entity_key?: string
          entity_type?: string
          field_key?: string
          id?: string
          updated_at?: string
          user_id?: string
          value_json?: Json
        }
        Relationships: []
      }
      mortgage_overrides: {
        Row: {
          created_at: string
          field_name: string
          field_value: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          field_name: string
          field_value: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          field_name?: string
          field_value?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prices: {
        Row: {
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          price: number
          price_date: string
          symbol: string
        }
        Insert: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          price: number
          price_date: string
          symbol: string
        }
        Update: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          price?: number
          price_date?: string
          symbol?: string
        }
        Relationships: []
      }
      projection_scenarios: {
        Row: {
          business_growth: number
          created_at: string
          crypto_return: number
          home_growth: number
          id: string
          inflation_rate: number
          is_default: boolean
          name: string
          savings_override: number | null
          shares_return: number
          updated_at: string
          user_id: string
        }
        Insert: {
          business_growth?: number
          created_at?: string
          crypto_return?: number
          home_growth?: number
          id?: string
          inflation_rate?: number
          is_default?: boolean
          name: string
          savings_override?: number | null
          shares_return?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          business_growth?: number
          created_at?: string
          crypto_return?: number
          home_growth?: number
          id?: string
          inflation_rate?: number
          is_default?: boolean
          name?: string
          savings_override?: number | null
          shares_return?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount_aud: number
          amount_native: number
          category: string | null
          counterparty: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          description: string | null
          id: string
          is_internal_transfer: boolean
          is_synthetic: boolean
          l1_category: string | null
          l2_category: string | null
          merchant: string | null
          needs_review: boolean
          source_account_name: string | null
          source_import_id: string | null
          tags: string[] | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount_aud: number
          amount_native: number
          category?: string | null
          counterparty?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          id?: string
          is_internal_transfer?: boolean
          is_synthetic?: boolean
          l1_category?: string | null
          l2_category?: string | null
          merchant?: string | null
          needs_review?: boolean
          source_account_name?: string | null
          source_import_id?: string | null
          tags?: string[] | null
          transaction_date: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount_aud?: number
          amount_native?: number
          category?: string | null
          counterparty?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          id?: string
          is_internal_transfer?: boolean
          is_synthetic?: boolean
          l1_category?: string | null
          l2_category?: string | null
          merchant?: string | null
          needs_review?: boolean
          source_account_name?: string | null
          source_import_id?: string | null
          tags?: string[] | null
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_source_import_id_fkey"
            columns: ["source_import_id"]
            isOneToOne: false
            referencedRelation: "bank_import_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      valuations: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          created_at: string
          id: string
          name: string
          notes: string | null
          user_id: string
          valuation_date: string
          value_aud: number
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          user_id: string
          valuation_date: string
          value_aud: number
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
          valuation_date?: string
          value_aud?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_account_owner: { Args: { account_id: string }; Returns: boolean }
      is_liability_owner: { Args: { liability_id: string }; Returns: boolean }
    }
    Enums: {
      account_type: "cash" | "investment" | "retirement" | "crypto" | "offset"
      asset_type: "home" | "business"
      currency_code: "AUD" | "USD" | "IDR"
      liability_type: "fixed_mortgage" | "variable_mortgage" | "loan"
      liquidity_class: "liquid" | "illiquid"
      transaction_type:
        | "income"
        | "expense"
        | "transfer"
        | "investment_buy"
        | "investment_sell"
        | "dividends_interest"
        | "fees"
        | "tax"
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
      account_type: ["cash", "investment", "retirement", "crypto", "offset"],
      asset_type: ["home", "business"],
      currency_code: ["AUD", "USD", "IDR"],
      liability_type: ["fixed_mortgage", "variable_mortgage", "loan"],
      liquidity_class: ["liquid", "illiquid"],
      transaction_type: [
        "income",
        "expense",
        "transfer",
        "investment_buy",
        "investment_sell",
        "dividends_interest",
        "fees",
        "tax",
      ],
    },
  },
} as const
