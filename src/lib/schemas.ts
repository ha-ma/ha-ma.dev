import { z } from "zod";
import { INQUIRY_CATEGORIES, WORK_CATEGORIES, WORK_PHASES } from "@/types/database";

// ---------- 共通ヘルパー ----------
const trimmed = (max: number, min = 0) => z.string().trim().min(min).max(max);
const httpsUrlOrEmpty = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), { message: "https:// で始まるURLを入力してください" });
/** textarea の改行区切りを配列に */
export const linesToArray = (v: unknown) =>
  typeof v === "string"
    ? v
        .split(/\r?\n|,/)
        .map((s) => s.trim())
        .filter(Boolean)
    : Array.isArray(v)
      ? v
      : [];
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

// ---------- 問い合わせ ----------
export const inquirySchema = z.object({
  name: trimmed(50, 1),
  email: z.string().trim().toLowerCase().email("メールアドレスの形式が正しくありません").max(254),
  organization: trimmed(100),
  category: z.enum(INQUIRY_CATEGORIES, { message: "ご相談の種別を選択してください" }),
  message: trimmed(2000, 20),
  // チェックボックスは "on" で届くので真偽値に変換してから検証する
  agree: z.preprocess((v) => v === "on" || v === "true" || v === true, z.literal(true, { message: "プライバシーポリシーへの同意が必要です" })),
});
export type InquiryInput = z.infer<typeof inquirySchema>;

// ---------- 管理画面 ----------
export const activitySchema = z.object({
  group_type: z.enum(["company", "community"]),
  org: trimmed(80, 1),
  role: trimmed(40),
  summary: trimmed(300),
  highlights: z.preprocess(linesToArray, z.array(z.string().max(80)).max(5)),
  region: trimmed(40),
  url: httpsUrlOrEmpty,
  published: checkbox,
});

export const strengthSchema = z.object({
  title: trimmed(40, 1),
  body: trimmed(200),
  icon: trimmed(40),
  published: checkbox,
});

export const workSchema = z.object({
  category: z.enum(WORK_CATEGORIES),
  title: trimmed(60, 1),
  phase: z.enum(WORK_PHASES),
  roles: z.preprocess(linesToArray, z.array(z.string().max(30)).max(6)),
  team_size: trimmed(60),
  period: trimmed(30),
  summary: trimmed(400),
  stack: z.preprocess(linesToArray, z.array(z.string().max(40)).max(12)),
  featured: checkbox,
  published: checkbox,
});

export const settingsSchema = z.object({
  tagline: trimmed(60),
  contact_email: z.union([z.literal(""), z.string().trim().email().max(120)]),
  sns_facebook: httpsUrlOrEmpty,
  sns_x: httpsUrlOrEmpty,
  sns_linkedin: httpsUrlOrEmpty,
  sns_github: httpsUrlOrEmpty,
  company_links: z.preprocess(
    (v) =>
      typeof v === "string"
        ? v
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [label, ...rest] = line.split(/\s*[|｜]\s*/);
              return { label: label?.trim() ?? "", url: rest.join("|").trim() };
            })
        : v,
    z.array(z.object({ label: z.string().min(1).max(40), url: z.string().url().max(300) })).max(10),
  ),
});

export const reorderSchema = z.object({
  table: z.enum(["activities", "strengths", "works"]),
  ids: z.array(z.string().uuid()).min(1).max(200),
});

export function formDataToObject(fd: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") o[k] = v;
  }
  return o;
}

export function flattenErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
