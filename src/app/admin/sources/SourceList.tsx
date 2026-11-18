"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSource, deleteSource, setSourceEnabled, type SourceFormState } from "@/app/admin/actions/daily";
import { Field, inputCls } from "@/components/admin/ui";
import type { Source } from "@/types/database";
import { cn } from "@/lib/utils";

const TIER = { 1: "◎", 2: "○", 3: "△" } as Record<number, string>;

export function SourceRow({ source: s }: { source: Source }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [enabled, setEnabled] = useState(s.enabled);
  const status = s.last_status;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line-2 px-3 py-2 text-sm last:border-b-0", !enabled && "opacity-50")}>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          start(async () => {
            const r = await setSourceEnabled(s.id, !enabled);
            if (r.ok) setEnabled(!enabled);
          })
        }
        className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", enabled ? "bg-green/10 text-green" : "bg-line-2 text-ink-3")}
        title="クリックで有効／無効"
      >
        {enabled ? "有効" : "無効"}
      </button>
      <span className="font-en text-xs text-orange">{TIER[s.tier]}</span>
      <span className="rounded bg-navy-tint px-1.5 py-0.5 font-en text-[11px] text-navy">{s.kind}</span>
      <span className="font-bold">{s.name}</span>
      {s.x_handle && <span className="text-xs text-ink-3">@{s.x_handle}</span>}
      {(s.feed || s.url) && (
        <a href={s.feed ?? s.url ?? "#"} target="_blank" rel="noreferrer" className="max-w-[320px] truncate text-xs text-ink-4 no-underline hover:underline">
          {(s.feed ?? s.url ?? "").replace(/^https?:\/\//, "")}
        </a>
      )}
      <span className="ml-auto flex items-center gap-2 text-[11px]">
        {status && (
          <span className={cn("rounded-full px-2 py-0.5", status === "ok" ? "bg-green/10 text-green" : status === "empty" ? "bg-line-2 text-ink-3" : "bg-red/10 text-red")}>
            {status}
            {s.fail_count > 1 ? ` ×${s.fail_count}` : ""}
          </span>
        )}
        {s.last_fetched_at && <span className="text-ink-4">{new Date(s.last_fetched_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", timeZone: "Asia/Tokyo" })}</span>}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!confirm(`${s.name} を削除しますか？収集済みのアイテムも消えます。`)) return;
            start(async () => {
              const r = await deleteSource(s.id);
              if (r.ok) router.refresh();
            });
          }}
          className="text-ink-4 hover:text-red"
        >
          削除
        </button>
      </span>
      {s.last_error && <p className="w-full truncate text-[11px] text-red/80">{s.last_error}</p>}
    </div>
  );
}

export function AddSourceForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (prev: SourceFormState, fd: FormData) => {
      const r = await addSource(prev, fd);
      if (r.status === "saved") router.refresh();
      return r;
    },
    { status: "idle" } as SourceFormState,
  );
  return (
    <form action={action} className="mt-3 grid gap-3 md:grid-cols-2">
      {state.message && (
        <p className={cn("md:col-span-2 rounded-lg px-3 py-2 text-sm", state.status === "error" ? "border border-red/30 bg-red/5 text-red" : "bg-green/10 text-green")} role="status">
          {state.message}
        </p>
      )}
      <Field label="ID（英小文字・数字・ハイフン）" name="id">
        <input id="id" name="id" required className={inputCls} placeholder="example-blog" />
      </Field>
      <Field label="名称" name="name">
        <input id="name" name="name" required className={inputCls} />
      </Field>
      <Field label="グループ" name="group_name" hint="既存のグループ名と揃えると一覧でまとまります">
        <input id="group_name" name="group_name" required className={inputCls} placeholder="G. 生成AI・開発メディア" />
      </Field>
      <Field label="取得方式" name="kind">
        <select id="kind" name="kind" className={inputCls} defaultValue="rss">
          <option value="rss">rss（RSS/Atom）</option>
          <option value="note">note（note.com/ID/rss）</option>
          <option value="gnews">gnews（Googleニュース検索・日本語）</option>
          <option value="gnews_en">gnews_en（Googleニュース検索・英語）</option>
          <option value="page">page（ページ差分監視）</option>
          <option value="yt">yt（YouTube チャンネル）</option>
          <option value="x">x（Xリスト経由）</option>
        </select>
      </Field>
      <Field label="URL（サイト／ページ）" name="url">
        <input id="url" name="url" className={inputCls} placeholder="https://" />
      </Field>
      <Field label="フィードURL" name="feed" hint="gnews は検索RSSのURL、x は空欄">
        <input id="feed" name="feed" className={inputCls} placeholder="https://.../feed" />
      </Field>
      <Field label="Xハンドル" name="x_handle">
        <input id="x_handle" name="x_handle" className={inputCls} placeholder="@なしでも可" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="優先" name="tier">
          <select id="tier" name="tier" className={inputCls} defaultValue="2">
            <option value="1">◎ 毎日採点</option>
            <option value="2">○ 採点対象</option>
            <option value="3">△ 低め</option>
          </select>
        </Field>
        <Field label="言語" name="lang">
          <select id="lang" name="lang" className={inputCls} defaultValue="ja">
            <option value="ja">ja</option>
            <option value="en">en</option>
          </select>
        </Field>
      </div>
      <Field label="備考" name="note" className="md:col-span-2">
        <input id="note" name="note" className={inputCls} />
      </Field>
      <div className="md:col-span-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-navy px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
          {pending ? "追加中…" : "追加"}
        </button>
      </div>
    </form>
  );
}
