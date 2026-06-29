import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { registerAuthRoutes } from "./googleAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );
  return app;
}
