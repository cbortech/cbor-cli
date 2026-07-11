import { defineCommand } from 'citty';
import { createCbor } from '../cbor.js';
import { readTextInput, writeTextOutput } from '../io.js';
import {
  cdnRenderArgs,
  cdnRenderOptions,
  extensionsArg,
  unresolvedArg,
  unresolvedOption,
} from '../options.js';
import { collectWarnings, fail } from '../report.js';

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
      const preserveComments = args['preserve-comments'];

      const warnings = collectWarnings(args.strict);
      const items = [
        ...cbor.fromCDNSeq(text, {
          preserveComments,
          unresolvedExtension: unresolvedOption(args.unresolved),
          ...warnings.opts,
        }),
      ];

      warnings.flush();
      const toCDNOpts = { ...cdnRenderOptions(args), preserveComments };
      const formatted = items.map((item) => item.toCDN(toCDNOpts)).join('\n');
      await writeTextOutput(args.output, formatted);
    } catch (err) {
      fail(err);
    }
  },
});
