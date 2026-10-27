// Reglas GS1 del dominio (RD-03, DDS 7.4). El backend recibe GTIN de 8 o 13
// dígitos ya normalizados por la aplicación (M-09) y vuelve a validarlos.

export function hasValidGtinCheckDigit(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const checkDigit = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === checkDigit;
}

export const INTERNAL_CODE_PATTERN = /^INV-[0-9A-HJKMNP-TV-Z]{10}$/;

export type CodeClassification = "GTIN" | "INTERNAL" | "UNKNOWN";

// Clasifica un código leído con la cámara (RF-09).
export function classifyCode(code: string): CodeClassification {
  if (INTERNAL_CODE_PATTERN.test(code)) return "INTERNAL";
  if (/^\d{8}$|^\d{12,13}$/.test(code) && hasValidGtinCheckDigit(code)) return "GTIN";
  return "UNKNOWN";
}
