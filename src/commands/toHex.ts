import { defineCommand } from 'citty';
import type { ToHexDumpOptions } from '@cbortech/cbor';
import { createCbor } from '../cbor.js';
import { readBinaryInput, writeTextOutput } from '../io.js';
import { pick, parseIndent, extensionsArg } from '../options.js';
import { collectWarnings, fail } from '../report.js';

const COMMENT_STYLE = ['--', '#'] as const;

export default defineCommand({
  meta: {
    name: 'toHex',
    description: 'Convert CBOR binary data to an annotated hex dump',
  },
  args: {
    input: {
      type: 'positional',
      description: 'Input CBOR file (- or omit for stdin)',
      required: false,
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'Output text file (default: stdout)',
    },
    annotate: {
      type: 'boolean',
      default: true,
      description: 'Annotate the hex dump with CBOR structure comments',
      negativeDescription: 'Emit plain hex without annotations',
    },
    indent: {
      type: 'string',
      alias: 'i',
      default: '3',
      description: 'Indentation spaces per nesting level',
    },
    'comment-style': {
      type: 'string',
      default: '--',
      description: 'Comment style: -- | #',
    },
    ...extensionsArg,
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
      const cbor = createCbor(args.extensions);
      const bytes = await readBinaryInput(args.input);

      let output: string;
      if (args.annotate) {
        const opts: ToHexDumpOptions = {
          indent: parseIndent(args.indent, 3),
          commentStyle: pick(
            args['comment-style'],
            COMMENT_STYLE,
            'comment-style',
            '--'
          ),
        };
        const warnings = collectWarnings(args.strict);
        output = cbor.toHex(bytes, { ...warnings.opts, ...opts });
        warnings.flush();
      } else {
        output = Buffer.from(bytes).toString('hex');
      }

      await writeTextOutput(args.output, output);
    } catch (err) {
      fail(err);
    }
  },
});
