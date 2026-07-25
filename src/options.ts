import type { ToCDNOptions } from '@cbortech/cbor';
import { EXTENSION_NAMES } from './cbor.js';

export function pick<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  flag: string,
  defaultVal: T
): T {
  const v = value ?? defaultVal;
  if (!(allowed as readonly string[]).includes(v)) {
    throw new Error(
      `invalid --${flag} value "${v}" (allowed: ${allowed.join(' | ')})`
    );
  }
  return v as T;
}

/** Parse --indent as a non-negative integer; throws on non-numeric or negative input. */
export function parseIndent(
  value: string | undefined,
  defaultVal: number
): number {
  const s = value ?? String(defaultVal);
  if (!/^\d+$/.test(s)) {
    throw new Error(
      `invalid --indent value "${s}" (must be a non-negative integer; 0 = single-line)`
    );
  }
  return parseInt(s, 10);
}

const COMMAS = ['comma', 'none', 'trailing'] as const;
const BSTR_ENCODING = ['hex', 'base64', 'base64url'] as const;
const SQSTR = ['printable-string', 'string', 'none'] as const;
const INT_FORMAT = ['decimal', 'hex', 'octal', 'binary'] as const;
const FLOAT_FORMAT = ['decimal', 'hex'] as const;
const ENC_INDICATORS = ['auto', 'always', 'never'] as const;

/** citty arg definition for `--extensions`, shared by every command. */
export const extensionsArg = {
  extensions: {
    type: 'string',
    default: 'all',
    description: `Enabled application extensions: all | none | comma-separated names (${EXTENSION_NAMES.join(', ')})`,
  },
} as const;

const UNRESOLVED = ['cpa999', 'error'] as const;

/**
 * citty arg definition for `--unresolved`, shared by commands that parse CDN
 * (where unknown / disabled app-extension prefixes can appear).
 */
export const unresolvedArg = {
  unresolved: {
    type: 'string',
    default: 'cpa999',
    description:
      'Unknown app-extension prefixes: cpa999 (wrap in CPA999 tag) | error',
  },
} as const;

/** Parse the `--unresolved` value into `FromCDNOptions.unresolvedExtension`. */
export function unresolvedOption(
  value: string | undefined
): 'cpa999' | 'error' {
  return pick(value, UNRESOLVED, 'unresolved', 'cpa999');
}

/** citty arg definitions shared by commands that render CDN output. */
export const cdnRenderArgs = {
  indent: {
    type: 'string',
    alias: 'i',
    default: '2',
    description: 'Indentation spaces per level (0 for single-line)',
  },
  commas: {
    type: 'string',
    default: 'comma',
    description: 'Comma style: comma | none | trailing',
  },
  'bstr-encoding': {
    type: 'string',
    default: 'hex',
    description: 'Byte string encoding: hex | base64 | base64url',
  },
  sqstr: {
    type: 'string',
    default: 'printable-string',
    description: 'Single-quoted byte strings: printable-string | string | none',
  },
  'int-format': {
    type: 'string',
    default: 'decimal',
    description: 'Integer format: decimal | hex | octal | binary',
  },
  'float-format': {
    type: 'string',
    default: 'decimal',
    description: 'Float format: decimal | hex',
  },
  'encoding-indicators': {
    type: 'string',
    default: 'auto',
    description: 'Encoding indicators (_N): auto | always | never',
  },
  'split-cdn': {
    type: 'boolean',
    default: true,
    description:
      'Split text strings that parse as CDN using structure-aware concatenation (needs --indent)',
    negativeDescription: 'Do not split text strings that parse as CDN',
  },
  'split-newline': {
    type: 'boolean',
    default: true,
    description:
      'Split text strings at newlines using CDN concatenation (needs --indent)',
    negativeDescription: 'Do not split text strings at newlines',
  },
  'preserve-concatenation': {
    type: 'boolean',
    default: true,
    description:
      'Re-emit "a" + "b" source concatenation instead of joining parts (needs --indent)',
    negativeDescription: 'Join "a" + "b" source concatenation into one literal',
  },
  'preserve-raw-string': {
    type: 'boolean',
    default: true,
    description:
      'Re-emit `...` raw string literals using their original source text',
    negativeDescription:
      'Convert `...` raw string literals to double-quoted strings',
  },
  'inline-leaf-containers': {
    type: 'boolean',
    default: true,
    description:
      'Keep containers with no nested array/map on one line when indenting',
    negativeDescription:
      'Expand every container across multiple lines when indenting',
  },
  'preserve-blank-lines': {
    type: 'boolean',
    default: true,
    description:
      'Re-emit a blank line above an entry that had one in the source (needs --indent)',
    negativeDescription: 'Do not preserve blank lines between entries',
  },
  'preserve-text-string': {
    type: 'boolean',
    default: false,
    description:
      'Re-emit double-quoted text strings using their original source spelling (disables --split-cdn/--split-newline for those strings)',
  },
  'preserve-number-format': {
    type: 'boolean',
    default: true,
    description:
      'Re-emit integer/float literals using their original source spelling (overrides --int-format/--float-format)',
    negativeDescription:
      'Normalize integer/float literals via --int-format/--float-format',
  },
  'preserve-app-sequence': {
    type: 'boolean',
    default: true,
    description:
      "Re-emit app-extension notation (prefix'...' | <<...>> | raw tag) using its original spelling",
    negativeDescription:
      'Regenerate app-extension notation instead of preserving its original spelling',
  },
} as const;

interface CdnRenderArgValues {
  indent?: string;
  commas?: string;
  'bstr-encoding'?: string;
  sqstr?: string;
  'int-format'?: string;
  'float-format'?: string;
  'encoding-indicators'?: string;
  'split-cdn'?: boolean;
  'split-newline'?: boolean;
  'preserve-concatenation'?: boolean;
  'preserve-raw-string'?: boolean;
  'inline-leaf-containers'?: boolean;
  'preserve-blank-lines'?: boolean;
  'preserve-text-string'?: boolean;
  'preserve-number-format'?: boolean;
  'preserve-app-sequence'?: boolean;
}

/** Build `ToCDNOptions` from parsed {@link cdnRenderArgs} values. */
export function cdnRenderOptions(args: CdnRenderArgValues): ToCDNOptions {
  return {
    // 0 means single-line output, same as omitting the option.
    indent: parseIndent(args.indent, 2),
    commas: pick(args.commas, COMMAS, 'commas', 'comma'),
    bstrEncoding: pick(
      args['bstr-encoding'],
      BSTR_ENCODING,
      'bstr-encoding',
      'hex'
    ),
    sqstr: pick(args.sqstr, SQSTR, 'sqstr', 'printable-string'),
    intFormat: pick(args['int-format'], INT_FORMAT, 'int-format', 'decimal'),
    floatFormat: pick(
      args['float-format'],
      FLOAT_FORMAT,
      'float-format',
      'decimal'
    ),
    encodingIndicators: pick(
      args['encoding-indicators'],
      ENC_INDICATORS,
      'encoding-indicators',
      'auto'
    ),
    splitCdn: args['split-cdn'],
    splitNewline: args['split-newline'],
    preserveConcatenation: args['preserve-concatenation'],
    preserveRawString: args['preserve-raw-string'],
    inlineLeafContainers: args['inline-leaf-containers'],
    preserveBlankLines: args['preserve-blank-lines'],
    preserveTextString: args['preserve-text-string'],
    preserveNumberFormat: args['preserve-number-format'],
    preserveAppSequence: args['preserve-app-sequence'],
  };
}
