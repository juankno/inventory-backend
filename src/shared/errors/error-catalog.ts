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
  DATA_POLICY_NOT_ACCEPTED: {
    status: 400,
    message: "Debes aceptar la política de datos para continuar.",
  },
  EMAIL_ALREADY_REGISTERED: {
    status: 409,
    message:
      "Ya existe una cuenta con este correo. Inicia sesión o usa otro correo.",
  },
  PRODUCT_CODE_ALREADY_EXISTS: {
    status: 409,
    message: "Ya existe un producto con este código en tu negocio.",
  },
  INVALID_CREDENTIALS: {
    status: 401,
    message: "Correo o contraseña incorrectos.",
  },
  UNAUTHORIZED: {
    status: 401,
    message: "Tu sesión terminó. Ingresa de nuevo.",
  },
  INTERNAL_ERROR: {
    status: 500,
    message: "Ocurrió un error inesperado. Intenta de nuevo.",
  },
} as const satisfies Record<string, { status: ErrorStatus; message: string }>;

export type ErrorCode = keyof typeof errorCatalog;
