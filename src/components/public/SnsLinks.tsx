import type { SiteSettings } from "@/types/database";
import { cn } from "@/lib/utils";

type Sns = { key: "facebook" | "x" | "linkedin" | "github"; label: string; href: string };

export function snsList(settings: SiteSettings): Sns[] {
  return [
    { key: "facebook", label: "Facebook", href: settings.sns_facebook },
    { key: "x", label: "X", href: settings.sns_x },
    { key: "linkedin", label: "LinkedIn", href: settings.sns_linkedin },
    { key: "github", label: "GitHub", href: settings.sns_github },
  ].filter((s) => s.href) as Sns[];
}

function Icon({ name, size }: { name: Sns["key"]; size: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true as const };
  switch (name) {
    case "facebook":
      return (
        <svg {...common}>
          <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.4V14h2.8v8h3.3z" />
        </svg>
      );
    case "x":
      return (
        <svg {...common} width={size - 2} height={size - 2}>
          <path d="M17.5 3h3.1l-6.8 7.8L21.8 21h-6.3l-4.9-6.4L5 21H1.9l7.3-8.3L1.5 3h6.4l4.4 5.9L17.5 3zm-1.1 16.2h1.7L7 4.7H5.2l11.2 14.5z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common}>
          <path d="M20.4 2H3.6C2.7 2 2 2.7 2 3.6v16.8c0 .9.7 1.6 1.6 1.6h16.8c.9 0 1.6-.7 1.6-1.6V3.6c0-.9-.7-1.6-1.6-1.6zM8 19H5V9h3v10zM6.5 7.7a1.7 1.7 0 110-3.4 1.7 1.7 0 010 3.4zM19 19h-3v-4.9c0-1.2 0-2.7-1.6-2.7s-1.9 1.3-1.9 2.6V19h-3V9h2.9v1.4h.1c.4-.8 1.4-1.6 2.8-1.6 3 0 3.6 2 3.6 4.6V19z" />
        </svg>
      );
    case "github":
      return (
        <svg {...common}>
          <path d="M12 .5C5.6.5.5 5.7.5 12.1c0 5.1 3.3 9.5 7.9 11 .6.1.8-.2.8-.6v-2.1c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 015.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6 4.6-1.5 7.9-5.9 7.9-11C23.5 5.7 18.4.5 12 .5z" />
        </svg>
      );
  }
}

export function SnsLinks({
  settings,
  size = "lg",
  className,
}: {
  settings: SiteSettings;
  size?: "lg" | "sm";
  className?: string;
}) {
  const list = snsList(settings);
  if (list.length === 0) return null;
  const box = size === "lg" ? "h-11 w-11 text-ink hover:bg-navy-tint hover:text-navy" : "h-9 w-9 text-ink-3 hover:text-navy";
  const px = size === "lg" ? 22 : 18;
  return (
    <div className={cn("flex gap-1", className)} aria-label="SNS">
      {list.map((s) => (
        <a
          key={s.key}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer me"
          aria-label={s.label}
          className={cn("flex items-center justify-center rounded-lg transition-colors", box)}
        >
          <Icon name={s.key} size={px} />
        </a>
      ))}
    </div>
  );
}
