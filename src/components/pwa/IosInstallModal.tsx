"use client";

import { motion, AnimatePresence } from "framer-motion";

interface IosInstallModalProps {
  onDismiss: () => void;
  appName?: string;
}

const STEPS = [
  {
    icon: (
      <svg className="h-6 w-6 text-brand-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <polyline points="16 6 12 2 8 6"/>
        <line x1="12" y1="2" x2="12" y2="15"/>
      </svg>
    ),
    label: "Tap the Share button",
    sub: 'Look for the "share" icon in the Safari toolbar',
  },
  {
    icon: (
      <svg className="h-6 w-6 text-brand-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
    label: 'Select "Add to Home Screen"',
    sub: "Scroll down in the share sheet to find it",
  },
  {
    icon: (
      <svg className="h-6 w-6 text-brand-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    label: 'Tap "Add"',
    sub: "will appear on your home screen",
  },
];

export function IosInstallModal({ onDismiss, appName = "AccsMarkets" }: IosInstallModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        key="ios-install-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onDismiss}
      />
      <motion.div
        key="ios-install-sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-background shadow-2xl"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted/30" />
        </div>

        <div className="px-6 pt-3 pb-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-500 mb-0.5">{appName}</p>
              <h2 className="text-lg font-bold text-foreground">Add to Home Screen</h2>
              <p className="text-sm text-muted mt-0.5">Get instant access like a native app</p>
            </div>
            <button
              onClick={onDismiss}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 dark:bg-brand-950">
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    <span className="text-brand-500 mr-1">{i + 1}.</span>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {i === STEPS.length - 1 ? `${appName} ${step.sub}` : step.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onDismiss}
            className="mt-6 w-full rounded-xl border border-surface-border py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface"
          >
            Maybe later
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
