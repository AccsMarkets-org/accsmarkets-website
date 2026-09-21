"use client";

import { motion } from "framer-motion";
import { ReactNode, useState } from "react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Bell, Heart, MessageSquare, Shield } from "lucide-react";

// ── Date range picker ─────────────────────────────────────────────────────────

interface DateRangePickerProps {
  value: string;
  onChange: (v: string) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const ranges = [
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
    { key: "90d", label: "90 days" },
    { key: "all", label: "All time" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-xl border border-surface-border bg-surface p-1">
      {ranges.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            value === r.key
              ? "bg-brand-500 text-white shadow-sm"
              : "text-muted hover:text-foreground hover:bg-surface-border/50"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

// ── Section wrapper with stagger animation ────────────────────────────────────

interface SectionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function AnimatedSection({ children, delay = 0, className }: SectionProps) {
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

// ── KPI card with animated value ──────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  sub: string;
  icon: ReactNode;
  color: string;
  bg: string;
  trend?: number | null;
  delay?: number;
}

export function AnimatedKpiCard({ label, value, prefix, suffix, sub, icon, color, bg, trend, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <div className="flex flex-col gap-2 rounded-2xl border border-surface-border bg-surface-card p-4 transition group-hover:border-brand-300 group-hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}>
            {icon}
          </div>
          {trend !== null && trend !== undefined && (
            <span className={`text-[10px] font-bold ${trend >= 0 ? "text-success" : "text-danger"}`}>
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
            </span>
          )}
        </div>
        <div className="text-2xl font-bold leading-none text-foreground">
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} duration={1000} />
        </div>
        <p className="text-xs text-muted leading-tight">{label}</p>
        <p className="text-[10px] text-muted/70 leading-tight">{sub}</p>
      </div>
    </motion.div>
  );
}

// ── Notification feed ─────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
}

export function NotificationFeed({ items }: { items: NotificationItem[] }) {
  if (items.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted">All caught up!</div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "OFFER_RECEIVED":
        return <Heart className="h-4 w-4 text-brand-500" aria-hidden />;
      case "ESCROW_UPDATE":
        return <Shield className="h-4 w-4 text-success" aria-hidden />;
      case "MESSAGE":
        return <MessageSquare className="h-4 w-4 text-blue-500" aria-hidden />;
      default:
        return <Bell className="h-4 w-4 text-muted" aria-hidden />;
    }
  };

  const relTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="flex flex-col divide-y divide-surface-border">
      {items.map((n) => (
        <div key={n.id} className="flex items-start gap-2.5 py-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-border/50">
            {getIcon(n.type)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground leading-tight line-clamp-1">{n.title}</p>
            <p className="text-[11px] text-muted line-clamp-1">{n.body}</p>
          </div>
          <span className="shrink-0 text-[10px] text-muted">{relTime(n.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Goal progress ─────────────────────────────────────────────────────────────

interface GoalProps {
  label: string;
  current: number;
  target: number;
  icon: ReactNode;
}

export function GoalProgress({ label, current, target, icon }: GoalProps) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium text-foreground">{label}</span>
          <span className="text-muted">{current}/{target}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
          <motion.div
            className="h-1.5 rounded-full bg-brand-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Interactive sparkline with hover ──────────────────────────────────────────

interface SparklineProps {
  points: number[];
  days: string[];
  width?: number;
  height?: number;
}

export function InteractiveSparkline({ points, days, width = 600, height = 80 }: SparklineProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (points.length < 2) {
    return <div className="flex h-20 items-center justify-center text-xs text-muted">No data yet</div>;
  }

  const max = Math.max(...points, 1);
  const pad = { top: 8, bottom: 4 };
  const xs = points.map((_, i) => (i / (points.length - 1)) * width);
  const ys = points.map((v) => pad.top + (1 - v / max) * (height - pad.top - pad.bottom));

  // Smooth bezier curve (catmull-rom → cubic bezier)
  function smoothPath(xArr: number[], yArr: number[]): string {
    if (xArr.length < 2) return "";
    let d = `M${xArr[0].toFixed(2)},${yArr[0].toFixed(2)}`;
    for (let i = 1; i < xArr.length; i++) {
      const x0 = xArr[i - 1], y0 = yArr[i - 1];
      const x1 = xArr[i], y1 = yArr[i];
      const cpX = (x0 + x1) / 2;
      d += ` C${cpX.toFixed(2)},${y0.toFixed(2)} ${cpX.toFixed(2)},${y1.toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}`;
    }
    return d;
  }

  const linePath = smoothPath(xs, ys);
  const fillPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-24 w-full"
        aria-hidden="true"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="ytGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18"/>
            <stop offset="75%" stopColor="#6366f1" stopOpacity="0.05"/>
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={0} y1={(pad.top + (1 - t) * (height - pad.top - pad.bottom)).toFixed(1)}
            x2={width} y2={(pad.top + (1 - t) * (height - pad.top - pad.bottom)).toFixed(1)}
            stroke="currentColor" strokeOpacity="0.06" strokeWidth="1"
          />
        ))}

        {/* Gradient fill */}
        <path d={fillPath} fill="url(#ytGrad)"/>

        {/* Smooth line */}
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>

        {/* Hover vertical line + dot */}
        {hoverIdx !== null && (
          <>
            <line
              x1={xs[hoverIdx]} y1={pad.top} x2={xs[hoverIdx]} y2={height}
              stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4,4" strokeOpacity="0.4"
            />
            <circle cx={xs[hoverIdx]} cy={ys[hoverIdx]} r="5" fill="#6366f1"/>
            <circle cx={xs[hoverIdx]} cy={ys[hoverIdx]} r="3" fill="white"/>
          </>
        )}

        {/* Invisible hover zones */}
        {xs.map((x, i) => (
          <rect
            key={i}
            x={i === 0 ? 0 : (xs[i - 1] + x) / 2}
            y={0}
            width={i === 0 ? (xs[1] - xs[0]) / 2 : i === xs.length - 1 ? (x - xs[i - 1]) / 2 : (x - xs[i - 1])}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hoverIdx !== null && (
        <div
          className="pointer-events-none absolute -top-1 z-10 rounded-lg bg-foreground/90 px-2.5 py-1.5 text-[11px] text-white shadow-xl"
          style={{
            left: `${Math.min(Math.max((xs[hoverIdx] / width) * 100, 8), 88)}%`,
            transform: "translateX(-50%)",
          }}
        >
          <span className="font-bold text-sm">{points[hoverIdx]}</span>
          <span className="ml-1.5 opacity-60 text-[10px]">{days[hoverIdx]?.slice(5)}</span>
        </div>
      )}
    </div>
  );
}
