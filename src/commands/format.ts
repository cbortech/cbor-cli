import { defineCommand } from 'citty';
import { createCbor } from '../cbor.js';
import { readTextInput, writeTextOutput } from '../io.js';
import {
  cddlArgs,
  cddlOptions,
  cdnRenderArgs,
  cdnRenderOptions,
  extensionsArg,
  unresolvedArg,
  unresolvedOption,
} from '../options.js';
import { collectWarnings, fail } from '../report.js';

const BLANK_LINE_RE = /\r?\n[ \t]*\r?\n/;

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
      description: 'Preserve comments in output (needs --indent)',
      negativeDescription: 'Strip comments from output',
    },
    ...cdnRenderArgs,
    ...extensionsArg,
    ...unresolvedArg,
    ...cddlArgs,
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
      const cddl = await cddlOptions(args);

      const warnings = collectWarnings(args.strict);
      const items = [
        ...cbor.fromCDNSeq(text, {
          preserveComments,
          unresolvedExtension: unresolvedOption(args.unresolved),
          ...cddl,
          ...warnings.opts,
        }),
      ];

      warnings.flush();
      const toCDNOpts = { ...cdnRenderOptions(args), preserveComments };
      // A blank line between two top-level sequence items lives in the
      // source text between them, outside either item's own AST, so a
      // plain `.map(toCDN).join('\n')` would always collapse it — walk the
      // gaps between items ourselves instead (mirrors the playground's
      // formatCdnText()). Only meaningful when pretty-printing (indent !==
      // 0); --preserve-blank-lines has no effect in single-line output.
      const preserveBlankLines =
        !!toCDNOpts.preserveBlankLines && toCDNOpts.indent !== 0;
      let formatted = '';
      let prevEnd: number | null = null;
      for (const item of items) {
        if (prevEnd !== null) {
          const between = text.slice(prevEnd, item.start!);
          formatted +=
            preserveBlankLines && BLANK_LINE_RE.test(between) ? '\n\n' : '\n';
        }
        formatted += item.toCDN(toCDNOpts);
        prevEnd = item.end!;
      }
      await writeTextOutput(args.output, formatted);
    } catch (err) {
      fail(err);
    }
  },
});
