# Серверийн `.env` — бүрэн жагсаалт

Production сервер дээр `.env`-д байх ёстой тохиргоо бүрийн **утгыг хаанаас
авах** эсвэл **хэрхэн үүсгэх**-ийг заав.

Тэмдэглэгээ: **ЗААВАЛ** — байхгүй бол систем ажиллахгүй.
**СОНГОЛТООР** — орхивол тухайн боломж чимээгүйгээр унтарна (систем унахгүй).

> ⚠️ **`VITE_` угтвартай хувьсагчийг `npm run build` хийхээс ӨМНӨ** тавина.
> Эдгээр нь build дотор шингэдэг тул дараа нь `.env` засаад дахин build
> хийхгүй бол хуучин утга үлдэнэ.

---

## Үүсгэх шаардлагатай утгууд — хураангуй

| Түлхүүр | Хэрхэн авах |
|---|---|
| `APP_KEY` | `php artisan key:generate` (сервер дээр нэг удаа) |
| `CALLPRO_WEBHOOK_TOKEN` | `php -r "echo bin2hex(random_bytes(24));"` |
| `REVERB_APP_KEY` / `_SECRET` | `php -r "echo bin2hex(random_bytes(16));"` тус бүрт |
| `META_VERIFY_TOKEN` | Өөрөө санамсаргүй мөр зохионо (Facebook дээр ижлийг оруулна) |
| `VAPID_PUBLIC_KEY` / `_PRIVATE_KEY` | `php artisan webpush:vapid` |
| `GOOGLE_REFRESH_TOKEN` | Админ → Google холболт хуудаснаас зөвшөөрөл өгөхөд **өөрөө бичигдэнэ** |
| `LIBREOFFICE_PATH` | `which soffice` (сервер дээр) |
| `QPAY_*` | QPay-гаас merchant данс нээхэд өгнө |
| `TURNSTILE_*` | Cloudflare Turnstile самбараас (үнэгүй) |
| `META_APP_ID` / `_SECRET` | Facebook Developers → апп үүсгэх |
| `GROQ_API_KEY` / `GEMINI_API_KEY` | Тухайн үйлчилгээний вэбээс |

---

## 1. Үндсэн — ЗААВАЛ

```env
APP_NAME="Кутикул"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.mn
APP_KEY=                    # php artisan key:generate

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=<нэр>
DB_USERNAME=<хэрэглэгч>
DB_PASSWORD=<нууц үг>
```

`APP_DEBUG=true` үлдээвэл алдааны мөр бүрт нууц үг, API түлхүүр харагдана.

`APP_KEY`-г **сервер дээр нэг л удаа** үүсгэнэ. Дараа нь солих юм бол
шифрлэгдсэн хуучин өгөгдөл (session, encrypted багана) бүгд уншигдахаа болино.

---

## 2. Queue — ЗААВАЛ

```env
QUEUE_CONNECTION=database
```

`sync` болговол **цахим гэрээ хүргэгдэхгүй**, CallPro дуудлага
боловсруулагдахгүй, имэйл илгээгдэхгүй, баримт PDF болж хөрвөхгүй.

```bash
sudo cp deploy/supervisor-queue.conf /etc/supervisor/conf.d/laravel-queue.conf
sudo supervisorctl reread && sudo supervisorctl update
```

---

## 3. Имэйл — ЗААВАЛ

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

Баталгаажсан цахим гэрээ, цаг захиалгын мэдэгдэл энэ сувгаар очно.
Gmail бол ердийн нууц үг биш **App Password** хэрэгтэй
(Google Account → Security → 2-Step Verification → App passwords).

---

## 4. QPay төлбөр — ЗААВАЛ (төлбөр авдаг бол)

```env
QPAY_BASE_URL=https://merchant.qpay.mn/v2
QPAY_USERNAME=<merchant username>
QPAY_PASSWORD=<merchant password>
QPAY_INVOICE_CODE=<invoice code>
QPAY_TEST_MODE=false
```

Дөрвөн утгыг QPay-тай merchant гэрээ байгуулахад өгдөг.
`QPAY_TEST_MODE=true` үлдээвэл **жинхэнэ мөнгө хураахгүй** — production-д
заавал `false`.

Төлбөргүй ажиллуулах бол энэ хэсгийг орхиж болно, гэхдээ
`/payment` хуудас болон лизингийн төлбөр ажиллахгүй.

---

## 5. Google Meet (онлайн үзлэг) — СОНГОЛТООР

```env
GOOGLE_CLIENT_ID=<...>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<...>
GOOGLE_REDIRECT_URI="${APP_URL}/google/callback"
GOOGLE_REFRESH_TOKEN=
```

1. Google Cloud Console → OAuth client үүсгэнэ (Web application)
2. Redirect URI-д `https://yourdomain.mn/google/callback` нэмнэ
3. `GOOGLE_REFRESH_TOKEN`-ыг **гараар бичихгүй** — админ талын Google
   холболтын хуудаснаас зөвшөөрөл өгөхөд систем өөрөө `.env`-д бичнэ

Тавихгүй бол онлайн цаг захиалгад Meet линк үүсэхгүй.

---

## 6. LibreOffice (лабын баримт PDF болгох) — СОНГОЛТООР

