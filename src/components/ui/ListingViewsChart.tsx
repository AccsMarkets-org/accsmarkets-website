"use client";

import { useState } from "react";

interface ListingViewsChartProps {
  points: number[];
  days: string[];
}

export function ListingViewsChart({ points, days }: ListingViewsChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const color = "#6366f1";
  const W = 600;
  const H = 110;
  const padB = 20;

  const hasData = points.some((v) => v > 0);
  if (!hasData) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted">
        Views will appear here as listings are browsed
      </div>
    );
  }

  const max = Math.max(...points, 1);
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map(
    (v) => (H - padB) - (v / max) * (H - padB) * 0.88 - (H - padB) * 0.06
  );

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
  const lastLabel = days[days.length - 1]?.slice(5) ?? "";

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
          <linearGradient id="lvSharedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
            <stop offset="75%"  stopColor={color} stopOpacity="0.07" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={fillPath} fill="url(#lvSharedGrad)" />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hoverIdx !== null && (
          <>
            <line
              x1={xs[hoverIdx]} y1={0}
              x2={xs[hoverIdx]} y2={H - padB}
              stroke={color} strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5"
            />
            <circle cx={xs[hoverIdx]} cy={ys[hoverIdx]} r="5" fill={color} />
            <circle cx={xs[hoverIdx]} cy={ys[hoverIdx]} r="3" fill="white" />
          </>
        )}

        {xs.map((x, i) => (
          <rect
            key={i}
            x={i === 0 ? 0 : (xs[i - 1] + x) / 2}
            y={0}
            width={
              i === 0
                ? (xs[1] - xs[0]) / 2
                : i === xs.length - 1
                ? (x - xs[i - 1]) / 2
                : x - xs[i - 1]
            }
            height={H - padB}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}

        {/* X-axis labels */}
        <text x="2"     y={H - 3} fontSize="9" fill="currentColor" opacity="0.4">{firstLabel}</text>
        <text x={W / 2} y={H - 3} fontSize="9" fill="currentColor" opacity="0.4" textAnchor="middle">30 days</text>
        <text x={W - 2} y={H - 3} fontSize="9" fill="currentColor" opacity="0.4" textAnchor="end">{lastLabel}</text>
      </svg>

      {hoverIdx !== null && points[hoverIdx] !== undefined && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-lg bg-foreground/90 px-2.5 py-1.5 text-[11px] text-white shadow-xl"
          style={{
            left: `${Math.min(Math.max(((hoverIdx + 0.5) / points.length) * 100, 8), 90)}%`,
            transform: "translateX(-50%)",
          }}
        >
          <span className="text-sm font-bold">{points[hoverIdx]}</span>
          <span className="ml-1 text-[10px] opacity-60">views · {days[hoverIdx]?.slice(5)}</span>
        </div>
      )}
    </div>
  );
}
