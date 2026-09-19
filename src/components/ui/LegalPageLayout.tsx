"use client";

import { motion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
}

interface Props {
  title: string;
  subtitle?: string;
  updatedAt?: string;
  sections?: Section[];
  children: ReactNode;
}

export function LegalPageLayout({ title, subtitle, updatedAt, sections, children }: Props) {
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    if (!sections?.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex gap-10">
        {/* TOC sidebar — desktop only */}
        {sections && sections.length > 0 && (
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="sticky top-24 flex flex-col gap-1">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Contents</p>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm transition-all",
                    activeSection === s.id
                      ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950/30 dark:text-brand-400"
                      : "text-muted hover:text-foreground hover:bg-surface",
                  )}
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {updatedAt && (
              <span className="inline-block rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-muted mb-4 border border-surface-border">
                Last updated: {updatedAt}
              </span>
            )}
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-lg text-muted">{subtitle}</p>}
          </motion.div>

          <div className="mt-10 flex flex-col gap-8 text-[15px] leading-relaxed text-foreground/90 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-2 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-1 [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:space-y-1.5 [&_li]:text-foreground/85 [&_strong]:text-foreground [&_strong]:font-semibold">
            {children}
          </div>
        </main>
      </div>

      {/* Back to top */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-background shadow-card text-muted hover:text-foreground hover:shadow-lg transition-all"
        aria-label="Back to top"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}

export function LegalSection({ id, icon, title, children }: { id: string; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="scroll-mt-24"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 shrink-0">
          {icon}
        </div>
        <h2 className="!mt-0 !mb-0">{title}</h2>
      </div>
      <div className="pl-11">
        {children}
      </div>
    </motion.section>
  );
}
