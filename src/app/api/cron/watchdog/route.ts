import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPipeline } from "@/lib/daily/pipeline";
import { getSettings, jstDate, type Db } from "@/lib/daily/common";
import { DAILY_TAG } from "@/lib/daily/public";

// Hobby の Cron は1日1回・±59分。6:30 JST（21:30 UTC）に設定し、Mac mini の結果がなければ縮退運転する
export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const db: Db = createAdminClient();
  const runDate = jstDate();
  const log: string[] = [];
  const logger = (m: string) => log.push(m);

  const { data: run } = await db.from("daily_runs").select("run_date, mode, stages, mailed_at").eq("run_date", runDate).maybeSingle();
  const stages = (run?.stages ?? {}) as Record<string, { finished_at?: string } | undefined>;
  const done = Boolean(run?.mailed_at) || Boolean(stages.pipeline?.finished_at);
  if (done) {
    return Response.json({ ok: true, runDate, action: "none", reason: "Mac mini の実行が完了しています", mode: run?.mode });
  }
  const settings = await getSettings(db);
  if (settings.degraded_enabled === false) {
    return Response.json({ ok: true, runDate, action: "none", reason: "縮退運転は無効です" });
  }

  const partial = run ? "Mac mini の実行が途中で止まっています。" : "Mac mini からの実行記録がありません。";
  try {
    const result = await runPipeline({
      db,
      runDate,
      mode: "degraded",
      log: logger,
      note: `${partial} Vercel から RSS・Googleニュースのみで生成しました。X・ページ監視は含まれていません。Mac mini を確認してください。`,
    });
    revalidateTag(DAILY_TAG, { expire: 0 });
    return Response.json({ ok: true, runDate, action: "degraded", result: summarize(result), log: log.slice(-40) });
  } catch (e) {
    console.error("[watchdog]", e);
    return Response.json({ ok: false, runDate, action: "degraded", error: e instanceof Error ? e.message : String(e), log: log.slice(-40) }, { status: 500 });
  }
}

function summarize(r: Record<string, unknown>) {
  const c = r.collect as { sources?: number; inserted?: number; error?: number } | undefined;
  const s = r.score as { scored?: number } | undefined;
  const d = r.digest as { picked?: number } | undefined;
  const m = r.mail as { sent?: boolean; count?: number } | undefined;
  return { collect: c && { sources: c.sources, inserted: c.inserted, error: c.error }, score: s?.scored, digest: d?.picked, mail: m };
}
