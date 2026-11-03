import {
  errorCatalog,
  type ErrorCode,
  type ErrorStatus,
} from "./error-catalog.ts";

export class AppError extends Error {
  readonly status: ErrorStatus;

  constructor(readonly code: ErrorCode) {
    super(errorCatalog[code].message);
    this.status = errorCatalog[code].status;
    this.name = "AppError";
  }
}
