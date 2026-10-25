import { Resend } from "resend";
import { env } from "@/lib/env";
import type { Inquiry } from "@/types/database";

/**
 * 問い合わせ通知メール（プレーンテキスト）。
 * 送信失敗しても呼び出し側は成功として扱う（DBには保存済みのため）。
 */
export async function sendInquiryNotification(inq: Pick<Inquiry, "id" | "name" | "email" | "organization" | "category" | "message" | "created_at">) {
  if (!env.resendApiKey) {
    console.warn("[mail] RESEND_API_KEY 未設定のため通知メールをスキップしました");
    return { skipped: true as const };
  }
  const resend = new Resend(env.resendApiKey);
  const adminUrl = `${env.siteUrl}/admin/inquiries/${inq.id}`;
  const text = [
    `お問い合わせが届きました。`,
    ``,
    `お名前: ${inq.name}`,
    `メール: ${inq.email}`,
    `組織: ${inq.organization || "（未記入）"}`,
    `種別: ${inq.category}`,
    `受信日時: ${new Date(inq.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
    ``,
    `---- ご用件 ----`,
    inq.message,
    `----------------`,
    ``,
    `管理画面: ${adminUrl}`,
  ].join("\n");

  const { error } = await resend.emails.send({
    from: `濵屋雄太 紹介ページ <${env.mailFrom}>`,
    to: env.mailTo,
    replyTo: inq.email,
    subject: `【お問い合わせ】${inq.category}／${inq.name} 様`,
    text,
  });
  if (error) {
    console.error("[mail] 送信失敗:", error);
    return { skipped: false as const, error };
  }
  return { skipped: false as const };
}
