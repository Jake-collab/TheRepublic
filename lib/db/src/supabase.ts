import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl) return null;
  if (_supabase) return _supabase;
  const key = supabaseServiceKey || supabaseAnonKey;
  if (!key) return null;
  _supabase = createClient(supabaseUrl, key, {
    auth: { persistSession: false },
  });
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
