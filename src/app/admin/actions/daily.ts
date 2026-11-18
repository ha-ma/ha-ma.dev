"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { DAILY_TAG } from "@/lib/daily/public";
import { findBlockedTerms, maskBlockedTerms } from "@/lib/daily/guard";
import { askText, DEFAULT_MODEL_DIGEST, newUsage } from "@/lib/daily/llm";
import { polishSystem } from "@/lib/daily/prompts";
import { DAILY_TAGS, type DailyTag } from "@/types/database";

export type CommentState = {
  status: "idle" | "saved" | "error" | "confirm";
  message?: string;
  /** 禁則語に当たった場合、確認待ちの語 */
  hits?: string[];
  publishedAt?: string | null;
};

const commentSchema = z.object({
  item_id: z.string().uuid(),
  run_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  public_text: z.string().max(4000),
  private_memo: z.string().max(4000),
  tags: z.array(z.enum(DAILY_TAGS)).default([]),
  podcast_flag: z.boolean().default(false),
  /** 禁則語の警告を確認済みで保存する */
  confirmed: z.boolean().default(false),
});

function parseCommentForm(fd: FormData) {
  return commentSchema.safeParse({
    item_id: fd.get("item_id"),
    run_date: fd.get("run_date"),
    public_text: String(fd.get("public_text") ?? ""),
    private_memo: String(fd.get("private_memo") ?? ""),
    tags: fd.getAll("tags").map(String),
    podcast_flag: fd.get("podcast_flag") === "on",
    confirmed: fd.get("confirmed") === "1",
  });
}

/** コメントを保存。public_text があれば保存＝公開。禁則語に当たれば一度だけ確認を求める */
export async function saveComment(_prev: CommentState, fd: FormData): Promise<CommentState> {
  const { supabase } = await requireAdmin();
  const parsed = parseCommentForm(fd);
  if (!parsed.success) return { status: "error", message: "入力内容をご確認ください" };
  const v = parsed.data;
  const publicText = v.public_text.trim();

  let overridden: string[] = [];
  if (publicText) {
    const { data: terms } = await supabase.from("blocked_terms").select("term");
    const hits = findBlockedTerms(
      publicText,
      (terms ?? []).map((t) => t.term),
    );
    if (hits.length && !v.confirmed) {
      return { status: "confirm", hits, message: `「${hits.join("」「")}」が含まれています。公開しますか？` };
    }
    overridden = hits;
  }

  const { data: existing } = await supabase.from("comments").select("id, published_at").eq("item_id", v.item_id).maybeSingle();
  const publishedAt = publicText ? (existing?.published_at ?? new Date().toISOString()) : null;
  const row = {
    item_id: v.item_id,
    run_date: v.run_date,
    public_text: publicText || null,
    private_memo: v.private_memo.trim() || null,
    tags: v.tags as DailyTag[],
    podcast_flag: v.podcast_flag,
    guard_overridden: overridden,
    published_at: publishedAt,
  };
  const { error } = existing ? await supabase.from("comments").update(row).eq("id", existing.id) : await supabase.from("comments").insert(row);
  if (error) return { status: "error", message: `保存に失敗しました: ${error.message}` };
  updateTag(DAILY_TAG);
  return { status: "saved", message: publicText ? "保存して公開しました" : "非公開メモとして保存しました", publishedAt };
}

/** 音声入力の文字起こしを本人の文章に整える */
export async function polishText(text: string): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const { supabase } = await requireAdmin();
  const src = text.trim();
  if (!src) return { ok: false, message: "テキストが空です" };
  if (src.length > 4000) return { ok: false, message: "長すぎます（4000字まで）" };
  const { data: terms } = await supabase.from("blocked_terms").select("term");
  const blocked = (terms ?? []).map((t) => t.term);
  try {
    const out = await askText({ model: DEFAULT_MODEL_DIGEST, system: polishSystem(blocked), user: src, usage: newUsage(), maxTokens: 1200 });
    return { ok: true, text: maskBlockedTerms(out, blocked) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "整形に失敗しました" };
  }
}

// ---- ソース ----
export async function setSourceEnabled(id: string, enabled: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("sources")
    .update({ enabled, fail_count: enabled ? 0 : undefined })
    .eq("id", id);
  return error ? { ok: false, message: error.message } : { ok: true };
}

