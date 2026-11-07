import jwt, { type JwtPayload } from "jsonwebtoken";

import { JwtTokenService } from "./jwt-token-service.ts";

const secret = "secreto-de-prueba-de-16+";
const payload = { userId: "user-1", businessId: "business-1" };

describe("JwtTokenService", () => {
  describe("sign", () => {
    it("should put the userId in sub and the businessId in the payload", () => {
      const tokenService = new JwtTokenService(secret, "1h");

      const token = tokenService.sign(payload);

      const decoded = jwt.verify(token, secret) as JwtPayload;
      expect(decoded.sub).toBe("user-1");
      expect(decoded.businessId).toBe("business-1");
    });

    it("should not include any other custom claim", () => {
      const tokenService = new JwtTokenService(secret, "1h");

      const token = tokenService.sign(payload);

      const decoded = jwt.verify(token, secret) as JwtPayload;
      expect(Object.keys(decoded).sort()).toEqual(["businessId", "exp", "iat", "sub"]);
    });

    it("should set the expiration according to expiresIn", () => {
      const tokenService = new JwtTokenService(secret, "1h");

      const token = tokenService.sign(payload);

      const decoded = jwt.verify(token, secret) as JwtPayload;
      expect((decoded.exp ?? 0) - (decoded.iat ?? 0)).toBe(3600);
    });

    it("should sign with HS256", () => {
      const tokenService = new JwtTokenService(secret, "1h");

      const token = tokenService.sign(payload);

      const decoded = jwt.decode(token, { complete: true });
      expect(decoded?.header.alg).toBe("HS256");
    });

    it("should produce a token that cannot be verified with a different secret", () => {
      const tokenService = new JwtTokenService(secret, "1h");

      const token = tokenService.sign(payload);

      expect(() => jwt.verify(token, "otro-secreto-de-16-caracteres")).toThrow();
    });
  });

  describe("verify", () => {
    it("should return userId and businessId when the token is valid", () => {
      const tokenService = new JwtTokenService(secret, "1h");
      const token = tokenService.sign(payload);

      const decoded = tokenService.verify(token);

      expect(decoded).toEqual({ userId: "user-1", businessId: "business-1" });
    });

    it("should return null when the token was signed with a different secret", () => {
      const tokenService = new JwtTokenService(secret, "1h");
      const token = new JwtTokenService("otro-secreto-de-16-caracteres", "1h").sign(payload);

      const decoded = tokenService.verify(token);

      expect(decoded).toBeNull();
    });

    it("should return null when the token has expired", () => {
      const tokenService = new JwtTokenService(secret, "1h");
      const expiredAt = Math.floor(Date.now() / 1000) - 60;
      const token = jwt.sign({ businessId: "business-1", exp: expiredAt }, secret, {
        subject: "user-1",
      });

      const decoded = tokenService.verify(token);

      expect(decoded).toBeNull();
    });

    it("should return null when the token is malformed", () => {
      const tokenService = new JwtTokenService(secret, "1h");

      const decoded = tokenService.verify("not-a-jwt");

      expect(decoded).toBeNull();
    });

    it("should return null when the token uses an algorithm other than HS256", () => {
      const tokenService = new JwtTokenService(secret, "1h");
      const token = jwt.sign({ businessId: "business-1" }, secret, {
        algorithm: "HS512",
        subject: "user-1",
      });

      const decoded = tokenService.verify(token);

      expect(decoded).toBeNull();
    });

    it("should return null when the token has no businessId", () => {
      const tokenService = new JwtTokenService(secret, "1h");
      const token = jwt.sign({}, secret, { subject: "user-1" });

      const decoded = tokenService.verify(token);

      expect(decoded).toBeNull();
    });

    it("should return null when businessId is not a string", () => {
      const tokenService = new JwtTokenService(secret, "1h");
      const token = jwt.sign({ businessId: 123 }, secret, { subject: "user-1" });

      const decoded = tokenService.verify(token);

      expect(decoded).toBeNull();
    });

    it("should return null when the token has no sub", () => {
      const tokenService = new JwtTokenService(secret, "1h");
      const token = jwt.sign({ businessId: "business-1" }, secret);

      const decoded = tokenService.verify(token);

      expect(decoded).toBeNull();
    });
  });
});
