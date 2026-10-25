"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "@/app/admin/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(sendMagicLink, { status: "idle" } as LoginState);

  if (state.status === "sent") {
    return (
      <div className="rounded-[10px] border border-line bg-white p-6" role="status">
        <p className="mb-1 font-bold">ログインリンクを送信しました</p>
        <p className="text-sm text-ink-2">登録済みのメールアドレスであれば、数分以内にログイン用のリンクが届きます。メール内のリンクを開いてください。</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-[10px] border border-line bg-white p-6">
      <label className="flex flex-col gap-1.5 text-[13px] font-bold">
        メールアドレス
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-line px-3 py-2.5 text-[15px] font-normal outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
        />
      </label>
      {state.status === "error" && (
        <p className="text-sm text-red" role="alert">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="rounded-lg bg-navy px-4 py-3 text-[15px] font-bold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "送信中…" : "ログインリンクを送る"}
      </button>
      <p className="text-xs text-ink-4">パスワードはありません。メールに届くリンクからログインします。</p>
    </form>
  );
}
