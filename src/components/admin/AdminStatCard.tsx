import Link from "next/link";
import { cn } from "@/lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href?: string;
  color?: string;
  bg?: string;
  trend?: number | null;
  urgent?: boolean;
  sublabel?: string;
}

export function AdminStatCard({ label, value, icon, href, color, bg, trend, urgent, sublabel }: Props) {
  const content = (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl border p-4 transition",
        urgent
          ? "border-warning/40 bg-warning/5 hover:border-warning/70"
          : "border-surface-border bg-surface hover:border-brand-300",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            bg ?? "bg-brand-50",
          )}
          style={color ? { color } : undefined}
        >
          {icon}
        </div>
        {trend != null && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              trend > 0 ? "bg-success/10 text-success" : trend < 0 ? "bg-danger/10 text-danger" : "bg-muted/10 text-muted",
            )}
          >
            {trend > 0 ? <TrendingUp className="h-3 w-3" aria-hidden /> : trend < 0 ? <TrendingDown className="h-3 w-3" aria-hidden /> : <Minus className="h-3 w-3" aria-hidden />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p
          className={cn(
            "text-2xl font-bold leading-none",
            urgent ? "text-warning" : "text-foreground",
          )}
          style={!urgent && color ? { color } : undefined}
        >
          {value}
        </p>
        <p className="mt-1 text-sm text-muted">{label}</p>
        {sublabel && <p className="text-xs text-muted/70 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
