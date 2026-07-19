import type { DecodeWarning, ParseWarning } from '@cbortech/cbor';

/** Anything carrying a message plus optional position fields (warnings, `CdnSyntaxError`, …). */
interface Located {
  message: string;
  offset?: number;
  line?: number;
  column?: number;
}

/**
 * Append location information (byte offset or line/column) to a warning
 * message, unless the message already carries its own location.
 */
export function describeWarning(
  warning: DecodeWarning | ParseWarning | Located
): string {
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
 * Warning handling for a single decode/parse operation.
 *
 * In non-strict mode processing continues, so `opts.onWarning` surfaces each
 * violation on stderr immediately (and `flush()` is a no-op). In strict mode
 * a violation warns and then throws with the same message, so printing right
 * away would duplicate the error — instead the warnings are buffered in this
 * collector, and `flush()` (call it after the operation succeeds) prints only
 * the ones that did not become errors, e.g. a disabled app-extension prefix
 * being wrapped in a CPA999 tag. On failure, skip `flush()` — the thrown
 * error already tells the story.
 *
 * Each call returns an independent buffer, so warnings never leak between
 * operations in the same process.
 */
export function collectWarnings(strict: boolean): {
  opts: {
    strict: boolean;
    onWarning: (warning: DecodeWarning | ParseWarning) => void;
  };
  flush: () => void;
} {
  if (!strict) {
    return { opts: { strict, onWarning: printWarning }, flush: () => {} };
  }
  const pending: string[] = [];
  return {
    opts: {
      strict,
      onWarning: (warning) => pending.push(describeWarning(warning)),
    },
    flush: () => {
      for (const msg of pending) {
        process.stderr.write(`cbor: warning: ${msg}\n`);
      }
      pending.length = 0;
    },
  };
}

/**
 * Report a fatal error on stderr and mark the process as failed. Errors that
 * carry position fields (e.g. `CdnSyntaxError`) get them appended to the
 * message unless it already names a location.
 */
export function fail(err: unknown): void {
  const msg = err instanceof Error ? describeWarning(err) : String(err);
  process.stderr.write(`cbor: ${msg}\n`);
  process.exitCode = 1;
}
