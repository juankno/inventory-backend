export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailSender {
  send(email: Email): Promise<void>;
}
