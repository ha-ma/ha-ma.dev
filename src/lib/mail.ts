import { Resend } from "resend";
import { env } from "@/lib/env";
import type { Inquiry } from "@/types/database";

type InquiryMail = Pick<Inquiry, "id" | "name" | "email" | "organization" | "category" | "message" | "created_at">;

const SENDER = `濵屋雄太 紹介ページ <${env.mailFrom}>`;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function jst(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

/** テキスト本文を、改行を保ったまま HTML にする（メールクライアントでの改行崩れ対策） */
function toHtml(text: string) {
  return `<!doctype html><html lang="ja"><body style="margin:0;padding:24px;background:#f7f6f2;color:#1f2328;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;font-size:15px;line-height:1.8"><div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #d9d6ce;border-radius:10px;padding:28px"><pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:inherit">${esc(text)}</pre></div></body></html>`;
}

function summary(inq: InquiryMail) {
  return [
    `お名前: ${inq.name}`,
    `メール: ${inq.email}`,
    `組織: ${inq.organization || "（未記入）"}`,
    `種別: ${inq.category}`,
    `受信日時: ${jst(inq.created_at)}`,
    ``,
    `---- ご用件 ----`,
    inq.message,
    `----------------`,
  ].join("\n");
}

/**
 * 管理者への通知メール。送信失敗しても呼び出し側は成功として扱う（DBには保存済みのため）。
 */
export async function sendInquiryNotification(inq: InquiryMail) {
  if (!env.resendApiKey) {
    console.warn("[mail] RESEND_API_KEY 未設定のため通知メールをスキップしました");
    return { skipped: true as const };
  }
  const resend = new Resend(env.resendApiKey);
  const adminUrl = `${env.siteUrl}/admin/inquiries/${inq.id}`;
  const text = [`お問い合わせが届きました。`, ``, summary(inq), ``, `管理画面: ${adminUrl}`].join("\n");

  const { error } = await resend.emails.send({
    from: SENDER,
    to: env.mailTo,
    replyTo: inq.email,
    subject: `【お問い合わせ】${inq.category}／${inq.name} 様`,
    text,
    html: toHtml(text),
  });
  if (error) {
    console.error("[mail] 通知の送信失敗:", error);
    return { skipped: false as const, error };
  }
  return { skipped: false as const };
}

/**
 * 送信者への自動返信。受付内容の控えを送る。
 * スパム対策（Turnstile・レート制限・内容チェック）をすべて通過した送信にのみ送られる。
 * AUTO_REPLY=off で無効化できる。
 */
export async function sendInquiryAutoReply(inq: InquiryMail) {
  if (!env.resendApiKey || !env.autoReply) return { skipped: true as const };
  const resend = new Resend(env.resendApiKey);
  const text = [
    `${inq.name} 様`,
    ``,
    `お問い合わせありがとうございます。以下の内容で受け付けました。`,
    `内容を確認のうえ、2営業日以内にご返信いたします。`,
    ``,
    summary(inq),
    ``,
    `このメールは自動送信です。心当たりがない場合は、お手数ですがこのメールを破棄してください。`,
    ``,
    `濵屋 雄太`,
    `${env.siteUrl}`,
  ].join("\n");

  const { error } = await resend.emails.send({
    from: SENDER,
    to: [inq.email],
    replyTo: env.mailTo[0],
    subject: `【受付完了】お問い合わせありがとうございます（${inq.category}）`,
    text,
    html: toHtml(text),
  });
  if (error) {
    console.error("[mail] 自動返信の送信失敗:", error);
    return { skipped: false as const, error };
  }
  return { skipped: false as const };
}
