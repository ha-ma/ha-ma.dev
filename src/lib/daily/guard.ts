// 非公開領域のガード: 禁則語（人名・案件名・社名）の照合

/** 照合用に正規化する: NFKC、小文字、空白・中黒・記号を除去 */
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　・･、，,.．「」『』()（）\-ー_]/g, "");
}

/** text に含まれる禁則語を返す（部分一致。姓名の間の空白や全角半角の差は吸収） */
export function findBlockedTerms(text: string, terms: readonly string[]): string[] {
  if (!text) return [];
  const hay = normalizeForMatch(text);
  const hits: string[] = [];
  for (const t of terms) {
    const needle = normalizeForMatch(t);
    if (needle.length >= 2 && hay.includes(needle)) hits.push(t);
  }
  return hits;
}

/** 生成結果に混ざった禁則語を伏せ字にする（最後の砦） */
export function maskBlockedTerms(text: string, terms: readonly string[]): string {
  let out = text;
  for (const t of terms) {
    if (t.length < 2) continue;
    const variants = new Set([t, t.normalize("NFKC"), t.replace(/[\s　]/g, "")]);
    for (const v of variants) {
      if (!v) continue;
      out = out.split(v).join("○○");
    }
  }
  return out;
}
