import Anthropic from "@anthropic-ai/sdk";
import type { Usage } from "@/lib/daily/types";

/** 既定モデル。daily_settings の model_score / model_digest、または環境変数で差し替え可能 */
export const DEFAULT_MODEL_SCORE = process.env.DAILY_MODEL_SCORE || "claude-haiku-5-5";
export const DEFAULT_MODEL_DIGEST = process.env.DAILY_MODEL_DIGEST || "claude-haiku-5-5";

/** 概算単価（USD / 100万トークン）。既定は Claude Haiku 5.5（10万トークン以下のプロンプト）。DAILY_PRICE_IN / DAILY_PRICE_OUT で上書き可 */
const PRICE_IN = Number(process.env.DAILY_PRICE_IN ?? 0.1);
const PRICE_OUT = Number(process.env.DAILY_PRICE_OUT ?? 0.5);

export function estimateCostUsd(u: Usage): number {
  return (u.input * PRICE_IN + u.output * PRICE_OUT) / 1_000_000;
}

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("環境変数 ANTHROPIC_API_KEY が設定されていません");
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 3, timeout: 120_000 });
  return client;
}

/** JSON を返すプロンプトを投げ、パースして返す。usage に加算する */
/**
 * schema を渡すと構造化出力（output_config.format）で JSON の形を API 側で保証する。
 * 思考トークンも max_tokens に含まれるので、上限は余裕を持たせる（途中で切れたらエラーにする）。
 */
export async function askJson<T>(opts: { model: string; system: string; user: string; maxTokens?: number; usage: Usage; schema?: Record<string, unknown> }): Promise<T> {
  const res = await getClient().messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 8000,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    ...(opts.schema ? { output_config: { format: { type: "json_schema" as const, schema: opts.schema } } } : {}),
  });
  opts.usage.input += res.usage.input_tokens;
  opts.usage.output += res.usage.output_tokens;
  opts.usage.calls += 1;
  if (res.stop_reason === "max_tokens") throw new Error(`出力が max_tokens（${opts.maxTokens ?? 8000}）で途中終了しました`);
  if (res.stop_reason === "refusal") throw new Error("モデルが応答を拒否しました");
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return parseJson<T>(text);
}

/** 文章を返すプロンプト */
export async function askText(opts: { model: string; system: string; user: string; maxTokens?: number; usage: Usage }): Promise<string> {
  const res = await getClient().messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 1500,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  opts.usage.input += res.usage.input_tokens;
  opts.usage.output += res.usage.output_tokens;
  opts.usage.calls += 1;
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** ```json フェンスや前置きが混ざっても最初の JSON 値を取り出す */
export function parseJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(body) as T;
  } catch {
    const start = Math.min(...["[", "{"].map((c) => body.indexOf(c)).filter((i) => i >= 0));
    const end = Math.max(body.lastIndexOf("]"), body.lastIndexOf("}"));
    if (Number.isFinite(start) && end > start) return JSON.parse(body.slice(start, end + 1)) as T;
    throw new Error("モデル出力を JSON として解釈できませんでした: " + body.slice(0, 200));
  }
}

export function newUsage(): Usage {
  return { input: 0, output: 0, calls: 0 };
}
