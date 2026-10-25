import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  className,
}: {
  id: string;
  eyebrow?: string;
  title?: ReactNode;
  lead?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-20 border-t border-line-2 pt-12 md:pt-[72px] first:border-t-0 first:pt-0", className)}>
      {eyebrow && <p className="font-en mb-3 text-xs font-semibold tracking-[0.12em] text-orange">{eyebrow}</p>}
      {title && <h2 className="mb-2 text-[26px] font-bold leading-snug">{title}</h2>}
      {lead && <p className="mb-7 text-[15px] leading-relaxed text-ink-2">{lead}</p>}
      {children}
    </section>
  );
}

export function Card({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "article" | "li" }) {
  return <Tag className={cn("rounded-[10px] border border-line bg-white p-5 transition-colors hover:border-navy", className)}>{children}</Tag>;
}

export function Pill({ children, tone = "navy" }: { children: ReactNode; tone?: "navy" | "orange" }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-1 text-xs font-medium leading-snug",
        tone === "navy" ? "bg-navy-tint text-navy" : "rounded-md bg-orange-tint px-2 py-0.5 text-[11px] text-orange-ink",
      )}
    >
      {children}
    </span>
  );
}

export function GroupLabel({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-[13px] font-bold text-ink-3">{children}</p>;
}
