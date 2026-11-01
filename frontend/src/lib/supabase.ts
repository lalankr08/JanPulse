import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = "https://ocrabtnpbkbnbgccvqjr.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jcmFidG5wYmtibmJnY2N2cWpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MjI5NjEsImV4cCI6MjEwOTA5ODk2MX0.Nx3zluikf6YuTdMW6B8ARBBFkcZOMXH0BO53lyfqxCk";

function normalizeSupabaseUrl(raw?: string): string {
  let u = (raw || '').trim().replace(/^['"]|['"]$/g, '');
  if (!u || u.includes('<') || u.includes('your-project-ref')) {
    return DEFAULT_SUPABASE_URL;
  }
  if (!u.startsWith('http://') && !u.startsWith('https://')) {
    u = 'https://' + u;
  }
  try {
    const parsed = new URL(u);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return u;
    }
  } catch (e) {
    // Fallback to default
  }
  return DEFAULT_SUPABASE_URL;
}

function normalizeSupabaseKey(raw?: string): string {
  let k = (raw || '').trim().replace(/^['"]|['"]$/g, '');
  if (!k || k.includes('<') || k.length < 20) {
    return DEFAULT_SUPABASE_ANON_KEY;
  }
  return k;
}

const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = normalizeSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function getClient(): SupabaseClient {
  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn("[Supabase] Failed to initialize configured Supabase client, falling back to default:", err);
    return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);
  }
}

export const supabase: SupabaseClient = getClient();

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
