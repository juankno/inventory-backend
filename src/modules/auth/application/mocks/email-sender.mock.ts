import type { Email, EmailSender } from "../ports/email-sender.port.ts";

export class EmailSenderMock implements EmailSender {
  readonly sent: Email[] = [];
  failWith: Error | null = null;

  async send(email: Email): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.sent.push(email);
  }
}
