import type { RequestHandler } from "express";
import type {
  TokenPayload,
  TokenService,
} from "../application/ports/token-service.port.ts";
import { AppError } from "../../../shared/errors/app-error.ts";

export const requireAuthMiddleware =
  (tokenService: TokenService): RequestHandler =>
  (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) throw new AppError("UNAUTHORIZED");

    const token = authHeader.split(" ")[1];
    if (!token) throw new AppError("UNAUTHORIZED");

    const payload = tokenService.verify(token);
    if (!payload) throw new AppError("UNAUTHORIZED");

    res.locals.auth = payload;
    next();
  };

declare global {
  namespace Express {
    interface Locals {
      auth: TokenPayload;
    }
  }
}
