import bcrypt from "bcrypt";
import type { PasswordHasher } from "../application/ports/password-hasher.port.ts";

const SALT_ROUNDS = 10;

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }
}
