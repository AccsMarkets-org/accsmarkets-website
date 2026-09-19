"use client";

import { useState } from "react";

export function PhotoGallery({ screenshots }: { screenshots: string[] }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (screenshots.length === 0) return null;

  return (
    <div>
      {/* Main image */}
      <div
        className="group relative cursor-zoom-in overflow-hidden rounded-2xl"
        style={{ aspectRatio: "16/9" }}
        onClick={() => setLightbox(active)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshots[active]}
          alt={`Screenshot ${active + 1}`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
            🔍 Expand
          </span>
        </div>
        {screenshots.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setActive((v) => (v - 1 + screenshots.length) % screenshots.length); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/70"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActive((v) => (v + 1) % screenshots.length); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/70"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </>
        )}
        <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
          {active + 1} / {screenshots.length}
        </span>
      </div>

      {/* Thumbnails */}
      {screenshots.length > 1 && (
        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
          {screenshots.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              className={`shrink-0 overflow-hidden rounded-xl transition-all duration-200 ${
                i === active
                  ? "ring-2 ring-brand-500 ring-offset-1 scale-105"
                  : "opacity-60 hover:opacity-90"
              }`}
              style={{ width: 72, height: 48 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Thumb ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          {screenshots.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((v) => v !== null ? (v - 1 + screenshots.length) % screenshots.length : 0); }}
                className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((v) => v !== null ? (v + 1) % screenshots.length : 0); }}
                className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshots[lightbox]}
            alt="Full screenshot"
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/60">
            {lightbox + 1} / {screenshots.length}
          </p>
        </div>
      )}
    </div>
  );
}
