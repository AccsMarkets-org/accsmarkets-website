"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function SettingsSection({ children, delay = 0, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedRing({ score }: { score: number }) {
  const color = score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-danger";
  return (
    <div className="relative flex h-14 w-14 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="4" className="text-surface-border" />
        <motion.circle
          cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="4"
          className={color}
          strokeLinecap="round"
          initial={{ strokeDasharray: "0 138.2" }}
          animate={{ strokeDasharray: `${(score / 100) * 138.2} 138.2` }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <motion.span
        className={`text-sm font-bold ${color}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        {score}
      </motion.span>
    </div>
  );
}
