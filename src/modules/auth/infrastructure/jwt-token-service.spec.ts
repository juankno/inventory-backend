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
});
