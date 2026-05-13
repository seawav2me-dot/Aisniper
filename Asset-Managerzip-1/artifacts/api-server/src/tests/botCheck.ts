/**
 * Live bot connectivity check — run with:
 *   npx tsx artifacts/api-server/src/tests/botCheck.ts
 *
 * Requires TELEGRAM_BOT_TOKEN to be set.
 * Optionally set TELEGRAM_TEST_CHAT_ID to send a live test message.
 */

const token = process.env["TELEGRAM_BOT_TOKEN"];
const chatId = process.env["TELEGRAM_TEST_CHAT_ID"];
const BASE = `https://api.telegram.org/bot${token}`;

function ok(label: string) {
  console.log(`  ✅  ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  ❌  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function checkToken() {
  if (!token) {
    fail("TELEGRAM_BOT_TOKEN is not set");
    process.exit(1);
  }
  ok("TELEGRAM_BOT_TOKEN is present");
}

async function checkGetMe() {
  const res = await fetch(`${BASE}/getMe`);
  const data = (await res.json()) as { ok: boolean; result?: { username: string; first_name: string; id: number } };
  if (!data.ok || !data.result) {
    fail("getMe failed — token may be invalid", JSON.stringify(data));
    return false;
  }
  ok(`Bot connected: @${data.result.username} (ID: ${data.result.id})`);
  return true;
}

async function checkWebhookStatus() {
  const res = await fetch(`${BASE}/getWebhookInfo`);
  const data = (await res.json()) as {
    ok: boolean;
    result?: {
      url: string;
      pending_update_count: number;
      last_error_message?: string;
      last_error_date?: number;
    };
  };

  if (!data.ok || !data.result) {
    fail("getWebhookInfo failed");
    return;
  }

  const wh = data.result;
  if (!wh.url) {
    console.warn("  ⚠️   No webhook URL is set — bot is not receiving updates");
  } else {
    ok(`Webhook URL: ${wh.url}`);
    ok(`Pending updates in queue: ${wh.pending_update_count}`);
  }

  if (wh.last_error_message) {
    const errDate = wh.last_error_date
      ? new Date(wh.last_error_date * 1000).toISOString()
      : "unknown";
    fail(`Last webhook error at ${errDate}`, wh.last_error_message);
  } else {
    ok("No recent webhook errors");
  }
}

async function sendTestMessage() {
  if (!chatId) {
    console.log("  ℹ️   TELEGRAM_TEST_CHAT_ID not set — skipping live message test");
    return;
  }

  const text =
    "🤖 <b>AI SNIPER PRO MAX — Bot Test</b>\n\n" +
    "✅ Bot is alive and responding correctly.\n" +
    `🕐 ${new Date().toISOString()}`;

  const res = await fetch(`${BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });

  const data = (await res.json()) as { ok: boolean; description?: string };
  if (data.ok) {
    ok(`Test message sent to chat ID ${chatId}`);
  } else {
    fail(`sendMessage failed`, data.description);
  }
}

async function main() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  AI SNIPER PRO MAX — Bot Health Check");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await checkToken();
  const alive = await checkGetMe();

  if (alive) {
    await checkWebhookStatus();
    await sendTestMessage();
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
