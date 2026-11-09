import type {
  LoginThrottleRepository,
  LoginThrottleState,
} from "../ports/login-throttle.repository.ts";

export class LoginThrottleRepositoryMock implements LoginThrottleRepository {
  readonly states = new Map<string, LoginThrottleState>();

  async find(email: string): Promise<LoginThrottleState | null> {
    return this.states.get(email) ?? null;
  }

  async registerFailure(email: string, now: Date): Promise<number> {
    const failedAttempts = (this.states.get(email)?.failedAttempts ?? 0) + 1;
    this.states.set(email, { failedAttempts, lastFailedAt: now, lockedUntil: null });
    return failedAttempts;
  }

  async lock(email: string, until: Date): Promise<void> {
    const state = this.states.get(email);
    if (state) state.lockedUntil = until;
  }

  async clear(email: string): Promise<void> {
    this.states.delete(email);
  }
}
