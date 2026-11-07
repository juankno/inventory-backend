export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  attempts: number;
}

export interface PasswordResetRepository {
  /** Último código sin usar y sin vencer del usuario, o null. */
  findActive(userId: string, now: Date): Promise<PasswordResetToken | null>;
  /** Anula los códigos anteriores del usuario, guarda el nuevo y devuelve su id. */
  replaceActive(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<string>;
  /** Anula un código que no se pudo enviar, para poder pedir otro de inmediato. */
  discard(tokenId: string): Promise<void>;
  /** Suma un intento fallido y devuelve el total. */
  registerFailedAttempt(tokenId: string): Promise<number>;
  /** Marca el código como usado y cambia la contraseña en una sola transacción. */
  consume(tokenId: string, userId: string, passwordHash: string): Promise<void>;
}
