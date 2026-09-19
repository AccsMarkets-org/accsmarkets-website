type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

function write(level: LogLevel, msg: string, ctx?: Record<string, unknown>): void {
  const entry: LogEntry = { level, msg, ts: new Date().toISOString(), ...ctx };
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => write("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => write("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => write("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => write("error", msg, ctx),
  /** Returns a child logger that always merges the given context fields. */
  child: (base: Record<string, unknown>) => ({
    debug: (msg: string, ctx?: Record<string, unknown>) => write("debug", msg, { ...base, ...ctx }),
    info: (msg: string, ctx?: Record<string, unknown>) => write("info", msg, { ...base, ...ctx }),
    warn: (msg: string, ctx?: Record<string, unknown>) => write("warn", msg, { ...base, ...ctx }),
    error: (msg: string, ctx?: Record<string, unknown>) => write("error", msg, { ...base, ...ctx }),
  }),
};
