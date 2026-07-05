import { defineCommand } from 'citty';
import { cbor } from '../cbor.js';
import { readBinaryInput, writeTextOutput } from '../io.js';
import { cdnRenderArgs, cdnRenderOptions } from '../options.js';
import { fail, warningOpts } from '../report.js';

/** Exported so the implicit-decompile argv scan can mirror these flags. */
export const decompileArgs = {
  input: {
    type: 'positional',
    description: 'Input CBOR file (- or omit for stdin)',
    required: false,
  },
  output: {
    type: 'string',
    alias: 'o',
    description: 'Output CDN file (default: stdout)',
  },
  ...cdnRenderArgs,
  strict: {
    type: 'boolean',
    default: true,
    description: 'Treat CBOR validity violations as errors',
    negativeDescription:
      'Report CBOR validity violations as warnings and continue',
  },
} as const;

export default defineCommand({
  meta: {
    name: 'decompile',
    description: 'Decompile CBOR binary data into CDN text',
  },
  args: decompileArgs,
  async run({ args }) {
    try {
      const bytes = await readBinaryInput(args.input);
      const cdn = cbor.decompile(bytes, {
        ...warningOpts(args.strict),
        ...cdnRenderOptions(args),
      });
      await writeTextOutput(args.output, cdn);
    } catch (err) {
      fail(err);
    }
  },
});
