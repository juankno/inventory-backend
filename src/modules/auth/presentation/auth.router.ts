import { Router } from "express";
import type { RegisterAccount } from "../application/use-cases/register-account/register-account.use-case.ts";
import { registerSchema } from "./auth.schemas.ts";
import { validate } from "../../../shared/validation/validate.ts";

export const authRouter = (registerAccount: RegisterAccount): Router => {
  const router = Router();

  router.post("/register", async (req, res) => {
    const body = validate(registerSchema, req.body);
    const result = await registerAccount.execute({
      businessName: body.businessName,
      ownerName: body.ownerName,
      email: body.email,
      password: body.password,
      dataPolicyAccepted: body.acceptDataPolicy,
    });
    res.status(201).json(result);
  });

  return router;
};
