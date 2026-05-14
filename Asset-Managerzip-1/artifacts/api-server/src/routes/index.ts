import { Router, type IRouter } from "express";
import healthRouter from "./health";
import telegramRouter from "./telegram";
import configRouter from "./config";
import broadcastRouter from "./broadcast";
import pricesRouter from "./prices";
import signalsRouter from "./signals";
import performanceRouter from "./performance";
import openTradesRouter from "./openTrades";
import activeSymbolsRouter from "./activeSymbols";

const router: IRouter = Router();

router.use(healthRouter);
router.use(telegramRouter);
router.use(configRouter);
router.use(broadcastRouter);
router.use(pricesRouter);
router.use(signalsRouter);
router.use(performanceRouter);
router.use(openTradesRouter);
router.use(activeSymbolsRouter);

export default router;
