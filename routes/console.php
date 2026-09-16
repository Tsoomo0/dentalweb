<?php

use App\Models\AuditLog;
use App\Models\Social\SocialConversation;
use App\Models\Social\SocialMessage;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// 10 минутын дотор төлбөр төлөгдөөгүй онлайн захиалгуудыг устгах
Schedule::command('appointments:cancel-unpaid')->everyFiveMinutes();

// Захиалгын сануулга — цаг тутам шалгана (24h болон 2h өмнө имэйл)
Schedule::command('appointments:send-reminders')->hourly();

// Баталгаажсан ч и-мэйл нь хүрээгүй үлдсэн гэрээг дахин илгээх нөөц арга —
// гарын үсэг зурах үед шууд явдаг ч тасалдвал энэ нь барьж авна.
Schedule::command('hr:deliver-contracts')->everyFifteenMinutes()->withoutOverlapping();

// Notification 30 хоноос хуучин бичлэгийг өдөр бүр цэвэрлэх
Schedule::call(fn () => DB::table('notifications')
    ->where('created_at', '<', now()->subDays(30))->delete())
    ->daily()
    ->name('notifications:prune')
    ->description('30 хоноос хуучин notification устгах');

// Audit log 25 хоноос хуучин бичлэгийг өдөр бүр шөнө цэвэрлэх
Schedule::call(fn () => AuditLog::where('created_at', '<', now()->subDays(25))->delete())
    ->daily()
    ->name('audit-logs:prune')
    ->description('Audit log 25 хоноос хуучин бичлэгийг устгах');

// HR — ажилтны гэрээ, лиценз, туршилтын хугацааг өдөр бүр өглөө шалгах
Schedule::command('hr:check-expiry')
    ->dailyAt('08:00')
    ->name('hr:check-expiry')
    ->description('Ажилтны гэрээ болон лицензийн дуусах хугацааг шалгах');

// Social: оператор 1 цаг идэвхгүй чатуудыг автоматаар бот руу буцаах (оператор мартсан ч)
Schedule::call(function () {
    $cutoff = now()->subHour();
    SocialConversation::where('status', 'open')->get()->each(function ($conv) use ($cutoff) {
        $lastAgentAt = SocialMessage::where('social_conversation_id', $conv->id)
            ->where('sender', 'agent')->max('created_at');
        if ($lastAgentAt && Carbon::parse($lastAgentAt)->lt($cutoff)) {
            $conv->update(['status' => 'bot', 'awaiting_node_id' => null]);
        }
    });
})->everyTenMinutes()
    ->name('social:return-idle-to-bot')
    ->description('Оператор 1 цаг идэвхгүй social чатуудыг бот руу буцаах');

// Лабын сургалт — хугацаа дууссан шалгалтыг автоматаар дүгнэх (in_progress-д
// үүрд гацахаас сэргийлнэ) + дуусаагүй видео байршуулалтын түр файл цэвэрлэх
Schedule::command('lab:close-expired-exams')
    ->everyFiveMinutes()
    ->name('lab:close-expired-exams')
    ->description('Хугацаа дууссан шалгалтыг дүгнэж, түр файл цэвэрлэх');

// Заавал үзэх хичээлийн хугацааны сануулга — өдөр бүр өглөө нэг удаа.
// Илгээсэн бүрээ бүртгэдэг тул өдөр бүр ажилласан ч ижил сануулга давтагдахгүй.
Schedule::command('lab:training-reminders')
    ->dailyAt('09:00')
    ->name('lab:training-reminders')
    ->description('Сургалтын хугацааны сануулгыг ажилтнуудад илгээх');

// Сургалтын долоо хоногийн хураангуй — даваа гарагийн өглөө, өнгөрсөн 7 хоногоор.
Schedule::command('lab:training-report')
    ->weeklyOn(1, '09:15')
    ->name('lab:training-report')
    ->description('Сургалтын долоо хоногийн хураангуйг админд илгээх');

// Лабын сургалтын видеог өдөр бүр шөнө нөөцлөх.
// Гадаад диск рүү нөөцлөх бол --to=D:/backup/lab-videos гэж заана.
Schedule::command('lab:backup-videos')
    ->dailyAt('02:30')
    ->name('lab:backup-videos')
    ->description('Сургалтын видеог нөөцлөж checksum шалгах');

// ── CallPro дуудлага ────────────────────────────────────────────────────────
// SLA хяналт: тогтоосон хугацаанд баригдаагүй алдсан дуудлагыг удирдлагад
// мэдэгдэнэ. Команд өөрөө ажлын цаг эсэхийг шалгадаг.
Schedule::command('calls:escalate')
    ->everyFiveMinutes()
    ->name('calls:escalate')
    ->description('SLA хэтэрсэн алдсан дуудлагыг сэрэмжлүүлэх');

// Өдрийн хураангуй — илгээх цагийг админ талаас өөрчилдөг.
//
// Цагийг ЭНД уншиж болохгүй: schedule нь апп ачаалах бүрт (миграц хийхээс ч
// өмнө) тодорхойлогддог тул мэдээллийн санд хандвал шинэ орчинд апп унана.
// Тиймээс 10 минут тутам ажиллаад, цаг нь болсон эсэхийг ажиллах үедээ
// шалгана — `when()` дотор бол хожуу, аюулгүй.
Schedule::command('calls:report')
    ->everyTenMinutes()
    ->when(fn () => \App\Services\CallPro\CallSettings::isReportDue(10))
    ->name('calls:report-daily')
    ->description('Дуудлагын өдрийн хураангуйг админд илгээх');

// Долоо хоногийн хураангуй — даваа гарагийн өглөө, өнгөрсөн долоо хоногоор.
Schedule::command('calls:report --weekly')
    ->weeklyOn(1, '09:00')
    ->name('calls:report-weekly')
    ->description('Дуудлагын долоо хоногийн хураангуйг админд илгээх');
