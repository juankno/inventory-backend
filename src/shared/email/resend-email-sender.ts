import { AppError } from "../errors/app-error.ts";
import type {
  Email,
  EmailSender,
} from "./email-sender.port.ts";

const RESEND_URL = "https://api.resend.com/emails";

/** Envía correos con la API de Resend (https://resend.com/docs). */
export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async send(email: Email): Promise<void> {
    let response: Response;
    try {
      response = await this.fetchFn(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: email.to,
          subject: email.subject,
          text: email.text,
          html: email.html,
        }),
      });
    } catch (error) {
      console.error("Resend no respondió:", error);
      throw new AppError("EMAIL_NOT_SENT");
    }

    if (!response.ok) {
      console.error(
        `Resend respondió ${response.status}:`,
        await response.text().catch(() => ""),
      );
      throw new AppError("EMAIL_NOT_SENT");
    }
  }
}
