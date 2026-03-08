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
      campaign_metrics: {
        Row: {
          campaign_id: string
          clicks: number
          conversions: number
          id: string
          impressions: number
          recorded_at: string
          spent: number
          user_id: string
        }
        Insert: {
          campaign_id: string
          clicks?: number
          conversions?: number
          id?: string
          impressions?: number
          recorded_at?: string
          spent?: number
          user_id: string
        }
        Update: {
          campaign_id?: string
          clicks?: number
          conversions?: number
          id?: string
          impressions?: number
          recorded_at?: string
          spent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_notifications: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience: string
          audience_label: string
          clicks: number
          conversions: number
          cpa: number
          cpc: number
          created_at: string
          ctr: number
          daily_budget: number
          duration: number
          id: string
          impressions: number
          objective: string
          objective_label: string
          platform: string
          roas: number
          spent: number
          status: string
          stream_title: string
          total_budget: number
          updated_at: string
          user_id: string
        }
        Insert: {
          audience: string
          audience_label: string
          clicks?: number
          conversions?: number
          cpa?: number
          cpc?: number
          created_at?: string
          ctr?: number
          daily_budget?: number
          duration?: number
          id?: string
          impressions?: number
          objective: string
          objective_label: string
          platform?: string
          roas?: number
          spent?: number
          status?: string
          stream_title: string
          total_budget?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string
          audience_label?: string
          clicks?: number
          conversions?: number
          cpa?: number
          cpc?: number
          created_at?: string
          ctr?: number
          daily_budget?: number
          duration?: number
          id?: string
          impressions?: number
          objective?: string
          objective_label?: string
          platform?: string
          roas?: number
          spent?: number
          status?: string
          stream_title?: string
          total_budget?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          collaboration_id: string
          content: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          collaboration_id: string
          content: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          collaboration_id?: string
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_collaboration_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "collaborations"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborations: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          id: string
          partner_id: string | null
          partner_name: string
          revenue_split: number
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          partner_id?: string | null
          partner_name: string
          revenue_split?: number
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          partner_id?: string | null
          partner_name?: string
          revenue_split?: number
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      grow_progress: {
        Row: {
          completed_tasks: string[]
          created_at: string
          id: string
          last_activity_date: string | null
          streak_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_tasks?: string[]
          created_at?: string
          id?: string
          last_activity_date?: string | null
          streak_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_tasks?: string[]
          created_at?: string
          id?: string
          last_activity_date?: string | null
          streak_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applicant_id: string
          cover_message: string
          created_at: string
          estimated_timeline: string
          id: string
          job_id: string
          portfolio_samples: string[]
          proposed_rate: number
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applicant_id: string
          cover_message: string
          created_at?: string
          estimated_timeline?: string
          id?: string
          job_id: string
          portfolio_samples?: string[]
          proposed_rate?: number
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          cover_message?: string
          created_at?: string
          estimated_timeline?: string
          id?: string
          job_id?: string
          portfolio_samples?: string[]
          proposed_rate?: number
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_conversations: {
        Row: {
          applicant_id: string
          created_at: string
          creator_id: string
          id: string
          job_id: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          creator_id: string
          id?: string
          job_id: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          job_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "job_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_notifications: {
        Row: {
          application_id: string | null
          created_at: string
          id: string
          job_id: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          job_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          job_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          job_id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          applicant_count: number
          budget_max: number
          budget_min: number
          created_at: string
          creator_id: string
          description: string
          featured: boolean
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          members_only: boolean
          skill_category: Database["public"]["Enums"]["skill_category"]
          status: string
          timeline: string
          title: string
          updated_at: string
        }
        Insert: {
          applicant_count?: number
          budget_max?: number
          budget_min?: number
          created_at?: string
          creator_id: string
          description: string
          featured?: boolean
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          members_only?: boolean
          skill_category: Database["public"]["Enums"]["skill_category"]
          status?: string
          timeline?: string
          title: string
          updated_at?: string
        }
        Update: {
          applicant_count?: number
          budget_max?: number
          budget_min?: number
          created_at?: string
          creator_id?: string
          description?: string
          featured?: boolean
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          members_only?: boolean
          skill_category?: Database["public"]["Enums"]["skill_category"]
          status?: string
          timeline?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      leaderboard_entries: {
        Row: {
          created_at: string
          id: string
          rank: number | null
          score: number
          streak_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rank?: number | null
          score?: number
          streak_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rank?: number | null
          score?: number
          streak_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          budget_warning: boolean
          campaign_completed: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_warning?: boolean
          campaign_completed?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_warning?: boolean
          campaign_completed?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          category: string
          comment_count: number
          content: string
          created_at: string
          id: string
          like_count: number
          user_id: string
        }
        Insert: {
          category?: string
          comment_count?: number
          content: string
          created_at?: string
          id?: string
          like_count?: number
          user_id: string
        }
        Update: {
          category?: string
          comment_count?: number
          content?: string
          created_at?: string
          id?: string
          like_count?: number
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          revenue: number
          sales: number
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number
          revenue?: number
          sales?: number
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          revenue?: number
          sales?: number
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          creator_challenge: string | null
          creator_stage: string | null
          creator_type: string | null
          credits_balance: number
          display_name: string | null
          health_score: number
          id: string
          members: number
          mrr: number
          tier: number
          tier_name: string
          total_revenue: number
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          creator_challenge?: string | null
          creator_stage?: string | null
          creator_type?: string | null
          credits_balance?: number
          display_name?: string | null
          health_score?: number
          id?: string
          members?: number
          mrr?: number
          tier?: number
          tier_name?: string
          total_revenue?: number
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          creator_challenge?: string | null
          creator_stage?: string | null
          creator_type?: string | null
          credits_balance?: number
          display_name?: string | null
          health_score?: number
          id?: string
          members?: number
          mrr?: number
          tier?: number
          tier_name?: string
          total_revenue?: number
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      talent_profiles: {
        Row: {
          availability: Database["public"]["Enums"]["availability_status"]
          avg_rating: number
          bio: string | null
          completed_jobs: number
          created_at: string
          creator_economy_score: number
          hourly_rate: number | null
          id: string
          past_work: string | null
          portfolio_links: string[]
          project_rate: number | null
          skills: Database["public"]["Enums"]["skill_category"][]
          total_reviews: number
          updated_at: string
          user_id: string
          verified_partner: boolean
        }
        Insert: {
          availability?: Database["public"]["Enums"]["availability_status"]
          avg_rating?: number
          bio?: string | null
          completed_jobs?: number
          created_at?: string
          creator_economy_score?: number
          hourly_rate?: number | null
          id?: string
          past_work?: string | null
          portfolio_links?: string[]
          project_rate?: number | null
          skills?: Database["public"]["Enums"]["skill_category"][]
          total_reviews?: number
          updated_at?: string
          user_id: string
          verified_partner?: boolean
        }
        Update: {
          availability?: Database["public"]["Enums"]["availability_status"]
          avg_rating?: number
          bio?: string | null
          completed_jobs?: number
          created_at?: string
          creator_economy_score?: number
          hourly_rate?: number | null
          id?: string
          past_work?: string | null
          portfolio_links?: string[]
          project_rate?: number | null
          skills?: Database["public"]["Enums"]["skill_category"][]
          total_reviews?: number
          updated_at?: string
          user_id?: string
          verified_partner?: boolean
        }
        Relationships: []
      }
      tip_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          message: string | null
          receiver_id: string
          sender_id: string
          stream_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          message?: string | null
          receiver_id: string
          sender_id: string
          stream_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          message?: string | null
          receiver_id?: string
          sender_id?: string
          stream_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      application_status:
        | "pending"
        | "reviewed"
        | "shortlisted"
        | "hired"
        | "rejected"
      availability_status: "open_to_work" | "not_available"
      job_type: "one_time" | "ongoing"
      skill_category:
        | "video_editing"
        | "thumbnail_design"
        | "copywriting"
        | "email_marketing"
        | "community_management"
        | "graphic_design"
        | "web_development"
        | "ai_automation"
        | "coaching_support"
        | "social_media_management"
        | "podcast_editing"
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
      application_status: [
        "pending",
        "reviewed",
        "shortlisted",
        "hired",
        "rejected",
      ],
      availability_status: ["open_to_work", "not_available"],
      job_type: ["one_time", "ongoing"],
      skill_category: [
        "video_editing",
        "thumbnail_design",
        "copywriting",
        "email_marketing",
        "community_management",
        "graphic_design",
        "web_development",
        "ai_automation",
        "coaching_support",
        "social_media_management",
        "podcast_editing",
      ],
    },
  },
} as const
