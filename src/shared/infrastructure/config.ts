import "dotenv/config";
import { z } from "zod";

const optionalString = z
  .string()
  .optional()
  .transform((value) => value || undefined);

/** Proveedores de correo disponibles (ver shared/email/create-email-sender.ts). */
export const EMAIL_PROVIDERS = ["smtp", "resend", "console"] as const;

const schema = z
  .object({
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(16),
    JWT_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhd]$/)
      .default("7d"),
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z.string().default("development"),
    // Correo. Sin EMAIL_PROVIDER se usa smtp si hay SMTP_HOST, resend si hay
    // RESEND_API_KEY y, si no, console (en desarrollo escribe el correo en la
    // consola).
    EMAIL_PROVIDER: z
      .enum(EMAIL_PROVIDERS)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    EMAIL_FROM: z.string().min(1).default("Surtido <onboarding@resend.dev>"),
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    // Sin valor: TLS directo solo en el puerto 465; en los demás, STARTTLS.
    SMTP_SECURE: z
      .enum(["true", "false"])
      .optional()
      .or(z.literal("").transform(() => undefined)),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    RESEND_API_KEY: optionalString,
  })
  .transform(({ SMTP_SECURE, ...config }) => ({
    ...config,
    SMTP_SECURE: SMTP_SECURE ? SMTP_SECURE === "true" : config.SMTP_PORT === 465,
    EMAIL_PROVIDER:
      config.EMAIL_PROVIDER ??
      (config.SMTP_HOST ? "smtp" : config.RESEND_API_KEY ? "resend" : "console"),
  }))
  .superRefine((config, ctx) => {
    const missing = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if (config.EMAIL_PROVIDER === "smtp") {
      if (!config.SMTP_HOST) {
        missing("SMTP_HOST", "EMAIL_PROVIDER=smtp necesita SMTP_HOST");
      }
      if (Boolean(config.SMTP_USER) !== Boolean(config.SMTP_PASS)) {
        missing("SMTP_PASS", "SMTP_USER y SMTP_PASS van juntos");
      }
    }
    if (config.EMAIL_PROVIDER === "resend" && !config.RESEND_API_KEY) {
      missing("RESEND_API_KEY", "EMAIL_PROVIDER=resend necesita RESEND_API_KEY");
    }
  });

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = schema.safeParse(env);
  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Variables de entorno faltantes o inválidas: ${fields}`);
  }
  return result.data;
}
