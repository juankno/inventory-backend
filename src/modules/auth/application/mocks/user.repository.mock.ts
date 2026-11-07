import { AppError } from "../../../../shared/errors/app-error.ts";
import type {
  Account,
  AccountData,
  UserRepository,
} from "../ports/user.repository.ts";

export type StoredAccount = Account & { dataPolicyAcceptedAt: Date };

export class UserRepositoryMock implements UserRepository {
  readonly accounts: StoredAccount[] = [];

  async isEmailRegistered(email: string): Promise<boolean> {
    return this.accounts.some((account) => account.user.email === email);
  }

  async createAccount(data: AccountData): Promise<Account> {
    if (await this.isEmailRegistered(data.email)) {
      throw new AppError("EMAIL_ALREADY_REGISTERED");
    }

    const sequence = this.accounts.length + 1;
    const business = { id: `business-${sequence}`, name: data.businessName };
    const user = {
      id: `user-${sequence}`,
      businessId: business.id,
      ownerName: data.ownerName,
      email: data.email,
      passwordHash: data.passwordHash,
    };

    this.accounts.push({
      user,
      business,
      dataPolicyAcceptedAt: data.dataPolicyAcceptedAt,
    });
    return { user, business };
  }

  async findAccountByEmail(email: string): Promise<Account | null> {
    const account = this.accounts.find(
      (account) => account.user.email === email,
    );
    if (!account) return null;
    return { user: account.user, business: account.business };
  }
}
