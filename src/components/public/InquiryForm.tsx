"use client";

import { useActionState, useId } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { submitInquiry, type InquiryState } from "@/app/actions/inquiry";
import { INQUIRY_CATEGORIES } from "@/types/database";
import { cn } from "@/lib/utils";

const initial: InquiryState = { status: "idle" };

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[15px] text-ink outline-none transition-colors focus:border-navy focus:ring-2 focus:ring-navy/15 aria-[invalid=true]:border-red";

function Field({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-bold">
        {label} {required && <span className="font-medium text-red">必須</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-red">
          {error}
        </p>
      )}
    </div>
  );
}

export function InquiryForm({ formToken, turnstileSiteKey }: { formToken: string; turnstileSiteKey: string }) {
  const [state, action, pending] = useActionState(submitInquiry, initial);
  const uid = useId();
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <div className="rounded-[10px] border border-line bg-white p-7" role="status" aria-live="polite">
        <p className="mb-1 text-lg font-bold">お問い合わせありがとうございます</p>
        <p className="text-sm text-ink-2">内容を確認のうえ、2営業日以内にご返信します。</p>
      </div>
    );
  }

  return (
    <form id="inquiry" action={action} noValidate className="flex flex-col gap-[18px] rounded-[10px] border border-line bg-white p-5 md:p-7">
      <div>
        <p className="mb-1 text-lg font-bold">お問い合わせフォーム</p>
        <p className="text-[13px] text-ink-3">メールアドレスはページ上に公開していません。フォームからお送りください。</p>
      </div>

      {state.status === "error" && state.message && (
        <p className="rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-sm text-red" role="alert">
          {state.message}
        </p>
      )}

      {/* 非表示フィールド */}
      <input type="hidden" name="form_started_at" value={formToken} />
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor={`${uid}-website`}>Website</label>
        <input id={`${uid}-website`} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="grid gap-x-4 gap-y-3.5 md:grid-cols-2">
        <Field id={`${uid}-name`} label="お名前" required error={fe.name}>
          <input id={`${uid}-name`} name="name" type="text" required maxLength={50} defaultValue={v.name} placeholder="山田 太郎" autoComplete="name" aria-invalid={!!fe.name} className={inputCls} />
        </Field>
        <Field id={`${uid}-email`} label="メールアドレス" required error={fe.email}>
          <input id={`${uid}-email`} name="email" type="email" required maxLength={254} defaultValue={v.email} placeholder="you@example.com" autoComplete="email" aria-invalid={!!fe.email} className={inputCls} />
        </Field>
        <Field id={`${uid}-org`} label="会社・組織名" error={fe.organization}>
          <input id={`${uid}-org`} name="organization" type="text" maxLength={100} defaultValue={v.organization} placeholder="株式会社○○／○○市役所" autoComplete="organization" className={inputCls} />
        </Field>
        <Field id={`${uid}-cat`} label="ご相談の種別" required error={fe.category}>
          <select id={`${uid}-cat`} name="category" required defaultValue={v.category ?? ""} aria-invalid={!!fe.category} className={inputCls}>
            <option value="">選択してください</option>
            {INQUIRY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field id={`${uid}-msg`} label="ご用件" required error={fe.message}>
        <textarea
          id={`${uid}-msg`}
          name="message"
          required
          rows={5}
          minLength={20}
          maxLength={2000}
          defaultValue={v.message}
          placeholder="ご相談の背景、ご希望の関わり方、時期などをお書きください（20字以上）"
          aria-invalid={!!fe.message}
          className={cn(inputCls, "resize-y leading-relaxed")}
        />
      </Field>

      <div className="flex items-start gap-2.5">
        <input id={`${uid}-agree`} name="agree" type="checkbox" required className="mt-1 h-[18px] w-[18px] accent-navy" />
        <label htmlFor={`${uid}-agree`} className="text-[13px] leading-relaxed text-ink-2">
          お預かりした情報は本件のご連絡のみに利用し、第三者に提供しません。
          <a href="#privacy" className="text-navy underline-offset-2 hover:underline">
            プライバシーポリシー
          </a>
          に同意のうえ送信してください。
          {fe.agree && <span className="block text-red">{fe.agree}</span>}
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-3 pt-4">
        {turnstileSiteKey ? (
          <Turnstile siteKey={turnstileSiteKey} options={{ theme: "light", language: "ja", size: "flexible" }} className="max-w-[300px]" />
        ) : (
          <p className="text-xs text-ink-4">（開発環境: Turnstile 未設定）</p>
        )}
        <button type="submit" disabled={pending} className="rounded-lg bg-orange px-7 py-3 text-[15px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? "送信中…" : "送信する"}
        </button>
      </div>
    </form>
  );
}
