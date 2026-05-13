import { Router, type IRouter } from "express";
import healthRouter from "./health";
import telegramRouter from "./telegram";
import configRouter from "./config";

const router: IRouter = Router();

router.use(healthRouter);
router.use(telegramRouter);
router.use(configRouter);

export default router;
