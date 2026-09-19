"use client";

import { useState, useCallback } from "react";
import { Dialog } from "@/components/ui/Dialog";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [resolve, setResolve] = useState<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((res) => {
      setOpts(options);
      setResolve(() => res);
    });
  }, []);

  function handleConfirm() {
    resolve?.(true);
    setOpts(null);
    setResolve(null);
  }

  function handleCancel() {
    resolve?.(false);
    setOpts(null);
    setResolve(null);
  }

  const ConfirmDialog = opts ? (
    <Dialog
      open={true}
      title={opts.title}
      description={opts.description}
      confirmLabel={opts.confirmLabel}
      cancelLabel={opts.cancelLabel}
      destructive={opts.destructive}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, ConfirmDialog };
}
