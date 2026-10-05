<?php

use App\Http\Controllers\Attendance\AgentIngestController;
use App\Http\Controllers\Attendance\IclockController;
use App\Http\Middleware\VerifyAttendanceAgent;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Ирцийн төхөөрөмжүүд (bootstrap/app.php-д `api` middleware-тэй бүртгэгдэнэ)
|--------------------------------------------------------------------------
| Session, CSRF, Inertia, maintenance middleware-гүй — төхөөрөмж болон агент
| cookie хадгалдаггүй. /iclock-ийг HTTPS руу redirect хийж болохгүй
| (хуучин firmware зөвхөн HTTP-ээр илгээдэг).
*/

// ── 4370 агент (JDF200 гэх мэт) ─────────────────────────────────────────────
Route::post('/api/attendance/ingest', AgentIngestController::class)
    ->middleware([VerifyAttendanceAgent::class, 'throttle:60,1'])
    ->name('attendance.agent.ingest');

// ── ADMS push (TX628 гэх мэт) ───────────────────────────────────────────────
Route::prefix('iclock')->middleware('throttle:240,1')->group(function () {
    Route::match(['get', 'post'], 'cdata', [IclockController::class, 'cdata'])->name('attendance.iclock.cdata');
    Route::get('getrequest', [IclockController::class, 'getrequest'])->name('attendance.iclock.getrequest');
    Route::post('devicecmd', [IclockController::class, 'devicecmd'])->name('attendance.iclock.devicecmd');
    Route::match(['get', 'post'], '{any}', [IclockController::class, 'fallback'])->where('any', '.*');
});
