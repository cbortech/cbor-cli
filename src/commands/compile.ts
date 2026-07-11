import { defineCommand } from 'citty';
import { createCbor } from '../cbor.js';
import { readTextInput, writeBinaryOutput } from '../io.js';
import { extensionsArg, unresolvedArg, unresolvedOption } from '../options.js';
import { collectWarnings, fail } from '../report.js';

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
    ...extensionsArg,
    ...unresolvedArg,
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
      const cbor = createCbor(args.extensions);
      const text = await readTextInput(args.input);
      const warnings = collectWarnings(args.strict);
      const bytes = cbor.compile(text, {
        ...warnings.opts,
        unresolvedExtension: unresolvedOption(args.unresolved),
      });
      warnings.flush();
      await writeBinaryOutput(args.output, bytes);
    } catch (err) {
      fail(err);
    }
  },
});
