import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Browser client for client-side operations
export const createBrowserSupabaseClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Server client for server-side operations
export const createServerSupabaseClient = (supabaseUrl: string, supabaseKey: string) => {
  return createClient(supabaseUrl, supabaseKey)
}

// Database types will be generated automatically
export type Database = {
  public: {
    Tables: {
      listings: {
        Row: {
          id: string
          listing_id: string
          title: string
          kind: 'SATILIK' | 'KIRALIK' | 'GUNLUK_KIRALIK' | 'PROJE'
          property_type: string
          city: string
          region: string
          neighborhood: string
          price: number
          currency: string
          description_tr: string
          description_en: string | null
          features: string[] | null
          badges: string[] | null
          virtual_tour_url: string | null
          video_url: string | null
          latitude: number | null
          longitude: number | null
          publish_status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN'
          views: number
          favorites_count: number
          rating: number
          consultant_name: string | null
          consultant_phone: string | null
          consultant_email: string | null
          translations: any | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Tables['listings']['Row'], 'id' | 'created_at' | 'updated_at' | 'views' | 'favorites_count' | 'rating'>
        Update: Partial<Tables['listings']['Insert']>
      }
      listing_images: {
        Row: {
          id: string
          listing_id: string
          url: string
          sort_order: number
          is_primary: boolean
          created_at: string
        }
        Insert: Omit<Tables['listing_images']['Row'], 'id' | 'created_at'>
        Update: Partial<Tables['listing_images']['Insert']>
      }
      site_settings: {
        Row: {
          id: number
          site_name: string
          logo_url: string | null
          contact_phone: string | null
          contact_email: string | null
          contact_address: string | null
          social_json: any | null
          footer_about: string | null
          seo_meta_title: string | null
          seo_meta_description: string | null
          hero_title: string | null
          hero_subtitle: string | null
          default_consultant_json: any | null
          menu_json: any | null
          translations: any | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Tables['site_settings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Tables['site_settings']['Insert']>
      }
      contact_messages: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          subject: string | null
          message: string
          listing_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: Omit<Tables['contact_messages']['Row'], 'id' | 'created_at' | 'is_read'>
        Update: Partial<Tables['contact_messages']['Insert']>
      }
      blog_posts: {
        Row: {
          id: string
          slug: string
          title: string
          excerpt: string | null
          content: string
          cover_image: string | null
          author_name: string | null
          status: 'DRAFT' | 'PUBLISHED'
          translations: any | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Tables['blog_posts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Tables['blog_posts']['Insert']>
      }
      agents: {
        Row: {
          id: string
          name: string
          email: string
          password_hash: string
          phone: string | null
          photo: string | null
          title: string | null
          role: 'ADMIN' | 'AGENT'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Tables['agents']['Row'], 'id' | 'created_at' | 'updated_at' | 'is_active'>
        Update: Partial<Tables['agents']['Insert']>
      }
    }
  }
}
