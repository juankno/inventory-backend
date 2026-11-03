export type ErrorStatus = 400 | 401 | 404 | 409 | 500;

export const errorCatalog = {
  INVALID_JSON: {
    status: 400,
    message: "La petición no tiene un formato válido.",
  },
  VALIDATION_ERROR: {
    status: 400,
    message: "Los datos enviados no son válidos.",
  },
  NOT_FOUND: { status: 404, message: "El recurso solicitado no existe." },
  INTERNAL_ERROR: {
    status: 500,
    message: "Ocurrió un error inesperado. Intenta de nuevo.",
  },
} as const satisfies Record<string, { status: ErrorStatus; message: string }>;

export type ErrorCode = keyof typeof errorCatalog;
