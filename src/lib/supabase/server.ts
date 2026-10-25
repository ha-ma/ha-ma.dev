import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * 管理画面用: Cookie セッションを使うサーバークライアント。
 * Server Component / Server Action / Route Handler から呼ぶ（'use cache' 内では不可）。
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component からの呼び出しでは set できない。proxy.ts がリフレッシュを担う。
        }
      },
    },
  });
}

/** ログイン済みかつ許可メールの管理者を返す。違えば null */
export async function getAdminUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  if (user.email.toLowerCase() !== env.adminEmail) return null;
  return user;
}
