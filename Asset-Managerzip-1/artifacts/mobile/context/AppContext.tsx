import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchPrices, WS_PRICES_URL, API_BASE, type LivePricePayload } from "../constants/api";

export type SignalDirection = "LONG" | "SHORT";
export type SignalStatus = "ACTIVE" | "TP1_HIT" | "TP2_HIT" | "TP3_HIT" | "SL_HIT" | "CLOSED_WIN" | "CLOSED_LOSS";
export type SignalTier = "LOW_RISK" | "MEDIUM" | "HIGH_MOMENTUM" | "EXTREME_SNIPER";
export type UserTier = "FREE" | "VIP" | "ELITE";
export type Language = "ar" | "en";
export type SignalQualityFilter = "ALL" | "GOOD" | "HIGH" | "ELITE";

export interface Signal {
  id: string;
  pair: string;
  direction: SignalDirection;
  confidence: number;
  score: number;
  timeframe: string;
  entry: { low: number; high: number };
  tp: [number, number, number];
  sl: number;
  rr: number;
  status: SignalStatus;
  timestamp: number;
  factors: string[];
  whaleActivity: boolean;
  entryWindowMinutes: number;
  tier: SignalTier;
  tpHit: [boolean, boolean, boolean];
  updateMessage?: string;
}

export interface WhaleAlert {
  id: string;
  type: "LARGE_BUY" | "LARGE_SELL" | "LIQUIDITY_HUNT" | "WHALE_ACCUMULATION" | "EXCHANGE_INFLOW";
  pair: string;
  amount: number;
  amountUSD: number;
  exchange: string;
  timestamp: number;
  significance: "HIGH" | "CRITICAL" | "EXTREME";
}

export interface HotCoin {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume: number;
  aiScore: number;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  timeframe: string;
}

export interface MarketState {
  status: "BULLISH" | "BEARISH" | "NEUTRAL";
  btcPrice: number;
  btcChange: number;
  ethPrice: number;
  ethChange: number;
  btcTrend: "UP" | "DOWN" | "SIDEWAYS";
  fearGreed: number;
  fearGreedLabel: string;
  dominance: number;
  whaleActivity: "HIGH" | "MODERATE" | "LOW";
  aiMode: "ACTIVE" | "SCANNING" | "STANDBY";
  totalSignalsToday: number;
  winRate: number;
  avgProfit: number;
  premiumAccuracy: number;
}

export interface SubscriptionPrices {
  vipMonthly: number;
  vipQuarterly: number;
  vipAnnual: number;
  eliteMonthly: number;
  eliteAnnual: number;
}

export interface UserState {
  tier: UserTier;
  xp: number;
  level: number;
  streak: number;
  rank: string;
  referralCode: string;
  referralCount: number;
  joinedAt: number;
  notifications: boolean;
  favoriteCoins: string[];
  isAdmin: boolean;
  freeSignalsViewedToday: number;
  lastSignalViewDate: string;
  language: Language;
  signalQualityFilter: SignalQualityFilter;
}

export interface PaperTrade {
  id: string;
  pair: string;
  direction: SignalDirection;
  entryPrice: number;
  exitPrice?: number;
  size: number;
  leverage: number;
  status: "OPEN" | "CLOSED_WIN" | "CLOSED_LOSS";
  openedAt: number;
  closedAt?: number;
  pnl?: number;
  pnlPercent?: number;
}

const DEFAULT_PRICES: SubscriptionPrices = {
  vipMonthly: 49,
  vipQuarterly: 105,
  vipAnnual: 300,
  eliteMonthly: 99,
  eliteAnnual: 600,
};

interface AppContextType {
  market: MarketState;
  signals: Signal[];
  whaleAlerts: WhaleAlert[];
  hotCoins: HotCoin[];
  user: UserState;
  subscriptionPrices: SubscriptionPrices;
  paperTrades: PaperTrade[];
  paperBalance: number;
  refreshMarket: () => void;
  upgradeUser: (tier: UserTier) => void;
  addFavoriteCoin: (symbol: string) => void;
  removeFavoriteCoin: (symbol: string) => void;
  updateSubscriptionPrices: (prices: SubscriptionPrices) => void;
  canViewFreeSignal: () => boolean;
  recordFreeSignalView: () => void;
  openPaperTrade: (trade: Omit<PaperTrade, "id" | "openedAt" | "status">) => void;
  closePaperTrade: (id: string, exitPrice: number) => void;
  setLanguage: (lang: Language) => void;
  setSignalQualityFilter: (filter: SignalQualityFilter) => void;
  eliteSignalCount: number;
}

