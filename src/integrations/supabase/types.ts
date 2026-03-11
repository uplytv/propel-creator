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
      business_categories: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
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
      category_feature_defaults: {
        Row: {
          category_id: string
          enabled: boolean
          feature_key: string
          id: string
        }
        Insert: {
          category_id: string
          enabled?: boolean
          feature_key: string
          id?: string
        }
        Update: {
          category_id?: string
          enabled?: boolean
          feature_key?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_feature_defaults_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_feature_defaults_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "feature_registry"
            referencedColumns: ["key"]
          },
        ]
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
      classroom_lessons: {
        Row: {
          created_at: string
          creator_id: string
          description: string
          duration_seconds: number
          id: string
          is_free: boolean
          module_id: string
          mux_asset_id: string | null
          position: number
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string
          duration_seconds?: number
          id?: string
          is_free?: boolean
          module_id: string
          mux_asset_id?: string | null
          position?: number
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string
          duration_seconds?: number
          id?: string
          is_free?: boolean
          module_id?: string
          mux_asset_id?: string | null
          position?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classroom_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "classroom_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_modules: {
        Row: {
          created_at: string
          creator_id: string
          description: string
          id: string
          is_free: boolean
          position: number
          title: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string
          id?: string
          is_free?: boolean
          position?: number
          title: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string
          id?: string
          is_free?: boolean
          position?: number
          title?: string
        }
        Relationships: []
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
      community_categories: {
        Row: {
          created_at: string
          creator_id: string
          emoji: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          emoji?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          emoji?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_events: {
        Row: {
          created_at: string
          creator_id: string
          description: string
          event_date: string
          event_time: string | null
          id: string
          link: string | null
          title: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string
          event_date: string
          event_time?: string | null
          id?: string
          link?: string | null
          title: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string
          event_date?: string
          event_time?: string | null
          id?: string
          link?: string | null
          title?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          creator_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          creator_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          creator_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          body: string
          category: string
          comment_count: number
          created_at: string
          creator_id: string
          id: string
          image_url: string | null
          is_pinned: boolean
          like_count: number
          title: string
        }
        Insert: {
          author_id: string
          body?: string
          category?: string
          comment_count?: number
          created_at?: string
          creator_id: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          like_count?: number
          title?: string
        }
        Update: {
          author_id?: string
          body?: string
          category?: string
          comment_count?: number
          created_at?: string
          creator_id?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          like_count?: number
          title?: string
        }
        Relationships: []
      }
      creator_spaces: {
        Row: {
          avatar_url: string | null
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string
          id: string
          is_free: boolean
          is_public: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          description?: string
          id?: string
          is_free?: boolean
          is_public?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string
          id?: string
          is_free?: boolean
          is_public?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      feature_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          feature_key: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          feature_key?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          feature_key?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      feature_registry: {
        Row: {
          core: string
          created_at: string
          default_enabled: boolean
          dependencies: string[]
          description: string
          id: string
          key: string
          label: string
          position: number
          tier: string
        }
        Insert: {
          core: string
          created_at?: string
          default_enabled?: boolean
          dependencies?: string[]
          description?: string
          id?: string
          key: string
          label: string
          position?: number
          tier: string
        }
        Update: {
          core?: string
          created_at?: string
          default_enabled?: boolean
          dependencies?: string[]
          description?: string
          id?: string
          key?: string
          label?: string
          position?: number
          tier?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
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
      launch_config: {
        Row: {
          id: string
          is_launched: boolean
          total_applicants: number
        }
        Insert: {
          id?: string
          is_launched?: boolean
          total_applicants?: number
        }
        Update: {
          id?: string
          is_launched?: boolean
          total_applicants?: number
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
      lesson_completions: {
        Row: {
          completed_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "classroom_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_sessions: {
        Row: {
          ended_at: string | null
          id: string
          mux_asset_id: string | null
          peak_viewers: number | null
          started_at: string | null
          stream_id: string | null
          total_watch_minutes: number | null
          user_id: string | null
        }
        Insert: {
          ended_at?: string | null
          id?: string
          mux_asset_id?: string | null
          peak_viewers?: number | null
          started_at?: string | null
          stream_id?: string | null
          total_watch_minutes?: number | null
          user_id?: string | null
        }
        Update: {
          ended_at?: string | null
          id?: string
          mux_asset_id?: string | null
          peak_viewers?: number | null
          started_at?: string | null
          stream_id?: string | null
          total_watch_minutes?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_sessions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      member_points: {
        Row: {
          action_type: string
          created_at: string
          creator_id: string
          id: string
          points: number
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          creator_id: string
          id?: string
          points?: number
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          creator_id?: string
          id?: string
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      mux_assets: {
        Row: {
          aspect_ratio: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          is_public: boolean | null
          mux_asset_id: string
          mux_playback_id: string | null
          status: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          upload_id: string | null
          user_id: string
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_public?: boolean | null
          mux_asset_id: string
          mux_playback_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          upload_id?: string | null
          user_id: string
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_public?: boolean | null
          mux_asset_id?: string
          mux_playback_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          upload_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mux_live_streams: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          ended_at: string | null
          featured_product_id: string | null
          id: string
          is_public: boolean | null
          mux_playback_id: string | null
          mux_stream_id: string
          started_at: string | null
          status: string | null
          stream_key: string | null
          stream_type: string
          title: string | null
          updated_at: string | null
          user_id: string
          viewer_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          featured_product_id?: string | null
          id?: string
          is_public?: boolean | null
          mux_playback_id?: string | null
          mux_stream_id: string
          started_at?: string | null
          status?: string | null
          stream_key?: string | null
          stream_type?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
          viewer_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          featured_product_id?: string | null
          id?: string
          is_public?: boolean | null
          mux_playback_id?: string | null
          mux_stream_id?: string
          started_at?: string | null
          status?: string | null
          stream_key?: string | null
          stream_type?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
          viewer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mux_live_streams_featured_product_id_fkey"
            columns: ["featured_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount: number
          id: string
          notes: string | null
          payout_details: Json | null
          payout_method: string | null
          processed_at: string | null
          requested_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          notes?: string | null
          payout_details?: Json | null
          payout_method?: string | null
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          notes?: string | null
          payout_details?: Json | null
          payout_method?: string | null
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_fees: {
        Row: {
          amount: number | null
          created_at: string | null
          fee_type: string | null
          id: string
          percentage: number | null
          transaction_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          fee_type?: string | null
          id?: string
          percentage?: number | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          fee_type?: string | null
          id?: string
          percentage?: number | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_fees_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
          business_category: string | null
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
          user_type: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          business_category?: string | null
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
          user_type?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          business_category?: string | null
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
          user_type?: string | null
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
      transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          net_amount: number | null
          platform_fee_amount: number | null
          reference_id: string | null
          status: string | null
          type: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          net_amount?: number | null
          platform_fee_amount?: number | null
          reference_id?: string | null
          status?: string | null
          type?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          net_amount?: number | null
          platform_fee_amount?: number | null
          reference_id?: string | null
          status?: string | null
          type?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feature_overrides: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          overridden_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          overridden_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          overridden_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feature_overrides_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "feature_registry"
            referencedColumns: ["key"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          creator_type: string | null
          email: string
          follower_count: string | null
          full_name: string
          id: string
          invite_code: string | null
          one_sentence: string | null
          primary_platform: string | null
          social_handle: string | null
        }
        Insert: {
          created_at?: string
          creator_type?: string | null
          email: string
          follower_count?: string | null
          full_name: string
          id?: string
          invite_code?: string | null
          one_sentence?: string | null
          primary_platform?: string | null
          social_handle?: string | null
        }
        Update: {
          created_at?: string
          creator_type?: string | null
          email?: string
          follower_count?: string | null
          full_name?: string
          id?: string
          invite_code?: string | null
          one_sentence?: string | null
          primary_platform?: string | null
          social_handle?: string | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          available_balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          lifetime_earned: number | null
          lifetime_withdrawn: number | null
          pending_balance: number | null
          user_id: string
        }
        Insert: {
          available_balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          lifetime_earned?: number | null
          lifetime_withdrawn?: number | null
          pending_balance?: number | null
          user_id: string
        }
        Update: {
          available_balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          lifetime_earned?: number | null
          lifetime_withdrawn?: number | null
          pending_balance?: number | null
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
      app_role: ["admin", "moderator", "user"],
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
