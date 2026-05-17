<?php

use App\Models\AuditLog;
use Illuminate\Foundation\Inspiring;
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
