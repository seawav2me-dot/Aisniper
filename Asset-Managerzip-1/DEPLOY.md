# دليل النشر على Render — AI SNIPER PRO MAX

## خطوات النشر

### 1. إنشاء PostgreSQL Database على Render
- اذهب إلى Render Dashboard > New > PostgreSQL
- اختر اسماً مثل `aisniper-db`
- انسخ **Internal Database URL** أو **External Database URL**

### 2. نشر API Server
- New > Web Service
- Connect your GitHub repo
- **Root Directory**: `Asset-Managerzip-1`
- **Build Command**: `npm install -g pnpm@10 && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build`
- **Start Command**: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
- **Health Check Path**: `/api/health`

أو استخدم `render.yaml` الموجود في جذر المشروع لنشر تلقائي.

### 3. متغيرات البيئة المطلوبة

| المتغير | الوصف | مثال |
|---------|-------|------|
| `DATABASE_URL` | رابط PostgreSQL | `postgresql://user:pass@host/db` |
| `TELEGRAM_BOT_TOKEN` | توكن البوت من @BotFather | `123456:ABCdef...` |
| `ADMIN_CHAT_ID` | Chat ID الأدمن | `987654321` |
| `WALLET_ADDRESS` | عنوان محفظة USDT | `TRC20 address` |
| `APP_LINK` | رابط تطبيق الموبايل | `https://expo.dev/...` |
| `BOT_USERNAME` | اسم البوت بدون @ | `Strongsmartsignal_bot` |
| `AUTO_MIGRATE` | ترحيل الجداول تلقائياً | `true` |
| `NODE_ENV` | بيئة الإنتاج | `production` |

### 4. ربط البوت بـ Webhook
بعد النشر، أرسل هذا الطلب لتفعيل الـ Webhook:
```
POST https://your-render-url.onrender.com/api/telegram/setup-webhook
Body: { "domain": "your-render-url.onrender.com" }
```

### 5. التطبيق (Expo)
- في ملف `.env` للتطبيق:
```
EXPO_PUBLIC_API_URL=https://your-render-url.onrender.com
```
- ثم `eas build` لبناء التطبيق

---

## أوامر الأدمن في البوت

| الأمر | الوصف |
|-------|-------|
| `/stats` | إحصائيات المشتركين |
| `/approve <id> vip` | ترقية مستخدم VIP |
| `/reject <id>` | رفض طلب |
| `/setprice vip_monthly 29` | تغيير سعر الاشتراك |
| `/prices` | عرض الأسعار الحالية |
| `/blast <رسالة>` | إرسال للجميع |
| `/weekly_report` | تقرير الأداء الأسبوعي |
| `/monthly_report` | تقرير الأداء الشهري |
| `/ref_stats` | إحصائيات الإحالات |

---

## ما يعمل تلقائياً بعد النشر

- ✅ ترحيل جداول قاعدة البيانات (AUTO_MIGRATE)
- ✅ بث إشعارات كل 2-6 ساعات للمشتركين
- ✅ تقارير أسبوعية وشهرية للتداول الوهمي تلقائياً
- ✅ تنبيه فوري للأدمن + VIP عند ظهور إشارة > 85%
- ✅ تسجيل الإشارات القوية في سجل التداول الوهمي
