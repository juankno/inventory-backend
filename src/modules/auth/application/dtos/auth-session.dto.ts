import type { Business } from "../../domain/models/business.model.ts";
import type { User } from "../../domain/models/user.model.ts";
import type { Account } from "../ports/user.repository.ts";

export interface AuthSessionDto {
  token: string;
  user: Pick<User, "ownerName" | "email">;
  business: Pick<Business, "name">;
}

export const toAuthSessionDto = (
  token: string,
  { user, business }: Account,
): AuthSessionDto => {
  return {
    token,
    user: { ownerName: user.ownerName, email: user.email },
    business: { name: business.name },
  };
};
