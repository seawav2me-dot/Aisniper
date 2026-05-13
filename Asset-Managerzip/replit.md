# AI SNIPER PRO MAX

A professional AI-powered crypto trading signals platform built as a mobile app — giving users an institutional-grade trading terminal experience with smart money analysis, whale tracking, and AI-scored signals.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) with Expo Router
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo mobile app
- `artifacts/mobile/app/(tabs)/` — All 5 screens: Dashboard, Signals, Scanner, Whales, Profile
- `artifacts/mobile/context/AppContext.tsx` — Global state (market data, signals, whale alerts, user tier)
- `artifacts/mobile/components/` — SignalCard, WhaleAlertCard, CoinRow
- `artifacts/mobile/constants/colors.ts` — Dark terminal color theme
- `artifacts/api-server/` — Express API server
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)

## Architecture decisions

- Frontend-only first build: all data lives in AsyncStorage + context mock data. No backend required for initial UI.
- Dark terminal color scheme (#0a0d14 background) matching institutional trading platforms.
- AppProvider wraps the entire app to share market data, signals, whale alerts, and user state.
- Mock signals use realistic SMC analysis factors (BOS, CHoCH, Order Blocks, FVG, etc.) to simulate institutional analysis.
- VIP tier system uses local state with AsyncStorage persistence — payment integration can be added later.

## Product

- **Dashboard**: Live market status (BULLISH/BEARISH), BTC price, Fear & Greed index, whale activity, today's stats (signals, win rate, accuracy), active signals preview, market heatmap, live alerts.
- **Signals**: Full signal feed with filters (All/Active/Long/Short/Closed). Each signal shows entry zone, TP1/TP2/TP3, stop loss, R:R, AI confidence, institutional analysis factors.
- **AI Scanner**: Multi-timeframe scanner with 7 analysis layers (SMC, liquidity, volume, ATR, etc.). Shows bullish/bearish setups ranked by AI score.
- **Whale Tracker**: 24h whale flow chart, buy/sell flow visualization, live whale alert feed with significance levels (HIGH/CRITICAL/EXTREME).
- **Profile**: User rank/XP progression, FREE/VIP/ELITE subscription tiers, referral program, crypto payment options.

## User preferences

- App name: AI SNIPER PRO MAX
- Dark institutional terminal aesthetic
- Signals should feel rare and high-quality (institutional, not noisy)
- Payments via crypto (USDT TRC20/BEP20 and others)
- No emojis in UI — use icons only

## Gotchas

- Telegram bot token, wallet address, and API key must be stored as environment secrets — never hardcode them.
- `useNativeDriver` warnings on web are expected and harmless — animations work natively in Expo Go.
- Web preview renders differently than native — always test in Expo Go for accurate rendering.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