const MOCK_SIGNALS: Signal[] = [
  {
    id: "1",
    pair: "XRPUSDT",
    direction: "LONG",
    confidence: 74,
    score: 74,
    timeframe: "4H",
    entry: { low: 1.4199, high: 1.4393 },
    tp: [1.4588, 1.4850, 1.5200],
    sl: 1.3940,
    rr: 1.5,
    status: "ACTIVE",
    timestamp: Date.now() - 12 * 60 * 1000,
    factors: ["كسر هيكل صعودي", "منطقة دعم مؤسسية", "ارتفاع حجم التداول", "BTC في الاتجاه"],
    whaleActivity: false,
    entryWindowMinutes: 45,
    tier: "MEDIUM",
    tpHit: [false, false, false],
  },
  {
    id: "2",
    pair: "ETHUSDT",
    direction: "LONG",
    confidence: 91,
    score: 91,
    timeframe: "4H",
    entry: { low: 2450, high: 2465 },
    tp: [2510, 2580, 2680],
    sl: 2418,
    rr: 3.8,
    status: "TP1_HIT",
    timestamp: Date.now() - 45 * 60 * 1000,
    factors: ["اصطياد السيولة", "BOS صعودي", "إعادة اختبار Order Block", "حجم مرتفع", "دعم BTC"],
    whaleActivity: true,
    entryWindowMinutes: 18,
    tier: "EXTREME_SNIPER",
    tpHit: [true, false, false],
    updateMessage: "هدف 1 تحقق — انقل وقف الخسارة لنقطة التعادل",
  },
  {
    id: "3",
    pair: "BTCUSDT",
    direction: "LONG",
    confidence: 94,
    score: 94,
    timeframe: "4H",
    entry: { low: 80200, high: 80500 },
    tp: [81400, 82800, 84500],
    sl: 79100,
    rr: 3.5,
    status: "ACTIVE",
    timestamp: Date.now() - 5 * 60 * 1000,
    factors: ["Order Block مؤسسي", "BOS بقوة", "تجمع الحيتان", "ضغط ATR منخفض", "4H صعودي"],
    whaleActivity: true,
    entryWindowMinutes: 8,
    tier: "EXTREME_SNIPER",
    tpHit: [false, false, false],
  },
  {
    id: "4",
    pair: "SOLUSDT",
    direction: "LONG",
    confidence: 87,
    score: 87,
    timeframe: "1H",
    entry: { low: 142.5, high: 144.0 },
    tp: [148.0, 153.5, 162.0],
    sl: 138.8,
    rr: 3.8,
    status: "ACTIVE",
    timestamp: Date.now() - 22 * 60 * 1000,
    factors: ["CHoCH مؤكد", "Fair Value Gap", "ارتفاع الحجم", "ارتباط BTC"],
    whaleActivity: true,
    entryWindowMinutes: 25,
    tier: "HIGH_MOMENTUM",
    tpHit: [false, false, false],
  },
  {
    id: "5",
    pair: "BNBUSDT",
    direction: "SHORT",
    confidence: 82,
    score: 82,
    timeframe: "1H",
    entry: { low: 585, high: 588 },
    tp: [578, 568, 555],
    sl: 594,
    rr: 2.9,
    status: "CLOSED_WIN",
    timestamp: Date.now() - 3 * 60 * 60 * 1000,
    factors: ["CHoCH هبوطي", "رفض مقاومة", "دلتا حجم سلبية", "ابتلاع هبوطي 15M"],
    whaleActivity: false,
    entryWindowMinutes: 0,
    tier: "HIGH_MOMENTUM",
    tpHit: [true, true, false],
  },
  {
    id: "6",
    pair: "AVAXUSDT",
    direction: "LONG",
    confidence: 78,
    score: 78,
    timeframe: "4H",
    entry: { low: 34.2, high: 34.8 },
    tp: [36.0, 37.5, 39.2],
    sl: 33.1,
    rr: 3.2,
    status: "CLOSED_WIN",
    timestamp: Date.now() - 6 * 60 * 60 * 1000,
    factors: ["ملء FVG", "دعم EMA 50", "تعافي Stochastic RSI"],
    whaleActivity: false,
    entryWindowMinutes: 0,
    tier: "MEDIUM",
    tpHit: [true, true, true],
  },
  {
    id: "7",
    pair: "LINKUSDT",
    direction: "SHORT",
    confidence: 84,
    score: 84,
    timeframe: "15M",
    entry: { low: 14.8, high: 15.1 },
    tp: [14.2, 13.6, 12.9],
    sl: 15.6,
    rr: 3.1,
    status: "ACTIVE",
    timestamp: Date.now() - 30 * 60 * 1000,
    factors: ["اصطياد القمم المتساوية", "BOS هبوطي", "تخفيف Order Block", "ارتفاع الحجم النسبي"],
    whaleActivity: false,
    entryWindowMinutes: 40,
    tier: "HIGH_MOMENTUM",
    tpHit: [false, false, false],
  },
];

