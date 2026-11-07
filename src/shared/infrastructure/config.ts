import "dotenv/config";
import { z } from "zod";

const optionalString = z
  .string()
  .optional()
  .transform((value) => value || undefined);

/** Proveedores de correo disponibles (ver shared/email/create-email-sender.ts). */
export const EMAIL_PROVIDERS = ["resend", "console"] as const;

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
    // Correo. Sin EMAIL_PROVIDER se usa resend si hay RESEND_API_KEY y, si no,
    // console (en desarrollo escribe el correo en la consola).
    EMAIL_PROVIDER: z
      .enum(EMAIL_PROVIDERS)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    EMAIL_FROM: z.string().min(1).default("Surtido <onboarding@resend.dev>"),
    RESEND_API_KEY: optionalString,
  })
  .transform((config) => ({
    ...config,
    EMAIL_PROVIDER:
      config.EMAIL_PROVIDER ?? (config.RESEND_API_KEY ? "resend" : "console"),
  }))
  .superRefine((config, ctx) => {
    if (config.EMAIL_PROVIDER === "resend" && !config.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "EMAIL_PROVIDER=resend necesita RESEND_API_KEY",
      });
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
