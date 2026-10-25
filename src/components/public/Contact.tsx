import { Suspense } from "react";
import { connection } from "next/server";
import { profile } from "@/content/profile";
import { env } from "@/lib/env";
import { signTimestamp } from "@/lib/spam";
import type { SiteSettings } from "@/types/database";
import { InquiryForm } from "./InquiryForm";
import { SnsLinks } from "./SnsLinks";

/** リクエストごとに署名付きタイムスタンプを発行する（動的部分はここだけ） */
async function DynamicInquiryForm() {
  await connection();
  const token = signTimestamp(env.formHmacSecret);
  return <InquiryForm formToken={token} turnstileSiteKey={env.turnstileSiteKey} />;
}

function FormSkeleton() {
  return <div className="h-[520px] animate-pulse rounded-[10px] border border-line bg-white" aria-hidden="true" />;
}

export function Contact({ settings }: { settings: SiteSettings }) {
  return (
    <section id="contact" className="scroll-mt-20 border-t border-line-2 pt-12 md:pt-[72px]">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl bg-ink px-6 py-8 text-white md:px-8 md:py-9">
        <div className="min-w-0 flex-[1_1_320px]">
          <p className="font-en mb-2 text-xs font-semibold tracking-[0.12em] text-orange">CONTACT</p>
          <p className="mb-1.5 text-[22px] font-bold leading-snug">{profile.contact.heading}</p>
          <p className="text-[13px] leading-relaxed text-[#C9CDD3]">{profile.contact.body}</p>
        </div>
        <div className="no-print flex shrink-0 flex-col gap-2">
          <a href="#inquiry" className="block rounded-lg bg-orange px-6 py-3 text-center text-[15px] font-bold text-white no-underline hover:opacity-90">
            フォームで相談する
          </a>
          <p className="text-center text-xs text-[#C9CDD3]">{profile.contact.replyNote}</p>
        </div>
      </div>

      <div className="relative mt-6">
        <Suspense fallback={<FormSkeleton />}>
          <DynamicInquiryForm />
        </Suspense>
      </div>

      <div id="privacy" className="mt-6 scroll-mt-20 text-xs leading-relaxed text-ink-3">
        <p className="font-bold">プライバシーポリシー（お問い合わせ）</p>
        <p>
          お問い合わせフォームからお預かりした氏名・メールアドレス・組織名・ご用件は、ご連絡と対応の記録のためにのみ利用し、ご本人の同意なく第三者に提供しません。
          スパム対策のため、送信元IPアドレスのハッシュ値とブラウザ情報、Cloudflare Turnstileの検証結果を併せて保存します。保存した情報の削除をご希望の場合は、同フォームからご連絡ください。
        </p>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 pt-6 text-xs text-ink-4">
        <div className="flex flex-wrap gap-4">
          {settings.company_links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="text-ink-4 no-underline hover:text-navy">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3.5">
          <SnsLinks settings={settings} size="sm" />
          <p>© 2026 {profile.nameEn}</p>
        </div>
      </footer>
    </section>
  );
}
