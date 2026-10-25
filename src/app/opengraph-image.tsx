import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { profile } from "@/content/profile";

export const alt = "濵屋雄太｜AI・DX × 地方創生";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// OG画像の文言はここで固定（CMSのキャッチコピーとは独立。フォントは使用文字のみサブセット化済み）
const TAGLINE = profile.defaultTagline;

export default async function OpenGraphImage() {
  const [noto, inter, photo] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/NotoSansJP-Bold-subset.otf")),
    readFile(join(process.cwd(), "src/assets/fonts/Inter-Bold.otf")),
    readFile(join(process.cwd(), "public/images/profile.jpg")).catch(() => null),
  ]);
  const photoSrc = photo ? `data:image/jpeg;base64,${photo.toString("base64")}` : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#F7F6F2",
          color: "#1F2328",
          fontFamily: "NotoSansJP",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, paddingRight: 48 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Inter", fontSize: 22, letterSpacing: 4, color: "#E8743B" }}>AI / DX × REGIONAL REVITALIZATION</div>
            <div style={{ display: "flex", fontSize: 84, lineHeight: 1.1, marginTop: 16 }}>{profile.name}</div>
            <div style={{ display: "flex", fontFamily: "Inter", fontSize: 26, letterSpacing: 6, color: "#6B6F76", marginTop: 8 }}>{profile.nameEn.toUpperCase()}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 32, color: "#1B3A5C", lineHeight: 1.4 }}>{TAGLINE}</div>
            <div style={{ display: "flex", fontSize: 22, color: "#4B5058", marginTop: 18 }}>{profile.titles.join("　")}</div>
            <div style={{ display: "flex", fontFamily: "Inter", fontSize: 20, color: "#8A8E95", marginTop: 10 }}>ha-ma.dev</div>
          </div>
        </div>
        {photoSrc && (
          <img src={photoSrc} alt="" width={420} height={420} style={{ width: 420, height: 420, borderRadius: 16, objectFit: "cover", alignSelf: "center" }} />
        )}
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "NotoSansJP", data: noto, style: "normal", weight: 700 },
        { name: "Inter", data: inter, style: "normal", weight: 700 },
      ],
    },
  );
}
