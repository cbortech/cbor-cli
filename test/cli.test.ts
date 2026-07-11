import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const CLI = fileURLToPath(new URL('../dist/cbor.mjs', import.meta.url));

interface RunResult {
  stdout: Buffer;
  stderr: string;
  code: number;
}

function run(
  args: string[],
  stdin?: Buffer | string,
  opts?: { cwd?: string }
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [CLI, ...args],
      { encoding: 'buffer', maxBuffer: 16 * 1024 * 1024, cwd: opts?.cwd },
      (err, stdout, stderr) => {
        if (err && typeof err.code !== 'number') {
          reject(err);
          return;
        }
        resolve({
          stdout,
          stderr: stderr.toString('utf-8'),
          code: err ? (err.code as number) : 0,
        });
      }
    );
    child.stdin!.end(stdin ?? '');
  });
}

const text = (r: RunResult): string => r.stdout.toString('utf-8');
const hex = (r: RunResult): string => r.stdout.toString('hex');

// {"a": 1} encoded as CBOR
const MAP_A1 = Buffer.from('a1616101', 'hex');
// {"a": 1, "a": 2} — duplicate map key (validity violation)
const DUP_KEY = Buffer.from('a2616101616102', 'hex');

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cbor-cli-test-'));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('cbor --version', () => {
  test('prints the package version', async () => {
    const pkg = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf-8')
    );
    const r = await run(['--version']);
    expect(r.code).toBe(0);
    expect(text(r).trim()).toBe(pkg.version);
  });
});

