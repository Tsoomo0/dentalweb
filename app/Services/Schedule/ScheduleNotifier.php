<?php

namespace App\Services\Schedule;

use App\Models\HR\Employee;
use App\Models\HR\ShiftSwapRequest;
use App\Models\User;
use App\Notifications\SchedulePublished;
use App\Notifications\ShiftSwapNotice;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

/**
 * Хуваарийн мэдэгдлүүд. Мэдэгдэл бүтэлгүйтсэнээс болж нийтлэх үйлдэл
 * унах ёсгүй тул алдааг логлоод үргэлжилнэ.
 */
final class ScheduleNotifier
{
    /** @param array<int, list<array{date: string, change: string, label: string}>> $changes */
    public static function published(array $changes, string $from, string $to): void
    {
        if ($changes === []) {
            return;
        }

        $employees = Employee::with(['user', 'doctor'])->whereIn('id', array_keys($changes))->get();
        foreach ($employees as $employee) {
            self::send($employee, new SchedulePublished($from, $to, $changes[$employee->id]));
        }
    }

    public static function swap(ShiftSwapRequest $swap, string $event): void
    {
        $swap->loadMissing(['requester.user', 'requester.doctor', 'target.user', 'target.doctor']);
        $notice = new ShiftSwapNotice($swap, $event);

        switch ($event) {
            case 'requested':
                self::send($swap->target, $notice);
                break;
            case 'awaiting_approval':
                self::hr()->each(fn (User $u) => self::deliver($u, $notice));
                break;
            case 'peer_declined':
                self::send($swap->requester, $notice);
                break;
            case 'approved':
            case 'rejected':
                self::send($swap->requester, $notice);
                self::send($swap->target, $notice);
                break;
        }
    }

    /** Ажилтныг мэдэгдэл хүлээн авах бүртгэл рүү нь хүргэнэ (хэрэглэгч эсвэл эмчийн бүртгэл). */
    private static function send(?Employee $employee, Notification $notification): void
    {
        $notifiable = $employee?->user ?? $employee?->doctor;
        if ($notifiable) {
            self::deliver($notifiable, $notification);
        }
    }

    private static function deliver(object $notifiable, Notification $notification): void
    {
        try {
            $notifiable->notify($notification);
        } catch (\Throwable $e) {
            Log::warning('Хуваарийн мэдэгдэл илгээж чадсангүй', ['type' => $notification::class, 'error' => $e->getMessage()]);
        }
    }

    private static function hr()
    {
        return User::whereHas('role', fn ($q) => $q->whereIn('name', ['admin', 'hr']))->get();
    }
}