const MOCK_WHALE_ALERTS: WhaleAlert[] = [
  { id: "w1", type: "LARGE_BUY", pair: "BTCUSDT", amount: 1245, amountUSD: 83_500_000, exchange: "Binance", timestamp: Date.now() - 3 * 60 * 1000, significance: "CRITICAL" },
  { id: "w2", type: "LIQUIDITY_HUNT", pair: "ETHUSDT", amount: 0, amountUSD: 42_000_000, exchange: "Unknown", timestamp: Date.now() - 8 * 60 * 1000, significance: "EXTREME" },
  { id: "w3", type: "WHALE_ACCUMULATION", pair: "SOLUSDT", amount: 680_000, amountUSD: 97_000_000, exchange: "Coinbase", timestamp: Date.now() - 15 * 60 * 1000, significance: "CRITICAL" },
  { id: "w4", type: "EXCHANGE_INFLOW", pair: "BTCUSDT", amount: 3200, amountUSD: 214_000_000, exchange: "Bybit", timestamp: Date.now() - 22 * 60 * 1000, significance: "EXTREME" },
];

const MOCK_HOT_COINS: HotCoin[] = [
  { symbol: "BTC", name: "Bitcoin", price: 80730, change24h: 0.60, volume: 38_200_000_000, aiScore: 91, trend: "BULLISH", timeframe: "4H" },
  { symbol: "ETH", name: "Ethereum", price: 2327, change24h: 0.49, volume: 18_400_000_000, aiScore: 88, trend: "BULLISH", timeframe: "1H" },
  { symbol: "SOL", name: "Solana", price: 143.2, change24h: 5.7, volume: 4_900_000_000, aiScore: 85, trend: "BULLISH", timeframe: "15M" },
  { symbol: "XRP", name: "XRP", price: 1.4393, change24h: 2.1, volume: 3_100_000_000, aiScore: 74, trend: "BULLISH", timeframe: "4H" },
  { symbol: "BNB", name: "BNB", price: 586.4, change24h: -1.2, volume: 2_800_000_000, aiScore: 62, trend: "BEARISH", timeframe: "1H" },
  { symbol: "LINK", name: "Chainlink", price: 14.95, change24h: -2.8, volume: 890_000_000, aiScore: 71, trend: "BEARISH", timeframe: "15M" },
  { symbol: "AVAX", name: "Avalanche", price: 34.6, change24h: 4.2, volume: 1_200_000_000, aiScore: 79, trend: "BULLISH", timeframe: "4H" },
  { symbol: "ARB", name: "Arbitrum", price: 0.892, change24h: 6.8, volume: 760_000_000, aiScore: 83, trend: "BULLISH", timeframe: "1H" },
];

const INITIAL_MARKET: MarketState = {
  status: "BULLISH",
  btcPrice: 80730,
  btcChange: 0.60,
  ethPrice: 2327,
  ethChange: 0.49,
  btcTrend: "UP",
  fearGreed: 71,
  fearGreedLabel: "جشع",
  dominance: 54.2,
  whaleActivity: "HIGH",
  aiMode: "ACTIVE",
  totalSignalsToday: 1255,
  winRate: 89.3,
  avgProfit: 3.8,
  premiumAccuracy: 92,
};

