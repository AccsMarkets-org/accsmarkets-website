"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ListingCard, type ListingCardData } from "@/components/listings/ListingCard";

export function FeaturedListings({ listings }: { listings: ListingCardData[] }) {
  if (listings.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-end justify-between"
      >
        <div>
          <span className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            Marketplace
          </span>
          <h2 className="mt-2 text-3xl font-bold">Fresh listings</h2>
        </div>
        <Link href="/listings" className="text-sm font-semibold text-brand-600 hover:underline">
          View all →
        </Link>
      </motion.div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {listings.map((listing, i) => (
          <motion.div
            key={listing.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07, duration: 0.45 }}
          >
            <ListingCard listing={listing} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
