import type { DecodeWarning, ParseWarning } from '@cbortech/cbor';

/**
 * Append location information (byte offset or line/column) to a warning
 * message, unless the message already carries its own location.
 */
export function describeWarning(warning: DecodeWarning | ParseWarning): string {
  if (/\b(offset|line)\b/.test(warning.message)) return warning.message;
  if ('line' in warning && warning.line !== undefined) {
    const col =
      warning.column !== undefined ? `, column ${warning.column}` : '';
    return `${warning.message} (line ${warning.line}${col})`;
  }
  if (warning.offset !== undefined) {
    return `${warning.message} (byte offset ${warning.offset})`;
  }
  return warning.message;
}

export function printWarning(warning: DecodeWarning | ParseWarning): void {
  process.stderr.write(`cbor: warning: ${describeWarning(warning)}\n`);
}

/**
 * Warning-handling options for decode/parse calls.
 *
 * In strict mode violations throw, so the default `console.warn` would print
 * the same message twice — suppress it and let the thrown error speak.
 * In non-strict mode processing continues, so surface each violation on stderr.
 */
export function warningOpts(strict: boolean): {
  strict: boolean;
  silent?: boolean;
  onWarning?: (warning: DecodeWarning | ParseWarning) => void;
} {
  return strict
    ? { strict, silent: true }
    : { strict, onWarning: printWarning };
}

/** Report a fatal error on stderr and mark the process as failed. */
export function fail(err: unknown): void {
  process.stderr.write(
    `cbor: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exitCode = 1;
}
