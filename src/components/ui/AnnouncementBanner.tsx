"use client";

import { useEffect, useState } from "react";

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
  const list = getDismissed();
  if (!list.includes(id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...list, id]));
  }
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
      {announcements.map((ann) => {
        const style = TYPE_STYLE[ann.type] ?? TYPE_STYLE.INFO;
        return (
          <div key={ann.id} className={`flex items-center justify-between gap-3 border-b px-4 py-2 text-sm ${style}`}>
            <span>
              {ann.message}
              {ann.linkUrl && (
                <a href={ann.linkUrl} target="_blank" rel="noopener noreferrer" className="ml-2 font-medium underline">
                  {ann.linkText ?? "Learn more"}
                </a>
              )}
            </span>
            <button onClick={() => close(ann.id)} aria-label="Dismiss" className="shrink-0 text-current opacity-60 hover:opacity-100">
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
