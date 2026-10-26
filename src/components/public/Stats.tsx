import { profile } from "@/content/profile";

export function Stats() {
  return (
    <section id="stats" className="mt-12 border-t border-line-2 pt-12">
      <dl className="grid grid-cols-3 gap-x-3 gap-y-5 rounded-xl bg-navy px-5 py-6 text-white md:px-6 lg:grid-cols-6">
        {profile.stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1">
            <dd className="font-en m-0 whitespace-nowrap text-[30px] font-bold leading-none tracking-tight lg:text-[34px]">
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
