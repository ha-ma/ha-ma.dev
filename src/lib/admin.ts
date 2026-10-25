import { redirect } from "next/navigation";
import { createServerSupabase, getAdminUser } from "@/lib/supabase/server";

/** 管理者セッションを要求する。未認証ならログインへ。Supabase クライアントも返す */
export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const supabase = await createServerSupabase();
  return { user, supabase };
}

export type ContentTable = "activities" | "strengths" | "works";

export const TABLE_LABEL: Record<ContentTable, string> = {
  activities: "現在の活動",
  strengths: "得意なこと",
  works: "案件",
};
