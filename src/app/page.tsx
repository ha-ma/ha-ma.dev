import { getPublicContent } from "@/lib/content";
import { ProfilePage } from "@/components/public/ProfilePage";
import { profile } from "@/content/profile";
import { snsList } from "@/components/public/SnsLinks";

export default async function Page() {
  const data = await getPublicContent();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ha-ma.dev";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    alternateName: profile.nameEn,
    url: siteUrl,
    image: `${siteUrl}/images/profile.jpg`,
    jobTitle: profile.titles,
    address: { "@type": "PostalAddress", addressLocality: "根室市", addressRegion: "北海道", addressCountry: "JP" },
    sameAs: snsList(data.settings).map((s) => s.href),
    knowsLanguage: ["ja", "en"],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProfilePage data={data} />
    </>
  );
}
