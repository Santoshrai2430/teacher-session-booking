
import { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { HttpError } from '../utils/HttpError';

export const errorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  _next
) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((error) =>
      error instanceof Error ? error.message : String(error)
    );

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      details,
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      message: 'Invalid identifier or value',
    });
    return;
  }

  if ((err as { code?: number }).code === 11000) {
    res.status(409).json({
      success: false,
      message: 'A record with this unique field already exists',
    });
    return;
  }

  console.error(err);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
