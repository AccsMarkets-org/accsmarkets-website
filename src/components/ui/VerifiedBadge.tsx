import { VERIFIED_BADGE_STYLE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { VerifiedBadge as VerifiedBadgeEnum } from "@prisma/client";

export function VerifiedBadge({ badge, size = 16 }: { badge: VerifiedBadgeEnum; size?: number }) {
  const style = VERIFIED_BADGE_STYLE[badge];
  if (!style.visible) return null;

  // OFFICIAL — compact orange filled circle with white checkmark, Twitter-style
  if (badge === "OFFICIAL") {
    const s = Math.round(size * 1.1); // slightly larger than peer badges but not huge
    return (
      <span
        title="Official AccsMarkets Support"
        className="inline-flex shrink-0 items-center justify-center"
        style={{ width: s, height: s }}
      >
        <svg viewBox="0 0 24 24" width={s} height={s} aria-label="Official Support" fill="none">
          {/* Filled orange circle */}
          <circle cx="12" cy="12" r="11" fill="rgb(249 115 22)" />
          {/* Bold white checkmark */}
          <path
            d="M7 12.5l3.5 3.5 6.5-7"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  // All other badges — standard shield with checkmark
  return (
    <span title={style.label} className={cn("inline-flex shrink-0 items-center", style.className)}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 1.5l2.6 1.3 2.9-.4 1.4 2.6 2.6 1.4-.4 2.9 1.3 2.6-1.3 2.6.4 2.9-2.6 1.4-1.4 2.6-2.9-.4L12 22.5l-2.6-1.3-2.9.4-1.4-2.6-2.6-1.4.4-2.9L1.5 12l1.3-2.6-.4-2.9 2.6-1.4L6.4 2.4l2.9.4L12 1.5z" />
        <path
          d="M8.5 12.2l2.3 2.3 4.7-4.9"
          stroke="hsl(var(--surface))"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
