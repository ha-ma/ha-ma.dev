"use server";

import { headers } from "next/headers";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInquiryAutoReply, sendInquiryNotification } from "@/lib/mail";
import { flattenErrors, formDataToObject, inquirySchema } from "@/lib/schemas";
import { checkContent, checkHoneypot, checkOrigin, clientIpFromHeaders, hashIp, verifyTimestamp, verifyTurnstile } from "@/lib/spam";

export type InquiryState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const GENERIC_ERROR = "送信できませんでした。時間をおいて再度お試しください。";

function keep(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ["name", "email", "organization", "category", "message"]) {
    const v = fd.get(k);
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export async function submitInquiry(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  const h = await headers();
  const values = keep(formData);
  const siteHost = new URL(env.siteUrl).host;
  const allowedHosts = [siteHost, "localhost:3000", "127.0.0.1:3000"];

  // 1. Origin
  const origin = checkOrigin(h, allowedHosts);
  if (!origin.ok) {
    console.warn("[inquiry] rejected:", origin.reason, "(allowed:", allowedHosts.join(","), ")");
    return { status: "error", message: GENERIC_ERROR, values };
  }

  // 2. ハニーポット（ボットには成功を装う）
  // フィールド名は自動入力（Chrome・パスワードマネージャ）が反応しないよう無意味な名前にしている
  const hp = checkHoneypot(formData.get("hp_field_x7") as string | null);
  if (!hp.ok) {
    console.warn("[inquiry] rejected: honeypot (silent success)");
    return { status: "success" };
  }

  // 3. 送信時間
  const ts = verifyTimestamp(env.formHmacSecret, formData.get("form_started_at") as string | null);
  if (!ts.ok) {
    console.warn("[inquiry] rejected:", ts.reason);
    const msg = ts.reason === "form_expired" ? "フォームの有効期限が切れました。ページを再読み込みして再度お試しください。" : GENERIC_ERROR;
    return { status: "error", message: msg, values };
  }

  // 4. 入力検証
  const parsed = inquirySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    const fieldErrors = flattenErrors(parsed.error);
    console.warn("[inquiry] rejected: validation", JSON.stringify(fieldErrors));
    const labels: Record<string, string> = { name: "お名前", email: "メールアドレス", organization: "会社・組織名", category: "ご相談の種別", message: "ご用件", agree: "プライバシーポリシーへの同意" };
    const which = Object.keys(fieldErrors).map((k) => labels[k] ?? k).join("・");
    return { status: "error", message: `入力内容をご確認ください（${which}）。`, fieldErrors, values };
  }
  const { agree: _agree, ...input } = parsed.data;
  void _agree;

  const ip = clientIpFromHeaders(h);
  const ipHash = hashIp(ip, env.formHmacSecret);
  const userAgent = (h.get("user-agent") ?? "").slice(0, 255);
  const supabase = createAdminClient();

  // 5. 内容ヒューリスティック（該当は spam として保存し、ユーザーには汎用エラー）
  const content = checkContent(input);
  if (!content.ok) {
    console.warn("[inquiry] rejected: content", content.reason);
    await supabase.from("inquiries").insert({
      ...input,
      status: "spam",
      spam_reason: content.reason,
      ip_hash: ipHash,
      user_agent: userAgent,
    });
    return { status: "error", message: GENERIC_ERROR, values };
  }

  // 6. レート制限（10分 / 1日）
  const [r10, r1d] = await Promise.all([
    supabase.rpc("check_rate_limit", { p_key: `inq10:${ipHash}`, p_max: env.rateLimitPer10Min, p_window_seconds: 600 }),
    supabase.rpc("check_rate_limit", { p_key: `inq1d:${ipHash}`, p_max: env.rateLimitPerDay, p_window_seconds: 86_400 }),
  ]);
  if (r10.error || r1d.error) {
    console.error("[inquiry] rate limit rpc error", r10.error ?? r1d.error);
  } else if (r10.data === false || r1d.data === false) {
    console.warn("[inquiry] rejected: rate_limit");
    return { status: "error", message: "送信回数の上限に達しました。しばらく時間をおいてから再度お試しください。", values };
  }

  // 7. Turnstile
  const turnstile = await verifyTurnstile(env.turnstileSecretKey, formData.get("cf-turnstile-response") as string | null, ip, [
    siteHost.split(":")[0]!,
    "localhost",
    "127.0.0.1",
  ]);
  if (!turnstile.ok) {
    console.warn("[inquiry] turnstile rejected:", turnstile.reason);
    return { status: "error", message: GENERIC_ERROR, values };
  }

  // 8. 保存
  const { data: saved, error } = await supabase
    .from("inquiries")
    .insert({
      ...input,
      ip_hash: ipHash,
      user_agent: userAgent,
      turnstile: turnstile.result ? { hostname: turnstile.result.hostname, challenge_ts: turnstile.result.challenge_ts } : null,
    })
    .select("id, name, email, organization, category, message, created_at")
    .single();
  if (error || !saved) {
    console.error("[inquiry] insert failed", error);
    return { status: "error", message: GENERIC_ERROR, values };
  }

  console.info("[inquiry] saved", saved.id);
  // 9. 通知（失敗しても成功扱い）
  try {
    await Promise.all([sendInquiryNotification(saved), sendInquiryAutoReply(saved)]);
  } catch (e) {
    console.error("[inquiry] notification failed", e);
  }

  return { status: "success" };
}
