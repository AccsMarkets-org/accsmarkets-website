import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: number;
  badgeUrgent?: boolean;
}

export function AdminPageHeader({ title, subtitle, actions, badge, badgeUrgent }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold truncate">{title}</h1>
          {badge != null && badge > 0 && (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-bold leading-none",
                badgeUrgent
                  ? "bg-danger text-white"
                  : "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400",
              )}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
