import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "管理画面ログイン", robots: { index: false, follow: false } };

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-16">
      <p className="font-en mb-2 text-xs font-semibold tracking-[0.12em] text-orange">ADMIN</p>
      <h1 className="mb-6 text-2xl font-bold">管理画面ログイン</h1>
      <Suspense>
        <ErrorNotice searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </main>
  );
}

async function ErrorNotice({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const { error } = await searchParams;
  if (error !== "link") return null;
  return (
    <p className="mb-4 rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-sm text-red" role="alert">
      ログインリンクが無効か期限切れです。もう一度お試しください。
    </p>
  );
}
