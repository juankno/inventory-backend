import { jest } from "@jest/globals";
import type { Request, Response } from "express";

import { TokenServiceMock } from "../application/mocks/token-service.mock.ts";
import { requireAuthMiddleware } from "./require-auth.middleware.ts";

const tokenService = new TokenServiceMock();
const handler = requireAuthMiddleware(tokenService);

const buildRequest = (authorization?: string): Request =>
  ({ headers: authorization === undefined ? {} : { authorization } }) as unknown as Request;

const buildResponse = (): Response => ({ locals: {} }) as unknown as Response;

describe("requireAuthMiddleware", () => {
  describe("handler", () => {
    it("should store the token payload in res.locals.auth and call next when the token is valid", () => {
      const token = tokenService.sign({ userId: "user-1", businessId: "business-1" });
      const req = buildRequest(`Bearer ${token}`);
      const res = buildResponse();
      const next = jest.fn<(error?: unknown) => void>();

      handler(req, res, next);

      expect(res.locals.auth).toEqual({ userId: "user-1", businessId: "business-1" });
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it("should throw UNAUTHORIZED when the authorization header is missing", () => {
      const next = jest.fn<(error?: unknown) => void>();

      const run = () => handler(buildRequest(), buildResponse(), next);

      expect(run).toThrow(expect.objectContaining({ code: "UNAUTHORIZED" }));
      expect(next).not.toHaveBeenCalled();
    });

    it("should throw UNAUTHORIZED when the scheme is not Bearer", () => {
      const next = jest.fn<(error?: unknown) => void>();

      const run = () => handler(buildRequest("Basic abc"), buildResponse(), next);

      expect(run).toThrow(expect.objectContaining({ code: "UNAUTHORIZED" }));
      expect(next).not.toHaveBeenCalled();
    });

    it("should throw UNAUTHORIZED when the Bearer token is empty", () => {
      const next = jest.fn<(error?: unknown) => void>();

      const run = () => handler(buildRequest("Bearer "), buildResponse(), next);

      expect(run).toThrow(expect.objectContaining({ code: "UNAUTHORIZED" }));
      expect(next).not.toHaveBeenCalled();
    });

    it("should throw UNAUTHORIZED without setting res.locals.auth when the token is rejected", () => {
      const res = buildResponse();
      const next = jest.fn<(error?: unknown) => void>();

      const run = () => handler(buildRequest("Bearer invalid-token"), res, next);

      expect(run).toThrow(expect.objectContaining({ code: "UNAUTHORIZED" }));
      expect(res.locals.auth).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
