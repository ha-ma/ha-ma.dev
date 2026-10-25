import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * service_role クライアント。RLS をバイパスするので Server Action / Route Handler 内でのみ使う。
 * 問い合わせの INSERT とレート制限にだけ使用し、管理画面のCRUDはユーザーセッション側のクライアントで行う。
 */
export function createAdminClient() {
  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
