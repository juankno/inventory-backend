import { Prisma, type PrismaClient } from "../../../generated/prisma/client.ts";
import { AppError } from "../../../shared/errors/app-error.ts";
import type {
  Account,
  AccountData,
  UserRepository,
} from "../application/ports/user.repository.ts";

const accountSelect = {
  id: true,
  businessId: true,
  ownerName: true,
  email: true,
  passwordHash: true,
  business: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

type AccountRow = Prisma.UserGetPayload<{ select: typeof accountSelect }>;

const toAccount = (row: AccountRow): Account => {
  return {
    user: {
      id: row.id,
      businessId: row.businessId,
      ownerName: row.ownerName,
      email: row.email,
      passwordHash: row.passwordHash,
    },
    business: { id: row.business.id, name: row.business.name },
  };
};

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async isEmailRegistered(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user !== null;
  }

  async createAccount(data: AccountData): Promise<Account> {
    try {
      const row = await this.prisma.user.create({
        data: {
          ownerName: data.ownerName,
          email: data.email,
          passwordHash: data.passwordHash,
          dataPolicyAcceptedAt: data.dataPolicyAcceptedAt,
          business: { create: { name: data.businessName } },
        },
        select: accountSelect,
      });
      return toAccount(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError("EMAIL_ALREADY_REGISTERED");
      }
      throw error;
    }
  }

  async findAccountByEmail(email: string): Promise<Account | null> {
    const row = await this.prisma.user.findUnique({
      where: { email },
      select: accountSelect,
    });
    return row ? toAccount(row) : null;
  }
}
