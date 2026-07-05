import { defineCommand } from 'citty';
import { cbor } from '../cbor.js';
import { readTextInput, writeBinaryOutput } from '../io.js';
import { fail, warningOpts } from '../report.js';

export default defineCommand({
  meta: {
    name: 'compile',
    description: 'Compile CDN text into CBOR binary data',
  },
  args: {
    input: {
      type: 'positional',
      description: 'Input CDN file (- or omit for stdin)',
      required: false,
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'Output CBOR file (default: stdout)',
    },
    strict: {
      type: 'boolean',
      default: true,
      description: 'Treat CDN validity violations as errors',
      negativeDescription:
        'Report CDN validity violations as warnings and continue',
    },
  },
  async run({ args }) {
    try {
      const text = await readTextInput(args.input);
      const bytes = cbor.compile(text, warningOpts(args.strict));
      await writeBinaryOutput(args.output, bytes);
    } catch (err) {
      fail(err);
    }
  },
});
