import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _runtimeUrl: string | null = null;
let _runtimeKey: string | null = null;
let _supabase: SupabaseClient | null = null;

export function setSupabaseCredentials(url: string, key: string): void {
  if (_runtimeUrl !== url || _runtimeKey !== key) {
    _runtimeUrl = url;
    _runtimeKey = key;
    _supabase = null;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  const url = _runtimeUrl || process.env.SUPABASE_URL || "";
  const key = _runtimeKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  if (_supabase) return _supabase;
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error(
        `Supabase client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).`,
      );
    }
    return (client as any)[prop];
  },
});
