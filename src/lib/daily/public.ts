import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Comment, DailyItem } from "@/types/database";

export const DAILY_TAG = "daily";

export type PublicEntry = {
  item: Pick<DailyItem, "id" | "title" | "url" | "author" | "summary" | "tags" | "rank" | "published_at">;
  source: { name: string; url: string | null } | null;
  comment: Pick<Comment, "public_text" | "tags" | "published_at" | "updated_at">;
};

export type PublicDay = { date: string; entries: PublicEntry[]; updatedAt: string };
export type DayIndex = { date: string; count: number; lastUpdated: string; lead: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 公開コメントのある日の一覧（新しい順） */
export async function getDailyIndex(page = 1, perPage = 30): Promise<{ days: DayIndex[]; hasNext: boolean }> {
  "use cache";
  cacheLife("max");
  cacheTag(DAILY_TAG);
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("daily_public_dates", { p_limit: perPage + 1, p_offset: (page - 1) * perPage });
    if (error) throw error;
    const rows = data ?? [];
    const hasNext = rows.length > perPage;
    const slice = rows.slice(0, perPage);
    // 各日の最初のコメント冒頭を添える
    const dates = slice.map((r) => r.run_date);
    const leads = new Map<string, string>();
    if (dates.length) {
      const { data: cs } = await supabase
        .from("comments")
        .select("run_date, public_text, published_at")
        .in("run_date", dates)
        .not("public_text", "is", null)
        .order("published_at", { ascending: true });
      for (const c of cs ?? []) if (!leads.has(c.run_date) && c.public_text) leads.set(c.run_date, c.public_text.replace(/\s+/g, " ").slice(0, 90));
    }
    return { days: slice.map((r) => ({ date: r.run_date, count: Number(r.item_count), lastUpdated: r.last_updated, lead: leads.get(r.run_date) ?? "" })), hasNext };
  } catch (e) {
    console.error("[daily] 一覧の取得に失敗:", e instanceof Error ? e.message : e);
    cacheLife("minutes");
    return { days: [], hasNext: false };
  }
}

/** その日の公開エントリ（コメント付きの件だけ） */
export async function getDailyDay(date: string): Promise<PublicDay | null> {
  "use cache";
  cacheLife("max");
  cacheTag(DAILY_TAG);
  if (!DATE_RE.test(date)) return null;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("comments")
      .select("public_text, tags, published_at, updated_at, daily_items!inner(id, title, url, author, summary, tags, rank, published_at, sources(name, url))")
      .eq("run_date", date)
      .not("public_text", "is", null)
      .order("published_at", { ascending: true });
    if (error) throw error;
    type Row = Pick<Comment, "public_text" | "tags" | "published_at" | "updated_at"> & {
      daily_items: Pick<DailyItem, "id" | "title" | "url" | "author" | "summary" | "tags" | "rank" | "published_at"> & { sources: { name: string; url: string | null } | null };
    };
    const rows = (data ?? []) as unknown as Row[];
    if (!rows.length) return null;
    const entries: PublicEntry[] = rows.map((r) => ({
      item: {
        id: r.daily_items.id,
        title: r.daily_items.title,
        url: r.daily_items.url,
        author: r.daily_items.author,
        summary: r.daily_items.summary,
        tags: r.daily_items.tags,
        rank: r.daily_items.rank,
        published_at: r.daily_items.published_at,
      },
      source: r.daily_items.sources,
      comment: { public_text: r.public_text, tags: r.tags, published_at: r.published_at, updated_at: r.updated_at },
    }));
    const updatedAt =
      rows
        .map((r) => r.updated_at)
        .sort()
        .at(-1) ?? "";
    return { date, entries, updatedAt };
  } catch (e) {
    console.error("[daily] 日報の取得に失敗:", e instanceof Error ? e.message : e);
    cacheLife("minutes");
    return null;
  }
}

/** RSS・llms.txt・sitemap 用: 直近 N 日分をまとめて */
export async function getRecentDays(limit = 30): Promise<PublicDay[]> {
  "use cache";
  cacheLife("max");
  cacheTag(DAILY_TAG);
  const { days } = await getDailyIndex(1, limit);
  const out: PublicDay[] = [];
  for (const d of days) {
    const day = await getDailyDay(d.date);
    if (day) out.push(day);
  }
  return out;
}
