import { defineCommand } from 'citty';
import type { DecodeWarning, ParseWarning } from '@cbortech/cbor';
import { createCbor } from '../cbor.js';
import { readBinaryInput, readTextInput } from '../io.js';
import {
  pick,
  extensionsArg,
  unresolvedArg,
  unresolvedOption,
} from '../options.js';
import { describeWarning, fail } from '../report.js';

const TYPES = ['cbor', 'cdn', 'hex'] as const;

export default defineCommand({
  meta: {
    name: 'validate',
    description:
      'Check CBOR / CDN / hex dump input for well-formedness and validity',
  },
  args: {
    input: {
      type: 'positional',
      description: 'Input file (- or omit for stdin)',
      required: false,
    },
    type: {
      type: 'string',
      alias: 't',
      default: 'cbor',
      description: 'Input type: cbor | cdn | hex',
    },
    ...extensionsArg,
    ...unresolvedArg,
  },
  async run({ args }) {
    const name = args.input && args.input !== '-' ? args.input : 'stdin';
    try {
      const cbor = createCbor(args.extensions);
      const type = pick(args.type, TYPES, 'type', 'cbor');
      const warnings: string[] = [];
      const opts = {
        strict: false,
        onWarning: (w: DecodeWarning | ParseWarning) =>
          warnings.push(describeWarning(w)),
      };

      let count = 0;
      if (type === 'cbor') {
        const bytes = await readBinaryInput(args.input);
        for (const _ of cbor.fromCBORSeq(bytes, opts)) count++;
      } else if (type === 'cdn') {
        const text = await readTextInput(args.input);
        const cdnOpts = {
          ...opts,
          unresolvedExtension: unresolvedOption(args.unresolved),
        };
        for (const _ of cbor.fromCDNSeq(text, cdnOpts)) count++;
      } else {
        const text = await readTextInput(args.input);
        for (const _ of cbor.fromHexDumpSeq(text, opts)) count++;
      }

      for (const w of warnings) {
        process.stdout.write(`${name}: warning: ${w}\n`);
      }
      const items = `${count} item${count === 1 ? '' : 's'}`;
      if (warnings.length > 0) {
        process.stdout.write(
          `${name}: ${items}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}\n`
        );
        process.exitCode = 1;
      } else {
        process.stdout.write(`${name}: ok (${items})\n`);
      }
    } catch (err) {
      process.stdout.write(`${name}: invalid\n`);
      fail(err);
    }
  },
});
