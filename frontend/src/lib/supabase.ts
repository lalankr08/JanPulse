import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = "https://ocrabtnpbkbnbgccvqjr.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jcmFidG5wYmtibmJnY2N2cWpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MjI5NjEsImV4cCI6MjEwOTA5ODk2MX0.Nx3zluikf6YuTdMW6B8ARBBFkcZOMXH0BO53lyfqxCk";

function normalizeSupabaseUrl(raw?: string): string {
  let u = (raw || '').trim().replace(/^['"]|['"]$/g, '');
  
  // Security guard: If a postgresql:// database connection URI is mistakenly passed to the browser,
  // NEVER use it directly (prevents leaking DB credentials in browser network requests)!
  if (u.includes('postgresql:') || u.includes('postgres:') || u.includes('@') || u.includes(':5432') || u.includes(':6543')) {
    console.error("[Supabase Security] Database connection string detected in NEXT_PUBLIC_SUPABASE_URL! Falling back to safe public HTTPS project endpoint.");
    const match = u.match(/postgres\.([a-z0-9_-]+)/i);
    if (match && match[1]) {
      return `https://${match[1]}.supabase.co`;
    }
    return DEFAULT_SUPABASE_URL;
  }

  if (!u || u.includes('<') || u.includes('your-project-ref')) {
    return DEFAULT_SUPABASE_URL;
  }

  if (!u.startsWith('http://') && !u.startsWith('https://')) {
    u = 'https://' + u;
  }

  try {
    const parsed = new URL(u);
    // Must be a valid HTTP(S) URL without credentials
    if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && !parsed.username && !parsed.password) {
      return u.replace(/\/+$/, '');
    }
  } catch {
    // Fallback to default
  }

  return DEFAULT_SUPABASE_URL;
}

function normalizeSupabaseKey(raw?: string): string {
  let k = (raw || '').trim().replace(/^['"]|['"]$/g, '');
  // A Supabase JWT key starts with eyJ...
  if (k.startsWith('eyJ') && k.length > 50) {
    return k;
  }
  return DEFAULT_SUPABASE_ANON_KEY;
}

const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = normalizeSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function getClient(): SupabaseClient {
  const options = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  };
  try {
    return createClient(supabaseUrl, supabaseAnonKey, options);
  } catch (err) {
    console.warn("[Supabase] Failed to initialize configured Supabase client, falling back to default:", err);
    return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, options);
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
    } catch {
      // Fallback cleanly to public anon key
    }
  }

  // Return public anon key (backend verify_jwt handles anonymous session automatically)
  return supabaseAnonKey;
}
