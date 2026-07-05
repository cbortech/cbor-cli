import { CBOR, b32, h32, float, same } from '@cbortech/cbor';
import { hash } from '@cbortech/hash-extension';
import { uuid } from '@cbortech/uuid-extension';
import { set, map } from '@cbortech/set-map-extensions';

/**
 * Shared CBOR instance with all bundled application-string extensions
 * registered:
 *
 * - `b32'…'` / `h32'…'` — base32 / base32hex byte strings
 * - `float'…'` / `float<<…>>` — IEEE 754 bit patterns
 * - `same<<…>>` — assert all items encode identically
 * - `hash'…'` — cryptographic hash of the content
 * - `uuid'…'` / `UUID'…'` — UUID byte string / tag 37
 * - `SET<<[…]>>` — CBOR tag 258 (mathematical finite set)
 * - `MAP<<{…}>>` — CBOR tag 259 (explicit Map datatype)
 */
export const cbor = new CBOR({
  extensions: [b32, h32, float, same, hash, uuid, set, map],
});
