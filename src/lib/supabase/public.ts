import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * 公開ページ用の匿名クライアント。Cookie を読まないので 'use cache' 内から呼べる。
 * RLS により published=true の行しか返らない。
 */
export function createPublicClient() {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
