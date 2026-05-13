import { Router, type IRouter } from "express";
import { getLiveMarketData } from "../lib/priceService";

const router: IRouter = Router();

router.get("/prices", async (_req, res) => {
  const data = await getLiveMarketData();

  if (!data) {
    res.status(503).json({ error: "Price data unavailable — upstream API unreachable" });
    return;
  }

  res.json({ ok: true, data });
});

router.post("/prices/refresh", async (_req, res) => {
  const data = await getLiveMarketData(true);
  if (!data) {
    res.status(503).json({ error: "Price refresh failed" });
    return;
  }
  res.json({ ok: true, data });
});

export default router;
