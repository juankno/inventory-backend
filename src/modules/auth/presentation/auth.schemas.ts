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
