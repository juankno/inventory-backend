import { AppError } from "../../../shared/errors/app-error.ts";
import type {
  Email,
  EmailSender,
} from "../application/ports/email-sender.port.ts";

/**
 * Para desarrollo sin RESEND_API_KEY: escribe el correo en la consola. En
 * producción no envía nada, para no dejar códigos en los registros.
 */
export class ConsoleEmailSender implements EmailSender {
  constructor(private readonly isProduction: boolean) {}

  async send(email: Email): Promise<void> {
    if (this.isProduction) {
      console.error("Falta RESEND_API_KEY: no se puede enviar el correo.");
      throw new AppError("EMAIL_NOT_SENT");
    }
    console.info(`[correo] Para: ${email.to}\n${email.subject}\n\n${email.text}`);
  }
}
