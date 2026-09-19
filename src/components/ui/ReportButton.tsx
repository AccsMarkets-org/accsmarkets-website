"use client";

import { useState } from "react";
import { ReportModal } from "@/components/ui/ReportModal";

type TargetType = "LISTING" | "USER" | "MESSAGE";

interface Props {
  targetType: TargetType;
  targetId: string;
  label?: string;
}

export function ReportButton({ targetType, targetId, label = "Report" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted hover:text-danger transition-colors underline"
      >
        {label}
      </button>
      {open && (
        <ReportModal targetType={targetType} targetId={targetId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
