<?php

namespace App\Notifications;

use App\Models\HR\ShiftSwapRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Ээлж шилжүүлэх хүсэлтийн алхам бүрийн мэдэгдэл.
 *   requested         → хамт ажилтанд
 *   awaiting_approval → HR-д
 *   peer_declined / approved / rejected → хүсэгчид (approved/rejected-ийг хамт ажилтан ч авна)
 */
class ShiftSwapNotice extends Notification
{
    use Queueable;

    public function __construct(
        public readonly ShiftSwapRequest $swap,
        public readonly string $event,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $this->swap->loadMissing(['requester', 'target', 'shift.template', 'shift.branch', 'targetShift.template', 'targetShift.branch']);
        $requester = $this->swap->requester?->short_name ?? 'Ажилтан';
        $target = $this->swap->target?->short_name ?? 'Ажилтан';
        $shift = $this->swap->shift;
        $when = $shift ? $shift->date->format('m/d').' '.$shift->label() : '';
        $kind = $this->swap->isSwap() ? 'солилцох' : 'шилжүүлэх';

        $message = match ($this->event) {
            'requested' => "{$requester} танд ээлж {$kind} хүсэлт илгээлээ",
            'awaiting_approval' => "{$requester} ↔ {$target} ээлж {$kind} хүсэлт шийдвэр хүлээж байна",
            'peer_declined' => "{$target} таны ээлж {$kind} хүсэлтээс татгалзлаа",
            'approved' => "Ээлж {$kind} хүсэлт зөвшөөрөгдлөө ✅",
            'rejected' => "Ээлж {$kind} хүсэлт татгалзагдлаа ❌",
            default => 'Ээлж солих хүсэлт шинэчлэгдлээ',
        };

        return [
            'type' => 'shift_swap',
            'event' => $this->event,
            'swap_id' => $this->swap->id,
            'requester_name' => $requester,
            'target_name' => $target,
            'shift_label' => $when,
            'target_shift_label' => $this->swap->targetShift
                ? $this->swap->targetShift->date->format('m/d').' '.$this->swap->targetShift->label() : null,
            'rejection_reason' => $this->swap->rejection_reason,
            'url' => $this->event === 'awaiting_approval' ? '/hr/schedule?tab=requests' : '/my/work-schedule',
            'message' => $message,
        ];
    }
}
