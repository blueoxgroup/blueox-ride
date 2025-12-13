import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zwuoewhxqndmutbfyzka.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dW9ld2h4cW5kbXV0YmZ5emthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MzY0NDMsImV4cCI6MjA4MTIxMjQ0M30.zTeAXZNfgcYRQevkj6W0vSGqcVkLuFHZ5aePh_bFfT0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Helper to get the current user's ID
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// Helper to check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}
