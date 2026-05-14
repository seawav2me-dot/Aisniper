import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const BYPASS_PATHS = [
  "/api/health",
  "/api/telegram/webhook",
  "/api/telegram/setup-webhook",
  "/api/telegram/info",
  "/api/prices",
  "/api/prices/live",
  "/api/subscription-prices",
  "/api/active-symbols",
];

export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env["API_KEY"];

  if (!apiKey) {
    next();
    return;
  }

  const path = req.path;
  const isBypassed = BYPASS_PATHS.some((p) => path === p || path.startsWith(p + "/"));
  if (isBypassed) {
    next();
    return;
  }

  const provided =
    req.headers["x-api-key"] as string | undefined ??
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "");

  if (!provided || provided !== apiKey) {
    logger.warn({ path, ip: req.ip }, "apiKeyMiddleware: unauthorized request");
    res.status(401).json({ ok: false, error: "Unauthorized — invalid or missing API key" });
    return;
  }

  next();
}
