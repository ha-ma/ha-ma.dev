// OAuth 1.0a（HMAC-SHA1）の署名。X API の user context 認証に使う
import { createHmac, randomBytes } from "node:crypto";

export const pctEncode = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

/** OAuth 1.0a（HMAC-SHA1）の Authorization ヘッダーを作る */
export function oauth1Header(
  method: string,
  baseUrl: string,
  query: Record<string, string>,
  c: { apiKey: string; apiSecret: string; accessToken: string; accessSecret: string },
  nonce = randomBytes(16).toString("hex"),
  timestamp = Math.floor(Date.now() / 1000).toString(),
): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: c.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: c.accessToken,
    oauth_version: "1.0",
  };
  const all = { ...query, ...oauth };
  const paramStr = Object.keys(all)
    .sort()
    .map((k) => `${pctEncode(k)}=${pctEncode(all[k])}`)
    .join("&");
  const base = [method.toUpperCase(), pctEncode(baseUrl), pctEncode(paramStr)].join("&");
  const key = `${pctEncode(c.apiSecret)}&${pctEncode(c.accessSecret)}`;
  oauth.oauth_signature = createHmac("sha1", key).update(base).digest("base64");
  return (
    "OAuth " +
    Object.keys(oauth)
      .sort()
      .map((k) => `${pctEncode(k)}="${pctEncode(oauth[k])}"`)
      .join(", ")
  );
}
