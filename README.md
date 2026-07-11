# @cbortech/cbor-cli

Command-line tool to convert between [CBOR](https://www.rfc-editor.org/rfc/rfc8949.html)
binary data, [CDN (CBOR EDN)](https://datatracker.ietf.org/doc/draft-ietf-cbor-edn-literals/)
text, and annotated hex dumps.

Built on [@cbortech/cbor](https://www.npmjs.com/package/@cbortech/cbor).
A live playground is available at **https://cbor.tech/cbor/**.

## Install

```bash
npm install -g @cbortech/cbor-cli
```

Or run it without installing:

```bash
npx @cbortech/cbor-cli --help
```

The installed command is named `cbor`.

## Quick Examples

```bash
# CDN text → CBOR binary
echo '{"hello": "world", "n": 42}' | cbor compile -o hello.cbor

# CBOR binary → CDN text (decompile is the default command)
cbor hello.cbor
# {
#   "hello": "world",
#   "n": 42
# }

# CBOR binary → annotated hex dump
cbor toHex hello.cbor
# A2                    -- Map of length 2
#    65 68 65 6C 6C 6F  -- "hello"
#    65 77 6F 72 6C 64  -- "world"
#    61 6E              -- "n"
#    18 2A              -- 42

# Annotated hex dump (or plain hex) → CBOR binary
cbor toHex hello.cbor | cbor fromHex | cbor decompile --indent 0
# {"hello":"world","n":42}

# Format (pretty-print) CDN text, preserving comments
echo '# config
{"retries": 3, }' | cbor format

# Check CBOR data for well-formedness and validity
cbor validate hello.cbor
# hello.cbor: ok (1 item)
```

## Commands

Every command reads from a file given as a positional argument, or from
stdin when the argument is omitted or `-`. Output goes to stdout unless
`-o <file>` is given. All commands exit with status `0` on success and `1`
on failure.

Every command also accepts `--extensions <list>` to select which
application extensions are enabled — see
[Selecting extensions](#selecting-extensions).

### `cbor compile [input]`

Compile CDN text into CBOR binary data. A multi-item CDN sequence produces
a CBOR Sequence (RFC 8742).

| Option                | Description                                                           |
| --------------------- | --------------------------------------------------------------------- |
| `-o, --output <file>` | Output CBOR file (default: stdout)                                    |
| `--unresolved <mode>` | Unknown / disabled app-extension prefixes: `cpa999` (wrap) \| `error` |
| `--no-strict`         | Report CDN validity violations as warnings and continue               |

As a safety measure, `compile` (and `fromHex`) refuse to write binary data
directly to a terminal — write to a file with `-o` or pipe the output.

### `cbor decompile [input]`

Decompile CBOR binary data into CDN text. A CBOR Sequence produces one CDN
item per line.

`decompile` is also the default command: `cbor input.cbor` and
`cat input.cbor | cbor` are equivalent to `cbor decompile input.cbor` and
`cat input.cbor | cbor decompile`. If a file happens to share its name with
a command, separate it with `--` (e.g. `cbor -- compile`).

| Option                         | Description                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `-o, --output <file>`          | Output CDN file (default: stdout)                                                                  |
| `-i, --indent <n>`             | Indentation spaces per level (default: `2`, `0` = single-line)                                     |
| `--commas <style>`             | `comma` \| `none` \| `trailing` (default: `comma`)                                                 |
| `--bstr-encoding <enc>`        | Byte string encoding: `hex` \| `base64` \| `base64url` (default: `hex`)                            |
| `--sqstr <mode>`               | Single-quoted byte strings: `printable-string` \| `string` \| `none` (default: `printable-string`) |
| `--int-format <fmt>`           | `decimal` \| `hex` \| `octal` \| `binary` (default: `decimal`)                                     |
| `--float-format <fmt>`         | `decimal` \| `hex` (default: `decimal`)                                                            |
| `--encoding-indicators <mode>` | Emit `_N` indicators: `auto` \| `always` \| `never` (default: `auto`)                              |
| `--split-cdn`                  | Split text strings that parse as CDN using structure-aware concatenation (needs `--indent`)        |
| `--split-newline`              | Split text strings at newlines using CDN concatenation (needs `--indent`)                          |
| `--preserve-concatenation`     | Re-emit `"a" + "b"` source concatenation instead of joining parts                                  |
| `--no-strict`                  | Report CBOR validity violations as warnings and continue                                           |

### `cbor format [input]`

Format CDN text: parse it and re-serialize it. Comments are preserved by
default.

Accepts all of the rendering options of `decompile`, plus:

| Option                   | Description                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| `--no-preserve-comments` | Strip comments from the output                                        |
| `--unresolved <mode>`    | Unknown / disabled app-extension prefixes: `cpa999` (wrap) \| `error` |
| `--no-strict`            | Report CDN validity violations as warnings and continue               |

### `cbor toHex [input]`

Convert CBOR binary data to an annotated hex dump (or plain hex with
`--no-annotate`).

| Option                    | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| `-o, --output <file>`     | Output text file (default: stdout)                       |
| `-i, --indent <n>`        | Indentation spaces per nesting level (default: `3`)      |
| `--comment-style <style>` | Comment marker: `--` \| `#` (default: `--`)              |
| `--no-annotate`           | Emit plain hex without annotations                       |
| `--no-strict`             | Report CBOR validity violations as warnings and continue |

### `cbor fromHex [input]`

Convert a hex dump back to CBOR binary data. By default the input is an
annotated dump as produced by `cbor toHex` (comments are ignored); with
`--format plain` the input is bare hex (whitespace allowed).

| Option                | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `-o, --output <file>` | Output CBOR file (default: stdout)                          |
| `--format <fmt>`      | Input format: `annotated` \| `plain` (default: `annotated`) |
| `--no-strict`         | Report CBOR validity violations as warnings and continue    |

### `cbor validate [input]`

Check input for well-formedness and validity. Recoverable validity
violations (e.g. duplicate map keys) are reported as warnings; truly
malformed data is reported as an error. Exits `0` only when the input is
clean.

| Option                | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| `-t, --type <type>`   | Input type: `cbor` \| `cdn` \| `hex` (default: `cbor`)                            |
| `--unresolved <mode>` | Unknown / disabled app-extension prefixes (CDN input): `cpa999` (wrap) \| `error` |

```bash
$ printf '\xa2\x61\x61\x01\x61\x61\x02' | cbor validate
stdin: warning: duplicate map key at offset 4
stdin: 1 item, 1 warning
$ echo $?
1
```

## CDN Extensions

The following [application extensions](https://datatracker.ietf.org/doc/draft-ietf-cbor-edn-literals/)
are available:

| Extension                 | Description                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `dt'…'` / `DT'…'`         | RFC 3339 date-time as a bare epoch number / as tag 1                                    |
| `ip'…'` / `IP'…'`         | IP address as a bare byte string / as tag 52                                            |
| `cri'…'` / `CRI'…'`       | URI reference as a bare CRI array / as tag 99                                           |
| `t1<<…>>` / `b1<<…>>`     | concatenate string/byte-string arguments into one text/byte string                      |
| `ilts<<…>>` / `ilbs<<…>>` | build an indefinite-length text/byte string, one chunk per argument                     |
| `float'…'` / `float<<…>>` | IEEE 754 bit patterns (float16/32/64)                                                   |
| `b32'…'` / `h32'…'`       | base32 / base32hex byte strings (RFC 4648) — registered by cbor-cli                     |
| `same<<…>>`               | assert that all items encode to identical CBOR bytes — registered by cbor-cli           |
| `hash'…'`                 | cryptographic hash of the content (SHA-256 by default) — registered by cbor-cli         |
| `uuid'…'` / `UUID'…'`     | UUID as a byte string / as tag 37 — registered by cbor-cli                              |
| `SET<<[…]>>`              | CBOR tag 258 — mathematical finite set — registered by cbor-cli                         |
| `MAP<<{…}>>`              | CBOR tag 259 — explicit `Map` datatype (non-text keys allowed) — registered by cbor-cli |

```bash
# dt'…' / ip'…' as bare values, DT'…' / IP'…' as tagged values
echo "dt'2024-01-01T00:00:00Z'" | cbor compile | cbor toHex
# 1A 65 92 00 80  -- 1704067200
echo "IP'192.0.2.1'" | cbor compile | cbor toHex
# D8 34              -- Tag 52
#    44 C0 00 02 01  -- h'c0000201'

# cri'…' as a bare CRI array (RFC 3986 URI reference)
echo "cri'https://example.com/path'" | cbor compile | cbor toHex
# 83                             -- Array of length 3
#    23                          -- -4
#    82                          -- Array of length 2
#       67 65 78 61 6D 70 6C 65  -- "example"
#       63 63 6F 6D              -- "com"
#    81                          -- Array of length 1
#       64 70 61 74 68           -- "path"

# t1/b1 concatenate arguments into a single string
echo "t1<<'foo', 'bar'>>" | cbor compile | cbor toHex
# 66 66 6F 6F 62 61 72  -- "foobar"

# ilts/ilbs build an indefinite-length string, one chunk per argument
echo "ilts<<'foo', 'bar'>>" | cbor compile | cbor toHex
# 7F              -- Start indefinite-length text string
#    63 66 6F 6F  -- "foo"
#    63 62 61 72  -- "bar"
# FF              -- "break"

# SHA-256 of the text "foo" as a byte string
echo "hash'foo'" | cbor compile | cbor decompile --sqstr none
# h'2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae'

# UUID as a byte string (uuid'…') or tag 37 (UUID'…')
echo "uuid'019e226f-78d8-7892-8c91-79013e6905e2'" | cbor compile | cbor toHex
# 50 01 9E 22 6F 78 D8 78 92 8C 91 79 01 3E 69 05 E2  -- h'019e226f78d878928c9179013e6905e2'

# base32 byte string and a float16 bit pattern
echo "[b32'MZXW6', float'7ef0']" | cbor compile | cbor toHex
# 82              -- Array of length 2
#    43 66 6F 6F  -- 'foo'
#    F9 7E F0     -- NaN

# same<<…>> asserts equal encodings (fails otherwise)
echo "same<<b64'AA', h'00'>>" | cbor compile | cbor toHex
# 41 00  -- h'00'

# SET<<[…]>> (tag 258) and MAP<<{…}>> (tag 259)
echo 'SET<<["a","b","c"]>>' | cbor compile | cbor toHex
# D9 01 02     -- Tag 258
#    83        -- Array of length 3
#       61 61  -- "a"
#       61 62  -- "b"
#       61 63  -- "c"
```

Note that, like `hash'…'`, the _untagged_ forms (`dt'…'`, `ip'…'`, `cri'…'`)
have an app-string spelling that is only visible right after parsing CDN
(e.g. `cbor format`) — once compiled to CBOR bytes and decompiled again,
they round-trip as the plain values they encode to, since nothing marks
them as coming from an app-string. The _tagged_ forms (`DT'…'`, `IP'…'`,
`CRI'…'`) do carry a real CBOR tag and so keep their notation through a
full compile → decompile round-trip.

### Selecting extensions

Every command accepts `--extensions <list>` to control which application
extensions are enabled:

- `--extensions all` (default) — everything in the table above.
- `--extensions none` — no application extensions.
- `--extensions dt,t1,hash` — exactly the named extensions
  (comma-separated names from the table).

When CDN input uses a prefix whose extension is disabled, the literal is
wrapped in a CPA999 tag (`999(["dt", "…"])`) and a warning is printed.
Pass `--unresolved error` (on `compile`, `format`, and `validate`) to
reject such input instead — useful for allowlisting untrusted CDN. On the
binary side, a disabled extension's tag simply decodes as a generic tag.

```bash
# allowlist: only dt/DT and t1/b1 are interpreted
echo "dt'2024-01-01T00:00:00Z'" | cbor compile --extensions dt,t1 | cbor toHex
# 1A 65 92 00 80  -- 1704067200

# reject anything not on the allowlist
echo "hash'foo'" | cbor compile --extensions dt,t1 --unresolved error
# cbor: EDN parse error at line 1, column 1: unknown app-string extension: "hash"

# a disabled extension's tag decodes generically
echo "UUID'019e226f-78d8-7892-8c91-79013e6905e2'" | cbor compile \
  | cbor decompile --extensions none --indent 0
# 37(h'019e226f78d878928c9179013e6905e2')
```

## Exit Codes and Diagnostics

- `0` — success.
- `1` — any failure (parse/decode error, invalid option value, I/O error,
  or `validate` finding at least one warning).

Errors and warnings are written to stderr, prefixed with `cbor:`. Warnings
include the byte offset (CBOR input) or line/column (CDN input) where the
violation was detected.

## Specifications

- [RFC 8949 — Concise Binary Object Representation (CBOR)](https://www.rfc-editor.org/rfc/rfc8949.html)
- [RFC 8742 — CBOR Sequences](https://www.rfc-editor.org/rfc/rfc8742.html)
- [draft-ietf-cbor-edn-literals — Concise Diagnostic Notation (CDN)](https://datatracker.ietf.org/doc/draft-ietf-cbor-edn-literals/)

## License

[Apache-2.0](LICENSE)
