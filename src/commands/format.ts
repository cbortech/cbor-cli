import { defineCommand } from 'citty';
import { cbor } from '../cbor.js';
import { readTextInput, writeTextOutput } from '../io.js';
import { cdnRenderArgs, cdnRenderOptions } from '../options.js';
import { fail, warningOpts } from '../report.js';

export default defineCommand({
  meta: {
    name: 'format',
    description: 'Format CDN text (parse and re-serialize)',
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
      description: 'Output CDN file (default: stdout)',
    },
    'preserve-comments': {
      type: 'boolean',
      default: true,
      description: 'Preserve comments in output',
      negativeDescription: 'Strip comments from output',
    },
    ...cdnRenderArgs,
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
      const preserveComments = args['preserve-comments'];

      const items = [
        ...cbor.fromCDNSeq(text, {
          preserveComments,
          ...warningOpts(args.strict),
        }),
      ];

      const toCDNOpts = { ...cdnRenderOptions(args), preserveComments };
      const formatted = items.map((item) => item.toCDN(toCDNOpts)).join('\n');
      await writeTextOutput(args.output, formatted);
    } catch (err) {
      fail(err);
    }
  },
});
