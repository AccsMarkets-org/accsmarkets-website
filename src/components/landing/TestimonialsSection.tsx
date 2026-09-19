"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { StarRating } from "@/components/ui/StarRating";

export interface Testimonial {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer: { username: string | null; name: string | null; image: string | null };
  reviewee: { username: string | null; name: string | null };
}

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center"
      >
        <h2 className="text-3xl font-black tracking-tight text-foreground">What buyers &amp; sellers say</h2>
        <p className="mt-2 text-sm text-muted">Real reviews from completed, escrow-protected transactions.</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="flex flex-col rounded-2xl border border-surface-border bg-background p-5"
          >
            <StarRating value={t.rating} size={14} />
            <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/85">&ldquo;{t.comment}&rdquo;</p>
            <div className="mt-4 flex items-center gap-2.5 border-t border-surface-border pt-4">
              {t.reviewer.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.reviewer.image} alt={t.reviewer.name ?? t.reviewer.username ?? ""} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600 dark:bg-brand-900/50">
                  {(t.reviewer.name ?? t.reviewer.username ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">{t.reviewer.name ?? t.reviewer.username}</p>
                <p className="truncate text-[11px] text-muted">
                  on {t.reviewee.name ?? t.reviewee.username}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link href="/sellers" className="text-sm font-semibold text-brand-500 hover:text-brand-600">
          Browse verified sellers →
        </Link>
      </div>
    </section>
  );
}
