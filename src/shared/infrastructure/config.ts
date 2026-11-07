import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/)
    .default("7d"),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.string().default("development"),
  // Correos de restablecer contraseña (RF-04). Sin clave, en desarrollo el
  // correo se escribe en la consola.
  RESEND_API_KEY: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  EMAIL_FROM: z.string().min(1).default("Surtido <onboarding@resend.dev>"),
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
