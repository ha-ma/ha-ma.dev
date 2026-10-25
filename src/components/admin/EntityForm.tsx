"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveEntity, type FormState } from "@/app/admin/actions/content";
import type { ContentTable } from "@/lib/admin";
import type { Activity, Strength, Work } from "@/types/database";
import { WORK_CATEGORIES, WORK_PHASES } from "@/types/database";
import { Checkbox, Field, inputCls } from "./ui";

type Props =
  | { table: "activities"; entity: Activity | null }
  | { table: "strengths"; entity: Strength | null }
  | { table: "works"; entity: Work | null };

const initial: FormState = { status: "idle" };

export function EntityForm(props: Props) {
  const [state, action, pending] = useActionState(saveEntity, initial);
  const fe = state.fieldErrors ?? {};
  const table: ContentTable = props.table;

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5 rounded-[10px] border border-line bg-white p-6">
      <input type="hidden" name="table" value={table} />
      {props.entity && <input type="hidden" name="id" value={props.entity.id} />}

      {state.status === "error" && state.message && (
        <p className="rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-sm text-red" role="alert">
          {state.message}
        </p>
      )}

      {props.table === "activities" && <ActivityFields e={props.entity} fe={fe} />}
      {props.table === "strengths" && <StrengthFields e={props.entity} fe={fe} />}
      {props.table === "works" && <WorkFields e={props.entity} fe={fe} />}

      <div className="flex items-center gap-4 border-t border-line-3 pt-4">
        <Checkbox name="published" label="公開する" defaultChecked={props.entity?.published ?? false} />
        {props.table === "works" && <Checkbox name="featured" label="注目（初期表示6件に含める）" defaultChecked={props.entity?.featured ?? false} />}
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-navy px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
          {pending ? "保存中…" : "保存"}
        </button>
        <Link href={`/admin/${table}`} className="rounded-lg border border-line px-5 py-2.5 text-sm text-ink no-underline hover:border-navy">
          キャンセル
        </Link>
      </div>
    </form>
  );
}

type FE = Record<string, string>;

function ActivityFields({ e, fe }: { e: Activity | null; fe: FE }) {
  return (
    <>
      <Field label="グループ" name="group_type" error={fe.group_type}>
        <select id="group_type" name="group_type" defaultValue={e?.group_type ?? "company"} className={inputCls}>
          <option value="company">会社・事業</option>
          <option value="community">地域活動・ネットワーク</option>
        </select>
      </Field>
      <Field label="組織名・活動名" name="org" error={fe.org}>
        <input id="org" name="org" required maxLength={80} defaultValue={e?.org} className={inputCls} />
      </Field>
      <Field label="役割" name="role" error={fe.role} hint="例: 代表取締役／運営／外部支援">
        <input id="role" name="role" maxLength={40} defaultValue={e?.role} className={inputCls} />
      </Field>
      <Field label="概要" name="summary" error={fe.summary} hint="60〜90字目安">
        <textarea id="summary" name="summary" rows={3} maxLength={300} defaultValue={e?.summary} className={inputCls} />
      </Field>
      <Field label="ハイライト（タグ）" name="highlights" error={fe.highlights} hint="1行に1つ。採択・受託など。最大5件">
        <textarea id="highlights" name="highlights" rows={3} defaultValue={e?.highlights.join("\n")} className={inputCls} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="地域" name="region" error={fe.region}>
          <input id="region" name="region" maxLength={40} defaultValue={e?.region} className={inputCls} />
        </Field>
        <Field label="URL" name="url" error={fe.url} hint="https:// から">
          <input id="url" name="url" type="url" defaultValue={e?.url ?? ""} className={inputCls} />
        </Field>
      </div>
    </>
  );
}

function StrengthFields({ e, fe }: { e: Strength | null; fe: FE }) {
  return (
    <>
      <Field label="見出し" name="title" error={fe.title}>
        <input id="title" name="title" required maxLength={40} defaultValue={e?.title} className={inputCls} />
      </Field>
      <Field label="補足" name="body" error={fe.body} hint="80字以内">
        <textarea id="body" name="body" rows={3} maxLength={200} defaultValue={e?.body} className={inputCls} />
      </Field>
      <Field label="アイコン名（任意）" name="icon" error={fe.icon} hint="Lucide のアイコン名。現在のデザインでは未使用">
        <input id="icon" name="icon" maxLength={40} defaultValue={e?.icon} className={inputCls} />
      </Field>
    </>
  );
}

function WorkFields({ e, fe }: { e: Work | null; fe: FE }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="カテゴリ" name="category" error={fe.category}>
          <select id="category" name="category" defaultValue={e?.category ?? "WEBシステム"} className={inputCls}>
            {WORK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="フェーズ" name="phase" error={fe.phase}>
          <select id="phase" name="phase" defaultValue={e?.phase ?? "一気通貫"} className={inputCls}>
            {WORK_PHASES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="匿名化タイトル" name="title" error={fe.title} hint="固有名詞は使わず「業種＋規模＋目的」で。25字以内が目安">
        <input id="title" name="title" required maxLength={60} defaultValue={e?.title} className={inputCls} />
      </Field>
      <Field label="役割" name="roles" error={fe.roles} hint="カンマ区切り。例: PM, テックリード">
        <input id="roles" name="roles" defaultValue={e?.roles.join(", ")} className={inputCls} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="チーム規模" name="team_size" error={fe.team_size} hint="例: 社内3名＋外部パートナー2社">
          <input id="team_size" name="team_size" maxLength={60} defaultValue={e?.team_size} className={inputCls} />
        </Field>
        <Field label="期間" name="period" error={fe.period} hint="例: 2023〜24（約10カ月）">
          <input id="period" name="period" maxLength={30} defaultValue={e?.period} className={inputCls} />
        </Field>
      </div>
      <Field label="概要（課題→対応→結果）" name="summary" error={fe.summary} hint="120字以内が目安">
        <textarea id="summary" name="summary" rows={3} maxLength={400} defaultValue={e?.summary} className={inputCls} />
      </Field>
      <Field label="技術・ツール" name="stack" error={fe.stack} hint="カンマ区切り">
        <input id="stack" name="stack" defaultValue={e?.stack.join(", ")} className={inputCls} />
      </Field>
    </>
  );
}
