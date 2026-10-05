<?php

namespace App\Console\Commands;

use App\Models\HR\AttendanceDevice;
use App\Models\User;
use App\Notifications\AttendanceDeviceOffline;
use App\Services\CallPro\CallSettings;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

/**
 * Ажлын цагаар 1 цагаас дээш дуугүй болсон ирцийн төхөөрөмжийн талаар HR/админд мэдэгдэнэ.
 *
 * Ресепшний компьютер шөнө унтардаг тул зөвхөн ажлын цагаар шалгана. Өглөө нээгдэх
 * үед хуурамч сэрэмжлүүлэг гарахгүйн тулд сүүлийн 1 цаг БҮТНЭЭРЭЭ ажлын цаг байх ёстой.
 * Ажлын цаг нь эмнэлгийн гараг бүрийн цагийн тохиргоо (Админ → Дуудлага → тохиргоо).
 * Нэг тасралтад нэг л удаа мэдэгдэнэ — төхөөрөмж дахин холбогдмогц тэмдэглэгээ арилна.
 */
class CheckAttendanceDevices extends Command
{
    protected $signature = 'attendance:check-devices';

    protected $description = 'Ажлын цагаар дуугүй болсон ирцийн төхөөрөмжийг HR-д мэдэгдэх';

    /** Ийм хугацаа дуугүй байвал тасарсан гэж үзнэ. */
    private const SILENT_MINUTES = 60;

    public function handle(): int
    {
        $now = now();

        if (! CallSettings::isWorkingTime($now) || ! CallSettings::isWorkingTime($now->copy()->subMinutes(self::SILENT_MINUTES))) {
            return self::SUCCESS;
        }

        $silent = AttendanceDevice::with('branch:id,name')
            ->where('is_active', true)
            ->whereNull('offline_notified_at')
            ->where(fn ($q) => $q->whereNull('last_seen_at')->orWhere('last_seen_at', '<', $now->copy()->subMinutes(self::SILENT_MINUTES)))
            ->get();

        if ($silent->isEmpty()) {
            return self::SUCCESS;
        }

        $recipients = User::whereHas('role', fn ($q) => $q->whereIn('name', ['admin', 'hr']))->get();

        foreach ($silent as $device) {
            if ($recipients->isNotEmpty()) {
                Notification::send($recipients, new AttendanceDeviceOffline($device));
            }

            $device->forceFill(['offline_notified_at' => $now])->save();
            $this->info("Мэдэгдэв: {$device->name}");
        }

        return self::SUCCESS;
    }
}
