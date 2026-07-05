import { defineCommand, runMain } from 'citty';
import { VERSION } from './version.js';
import compile from './commands/compile.js';
import decompile, { decompileArgs } from './commands/decompile.js';
import format from './commands/format.js';
import toHex from './commands/toHex.js';
import fromHex from './commands/fromHex.js';
import validate from './commands/validate.js';

const subCommands = {
  compile,
  decompile,
  format,
  toHex,
  fromHex,
  validate,
};

const main = defineCommand({
  meta: {
    name: 'cbor',
    description:
      'Convert between CBOR binary data, CDN (Concise Diagnostic Notation) text, and annotated hex dumps. ' +
      'When no command is given, input is decompiled: `cbor input.cbor` prints CDN text.',
    version: VERSION,
  },
  subCommands,
});

/**
 * Flags of `decompile` that consume a value, so the argv scan below can tell
 * `cbor --indent 0 input.cbor` apart from `cbor --strict input.cbor`.
 * Normalized with {@link normalizeFlag} (accepts both kebab- and camelCase).
 */
const decompileValueFlags = new Set(
  Object.entries(decompileArgs).flatMap(([name, def]) =>
    'type' in def && def.type === 'string'
      ? [name, ...('alias' in def && def.alias ? [def.alias] : [])].map(
          normalizeFlag
        )
      : []
  )
);

function normalizeFlag(flag: string): string {
  return flag.replace(/^-+/, '').replace(/-/g, '').toLowerCase();
}

/**
 * Locate the first positional argument, skipping flags (and the values of
 * decompile's value-taking flags). A bare `-` counts as positional (stdin).
 * Returns the index, or -1 if there is none; `afterDoubleDash` is true when
 * the positional follows a `--` terminator and thus can never be a
 * subcommand name.
 */
function firstPositionalIndex(rawArgs: string[]): {
  index: number;
  afterDoubleDash: boolean;
} {
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i]!;
    if (arg === '--') {
      return {
        index: i + 1 < rawArgs.length ? i + 1 : -1,
        afterDoubleDash: true,
      };
    }
    if (arg !== '-' && arg.startsWith('-')) {
      if (!arg.includes('=') && decompileValueFlags.has(normalizeFlag(arg))) {
        i++; // skip the flag's value
      }
      continue;
    }
    return { index: i, afterDoubleDash: false };
  }
  return { index: -1, afterDoubleDash: false };
}

/**
 * Make `decompile` the implicit command: `cbor input.cbor` behaves like
 * `cbor decompile input.cbor`, and piped input (`cat x.cbor | cbor`) is
 * decompiled from stdin. Explicit subcommands, `--help`, `--version`, and a
 * bare `cbor` on a terminal (which shows usage) are left untouched.
 */
function withImplicitDecompile(rawArgs: string[]): string[] {
  const { index, afterDoubleDash } = firstPositionalIndex(rawArgs);
  if (index >= 0) {
    const token = rawArgs[index]!;
    if (!afterDoubleDash && Object.hasOwn(subCommands, token)) return rawArgs;
    return ['decompile', ...rawArgs];
  }
  // No positional argument. Leave --help/--version to citty, and keep the
  // bare `cbor` usage screen instead of blocking on terminal stdin.
  if (
    rawArgs.some((a) => a === '--help' || a === '-h' || a === '--version') ||
    process.stdin.isTTY
  ) {
    return rawArgs;
  }
  return ['decompile', ...rawArgs];
}

runMain(main, { rawArgs: withImplicitDecompile(process.argv.slice(2)) });
