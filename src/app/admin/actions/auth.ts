"use server";

import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  // 許可メール以外には送信自体を行わない（存在の有無も明かさない）
  if (!email || email !== env.adminEmail) {
    return { status: "sent" };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${env.siteUrl}/admin/auth/callback`,
    },
  });
  if (error) {
    console.error("[auth] signInWithOtp failed:", error.message);
    return { status: "error", message: "ログインリンクを送信できませんでした。しばらくしてから再度お試しください。" };
  }
  return { status: "sent" };
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
