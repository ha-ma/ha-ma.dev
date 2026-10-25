"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CONTENT_TAG } from "@/lib/content";
import { requireAdmin, type ContentTable } from "@/lib/admin";
import { activitySchema, flattenErrors, formDataToObject, reorderSchema, settingsSchema, strengthSchema, workSchema } from "@/lib/schemas";
import { INQUIRY_STATUSES } from "@/types/database";

export type FormState = { status: "idle" | "error"; message?: string; fieldErrors?: Record<string, string> };

const SCHEMAS = { activities: activitySchema, strengths: strengthSchema, works: workSchema } as const;

function isTable(v: unknown): v is ContentTable {
  return v === "activities" || v === "strengths" || v === "works";
}

/** 新規作成・更新（id の有無で分岐）。成功時は一覧へ redirect */
export async function saveEntity(_prev: FormState, formData: FormData): Promise<FormState> {
  const table = formData.get("table");
  if (!isTable(table)) return { status: "error", message: "不正なテーブルです" };
  const id = (formData.get("id") as string | null) || null;
  const { supabase } = await requireAdmin();

  const parsed = SCHEMAS[table].safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { status: "error", message: "入力内容をご確認ください", fieldErrors: flattenErrors(parsed.error) };
  }
  // url は空文字なら null に
  const values = { ...parsed.data } as Record<string, unknown>;
  if ("url" in values && values.url === "") values.url = null;

  if (id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from(table).update(values as any).eq("id", id);
    if (error) return { status: "error", message: `保存に失敗しました: ${error.message}` };
  } else {
    const { data: last } = await supabase.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const sort_order = (last?.sort_order ?? 0) + 10;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from(table).insert({ ...values, sort_order } as any);
    if (error) return { status: "error", message: `保存に失敗しました: ${error.message}` };
  }
  updateTag(CONTENT_TAG);
  redirect(`/admin/${table}`);
}

export async function deleteEntity(table: ContentTable, id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  updateTag(CONTENT_TAG);
  return { ok: true };
}

export async function setPublished(table: ContentTable, id: string, published: boolean) {
  const { supabase } = await requireAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from(table).update({ published } as any).eq("id", id);
  if (error) return { ok: false, message: error.message };
  updateTag(CONTENT_TAG);
  return { ok: true };
}

export async function setFeatured(id: string, featured: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("works").update({ featured }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  updateTag(CONTENT_TAG);
  return { ok: true };
}

/** 並べ替え: 渡された順に sort_order を 10, 20, 30… で振り直す */
export async function reorder(input: { table: ContentTable; ids: string[] }) {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "不正な並べ替えです" };
  const { supabase } = await requireAdmin();
  const results = await Promise.all(
    parsed.data.ids.map((id, i) =>
      supabase
        .from(parsed.data.table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ sort_order: (i + 1) * 10 } as any)
        .eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, message: failed.error.message };
  updateTag(CONTENT_TAG);
  return { ok: true };
}

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = settingsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { status: "error", message: "入力内容をご確認ください", fieldErrors: flattenErrors(parsed.error) };
  }
  const { error } = await supabase.from("site_settings").update(parsed.data).eq("id", 1);
  if (error) return { status: "error", message: `保存に失敗しました: ${error.message}` };
  updateTag(CONTENT_TAG);
  return { status: "idle", message: "保存しました" };
}

export async function updateInquiryStatus(id: string, status: string) {
  const s = z.enum(INQUIRY_STATUSES).safeParse(status);
  if (!s.success) return { ok: false, message: "不正なステータスです" };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("inquiries").update({ status: s.data }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** 公開ページのキャッシュを手動で破棄 */
export async function purgeContentCache() {
  await requireAdmin();
  updateTag(CONTENT_TAG);
  return { ok: true };
}
