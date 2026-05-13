import { pgTable, bigint, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscribersTable = pgTable("subscribers", {
  chatId: bigint("chat_id", { mode: "number" }).primaryKey(),
  firstName: text("first_name").notNull().default("Trader"),
  username: text("username"),
  tier: text("tier").notNull().default("free"),
  isActive: boolean("is_active").notNull().default(true),
  referralCode: text("referral_code").unique(),
  freeSignalsToday: integer("free_signals_today").notNull().default(0),
  freeScansToday: integer("free_scans_today").notNull().default(0),
  lastQuotaDate: text("last_quota_date"),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubscriberSchema = createInsertSchema(subscribersTable).omit({
  subscribedAt: true,
  updatedAt: true,
});

export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribersTable.$inferSelect;
