import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { ProfilePage } from "@/components/public/ProfilePage";
import type { Activity, SiteSettings, Strength, Work } from "@/types/database";

/** 非公開項目を含めた公開ページのプレビュー（管理者のみ、キャッシュなし） */
export default async function PreviewPage() {
  const { supabase } = await requireAdmin();
  const [a, s, w, st] = await Promise.all([
    supabase.from("activities").select("*").order("sort_order"),
    supabase.from("strengths").select("*").order("sort_order"),
    supabase.from("works").select("*").order("sort_order"),
    supabase.from("site_settings").select("*").eq("id", 1).single(),
  ]);
  const banner = (
    <div className="sticky top-0 z-10 bg-orange px-4 py-2 text-center text-xs font-bold text-white">
      プレビュー（非公開の項目も表示しています）
      <Link href="/admin" className="text-white underline">
        管理画面へ戻る
      </Link>
    </div>
  );
  return (
    <ProfilePage
      previewBanner={banner}
      data={{
        activities: (a.data ?? []) as Activity[],
        strengths: (s.data ?? []) as Strength[],
        works: (w.data ?? []) as Work[],
        settings: st.data as SiteSettings,
      }}
    />
  );
}
