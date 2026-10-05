<?php

namespace App\Notifications;

use App\Models\HR\AttendanceDevice;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Ирцийн төхөөрөмж ажлын цагаар 1 цагаас дээш дуугүй болсон —
 * 4370 бол ресепшний компьютер/агент, push бол сүлжээ эсвэл төхөөрөмж.
 */
class AttendanceDeviceOffline extends Notification
{
    use Queueable;

    public function __construct(public readonly AttendanceDevice $device) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $lastSeen = $this->device->last_seen_at?->format('Y-m-d H:i');
        $hint = $this->device->isPull()
            ? 'Ресепшний компьютер асаалттай эсэх, агентын agent.log-ийг шалгана уу.'
            : 'Төхөөрөмжийн сүлжээ, Cloud Server тохиргоог шалгана уу.';

        return [
            'type' => 'attendance_device_offline',
            'device_id' => $this->device->id,
            'device_name' => $this->device->name,
            'branch_name' => $this->device->branch?->name,
            'last_seen_at' => $lastSeen,
            'hint' => $hint,
            'url' => '/hr/attendance/devices',
            'message' => "Ирцийн төхөөрөмж «{$this->device->name}» холбогдохгүй байна".($lastSeen ? " (сүүлд {$lastSeen})" : '').'. '.$hint,
        ];
    }
}
