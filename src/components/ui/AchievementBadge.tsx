import type { AchievementBadgeType } from "@prisma/client";
import { CircleDollarSign, Crown, Flame, Gem, ShieldCheck, Sparkles, Star, Trophy, Zap, type LucideIcon } from "lucide-react";

interface BadgeDef {
  label: string;
  icon: LucideIcon;
  color: string;
}

const BADGE_DEFS: Record<AchievementBadgeType, BadgeDef> = {
  RISING_STAR:     { label: "Rising Star",     icon: Sparkles, color: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800" },
  POWER_SELLER:    { label: "Power Seller",    icon: Flame, color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800" },
  TOP_SELLER:      { label: "Top Seller",      icon: Trophy, color: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800" },
  LEGEND:          { label: "Legend",          icon: Crown, color: "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/30 dark:text-brand-400 dark:border-brand-800" },
  BIG_EARNER:      { label: "Big Earner",      icon: CircleDollarSign, color: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800" },
  WHALE:           { label: "Whale",           icon: Gem, color: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800" },
  FIVE_STAR_SELLER:{ label: "5-Star Seller",   icon: Star, color: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800" },
  FAST_RESPONDER:  { label: "Fast Responder",  icon: Zap, color: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800" },
  TRUSTED_SELLER:  { label: "Trusted Seller",  icon: ShieldCheck, color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800" },
};

interface Props {
  badge: AchievementBadgeType;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function AchievementBadge({ badge, size = "md", showLabel = true }: Props) {
  const def = BADGE_DEFS[badge];
  return (
    <span
      title={def.label}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${
        size === "sm" ? "text-xs" : "text-xs"
      } ${def.color}`}
    >
      <def.icon className="h-3.5 w-3.5 shrink-0" aria-hidden={showLabel ? true : undefined} aria-label={showLabel ? undefined : def.label} />
      {showLabel && <span>{def.label}</span>}
    </span>
  );
}

interface ShelfProps {
  badges: AchievementBadgeType[];
}

export function AchievementBadgeShelf({ badges }: ShelfProps) {
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <AchievementBadge key={badge} badge={badge} />
      ))}
    </div>
  );
}
