"use client";

import { formatDate } from "@/lib/utils";
import { PHASE_LABELS } from "@/lib/dispute-phases";
import { Dot, FileText, Gavel, Handshake, RefreshCw, Scale, Siren, type LucideIcon } from "lucide-react";

interface TimelineEvent {
  id: string;
  eventType: string;
  actorId: string | null;
  description: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

const EVENT_ICONS: Record<string, LucideIcon> = {
  phase_change:      RefreshCw,
  mediation_offer:   Handshake,
  appeal_submitted:  Scale,
  evidence_added:    FileText,
  ruling_issued:     Gavel,
  dispute_opened:    Siren,
};

export function DisputeTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted italic">No timeline events yet.</p>;
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[18px] top-0 h-full w-0.5 bg-surface-border" />

      {events.map((event, i) => {
        const Icon = EVENT_ICONS[event.eventType] ?? Dot;
        return (
        <div key={event.id} className="relative flex gap-4 pb-4">
          {/* Circle */}
          <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-background
            ${i === 0 ? "border-brand-400 text-brand-500" : "border-surface-border text-muted"}`}>
            <Icon className="h-4 w-4" aria-hidden />
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <p className="text-sm text-foreground leading-snug">{event.description}</p>
            <p className="mt-0.5 text-xs text-muted">{formatDate(event.createdAt)}</p>
          </div>
        </div>
        );
      })}
    </div>
  );
}
