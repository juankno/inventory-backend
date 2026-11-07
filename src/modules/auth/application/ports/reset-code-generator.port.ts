export interface ResetCodeGenerator {
  /** Código de 6 dígitos que se envía al correo (RF-04). */
  generate(): string;
}
