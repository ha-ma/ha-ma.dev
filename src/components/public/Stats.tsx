import { profile } from "@/content/profile";

export function Stats() {
  return (
    <section id="stats" className="mt-12 border-t border-line-2 pt-12">
      <dl className="grid grid-cols-3 gap-4 rounded-xl bg-navy px-6 py-7 text-white md:grid-cols-6">
        {profile.stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1">
            <dd className="font-en m-0 whitespace-nowrap text-[32px] font-bold leading-none tracking-tight md:text-[30px] lg:text-4xl">
              {s.value}
              {s.unit && <span className="ml-0.5 text-sm font-medium">{s.unit}</span>}
            </dd>
            <dt className="text-xs leading-snug text-[#C9D3DE]">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
