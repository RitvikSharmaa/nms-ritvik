import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { morganStream } from "./config/logger";
import { swaggerSpec } from "./config/swagger";
import { apiRouter } from "./routes/api";
import { errorHandler, notFoundHandler } from "./middleware/validate";

export function createApp(): express.Express {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("combined", { stream: morganStream }));

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
