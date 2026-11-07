import { AppError } from "../../../../../shared/errors/app-error.ts";
import { normalizeEmail } from "../../../domain/rules/email.ts";
import {
  toAuthSessionDto,
  type AuthSessionDto,
} from "../../dtos/auth-session.dto.ts";
import type { PasswordHasher } from "../../ports/password-hasher.port.ts";
import type { TokenService } from "../../ports/token-service.port.ts";
import type { UserRepository } from "../../ports/user.repository.ts";

export type LoginInput = {
  email: string;
  password: string;
};

export class Login {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(data: LoginInput): Promise<AuthSessionDto> {
    const email = normalizeEmail(data.email);
    const account = await this.userRepository.findAccountByEmail(email);
    if (!account) {
      throw new AppError("INVALID_CREDENTIALS");
    }

    const isPasswordValid = await this.passwordHasher.compare(
      data.password,
      account.user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new AppError("INVALID_CREDENTIALS");
    }

    const token = this.tokenService.sign({
      userId: account.user.id,
      businessId: account.business.id,
    });

    return toAuthSessionDto(token, account);
  }
}
