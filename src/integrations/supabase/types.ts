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
      access_grants: {
        Row: {
          access_level: string
          expires_at: string | null
          granted_at: string
          id: string
          metadata: Json | null
          resource_id: string
          resource_type: string
          revoke_reason: string | null
          revoked_at: string | null
          source: string
          stream_id: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          access_level?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          metadata?: Json | null
          resource_id: string
          resource_type: string
          revoke_reason?: string | null
          revoked_at?: string | null
          source: string
          stream_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          access_level?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string
          resource_type?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          source?: string
          stream_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      activity_feed_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          target_album_id: string | null
          target_playlist_id: string | null
          target_track_id: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          target_album_id?: string | null
          target_playlist_id?: string | null
          target_track_id?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          target_album_id?: string | null
          target_playlist_id?: string | null
          target_track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_events_target_album_id_fkey"
            columns: ["target_album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_events_target_playlist_id_fkey"
            columns: ["target_playlist_id"]
            isOneToOne: false
            referencedRelation: "music_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_events_target_track_id_fkey"
            columns: ["target_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_campaigns_published: {
        Row: {
          brief: Json
          builder_draft_id: string | null
          external_ad_id: string | null
          external_adset_id: string | null
          external_campaign_id: string
          id: string
          last_synced_at: string | null
          provider: string
          published_at: string
          status: string
          user_id: string
        }
        Insert: {
          brief: Json
          builder_draft_id?: string | null
          external_ad_id?: string | null
          external_adset_id?: string | null
          external_campaign_id: string
          id?: string
          last_synced_at?: string | null
          provider: string
          published_at?: string
          status: string
          user_id: string
        }
        Update: {
          brief?: Json
          builder_draft_id?: string | null
          external_ad_id?: string | null
          external_adset_id?: string | null
          external_campaign_id?: string
          id?: string
          last_synced_at?: string | null
          provider?: string
          published_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_connections: {
        Row: {
          access_token: string
          account_data: Json | null
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          refresh_token: string | null
          scopes: string[] | null
          selected_ad_account_id: string | null
          selected_ig_account_id: string | null
          selected_page_id: string | null
          selected_pixel_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          account_data?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          scopes?: string[] | null
          selected_ad_account_id?: string | null
          selected_ig_account_id?: string | null
          selected_page_id?: string | null
          selected_pixel_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          account_data?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          scopes?: string[] | null
          selected_ad_account_id?: string | null
          selected_ig_account_id?: string | null
          selected_page_id?: string | null
          selected_pixel_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_integrations: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          is_active: boolean
          pixel_id: string
          platform: string
          test_event_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          pixel_id: string
          platform: string
          test_event_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          pixel_id?: string
          platform?: string
          test_event_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notification_batch: {
        Row: {
          dispatched: boolean | null
          event_count: number | null
          event_type: string
          first_event_at: string | null
          id: string
          last_event_at: string | null
          metadata: Json | null
        }
        Insert: {
          dispatched?: boolean | null
          event_count?: number | null
          event_type: string
          first_event_at?: string | null
          id?: string
          last_event_at?: string | null
          metadata?: Json | null
        }
        Update: {
          dispatched?: boolean | null
          event_count?: number | null
          event_type?: string
          first_event_at?: string | null
          id?: string
          last_event_at?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      admin_notification_config: {
        Row: {
          admin_id: string
          batch_window_seconds: number | null
          created_at: string | null
          email_enabled: boolean | null
          event_type: string
          id: string
          in_app_enabled: boolean | null
          min_amount: number | null
          push_enabled: boolean | null
        }
        Insert: {
          admin_id: string
          batch_window_seconds?: number | null
          created_at?: string | null
          email_enabled?: boolean | null
          event_type: string
          id?: string
          in_app_enabled?: boolean | null
          min_amount?: number | null
          push_enabled?: boolean | null
        }
        Update: {
          admin_id?: string
          batch_window_seconds?: number | null
          created_at?: string | null
          email_enabled?: boolean | null
          event_type?: string
          id?: string
          in_app_enabled?: boolean | null
          min_amount?: number | null
          push_enabled?: boolean | null
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
          username_slug: string | null
        }
        Insert: {
          clicks?: number
          code: string
          created_at?: string
          id?: string
          revenue_generated?: number
          signups?: number
          user_id: string
          username_slug?: string | null
        }
        Update: {
          clicks?: number
          code?: string
          created_at?: string
          id?: string
          revenue_generated?: number
          signups?: number
          user_id?: string
          username_slug?: string | null
        }
        Relationships: []
      }
      album_tracks: {
        Row: {
          album_id: string
          track_id: string
          track_number: number
        }
        Insert: {
          album_id: string
          track_id: string
          track_number?: number
        }
        Update: {
          album_id?: string
          track_id?: string
          track_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "album_tracks_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      albums: {
        Row: {
          album_type: string
          cover_art_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_published: boolean
          release_date: string | null
          search_vector: unknown
          title: string
        }
        Insert: {
          album_type?: string
          cover_art_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_published?: boolean
          release_date?: string | null
          search_vector?: unknown
          title: string
        }
        Update: {
          album_type?: string
          cover_art_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_published?: boolean
          release_date?: string | null
          search_vector?: unknown
          title?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          requests_today: number | null
          requests_total: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          requests_today?: number | null
          requests_total?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          requests_today?: number | null
          requests_total?: number | null
          user_id?: string
        }
        Relationships: []
      }
      api_webhooks: {
        Row: {
          created_at: string | null
          events: string[]
          id: string
          is_active: boolean | null
          secret: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          secret: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          secret?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      aria_actions: {
        Row: {
          created_at: string
          creator_id: string
          error: string | null
          executed_at: string | null
          id: string
          intent: string
          parsed_params: Json
          requires_approval: boolean
          result: Json | null
          status: string
          summary: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          error?: string | null
          executed_at?: string | null
          id?: string
          intent: string
          parsed_params?: Json
          requires_approval?: boolean
          result?: Json | null
          status?: string
          summary?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          error?: string | null
          executed_at?: string | null
          id?: string
          intent?: string
          parsed_params?: Json
          requires_approval?: boolean
          result?: Json | null
          status?: string
          summary?: string | null
        }
        Relationships: []
      }
      aria_agent_handoffs: {
        Row: {
          created_at: string | null
          creator_id: string
          from_agent: string | null
          handoff_type: string | null
          id: string
          payload: Json | null
          processed_at: string | null
          status: string | null
          to_agent: string | null
          trigger_task_id: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          from_agent?: string | null
          handoff_type?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string | null
          to_agent?: string | null
          trigger_task_id?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          from_agent?: string | null
          handoff_type?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string | null
          to_agent?: string | null
          trigger_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aria_agent_handoffs_trigger_task_id_fkey"
            columns: ["trigger_task_id"]
            isOneToOne: false
            referencedRelation: "aria_agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      aria_agent_insights: {
        Row: {
          action_label: string | null
          action_url: string | null
          agent_type: string | null
          body: string | null
          confidence: number | null
          created_at: string | null
          creator_id: string
          expires_at: string | null
          id: string
          insight_type: string | null
          is_read: boolean | null
          priority: number | null
          source_task_id: string | null
          title: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          agent_type?: string | null
          body?: string | null
          confidence?: number | null
          created_at?: string | null
          creator_id: string
          expires_at?: string | null
          id?: string
          insight_type?: string | null
          is_read?: boolean | null
          priority?: number | null
          source_task_id?: string | null
          title?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          agent_type?: string | null
          body?: string | null
          confidence?: number | null
          created_at?: string | null
          creator_id?: string
          expires_at?: string | null
          id?: string
          insight_type?: string | null
          is_read?: boolean | null
          priority?: number | null
          source_task_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aria_agent_insights_source_task_id_fkey"
            columns: ["source_task_id"]
            isOneToOne: false
            referencedRelation: "aria_agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      aria_agent_memory: {
        Row: {
          agent_type: string | null
          confidence: number | null
          created_at: string | null
          creator_id: string
          id: string
          key: string | null
          last_observed_at: string | null
          memory_type: string | null
          observation_count: number | null
          value: Json | null
        }
        Insert: {
          agent_type?: string | null
          confidence?: number | null
          created_at?: string | null
          creator_id: string
          id?: string
          key?: string | null
          last_observed_at?: string | null
          memory_type?: string | null
          observation_count?: number | null
          value?: Json | null
        }
        Update: {
          agent_type?: string | null
          confidence?: number | null
          created_at?: string | null
          creator_id?: string
          id?: string
          key?: string | null
          last_observed_at?: string | null
          memory_type?: string | null
          observation_count?: number | null
          value?: Json | null
        }
        Relationships: []
      }
      aria_agent_tasks: {
        Row: {
          agent_id: string | null
          agent_type: string | null
          completed_at: string | null
          confidence: number | null
          created_at: string | null
          creator_feedback: string | null
          creator_id: string
          error_message: string | null
          handoff_data: Json | null
          handoff_to_agent: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          requires_approval: boolean | null
          started_at: string | null
          status: string | null
          task_title: string | null
          task_type: string | null
          triggered_by: string | null
          triggered_by_agent: string | null
          was_approved: boolean | null
        }
        Insert: {
          agent_id?: string | null
          agent_type?: string | null
          completed_at?: string | null
          confidence?: number | null
          created_at?: string | null
          creator_feedback?: string | null
          creator_id: string
          error_message?: string | null
          handoff_data?: Json | null
          handoff_to_agent?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          requires_approval?: boolean | null
          started_at?: string | null
          status?: string | null
          task_title?: string | null
          task_type?: string | null
          triggered_by?: string | null
          triggered_by_agent?: string | null
          was_approved?: boolean | null
        }
        Update: {
          agent_id?: string | null
          agent_type?: string | null
          completed_at?: string | null
          confidence?: number | null
          created_at?: string | null
          creator_feedback?: string | null
          creator_id?: string
          error_message?: string | null
          handoff_data?: Json | null
          handoff_to_agent?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          requires_approval?: boolean | null
          started_at?: string | null
          status?: string | null
          task_title?: string | null
          task_type?: string | null
          triggered_by?: string | null
          triggered_by_agent?: string | null
          was_approved?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "aria_agent_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "aria_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      aria_agents: {
        Row: {
          agent_type: string
          confidence_score: number | null
          config: Json | null
          created_at: string | null
          creator_id: string
          id: string
          last_active_at: string | null
          memory: Json | null
          performance_data: Json | null
          status: string | null
          tasks_approved: number | null
          tasks_completed: number | null
          tasks_rejected: number | null
        }
        Insert: {
          agent_type: string
          confidence_score?: number | null
          config?: Json | null
          created_at?: string | null
          creator_id: string
          id?: string
          last_active_at?: string | null
          memory?: Json | null
          performance_data?: Json | null
          status?: string | null
          tasks_approved?: number | null
          tasks_completed?: number | null
          tasks_rejected?: number | null
        }
        Update: {
          agent_type?: string
          confidence_score?: number | null
          config?: Json | null
          created_at?: string | null
          creator_id?: string
          id?: string
          last_active_at?: string | null
          memory?: Json | null
          performance_data?: Json | null
          status?: string | null
          tasks_approved?: number | null
          tasks_completed?: number | null
          tasks_rejected?: number | null
        }
        Relationships: []
      }
      aria_content_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          creator_id: string
          error_message: string | null
          id: string
          outputs: Json | null
          progress: number | null
          source_duration_seconds: number | null
          source_id: string
          source_title: string | null
          source_type: string
          started_at: string | null
          status: string | null
          transcript_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          creator_id: string
          error_message?: string | null
          id?: string
          outputs?: Json | null
          progress?: number | null
          source_duration_seconds?: number | null
          source_id: string
          source_title?: string | null
          source_type: string
          started_at?: string | null
          status?: string | null
          transcript_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          creator_id?: string
          error_message?: string | null
          id?: string
          outputs?: Json | null
          progress?: number | null
          source_duration_seconds?: number | null
          source_id?: string
          source_title?: string | null
          source_type?: string
          started_at?: string | null
          status?: string | null
          transcript_id?: string | null
        }
        Relationships: []
      }
      aria_daily_reports: {
        Row: {
          community_agent_summary: Json | null
          content_agent_summary: Json | null
          content_pieces_created: number | null
          created_at: string | null
          creator_id: string
          growth_agent_summary: Json | null
          hours_saved: number | null
          id: string
          members_gained: number | null
          narrative: string | null
          operations_agent_summary: Json | null
          report_date: string | null
          revenue_generated: number | null
          sales_agent_summary: Json | null
          total_tasks_completed: number | null
        }
        Insert: {
          community_agent_summary?: Json | null
          content_agent_summary?: Json | null
          content_pieces_created?: number | null
          created_at?: string | null
          creator_id: string
          growth_agent_summary?: Json | null
          hours_saved?: number | null
          id?: string
          members_gained?: number | null
          narrative?: string | null
          operations_agent_summary?: Json | null
          report_date?: string | null
          revenue_generated?: number | null
          sales_agent_summary?: Json | null
          total_tasks_completed?: number | null
        }
        Update: {
          community_agent_summary?: Json | null
          content_agent_summary?: Json | null
          content_pieces_created?: number | null
          created_at?: string | null
          creator_id?: string
          growth_agent_summary?: Json | null
          hours_saved?: number | null
          id?: string
          members_gained?: number | null
          narrative?: string | null
          operations_agent_summary?: Json | null
          report_date?: string | null
          revenue_generated?: number | null
          sales_agent_summary?: Json | null
          total_tasks_completed?: number | null
        }
        Relationships: []
      }
      aria_distribution_queue: {
        Row: {
          content_id: string | null
          created_at: string | null
          creator_id: string
          id: string
          platform: string
          result: Json | null
          scheduled_at: string
          status: string | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          creator_id: string
          id?: string
          platform: string
          result?: Json | null
          scheduled_at: string
          status?: string | null
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          creator_id?: string
          id?: string
          platform?: string
          result?: Json | null
          scheduled_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aria_distribution_queue_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "aria_generated_content"
            referencedColumns: ["id"]
          },
        ]
      }
      aria_distribution_settings: {
        Row: {
          auto_distribute_recordings: boolean | null
          auto_distribute_videos: boolean | null
          auto_post_community: boolean | null
          auto_post_instagram: boolean | null
          auto_post_linkedin: boolean | null
          auto_post_tiktok: boolean | null
          auto_post_twitter: boolean | null
          auto_post_youtube_shorts: boolean | null
          auto_process_new_content: boolean | null
          auto_send_email_blast: boolean | null
          content_tone: string | null
          created_at: string | null
          creator_id: string
          id: string
          max_clip_seconds: number | null
          max_clips_per_job: number | null
          min_clip_seconds: number | null
          n8n_enabled: boolean | null
          posting_schedule: string | null
          primary_platform: string | null
          require_approval: boolean | null
        }
        Insert: {
          auto_distribute_recordings?: boolean | null
          auto_distribute_videos?: boolean | null
          auto_post_community?: boolean | null
          auto_post_instagram?: boolean | null
          auto_post_linkedin?: boolean | null
          auto_post_tiktok?: boolean | null
          auto_post_twitter?: boolean | null
          auto_post_youtube_shorts?: boolean | null
          auto_process_new_content?: boolean | null
          auto_send_email_blast?: boolean | null
          content_tone?: string | null
          created_at?: string | null
          creator_id: string
          id?: string
          max_clip_seconds?: number | null
          max_clips_per_job?: number | null
          min_clip_seconds?: number | null
          n8n_enabled?: boolean | null
          posting_schedule?: string | null
          primary_platform?: string | null
          require_approval?: boolean | null
        }
        Update: {
          auto_distribute_recordings?: boolean | null
          auto_distribute_videos?: boolean | null
          auto_post_community?: boolean | null
          auto_post_instagram?: boolean | null
          auto_post_linkedin?: boolean | null
          auto_post_tiktok?: boolean | null
          auto_post_twitter?: boolean | null
          auto_post_youtube_shorts?: boolean | null
          auto_process_new_content?: boolean | null
          auto_send_email_blast?: boolean | null
          content_tone?: string | null
          created_at?: string | null
          creator_id?: string
          id?: string
          max_clip_seconds?: number | null
          max_clips_per_job?: number | null
          min_clip_seconds?: number | null
          n8n_enabled?: boolean | null
          posting_schedule?: string | null
          primary_platform?: string | null
          require_approval?: boolean | null
        }
        Relationships: []
      }
      aria_funnels: {
        Row: {
          ad_copy: Json | null
          conversions: number | null
          created_at: string | null
          created_by: string | null
          creator_id: string
          email_sequence: Json | null
          id: string
          landing_page_copy: Json | null
          name: string | null
          product_id: string | null
          revenue: number | null
          status: string | null
          visitors: number | null
        }
        Insert: {
          ad_copy?: Json | null
          conversions?: number | null
          created_at?: string | null
          created_by?: string | null
          creator_id: string
          email_sequence?: Json | null
          id?: string
          landing_page_copy?: Json | null
          name?: string | null
          product_id?: string | null
          revenue?: number | null
          status?: string | null
          visitors?: number | null
        }
        Update: {
          ad_copy?: Json | null
          conversions?: number | null
          created_at?: string | null
          created_by?: string | null
          creator_id?: string
          email_sequence?: Json | null
          id?: string
          landing_page_copy?: Json | null
          name?: string | null
          product_id?: string | null
          revenue?: number | null
          status?: string | null
          visitors?: number | null
        }
        Relationships: []
      }
      aria_generated_content: {
        Row: {
          body: string | null
          content_type: string
          created_at: string | null
          creator_id: string
          id: string
          job_id: string | null
          metadata: Json | null
          mux_clip_asset_id: string | null
          mux_clip_playback_id: string | null
          performance_data: Json | null
          platform: string | null
          published_at: string | null
          scheduled_at: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          body?: string | null
          content_type: string
          created_at?: string | null
          creator_id: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          mux_clip_asset_id?: string | null
          mux_clip_playback_id?: string | null
          performance_data?: Json | null
          platform?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          body?: string | null
          content_type?: string
          created_at?: string | null
          creator_id?: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          mux_clip_asset_id?: string | null
          mux_clip_playback_id?: string | null
          performance_data?: Json | null
          platform?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aria_generated_content_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "aria_content_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      aria_platform_learnings: {
        Row: {
          agent_type: string | null
          confidence: number | null
          created_at: string | null
          creator_type: string | null
          id: string
          key: string | null
          last_updated_at: string | null
          learning_type: string | null
          sample_size: number | null
          value: Json | null
        }
        Insert: {
          agent_type?: string | null
          confidence?: number | null
          created_at?: string | null
          creator_type?: string | null
          id?: string
          key?: string | null
          last_updated_at?: string | null
          learning_type?: string | null
          sample_size?: number | null
          value?: Json | null
        }
        Update: {
          agent_type?: string | null
          confidence?: number | null
          created_at?: string | null
          creator_type?: string | null
          id?: string
          key?: string | null
          last_updated_at?: string | null
          learning_type?: string | null
          sample_size?: number | null
          value?: Json | null
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
      aria_sales_conversations: {
        Row: {
          conversation_log: Json | null
          created_at: string | null
          creator_id: string
          discount_code: string | null
          discount_offered: number | null
          id: string
          outcome: string | null
          product_recommended: string | null
          revenue_generated: number | null
          trigger_event: string | null
          visitor_id: string | null
        }
        Insert: {
          conversation_log?: Json | null
          created_at?: string | null
          creator_id: string
          discount_code?: string | null
          discount_offered?: number | null
          id?: string
          outcome?: string | null
          product_recommended?: string | null
          revenue_generated?: number | null
          trigger_event?: string | null
          visitor_id?: string | null
        }
        Update: {
          conversation_log?: Json | null
          created_at?: string | null
          creator_id?: string
          discount_code?: string | null
          discount_offered?: number | null
          id?: string
          outcome?: string | null
          product_recommended?: string | null
          revenue_generated?: number | null
          trigger_event?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      aria_usage_tracking: {
        Row: {
          api_calls: number | null
          budget_limit: number | null
          clips_generated: number | null
          created_at: string | null
          creator_id: string
          emails_sent: number | null
          id: string
          month: string | null
          tokens_used: number | null
        }
        Insert: {
          api_calls?: number | null
          budget_limit?: number | null
          clips_generated?: number | null
          created_at?: string | null
          creator_id: string
          emails_sent?: number | null
          id?: string
          month?: string | null
          tokens_used?: number | null
        }
        Update: {
          api_calls?: number | null
          budget_limit?: number | null
          clips_generated?: number | null
          created_at?: string | null
          creator_id?: string
          emails_sent?: number | null
          id?: string
          month?: string | null
          tokens_used?: number | null
        }
        Relationships: []
      }
      artist_merch: {
        Row: {
          artist_id: string
          created_at: string
          currency: string
          description: string | null
          external_url: string | null
          id: string
          image_url: string | null
          in_stock: boolean
          kind: string
          price_cents: number
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          currency?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          kind?: string
          price_cents?: number
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          kind?: string
          price_cents?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      artist_merch_items: {
        Row: {
          artist_id: string
          created_at: string
          currency: string
          external_url: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price_cents: number
        }
        Insert: {
          artist_id: string
          created_at?: string
          currency?: string
          external_url?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price_cents?: number
        }
        Update: {
          artist_id?: string
          created_at?: string
          currency?: string
          external_url?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price_cents?: number
        }
        Relationships: []
      }
      artist_merch_variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          merch_id: string
          position: number
          price_cents_override: number | null
          size: string | null
          sku: string | null
          stock_count: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          merch_id: string
          position?: number
          price_cents_override?: number | null
          size?: string | null
          sku?: string | null
          stock_count?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          merch_id?: string
          position?: number
          price_cents_override?: number | null
          size?: string | null
          sku?: string | null
          stock_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_merch_variants_merch_id_fkey"
            columns: ["merch_id"]
            isOneToOne: false
            referencedRelation: "artist_merch"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "artist_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_messages: {
        Row: {
          artist_id: string
          body: string
          created_at: string
          id: string
          link_url: string | null
          sent_at: string
          target: string
          title: string
        }
        Insert: {
          artist_id: string
          body: string
          created_at?: string
          id?: string
          link_url?: string | null
          sent_at?: string
          target?: string
          title: string
        }
        Update: {
          artist_id?: string
          body?: string
          created_at?: string
          id?: string
          link_url?: string | null
          sent_at?: string
          target?: string
          title?: string
        }
        Relationships: []
      }
      artist_profiles: {
        Row: {
          about_md: string | null
          artist_bio: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          header_image_url: string | null
          hero_image_url: string | null
          hero_logo_url: string | null
          id: string
          is_verified: boolean
          monthly_listeners_cache: number
          page_published: boolean
          page_theme: Json
          pinned_playlist_id: string | null
          related_artists: string[]
          section_order: string[]
          section_visibility: Json
          seo_description: string | null
          seo_og_image: string | null
          seo_title: string | null
          social_links: Json
          spotlight_track_ids: string[]
          tagline: string | null
          updated_at: string
          user_id: string
          vanity_slug: string | null
        }
        Insert: {
          about_md?: string | null
          artist_bio?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          header_image_url?: string | null
          hero_image_url?: string | null
          hero_logo_url?: string | null
          id?: string
          is_verified?: boolean
          monthly_listeners_cache?: number
          page_published?: boolean
          page_theme?: Json
          pinned_playlist_id?: string | null
          related_artists?: string[]
          section_order?: string[]
          section_visibility?: Json
          seo_description?: string | null
          seo_og_image?: string | null
          seo_title?: string | null
          social_links?: Json
          spotlight_track_ids?: string[]
          tagline?: string | null
          updated_at?: string
          user_id: string
          vanity_slug?: string | null
        }
        Update: {
          about_md?: string | null
          artist_bio?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          header_image_url?: string | null
          hero_image_url?: string | null
          hero_logo_url?: string | null
          id?: string
          is_verified?: boolean
          monthly_listeners_cache?: number
          page_published?: boolean
          page_theme?: Json
          pinned_playlist_id?: string | null
          related_artists?: string[]
          section_order?: string[]
          section_visibility?: Json
          seo_description?: string | null
          seo_og_image?: string | null
          seo_title?: string | null
          social_links?: Json
          spotlight_track_ids?: string[]
          tagline?: string | null
          updated_at?: string
          user_id?: string
          vanity_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_profiles_pinned_playlist_id_fkey"
            columns: ["pinned_playlist_id"]
            isOneToOne: false
            referencedRelation: "music_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_sub_tiers: {
        Row: {
          active: boolean
          artist_id: string
          created_at: string
          description: string | null
          id: string
          monthly_price_cents: number
          name: string
          perks: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          artist_id: string
          created_at?: string
          description?: string | null
          id?: string
          monthly_price_cents: number
          name: string
          perks?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          artist_id?: string
          created_at?: string
          description?: string | null
          id?: string
          monthly_price_cents?: number
          name?: string
          perks?: Json
          updated_at?: string
        }
        Relationships: []
      }
      artist_subscriptions: {
        Row: {
          artist_id: string
          created_at: string
          current_period_end: string | null
          fan_id: string
          id: string
          started_at: string
          status: string
          tier_id: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          current_period_end?: string | null
          fan_id: string
          id?: string
          started_at?: string
          status?: string
          tier_id: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          current_period_end?: string | null
          fan_id?: string
          id?: string
          started_at?: string
          status?: string
          tier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "artist_sub_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_tour_dates: {
        Row: {
          artist_id: string
          city: string
          country: string | null
          created_at: string
          event_date: string
          id: string
          is_sold_out: boolean
          ticket_url: string | null
          venue_name: string
        }
        Insert: {
          artist_id: string
          city: string
          country?: string | null
          created_at?: string
          event_date: string
          id?: string
          is_sold_out?: boolean
          ticket_url?: string | null
          venue_name: string
        }
        Update: {
          artist_id?: string
          city?: string
          country?: string | null
          created_at?: string
          event_date?: string
          id?: string
          is_sold_out?: boolean
          ticket_url?: string | null
          venue_name?: string
        }
        Relationships: []
      }
      artist_verification_applications: {
        Row: {
          admin_notes: string | null
          artist_name: string
          created_at: string
          evidence_urls: Json
          id: string
          legal_name: string
          monthly_listeners: number | null
          primary_link: string | null
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          social_links: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          artist_name: string
          created_at?: string
          evidence_urls?: Json
          id?: string
          legal_name: string
          monthly_listeners?: number | null
          primary_link?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_links?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          artist_name?: string
          created_at?: string
          evidence_urls?: Json
          id?: string
          legal_name?: string
          monthly_listeners?: number | null
          primary_link?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_links?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          attend_date: string
          created_at: string | null
          event_date: string | null
          event_id: string | null
          event_title: string | null
          global_event_id: string | null
          id: string
          status: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          attend_date: string
          created_at?: string | null
          event_date?: string | null
          event_id?: string | null
          event_title?: string | null
          global_event_id?: string | null
          id?: string
          status?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          attend_date?: string
          created_at?: string | null
          event_date?: string | null
          event_id?: string | null
          event_title?: string | null
          global_event_id?: string | null
          id?: string
          status?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_global_event_id_fkey"
            columns: ["global_event_id"]
            isOneToOne: false
            referencedRelation: "events_global"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_rate_limits: {
        Row: {
          action_type: string
          attempt_count: number
          blocked_until: string | null
          created_at: string
          id: string
          identifier: string
          window_start: string
        }
        Insert: {
          action_type?: string
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          identifier: string
          window_start?: string
        }
        Update: {
          action_type?: string
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      bio_links: {
        Row: {
          click_count: number | null
          created_at: string | null
          creator_id: string
          icon: string | null
          id: string
          is_active: boolean | null
          link_type: string | null
          position: number | null
          title: string
          url: string
        }
        Insert: {
          click_count?: number | null
          created_at?: string | null
          creator_id: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          link_type?: string | null
          position?: number | null
          title: string
          url: string
        }
        Update: {
          click_count?: number | null
          created_at?: string | null
          creator_id?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          link_type?: string | null
          position?: number | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      boost_toast_events: {
        Row: {
          boost_key: string
          boost_state: string
          content_id: string | null
          content_type: string | null
          created_at: string
          creator_id: string | null
          event_name: string
          id: string
          route: string | null
          user_id: string | null
          via: string | null
        }
        Insert: {
          boost_key: string
          boost_state: string
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          event_name: string
          id?: string
          route?: string | null
          user_id?: string | null
          via?: string | null
        }
        Update: {
          boost_key?: string
          boost_state?: string
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          creator_id?: string | null
          event_name?: string
          id?: string
          route?: string | null
          user_id?: string | null
          via?: string | null
        }
        Relationships: []
      }
      brand_campaigns: {
        Row: {
          application_count: number | null
          application_deadline: string | null
          brand_id: string
          budget_max: number
          budget_min: number
          campaign_type: string
          created_at: string | null
          deliverables: string
          description: string
          id: string
          max_creators: number | null
          status: string | null
          target_min_members: number | null
          target_niches: string[] | null
          timeline_days: number
          title: string
        }
        Insert: {
          application_count?: number | null
          application_deadline?: string | null
          brand_id: string
          budget_max?: number
          budget_min?: number
          campaign_type: string
          created_at?: string | null
          deliverables?: string
          description?: string
          id?: string
          max_creators?: number | null
          status?: string | null
          target_min_members?: number | null
          target_niches?: string[] | null
          timeline_days?: number
          title: string
        }
        Update: {
          application_count?: number | null
          application_deadline?: string | null
          brand_id?: string
          budget_max?: number
          budget_min?: number
          campaign_type?: string
          created_at?: string | null
          deliverables?: string
          description?: string
          id?: string
          max_creators?: number | null
          status?: string | null
          target_min_members?: number | null
          target_niches?: string[] | null
          timeline_days?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_deals: {
        Row: {
          agreed_rate: number
          application_id: string | null
          brand_id: string
          campaign_id: string | null
          created_at: string | null
          creator_id: string
          creator_payout_amount: number | null
          deadline: string | null
          deliverables: string
          id: string
          status: string | null
          uply_fee_amount: number | null
          uply_fee_percentage: number | null
        }
        Insert: {
          agreed_rate?: number
          application_id?: string | null
          brand_id: string
          campaign_id?: string | null
          created_at?: string | null
          creator_id: string
          creator_payout_amount?: number | null
          deadline?: string | null
          deliverables?: string
          id?: string
          status?: string | null
          uply_fee_amount?: number | null
          uply_fee_percentage?: number | null
        }
        Update: {
          agreed_rate?: number
          application_id?: string | null
          brand_id?: string
          campaign_id?: string | null
          created_at?: string | null
          creator_id?: string
          creator_payout_amount?: number | null
          deadline?: string | null
          deliverables?: string
          id?: string
          status?: string | null
          uply_fee_amount?: number | null
          uply_fee_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_deals_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "campaign_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_deals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_deals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "brand_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_profiles: {
        Row: {
          company_name: string
          created_at: string | null
          description: string | null
          id: string
          industry: string | null
          logo_url: string | null
          total_campaigns: number | null
          total_spent: number | null
          user_id: string
          verified: boolean | null
          website: string | null
        }
        Insert: {
          company_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          total_campaigns?: number | null
          total_spent?: number | null
          user_id: string
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          total_campaigns?: number | null
          total_spent?: number | null
          user_id?: string
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      broadcast_messages: {
        Row: {
          content: string
          created_at: string | null
          creator_id: string
          event_id: string | null
          id: string
          media_url: string | null
          message_type: string | null
          poll_options: Json | null
          poll_votes: Json | null
          view_count: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          creator_id: string
          event_id?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          poll_options?: Json | null
          poll_votes?: Json | null
          view_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          creator_id?: string
          event_id?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          poll_options?: Json | null
          poll_votes?: Json | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_messages_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_messages_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_tracking_events: {
        Row: {
          broadcast_id: string
          created_at: string
          event_type: string
          id: string
          link_url: string | null
          subscriber_email: string
          user_agent: string | null
        }
        Insert: {
          broadcast_id: string
          created_at?: string
          event_type?: string
          id?: string
          link_url?: string | null
          subscriber_email: string
          user_agent?: string | null
        }
        Update: {
          broadcast_id?: string
          created_at?: string
          event_type?: string
          id?: string
          link_url?: string | null
          subscriber_email?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_tracking_events_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "email_broadcasts"
            referencedColumns: ["id"]
          },
        ]
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
      campaign_applications: {
        Row: {
          applied_at: string | null
          campaign_id: string
          creator_id: string
          id: string
          pitch: string
          proposed_rate: number | null
          status: string | null
        }
        Insert: {
          applied_at?: string | null
          campaign_id: string
          creator_id: string
          id?: string
          pitch?: string
          proposed_rate?: number | null
          status?: string | null
        }
        Update: {
          applied_at?: string | null
          campaign_id?: string
          creator_id?: string
          id?: string
          pitch?: string
          proposed_rate?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_applications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "brand_campaigns"
            referencedColumns: ["id"]
          },
        ]
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
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          source_content_id: string | null
          source_content_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          source_content_id?: string | null
          source_content_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          source_content_id?: string | null
          source_content_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
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
      channel_follows: {
        Row: {
          channel_slug: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          channel_slug: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          channel_slug?: string
          created_at?: string | null
          id?: string
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
          featured_product_id: string | null
          id: string
          is_auto_short: boolean
          is_public: boolean
          like_count: number
          share_count: number
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
          featured_product_id?: string | null
          id?: string
          is_auto_short?: boolean
          is_public?: boolean
          like_count?: number
          share_count?: number
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
          featured_product_id?: string | null
          id?: string
          is_auto_short?: boolean
          is_public?: boolean
          like_count?: number
          share_count?: number
          slug?: string | null
          source_asset_id?: string | null
          source_type?: string
          trending_score?: number | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "clips_featured_product_id_fkey"
            columns: ["featured_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clips_featured_product_id_fkey"
            columns: ["featured_product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
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
      comment_reports: {
        Row: {
          comment_id: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id: string
          status?: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "short_comments"
            referencedColumns: ["id"]
          },
        ]
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
      contact_sync: {
        Row: {
          created_at: string
          matched_user_id: string | null
          phone_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          matched_user_id?: string | null
          phone_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          matched_user_id?: string | null
          phone_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      content_boosts: {
        Row: {
          amount_usd: number
          clicks: number
          content_id: string
          content_type: string
          created_at: string
          creator_id: string
          expires_at: string | null
          id: string
          impressions: number
          starts_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          amount_usd: number
          clicks?: number
          content_id: string
          content_type: string
          created_at?: string
          creator_id: string
          expires_at?: string | null
          id?: string
          impressions?: number
          starts_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier: string
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          clicks?: number
          content_id?: string
          content_type?: string
          created_at?: string
          creator_id?: string
          expires_at?: string | null
          id?: string
          impressions?: number
          starts_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_distribution_jobs: {
        Row: {
          completed_at: string | null
          content_id: string
          content_type: string
          created_at: string | null
          creator_id: string
          description: string | null
          error_message: string | null
          id: string
          platform: string
          platform_post_id: string | null
          platform_url: string | null
          queued_at: string | null
          started_at: string | null
          status: string
          title: string | null
        }
        Insert: {
          completed_at?: string | null
          content_id: string
          content_type?: string
          created_at?: string | null
          creator_id: string
          description?: string | null
          error_message?: string | null
          id?: string
          platform: string
          platform_post_id?: string | null
          platform_url?: string | null
          queued_at?: string | null
          started_at?: string | null
          status?: string
          title?: string | null
        }
        Update: {
          completed_at?: string | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          creator_id?: string
          description?: string | null
          error_message?: string | null
          id?: string
          platform?: string
          platform_post_id?: string | null
          platform_url?: string | null
          queued_at?: string | null
          started_at?: string | null
          status?: string
          title?: string | null
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
      creator_domains: {
        Row: {
          cname_target: string | null
          created_at: string | null
          creator_id: string
          custom_domain: string | null
          domain_status: string | null
          id: string
          ssl_status: string | null
          subdomain: string | null
          verified_at: string | null
        }
        Insert: {
          cname_target?: string | null
          created_at?: string | null
          creator_id: string
          custom_domain?: string | null
          domain_status?: string | null
          id?: string
          ssl_status?: string | null
          subdomain?: string | null
          verified_at?: string | null
        }
        Update: {
          cname_target?: string | null
          created_at?: string | null
          creator_id?: string
          custom_domain?: string | null
          domain_status?: string | null
          id?: string
          ssl_status?: string | null
          subdomain?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      creator_newsletters: {
        Row: {
          click_count: number | null
          created_at: string | null
          creator_id: string
          html_content: string | null
          id: string
          open_count: number | null
          plain_text_content: string | null
          preview_text: string | null
          recipient_count: number | null
          recipient_type: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          title: string
          updated_at: string | null
        }
        Insert: {
          click_count?: number | null
          created_at?: string | null
          creator_id: string
          html_content?: string | null
          id?: string
          open_count?: number | null
          plain_text_content?: string | null
          preview_text?: string | null
          recipient_count?: number | null
          recipient_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          title?: string
          updated_at?: string | null
        }
        Update: {
          click_count?: number | null
          created_at?: string | null
          creator_id?: string
          html_content?: string | null
          id?: string
          open_count?: number | null
          plain_text_content?: string | null
          preview_text?: string | null
          recipient_count?: number | null
          recipient_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      creator_pages: {
        Row: {
          content: Json | null
          created_at: string | null
          creator_id: string
          id: string
          is_home: boolean | null
          is_published: boolean | null
          page_type: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          creator_id: string
          id?: string
          is_home?: boolean | null
          is_published?: boolean | null
          page_type: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          creator_id?: string
          id?: string
          is_home?: boolean | null
          is_published?: boolean | null
          page_type?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      creator_platform_connections: {
        Row: {
          connected_at: string | null
          creator_id: string
          handle: string | null
          id: string
          is_active: boolean | null
          platform_id: string
        }
        Insert: {
          connected_at?: string | null
          creator_id: string
          handle?: string | null
          id?: string
          is_active?: boolean | null
          platform_id: string
        }
        Update: {
          connected_at?: string | null
          creator_id?: string
          handle?: string | null
          id?: string
          is_active?: boolean | null
          platform_id?: string
        }
        Relationships: []
      }
      creator_platform_oauth: {
        Row: {
          access_token: string | null
          connected_at: string | null
          creator_id: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          platform: string
          platform_channel_name: string | null
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          scopes: string[] | null
          token_expires_at: string | null
        }
        Insert: {
          access_token?: string | null
          connected_at?: string | null
          creator_id: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform: string
          platform_channel_name?: string | null
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
        }
        Update: {
          access_token?: string | null
          connected_at?: string | null
          creator_id?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform?: string
          platform_channel_name?: string | null
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
        }
        Relationships: []
      }
      creator_podcasts: {
        Row: {
          apple_podcasts_url: string | null
          artwork_url: string | null
          author: string | null
          category: string | null
          created_at: string | null
          creator_id: string
          description: string
          id: string
          is_explicit: boolean | null
          is_private: boolean | null
          language: string | null
          spotify_url: string | null
          subscriber_count: number | null
          title: string
          total_plays: number | null
          updated_at: string | null
        }
        Insert: {
          apple_podcasts_url?: string | null
          artwork_url?: string | null
          author?: string | null
          category?: string | null
          created_at?: string | null
          creator_id: string
          description?: string
          id?: string
          is_explicit?: boolean | null
          is_private?: boolean | null
          language?: string | null
          spotify_url?: string | null
          subscriber_count?: number | null
          title?: string
          total_plays?: number | null
          updated_at?: string | null
        }
        Update: {
          apple_podcasts_url?: string | null
          artwork_url?: string | null
          author?: string | null
          category?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string
          id?: string
          is_explicit?: boolean | null
          is_private?: boolean | null
          language?: string | null
          spotify_url?: string | null
          subscriber_count?: number | null
          title?: string
          total_plays?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      creator_reviews: {
        Row: {
          body: string
          created_at: string
          creator_id: string
          id: string
          rating: number
          reviewer_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          creator_id: string
          id?: string
          rating: number
          reviewer_id: string
        }
        Update: {
          body?: string
          created_at?: string
          creator_id?: string
          id?: string
          rating?: number
          reviewer_id?: string
        }
        Relationships: []
      }
      creator_shopify_stores: {
        Row: {
          access_token: string
          created_at: string | null
          creator_id: string
          currency: string | null
          id: string
          is_active: boolean | null
          shop_domain: string
          shop_name: string | null
          synced_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          creator_id: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          shop_domain: string
          shop_name?: string | null
          synced_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          creator_id?: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          shop_domain?: string
          shop_name?: string | null
          synced_at?: string | null
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
      creator_stream_destinations: {
        Row: {
          created_at: string | null
          creator_id: string
          id: string
          is_enabled: boolean | null
          is_verified: boolean | null
          key_created_at: string | null
          key_rotation_reminded_at: string | null
          last_used_at: string | null
          platform: string
          platform_label: string | null
          rtmp_url: string
          stream_key_encrypted: string
          stream_key_last_four: string | null
          stream_key_vault_id: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          id?: string
          is_enabled?: boolean | null
          is_verified?: boolean | null
          key_created_at?: string | null
          key_rotation_reminded_at?: string | null
          last_used_at?: string | null
          platform: string
          platform_label?: string | null
          rtmp_url: string
          stream_key_encrypted: string
          stream_key_last_four?: string | null
          stream_key_vault_id?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          id?: string
          is_enabled?: boolean | null
          is_verified?: boolean | null
          key_created_at?: string | null
          key_rotation_reminded_at?: string | null
          last_used_at?: string | null
          platform?: string
          platform_label?: string | null
          rtmp_url?: string
          stream_key_encrypted?: string
          stream_key_last_four?: string | null
          stream_key_vault_id?: string | null
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
      creator_works: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          display_order: number
          external_url: string | null
          id: string
          is_member_only: boolean
          media_url: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          work_type: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          display_order?: number
          external_url?: string | null
          id?: string
          is_member_only?: boolean
          media_url?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          work_type: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          display_order?: number
          external_url?: string | null
          id?: string
          is_member_only?: boolean
          media_url?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_works_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_works_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
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
      daily_mixes: {
        Row: {
          description: string | null
          id: string
          refreshed_at: string
          seed_genres: string[]
          slot: number
          title: string
          track_ids: string[]
          user_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          refreshed_at?: string
          seed_genres?: string[]
          slot: number
          title: string
          track_ids?: string[]
          user_id: string
        }
        Update: {
          description?: string | null
          id?: string
          refreshed_at?: string
          seed_genres?: string[]
          slot?: number
          title?: string
          track_ids?: string[]
          user_id?: string
        }
        Relationships: []
      }
      deal_messages: {
        Row: {
          created_at: string | null
          deal_id: string
          id: string
          is_read: boolean | null
          message: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          id?: string
          is_read?: boolean | null
          message: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          id?: string
          is_read?: boolean | null
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "brand_deals"
            referencedColumns: ["id"]
          },
        ]
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
          reply_to_story_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read?: boolean
          reply_to_story_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read?: boolean
          reply_to_story_id?: string | null
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
      discover_stories: {
        Row: {
          created_at: string
          created_by: string | null
          cta_label: string | null
          expires_at: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          position: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          expires_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          position?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          position?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      dj_session_cues: {
        Row: {
          at_seconds: number
          bpm: number | null
          created_at: string
          deck: string
          id: string
          label: string | null
          session_id: string
          track_title: string | null
          track_url: string | null
        }
        Insert: {
          at_seconds: number
          bpm?: number | null
          created_at?: string
          deck: string
          id?: string
          label?: string | null
          session_id: string
          track_title?: string | null
          track_url?: string | null
        }
        Update: {
          at_seconds?: number
          bpm?: number | null
          created_at?: string
          deck?: string
          id?: string
          label?: string | null
          session_id?: string
          track_title?: string | null
          track_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dj_session_cues_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "dj_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_sessions: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          duration_seconds: number
          id: string
          is_public: boolean
          play_count: number
          recording_url: string | null
          target_bpm: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number
          id?: string
          is_public?: boolean
          play_count?: number
          recording_url?: string | null
          target_bpm?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number
          id?: string
          is_public?: boolean
          play_count?: number
          recording_url?: string | null
          target_bpm?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dj_song_requests: {
        Row: {
          created_at: string
          currency: string
          dj_id: string
          fan_id: string
          id: string
          message: string | null
          position: number
          session_id: string
          status: string
          tip_amount_cents: number
          track_artist: string | null
          track_title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          dj_id: string
          fan_id: string
          id?: string
          message?: string | null
          position?: number
          session_id: string
          status?: string
          tip_amount_cents?: number
          track_artist?: string | null
          track_title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          dj_id?: string
          fan_id?: string
          id?: string
          message?: string | null
          position?: number
          session_id?: string
          status?: string
          tip_amount_cents?: number
          track_artist?: string | null
          track_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      drip_sequence_enrollments: {
        Row: {
          completed_at: string | null
          current_step: number
          enrolled_at: string
          id: string
          last_step_sent_at: string | null
          sequence_id: string
          status: string
          subscriber_email: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: number
          enrolled_at?: string
          id?: string
          last_step_sent_at?: string | null
          sequence_id: string
          status?: string
          subscriber_email: string
        }
        Update: {
          completed_at?: string | null
          current_step?: number
          enrolled_at?: string
          id?: string
          last_step_sent_at?: string | null
          sequence_id?: string
          status?: string
          subscriber_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "drip_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "drip_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_sequence_sends: {
        Row: {
          clicked_at: string | null
          enrollment_id: string
          id: string
          opened_at: string | null
          sent_at: string
          status: string
          step_id: string
        }
        Insert: {
          clicked_at?: string | null
          enrollment_id: string
          id?: string
          opened_at?: string | null
          sent_at?: string
          status?: string
          step_id: string
        }
        Update: {
          clicked_at?: string | null
          enrollment_id?: string
          id?: string
          opened_at?: string | null
          sent_at?: string
          status?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drip_sequence_sends_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "drip_sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drip_sequence_sends_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "drip_sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_sequence_steps: {
        Row: {
          body: string
          condition_type: string | null
          condition_value: string | null
          created_at: string
          delay_hours: number
          id: string
          on_false_step: number | null
          on_true_step: number | null
          sequence_id: string
          step_number: number
          subject: string
        }
        Insert: {
          body?: string
          condition_type?: string | null
          condition_value?: string | null
          created_at?: string
          delay_hours?: number
          id?: string
          on_false_step?: number | null
          on_true_step?: number | null
          sequence_id: string
          step_number?: number
          subject?: string
        }
        Update: {
          body?: string
          condition_type?: string | null
          condition_value?: string | null
          created_at?: string
          delay_hours?: number
          id?: string
          on_false_step?: number | null
          on_true_step?: number | null
          sequence_id?: string
          step_number?: number
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "drip_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "drip_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_sequences: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          name: string
          status: string
          trigger_event: string
          trigger_tag: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          name?: string
          status?: string
          trigger_event?: string
          trigger_tag?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          name?: string
          status?: string
          trigger_event?: string
          trigger_tag?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dsp_connections: {
        Row: {
          access_token: string | null
          created_at: string
          external_user_id: string | null
          id: string
          metadata: Json | null
          provider: string
          refresh_token: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          external_user_id?: string | null
          id?: string
          metadata?: Json | null
          provider: string
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          external_user_id?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      edge_function_rate_limits: {
        Row: {
          call_count: number | null
          key: string
          updated_at: string | null
          window_start: string | null
        }
        Insert: {
          call_count?: number | null
          key: string
          updated_at?: string | null
          window_start?: string | null
        }
        Update: {
          call_count?: number | null
          key?: string
          updated_at?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      email_broadcasts: {
        Row: {
          ab_body_b: string | null
          ab_parent_id: string | null
          ab_test_size: number | null
          ab_variant_a: string | null
          ab_variant_b: string | null
          ab_winner: string | null
          ab_winner_sent: boolean | null
          body: string
          bounce_count: number
          click_count: number | null
          complaint_count: number
          created_at: string
          creator_id: string
          delivered_count: number | null
          failed_count: number | null
          id: string
          open_count: number | null
          scheduled_at: string | null
          segment: string
          sent_at: string | null
          status: string
          subject: string
          total_recipients: number | null
        }
        Insert: {
          ab_body_b?: string | null
          ab_parent_id?: string | null
          ab_test_size?: number | null
          ab_variant_a?: string | null
          ab_variant_b?: string | null
          ab_winner?: string | null
          ab_winner_sent?: boolean | null
          body: string
          bounce_count?: number
          click_count?: number | null
          complaint_count?: number
          created_at?: string
          creator_id: string
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          open_count?: number | null
          scheduled_at?: string | null
          segment?: string
          sent_at?: string | null
          status?: string
          subject: string
          total_recipients?: number | null
        }
        Update: {
          ab_body_b?: string | null
          ab_parent_id?: string | null
          ab_test_size?: number | null
          ab_variant_a?: string | null
          ab_variant_b?: string | null
          ab_winner?: string | null
          ab_winner_sent?: boolean | null
          body?: string
          bounce_count?: number
          click_count?: number | null
          complaint_count?: number
          created_at?: string
          creator_id?: string
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          open_count?: number | null
          scheduled_at?: string | null
          segment?: string
          sent_at?: string | null
          status?: string
          subject?: string
          total_recipients?: number | null
        }
        Relationships: []
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
      email_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          creator_id: string | null
          id: string
          is_system: boolean
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body?: string
          category?: string
          created_at?: string
          creator_id?: string | null
          id?: string
          is_system?: boolean
          name: string
          subject?: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          creator_id?: string | null
          id?: string
          is_system?: boolean
          name?: string
          subject?: string
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
      email_unsubscribes: {
        Row: {
          email: string
          id: string
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      error_log: {
        Row: {
          created_at: string
          error_message: string | null
          function_name: string
          id: string
          payload: Json | null
          request_id: string | null
          stack: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          function_name: string
          id?: string
          payload?: Json | null
          request_id?: string | null
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
          payload?: Json | null
          request_id?: string | null
          stack?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      event_chat_messages: {
        Row: {
          content: string | null
          created_at: string
          event_id: string
          id: string
          media_url: string | null
          reactions: Json | null
          reply_to: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          event_id: string
          id?: string
          media_url?: string | null
          reactions?: Json | null
          reply_to?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          event_id?: string
          id?: string
          media_url?: string | null
          reactions?: Json | null
          reply_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_chat_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "event_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      event_creator_tags: {
        Row: {
          created_at: string
          creator_id: string
          event_id: string
          id: string
          stream_id: string | null
          video_id: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          event_id: string
          id?: string
          stream_id?: string | null
          video_id?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          event_id?: string
          id?: string
          stream_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_creator_tags_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_global"
            referencedColumns: ["id"]
          },
        ]
      }
      event_referrals: {
        Row: {
          buyer_id: string
          created_at: string
          event_id: string
          id: string
          order_id: string | null
          paid: boolean | null
          referrer_id: string
          reward_cents: number
        }
        Insert: {
          buyer_id: string
          created_at?: string
          event_id: string
          id?: string
          order_id?: string | null
          paid?: boolean | null
          referrer_id: string
          reward_cents?: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          event_id?: string
          id?: string
          order_id?: string | null
          paid?: boolean | null
          referrer_id?: string
          reward_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_referrals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_referrals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      event_rsvps: {
        Row: {
          confirmation_sent: boolean
          created_at: string
          email: string
          event_id: string
          id: string
          name: string | null
          reminder_sent: boolean
          user_id: string | null
        }
        Insert: {
          confirmation_sent?: boolean
          created_at?: string
          email: string
          event_id: string
          id?: string
          name?: string | null
          reminder_sent?: boolean
          user_id?: string | null
        }
        Update: {
          confirmation_sent?: boolean
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          name?: string | null
          reminder_sent?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
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
          age_restriction: string | null
          associated_video_ids: string[] | null
          capacity: number | null
          co_host_ids: string[] | null
          cover_charge: number | null
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          doors_open_at: string | null
          dress_code: string | null
          ends_at: string
          event_type: string
          gallery_urls: string[] | null
          genre_tags: string[] | null
          geohash: string | null
          happy_hour_end: string | null
          happy_hour_start: string | null
          id: string
          is_boosted: boolean | null
          is_free: boolean
          is_sold_out: boolean
          lat: number | null
          lineup: Json | null
          live_stream_id: string | null
          lng: number | null
          location_address: string | null
          location_city: string | null
          location_name: string | null
          location_state: string | null
          mux_stream_id: string | null
          refund_policy: string
          resale_allowed: boolean
          resale_price_cap_pct: number | null
          seat_map: Json | null
          slug: string | null
          space_id: string | null
          starts_at: string
          status: string
          stream_on_uply: boolean
          stripe_price_id: string | null
          tags: string[] | null
          ticket_price: number
          ticket_quantity: number | null
          ticket_sales_close_at: string | null
          ticket_sales_open_at: string | null
          ticketing_mode: string
          tickets_sold: number
          timezone: string
          title: string
          updated_at: string
          venue_name: string | null
          virtual_link: string | null
          virtual_link_unlocked_at: string | null
          visibility: string
        }
        Insert: {
          age_restriction?: string | null
          associated_video_ids?: string[] | null
          capacity?: number | null
          co_host_ids?: string[] | null
          cover_charge?: number | null
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          doors_open_at?: string | null
          dress_code?: string | null
          ends_at: string
          event_type?: string
          gallery_urls?: string[] | null
          genre_tags?: string[] | null
          geohash?: string | null
          happy_hour_end?: string | null
          happy_hour_start?: string | null
          id?: string
          is_boosted?: boolean | null
          is_free?: boolean
          is_sold_out?: boolean
          lat?: number | null
          lineup?: Json | null
          live_stream_id?: string | null
          lng?: number | null
          location_address?: string | null
          location_city?: string | null
          location_name?: string | null
          location_state?: string | null
          mux_stream_id?: string | null
          refund_policy?: string
          resale_allowed?: boolean
          resale_price_cap_pct?: number | null
          seat_map?: Json | null
          slug?: string | null
          space_id?: string | null
          starts_at: string
          status?: string
          stream_on_uply?: boolean
          stripe_price_id?: string | null
          tags?: string[] | null
          ticket_price?: number
          ticket_quantity?: number | null
          ticket_sales_close_at?: string | null
          ticket_sales_open_at?: string | null
          ticketing_mode?: string
          tickets_sold?: number
          timezone?: string
          title: string
          updated_at?: string
          venue_name?: string | null
          virtual_link?: string | null
          virtual_link_unlocked_at?: string | null
          visibility?: string
        }
        Update: {
          age_restriction?: string | null
          associated_video_ids?: string[] | null
          capacity?: number | null
          co_host_ids?: string[] | null
          cover_charge?: number | null
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          doors_open_at?: string | null
          dress_code?: string | null
          ends_at?: string
          event_type?: string
          gallery_urls?: string[] | null
          genre_tags?: string[] | null
          geohash?: string | null
          happy_hour_end?: string | null
          happy_hour_start?: string | null
          id?: string
          is_boosted?: boolean | null
          is_free?: boolean
          is_sold_out?: boolean
          lat?: number | null
          lineup?: Json | null
          live_stream_id?: string | null
          lng?: number | null
          location_address?: string | null
          location_city?: string | null
          location_name?: string | null
          location_state?: string | null
          mux_stream_id?: string | null
          refund_policy?: string
          resale_allowed?: boolean
          resale_price_cap_pct?: number | null
          seat_map?: Json | null
          slug?: string | null
          space_id?: string | null
          starts_at?: string
          status?: string
          stream_on_uply?: boolean
          stripe_price_id?: string | null
          tags?: string[] | null
          ticket_price?: number
          ticket_quantity?: number | null
          ticket_sales_close_at?: string | null
          ticket_sales_open_at?: string | null
          ticketing_mode?: string
          tickets_sold?: number
          timezone?: string
          title?: string
          updated_at?: string
          venue_name?: string | null
          virtual_link?: string | null
          virtual_link_unlocked_at?: string | null
          visibility?: string
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
      events_external: {
        Row: {
          affiliate_url: string
          category: string | null
          city: string | null
          click_count: number
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          end_date: string | null
          external_id: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          last_synced_at: string
          max_price: number | null
          min_price: number | null
          source: string
          start_date: string | null
          title: string
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          affiliate_url: string
          category?: string | null
          city?: string | null
          click_count?: number
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          last_synced_at?: string
          max_price?: number | null
          min_price?: number | null
          source?: string
          start_date?: string | null
          title: string
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          affiliate_url?: string
          category?: string | null
          city?: string | null
          click_count?: number
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          last_synced_at?: string
          max_price?: number | null
          min_price?: number | null
          source?: string
          start_date?: string | null
          title?: string
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: []
      }
      events_external_clicks: {
        Row: {
          created_at: string
          event_external_id: string
          id: string
          referrer: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_external_id: string
          id?: string
          referrer?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_external_id?: string
          id?: string
          referrer?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_external_clicks_event_external_id_fkey"
            columns: ["event_external_id"]
            isOneToOne: false
            referencedRelation: "events_external"
            referencedColumns: ["id"]
          },
        ]
      }
      events_global: {
        Row: {
          affiliate_url: string | null
          artist_name: string | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          date: string | null
          external_id: string
          id: string
          image_url: string | null
          is_persian: boolean
          latitude: number | null
          longitude: number | null
          source: string
          synced_at: string
          ticket_url: string | null
          title: string
          venue: string | null
        }
        Insert: {
          affiliate_url?: string | null
          artist_name?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date?: string | null
          external_id: string
          id?: string
          image_url?: string | null
          is_persian?: boolean
          latitude?: number | null
          longitude?: number | null
          source: string
          synced_at?: string
          ticket_url?: string | null
          title: string
          venue?: string | null
        }
        Update: {
          affiliate_url?: string | null
          artist_name?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date?: string | null
          external_id?: string
          id?: string
          image_url?: string | null
          is_persian?: boolean
          latitude?: number | null
          longitude?: number | null
          source?: string
          synced_at?: string
          ticket_url?: string | null
          title?: string
          venue?: string | null
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
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          rollout_percentage: number | null
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          rollout_percentage?: number | null
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          rollout_percentage?: number | null
          updated_at?: string
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
      friend_connections: {
        Row: {
          accepted_at: string | null
          created_at: string
          friend_id: string
          initiated_by: string
          status: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          friend_id: string
          initiated_by: string
          status?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          friend_id?: string
          initiated_by?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      gigs: {
        Row: {
          category: string | null
          cover_image_url: string | null
          created_at: string
          creator_id: string
          delivery_days: number | null
          description: string | null
          id: string
          orders_count: number | null
          packages: Json
          rating_avg: number | null
          rating_count: number | null
          status: string
          title: string
        }
        Insert: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          delivery_days?: number | null
          description?: string | null
          id?: string
          orders_count?: number | null
          packages?: Json
          rating_avg?: number | null
          rating_count?: number | null
          status?: string
          title: string
        }
        Update: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          delivery_days?: number | null
          description?: string | null
          id?: string
          orders_count?: number | null
          packages?: Json
          rating_avg?: number | null
          rating_count?: number | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      group_blend_members: {
        Row: {
          blend_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          blend_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          blend_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_blend_members_blend_id_fkey"
            columns: ["blend_id"]
            isOneToOne: false
            referencedRelation: "group_blends"
            referencedColumns: ["id"]
          },
        ]
      }
      group_blends: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_conversations: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          event_id: string | null
          id: string
          name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_conversations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          conversation_id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "group_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          id: string
          media_url: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          media_url?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          media_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "group_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
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
      growth_plan_versions: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          is_named_milestone: boolean
          plan_id: string
          snapshot: Json
          version_name: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          is_named_milestone?: boolean
          plan_id: string
          snapshot: Json
          version_name?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          is_named_milestone?: boolean
          plan_id?: string
          snapshot?: Json
          version_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_plan_versions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "growth_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_plans: {
        Row: {
          created_at: string
          creator_id: string
          duration_days: number
          id: string
          milestones: Json
          next_actions: Json
          target_kpis: Json
          title: string
          updated_at: string
          weekly_tasks: Json
        }
        Insert: {
          created_at?: string
          creator_id: string
          duration_days?: number
          id?: string
          milestones?: Json
          next_actions?: Json
          target_kpis?: Json
          title?: string
          updated_at?: string
          weekly_tasks?: Json
        }
        Update: {
          created_at?: string
          creator_id?: string
          duration_days?: number
          id?: string
          milestones?: Json
          next_actions?: Json
          target_kpis?: Json
          title?: string
          updated_at?: string
          weekly_tasks?: Json
        }
        Relationships: []
      }
      health_checks: {
        Row: {
          checked_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          service: string
          status: string
        }
        Insert: {
          checked_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          service: string
          status: string
        }
        Update: {
          checked_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          service?: string
          status?: string
        }
        Relationships: []
      }
      heys: {
        Row: {
          created_at: string | null
          event_id: string | null
          hey_type: string | null
          id: string
          is_mutual: boolean | null
          recipient_id: string
          sender_id: string
          sender_revealed: boolean | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          hey_type?: string | null
          id?: string
          is_mutual?: boolean | null
          recipient_id: string
          sender_id: string
          sender_revealed?: boolean | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          hey_type?: string | null
          id?: string
          is_mutual?: boolean | null
          recipient_id?: string
          sender_id?: string
          sender_revealed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "heys_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
      karaoke_scores: {
        Row: {
          created_at: string
          id: string
          lines_hit: number
          score: number
          total_lines: number
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lines_hit?: number
          score: number
          total_lines?: number
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lines_hit?: number
          score?: number
          total_lines?: number
          track_id?: string
          user_id?: string
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
      listening_parties: {
        Row: {
          cover_url: string | null
          created_at: string
          current_track_artist: string | null
          current_track_id: string | null
          current_track_title: string | null
          current_track_url: string | null
          host_id: string
          id: string
          is_playing: boolean
          last_sync_at: string
          participant_count: number
          position_seconds: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          current_track_artist?: string | null
          current_track_id?: string | null
          current_track_title?: string | null
          current_track_url?: string | null
          host_id: string
          id?: string
          is_playing?: boolean
          last_sync_at?: string
          participant_count?: number
          position_seconds?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          current_track_artist?: string | null
          current_track_id?: string | null
          current_track_title?: string | null
          current_track_url?: string | null
          host_id?: string
          id?: string
          is_playing?: boolean
          last_sync_at?: string
          participant_count?: number
          position_seconds?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      listening_party_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          party_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          party_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          party_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listening_party_messages_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "listening_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_party_participants: {
        Row: {
          joined_at: string
          party_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          party_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          party_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listening_party_participants_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "listening_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      live_activities: {
        Row: {
          activity_type: string
          ends_at: string | null
          id: string
          reference_id: string | null
          started_at: string
          status: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          ends_at?: string | null
          id?: string
          reference_id?: string | null
          started_at?: string
          status?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          ends_at?: string | null
          id?: string
          reference_id?: string | null
          started_at?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
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
      live_commerce_items: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          image_url: string | null
          inventory: number | null
          item_type: string
          live_stream_id: string | null
          pin_to_stream: boolean | null
          price_cents: number
          ref_id: string | null
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          image_url?: string | null
          inventory?: number | null
          item_type: string
          live_stream_id?: string | null
          pin_to_stream?: boolean | null
          price_cents: number
          ref_id?: string | null
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          image_url?: string | null
          inventory?: number | null
          item_type?: string
          live_stream_id?: string | null
          pin_to_stream?: boolean | null
          price_cents?: number
          ref_id?: string | null
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      live_flash_sales: {
        Row: {
          created_at: string | null
          creator_id: string
          discount_percent: number
          duration_seconds: number
          ends_at: string
          id: string
          is_active: boolean | null
          live_product_id: string
          original_price: number
          sale_price: number
          starts_at: string
          stream_id: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          discount_percent?: number
          duration_seconds?: number
          ends_at: string
          id?: string
          is_active?: boolean | null
          live_product_id: string
          original_price: number
          sale_price: number
          starts_at?: string
          stream_id: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          discount_percent?: number
          duration_seconds?: number
          ends_at?: string
          id?: string
          is_active?: boolean | null
          live_product_id?: string
          original_price?: number
          sale_price?: number
          starts_at?: string
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_flash_sales_live_product_id_fkey"
            columns: ["live_product_id"]
            isOneToOne: false
            referencedRelation: "live_products"
            referencedColumns: ["id"]
          },
        ]
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
      live_product_ai_descriptions: {
        Row: {
          ai_pitch: string
          created_at: string | null
          id: string
          live_product_id: string
          urgency_message: string | null
        }
        Insert: {
          ai_pitch: string
          created_at?: string | null
          id?: string
          live_product_id: string
          urgency_message?: string | null
        }
        Update: {
          ai_pitch?: string
          created_at?: string | null
          id?: string
          live_product_id?: string
          urgency_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_product_ai_descriptions_live_product_id_fkey"
            columns: ["live_product_id"]
            isOneToOne: true
            referencedRelation: "live_products"
            referencedColumns: ["id"]
          },
        ]
      }
      live_product_variants: {
        Row: {
          created_at: string | null
          id: string
          label: string
          live_product_id: string
          options: string[]
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          live_product_id: string
          options?: string[]
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          live_product_id?: string
          options?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "live_product_variants_live_product_id_fkey"
            columns: ["live_product_id"]
            isOneToOne: false
            referencedRelation: "live_products"
            referencedColumns: ["id"]
          },
        ]
      }
      live_product_wishlist: {
        Row: {
          created_at: string | null
          id: string
          live_product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          live_product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          live_product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_product_wishlist_live_product_id_fkey"
            columns: ["live_product_id"]
            isOneToOne: false
            referencedRelation: "live_products"
            referencedColumns: ["id"]
          },
        ]
      }
      live_products: {
        Row: {
          additional_images: string[] | null
          ai_pitch: string | null
          auction_duration_minutes: number | null
          auto_end_auction: boolean | null
          buy_now_price: number | null
          category: string | null
          click_count: number | null
          condition: string | null
          created_at: string
          creator_id: string
          description: string | null
          free_shipping: boolean | null
          id: string
          image_url: string | null
          impression_count: number | null
          is_active: boolean
          is_pinned: boolean | null
          is_sold_out: boolean
          low_stock_alert_sent: boolean | null
          pinned_at: string | null
          position: number
          price: number
          quantity_remaining: number
          quantity_total: number
          reserve_price: number | null
          shipping_price: number | null
          shopify_checkout_url: string | null
          shopify_product_id: string | null
          shopify_variant_id: string | null
          sku: string | null
          starting_bid: number | null
          stream_id: string
          stripe_price_id: string | null
          title: string
          type: string
          urgency_message: string | null
        }
        Insert: {
          additional_images?: string[] | null
          ai_pitch?: string | null
          auction_duration_minutes?: number | null
          auto_end_auction?: boolean | null
          buy_now_price?: number | null
          category?: string | null
          click_count?: number | null
          condition?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          free_shipping?: boolean | null
          id?: string
          image_url?: string | null
          impression_count?: number | null
          is_active?: boolean
          is_pinned?: boolean | null
          is_sold_out?: boolean
          low_stock_alert_sent?: boolean | null
          pinned_at?: string | null
          position?: number
          price?: number
          quantity_remaining?: number
          quantity_total?: number
          reserve_price?: number | null
          shipping_price?: number | null
          shopify_checkout_url?: string | null
          shopify_product_id?: string | null
          shopify_variant_id?: string | null
          sku?: string | null
          starting_bid?: number | null
          stream_id: string
          stripe_price_id?: string | null
          title: string
          type?: string
          urgency_message?: string | null
        }
        Update: {
          additional_images?: string[] | null
          ai_pitch?: string | null
          auction_duration_minutes?: number | null
          auto_end_auction?: boolean | null
          buy_now_price?: number | null
          category?: string | null
          click_count?: number | null
          condition?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          free_shipping?: boolean | null
          id?: string
          image_url?: string | null
          impression_count?: number | null
          is_active?: boolean
          is_pinned?: boolean | null
          is_sold_out?: boolean
          low_stock_alert_sent?: boolean | null
          pinned_at?: string | null
          position?: number
          price?: number
          quantity_remaining?: number
          quantity_total?: number
          reserve_price?: number | null
          shipping_price?: number | null
          shopify_checkout_url?: string | null
          shopify_product_id?: string | null
          shopify_variant_id?: string | null
          sku?: string | null
          starting_bid?: number | null
          stream_id?: string
          stripe_price_id?: string | null
          title?: string
          type?: string
          urgency_message?: string | null
        }
        Relationships: []
      }
      live_purchase_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          buyer_id: string
          city: string
          country: string
          created_at: string | null
          full_name: string
          id: string
          phone: string | null
          purchase_id: string
          state: string
          zip: string
        }
        Insert: {
          address_line1?: string
          address_line2?: string | null
          buyer_id: string
          city?: string
          country?: string
          created_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          purchase_id: string
          state?: string
          zip?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          buyer_id?: string
          city?: string
          country?: string
          created_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          purchase_id?: string
          state?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_purchase_addresses_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "live_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      live_purchase_fulfillments: {
        Row: {
          carrier: string | null
          created_at: string | null
          creator_id: string
          delivered_at: string | null
          id: string
          notes: string | null
          purchase_id: string
          shipped_at: string | null
          status: string
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string | null
          creator_id: string
          delivered_at?: string | null
          id?: string
          notes?: string | null
          purchase_id: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string | null
          creator_id?: string
          delivered_at?: string | null
          id?: string
          notes?: string | null
          purchase_id?: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_purchase_fulfillments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "live_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      live_purchases: {
        Row: {
          affiliate_code: string | null
          amount: number
          buyer_id: string
          buyer_message: string | null
          created_at: string
          creator_earnings: number
          creator_id: string
          id: string
          live_product_id: string
          platform_fee: number
          shipping_price: number | null
          status: string
          stripe_payment_intent_id: string | null
          total_amount: number | null
          variant_selected: string | null
        }
        Insert: {
          affiliate_code?: string | null
          amount?: number
          buyer_id: string
          buyer_message?: string | null
          created_at?: string
          creator_earnings?: number
          creator_id: string
          id?: string
          live_product_id: string
          platform_fee?: number
          shipping_price?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount?: number | null
          variant_selected?: string | null
        }
        Update: {
          affiliate_code?: string | null
          amount?: number
          buyer_id?: string
          buyer_message?: string | null
          created_at?: string
          creator_earnings?: number
          creator_id?: string
          id?: string
          live_product_id?: string
          platform_fee?: number
          shipping_price?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount?: number | null
          variant_selected?: string | null
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
      live_stream_products: {
        Row: {
          created_at: string
          id: string
          is_currently_featured: boolean
          position: number
          product_id: string
          stream_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_currently_featured?: boolean
          position?: number
          product_id: string
          stream_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_currently_featured?: boolean
          position?: number
          product_id?: string
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_products_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_products_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams_public"
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
          {
            foreignKeyName: "live_stream_sessions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          event_id: string | null
          geohash: string | null
          id: string
          images: string[] | null
          lat: number | null
          listing_type: string
          lng: number | null
          price_cents: number | null
          seller_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          event_id?: string | null
          geohash?: string | null
          id?: string
          images?: string[] | null
          lat?: number | null
          listing_type: string
          lng?: number | null
          price_cents?: number | null
          seller_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          event_id?: string | null
          geohash?: string | null
          id?: string
          images?: string[] | null
          lat?: number | null
          listing_type?: string
          lng?: number | null
          price_cents?: number | null
          seller_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      member_churn_predictions: {
        Row: {
          calculated_at: string | null
          churn_probability: number
          creator_id: string
          days_since_last_active: number | null
          engagement_score: number | null
          id: string
          intervention_sent: boolean | null
          member_id: string
          risk_level: string | null
        }
        Insert: {
          calculated_at?: string | null
          churn_probability?: number
          creator_id: string
          days_since_last_active?: number | null
          engagement_score?: number | null
          id?: string
          intervention_sent?: boolean | null
          member_id: string
          risk_level?: string | null
        }
        Update: {
          calculated_at?: string | null
          churn_probability?: number
          creator_id?: string
          days_since_last_active?: number | null
          engagement_score?: number | null
          id?: string
          intervention_sent?: boolean | null
          member_id?: string
          risk_level?: string | null
        }
        Relationships: []
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
      member_referral_codes: {
        Row: {
          click_count: number | null
          code: string
          conversion_count: number | null
          created_at: string | null
          creator_id: string
          id: string
          member_id: string
        }
        Insert: {
          click_count?: number | null
          code: string
          conversion_count?: number | null
          created_at?: string | null
          creator_id: string
          id?: string
          member_id: string
        }
        Update: {
          click_count?: number | null
          code?: string
          conversion_count?: number | null
          created_at?: string | null
          creator_id?: string
          id?: string
          member_id?: string
        }
        Relationships: []
      }
      member_referral_conversions: {
        Row: {
          converted_at: string | null
          creator_id: string
          id: string
          referral_code_id: string
          referred_user_id: string
          reward_issued: boolean | null
        }
        Insert: {
          converted_at?: string | null
          creator_id: string
          id?: string
          referral_code_id: string
          referred_user_id: string
          reward_issued?: boolean | null
        }
        Update: {
          converted_at?: string | null
          creator_id?: string
          id?: string
          referral_code_id?: string
          referred_user_id?: string
          reward_issued?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "member_referral_conversions_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "member_referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      member_referral_programs: {
        Row: {
          created_at: string | null
          creator_id: string
          id: string
          is_active: boolean | null
          reward_description: string | null
          reward_type: string | null
          reward_value: number | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          id?: string
          is_active?: boolean | null
          reward_description?: string | null
          reward_type?: string | null
          reward_value?: number | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          id?: string
          is_active?: boolean | null
          reward_description?: string | null
          reward_type?: string | null
          reward_value?: number | null
        }
        Relationships: []
      }
      member_referral_rewards: {
        Row: {
          conversion_id: string | null
          created_at: string | null
          creator_id: string
          expires_at: string | null
          id: string
          is_redeemed: boolean | null
          member_id: string
          reward_description: string | null
          reward_type: string
          reward_value: number
        }
        Insert: {
          conversion_id?: string | null
          created_at?: string | null
          creator_id: string
          expires_at?: string | null
          id?: string
          is_redeemed?: boolean | null
          member_id: string
          reward_description?: string | null
          reward_type: string
          reward_value: number
        }
        Update: {
          conversion_id?: string | null
          created_at?: string | null
          creator_id?: string
          expires_at?: string | null
          id?: string
          is_redeemed?: boolean | null
          member_id?: string
          reward_description?: string | null
          reward_type?: string
          reward_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_referral_rewards_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "member_referral_conversions"
            referencedColumns: ["id"]
          },
        ]
      }
      member_subscriptions: {
        Row: {
          created_at: string
          creator_id: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          member_day3_email_sent_at: string | null
          member_id: string
          member_renewal_reminder_sent_at: string | null
          member_welcome_email_sent_at: string | null
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
          member_day3_email_sent_at?: string | null
          member_id: string
          member_renewal_reminder_sent_at?: string | null
          member_welcome_email_sent_at?: string | null
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
          member_day3_email_sent_at?: string | null
          member_id?: string
          member_renewal_reminder_sent_at?: string | null
          member_welcome_email_sent_at?: string | null
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
      mentions: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          link: string | null
          mentioned_user_id: string
          preview: string | null
          read: boolean
          source_id: string
          source_type: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          link?: string | null
          mentioned_user_id: string
          preview?: string | null
          read?: boolean
          source_id: string
          source_type: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          link?: string | null
          mentioned_user_id?: string
          preview?: string | null
          read?: boolean
          source_id?: string
          source_type?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string | null
          message_id: string
          message_type: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          message_id: string
          message_type: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          message_id?: string
          message_type?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      multistream_alerts: {
        Row: {
          alert_type: string | null
          created_at: string | null
          id: string
          message: string | null
          platform: string | null
          resolved: boolean | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          alert_type?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          platform?: string | null
          resolved?: boolean | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          platform?: string | null
          resolved?: boolean | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      music_ama_question_votes: {
        Row: {
          created_at: string
          id: string
          question_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_ama_question_votes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "music_ama_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_ama_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          created_at: string
          fan_id: string
          id: string
          is_answered: boolean
          question: string
          session_id: string
          updated_at: string
          upvote_count: number
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          fan_id: string
          id?: string
          is_answered?: boolean
          question: string
          session_id: string
          updated_at?: string
          upvote_count?: number
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          fan_id?: string
          id?: string
          is_answered?: boolean
          question?: string
          session_id?: string
          updated_at?: string
          upvote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_ama_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "music_ama_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_ama_sessions: {
        Row: {
          artist_id: string
          cover_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          scheduled_for: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          scheduled_for: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          scheduled_for?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_artist_alerts: {
        Row: {
          artist_id: string
          city: string | null
          country: string | null
          created_at: string
          id: string
          radius_km: number
          user_id: string
        }
        Insert: {
          artist_id: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          radius_km?: number
          user_id: string
        }
        Update: {
          artist_id?: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          radius_km?: number
          user_id?: string
        }
        Relationships: []
      }
      music_artist_fan_points: {
        Row: {
          artist_id: string
          created_at: string
          dedications_count: number
          fan_id: string
          id: string
          last_event_at: string
          listens: number
          points: number
          tips_cents: number
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          dedications_count?: number
          fan_id: string
          id?: string
          last_event_at?: string
          listens?: number
          points?: number
          tips_cents?: number
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          dedications_count?: number
          fan_id?: string
          id?: string
          last_event_at?: string
          listens?: number
          points?: number
          tips_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      music_artist_poll_options: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          label: string
          poll_id: string
          position: number
          vote_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          label: string
          poll_id: string
          position?: number
          vote_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          label?: string
          poll_id?: string
          position?: number
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_artist_poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "music_artist_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      music_artist_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_artist_poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "music_artist_poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_artist_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "music_artist_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      music_artist_polls: {
        Row: {
          artist_id: string
          closes_at: string | null
          created_at: string
          description: string | null
          id: string
          question: string
          status: string
          total_votes: number
          updated_at: string
        }
        Insert: {
          artist_id: string
          closes_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          question: string
          status?: string
          total_votes?: number
          updated_at?: string
        }
        Update: {
          artist_id?: string
          closes_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          question?: string
          status?: string
          total_votes?: number
          updated_at?: string
        }
        Relationships: []
      }
      music_artist_qa_answers: {
        Row: {
          artist_id: string
          body: string
          created_at: string
          id: string
          question_id: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          body: string
          created_at?: string
          id?: string
          question_id: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          body?: string
          created_at?: string
          id?: string
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_artist_qa_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "music_artist_qa_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_artist_qa_questions: {
        Row: {
          artist_id: string
          body: string
          created_at: string
          fan_id: string
          id: string
          is_anonymous: boolean
          status: string
          updated_at: string
          upvotes: number
        }
        Insert: {
          artist_id: string
          body: string
          created_at?: string
          fan_id: string
          id?: string
          is_anonymous?: boolean
          status?: string
          updated_at?: string
          upvotes?: number
        }
        Update: {
          artist_id?: string
          body?: string
          created_at?: string
          fan_id?: string
          id?: string
          is_anonymous?: boolean
          status?: string
          updated_at?: string
          upvotes?: number
        }
        Relationships: []
      }
      music_artist_qa_upvotes: {
        Row: {
          created_at: string
          id: string
          question_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_artist_qa_upvotes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "music_artist_qa_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_audio_preferences: {
        Row: {
          lossless_enabled: boolean
          normalize_volume: boolean
          prefer_on_wifi_only: boolean
          spatial_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          lossless_enabled?: boolean
          normalize_volume?: boolean
          prefer_on_wifi_only?: boolean
          spatial_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          lossless_enabled?: boolean
          normalize_volume?: boolean
          prefer_on_wifi_only?: boolean
          spatial_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      music_audio_room_participants: {
        Row: {
          id: string
          joined_at: string
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_audio_room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "music_audio_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      music_audio_rooms: {
        Row: {
          created_at: string
          ended_at: string | null
          host_id: string
          id: string
          is_live: boolean
          listeners_count: number
          started_at: string
          title: string
          topic: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          host_id: string
          id?: string
          is_live?: boolean
          listeners_count?: number
          started_at?: string
          title: string
          topic?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          host_id?: string
          id?: string
          is_live?: boolean
          listeners_count?: number
          started_at?: string
          title?: string
          topic?: string | null
        }
        Relationships: []
      }
      music_badges: {
        Row: {
          created_at: string
          description: string
          icon: string | null
          key: string
          tier: string
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string | null
          key: string
          tier?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string | null
          key?: string
          tier?: string
          title?: string
        }
        Relationships: []
      }
      music_booking_inquiries: {
        Row: {
          artist_id: string
          booker_id: string
          budget_cents: number | null
          created_at: string
          duration_minutes: number | null
          event_date: string | null
          event_location: string | null
          event_title: string | null
          id: string
          listing_id: string
          message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          booker_id: string
          budget_cents?: number | null
          created_at?: string
          duration_minutes?: number | null
          event_date?: string | null
          event_location?: string | null
          event_title?: string | null
          id?: string
          listing_id: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          booker_id?: string
          budget_cents?: number | null
          created_at?: string
          duration_minutes?: number | null
          event_date?: string | null
          event_location?: string | null
          event_title?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_booking_inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "music_gig_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      music_booking_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          inquiry_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          inquiry_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          inquiry_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_booking_messages_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "music_booking_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      music_carpool_riders: {
        Row: {
          carpool_id: string
          created_at: string
          id: string
          note: string | null
          rider_id: string
          status: string
          updated_at: string
        }
        Insert: {
          carpool_id: string
          created_at?: string
          id?: string
          note?: string | null
          rider_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          carpool_id?: string
          created_at?: string
          id?: string
          note?: string | null
          rider_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_carpool_riders_carpool_id_fkey"
            columns: ["carpool_id"]
            isOneToOne: false
            referencedRelation: "music_concert_carpools"
            referencedColumns: ["id"]
          },
        ]
      }
      music_challenge_entries: {
        Row: {
          artwork_url: string | null
          challenge_id: string
          created_at: string
          description: string | null
          id: string
          is_disqualified: boolean
          media_url: string
          score: number
          title: string
          updated_at: string
          user_id: string
          vote_count: number
        }
        Insert: {
          artwork_url?: string | null
          challenge_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_disqualified?: boolean
          media_url: string
          score?: number
          title: string
          updated_at?: string
          user_id: string
          vote_count?: number
        }
        Update: {
          artwork_url?: string | null
          challenge_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_disqualified?: boolean
          media_url?: string
          score?: number
          title?: string
          updated_at?: string
          user_id?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_challenge_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "music_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      music_challenge_votes: {
        Row: {
          challenge_id: string
          created_at: string
          entry_id: string
          id: string
          user_id: string
          weight: number
        }
        Insert: {
          challenge_id: string
          created_at?: string
          entry_id: string
          id?: string
          user_id: string
          weight?: number
        }
        Update: {
          challenge_id?: string
          created_at?: string
          entry_id?: string
          id?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_challenge_votes_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "music_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_challenge_votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "music_challenge_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      music_challenges: {
        Row: {
          artwork_url: string | null
          challenge_type: string
          created_at: string
          description: string | null
          entry_count: number
          host_id: string
          id: string
          prize_cents: number
          prize_description: string | null
          prompt: string | null
          starts_at: string
          status: string
          stems_url: string | null
          submission_deadline: string | null
          title: string
          updated_at: string
          vote_count: number
          voting_deadline: string | null
        }
        Insert: {
          artwork_url?: string | null
          challenge_type?: string
          created_at?: string
          description?: string | null
          entry_count?: number
          host_id: string
          id?: string
          prize_cents?: number
          prize_description?: string | null
          prompt?: string | null
          starts_at?: string
          status?: string
          stems_url?: string | null
          submission_deadline?: string | null
          title: string
          updated_at?: string
          vote_count?: number
          voting_deadline?: string | null
        }
        Update: {
          artwork_url?: string | null
          challenge_type?: string
          created_at?: string
          description?: string | null
          entry_count?: number
          host_id?: string
          id?: string
          prize_cents?: number
          prize_description?: string | null
          prompt?: string | null
          starts_at?: string
          status?: string
          stems_url?: string | null
          submission_deadline?: string | null
          title?: string
          updated_at?: string
          vote_count?: number
          voting_deadline?: string | null
        }
        Relationships: []
      }
      music_chart_snapshots: {
        Row: {
          chart_type: string
          created_at: string
          id: string
          item_image_url: string | null
          item_ref_id: string
          item_subtitle: string | null
          item_title: string | null
          period: string
          prev_rank: number | null
          rank: number
          region: string
          score: number
          snapshot_date: string
        }
        Insert: {
          chart_type: string
          created_at?: string
          id?: string
          item_image_url?: string | null
          item_ref_id: string
          item_subtitle?: string | null
          item_title?: string | null
          period: string
          prev_rank?: number | null
          rank: number
          region?: string
          score?: number
          snapshot_date?: string
        }
        Update: {
          chart_type?: string
          created_at?: string
          id?: string
          item_image_url?: string | null
          item_ref_id?: string
          item_subtitle?: string | null
          item_title?: string | null
          period?: string
          prev_rank?: number | null
          rank?: number
          region?: string
          score?: number
          snapshot_date?: string
        }
        Relationships: []
      }
      music_collab_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_collab_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "music_collab_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      music_collab_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_collab_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "music_collab_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      music_collab_projects: {
        Row: {
          bpm: number
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          music_key: string | null
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          bpm?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          music_key?: string | null
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          bpm?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          music_key?: string | null
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_collab_tracks: {
        Row: {
          audio_url: string | null
          created_at: string
          created_by: string | null
          id: string
          is_muted: boolean
          locked_by: string | null
          name: string
          pan: number
          position: number
          project_id: string
          updated_at: string
          volume: number
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_muted?: boolean
          locked_by?: string | null
          name: string
          pan?: number
          position?: number
          project_id: string
          updated_at?: string
          volume?: number
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_muted?: boolean
          locked_by?: string | null
          name?: string
          pan?: number
          position?: number
          project_id?: string
          updated_at?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_collab_tracks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "music_collab_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      music_concert_carpools: {
        Row: {
          concert_date: string | null
          concert_label: string
          contact_note: string | null
          created_at: string
          departure_time: string | null
          driver_id: string
          id: string
          meeting_point: string | null
          origin_city: string
          seats_taken: number
          status: string
          total_seats: number
          updated_at: string
        }
        Insert: {
          concert_date?: string | null
          concert_label: string
          contact_note?: string | null
          created_at?: string
          departure_time?: string | null
          driver_id: string
          id?: string
          meeting_point?: string | null
          origin_city: string
          seats_taken?: number
          status?: string
          total_seats?: number
          updated_at?: string
        }
        Update: {
          concert_date?: string | null
          concert_label?: string
          contact_note?: string | null
          created_at?: string
          departure_time?: string | null
          driver_id?: string
          id?: string
          meeting_point?: string | null
          origin_city?: string
          seats_taken?: number
          status?: string
          total_seats?: number
          updated_at?: string
        }
        Relationships: []
      }
      music_concert_memories: {
        Row: {
          artist_id: string
          caption: string | null
          city: string | null
          concert_date: string | null
          created_at: string
          fan_id: string
          id: string
          like_count: number
          media_type: string
          media_url: string
          status: string
          venue: string | null
        }
        Insert: {
          artist_id: string
          caption?: string | null
          city?: string | null
          concert_date?: string | null
          created_at?: string
          fan_id: string
          id?: string
          like_count?: number
          media_type: string
          media_url: string
          status?: string
          venue?: string | null
        }
        Update: {
          artist_id?: string
          caption?: string | null
          city?: string | null
          concert_date?: string | null
          created_at?: string
          fan_id?: string
          id?: string
          like_count?: number
          media_type?: string
          media_url?: string
          status?: string
          venue?: string | null
        }
        Relationships: []
      }
      music_concert_memory_likes: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          memory_id: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          memory_id: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          memory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_concert_memory_likes_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "music_concert_memories"
            referencedColumns: ["id"]
          },
        ]
      }
      music_concert_merch: {
        Row: {
          concert_id: string
          created_at: string
          currency: string
          external_url: string | null
          id: string
          image_url: string | null
          position: number
          price_cents: number
          title: string
        }
        Insert: {
          concert_id: string
          created_at?: string
          currency?: string
          external_url?: string | null
          id?: string
          image_url?: string | null
          position?: number
          price_cents?: number
          title: string
        }
        Update: {
          concert_id?: string
          created_at?: string
          currency?: string
          external_url?: string | null
          id?: string
          image_url?: string | null
          position?: number
          price_cents?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_concert_merch_concert_id_fkey"
            columns: ["concert_id"]
            isOneToOne: false
            referencedRelation: "music_concerts"
            referencedColumns: ["id"]
          },
        ]
      }
      music_concert_rsvps: {
        Row: {
          concert_id: string
          created_at: string
          id: string
          remind_me: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concert_id: string
          created_at?: string
          id?: string
          remind_me?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concert_id?: string
          created_at?: string
          id?: string
          remind_me?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_concert_rsvps_concert_id_fkey"
            columns: ["concert_id"]
            isOneToOne: false
            referencedRelation: "music_concerts"
            referencedColumns: ["id"]
          },
        ]
      }
      music_concert_tickets: {
        Row: {
          concert_id: string
          created_at: string
          currency: string
          id: string
          paid_cents: number
          qr_token: string
          user_id: string
        }
        Insert: {
          concert_id: string
          created_at?: string
          currency?: string
          id?: string
          paid_cents?: number
          qr_token?: string
          user_id: string
        }
        Update: {
          concert_id?: string
          created_at?: string
          currency?: string
          id?: string
          paid_cents?: number
          qr_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_concert_tickets_concert_id_fkey"
            columns: ["concert_id"]
            isOneToOne: false
            referencedRelation: "music_concerts"
            referencedColumns: ["id"]
          },
        ]
      }
      music_concerts: {
        Row: {
          artist_id: string
          cover_url: string | null
          created_at: string
          currency: string
          description: string | null
          ends_at: string | null
          id: string
          max_capacity: number | null
          starts_at: string
          status: string
          stream_url: string | null
          ticket_price_cents: number
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          max_capacity?: number | null
          starts_at: string
          status?: string
          stream_url?: string | null
          ticket_price_cents?: number
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          max_capacity?: number | null
          starts_at?: string
          status?: string
          stream_url?: string | null
          ticket_price_cents?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_context_playlists: {
        Row: {
          context_params: Json
          context_type: string
          cover_url: string | null
          created_at: string
          id: string
          seed_genres: string[]
          seed_moods: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_params?: Json
          context_type: string
          cover_url?: string | null
          created_at?: string
          id?: string
          seed_genres?: string[]
          seed_moods?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context_params?: Json
          context_type?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          seed_genres?: string[]
          seed_moods?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      music_cover_contests: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          max_submissions: number | null
          prize: string | null
          prompt: string | null
          status: string
          submission_deadline: string | null
          track_title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          max_submissions?: number | null
          prize?: string | null
          prompt?: string | null
          status?: string
          submission_deadline?: string | null
          track_title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          max_submissions?: number | null
          prize?: string | null
          prompt?: string | null
          status?: string
          submission_deadline?: string | null
          track_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_cover_request_songs: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          original_artist: string | null
          request_id: string
          song_title: string
          suggested_by: string | null
          updated_at: string
          vote_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          original_artist?: string | null
          request_id: string
          song_title: string
          suggested_by?: string | null
          updated_at?: string
          vote_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          original_artist?: string | null
          request_id?: string
          song_title?: string
          suggested_by?: string | null
          updated_at?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_cover_request_songs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "music_cover_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      music_cover_request_votes: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          request_id: string
          song_id: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          request_id: string
          song_id: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          request_id?: string
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_cover_request_votes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "music_cover_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_cover_request_votes_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "music_cover_request_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      music_cover_requests: {
        Row: {
          artist_id: string
          created_at: string
          description: string | null
          id: string
          request_count: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          description?: string | null
          id?: string
          request_count?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          description?: string | null
          id?: string
          request_count?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_cover_submission_likes: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          submission_id: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          submission_id: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_cover_submission_likes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "music_cover_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_cover_submissions: {
        Row: {
          caption: string | null
          contest_id: string
          created_at: string
          fan_id: string
          id: string
          like_count: number
          status: string
          thumbnail_url: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          caption?: string | null
          contest_id: string
          created_at?: string
          fan_id: string
          id?: string
          like_count?: number
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          caption?: string | null
          contest_id?: string
          created_at?: string
          fan_id?: string
          id?: string
          like_count?: number
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_cover_submissions_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "music_cover_contests"
            referencedColumns: ["id"]
          },
        ]
      }
      music_crowdfund_campaigns: {
        Row: {
          cover_url: string | null
          created_at: string
          creator_id: string
          currency: string
          description: string | null
          ends_at: string | null
          goal_cents: number
          id: string
          kind: string
          raised_cents: number
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          description?: string | null
          ends_at?: string | null
          goal_cents?: number
          id?: string
          kind?: string
          raised_cents?: number
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          description?: string | null
          ends_at?: string | null
          goal_cents?: number
          id?: string
          kind?: string
          raised_cents?: number
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_crowdfund_pledges: {
        Row: {
          amount_cents: number
          backer_id: string
          campaign_id: string
          created_at: string
          id: string
          message: string | null
          status: string
          tier_id: string | null
        }
        Insert: {
          amount_cents: number
          backer_id: string
          campaign_id: string
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          tier_id?: string | null
        }
        Update: {
          amount_cents?: number
          backer_id?: string
          campaign_id?: string
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_crowdfund_pledges_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "music_crowdfund_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_crowdfund_pledges_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "music_crowdfund_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      music_crowdfund_tiers: {
        Row: {
          campaign_id: string
          claimed_count: number
          created_at: string
          description: string | null
          id: string
          limit_count: number | null
          perks: string | null
          pledge_cents: number
          sort_order: number
          title: string
        }
        Insert: {
          campaign_id: string
          claimed_count?: number
          created_at?: string
          description?: string | null
          id?: string
          limit_count?: number | null
          perks?: string | null
          pledge_cents?: number
          sort_order?: number
          title: string
        }
        Update: {
          campaign_id?: string
          claimed_count?: number
          created_at?: string
          description?: string | null
          id?: string
          limit_count?: number | null
          perks?: string | null
          pledge_cents?: number
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_crowdfund_tiers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "music_crowdfund_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      music_demo_submissions: {
        Row: {
          artist_id: string
          audio_url: string
          created_at: string
          description: string | null
          duration_seconds: number
          fan_id: string
          feedback: string | null
          genre: string | null
          id: string
          is_featured: boolean
          rating: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          audio_url: string
          created_at?: string
          description?: string | null
          duration_seconds?: number
          fan_id: string
          feedback?: string | null
          genre?: string | null
          id?: string
          is_featured?: boolean
          rating?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          audio_url?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number
          fan_id?: string
          feedback?: string | null
          genre?: string | null
          id?: string
          is_featured?: boolean
          rating?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_distribution_releases: {
        Row: {
          artist_name: string
          artwork_url: string | null
          audio_url: string | null
          created_at: string
          explicit: boolean
          genre: string | null
          id: string
          isrc: string | null
          language: string | null
          notes: string | null
          owner_id: string
          release_date: string | null
          status: string
          title: string
          track_id: string | null
          upc: string | null
          updated_at: string
        }
        Insert: {
          artist_name: string
          artwork_url?: string | null
          audio_url?: string | null
          created_at?: string
          explicit?: boolean
          genre?: string | null
          id?: string
          isrc?: string | null
          language?: string | null
          notes?: string | null
          owner_id: string
          release_date?: string | null
          status?: string
          title: string
          track_id?: string | null
          upc?: string | null
          updated_at?: string
        }
        Update: {
          artist_name?: string
          artwork_url?: string | null
          audio_url?: string | null
          created_at?: string
          explicit?: boolean
          genre?: string | null
          id?: string
          isrc?: string | null
          language?: string | null
          notes?: string | null
          owner_id?: string
          release_date?: string | null
          status?: string
          title?: string
          track_id?: string | null
          upc?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      music_distribution_targets: {
        Row: {
          created_at: string
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          external_url: string | null
          id: string
          live_at: string | null
          live_url: string | null
          notes: string | null
          platform: string
          release_id: string
          status: string
          status_updated_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          live_at?: string | null
          live_url?: string | null
          notes?: string | null
          platform: string
          release_id: string
          status?: string
          status_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          live_at?: string | null
          live_url?: string | null
          notes?: string | null
          platform?: string
          release_id?: string
          status?: string
          status_updated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_distribution_targets_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "music_distribution_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      music_downloads: {
        Row: {
          downloaded_at: string
          id: string
          track_id: string
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          track_id: string
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          track_id?: string
          user_id?: string
        }
        Relationships: []
      }
      music_drop_editions: {
        Row: {
          amount_cents: number
          claimed_at: string
          collector_id: string
          currency: string
          drop_id: string
          edition_number: number
          id: string
        }
        Insert: {
          amount_cents?: number
          claimed_at?: string
          collector_id: string
          currency?: string
          drop_id: string
          edition_number: number
          id?: string
        }
        Update: {
          amount_cents?: number
          claimed_at?: string
          collector_id?: string
          currency?: string
          drop_id?: string
          edition_number?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_drop_editions_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "music_drops"
            referencedColumns: ["id"]
          },
        ]
      }
      music_drops: {
        Row: {
          artwork_url: string | null
          audio_url: string | null
          created_at: string
          creator_id: string
          currency: string
          description: string | null
          drops_at: string | null
          edition_cap: number
          editions_sold: number
          ends_at: string | null
          id: string
          price_cents: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          artwork_url?: string | null
          audio_url?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          description?: string | null
          drops_at?: string | null
          edition_cap?: number
          editions_sold?: number
          ends_at?: string | null
          id?: string
          price_cents?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          artwork_url?: string | null
          audio_url?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          description?: string | null
          drops_at?: string | null
          edition_cap?: number
          editions_sold?: number
          ends_at?: string | null
          id?: string
          price_cents?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_editorial_spotlights: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          link_path: string
          position: number
          starts_at: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_path: string
          position?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_path?: string
          position?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      music_encore_bids: {
        Row: {
          bid_cents: number
          concert_id: string
          created_at: string
          id: string
          message: string | null
          song_title: string
          status: string
          track_id: string | null
          user_id: string
        }
        Insert: {
          bid_cents?: number
          concert_id: string
          created_at?: string
          id?: string
          message?: string | null
          song_title: string
          status?: string
          track_id?: string | null
          user_id: string
        }
        Update: {
          bid_cents?: number
          concert_id?: string
          created_at?: string
          id?: string
          message?: string | null
          song_title?: string
          status?: string
          track_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_encore_bids_concert_id_fkey"
            columns: ["concert_id"]
            isOneToOne: false
            referencedRelation: "music_concerts"
            referencedColumns: ["id"]
          },
        ]
      }
      music_fan_club_badges: {
        Row: {
          awarded_at: string
          badge_type: string
          club_id: string
          id: string
          milestone: string | null
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_type: string
          club_id: string
          id?: string
          milestone?: string | null
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_type?: string
          club_id?: string
          id?: string
          milestone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_fan_club_badges_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "music_fan_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      music_fan_club_drops: {
        Row: {
          artwork_url: string | null
          club_id: string
          content_type: string
          created_at: string
          description: string | null
          drops_at: string
          id: string
          media_url: string | null
          title: string
          unlock_tier: string
        }
        Insert: {
          artwork_url?: string | null
          club_id: string
          content_type?: string
          created_at?: string
          description?: string | null
          drops_at?: string
          id?: string
          media_url?: string | null
          title: string
          unlock_tier?: string
        }
        Update: {
          artwork_url?: string | null
          club_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          drops_at?: string
          id?: string
          media_url?: string | null
          title?: string
          unlock_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_fan_club_drops_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "music_fan_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      music_fan_club_exclusives: {
        Row: {
          artist_id: string
          body: string | null
          created_at: string
          id: string
          kind: string
          media_url: string | null
          min_tier_id: string | null
          published_at: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          media_url?: string | null
          min_tier_id?: string | null
          published_at?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          media_url?: string | null
          min_tier_id?: string | null
          published_at?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_fan_club_exclusives_min_tier_id_fkey"
            columns: ["min_tier_id"]
            isOneToOne: false
            referencedRelation: "music_fan_club_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      music_fan_club_memberships: {
        Row: {
          club_id: string
          created_at: string
          current_period_end: string | null
          id: string
          joined_at: string
          status: string
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          joined_at?: string
          status?: string
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          joined_at?: string
          status?: string
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_fan_club_memberships_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "music_fan_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      music_fan_club_subscriptions: {
        Row: {
          artist_id: string
          created_at: string
          current_period_end: string | null
          fan_id: string
          id: string
          status: string
          tier_id: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          current_period_end?: string | null
          fan_id: string
          id?: string
          status?: string
          tier_id: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          current_period_end?: string | null
          fan_id?: string
          id?: string
          status?: string
          tier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_fan_club_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "music_fan_club_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      music_fan_club_tiers: {
        Row: {
          artist_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          perks: Json
          position: number
          price_cents: number
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          perks?: Json
          position?: number
          price_cents: number
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          perks?: Json
          position?: number
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      music_fan_clubs: {
        Row: {
          artist_id: string
          artwork_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          member_count: number
          monthly_price_cents: number
          name: string
          perks: Json
          updated_at: string
        }
        Insert: {
          artist_id: string
          artwork_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          member_count?: number
          monthly_price_cents?: number
          name: string
          perks?: Json
          updated_at?: string
        }
        Update: {
          artist_id?: string
          artwork_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          member_count?: number
          monthly_price_cents?: number
          name?: string
          perks?: Json
          updated_at?: string
        }
        Relationships: []
      }
      music_fan_demo_plays: {
        Row: {
          created_at: string
          id: string
          listener_id: string
          submission_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listener_id: string
          submission_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listener_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_fan_demo_plays_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "music_fan_demo_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_fan_demo_submissions: {
        Row: {
          artist_feedback: string | null
          artist_id: string
          audio_url: string
          created_at: string
          description: string | null
          fan_id: string
          feedback_at: string | null
          genre: string | null
          id: string
          play_count: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_feedback?: string | null
          artist_id: string
          audio_url: string
          created_at?: string
          description?: string | null
          fan_id: string
          feedback_at?: string | null
          genre?: string | null
          id?: string
          play_count?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_feedback?: string | null
          artist_id?: string
          audio_url?: string
          created_at?: string
          description?: string | null
          fan_id?: string
          feedback_at?: string | null
          genre?: string | null
          id?: string
          play_count?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_fan_point_events: {
        Row: {
          artist_id: string
          created_at: string
          fan_id: string
          id: string
          points: number
          ref_id: string | null
          source: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          fan_id: string
          id?: string
          points?: number
          ref_id?: string | null
          source: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          fan_id?: string
          id?: string
          points?: number
          ref_id?: string | null
          source?: string
        }
        Relationships: []
      }
      music_fan_radio_listens: {
        Row: {
          id: string
          liked: boolean | null
          listened_at: string
          skipped: boolean
          station_id: string | null
          track_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          liked?: boolean | null
          listened_at?: string
          skipped?: boolean
          station_id?: string | null
          track_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          liked?: boolean | null
          listened_at?: string
          skipped?: boolean
          station_id?: string | null
          track_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_fan_radio_listens_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "music_fan_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_fan_radio_listens_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "music_fan_station_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      music_fan_setlist_songs: {
        Row: {
          album: string | null
          artist_label: string | null
          created_at: string
          id: string
          position: number
          setlist_id: string
          title: string
          updated_at: string
          vote_count: number
        }
        Insert: {
          album?: string | null
          artist_label?: string | null
          created_at?: string
          id?: string
          position?: number
          setlist_id: string
          title: string
          updated_at?: string
          vote_count?: number
        }
        Update: {
          album?: string | null
          artist_label?: string | null
          created_at?: string
          id?: string
          position?: number
          setlist_id?: string
          title?: string
          updated_at?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_fan_setlist_songs_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "music_fan_setlists"
            referencedColumns: ["id"]
          },
        ]
      }
      music_fan_setlist_votes: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          setlist_id: string
          song_id: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          setlist_id: string
          song_id: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          setlist_id?: string
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_fan_setlist_votes_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "music_fan_setlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_fan_setlist_votes_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "music_fan_setlist_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      music_fan_setlists: {
        Row: {
          artist_id: string
          closes_at: string | null
          created_at: string
          description: string | null
          id: string
          max_votes_per_fan: number
          show_date: string | null
          show_title: string
          status: string
          updated_at: string
          venue: string | null
          vote_count: number
        }
        Insert: {
          artist_id: string
          closes_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          max_votes_per_fan?: number
          show_date?: string | null
          show_title: string
          status?: string
          updated_at?: string
          venue?: string | null
          vote_count?: number
        }
        Update: {
          artist_id?: string
          closes_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          max_votes_per_fan?: number
          show_date?: string | null
          show_title?: string
          status?: string
          updated_at?: string
          venue?: string | null
          vote_count?: number
        }
        Relationships: []
      }
      music_fan_spotlight_likes: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          submission_id: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          submission_id: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_fan_spotlight_likes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "music_fan_spotlight_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_fan_spotlight_submissions: {
        Row: {
          caption: string | null
          created_at: string
          fan_id: string
          id: string
          is_featured: boolean
          like_count: number
          media_type: string
          media_url: string
          spotlight_id: string
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          fan_id: string
          id?: string
          is_featured?: boolean
          like_count?: number
          media_type: string
          media_url: string
          spotlight_id: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          fan_id?: string
          id?: string
          is_featured?: boolean
          like_count?: number
          media_type?: string
          media_url?: string
          spotlight_id?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_fan_spotlight_submissions_spotlight_id_fkey"
            columns: ["spotlight_id"]
            isOneToOne: false
            referencedRelation: "music_fan_spotlights"
            referencedColumns: ["id"]
          },
        ]
      }
      music_fan_spotlights: {
        Row: {
          artist_id: string
          created_at: string
          description: string | null
          featured_count: number
          id: string
          status: string
          submission_count: number
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          description?: string | null
          featured_count?: number
          id?: string
          status?: string
          submission_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          description?: string | null
          featured_count?: number
          id?: string
          status?: string
          submission_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_fan_station_tracks: {
        Row: {
          artist: string | null
          artwork_url: string | null
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          station_id: string
          title: string
          track_position: number
        }
        Insert: {
          artist?: string | null
          artwork_url?: string | null
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          station_id: string
          title: string
          track_position?: number
        }
        Update: {
          artist?: string | null
          artwork_url?: string | null
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          station_id?: string
          title?: string
          track_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_fan_station_tracks_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "music_fan_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      music_fan_stations: {
        Row: {
          artwork_url: string | null
          created_at: string
          creator_id: string | null
          description: string | null
          genres: string[] | null
          id: string
          is_featured: boolean
          is_published: boolean
          mood: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          artwork_url?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          genres?: string[] | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          mood?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          artwork_url?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          genres?: string[] | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          mood?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_gig_listings: {
        Row: {
          artist_id: string
          artwork_url: string | null
          base_price_cents: number
          booking_count: number
          created_at: string
          demo_url: string | null
          description: string | null
          genres: string[]
          gig_type: string
          home_city: string | null
          id: string
          inquiry_count: number
          instruments: string[]
          is_active: boolean
          min_duration_minutes: number
          title: string
          travel_radius_km: number
          updated_at: string
        }
        Insert: {
          artist_id: string
          artwork_url?: string | null
          base_price_cents?: number
          booking_count?: number
          created_at?: string
          demo_url?: string | null
          description?: string | null
          genres?: string[]
          gig_type?: string
          home_city?: string | null
          id?: string
          inquiry_count?: number
          instruments?: string[]
          is_active?: boolean
          min_duration_minutes?: number
          title: string
          travel_radius_km?: number
          updated_at?: string
        }
        Update: {
          artist_id?: string
          artwork_url?: string | null
          base_price_cents?: number
          booking_count?: number
          created_at?: string
          demo_url?: string | null
          description?: string | null
          genres?: string[]
          gig_type?: string
          home_city?: string | null
          id?: string
          inquiry_count?: number
          instruments?: string[]
          is_active?: boolean
          min_duration_minutes?: number
          title?: string
          travel_radius_km?: number
          updated_at?: string
        }
        Relationships: []
      }
      music_karaoke_sessions: {
        Row: {
          accuracy: number
          created_at: string
          duration_seconds: number
          id: string
          lyric_id: string | null
          recording_url: string | null
          score: number
          track_id: string
          user_id: string
        }
        Insert: {
          accuracy?: number
          created_at?: string
          duration_seconds?: number
          id?: string
          lyric_id?: string | null
          recording_url?: string | null
          score?: number
          track_id: string
          user_id: string
        }
        Update: {
          accuracy?: number
          created_at?: string
          duration_seconds?: number
          id?: string
          lyric_id?: string | null
          recording_url?: string | null
          score?: number
          track_id?: string
          user_id?: string
        }
        Relationships: []
      }
      music_liner_note_reactions: {
        Row: {
          created_at: string
          id: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_liner_note_reactions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "music_liner_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      music_liner_notes: {
        Row: {
          album: string | null
          artist_id: string
          body: string
          created_at: string
          id: string
          like_count: number
          story_type: string
          track_title: string
          updated_at: string
        }
        Insert: {
          album?: string | null
          artist_id: string
          body: string
          created_at?: string
          id?: string
          like_count?: number
          story_type?: string
          track_title: string
          updated_at?: string
        }
        Update: {
          album?: string | null
          artist_id?: string
          body?: string
          created_at?: string
          id?: string
          like_count?: number
          story_type?: string
          track_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_listen_streaks: {
        Row: {
          current_streak: number
          last_listened_on: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_listened_on?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_listened_on?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      music_listening_lounges: {
        Row: {
          album_url: string | null
          artist_id: string
          attendee_count: number
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          album_url?: string | null
          artist_id: string
          attendee_count?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          album_url?: string | null
          artist_id?: string
          attendee_count?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_listening_parties: {
        Row: {
          created_at: string
          current_track_id: string | null
          host_id: string
          id: string
          is_active: boolean
          is_playing: boolean
          last_sync_at: string
          position_seconds: number
          share_code: string
          title: string | null
        }
        Insert: {
          created_at?: string
          current_track_id?: string | null
          host_id: string
          id?: string
          is_active?: boolean
          is_playing?: boolean
          last_sync_at?: string
          position_seconds?: number
          share_code: string
          title?: string | null
        }
        Update: {
          created_at?: string
          current_track_id?: string | null
          host_id?: string
          id?: string
          is_active?: boolean
          is_playing?: boolean
          last_sync_at?: string
          position_seconds?: number
          share_code?: string
          title?: string | null
        }
        Relationships: []
      }
      music_listening_sessions: {
        Row: {
          artist_id: string
          completed: boolean
          created_at: string
          device_type: string | null
          duration_seconds: number
          fan_id: string
          id: string
          track_id: string
        }
        Insert: {
          artist_id: string
          completed?: boolean
          created_at?: string
          device_type?: string | null
          duration_seconds?: number
          fan_id: string
          id?: string
          track_id: string
        }
        Update: {
          artist_id?: string
          completed?: boolean
          created_at?: string
          device_type?: string | null
          duration_seconds?: number
          fan_id?: string
          id?: string
          track_id?: string
        }
        Relationships: []
      }
      music_listening_streak_days: {
        Row: {
          artist_id: string
          created_at: string
          fan_id: string
          id: string
          listen_date: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          fan_id: string
          id?: string
          listen_date: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          fan_id?: string
          id?: string
          listen_date?: string
        }
        Relationships: []
      }
      music_listening_streaks: {
        Row: {
          artist_id: string
          created_at: string
          current_streak: number
          fan_id: string
          id: string
          last_listen_date: string | null
          longest_streak: number
          total_days: number
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          current_streak?: number
          fan_id: string
          id?: string
          last_listen_date?: string | null
          longest_streak?: number
          total_days?: number
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          current_streak?: number
          fan_id?: string
          id?: string
          last_listen_date?: string | null
          longest_streak?: number
          total_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      music_longform: {
        Row: {
          artist_id: string
          audio_url: string
          cover_url: string | null
          created_at: string
          description: string | null
          duration_seconds: number
          episode_number: number | null
          id: string
          is_published: boolean
          kind: string
          play_count: number
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          audio_url: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number
          episode_number?: number | null
          id?: string
          is_published?: boolean
          kind?: string
          play_count?: number
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          audio_url?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number
          episode_number?: number | null
          id?: string
          is_published?: boolean
          kind?: string
          play_count?: number
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_longform_chapters: {
        Row: {
          artwork_url: string | null
          created_at: string
          episode_id: string
          id: string
          start_seconds: number
          title: string
        }
        Insert: {
          artwork_url?: string | null
          created_at?: string
          episode_id: string
          id?: string
          start_seconds: number
          title: string
        }
        Update: {
          artwork_url?: string | null
          created_at?: string
          episode_id?: string
          id?: string
          start_seconds?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_longform_chapters_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "music_longform"
            referencedColumns: ["id"]
          },
        ]
      }
      music_longform_progress: {
        Row: {
          completed: boolean
          episode_id: string
          position_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          episode_id: string
          position_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          episode_id?: string
          position_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_longform_progress_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "music_longform"
            referencedColumns: ["id"]
          },
        ]
      }
      music_lounge_reactions: {
        Row: {
          created_at: string
          emoji: string
          fan_id: string
          id: string
          lounge_id: string
          position_seconds: number | null
        }
        Insert: {
          created_at?: string
          emoji: string
          fan_id: string
          id?: string
          lounge_id: string
          position_seconds?: number | null
        }
        Update: {
          created_at?: string
          emoji?: string
          fan_id?: string
          id?: string
          lounge_id?: string
          position_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "music_lounge_reactions_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "music_listening_lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      music_lounge_rsvps: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          lounge_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          lounge_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          lounge_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_lounge_rsvps_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "music_listening_lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      music_lyric_annotation_votes: {
        Row: {
          annotation_id: string
          created_at: string
          id: string
          voter_id: string
        }
        Insert: {
          annotation_id: string
          created_at?: string
          id?: string
          voter_id: string
        }
        Update: {
          annotation_id?: string
          created_at?: string
          id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_lyric_annotation_votes_annotation_id_fkey"
            columns: ["annotation_id"]
            isOneToOne: false
            referencedRelation: "music_lyric_annotations"
            referencedColumns: ["id"]
          },
        ]
      }
      music_lyric_annotations: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          line_id: string
          sheet_id: string
          status: string
          updated_at: string
          upvote_count: number
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          line_id: string
          sheet_id: string
          status?: string
          updated_at?: string
          upvote_count?: number
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          line_id?: string
          sheet_id?: string
          status?: string
          updated_at?: string
          upvote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_lyric_annotations_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "music_lyric_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_lyric_annotations_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "music_lyric_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      music_lyric_lines: {
        Row: {
          annotation_count: number
          created_at: string
          id: string
          line_number: number
          line_text: string
          sheet_id: string
          updated_at: string
        }
        Insert: {
          annotation_count?: number
          created_at?: string
          id?: string
          line_number: number
          line_text: string
          sheet_id: string
          updated_at?: string
        }
        Update: {
          annotation_count?: number
          created_at?: string
          id?: string
          line_number?: number
          line_text?: string
          sheet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_lyric_lines_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "music_lyric_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      music_lyric_sheets: {
        Row: {
          annotation_count: number
          artist_id: string
          artist_label: string | null
          created_at: string
          id: string
          lyrics_text: string | null
          status: string
          track_title: string
          updated_at: string
        }
        Insert: {
          annotation_count?: number
          artist_id: string
          artist_label?: string | null
          created_at?: string
          id?: string
          lyrics_text?: string | null
          status?: string
          track_title: string
          updated_at?: string
        }
        Update: {
          annotation_count?: number
          artist_id?: string
          artist_label?: string | null
          created_at?: string
          id?: string
          lyrics_text?: string | null
          status?: string
          track_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_lyric_snippet_reactions: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          reaction: string
          snippet_id: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          reaction: string
          snippet_id: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          reaction?: string
          snippet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_lyric_snippet_reactions_snippet_id_fkey"
            columns: ["snippet_id"]
            isOneToOne: false
            referencedRelation: "music_lyric_snippets"
            referencedColumns: ["id"]
          },
        ]
      }
      music_lyric_snippet_suggestions: {
        Row: {
          created_at: string
          id: string
          reasoning: string | null
          snippet_id: string
          status: string
          suggested_text: string
          suggester_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reasoning?: string | null
          snippet_id: string
          status?: string
          suggested_text: string
          suggester_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reasoning?: string | null
          snippet_id?: string
          status?: string
          suggested_text?: string
          suggester_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_lyric_snippet_suggestions_snippet_id_fkey"
            columns: ["snippet_id"]
            isOneToOne: false
            referencedRelation: "music_lyric_snippets"
            referencedColumns: ["id"]
          },
        ]
      }
      music_lyric_snippets: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          mood: string | null
          reaction_count: number
          snippet_text: string
          status: string
          suggestion_count: number
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          mood?: string | null
          reaction_count?: number
          snippet_text: string
          status?: string
          suggestion_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          mood?: string | null
          reaction_count?: number
          snippet_text?: string
          status?: string
          suggestion_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_lyric_translations: {
        Row: {
          contributor_id: string | null
          created_at: string
          id: string
          language: string
          lyric_id: string
          translated_synced_lines: Json
          translated_text: string
          updated_at: string
        }
        Insert: {
          contributor_id?: string | null
          created_at?: string
          id?: string
          language: string
          lyric_id: string
          translated_synced_lines?: Json
          translated_text: string
          updated_at?: string
        }
        Update: {
          contributor_id?: string | null
          created_at?: string
          id?: string
          language?: string
          lyric_id?: string
          translated_synced_lines?: Json
          translated_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_lyric_translations_lyric_id_fkey"
            columns: ["lyric_id"]
            isOneToOne: false
            referencedRelation: "music_lyrics"
            referencedColumns: ["id"]
          },
        ]
      }
      music_lyrics: {
        Row: {
          contributor_id: string | null
          created_at: string
          id: string
          is_karaoke_ready: boolean
          is_published: boolean
          language: string
          plain_text: string | null
          synced_lines: Json
          track_id: string
          updated_at: string
        }
        Insert: {
          contributor_id?: string | null
          created_at?: string
          id?: string
          is_karaoke_ready?: boolean
          is_published?: boolean
          language?: string
          plain_text?: string | null
          synced_lines?: Json
          track_id: string
          updated_at?: string
        }
        Update: {
          contributor_id?: string | null
          created_at?: string
          id?: string
          is_karaoke_ready?: boolean
          is_published?: boolean
          language?: string
          plain_text?: string | null
          synced_lines?: Json
          track_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_mailbag_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          artist_id: string
          created_at: string
          fan_id: string
          id: string
          is_pinned: boolean
          question: string
          status: string
          updated_at: string
          upvote_count: number
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          artist_id: string
          created_at?: string
          fan_id: string
          id?: string
          is_pinned?: boolean
          question: string
          status?: string
          updated_at?: string
          upvote_count?: number
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          artist_id?: string
          created_at?: string
          fan_id?: string
          id?: string
          is_pinned?: boolean
          question?: string
          status?: string
          updated_at?: string
          upvote_count?: number
        }
        Relationships: []
      }
      music_mailbag_upvotes: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          question_id: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          question_id: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_mailbag_upvotes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "music_mailbag_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_merch_bundle_items: {
        Row: {
          bundle_id: string
          created_at: string
          id: string
          item_kind: string
          item_ref_id: string | null
          label: string | null
          position: number
        }
        Insert: {
          bundle_id: string
          created_at?: string
          id?: string
          item_kind: string
          item_ref_id?: string | null
          label?: string | null
          position?: number
        }
        Update: {
          bundle_id?: string
          created_at?: string
          id?: string
          item_kind?: string
          item_ref_id?: string | null
          label?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_merch_bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "music_merch_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      music_merch_bundles: {
        Row: {
          bundle_type: string
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          inventory_count: number | null
          owner_id: string
          price_cents: number
          release_id: string | null
          sold_count: number
          status: string
          title: string
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          bundle_type?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          inventory_count?: number | null
          owner_id: string
          price_cents?: number
          release_id?: string | null
          sold_count?: number
          status?: string
          title: string
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          bundle_type?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          inventory_count?: number | null
          owner_id?: string
          price_cents?: number
          release_id?: string | null
          sold_count?: number
          status?: string
          title?: string
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      music_merch_drops: {
        Row: {
          artist_id: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          launch_at: string
          price_cents: number
          reservation_count: number
          status: string
          stock_remaining: number
          stock_total: number
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          launch_at: string
          price_cents?: number
          reservation_count?: number
          status?: string
          stock_remaining?: number
          stock_total?: number
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          launch_at?: string
          price_cents?: number
          reservation_count?: number
          status?: string
          stock_remaining?: number
          stock_total?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_merch_reservations: {
        Row: {
          created_at: string
          drop_id: string
          fan_id: string
          id: string
          quantity: number
          status: string
        }
        Insert: {
          created_at?: string
          drop_id: string
          fan_id: string
          id?: string
          quantity?: number
          status?: string
        }
        Update: {
          created_at?: string
          drop_id?: string
          fan_id?: string
          id?: string
          quantity?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_merch_reservations_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "music_merch_drops"
            referencedColumns: ["id"]
          },
        ]
      }
      music_merch_waitlist_signups: {
        Row: {
          created_at: string
          email: string | null
          fan_id: string
          id: string
          notified_at: string | null
          size_pref: string | null
          waitlist_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          fan_id: string
          id?: string
          notified_at?: string | null
          size_pref?: string | null
          waitlist_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          fan_id?: string
          id?: string
          notified_at?: string | null
          size_pref?: string | null
          waitlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_merch_waitlist_signups_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "music_merch_waitlists"
            referencedColumns: ["id"]
          },
        ]
      }
      music_merch_waitlists: {
        Row: {
          artist_id: string
          created_at: string
          drop_title: string
          id: string
          image_url: string | null
          launch_at: string | null
          max_signups: number | null
          notes: string | null
          product_name: string
          signup_count: number
          status: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          drop_title: string
          id?: string
          image_url?: string | null
          launch_at?: string | null
          max_signups?: number | null
          notes?: string | null
          product_name: string
          signup_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          drop_title?: string
          id?: string
          image_url?: string | null
          launch_at?: string | null
          max_signups?: number | null
          notes?: string | null
          product_name?: string
          signup_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_mood_board_items: {
        Row: {
          board_id: string
          caption: string | null
          created_at: string
          id: string
          kind: string
          position: number
          updated_at: string
          url: string | null
        }
        Insert: {
          board_id: string
          caption?: string | null
          created_at?: string
          id?: string
          kind: string
          position?: number
          updated_at?: string
          url?: string | null
        }
        Update: {
          board_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          position?: number
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_mood_board_items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "music_mood_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      music_mood_board_likes: {
        Row: {
          board_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_mood_board_likes_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "music_mood_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      music_mood_boards: {
        Row: {
          artist_id: string
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          like_count: number
          mood: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          like_count?: number
          mood?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          like_count?: number
          mood?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_nft_drops: {
        Row: {
          artwork_url: string | null
          chain: string
          contract_address: string | null
          created_at: string
          currency: string
          description: string | null
          drop_ends_at: string | null
          drop_starts_at: string | null
          edition_size: number
          id: string
          minted_count: number
          owner_id: string
          price_cents: number
          status: string
          title: string
          track_id: string | null
          updated_at: string
        }
        Insert: {
          artwork_url?: string | null
          chain?: string
          contract_address?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          drop_ends_at?: string | null
          drop_starts_at?: string | null
          edition_size?: number
          id?: string
          minted_count?: number
          owner_id: string
          price_cents?: number
          status?: string
          title: string
          track_id?: string | null
          updated_at?: string
        }
        Update: {
          artwork_url?: string | null
          chain?: string
          contract_address?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          drop_ends_at?: string | null
          drop_starts_at?: string | null
          edition_size?: number
          id?: string
          minted_count?: number
          owner_id?: string
          price_cents?: number
          status?: string
          title?: string
          track_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      music_nft_editions: {
        Row: {
          drop_id: string
          edition_number: number
          id: string
          minted_at: string
          owner_user_id: string | null
          tx_hash: string | null
          wallet_address: string | null
        }
        Insert: {
          drop_id: string
          edition_number: number
          id?: string
          minted_at?: string
          owner_user_id?: string | null
          tx_hash?: string | null
          wallet_address?: string | null
        }
        Update: {
          drop_id?: string
          edition_number?: number
          id?: string
          minted_at?: string
          owner_user_id?: string | null
          tx_hash?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_nft_editions_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "music_nft_drops"
            referencedColumns: ["id"]
          },
        ]
      }
      music_notification_prefs: {
        Row: {
          artist_messages: boolean
          concert_reminders: boolean
          drop_reminders: boolean
          new_release: boolean
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          artist_messages?: boolean
          concert_reminders?: boolean
          drop_reminders?: boolean
          new_release?: boolean
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          artist_messages?: boolean
          concert_reminders?: boolean
          drop_reminders?: boolean
          new_release?: boolean
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: []
      }
      music_notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          cover_url: string | null
          created_at: string
          id: string
          link_path: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          link_path?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          link_path?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      music_party_members: {
        Row: {
          id: string
          joined_at: string
          party_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          party_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          party_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_party_members_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "music_listening_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      music_party_queue: {
        Row: {
          added_by: string
          created_at: string
          id: string
          party_id: string
          position: number
          track_id: string
        }
        Insert: {
          added_by: string
          created_at?: string
          id?: string
          party_id: string
          position?: number
          track_id: string
        }
        Update: {
          added_by?: string
          created_at?: string
          id?: string
          party_id?: string
          position?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_party_queue_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "music_listening_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      music_playlist_collaborators: {
        Row: {
          added_at: string
          invited_by: string | null
          playlist_id: string
          role: string
          user_id: string
        }
        Insert: {
          added_at?: string
          invited_by?: string | null
          playlist_id: string
          role?: string
          user_id: string
        }
        Update: {
          added_at?: string
          invited_by?: string | null
          playlist_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_playlist_collaborators_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "music_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      music_playlist_folders: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          position: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          position?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      music_playlist_invites: {
        Row: {
          consumed_at: string | null
          consumed_by: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          playlist_id: string
          role: string
          token: string
        }
        Insert: {
          consumed_at?: string | null
          consumed_by?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          playlist_id: string
          role?: string
          token: string
        }
        Update: {
          consumed_at?: string | null
          consumed_by?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          playlist_id?: string
          role?: string
          token?: string
        }
        Relationships: []
      }
      music_playlist_tracks: {
        Row: {
          added_at: string
          playlist_id: string
          position: number
          track_id: string
        }
        Insert: {
          added_at?: string
          playlist_id: string
          position?: number
          track_id: string
        }
        Update: {
          added_at?: string
          playlist_id?: string
          position?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "music_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_playlist_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      music_playlists: {
        Row: {
          cover_art_url: string | null
          created_at: string
          description: string | null
          folder_id: string | null
          id: string
          is_collaborative: boolean
          is_public: boolean
          title: string
          user_id: string
        }
        Insert: {
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          is_collaborative?: boolean
          is_public?: boolean
          title: string
          user_id: string
        }
        Update: {
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          is_collaborative?: boolean
          is_public?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_playlists_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "music_playlist_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      music_podcast_episodes: {
        Row: {
          artist_id: string
          audio_url: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          episode_number: number | null
          id: string
          is_explicit: boolean
          is_published: boolean
          play_count: number
          published_at: string | null
          season_number: number | null
          show_name: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          audio_url: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          episode_number?: number | null
          id?: string
          is_explicit?: boolean
          is_published?: boolean
          play_count?: number
          published_at?: string | null
          season_number?: number | null
          show_name?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          audio_url?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          episode_number?: number | null
          id?: string
          is_explicit?: boolean
          is_published?: boolean
          play_count?: number
          published_at?: string | null
          season_number?: number | null
          show_name?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_ppv_shows: {
        Row: {
          artist_id: string
          cover_url: string | null
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number
          id: string
          price_cents: number
          scheduled_start: string
          status: string
          stream_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          price_cents?: number
          scheduled_start: string
          status?: string
          stream_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          price_cents?: number
          scheduled_start?: string
          status?: string
          stream_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_ppv_tickets: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          fan_id: string
          id: string
          show_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          fan_id: string
          id?: string
          show_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          fan_id?: string
          id?: string
          show_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_ppv_tickets_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "music_ppv_shows"
            referencedColumns: ["id"]
          },
        ]
      }
      music_premiere_chat: {
        Row: {
          created_at: string
          id: string
          message: string
          premiere_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          premiere_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          premiere_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_premiere_chat_premiere_id_fkey"
            columns: ["premiere_id"]
            isOneToOne: false
            referencedRelation: "music_premieres"
            referencedColumns: ["id"]
          },
        ]
      }
      music_premiere_reminders: {
        Row: {
          created_at: string
          id: string
          premiere_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          premiere_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          premiere_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_premiere_reminders_premiere_id_fkey"
            columns: ["premiere_id"]
            isOneToOne: false
            referencedRelation: "music_premieres"
            referencedColumns: ["id"]
          },
        ]
      }
      music_premieres: {
        Row: {
          created_at: string
          creator_id: string
          ended_at: string | null
          id: string
          reminders_count: number
          scheduled_at: string
          started_at: string | null
          status: string
          track_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          ended_at?: string | null
          id?: string
          reminders_count?: number
          scheduled_at: string
          started_at?: string | null
          status?: string
          track_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          ended_at?: string | null
          id?: string
          reminders_count?: number
          scheduled_at?: string
          started_at?: string | null
          status?: string
          track_id?: string
        }
        Relationships: []
      }
      music_preorder_campaigns: {
        Row: {
          artist_id: string
          cover_url: string | null
          created_at: string
          currency: string
          description: string | null
          format: string
          goal_units: number
          id: string
          price_cents: number
          ships_by: string | null
          status: string
          title: string
          units_reserved: number
          updated_at: string
        }
        Insert: {
          artist_id: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          format?: string
          goal_units?: number
          id?: string
          price_cents: number
          ships_by?: string | null
          status?: string
          title: string
          units_reserved?: number
          updated_at?: string
        }
        Update: {
          artist_id?: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          format?: string
          goal_units?: number
          id?: string
          price_cents?: number
          ships_by?: string | null
          status?: string
          title?: string
          units_reserved?: number
          updated_at?: string
        }
        Relationships: []
      }
      music_preorders: {
        Row: {
          amount_cents: number
          campaign_id: string
          created_at: string
          currency: string
          fan_id: string
          id: string
          quantity: number
          shipping_address: Json | null
          shipping_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          campaign_id: string
          created_at?: string
          currency?: string
          fan_id: string
          id?: string
          quantity?: number
          shipping_address?: Json | null
          shipping_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          campaign_id?: string
          created_at?: string
          currency?: string
          fan_id?: string
          id?: string
          quantity?: number
          shipping_address?: Json | null
          shipping_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_preorders_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "music_preorder_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      music_presave_campaigns: {
        Row: {
          apple_url: string | null
          artist_id: string
          artwork_url: string | null
          created_at: string
          description: string | null
          id: string
          presave_count: number
          release_date: string
          release_title: string
          spotify_url: string | null
          status: string
          tidal_url: string | null
          updated_at: string
        }
        Insert: {
          apple_url?: string | null
          artist_id: string
          artwork_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          presave_count?: number
          release_date: string
          release_title: string
          spotify_url?: string | null
          status?: string
          tidal_url?: string | null
          updated_at?: string
        }
        Update: {
          apple_url?: string | null
          artist_id?: string
          artwork_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          presave_count?: number
          release_date?: string
          release_title?: string
          spotify_url?: string | null
          status?: string
          tidal_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      music_presave_signups: {
        Row: {
          campaign_id: string
          created_at: string
          email: string | null
          fan_id: string
          id: string
          notified_at: string | null
          platforms: string[]
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email?: string | null
          fan_id: string
          id?: string
          notified_at?: string | null
          platforms?: string[]
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email?: string | null
          fan_id?: string
          id?: string
          notified_at?: string | null
          platforms?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "music_presave_signups_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "music_presave_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      music_pro_works: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          notes: string | null
          pro_name: string
          registration_id: string
          status: string
          submitted_at: string
          work_id_external: string | null
          work_title: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pro_name: string
          registration_id: string
          status?: string
          submitted_at?: string
          work_id_external?: string | null
          work_title: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pro_name?: string
          registration_id?: string
          status?: string
          submitted_at?: string
          work_id_external?: string | null
          work_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_pro_works_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "music_publishing_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      music_publishing_registrations: {
        Row: {
          created_at: string
          id: string
          isrc: string | null
          iswc: string | null
          notes: string | null
          owner_id: string
          pro_member_id: string | null
          pro_name: string | null
          publisher_name: string | null
          publisher_share: number | null
          registered_at: string | null
          release_id: string | null
          status: string
          track_id: string | null
          upc: string | null
          updated_at: string
          writer_share: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          isrc?: string | null
          iswc?: string | null
          notes?: string | null
          owner_id: string
          pro_member_id?: string | null
          pro_name?: string | null
          publisher_name?: string | null
          publisher_share?: number | null
          registered_at?: string | null
          release_id?: string | null
          status?: string
          track_id?: string | null
          upc?: string | null
          updated_at?: string
          writer_share?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          isrc?: string | null
          iswc?: string | null
          notes?: string | null
          owner_id?: string
          pro_member_id?: string | null
          pro_name?: string | null
          publisher_name?: string | null
          publisher_share?: number | null
          registered_at?: string | null
          release_id?: string | null
          status?: string
          track_id?: string | null
          upc?: string | null
          updated_at?: string
          writer_share?: number | null
        }
        Relationships: []
      }
      music_qa_question_votes: {
        Row: {
          created_at: string
          id: string
          question_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_qa_question_votes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "music_qa_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_qa_questions: {
        Row: {
          answer_body: string | null
          answered_at: string | null
          asker_id: string
          body: string
          created_at: string
          id: string
          status: string
          thread_id: string
          updated_at: string
          upvote_count: number
        }
        Insert: {
          answer_body?: string | null
          answered_at?: string | null
          asker_id: string
          body: string
          created_at?: string
          id?: string
          status?: string
          thread_id: string
          updated_at?: string
          upvote_count?: number
        }
        Update: {
          answer_body?: string | null
          answered_at?: string | null
          asker_id?: string
          body?: string
          created_at?: string
          id?: string
          status?: string
          thread_id?: string
          updated_at?: string
          upvote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_qa_questions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "music_qa_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      music_qa_threads: {
        Row: {
          artist_id: string
          created_at: string
          description: string | null
          id: string
          question_count: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          description?: string | null
          id?: string
          question_count?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          description?: string | null
          id?: string
          question_count?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_radio_stations: {
        Row: {
          cover_url: string | null
          created_at: string
          current_started_at: string | null
          current_track_id: string | null
          description: string | null
          genre: string | null
          id: string
          is_live: boolean
          listeners_count: number
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          current_started_at?: string | null
          current_track_id?: string | null
          description?: string | null
          genre?: string | null
          id?: string
          is_live?: boolean
          listeners_count?: number
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          current_started_at?: string | null
          current_track_id?: string | null
          description?: string | null
          genre?: string | null
          id?: string
          is_live?: boolean
          listeners_count?: number
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_radio_tracks: {
        Row: {
          created_at: string
          id: string
          position: number
          station_id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          station_id: string
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          station_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_radio_tracks_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "music_radio_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      music_recently_played: {
        Row: {
          id: string
          played_at: string
          position_seconds: number | null
          track_id: string
          user_id: string
        }
        Insert: {
          id?: string
          played_at?: string
          position_seconds?: number | null
          track_id: string
          user_id: string
        }
        Update: {
          id?: string
          played_at?: string
          position_seconds?: number | null
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_recently_played_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      music_remix_contests: {
        Row: {
          artist_id: string
          cover_url: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          prize_amount_cents: number | null
          prize_description: string | null
          status: string
          stems_url: string | null
          submission_deadline: string | null
          title: string
          updated_at: string
          voting_deadline: string | null
        }
        Insert: {
          artist_id: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          prize_amount_cents?: number | null
          prize_description?: string | null
          status?: string
          stems_url?: string | null
          submission_deadline?: string | null
          title: string
          updated_at?: string
          voting_deadline?: string | null
        }
        Update: {
          artist_id?: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          prize_amount_cents?: number | null
          prize_description?: string | null
          status?: string
          stems_url?: string | null
          submission_deadline?: string | null
          title?: string
          updated_at?: string
          voting_deadline?: string | null
        }
        Relationships: []
      }
      music_remix_submissions: {
        Row: {
          audio_url: string
          contest_id: string
          created_at: string
          fan_id: string
          id: string
          notes: string | null
          status: string
          title: string
          updated_at: string
          vote_count: number
        }
        Insert: {
          audio_url: string
          contest_id: string
          created_at?: string
          fan_id: string
          id?: string
          notes?: string | null
          status?: string
          title: string
          updated_at?: string
          vote_count?: number
        }
        Update: {
          audio_url?: string
          contest_id?: string
          created_at?: string
          fan_id?: string
          id?: string
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_remix_submissions_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "music_remix_contests"
            referencedColumns: ["id"]
          },
        ]
      }
      music_remix_votes: {
        Row: {
          contest_id: string
          created_at: string
          id: string
          submission_id: string
          voter_id: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          id?: string
          submission_id: string
          voter_id: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          id?: string
          submission_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_remix_votes_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "music_remix_contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_remix_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "music_remix_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_rights_holders: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          payee_email: string | null
          payee_name: string | null
          payee_user_id: string | null
          role: string
          share_percent: number
          track_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          payee_email?: string | null
          payee_name?: string | null
          payee_user_id?: string | null
          role?: string
          share_percent: number
          track_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          payee_email?: string | null
          payee_name?: string | null
          payee_user_id?: string | null
          role?: string
          share_percent?: number
          track_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_road_postcard_likes: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          postcard_id: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          postcard_id: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          postcard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_road_postcard_likes_postcard_id_fkey"
            columns: ["postcard_id"]
            isOneToOne: false
            referencedRelation: "music_road_postcards"
            referencedColumns: ["id"]
          },
        ]
      }
      music_road_postcards: {
        Row: {
          artist_id: string
          city: string
          country: string | null
          created_at: string
          id: string
          image_url: string | null
          like_count: number
          message: string
          mood: string | null
          postcard_date: string
          status: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          city: string
          country?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          like_count?: number
          message: string
          mood?: string | null
          postcard_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          city?: string
          country?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          like_count?: number
          message?: string
          mood?: string | null
          postcard_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_royalty_events: {
        Row: {
          created_at: string
          distributed_at: string | null
          fee_cents: number
          gross_cents: number
          id: string
          net_cents: number
          occurred_at: string
          owner_id: string
          source: string
          source_ref: string | null
          track_id: string
        }
        Insert: {
          created_at?: string
          distributed_at?: string | null
          fee_cents?: number
          gross_cents?: number
          id?: string
          net_cents?: number
          occurred_at?: string
          owner_id: string
          source: string
          source_ref?: string | null
          track_id: string
        }
        Update: {
          created_at?: string
          distributed_at?: string | null
          fee_cents?: number
          gross_cents?: number
          id?: string
          net_cents?: number
          occurred_at?: string
          owner_id?: string
          source?: string
          source_ref?: string | null
          track_id?: string
        }
        Relationships: []
      }
      music_royalty_payouts: {
        Row: {
          amount_cents: number
          created_at: string
          event_id: string
          holder_id: string
          id: string
          paid_at: string | null
          payee_user_id: string | null
          status: string
          stripe_transfer_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          event_id: string
          holder_id: string
          id?: string
          paid_at?: string | null
          payee_user_id?: string | null
          status?: string
          stripe_transfer_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          event_id?: string
          holder_id?: string
          id?: string
          paid_at?: string | null
          payee_user_id?: string | null
          status?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_royalty_payouts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "music_royalty_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_royalty_payouts_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "music_rights_holders"
            referencedColumns: ["id"]
          },
        ]
      }
      music_sample_packs: {
        Row: {
          bpm: number | null
          cover_url: string | null
          created_at: string
          creator_id: string
          currency: string
          description: string | null
          genre: string | null
          id: string
          is_published: boolean
          music_key: string | null
          price_cents: number
          sales_count: number
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          bpm?: number | null
          cover_url?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          description?: string | null
          genre?: string | null
          id?: string
          is_published?: boolean
          music_key?: string | null
          price_cents?: number
          sales_count?: number
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          bpm?: number | null
          cover_url?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          description?: string | null
          genre?: string | null
          id?: string
          is_published?: boolean
          music_key?: string | null
          price_cents?: number
          sales_count?: number
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_sample_purchases: {
        Row: {
          amount_cents: number
          buyer_id: string
          currency: string
          id: string
          pack_id: string
          purchased_at: string
        }
        Insert: {
          amount_cents?: number
          buyer_id: string
          currency?: string
          id?: string
          pack_id: string
          purchased_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_id?: string
          currency?: string
          id?: string
          pack_id?: string
          purchased_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_sample_purchases_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "music_sample_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      music_samples: {
        Row: {
          audio_url: string
          bpm: number | null
          created_at: string
          duration_seconds: number | null
          id: string
          music_key: string | null
          pack_id: string
          position: number
          preview_url: string | null
          sample_type: string
          title: string
        }
        Insert: {
          audio_url: string
          bpm?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          music_key?: string | null
          pack_id: string
          position?: number
          preview_url?: string | null
          sample_type?: string
          title: string
        }
        Update: {
          audio_url?: string
          bpm?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          music_key?: string | null
          pack_id?: string
          position?: number
          preview_url?: string | null
          sample_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_samples_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "music_sample_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      music_search_history: {
        Row: {
          created_at: string
          id: string
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      music_setlist_battle_votes: {
        Row: {
          battle_id: string
          choice: string
          created_at: string
          fan_id: string
          id: string
        }
        Insert: {
          battle_id: string
          choice: string
          created_at?: string
          fan_id: string
          id?: string
        }
        Update: {
          battle_id?: string
          choice?: string
          created_at?: string
          fan_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_setlist_battle_votes_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "music_setlist_battles"
            referencedColumns: ["id"]
          },
        ]
      }
      music_setlist_battles: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          option_a_label: string
          option_a_tracks: string[]
          option_b_label: string
          option_b_tracks: string[]
          show_date: string | null
          status: string
          title: string
          updated_at: string
          votes_a: number
          votes_b: number
          winner: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          option_a_label: string
          option_a_tracks?: string[]
          option_b_label: string
          option_b_tracks?: string[]
          show_date?: string | null
          status?: string
          title: string
          updated_at?: string
          votes_a?: number
          votes_b?: number
          winner?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          option_a_label?: string
          option_a_tracks?: string[]
          option_b_label?: string
          option_b_tracks?: string[]
          show_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          votes_a?: number
          votes_b?: number
          winner?: string | null
        }
        Relationships: []
      }
      music_setlist_candidates: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          notes: string | null
          show_date: string | null
          show_label: string
          status: string
          track_id: string | null
          track_title: string
          updated_at: string
          vote_count: number
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          notes?: string | null
          show_date?: string | null
          show_label: string
          status?: string
          track_id?: string | null
          track_title: string
          updated_at?: string
          vote_count?: number
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          show_date?: string | null
          show_label?: string
          status?: string
          track_id?: string | null
          track_title?: string
          updated_at?: string
          vote_count?: number
        }
        Relationships: []
      }
      music_setlist_items: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          note: string | null
          position: number
          setlist_id: string
          track_id: string | null
          track_title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          note?: string | null
          position?: number
          setlist_id: string
          track_id?: string | null
          track_title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          note?: string | null
          position?: number
          setlist_id?: string
          track_id?: string | null
          track_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_setlist_items_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "music_setlists"
            referencedColumns: ["id"]
          },
        ]
      }
      music_setlist_request_votes: {
        Row: {
          created_at: string
          id: string
          request_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_setlist_request_votes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "music_setlist_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      music_setlist_requests: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          note: string | null
          setlist_id: string
          status: string
          track_title: string
          updated_at: string
          vote_count: number
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          note?: string | null
          setlist_id: string
          status?: string
          track_title: string
          updated_at?: string
          vote_count?: number
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          note?: string | null
          setlist_id?: string
          status?: string
          track_title?: string
          updated_at?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_setlist_requests_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "music_setlists"
            referencedColumns: ["id"]
          },
        ]
      }
      music_setlist_votes: {
        Row: {
          candidate_id: string
          created_at: string
          fan_id: string
          id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          fan_id: string
          id?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          fan_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_setlist_votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "music_setlist_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      music_setlists: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          is_published: boolean
          notes: string | null
          show_date: string
          show_title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          is_published?: boolean
          notes?: string | null
          show_date: string
          show_title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          is_published?: boolean
          notes?: string | null
          show_date?: string
          show_title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      music_show_guest_lists: {
        Row: {
          artist_id: string
          capacity: number
          created_at: string
          id: string
          notes: string | null
          show_date: string
          show_title: string
          spots_used: number
          status: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          artist_id: string
          capacity?: number
          created_at?: string
          id?: string
          notes?: string | null
          show_date: string
          show_title: string
          spots_used?: number
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          artist_id?: string
          capacity?: number
          created_at?: string
          id?: string
          notes?: string | null
          show_date?: string
          show_title?: string
          spots_used?: number
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      music_show_guest_requests: {
        Row: {
          created_at: string
          fan_id: string
          full_name: string
          guest_list_id: string
          id: string
          note: string | null
          plus_one_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          full_name: string
          guest_list_id: string
          id?: string
          note?: string | null
          plus_one_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          full_name?: string
          guest_list_id?: string
          id?: string
          note?: string | null
          plus_one_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_show_guest_requests_guest_list_id_fkey"
            columns: ["guest_list_id"]
            isOneToOne: false
            referencedRelation: "music_show_guest_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      music_show_tips: {
        Row: {
          amount_cents: number
          artist_id: string
          created_at: string
          currency: string
          fan_id: string
          id: string
          message: string | null
          show_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          artist_id: string
          created_at?: string
          currency?: string
          fan_id: string
          id?: string
          message?: string | null
          show_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          artist_id?: string
          created_at?: string
          currency?: string
          fan_id?: string
          id?: string
          message?: string | null
          show_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_smart_playlists: {
        Row: {
          cover_art_url: string | null
          created_at: string
          folder_id: string | null
          id: string
          rule_params: Json
          rule_type: string
          title: string
          user_id: string
        }
        Insert: {
          cover_art_url?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          rule_params?: Json
          rule_type: string
          title: string
          user_id: string
        }
        Update: {
          cover_art_url?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          rule_params?: Json
          rule_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_smart_playlists_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "music_playlist_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      music_song_dedications: {
        Row: {
          amount_cents: number
          artist_id: string
          created_at: string
          currency: string
          dedicated_to: string
          display_order: number
          fan_id: string
          id: string
          is_public: boolean
          message: string | null
          status: string
          track_id: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          artist_id: string
          created_at?: string
          currency?: string
          dedicated_to: string
          display_order?: number
          fan_id: string
          id?: string
          is_public?: boolean
          message?: string | null
          status?: string
          track_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          artist_id?: string
          created_at?: string
          currency?: string
          dedicated_to?: string
          display_order?: number
          fan_id?: string
          id?: string
          is_public?: boolean
          message?: string | null
          status?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_split_sheet_writers: {
        Row: {
          created_at: string
          id: string
          pro_affiliation: string | null
          publishing_share_pct: number
          role: string
          sheet_id: string
          signed_at: string | null
          writer_email: string | null
          writer_name: string
          writer_user_id: string | null
          writing_share_pct: number
        }
        Insert: {
          created_at?: string
          id?: string
          pro_affiliation?: string | null
          publishing_share_pct?: number
          role?: string
          sheet_id: string
          signed_at?: string | null
          writer_email?: string | null
          writer_name: string
          writer_user_id?: string | null
          writing_share_pct?: number
        }
        Update: {
          created_at?: string
          id?: string
          pro_affiliation?: string | null
          publishing_share_pct?: number
          role?: string
          sheet_id?: string
          signed_at?: string | null
          writer_email?: string | null
          writer_name?: string
          writer_user_id?: string | null
          writing_share_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_split_sheet_writers_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "music_split_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      music_split_sheets: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string | null
          song_title: string
          status: string
          track_id: string | null
          updated_at: string
          work_title: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          song_title: string
          status?: string
          track_id?: string | null
          updated_at?: string
          work_title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          song_title?: string
          status?: string
          track_id?: string | null
          updated_at?: string
          work_title?: string | null
        }
        Relationships: []
      }
      music_stem_downloads: {
        Row: {
          created_at: string
          id: string
          station_id: string
          stem_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          station_id: string
          stem_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          station_id?: string
          stem_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_stem_downloads_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "music_stem_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_stem_downloads_stem_id_fkey"
            columns: ["stem_id"]
            isOneToOne: false
            referencedRelation: "music_stem_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      music_stem_files: {
        Row: {
          created_at: string
          file_format: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          listing_id: string
          position: number
          stem_kind: string
        }
        Insert: {
          created_at?: string
          file_format?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          listing_id: string
          position?: number
          stem_kind: string
        }
        Update: {
          created_at?: string
          file_format?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          listing_id?: string
          position?: number
          stem_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_stem_files_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "music_stem_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      music_stem_listings: {
        Row: {
          bpm: number | null
          created_at: string
          currency: string
          description: string | null
          genre: string | null
          id: string
          license_type: string
          musical_key: string | null
          owner_id: string
          preview_url: string | null
          price_cents: number
          sold_count: number
          status: string
          title: string
          track_id: string | null
          updated_at: string
        }
        Insert: {
          bpm?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          genre?: string | null
          id?: string
          license_type?: string
          musical_key?: string | null
          owner_id: string
          preview_url?: string | null
          price_cents?: number
          sold_count?: number
          status?: string
          title: string
          track_id?: string | null
          updated_at?: string
        }
        Update: {
          bpm?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          genre?: string | null
          id?: string
          license_type?: string
          musical_key?: string | null
          owner_id?: string
          preview_url?: string | null
          price_cents?: number
          sold_count?: number
          status?: string
          title?: string
          track_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      music_stem_purchases: {
        Row: {
          amount_cents: number
          buyer_id: string
          created_at: string
          currency: string
          download_count: number
          id: string
          listing_id: string
        }
        Insert: {
          amount_cents: number
          buyer_id: string
          created_at?: string
          currency?: string
          download_count?: number
          id?: string
          listing_id: string
        }
        Update: {
          amount_cents?: number
          buyer_id?: string
          created_at?: string
          currency?: string
          download_count?: number
          id?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_stem_purchases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "music_stem_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      music_stem_stations: {
        Row: {
          artist_id: string
          bpm: number | null
          cover_url: string | null
          created_at: string
          description: string | null
          download_count: number
          id: string
          music_key: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          bpm?: number | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          music_key?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          bpm?: number | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          music_key?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_stem_tracks: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          kind: string
          label: string
          position: number
          station_id: string
          updated_at: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind: string
          label: string
          position?: number
          station_id: string
          updated_at?: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind?: string
          label?: string
          position?: number
          station_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_stem_tracks_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "music_stem_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      music_studio_diary_entries: {
        Row: {
          artist_id: string
          clip_url: string | null
          created_at: string
          hours_logged: number | null
          id: string
          mood: string | null
          notes: string | null
          phase: string
          reaction_count: number
          session_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          clip_url?: string | null
          created_at?: string
          hours_logged?: number | null
          id?: string
          mood?: string | null
          notes?: string | null
          phase: string
          reaction_count?: number
          session_date?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          clip_url?: string | null
          created_at?: string
          hours_logged?: number | null
          id?: string
          mood?: string | null
          notes?: string | null
          phase?: string
          reaction_count?: number
          session_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_studio_diary_reactions: {
        Row: {
          created_at: string
          entry_id: string
          fan_id: string
          id: string
          reaction: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          fan_id: string
          id?: string
          reaction: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          fan_id?: string
          id?: string
          reaction?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_studio_diary_reactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "music_studio_diary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      music_sync_attendees: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          rsvp: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          rsvp?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          rsvp?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_sync_attendees_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "music_sync_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_sync_briefs: {
        Row: {
          budget_cents: number | null
          created_at: string
          deadline: string | null
          description: string | null
          genre: string[] | null
          id: string
          mood: string[] | null
          owner_id: string
          project_name: string
          project_type: string
          reference_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget_cents?: number | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          genre?: string[] | null
          id?: string
          mood?: string[] | null
          owner_id: string
          project_name: string
          project_type: string
          reference_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget_cents?: number | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          genre?: string[] | null
          id?: string
          mood?: string[] | null
          owner_id?: string
          project_name?: string
          project_type?: string
          reference_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_sync_listings: {
        Row: {
          artist_name: string
          artwork_url: string | null
          created_at: string
          description: string | null
          exclusive: boolean
          genre: string[] | null
          id: string
          max_fee_cents: number | null
          min_fee_cents: number | null
          mood: string[] | null
          owner_id: string
          preview_url: string | null
          status: string
          tags: string[] | null
          title: string
          track_id: string | null
          updated_at: string
        }
        Insert: {
          artist_name: string
          artwork_url?: string | null
          created_at?: string
          description?: string | null
          exclusive?: boolean
          genre?: string[] | null
          id?: string
          max_fee_cents?: number | null
          min_fee_cents?: number | null
          mood?: string[] | null
          owner_id: string
          preview_url?: string | null
          status?: string
          tags?: string[] | null
          title: string
          track_id?: string | null
          updated_at?: string
        }
        Update: {
          artist_name?: string
          artwork_url?: string | null
          created_at?: string
          description?: string | null
          exclusive?: boolean
          genre?: string[] | null
          id?: string
          max_fee_cents?: number | null
          min_fee_cents?: number | null
          mood?: string[] | null
          owner_id?: string
          preview_url?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          track_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      music_sync_pitches: {
        Row: {
          brief_id: string
          created_at: string
          id: string
          listing_id: string | null
          message: string | null
          pitcher_id: string
          proposed_fee_cents: number | null
          status: string
          updated_at: string
        }
        Insert: {
          brief_id: string
          created_at?: string
          id?: string
          listing_id?: string | null
          message?: string | null
          pitcher_id: string
          proposed_fee_cents?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          brief_id?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          message?: string | null
          pitcher_id?: string
          proposed_fee_cents?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_sync_pitches_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "music_sync_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_sync_pitches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "music_sync_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      music_sync_sessions: {
        Row: {
          album_name: string | null
          artist_id: string | null
          capacity: number
          cover_url: string | null
          created_at: string
          duration_minutes: number
          going_count: number
          host_id: string
          host_message: string | null
          id: string
          scheduled_at: string
          spotify_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          album_name?: string | null
          artist_id?: string | null
          capacity?: number
          cover_url?: string | null
          created_at?: string
          duration_minutes?: number
          going_count?: number
          host_id: string
          host_message?: string | null
          id?: string
          scheduled_at: string
          spotify_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          album_name?: string | null
          artist_id?: string | null
          capacity?: number
          cover_url?: string | null
          created_at?: string
          duration_minutes?: number
          going_count?: number
          host_id?: string
          host_message?: string | null
          id?: string
          scheduled_at?: string
          spotify_url?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_tip_contributions: {
        Row: {
          amount_cents: number
          created_at: string
          fan_id: string
          goal_id: string
          id: string
          is_anonymous: boolean
          message: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          fan_id: string
          goal_id: string
          id?: string
          is_anonymous?: boolean
          message?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          fan_id?: string
          goal_id?: string
          id?: string
          is_anonymous?: boolean
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_tip_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "music_tip_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      music_tip_goals: {
        Row: {
          artist_id: string
          contributor_count: number
          created_at: string
          description: string | null
          ends_at: string | null
          goal_cents: number
          id: string
          raised_cents: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          contributor_count?: number
          created_at?: string
          description?: string | null
          ends_at?: string | null
          goal_cents: number
          id?: string
          raised_cents?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          contributor_count?: number
          created_at?: string
          description?: string | null
          ends_at?: string | null
          goal_cents?: number
          id?: string
          raised_cents?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_tip_jar_contributions: {
        Row: {
          amount_cents: number
          created_at: string
          fan_id: string
          goal_id: string
          id: string
          is_anonymous: boolean
          message: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          fan_id: string
          goal_id: string
          id?: string
          is_anonymous?: boolean
          message?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          fan_id?: string
          goal_id?: string
          id?: string
          is_anonymous?: boolean
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_tip_jar_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "music_tip_jar_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      music_tip_jar_goals: {
        Row: {
          artist_id: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          raised_cents: number
          status: string
          target_cents: number
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          raised_cents?: number
          status?: string
          target_cents: number
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          raised_cents?: number
          status?: string
          target_cents?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_tips: {
        Row: {
          amount_cents: number
          artist_id: string
          created_at: string
          currency: string
          fan_id: string
          id: string
          message: string | null
          track_id: string | null
        }
        Insert: {
          amount_cents: number
          artist_id: string
          created_at?: string
          currency?: string
          fan_id: string
          id?: string
          message?: string | null
          track_id?: string | null
        }
        Update: {
          amount_cents?: number
          artist_id?: string
          created_at?: string
          currency?: string
          fan_id?: string
          id?: string
          message?: string | null
          track_id?: string | null
        }
        Relationships: []
      }
      music_tour_city_requests: {
        Row: {
          artist_id: string
          city: string
          country: string
          created_at: string
          id: string
          nominator_id: string
          notes: string | null
          region: string | null
          status: string
          updated_at: string
          vote_count: number
        }
        Insert: {
          artist_id: string
          city: string
          country: string
          created_at?: string
          id?: string
          nominator_id: string
          notes?: string | null
          region?: string | null
          status?: string
          updated_at?: string
          vote_count?: number
        }
        Update: {
          artist_id?: string
          city?: string
          country?: string
          created_at?: string
          id?: string
          nominator_id?: string
          notes?: string | null
          region?: string | null
          status?: string
          updated_at?: string
          vote_count?: number
        }
        Relationships: []
      }
      music_tour_city_votes: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          request_id: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          request_id: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_tour_city_votes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "music_tour_city_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      music_tour_dates: {
        Row: {
          artist_id: string
          city: string
          country: string
          cover_url: string | null
          created_at: string
          doors_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          on_sale_at: string | null
          region: string | null
          starts_at: string
          status: string
          ticket_url: string | null
          tour_name: string | null
          updated_at: string
          venue_name: string
        }
        Insert: {
          artist_id: string
          city: string
          country: string
          cover_url?: string | null
          created_at?: string
          doors_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          on_sale_at?: string | null
          region?: string | null
          starts_at: string
          status?: string
          ticket_url?: string | null
          tour_name?: string | null
          updated_at?: string
          venue_name: string
        }
        Update: {
          artist_id?: string
          city?: string
          country?: string
          cover_url?: string | null
          created_at?: string
          doors_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          on_sale_at?: string | null
          region?: string | null
          starts_at?: string
          status?: string
          ticket_url?: string | null
          tour_name?: string | null
          updated_at?: string
          venue_name?: string
        }
        Relationships: []
      }
      music_tour_rsvps: {
        Row: {
          created_at: string
          id: string
          reminder_enabled: boolean
          status: string
          tour_date_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reminder_enabled?: boolean
          status?: string
          tour_date_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reminder_enabled?: boolean
          status?: string
          tour_date_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_tour_rsvps_tour_date_id_fkey"
            columns: ["tour_date_id"]
            isOneToOne: false
            referencedRelation: "music_tour_dates"
            referencedColumns: ["id"]
          },
        ]
      }
      music_tour_suggestion_cities: {
        Row: {
          city: string
          country: string | null
          created_at: string
          id: string
          notes: string | null
          region: string | null
          suggested_by: string | null
          suggestion_id: string
          updated_at: string
          vote_count: number
        }
        Insert: {
          city: string
          country?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          region?: string | null
          suggested_by?: string | null
          suggestion_id: string
          updated_at?: string
          vote_count?: number
        }
        Update: {
          city?: string
          country?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          region?: string | null
          suggested_by?: string | null
          suggestion_id?: string
          updated_at?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_tour_suggestion_cities_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "music_tour_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_tour_suggestion_votes: {
        Row: {
          city_id: string
          created_at: string
          fan_id: string
          id: string
          suggestion_id: string
        }
        Insert: {
          city_id: string
          created_at?: string
          fan_id: string
          id?: string
          suggestion_id: string
        }
        Update: {
          city_id?: string
          created_at?: string
          fan_id?: string
          id?: string
          suggestion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_tour_suggestion_votes_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "music_tour_suggestion_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_tour_suggestion_votes_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "music_tour_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_tour_suggestions: {
        Row: {
          artist_id: string
          created_at: string
          description: string | null
          id: string
          status: string
          suggestion_count: number
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          suggestion_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          suggestion_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_track_wishlist: {
        Row: {
          artist_id: string
          created_at: string
          fan_id: string
          id: string
          note: string | null
          priority: number
          track_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          fan_id: string
          id?: string
          note?: string | null
          priority?: number
          track_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          fan_id?: string
          id?: string
          note?: string | null
          priority?: number
          track_id?: string
        }
        Relationships: []
      }
      music_trending_searches: {
        Row: {
          hits: number
          last_searched_at: string
          query: string
        }
        Insert: {
          hits?: number
          last_searched_at?: string
          query: string
        }
        Update: {
          hits?: number
          last_searched_at?: string
          query?: string
        }
        Relationships: []
      }
      music_trivia_attempts: {
        Row: {
          created_at: string
          duration_seconds: number
          fan_id: string
          id: string
          quiz_id: string
          score: number
          total_points: number
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          fan_id: string
          id?: string
          quiz_id: string
          score?: number
          total_points?: number
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          fan_id?: string
          id?: string
          quiz_id?: string
          score?: number
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_trivia_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "music_trivia_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      music_trivia_questions: {
        Row: {
          choices: string[]
          correct_index: number
          created_at: string
          id: string
          points: number
          position: number
          prompt: string
          quiz_id: string
        }
        Insert: {
          choices: string[]
          correct_index: number
          created_at?: string
          id?: string
          points?: number
          position?: number
          prompt: string
          quiz_id: string
        }
        Update: {
          choices?: string[]
          correct_index?: number
          created_at?: string
          id?: string
          points?: number
          position?: number
          prompt?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_trivia_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "music_trivia_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      music_trivia_quizzes: {
        Row: {
          artist_id: string
          attempt_count: number
          created_at: string
          description: string | null
          id: string
          status: string
          time_limit_seconds: number | null
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          attempt_count?: number
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          time_limit_seconds?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          attempt_count?: number
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          time_limit_seconds?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_user_badges: {
        Row: {
          badge_key: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_key: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_user_badges_badge_key_fkey"
            columns: ["badge_key"]
            isOneToOne: false
            referencedRelation: "music_badges"
            referencedColumns: ["key"]
          },
        ]
      }
      music_vinyl_drops: {
        Row: {
          artist_id: string
          color: string | null
          cover_url: string | null
          created_at: string
          currency: string
          description: string | null
          edition_size: number
          id: string
          price_cents: number
          reserved_count: number
          ships_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          color?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          edition_size?: number
          id?: string
          price_cents?: number
          reserved_count?: number
          ships_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          color?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          edition_size?: number
          id?: string
          price_cents?: number
          reserved_count?: number
          ships_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_vinyl_reservations: {
        Row: {
          created_at: string
          drop_id: string
          fan_id: string
          id: string
          quantity: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          drop_id: string
          fan_id: string
          id?: string
          quantity?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          drop_id?: string
          fan_id?: string
          id?: string
          quantity?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_vinyl_reservations_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "music_vinyl_drops"
            referencedColumns: ["id"]
          },
        ]
      }
      music_voice_memo_likes: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          memo_id: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          memo_id: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          memo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_voice_memo_likes_memo_id_fkey"
            columns: ["memo_id"]
            isOneToOne: false
            referencedRelation: "music_voice_memos"
            referencedColumns: ["id"]
          },
        ]
      }
      music_voice_memo_replies: {
        Row: {
          body: string
          created_at: string
          fan_id: string
          id: string
          memo_id: string
          status: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          fan_id: string
          id?: string
          memo_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          fan_id?: string
          id?: string
          memo_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_voice_memo_replies_memo_id_fkey"
            columns: ["memo_id"]
            isOneToOne: false
            referencedRelation: "music_voice_memos"
            referencedColumns: ["id"]
          },
        ]
      }
      music_voice_memos: {
        Row: {
          artist_id: string
          audio_url: string
          caption: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          like_count: number
          reply_count: number
          status: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          audio_url: string
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          like_count?: number
          reply_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          audio_url?: string
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          like_count?: number
          reply_count?: number
          status?: string
          updated_at?: string
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
          channel_category: string | null
          created_at: string | null
          description: string | null
          ended_at: string | null
          energy_score: number
          event_id: string | null
          featured_product_id: string | null
          featured_product_source: string | null
          hype_train_expires_at: string | null
          hype_train_level: number | null
          id: string
          is_event_stream: boolean | null
          is_public: boolean | null
          mux_playback_id: string | null
          mux_stream_id: string
          orientation: string | null
          slug: string | null
          started_at: string | null
          status: string | null
          stream_key: string | null
          stream_type: string
          tickets_sold_during_stream: number | null
          title: string | null
          updated_at: string | null
          user_id: string
          venue_attendance_count: number | null
          viewer_count: number | null
        }
        Insert: {
          category?: string | null
          channel_category?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          energy_score?: number
          event_id?: string | null
          featured_product_id?: string | null
          featured_product_source?: string | null
          hype_train_expires_at?: string | null
          hype_train_level?: number | null
          id?: string
          is_event_stream?: boolean | null
          is_public?: boolean | null
          mux_playback_id?: string | null
          mux_stream_id: string
          orientation?: string | null
          slug?: string | null
          started_at?: string | null
          status?: string | null
          stream_key?: string | null
          stream_type?: string
          tickets_sold_during_stream?: number | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          venue_attendance_count?: number | null
          viewer_count?: number | null
        }
        Update: {
          category?: string | null
          channel_category?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          energy_score?: number
          event_id?: string | null
          featured_product_id?: string | null
          featured_product_source?: string | null
          hype_train_expires_at?: string | null
          hype_train_level?: number | null
          id?: string
          is_event_stream?: boolean | null
          is_public?: boolean | null
          mux_playback_id?: string | null
          mux_stream_id?: string
          orientation?: string | null
          slug?: string | null
          started_at?: string | null
          status?: string | null
          stream_key?: string | null
          stream_type?: string
          tickets_sold_during_stream?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          venue_attendance_count?: number | null
          viewer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mux_live_streams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
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
      newsletter_recipients: {
        Row: {
          email: string
          id: string
          newsletter_id: string
          opened_at: string | null
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          email: string
          id?: string
          newsletter_id: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          email?: string
          id?: string
          newsletter_id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_recipients_newsletter_id_fkey"
            columns: ["newsletter_id"]
            isOneToOne: false
            referencedRelation: "creator_newsletters"
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
      orders: {
        Row: {
          buyer_id: string
          completed_at: string | null
          created_at: string
          currency: string
          event_id: string | null
          fees_cents: number
          id: string
          idempotency_key: string | null
          line_items: Json
          metadata: Json | null
          order_type: string
          payment_provider: string | null
          status: string
          storekit_transaction_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          taxes_cents: number
          total_cents: number
        }
        Insert: {
          buyer_id: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          event_id?: string | null
          fees_cents?: number
          id?: string
          idempotency_key?: string | null
          line_items?: Json
          metadata?: Json | null
          order_type: string
          payment_provider?: string | null
          status?: string
          storekit_transaction_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents: number
          taxes_cents?: number
          total_cents: number
        }
        Update: {
          buyer_id?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          event_id?: string | null
          fees_cents?: number
          id?: string
          idempotency_key?: string | null
          line_items?: Json
          metadata?: Json | null
          order_type?: string
          payment_provider?: string | null
          status?: string
          storekit_transaction_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          taxes_cents?: number
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      page_email_captures: {
        Row: {
          captured_at: string | null
          email: string
          id: string
          name: string | null
          page_id: string
          user_id: string | null
        }
        Insert: {
          captured_at?: string | null
          email: string
          id?: string
          name?: string | null
          page_id: string
          user_id?: string | null
        }
        Update: {
          captured_at?: string | null
          email?: string
          id?: string
          name?: string | null
          page_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_email_captures_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "creator_pages"
            referencedColumns: ["id"]
          },
        ]
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
      platform_config: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
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
      playlist_items: {
        Row: {
          added_at: string
          id: string
          playlist_id: string
          position: number
          video_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          playlist_id: string
          position?: number
          video_id: string
        }
        Update: {
          added_at?: string
          id?: string
          playlist_id?: string
          position?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_public: boolean
          item_count: number
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_public?: boolean
          item_count?: number
          title?: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_public?: boolean
          item_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      podcast_episodes: {
        Row: {
          audio_duration: number | null
          audio_file_size: number | null
          audio_url: string
          created_at: string | null
          description: string | null
          episode_number: number | null
          episode_type: string | null
          id: string
          is_explicit: boolean | null
          is_members_only: boolean | null
          is_published: boolean | null
          play_count: number | null
          podcast_id: string
          published_at: string | null
          season_number: number | null
          show_notes: string | null
          title: string
        }
        Insert: {
          audio_duration?: number | null
          audio_file_size?: number | null
          audio_url?: string
          created_at?: string | null
          description?: string | null
          episode_number?: number | null
          episode_type?: string | null
          id?: string
          is_explicit?: boolean | null
          is_members_only?: boolean | null
          is_published?: boolean | null
          play_count?: number | null
          podcast_id: string
          published_at?: string | null
          season_number?: number | null
          show_notes?: string | null
          title?: string
        }
        Update: {
          audio_duration?: number | null
          audio_file_size?: number | null
          audio_url?: string
          created_at?: string | null
          description?: string | null
          episode_number?: number | null
          episode_type?: string | null
          id?: string
          is_explicit?: boolean | null
          is_members_only?: boolean | null
          is_published?: boolean | null
          play_count?: number | null
          podcast_id?: string
          published_at?: string | null
          season_number?: number | null
          show_notes?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_episodes_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "creator_podcasts"
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
      presave_campaigns: {
        Row: {
          apple_album_id: string | null
          campaign_url_slug: string | null
          cover_art_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          distribution_confirmed_apple: boolean
          distribution_confirmed_spotify: boolean
          id: string
          release_at: string
          spotify_track_uri: string | null
          status: string
          track_id: string
          updated_at: string
        }
        Insert: {
          apple_album_id?: string | null
          campaign_url_slug?: string | null
          cover_art_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          distribution_confirmed_apple?: boolean
          distribution_confirmed_spotify?: boolean
          id?: string
          release_at: string
          spotify_track_uri?: string | null
          status?: string
          track_id: string
          updated_at?: string
        }
        Update: {
          apple_album_id?: string | null
          campaign_url_slug?: string | null
          cover_art_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          distribution_confirmed_apple?: boolean
          distribution_confirmed_spotify?: boolean
          id?: string
          release_at?: string
          spotify_track_uri?: string | null
          status?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presave_campaigns_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      presave_subscribers: {
        Row: {
          apple_music_user_token: string | null
          campaign_id: string
          consent_follow_artist: boolean
          consent_save_track: boolean
          created_at: string
          email: string
          failure_reason: string | null
          fulfilled: boolean
          fulfilled_at: string | null
          id: string
          platform: string
          spotify_access_token: string | null
          spotify_refresh_token: string | null
          spotify_user_id: string | null
        }
        Insert: {
          apple_music_user_token?: string | null
          campaign_id: string
          consent_follow_artist?: boolean
          consent_save_track?: boolean
          created_at?: string
          email: string
          failure_reason?: string | null
          fulfilled?: boolean
          fulfilled_at?: string | null
          id?: string
          platform: string
          spotify_access_token?: string | null
          spotify_refresh_token?: string | null
          spotify_user_id?: string | null
        }
        Update: {
          apple_music_user_token?: string | null
          campaign_id?: string
          consent_follow_artist?: boolean
          consent_save_track?: boolean
          created_at?: string
          email?: string
          failure_reason?: string | null
          fulfilled?: boolean
          fulfilled_at?: string | null
          id?: string
          platform?: string
          spotify_access_token?: string | null
          spotify_refresh_token?: string | null
          spotify_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presave_subscribers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "presave_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      product_purchases: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          creator_id: string
          id: string
          product_id: string
          status: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount?: number
          buyer_id: string
          created_at?: string
          creator_id: string
          id?: string
          product_id: string
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          product_id?: string
          status?: string
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
          download_file_name: string | null
          download_url: string | null
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
          download_file_name?: string | null
          download_url?: string | null
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
          download_file_name?: string | null
          download_url?: string | null
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
          age: number | null
          auto_download_recordings: boolean | null
          avatar_url: string | null
          beta_access_granted_at: string | null
          beta_user: boolean
          bio: string | null
          business_category: string | null
          channel_category: string | null
          channel_tagline: string | null
          cover_image_url: string | null
          created_at: string
          creator_challenge: string | null
          creator_layout: string | null
          creator_level: number | null
          creator_stage: string | null
          creator_type: string | null
          creator_xp: number | null
          credits_balance: number
          day14_email_sent_at: string | null
          day3_email_sent_at: string | null
          day7_email_sent_at: string | null
          display_name: string | null
          first_name: string | null
          first_payment_email_sent_at: string | null
          first_stream_email_sent_at: string | null
          health_score: number
          heydar_active_until: string | null
          id: string
          interests: string[] | null
          is_approved: boolean
          is_producer: boolean | null
          last_active_at: string | null
          last_name: string | null
          last_reengagement_email_sent_at: string | null
          last_revenue_milestone_amount: number | null
          location_label: string | null
          location_lat: number | null
          location_lng: number | null
          location_sharing_enabled: boolean | null
          location_updated_at: string | null
          members: number
          mrr: number
          onboarding_complete: boolean
          origin_member: boolean
          paid_dm_price: number | null
          paid_dms_enabled: boolean | null
          people_photos: string[] | null
          producer_type: string | null
          referral_code: string | null
          referred_by: string | null
          referred_by_username: string | null
          role_type: string | null
          show_in_people: boolean | null
          show_online_status: boolean | null
          tier: number
          tier_name: string
          total_revenue: number
          travel_city: string | null
          traveling: boolean | null
          updated_at: string
          user_id: string
          user_type: string | null
          username: string | null
          website: string | null
          welcome_email_sent_at: string | null
        }
        Insert: {
          age?: number | null
          auto_download_recordings?: boolean | null
          avatar_url?: string | null
          beta_access_granted_at?: string | null
          beta_user?: boolean
          bio?: string | null
          business_category?: string | null
          channel_category?: string | null
          channel_tagline?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_challenge?: string | null
          creator_layout?: string | null
          creator_level?: number | null
          creator_stage?: string | null
          creator_type?: string | null
          creator_xp?: number | null
          credits_balance?: number
          day14_email_sent_at?: string | null
          day3_email_sent_at?: string | null
          day7_email_sent_at?: string | null
          display_name?: string | null
          first_name?: string | null
          first_payment_email_sent_at?: string | null
          first_stream_email_sent_at?: string | null
          health_score?: number
          heydar_active_until?: string | null
          id?: string
          interests?: string[] | null
          is_approved?: boolean
          is_producer?: boolean | null
          last_active_at?: string | null
          last_name?: string | null
          last_reengagement_email_sent_at?: string | null
          last_revenue_milestone_amount?: number | null
          location_label?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_sharing_enabled?: boolean | null
          location_updated_at?: string | null
          members?: number
          mrr?: number
          onboarding_complete?: boolean
          origin_member?: boolean
          paid_dm_price?: number | null
          paid_dms_enabled?: boolean | null
          people_photos?: string[] | null
          producer_type?: string | null
          referral_code?: string | null
          referred_by?: string | null
          referred_by_username?: string | null
          role_type?: string | null
          show_in_people?: boolean | null
          show_online_status?: boolean | null
          tier?: number
          tier_name?: string
          total_revenue?: number
          travel_city?: string | null
          traveling?: boolean | null
          updated_at?: string
          user_id: string
          user_type?: string | null
          username?: string | null
          website?: string | null
          welcome_email_sent_at?: string | null
        }
        Update: {
          age?: number | null
          auto_download_recordings?: boolean | null
          avatar_url?: string | null
          beta_access_granted_at?: string | null
          beta_user?: boolean
          bio?: string | null
          business_category?: string | null
          channel_category?: string | null
          channel_tagline?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_challenge?: string | null
          creator_layout?: string | null
          creator_level?: number | null
          creator_stage?: string | null
          creator_type?: string | null
          creator_xp?: number | null
          credits_balance?: number
          day14_email_sent_at?: string | null
          day3_email_sent_at?: string | null
          day7_email_sent_at?: string | null
          display_name?: string | null
          first_name?: string | null
          first_payment_email_sent_at?: string | null
          first_stream_email_sent_at?: string | null
          health_score?: number
          heydar_active_until?: string | null
          id?: string
          interests?: string[] | null
          is_approved?: boolean
          is_producer?: boolean | null
          last_active_at?: string | null
          last_name?: string | null
          last_reengagement_email_sent_at?: string | null
          last_revenue_milestone_amount?: number | null
          location_label?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_sharing_enabled?: boolean | null
          location_updated_at?: string | null
          members?: number
          mrr?: number
          onboarding_complete?: boolean
          origin_member?: boolean
          paid_dm_price?: number | null
          paid_dms_enabled?: boolean | null
          people_photos?: string[] | null
          producer_type?: string | null
          referral_code?: string | null
          referred_by?: string | null
          referred_by_username?: string | null
          role_type?: string | null
          show_in_people?: boolean | null
          show_online_status?: boolean | null
          tier?: number
          tier_name?: string
          total_revenue?: number
          travel_city?: string | null
          traveling?: boolean | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
          username?: string | null
          website?: string | null
          welcome_email_sent_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      radiate_broadcasts: {
        Row: {
          city: string | null
          click_count: number
          content_id: string | null
          content_type: string
          created_at: string
          expires_at: string
          id: string
          lat: number
          link_url: string | null
          lng: number
          message: string | null
          radius_km: number
          title: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          city?: string | null
          click_count?: number
          content_id?: string | null
          content_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          lat: number
          link_url?: string | null
          lng: number
          message?: string | null
          radius_km?: number
          title: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          city?: string | null
          click_count?: number
          content_id?: string | null
          content_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          lat?: number
          link_url?: string | null
          lng?: number
          message?: string | null
          radius_km?: number
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: []
      }
      radiate_impressions: {
        Row: {
          action: string
          broadcast_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          action?: string
          broadcast_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          broadcast_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radiate_impressions_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "radiate_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_station_exclusions: {
        Row: {
          created_at: string
          excluded_track_id: string
          id: string
          seed_id: string
          seed_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          excluded_track_id: string
          id?: string
          seed_id: string
          seed_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          excluded_track_id?: string
          id?: string
          seed_id?: string
          seed_type?: string
          user_id?: string
        }
        Relationships: []
      }
      recent_searches: {
        Row: {
          id: string
          query: string
          searched_at: string
          user_id: string
        }
        Insert: {
          id?: string
          query: string
          searched_at?: string
          user_id: string
        }
        Update: {
          id?: string
          query?: string
          searched_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recording_likes: {
        Row: {
          created_at: string
          id: string
          recording_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recording_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recording_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_likes_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "stream_recordings"
            referencedColumns: ["id"]
          },
        ]
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
      season_pass_events: {
        Row: {
          event_id: string
          season_pass_id: string
          tier_id: string | null
        }
        Insert: {
          event_id: string
          season_pass_id: string
          tier_id?: string | null
        }
        Update: {
          event_id?: string
          season_pass_id?: string
          tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "season_pass_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_pass_events_season_pass_id_fkey"
            columns: ["season_pass_id"]
            isOneToOne: false
            referencedRelation: "season_passes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_pass_events_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      season_passes: {
        Row: {
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          price_cents: number
          status: string | null
          title: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          price_cents: number
          status?: string | null
          title: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          price_cents?: number
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      shared_plan_members: {
        Row: {
          created_at: string
          id: string
          member_id: string
          plan_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          plan_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          plan_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_plan_members_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "shared_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_plans: {
        Row: {
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          owner_id: string
          plan_date: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          owner_id: string
          plan_date?: string
          title?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          owner_id?: string
          plan_date?: string
          title?: string
        }
        Relationships: []
      }
      short_comments: {
        Row: {
          body: string
          created_at: string
          hidden_at: string | null
          hidden_by: string | null
          id: string
          is_hidden: boolean
          like_count: number
          short_id: string
          source: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          is_hidden?: boolean
          like_count?: number
          short_id: string
          source: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          is_hidden?: boolean
          like_count?: number
          short_id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      shorts: {
        Row: {
          caption: string
          created_at: string
          creator_id: string
          creator_type_tag: string | null
          featured_product_id: string | null
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
          featured_product_id?: string | null
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
          featured_product_id?: string | null
          id?: string
          like_count?: number
          mux_asset_id?: string | null
          playback_id?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "shorts_featured_product_id_fkey"
            columns: ["featured_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shorts_featured_product_id_fkey"
            columns: ["featured_product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
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
      simulcast_test_log: {
        Row: {
          creator_id: string | null
          error_message: string | null
          id: string
          platform: string
          status: string
          tested_at: string | null
        }
        Insert: {
          creator_id?: string | null
          error_message?: string | null
          id?: string
          platform: string
          status: string
          tested_at?: string | null
        }
        Update: {
          creator_id?: string | null
          error_message?: string | null
          id?: string
          platform?: string
          status?: string
          tested_at?: string | null
        }
        Relationships: []
      }
      smart_link_campaigns: {
        Row: {
          audience: Json
          brief: Json
          created_at: string
          creative: Json
          creator_id: string
          daily_budget: number
          end_date: string | null
          id: string
          name: string
          objective: string
          platform: string
          smart_link_id: string | null
          start_date: string | null
          status: string
          targeting: Json
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          audience?: Json
          brief?: Json
          created_at?: string
          creative?: Json
          creator_id: string
          daily_budget?: number
          end_date?: string | null
          id?: string
          name: string
          objective?: string
          platform?: string
          smart_link_id?: string | null
          start_date?: string | null
          status?: string
          targeting?: Json
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          audience?: Json
          brief?: Json
          created_at?: string
          creative?: Json
          creator_id?: string
          daily_budget?: number
          end_date?: string | null
          id?: string
          name?: string
          objective?: string
          platform?: string
          smart_link_id?: string | null
          start_date?: string | null
          status?: string
          targeting?: Json
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_link_campaigns_smart_link_id_fkey"
            columns: ["smart_link_id"]
            isOneToOne: false
            referencedRelation: "smart_links"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_link_capi_events: {
        Row: {
          created_at: string
          creator_id: string
          event_id: string
          event_name: string
          id: string
          link_id: string | null
          payload: Json
          pixel_id: string
          response_body: Json | null
          response_status: number | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          event_id: string
          event_name: string
          id?: string
          link_id?: string | null
          payload?: Json
          pixel_id: string
          response_body?: Json | null
          response_status?: number | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          event_id?: string
          event_name?: string
          id?: string
          link_id?: string | null
          payload?: Json
          pixel_id?: string
          response_body?: Json | null
          response_status?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_link_capi_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "smart_links"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_link_clicks: {
        Row: {
          clicked_at: string
          country: string | null
          id: string
          ip_hash: string | null
          link_id: string
          platform: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          country?: string | null
          id?: string
          ip_hash?: string | null
          link_id: string
          platform?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          country?: string | null
          id?: string
          ip_hash?: string | null
          link_id?: string
          platform?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "smart_links"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_link_contest_entries: {
        Row: {
          entered_at: string | null
          fan_email: string
          fan_name: string | null
          id: string
          link_id: string | null
          referral_code: string
          referral_count: number | null
          referred_by: string | null
          total_points: number | null
        }
        Insert: {
          entered_at?: string | null
          fan_email: string
          fan_name?: string | null
          id?: string
          link_id?: string | null
          referral_code?: string
          referral_count?: number | null
          referred_by?: string | null
          total_points?: number | null
        }
        Update: {
          entered_at?: string | null
          fan_email?: string
          fan_name?: string | null
          id?: string
          link_id?: string | null
          referral_code?: string
          referral_count?: number | null
          referred_by?: string | null
          total_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_link_contest_entries_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "smart_links"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_link_domains: {
        Row: {
          created_at: string
          creator_id: string
          domain: string
          id: string
          verification_token: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          creator_id: string
          domain: string
          id?: string
          verification_token?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          creator_id?: string
          domain?: string
          id?: string
          verification_token?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "smart_link_domains_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "smart_link_domains_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "smart_link_domains_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "unified_referral_leaderboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      smart_link_email_captures: {
        Row: {
          captured_at: string
          email: string
          id: string
          link_id: string
          source: string | null
        }
        Insert: {
          captured_at?: string
          email: string
          id?: string
          link_id: string
          source?: string | null
        }
        Update: {
          captured_at?: string
          email?: string
          id?: string
          link_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_link_email_captures_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "smart_links"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_link_presaves: {
        Row: {
          apple_music_user_token: string | null
          converted_at: string | null
          created_at: string
          fan_email: string | null
          fan_name: string | null
          id: string
          link_id: string
          provider: string
          spotify_access_token: string | null
          spotify_album_id: string | null
          spotify_refresh_token: string | null
          spotify_token_expires_at: string | null
          spotify_track_id: string | null
          spotify_user_id: string | null
        }
        Insert: {
          apple_music_user_token?: string | null
          converted_at?: string | null
          created_at?: string
          fan_email?: string | null
          fan_name?: string | null
          id?: string
          link_id: string
          provider?: string
          spotify_access_token?: string | null
          spotify_album_id?: string | null
          spotify_refresh_token?: string | null
          spotify_token_expires_at?: string | null
          spotify_track_id?: string | null
          spotify_user_id?: string | null
        }
        Update: {
          apple_music_user_token?: string | null
          converted_at?: string | null
          created_at?: string
          fan_email?: string | null
          fan_name?: string | null
          id?: string
          link_id?: string
          provider?: string
          spotify_access_token?: string | null
          spotify_album_id?: string | null
          spotify_refresh_token?: string | null
          spotify_token_expires_at?: string | null
          spotify_track_id?: string | null
          spotify_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_link_presaves_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "smart_links"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_link_unlocks: {
        Row: {
          fan_email: string | null
          id: string
          link_id: string | null
          spotify_user_id: string | null
          unlock_type: string
          unlocked_at: string | null
        }
        Insert: {
          fan_email?: string | null
          id?: string
          link_id?: string | null
          spotify_user_id?: string | null
          unlock_type: string
          unlocked_at?: string | null
        }
        Update: {
          fan_email?: string | null
          id?: string
          link_id?: string | null
          spotify_user_id?: string | null
          unlock_type?: string
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_link_unlocks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "smart_links"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_links: {
        Row: {
          amazon_affiliate_tag: string | null
          artist: string | null
          capture_email: boolean
          click_count: number
          contest_enabled: boolean | null
          contest_end_date: string | null
          contest_prize: string | null
          contest_winner_count: number | null
          cover_image_url: string | null
          created_at: string
          creator_id: string
          custom_domain: string | null
          custom_domain_verification_token: string | null
          custom_domain_verified: boolean
          description: string | null
          fallback_url: string | null
          id: string
          is_presave: boolean
          itunes_affiliate_token: string | null
          link_type: string
          platforms: Json
          presave_converted: boolean
          release_date: string | null
          slug: string
          spotify_uri: string | null
          theme: Json
          tiktok_sound_url: string | null
          title: string
          unlock_reward_label: string | null
          unlock_reward_type: string | null
          unlock_reward_url: string | null
          unlock_spotify_artist_id: string | null
          unlock_type: string | null
          updated_at: string
        }
        Insert: {
          amazon_affiliate_tag?: string | null
          artist?: string | null
          capture_email?: boolean
          click_count?: number
          contest_enabled?: boolean | null
          contest_end_date?: string | null
          contest_prize?: string | null
          contest_winner_count?: number | null
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          custom_domain?: string | null
          custom_domain_verification_token?: string | null
          custom_domain_verified?: boolean
          description?: string | null
          fallback_url?: string | null
          id?: string
          is_presave?: boolean
          itunes_affiliate_token?: string | null
          link_type?: string
          platforms?: Json
          presave_converted?: boolean
          release_date?: string | null
          slug: string
          spotify_uri?: string | null
          theme?: Json
          tiktok_sound_url?: string | null
          title: string
          unlock_reward_label?: string | null
          unlock_reward_type?: string | null
          unlock_reward_url?: string | null
          unlock_spotify_artist_id?: string | null
          unlock_type?: string | null
          updated_at?: string
        }
        Update: {
          amazon_affiliate_tag?: string | null
          artist?: string | null
          capture_email?: boolean
          click_count?: number
          contest_enabled?: boolean | null
          contest_end_date?: string | null
          contest_prize?: string | null
          contest_winner_count?: number | null
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          custom_domain?: string | null
          custom_domain_verification_token?: string | null
          custom_domain_verified?: boolean
          description?: string | null
          fallback_url?: string | null
          id?: string
          is_presave?: boolean
          itunes_affiliate_token?: string | null
          link_type?: string
          platforms?: Json
          presave_converted?: boolean
          release_date?: string | null
          slug?: string
          spotify_uri?: string | null
          theme?: Json
          tiktok_sound_url?: string | null
          title?: string
          unlock_reward_label?: string | null
          unlock_reward_type?: string | null
          unlock_reward_url?: string | null
          unlock_spotify_artist_id?: string | null
          unlock_type?: string | null
          updated_at?: string
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
      social_post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_reactions: {
        Row: {
          created_at: string | null
          post_id: string
          reaction: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          post_id: string
          reaction?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          post_id?: string
          reaction?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          comment_count: number | null
          content: string | null
          created_at: string | null
          event_id: string | null
          id: string
          marketplace_category: string | null
          media_urls: string[] | null
          post_type: string | null
          price: number | null
          reaction_counts: Json | null
          user_id: string
        }
        Insert: {
          comment_count?: number | null
          content?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          marketplace_category?: string | null
          media_urls?: string[] | null
          post_type?: string | null
          price?: number | null
          reaction_counts?: Json | null
          user_id: string
        }
        Update: {
          comment_count?: number | null
          content?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          marketplace_category?: string | null
          media_urls?: string[] | null
          post_type?: string | null
          price?: number | null
          reaction_counts?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
      split_payment_participants: {
        Row: {
          id: string
          order_id: string | null
          paid: boolean
          paid_at: string | null
          split_payment_id: string
          user_id: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          paid?: boolean
          paid_at?: string | null
          split_payment_id: string
          user_id: string
        }
        Update: {
          id?: string
          order_id?: string | null
          paid?: boolean
          paid_at?: string | null
          split_payment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_payment_participants_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_payment_participants_split_payment_id_fkey"
            columns: ["split_payment_id"]
            isOneToOne: false
            referencedRelation: "split_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      split_payments: {
        Row: {
          completed_at: string | null
          created_at: string
          event_id: string
          expires_at: string
          id: string
          initiator_id: string
          participant_count: number
          per_person_cents: number
          status: string
          tier_id: string
          total_cents: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          event_id: string
          expires_at?: string
          id?: string
          initiator_id: string
          participant_count: number
          per_person_cents: number
          status?: string
          tier_id: string
          total_cents: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          event_id?: string
          expires_at?: string
          id?: string
          initiator_id?: string
          participant_count?: number
          per_person_cents?: number
          status?: string
          tier_id?: string
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "split_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_payments_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string | null
          event_id: string | null
          expires_at: string | null
          highlight_cover_url: string | null
          highlight_title: string | null
          id: string
          is_highlight: boolean
          location_label: string | null
          media_type: string | null
          media_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          event_id?: string | null
          expires_at?: string | null
          highlight_cover_url?: string | null
          highlight_title?: string | null
          id?: string
          is_highlight?: boolean
          location_label?: string | null
          media_type?: string | null
          media_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          event_id?: string | null
          expires_at?: string | null
          highlight_cover_url?: string | null
          highlight_title?: string | null
          id?: string
          is_highlight?: boolean
          location_label?: string | null
          media_type?: string | null
          media_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          story_id: string
          viewed_at: string | null
          viewer_id: string
        }
        Insert: {
          story_id: string
          viewed_at?: string | null
          viewer_id: string
        }
        Update: {
          story_id?: string
          viewed_at?: string | null
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
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
          like_count: number
          mux_asset_id: string | null
          playback_id: string | null
          share_count: number
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
          like_count?: number
          mux_asset_id?: string | null
          playback_id?: string | null
          share_count?: number
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
          like_count?: number
          mux_asset_id?: string | null
          playback_id?: string | null
          share_count?: number
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
      stream_simulcast_sessions: {
        Row: {
          created_at: string | null
          creator_id: string | null
          ended_at: string | null
          error_message: string | null
          id: string
          mux_simulcast_id: string | null
          platform: string
          retry_count: number | null
          rtmp_url: string | null
          started_at: string | null
          status: string | null
          stream_id: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          ended_at?: string | null
          error_message?: string | null
          id?: string
          mux_simulcast_id?: string | null
          platform: string
          retry_count?: number | null
          rtmp_url?: string | null
          started_at?: string | null
          status?: string | null
          stream_id?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          ended_at?: string | null
          error_message?: string | null
          id?: string
          mux_simulcast_id?: string | null
          platform?: string
          retry_count?: number | null
          rtmp_url?: string | null
          started_at?: string | null
          status?: string | null
          stream_id?: string | null
        }
        Relationships: []
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
      subscribers: {
        Row: {
          created_at: string
          creator_id: string
          email: string
          id: string
          last_click_at: string | null
          last_open_at: string | null
          last_seen_at: string | null
          lead_score: number
          lifecycle_stage: string | null
          metadata: Json | null
          name: string | null
          optimal_send_hour: number | null
          send_hour_data: Json | null
          source: string
          tags: string[] | null
          total_clicks: number
          total_opens: number
          total_purchases: number | null
          unsubscribed: boolean
          unsubscribed_at: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          email: string
          id?: string
          last_click_at?: string | null
          last_open_at?: string | null
          last_seen_at?: string | null
          lead_score?: number
          lifecycle_stage?: string | null
          metadata?: Json | null
          name?: string | null
          optimal_send_hour?: number | null
          send_hour_data?: Json | null
          source?: string
          tags?: string[] | null
          total_clicks?: number
          total_opens?: number
          total_purchases?: number | null
          unsubscribed?: boolean
          unsubscribed_at?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          email?: string
          id?: string
          last_click_at?: string | null
          last_open_at?: string | null
          last_seen_at?: string | null
          lead_score?: number
          lifecycle_stage?: string | null
          metadata?: Json | null
          name?: string | null
          optimal_send_hour?: number | null
          send_hour_data?: Json | null
          source?: string
          tags?: string[] | null
          total_clicks?: number
          total_opens?: number
          total_purchases?: number | null
          unsubscribed?: boolean
          unsubscribed_at?: string | null
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
      ticket_listings: {
        Row: {
          asking_price_cents: number
          created_at: string
          event_id: string
          id: string
          listing_type: string
          seller_id: string
          sold_at: string | null
          status: string
          ticket_id: string
        }
        Insert: {
          asking_price_cents: number
          created_at?: string
          event_id: string
          id?: string
          listing_type?: string
          seller_id: string
          sold_at?: string | null
          status?: string
          ticket_id: string
        }
        Update: {
          asking_price_cents?: number
          created_at?: string
          event_id?: string
          id?: string
          listing_type?: string
          seller_id?: string
          sold_at?: string | null
          status?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_listings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_listings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_offers: {
        Row: {
          buyer_id: string
          created_at: string
          expires_at: string
          id: string
          listing_id: string
          offer_price_cents: number
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          expires_at?: string
          id?: string
          listing_id: string
          offer_price_cents: number
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          listing_id?: string
          offer_price_cents?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "ticket_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tiers: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          event_id: string
          id: string
          is_hidden: boolean
          max_price_cents: number | null
          member_only_until: string | null
          min_price_cents: number | null
          name: string
          per_user_limit: number | null
          perks: Json | null
          price_cents: number
          pricing_mode: string | null
          quantity_reserved: number
          quantity_sold: number
          quantity_total: number
          sales_end_at: string | null
          sales_start_at: string | null
          sort_order: number | null
          squad_min_size: number | null
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          event_id: string
          id?: string
          is_hidden?: boolean
          max_price_cents?: number | null
          member_only_until?: string | null
          min_price_cents?: number | null
          name: string
          per_user_limit?: number | null
          perks?: Json | null
          price_cents: number
          pricing_mode?: string | null
          quantity_reserved?: number
          quantity_sold?: number
          quantity_total: number
          sales_end_at?: string | null
          sales_start_at?: string | null
          sort_order?: number | null
          squad_min_size?: number | null
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          event_id?: string
          id?: string
          is_hidden?: boolean
          max_price_cents?: number | null
          member_only_until?: string | null
          min_price_cents?: number | null
          name?: string
          per_user_limit?: number | null
          perks?: Json | null
          price_cents?: number
          pricing_mode?: string | null
          quantity_reserved?: number
          quantity_sold?: number
          quantity_total?: number
          sales_end_at?: string | null
          sales_start_at?: string | null
          sort_order?: number | null
          squad_min_size?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          amount_paid: number
          buyer_id: string
          checked_in: boolean | null
          checked_in_at: string | null
          created_at: string
          creator_earnings: number
          creator_id: string
          current_price_cents: number | null
          event_id: string
          id: string
          order_id: string | null
          original_purchaser_id: string | null
          owner_id: string | null
          platform_fee: number
          purchase_price_cents: number | null
          purchased_from: string | null
          qr_code_data: string | null
          qr_code_secret: string | null
          qr_code_token: string
          qr_code_url: string | null
          scanned_at: string | null
          scanned_by: string | null
          seat_label: string | null
          status: string
          stripe_payment_intent_id: string | null
          ticket_number: string | null
          tier_id: string | null
          transfer_count: number
          transferred_from: string | null
        }
        Insert: {
          amount_paid?: number
          buyer_id: string
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string
          creator_earnings?: number
          creator_id: string
          current_price_cents?: number | null
          event_id: string
          id?: string
          order_id?: string | null
          original_purchaser_id?: string | null
          owner_id?: string | null
          platform_fee?: number
          purchase_price_cents?: number | null
          purchased_from?: string | null
          qr_code_data?: string | null
          qr_code_secret?: string | null
          qr_code_token?: string
          qr_code_url?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          seat_label?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          ticket_number?: string | null
          tier_id?: string | null
          transfer_count?: number
          transferred_from?: string | null
        }
        Update: {
          amount_paid?: number
          buyer_id?: string
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string
          creator_earnings?: number
          creator_id?: string
          current_price_cents?: number | null
          event_id?: string
          id?: string
          order_id?: string | null
          original_purchaser_id?: string | null
          owner_id?: string | null
          platform_fee?: number
          purchase_price_cents?: number | null
          purchased_from?: string | null
          qr_code_data?: string | null
          qr_code_secret?: string | null
          qr_code_token?: string
          qr_code_url?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          seat_label?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          ticket_number?: string | null
          tier_id?: string | null
          transfer_count?: number
          transferred_from?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
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
      tips: {
        Row: {
          amount_cents: number
          context_id: string | null
          context_type: string | null
          created_at: string
          from_user_id: string
          id: string
          message: string | null
          order_id: string | null
          payment_provider: string | null
          to_user_id: string
        }
        Insert: {
          amount_cents: number
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          from_user_id: string
          id?: string
          message?: string | null
          order_id?: string | null
          payment_provider?: string | null
          to_user_id: string
        }
        Update: {
          amount_cents?: number
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string | null
          order_id?: string | null
          payment_provider?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      track_co_plays: {
        Row: {
          co_play_count: number
          track_a: string
          track_b: string
          updated_at: string
        }
        Insert: {
          co_play_count?: number
          track_a: string
          track_b: string
          updated_at?: string
        }
        Update: {
          co_play_count?: number
          track_a?: string
          track_b?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_co_plays_track_a_fkey"
            columns: ["track_a"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_co_plays_track_b_fkey"
            columns: ["track_b"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "track_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      track_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          like_count: number
          parent_id: string | null
          timestamp_seconds: number | null
          track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          timestamp_seconds?: number | null
          track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          timestamp_seconds?: number | null
          track_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "track_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_comments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_distribution_exports: {
        Row: {
          artist_id: string
          created_at: string
          external_id: string | null
          id: string
          notes: string | null
          platform: string
          status: string
          track_id: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          external_id?: string | null
          id?: string
          notes?: string | null
          platform: string
          status?: string
          track_id: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          external_id?: string | null
          id?: string
          notes?: string | null
          platform?: string
          status?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_distribution_exports_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_drop_reminders: {
        Row: {
          created_at: string
          drop_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drop_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drop_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_drop_reminders_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "track_drops"
            referencedColumns: ["id"]
          },
        ]
      }
      track_drops: {
        Row: {
          created_at: string
          drop_at: string
          hype_message: string | null
          id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          drop_at: string
          hype_message?: string | null
          id?: string
          track_id: string
        }
        Update: {
          created_at?: string
          drop_at?: string
          hype_message?: string | null
          id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_drops_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_embeddings: {
        Row: {
          embedding: string | null
          generated_at: string
          model: string
          track_id: string
        }
        Insert: {
          embedding?: string | null
          generated_at?: string
          model?: string
          track_id: string
        }
        Update: {
          embedding?: string | null
          generated_at?: string
          model?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_embeddings_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_likes: {
        Row: {
          created_at: string
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_likes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_lyric_translations: {
        Row: {
          created_at: string
          id: string
          language: string
          lrc_text: string | null
          lyrics_text: string | null
          track_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language: string
          lrc_text?: string | null
          lyrics_text?: string | null
          track_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          lrc_text?: string | null
          lyrics_text?: string | null
          track_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      track_lyrics: {
        Row: {
          created_at: string
          language: string | null
          lrc_text: string | null
          lyrics_text: string | null
          source: string | null
          track_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          language?: string | null
          lrc_text?: string | null
          lyrics_text?: string | null
          source?: string | null
          track_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          language?: string | null
          lrc_text?: string | null
          lyrics_text?: string | null
          source?: string | null
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_lyrics_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_plays: {
        Row: {
          duration_played_seconds: number
          id: string
          played_at: string
          track_id: string
          user_id: string | null
        }
        Insert: {
          duration_played_seconds?: number
          id?: string
          played_at?: string
          track_id: string
          user_id?: string | null
        }
        Update: {
          duration_played_seconds?: number
          id?: string
          played_at?: string
          track_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "track_plays_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_presaves: {
        Row: {
          created_at: string
          id: string
          notify_on_release: boolean
          release_date: string | null
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_on_release?: boolean
          release_date?: string | null
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_on_release?: boolean
          release_date?: string | null
          track_id?: string
          user_id?: string
        }
        Relationships: []
      }
      track_purchases: {
        Row: {
          amount_cents: number
          buyer_id: string
          created_at: string
          creator_id: string
          currency: string
          id: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          track_id: string
        }
        Insert: {
          amount_cents: number
          buyer_id: string
          created_at?: string
          creator_id: string
          currency?: string
          id?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          track_id: string
        }
        Update: {
          amount_cents?: number
          buyer_id?: string
          created_at?: string
          creator_id?: string
          currency?: string
          id?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          track_id?: string
        }
        Relationships: []
      }
      track_reposts: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          track_id: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          track_id: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_reposts_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_royalty_splits: {
        Row: {
          collaborator_id: string
          created_at: string
          id: string
          percent: number
          role: string
          track_id: string
        }
        Insert: {
          collaborator_id: string
          created_at?: string
          id?: string
          percent: number
          role?: string
          track_id: string
        }
        Update: {
          collaborator_id?: string
          created_at?: string
          id?: string
          percent?: number
          role?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_royalty_splits_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_universal_links: {
        Row: {
          created_at: string
          id: string
          platform: string
          track_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          track_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          track_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_universal_links_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          allow_download: boolean
          audio_mux_asset_id: string | null
          audio_mux_playback_id: string | null
          audio_status: string
          audio_upload_id: string | null
          bpm: number | null
          buy_url: string | null
          category: string
          comment_count: number
          copyright_notice: string | null
          cover_art_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          download_count: number
          duration_seconds: number | null
          embed_enabled: boolean
          genre: string | null
          has_lossless: boolean
          has_spatial: boolean
          hires_url: string | null
          id: string
          is_explicit: boolean
          is_paid: boolean
          is_published: boolean
          isrc: string | null
          iswc: string | null
          key_signature: string | null
          label: string | null
          like_count: number
          monetization_type: string
          play_count: number
          price_cents: number
          release_date: string | null
          repost_count: number
          search_vector: unknown
          spatial_url: string | null
          tags: string[]
          title: string
          updated_at: string
          waveform_peaks: Json | null
        }
        Insert: {
          allow_download?: boolean
          audio_mux_asset_id?: string | null
          audio_mux_playback_id?: string | null
          audio_status?: string
          audio_upload_id?: string | null
          bpm?: number | null
          buy_url?: string | null
          category?: string
          comment_count?: number
          copyright_notice?: string | null
          cover_art_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          download_count?: number
          duration_seconds?: number | null
          embed_enabled?: boolean
          genre?: string | null
          has_lossless?: boolean
          has_spatial?: boolean
          hires_url?: string | null
          id?: string
          is_explicit?: boolean
          is_paid?: boolean
          is_published?: boolean
          isrc?: string | null
          iswc?: string | null
          key_signature?: string | null
          label?: string | null
          like_count?: number
          monetization_type?: string
          play_count?: number
          price_cents?: number
          release_date?: string | null
          repost_count?: number
          search_vector?: unknown
          spatial_url?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          waveform_peaks?: Json | null
        }
        Update: {
          allow_download?: boolean
          audio_mux_asset_id?: string | null
          audio_mux_playback_id?: string | null
          audio_status?: string
          audio_upload_id?: string | null
          bpm?: number | null
          buy_url?: string | null
          category?: string
          comment_count?: number
          copyright_notice?: string | null
          cover_art_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          download_count?: number
          duration_seconds?: number | null
          embed_enabled?: boolean
          genre?: string | null
          has_lossless?: boolean
          has_spatial?: boolean
          hires_url?: string | null
          id?: string
          is_explicit?: boolean
          is_paid?: boolean
          is_published?: boolean
          isrc?: string | null
          iswc?: string | null
          key_signature?: string | null
          label?: string | null
          like_count?: number
          monetization_type?: string
          play_count?: number
          price_cents?: number
          release_date?: string | null
          repost_count?: number
          search_vector?: unknown
          spatial_url?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          waveform_peaks?: Json | null
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
      trending_searches: {
        Row: {
          id: string
          last_searched_at: string
          search_count: number
          term: string
        }
        Insert: {
          id?: string
          last_searched_at?: string
          search_count?: number
          term: string
        }
        Update: {
          id?: string
          last_searched_at?: string
          search_count?: number
          term?: string
        }
        Relationships: []
      }
      tv_product_features: {
        Row: {
          amount_cents: number | null
          checkout_token: string
          creator_id: string
          dismissed_at: string | null
          expires_at: string
          featured_at: string
          id: string
          product_id: string
          purchased_at: string | null
          purchaser_user_id: string | null
          qr_scanned_at: string | null
          stream_id: string
        }
        Insert: {
          amount_cents?: number | null
          checkout_token: string
          creator_id: string
          dismissed_at?: string | null
          expires_at?: string
          featured_at?: string
          id?: string
          product_id: string
          purchased_at?: string | null
          purchaser_user_id?: string | null
          qr_scanned_at?: string | null
          stream_id: string
        }
        Update: {
          amount_cents?: number | null
          checkout_token?: string
          creator_id?: string
          dismissed_at?: string | null
          expires_at?: string
          featured_at?: string
          id?: string
          product_id?: string
          purchased_at?: string | null
          purchaser_user_id?: string | null
          qr_scanned_at?: string | null
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_product_features_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_product_features_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_product_features_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_product_features_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "mux_live_streams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_name: string
          file_size_bytes: number | null
          id: string
          mux_asset_id: string | null
          mux_upload_id: string | null
          progress_percent: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          mux_asset_id?: string | null
          mux_upload_id?: string | null
          progress_percent?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          mux_asset_id?: string | null
          mux_upload_id?: string | null
          progress_percent?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      uply_channels: {
        Row: {
          category: string
          created_at: string | null
          creator_count: number | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          position: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          creator_count?: number | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          position?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          creator_count?: number | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          position?: number | null
        }
        Relationships: []
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
      user_milestones: {
        Row: {
          emoji: string
          group_type: string
          id: string
          label: string
          milestone_key: string
          reached_at: string
          user_id: string
        }
        Insert: {
          emoji?: string
          group_type?: string
          id?: string
          label: string
          milestone_key: string
          reached_at?: string
          user_id: string
        }
        Update: {
          emoji?: string
          group_type?: string
          id?: string
          label?: string
          milestone_key?: string
          reached_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_taste_profiles: {
        Row: {
          avg_bpm: number | null
          bpm_max: number | null
          bpm_min: number | null
          refreshed_at: string
          top_artist_ids: string[]
          top_genres: string[]
          user_id: string
        }
        Insert: {
          avg_bpm?: number | null
          bpm_max?: number | null
          bpm_min?: number | null
          refreshed_at?: string
          top_artist_ids?: string[]
          top_genres?: string[]
          user_id: string
        }
        Update: {
          avg_bpm?: number | null
          bpm_max?: number | null
          bpm_min?: number | null
          refreshed_at?: string
          top_artist_ids?: string[]
          top_genres?: string[]
          user_id?: string
        }
        Relationships: []
      }
      video_chapters: {
        Row: {
          created_at: string
          id: string
          position: number
          start_seconds: number
          title: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          start_seconds: number
          title: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          start_seconds?: number
          title?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_chapters_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "video_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      video_comments: {
        Row: {
          body: string
          created_at: string | null
          id: string
          like_count: number | null
          parent_id: string | null
          reply_count: number
          user_id: string
          video_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          like_count?: number | null
          parent_id?: string | null
          reply_count?: number
          user_id: string
          video_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          like_count?: number | null
          parent_id?: string | null
          reply_count?: number
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "video_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_discovery_scores: {
        Row: {
          category: string | null
          comments: number
          completion_rate: number
          content_id: string
          content_type: string
          created_at: string
          creator_id: string
          feed_clicks: number
          id: string
          impressions: number
          is_live: boolean
          is_new_creator_boosted: boolean
          is_verified_creator: boolean
          last_burst_at: string | null
          last_calculated_at: string
          last_score_at: string
          likes: number
          momentum_score: number
          prev_score_snapshot: number
          prev_shares_snapshot: number
          quality_score: number
          saves: number
          score: number
          score_30min_ago: number
          shares: number
          thumbnail_url: string | null
          title: string | null
          trending_notified_at: string | null
          views: number
          viral_notified_at: string | null
          watch_time_avg_pct: number
        }
        Insert: {
          category?: string | null
          comments?: number
          completion_rate?: number
          content_id: string
          content_type: string
          created_at?: string
          creator_id: string
          feed_clicks?: number
          id?: string
          impressions?: number
          is_live?: boolean
          is_new_creator_boosted?: boolean
          is_verified_creator?: boolean
          last_burst_at?: string | null
          last_calculated_at?: string
          last_score_at?: string
          likes?: number
          momentum_score?: number
          prev_score_snapshot?: number
          prev_shares_snapshot?: number
          quality_score?: number
          saves?: number
          score?: number
          score_30min_ago?: number
          shares?: number
          thumbnail_url?: string | null
          title?: string | null
          trending_notified_at?: string | null
          views?: number
          viral_notified_at?: string | null
          watch_time_avg_pct?: number
        }
        Update: {
          category?: string | null
          comments?: number
          completion_rate?: number
          content_id?: string
          content_type?: string
          created_at?: string
          creator_id?: string
          feed_clicks?: number
          id?: string
          impressions?: number
          is_live?: boolean
          is_new_creator_boosted?: boolean
          is_verified_creator?: boolean
          last_burst_at?: string | null
          last_calculated_at?: string
          last_score_at?: string
          likes?: number
          momentum_score?: number
          prev_score_snapshot?: number
          prev_shares_snapshot?: number
          quality_score?: number
          saves?: number
          score?: number
          score_30min_ago?: number
          shares?: number
          thumbnail_url?: string | null
          title?: string | null
          trending_notified_at?: string | null
          views?: number
          viral_notified_at?: string | null
          watch_time_avg_pct?: number
        }
        Relationships: []
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
          featured_product_id: string | null
          featured_product_price: number | null
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
          featured_product_id?: string | null
          featured_product_price?: number | null
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
          featured_product_id?: string | null
          featured_product_price?: number | null
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
        Relationships: [
          {
            foreignKeyName: "videos_featured_product_id_fkey"
            columns: ["featured_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_featured_product_id_fkey"
            columns: ["featured_product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      viewer_category_affinity: {
        Row: {
          category: string
          id: string
          last_watched_at: string
          viewer_id: string
          watch_count: number
        }
        Insert: {
          category: string
          id?: string
          last_watched_at?: string
          viewer_id: string
          watch_count?: number
        }
        Update: {
          category?: string
          id?: string
          last_watched_at?: string
          viewer_id?: string
          watch_count?: number
        }
        Relationships: []
      }
      viewer_session_seen: {
        Row: {
          content_id: string
          content_type: string
          id: string
          seen_at: string
          session_id: string
          viewer_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          id?: string
          seen_at?: string
          session_id: string
          viewer_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          id?: string
          seen_at?: string
          session_id?: string
          viewer_id?: string
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
      vouches: {
        Row: {
          created_at: string
          event_id: string
          id: string
          voucher_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          voucher_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          business_category: string | null
          content_type: string | null
          created_at: string
          creator_type: string | null
          early_access: boolean
          early_access_email_sent_at: string | null
          email: string
          first_use_case: string | null
          follower_count: string | null
          full_name: string
          hear_about: string | null
          id: string
          invite_code: string | null
          is_monetizing: string | null
          last_position_email_sent_at: string | null
          last_rank_email_sent_at: string | null
          leaderboard_rank: number | null
          milestone_10_email_sent_at: string | null
          milestone_25_email_sent_at: string | null
          milestone_3_email_sent_at: string | null
          monetization_challenges: string[] | null
          monetization_goal: string | null
          monthly_earnings: string | null
          one_sentence: string | null
          position: number | null
          previous_leaderboard_rank: number | null
          primary_platform: string | null
          prize_tier: string | null
          referral_code: string | null
          referral_count: number
          referred_by: string | null
          referrer_avatar_url: string | null
          referrer_display_name: string | null
          referrer_notification_email_sent_count: number | null
          referrer_username: string | null
          social_handle: string | null
          user_id: string | null
          welcome_email_sent_at: string | null
        }
        Insert: {
          business_category?: string | null
          content_type?: string | null
          created_at?: string
          creator_type?: string | null
          early_access?: boolean
          early_access_email_sent_at?: string | null
          email: string
          first_use_case?: string | null
          follower_count?: string | null
          full_name: string
          hear_about?: string | null
          id?: string
          invite_code?: string | null
          is_monetizing?: string | null
          last_position_email_sent_at?: string | null
          last_rank_email_sent_at?: string | null
          leaderboard_rank?: number | null
          milestone_10_email_sent_at?: string | null
          milestone_25_email_sent_at?: string | null
          milestone_3_email_sent_at?: string | null
          monetization_challenges?: string[] | null
          monetization_goal?: string | null
          monthly_earnings?: string | null
          one_sentence?: string | null
          position?: number | null
          previous_leaderboard_rank?: number | null
          primary_platform?: string | null
          prize_tier?: string | null
          referral_code?: string | null
          referral_count?: number
          referred_by?: string | null
          referrer_avatar_url?: string | null
          referrer_display_name?: string | null
          referrer_notification_email_sent_count?: number | null
          referrer_username?: string | null
          social_handle?: string | null
          user_id?: string | null
          welcome_email_sent_at?: string | null
        }
        Update: {
          business_category?: string | null
          content_type?: string | null
          created_at?: string
          creator_type?: string | null
          early_access?: boolean
          early_access_email_sent_at?: string | null
          email?: string
          first_use_case?: string | null
          follower_count?: string | null
          full_name?: string
          hear_about?: string | null
          id?: string
          invite_code?: string | null
          is_monetizing?: string | null
          last_position_email_sent_at?: string | null
          last_rank_email_sent_at?: string | null
          leaderboard_rank?: number | null
          milestone_10_email_sent_at?: string | null
          milestone_25_email_sent_at?: string | null
          milestone_3_email_sent_at?: string | null
          monetization_challenges?: string[] | null
          monetization_goal?: string | null
          monthly_earnings?: string | null
          one_sentence?: string | null
          position?: number | null
          previous_leaderboard_rank?: number | null
          primary_platform?: string | null
          prize_tier?: string | null
          referral_code?: string | null
          referral_count?: number
          referred_by?: string | null
          referrer_avatar_url?: string | null
          referrer_display_name?: string | null
          referrer_notification_email_sent_count?: number | null
          referrer_username?: string | null
          social_handle?: string | null
          user_id?: string | null
          welcome_email_sent_at?: string | null
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
      watch_time_events: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          duration_seconds: number
          id: string
          is_final: boolean
          session_id: string | null
          viewer_id: string | null
          watch_pct: number
          watched_seconds: number
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          duration_seconds?: number
          id?: string
          is_final?: boolean
          session_id?: string | null
          viewer_id?: string | null
          watch_pct?: number
          watched_seconds?: number
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          is_final?: boolean
          session_id?: string | null
          viewer_id?: string | null
          watch_pct?: number
          watched_seconds?: number
        }
        Relationships: []
      }
      webhook_errors: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          raw_payload: Json | null
          stripe_event_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          raw_payload?: Json | null
          stripe_event_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          raw_payload?: Json | null
          stripe_event_id?: string | null
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
      email_ab_test_results: {
        Row: {
          delivered: number | null
          delivery_rate: number | null
          emails_sent: number | null
          template_name: string | null
          variant: string | null
        }
        Relationships: []
      }
      music_show_tip_leaderboard: {
        Row: {
          fan_id: string | null
          last_tip_at: string | null
          rank: number | null
          show_id: string | null
          tip_count: number | null
          total_cents: number | null
        }
        Relationships: []
      }
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
          creator_layout: string | null
          creator_stage: string | null
          creator_type: string | null
          display_name: string | null
          id: string | null
          location_label: string | null
          members: number | null
          tier: number | null
          tier_name: string | null
          travel_city: string | null
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
          creator_layout?: string | null
          creator_stage?: string | null
          creator_type?: string | null
          display_name?: string | null
          id?: string | null
          location_label?: string | null
          members?: number | null
          tier?: number | null
          tier_name?: string | null
          travel_city?: string | null
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
          creator_layout?: string | null
          creator_stage?: string | null
          creator_type?: string | null
          display_name?: string | null
          id?: string | null
          location_label?: string | null
          members?: number | null
          tier?: number | null
          tier_name?: string | null
          travel_city?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      unified_referral_leaderboard: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          is_approved: boolean | null
          origin_member: boolean | null
          role_type: string | null
          total_referrals: number | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          is_approved?: boolean | null
          origin_member?: boolean | null
          role_type?: string | null
          total_referrals?: never
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          is_approved?: boolean | null
          origin_member?: boolean | null
          role_type?: string | null
          total_referrals?: never
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_playlist_invite: { Args: { _token: string }; Returns: string }
      add_fan_points: {
        Args: {
          _artist_id: string
          _fan_id: string
          _points: number
          _ref_id?: string
          _source: string
          _tip_cents?: number
        }
        Returns: undefined
      }
      aria_command_count_last_hour: {
        Args: { _creator: string }
        Returns: number
      }
      bump_trending_search: { Args: { p_term: string }; Returns: undefined }
      bump_viewer_affinity: {
        Args: { p_category: string; p_viewer: string }
        Returns: undefined
      }
      calculate_waitlist_leaderboard_rank: { Args: never; Returns: undefined }
      cast_challenge_vote: {
        Args: { _entry_id: string; _weight?: number }
        Returns: {
          challenge_id: string
          created_at: string
          entry_id: string
          id: string
          user_id: string
          weight: number
        }
        SetofOptions: {
          from: "*"
          to: "music_challenge_votes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      challenge_leaderboard: {
        Args: { _challenge_id: string; _limit?: number }
        Returns: {
          artwork_url: string
          entry_id: string
          rank: number
          score: number
          title: string
          user_id: string
          vote_count: number
        }[]
      }
      check_auth_rate_limit: {
        Args: {
          p_action_type?: string
          p_block_seconds?: number
          p_identifier: string
          p_max_attempts?: number
          p_window_seconds?: number
        }
        Returns: Json
      }
      check_in_ticket_secure: {
        Args: { p_qr_secret: string; p_scanner: string }
        Returns: Json
      }
      check_rank_movements_and_email: { Args: never; Returns: undefined }
      check_simulcast_key_rotation: { Args: never; Returns: undefined }
      claim_music_drop_edition: {
        Args: { _drop_id: string }
        Returns: {
          amount_cents: number
          claimed_at: string
          collector_id: string
          currency: string
          drop_id: string
          edition_number: number
          id: string
        }
        SetofOptions: {
          from: "*"
          to: "music_drop_editions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_ticket_inventory: {
        Args: { p_quantity: number; p_tier_id: string }
        Returns: undefined
      }
      creator_content_count: { Args: { p_creator_id: string }; Returns: number }
      decrement_merch_variant_stock: {
        Args: { _qty?: number; _variant_id: string }
        Returns: number
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      dispatch_batched_admin_notifications: { Args: never; Returns: undefined }
      distribute_royalty_event: {
        Args: { _event_id: string }
        Returns: {
          amount_cents: number
          created_at: string
          event_id: string
          holder_id: string
          id: string
          paid_at: string | null
          payee_user_id: string | null
          status: string
          stripe_transfer_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "music_royalty_payouts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_slug: { Args: { input_text: string }; Returns: string }
      get_artist_listener_stats: {
        Args: { _artist_id: string; _days?: number }
        Returns: Json
      }
      get_creator_music_revenue: {
        Args: { _artist_id: string; _days?: number }
        Returns: {
          day: string
          sales_revenue: number
          tips_revenue: number
          total_revenue: number
        }[]
      }
      get_friend_music_activity: {
        Args: { _limit?: number; _viewer: string }
        Returns: {
          activity_type: string
          actor_avatar_url: string
          actor_display_name: string
          actor_id: string
          actor_username: string
          occurred_at: string
          track_audio_status: string
          track_cover_art_url: string
          track_creator_id: string
          track_duration_seconds: number
          track_genre: string
          track_id: string
          track_mux_playback_id: string
          track_title: string
        }[]
      }
      get_music_blend: {
        Args: { _limit?: number; _user_a: string; _user_b: string }
        Returns: {
          score: number
          source: string
          track_id: string
        }[]
      }
      get_personalized_fan_radio: {
        Args: { _limit?: number; _station_id: string }
        Returns: {
          affinity: number
          artist: string
          artwork_url: string
          audio_url: string
          duration_seconds: number
          id: string
          station_id: string
          title: string
          track_position: number
        }[]
      }
      get_public_profile_by_user_id: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          cover_image_url: string
          creator_layout: string
          creator_type: string
          display_name: string
          id: string
          location_label: string
          members: number
          travel_city: string
          user_id: string
          username: string
        }[]
      }
      get_public_profile_by_username: {
        Args: { _username: string }
        Returns: {
          avatar_url: string
          bio: string
          cover_image_url: string
          creator_layout: string
          creator_type: string
          display_name: string
          id: string
          location_label: string
          members: number
          travel_city: string
          user_id: string
          username: string
        }[]
      }
      get_super_fans: {
        Args: { _artist_id: string; _limit?: number }
        Returns: {
          likes: number
          plays: number
          purchases: number
          score: number
          tier: string
          user_id: string
        }[]
      }
      get_track_geo_breakdown: {
        Args: { _days?: number; _track_id: string }
        Returns: Json
      }
      get_track_listener_trends: {
        Args: { _days?: number; _track_id: string }
        Returns: {
          day: string
          plays: number
          unique_listeners: number
        }[]
      }
      has_fan_club_access: {
        Args: { _artist_id: string; _tier_id: string }
        Returns: boolean
      }
      has_purchased_track: {
        Args: { _track_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_podcast_episode_plays: {
        Args: { _episode_id: string }
        Returns: undefined
      }
      increment_product_sales: {
        Args: { p_amount?: number; p_id: string }
        Returns: undefined
      }
      increment_radiate_counter: {
        Args: { _broadcast_id: string; _kind: string }
        Returns: undefined
      }
      increment_referral_count: { Args: { p_code: string }; Returns: undefined }
      increment_subscriber_engagement: {
        Args: { p_email: string; p_field: string }
        Returns: undefined
      }
      insert_admin_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_reference_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      is_blend_member: {
        Args: { _blend_id: string; _user_id: string }
        Returns: boolean
      }
      is_collab_member: {
        Args: { _project: string; _user: string }
        Returns: boolean
      }
      is_email_suppressed: { Args: { p_email: string }; Returns: boolean }
      is_new_creator: { Args: { p_creator_id: string }; Returns: boolean }
      is_playlist_collaborator: {
        Args: { _min_role?: string; _playlist_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_referrer_by_code: { Args: { ref_code: string }; Returns: Json }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      music_creator_overview: {
        Args: { _artist_id: string; _days?: number }
        Returns: {
          day: string
          likes: number
          plays: number
          purchases: number
          revenue_cents: number
          unique_listeners: number
        }[]
      }
      music_streak_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          current_streak: number
          longest_streak: number
          user_id: string
        }[]
      }
      music_top_fans: {
        Args: { _artist_id: string; _days?: number; _limit?: number }
        Returns: {
          likes: number
          plays: number
          purchases: number
          revenue_cents: number
          score: number
          user_id: string
        }[]
      }
      music_top_tracks: {
        Args: { _artist_id: string; _days?: number; _limit?: number }
        Returns: {
          cover_art_url: string
          likes: number
          plays: number
          purchases: number
          revenue_cents: number
          title: string
          track_id: string
          unique_listeners: number
        }[]
      }
      nearby_radiates: {
        Args: { max_km?: number; user_lat: number; user_lng: number }
        Returns: {
          city: string
          content_id: string
          content_type: string
          created_at: string
          distance_km: number
          expires_at: string
          id: string
          lat: number
          link_url: string
          lng: number
          message: string
          radius_km: number
          title: string
          user_id: string
        }[]
      }
      nearby_tour_dates: {
        Args: {
          _lat: number
          _limit?: number
          _lng: number
          _radius_km?: number
        }
        Returns: {
          artist_id: string
          city: string
          country: string
          cover_url: string
          distance_km: number
          id: string
          starts_at: string
          ticket_url: string
          tour_name: string
          venue_name: string
        }[]
      }
      notify_admin: {
        Args: {
          p_amount?: number
          p_body: string
          p_dedup_key?: string
          p_link?: string
          p_metadata?: Json
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      radiate_distance_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
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
      recalculate_discovery_scores_v2: { Args: never; Returns: undefined }
      recalculate_subscriber_lead_scores: {
        Args: { p_creator_id: string }
        Returns: undefined
      }
      recalculate_subscriber_lifecycle: {
        Args: { p_creator_id: string }
        Returns: undefined
      }
      recalculate_waitlist_positions: { Args: never; Returns: undefined }
      record_listening_day: {
        Args: { _artist_id: string }
        Returns: {
          artist_id: string
          created_at: string
          current_streak: number
          fan_id: string
          id: string
          last_listen_date: string | null
          longest_streak: number
          total_days: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "music_listening_streaks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_music_listen_day: {
        Args: never
        Returns: {
          current_streak: number
          last_listened_on: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "music_listen_streaks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_music_search: { Args: { _query: string }; Returns: undefined }
      recs_because_you_listened: {
        Args: { p_limit?: number; p_seed: string }
        Returns: {
          allow_download: boolean
          audio_mux_asset_id: string | null
          audio_mux_playback_id: string | null
          audio_status: string
          audio_upload_id: string | null
          bpm: number | null
          buy_url: string | null
          category: string
          comment_count: number
          copyright_notice: string | null
          cover_art_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          download_count: number
          duration_seconds: number | null
          embed_enabled: boolean
          genre: string | null
          has_lossless: boolean
          has_spatial: boolean
          hires_url: string | null
          id: string
          is_explicit: boolean
          is_paid: boolean
          is_published: boolean
          isrc: string | null
          iswc: string | null
          key_signature: string | null
          label: string | null
          like_count: number
          monetization_type: string
          play_count: number
          price_cents: number
          release_date: string | null
          repost_count: number
          search_vector: unknown
          spatial_url: string | null
          tags: string[]
          title: string
          updated_at: string
          waveform_peaks: Json | null
        }[]
        SetofOptions: {
          from: "*"
          to: "tracks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      recs_for_you: {
        Args: { p_limit?: number; p_user: string }
        Returns: {
          allow_download: boolean
          audio_mux_asset_id: string | null
          audio_mux_playback_id: string | null
          audio_status: string
          audio_upload_id: string | null
          bpm: number | null
          buy_url: string | null
          category: string
          comment_count: number
          copyright_notice: string | null
          cover_art_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          download_count: number
          duration_seconds: number | null
          embed_enabled: boolean
          genre: string | null
          has_lossless: boolean
          has_spatial: boolean
          hires_url: string | null
          id: string
          is_explicit: boolean
          is_paid: boolean
          is_published: boolean
          isrc: string | null
          iswc: string | null
          key_signature: string | null
          label: string | null
          like_count: number
          monetization_type: string
          play_count: number
          price_cents: number
          release_date: string | null
          repost_count: number
          search_vector: unknown
          spatial_url: string | null
          tags: string[]
          title: string
          updated_at: string
          waveform_peaks: Json | null
        }[]
        SetofOptions: {
          from: "*"
          to: "tracks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      recs_new_releases: {
        Args: { p_limit?: number }
        Returns: {
          allow_download: boolean
          audio_mux_asset_id: string | null
          audio_mux_playback_id: string | null
          audio_status: string
          audio_upload_id: string | null
          bpm: number | null
          buy_url: string | null
          category: string
          comment_count: number
          copyright_notice: string | null
          cover_art_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          download_count: number
          duration_seconds: number | null
          embed_enabled: boolean
          genre: string | null
          has_lossless: boolean
          has_spatial: boolean
          hires_url: string | null
          id: string
          is_explicit: boolean
          is_paid: boolean
          is_published: boolean
          isrc: string | null
          iswc: string | null
          key_signature: string | null
          label: string | null
          like_count: number
          monetization_type: string
          play_count: number
          price_cents: number
          release_date: string | null
          repost_count: number
          search_vector: unknown
          spatial_url: string | null
          tags: string[]
          title: string
          updated_at: string
          waveform_peaks: Json | null
        }[]
        SetofOptions: {
          from: "*"
          to: "tracks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      recs_similar_by_embedding: {
        Args: { p_limit?: number; p_track: string }
        Returns: {
          allow_download: boolean
          audio_mux_asset_id: string | null
          audio_mux_playback_id: string | null
          audio_status: string
          audio_upload_id: string | null
          bpm: number | null
          buy_url: string | null
          category: string
          comment_count: number
          copyright_notice: string | null
          cover_art_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          download_count: number
          duration_seconds: number | null
          embed_enabled: boolean
          genre: string | null
          has_lossless: boolean
          has_spatial: boolean
          hires_url: string | null
          id: string
          is_explicit: boolean
          is_paid: boolean
          is_published: boolean
          isrc: string | null
          iswc: string | null
          key_signature: string | null
          label: string | null
          like_count: number
          monetization_type: string
          play_count: number
          price_cents: number
          release_date: string | null
          repost_count: number
          search_vector: unknown
          spatial_url: string | null
          tags: string[]
          title: string
          updated_at: string
          waveform_peaks: Json | null
        }[]
        SetofOptions: {
          from: "*"
          to: "tracks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      recs_trending: {
        Args: { p_limit?: number }
        Returns: {
          allow_download: boolean
          audio_mux_asset_id: string | null
          audio_mux_playback_id: string | null
          audio_status: string
          audio_upload_id: string | null
          bpm: number | null
          buy_url: string | null
          category: string
          comment_count: number
          copyright_notice: string | null
          cover_art_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          download_count: number
          duration_seconds: number | null
          embed_enabled: boolean
          genre: string | null
          has_lossless: boolean
          has_spatial: boolean
          hires_url: string | null
          id: string
          is_explicit: boolean
          is_paid: boolean
          is_published: boolean
          isrc: string | null
          iswc: string | null
          key_signature: string | null
          label: string | null
          like_count: number
          monetization_type: string
          play_count: number
          price_cents: number
          release_date: string | null
          repost_count: number
          search_vector: unknown
          spatial_url: string | null
          tags: string[]
          title: string
          updated_at: string
          waveform_peaks: Json | null
        }[]
        SetofOptions: {
          from: "*"
          to: "tracks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      release_ticket_inventory: {
        Args: { p_quantity: number; p_tier_id: string }
        Returns: undefined
      }
      reserve_event_ticket: {
        Args: { p_event_id: string; p_qty?: number }
        Returns: boolean
      }
      reserve_ticket_inventory: {
        Args: { p_quantity: number; p_tier_id: string }
        Returns: boolean
      }
      resolve_smart_playlist: {
        Args: { _limit?: number; _smart_id: string }
        Returns: {
          track_id: string
        }[]
      }
      rotate_ticket_qr: { Args: { p_ticket_id: string }; Returns: string }
      search_music: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          id: string
          image_url: string
          kind: string
          rank: number
          subtitle: string
          title: string
        }[]
      }
      send_creator_lifecycle_emails_batch: { Args: never; Returns: undefined }
      send_member_lifecycle_emails_batch: { Args: never; Returns: undefined }
      send_weekly_discovery_digest: { Args: never; Returns: undefined }
      short_comment_creator_id: {
        Args: { _short_id: string; _source: string }
        Returns: string
      }
      update_subscriber_send_hour: {
        Args: { p_email: string; p_hour: number }
        Returns: undefined
      }
      validate_invite_code: { Args: { p_code: string }; Returns: Json }
      validate_vanity_slug: { Args: { p_slug: string }; Returns: boolean }
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
