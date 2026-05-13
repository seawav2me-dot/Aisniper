import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/config", (_req, res) => {
  res.json({
    walletAddress: process.env["WALLET_ADDRESS"] ?? "",
    botUsername: "Strongsmartsignal_bot",
    paymentMethods: ["USDT TRC20", "USDT BEP20", "BTC", "ETH", "BNB"],
  });
});

export default router;
