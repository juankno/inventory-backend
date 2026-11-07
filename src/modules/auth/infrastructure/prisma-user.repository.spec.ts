import { jest } from "@jest/globals";

import { Prisma, type PrismaClient } from "../../../generated/prisma/client.ts";
import { AppError } from "../../../shared/errors/app-error.ts";
import type { AccountData } from "../application/ports/user.repository.ts";
import { PrismaUserRepository } from "./prisma-user.repository.ts";

const accountData: AccountData = {
  businessName: "Tienda Doña Rosa",
  ownerName: "Rosa Martínez",
  email: "rosa@correo.com",
  passwordHash: "hashed:secreta123",
  dataPolicyAcceptedAt: new Date("2026-11-03T12:00:00Z"),
};

const createdRow = {
  id: "user-1",
  businessId: "business-1",
  ownerName: "Rosa Martínez",
  email: "rosa@correo.com",
  passwordHash: "hashed:secreta123",
  dataPolicyAcceptedAt: new Date("2026-11-03T12:00:00Z"),
  createdAt: new Date("2026-11-03T12:00:00Z"),
  business: {
    id: "business-1",
    name: "Tienda Doña Rosa",
    createdAt: new Date("2026-11-03T12:00:00Z"),
  },
};

const foundRow = {
  id: "user-1",
  businessId: "business-1",
  ownerName: "Rosa Martínez",
  email: "rosa@correo.com",
  passwordHash: "hashed:secreta123",
  business: { id: "business-1", name: "Tienda Doña Rosa" },
};

function setup() {
  const findUnique = jest.fn<(args: unknown) => Promise<unknown>>();
  const create = jest.fn<(args: unknown) => Promise<unknown>>();
  const prisma = { user: { findUnique, create } } as unknown as PrismaClient;
  return { findUnique, create, repository: new PrismaUserRepository(prisma) };
}

function uniqueViolation() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: Prisma.prismaVersion.client,
  });
}

describe("PrismaUserRepository", () => {
  describe("isEmailRegistered", () => {
    it("should return true when a user with that email exists", async () => {
      const { findUnique, repository } = setup();
      findUnique.mockResolvedValue({ id: "user-1" });

      const result = await repository.isEmailRegistered("rosa@correo.com");

      expect(result).toBe(true);
    });

    it("should return false when no user has that email", async () => {
      const { findUnique, repository } = setup();
      findUnique.mockResolvedValue(null);

      const result = await repository.isEmailRegistered("rosa@correo.com");

      expect(result).toBe(false);
    });

    it("should query by email selecting only the id", async () => {
      const { findUnique, repository } = setup();
      findUnique.mockResolvedValue(null);

      await repository.isEmailRegistered("rosa@correo.com");

      expect(findUnique).toHaveBeenCalledWith({
        where: { email: "rosa@correo.com" },
        select: { id: true },
      });
    });
  });

  describe("createAccount", () => {
    it("should create the user and its business in a single nested create", async () => {
      const { create, repository } = setup();
      create.mockResolvedValue(createdRow);

      await repository.createAccount(accountData);

      expect(create).toHaveBeenCalledWith({
        data: {
          ownerName: "Rosa Martínez",
          email: "rosa@correo.com",
          passwordHash: "hashed:secreta123",
          dataPolicyAcceptedAt: accountData.dataPolicyAcceptedAt,
          business: { create: { name: "Tienda Doña Rosa" } },
        },
        select: {
          id: true,
          businessId: true,
          ownerName: true,
          email: true,
          passwordHash: true,
          business: { select: { id: true, name: true } },
        },
      });
    });

    it("should map the created rows to the domain user and business only", async () => {
      const { create, repository } = setup();
      create.mockResolvedValue(createdRow);

      const result = await repository.createAccount(accountData);

      expect(result).toEqual({
        user: {
          id: "user-1",
          businessId: "business-1",
          ownerName: "Rosa Martínez",
          email: "rosa@correo.com",
          passwordHash: "hashed:secreta123",
        },
        business: { id: "business-1", name: "Tienda Doña Rosa" },
      });
    });

    it("should reject with EMAIL_ALREADY_REGISTERED when the database reports a unique violation", async () => {
      const { create, repository } = setup();
      create.mockRejectedValue(uniqueViolation());

      const creation = repository.createAccount(accountData);

      await expect(creation).rejects.toBeInstanceOf(AppError);
      await expect(creation).rejects.toMatchObject({ code: "EMAIL_ALREADY_REGISTERED" });
    });

    it("should rethrow any other error unchanged", async () => {
      const { create, repository } = setup();
      const connectionError = new Error("connection refused");
      create.mockRejectedValue(connectionError);

      const creation = repository.createAccount(accountData);

      await expect(creation).rejects.toBe(connectionError);
    });
  });

  describe("findAccountByEmail", () => {
    it("should query by email selecting the user fields and its business", async () => {
      const { findUnique, repository } = setup();
      findUnique.mockResolvedValue(null);

      await repository.findAccountByEmail("rosa@correo.com");

      expect(findUnique).toHaveBeenCalledWith({
        where: { email: "rosa@correo.com" },
        select: {
          id: true,
          businessId: true,
          ownerName: true,
          email: true,
          passwordHash: true,
          business: { select: { id: true, name: true } },
        },
      });
    });

    it("should map the found row to the user and its business", async () => {
      const { findUnique, repository } = setup();
      findUnique.mockResolvedValue(foundRow);

      const result = await repository.findAccountByEmail("rosa@correo.com");

      expect(result).toEqual({
        user: {
          id: "user-1",
          businessId: "business-1",
          ownerName: "Rosa Martínez",
          email: "rosa@correo.com",
          passwordHash: "hashed:secreta123",
        },
        business: { id: "business-1", name: "Tienda Doña Rosa" },
      });
    });

    it("should return null when no user has that email", async () => {
      const { findUnique, repository } = setup();
      findUnique.mockResolvedValue(null);

      const result = await repository.findAccountByEmail("rosa@correo.com");

      expect(result).toBeNull();
    });
  });
});
