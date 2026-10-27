import type { ErrorRequestHandler, RequestHandler } from "express";

import { AppError } from "./AppError.ts";

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ code: "NOT_FOUND", message: "El recurso solicitado no existe." });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({ code: error.code, message: error.message });
    return;
  }
  if (error instanceof SyntaxError) {
    res.status(400).json({ code: "INVALID_JSON", message: "La petición no tiene un formato válido." });
    return;
  }
  console.error(error);
  res.status(500).json({ code: "INTERNAL_ERROR", message: "Ocurrió un error inesperado. Intenta de nuevo." });
};
