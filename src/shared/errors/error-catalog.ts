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
  INVALID_GTIN: {
    status: 400,
    message: "El código de barras no es válido. Escanéalo de nuevo.",
  },
  INVALID_QUANTITY: {
    status: 400,
    message:
      "Revisa las cantidades: usa máximo 2 decimales y números enteros si vendes por unidad.",
  },
  CODE_ALREADY_REGISTERED: {
    status: 409,
    message: "Ya existe un producto con este código en tu negocio.",
  },
  CODE_OF_DELETED_PRODUCT: {
    status: 409,
    message:
      "Este código es de un producto que eliminaste. Puedes restaurarlo desde Productos eliminados.",
  },
  INVALID_CREDENTIALS: {
    status: 401,
    message: "Correo o contraseña incorrectos.",
  },
  INVALID_RESET_CODE: {
    status: 400,
    message: "El código no es válido o ya venció. Pide uno nuevo.",
  },
  EMAIL_NOT_SENT: {
    status: 500,
    message: "No pudimos enviar el correo. Intenta de nuevo en unos minutos.",
  },
  UNAUTHORIZED: {
    status: 401,
    message: "Tu sesión terminó. Ingresa de nuevo.",
  },
  INTERNAL_ERROR: {
    status: 500,
    message: "Ocurrió un error inesperado. Intenta de nuevo.",
  },
  PRODUCT_NOT_FOUND: {
    status: 404,
    message: "Este producto no está en tu inventario.",
  },
  INVALID_UNIT_CHANGE: {
    status: 409,
    message:
      "No puedes cambiar a unidades: la existencia tiene decimales. Haz primero un ajuste.",
  },
  INSUFFICIENT_STOCK: {
    status: 409,
    message:
      "No hay existencias suficientes para esta salida. Revisa la cantidad o haz un ajuste.",
  },
  IDEMPOTENCY_KEY_CONFLICT: {
    status: 409,
    message: "No pudimos registrar el movimiento. Intenta de nuevo.",
  },
  CODE_NOT_RECOGNIZED: {
    status: 404,
    message: "Este código no corresponde a un producto de tu inventario.",
  },
} as const satisfies Record<string, { status: ErrorStatus; message: string }>;

export type ErrorCode = keyof typeof errorCatalog;
