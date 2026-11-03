import { PasswordHasherMock } from "../../mocks/password-hasher.mock.ts";
import { TokenServiceMock } from "../../mocks/token-service.mock.ts";
import { UserRepositoryMock } from "../../mocks/user.repository.mock.ts";
import {
  RegisterAccount,
  type RegisterAccountInput,
} from "./register-account.use-case.ts";

const validInput: RegisterAccountInput = {
  businessName: "Tienda Doña Rosa",
  ownerName: "Rosa Martínez",
  email: "rosa@correo.com",
  password: "secreta123",
  dataPolicyAccepted: true,
};

function setup() {
  const userRepository = new UserRepositoryMock();
  const registerAccount = new RegisterAccount(
    userRepository,
    new PasswordHasherMock(),
    new TokenServiceMock(),
  );
  return { userRepository, registerAccount };
}

describe("RegisterAccount", () => {
  describe("execute", () => {
    it("should return the token, the user and the business", async () => {
      const { registerAccount } = setup();

      const result = await registerAccount.execute(validInput);

      expect(result).toEqual({
        token: "token:user-1:business-1",
        user: { ownerName: "Rosa Martínez", email: "rosa@correo.com" },
        business: { name: "Tienda Doña Rosa" },
      });
    });

    it("should not expose the password hash or internal ids", async () => {
      const { registerAccount } = setup();

      const result = await registerAccount.execute(validInput);

      expect(Object.keys(result.user).sort()).toEqual(["email", "ownerName"]);
      expect(Object.keys(result.business)).toEqual(["name"]);
    });

    it("should store the password hash instead of the plain password", async () => {
      const { registerAccount, userRepository } = setup();

      await registerAccount.execute(validInput);

      expect(userRepository.accounts[0]?.user.passwordHash).toBe(
        "hashed:secreta123",
      );
    });

    it("should record when the data policy was accepted", async () => {
      const { registerAccount, userRepository } = setup();
      const before = Date.now();

      await registerAccount.execute(validInput);

      const acceptedAt = userRepository.accounts[0]?.dataPolicyAcceptedAt;
      expect(acceptedAt?.getTime()).toBeGreaterThanOrEqual(before);
      expect(acceptedAt?.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it("should store and return the email trimmed and in lowercase", async () => {
      const { registerAccount, userRepository } = setup();
      const input = { ...validInput, email: "  Rosa@Correo.COM " };

      const result = await registerAccount.execute(input);

      expect(userRepository.accounts[0]?.user.email).toBe("rosa@correo.com");
      expect(result.user.email).toBe("rosa@correo.com");
    });

    it("should sign the token with the newly created user and business", async () => {
      const { registerAccount } = setup();
      await registerAccount.execute({ ...validInput, email: "otra@correo.com" });

      const result = await registerAccount.execute(validInput);

      expect(result.token).toBe("token:user-2:business-2");
    });

    it("should reject with DATA_POLICY_NOT_ACCEPTED and create nothing when the policy is not accepted", async () => {
      const { registerAccount, userRepository } = setup();
      const input = { ...validInput, dataPolicyAccepted: false };

      const registration = registerAccount.execute(input);

      await expect(registration).rejects.toMatchObject({
        code: "DATA_POLICY_NOT_ACCEPTED",
      });
      expect(userRepository.accounts).toHaveLength(0);
    });

    it("should reject with EMAIL_ALREADY_REGISTERED and keep a single account when the email exists", async () => {
      const { registerAccount, userRepository } = setup();
      await registerAccount.execute(validInput);

      const registration = registerAccount.execute(validInput);

      await expect(registration).rejects.toMatchObject({
        code: "EMAIL_ALREADY_REGISTERED",
      });
      expect(userRepository.accounts).toHaveLength(1);
    });

    it("should reject with EMAIL_ALREADY_REGISTERED when the existing email differs only in case or spaces", async () => {
      const { registerAccount } = setup();
      await registerAccount.execute(validInput);

      const registration = registerAccount.execute({
        ...validInput,
        email: " ROSA@correo.com",
      });

      await expect(registration).rejects.toMatchObject({
        code: "EMAIL_ALREADY_REGISTERED",
      });
    });
  });
});
