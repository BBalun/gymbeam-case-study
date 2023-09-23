import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorMiddleware(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json(err);
  }
  req.log.error({ message: "Uncaught exception occurred", error: err });
  res.status(500).json({ message: "Something went wrong." });
}
