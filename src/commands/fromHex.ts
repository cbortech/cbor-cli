import { defineCommand } from 'citty';
import { cbor } from '../cbor.js';
import { readTextInput, writeBinaryOutput } from '../io.js';
import { pick } from '../options.js';
import { fail, warningOpts } from '../report.js';

const FORMAT = ['annotated', 'plain'] as const;

export default defineCommand({
  meta: {
    name: 'fromHex',
    description: 'Convert a hex dump to CBOR binary data',
  },
  args: {
    input: {
      type: 'positional',
      description: 'Input hex dump file (- or omit for stdin)',
      required: false,
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'Output CBOR file (default: stdout)',
    },
    format: {
      type: 'string',
      default: 'annotated',
      description: 'Input format: annotated | plain',
    },
    strict: {
      type: 'boolean',
      default: true,
      description: 'Treat CBOR validity violations as errors',
      negativeDescription:
        'Report CBOR validity violations as warnings and continue',
    },
  },
  async run({ args }) {
    try {
      const text = await readTextInput(args.input);
      const format = pick(args.format, FORMAT, 'format', 'annotated');

      let bytes: Uint8Array;
      if (format === 'plain') {
        const hex = text.replace(/\s+/g, '');
        if (!/^[0-9a-fA-F]*$/.test(hex)) {
          throw new Error('input contains non-hex characters');
        }
        if (hex.length % 2 !== 0) {
          throw new Error(`odd-length hex string (${hex.length} chars)`);
        }
        bytes = Buffer.from(hex, 'hex');
      } else {
        bytes = cbor.fromHex(text, warningOpts(args.strict));
      }

      await writeBinaryOutput(args.output, bytes);
    } catch (err) {
      fail(err);
    }
  },
});
