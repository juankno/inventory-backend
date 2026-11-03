import { Prisma, type PrismaClient } from "../../../generated/prisma/client.ts";
import { AppError } from "../../../shared/errors/app-error.ts";
import type {
  Account,
  AccountData,
  UserRepository,
} from "../application/ports/user.repository.ts";

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
      const { business, ...user } = await this.prisma.user.create({
        data: {
          ownerName: data.ownerName,
          email: data.email,
          passwordHash: data.passwordHash,
          dataPolicyAcceptedAt: data.dataPolicyAcceptedAt,
          business: { create: { name: data.businessName } },
        },
        include: { business: true },
      });

      return {
        user: {
          id: user.id,
          businessId: user.businessId,
          ownerName: user.ownerName,
          email: user.email,
          passwordHash: user.passwordHash,
        },
        business: { id: business.id, name: business.name },
      };
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
}
