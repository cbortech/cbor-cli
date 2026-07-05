import { readFile, writeFile } from 'node:fs/promises';

export async function readTextInput(
  input: string | undefined
): Promise<string> {
  if (!input || input === '-')
    return (await readStdinBytes()).toString('utf-8');
  return readFile(input, 'utf-8');
}

export async function readBinaryInput(
  input: string | undefined
): Promise<Uint8Array> {
  const buf =
    !input || input === '-' ? await readStdinBytes() : await readFile(input);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export async function writeTextOutput(
  output: string | undefined,
  text: string
): Promise<void> {
  const data = text.endsWith('\n') ? text : text + '\n';
  if (output) {
    await writeFile(output, data, 'utf-8');
  } else {
    process.stdout.write(data);
  }
}

export async function writeBinaryOutput(
  output: string | undefined,
  bytes: Uint8Array
): Promise<void> {
  if (output) {
    await writeFile(output, bytes);
    return;
  }
  if (process.stdout.isTTY) {
    throw new Error(
      'refusing to write CBOR binary data to a terminal; use -o <file> or pipe the output'
    );
  }
  await new Promise<void>((resolve, reject) =>
    process.stdout.write(bytes, (err) => (err ? reject(err) : resolve()))
  );
}

function readStdinBytes(): Promise<Buffer> {
  if (process.stdin.isTTY) {
    process.stderr.write('cbor: reading from stdin (press Ctrl-D to finish)\n');
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks)));
    process.stdin.on('error', reject);
  });
}
