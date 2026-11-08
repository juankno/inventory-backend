import { jest } from "@jest/globals";

import type { PrismaClient } from "../../../generated/prisma/client.ts";
import { PrismaPasswordResetRepository } from "./prisma-password-reset.repository.ts";

type AsyncMock = ReturnType<typeof jest.fn<(args: unknown) => Promise<unknown>>>;

function setup() {
  const findFirst: AsyncMock = jest.fn();
  const updateMany: AsyncMock = jest.fn();
  const create: AsyncMock = jest.fn();
  const update: AsyncMock = jest.fn();
  const updateUser: AsyncMock = jest.fn();
  const client = {
    passwordResetToken: { findFirst, updateMany, create, update },
    user: { update: updateUser },
    $transaction: (operations: unknown) =>
      typeof operations === "function"
        ? operations(client)
        : Promise.all(operations as Promise<unknown>[]),
  };
  const repository = new PrismaPasswordResetRepository(
    client as unknown as PrismaClient,
  );
  return { findFirst, updateMany, create, update, updateUser, repository };
}

describe("PrismaPasswordResetRepository", () => {
  describe("findActive", () => {
    it("should look for the latest unused and unexpired code of the user", async () => {
      const { findFirst, repository } = setup();
      const now = new Date("2026-11-07T12:00:00Z");
      findFirst.mockResolvedValue(null);

      await repository.findActive("user-1", now);

      expect(findFirst).toHaveBeenCalledWith({
        where: { userId: "user-1", usedAt: null, expiresAt: { gt: now } },
        orderBy: { expiresAt: "desc" },
        select: {
          id: true,
          userId: true,
          tokenHash: true,
          expiresAt: true,
          attempts: true,
        },
      });
    });
  });

  describe("replaceActive", () => {
    it("should void the previous codes of the user and return the id of the new one", async () => {
      const { updateMany, create, repository } = setup();
      const data = {
        userId: "user-1",
        tokenHash: "hashed:123456",
        expiresAt: new Date("2026-11-07T12:15:00Z"),
      };
      updateMany.mockResolvedValue({ count: 1 });
      create.mockResolvedValue({ id: "reset-2" });

      const tokenId = await repository.replaceActive(data);

      expect(tokenId).toBe("reset-2");
      expect(updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(create).toHaveBeenCalledWith({ data, select: { id: true } });
    });
  });

  describe("reserveAttempt", () => {
    it("should increment the attempts only while the code is unused and under the limit", async () => {
      const { updateMany, repository } = setup();
      updateMany.mockResolvedValue({ count: 1 });

      await repository.reserveAttempt("reset-1", 5);

      expect(updateMany).toHaveBeenCalledWith({
        where: { id: "reset-1", usedAt: null, attempts: { lt: 5 } },
        data: { attempts: { increment: 1 } },
      });
    });

    it("should return true when the attempt was reserved", async () => {
      const { updateMany, repository } = setup();
      updateMany.mockResolvedValue({ count: 1 });

      const isReserved = await repository.reserveAttempt("reset-1", 5);

      expect(isReserved).toBe(true);
    });

    it("should return false when the code is used up or reached the limit", async () => {
      const { updateMany, repository } = setup();
      updateMany.mockResolvedValue({ count: 0 });

      const isReserved = await repository.reserveAttempt("reset-1", 5);

      expect(isReserved).toBe(false);
    });
  });

  describe("consume", () => {
    it("should mark the code as used only if it is still unused and unexpired", async () => {
      const { updateMany, updateUser, repository } = setup();
      updateMany.mockResolvedValue({ count: 1 });
      updateUser.mockResolvedValue({});

      await repository.consume("reset-1", "user-1", "hashed:nuevaClave99");

      expect(updateMany).toHaveBeenCalledWith({
        where: { id: "reset-1", usedAt: null, expiresAt: { gt: expect.any(Date) } },
        data: { usedAt: expect.any(Date) },
      });
    });

    it("should change the password and return true when the code was consumed", async () => {
      const { updateMany, updateUser, repository } = setup();
      updateMany.mockResolvedValue({ count: 1 });
      updateUser.mockResolvedValue({});

      const isConsumed = await repository.consume("reset-1", "user-1", "hashed:nuevaClave99");

      expect(isConsumed).toBe(true);
      expect(updateUser).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { passwordHash: "hashed:nuevaClave99" },
      });
    });

    it("should not change the password and return false when the code was already used", async () => {
      const { updateMany, updateUser, repository } = setup();
      updateMany.mockResolvedValue({ count: 0 });

      const isConsumed = await repository.consume("reset-1", "user-1", "hashed:nuevaClave99");

      expect(isConsumed).toBe(false);
      expect(updateUser).not.toHaveBeenCalled();
    });
  });

  describe("discard", () => {
    it("should mark the code as used", async () => {
      const { update, repository } = setup();
      update.mockResolvedValue({});

      await repository.discard("reset-1");

      expect(update).toHaveBeenCalledWith({
        where: { id: "reset-1" },
        data: { usedAt: expect.any(Date) },
      });
    });
  });
});
