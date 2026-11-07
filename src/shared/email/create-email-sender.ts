import type { Config } from "../infrastructure/config.ts";
import { ConsoleEmailSender } from "./console-email-sender.ts";
import type { EmailSender } from "./email-sender.port.ts";
import { ResendEmailSender } from "./resend-email-sender.ts";

/**
 * Elige el proveedor de correo según EMAIL_PROVIDER. Para agregar otro
 * proveedor: crea su adaptador de EmailSender, súmalo a EMAIL_PROVIDERS en
 * config.ts con sus variables y agrégalo aquí.
 */
export function createEmailSender(config: Config): EmailSender {
  switch (config.EMAIL_PROVIDER) {
    case "resend":
      return new ResendEmailSender(config.RESEND_API_KEY!, config.EMAIL_FROM);
    case "console":
      return new ConsoleEmailSender(config.NODE_ENV === "production");
  }
}
