const encoder = new TextEncoder();

// Длина строки в байтах UTF-8 — так её считает Solidity: bytes(value).length.
export function utf8ByteLength(value: string): number {
  return encoder.encode(value).length;
}
