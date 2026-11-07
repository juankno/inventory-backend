import { Router } from "express";
import type { RegisterAccount } from "../application/use-cases/register-account/register-account.use-case.ts";
import {
  confirmPasswordResetSchema,
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
} from "./auth.schemas.ts";
import { validate } from "../../../shared/validation/validate.ts";
import type { Login } from "../application/use-cases/login/login.use-case.ts";
import type { RequestPasswordReset } from "../application/use-cases/request-password-reset/request-password-reset.use-case.ts";
import type { ConfirmPasswordReset } from "../application/use-cases/confirm-password-reset/confirm-password-reset.use-case.ts";

export type AuthUseCases = {
  registerAccount: RegisterAccount;
  login: Login;
  requestPasswordReset: RequestPasswordReset;
  confirmPasswordReset: ConfirmPasswordReset;
};

export const authRouter = ({
  registerAccount,
  login,
  requestPasswordReset,
  confirmPasswordReset,
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

  // RF-04: responde 204 exista o no la cuenta, para no revelar qué correos hay.
  router.post("/password-reset/request", async (req, res) => {
    const body = validate(requestPasswordResetSchema, req.body);
    await requestPasswordReset.execute({ email: body.email });
    res.status(204).end();
  });

  router.post("/password-reset/confirm", async (req, res) => {
    const body = validate(confirmPasswordResetSchema, req.body);
    await confirmPasswordReset.execute(body);
    res.status(204).end();
  });

  return router;
};
