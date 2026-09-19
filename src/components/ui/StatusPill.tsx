import { cn } from "@/lib/utils";

export function StatusPill({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", className)}>
      {label}
    </span>
  );
}
