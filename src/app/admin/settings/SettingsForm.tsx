"use client";

import { useActionState } from "react";
import { saveSettings, type FormState } from "@/app/admin/actions/content";
import { Field, inputCls } from "@/components/admin/ui";
import type { SiteSettings } from "@/types/database";

export function SettingsForm({ settings: s }: { settings: SiteSettings }) {
  const [state, action, pending] = useActionState(saveSettings, { status: "idle" } as FormState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5 rounded-[10px] border border-line bg-white p-6">
      {state.message && (
        <p className={state.status === "error" ? "rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-sm text-red" : "rounded-lg bg-green/10 px-3 py-2 text-sm text-green"} role="status">
          {state.message}
        </p>
      )}
      <Field label="キャッチコピー" name="tagline" error={fe.tagline} hint="30字以内目安。左カラムに表示">
        <input id="tagline" name="tagline" maxLength={60} defaultValue={s.tagline} className={inputCls} />
      </Field>
      <Field label="問い合わせ通知先メール（表示用メモ）" name="contact_email" error={fe.contact_email} hint="実際の通知先は環境変数 MAIL_TO。ここは記録用でページには表示しません">
        <input id="contact_email" name="contact_email" type="email" defaultValue={s.contact_email} className={inputCls} />
      </Field>
      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-[13px] font-bold">SNS（空欄ならアイコン非表示）</legend>
        <Field label="Facebook" name="sns_facebook" error={fe.sns_facebook}>
          <input id="sns_facebook" name="sns_facebook" type="url" defaultValue={s.sns_facebook} className={inputCls} />
        </Field>
        <Field label="X" name="sns_x" error={fe.sns_x}>
          <input id="sns_x" name="sns_x" type="url" defaultValue={s.sns_x} className={inputCls} />
        </Field>
        <Field label="LinkedIn" name="sns_linkedin" error={fe.sns_linkedin}>
          <input id="sns_linkedin" name="sns_linkedin" type="url" defaultValue={s.sns_linkedin} className={inputCls} />
        </Field>
        <Field label="GitHub" name="sns_github" error={fe.sns_github}>
          <input id="sns_github" name="sns_github" type="url" defaultValue={s.sns_github} className={inputCls} />
        </Field>
      </fieldset>
      <Field label="フッターのリンク" name="company_links" error={fe.company_links} hint="1行に1件「ラベル | URL」。先頭の1件は左カラムのボタンにも使われます">
        <textarea id="company_links" name="company_links" rows={4} defaultValue={s.company_links.map((l) => `${l.label} | ${l.url}`).join("\n")} className={inputCls} />
      </Field>
      <div>
        <button type="submit" disabled={pending} className="rounded-lg bg-navy px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
          {pending ? "保存中…" : "保存"}
        </button>
      </div>
    </form>
  );
}
