import { Router, type IRouter } from "express";
import { broadcast } from "../lib/scheduler";
import { getSubscriberCount } from "../lib/subscriberService";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const BROADCAST_SECRET = process.env["BROADCAST_SECRET"];

function requireSecret(req: Parameters<Parameters<IRouter["post"]>[1]>[0], res: Parameters<Parameters<IRouter["post"]>[1]>[1]): boolean {
  if (!BROADCAST_SECRET) return true;
  const provided = req.headers["x-broadcast-secret"] ?? (req.body as Record<string, unknown>)["secret"];
  if (provided !== BROADCAST_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

router.post("/broadcast", async (req, res) => {
  if (!requireSecret(req, res)) return;

  const body = req.body as { type?: string; vipOnly?: boolean };
  const type = body.type as "signals" | "market" | "whales" | "scanner" | undefined;

  const validTypes = ["signals", "market", "whales", "scanner"] as const;
  if (!type || !validTypes.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${validTypes.join(", ")}` });
    return;
  }

  const vipOnly = body.vipOnly === true;

  logger.info({ type, vipOnly }, "Manual broadcast triggered");
  const sent = await broadcast(type, vipOnly);
  res.json({ ok: true, type, vipOnly, sent });
});

router.get("/broadcast/stats", async (_req, res) => {
  const counts = await getSubscriberCount();
  res.json({ ok: true, subscribers: counts });
});

export default router;
