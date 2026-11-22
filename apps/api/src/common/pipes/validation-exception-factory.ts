import type { ValidationError } from "@nestjs/common";
import type { ApiErrorDetail } from "@wire/types";
import { ValidationException } from "../errors/api-exception.js";

function flatten(errors: ValidationError[], parentPath = ""): ApiErrorDetail[] {
  return errors.flatMap((error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const ownConstraints = Object.entries(error.constraints ?? {}).map(([code, message]) => ({
      field: path,
      code: code.toUpperCase(),
      message,
    }));
    const childDetails = error.children?.length ? flatten(error.children, path) : [];
    return [...ownConstraints, ...childDetails];
  });
}

export function validationExceptionFactory(errors: ValidationError[]): ValidationException {
  return new ValidationException(flatten(errors));
}
