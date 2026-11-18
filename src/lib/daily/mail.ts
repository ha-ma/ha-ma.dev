import { Resend } from "resend";
import type { DailyItem } from "@/types/database";
import { getSettings, jstLabel, recordStage, settingString, type Db, type Logger } from "@/lib/daily/common";

export type MailOptions = { db: Db; runDate: string; log?: Logger; dryRun?: boolean; degraded?: boolean; note?: string };

type Row = Pick<DailyItem, "id" | "title" | "url" | "summary" | "angle" | "tags" | "rank"> & { sources: { name: string } | null };

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 朝のメール「今日の10件」を送る */
export async function sendDigestMail(opts: MailOptions): Promise<{ sent: boolean; to: string[]; count: number }> {
  const log = opts.log ?? (() => {});
  const { db, runDate } = opts;
  const settings = await getSettings(db);
  const to = settingString(settings, "mail_to", process.env.DAILY_MAIL_TO ?? "yuta.hamaya@amptech.co.jp")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ha-ma.dev";
  const from = `ha-ma.dev 日報 <${process.env.MAIL_FROM ?? "noreply@ha-ma.dev"}>`;

  const { data, error } = await db.from("daily_items").select("id, title, url, summary, angle, tags, rank, sources(name)").eq("run_date", runDate).eq("status", "digest").order("rank");
  if (error) throw new Error(`digest の取得に失敗: ${error.message}`);
  const rows = (data ?? []) as unknown as Row[];

  const { data: run } = await db.from("daily_runs").select("stages").eq("run_date", runDate).maybeSingle();
  const collect = (run?.stages as { collect?: { error?: number; sources?: number } } | null)?.collect;

  const label = jstLabel(runDate);
  const adminBase = `${siteUrl}/admin/daily?d=${runDate}`;
  const lines: string[] = [];
  lines.push(`${label} 今日の${rows.length}件${opts.degraded ? "（縮退運転: RSSのみ）" : ""}`);
  if (opts.note) lines.push(opts.note);
  lines.push("");
  for (const r of rows) {
    lines.push(`${r.rank}. ${r.title}`);
    lines.push(`   ${r.sources?.name ?? ""}${r.tags.length ? "　#" + r.tags.join(" #") : ""}`);
    for (const l of (r.summary ?? "").split("\n").filter(Boolean)) lines.push(`   ${l}`);
    if (r.angle) lines.push(`   ▶ ${r.angle}`);
    lines.push(`   コメントする: ${adminBase}#item-${r.id}`);
    lines.push(`   出典: ${r.url}`);
    lines.push("");
  }
  if (collect) lines.push(`ソース取得: ${collect.sources ?? "-"}件中 失敗 ${collect.error ?? 0}件`);
  lines.push(`管理画面: ${adminBase}`);
  const text = lines.join("\n");

  const itemsHtml = rows
    .map(
      (r) => `
<div style="padding:14px 0;border-top:1px solid #e3e0d8" id="item-${r.id}">
  <p style="margin:0 0 4px;font-size:11px;color:#6b6f76">${esc(r.sources?.name ?? "")}${r.tags.length ? "　" + r.tags.map((t) => `<span style="background:#eef2f6;color:#1b3a5c;border-radius:999px;padding:1px 8px;margin-right:4px">${esc(t)}</span>`).join("") : ""}</p>
  <p style="margin:0 0 6px;font-size:16px;font-weight:700;line-height:1.5"><a href="${esc(r.url)}" style="color:#1f2328;text-decoration:none">${r.rank}. ${esc(r.title)}</a></p>
  <p style="margin:0 0 6px;font-size:14px;line-height:1.7;color:#4b5058">${(r.summary ?? "").split("\n").filter(Boolean).map(esc).join("<br>")}</p>
  ${r.angle ? `<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#9a4a1f">▶ ${esc(r.angle)}</p>` : ""}
  <a href="${adminBase}#item-${r.id}" style="display:inline-block;background:#1b3a5c;color:#fff;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:700;text-decoration:none">コメントする</a>
</div>`,
    )
    .join("");
  const html = `<!doctype html><html lang="ja"><body style="margin:0;padding:16px;background:#f7f6f2;color:#1f2328;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif">
<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #d9d6ce;border-radius:10px;padding:20px 22px">
<p style="margin:0 0 2px;font-size:12px;letter-spacing:.12em;color:#e8743b;font-weight:700">DAILY</p>
<h1 style="margin:0 0 6px;font-size:20px">${esc(label)} 今日の${rows.length}件${opts.degraded ? "（縮退運転: RSSのみ）" : ""}</h1>
${opts.note ? `<p style="margin:0 0 10px;font-size:13px;color:#b5473c">${esc(opts.note)}</p>` : ""}
<p style="margin:0 0 10px;font-size:13px;color:#6b6f76">気になった2〜3件にだけコメントを。保存した分がその日のうちに公開されます。</p>
${itemsHtml}
<p style="margin:16px 0 0;font-size:12px;color:#8a8e95">${collect ? `ソース取得: ${collect.sources ?? "-"}件中 失敗 ${collect.error ?? 0}件 ／ ` : ""}<a href="${adminBase}" style="color:#1b3a5c">管理画面を開く</a></p>
</div></body></html>`;

  if (opts.dryRun) {
    log(text);
    return { sent: false, to, count: rows.length };
  }
  if (!process.env.RESEND_API_KEY) {
    log("[mail] RESEND_API_KEY 未設定のためスキップ");
    return { sent: false, to, count: rows.length };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: me } = await resend.emails.send({
    from,
    to,
    subject: `${label} 今日の${rows.length}件${opts.degraded ? "（縮退運転）" : ""}`,
    text,
    html,
  });
  if (me) throw new Error(`メール送信に失敗: ${me.message}`);
  await recordStage(db, runDate, "mail", { sent_at: new Date().toISOString(), to, count: rows.length }, { mailed_at: new Date().toISOString() });
  log(`[mail] 送信: ${to.join(", ")} (${rows.length}件)`);
  return { sent: true, to, count: rows.length };
}
