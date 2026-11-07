export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Envía correos sin atarse a un proveedor. Los casos de uso dependen de esta
 * interfaz; el proveedor concreto lo elige createEmailSender según
 * EMAIL_PROVIDER. Si el envío falla, lanza AppError("EMAIL_NOT_SENT").
 */
export interface EmailSender {
  send(email: Email): Promise<void>;
}
