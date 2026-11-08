import { AppError } from "../errors/app-error.ts";
import type { Email, EmailSender } from "./email-sender.port.ts";

/**
 * Para desarrollo sin proveedor de correo: escribe el correo en la consola. En
 * producción no envía nada, para no dejar códigos en los registros.
 */
export class ConsoleEmailSender implements EmailSender {
  constructor(private readonly isProduction: boolean) {}

  async send(email: Email): Promise<void> {
    if (this.isProduction) {
      console.error(
        "EMAIL_PROVIDER=console no envía correos en producción: configura un proveedor.",
      );
      throw new AppError("EMAIL_NOT_SENT");
    }
    console.info(`[correo] Para: ${email.to}\n${email.subject}\n\n${email.text}`);
  }
}
