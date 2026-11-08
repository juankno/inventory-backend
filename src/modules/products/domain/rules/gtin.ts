export function hasValidGtinCheckDigit(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const checkDigit = digits.at(-1);
  if (checkDigit === undefined) return false;

  const sum = digits
    .slice(0, -1)
    .reverse()
    .reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === checkDigit;
}

export function isRegistrableGtin(code: string): boolean {
  return /^\d{8}$|^\d{13}$/.test(code) && hasValidGtinCheckDigit(code);
}

export const INTERNAL_CODE_PATTERN = /^INV-[0-9A-HJKMNP-TV-Z]{10}$/;

export type CodeClassification = "GTIN" | "INTERNAL" | "UNKNOWN";

export function classifyCode(code: string): CodeClassification {
  if (INTERNAL_CODE_PATTERN.test(code)) return "INTERNAL";
  if (/^\d{8}$|^\d{12,13}$/.test(code) && hasValidGtinCheckDigit(code))
    return "GTIN";
  return "UNKNOWN";
}
