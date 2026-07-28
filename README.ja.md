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
# {"hello": "world", "n": 42}

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

また、すべてのコマンドで `--extensions <list>` を指定して、有効にする
application extension を選択できます([拡張の選択](#拡張の選択)を参照)。

### `cbor compile [input]`

CDN テキストを CBOR バイナリデータにコンパイルします。複数 item の CDN
シーケンスは CBOR Sequence (RFC 8742) になります。

| オプション            | 説明                                                                        |
| --------------------- | --------------------------------------------------------------------------- |
| `-o, --output <file>` | 出力する CBOR ファイル(デフォルト: stdout)                                  |
| `--unresolved <mode>` | 未知/無効な app-extension プレフィックスの扱い: `cpa999`(ラップ) \| `error` |
| `--no-strict`         | CDN validity 違反を警告として報告し、処理を継続する                         |

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
| `--no-split-cdn`               | CDN として解釈できる文字列を分割しない(デフォルト: `--indent` 指定時は分割する)                    |
| `--no-split-newline`           | 文字列を改行位置で分割しない(デフォルト: `--indent` 指定時は分割する)                              |
| `--no-preserve-concatenation`  | `"a" + "b"` という元の連結表記を1つのリテラルに結合する(デフォルト: `--indent` 指定時は保持する)   |
| `--no-preserve-raw-string`     | `` `…` `` raw 文字列リテラルをダブルクォート文字列に変換する(デフォルト: 元の表記を保持する)       |
| `--no-inline-leaf-containers`  | すべてのコンテナをインデント時に複数行で出力する(デフォルト: 配列/マップを含まないコンテナは1行)   |
| `--no-preserve-blank-lines`    | エントリ間の空行を再出力しない(デフォルト: `--indent` 指定時は元の空行を保持する)                  |
| `--no-preserve-number-format`  | 整数/浮動小数点リテラルを `--int-format`/`--float-format` で正規化する(デフォルト: 元の表記を保持) |
| `--no-preserve-app-sequence`   | app-extension 表記を再生成する(デフォルト: 元の表記を保持する)                                     |
| `--no-strict`                  | CBOR validity 違反を警告として報告し、処理を継続する                                               |

### `cbor format [input]`

CDN テキストを整形します(パースして再シリアライズ)。コメントは
デフォルトで保持されます。1 行出力(`--indent 0`)では行コメントを
改行でしか終端できないため、コメントは常に取り除かれます。

`decompile` のレンダリングオプションに加えて、以下が使用できます:

| オプション               | 説明                                                                        |
| ------------------------ | --------------------------------------------------------------------------- |
| `--no-preserve-comments` | 出力からコメントを取り除く                                                  |
| `--unresolved <mode>`    | 未知/無効な app-extension プレフィックスの扱い: `cpa999`(ラップ) \| `error` |
| `--no-strict`            | CDN validity 違反を警告として報告し、処理を継続する                         |

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
データ(パースを中断させる CDN 構文エラーを含む)は `invalid` として報告
します。情報ヒント(有効化されていない既知のオプション拡張に一致する CDN
プレフィックスなど)は `<name>: hint: …` として表示されますが、結果には
影響しません。入力に問題がない場合のみ `0` で終了します。

`--cddl` を指定すると、デコード/パースされた各アイテムを
[CDDL](https://www.rfc-editor.org/rfc/rfc8610) スキーマに照らして追加で
検証します。一致しない場合は `cddl violation` 行として報告され、他の
validity 違反と同様に結果が `invalid` になります。

| オプション            | 説明                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- |
| `-t, --type <type>`   | 入力の種類: `cbor` \| `cdn` \| `hex`(デフォルト: `cbor`)                              |
| `--unresolved <mode>` | 未知/無効な app-extension プレフィックスの扱い(CDN 入力): `cpa999`(ラップ) \| `error` |
| `--cddl <file>`       | デコード/パースされた各アイテムを検証する CDDL スキーマファイル                       |
| `--cddl-rule <name>`  | 検証対象とする CDDL ルール(デフォルト: スキーマのルートルール)                        |

```bash
$ printf '\xa2\x61\x61\x01\x61\x61\x02' | cbor validate
stdin: warning: duplicate map key at offset 4
stdin: 1 item, 1 warning
$ echo $?
1

$ echo 'person = { name: tstr, ? age: uint }' > person.cddl
$ echo '{"name": 42}' | cbor validate --type cdn --cddl person.cddl
stdin: cddl violation: value for 'name' does not match at /name (offset 9)
stdin: invalid (1 item, 1 CDDL violation)
$ echo $?
1
```

## CDN 拡張

以下の [application extension](https://datatracker.ietf.org/doc/draft-ietf-cbor-edn-literals/)
が使用可能です:

| 拡張            | 説明                                                      |
| --------------- | --------------------------------------------------------- |
| `dt` / `DT`     | RFC 3339 の日時(プレーンな epoch 数値 / tag 1)            |
| `ip` / `IP`     | IP アドレス(プレーンなバイト列 / tag 52)                  |
| `cri` / `CRI`   | URI 参照(プレーンな CRI 配列 / tag 99)                    |
| `t1` / `b1`     | 文字列/バイト列の引数を1つのテキスト/バイト列に連結する   |
| `ilts` / `ilbs` | 引数1つにつき1チャンクの不定長テキスト/バイト列を構築する |
| `float`         | IEEE 754 ビットパターン (float16/32/64)                   |
| `hash`          | 内容の暗号学的ハッシュ(デフォルト SHA-256)                |
| `b32` / `h32`   | base32 / base32hex のバイト列 (RFC 4648);文字列形式のみ   |
| `same`          | すべての item が同一の CBOR バイト列になることを検証する  |
| `uuid` / `UUID` | UUID(プレーンなバイト列 / tag 37)                         |
| `SET`           | 数学的な有限集合(tag 258)                                 |
| `MAP`           | 明示的な `Map` 型(tag 259;非テキストキーも使用可)         |

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

### 拡張の選択

すべてのコマンドで `--extensions <list>` を指定して、有効にする
application extension を選択できます:

- `--extensions all`(デフォルト)— 上の表のすべての拡張。
- `--extensions none` — application extension をすべて無効にする。
- `--extensions dt,t1,hash` — 指定した拡張のみ
  (表にある拡張名をカンマ区切りで指定)。

CDN 入力が無効化された拡張のプレフィックスを使っている場合、そのリテラルは
CPA999 タグ(`999(["dt", "…"])`)にラップされ、警告が表示されます。
`compile` / `format` / `validate` で `--unresolved error` を指定すると、
ラップする代わりにエラーとして拒否します — 信頼できない CDN 入力を
許可リスト方式で扱う場合に便利です。バイナリ側では、無効化された拡張の
タグは単に汎用タグとしてデコードされます。

```bash
# 許可リスト: dt/DT と t1/b1 のみ解釈する
echo "dt'2024-01-01T00:00:00Z'" | cbor compile --extensions dt,t1 | cbor toHex
# 1A 65 92 00 80  -- 1704067200

# 許可リストにない拡張を拒否する
echo "hash'foo'" | cbor compile --extensions dt,t1 --unresolved error
# cbor: EDN parse error at line 1, column 1: unknown app-string extension: "hash"

# 無効化された拡張のタグは汎用タグとしてデコードされる
echo "UUID'019e226f-78d8-7892-8c91-79013e6905e2'" | cbor compile \
  | cbor decompile --extensions none --indent 0
# 37(h'019e226f78d878928c9179013e6905e2')
```

## 終了コードと診断メッセージ

- `0` — 成功。
- `1` — 何らかの失敗(パース/デコードエラー、不正なオプション値、
  I/O エラー、`validate` が警告を 1 件以上検出した場合)。

エラーと警告は `cbor:` プレフィックス付きで stderr に出力されます。
警告には違反が検出された位置(CBOR 入力ではバイトオフセット、CDN 入力では
行/桁)が含まれます。

`validate` はこの例外です。そのレポート(`<name>: ok (…)`、
`<name>: warning: …`、`<name>: invalid`)はリンターの出力のように
パイプや grep で扱えるよう stdout に出力されます。`invalid` の場合は、
エラーメッセージ(パース/デコードエラーのほか、I/O エラーや不正な
`--type` 値なども含む)が `cbor:` プレフィックス付きで追加で stderr にも
出力されます。

## 準拠している仕様

- CBOR
  - [RFC 8949](https://www.rfc-editor.org/rfc/rfc8949)
- CBOR Sequences
  - [RFC 8742](https://www.rfc-editor.org/rfc/rfc8742)
- CDN (CBOR-EDN)
  - [draft-ietf-cbor-edn-literals-25](https://datatracker.ietf.org/doc/draft-ietf-cbor-edn-literals/25/)
  - [draft-ietf-cbor-edn-literals-26](https://datatracker.ietf.org/doc/draft-ietf-cbor-edn-literals/26/)
- CDDL
  - [RFC 8610](https://www.rfc-editor.org/rfc/rfc8610)
  - [RFC 9682](https://www.rfc-editor.org/rfc/rfc9682)
  - [RFC 9165](https://www.rfc-editor.org/rfc/rfc9165)

補足:

- CDN は draft-26 に準拠しつつ、draft-25 の `(_ ...)` streamstring 構文と
  `+` による文字列連結構文も引き続きサポートしています。
- CDDL は RFC 8610 のすべての control operator と、RFC 9165 の `.plus`、
  `.cat`、`.feature` をサポートしています。
- RFC 9682 の更新内容である文字列リテラル文法(`\u{...}` を含む)、構文上の
  空データモデル(ルールなしのモデルはコンパイル時に意味エラー)、非リテラルの
  `#6.<type>` / `#7.<type>` head number に対応しています。コメントの `PCHAR`
  検証、単独 CR の改行、EOF で終わるコメントは、collected ABNF よりも意図的に
  寛容に受理します。

## ライセンス

[Apache-2.0](LICENSE)
