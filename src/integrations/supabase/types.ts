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
      leads: {
        Row: {
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          capital_sought: string
          cashflow_strength: string | null
          company_name: string
          created_at: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          email: string
          existing_debt: number | null
          full_name: string
          fundability_rating: string | null
          funding_amount: number | null
          funding_purpose: string | null
          funding_readiness_score: number | null
          id: string
          inputs: Json
          investor_attractiveness_score: number | null
          notes: string | null
          phone: string
          readiness_score_100: number | null
          report: Json | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          use_of_funds_detail: string | null
          years_in_operation: number | null
        }
        Insert: {
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          capital_sought: string
          cashflow_strength?: string | null
          company_name: string
          created_at?: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          email: string
          existing_debt?: number | null
          full_name: string
          fundability_rating?: string | null
          funding_amount?: number | null
          funding_purpose?: string | null
          funding_readiness_score?: number | null
          id?: string
          inputs?: Json
          investor_attractiveness_score?: number | null
          notes?: string | null
          phone: string
          readiness_score_100?: number | null
          report?: Json | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          use_of_funds_detail?: string | null
          years_in_operation?: number | null
        }
        Update: {
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          capital_sought?: string
          cashflow_strength?: string | null
          company_name?: string
          created_at?: string
          deal_type?: Database["public"]["Enums"]["deal_type"]
          email?: string
          existing_debt?: number | null
          full_name?: string
          fundability_rating?: string | null
          funding_amount?: number | null
          funding_purpose?: string | null
          funding_readiness_score?: number | null
          id?: string
          inputs?: Json
          investor_attractiveness_score?: number | null
          notes?: string | null
          phone?: string
          readiness_score_100?: number | null
          report?: Json | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          use_of_funds_detail?: string | null
          years_in_operation?: number | null
        }
        Relationships: []
      }
      mandate_documents: {
        Row: {
          analysis: Json | null
          analyzed_at: string | null
          created_at: string
          doc_type: Database["public"]["Enums"]["mandate_doc_type"]
          file_name: string
          file_size: number
          id: string
          mandate_id: string
          mime_type: string | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          analysis?: Json | null
          analyzed_at?: string | null
          created_at?: string
          doc_type?: Database["public"]["Enums"]["mandate_doc_type"]
          file_name: string
          file_size: number
          id?: string
          mandate_id: string
          mime_type?: string | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          analysis?: Json | null
          analyzed_at?: string | null
          created_at?: string
          doc_type?: Database["public"]["Enums"]["mandate_doc_type"]
          file_name?: string
          file_size?: number
          id?: string
          mandate_id?: string
          mime_type?: string | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mandate_documents_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "mandates"
            referencedColumns: ["id"]
          },
        ]
      }
      mandate_generated_documents: {
        Row: {
          content: Json | null
          created_at: string
          doc_kind: Database["public"]["Enums"]["generated_doc_kind"]
          error: string | null
          format: Database["public"]["Enums"]["generated_doc_format"]
          generated_at: string | null
          id: string
          mandate_id: string
          status: string
          storage_path: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          doc_kind: Database["public"]["Enums"]["generated_doc_kind"]
          error?: string | null
          format: Database["public"]["Enums"]["generated_doc_format"]
          generated_at?: string | null
          id?: string
          mandate_id: string
          status?: string
          storage_path?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          doc_kind?: Database["public"]["Enums"]["generated_doc_kind"]
          error?: string | null
          format?: Database["public"]["Enums"]["generated_doc_format"]
          generated_at?: string | null
          id?: string
          mandate_id?: string
          status?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mandate_generated_documents_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "mandates"
            referencedColumns: ["id"]
          },
        ]
      }
      mandates: {
        Row: {
          archived_at: string | null
          asset_class: string | null
          capital_sought: string
          cashflow_strength: string | null
          company_name: string
          created_at: string
          created_by: string | null
          deal_memo: Json | null
          deal_type: Database["public"]["Enums"]["deal_type"]
          doc_review: Json | null
          email: string
          existing_debt: number | null
          financial_summary: string | null
          fundability_rating: string | null
          funding_purpose: string | null
          geography: string | null
          id: string
          lead_id: string | null
          notes: string | null
          phone: string
          readiness_score_100: number | null
          sharia_status: Database["public"]["Enums"]["sharia_status"]
          sponsor_name: string
          sponsor_track_record: string | null
          stage: Database["public"]["Enums"]["mandate_stage"]
          updated_at: string
          use_of_funds_detail: string | null
          use_of_proceeds: string | null
          years_in_operation: number | null
        }
        Insert: {
          archived_at?: string | null
          asset_class?: string | null
          capital_sought: string
          cashflow_strength?: string | null
          company_name: string
          created_at?: string
          created_by?: string | null
          deal_memo?: Json | null
          deal_type: Database["public"]["Enums"]["deal_type"]
          doc_review?: Json | null
          email: string
          existing_debt?: number | null
          financial_summary?: string | null
          fundability_rating?: string | null
          funding_purpose?: string | null
          geography?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          phone: string
          readiness_score_100?: number | null
          sharia_status?: Database["public"]["Enums"]["sharia_status"]
          sponsor_name: string
          sponsor_track_record?: string | null
          stage?: Database["public"]["Enums"]["mandate_stage"]
          updated_at?: string
          use_of_funds_detail?: string | null
          use_of_proceeds?: string | null
          years_in_operation?: number | null
        }
        Update: {
          archived_at?: string | null
          asset_class?: string | null
          capital_sought?: string
          cashflow_strength?: string | null
          company_name?: string
          created_at?: string
          created_by?: string | null
          deal_memo?: Json | null
          deal_type?: Database["public"]["Enums"]["deal_type"]
          doc_review?: Json | null
          email?: string
          existing_debt?: number | null
          financial_summary?: string | null
          fundability_rating?: string | null
          funding_purpose?: string | null
          geography?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          phone?: string
          readiness_score_100?: number | null
          sharia_status?: Database["public"]["Enums"]["sharia_status"]
          sponsor_name?: string
          sponsor_track_record?: string | null
          stage?: Database["public"]["Enums"]["mandate_stage"]
          updated_at?: string
          use_of_funds_detail?: string | null
          use_of_proceeds?: string | null
          years_in_operation?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mandates_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "admin"
      assessment_type:
        | "real_estate_capital_readiness"
        | "sme_funding_readiness"
        | "investor_suitability"
        | "sharia_compliance"
      deal_type: "Equity" | "Debt"
      generated_doc_format: "pdf" | "docx" | "pptx"
      generated_doc_kind:
        | "Teaser"
        | "Information Memorandum"
        | "Investor Deck"
        | "Financial Model Summary"
        | "Term Sheet"
        | "Risk Memo"
        | "Process Letter"
        | "Debt Structure Memo"
        | "Covenant Pack"
        | "Sharia Compliance Memo"
      lead_status:
        | "New"
        | "Contacted"
        | "Converted to Mandate"
        | "Not Qualified"
      mandate_doc_type:
        | "Pitch Deck"
        | "Financials"
        | "Trade License"
        | "Title Deed"
        | "Valuation"
        | "KYC"
        | "Other"
      mandate_stage:
        | "Draft"
        | "Under Review"
        | "Ready to Package"
        | "Live"
        | "Closed"
        | "Archived"
      sharia_status: "Required" | "Not Required" | "Pending"
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
      app_role: ["admin"],
      assessment_type: [
        "real_estate_capital_readiness",
        "sme_funding_readiness",
        "investor_suitability",
        "sharia_compliance",
      ],
      deal_type: ["Equity", "Debt"],
      generated_doc_format: ["pdf", "docx", "pptx"],
      generated_doc_kind: [
        "Teaser",
        "Information Memorandum",
        "Investor Deck",
        "Financial Model Summary",
        "Term Sheet",
        "Risk Memo",
        "Process Letter",
        "Debt Structure Memo",
        "Covenant Pack",
        "Sharia Compliance Memo",
      ],
      lead_status: [
        "New",
        "Contacted",
        "Converted to Mandate",
        "Not Qualified",
      ],
      mandate_doc_type: [
        "Pitch Deck",
        "Financials",
        "Trade License",
        "Title Deed",
        "Valuation",
        "KYC",
        "Other",
      ],
      mandate_stage: [
        "Draft",
        "Under Review",
        "Ready to Package",
        "Live",
        "Closed",
        "Archived",
      ],
      sharia_status: ["Required", "Not Required", "Pending"],
    },
  },
} as const
