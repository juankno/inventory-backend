import type { User } from "../../domain/models/user.model.ts";

export interface AccountData extends Omit<User, "id" | "businessId"> {
  businessName: string;
  dataPolicyAcceptedAt: Date;
}

export interface UserRepository {
  isEmailRegistered(email: string): Promise<boolean>;
  createAccount(data: AccountData): Promise<User>;
}
