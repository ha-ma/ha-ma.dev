#!/usr/bin/env tsx
/**
 * 日報バッチ CLI（Mac mini の launchd から毎朝 5:30 に実行）
 *
 *   npm run daily                      収集→採点→要約→メール（full）
 *   npm run daily -- collect --dry     収集だけ（保存しない）
 *   npm run daily -- score|digest|mail 段階を個別に実行
 *   npm run daily -- all --date 2026-11-18 --degraded
 *   npm run daily -- seed              config/sources.yaml を sources に投入
 *   npm run daily -- validate          全ソースの到達確認（表で出力）
 */
import { loadEnv } from "./env";
loadEnv();

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { runPipeline } from "@/lib/daily/pipeline";
import { getSettings, jstDate, settingNumber, settingString } from "@/lib/daily/common";
import { createXApiAdapter, DEFAULT_X_DAILY_CAP, xCredsFromEnv } from "@/lib/daily/adapters/x-api";
import { seedSources } from "./seed-sources";
import { validateSources } from "./validate-sources";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const log = (m: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${m}`);

async function main() {
  const cmd = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "all";
  const runDate = arg("date") ?? jstDate();
  const dryRun = flag("dry");

  const client = db();
  if (cmd === "seed") return seedSources(client, arg("file") ?? "config/sources.yaml", log);
  if (cmd === "validate") return validateSources(client, { only: arg("only"), log });

  // X リストの URL は設定テーブル優先
  const settings = await getSettings(client);
  const listUrl = settingString(settings, "x_list_url", process.env.X_LIST_URL ?? "");
  // X は公式 API（従量課金）で読む。リスト URL と認証情報の両方があるときだけ有効
  const creds = xCredsFromEnv();
  const xCap = settingNumber(settings, "x_daily_cap", DEFAULT_X_DAILY_CAP);
  const xEnabled = Boolean(listUrl && creds && xCap > 0);
  if (xEnabled) process.env.X_LIST_URL = listUrl;
  else {
    delete process.env.X_LIST_URL;
    log(`[x] 無効（${!listUrl ? "リスト URL 未設定" : !creds ? "X_API_KEY 等が未設定" : "上限 0"}）`);
  }
  const adapters = xEnabled && creds ? { x: createXApiAdapter({ db: client, runDate, listUrl, dailyCap: xCap, creds, dryRun }) } : {};

  const stages = cmd === "all" ? undefined : ([cmd] as ("collect" | "score" | "digest" | "mail")[]);
  if (stages && !["collect", "score", "digest", "mail"].includes(cmd)) throw new Error(`不明なコマンド: ${cmd}`);
  const t0 = Date.now();
  const result = await runPipeline({ db: client, runDate, mode: flag("degraded") ? "degraded" : "full", adapters, log, dryRun, stages });
  log(`完了 ${Math.round((Date.now() - t0) / 1000)}s ${JSON.stringify(summarize(result))}`);
}

function summarize(r: Record<string, unknown>) {
  const out: Record<string, unknown> = { runDate: r.runDate, mode: r.mode };
  const c = r.collect as { sources: number; ok: number; empty: number; error: number; inserted: number } | undefined;
  if (c) out.collect = { sources: c.sources, ok: c.ok, empty: c.empty, error: c.error, inserted: c.inserted };
  const s = r.score as { scored: number; costUsd: number } | undefined;
  if (s) out.score = { scored: s.scored, costUsd: s.costUsd };
  const d = r.digest as { picked: number; costUsd: number } | undefined;
  if (d) out.digest = { picked: d.picked, costUsd: d.costUsd };
  const m = r.mail as { sent: boolean; count: number } | undefined;
  if (m) out.mail = m;
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
