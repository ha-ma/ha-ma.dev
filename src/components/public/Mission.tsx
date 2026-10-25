import { profile } from "@/content/profile";
import { Card, GroupLabel, Section } from "./Section";

export function Mission() {
  const m = profile.mission;
  return (
    <Section id="mission" eyebrow="MISSION" title={m.heading} lead={m.body}>
      <GroupLabel>こんな企業・組織をより活かしたい</GroupLabel>
      <div className="grid gap-4 md:grid-cols-3">
        {m.targets.map((t) => (
          <Card key={t.title} className="p-[18px]">
            <p className="mb-1.5 text-[15px] font-bold text-navy">{t.title}</p>
            <p className="text-[13px] leading-relaxed text-ink-2">{t.body}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
