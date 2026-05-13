import { db } from "@workspace/db";
import { botSettingsTable } from "@workspace/db/schema";

export interface VipPrices {
  vipMonthly: number;
  vipAnnual: number;
  eliteMonthly: number;
  eliteAnnual: number;
}

const DEFAULTS: VipPrices = {
  vipMonthly: 29,
  vipAnnual: 199,
  eliteMonthly: 79,
  eliteAnnual: 699,
};

const VALID_KEYS = ["vip_monthly", "vip_annual", "elite_monthly", "elite_annual"] as const;
export type SettingKey = (typeof VALID_KEYS)[number];

export function isValidSettingKey(k: string): k is SettingKey {
  return (VALID_KEYS as readonly string[]).includes(k);
}

export async function getVipPrices(): Promise<VipPrices> {
  try {
    const rows = await db.select().from(botSettingsTable);
    const map = Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
    return {
      vipMonthly: map["vip_monthly"] ?? DEFAULTS.vipMonthly,
      vipAnnual: map["vip_annual"] ?? DEFAULTS.vipAnnual,
      eliteMonthly: map["elite_monthly"] ?? DEFAULTS.eliteMonthly,
      eliteAnnual: map["elite_annual"] ?? DEFAULTS.eliteAnnual,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  await db
    .insert(botSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({
      target: botSettingsTable.key,
      set: { value, updatedAt: new Date() },
    });
}
