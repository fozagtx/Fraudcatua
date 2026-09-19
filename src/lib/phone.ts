export function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Normalize a Ghana phone number to international digits (233XXXXXXXXX).
 * Accepts "0244123456", "+233244123456", "00233244123456", "233244123456".
 * Returns digits-only string for anything else.
 */
export function normalizePhone(input: string): string {
  const digits = digitsOnly(input);
  if (digits.startsWith("00")) {
    return digits.slice(2);
  }
  if (digits.startsWith("233")) {
    return digits;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `233${digits.slice(1)}`;
  }
  return digits;
}

/** Mask a normalized number like "233244123456" -> "024 *** 1234" style. */
export function maskPhone(normalized: string): string {
  const digits = digitsOnly(normalized);
  const local = digits.startsWith("233") ? `0${digits.slice(3)}` : digits;
  if (local.length < 7) return local;
  return `${local.slice(0, 3)} *** ${local.slice(-4)}`;
}
