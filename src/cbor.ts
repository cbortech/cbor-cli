import {
  CBOR,
  b32,
  h32,
  float,
  same,
  dt,
  ip,
  cri,
  t1,
  b1,
  ilbs,
  ilts,
} from '@cbortech/cbor';
import type { CborExtension } from '@cbortech/cbor';
import { hash } from '@cbortech/hash-extension';
import { uuid } from '@cbortech/uuid-extension';
import { set, map } from '@cbortech/set-map-extensions';

/**
 * Application extensions bundled with @cbortech/cbor and enabled there by
 * default. Named entries let `--extensions` re-enable a subset via the
 * `builtinExtensions` option.
 */
const BUILTIN: Record<string, CborExtension> = {
  dt,
  ip,
  cri,
  t1,
  b1,
  ilbs,
  ilts,
  float,
};

/**
 * Additional extensions registered by cbor-cli on top of the bundled set
 * (opt-in exports of @cbortech/cbor plus separate extension packages).
 */
const EXTRA: Record<string, CborExtension> = {
  b32,
  h32,
  same,
  hash,
  uuid,
  set,
  map,
};

export const EXTENSION_NAMES = [...Object.keys(BUILTIN), ...Object.keys(EXTRA)];

/**
 * Create a CBOR instance for the given `--extensions` value:
 *
 * - `'all'` (default): the bundled set plus every extra extension.
 * - `'none'`: no application extensions at all.
 * - comma-separated names: exactly the named extensions.
 */
export function createCbor(spec: string | undefined): CBOR {
  const s = (spec ?? 'all').trim();
  if (s === 'all') return new CBOR({ extensions: Object.values(EXTRA) });
  if (s === 'none') return new CBOR({ builtinExtensions: false });

  const names = [
    ...new Set(
      s
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    ),
  ];
  if (names.length === 0) {
    throw new Error(
      `invalid --extensions value "${spec}" (allowed: all | none | comma-separated names: ${EXTENSION_NAMES.join(', ')})`
    );
  }

  const builtins: CborExtension[] = [];
  const extras: CborExtension[] = [];
  for (const name of names) {
    if (name in BUILTIN) builtins.push(BUILTIN[name]!);
    else if (name in EXTRA) extras.push(EXTRA[name]!);
    else
      throw new Error(
        `unknown extension "${name}" in --extensions (available: ${EXTENSION_NAMES.join(', ')})`
      );
  }
  return new CBOR({ builtinExtensions: builtins, extensions: extras });
}
