// 環境変数の読み取り。サーバー専用の値はここ経由でのみ参照する。

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`環境変数 ${name} が設定されていません`);
  return v;
}

export const env = {
  // 公開可
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
  get turnstileSiteKey() {
    return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  },
  // 秘密
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get adminEmail() {
    return required("ADMIN_EMAIL").toLowerCase();
  },
  get turnstileSecretKey() {
    return process.env.TURNSTILE_SECRET_KEY ?? "";
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY ?? "";
  },
  get mailFrom() {
    return process.env.MAIL_FROM ?? "noreply@ha-ma.dev";
  },
  /** 通知先。カンマ区切りで複数可 */
  get mailTo(): string[] {
    return (process.env.MAIL_TO ?? "inquiry@ha-ma.dev")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },
  /** 送信者への自動返信（既定: 有効。AUTO_REPLY=off で無効） */
  get autoReply() {
    return (process.env.AUTO_REPLY ?? "on").toLowerCase() !== "off";
  },
  get formHmacSecret() {
    return required("FORM_HMAC_SECRET");
  },
  get revalidateSecret() {
    return process.env.REVALIDATE_SECRET ?? "";
  },
  get rateLimitPer10Min() {
    return Number(process.env.RATE_LIMIT_PER_10MIN ?? 3);
  },
  get rateLimitPerDay() {
    return Number(process.env.RATE_LIMIT_PER_DAY ?? 10);
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
};
