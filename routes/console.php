<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// 10 минутын дотор төлбөр төлөгдөөгүй онлайн захиалгуудыг устгах
Schedule::command('appointments:cancel-unpaid')->everyFiveMinutes();

// Захиалгын сануулга — цаг тутам шалгана (24h болон 2h өмнө имэйл)
Schedule::command('appointments:send-reminders')->hourly();

// Audit log 25 хоноос хуучин бичлэгийг өдөр бүр шөнө цэвэрлэх
Schedule::call(fn () => \App\Models\AuditLog::where('created_at', '<', now()->subDays(25))->delete())
    ->daily()
    ->name('audit-logs:prune')
    ->description('Audit log 25 хоноос хуучин бичлэгийг устгах');
