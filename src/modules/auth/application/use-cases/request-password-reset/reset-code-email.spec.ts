import { resetCodeEmail } from "./reset-code-email.ts";

const input = {
  to: "rosa@correo.com",
  ownerName: "Rosa Martínez",
  code: "048215",
  ttlMinutes: 15,
};

describe("resetCodeEmail", () => {
  it("should send the code in the subject, the text and the HTML", () => {
    const email = resetCodeEmail(input);

    expect(email.to).toBe("rosa@correo.com");
    expect(email.subject).toContain("048215");
    expect(email.text).toContain("048215");
    expect(email.html).toContain(">048215</td>");
  });

  it("should tell when the code expires in both versions", () => {
    const email = resetCodeEmail(input);

    expect(email.text).toContain("Vence en 15 minutos");
    expect(email.html).toContain("Vence en 15 minutos");
  });

  it("should escape the owner name only in the HTML", () => {
    const email = resetCodeEmail({
      ...input,
      ownerName: '<img src=x> & "Rosa"',
    });

    expect(email.html).toContain("&lt;img src=x&gt; &amp; &quot;Rosa&quot;");
    expect(email.html).not.toContain("<img");
    expect(email.text).toContain('<img src=x> & "Rosa"');
  });

  it("should use only inline styles and no external resources", () => {
    const { html } = resetCodeEmail(input);

    expect(html).not.toContain("<style");
    expect(html).not.toContain("<link");
    expect(html).not.toMatch(/https?:\/\//);
  });
});
