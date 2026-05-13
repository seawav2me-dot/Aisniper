import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/config", (_req, res) => {
  res.json({
    walletAddress: process.env["WALLET_ADDRESS"] ?? "",
    botUsername: process.env["BOT_USERNAME"] ?? "Strongsmartsignal_bot",
    paymentMethods: ["USDT TRC20", "USDT BEP20", "BTC", "ETH", "BNB"],
  });
});

router.get("/subscription-prices", async (_req, res) => {
  try {
    const { getVipPrices } = await import("../lib/settingsService");
    const prices = await getVipPrices();
    res.json({ ok: true, prices });
  } catch {
    res.json({
      ok: true,
      prices: { vipMonthly: 29, vipAnnual: 199, eliteMonthly: 79, eliteAnnual: 699 },
    });
  }
});

export default router;
