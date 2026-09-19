"use client";

import { usePresence } from "@/hooks/usePresence";

export function PresencePing() {
  usePresence();
  return null;
}
