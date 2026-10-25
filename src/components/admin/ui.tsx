import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({ title, action, children }: { title: string; action?: { href: string; label: string }; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {children}
      </div>
      {action && (
        <Link href={action.href} className="rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white no-underline hover:opacity-90">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-[1120px] px-4 py-8 md:px-8", className)}>{children}</main>;
}

export const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-[15px] text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/15 aria-[invalid=true]:border-red";

export function Field({ label, name, error, hint, children, className }: { label: string; name: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-[13px] font-bold">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-4">{hint}</p>}
      {error && (
        <p className="text-xs text-red" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-[18px] w-[18px] accent-navy" />
      {label}
    </label>
  );
}

export function StatusBadge({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", ok ? "bg-green/10 text-green" : "bg-line-2 text-ink-3")}>{children}</span>
  );
}
