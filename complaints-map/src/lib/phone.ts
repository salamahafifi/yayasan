/**
 * Malaysian mobile validation and normalisation.
 * Accepts 01X… (9–10 digits after leading 0) or +601X… equivalent.
 */

export type PhoneParseResult =
  | { ok: true; empty: true }
  | { ok: true; empty: false; e164: string }
  | { ok: false; empty: false };

/** Strip spaces, dashes, brackets, and common separators. */
export function stripPhoneInput(raw: string): string {
  return raw.replace(/[\s\-().]/g, '');
}

/**
 * Parse optional Malaysian mobile input.
 * Empty / whitespace-only → ok empty.
 * Valid → ok with E.164 (+60…).
 * Non-empty invalid → not ok (caller must require fix or clear).
 */
export function parseMalaysianMobile(raw: string): PhoneParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, empty: true };

  let digits = stripPhoneInput(trimmed);

  // Allow a single leading +
  const hadPlus = digits.startsWith('+');
  if (hadPlus) digits = digits.slice(1);

  if (!/^\d+$/.test(digits)) return { ok: false, empty: false };

  let national: string;

  if (digits.startsWith('0')) {
    // Local: 0 + 9 or 10 digits, must be mobile 01…
    if (digits.length !== 10 && digits.length !== 11) return { ok: false, empty: false };
    if (!digits.startsWith('01')) return { ok: false, empty: false };
    national = digits.slice(1); // drop leading 0
  } else if (digits.startsWith('60')) {
    // Country code without +: 60 + 9 or 10 national digits starting with 1
    const rest = digits.slice(2);
    if (rest.length !== 9 && rest.length !== 10) return { ok: false, empty: false };
    if (!rest.startsWith('1')) return { ok: false, empty: false };
    national = rest;
  } else if (hadPlus) {
    // + then digits without 60 prefix is not a MY number we accept
    return { ok: false, empty: false };
  } else {
    return { ok: false, empty: false };
  }

  return { ok: true, empty: false, e164: `+60${national}` };
}

/** True when the field is empty or a valid MY mobile (ready to proceed). */
export function isPhoneFieldAcceptable(raw: string): boolean {
  return parseMalaysianMobile(raw).ok;
}

/** Value to send on submit: null if empty, E.164 if valid. */
export function phoneForSubmit(raw: string): string | null {
  const parsed = parseMalaysianMobile(raw);
  if (!parsed.ok || parsed.empty) return null;
  return parsed.e164;
}
