# Серверийн `.env` — бүрэн жагсаалт

Production сервер дээр `.env` файлд байх ёстой тохиргоо. Хэсэг тус бүрийн
ард **ЗААВАЛ** эсвэл **СОНГОЛТООР** гэж тэмдэглэсэн — сонголтоор хэсгийг
орхивол тухайн боломж чимээгүйгээр унтарна (систем унахгүй).

> ⚠️ **`VITE_` угтвартай хувьсагчийг `npm run build` хийхээс ӨМНӨ** тавина.
> Эдгээр нь build дотор шингэдэг тул дараа нь `.env` засаад дахин build
> хийхгүй бол хуучин утга үлдэнэ.

---

## 1. Үндсэн — ЗААВАЛ

```env
APP_NAME="Кутикул"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.mn
APP_KEY=base64:...          # php artisan key:generate (нэг л удаа)

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=<нэр>
DB_USERNAME=<хэрэглэгч>
DB_PASSWORD=<нууц үг>
```

`APP_DEBUG=true` үлдээвэл алдааны мөр бүрт нууц үг, түлхүүр харагдана.

---

## 2. Queue — ЗААВАЛ

```env
QUEUE_CONNECTION=database
```

`sync` болговол **цахим гэрээ хүргэгдэхгүй**, CallPro дуудлага
боловсруулагдахгүй, имэйл илгээгдэхгүй. Worker-ийг supervisor-оор
асаах шаардлагатай:

```bash
sudo cp deploy/supervisor-queue.conf /etc/supervisor/conf.d/laravel-queue.conf
sudo supervisorctl reread && sudo supervisorctl update
```

---

## 3. Имэйл — ЗААВАЛ (цахим гэрээ, цаг захиалга)

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<имэйл>
MAIL_PASSWORD=<app password>
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@yourdomain.mn"
MAIL_FROM_NAME="${APP_NAME}"
```

Баталгаажсан гэрээ ажилтанд энэ сувгаар очно
(`DeliverEmployeeDocument` → `EmployeeDocumentCompletedMail`).
Gmail бол ердийн нууц үг биш, **App Password** хэрэгтэй.

---

## 4. CallPro дуудлага — СОНГОЛТООР

```env
CALLPRO_WEBHOOK_TOKEN=<нууц түлхүүр>
CALLPRO_ALLOWED_IPS=202.37.235.42,112.72.0.69,112.72.0.138
```

Түлхүүр үүсгэх:

```bash
php -r "echo bin2hex(random_bytes(24));"
```

> **Proxy-гийн ард байвал ЗААВАЛ нэмнэ:**
> ```env
> TRUSTED_PROXIES=*
> ```
> Cloudflare / load balancer / урд талын nginx орвол бүх хүсэлт proxy-ийн
> IP-тэй ирж, IP шалгалтад **бүх webhook 403 болж хаагдана**.

Дэлгэрэнгүй: [`callpro-setup.md`](callpro-setup.md)

---

## 5. Reverb (WebSocket — чат, шууд мэдэгдэл) — СОНГОЛТООР

```env
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=dentalapp
REVERB_APP_KEY=dental-reverb-key-2026
REVERB_APP_SECRET=dental-reverb-secret-2026
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http

# Browser-оос холбогдоход (build-д шингэнэ)
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST=yourdomain.mn
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
VITE_REVERB_WS_PORT=443
```

Nginx-д `/app` зам нэмэх шаардлагатай — [`nginx-websocket.conf`](nginx-websocket.conf).
Supervisor: [`supervisor-reverb.conf`](supervisor-reverb.conf).

`BROADCAST_CONNECTION`-ыг `log` болговол чат ажиллах ч **шууд шинэчлэлт
ирэхгүй** (хуудас сэргээх шаардлагатай болно).

---

## 6. Turnstile (үйлчлүүлэгч бүртгэлийн captcha) — СОНГОЛТООР

```env
TURNSTILE_SITE_KEY=<site key>
TURNSTILE_SECRET_KEY=<secret key>
VITE_TURNSTILE_SITE_KEY="${TURNSTILE_SITE_KEY}"
```

Cloudflare Turnstile-аас үнэгүй авна. Тавихгүй бол `/patient/register`
хуудсанд captcha гарахгүй — бот бүртгэлээс хамгаалалтгүй болно.

---

## 7. Web push (чатын мэдэгдэл) — СОНГОЛТООР

```env
VAPID_PUBLIC_KEY=<public>
VAPID_PRIVATE_KEY=<private>
VAPID_SUBJECT=mailto:info@cuticul.mn
```

Түлхүүр үүсгэх:

```bash
php artisan webpush:vapid
```

---

## 8. Meta / Facebook (нүүр хуудасны пост, мессеж) — СОНГОЛТООР

```env
META_APP_ID=<app id>
META_APP_SECRET=<app secret>
META_VERIFY_TOKEN=<webhook баталгаажуулах түлхүүр>
META_API_VERSION=v21.0
META_MEDIA_URL=https://yourdomain.mn     # хоосон бол APP_URL хэрэглэнэ
```

---

## 9. AI туслах — СОНГОЛТООР

```env
GROQ_API_KEY=<key>
GROQ_MODEL=llama-3.3-70b-versatile

GEMINI_API_KEY=<key>
GEMINI_MODEL=gemini-2.5-flash
```

Хоёулаа сонголттой. Аль нэг нь байхад л AI функц ажиллана.

---

## Өөрчилсний дараа — ЗААВАЛ

```env
# .env засмагц
php artisan config:clear
php artisan config:cache
```

`VITE_` хувьсагч өөрчилсөн бол нэмж:

```bash
npm run build
```

---

## Шалгах жагсаалт

| Юу | Хэрхэн шалгах |
|---|---|
| Queue ажиллаж байна уу | `sudo supervisorctl status laravel-queue:*` |
| Имэйл явж байна уу | Гэрээ баталгаажуулаад ажилтны шуудан шалгах |
| CallPro хүрч байна уу | `tail -f storage/logs/laravel.log \| grep -i callpro` |
| WebSocket | Чат нээгээд хоёр цонхноос мессеж солилцох |
| Turnstile | `/patient/register` дээр captcha гарч байна уу |
