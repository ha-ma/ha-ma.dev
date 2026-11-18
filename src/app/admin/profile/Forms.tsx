"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBlockedTerm, deleteBlockedTerm, saveDailySettings, saveInterestProfile, type ProfileState } from "@/app/admin/actions/daily";
import { Field, inputCls } from "@/components/admin/ui";
import type { BlockedTerm } from "@/types/database";
import { cn } from "@/lib/utils";

function Msg({ state }: { state: ProfileState }) {
  if (!state.message) return null;
  return (
    <p className={cn("rounded-lg px-3 py-2 text-sm", state.status === "error" ? "border border-red/30 bg-red/5 text-red" : "bg-green/10 text-green")} role="status">
      {state.message}
    </p>
  );
}

export function InterestProfileForm({ body, history }: { body: string; history: { id: number; created_at: string; head: string }[] }) {
  const [state, action, pending] = useActionState(saveInterestProfile, { status: "idle" } as ProfileState);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-[10px] border border-line bg-white p-5">
      <Msg state={state} />
      <textarea name="body" rows={10} defaultValue={body} className={inputCls} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-navy px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
          {pending ? "保存中…" : "保存（履歴に追加）"}
        </button>
        <span className="text-xs text-ink-4">1行1テーマ。「何に反応してほしいか」を書くほど採点が効きます</span>
      </div>
      {history.length > 0 && (
        <details className="text-xs text-ink-3">
          <summary className="cursor-pointer">過去の版（{history.length}）</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {history.map((h) => (
              <li key={h.id}>
                {new Date(h.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}　{h.head}…
              </li>
            ))}
          </ul>
        </details>
      )}
    </form>
  );
}

export function BlockedTermsForm({ terms }: { terms: BlockedTerm[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [state, action, pending] = useActionState(
    async (prev: ProfileState, fd: FormData) => {
      const r = await addBlockedTerm(prev, fd);
      if (r.status === "saved") router.refresh();
      return r;
    },
    { status: "idle" } as ProfileState,
  );
  const KIND = { name: "人名", deal: "案件・社名", other: "その他" } as const;
  return (
    <div className="rounded-[10px] border border-line bg-white p-5">
      <form action={action} className="mb-4 flex flex-wrap items-end gap-2">
        <Field label="語" name="term" className="min-w-[200px] flex-1">
          <input id="term" name="term" required className={inputCls} />
        </Field>
        <Field label="種別" name="kind">
          <select id="kind" name="kind" className={inputCls} defaultValue="name">
            <option value="name">人名</option>
            <option value="deal">案件・社名</option>
            <option value="other">その他</option>
          </select>
        </Field>
        <Field label="メモ（任意）" name="note" className="min-w-[160px]">
          <input id="note" name="note" className={inputCls} />
        </Field>
        <button type="submit" disabled={pending} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
          追加
        </button>
      </form>
      <Msg state={state} />
      {terms.length === 0 ? (
        <p className="text-sm text-ink-3">まだ登録がありません。</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {terms.map((t) => (
            <li key={t.id} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm">
              <span className="text-[11px] text-ink-4">{KIND[t.kind]}</span>
              <span>{t.term}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    const r = await deleteBlockedTerm(t.id);
                    if (r.ok) router.refresh();
                  })
                }
                className="text-ink-4 hover:text-red"
                aria-label={`${t.term} を削除`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DailySettingsForm({ values: v }: { values: { mail_to: string; x_list_url: string; digest_size: number; model_score: string; model_digest: string } }) {
  const [state, action, pending] = useActionState(saveDailySettings, { status: "idle" } as ProfileState);
  return (
    <form action={action} className="grid gap-4 rounded-[10px] border border-line bg-white p-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <Msg state={state} />
      </div>
      <Field label="朝のメールの宛先" name="mail_to" hint="カンマ区切りで複数可">
        <input id="mail_to" name="mail_to" defaultValue={v.mail_to} className={inputCls} />
      </Field>
      <Field label="Xリストの URL" name="x_list_url" hint="x.com/i/lists/… 。Mac mini がこのリストを読みます">
        <input id="x_list_url" name="x_list_url" defaultValue={v.x_list_url} className={inputCls} placeholder="https://x.com/i/lists/..." />
      </Field>
      <Field label="1日の件数" name="digest_size">
        <input id="digest_size" name="digest_size" type="number" min={3} max={30} defaultValue={v.digest_size} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="採点モデル" name="model_score" hint="空欄で既定">
          <input id="model_score" name="model_score" defaultValue={v.model_score} className={inputCls} placeholder="claude-haiku-5-5" />
        </Field>
        <Field label="要約モデル" name="model_digest" hint="空欄で既定">
          <input id="model_digest" name="model_digest" defaultValue={v.model_digest} className={inputCls} placeholder="claude-haiku-5-5" />
        </Field>
      </div>
      <div className="md:col-span-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-navy px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
          {pending ? "保存中…" : "保存"}
        </button>
      </div>
    </form>
  );
}