```env
LIBREOFFICE_PATH=/usr/bin/soffice
LIBREOFFICE_TIMEOUT=180
```

Суулгах ба зам олох:

```bash
sudo apt install libreoffice-core libreoffice-writer -y
which soffice          # гарсан замыг LIBREOFFICE_PATH-д тавина
```

Тавихгүй бол Word/PowerPoint хичээлийн материал PDF болж хөрвөхгүй,
«LibreOffice тохируулаагүй байна» гэсэн алдаа гарна. PDF-ээр шууд
байршуулбал асуудалгүй.

---

## 7. Лабын файлын диск — ЗААВАЛ (сургалтын хэсэг ашиглавал)

```env
LAB_VIDEO_DISK=lab_video
LAB_DOC_DISK=lab_doc
```

Эдгээр нь `config/filesystems.php`-д тодорхойлсон **дискний нэр**, зам биш.
Хичээлийн видео нийтэд нээлттэй биш, хувийн дискэнд хадгалагддаг тул
дискийг зөв тохируулаагүй бол видео тоглохгүй.

---

## 8. CallPro дуудлага — СОНГОЛТООР

```env
CALLPRO_WEBHOOK_TOKEN=<үүсгэсэн түлхүүр>
CALLPRO_ALLOWED_IPS=202.37.235.42,112.72.0.69,112.72.0.138
```

Түлхүүр үүсгэх:

```bash
php -r "echo bin2hex(random_bytes(24));"
```

Үүсгэсэн түлхүүрээ CallPro-гийн webhook тохиргоонд мөн оруулна.

> **Proxy-гийн ард байвал ЗААВАЛ нэмнэ:**
> ```env
> TRUSTED_PROXIES=*
> ```
> Cloudflare / load balancer / урд талын nginx орвол бүх хүсэлт proxy-ийн
> IP-тэй ирж, IP шалгалтад **бүх webhook 403 болж хаагдана**.

Дэлгэрэнгүй: [`callpro-setup.md`](callpro-setup.md)

---

## 9. Reverb (WebSocket — чат, шууд мэдэгдэл) — СОНГОЛТООР

```env
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=dentalapp
REVERB_APP_KEY=<үүсгэсэн>
REVERB_APP_SECRET=<үүсгэсэн>
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

Key/secret үүсгэх:

```bash
php -r "echo bin2hex(random_bytes(16));"
```

Nginx-д `/app` зам нэмэх шаардлагатай — [`nginx-websocket.conf`](nginx-websocket.conf).
Supervisor: [`supervisor-reverb.conf`](supervisor-reverb.conf).

---

## 10. Turnstile (бүртгэлийн captcha) — СОНГОЛТООР

```env
TURNSTILE_SITE_KEY=<site key>
TURNSTILE_SECRET_KEY=<secret key>
VITE_TURNSTILE_SITE_KEY="${TURNSTILE_SITE_KEY}"
```

Cloudflare → Turnstile → Add site (үнэгүй). Домэйноо нэмнэ.
Тавихгүй бол `/patient/register` хуудас captcha-гүй, ботоос хамгаалалтгүй.

---

## 11. Web push (чатын мэдэгдэл) — СОНГОЛТООР

```env
VAPID_PUBLIC_KEY=<үүсгэсэн>
VAPID_PRIVATE_KEY=<үүсгэсэн>
VAPID_SUBJECT=mailto:info@cuticul.mn
```

```bash
php artisan webpush:vapid
```

---

## 12. Meta / Facebook — СОНГОЛТООР

```env
META_APP_ID=<app id>
META_APP_SECRET=<app secret>
META_VERIFY_TOKEN=<өөрөө зохиосон мөр>
META_API_VERSION=v21.0
META_GRAPH_URL=https://graph.facebook.com
META_MEDIA_URL=https://yourdomain.mn     # хоосон бол APP_URL хэрэглэнэ
```

`META_VERIFY_TOKEN`-ыг өөрөө зохионо, Facebook-ийн webhook тохиргоонд
**яг ижлийг** оруулна. Тохирохгүй бол webhook бүртгэгдэхгүй.

---

## 13. AI туслах — СОНГОЛТООР

```env
GROQ_API_KEY=<key>
GROQ_MODEL=llama-3.3-70b-versatile

GEMINI_API_KEY=<key>
GEMINI_MODEL=gemini-2.5-flash
```

Аль нэг нь байхад л AI функц ажиллана.

---

## Өөрчилсний дараа — ЗААВАЛ

```bash
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
| Queue | `sudo supervisorctl status laravel-queue:*` |
| Имэйл | Гэрээ баталгаажуулаад ажилтны шуудан шалгах |
| QPay | Туршилтын нэхэмжлэх үүсгэж QR гарч байна уу |
| Google Meet | Онлайн цаг захиалахад Meet линк үүсэж байна уу |
| LibreOffice | Word хичээл байршуулаад PDF болж байна уу |
| CallPro | `tail -f storage/logs/laravel.log \| grep -i callpro` |
| WebSocket | Чат нээгээд хоёр цонхноос мессеж солилцох |
| Turnstile | `/patient/register` дээр captcha гарч байна уу |
