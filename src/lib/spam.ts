import { createHmac, createHash, timingSafeEqual } from "node:crypto";

// =====================================================================
// 問い合わせフォームのスパム対策（純粋関数中心。Server Action から呼ぶ）
// =====================================================================

export type SpamVerdict = { ok: true } | { ok: false; reason: string; silent?: boolean };

// ---------- 層2: 送信時間（HMAC 署名付きタイムスタンプ） ----------
export function signTimestamp(secret: string, now = Date.now()): string {
  const ts = String(now);
  const sig = createHmac("sha256", secret).update(ts).digest("hex");
  return `${ts}.${sig}`;
}

export function verifyTimestamp(
  secret: string,
  token: string | null | undefined,
  { minMs = 3_000, maxMs = 60 * 60 * 1000, now = Date.now() } = {},
): SpamVerdict {
  if (!token) return { ok: false, reason: "timestamp_missing" };
  const [ts, sig] = token.split(".");
  if (!ts || !sig || !/^\d+$/.test(ts)) return { ok: false, reason: "timestamp_malformed" };
  const expected = createHmac("sha256", secret).update(ts).digest("hex");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "timestamp_bad_signature" };
  const elapsed = now - Number(ts);
  if (elapsed < minMs) return { ok: false, reason: "too_fast" };
  if (elapsed > maxMs) return { ok: false, reason: "form_expired" };
  return { ok: true };
}

// ---------- 層1: ハニーポット ----------
export function checkHoneypot(value: string | null | undefined): SpamVerdict {
  if (value && value.trim() !== "") return { ok: false, reason: "honeypot", silent: true };
  return { ok: true };
}

// ---------- 層3: 内容ヒューリスティック ----------
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
  "throwawaymail.com",
]);

export function checkContent(input: { message: string; name: string; email: string }): SpamVerdict {
  const { message, name, email } = input;

  const urls = message.match(/https?:\/\/|www\./gi)?.length ?? 0;
  if (urls >= 3) return { ok: false, reason: "too_many_urls" };

  // 日本語・英数字以外の文字が主体（キリル文字等の定型スパム）
  const letters = message.replace(/[\s\d\p{P}\p{S}]/gu, "");
  if (letters.length > 0) {
    const jaOrLatin = letters.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{Script=Latin}]/gu)?.length ?? 0;
    if (jaOrLatin / letters.length < 0.5) return { ok: false, reason: "script_mismatch" };
  }

  // 同一文字の長い連続
  if (/(.)\1{14,}/u.test(message)) return { ok: false, reason: "repeated_chars" };

  // 名前にURLや記号だらけ
  if (/https?:\/\/|<[a-z]/i.test(name)) return { ok: false, reason: "name_contains_url" };

  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (DISPOSABLE_DOMAINS.has(domain)) return { ok: false, reason: "disposable_email" };

  // 典型的なSEOスパム語
  if (/\b(seo services|backlinks?|guest post|crypto investment|casino)\b/i.test(message)) return { ok: false, reason: "spam_phrase" };

  return { ok: true };
}

// ---------- 層4: Cloudflare Turnstile ----------
export interface TurnstileResult {
  success: boolean;
  hostname?: string;
  challenge_ts?: string;
  "error-codes"?: string[];
  action?: string;
}

export async function verifyTurnstile(
  secret: string,
  token: string | null | undefined,
  remoteIp: string | null,
  expectedHostnames: string[],
  { maxAgeMs = 5 * 60 * 1000, now = Date.now(), fetchImpl = fetch }: { maxAgeMs?: number; now?: number; fetchImpl?: typeof fetch } = {},
): Promise<SpamVerdict & { result?: TurnstileResult }> {
  if (!secret) {
    // 開発環境でキー未設定なら素通し（本番は env 必須）
    if (process.env.NODE_ENV !== "production") return { ok: true };
    return { ok: false, reason: "turnstile_not_configured" };
  }
  if (!token) return { ok: false, reason: "turnstile_missing" };
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  let result: TurnstileResult;
  try {
    const res = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      cache: "no-store",
    });
    result = (await res.json()) as TurnstileResult;
  } catch {
    return { ok: false, reason: "turnstile_unreachable" };
  }
  if (!result.success) return { ok: false, reason: `turnstile_failed:${(result["error-codes"] ?? []).join(",")}`, result };
  if (result.hostname && expectedHostnames.length > 0 && !expectedHostnames.includes(result.hostname)) {
    return { ok: false, reason: `turnstile_hostname:${result.hostname}`, result };
  }
  if (result.challenge_ts) {
    const age = now - Date.parse(result.challenge_ts);
    if (Number.isFinite(age) && age > maxAgeMs) return { ok: false, reason: "turnstile_stale", result };
  }
  return { ok: true, result };
}

// ---------- 層5: IP ハッシュ（生IPは保存しない） ----------
export function hashIp(ip: string | null, secret: string, date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${ip ?? "unknown"}|${day}|${secret}`)
    .digest("hex")
    .slice(0, 32);
}

export function clientIpFromHeaders(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

// ---------- 層6: Origin チェック（Server Action の標準チェックに加えて明示） ----------
export function checkOrigin(h: Headers, allowedHosts: string[]): SpamVerdict {
  const origin = h.get("origin");
  if (!origin) return { ok: true }; // 同一オリジンのフォーム送信では付かない場合がある
  try {
    const host = new URL(origin).host;
    if (allowedHosts.includes(host)) return { ok: true };
    return { ok: false, reason: `origin:${host}` };
  } catch {
    return { ok: false, reason: "origin_malformed" };
  }
}
