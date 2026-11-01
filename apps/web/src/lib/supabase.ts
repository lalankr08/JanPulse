import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ocrabtnpbkbnbgccvqjr.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jcmFidG5wYmtibmJnY2N2cWpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MjI5NjEsImV4cCI6MjEwOTA5ODk2MX0.Nx3zluikf6YuTdMW6B8ARBBFkcZOMXH0BO53lyfqxCk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getOrCreateSessionToken(): Promise<string> {
  // If in browser and user is signed in with email/OAuth, return their real session token
  if (typeof window !== "undefined") {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return session.access_token;
      }
    } catch (e) {
      // Fallback cleanly to public anon key
    }
  }

  // Return public anon key (backend verify_jwt handles anonymous session automatically)
  return supabaseAnonKey;
}
