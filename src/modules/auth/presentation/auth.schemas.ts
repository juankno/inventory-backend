import z from "zod";

export const registerSchema = z
  .strictObject({
    businessName: z.string().trim().min(1).max(80),
    ownerName: z.string().trim().min(1).max(80),
    email: z.string().trim().pipe(z.email().max(254)),
    password: z.string().min(8),
    passwordConfirmation: z.string(),
    acceptDataPolicy: z.boolean(),
  })
  .refine((body) => body.password === body.passwordConfirmation);

const email = z.string().trim().pipe(z.email().max(254));

export const requestPasswordResetSchema = z.strictObject({ email });

export const confirmPasswordResetSchema = z.strictObject({
  email,
  code: z.string().trim().regex(/^\d{6}$/),
  newPassword: z.string().min(8),
});

export const loginSchema = z.strictObject({
  email: z.string().trim().pipe(z.email().max(254)),
  password: z.string().min(1),
});
