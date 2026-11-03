import { AppError } from "../../../../../shared/errors/app-error.ts";
import type { Business } from "../../../domain/models/business.model.ts";
import type { User } from "../../../domain/models/user.model.ts";
import { normalizeEmail } from "../../../domain/rules/email.ts";
import type { PasswordHasher } from "../../ports/password-hasher.port.ts";
import type { TokenService } from "../../ports/token-service.port.ts";
import type { UserRepository } from "../../ports/user.repository.ts";

export type RegisterAccountInput = {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  dataPolicyAccepted: boolean;
};

export type RegisterAccountOutput = {
  token: string;
  user: Pick<User, "ownerName" | "email">;
  business: Pick<Business, "name">;
};

export class RegisterAccount {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(data: RegisterAccountInput): Promise<RegisterAccountOutput> {
    if (!data.dataPolicyAccepted) {
      throw new AppError("DATA_POLICY_NOT_ACCEPTED");
    }

    const email = normalizeEmail(data.email);

    if (await this.userRepository.isEmailRegistered(email)) {
      throw new AppError("EMAIL_ALREADY_REGISTERED");
    }

    const { user, business } = await this.userRepository.createAccount({
      businessName: data.businessName,
      ownerName: data.ownerName,
      email,
      passwordHash: await this.passwordHasher.hash(data.password),
      dataPolicyAcceptedAt: new Date(),
    });

    const token = await this.tokenService.sign({
      userId: user.id,
      businessId: business.id,
    });

    return {
      token,
      user: { ownerName: user.ownerName, email: user.email },
      business: { name: business.name },
    };
  }
}