describe('cbor compile', () => {
  test('compiles CDN from stdin to CBOR on stdout', async () => {
    const r = await run(['compile'], '{"a": 1}');
    expect(r.code).toBe(0);
    expect(hex(r)).toBe('a1616101');
  });

  test('compiles a CDN sequence to a CBOR sequence', async () => {
    const r = await run(['compile'], '1 2');
    expect(hex(r)).toBe('0102');
  });

  test('supports the hash extension', async () => {
    const r = await run(['compile'], "hash'foo'");
    expect(hex(r)).toBe(
      '58202c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae'
    );
  });

  test('supports the uuid extension', async () => {
    const r = await run(
      ['compile'],
      "uuid'019e226f-78d8-7892-8c91-79013e6905e2'"
    );
    expect(hex(r)).toBe('50019e226f78d878928c9179013e6905e2');
  });

  test('supports the b32 and h32 extensions', async () => {
    const b32 = await run(['compile'], "b32'MZXW6'");
    expect(hex(b32)).toBe('43666f6f'); // "foo"
    const h32 = await run(['compile'], "h32'CPNMU'");
    expect(hex(h32)).toBe('43666f6f');
  });

  test('supports the float extension', async () => {
    const f16 = await run(['compile'], "float'7ef0'");
    expect(hex(f16)).toBe('f97ef0'); // NaN as float16
    const f64 = await run(['compile'], "float'3ff0000000000000'");
    expect(hex(f64)).toBe('fb3ff0000000000000'); // 1.0 as float64
  });

  test('supports the same extension', async () => {
    const ok = await run(['compile'], "same<<b64'AA', h'00'>>");
    expect(ok.code).toBe(0);
    expect(hex(ok)).toBe('4100');
  });

  test('same mismatch fails in strict mode, warns with --no-strict', async () => {
    const strict = await run(['compile'], "same<<h'00', h'01'>>");
    expect(strict.code).toBe(1);
    expect(strict.stderr).toContain('different CBOR bytes');
    const lenient = await run(
      ['compile', '--no-strict'],
      "same<<h'00', h'01'>>"
    );
    expect(lenient.code).toBe(0);
    expect(lenient.stderr).toContain('warning');
    expect(hex(lenient)).toBe('4100');
  });

  test('supports the set extension (tag 258)', async () => {
    const r = await run(['compile'], 'SET<<["a","b","c"]>>');
    expect(hex(r)).toBe('d90102 83 6161 6162 6163'.replace(/\s+/g, ''));
  });

  test('supports the map extension (tag 259)', async () => {
    const r = await run(['compile'], 'MAP<<{"a": 1, "b": 2}>>');
    expect(hex(r)).toBe('d90103 a2 6161 01 6162 02'.replace(/\s+/g, ''));
  });

  test('supports the t1/b1 concatenation extensions (built into @cbortech/cbor)', async () => {
    const t1 = await run(['compile'], "t1<<'foo', 'bar'>>");
    expect(hex(t1)).toBe('66666f6f626172'); // "foobar"
    const b1 = await run(['compile'], "b1<<h'0102', h'0304'>>");
    expect(hex(b1)).toBe('4401020304'); // h'01020304'
  });

  test('supports the ilts/ilbs indefinite-length extensions (built in)', async () => {
    const ilts = await run(['compile'], "ilts<<'foo', 'bar'>>");
    expect(hex(ilts)).toBe('7f63666f6f63626172ff');
    const ilbs = await run(['compile'], "ilbs<<h'0102', h'0304'>>");
    expect(hex(ilbs)).toBe('5f420102420304ff');
  });

  test('supports dt/DT (bare epoch number vs tag 1, built in)', async () => {
    const bare = await run(['compile'], "dt'2024-01-01T00:00:00Z'");
    expect(hex(bare)).toBe('1a65920080');
    const tagged = await run(['compile'], "DT'2024-01-01T00:00:00Z'");
    expect(hex(tagged)).toBe('c11a65920080');
  });

  test('supports ip/IP (bare byte string vs tag 52, built in)', async () => {
    const bare = await run(['compile'], "ip'192.0.2.1'");
    expect(hex(bare)).toBe('44c0000201');
    const tagged = await run(['compile'], "IP'192.0.2.1'");
    expect(hex(tagged)).toBe('d83444c0000201');
  });

  test('supports cri/CRI (bare CRI array vs tag 99, built in)', async () => {
    const bareHex = '832382676578616d706c6563636f6d816470617468';
    const bare = await run(['compile'], "cri'https://example.com/path'");
    expect(hex(bare)).toBe(bareHex);
    const tagged = await run(['compile'], "CRI'https://example.com/path'");
    expect(hex(tagged)).toBe('d863' + bareHex);
  });

  test('DT/IP/CRI keep their notation through a full compile/decompile round-trip', async () => {
    for (const cdn of [
      "DT'2024-01-01T00:00:00Z'",
      "IP'192.0.2.1'",
      "CRI'https://example.com/path'",
    ]) {
      const compiled = await run(['compile'], cdn);
      const back = await run(['decompile', '--indent', '0'], compiled.stdout);
      expect(text(back).trim()).toBe(cdn);
    }
  });

  test('reads a file and writes to -o', async () => {
    const inFile = join(dir, 'in.cdn');
    const outFile = join(dir, 'out.cbor');
    await writeFile(inFile, '[1, 2, 3]');
    const r = await run(['compile', inFile, '-o', outFile]);
    expect(r.code).toBe(0);
    expect((await readFile(outFile)).toString('hex')).toBe('83010203');
  });

  test('fails with a message on invalid CDN', async () => {
    const r = await run(['compile'], '{invalid');
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('cbor:');
  });
});

describe('implicit decompile (no subcommand)', () => {
  test('cbor <file> decompiles the file', async () => {
    const file = join(dir, 'implicit.cbor');
    await writeFile(file, MAP_A1);
    const r = await run([file]);
    expect(r.code).toBe(0);
    expect(text(r)).toBe('{\n  "a": 1\n}\n');
  });

  test('piped stdin with no arguments is decompiled', async () => {
    const r = await run([], MAP_A1);
    expect(r.code).toBe(0);
    expect(text(r)).toBe('{\n  "a": 1\n}\n');
  });

  test('decompile options work without the subcommand', async () => {
    const r = await run(['--indent', '0', '-'], MAP_A1);
    expect(r.code).toBe(0);
    expect(text(r).trim()).toBe('{"a":1}');
  });

  test('value flags before the file are not mistaken for input', async () => {
    const file = join(dir, 'implicit2.cbor');
    const out = join(dir, 'implicit2.cdn');
    await writeFile(file, MAP_A1);
    const r = await run(['-o', out, file]);
    expect(r.code).toBe(0);
    expect(await readFile(out, 'utf-8')).toBe('{\n  "a": 1\n}\n');
  });

  test('a positional after -- is treated as a file even if named like a subcommand', async () => {
    await writeFile(join(dir, 'compile'), MAP_A1);
    const r = await run(['--', 'compile'], undefined, { cwd: dir });
    expect(r.code).toBe(0);
    expect(text(r)).toBe('{\n  "a": 1\n}\n');
  });

  test('--help still shows the command list', async () => {
    const r = await run(['--help']);
    expect(r.code).toBe(0);
    expect(text(r)).toContain('COMMANDS');
    expect(text(r)).toContain('decompile');
  });
});

