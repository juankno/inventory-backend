import type { PasswordHasher } from "../ports/password-hasher.port.ts";

export class PasswordHasherMock implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return `hashed:${password}`;
  }
}
