import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { startScheduler } from "./lib/scheduler";
import { attachPriceWsServer } from "./lib/priceWsServer";
import { validateEnv, runAutoMigrate, registerBotCommands } from "./lib/startup";
import { startPolling } from "./lib/botPoller";
import { startLivePriceMonitor, stopLivePriceMonitor } from "./lib/livePriceMonitor";
import { startPaperTradeMonitor, stopPaperTradeMonitor } from "./lib/paperTradeMonitor";

validateEnv();

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const useWebhook = process.env["USE_WEBHOOK"] !== "false";

async function bootstrap() {
  await runAutoMigrate();

  const server = createServer(app);
  attachPriceWsServer(server);

  await new Promise<void>((resolve, reject) => {
    server.listen(port, (err?: Error) => {
      if (err) { reject(err); return; }
      logger.info({ port, mode: useWebhook ? "webhook" : "polling" }, "Server listening");
      resolve();
    });
  });

  startScheduler();
  await registerBotCommands();

  startLivePriceMonitor();
  startPaperTradeMonitor();
  logger.info("Live price monitor + paper trade auto-close: started");

  if (!useWebhook) {
    startPolling(port);
  } else {
    logger.info("Webhook mode active — POST /api/telegram/setup-webhook to register URL");
  }

  process.on("SIGTERM", () => {
    logger.info("SIGTERM received — shutting down gracefully");
    stopPaperTradeMonitor();
    stopLivePriceMonitor();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
