import "dotenv/config";
import { router as optimizeRouter } from "./src/routes/optimize";

import express, { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import pino from "pino-http";

const app = express();

app.use(pino());
app.use(express.json());

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json(err);
  }
  req.log.error({ message: "Uncaught exception occurred", error: err });
  res.status(500).json({ message: "Something went wrong." });
});

app.use("/order/optimize", optimizeRouter);

app.listen(3000, () => {
  console.log(`App started on port 3000`);
});
