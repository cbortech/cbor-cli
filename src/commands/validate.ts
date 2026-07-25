import { defineCommand } from 'citty';
import { readFile } from 'node:fs/promises';
import { createCbor } from '../cbor.js';
import { readBinaryInput, readTextInput } from '../io.js';
import {
  pick,
  extensionsArg,
  unresolvedArg,
  unresolvedOption,
} from '../options.js';
import { describeCddlError, describeWarning, fail } from '../report.js';

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
    cddl: {
      type: 'string',
      description:
        'CDDL schema file to validate each decoded/parsed item against',
    },
    'cddl-rule': {
      type: 'string',
      description:
        'CDDL rule to validate against (default: the schema root rule)',
    },
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
      const cddl = args.cddl ? await readFile(args.cddl, 'utf-8') : undefined;

      const result = cbor.validate(input, {
        type,
        unresolvedExtension: unresolvedOption(args.unresolved),
        cddl,
        cddlValidationOptions: args['cddl-rule']
          ? { rule: args['cddl-rule'] }
          : undefined,
      });

      for (const hint of result.hints) {
        process.stdout.write(`${name}: hint: ${describeWarning(hint)}\n`);
      }
      for (const warning of result.warnings) {
        process.stdout.write(`${name}: warning: ${describeWarning(warning)}\n`);
      }
      for (const warning of result.cddlWarnings ?? []) {
        process.stdout.write(
          `${name}: cddl warning: ${describeCddlError(warning)}\n`
        );
      }
      for (const error of result.cddlErrors ?? []) {
        process.stdout.write(
          `${name}: cddl violation: ${describeCddlError(error)}\n`
        );
      }

      if (result.error) {
        process.stdout.write(`${name}: invalid\n`);
        fail(result.error);
        return;
      }
      const items = `${result.count} item${result.count === 1 ? '' : 's'}`;
      const cddlErrorCount = result.cddlErrors?.length ?? 0;
      const warningCount = result.warnings.length;
      if (cddlErrorCount > 0) {
        const warningPart =
          warningCount > 0
            ? `, ${warningCount} warning${warningCount === 1 ? '' : 's'}`
            : '';
        process.stdout.write(
          `${name}: invalid (${items}${warningPart}, ${cddlErrorCount} CDDL violation${cddlErrorCount === 1 ? '' : 's'})\n`
        );
        process.exitCode = 1;
      } else if (warningCount > 0) {
        process.stdout.write(
          `${name}: ${items}, ${warningCount} warning${warningCount === 1 ? '' : 's'}\n`
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