const sourceSchema = z.object({
  id: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9ぁ-んァ-ン一-龥-]+$/u, "id は英小文字・数字・ハイフン（日本語可）"),
  name: z.string().min(1).max(120),
  group_name: z.string().min(1).max(60),
  kind: z.enum(["rss", "gnews", "gnews_en", "page", "note", "yt", "x"]),
  lang: z.enum(["ja", "en"]).default("ja"),
  url: z.string().max(500).optional().or(z.literal("")),
  feed: z.string().max(500).optional().or(z.literal("")),
  x_handle: z.string().max(40).optional().or(z.literal("")),
  tier: z.coerce.number().int().min(1).max(3).default(2),
  note: z.string().max(200).default(""),
});

export type SourceFormState = { status: "idle" | "saved" | "error"; message?: string };

export async function addSource(_prev: SourceFormState, fd: FormData): Promise<SourceFormState> {
  const { supabase } = await requireAdmin();
  const parsed = sourceSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { status: "error", message: parsed.error.issues.map((i) => i.message).join("、") };
  const v = parsed.data;
  const { error } = await supabase.from("sources").insert({
    id: v.id,
    name: v.name,
    group_name: v.group_name,
    kind: v.kind,
    lang: v.lang,
    url: v.url || null,
    feed: v.feed || null,
    x_handle: v.x_handle ? v.x_handle.replace(/^@/, "") : null,
    tier: v.tier,
    note: v.note,
    tags: [],
  });
  if (error) return { status: "error", message: `追加に失敗しました: ${error.message}` };
  return { status: "saved", message: `${v.name} を追加しました` };
}

export async function deleteSource(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("sources").delete().eq("id", id);
  return error ? { ok: false, message: error.message } : { ok: true };
}

// ---- 興味プロフィール ----
export type ProfileState = { status: "idle" | "saved" | "error"; message?: string };
export async function saveInterestProfile(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const { supabase } = await requireAdmin();
  const body = String(fd.get("body") ?? "").trim();
  if (body.length < 10) return { status: "error", message: "10文字以上で入力してください" };
  if (body.length > 4000) return { status: "error", message: "4000文字までです" };
  const { error } = await supabase.from("interest_profile").insert({ body });
  if (error) return { status: "error", message: error.message };
  return { status: "saved", message: "保存しました。明朝の採点から反映されます" };
}

// ---- 禁則語 ----
export async function addBlockedTerm(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const { supabase } = await requireAdmin();
  const term = String(fd.get("term") ?? "").trim();
  const kind = String(fd.get("kind") ?? "other");
  if (term.length < 2) return { status: "error", message: "2文字以上で入力してください" };
  if (!["name", "deal", "other"].includes(kind)) return { status: "error", message: "種別が不正です" };
  const { error } = await supabase.from("blocked_terms").insert({ term, kind: kind as "name" | "deal" | "other", note: String(fd.get("note") ?? "") });
  if (error) return { status: "error", message: error.message.includes("duplicate") ? "すでに登録されています" : error.message };
  return { status: "saved", message: `「${term}」を追加しました` };
}

export async function deleteBlockedTerm(id: number) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("blocked_terms").delete().eq("id", id);
  return error ? { ok: false, message: error.message } : { ok: true };
}

// ---- 日報の設定 ----
const dailySettingsSchema = z.object({
  mail_to: z.string().max(300),
  x_list_url: z.string().max(300),
  digest_size: z.coerce.number().int().min(3).max(30),
  model_score: z.string().max(80),
  model_digest: z.string().max(80),
});

export async function saveDailySettings(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const { supabase } = await requireAdmin();
  const parsed = dailySettingsSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { status: "error", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("、") };
  const v = parsed.data;
  const rows = [
    { key: "mail_to", value: v.mail_to.trim() },
    { key: "x_list_url", value: v.x_list_url.trim() },
    { key: "digest_size", value: v.digest_size },
    { key: "model_score", value: v.model_score.trim() },
    { key: "model_digest", value: v.model_digest.trim() },
  ];
  const { error } = await supabase.from("daily_settings").upsert(rows, { onConflict: "key" });
  if (error) return { status: "error", message: error.message };
  return { status: "saved", message: "保存しました" };
}
