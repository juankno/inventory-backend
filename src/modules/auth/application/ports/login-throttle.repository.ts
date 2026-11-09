export interface LoginThrottleState {
  failedAttempts: number;
  lastFailedAt: Date;
  lockedUntil: Date | null;
}

export interface LoginThrottleRepository {
  find(email: string): Promise<LoginThrottleState | null>;
  /** Suma un intento fallido y devuelve el total. */
  registerFailure(email: string, now: Date): Promise<number>;
  lock(email: string, until: Date): Promise<void>;
  clear(email: string): Promise<void>;
}
