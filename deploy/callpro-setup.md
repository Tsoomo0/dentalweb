# CallPro интеграцийг серверт гаргах

Дараалалаар нь гүйцэтгэнэ. Алхам 4, 5-ыг **алгасвал систем чимээгүйгээр
ажиллахаа болино** — webhook хүлээж авагдана ч дуудлага харагдахгүй.

---

## 1. Код серверт

```bash
cd /var/www/html
git pull
composer install --no-dev --optimize-autoloader
npm ci && npm run build
```

## 2. Мэдээллийн сан

```bash
php artisan migrate --force
php artisan db:seed --class=CallProSeeder --force
```

Seeder нь 4 салбарын дотуур дугаар, queue-г суулгана. Дахин ажиллуулахад
аюулгүй. Салбар олдохгүй бол алгасаад анхааруулга бичнэ.

## 3. `.env`

```env
CALLPRO_WEBHOOK_TOKEN=<нууц түлхүүр>
CALLPRO_ALLOWED_IPS=202.37.235.42,112.72.0.69,112.72.0.138
```

Түлхүүр үүсгэх:

```bash
php -r "echo bin2hex(random_bytes(24));"
```

Дараа нь:

```bash
php artisan config:clear
```

> **Анхаар — proxy-гийн ард байвал ЗААВАЛ:** IP жагсаалт нь `$request->ip()`-д
> тулгуурладаг. Cloudflare, load balancer эсвэл урд талын nginx орвол бүх
> хүсэлт proxy-ийн IP-тэй ирж, **бүх webhook 403 болж хаагдана**. Тохируулах:
>
> ```env
> TRUSTED_PROXIES=*
> ```
>
> Шууд PHP-FPM рүү ордог бол хоосон үлдээнэ. Дэлгэрэнгүйг
> `config/trustedproxy.php`-с үзнэ үү.
>
> Шалгах — CallPro-гийн жинхэнэ IP харагдаж байна уу:
>
> ```bash
> tail -f storage/logs/laravel.log | grep -i callpro
> ```

## 4. Queue worker — ЗААВАЛ

```bash
sudo cp deploy/supervisor-queue.conf /etc/supervisor/conf.d/laravel-queue.conf
sudo supervisorctl reread && sudo supervisorctl update
sudo supervisorctl status laravel-queue:*
```

Webhook нь түүхий датаг хадгалаад ажлыг дараалалд өгдөг. Worker байхгүй бол
`jobs` хүснэгтэд хуримтлагдаад зогсоно.

## 5. Cron — ЗААВАЛ

```bash
sudo crontab -u www-data -e
```

```cron
* * * * * cd /var/www/html && php artisan schedule:run >> /dev/null 2>&1
```

Үүнээс хамаарах зүйлс: SLA сэрэмжлүүлэг (5 мин тутам), өдрийн тайлан,
долоо хоногийн тайлан. Мөн өмнөх функцууд — цалингийн сануулга, лабын
видео нөөцлөлт, HR хугацааны шалгалт.

Шалгах: `php artisan schedule:list`

## 6. CallPro-д өгөх хаяг

```
POST | GET   https://<домэйн>/webhooks/callpro/start
POST | GET   https://<домэйн>/webhooks/callpro/answered
POST | GET   https://<домэйн>/webhooks/callpro/end
POST | GET   https://<домэйн>/webhooks/callpro/abandoned

Header:      X-Callpro-Token: <нууц түлхүүр>
```

Түүхэн дата илгээхэд `?source=history` нэмнэ — тэгснээр мянган мэдэгдэл
үүсэхгүй.

## 7. Ажиллаж байгааг батлах

```bash
# Түүхий event ирж байна уу
php artisan tinker --execute="echo App\Models\CallPro\CallEvent::count();"

# Боловсруулагдсан уу
php artisan tinker --execute="echo App\Models\CallPro\Call::count();"

# Гацсан ажил байна уу
php artisan queue:failed
```

Дараа нь `/admin/calls` дээр дуудлага харагдах ёстой. Салбар нь
«тодорхойгүй» гэж гарвал `/admin/call-settings` дээрх «Бүртгэгдээгүй утга»
хэсгээс дугаар/queue-г холбоно.

---

## Тест дата

```bash
php artisan calls:demo          # 9 дуудлага + мэдэгдэл
php artisan calls:demo:one      # ганц алдсан дуудлага (дэлгэцийн цонх)
php artisan calls:demo --clear  # цэвэрлэх
```
