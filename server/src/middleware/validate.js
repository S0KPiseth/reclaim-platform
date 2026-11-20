import { z } from "zod";
import { AppError } from "./errors.js";

// Replaces req[source] with the parsed (and coerced) value.
// Express 5 exposes req.query as a getter, so parsed query params go to req.validatedQuery.
export function validate(schema, source = "body") {
  return (req, _res, next) => {
    const input = source === "query" ? { ...req.query } : req[source];
    const result = schema.safeParse(input);

    if (!result.success) {
      const issue = result.error.issues[0];
      const path = issue.path.join(".");
      const message = path ? `${path}: ${issue.message}` : issue.message;
      return next(new AppError(422, "VALIDATION_ERROR", message));
    }

    if (source === "query") {
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }
    next();
  };
}

// Shared helpers
export const cuid = z.string().min(1, "Invalid id");
