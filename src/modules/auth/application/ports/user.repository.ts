import type { Business } from "../../domain/models/business.model.ts";
import type { User } from "../../domain/models/user.model.ts";

export interface AccountData extends Omit<User, "id" | "businessId"> {
  businessName: string;
  dataPolicyAcceptedAt: Date;
}

export type Account = {
  user: User;
  business: Business;
};

export interface UserRepository {
  isEmailRegistered(email: string): Promise<boolean>;
  createAccount(data: AccountData): Promise<Account>;
}
