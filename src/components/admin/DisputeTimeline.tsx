"use client";

import { formatDate } from "@/lib/utils";
import { PHASE_LABELS } from "@/lib/dispute-phases";

interface TimelineEvent {
  id: string;
  eventType: string;
  actorId: string | null;
  description: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

const EVENT_ICONS: Record<string, string> = {
  phase_change:      "🔄",
  mediation_offer:   "🤝",
  appeal_submitted:  "⚖️",
  evidence_added:    "📄",
  ruling_issued:     "🔨",
  dispute_opened:    "🚨",
};

export function DisputeTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted italic">No timeline events yet.</p>;
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[18px] top-0 h-full w-0.5 bg-surface-border" />

      {events.map((event, i) => (
        <div key={event.id} className="relative flex gap-4 pb-4">
          {/* Circle */}
          <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-background text-base
            ${i === 0 ? "border-brand-400" : "border-surface-border"}`}>
            {EVENT_ICONS[event.eventType] ?? "•"}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <p className="text-sm text-foreground leading-snug">{event.description}</p>
            <p className="mt-0.5 text-xs text-muted">{formatDate(event.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
