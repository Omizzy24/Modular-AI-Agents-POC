import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { createLogger } from '@poc/shared';

const logger = createLogger('bff:validation');

/**
 * Request validation middleware using Zod schemas
 */
export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        logger.warn('Request validation failed', {
          errors: result.error.errors
        });

        return res.status(400).json({
          error: 'Invalid request',
          details: result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }

      req.body = result.data;
      next();
    } catch (error) {
      logger.error('Validation middleware error', { error });
      next(error);
    }
  };
}
