import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminUser } from "@/lib/supabase/server";
import { signOut } from "./actions/auth";

export const metadata: Metadata = {
  title: { default: "管理画面", template: "%s｜管理画面" },
  robots: { index: false, follow: false },
};

const nav = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/activities", label: "現在の活動" },
  { href: "/admin/strengths", label: "得意なこと" },
  { href: "/admin/works", label: "案件" },
  { href: "/admin/settings", label: "サイト設定" },
  { href: "/admin/inquiries", label: "問い合わせ" },
];

async function Header() {
  const user = await getAdminUser();
  if (!user) return null;
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <nav className="flex flex-wrap gap-1 text-sm" aria-label="管理メニュー">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 text-ink no-underline hover:bg-navy-tint hover:text-navy">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-xs text-ink-3">
          <Link href="/admin/preview" className="text-navy no-underline hover:underline">
            プレビュー
          </Link>
          <a href="/" target="_blank" rel="noreferrer" className="text-navy no-underline hover:underline">
            公開ページ ↗
          </a>
          <span>{user.email}</span>
          <form action={signOut}>
            <button type="submit" className="rounded-full border border-line px-3 py-1 hover:border-navy">
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-screen bg-paper">
      <Suspense fallback={<div className="h-14 border-b border-line bg-white" />}>
        <Header />
      </Suspense>
      <Suspense fallback={<div className="mx-auto max-w-[1120px] px-4 py-10 text-sm text-ink-3 md:px-8">読み込み中…</div>}>{children}</Suspense>
    </div>
  );
}
