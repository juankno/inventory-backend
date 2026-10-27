// Error de la aplicación que la capa de presentación traduce a {code, message} (DDS 8.1).
// code va en inglés para la aplicación móvil; message, en español para el usuario (G-07).
export class AppError extends Error {
  constructor(
    readonly status: 400 | 401 | 404 | 409,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
