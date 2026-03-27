/**
 * PETSCII encoder -- convert ASCII text to C64 keyboard buffer bytes.
 *
 * PETSCII is the Commodore character encoding. This encoder handles the
 * subset needed for keyboard injection: letters, digits, punctuation,
 * and the RETURN key.
 */

/**
 * Encode a string to PETSCII bytes for keyboard injection.
 *
 * Special sequences:
 *   \r or \n  -> RETURN (0x0D)
 *   Letters   -> uppercase PETSCII
 *   Digits    -> same as ASCII
 *   Common punctuation -> same as ASCII
 */
export function petsciiEncode(text: string): Buffer {
  const result: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;

    // Handle escape sequences
    if (ch === "\\" && i + 1 < text.length) {
      const next = text[i + 1];
      if (next === "r" || next === "n") {
        result.push(0x0d); // RETURN
        i++; // skip the next character
        continue;
      }
    }

    // Real newlines
    if (ch === "\r" || ch === "\n") {
      result.push(0x0d);
      continue;
    }

    const code = ch.charCodeAt(0);

    // Lowercase a-z -> uppercase PETSCII (subtract 32)
    if (code >= 0x61 && code <= 0x7a) {
      result.push(code - 32);
      continue;
    }

    // Uppercase A-Z -> PETSCII uppercase (same value)
    if (code >= 0x41 && code <= 0x5a) {
      result.push(code);
      continue;
    }

    // Digits 0-9, space, and common punctuation -> same as ASCII
    if (code >= 0x20 && code < 0x7f) {
      result.push(code);
      continue;
    }

    // Skip non-printable characters
  }

  return Buffer.from(result);
}

/**
 * Decode PETSCII bytes to a display string.
 * Strips 0xA0 padding, maps uppercase PETSCII to ASCII.
 */
export function petsciiDecode(bytes: Buffer, length?: number): string {
  const len = length ?? bytes.length;
  const chars: string[] = [];

  for (let i = 0; i < len && i < bytes.length; i++) {
    const b = bytes[i]!;

    if (b === 0xa0 || b === 0x00) break; // padding -- stop

    // Space, digits, punctuation (0x20-0x3F) -- same as ASCII
    if (b >= 0x20 && b <= 0x3f) {
      chars.push(String.fromCharCode(b));
    }
    // Uppercase A-Z (0x41-0x5A)
    else if (b >= 0x41 && b <= 0x5a) {
      chars.push(String.fromCharCode(b));
    }
    // Shifted uppercase (0xC1-0xDA) -> ASCII uppercase
    else if (b >= 0xc1 && b <= 0xda) {
      chars.push(String.fromCharCode(b - 0x80));
    }
    // Lowercase (0x61-0x7A)
    else if (b >= 0x61 && b <= 0x7a) {
      chars.push(String.fromCharCode(b));
    }
    // Non-printable -> space
    else if (b >= 0x20) {
      chars.push(" ");
    }
  }

  return chars.join("").trimEnd();
}