describe('cbor decompile', () => {
  test('decompiles CBOR from stdin to CDN', async () => {
    const r = await run(['decompile'], MAP_A1);
    expect(r.code).toBe(0);
    expect(text(r)).toBe('{\n  "a": 1\n}\n');
  });

  test('--indent 0 emits single-line output', async () => {
    const r = await run(['decompile', '--indent', '0'], MAP_A1);
    expect(text(r).trim()).toBe('{"a":1}');
  });

  test('rejects a non-numeric --indent', async () => {
    const r = await run(['decompile', '--indent', 'x'], MAP_A1);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('--indent');
  });

  test('--int-format hex renders integers in hex', async () => {
    const r = await run(
      ['decompile', '--int-format', 'hex'],
      Buffer.from('182a', 'hex')
    );
    expect(text(r).trim()).toBe('0x2a');
  });

  test('--bstr-encoding base64 renders byte strings as b64', async () => {
    const r = await run(
      ['decompile', '--bstr-encoding', 'base64'],
      Buffer.from('420203', 'hex')
    );
    expect(text(r).trim()).toBe("b64'AgM'");
  });

  test('rejects an unknown --bstr-encoding value', async () => {
    const r = await run(['decompile', '--bstr-encoding', 'nope'], MAP_A1);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('--bstr-encoding');
  });

  test('decompiles a CBOR sequence to multiple CDN items', async () => {
    const r = await run(['decompile'], Buffer.from('0102', 'hex'));
    expect(text(r)).toBe('1\n2\n');
  });

  test('strict mode fails on duplicate map keys', async () => {
    const r = await run(['decompile'], DUP_KEY);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('duplicate');
  });

  test('--no-strict reports duplicate keys as a warning and continues', async () => {
    const r = await run(['decompile', '--no-strict', '--indent', '0'], DUP_KEY);
    expect(r.code).toBe(0);
    expect(r.stderr).toContain('warning');
    expect(text(r).trim()).toBe('{"a":1,"a":2}');
  });
});

describe('cbor format', () => {
  test('pretty-prints CDN and preserves comments by default', async () => {
    const r = await run(['format'], '# top\n{"x": 1, }');
    expect(r.code).toBe(0);
    expect(text(r)).toContain('# top');
    expect(text(r)).toContain('"x": 1');
    expect(text(r)).not.toContain(', }');
  });

  test('--no-preserve-comments strips comments', async () => {
    const r = await run(
      ['format', '--no-preserve-comments'],
      '# top\n{"x": 1}'
    );
    expect(text(r)).not.toContain('# top');
  });

  test('formats a multi-item sequence', async () => {
    const r = await run(['format', '--indent', '0'], '1,2');
    expect(text(r)).toBe('1\n2\n');
  });

  test('--commas trailing emits trailing commas', async () => {
    const r = await run(['format', '--commas', 'trailing'], '[1, 2]');
    expect(text(r)).toContain('2,');
  });

  test('--split-cdn (default: on) splits a string whose content parses as CDN', async () => {
    const on = await run(['format', '--indent', '2'], '"{\\"a\\":1}"');
    expect(text(on)).toContain('" +');
    expect(text(on).trim().endsWith('"}"')).toBe(true);
    const off = await run(
      ['format', '--no-split-cdn', '--indent', '2'],
      '"{\\"a\\":1}"'
    );
    expect(text(off).trim()).toBe('"{\\"a\\":1}"');
  });

  test('--split-newline (default: on) splits a string at newlines', async () => {
    const on = await run(['format', '--indent', '2'], '"line1\\nline2"');
    expect(text(on)).toBe('"line1\\n" +\n  "line2"\n');
    const off = await run(
      ['format', '--no-split-newline', '--indent', '2'],
      '"line1\\nline2"'
    );
    expect(text(off).trim()).toBe('"line1\\nline2"');
  });

  test('--preserve-concatenation (default: on) keeps source "a" + "b" parts', async () => {
    const preserved = await run(['format', '--indent', '2'], '"a" + "b"');
    expect(text(preserved)).toBe('"a" +\n  "b"\n');
    const joined = await run(
      ['format', '--no-preserve-concatenation', '--indent', '2'],
      '"a" + "b"'
    );
    expect(text(joined).trim()).toBe('"ab"');
  });
});

