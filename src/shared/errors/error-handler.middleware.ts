import type { ErrorRequestHandler, RequestHandler, Response } from "express";

import { AppError } from "./app-error.ts";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError("NOT_FOUND"));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (isJsonParseError(error)) {
    sendAppError(res, new AppError("INVALID_JSON"));
    return;
  }

  if (error instanceof AppError) {
    sendAppError(res, error);
    return;
  }

  console.error(error);
  sendAppError(res, new AppError("INTERNAL_ERROR"));
};

const isJsonParseError = (error: unknown): boolean => {
  return (
    error instanceof SyntaxError &&
    "type" in error &&
    error.type === "entity.parse.failed"
  );
};

const sendAppError = (res: Response, error: AppError) => {
  res.status(error.status).json({ code: error.code, message: error.message });
};
