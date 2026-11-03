import type { z } from "zod";
import { AppError } from "../errors/app-error.ts";

export const validate = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);

  if (!result.success) throw new AppError("VALIDATION_ERROR");
  return result.data;
};