describe('cbor toHex', () => {
  test('emits an annotated hex dump', async () => {
    const r = await run(['toHex'], MAP_A1);
    expect(r.code).toBe(0);
    expect(text(r)).toContain('A1');
    expect(text(r)).toContain('--');
  });

  test('--comment-style "#" switches the comment marker', async () => {
    const r = await run(['toHex', '--comment-style', '#'], MAP_A1);
    expect(text(r)).toContain('#');
    expect(text(r)).not.toContain('--');
  });

  test('--no-annotate emits plain hex', async () => {
    const r = await run(['toHex', '--no-annotate'], MAP_A1);
    expect(text(r).trim()).toBe('a1616101');
  });
});

describe('cbor fromHex', () => {
  test('round-trips an annotated dump back to CBOR', async () => {
    const dump = await run(['toHex'], MAP_A1);
    const r = await run(['fromHex'], text(dump));
    expect(r.code).toBe(0);
    expect(hex(r)).toBe('a1616101');
  });

  test('--format plain parses bare hex with whitespace', async () => {
    const r = await run(['fromHex', '--format', 'plain'], 'a1 61 61\n01');
    expect(hex(r)).toBe('a1616101');
  });

  test('--format plain rejects non-hex characters', async () => {
    const r = await run(['fromHex', '--format', 'plain'], 'xyz');
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('non-hex');
  });

  test('--format plain rejects odd-length hex', async () => {
    const r = await run(['fromHex', '--format', 'plain'], 'a16');
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('odd-length');
  });
});

describe('cbor validate', () => {
  test('valid CBOR reports ok and exits 0', async () => {
    const r = await run(['validate'], MAP_A1);
    expect(r.code).toBe(0);
    expect(text(r)).toContain('ok (1 item)');
  });

  test('duplicate map keys report a warning and exit 1', async () => {
    const r = await run(['validate'], DUP_KEY);
    expect(r.code).toBe(1);
    expect(text(r)).toContain('warning');
    expect(text(r)).toContain('duplicate map key');
  });

  test('truncated CBOR reports invalid and exits 1', async () => {
    const r = await run(['validate'], Buffer.from('a261', 'hex'));
    expect(r.code).toBe(1);
    expect(text(r)).toContain('invalid');
  });

  test('report lines go to stdout; only the invalid case also writes to stderr', async () => {
    const ok = await run(['validate'], MAP_A1);
    expect(ok.stderr).toBe('');
    const warn = await run(['validate'], DUP_KEY);
    expect(warn.stderr).toBe('');
    const invalid = await run(['validate'], Buffer.from('a261', 'hex'));
    expect(invalid.stderr).toContain('cbor:');
  });

  test('any thrown error (not just parse/decode) reaches the invalid case', async () => {
    const badType = await run(['validate', '--type', 'bogus'], '1');
    expect(badType.code).toBe(1);
    expect(text(badType)).toContain('invalid');
    expect(badType.stderr).toContain('cbor:');

    const badFile = await run(['validate', join(dir, 'does-not-exist')]);
    expect(badFile.code).toBe(1);
    expect(text(badFile)).toContain('invalid');
    expect(badFile.stderr).toContain('cbor:');
  });

  test('--type cdn validates CDN text', async () => {
    const r = await run(['validate', '--type', 'cdn'], '{"a": 1} true');
    expect(r.code).toBe(0);
    expect(text(r)).toContain('ok (2 items)');
  });

  test('--type hex validates an annotated hex dump', async () => {
    const dump = await run(['toHex'], MAP_A1);
    const r = await run(['validate', '--type', 'hex'], text(dump));
    expect(r.code).toBe(0);
    expect(text(r)).toContain('ok (1 item)');
  });

  test('file name appears in the report', async () => {
    const file = join(dir, 'valid.cbor');
    await writeFile(file, MAP_A1);
    const r = await run(['validate', file]);
    expect(text(r)).toContain(file);
  });
});

