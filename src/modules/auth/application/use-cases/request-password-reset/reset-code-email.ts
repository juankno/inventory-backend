import type { Email } from "../../../../../shared/email/email-sender.port.ts";

// Colores del tema de la app (inventory-mobile, src/shared/ui/theme.ts).
const colors = {
  background: "#F1F0EC",
  surface: "#FFFFFF",
  border: "#E7E6E1",
  text: "#1F1F1E",
  secondary: "#6B6A66",
};
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * Correo con el código para restablecer la contraseña. El HTML usa tablas y
 * estilos en línea porque Gmail y Outlook ignoran buena parte del CSS moderno.
 * El logo va como texto porque muchos correos bloquean las imágenes.
 */
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
  const expiry = `Vence en ${ttlMinutes} minutos y solo sirve una vez.`;
  const notRequested =
    "Si no lo pediste, ignora este correo: tu contraseña no cambia.";
  return {
    to,
    subject: `Tu código de Surtido: ${code}`,
    text: [
      `Hola, ${ownerName}.`,
      "",
      `Tu código para restablecer la contraseña es ${code}.`,
      expiry,
      "",
      notRequested,
    ].join("\n"),
    html: `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Tu código de Surtido</title>
</head>
<body style="margin:0;padding:0;background-color:${colors.background};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${expiry}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${colors.background};">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;font-family:${FONT};color:${colors.text};">
<tr>
<td style="padding:0 8px 20px;font-size:24px;line-height:32px;font-weight:800;letter-spacing:-0.5px;color:${colors.text};">Surtido</td>
</tr>
<tr>
<td style="background-color:${colors.surface};border:1px solid ${colors.border};border-radius:24px;padding:32px 24px;">
<h1 style="margin:0 0 8px;font-size:24px;line-height:32px;font-weight:800;letter-spacing:-0.5px;color:${colors.text};">Restablece tu contraseña</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:24px;color:${colors.secondary};">Hola, ${name}. Escribe este código en la app para crear una contraseña nueva.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="center" style="background-color:${colors.background};border-radius:16px;padding:20px 8px;font-size:36px;line-height:44px;font-weight:800;letter-spacing:8px;color:${colors.text};">${code}</td>
</tr>
</table>
<p style="margin:16px 0 0;font-size:16px;line-height:24px;color:${colors.secondary};text-align:center;">${expiry}</p>
</td>
</tr>
<tr>
<td style="padding:20px 8px 0;font-size:14px;line-height:20px;color:${colors.secondary};">${notRequested}</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`,
  };
};

const escapeHtml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
