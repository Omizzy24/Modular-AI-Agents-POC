import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@poc/shared';

const logger = createLogger('bff:errorHandler');

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === 'development';

  res.status(500).json({
    error: 'Internal server error',
    message: isDev ? error.message : 'An error occurred',
    ...(isDev && { stack: error.stack })
  });
}
