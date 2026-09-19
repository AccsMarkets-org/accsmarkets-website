"use client";

import { motion } from "framer-motion";
import { Children, ReactNode } from "react";

export function DeveloperPortalSections({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          {child}
        </motion.div>
      ))}
    </>
  );
}