const INITIAL_USER: UserState = {
  tier: "FREE",
  xp: 10,
  level: 1,
  streak: 1,
  rank: "مبتدئ",
  referralCode: "SNPR-X7K2",
  referralCount: 0,
  joinedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  notifications: true,
  favoriteCoins: ["BTC", "ETH"],
  isAdmin: false,
  freeSignalsViewedToday: 0,
  lastSignalViewDate: "",
  language: "ar" as Language,
  signalQualityFilter: "ALL" as SignalQualityFilter,
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [market, setMarket] = useState<MarketState>(INITIAL_MARKET);
  const [signals, setSignals] = useState<Signal[]>(MOCK_SIGNALS);
  const [whaleAlerts] = useState<WhaleAlert[]>(MOCK_WHALE_ALERTS);
  const [hotCoins] = useState<HotCoin[]>(MOCK_HOT_COINS);
  const [user, setUser] = useState<UserState>(INITIAL_USER);
  const [subscriptionPrices, setSubscriptionPrices] = useState<SubscriptionPrices>(DEFAULT_PRICES);
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>([]);
  const [paperBalance, setPaperBalance] = useState<number>(10000);

  const wsRef = useRef<WebSocket | null>(null);
  const wsRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyLivePrices = useCallback((live: LivePricePayload) => {
    setMarket((prev) => ({
      ...prev,
      btcPrice: live.btc,
      btcChange: live.btcChange,
      ethPrice: live.eth,
      ethChange: live.ethChange,
      fearGreed: live.fearGreed,
      fearGreedLabel: live.fearGreedLabel,
      status: live.marketStatus,
      winRate: live.winRate,
    }));
  }, []);

  const connectWs = useCallback(() => {
    if (!WS_PRICES_URL) return;

    const ws = new WebSocket(WS_PRICES_URL);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as { type: string; data: LivePricePayload };
        if (msg.type === "prices" && msg.data) {
          applyLivePrices(msg.data);
        }
      } catch {}
    };

    ws.onclose = () => {
      wsRef.current = null;
      wsRetryTimer.current = setTimeout(connectWs, 10_000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [applyLivePrices]);

  useEffect(() => {
    loadUserData();
    loadPrices();
    loadPaperTrades();
    refreshMarket();

    if (WS_PRICES_URL) {
      connectWs();
    } else {
      const interval = setInterval(refreshMarket, 30_000);
      return () => clearInterval(interval);
    }

    return () => {
      wsRef.current?.close();
      if (wsRetryTimer.current) clearTimeout(wsRetryTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!API_BASE) return;
    const fetchApiSignals = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/signals`, { signal: AbortSignal.timeout(8_000) });
        if (!res.ok) return;
        const data = (await res.json()) as { ok: boolean; signals: Signal[] };
        if (data.ok && Array.isArray(data.signals) && data.signals.length > 0) {
          setSignals(data.signals);
        }
      } catch {}
    };
    fetchApiSignals();
    const timer = setInterval(fetchApiSignals, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const loadUserData = async () => {
    try {
      const saved = await AsyncStorage.getItem("@sniper_user");
      if (saved) setUser(JSON.parse(saved));
    } catch {}
  };

  const loadPrices = async () => {
    try {
      const saved = await AsyncStorage.getItem("@sniper_prices");
      if (saved) setSubscriptionPrices(JSON.parse(saved));
    } catch {}
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/subscription-prices`, { signal: AbortSignal.timeout(6_000) });
        if (res.ok) {
          const data = (await res.json()) as { ok: boolean; prices: { vipMonthly: number; vipAnnual: number; eliteMonthly: number; eliteAnnual: number } };
          if (data.ok && data.prices) {
            const merged: SubscriptionPrices = {
              vipMonthly: data.prices.vipMonthly,
              vipQuarterly: Math.round(data.prices.vipMonthly * 2.8),
              vipAnnual: data.prices.vipAnnual,
              eliteMonthly: data.prices.eliteMonthly,
              eliteAnnual: data.prices.eliteAnnual,
            };
            setSubscriptionPrices(merged);
            await AsyncStorage.setItem("@sniper_prices", JSON.stringify(merged));
          }
        }
      } catch {}
    }
  };

  const loadPaperTrades = async () => {
    try {
      const saved = await AsyncStorage.getItem("@sniper_paper");
      if (saved) {
        const data = JSON.parse(saved);
        setPaperTrades(data.trades ?? []);
        setPaperBalance(data.balance ?? 10000);
      }
    } catch {}
  };

  const saveUserData = async (u: UserState) => {
    try { await AsyncStorage.setItem("@sniper_user", JSON.stringify(u)); } catch {}
  };

  const savePrices = async (p: SubscriptionPrices) => {
    try { await AsyncStorage.setItem("@sniper_prices", JSON.stringify(p)); } catch {}
  };

  const savePaperData = async (trades: PaperTrade[], balance: number) => {
    try { await AsyncStorage.setItem("@sniper_paper", JSON.stringify({ trades, balance })); } catch {}
  };

  const refreshMarket = useCallback(async () => {
    const live = await fetchPrices();
    if (live) {
      setMarket((prev) => ({
        ...prev,
        btcPrice: live.btc,
        btcChange: live.btcChange,
        ethPrice: live.eth,
        ethChange: live.ethChange,
        fearGreed: live.fearGreed,
        fearGreedLabel: live.fearGreedLabel,
        status: live.marketStatus,
        winRate: live.winRate,
      }));
    } else {
      setMarket((prev) => ({
        ...prev,
        btcPrice: Math.max(70000, prev.btcPrice + (Math.random() - 0.48) * 120),
        ethPrice: Math.max(1800, prev.ethPrice + (Math.random() - 0.48) * 8),
        fearGreed: Math.min(100, Math.max(0, prev.fearGreed + (Math.random() - 0.5) * 2)),
      }));
    }
  }, []);

  const upgradeUser = useCallback((tier: UserTier) => {
    setUser((prev) => {
      const updated = { ...prev, tier };
      saveUserData(updated);
      return updated;
    });
  }, []);

  const addFavoriteCoin = useCallback((symbol: string) => {
    setUser((prev) => {
      if (prev.favoriteCoins.includes(symbol)) return prev;
      const updated = { ...prev, favoriteCoins: [...prev.favoriteCoins, symbol] };
      saveUserData(updated);
      return updated;
    });
  }, []);

  const removeFavoriteCoin = useCallback((symbol: string) => {
    setUser((prev) => {
      const updated = { ...prev, favoriteCoins: prev.favoriteCoins.filter((c) => c !== symbol) };
      saveUserData(updated);
      return updated;
    });
  }, []);

  const updateSubscriptionPrices = useCallback((prices: SubscriptionPrices) => {
    setSubscriptionPrices(prices);
    savePrices(prices);
  }, []);

  const getTodayString = () => new Date().toISOString().split("T")[0];

  const canViewFreeSignal = useCallback((): boolean => {
    if (user.tier !== "FREE") return true;
    const today = getTodayString();
    if (user.lastSignalViewDate !== today) return true;
    return user.freeSignalsViewedToday < 2;
  }, [user]);

  const recordFreeSignalView = useCallback(() => {
    setUser((prev) => {
      const today = getTodayString();
      const isNewDay = prev.lastSignalViewDate !== today;
      const updated: UserState = {
        ...prev,
        freeSignalsViewedToday: isNewDay ? 1 : prev.freeSignalsViewedToday + 1,
        lastSignalViewDate: today,
      };
      saveUserData(updated);
      return updated;
    });
  }, []);

  const openPaperTrade = useCallback((trade: Omit<PaperTrade, "id" | "openedAt" | "status">) => {
    const newTrade: PaperTrade = {
      ...trade,
      id: Date.now().toString(),
      openedAt: Date.now(),
      status: "OPEN",
    };
    setPaperTrades((prev) => {
      const updated = [newTrade, ...prev];
      savePaperData(updated, paperBalance);
      return updated;
    });
  }, [paperBalance]);

  const closePaperTrade = useCallback((id: string, exitPrice: number) => {
    setPaperTrades((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== id || t.status !== "OPEN") return t;
        const pnlPercent = t.direction === "LONG"
          ? ((exitPrice - t.entryPrice) / t.entryPrice) * 100 * t.leverage
          : ((t.entryPrice - exitPrice) / t.entryPrice) * 100 * t.leverage;
        const pnl = (t.size * pnlPercent) / 100;
        return {
          ...t,
          exitPrice,
          pnl,
          pnlPercent,
          status: pnl >= 0 ? ("CLOSED_WIN" as const) : ("CLOSED_LOSS" as const),
          closedAt: Date.now(),
        };
      });
      const newBalance = updated.reduce((acc, t) => {
        if (t.status !== "OPEN" && t.pnl !== undefined) return acc + t.pnl;
        return acc;
      }, 10000);
      setPaperBalance(newBalance);
      savePaperData(updated, newBalance);
      return updated;
    });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setUser((prev) => {
      const updated = { ...prev, language: lang };
      saveUserData(updated);
      return updated;
    });
  }, []);

  const setSignalQualityFilter = useCallback((filter: SignalQualityFilter) => {
    setUser((prev) => {
      const updated = { ...prev, signalQualityFilter: filter };
      saveUserData(updated);
      return updated;
    });
  }, []);

  const eliteSignalCount = signals.filter(
    (s) => s.score >= 90 && (s.status === "ACTIVE" || s.status === "TP1_HIT")
  ).length;

  return (
    <AppContext.Provider value={{
      market, signals, whaleAlerts, hotCoins, user,
      subscriptionPrices, paperTrades, paperBalance,
      refreshMarket, upgradeUser, addFavoriteCoin, removeFavoriteCoin,
      updateSubscriptionPrices, canViewFreeSignal, recordFreeSignalView,
      openPaperTrade, closePaperTrade,
      setLanguage, setSignalQualityFilter, eliteSignalCount,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
