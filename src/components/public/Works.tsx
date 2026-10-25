"use client";

import { useState } from "react";
import type { Work, WorkCategory } from "@/types/database";
import { WORK_CATEGORIES } from "@/types/database";
import { cn } from "@/lib/utils";
import { Card, Pill, Section } from "./Section";

const INITIAL = 6;

export function Works({ works }: { works: Work[] }) {
  const [filter, setFilter] = useState<"all" | WorkCategory>("all");
  const [expanded, setExpanded] = useState(false);
  if (works.length === 0) return null;

  const present = new Set(works.map((w) => w.category));
  const cats = WORK_CATEGORIES.filter((c) => present.has(c));
  const filtered = filter === "all" ? works : works.filter((w) => w.category === filter);
  const visible = expanded ? filtered : filtered.slice(0, INITIAL);
  const more = filtered.length - visible.length;

  return (
    <Section
      id="works"
      eyebrow="WORKS"
      title="携わってきた案件"
      lead="固有名詞を伏せた代表的な案件です。「どんなプロジェクトを・どんな立場で・どれくらいのチームで・どのフェーズから」を中心に記載しています。"
    >
      {cats.length > 1 && (
        <div className="no-print mb-5 flex flex-wrap gap-1.5" role="group" aria-label="カテゴリで絞り込み">
          {(["all", ...cats] as const).map((c) => {
            const on = filter === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setFilter(c);
                  setExpanded(false);
                }}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  on ? "border-navy bg-navy text-white" : "border-line bg-transparent text-ink hover:border-navy",
                )}
              >
                {c === "all" ? "すべて" : c}
              </button>
            );
          })}
        </div>
      )}
      <ul className="grid list-none gap-4 p-0 md:grid-cols-2">
        {visible.map((w) => (
          <Card as="li" key={w.id} className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-1.5">
              <Pill>{w.category}</Pill>
              <Pill tone="orange">{w.phase}</Pill>
            </div>
            <p className="text-base font-bold leading-snug">{w.title}</p>
            {w.summary && <p className="text-[13px] leading-relaxed text-ink-2">{w.summary}</p>}
            <dl className="grid grid-cols-3 gap-2 border-t border-line-3 pt-2.5 text-xs leading-snug">
              <div>
                <dt className="text-ink-4">役割</dt>
                <dd className="m-0 font-medium">{w.roles.join("・") || "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-4">チーム</dt>
                <dd className="m-0 font-medium">{w.team_size || "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-4">期間</dt>
                <dd className="m-0 font-medium">{w.period || "—"}</dd>
              </div>
            </dl>
            {w.stack.length > 0 && <p className="text-[11px] text-ink-4">{w.stack.join(" / ")}</p>}
          </Card>
        ))}
      </ul>
      {more > 0 && (
        <div className="no-print mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-lg border border-navy bg-transparent px-5 py-2.5 text-sm font-medium text-navy hover:bg-navy-tint"
          >
            もっと見る（{more}件）
          </button>
        </div>
      )}
    </Section>
  );
}
