import { revalidateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/content";
import { DAILY_TAG } from "@/lib/daily/public";

/**
 * 手動でキャッシュを破棄する（Supabase ダッシュボードから直接データを編集した場合など）。
 *   curl -X POST "https://ha-ma.dev/api/revalidate?secret=..."            → content
 *   curl -X POST "https://ha-ma.dev/api/revalidate?secret=...&tag=daily"  → 日報（Mac mini のバッチ完了時）
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const url = new URL(request.url);
  const given = url.searchParams.get("secret");
  if (!secret || given !== secret) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const tag = url.searchParams.get("tag") === "daily" ? DAILY_TAG : CONTENT_TAG;
  revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, revalidated: tag });
}
