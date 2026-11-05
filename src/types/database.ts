/* Generated from the live database's schema (Supabase "generate TypeScript types", 2026-11-04, after the
   platform migrations). Regenerate after every migration rather than editing by hand. */
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          country: string | null
          device: string | null
          id: string
          lead_id: string | null
          locale: Database["public"]["Enums"]["locale"] | null
          occurred_at: string
          path: string | null
          referrer_host: string | null
          type: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          vehicle_id: string | null
          visitor_hash: string | null
        }
        Insert: {
          country?: string | null
          device?: string | null
          id?: string
          lead_id?: string | null
          locale?: Database["public"]["Enums"]["locale"] | null
          occurred_at?: string
          path?: string | null
          referrer_host?: string | null
          type: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vehicle_id?: string | null
          visitor_hash?: string | null
        }
        Update: {
          country?: string | null
          device?: string | null
          id?: string
          lead_id?: string | null
          locale?: Database["public"]["Enums"]["locale"] | null
          occurred_at?: string
          path?: string | null
          referrer_host?: string | null
          type?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vehicle_id?: string | null
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          assigned_to: string | null
          cancelled_reason: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          customer_note: string | null
          ends_at: string
          google_event_id: string | null
          id: string
          internal_note: string | null
          lead_id: string | null
          locale: Database["public"]["Enums"]["locale"]
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          cancelled_reason?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_note?: string | null
          ends_at: string
          google_event_id?: string | null
          id?: string
          internal_note?: string | null
          lead_id?: string | null
          locale?: Database["public"]["Enums"]["locale"]
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          cancelled_reason?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_note?: string | null
          ends_at?: string
          google_event_id?: string | null
          id?: string
          internal_note?: string | null
          lead_id?: string | null
          locale?: Database["public"]["Enums"]["locale"]
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          changed_fields: string[] | null
          id: string
          new_data: Json | null
          occurred_at: string
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          changed_fields?: string[] | null
          id?: string
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          changed_fields?: string[] | null
          id?: string
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: Json
          id: string
          is_published: boolean
          logo_path: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: Json
          id?: string
          is_published?: boolean
          logo_path?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: Json
          id?: string
          is_published?: boolean
          logo_path?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          closes_at: string
          id: string
          opens_at: string
          updated_at: string
          weekday: number
        }
        Insert: {
          closes_at: string
          id?: string
          opens_at: string
          updated_at?: string
          weekday: number
        }
        Update: {
          closes_at?: string
          id?: string
          opens_at?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: []
      }
      cars: {
        Row: {
          color: string | null
          created_at: string
          credit: string | null
          id: string
          images: string[]
          import_papers: string | null
          make: string
          mileage_km: number | null
          model: string
          previous_owners: number | null
          price: number | null
          sample: boolean
          service_records: string | null
          sort_order: number
          specs: Json
          status: string
          tagline: string | null
          type: string
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          credit?: string | null
          id: string
          images?: string[]
          import_papers?: string | null
          make: string
          mileage_km?: number | null
          model: string
          previous_owners?: number | null
          price?: number | null
          sample?: boolean
          service_records?: string | null
          sort_order?: number
          specs?: Json
          status?: string
          tagline?: string | null
          type: string
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          credit?: string | null
          id?: string
          images?: string[]
          import_papers?: string | null
          make?: string
          mileage_km?: number | null
          model?: string
          previous_owners?: number | null
          price?: number | null
          sample?: boolean
          service_records?: string | null
          sort_order?: number
          specs?: Json
          status?: string
          tagline?: string | null
          type?: string
          year?: number | null
        }
        Relationships: []
      }
      closures: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          reason: string | null
          starts_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          reason?: string | null
          starts_at: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "closures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          consent_at: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          marketing_consent: boolean
          phone: string | null
          preferred_contact: string | null
          preferred_locale: Database["public"]["Enums"]["locale"]
          updated_at: string
        }
        Insert: {
          consent_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          marketing_consent?: boolean
          phone?: string | null
          preferred_contact?: string | null
          preferred_locale?: Database["public"]["Enums"]["locale"]
          updated_at?: string
        }
        Update: {
          consent_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          marketing_consent?: boolean
          phone?: string | null
          preferred_contact?: string | null
          preferred_locale?: Database["public"]["Enums"]["locale"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          actor_id: string | null
          details: Json
          id: string
          lead_id: string
          occurred_at: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          actor_id?: string | null
          details?: Json
          id?: string
          lead_id: string
          occurred_at?: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          actor_id?: string | null
          details?: Json
          id?: string
          lead_id?: string
          occurred_at?: string
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          lead_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          lead_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          locale: Database["public"]["Enums"]["locale"]
          lost_reason: string | null
          message: string | null
          next_follow_up_at: string | null
          source: Database["public"]["Enums"]["lead_source"]
          source_detail: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          locale?: Database["public"]["Enums"]["locale"]
          lost_reason?: string | null
          message?: string | null
          next_follow_up_at?: string | null
          source: Database["public"]["Enums"]["lead_source"]
          source_detail?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          locale?: Database["public"]["Enums"]["locale"]
          lost_reason?: string | null
          message?: string | null
          next_follow_up_at?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          source_detail?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          attempts: number
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          last_error: string | null
          locale: Database["public"]["Enums"]["locale"]
          payload: Json
          provider_message_id: string | null
          read_at: string | null
          recipient_email: string | null
          recipient_phone: string | null
          recipient_profile_id: string | null
          related_appointment_id: string | null
          related_lead_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          template: string
        }
        Insert: {
          attempts?: number
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          last_error?: string | null
          locale?: Database["public"]["Enums"]["locale"]
          payload?: Json
          provider_message_id?: string | null
          read_at?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_profile_id?: string | null
          related_appointment_id?: string | null
          related_lead_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template: string
        }
        Update: {
          attempts?: number
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          last_error?: string | null
          locale?: Database["public"]["Enums"]["locale"]
          payload?: Json
          provider_message_id?: string | null
          read_at?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_profile_id?: string | null
          related_appointment_id?: string | null
          related_lead_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_appointment_id_fkey"
            columns: ["related_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_lead_id_fkey"
            columns: ["related_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          preferred_locale: Database["public"]["Enums"]["locale"]
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          preferred_locale?: Database["public"]["Enums"]["locale"]
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          preferred_locale?: Database["public"]["Enums"]["locale"]
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          description: string | null
          id: string
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_feature_translations: {
        Row: {
          feature_id: string
          id: string
          label: string
          locale: Database["public"]["Enums"]["locale"]
          value: string
        }
        Insert: {
          feature_id: string
          id?: string
          label: string
          locale: Database["public"]["Enums"]["locale"]
          value: string
        }
        Update: {
          feature_id?: string
          id?: string
          label?: string
          locale?: Database["public"]["Enums"]["locale"]
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_feature_translations_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "vehicle_features"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_features: {
        Row: {
          created_at: string
          group_key: string
          id: string
          sort_order: number
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          group_key?: string
          id?: string
          sort_order?: number
          vehicle_id: string
        }
        Update: {
          created_at?: string
          group_key?: string
          id?: string
          sort_order?: number
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_features_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_media: {
        Row: {
          alt: Json
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          height: number | null
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          poster_path: string | null
          sort_order: number
          storage_bucket: string | null
          storage_path: string
          vehicle_id: string
          width: number | null
        }
        Insert: {
          alt?: Json
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          height?: number | null
          id?: string
          kind: Database["public"]["Enums"]["media_kind"]
          poster_path?: string | null
          sort_order?: number
          storage_bucket?: string | null
          storage_path: string
          vehicle_id: string
          width?: number | null
        }
        Update: {
          alt?: Json
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          poster_path?: string | null
          sort_order?: number
          storage_bucket?: string | null
          storage_path?: string
          vehicle_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_media_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_publication:
            | Database["public"]["Enums"]["publication_status"]
            | null
          from_status: Database["public"]["Enums"]["vehicle_status"] | null
          id: string
          to_publication: Database["public"]["Enums"]["publication_status"]
          to_status: Database["public"]["Enums"]["vehicle_status"]
          vehicle_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_publication?:
            | Database["public"]["Enums"]["publication_status"]
            | null
          from_status?: Database["public"]["Enums"]["vehicle_status"] | null
          id?: string
          to_publication: Database["public"]["Enums"]["publication_status"]
          to_status: Database["public"]["Enums"]["vehicle_status"]
          vehicle_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_publication?:
            | Database["public"]["Enums"]["publication_status"]
            | null
          from_status?: Database["public"]["Enums"]["vehicle_status"] | null
          id?: string
          to_publication?: Database["public"]["Enums"]["publication_status"]
          to_status?: Database["public"]["Enums"]["vehicle_status"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_status_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_translations: {
        Row: {
          description: string | null
          id: string
          import_papers: string | null
          locale: Database["public"]["Enums"]["locale"]
          seo_description: string | null
          seo_title: string | null
          service_records: string | null
          tagline: string | null
          title: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          import_papers?: string | null
          locale: Database["public"]["Enums"]["locale"]
          seo_description?: string | null
          seo_title?: string | null
          service_records?: string | null
          tagline?: string | null
          title?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          description?: string | null
          id?: string
          import_papers?: string | null
          locale?: Database["public"]["Enums"]["locale"]
          seo_description?: string | null
          seo_title?: string | null
          service_records?: string | null
          tagline?: string | null
          title?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_translations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"]
          brand_id: string
          created_at: string
          created_by: string | null
          currency: string
          exterior_color: string | null
          featured_rank: number | null
          id: string
          interior_color: string | null
          is_featured: boolean
          is_sample: boolean
          legacy_id: string | null
          mileage_km: number | null
          model: string
          model_year: number | null
          photo_credit: string | null
          previous_owners: number | null
          price: number | null
          publication: Database["public"]["Enums"]["publication_status"]
          published_at: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          updated_by: string | null
          variant: string | null
          vin: string | null
        }
        Insert: {
          body_type: Database["public"]["Enums"]["body_type"]
          brand_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          exterior_color?: string | null
          featured_rank?: number | null
          id?: string
          interior_color?: string | null
          is_featured?: boolean
          is_sample?: boolean
          legacy_id?: string | null
          mileage_km?: number | null
          model: string
          model_year?: number | null
          photo_credit?: string | null
          previous_owners?: number | null
          price?: number | null
          publication?: Database["public"]["Enums"]["publication_status"]
          published_at?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          updated_by?: string | null
          variant?: string | null
          vin?: string | null
        }
        Update: {
          body_type?: Database["public"]["Enums"]["body_type"]
          brand_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          exterior_color?: string | null
          featured_rank?: number | null
          id?: string
          interior_color?: string | null
          is_featured?: boolean
          is_sample?: boolean
          legacy_id?: string | null
          mileage_km?: number | null
          model?: string
          model_year?: number | null
          photo_credit?: string | null
          previous_owners?: number | null
          price?: number | null
          publication?: Database["public"]["Enums"]["publication_status"]
          published_at?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          updated_by?: string | null
          variant?: string | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      available_slots: {
        Args: { p_from: string; p_to: string; p_vehicle_id?: string }
        Returns: {
          slot_end: string
          slot_start: string
        }[]
      }
      dashboard_overview: { Args: never; Returns: Json }
      hit_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      mark_notifications_read: { Args: { p_ids: string[] }; Returns: number }
      my_role: { Args: never; Returns: Database["public"]["Enums"]["app_role"] }
      team_members: {
        Args: never
        Returns: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          joined: boolean
          last_sign_in_at: string
          phone: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
    }
    Enums: {
      activity_type:
        | "created"
        | "status_changed"
        | "assigned"
        | "vehicle_changed"
        | "follow_up_set"
        | "note_added"
        | "call"
        | "whatsapp_message"
        | "email"
        | "meeting"
        | "appointment_requested"
        | "appointment_confirmed"
        | "appointment_rescheduled"
        | "appointment_cancelled"
        | "appointment_completed"
        | "appointment_no_show"
      app_role: "OWNER" | "MANAGER" | "SALESPERSON" | "INVENTORY_EDITOR"
      appointment_status:
        | "requested"
        | "confirmed"
        | "rescheduled"
        | "cancelled"
        | "completed"
        | "no_show"
      body_type:
        | "supercar"
        | "sports_car"
        | "suv"
        | "sedan"
        | "coupe"
        | "convertible"
        | "grand_tourer"
        | "pickup"
        | "classic"
        | "other"
      lead_source:
        | "website_form"
        | "private_viewing"
        | "whatsapp"
        | "phone"
        | "walk_in"
        | "instagram"
        | "facebook"
        | "referral"
        | "other"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "viewing_booked"
        | "negotiating"
        | "won"
        | "lost"
      locale: "en" | "fr" | "ar"
      media_kind: "image" | "video"
      notification_channel: "email" | "in_app" | "whatsapp"
      notification_status: "queued" | "sent" | "failed" | "skipped"
      publication_status: "draft" | "published" | "archived"
      vehicle_status: "available" | "reserved" | "sold"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      activity_type: [
        "created",
        "status_changed",
        "assigned",
        "vehicle_changed",
        "follow_up_set",
        "note_added",
        "call",
        "whatsapp_message",
        "email",
        "meeting",
        "appointment_requested",
        "appointment_confirmed",
        "appointment_rescheduled",
        "appointment_cancelled",
        "appointment_completed",
        "appointment_no_show",
      ],
      app_role: ["OWNER", "MANAGER", "SALESPERSON", "INVENTORY_EDITOR"],
      appointment_status: [
        "requested",
        "confirmed",
        "rescheduled",
        "cancelled",
        "completed",
        "no_show",
      ],
      body_type: [
        "supercar",
        "sports_car",
        "suv",
        "sedan",
        "coupe",
        "convertible",
        "grand_tourer",
        "pickup",
        "classic",
        "other",
      ],
      lead_source: [
        "website_form",
        "private_viewing",
        "whatsapp",
        "phone",
        "walk_in",
        "instagram",
        "facebook",
        "referral",
        "other",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "viewing_booked",
        "negotiating",
        "won",
        "lost",
      ],
      locale: ["en", "fr", "ar"],
      media_kind: ["image", "video"],
      notification_channel: ["email", "in_app", "whatsapp"],
      notification_status: ["queued", "sent", "failed", "skipped"],
      publication_status: ["draft", "published", "archived"],
      vehicle_status: ["available", "reserved", "sold"],
    },
  },
} as const
