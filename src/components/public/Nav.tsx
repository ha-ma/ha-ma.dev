const items = [
  { href: "#mission", label: "Mission" },
  { href: "#now", label: "Now" },
  { href: "#strengths", label: "Strengths" },
  { href: "#works", label: "Works" },
  { href: "#skills", label: "Skills" },
  { href: "#career", label: "Career" },
];

export function Nav() {
  return (
    <div className="no-print mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-8">
      <a href="#top" className="font-en text-[15px] font-bold tracking-wide text-ink no-underline">
        YUTA HAMAYA
      </a>
      <nav aria-label="ページ内ナビゲーション" className="flex max-w-full gap-0.5 overflow-x-auto">
        {items.map((i) => (
          <a
            key={i.href}
            href={i.href}
            className="whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium text-ink no-underline hover:bg-navy-tint hover:text-navy"
          >
            {i.label}
          </a>
        ))}
        <a href="#contact" className="whitespace-nowrap rounded-full bg-navy px-3.5 py-2 text-[13px] font-medium text-white no-underline">
          Contact
        </a>
      </nav>
    </div>
  );
}
