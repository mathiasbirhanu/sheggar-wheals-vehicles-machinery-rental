// Structured JSON logger (NFR observability). One line per event so any log
// shipper (Loki, Datadog, CloudWatch…) can parse without custom grok patterns.
// In production only info/warn/error pass through; debug is dev-only.
type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = process.env.NODE_ENV === "production" ? LEVELS.info : LEVELS.debug;

function emit(level: Level, scope: string, message: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < threshold) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope,
    msg: message,
    ...(meta ? { meta } : {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger(scope: string) {
  return {
    debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", scope, msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => emit("info", scope, msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", scope, msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => emit("error", scope, msg, meta),
  };
}

export const logger = createLogger("app");
