import { jest } from "@jest/globals";

import { ResendEmailSender } from "./resend-email-sender.ts";

const FROM = "Surtido <hola@surtido.co>";

const email = {
  to: "rosa@correo.com",
  subject: "Tu código de Surtido: 123456",
  text: "Tu código es 123456.",
  html: "<p>Tu código es 123456.</p>",
};

describe("ResendEmailSender", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should send the email to the Resend API with the key", async () => {
    const fetchFn = jest.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ id: "1" }), { status: 200 }),
    );
    const sender = new ResendEmailSender("re_clave", FROM, fetchFn);

    await sender.send(email);

    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer re_clave" });
    expect(JSON.parse(String(init?.body))).toEqual({ from: FROM, ...email });
  });

  it("should fail with EMAIL_NOT_SENT when Resend rejects the email", async () => {
    const fetchFn = jest.fn<typeof fetch>(
      async () => new Response("{}", { status: 403 }),
    );
    const sender = new ResendEmailSender("re_clave", FROM, fetchFn);

    await expect(sender.send(email)).rejects.toMatchObject({
      code: "EMAIL_NOT_SENT",
    });
  });

  it("should fail with EMAIL_NOT_SENT when there is no connection", async () => {
    const fetchFn = jest.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    const sender = new ResendEmailSender("re_clave", FROM, fetchFn);

    await expect(sender.send(email)).rejects.toMatchObject({
      code: "EMAIL_NOT_SENT",
    });
  });
});
