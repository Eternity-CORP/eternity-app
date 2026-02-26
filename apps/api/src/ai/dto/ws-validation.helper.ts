import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

/**
 * Validates WebSocket payload against a DTO class.
 * NestJS global ValidationPipe does not apply to WebSocket handlers,
 * so we validate manually using this helper.
 *
 * @returns An object with `errors` array (empty if valid) and the transformed `instance`.
 */
export async function validateWsPayload<T extends object>(
  dtoClass: new () => T,
  payload: unknown,
): Promise<{ instance: T; errors: string[] }> {
  if (!payload || typeof payload !== 'object') {
    return {
      instance: {} as T,
      errors: ['Payload must be a non-null object'],
    };
  }

  const instance = plainToInstance(dtoClass, payload);
  const validationErrors: ValidationError[] = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (validationErrors.length === 0) {
    return { instance, errors: [] };
  }

  const errors = validationErrors.flatMap((err) =>
    err.constraints ? Object.values(err.constraints) : ['Validation failed'],
  );

  return { instance, errors };
}
