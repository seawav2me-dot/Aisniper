import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";

vi.mock("../lib/telegram", () => ({
  sendMessage: vi.fn().mockResolvedValue(undefined),
  forwardMessage: vi.fn().mockResolvedValue(undefined),
  setWebhook: vi.fn().mockResolvedValue(true),
  getBotInfo: vi.fn().mockResolvedValue({
    id: 123456789,
    username: "Strongsmartsignal_bot",
    first_name: "AI SNIPER PRO MAX",
  }),
}));

vi.mock("../lib/subscriberService", () => ({
  upsertSubscriber: vi.fn().mockResolvedValue(undefined),
  deactivateSubscriber: vi.fn().mockResolvedValue(undefined),
  getSubscriberCount: vi.fn().mockResolvedValue({ total: 42, vip: 10, free: 32 }),
  getSubscriberName: vi.fn().mockResolvedValue("Ahmed"),
  getAllActiveSubscriberChatIds: vi.fn().mockResolvedValue([100, 200, 300]),
}));

vi.mock("../lib/paymentService", () => ({
  createPendingPayment: vi.fn().mockResolvedValue(7),
  approvePayment: vi.fn().mockResolvedValue({ name: "Ahmed", tier: "vip", referrerChatId: null }),
  rejectPayment: vi.fn().mockResolvedValue("Ahmed"),
  getPendingPaymentCount: vi.fn().mockResolvedValue(3),
}));

vi.mock("../lib/referralService", () => ({
  generateReferralCode: vi.fn((chatId: number) => "REF" + chatId.toString(36).toUpperCase()),
  parseChatIdFromCode: vi.fn().mockReturnValue(200),
  recordReferral: vi.fn().mockResolvedValue(true),
  getReferralStats: vi.fn().mockResolvedValue({
    code: "REF2S",
    link: "https://t.me/Strongsmartsignal_bot?start=REF2S",
    total: 5,
    converted: 2,
    pending: 3,
  }),
  getGlobalReferralStats: vi.fn().mockResolvedValue({
    totalReferrals: 20,
    converted: 8,
    pending: 12,
    topReferrers: [{ chatId: 200, count: 5 }],
  }),
  completeReferral: vi.fn().mockResolvedValue(null),
  ensureReferralCode: vi.fn().mockResolvedValue("REF2S"),
}));

vi.mock("../lib/scheduler", () => ({
  broadcast: vi.fn().mockResolvedValue(5),
  startScheduler: vi.fn(),
  stopScheduler: vi.fn(),
}));

vi.mock("../lib/settingsService", () => ({
  getVipPrices: vi.fn().mockResolvedValue({
    vipMonthly: 29,
    vipAnnual: 199,
    eliteMonthly: 79,
    eliteAnnual: 699,
  }),
  setSetting: vi.fn().mockResolvedValue(undefined),
  isValidSettingKey: vi.fn().mockReturnValue(true),
}));

vi.mock("../lib/freeQuotaService", () => ({
  checkSignalQuota: vi.fn().mockResolvedValue({ allowed: true, remaining: 999 }),
  checkScanQuota: vi.fn().mockResolvedValue({ allowed: true, remaining: 999 }),
}));

vi.mock("../lib/signalHistoryService", () => ({
  getActiveSignals: vi.fn().mockReturnValue([]),
  getMonthlyStats: vi.fn().mockResolvedValue([]),
  seedIfEmpty: vi.fn().mockResolvedValue(undefined),
  getLatestMonthSummary: vi.fn().mockResolvedValue(""),
}));

const MOCK_LIVE_DATA = vi.hoisted(() => ({
  btc: 103_450,
  btcChange: 2.34,
  eth: 3_210,
  ethChange: 1.85,
  sol: 168.5,
  solChange: 4.12,
  bnb: 612,
  bnbChange: 0.75,
  xrp: 0.592,
  xrpChange: -0.43,
  fearGreed: 74,
  fearGreedLabel: "جشع",
  marketStatus: "BULLISH" as const,
  winRate: 91,
  fetchedAt: Date.now(),
}));

vi.mock("../lib/priceService", () => ({
  getLiveMarketData: vi.fn().mockResolvedValue(MOCK_LIVE_DATA),
  formatPrice: vi.fn((p: number) => p.toLocaleString("en-US", { maximumFractionDigits: 0 })),
}));

