import { AppError } from "../../../../../shared/errors/app-error.ts";
import { EmailSenderMock } from "../../mocks/email-sender.mock.ts";
import { PasswordHasherMock } from "../../mocks/password-hasher.mock.ts";
import { PasswordResetRepositoryMock } from "../../mocks/password-reset.repository.mock.ts";
import { ResetCodeGeneratorMock } from "../../mocks/reset-code-generator.mock.ts";
import { UserRepositoryMock } from "../../mocks/user.repository.mock.ts";
import {
  RESET_CODE_COOLDOWN_MS,
  RESET_CODE_TTL_MINUTES,
  RequestPasswordReset,
} from "./request-password-reset.use-case.ts";

async function setup() {
  const userRepository = new UserRepositoryMock();
  const resetRepository = new PasswordResetRepositoryMock();
  const emailSender = new EmailSenderMock();
  const requestPasswordReset = new RequestPasswordReset(
    userRepository,
    resetRepository,
    new PasswordHasherMock(),
    new ResetCodeGeneratorMock("123456"),
    emailSender,
  );
  await userRepository.createAccount({
    businessName: "Tienda Doña Rosa",
    ownerName: "Rosa Martínez",
    email: "rosa@correo.com",
    passwordHash: "hashed:secreta123",
    dataPolicyAcceptedAt: new Date(),
  });
  return { resetRepository, emailSender, requestPasswordReset };
}

describe("RequestPasswordReset", () => {
  describe("execute", () => {
    it("should email the code to the account owner", async () => {
      const { requestPasswordReset, emailSender } = await setup();

      await requestPasswordReset.execute({ email: " Rosa@Correo.com " });

      expect(emailSender.sent).toHaveLength(1);
      expect(emailSender.sent[0]?.to).toBe("rosa@correo.com");
      expect(emailSender.sent[0]?.text).toContain("123456");
      expect(emailSender.sent[0]?.html).toContain("Rosa Martínez");
    });

    it("should store only the hash of the code, valid for 15 minutes", async () => {
      const { requestPasswordReset, resetRepository } = await setup();
      const before = Date.now();

      await requestPasswordReset.execute({ email: "rosa@correo.com" });

      const token = resetRepository.tokens[0];
      const ttl = RESET_CODE_TTL_MINUTES * 60_000;
      expect(token?.tokenHash).toBe("hashed:123456");
      expect(token?.expiresAt.getTime()).toBeGreaterThanOrEqual(before + ttl);
      expect(token?.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + ttl);
    });

    it("should do nothing, without failing, when the email is not registered", async () => {
      const { requestPasswordReset, emailSender, resetRepository } =
        await setup();

      await expect(
        requestPasswordReset.execute({ email: "nadie@correo.com" }),
      ).resolves.toBeUndefined();

      expect(emailSender.sent).toHaveLength(0);
      expect(resetRepository.tokens).toHaveLength(0);
    });

    it("should not send another code within the cooldown", async () => {
      const { requestPasswordReset, emailSender } = await setup();

      await requestPasswordReset.execute({ email: "rosa@correo.com" });
      await requestPasswordReset.execute({ email: "rosa@correo.com" });

      expect(emailSender.sent).toHaveLength(1);
    });

    it("should replace the previous code after the cooldown", async () => {
      const { requestPasswordReset, emailSender, resetRepository } =
        await setup();
      await requestPasswordReset.execute({ email: "rosa@correo.com" });
      const first = resetRepository.tokens[0]!;
      first.expiresAt = new Date(
        first.expiresAt.getTime() - RESET_CODE_COOLDOWN_MS - 1,
      );

      await requestPasswordReset.execute({ email: "rosa@correo.com" });

      expect(emailSender.sent).toHaveLength(2);
      expect(first.usedAt).not.toBeNull();
      expect(resetRepository.tokens[1]?.usedAt).toBeNull();
    });

    it("should discard the code when the email cannot be sent", async () => {
      const { requestPasswordReset, emailSender, resetRepository } =
        await setup();
      emailSender.failWith = new AppError("EMAIL_NOT_SENT");

      await expect(
        requestPasswordReset.execute({ email: "rosa@correo.com" }),
      ).rejects.toMatchObject({ code: "EMAIL_NOT_SENT" });

      expect(resetRepository.tokens[0]?.usedAt).not.toBeNull();
    });

    it("should allow asking again right away after a failed send", async () => {
      const { requestPasswordReset, emailSender } = await setup();
      emailSender.failWith = new AppError("EMAIL_NOT_SENT");
      await requestPasswordReset
        .execute({ email: "rosa@correo.com" })
        .catch(() => undefined);
      emailSender.failWith = null;

      await requestPasswordReset.execute({ email: "rosa@correo.com" });

      expect(emailSender.sent).toHaveLength(1);
    });
  });
});
