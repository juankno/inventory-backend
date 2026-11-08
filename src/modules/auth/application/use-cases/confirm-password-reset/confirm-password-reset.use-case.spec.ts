import { PasswordHasherMock } from "../../mocks/password-hasher.mock.ts";
import { PasswordResetRepositoryMock } from "../../mocks/password-reset.repository.mock.ts";
import { UserRepositoryMock } from "../../mocks/user.repository.mock.ts";
import {
  ConfirmPasswordReset,
  MAX_RESET_ATTEMPTS,
} from "./confirm-password-reset.use-case.ts";

const MINUTE = 60_000;

const validInput = {
  email: "rosa@correo.com",
  code: "123456",
  newPassword: "nuevaClave99",
};

async function setup() {
  const userRepository = new UserRepositoryMock();
  const resetRepository = new PasswordResetRepositoryMock();
  const confirmPasswordReset = new ConfirmPasswordReset(
    userRepository,
    resetRepository,
    new PasswordHasherMock(),
  );
  const account = await userRepository.createAccount({
    businessName: "Tienda Doña Rosa",
    ownerName: "Rosa Martínez",
    email: "rosa@correo.com",
    passwordHash: "hashed:secreta123",
    dataPolicyAcceptedAt: new Date(),
  });
  await resetRepository.replaceActive({
    userId: account.user.id,
    tokenHash: "hashed:123456",
    expiresAt: new Date(Date.now() + 15 * MINUTE),
  });
  return { account, resetRepository, confirmPasswordReset };
}

describe("ConfirmPasswordReset", () => {
  describe("execute", () => {
    it("should change the password and use up the code", async () => {
      const { confirmPasswordReset, resetRepository, account } = await setup();

      await confirmPasswordReset.execute(validInput);

      expect(resetRepository.passwordHashes.get(account.user.id)).toBe(
        "hashed:nuevaClave99",
      );
      expect(resetRepository.tokens[0]?.usedAt).not.toBeNull();
    });

    it("should accept the email with spaces and capital letters", async () => {
      const { confirmPasswordReset, resetRepository, account } = await setup();

      await confirmPasswordReset.execute({
        ...validInput,
        email: " ROSA@correo.com ",
      });

      expect(resetRepository.passwordHashes.has(account.user.id)).toBe(true);
    });

    it("should reject a wrong code and count the attempt", async () => {
      const { confirmPasswordReset, resetRepository } = await setup();

      await expect(
        confirmPasswordReset.execute({ ...validInput, code: "000000" }),
      ).rejects.toMatchObject({ code: "INVALID_RESET_CODE", status: 400 });

      expect(resetRepository.tokens[0]?.attempts).toBe(1);
      expect(resetRepository.passwordHashes.size).toBe(0);
    });

    it("should reject even the right code after too many attempts", async () => {
      const { confirmPasswordReset, resetRepository } = await setup();
      for (let i = 0; i < MAX_RESET_ATTEMPTS; i++) {
        await confirmPasswordReset
          .execute({ ...validInput, code: "000000" })
          .catch(() => undefined);
      }

      await expect(
        confirmPasswordReset.execute(validInput),
      ).rejects.toMatchObject({ code: "INVALID_RESET_CODE" });
      expect(resetRepository.passwordHashes.size).toBe(0);
    });

    it("should not compare more codes than the attempt limit when they arrive at the same time", async () => {
      const { confirmPasswordReset, resetRepository } = await setup();
      const wrongCodes = Array.from({ length: 20 }, (_, index) =>
        String(index).padStart(6, "0"),
      );

      const results = await Promise.allSettled(
        wrongCodes.map((code) => confirmPasswordReset.execute({ ...validInput, code })),
      );

      expect(results.every((result) => result.status === "rejected")).toBe(true);
      expect(resetRepository.tokens[0]?.attempts).toBe(MAX_RESET_ATTEMPTS);
    });

    it("should change the password only once when the right code arrives twice at the same time", async () => {
      const { confirmPasswordReset, resetRepository, account } = await setup();

      const results = await Promise.allSettled([
        confirmPasswordReset.execute(validInput),
        confirmPasswordReset.execute({ ...validInput, newPassword: "otraClave99" }),
      ]);

      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
      expect(resetRepository.passwordHashes.get(account.user.id)).toBe(
        "hashed:nuevaClave99",
      );
    });

    it("should reject an expired code", async () => {
      const { confirmPasswordReset, resetRepository } = await setup();
      resetRepository.tokens[0]!.expiresAt = new Date(Date.now() - MINUTE);

      await expect(
        confirmPasswordReset.execute(validInput),
      ).rejects.toMatchObject({ code: "INVALID_RESET_CODE" });
    });

    it("should not accept the same code twice", async () => {
      const { confirmPasswordReset } = await setup();
      await confirmPasswordReset.execute(validInput);

      await expect(
        confirmPasswordReset.execute({
          ...validInput,
          newPassword: "otraClave99",
        }),
      ).rejects.toMatchObject({ code: "INVALID_RESET_CODE" });
    });

    it("should answer the same when the email is not registered", async () => {
      const { confirmPasswordReset } = await setup();

      await expect(
        confirmPasswordReset.execute({
          ...validInput,
          email: "nadie@correo.com",
        }),
      ).rejects.toMatchObject({ code: "INVALID_RESET_CODE" });
    });
  });
});
