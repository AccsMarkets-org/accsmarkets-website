"use client";

interface Props {
  password: string;
}

function score(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: "", color: "bg-surface-border" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { level: 1, label: "Weak", color: "bg-danger" };
  if (s <= 3) return { level: 2, label: "Fair", color: "bg-warning" };
  if (s === 4) return { level: 3, label: "Good", color: "bg-brand-400" };
  return { level: 4, label: "Strong", color: "bg-success" };
}

export function PasswordStrength({ password }: Props) {
  const { level, label, color } = score(password);
  if (!password) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= level ? color : "bg-surface-border"}`}
          />
        ))}
      </div>
      <p className={`text-xs ${level <= 1 ? "text-danger" : level === 2 ? "text-warning-foreground" : "text-success"}`}>
        {label}
      </p>
    </div>
  );
}
