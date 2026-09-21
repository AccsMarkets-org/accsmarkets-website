"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface Announcement {
  id: string;
  type: string;
  message: string;
  linkUrl: string | null;
  linkText: string | null;
}

const TYPE_STYLE: Record<string, string> = {
  INFO:    "bg-brand-500/10 border-brand-500/20 text-brand-700 dark:text-brand-400 dark:text-brand-300",
  WARNING: "bg-warning/10 border-warning/30 text-amber-800 dark:text-amber-300",
  SUCCESS: "bg-success/10 border-success/30 text-green-800 dark:text-green-300",
};

const STORAGE_KEY = "dismissed_announcements";

function getDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}

function dismiss(id: string) {
  try {
    const list = getDismissed();
    if (!list.includes(id)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...list, id]));
    }
  } catch {}
}

/**
 * One banner row. Below `sm` the message is clamped to two lines so a long
 * announcement can't eat a third of a phone screen; a "More"/"Less" toggle
 * appears only when the text actually overflows. From `sm` up it shows in full.
 */
function AnnouncementRow({ ann, onClose }: { ann: Announcement; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    // Only meaningful while clamped — when expanded, keep the toggle so the
    // user can collapse it again.
    function measure() {
      if (!el || expanded) return;
      setOverflowing(el.scrollHeight > el.clientHeight + 1);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [ann.message, expanded]);

  const style = TYPE_STYLE[ann.type] ?? TYPE_STYLE.INFO;
  const textId = `announcement-${ann.id}`;

  return (
    <div className={`flex items-start justify-between gap-3 border-b px-4 py-2 text-sm sm:items-center ${style}`}>
      <div className="min-w-0 flex-1">
        <span
          id={textId}
          ref={textRef}
          className={`break-words sm:line-clamp-none ${expanded ? "block" : "line-clamp-2"}`}
        >
          {ann.message}
          {ann.linkUrl && (
            <a href={ann.linkUrl} target="_blank" rel="noopener noreferrer" className="ml-2 font-medium underline">
              {ann.linkText ?? "Learn more"}
            </a>
          )}
        </span>
        {(overflowing || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={textId}
            className="mt-0.5 rounded text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current sm:hidden"
          >
            {expanded ? "Less" : "More"}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-current opacity-60 transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    function load() {
      fetch("/api/announcements")
        .then((r) => r.json())
        .then((data) => {
          const dismissed = getDismissed();
          setAnnouncements((data.announcements ?? []).filter((a: Announcement) => !dismissed.includes(a.id)));
        })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  function close(id: string) {
    dismiss(id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  if (announcements.length === 0) return null;

  return (
    <div className="flex flex-col gap-0">
      {announcements.map((ann) => (
        <AnnouncementRow key={ann.id} ann={ann} onClose={() => close(ann.id)} />
      ))}
    </div>
  );
}
