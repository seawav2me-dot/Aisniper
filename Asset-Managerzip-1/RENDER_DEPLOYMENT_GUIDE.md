# دليل نشر AI SNIPER PRO MAX على Render

## المتطلبات قبل البدء
- حساب على [render.com](https://render.com)
- قاعدة بيانات PostgreSQL (Render توفرها مجاناً)
- بوت Telegram مع التوكن (من @BotFather)
- حساب GitHub لرفع الكود

---

## الخطوة 1 — رفع الكود على GitHub

```bash
# استخرج الملف
tar -xzf AI-SNIPER-PRO-MAX-FINAL.tar.gz
cd Asset-Managerzip-1

# أنشئ repo جديد على GitHub ثم:
git init
git add .
git commit -m "Initial commit — AI SNIPER PRO MAX"
git remote add origin https://github.com/USERNAME/ai-sniper-pro-max.git
git push -u origin main
```

---

## الخطوة 2 — إنشاء قاعدة البيانات على Render

1. اذهب إلى [dashboard.render.com](https://dashboard.render.com)
2. اضغط **New** → **PostgreSQL**
3. الاسم: `aisniper-db`
4. الخطة: **Free** (كافية للبداية)
5. اضغط **Create Database**
6. انسخ قيمة **Internal Database URL** — ستحتاجها لاحقاً

---

## الخطوة 3 — نشر API Server

1. اضغط **New** → **Web Service**
2. اربطه بـ GitHub repo
3. أدخل الإعدادات:

| الحقل | القيمة |
|-------|--------|
| Name | `aisniper-api` |
| Environment | `Node` |
| Region | `Oregon (US West)` |
| Branch | `main` |
| Build Command | `npm install -g pnpm@10 && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build` |
| Start Command | `node --enable-source-maps artifacts/api-server/dist/index.mjs` |
| Plan | **Starter ($7/mo)** — مطلوب للـ WebSocket |

---

## الخطوة 4 — إعداد متغيرات البيئة

في صفحة الـ Web Service اضغط **Environment** وأضف:

| المتغير | القيمة | ملاحظة |
|---------|--------|--------|
| `NODE_ENV` | `production` | ثابت |
| `PORT` | `10000` | ثابت |
| `USE_WEBHOOK` | `false` | وضع polling |
| `AUTO_MIGRATE` | `true` | لإنشاء الجداول تلقائياً |
| `TELEGRAM_BOT_TOKEN` | `123456:ABCdef...` | من @BotFather |
| `DATABASE_URL` | `postgresql://...` | Internal URL من الخطوة 2 |
| `ADMIN_CHAT_ID` | `123456789` | chat_id الخاص بك |
| `WALLET_ADDRESS` | `TRX... أو BTC...` | عنوان محفظتك للدفع |
| `APP_LINK` | `https://expo.dev/...` | رابط التطبيق |
| `BOT_USERNAME` | `YourBotName_bot` | اسم البوت بدون @ |
| `API_KEY` | `sniper_sk_xxxxx` | مفتاح سري تختاره أنت |

> لإنشاء `API_KEY` آمن نفّذ في terminal:
> ```bash
> node -e "console.log('sniper_sk_' + require('crypto').randomBytes(24).toString('hex'))"
> ```

---

## الخطوة 5 — Health Check

في إعدادات الـ Web Service:
- **Health Check Path**: `/api/health`
- اضغط **Save Changes**

---

## الخطوة 6 — Deploy

اضغط **Deploy** وانتظر اكتمال البناء (3-5 دقائق).

بعد اكتمال النشر ستظهر الرسالة:
```
Server listening — port: 10000, mode: polling
symbolDiscovery: symbols updated — afterFilter: ~180
livePriceMonitor: all batches connected
```

---

## الخطوة 7 — الـ Cron Keepalive (منع النوم)

1. اضغط **New** → **Cron Job**
2. الإعدادات:

| الحقل | القيمة |
|-------|--------|
| Name | `aisniper-keepalive` |
| Schedule | `*/10 * * * *` |
| Command | `node -e "fetch(process.env.HEALTH_URL).then(r=>console.log('ping',r.status)).catch(e=>console.error(e.message))"` |
| Env Var | `HEALTH_URL` = `https://aisniper-api.onrender.com/api/health` |

> غيّر `aisniper-api` باسم الـ service الخاص بك

---

## الخطوة 8 — بناء ونشر تطبيق Expo

```bash
cd Asset-Managerzip-1/artifacts/mobile

# إنشاء ملف .env
echo "EXPO_PUBLIC_API_URL=https://aisniper-api.onrender.com" > .env
echo "EXPO_PUBLIC_API_KEY=sniper_sk_xxxxx" >> .env

# تثبيت وبناء
npm install -g eas-cli
eas login
eas build --platform android  # أو ios أو all
```

---

## التحقق من عمل النظام

### اختبار الـ API:
```bash
# Health check
curl https://aisniper-api.onrender.com/api/health

# أسعار لحظية
curl https://aisniper-api.onrender.com/api/prices

# قائمة العملات النشطة (200 زوج)
curl https://aisniper-api.onrender.com/api/active-symbols

# سعر عملة خارج القائمة
curl -H "x-api-key: YOUR_API_KEY" \
  https://aisniper-api.onrender.com/api/prices/live/PEPEUSDT

# إحصائيات Admin
curl -H "x-api-key: YOUR_API_KEY" \
  https://aisniper-api.onrender.com/api/admin/symbols
```

### اختبار البوت:
أرسل للبوت:
- `/start` — رسالة الترحيب
- `/price BTC` — سعر Bitcoin لحظي
- `/price PEPE` — عملة خارج القائمة → تُجلب فوراً وتُتتبع ساعتين
- `/market` — حالة السوق
- `/signals` — الإشارات

---

## أوامر الأدمن (أرسلها للبوت)

```
/stats              — إحصائيات المشتركين
/approve 123456789 vip   — ترقية مستخدم
/reject 123456789        — رفض طلب دفع
/blast رسالة لكل المشتركين
/setprice vip_monthly 15  — تغيير سعر VIP
/weekly_report      — تقرير الأسبوع
/monthly_report     — تقرير الشهر
/ref_stats          — إحصائيات الإحالات
```

---

## ملاحظات مهمة

1. **Starter plan ($7/mo)** مطلوب لأن Free يوقف السيرفر بعد 15 دقيقة خمول
2. **WebSocket** يعمل على Starter فقط (ليس Free)
3. **AUTO_MIGRATE=true** يُنشئ الجداول تلقائياً عند أول تشغيل
4. عملات خارج القائمة المفلترة → البوت يجلبها فوراً ويتتبعها **ساعتين** ثم يحذفها
5. قائمة الأزواج النشطة تتجدد **كل ساعة** تلقائياً
