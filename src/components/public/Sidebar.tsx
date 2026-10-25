import Image from "next/image";
import { profile } from "@/content/profile";
import type { SiteSettings } from "@/types/database";
import { SnsLinks } from "./SnsLinks";

export function Sidebar({ settings }: { settings: SiteSettings }) {
  const tagline = settings.tagline || profile.defaultTagline;
  return (
    <aside className="flex w-full flex-col gap-5 md:sticky md:top-6 md:w-[300px] md:shrink-0 lg:w-[340px]">
      <div className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-line">
        <Image src="/images/profile.jpg" alt={`${profile.name}のプロフィール写真`} fill sizes="(min-width: 768px) 340px, 100vw" className="object-cover" priority />
      </div>
      <div>
        <p className="font-en mb-1.5 text-xs font-semibold tracking-[0.12em] text-orange">{profile.eyebrow}</p>
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">{profile.name}</h1>
        <p className="font-en mt-1 text-[13px] font-medium tracking-[0.1em] text-ink-3">{profile.nameEn.toUpperCase()}</p>
      </div>
      <ul className="flex flex-col gap-1.5 text-sm leading-relaxed">
        {profile.titles.map((t) => (
          <li key={t}>{t}</li>
        ))}
        <li className="text-ink-3">{profile.base}</li>
      </ul>
      <SnsLinks settings={settings} className="-mt-2" />
      <p className="text-[17px] font-bold leading-relaxed text-navy">{tagline}</p>
      <div className="no-print flex flex-col gap-2">
        <a href="#contact" className="block rounded-lg bg-orange px-4 py-3 text-center text-[15px] font-bold text-white no-underline hover:opacity-90">
          お問い合わせ
        </a>
        {settings.company_links[0] && (
          <a
            href={settings.company_links[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-navy px-4 py-3 text-center text-sm font-medium text-navy no-underline hover:bg-navy-tint"
          >
            {settings.company_links[0].label} サイト
          </a>
        )}
      </div>
      <p className="text-xs leading-relaxed text-ink-3">{profile.languageNote}</p>
    </aside>
  );
}
