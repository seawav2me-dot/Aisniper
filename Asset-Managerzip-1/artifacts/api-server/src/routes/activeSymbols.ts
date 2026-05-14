import { Router } from "express";
import { getActiveSymbols, getDiscoveryStats } from "../lib/symbolDiscovery";

const router = Router();

router.get("/active-symbols", (_req, res) => {
  const symbols = getActiveSymbols();
  const stats = getDiscoveryStats();
  res.json({
    ok: true,
    data: {
      symbols: symbols.map((s) => s.toUpperCase()),
      count: symbols.length,
      lastFetchedAt: stats.lastFetchedAt,
      filters: stats.filters,
    },
  });
});

export default router;
