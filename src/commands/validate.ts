import { defineCommand } from 'citty';
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
      const input =
        type === 'cbor'
          ? await readBinaryInput(args.input)
          : await readTextInput(args.input);

      const result = cbor.validate(input, {
        type,
        unresolvedExtension: unresolvedOption(args.unresolved),
      });

      for (const hint of result.hints) {
        process.stdout.write(`${name}: hint: ${describeWarning(hint)}\n`);
      }
      for (const warning of result.warnings) {
        process.stdout.write(`${name}: warning: ${describeWarning(warning)}\n`);
      }

      if (result.error) {
        process.stdout.write(`${name}: invalid\n`);
        fail(result.error);
        return;
      }
      const items = `${result.count} item${result.count === 1 ? '' : 's'}`;
      if (result.warnings.length > 0) {
        process.stdout.write(
          `${name}: ${items}, ${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}\n`
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
