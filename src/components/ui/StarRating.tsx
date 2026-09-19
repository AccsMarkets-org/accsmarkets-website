"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  className?: string;
}

export function StarRating({ value, onChange, size = 20, className }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const interactive = !!onChange;
  const display = interactive && hovered ? hovered : value;

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill={display >= star ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.5}
          className={cn(
            "transition-colors",
            display >= star ? "text-brand-500" : "text-surface-border",
            interactive && "cursor-pointer",
          )}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onChange?.(star)}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      ))}
    </span>
  );
}
