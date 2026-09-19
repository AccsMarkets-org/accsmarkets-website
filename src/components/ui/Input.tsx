import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            // text-base (16px), not text-sm — iOS Safari auto-zooms the whole
            // page on focus for any input under 16px, which is what made
            // every form field feel "buggy" when tapped on an iPhone.
            "h-10 rounded-xl border border-surface-border bg-background px-3 text-base text-foreground placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:text-sm",
            error && "border-danger focus:border-danger focus:ring-danger/10",
            className,
          )}
          {...props}
        />
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    );
  },
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "rounded-xl border border-surface-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:text-sm",
            error && "border-danger focus:border-danger focus:ring-danger/10",
            className,
          )}
          {...props}
        />
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
