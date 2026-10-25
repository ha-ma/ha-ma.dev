import type { Strength } from "@/types/database";
import { Card, Section } from "./Section";

export function Strengths({ strengths }: { strengths: Strength[] }) {
  if (strengths.length === 0) return null;
  return (
    <Section
      id="strengths"
      eyebrow="STRENGTHS"
      title="得意なこと"
      lead="「決める側」と「つくる側」の両方を経験しているので、企画から実装までの距離が短いのが特徴です。"
    >
      <ul className="grid list-none gap-4 p-0 md:grid-cols-3">
        {strengths.map((s, i) => (
          <Card as="li" key={s.id}>
            <p className="font-en mb-2.5 text-xl font-bold leading-none text-orange">{String(i + 1).padStart(2, "0")}</p>
            <p className="mb-1.5 text-[15px] font-bold">{s.title}</p>
            <p className="text-[13px] leading-relaxed text-ink-2">{s.body}</p>
          </Card>
        ))}
        <li className="rounded-[10px] border border-dashed border-line p-5">
          <p className="mb-1.5 text-[15px] font-bold text-navy">関わり方の例</p>
          <p className="text-[13px] leading-relaxed text-ink-2">PM／テックリード、AI導入コンサル、新規事業の共同立ち上げ、行政事業の専門家参画など</p>
        </li>
      </ul>
    </Section>
  );
}
