import { Router } from "express";

import { validate } from "../../../shared/validation/validate.ts";
import type { RegisterMovement } from "../application/use-cases/register-movement/register-movement.use-case.ts";
import { toMovementResponse } from "./movement.response.ts";
import { registerMovementSchema } from "./movements.schemas.ts";

export type MovementsUseCases = {
  registerMovement: RegisterMovement;
};

export const movementsRouter = ({
  registerMovement,
}: MovementsUseCases): Router => {
  const router = Router();

  router.post("/", async (req, res) => {
    const body = validate(registerMovementSchema, req.body);
    const { userId, businessId } = res.locals.auth;
    const result = await registerMovement.execute({
      ...body,
      businessId,
      userId,
    });
    res.status(result.created ? 201 : 200).json({
      movement: result.movement ? toMovementResponse(result.movement) : null,
      stock: result.stock,
    });
  });

  return router;
};
