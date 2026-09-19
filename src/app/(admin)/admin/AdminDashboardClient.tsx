"use client";

import { motion } from "framer-motion";
import { ReactNode, useState } from "react";
import Link from "next/link";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { countryName } from "@/lib/utils";
import { CountryFlag } from "@/components/ui/CountryFlag";

// ── Animated KPI Card ─────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  sub?: string;
  icon: ReactNode;
  color: string;
  bg: string;
  href?: string;
  urgent?: boolean;
  trend?: number | null;
  delay?: number;
}

export function AdminKpiCard({ label, value, prefix, suffix, sub, icon, color, bg, href, urgent, trend, delay = 0 }: KpiCardProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <div className={`flex flex-col gap-2.5 rounded-2xl border p-4 transition-all duration-200 ${
        urgent
          ? "border-warning/40 bg-warning/5 hover:border-warning hover:shadow-md hover:shadow-warning/10"
          : "border-surface-border bg-background hover:border-brand-300 hover:shadow-md"
      }`}>
        <div className="flex items-start justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color} shadow-sm`}>
            {icon}
          </div>
          {urgent && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-warning" />
            </span>
          )}
          {!urgent && trend !== null && trend !== undefined && (
            <span className={`flex items-center gap-0.5 text-[11px] font-bold ${trend >= 0 ? "text-success" : "text-danger"}`}>
              {trend >= 0 ? (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              )}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <div className="text-2xl font-bold leading-none text-foreground">
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} duration={800} />
        </div>
        <p className="text-xs font-medium text-muted leading-tight">{label}</p>
        {sub && <p className="text-[10px] text-muted/70 leading-tight">{sub}</p>}
      </div>
    </motion.div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

// ── Urgency Queue Item ────────────────────────────────────────────────────────

interface QueueItemProps {
  label: string;
  count: number;
  href: string;
  icon: ReactNode;
  delay?: number;
}

export function AdminQueueItem({ label, count, href, icon, delay = 0 }: QueueItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={href}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
          count > 0
            ? "bg-warning/5 border border-warning/20 hover:bg-warning/10 hover:border-warning/40"
            : "hover:bg-surface border border-transparent"
        }`}
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          count > 0 ? "bg-warning/20 text-warning" : "bg-surface text-muted"
        }`}>
          {icon}
        </div>
        <span className="flex-1 text-sm text-foreground">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${count > 0 ? "text-warning" : "text-muted"}`}>
          {count}
        </span>
      </Link>
    </motion.div>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────

interface BarChartProps {
  points: number[];
  days: string[];
  color: string;
  gradientId: string;
  valueSuffix?: string;
  height?: number;
}

export function AdminBarChart({ points, days, color, gradientId, valueSuffix = "", height = 72 }: BarChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const hasData = points.some((v) => v > 0);
  if (!hasData) {
    return <div className="flex h-20 items-center justify-center text-xs text-muted">No data yet</div>;
  }

  const W = 300;
  const n = points.length;
  const max = Math.max(...points, 1);
  const gap = Math.max(1.5, (W / n) * 0.18);
  const barW = (W - gap * (n - 1)) / n;

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        className="h-24 w-full"
        aria-hidden="true"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id={`${gradientId}h`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {points.map((v, i) => {
          const barH = Math.max((v / max) * (height - 6), v > 0 ? 3 : 0);
          const x = i * (barW + gap);
          const y = height - barH;
          const isHovered = hoverIdx === i;
          const isDimmed = hoverIdx !== null && !isHovered;
          return (
            <g key={i}>
              {v > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={Math.min(3, barW / 2)}
                  fill={isHovered ? `url(#${gradientId}h)` : `url(#${gradientId})`}
                  opacity={isDimmed ? 0.28 : 1}
                />
              )}
              <rect x={x} y={0} width={barW + gap} height={height} fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
            </g>
          );
        })}
      </svg>

      {hoverIdx !== null && points[hoverIdx] !== undefined && (
        <div
          className="pointer-events-none absolute -top-1 z-10 rounded-lg bg-foreground/90 px-2.5 py-1.5 text-[11px] text-white shadow-xl"
          style={{ left: `${Math.min(Math.max(((hoverIdx + 0.5) / n) * 100, 8), 90)}%`, transform: "translateX(-50%)" }}
        >
          <span className="text-sm font-bold">{points[hoverIdx]}{valueSuffix}</span>
          <span className="ml-1.5 text-[10px] opacity-60">{days[hoverIdx]?.slice(5)}</span>
        </div>
      )}
    </div>
  );
}

export function AdminSparkline(props: { points: number[]; days: string[]; color: string; gradientId: string }) {
  return <AdminBarChart {...props} />;
}

// ── Platform Breakdown Bar ────────────────────────────────────────────────────

interface PlatformBarProps {
  platforms: { key: string; label: string; color: string; count: number; pct: number }[];
}

