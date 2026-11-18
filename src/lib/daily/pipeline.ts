import type { SourceKind } from "@/types/database";
import type { Adapter } from "@/lib/daily/types";
import { collect } from "@/lib/daily/collect";
import { score } from "@/lib/daily/score";
import { digest } from "@/lib/daily/digest";
import { sendDigestMail } from "@/lib/daily/mail";
import { jstDate, recordStage, type Db, type Logger } from "@/lib/daily/common";

export type PipelineOptions = {
  db: Db;
  runDate?: string;
  mode: "full" | "degraded";
  adapters?: Partial<Record<SourceKind, Adapter>>;
  log?: Logger;
  dryRun?: boolean;
  /** 実行する段階（省略で全て） */
  stages?: ("collect" | "score" | "digest" | "mail")[];
  note?: string;
};

/** 縮退運転で対象にする kind（ブラウザ不要・軽いもの） */
export const DEGRADED_KINDS: SourceKind[] = ["rss", "gnews", "gnews_en", "note", "yt"];

/** 収集→採点→要約→メール を順に実行する */
export async function runPipeline(opts: PipelineOptions) {
  const runDate = opts.runDate ?? jstDate();
  const log = opts.log ?? (() => {});
  const stages = new Set(opts.stages ?? ["collect", "score", "digest", "mail"]);
  const result: Record<string, unknown> = { runDate, mode: opts.mode };

  if (!opts.dryRun) {
    await opts.db.from("daily_runs").upsert({ run_date: runDate, mode: opts.mode }, { onConflict: "run_date" });
  }
  if (stages.has("collect")) {
    result.collect = await collect({
      db: opts.db,
      runDate,
      log,
      dryRun: opts.dryRun,
      adapters: opts.adapters,
      kinds: opts.mode === "degraded" ? DEGRADED_KINDS : undefined,
      maxTier: opts.mode === "degraded" ? 2 : undefined,
      concurrency: opts.mode === "degraded" ? 24 : 16,
    });
  }
  if (stages.has("score")) result.score = await score({ db: opts.db, runDate, log, dryRun: opts.dryRun });
  if (stages.has("digest")) result.digest = await digest({ db: opts.db, runDate, log, dryRun: opts.dryRun });
  if (stages.has("mail")) result.mail = await sendDigestMail({ db: opts.db, runDate, log, dryRun: opts.dryRun, degraded: opts.mode === "degraded", note: opts.note });
  if (!opts.dryRun) {
    await recordStage(opts.db, runDate, "pipeline", { finished_at: new Date().toISOString(), mode: opts.mode });
    await revalidateSite(log);
  }
  return result;
}

/** 公開面のキャッシュを更新（Vercel 上の /api/revalidate を叩く）。失敗しても処理は止めない */
export async function revalidateSite(log: Logger = () => {}) {
  const secret = process.env.REVALIDATE_SECRET;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!secret || !site) return;
  try {
    const res = await fetch(`${site}/api/revalidate?secret=${encodeURIComponent(secret)}&tag=daily`, { method: "POST" });
    log(`[revalidate] ${res.status}`);
  } catch (e) {
    log(`[revalidate] 失敗: ${e instanceof Error ? e.message : e}`);
  }
}
