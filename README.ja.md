# @cbortech/cbor-cli

[CBOR](https://www.rfc-editor.org/rfc/rfc8949.html) バイナリデータ、
[CDN (CBOR EDN)](https://datatracker.ietf.org/doc/draft-ietf-cbor-edn-literals/)
テキスト、注釈付き hex dump を相互変換するコマンドラインツールです。

[@cbortech/cbor](https://www.npmjs.com/package/@cbortech/cbor) をベースにしています。
プレイグラウンドは **https://cbor.tech/cbor/** で公開しています。

## インストール

```bash
npm install -g @cbortech/cbor-cli
```

インストールせずに実行することもできます:

```bash
npx @cbortech/cbor-cli --help
```

インストールされるコマンド名は `cbor` です。

## クイックスタート

```bash
# CDN テキスト → CBOR バイナリ
echo '{"hello": "world", "n": 42}' | cbor compile -o hello.cbor

# CBOR バイナリ → CDN テキスト(decompile はデフォルトコマンド)
cbor hello.cbor
# {
#   "hello": "world",
#   "n": 42
# }

# CBOR バイナリ → 注釈付き hex dump
cbor toHex hello.cbor
# A2                    -- Map of length 2
#    65 68 65 6C 6C 6F  -- "hello"
#    65 77 6F 72 6C 64  -- "world"
#    61 6E              -- "n"
#    18 2A              -- 42

# 注釈付き hex dump(またはプレーンな hex)→ CBOR バイナリ
cbor toHex hello.cbor | cbor fromHex | cbor decompile --indent 0
# {"hello":"world","n":42}

# CDN テキストの整形(コメントは保持されます)
echo '# config
{"retries": 3, }' | cbor format

# CBOR データの well-formedness / validity チェック
cbor validate hello.cbor
# hello.cbor: ok (1 item)
```

## コマンド

すべてのコマンドは、位置引数で指定したファイル、または引数を省略した場合
(もしくは `-` を指定した場合)は stdin から入力を読み込みます。出力は
`-o <file>` を指定しない限り stdout に書き出されます。終了コードは成功時
`0`、失敗時 `1` です。

### `cbor compile [input]`

CDN テキストを CBOR バイナリデータにコンパイルします。複数 item の CDN
シーケンスは CBOR Sequence (RFC 8742) になります。

| オプション            | 説明                                                |
| --------------------- | --------------------------------------------------- |
| `-o, --output <file>` | 出力する CBOR ファイル(デフォルト: stdout)          |
| `--no-strict`         | CDN validity 違反を警告として報告し、処理を継続する |

安全のため、`compile`(および `fromHex`)はバイナリデータを端末に直接
出力しません。`-o` でファイルに書き出すか、パイプで渡してください。

### `cbor decompile [input]`

CBOR バイナリデータを CDN テキストに変換します。CBOR Sequence は 1 行に
1 item ずつ出力されます。

`decompile` はデフォルトコマンドでもあります。`cbor input.cbor` や
`cat input.cbor | cbor` は、それぞれ `cbor decompile input.cbor` /
`cat input.cbor | cbor decompile` と同じ動作になります。ファイル名が
コマンド名と重なる場合は `--` で区切ってください(例: `cbor -- compile`)。

| オプション                     | 説明                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `-o, --output <file>`          | 出力する CDN ファイル(デフォルト: stdout)                                                          |
| `-i, --indent <n>`             | レベルごとのインデント幅(デフォルト: `2`、`0` で単一行)                                            |
| `--commas <style>`             | `comma` \| `none` \| `trailing`(デフォルト: `comma`)                                               |
| `--bstr-encoding <enc>`        | バイト列のエンコーディング: `hex` \| `base64` \| `base64url`(デフォルト: `hex`)                    |
| `--sqstr <mode>`               | シングルクォートバイト列: `printable-string` \| `string` \| `none`(デフォルト: `printable-string`) |
| `--int-format <fmt>`           | `decimal` \| `hex` \| `octal` \| `binary`(デフォルト: `decimal`)                                   |
| `--float-format <fmt>`         | `decimal` \| `hex`(デフォルト: `decimal`)                                                          |
| `--encoding-indicators <mode>` | `_N` インジケータの出力: `auto` \| `always` \| `never`(デフォルト: `auto`)                         |
| `--split-cdn`                  | CDN として解釈できる文字列を、構造に沿った連結で分割する(`--indent` が必要)                        |
| `--split-newline`              | 文字列を改行位置で CDN 連結として分割する(`--indent` が必要)                                       |
| `--preserve-concatenation`     | `"a" + "b"` という元の連結表記をそのまま再出力する(結合しない)                                     |
| `--no-strict`                  | CBOR validity 違反を警告として報告し、処理を継続する                                               |

### `cbor format [input]`

CDN テキストを整形します(パースして再シリアライズ)。コメントは
デフォルトで保持されます。

`decompile` のレンダリングオプションに加えて、以下が使用できます:

| オプション               | 説明                                                |
| ------------------------ | --------------------------------------------------- |
| `--no-preserve-comments` | 出力からコメントを取り除く                          |
| `--no-strict`            | CDN validity 違反を警告として報告し、処理を継続する |

### `cbor toHex [input]`

CBOR バイナリデータを注釈付き hex dump に変換します(`--no-annotate` で
プレーンな hex になります)。

| オプション                | 説明                                                 |
| ------------------------- | ---------------------------------------------------- |
| `-o, --output <file>`     | 出力するテキストファイル(デフォルト: stdout)         |
| `-i, --indent <n>`        | ネストごとのインデント幅(デフォルト: `3`)            |
| `--comment-style <style>` | コメントマーカー: `--` \| `#`(デフォルト: `--`)      |
| `--no-annotate`           | 注釈なしのプレーンな hex を出力する                  |
| `--no-strict`             | CBOR validity 違反を警告として報告し、処理を継続する |

### `cbor fromHex [input]`

hex dump を CBOR バイナリデータに戻します。デフォルトでは `cbor toHex` が
出力する注釈付き dump を入力とします(コメントは無視されます)。
`--format plain` を指定すると、空白を含んでもよいプレーンな hex を入力と
します。

| オプション            | 説明                                                      |
| --------------------- | --------------------------------------------------------- |
| `-o, --output <file>` | 出力する CBOR ファイル(デフォルト: stdout)                |
| `--format <fmt>`      | 入力形式: `annotated` \| `plain`(デフォルト: `annotated`) |
| `--no-strict`         | CBOR validity 違反を警告として報告し、処理を継続する      |

### `cbor validate [input]`

入力の well-formedness と validity をチェックします。回復可能な validity
違反(重複したマップキーなど)は警告として報告し、完全に malformed な
データはエラーとして報告します。入力に問題がない場合のみ `0` で終了します。

| オプション          | 説明                                                     |
| ------------------- | -------------------------------------------------------- |
| `-t, --type <type>` | 入力の種類: `cbor` \| `cdn` \| `hex`(デフォルト: `cbor`) |

```bash
$ printf '\xa2\x61\x61\x01\x61\x61\x02' | cbor validate
stdin: warning: duplicate map key at offset 4
stdin: 1 item, 1 warning
$ echo $?
1
```

## CDN 拡張

以下の [application 拡張](https://datatracker.ietf.org/doc/draft-ietf-cbor-edn-literals/)
が使用可能です:

| 拡張                      | 説明                                                                       |
| ------------------------- | -------------------------------------------------------------------------- |
| `dt'…'` / `DT'…'`         | RFC 3339 の日時をプレーンな epoch 数値 / tag 1 として                      |
| `ip'…'` / `IP'…'`         | IP アドレスをプレーンなバイト列 / tag 52 として                            |
| `cri'…'` / `CRI'…'`       | URI 参照をプレーンな CRI 配列 / tag 99 として                              |
| `t1<<…>>` / `b1<<…>>`     | 文字列/バイト列の引数を1つのテキスト/バイト列に連結する                    |
| `ilts<<…>>` / `ilbs<<…>>` | 引数1つにつき1チャンクの不定長テキスト/バイト列を構築する                  |
| `float'…'` / `float<<…>>` | IEEE 754 ビットパターン (float16/32/64)                                    |
| `b32'…'` / `h32'…'`       | base32 / base32hex のバイト列 (RFC 4648) — cbor-cli が登録                 |
| `same<<…>>`               | すべての item が同一の CBOR バイト列になることを検証する — cbor-cli が登録 |
| `hash'…'`                 | 内容の暗号学的ハッシュ(デフォルト SHA-256) — cbor-cli が登録               |
| `uuid'…'` / `UUID'…'`     | UUID のバイト列 / tag 37 — cbor-cli が登録                                 |
| `SET<<[…]>>`              | CBOR tag 258 — 数学的な有限集合(Set) — cbor-cli が登録                     |
| `MAP<<{…}>>`              | CBOR tag 259 — 明示的な `Map` 型(非テキストキーも使用可) — cbor-cli が登録 |

```bash
# dt'…' / ip'…' はプレーンな値、DT'…' / IP'…' はタグ付きの値になる
echo "dt'2024-01-01T00:00:00Z'" | cbor compile | cbor toHex
# 1A 65 92 00 80  -- 1704067200
echo "IP'192.0.2.1'" | cbor compile | cbor toHex
# D8 34              -- Tag 52
#    44 C0 00 02 01  -- h'c0000201'

# cri'…' はプレーンな CRI 配列(RFC 3986 の URI 参照)になる
echo "cri'https://example.com/path'" | cbor compile | cbor toHex
# 83                             -- Array of length 3
#    23                          -- -4
#    82                          -- Array of length 2
#       67 65 78 61 6D 70 6C 65  -- "example"
#       63 63 6F 6D              -- "com"
#    81                          -- Array of length 1
#       64 70 61 74 68           -- "path"

# t1/b1 は引数を1つの文字列に連結する
echo "t1<<'foo', 'bar'>>" | cbor compile | cbor toHex
# 66 66 6F 6F 62 61 72  -- "foobar"

# ilts/ilbs は引数1つにつき1チャンクの不定長文字列を構築する
echo "ilts<<'foo', 'bar'>>" | cbor compile | cbor toHex
# 7F              -- Start indefinite-length text string
#    63 66 6F 6F  -- "foo"
#    63 62 61 72  -- "bar"
# FF              -- "break"

# テキスト "foo" の SHA-256 をバイト列として埋め込む
echo "hash'foo'" | cbor compile | cbor decompile --sqstr none
# h'2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae'

# UUID をバイト列(uuid'…')または tag 37(UUID'…')として埋め込む
echo "uuid'019e226f-78d8-7892-8c91-79013e6905e2'" | cbor compile | cbor toHex
# 50 01 9E 22 6F 78 D8 78 92 8C 91 79 01 3E 69 05 E2  -- h'019e226f78d878928c9179013e6905e2'

# base32 バイト列と float16 ビットパターン
echo "[b32'MZXW6', float'7ef0']" | cbor compile | cbor toHex
# 82              -- Array of length 2
#    43 66 6F 6F  -- 'foo'
#    F9 7E F0     -- NaN

# same<<…>> はエンコード結果が一致することを検証する(不一致ならエラー)
echo "same<<b64'AA', h'00'>>" | cbor compile | cbor toHex
# 41 00  -- h'00'

# SET<<[…]>>(tag 258)と MAP<<{…}>>(tag 259)
echo 'SET<<["a","b","c"]>>' | cbor compile | cbor toHex
# D9 01 02     -- Tag 258
#    83        -- Array of length 3
#       61 61  -- "a"
#       61 62  -- "b"
#       61 63  -- "c"
```

`hash'…'` と同様、_プレーン_(タグなし)な表記(`dt'…'`、`ip'…'`、
`cri'…'`)の application-string 表記が見えるのは CDN をパースした直後
(例: `cbor format`)だけである点に注意してください — CBOR バイナリに
コンパイルしてから再度 decompile すると、application-string の表記自体
にはタグが残らないため、エンコード先のプレーンな値としてラウンドトリップ
します。一方、*タグ付き*の表記(`DT'…'`、`IP'…'`、`CRI'…'`)は実際の
CBOR タグを持つため、compile → decompile の完全なラウンドトリップでも
表記が保持されます。
`b64'…'` などのバイト列表現形式も組み込みでそのまま使用できます。

## 終了コードと診断メッセージ

- `0` — 成功。
- `1` — 何らかの失敗(パース/デコードエラー、不正なオプション値、
  I/O エラー、`validate` が警告を 1 件以上検出した場合)。

エラーと警告は `cbor:` プレフィックス付きで stderr に出力されます。
警告には違反が検出された位置(CBOR 入力ではバイトオフセット、CDN 入力では
行/桁)が含まれます。

## 仕様

- [RFC 8949 — Concise Binary Object Representation (CBOR)](https://www.rfc-editor.org/rfc/rfc8949.html)
- [RFC 8742 — CBOR Sequences](https://www.rfc-editor.org/rfc/rfc8742.html)
- [draft-ietf-cbor-edn-literals — Concise Diagnostic Notation (CDN)](https://datatracker.ietf.org/doc/draft-ietf-cbor-edn-literals/)

## ライセンス

[Apache-2.0](LICENSE)
