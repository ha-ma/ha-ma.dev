import { revalidateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/content";

/**
 * 手動でキャッシュを破棄する（Supabase ダッシュボードから直接データを編集した場合など）。
 *   curl -X POST "https://ha-ma.dev/api/revalidate?secret=..."
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = new URL(request.url).searchParams.get("secret");
  if (!secret || given !== secret) {
    return Response.json({ ok: false }, { status: 401 });
  }
  revalidateTag(CONTENT_TAG, { expire: 0 });
  return Response.json({ ok: true, revalidated: CONTENT_TAG });
}
