import { NextFunction, Request, Response } from "express";

export const securityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Add these headers to allow embedding
  res.setHeader("Content-Security-Policy", "frame-ancestors 'self' *;");
  res.setHeader("X-Frame-Options", "ALLOW-FROM *");

  next();
};
