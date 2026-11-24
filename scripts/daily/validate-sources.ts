// 全ソースの到達確認。結果を表で出し、sources.last_status / last_error に記録する。
import type { Source } from "@/types/database";
import { feedAdapter, resolveYouTubeFeed } from "@/lib/daily/adapters/feed";
import { pageAdapter } from "@/lib/daily/adapters/page";
import { fetchText, pool, type Db } from "@/lib/daily/common";

export async function validateSources(db: Db, opts: { only?: string; log: (m: string) => void }) {
  let q = db.from("sources").select("*").order("group_name").order("id");
  if (opts.only) q = q.eq("kind", opts.only as Source["kind"]);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const sources = (data ?? []) as Source[];
  const since = new Date(Date.now() - 14 * 24 * 3600e3); // 到達確認は2週間分で判定
  const rows: { id: string; kind: string; status: string; items: number; error: string }[] = [];

  await pool(sources, 12, async (src) => {
    let status = "skip";
    let items = 0;
    let err = "";
    try {
      if (src.kind === "x") {
        status = src.x_handle ? "x(list)" : "x(no-handle)";
      } else {
        if (src.kind === "yt" && !src.feed && src.url) {
          const feed = await resolveYouTubeFeed(src.url, fetchText);
          if (feed) {
            src.feed = feed;
            await db.from("sources").update({ feed }).eq("id", src.id);
          }
        }
        const adapter = src.kind === "page" ? pageAdapter : feedAdapter;
        const r = await adapter(src, { since, fetchText, log: () => {} });
        status = r.status;
        items = r.items.length;
        err = (r.error ?? "").replace(/\s+/g, " ");
        await db
          .from("sources")
          .update({ last_status: r.status, last_error: err ? err.slice(0, 500) : null, ...(r.feed ? { feed: r.feed } : {}) })
          .eq("id", src.id);
      }
    } catch (e) {
      status = "error";
      err = e instanceof Error ? e.message : String(e);
    }
    rows.push({ id: src.id, kind: src.kind, status, items, error: err.slice(0, 80) });
    opts.log(`${status.padEnd(8)} ${String(items).padStart(3)}  ${src.kind.padEnd(8)} ${src.id}${err ? "  " + err.slice(0, 80) : ""}`);
  });

  const counts = rows.reduce<Record<string, number>>((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {});
  opts.log(`---- 合計 ${rows.length} 件 ${JSON.stringify(counts)}`);
  const errors = rows.filter((r) => r.status === "error");
  const empties = rows.filter((r) => r.status === "empty");
  if (errors.length) {
    opts.log("---- 要差し替え候補（error: 取得できない）");
    for (const r of errors) opts.log(`${r.kind.padEnd(8)} ${r.id}  ${r.error}`);
  }
  if (empties.length) {
    opts.log("---- 参考（empty: 取得はできたが過去14日に新着なし。更新頻度の低いブログなら正常）");
    opts.log(empties.map((r) => r.id).join(", "));
  }
}
