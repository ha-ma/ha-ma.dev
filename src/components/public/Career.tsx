import { profile } from "@/content/profile";
import { GroupLabel, Pill, Section } from "./Section";

export function Career() {
  return (
    <Section id="career" eyebrow="CAREER" title="経歴と裏付け">
      <div className="mt-6 flex flex-wrap gap-10">
        <div className="min-w-0 flex-[1_1_320px]">
          <ol className="relative m-0 flex list-none flex-col gap-[22px] border-l-2 border-line p-0 pl-7">
            {profile.timeline.map((t) => (
              <li key={t.year + t.event} className="relative">
                <span className="absolute -left-[35px] top-1.5 h-3 w-3 rounded-full border-2 border-paper bg-navy" aria-hidden="true" />
                <p className="font-en text-xs font-semibold tracking-wider text-orange">{t.year}</p>
                <p className="mt-0.5 text-sm leading-relaxed">{t.event}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="min-w-0 flex-[1_1_280px]">
          <GroupLabel>採択・受託・ネットワーク</GroupLabel>
          <ul className="flex list-none flex-col gap-2.5 p-0">
            {profile.credentials.map((c) => (
              <li key={c.text} className="flex items-start gap-3 rounded-[10px] border border-line bg-white px-4 py-3.5">
                <span className="mt-0.5 shrink-0">
                  <Pill tone="orange">{c.kind}</Pill>
                </span>
                <p className="text-[13px] leading-relaxed">{c.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
