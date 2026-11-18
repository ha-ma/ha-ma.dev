"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { polishText, saveComment, type CommentState } from "@/app/admin/actions/daily";
import { inputCls } from "@/components/admin/ui";
import { DAILY_TAGS, type Comment } from "@/types/database";
import { cn } from "@/lib/utils";

type Item = { id: string; title: string; url: string; summary: string | null; angle: string | null; tags: string[]; rank: number | null; score: number | null; sourceName: string; runDate: string };

export function CommentCard({ item, comment }: { item: Item; comment: Comment | null }) {
  const [confirmed, setConfirmed] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: CommentState, fd: FormData) => {
      const r = await saveComment(prev, fd);
      if (r.status !== "confirm") setConfirmed(false);
      return r;
    },
    { status: "idle" } as CommentState,
  );
  const [openState, setOpen] = useState<boolean | null>(null);
  const [text, setText] = useState(comment?.public_text ?? "");
  const published = state.status === "saved" ? Boolean(state.publishedAt) : Boolean(comment?.public_text);
  const ref = useRef<HTMLDivElement>(null);
  // メールのリンク（#item-id）で開かれたら展開してスクロール
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => "",
  );
  const linked = hash === `#item-${item.id}`;
  const open = openState ?? (linked || Boolean(comment?.public_text || comment?.private_memo));
  useEffect(() => {
    if (linked) setTimeout(() => ref.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
  }, [linked]);

  const tagsDefault = new Set(comment?.tags?.length ? comment.tags : item.tags);
  return (
    <article ref={ref} id={`item-${item.id}`} className={cn("scroll-mt-4 rounded-[10px] border bg-white", published ? "border-green/50" : "border-line")}>
      <div className="p-4 md:p-5">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
          <span className="font-en font-bold text-orange">#{item.rank}</span>
          <span>{item.sourceName}</span>
          {item.score != null && <span className="text-ink-4">score {item.score}</span>}
          {published && <span className="rounded-full bg-green/10 px-2 py-0.5 font-medium text-green">公開中</span>}
          {!published && comment?.private_memo && <span className="rounded-full bg-line-2 px-2 py-0.5 text-ink-3">メモあり</span>}
        </div>
        <h2 className="text-[16px] font-bold leading-snug">
          <a href={item.url} target="_blank" rel="noreferrer" className="text-ink no-underline hover:text-navy hover:underline">
            {item.title} ↗
          </a>
        </h2>
        {item.summary && <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{item.summary}</p>}
        {item.angle && <p className="mt-2 text-[14px] leading-relaxed text-orange-ink">▶ {item.angle}</p>}
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="mt-3 rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white hover:opacity-90">
            コメントする
          </button>
        )}
      </div>

      {open && (
        <form action={action} className="flex flex-col gap-3 border-t border-line-2 bg-paper/60 p-4 md:p-5">
          <input type="hidden" name="item_id" value={item.id} />
          <input type="hidden" name="run_date" value={item.runDate} />
          <input type="hidden" name="confirmed" value={confirmed ? "1" : "0"} />

          <label className="text-[13px] font-bold" htmlFor={`pub-${item.id}`}>
            公開コメント <span className="font-normal text-ink-4">保存すると /daily に公開されます</span>
          </label>
          <textarea
            id={`pub-${item.id}`}
            name="public_text"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputCls}
            placeholder="自分の言葉で。引用ではなく、どう思ったか・自分ならどうするか"
          />
          <VoiceTools onText={(t) => setText((prev) => (prev ? prev + "\n" + t : t))} onReplace={(t) => setText(t)} current={text} />

          <label className="text-[13px] font-bold" htmlFor={`memo-${item.id}`}>
            非公開メモ <span className="font-normal text-ink-4">自分用。どこにも出ません</span>
          </label>
          <textarea id={`memo-${item.id}`} name="private_memo" rows={2} defaultValue={comment?.private_memo ?? ""} className={inputCls} />

          <div className="flex flex-wrap gap-1.5">
            {DAILY_TAGS.map((t) => (
              <label key={t} className="cursor-pointer">
                <input type="checkbox" name="tags" value={t} defaultChecked={tagsDefault.has(t)} className="peer sr-only" />
                <span className="inline-block rounded-full border border-line px-2.5 py-1 text-xs peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white">{t}</span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="podcast_flag" defaultChecked={comment?.podcast_flag ?? false} className="h-[18px] w-[18px] accent-navy" />
            ポッドキャストで話す
          </label>

          {state.status === "confirm" && (
            <div className="rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-sm text-red" role="alert">
              {state.message}
              <div className="mt-2 flex gap-2">
                <button type="submit" onClick={() => setConfirmed(true)} className="rounded-lg bg-red px-3 py-1.5 text-xs font-bold text-white">
                  このまま公開する
                </button>
                <span className="self-center text-xs text-ink-3">または本文を直して保存</span>
              </div>
            </div>
          )}
          {state.status === "error" && (
            <p className="rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-sm text-red" role="alert">
              {state.message}
            </p>
          )}
          {state.status === "saved" && (
            <p className="rounded-lg bg-green/10 px-3 py-2 text-sm text-green" role="status">
              {state.message}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={pending} className="rounded-lg bg-navy px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
              {pending ? "保存中…" : text.trim() ? "保存して公開" : "メモとして保存"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-ink-3 hover:underline">
              閉じる
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

/** 音声入力（Web Speech API）と「整える」ボタン */
function VoiceTools({ onText, onReplace, current }: { onText: (t: string) => void; onReplace: (t: string) => void; current: string }) {
  const [listening, setListening] = useState(false);
  const supported = useSyncExternalStore(
    subscribeNoop,
    () => Boolean(getSpeechRecognition()),
    () => false,
  );
  const [busy, startTransition] = useTransition();
  const [err, setErr] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const parts: string[] = [];
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) parts.push(e.results[i][0].transcript);
      if (parts.length) onText(parts.join(""));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  function polish() {
    setErr("");
    startTransition(async () => {
      const r = await polishText(current);
      if (r.ok) onReplace(r.text);
      else setErr(r.message);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {supported && (
        <button type="button" onClick={toggle} className={cn("rounded-full border px-3 py-1.5 font-bold", listening ? "border-red bg-red/10 text-red" : "border-line hover:border-navy")}>
          {listening ? "● 録音中（タップで停止）" : "🎤 音声で話す"}
        </button>
      )}
      <button type="button" onClick={polish} disabled={busy || !current.trim()} className="rounded-full border border-line px-3 py-1.5 font-bold hover:border-navy disabled:opacity-50">
        {busy ? "整えています…" : "文章を整える"}
      </button>
      {err && <span className="text-red">{err}</span>}
    </div>
  );
}

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
function subscribeNoop() {
  return () => {};
}

// Web Speech API の最小型（lib.dom に無い環境向け）
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
