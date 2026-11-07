import type { PasswordHasher } from "../ports/password-hasher.port.ts";

export class PasswordHasherMock implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return `hashed:${password}`;
  }

  async compare(password: string, hashedPassword: string): Promise<boolean> {
    return hashedPassword === `hashed:${password}`;
  }
}