export function AdminPlatformBreakdown({ platforms }: PlatformBarProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-border">
        {platforms.map((p, i) => {
          const leftOffset = platforms.slice(0, i).reduce((s, pp) => s + pp.pct, 0);
          return (
            <motion.div
              key={p.key}
              className="absolute h-full cursor-pointer transition-all duration-200"
              style={{
                left: `${leftOffset}%`,
                width: `${p.pct}%`,
                backgroundColor: p.color,
                opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.5 : 1,
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {platforms.map((p, i) => (
          <div
            key={p.key}
            className={`flex items-center gap-1.5 transition-opacity ${
              hoveredIdx !== null && hoveredIdx !== i ? "opacity-40" : ""
            }`}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-xs text-muted">{p.label}</span>
            <span className="text-xs font-semibold text-foreground">{p.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recent Activity Item ──────────────────────────────────────────────────────

interface ActivityItemProps {
  avatar: string;
  name: string;
  action: string;
  target: string;
  time: string;
  delay?: number;
}

export function AdminActivityItem({ avatar, name, action, target, time, delay = 0 }: ActivityItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3 py-2.5"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[11px] font-bold text-white shadow-sm">
        {avatar}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">
          <span className="font-medium">{name}</span>
          <span className="text-muted"> · {action}</span>
        </p>
        <p className="text-xs text-muted truncate">{target}</p>
      </div>
      <span className="text-xs text-muted shrink-0">{time}</span>
    </motion.div>
  );
}

// ── Listing Views Area Chart (smooth curve + date axis) ──────────────────────

interface ListingViewsChartProps {
  points: number[];
  days: string[];
}

export function AdminListingViewsChart({ points, days }: ListingViewsChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const color = "#6366f1";
  const W = 600;
  const H = 100;
  const padB = 20; // bottom padding for axis labels

  const hasData = points.some((v) => v > 0);
  if (!hasData) {
    return <div className="flex h-32 items-center justify-center text-xs text-muted">Views will appear here as listings are browsed</div>;
  }

  const max = Math.max(...points, 1);
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((v) => (H - padB) - (v / max) * (H - padB) * 0.88 - (H - padB) * 0.06);

  function smoothPath(xArr: number[], yArr: number[]): string {
    if (xArr.length < 2) return "";
    let d = `M${xArr[0].toFixed(2)},${yArr[0].toFixed(2)}`;
    for (let i = 1; i < xArr.length; i++) {
      const cpX = ((xArr[i - 1] + xArr[i]) / 2).toFixed(2);
      d += ` C${cpX},${yArr[i - 1].toFixed(2)} ${cpX},${yArr[i].toFixed(2)} ${xArr[i].toFixed(2)},${yArr[i].toFixed(2)}`;
    }
    return d;
  }

  const linePath = smoothPath(xs, ys);
  const fillPath = `${linePath} L${W},${H - padB} L0,${H - padB} Z`;

  const firstLabel = days[0]?.slice(5) ?? "";
  const lastLabel  = days[days.length - 1]?.slice(5) ?? "";

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-36 w-full"
        aria-hidden="true"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="lvGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
            <stop offset="80%"  stopColor={color} stopOpacity="0.06" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={fillPath} fill="url(#lvGrad)" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {hoverIdx !== null && (
          <>
            <line x1={xs[hoverIdx]} y1={0} x2={xs[hoverIdx]} y2={H - padB} stroke={color} strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />
            <circle cx={xs[hoverIdx]} cy={ys[hoverIdx]} r="5" fill={color} />
            <circle cx={xs[hoverIdx]} cy={ys[hoverIdx]} r="3" fill="white" />
          </>
        )}

        {xs.map((x, i) => (
          <rect key={i} x={i === 0 ? 0 : (xs[i - 1] + x) / 2} y={0} width={i === 0 ? (xs[1] - xs[0]) / 2 : i === xs.length - 1 ? (x - xs[i - 1]) / 2 : x - xs[i - 1]} height={H - padB} fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
        ))}

        {/* X-axis labels */}
        <text x="2"       y={H - 3} fontSize="9" fill="currentColor" opacity="0.45" className="text-muted">{firstLabel}</text>
        <text x={W / 2}   y={H - 3} fontSize="9" fill="currentColor" opacity="0.45" textAnchor="middle" className="text-muted">30 days</text>
        <text x={W - 2}   y={H - 3} fontSize="9" fill="currentColor" opacity="0.45" textAnchor="end" className="text-muted">{lastLabel}</text>
      </svg>

      {hoverIdx !== null && points[hoverIdx] !== undefined && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-lg bg-foreground/90 px-2.5 py-1.5 text-[11px] text-white shadow-xl"
          style={{ left: `${Math.min(Math.max(((hoverIdx + 0.5) / points.length) * 100, 8), 90)}%`, transform: "translateX(-50%)" }}
        >
          <span className="text-sm font-bold">{points[hoverIdx]}</span>
          <span className="ml-1 text-[10px] opacity-60">views · {days[hoverIdx]?.slice(5)}</span>
        </div>
      )}
    </div>
  );
}

// ── Country Bar Row ───────────────────────────────────────────────────────────

interface CountryBarProps {
  code: string;
  count: number;
  pct: number;
  color?: string;
}

export function AdminCountryBar({ code, count, pct, color = "#6366f1" }: CountryBarProps) {
  const name = countryName(code);
  return (
    <div className="flex items-center gap-3">
      <CountryFlag code={code} className="w-6 h-auto rounded-sm shrink-0" />
      <span className="text-sm text-foreground w-28 truncate shrink-0">{name}</span>
      <div className="flex-1 h-2 rounded-full bg-surface-border overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 1)}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className="text-xs font-semibold text-foreground w-10 text-right tabular-nums">{count}</span>
    </div>
  );
}

// ── Section Wrapper ───────────────────────────────────────────────────────────

interface SectionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function AdminSection({ children, delay = 0, className }: SectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
