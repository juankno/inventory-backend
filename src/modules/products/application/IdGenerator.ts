// Puerto para generar identificadores internos (DDS Tabla 10).
export interface IdGenerator {
  generate(): string;
}
