import { describe, it, expect } from "vitest";
import { MSG } from "../lib/botMessages";

const DEFAULT_PRICES = {
  vipMonthly: 29,
  vipAnnual: 199,
  eliteMonthly: 79,
  eliteAnnual: 699,
};

describe("Bot Messages", () => {
  describe("MSG.welcome", () => {
    it("includes the user name", () => { expect(MSG.welcome("Ahmed")).toContain("Ahmed"); });
    it("lists all commands including /pay and /ref", () => {
      const msg = MSG.welcome("Test");
      ["/signals", "/market", "/whale", "/scanner", "/vip", "/pay", "/subscribe", "/ref", "/help"]
        .forEach((cmd) => expect(msg).toContain(cmd));
    });
    it("contains the app name", () => { expect(MSG.welcome("Test")).toContain("AI SNIPER PRO MAX"); });
  });

  describe("MSG.market", () => {
    it("shows BULLISH status", () => {
      const msg = MSG.market("BULLISH", "67,340", 71, 87);
      expect(msg).toContain("BULLISH");
      expect(msg).toContain("67,340");
      expect(msg).toContain("71");
      expect(msg).toContain("87");
    });
    it("shows BEARISH status", () => { expect(MSG.market("BEARISH", "60,000", 30, 65)).toContain("BEARISH"); });
    it("includes BTC price", () => { expect(MSG.market("BULLISH", "99,999", 50, 80)).toContain("99,999"); });
  });

  describe("MSG.signals", () => {
    it("contains LONG signal", () => { expect(MSG.signals).toContain("LONG"); });
    it("shows entry, TP, SL", () => {
      expect(MSG.signals).toContain("Entry");
      expect(MSG.signals).toContain("TP1");
      expect(MSG.signals).toContain("SL");
    });
    it("shows AI Confidence", () => { expect(MSG.signals).toContain("AI Confidence"); });
    it("shows R:R ratio", () => { expect(MSG.signals).toContain("R:R"); });
  });

  describe("MSG.whales", () => {
    it("shows WHALE TRACKER header", () => { expect(MSG.whales).toContain("WHALE TRACKER"); });
    it("shows dollar amounts", () => { expect(MSG.whales).toMatch(/\$\d+/); });
    it("shows severity levels", () => { expect(MSG.whales).toMatch(/EXTREME|CRITICAL/); });
  });

  describe("MSG.scanner", () => {
    it("shows AI SCANNER header", () => { expect(MSG.scanner).toContain("AI SCANNER"); });
    it("shows bullish and bearish setups", () => {
      expect(MSG.scanner).toContain("Bullish Setups");
      expect(MSG.scanner).toContain("Bearish Setups");
    });
    it("shows AI scores", () => { expect(MSG.scanner).toContain("AI Score"); });
  });

  describe("MSG.vip", () => {
    it("shows VIP and ELITE tiers with pricing", () => {
      const msg = MSG.vip(DEFAULT_PRICES);
      expect(msg).toContain("VIP");
      expect(msg).toContain("ELITE");
      expect(msg).toContain("$29");
      expect(msg).toContain("$79");
    });
    it("shows USDT payment method", () => { expect(MSG.vip(DEFAULT_PRICES)).toContain("USDT"); });
    it("instructs user to use /pay", () => { expect(MSG.vip(DEFAULT_PRICES)).toContain("/pay"); });
  });

  describe("MSG.payInstructions", () => {
    it("includes both VIP pricing tiers", () => {
      const msg = MSG.payInstructions(DEFAULT_PRICES);
      expect(msg).toContain("$29");
      expect(msg).toContain("$79");
    });
    it("is a non-empty string", () => {
      expect(typeof MSG.payInstructions(DEFAULT_PRICES)).toBe("string");
      expect(MSG.payInstructions(DEFAULT_PRICES).length).toBeGreaterThan(0);
    });
  });

  describe("MSG.payReceived", () => {
    it("includes user name", () => { expect(MSG.payReceived("Sara")).toContain("Sara"); });
    it("confirms receipt", () => { expect(MSG.payReceived("Test")).toContain("تم استلام الإيصال"); });
  });

  describe("MSG.vipApproved", () => {
    it("includes name and tier", () => {
      const msg = MSG.vipApproved("Ahmed", "vip");
      expect(msg).toContain("Ahmed");
      expect(msg).toContain("VIP");
    });
    it("shows ELITE when tier is elite", () => {
      expect(MSG.vipApproved("Test", "elite")).toContain("ELITE");
    });
    it("mentions /signals", () => { expect(MSG.vipApproved("Test", "vip")).toContain("/signals"); });
  });

  describe("MSG.vipRejected", () => {
    it("includes name", () => { expect(MSG.vipRejected("Ahmed")).toContain("Ahmed"); });
    it("mentions /pay to retry", () => { expect(MSG.vipRejected("Test")).toContain("/pay"); });
  });

  describe("MSG.adminPaymentAlert", () => {
    it("includes user details", () => {
      const msg = MSG.adminPaymentAlert("Ahmed", "ahmed123", 100, 7);
      expect(msg).toContain("Ahmed");
      expect(msg).toContain("100");
      expect(msg).toContain("7");
    });
    it("includes approve and reject commands", () => {
      const msg = MSG.adminPaymentAlert("Ahmed", null, 100, 7);
      expect(msg).toContain("/approve 100");
      expect(msg).toContain("/reject 100");
    });
    it("handles null username", () => {
      expect(MSG.adminPaymentAlert("Ahmed", null, 100, 7)).not.toContain("(@");
    });
  });

  describe("MSG.adminStats", () => {
    it("shows all counts", () => {
      const msg = MSG.adminStats(42, 10, 32, 3);
      expect(msg).toContain("42");
      expect(msg).toContain("10");
      expect(msg).toContain("32");
      expect(msg).toContain("3");
    });
    it("warns when pending > 0", () => { expect(MSG.adminStats(10, 5, 5, 2)).toContain("⚠️"); });
    it("shows ok when no pending", () => { expect(MSG.adminStats(10, 5, 5, 0)).toContain("✅"); });
  });

  describe("MSG.referralStats", () => {
    const msg = () => MSG.referralStats("Ahmed", "REF2S", "https://t.me/bot?start=REF2S", 5, 2, 3);

    it("shows user name", () => { expect(msg()).toContain("Ahmed"); });
    it("shows referral code", () => { expect(msg()).toContain("REF2S"); });
    it("shows referral link", () => { expect(msg()).toContain("t.me"); });
    it("shows total, converted, pending counts", () => {
      const m = msg();
      expect(m).toContain("5");
      expect(m).toContain("2");
      expect(m).toContain("3");
    });
    it("mentions reward (7 days)", () => { expect(msg()).toContain("7"); });
  });

  describe("MSG.referralWelcome", () => {
    it("includes new user name", () => {
      expect(MSG.referralWelcome("Ali", "Mohammed")).toContain("Ali");
    });
    it("includes referrer name", () => {
      expect(MSG.referralWelcome("Ali", "Mohammed")).toContain("Mohammed");
    });
    it("mentions /vip and /pay", () => {
      const msg = MSG.referralWelcome("Ali", "Mohammed");
      expect(msg).toContain("/vip");
      expect(msg).toContain("/pay");
    });
  });

  describe("MSG.referralRewarded", () => {
    it("includes referrer name", () => {
      expect(MSG.referralRewarded("Mohammed", "Ali")).toContain("Mohammed");
    });
    it("includes referred user name", () => {
      expect(MSG.referralRewarded("Mohammed", "Ali")).toContain("Ali");
    });
    it("mentions 7 days reward", () => {
      expect(MSG.referralRewarded("Mohammed", "Ali")).toContain("7");
    });
    it("mentions /ref command", () => {
      expect(MSG.referralRewarded("Mohammed", "Ali")).toContain("/ref");
    });
  });

  describe("MSG.adminReferralStats", () => {
    it("shows totals", () => {
      const msg = MSG.adminReferralStats(20, 8, 12, []);
      expect(msg).toContain("20");
      expect(msg).toContain("8");
      expect(msg).toContain("12");
    });
    it("shows top referrer when present", () => {
      const msg = MSG.adminReferralStats(5, 2, 3, [{ chatId: 777, count: 3 }]);
      expect(msg).toContain("777");
      expect(msg).toContain("3");
    });
    it("shows fallback when no referrers", () => {
      expect(MSG.adminReferralStats(0, 0, 0, [])).toContain("لا توجد إحالات");
    });
  });

  describe("MSG.subscribeConfirm", () => {
    it("includes name", () => { expect(MSG.subscribeConfirm("Ahmed")).toContain("Ahmed"); });
    it("mentions /unsubscribe", () => { expect(MSG.subscribeConfirm("Test")).toContain("/unsubscribe"); });
  });

  describe("MSG.unsubscribeConfirm", () => {
    it("includes name", () => { expect(MSG.unsubscribeConfirm("Ahmed")).toContain("Ahmed"); });
    it("mentions /subscribe", () => { expect(MSG.unsubscribeConfirm("Test")).toContain("/subscribe"); });
  });

  describe("MSG.help", () => {
    it("lists all commands including /ref", () => {
      ["/start", "/signals", "/market", "/whale", "/scanner", "/vip", "/pay", "/ref", "/subscribe", "/unsubscribe", "/help"]
        .forEach((cmd) => expect(MSG.help).toContain(cmd));
    });
  });
});
