import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Activity, SiteSettings, Strength, Work } from "@/types/database";

export const CONTENT_TAG = "content";

const EMPTY_SETTINGS: SiteSettings = {
  id: 1,
  tagline: "",
  contact_email: "",
  sns_facebook: "",
  sns_x: "",
  sns_linkedin: "",
  sns_github: "",
  company_links: [],
  updated_at: "",
};

/**
 * 公開コンテンツを1回で取得してキャッシュする。
 * 管理画面の保存時に updateTag(CONTENT_TAG) で即時無効化される。
 * DB に到達できない場合（ビルド環境など）は空データで描画し、ページ自体は落とさない。
 */
export async function getPublicContent(): Promise<{
  activities: Activity[];
  strengths: Strength[];
  works: Work[];
  settings: SiteSettings;
}> {
  "use cache";
  cacheLife("max");
  cacheTag(CONTENT_TAG);

  try {
    const supabase = createPublicClient();
    const [activities, strengths, works, settings] = await Promise.all([
      supabase.from("activities").select("*").eq("published", true).order("sort_order"),
      supabase.from("strengths").select("*").eq("published", true).order("sort_order"),
      supabase.from("works").select("*").eq("published", true).order("sort_order"),
      supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    for (const r of [activities, strengths, works, settings]) {
      if (r.error) throw r.error;
    }
    return {
      activities: activities.data ?? [],
      strengths: strengths.data ?? [],
      works: works.data ?? [],
      settings: (settings.data as SiteSettings | null) ?? EMPTY_SETTINGS,
    };
  } catch (e) {
    console.error("[content] 公開コンテンツの取得に失敗しました:", e instanceof Error ? e.message : e);
    // 失敗時は短めのプロファイルにして、DB復旧後1分以内に再取得されるようにする
    // （expire が5分未満だと事前レンダリング不可と判定されビルドが失敗するため 'minutes' を使う）
    cacheLife("minutes");
    return { activities: [], strengths: [], works: [], settings: EMPTY_SETTINGS };
  }
}
