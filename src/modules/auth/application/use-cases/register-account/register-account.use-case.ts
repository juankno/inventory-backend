import { AppError } from "../../../../../shared/errors/app-error.ts";
import { normalizeEmail } from "../../../domain/rules/email.ts";
import { type AuthSessionDto, toAuthSessionDto } from "../../dtos/auth-session.dto.ts";
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

export class RegisterAccount {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(data: RegisterAccountInput): Promise<AuthSessionDto> {
    if (!data.dataPolicyAccepted) {
      throw new AppError("DATA_POLICY_NOT_ACCEPTED");
    }

    const email = normalizeEmail(data.email);

    if (await this.userRepository.isEmailRegistered(email)) {
      throw new AppError("EMAIL_ALREADY_REGISTERED");
    }

    const account = await this.userRepository.createAccount({
      businessName: data.businessName,
      ownerName: data.ownerName,
      email,
      passwordHash: await this.passwordHasher.hash(data.password),
      dataPolicyAcceptedAt: new Date(),
    });

    const token = this.tokenService.sign({
      userId: account.user.id,
      businessId: account.business.id,
    });

    return toAuthSessionDto(token, account);
  }
}
