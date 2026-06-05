import { createBrowserClient } from "@supabase/ssr"

export const supabase = (() => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    // const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing required Supabase client environment variables")
    }

    return createBrowserClient(supabaseUrl, supabaseKey)
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to read Supabase client environment variables",
    )
  }
})()

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          travel_preferences: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          travel_preferences?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          travel_preferences?: any
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string | null
          context: any
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          context?: any
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          context?: any
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: "user" | "assistant"
          content: string
          metadata: any
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: "user" | "assistant"
          content: string
          metadata?: any
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: "user" | "assistant"
          content?: string
          metadata?: any
          created_at?: string
        }
      }
      itineraries: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          itinerary_data: any
          trip_dates: any | null
          preferences: any
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          itinerary_data?: any
          trip_dates?: any | null
          preferences?: any
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          itinerary_data?: any
          trip_dates?: any | null
          preferences?: any
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
