import { Router } from "express";
import type { RegisterAccount } from "../application/use-cases/register-account/register-account.use-case.ts";
import { loginSchema, registerSchema } from "./auth.schemas.ts";
import { validate } from "../../../shared/validation/validate.ts";
import type { Login } from "../application/use-cases/login/login.use-case.ts";

export type AuthUseCases = {
  registerAccount: RegisterAccount;
  login: Login;
};

export const authRouter = ({
  registerAccount,
  login,
}: AuthUseCases): Router => {
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

  router.post("/login", async (req, res) => {
    const body = validate(loginSchema, req.body);
    const result = await login.execute({
      email: body.email,
      password: body.password,
    });
    res.status(200).json(result);
  });

  return router;
};
