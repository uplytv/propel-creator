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
      ad_integrations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          pixel_id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          pixel_id: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          pixel_id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_conversions: {
        Row: {
          affiliate_code: string
          amount: number
          commission_amount: number
          conversion_type: string
          created_at: string
          id: string
          referred_user_id: string
          referring_user_id: string
          status: string
        }
        Insert: {
          affiliate_code: string
          amount?: number
          commission_amount?: number
          conversion_type: string
          created_at?: string
          id?: string
          referred_user_id: string
          referring_user_id: string
          status?: string
        }
        Update: {
          affiliate_code?: string
          amount?: number
          commission_amount?: number
          conversion_type?: string
          created_at?: string
          id?: string
          referred_user_id?: string
          referring_user_id?: string
          status?: string
        }
        Relationships: []
      }
      affiliate_links: {
        Row: {
          clicks: number
          code: string
          created_at: string
          id: string
          revenue_generated: number
          signups: number
          user_id: string
        }
        Insert: {
          clicks?: number
          code: string
          created_at?: string
          id?: string
          revenue_generated?: number
          signups?: number
          user_id: string
        }
        Update: {
          clicks?: number
          code?: string
          created_at?: string
          id?: string
          revenue_generated?: number
          signups?: number
          user_id?: string
        }
        Relationships: []
      }
      aria_rate_limits: {
        Row: {
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
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
          slug: string | null
          title: string
          video_type: string | null
          video_url: string | null
          youtube_video_id: string | null
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
          slug?: string | null
          title: string
          video_type?: string | null
          video_url?: string | null
          youtube_video_id?: string | null
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
          slug?: string | null
          title?: string
          video_type?: string | null
          video_url?: string | null
          youtube_video_id?: string | null
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
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string
          id: string
          is_free: boolean
          position: number
          slug: string | null
          title: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          description?: string
          id?: string
          is_free?: boolean
          position?: number
          slug?: string | null
          title: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string
          id?: string
          is_free?: boolean
          position?: number
          slug?: string | null
          title?: string
        }
        Relationships: []
      }
      clip_likes: {
        Row: {
          clip_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          clip_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          clip_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_likes_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
        ]
      }
      clips: {
        Row: {
          caption: string
          clip_asset_id: string | null
          clip_playback_id: string | null
          clipped_by_user_id: string
          created_at: string
          creator_id: string
          duration_seconds: number
          id: string
          is_auto_short: boolean
          is_public: boolean
          slug: string | null
          source_asset_id: string | null
          source_type: string
          trending_score: number | null
          view_count: number
        }
        Insert: {
          caption?: string
          clip_asset_id?: string | null
          clip_playback_id?: string | null
          clipped_by_user_id: string
          created_at?: string
          creator_id: string
          duration_seconds?: number
          id?: string
          is_auto_short?: boolean
          is_public?: boolean
          slug?: string | null
          source_asset_id?: string | null
          source_type?: string
          trending_score?: number | null
          view_count?: number
        }
        Update: {
          caption?: string
          clip_asset_id?: string | null
          clip_playback_id?: string | null
          clipped_by_user_id?: string
          created_at?: string
          creator_id?: string
          duration_seconds?: number
          id?: string
          is_auto_short?: boolean
          is_public?: boolean
          slug?: string | null
          source_asset_id?: string | null
          source_type?: string
          trending_score?: number | null
          view_count?: number
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
      community_blasts: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          media_type: string | null
          media_url: string | null
          message: string
          mux_asset_id: string | null
          mux_playback_id: string | null
          recipient_count: number
          sent_at: string | null
          space_id: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          message: string
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          recipient_count?: number
          sent_at?: string | null
          space_id: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          message?: string
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          recipient_count?: number
          sent_at?: string | null
          space_id?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_blasts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_blasts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_blasts_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "creator_spaces"
            referencedColumns: ["id"]
          },
        ]
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
          email_opt_in: boolean
          id: string
          joined_at: string
          last_emailed_at: string | null
          user_id: string
        }
        Insert: {
          creator_id: string
          email_opt_in?: boolean
          id?: string
          joined_at?: string
          last_emailed_at?: string | null
          user_id: string
        }
        Update: {
          creator_id?: string
          email_opt_in?: boolean
          id?: string
          joined_at?: string
          last_emailed_at?: string | null
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
          slug: string | null
          title: string
          trending_score: number | null
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
          slug?: string | null
          title?: string
          trending_score?: number | null
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
          slug?: string | null
          title?: string
          trending_score?: number | null
        }
        Relationships: []
      }
      content_shares: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          platform: string
          shared_by_user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          platform: string
          shared_by_user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          platform?: string
          shared_by_user_id?: string
        }
        Relationships: []
      }
      creator_affiliate_members: {
        Row: {
          affiliate_code: string
          clicks: number
          conversions: number
          created_at: string
          earnings: number
          id: string
          member_id: string
          program_id: string
        }
        Insert: {
          affiliate_code: string
          clicks?: number
          conversions?: number
          created_at?: string
          earnings?: number
          id?: string
          member_id: string
          program_id: string
        }
        Update: {
          affiliate_code?: string
          clicks?: number
          conversions?: number
          created_at?: string
          earnings?: number
          id?: string
          member_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_affiliate_members_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "creator_affiliate_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_affiliate_programs: {
        Row: {
          commission_rate: number
          cookie_duration_days: number
          created_at: string
          creator_id: string
          id: string
          is_active: boolean
        }
        Insert: {
          commission_rate?: number
          cookie_duration_days?: number
          created_at?: string
          creator_id: string
          id?: string
          is_active?: boolean
        }
        Update: {
          commission_rate?: number
          cookie_duration_days?: number
          created_at?: string
          creator_id?: string
          id?: string
          is_active?: boolean
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
          last_blast_sent_at: string | null
          name: string
          price: number
          slug: string | null
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
          last_blast_sent_at?: string | null
          name?: string
          price?: number
          slug?: string | null
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
          last_blast_sent_at?: string | null
          name?: string
          price?: number
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creator_stripe_accounts: {
        Row: {
          charges_enabled: boolean
          created_at: string
          creator_id: string
          details_submitted: boolean
          id: string
          payouts_enabled: boolean
          stripe_account_id: string
        }
        Insert: {
          charges_enabled?: boolean
          created_at?: string
          creator_id: string
          details_submitted?: boolean
          id?: string
          payouts_enabled?: boolean
          stripe_account_id: string
        }
        Update: {
          charges_enabled?: boolean
          created_at?: string
          creator_id?: string
          details_submitted?: boolean
          id?: string
          payouts_enabled?: boolean
          stripe_account_id?: string
        }
        Relationships: []
      }
      credit_packages: {
        Row: {
          credits: number
          id: string
          label: string
          price_usd: number
          stripe_price_id: string | null
        }
        Insert: {
          credits: number
          id?: string
          label: string
          price_usd: number
          stripe_price_id?: string | null
        }
        Update: {
          credits?: number
          id?: string
          label?: string
          price_usd?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      direct_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_one: string
          participant_two: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_one: string
          participant_two: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_one?: string
          participant_two?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_reminders: {
        Row: {
          created_at: string
          event_id: string
          id: string
          reminded_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          reminded_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          reminded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_waitlist: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notified: boolean
          notified_at: string | null
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notified?: boolean
          notified_at?: string | null
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notified?: boolean
          notified_at?: string | null
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_waitlist_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          ends_at: string
          event_type: string
          id: string
          is_free: boolean
          is_sold_out: boolean
          location_address: string | null
          location_city: string | null
          location_name: string | null
          location_state: string | null
          mux_stream_id: string | null
          refund_policy: string
          slug: string | null
          space_id: string | null
          starts_at: string
          status: string
          stream_on_uply: boolean
          stripe_price_id: string | null
          ticket_price: number
          ticket_quantity: number | null
          tickets_sold: number
          timezone: string
          title: string
          virtual_link: string | null
          virtual_link_unlocked_at: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          ends_at: string
          event_type?: string
          id?: string
          is_free?: boolean
          is_sold_out?: boolean
          location_address?: string | null
          location_city?: string | null
          location_name?: string | null
          location_state?: string | null
          mux_stream_id?: string | null
          refund_policy?: string
          slug?: string | null
          space_id?: string | null
          starts_at: string
          status?: string
          stream_on_uply?: boolean
          stripe_price_id?: string | null
          ticket_price?: number
          ticket_quantity?: number | null
          tickets_sold?: number
          timezone?: string
          title: string
          virtual_link?: string | null
          virtual_link_unlocked_at?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          ends_at?: string
          event_type?: string
          id?: string
          is_free?: boolean
          is_sold_out?: boolean
          location_address?: string | null
          location_city?: string | null
          location_name?: string | null
          location_state?: string | null
          mux_stream_id?: string | null
          refund_policy?: string
          slug?: string | null
          space_id?: string | null
          starts_at?: string
          status?: string
          stream_on_uply?: boolean
          stripe_price_id?: string | null
          ticket_price?: number
          ticket_quantity?: number | null
          tickets_sold?: number
          timezone?: string
          title?: string
          virtual_link?: string | null
          virtual_link_unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_mux_stream_id_fkey"
            columns: ["mux_stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_mux_stream_id_fkey"
            columns: ["mux_stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "creator_spaces"
            referencedColumns: ["id"]
          },
        ]
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
      invite_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_used: boolean
          owner_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_used?: boolean
          owner_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_used?: boolean
          owner_id?: string
          used_at?: string | null
          used_by?: string | null
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
      live_auctions: {
        Row: {
          bid_count: number
          created_at: string
          creator_id: string
          current_bid: number
          current_winner_id: string | null
          current_winner_username: string | null
          ends_at: string
          id: string
          live_product_id: string
          starting_bid: number
          status: string
          stream_id: string
        }
        Insert: {
          bid_count?: number
          created_at?: string
          creator_id: string
          current_bid?: number
          current_winner_id?: string | null
          current_winner_username?: string | null
          ends_at: string
          id?: string
          live_product_id: string
          starting_bid?: number
          status?: string
          stream_id: string
        }
        Update: {
          bid_count?: number
          created_at?: string
          creator_id?: string
          current_bid?: number
          current_winner_id?: string | null
          current_winner_username?: string | null
          ends_at?: string
          id?: string
          live_product_id?: string
          starting_bid?: number
          status?: string
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_auctions_live_product_id_fkey"
            columns: ["live_product_id"]
            isOneToOne: false
            referencedRelation: "live_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_auctions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_auctions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      live_bids: {
        Row: {
          amount: number
          bidder_id: string
          created_at: string
          id: string
          is_winning: boolean
          live_product_id: string
        }
        Insert: {
          amount: number
          bidder_id: string
          created_at?: string
          id?: string
          is_winning?: boolean
          live_product_id: string
        }
        Update: {
          amount?: number
          bidder_id?: string
          created_at?: string
          id?: string
          is_winning?: boolean
          live_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_bids_live_product_id_fkey"
            columns: ["live_product_id"]
            isOneToOne: false
            referencedRelation: "live_products"
            referencedColumns: ["id"]
          },
        ]
      }
      live_chat_messages: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          is_pinned: boolean
          message: string
          stream_id: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          message: string
          stream_id: string
          user_id: string
          username?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          message?: string
          stream_id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      live_giveaway_entries: {
        Row: {
          created_at: string
          giveaway_id: string
          id: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          giveaway_id: string
          id?: string
          user_id: string
          username?: string
        }
        Update: {
          created_at?: string
          giveaway_id?: string
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_giveaway_entries_giveaway_id_fkey"
            columns: ["giveaway_id"]
            isOneToOne: false
            referencedRelation: "live_giveaways"
            referencedColumns: ["id"]
          },
        ]
      }
      live_giveaways: {
        Row: {
          created_at: string
          creator_id: string
          ended_at: string | null
          entry_count: number
          id: string
          status: string
          stream_id: string
          title: string
          winner_id: string | null
          winner_username: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          ended_at?: string | null
          entry_count?: number
          id?: string
          status?: string
          stream_id: string
          title: string
          winner_id?: string | null
          winner_username?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          ended_at?: string | null
          entry_count?: number
          id?: string
          status?: string
          stream_id?: string
          title?: string
          winner_id?: string | null
          winner_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_giveaways_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_giveaways_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      live_products: {
        Row: {
          auction_duration_minutes: number | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_sold_out: boolean
          position: number
          price: number
          quantity_remaining: number
          quantity_total: number
          starting_bid: number | null
          stream_id: string
          stripe_price_id: string | null
          title: string
          type: string
        }
        Insert: {
          auction_duration_minutes?: number | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_sold_out?: boolean
          position?: number
          price?: number
          quantity_remaining?: number
          quantity_total?: number
          starting_bid?: number | null
          stream_id: string
          stripe_price_id?: string | null
          title: string
          type?: string
        }
        Update: {
          auction_duration_minutes?: number | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_sold_out?: boolean
          position?: number
          price?: number
          quantity_remaining?: number
          quantity_total?: number
          starting_bid?: number | null
          stream_id?: string
          stripe_price_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_products_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_products_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      live_purchases: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          creator_earnings: number
          creator_id: string
          id: string
          live_product_id: string
          platform_fee: number
          status: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount?: number
          buyer_id: string
          created_at?: string
          creator_earnings?: number
          creator_id: string
          id?: string
          live_product_id: string
          platform_fee?: number
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          creator_earnings?: number
          creator_id?: string
          id?: string
          live_product_id?: string
          platform_fee?: number
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_purchases_live_product_id_fkey"
            columns: ["live_product_id"]
            isOneToOne: false
            referencedRelation: "live_products"
            referencedColumns: ["id"]
          },
        ]
      }
      live_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "live_stream_sessions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams_public"
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
      member_subscriptions: {
        Row: {
          created_at: string
          creator_id: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          member_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier_id: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          member_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          member_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
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
          trending_score: number | null
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
          trending_score?: number | null
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
          trending_score?: number | null
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
          energy_score: number
          featured_product_id: string | null
          id: string
          is_public: boolean | null
          mux_playback_id: string | null
          mux_stream_id: string
          slug: string | null
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
          energy_score?: number
          featured_product_id?: string | null
          id?: string
          is_public?: boolean | null
          mux_playback_id?: string | null
          mux_stream_id: string
          slug?: string | null
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
          energy_score?: number
          featured_product_id?: string | null
          id?: string
          is_public?: boolean | null
          mux_playback_id?: string | null
          mux_stream_id?: string
          slug?: string | null
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
          {
            foreignKeyName: "mux_live_streams_featured_product_id_fkey"
            columns: ["featured_product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
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
          member_joined_email: boolean
          new_follower_email: boolean
          tip_received_email: boolean
          updated_at: string
          user_id: string
          weekly_report_email: boolean
        }
        Insert: {
          budget_warning?: boolean
          campaign_completed?: boolean
          created_at?: string
          id?: string
          member_joined_email?: boolean
          new_follower_email?: boolean
          tip_received_email?: boolean
          updated_at?: string
          user_id: string
          weekly_report_email?: boolean
        }
        Update: {
          budget_warning?: boolean
          campaign_completed?: boolean
          created_at?: string
          id?: string
          member_joined_email?: boolean
          new_follower_email?: boolean
          tip_received_email?: boolean
          updated_at?: string
          user_id?: string
          weekly_report_email?: boolean
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
      onboarding_events: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          step: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          step: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          step?: string
          user_id?: string
        }
        Relationships: []
      }
      paid_dm_replies: {
        Row: {
          created_at: string | null
          creator_id: string
          dm_id: string
          id: string
          message: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          dm_id: string
          id?: string
          message: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          dm_id?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "paid_dm_replies_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "paid_dms"
            referencedColumns: ["id"]
          },
        ]
      }
      paid_dms: {
        Row: {
          amount: number | null
          created_at: string | null
          creator_earnings: number | null
          creator_id: string
          id: string
          is_read: boolean | null
          message: string
          platform_fee: number | null
          sender_id: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          creator_earnings?: number | null
          creator_id: string
          id?: string
          is_read?: boolean | null
          message: string
          platform_fee?: number | null
          sender_id: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          creator_earnings?: number | null
          creator_id?: string
          id?: string
          is_read?: boolean | null
          message?: string
          platform_fee?: number | null
          sender_id?: string
          stripe_payment_intent_id?: string | null
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
      product_purchases: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          creator_id: string
          id: string
          product_id: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount?: number
          buyer_id: string
          created_at?: string
          creator_id: string
          id?: string
          product_id: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          product_id?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
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
          stripe_price_id: string | null
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
          stripe_price_id?: string | null
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
          stripe_price_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          beta_user: boolean
          bio: string | null
          business_category: string | null
          cover_image_url: string | null
          created_at: string
          creator_challenge: string | null
          creator_stage: string | null
          creator_type: string | null
          credits_balance: number
          display_name: string | null
          first_name: string | null
          health_score: number
          id: string
          interests: string[] | null
          is_approved: boolean
          last_name: string | null
          members: number
          mrr: number
          onboarding_complete: boolean
          origin_member: boolean
          paid_dm_price: number | null
          paid_dms_enabled: boolean | null
          referral_code: string | null
          role_type: string | null
          tier: number
          tier_name: string
          total_revenue: number
          updated_at: string
          user_id: string
          user_type: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          beta_user?: boolean
          bio?: string | null
          business_category?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_challenge?: string | null
          creator_stage?: string | null
          creator_type?: string | null
          credits_balance?: number
          display_name?: string | null
          first_name?: string | null
          health_score?: number
          id?: string
          interests?: string[] | null
          is_approved?: boolean
          last_name?: string | null
          members?: number
          mrr?: number
          onboarding_complete?: boolean
          origin_member?: boolean
          paid_dm_price?: number | null
          paid_dms_enabled?: boolean | null
          referral_code?: string | null
          role_type?: string | null
          tier?: number
          tier_name?: string
          total_revenue?: number
          updated_at?: string
          user_id: string
          user_type?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          beta_user?: boolean
          bio?: string | null
          business_category?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_challenge?: string | null
          creator_stage?: string | null
          creator_type?: string | null
          credits_balance?: number
          display_name?: string | null
          first_name?: string | null
          health_score?: number
          id?: string
          interests?: string[] | null
          is_approved?: boolean
          last_name?: string | null
          members?: number
          mrr?: number
          onboarding_complete?: boolean
          origin_member?: boolean
          paid_dm_price?: number | null
          paid_dms_enabled?: boolean | null
          referral_code?: string | null
          role_type?: string | null
          tier?: number
          tier_name?: string
          total_revenue?: number
          updated_at?: string
          user_id?: string
          user_type?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      scheduled_streams: {
        Row: {
          category: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          reminder_count: number | null
          scheduled_at: string
          status: string | null
          stream_id: string | null
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          reminder_count?: number | null
          scheduled_at: string
          status?: string | null
          stream_id?: string | null
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          reminder_count?: number | null
          scheduled_at?: string
          status?: string | null
          stream_id?: string | null
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_streams_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_streams_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      shorts: {
        Row: {
          caption: string
          created_at: string
          creator_id: string
          creator_type_tag: string | null
          id: string
          like_count: number
          mux_asset_id: string | null
          playback_id: string | null
          view_count: number
        }
        Insert: {
          caption?: string
          created_at?: string
          creator_id: string
          creator_type_tag?: string | null
          id?: string
          like_count?: number
          mux_asset_id?: string | null
          playback_id?: string | null
          view_count?: number
        }
        Update: {
          caption?: string
          created_at?: string
          creator_id?: string
          creator_type_tag?: string | null
          id?: string
          like_count?: number
          mux_asset_id?: string | null
          playback_id?: string | null
          view_count?: number
        }
        Relationships: []
      }
      shorts_queue: {
        Row: {
          created_at: string | null
          creator_id: string
          end_time: number
          id: string
          reason: string | null
          start_time: number
          status: string | null
          stream_recording_id: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          end_time: number
          id?: string
          reason?: string | null
          start_time: number
          status?: string | null
          stream_recording_id: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          end_time?: number
          id?: string
          reason?: string | null
          start_time?: number
          status?: string | null
          stream_recording_id?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          id: string
          platform: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      space_media: {
        Row: {
          created_at: string
          creator_id: string
          duration: number | null
          id: string
          media_type: string
          mux_playback_id: string | null
          position: number
          thumbnail_url: string | null
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          duration?: number | null
          id?: string
          media_type?: string
          mux_playback_id?: string | null
          position?: number
          thumbnail_url?: string | null
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          duration?: number | null
          id?: string
          media_type?: string
          mux_playback_id?: string | null
          position?: number
          thumbnail_url?: string | null
          title?: string | null
          url?: string
        }
        Relationships: []
      }
      stream_recordings: {
        Row: {
          created_at: string
          creator_id: string
          description: string
          download_url: string | null
          duration_seconds: number
          id: string
          is_free: boolean
          is_published: boolean
          mux_asset_id: string | null
          playback_id: string | null
          slug: string | null
          title: string
          trending_score: number | null
          view_count: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string
          download_url?: string | null
          duration_seconds?: number
          id?: string
          is_free?: boolean
          is_published?: boolean
          mux_asset_id?: string | null
          playback_id?: string | null
          slug?: string | null
          title?: string
          trending_score?: number | null
          view_count?: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string
          download_url?: string | null
          duration_seconds?: number
          id?: string
          is_free?: boolean
          is_published?: boolean
          mux_asset_id?: string | null
          playback_id?: string | null
          slug?: string | null
          title?: string
          trending_score?: number | null
          view_count?: number
        }
        Relationships: []
      }
      stream_reminders: {
        Row: {
          created_at: string | null
          id: string
          scheduled_stream_id: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          scheduled_stream_id: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          scheduled_stream_id?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_reminders_scheduled_stream_id_fkey"
            columns: ["scheduled_stream_id"]
            isOneToOne: false
            referencedRelation: "scheduled_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_transcripts: {
        Row: {
          created_at: string | null
          creator_id: string
          id: string
          stream_recording_id: string
          transcript_json: Json | null
          transcript_text: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          id?: string
          stream_recording_id: string
          transcript_json?: Json | null
          transcript_text?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          id?: string
          stream_recording_id?: string
          transcript_json?: Json | null
          transcript_text?: string | null
        }
        Relationships: []
      }
      stripe_webhook_log: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          last_attempted_at: string | null
          payload: Json
          status: string
          stripe_event_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          last_attempted_at?: string | null
          payload?: Json
          status?: string
          stripe_event_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          last_attempted_at?: string | null
          payload?: Json
          status?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          created_at: string
          creator_id: string
          description: string
          id: string
          is_active: boolean
          name: string
          price_monthly: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          trial_days: number | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string
          id?: string
          is_active?: boolean
          name: string
          price_monthly?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_days?: number | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          price_monthly?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_days?: number | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      tickets: {
        Row: {
          amount_paid: number
          buyer_id: string
          checked_in_at: string | null
          created_at: string
          creator_earnings: number
          creator_id: string
          event_id: string
          id: string
          platform_fee: number
          qr_code_token: string
          qr_code_url: string | null
          status: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_paid?: number
          buyer_id: string
          checked_in_at?: string | null
          created_at?: string
          creator_earnings?: number
          creator_id: string
          event_id: string
          id?: string
          platform_fee?: number
          qr_code_token?: string
          qr_code_url?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_paid?: number
          buyer_id?: string
          checked_in_at?: string | null
          created_at?: string
          creator_earnings?: number
          creator_id?: string
          event_id?: string
          id?: string
          platform_fee?: number
          qr_code_token?: string
          qr_code_url?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
          stripe_payment_intent_id: string | null
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
          stripe_payment_intent_id?: string | null
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
          stripe_payment_intent_id?: string | null
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
      video_comments: {
        Row: {
          body: string
          created_at: string | null
          id: string
          like_count: number | null
          user_id: string
          video_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          like_count?: number | null
          user_id: string
          video_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          like_count?: number | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_likes: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          category: string | null
          comment_count: number | null
          created_at: string | null
          creator_id: string
          description: string | null
          download_url: string | null
          duration_seconds: number | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          like_count: number | null
          mux_asset_id: string | null
          playback_id: string | null
          scheduled_publish_at: string | null
          slug: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          trending_score: number | null
          view_count: number | null
          visibility: string
        }
        Insert: {
          category?: string | null
          comment_count?: number | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          download_url?: string | null
          duration_seconds?: number | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          like_count?: number | null
          mux_asset_id?: string | null
          playback_id?: string | null
          scheduled_publish_at?: string | null
          slug?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          trending_score?: number | null
          view_count?: number | null
          visibility?: string
        }
        Update: {
          category?: string | null
          comment_count?: number | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          download_url?: string | null
          duration_seconds?: number | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          like_count?: number | null
          mux_asset_id?: string | null
          playback_id?: string | null
          scheduled_publish_at?: string | null
          slug?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          trending_score?: number | null
          view_count?: number | null
          visibility?: string
        }
        Relationships: []
      }
      views_log: {
        Row: {
          asset_id: string
          asset_type: string
          id: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          asset_id: string
          asset_type: string
          id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          asset_id?: string
          asset_type?: string
          id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          creator_type: string | null
          early_access: boolean
          email: string
          follower_count: string | null
          full_name: string
          id: string
          invite_code: string | null
          one_sentence: string | null
          position: number | null
          primary_platform: string | null
          referral_code: string | null
          referral_count: number
          referred_by: string | null
          social_handle: string | null
        }
        Insert: {
          created_at?: string
          creator_type?: string | null
          early_access?: boolean
          email: string
          follower_count?: string | null
          full_name: string
          id?: string
          invite_code?: string | null
          one_sentence?: string | null
          position?: number | null
          primary_platform?: string | null
          referral_code?: string | null
          referral_count?: number
          referred_by?: string | null
          social_handle?: string | null
        }
        Update: {
          created_at?: string
          creator_type?: string | null
          early_access?: boolean
          email?: string
          follower_count?: string | null
          full_name?: string
          id?: string
          invite_code?: string | null
          one_sentence?: string | null
          position?: number | null
          primary_platform?: string | null
          referral_code?: string | null
          referral_count?: number
          referred_by?: string | null
          social_handle?: string | null
        }
        Relationships: []
      }
      waitlist_config: {
        Row: {
          contest_ended: boolean
          created_at: string
          end_date: string
          id: string
          prize_amount: number
          spots_jump_per_3_referrals: number
        }
        Insert: {
          contest_ended?: boolean
          created_at?: string
          end_date?: string
          id?: string
          prize_amount?: number
          spots_jump_per_3_referrals?: number
        }
        Update: {
          contest_ended?: boolean
          created_at?: string
          end_date?: string
          id?: string
          prize_amount?: number
          spots_jump_per_3_referrals?: number
        }
        Relationships: []
      }
      wallets: {
        Row: {
          available_balance: number | null
          created_at: string | null
          credits: number
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
          credits?: number
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
          credits?: number
          currency?: string | null
          id?: string
          lifetime_earned?: number | null
          lifetime_withdrawn?: number | null
          pending_balance?: number | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_growth_reports: {
        Row: {
          action_item: string | null
          created_at: string
          highlights: Json | null
          id: string
          read: boolean
          report_content: string
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          action_item?: string | null
          created_at?: string
          highlights?: Json | null
          id?: string
          read?: boolean
          report_content: string
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          action_item?: string | null
          created_at?: string
          highlights?: Json | null
          id?: string
          read?: boolean
          report_content?: string
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      youtube_imports: {
        Row: {
          created_at: string
          creator_id: string
          description: string
          id: string
          thumbnail_url: string | null
          title: string
          youtube_url: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string
          id?: string
          thumbnail_url?: string | null
          title?: string
          youtube_url: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string
          id?: string
          thumbnail_url?: string | null
          title?: string
          youtube_url?: string
          youtube_video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      mux_live_streams_public: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          ended_at: string | null
          energy_score: number | null
          featured_product_id: string | null
          id: string | null
          is_public: boolean | null
          mux_playback_id: string | null
          mux_stream_id: string | null
          started_at: string | null
          status: string | null
          stream_type: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          viewer_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          energy_score?: number | null
          featured_product_id?: string | null
          id?: string | null
          is_public?: boolean | null
          mux_playback_id?: string | null
          mux_stream_id?: string | null
          started_at?: string | null
          status?: string | null
          stream_type?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          viewer_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          energy_score?: number | null
          featured_product_id?: string | null
          id?: string | null
          is_public?: boolean | null
          mux_playback_id?: string | null
          mux_stream_id?: string | null
          started_at?: string | null
          status?: string | null
          stream_type?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          {
            foreignKeyName: "mux_live_streams_featured_product_id_fkey"
            columns: ["featured_product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      products_public: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          name: string | null
          price: number | null
          sales: number | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          price?: number | null
          sales?: number | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          price?: number | null
          sales?: number | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          business_category: string | null
          cover_image_url: string | null
          created_at: string | null
          creator_stage: string | null
          creator_type: string | null
          display_name: string | null
          id: string | null
          tier: number | null
          tier_name: string | null
          updated_at: string | null
          user_id: string | null
          user_type: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          business_category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          creator_stage?: string | null
          creator_type?: string | null
          display_name?: string | null
          id?: string | null
          tier?: number | null
          tier_name?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          business_category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          creator_stage?: string | null
          creator_type?: string | null
          display_name?: string | null
          id?: string | null
          tier?: number | null
          tier_name?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_slug: { Args: { input_text: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_product_sales: {
        Args: { p_amount?: number; p_id: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalculate_waitlist_positions: { Args: never; Returns: undefined }
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
