import { pgTable, serial, text, numeric, timestamp, integer } from "drizzle-orm/pg-core";

export const signalHistoryTable = pgTable("signal_history", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(),
  tier: text("tier").notNull(),
  aiScore: integer("ai_score").notNull(),
  entryPrice: numeric("entry_price", { precision: 18, scale: 8 }).notNull(),
  tp1: numeric("tp1", { precision: 18, scale: 8 }).notNull(),
  tp2: numeric("tp2", { precision: 18, scale: 8 }).notNull(),
  tp3: numeric("tp3", { precision: 18, scale: 8 }),
  sl: numeric("sl", { precision: 18, scale: 8 }).notNull(),
  rrRatio: numeric("rr_ratio", { precision: 6, scale: 2 }).notNull(),
  outcome: text("outcome"),
  profitPct: numeric("profit_pct", { precision: 8, scale: 4 }),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export type SignalHistory = typeof signalHistoryTable.$inferSelect;
