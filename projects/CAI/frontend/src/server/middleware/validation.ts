import Joi from 'joi';

export class ValidationError extends Error {
  public status = 400;
  public details: string[];

  constructor(details: string[]) {
    super('Validation error');
    this.name = 'ValidationError';
    this.details = details;
  }
}

export const validateSchema = <T>(
  schema: Joi.Schema<T>,
  payload: unknown
): T => {
    const { error, value } = schema.validate(payload, { abortEarly: false });

    if (error) {
      throw new ValidationError(error.details.map((detail) => detail.message));
    }

    return value as T;
  };
