import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseClient(token?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  return createClient(url, key, token ? {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  } : undefined);
}

let client: SupabaseClient | undefined;
export function supabase() {
  return client ??= createSupabaseClient();
}
