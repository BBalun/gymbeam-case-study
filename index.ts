import "dotenv/config";
import express from "express";
import pino from "pino-http";
import { router as optimizeRouter } from "./src/routes/optimize";
import { logger } from "./src/logger";
import { z } from "zod";
import { errorMiddleware } from "./src/middlewares/errorMiddleware";

const port = z.number({ coerce: true }).default(3000).parse(process.env.PORT);
const app = express();

app.use(
  pino({
    logger,
  })
);

app.use(express.json());
app.use("/order/optimize", optimizeRouter);
app.use(errorMiddleware);

app.listen(port, () => {
  logger.info(`App started on port ${port}`);
});