describe('--extensions', () => {
  // tag 37 over 16 bytes — decompiles to UUID'…' only when uuid is enabled
  const UUID_TAGGED = Buffer.from(
    'd82550019e226f78d878928c9179013e6905e2',
    'hex'
  );

  test('default enables builtins and extras alike', async () => {
    const r = await run(['compile'], "[dt'2024-01-01T00:00:00Z', hash'foo']");
    expect(r.code).toBe(0);
  });

  test('none disables an extra extension (uuid tag renders generically)', async () => {
    const on = await run(['decompile', '--indent', '0'], UUID_TAGGED);
    expect(text(on).trim()).toBe("UUID'019e226f-78d8-7892-8c91-79013e6905e2'");
    const off = await run(
      ['decompile', '--indent', '0', '--extensions', 'none'],
      UUID_TAGGED
    );
    expect(text(off).trim()).toBe("37(h'019e226f78d878928c9179013e6905e2')");
  });

  test('none wraps disabled prefixes in CPA999 with a warning', async () => {
    const r = await run(
      ['compile', '--extensions', 'none'],
      "dt'2024-01-01T00:00:00Z'"
    );
    expect(r.code).toBe(0);
    expect(r.stderr).toContain('warning');
    const back = await run(['decompile', '--indent', '0'], r.stdout);
    expect(text(back).trim()).toBe('999(["dt","2024-01-01T00:00:00Z"])');
  });

  test('a comma-separated allowlist enables exactly those extensions', async () => {
    const dt = await run(
      ['compile', '--extensions', 'dt,t1'],
      "dt'2024-01-01T00:00:00Z'"
    );
    expect(hex(dt)).toBe('1a65920080');
    const t1 = await run(['compile', '--extensions', 'dt,t1'], "t1<<'a','b'>>");
    expect(hex(t1)).toBe('626162');
    const hash = await run(
      ['compile', '--extensions', 'dt,t1', '--unresolved', 'error'],
      "hash'foo'"
    );
    expect(hash.code).toBe(1);
  });

  test('--unresolved error rejects disabled prefixes', async () => {
    const r = await run(
      ['compile', '--extensions', 'none', '--unresolved', 'error'],
      "dt'2024-01-01T00:00:00Z'"
    );
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('dt');
  });

  test('validate reports disabled-extension usage as a warning', async () => {
    const r = await run(
      ['validate', '--type', 'cdn', '--extensions', 'none'],
      "dt'2024-01-01T00:00:00Z'"
    );
    expect(r.code).toBe(1);
    expect(text(r)).toContain('warning');
  });

  test('an unknown extension name fails with the available list', async () => {
    const r = await run(['compile', '--extensions', 'bogus'], '1');
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('bogus');
    expect(r.stderr).toContain('uuid');
  });

  test('works with the implicit decompile command', async () => {
    const r = await run(['--extensions', 'none', '--indent', '0'], UUID_TAGGED);
    expect(r.code).toBe(0);
    expect(text(r).trim()).toBe("37(h'019e226f78d878928c9179013e6905e2')");
  });
});

describe('round-trips', () => {
  test('compile → decompile → compile is stable', async () => {
    const src = '{"name": "cbor", "versions": [1, 2, 3], "data": h\'0203\'}';
    const bytes1 = await run(['compile'], src);
    const cdn = await run(['decompile'], bytes1.stdout);
    const bytes2 = await run(['compile'], text(cdn));
    expect(hex(bytes2)).toBe(hex(bytes1));
  });

  test('toHex → fromHex is stable for a sequence', async () => {
    // includes a float16 NaN with payload (f97ef0), which must survive
    const seq = Buffer.from('0102a1616101f97ef0', 'hex');
    const dump = await run(['toHex'], seq);
    const back = await run(['fromHex'], text(dump));
    expect(hex(back)).toBe('0102a1616101f97ef0');
  });
});
