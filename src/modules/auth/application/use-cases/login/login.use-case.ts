import { AppError } from "../../../../../shared/errors/app-error.ts";
import { normalizeEmail } from "../../../domain/rules/email.ts";
import {
  toAuthSessionDto,
  type AuthSessionDto,
} from "../../dtos/auth-session.dto.ts";
import type {
  LoginThrottleRepository,
  LoginThrottleState,
} from "../../ports/login-throttle.repository.ts";
import type { PasswordHasher } from "../../ports/password-hasher.port.ts";
import type { TokenService } from "../../ports/token-service.port.ts";
import type { UserRepository } from "../../ports/user.repository.ts";

/** Intentos fallidos seguidos antes de bloquear el correo. */
export const MAX_LOGIN_ATTEMPTS = 5;
/** Lo que dura el bloqueo y, sin bloqueo, lo que se recuerdan los intentos fallidos. */
export const LOGIN_LOCK_MINUTES = 15;

const minutesToMs = (minutes: number): number => minutes * 60_000;

export type LoginInput = {
  email: string;
  password: string;
};

export class Login {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly loginThrottle: LoginThrottleRepository,
  ) {}

  async execute(data: LoginInput): Promise<AuthSessionDto> {
    const email = normalizeEmail(data.email);
    const now = new Date();

    const throttle = await this.loginThrottle.find(email);
    if (throttle?.lockedUntil && throttle.lockedUntil > now) {
      throw new AppError("TOO_MANY_LOGIN_ATTEMPTS");
    }
    if (throttle && isExpired(throttle, now)) {
      await this.loginThrottle.clear(email);
    }

    const account = await this.userRepository.findAccountByEmail(email);
    if (!account) {
      // Sin cuenta también se compara la contraseña: si no, esta respuesta llega
      // más rápido y revela qué correos están registrados.
      this.dummyHash ??= this.passwordHasher.hash("cuenta-inexistente");
      await this.passwordHasher.compare(data.password, await this.dummyHash);
      await this.registerFailure(email, now);
      throw new AppError("INVALID_CREDENTIALS");
    }

    const isPasswordValid = await this.passwordHasher.compare(
      data.password,
      account.user.passwordHash,
    );
    if (!isPasswordValid) {
      await this.registerFailure(email, now);
      throw new AppError("INVALID_CREDENTIALS");
    }
    if (throttle) await this.loginThrottle.clear(email);

    const token = this.tokenService.sign({
      userId: account.user.id,
      businessId: account.business.id,
    });

    return toAuthSessionDto(token, account);
  }

  // Cuenta también los correos sin cuenta, para responder igual y no revelar cuáles existen.
  private async registerFailure(email: string, now: Date): Promise<void> {
    const failedAttempts = await this.loginThrottle.registerFailure(email, now);
    if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      await this.loginThrottle.lock(
        email,
        new Date(now.getTime() + minutesToMs(LOGIN_LOCK_MINUTES)),
      );
    }
  }
}

const isExpired = (throttle: LoginThrottleState, now: Date): boolean =>
  throttle.lockedUntil !== null ||
  now.getTime() - throttle.lastFailedAt.getTime() >
    minutesToMs(LOGIN_LOCK_MINUTES);
