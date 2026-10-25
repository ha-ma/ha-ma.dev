"use client";

import { useState, useTransition } from "react";
import { updateInquiryStatus } from "@/app/admin/actions/content";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/types/database";

const LABEL: Record<InquiryStatus, string> = { new: "未読", read: "既読", replied: "返信済", spam: "スパム" };

export function StatusSelect({ id, status }: { id: string; status: InquiryStatus }) {
  const [value, setValue] = useState<InquiryStatus>(status);
  const [pending, start] = useTransition();
  return (
    <select
      value={value}
      disabled={pending}
      aria-label="ステータス"
      onChange={(e) => {
        const next = e.target.value as InquiryStatus;
        setValue(next);
        start(async () => {
          const r = await updateInquiryStatus(id, next);
          if (!r.ok) alert(r.message);
        });
      }}
      className="rounded-lg border border-line bg-white px-2 py-1 text-xs"
    >
      {INQUIRY_STATUSES.map((s) => (
        <option key={s} value={s}>
          {LABEL[s]}
        </option>
      ))}
    </select>
  );
}
