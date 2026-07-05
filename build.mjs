import { build } from 'esbuild';
import { chmodSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const outfile = resolve(dir, 'dist/cbor.mjs');
const pkg = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf-8'));

await build({
  entryPoints: [resolve(dir, 'src/index.ts')],
  bundle: true,
  packages: 'external',
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile,
  define: { __CBOR_CLI_VERSION__: JSON.stringify(pkg.version) },
  banner: { js: '#!/usr/bin/env node' },
});

chmodSync(outfile, 0o755);
console.log(`Built ${outfile} (v${pkg.version})`);
