import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route introuvable : ${req.method} ${req.originalUrl}`,
    },
  });
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Les données envoyées sont invalides.',
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error({ err: error, requestId: req.id }, error.message);
    }
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  logger.error({ err: error, requestId: req.id }, 'Erreur non gérée');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Une erreur interne est survenue.',
    },
  });
}
