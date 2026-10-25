import { profile } from "@/content/profile";
import { cn } from "@/lib/utils";
import { GroupLabel, Section } from "./Section";

const LEVEL_LABEL = { 1: "1年未満", 2: "1〜3年", 3: "3年以上" } as const;

export function Skills() {
  return (
    <Section id="skills" eyebrow="SKILLS" title="スキル" lead="経験年数を3段階（1年未満／1〜3年／3年以上）で表示しています。日常的に使っているツールは別掲。">
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        {profile.skillGroups.map((g) => (
          <div key={g.name}>
            <GroupLabel>{g.name}</GroupLabel>
            <ul className="flex list-none flex-col gap-2 p-0">
              {g.items.map((s) => (
                <li key={s.name} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 text-sm">{s.name}</span>
                  <span className="whitespace-nowrap text-[11px] text-ink-4">{LEVEL_LABEL[s.level]}</span>
                  <span className="flex gap-[3px]" aria-hidden="true">
                    {[1, 2, 3].map((i) => (
                      <span key={i} className={cn("block h-2 w-[18px] rounded-sm", i <= s.level ? "bg-navy" : "bg-line-2")} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-[10px] bg-navy-tint px-5 py-4">
        <p className="mb-1.5 text-xs font-bold text-navy">日常的に使うツール</p>
        <p className="text-[13px] leading-relaxed text-ink-2">{profile.tools}</p>
      </div>
    </Section>
  );
}
