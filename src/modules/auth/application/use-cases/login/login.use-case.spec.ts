import { jest } from "@jest/globals";

import { LoginThrottleRepositoryMock } from "../../mocks/login-throttle.repository.mock.ts";
import { PasswordHasherMock } from "../../mocks/password-hasher.mock.ts";
import { TokenServiceMock } from "../../mocks/token-service.mock.ts";
import { UserRepositoryMock } from "../../mocks/user.repository.mock.ts";
import {
  LOGIN_LOCK_MINUTES,
  Login,
  MAX_LOGIN_ATTEMPTS,
  type LoginInput,
} from "./login.use-case.ts";

const validInput: LoginInput = {
  email: "rosa@correo.com",
  password: "secreta123",
};

async function setup() {
  const userRepository = new UserRepositoryMock();
  await userRepository.createAccount({
    businessName: "Tienda Doña Rosa",
    ownerName: "Rosa Martínez",
    email: "rosa@correo.com",
    passwordHash: "hashed:secreta123",
    dataPolicyAcceptedAt: new Date("2026-11-03T12:00:00Z"),
  });
  const loginThrottle = new LoginThrottleRepositoryMock();
  const login = new Login(
    userRepository,
    new PasswordHasherMock(),
    new TokenServiceMock(),
    loginThrottle,
  );
  return { userRepository, loginThrottle, login };
}

const failLogin = (login: Login, email = validInput.email) =>
  login.execute({ email, password: "equivocada" }).catch((error) => error);

const LOCK_MS = LOGIN_LOCK_MINUTES * 60_000;

describe("Login", () => {
  describe("response time", () => {
    it("should compare the password even if the email has no account", async () => {
      const userRepository = new UserRepositoryMock();
      const passwordHasher = new PasswordHasherMock();
      const compare = jest.spyOn(passwordHasher, "compare");
      const login = new Login(
        userRepository,
        passwordHasher,
        new TokenServiceMock(),
        new LoginThrottleRepositoryMock(),
      );

      await expect(
        login.execute({ email: "nadie@correo.com", password: "secreta123" }),
      ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });

      expect(compare).toHaveBeenCalledTimes(1);
    });

    it("should not let the dummy password open an account", async () => {
      const userRepository = new UserRepositoryMock();
      const login = new Login(
        userRepository,
        new PasswordHasherMock(),
        new TokenServiceMock(),
        new LoginThrottleRepositoryMock(),
      );

      await expect(
        login.execute({ email: "nadie@correo.com", password: "cuenta-inexistente" }),
      ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    });
  });

  describe("attempt limit", () => {
    it("should lock the email after too many failed attempts, even with the right password", async () => {
      const { login } = await setup();
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) await failLogin(login);

      await expect(login.execute(validInput)).rejects.toMatchObject({
        code: "TOO_MANY_LOGIN_ATTEMPTS",
        status: 429,
      });
    });

    it("should still answer INVALID_CREDENTIALS on the last attempt before locking", async () => {
      const { login } = await setup();
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS - 1; i++) await failLogin(login);

      expect(await failLogin(login)).toMatchObject({
        code: "INVALID_CREDENTIALS",
      });
    });

    it("should lock an email without an account in the same way", async () => {
      const { login } = await setup();
      const email = "nadie@correo.com";
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) await failLogin(login, email);

      expect(await failLogin(login, email)).toMatchObject({
        code: "TOO_MANY_LOGIN_ATTEMPTS",
      });
    });

    it("should not lock other emails", async () => {
      const { login } = await setup();
      const email = "nadie@correo.com";
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) await failLogin(login, email);

      await expect(login.execute(validInput)).resolves.toBeDefined();
    });

    it("should count the email in any format as the same one", async () => {
      const { login } = await setup();
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
        await failLogin(login, " ROSA@correo.com ");
      }

      await expect(login.execute(validInput)).rejects.toMatchObject({
        code: "TOO_MANY_LOGIN_ATTEMPTS",
      });
    });

    it("should forget the failed attempts after a successful login", async () => {
      const { login, loginThrottle } = await setup();
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS - 1; i++) await failLogin(login);

      await login.execute(validInput);

      expect(loginThrottle.states.size).toBe(0);
    });

    it("should allow logging in once the lock has passed", async () => {
      const { login, loginThrottle } = await setup();
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) await failLogin(login);
      const state = loginThrottle.states.get(validInput.email)!;
      state.lockedUntil = new Date(Date.now() - 1);

      await expect(login.execute(validInput)).resolves.toBeDefined();
      expect(loginThrottle.states.size).toBe(0);
    });

    it("should start counting again after the lock has passed", async () => {
      const { login, loginThrottle } = await setup();
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) await failLogin(login);
      loginThrottle.states.get(validInput.email)!.lockedUntil = new Date(
        Date.now() - 1,
      );

      expect(await failLogin(login)).toMatchObject({
        code: "INVALID_CREDENTIALS",
      });
      expect(loginThrottle.states.get(validInput.email)?.failedAttempts).toBe(1);
    });

    it("should forget old failed attempts", async () => {
      const { login, loginThrottle } = await setup();
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS - 1; i++) await failLogin(login);
      loginThrottle.states.get(validInput.email)!.lastFailedAt = new Date(
        Date.now() - LOCK_MS - 1,
      );

      await failLogin(login);

      expect(loginThrottle.states.get(validInput.email)?.failedAttempts).toBe(1);
    });
  });

  describe("execute", () => {
    it("should return the token, the user and the business", async () => {
      const { login } = await setup();

      const result = await login.execute(validInput);

      expect(result).toEqual({
        token: "token:user-1:business-1",
        user: { ownerName: "Rosa Martínez", email: "rosa@correo.com" },
        business: { name: "Tienda Doña Rosa" },
      });
    });

    it("should not expose the password hash or internal ids", async () => {
      const { login } = await setup();

      const result = await login.execute(validInput);

      expect(Object.keys(result.user).sort()).toEqual(["email", "ownerName"]);
      expect(Object.keys(result.business)).toEqual(["name"]);
    });

    it("should sign the token with the account that matches the email", async () => {
      const { login, userRepository } = await setup();
      await userRepository.createAccount({
        businessName: "Miscelánea El Sol",
        ownerName: "Carlos Pérez",
        email: "carlos@correo.com",
        passwordHash: "hashed:clave4567",
        dataPolicyAcceptedAt: new Date("2026-11-03T12:00:00Z"),
      });

      const result = await login.execute({
        email: "carlos@correo.com",
        password: "clave4567",
      });

      expect(result.token).toBe("token:user-2:business-2");
    });

    it("should log in when the email differs only in case or spaces", async () => {
      const { login } = await setup();

      const result = await login.execute({
        ...validInput,
        email: "  Rosa@Correo.COM ",
      });

      expect(result.user.email).toBe("rosa@correo.com");
    });

    it("should reject with INVALID_CREDENTIALS when the email is not registered", async () => {
      const { login } = await setup();

      const attempt = login.execute({ ...validInput, email: "nadie@correo.com" });

      await expect(attempt).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    });

    it("should reject with INVALID_CREDENTIALS when the password is wrong", async () => {
      const { login } = await setup();

      const attempt = login.execute({ ...validInput, password: "otraClave456" });

      await expect(attempt).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    });

    it("should reject with INVALID_CREDENTIALS when the password differs only in case", async () => {
      const { login } = await setup();

      const attempt = login.execute({ ...validInput, password: "SECRETA123" });

      await expect(attempt).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    });
  });
});
