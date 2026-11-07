import type { Email } from "../../ports/email-sender.port.ts";

/** Correo con el código para restablecer la contraseña. */
export const resetCodeEmail = ({
  to,
  ownerName,
  code,
  ttlMinutes,
}: {
  to: string;
  ownerName: string;
  code: string;
  ttlMinutes: number;
}): Email => {
  const name = escapeHtml(ownerName);
  return {
    to,
    subject: `Tu código de Surtido: ${code}`,
    text: [
      `Hola, ${ownerName}.`,
      "",
      `Tu código para restablecer la contraseña es ${code}.`,
      `Vence en ${ttlMinutes} minutos y solo sirve una vez.`,
      "",
      "Si no lo pediste, ignora este correo: tu contraseña no cambia.",
    ].join("\n"),
    html: `<p>Hola, ${name}.</p>
<p>Tu código para restablecer la contraseña es:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p>
<p>Vence en ${ttlMinutes} minutos y solo sirve una vez.</p>
<p>Si no lo pediste, ignora este correo: tu contraseña no cambia.</p>`,
  };
};

const escapeHtml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
