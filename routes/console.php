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
