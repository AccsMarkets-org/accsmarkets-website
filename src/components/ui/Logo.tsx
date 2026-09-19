"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, href = "/", size = "md" }: LogoProps) {
  return (
    <Link href={href} className={cn("logo-root group inline-flex items-center gap-2.5 select-none", className)}>
      <LogoMark size={size} />
      <span
        className={cn(
          "logo-wordmark font-black tracking-tight text-foreground",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-xl",
        )}
      >
        <span className="text-brand-500">Accs</span>
        <span className="text-brand-700 dark:text-brand-400">Markets</span>
      </span>
    </Link>
  );
}

interface MarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = { sm: 28, md: 32, lg: 40 };

export function LogoMark({ size = "md", className }: MarkProps) {
  const dim = sizeMap[size];

  return (
    <span
      className={cn("logo-mark relative shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105", className)}
      style={{ width: dim, height: dim }}
    >
      {/* Glow ring on hover */}
      <span className="absolute inset-0 rounded-xl bg-brand-500 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-40" />

      <Image
        src="/logo.png"
        alt="AccsMarkets"
        width={dim}
        height={dim}
        priority
        className="relative h-full w-full object-contain drop-shadow-md"
      />
    </span>
  );
}
