import { z } from "zod";

import { AppError } from "../errors/app-error.ts";
import { validate } from "./validate.ts";

const schema = z.object({ name: z.string().trim().min(1) });

describe("validate", () => {
  it("should return the parsed data with the schema transformations applied", () => {
    const data = { name: "  Rosa " };

    const result = validate(schema, data);

    expect(result).toEqual({ name: "Rosa" });
  });

  it("should throw VALIDATION_ERROR when the data does not match the schema", () => {
    const data = { name: "" };

    const validation = () => validate(schema, data);

    expect(validation).toThrow(AppError);
    expect(validation).toThrow(expect.objectContaining({ code: "VALIDATION_ERROR" }));
  });
});