import { sendMessage, forwardMessage } from "../lib/telegram";

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env["ADMIN_CHAT_ID"];
});

const makeUpdate = (text: string, updateId = 1, chatId = 100) => ({
  update_id: updateId,
  message: {
    message_id: 10,
    from: { id: chatId, first_name: "Ahmed", username: "ahmed123" },
    chat: { id: chatId, type: "private" },
    text,
  },
});

const makePhotoUpdate = (chatId = 100) => ({
  update_id: 2,
  message: {
    message_id: 11,
    from: { id: chatId, first_name: "Ahmed", username: "ahmed123" },
    chat: { id: chatId, type: "private" },
    photo: [
      { file_id: "small_id", file_unique_id: "s1", width: 100, height: 100 },
      { file_id: "large_id", file_unique_id: "l1", width: 800, height: 600, file_size: 45000 },
    ],
  },
});

// ─── Health & Config ────────────────────────────────────────────────────────

describe("GET /api/healthz", () => {
  it("returns status ok", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("GET /api/config", () => {
  it("returns bot username and payment methods", async () => {
    const res = await request(app).get("/api/config");
    expect(res.status).toBe(200);
    expect(res.body.botUsername).toBe("Strongsmartsignal_bot");
    expect(Array.isArray(res.body.paymentMethods)).toBe(true);
    expect(res.body.paymentMethods.length).toBeGreaterThan(0);
  });

  it("includes USDT as a payment method", async () => {
    const res = await request(app).get("/api/config");
    const methods: string[] = res.body.paymentMethods;
    expect(methods.some((m) => m.includes("USDT"))).toBe(true);
  });
});

// ─── Telegram Bot Info & Webhook Setup ──────────────────────────────────────

describe("GET /api/telegram/info", () => {
  it("returns bot info when token is valid", async () => {
    const res = await request(app).get("/api/telegram/info");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.bot.username).toBe("Strongsmartsignal_bot");
  });

  it("returns 503 when bot info is unavailable", async () => {
    const { getBotInfo } = await import("../lib/telegram");
    vi.mocked(getBotInfo).mockResolvedValueOnce(null);
    const res = await request(app).get("/api/telegram/info");
    expect(res.status).toBe(503);
    expect(res.body.error).toBeDefined();
  });
});

describe("POST /api/telegram/setup-webhook", () => {
  it("sets the webhook successfully", async () => {
    const res = await request(app)
      .post("/api/telegram/setup-webhook")
      .send({ domain: "myapp.replit.app" });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.webhookUrl).toContain("myapp.replit.app");
    expect(res.body.webhookUrl).toContain("/api/telegram/webhook");
  });

  it("returns 400 when no domain is provided", async () => {
    delete process.env["REPLIT_DOMAINS"];
    const res = await request(app).post("/api/telegram/setup-webhook").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ─── User Commands ───────────────────────────────────────────────────────────

describe("POST /api/telegram/webhook — user commands", () => {
  it("/start sends welcome and auto-subscribes", async () => {
    const { upsertSubscriber } = await import("../lib/subscriberService");
    const res = await request(app).post("/api/telegram/webhook").send(makeUpdate("/start"));
    expect(res.status).toBe(200);
    expect(upsertSubscriber).toHaveBeenCalledWith(100, "Ahmed", "ahmed123");
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("Ahmed");
  });

  it("/market sends market status", async () => {
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/market"));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("MARKET STATUS");
  });

  it("/signals sends active signals", async () => {
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/signals"));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("ACTIVE SIGNALS");
  });

  it("/whale sends whale tracker", async () => {
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/whale"));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("WHALE TRACKER");
  });

  it("/scanner sends AI scanner results", async () => {
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/scanner"));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("AI SCANNER");
  });

  it("/vip sends membership info", async () => {
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/vip"));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("VIP");
  });

  it("/pay sends payment instructions", async () => {
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/pay"));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("إرسال إثبات الدفع");
  });

  it("/help sends command list", async () => {
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/help"));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("COMMANDS");
  });

  it("/subscribe activates alerts", async () => {
    const { upsertSubscriber } = await import("../lib/subscriberService");
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/subscribe"));
    expect(upsertSubscriber).toHaveBeenCalled();
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("ALERTS ACTIVATED");
  });

  it("/unsubscribe pauses alerts", async () => {
    const { deactivateSubscriber } = await import("../lib/subscriberService");
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/unsubscribe"));
    expect(deactivateSubscriber).toHaveBeenCalledWith(100);
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("ALERTS PAUSED");
  });

  it("falls back to help for unknown commands", async () => {
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/xyz_unknown"));
    expect(sendMessage).toHaveBeenCalledOnce();
  });

  it("skips when no message present", async () => {
    const res = await request(app).post("/api/telegram/webhook").send({ update_id: 99 });
    expect(res.status).toBe(200);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("skips when message has no text and no photo", async () => {
    const res = await request(app).post("/api/telegram/webhook").send({
      update_id: 99,
      message: { message_id: 1, from: { id: 1, first_name: "Bot" }, chat: { id: 1, type: "private" } },
    });
    expect(res.status).toBe(200);
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

// ─── Referral System ─────────────────────────────────────────────────────────

describe("POST /api/telegram/webhook — referral flow", () => {
  it("/ref sends personal referral link and stats", async () => {
    const { getReferralStats } = await import("../lib/referralService");
    const res = await request(app).post("/api/telegram/webhook").send(makeUpdate("/ref"));
    expect(res.status).toBe(200);
    expect(getReferralStats).toHaveBeenCalledWith(100);
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("برنامج الإحالة");
    expect(text).toContain("REF2S");
    expect(text).toContain("t.me");
  });

  it("/start with valid referral code records the referral", async () => {
    const { parseChatIdFromCode, recordReferral } = await import("../lib/referralService");
    vi.mocked(parseChatIdFromCode).mockReturnValueOnce(200);
    vi.mocked(recordReferral).mockResolvedValueOnce(true);

    const res = await request(app)
      .post("/api/telegram/webhook")
      .send(makeUpdate("/start REF6K", 1, 100));
    expect(res.status).toBe(200);
    expect(parseChatIdFromCode).toHaveBeenCalledWith("REF6K");
    expect(recordReferral).toHaveBeenCalledWith(200, 100);
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("مرحباً بك");
    expect(text).toContain("Ahmed");
  });

  it("/start with valid code shows referrer name", async () => {
    const { getSubscriberName } = await import("../lib/subscriberService");
    const { parseChatIdFromCode, recordReferral } = await import("../lib/referralService");
    vi.mocked(parseChatIdFromCode).mockReturnValueOnce(200);
    vi.mocked(recordReferral).mockResolvedValueOnce(true);
    vi.mocked(getSubscriberName).mockResolvedValueOnce("Mohammed");

    await request(app).post("/api/telegram/webhook").send(makeUpdate("/start REF6K", 1, 100));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("Mohammed");
  });

  it("/start with unknown code falls back to normal welcome", async () => {
    const { parseChatIdFromCode } = await import("../lib/referralService");
    vi.mocked(parseChatIdFromCode).mockReturnValueOnce(null);

    await request(app).post("/api/telegram/webhook").send(makeUpdate("/start BADCODE", 1, 100));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("AI SNIPER PRO MAX");
  });

  it("/start without code shows normal welcome", async () => {
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/start"));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("AI SNIPER PRO MAX");
  });

  it("notifies referrer when VIP is approved via referral", async () => {
    process.env["ADMIN_CHAT_ID"] = "999";
    const { approvePayment } = await import("../lib/paymentService");
    const { getSubscriberName } = await import("../lib/subscriberService");
    vi.mocked(approvePayment).mockResolvedValueOnce({ name: "Ahmed", tier: "vip", referrerChatId: 200 });
    vi.mocked(getSubscriberName).mockResolvedValueOnce("Mohammed");

    await request(app).post("/api/telegram/webhook").send(makeUpdate("/approve 100 vip", 1, 999));

    const calls = vi.mocked(sendMessage).mock.calls;
    const referrerMsg = calls.find(([id]) => id === 200);
    expect(referrerMsg).toBeDefined();
    expect(referrerMsg![1]).toContain("مكافأة الإحالة");
    expect(referrerMsg![1]).toContain("Ahmed");
  });

  it("does not notify referrer when no referral exists", async () => {
    process.env["ADMIN_CHAT_ID"] = "999";
    const { approvePayment } = await import("../lib/paymentService");
    vi.mocked(approvePayment).mockResolvedValueOnce({ name: "Ahmed", tier: "vip", referrerChatId: null });

    await request(app).post("/api/telegram/webhook").send(makeUpdate("/approve 100 vip", 1, 999));

    const calls = vi.mocked(sendMessage).mock.calls;
    const referrerMsg = calls.find(([id]) => id === 200);
    expect(referrerMsg).toBeUndefined();
  });
});

// ─── Payment Screenshot Flow ─────────────────────────────────────────────────

describe("POST /api/telegram/webhook — payment screenshot flow", () => {
  it("stores payment record when user sends a photo", async () => {
    const { createPendingPayment } = await import("../lib/paymentService");
    await request(app).post("/api/telegram/webhook").send(makePhotoUpdate(100));
    expect(createPendingPayment).toHaveBeenCalledWith(100, "Ahmed", "ahmed123", "large_id");
  });

  it("confirms receipt to the user", async () => {
    await request(app).post("/api/telegram/webhook").send(makePhotoUpdate(100));
    const userMsg = vi.mocked(sendMessage).mock.calls.find(([id]) => id === 100);
    expect(userMsg).toBeDefined();
    expect(userMsg![1]).toContain("تم استلام الإيصال");
  });

  it("notifies admin when ADMIN_CHAT_ID is set", async () => {
    process.env["ADMIN_CHAT_ID"] = "999";
    await request(app).post("/api/telegram/webhook").send(makePhotoUpdate(100));
    const adminMsg = vi.mocked(sendMessage).mock.calls.find(([id]) => id === 999);
    expect(adminMsg).toBeDefined();
    expect(adminMsg![1]).toContain("طلب ترقية VIP جديد");
  });

  it("forwards the screenshot to admin", async () => {
    process.env["ADMIN_CHAT_ID"] = "999";
    await request(app).post("/api/telegram/webhook").send(makePhotoUpdate(100));
    expect(forwardMessage).toHaveBeenCalledWith(999, 100, 11);
  });

  it("does not forward when ADMIN_CHAT_ID is not set", async () => {
    await request(app).post("/api/telegram/webhook").send(makePhotoUpdate(100));
    expect(forwardMessage).not.toHaveBeenCalled();
  });
});

// ─── Admin Commands ───────────────────────────────────────────────────────────

describe("POST /api/telegram/webhook — admin commands", () => {
  beforeEach(() => { process.env["ADMIN_CHAT_ID"] = "999"; });

  it("/approve upgrades user to VIP and notifies them", async () => {
    const { approvePayment } = await import("../lib/paymentService");
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/approve 100 vip", 1, 999));
    expect(approvePayment).toHaveBeenCalledWith(100, "vip", 999);
    const [targetId, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(targetId).toBe(100);
    expect(text).toContain("تم تفعيل اشتراكك");
  });

  it("/approve defaults to vip when tier omitted", async () => {
    const { approvePayment } = await import("../lib/paymentService");
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/approve 100", 1, 999));
    expect(approvePayment).toHaveBeenCalledWith(100, "vip", 999);
  });

  it("/approve elite upgrades to elite tier", async () => {
    const { approvePayment } = await import("../lib/paymentService");
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/approve 100 elite", 1, 999));
    expect(approvePayment).toHaveBeenCalledWith(100, "elite", 999);
  });

  it("/reject sends rejection to user", async () => {
    const { rejectPayment } = await import("../lib/paymentService");
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/reject 100", 1, 999));
    expect(rejectPayment).toHaveBeenCalledWith(100, 999);
    const [targetId, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(targetId).toBe(100);
    expect(text).toContain("تعذّر التحقق");
  });

  it("/stats returns subscriber and payment stats", async () => {
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/stats", 1, 999));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("ADMIN STATS");
  });

  it("/ref_stats returns global referral stats", async () => {
    const { getGlobalReferralStats } = await import("../lib/referralService");
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/ref_stats", 1, 999));
    expect(getGlobalReferralStats).toHaveBeenCalled();
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("إحصائيات الإحالة");
  });

  it("admin commands blocked for regular users", async () => {
    const { approvePayment } = await import("../lib/paymentService");
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/approve 100 vip", 1, 100));
    expect(approvePayment).not.toHaveBeenCalled();
  });

  it("/approve with invalid ID returns error", async () => {
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/approve abc vip", 1, 999));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("❌");
  });

  it("/approve with invalid tier returns error", async () => {
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/approve 100 silver", 1, 999));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("❌");
  });

  it("/reject with invalid ID returns error", async () => {
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/reject notanumber", 1, 999));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("❌");
  });
});

// ─── Broadcast ───────────────────────────────────────────────────────────────

describe("POST /api/broadcast", () => {
  it("triggers a signals broadcast", async () => {
    const { broadcast } = await import("../lib/scheduler");
    const res = await request(app).post("/api/broadcast").send({ type: "signals", vipOnly: false });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.sent).toBe(5);
    expect(broadcast).toHaveBeenCalledWith("signals", false);
  });

  it("triggers a VIP-only whales broadcast", async () => {
    const { broadcast } = await import("../lib/scheduler");
    const res = await request(app).post("/api/broadcast").send({ type: "whales", vipOnly: true });
    expect(res.status).toBe(200);
    expect(broadcast).toHaveBeenCalledWith("whales", true);
  });

  it("rejects invalid broadcast type", async () => {
    const res = await request(app).post("/api/broadcast").send({ type: "invalid" });
    expect(res.status).toBe(400);
  });

  it("rejects missing broadcast type", async () => {
    const res = await request(app).post("/api/broadcast").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/broadcast/stats", () => {
  it("returns subscriber counts", async () => {
    const res = await request(app).get("/api/broadcast/stats");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.subscribers.total).toBe(42);
    expect(res.body.subscribers.vip).toBe(10);
  });
});

// ─── Live Prices ──────────────────────────────────────────────────────────────

describe("GET /api/prices", () => {
  it("returns live market data", async () => {
    const res = await request(app).get("/api/prices");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const d = res.body.data;
    expect(d.btc).toBe(103_450);
    expect(d.eth).toBe(3_210);
    expect(d.sol).toBe(168.5);
    expect(d.bnb).toBe(612);
    expect(d.xrp).toBe(0.592);
    expect(d.fearGreed).toBe(74);
    expect(d.fearGreedLabel).toBe("جشع");
    expect(d.marketStatus).toBe("BULLISH");
    expect(d.winRate).toBe(91);
    expect(d.fetchedAt).toBeTypeOf("number");
  });

  it("returns 503 when price service is unavailable", async () => {
    const { getLiveMarketData } = await import("../lib/priceService");
    vi.mocked(getLiveMarketData).mockResolvedValueOnce(null);
    const res = await request(app).get("/api/prices");
    expect(res.status).toBe(503);
    expect(res.body.error).toBeDefined();
  });
});

describe("POST /api/prices/refresh", () => {
  it("force-refreshes and returns new data", async () => {
    const { getLiveMarketData } = await import("../lib/priceService");
    const res = await request(app).post("/api/prices/refresh");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(vi.mocked(getLiveMarketData)).toHaveBeenCalledWith(true);
  });

  it("returns 503 when refresh fails", async () => {
    const { getLiveMarketData } = await import("../lib/priceService");
    vi.mocked(getLiveMarketData).mockResolvedValueOnce(null);
    const res = await request(app).post("/api/prices/refresh");
    expect(res.status).toBe(503);
  });
});

// ─── /market uses live prices ─────────────────────────────────────────────────

describe("/market command uses live prices", () => {
  it("injects live BTC price and fear/greed into market message", async () => {
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/market"));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("103,450");
    expect(text).toContain("74");
  });

  it("falls back gracefully when price service returns null", async () => {
    const { getLiveMarketData } = await import("../lib/priceService");
    vi.mocked(getLiveMarketData).mockResolvedValueOnce(null);
    await request(app).post("/api/telegram/webhook").send(makeUpdate("/market"));
    const [, text] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(text).toContain("67,340");
  });
});
