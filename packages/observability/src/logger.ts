import type { LoggerService } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import pino, { type Logger as PinoLogger } from "pino";
import pretty from "pino-pretty";
import type { LogLevel } from "./levels.js";

export interface CreateLoggerOptions {
  level: LogLevel;
  /** Human-readable lines for local/turbo; JSON otherwise. */
  pretty: boolean;
  service: string;
}

/**
 * Root pino logger. Prefer Nest's `Logger` (backed by {@link PinoNestLogger})
 * inside Nest code; use this only at bootstrap or outside DI.
 */
export function createPinoLogger(options: CreateLoggerOptions): PinoLogger {
  const base = { service: options.service };
  const opts = {
    level: options.level,
    base,
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (!options.pretty) {
    return pino(opts);
  }

  // Stream destination (not worker transport) so Bun/turbo keep a single
  // stdout pipe without a pino-pretty worker thread.
  const stream = pretty({
    colorize: true,
    translateTime: "HH:MM:ss.l",
    ignore: "pid,hostname",
    singleLine: true,
  });
  return pino(opts, stream);
}

/**
 * Nest `LoggerService` that writes through pino so Nest's `new Logger(context)`
 * and `app.useLogger(...)` share one pipeline (levels, pretty/JSON, correlation).
 */
export class PinoNestLogger implements LoggerService {
  constructor(private readonly root: PinoLogger) {}

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write("info", message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write("error", message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write("warn", message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write("debug", message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write("trace", message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write("fatal", message, optionalParams);
  }

  /**
   * Replace Nest's default console logger process-wide. Call once at bootstrap
   * before `NestFactory.create` so early framework logs use pino too.
   */
  static overrideNestLogger(root: PinoLogger): PinoNestLogger {
    const adapter = new PinoNestLogger(root);
    Logger.overrideLogger(adapter);
    return adapter;
  }

  private write(
    level: LogLevel,
    message: unknown,
    optionalParams: unknown[]
  ): void {
    const { context, err, rest } = splitParams(optionalParams);
    // Nest's route-map dump is useful once while wiring a controller, noise
    // every boot in turbo — demote to debug unless LOG_LEVEL is already debug+.
    const effectiveLevel =
      level === "info" && context && NEST_BOOTSTRAP_CONTEXTS.has(context)
        ? "debug"
        : level;
    const child = context ? this.root.child({ context }) : this.root;
    const msg = formatMessage(message);

    if ((effectiveLevel === "error" || effectiveLevel === "fatal") && err) {
      child[effectiveLevel](
        { err, ...(rest.length > 0 ? { detail: rest } : {}) },
        msg
      );
      return;
    }

    if (rest.length > 0) {
      child[effectiveLevel]({ detail: rest }, msg);
      return;
    }
    child[effectiveLevel](msg);
  }
}

/** Nest contexts that spam one line per route at boot. */
const NEST_BOOTSTRAP_CONTEXTS = new Set([
  "InstanceLoader",
  "RoutesResolver",
  "RouterExplorer",
]);

function formatMessage(message: unknown): string {
  if (typeof message === "string") {
    return message;
  }
  if (message instanceof Error) {
    return message.message;
  }
  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
}

/**
 * Nest's Logger passes `(message, context)` or for errors
 * `(message, stackOrError, context)`. Peel the trailing string context and an
 * optional Error/stack for structured fields.
 */
function splitParams(optionalParams: unknown[]): {
  context?: string;
  err?: Error;
  rest: unknown[];
} {
  if (optionalParams.length === 0) {
    return { rest: [] };
  }

  const last = optionalParams.at(-1);
  let context: string | undefined;
  let params = optionalParams;

  if (typeof last === "string" && optionalParams.length >= 1) {
    context = last;
    params = optionalParams.slice(0, -1);
  }

  const withContext = <T extends Record<string, unknown>>(
    value: T
  ): T & { context?: string } =>
    context === undefined ? value : { ...value, context };

  const [first, ...rest] = params;
  if (first instanceof Error) {
    return withContext({ err: first, rest });
  }
  if (typeof first === "string" && looksLikeStack(first)) {
    const err = new Error(first.split("\n")[0] ?? first);
    err.stack = first;
    return withContext({ err, rest });
  }

  return withContext({ rest: params });
}

function looksLikeStack(value: string): boolean {
  return value.includes("\n") && value.includes("    at ");
}
