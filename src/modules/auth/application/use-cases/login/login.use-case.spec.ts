import { PasswordHasherMock } from "../../mocks/password-hasher.mock.ts";
import { TokenServiceMock } from "../../mocks/token-service.mock.ts";
import { UserRepositoryMock } from "../../mocks/user.repository.mock.ts";
import { Login, type LoginInput } from "./login.use-case.ts";

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
  const login = new Login(
    userRepository,
    new PasswordHasherMock(),
    new TokenServiceMock(),
  );
  return { userRepository, login };
}

describe("Login", () => {
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
