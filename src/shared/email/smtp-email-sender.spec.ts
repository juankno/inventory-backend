import { jest } from "@jest/globals";

import { SmtpEmailSender, type SmtpTransport } from "./smtp-email-sender.ts";

const FROM = "Surtido <hola@surtido.co>";
const OPTIONS = { host: "smtp.ejemplo.com", port: 587, secure: false };

const email = {
  to: "rosa@correo.com",
  subject: "Tu código de Surtido: 123456",
  text: "Tu código es 123456.",
  html: "<p>Tu código es 123456.</p>",
};

type SendMail = SmtpTransport["sendMail"];

describe("SmtpEmailSender", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should send the email through the SMTP transport", async () => {
    const sendMail = jest.fn<SendMail>(async () => ({}));
    const sender = new SmtpEmailSender(OPTIONS, FROM, { sendMail });

    await sender.send(email);

    expect(sendMail).toHaveBeenCalledWith({ from: FROM, ...email });
  });

  it("should fail with EMAIL_NOT_SENT when the server rejects the email", async () => {
    const sendMail = jest.fn<SendMail>(async () => {
      throw new Error("535 Authentication failed");
    });
    const sender = new SmtpEmailSender(OPTIONS, FROM, { sendMail });

    await expect(sender.send(email)).rejects.toMatchObject({
      code: "EMAIL_NOT_SENT",
    });
  });
});
