"use client";

import { useState, useTransition } from "react";
import { purgeContentCache } from "./actions/content";

export function PurgeButton() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await purgeContentCache();
          setDone(true);
        })
      }
      className="rounded-lg border border-navy px-4 py-2 text-sm font-medium text-navy hover:bg-navy-tint disabled:opacity-60"
    >
      {pending ? "更新中…" : done ? "更新しました" : "公開ページのキャッシュを更新"}
    </button>
  );
}
