import { Router } from "express";
import { getActiveSymbols, getDiscoveryStats } from "../lib/symbolDiscovery";
import { getTempTrackedSymbols } from "../lib/onDemandPriceTracker";
import { logger } from "../lib/logger";

const router = Router();

const isAdmin = (req: import("express").Request): boolean => {
  const provided =
    (req.headers["x-api-key"] as string | undefined) ??
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
  return !!process.env["API_KEY"] && provided === process.env["API_KEY"];
};

router.get("/admin/symbols", (req, res) => {
  if (!isAdmin(req)) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  const stats = getDiscoveryStats();
  const tempSymbols = getTempTrackedSymbols();

  res.json({
    ok: true,
    data: {
      active: {
        count: stats.count,
        lastFetchedAt: stats.lastFetchedAt,
        symbols: getActiveSymbols().map((s) => s.toUpperCase()),
      },
      temporary: {
        count: tempSymbols.length,
        symbols: tempSymbols,
        note: "عملات طُلبت خارج القائمة — تُزال تلقائياً بعد ساعتين",
      },
      filters: stats.filters,
    },
  });
});

router.post("/admin/symbols/force-refresh", async (req, res) => {
  if (!isAdmin(req)) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  try {
    const { startSymbolDiscovery } = await import("../lib/symbolDiscovery");
    await startSymbolDiscovery();
    const stats = getDiscoveryStats();
    logger.info({ count: stats.count }, "admin: force-refreshed symbol list");
    res.json({ ok: true, count: stats.count, lastFetchedAt: stats.lastFetchedAt });
  } catch (e) {
    logger.error({ e }, "admin: force-refresh failed");
    res.status(500).json({ ok: false, error: "Refresh failed" });
  }
});

export default router;
