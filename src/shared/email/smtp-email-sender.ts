import nodemailer, { type SendMailOptions } from "nodemailer";

import { AppError } from "../errors/app-error.ts";
import type { Email, EmailSender } from "./email-sender.port.ts";

export type SmtpOptions = {
  host: string;
  port: number;
  /** true para TLS directo (puerto 465); false para STARTTLS (puerto 587). */
  secure: boolean;
  user?: string;
  pass?: string;
};

/** Lo único que el adaptador usa del transporte de nodemailer. */
export type SmtpTransport = {
  sendMail(mail: SendMailOptions): Promise<unknown>;
};

/** Evita que una función serverless quede colgada si el servidor no responde. */
const TIMEOUT_MS = 10_000;

/**
 * Envía correos por SMTP. Casi todos los proveedores lo aceptan (Gmail,
 * Resend, SendGrid, Mailgun, Amazon SES, Brevo...), así que cambiar de
 * proveedor es cambiar las variables SMTP_*, sin tocar código.
 */
export class SmtpEmailSender implements EmailSender {
  private readonly transporter: SmtpTransport;

  constructor(
    options: SmtpOptions,
    private readonly from: string,
    transporter?: SmtpTransport,
  ) {
    this.transporter =
      transporter ??
      nodemailer.createTransport({
        host: options.host,
        port: options.port,
        secure: options.secure,
        auth: options.user
          ? { user: options.user, pass: options.pass }
          : undefined,
        connectionTimeout: TIMEOUT_MS,
        greetingTimeout: TIMEOUT_MS,
        socketTimeout: TIMEOUT_MS,
      });
  }

  async send(email: Email): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
    } catch (error) {
      console.error("El servidor SMTP no aceptó el correo:", error);
      throw new AppError("EMAIL_NOT_SENT");
    }
  }
}
