<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/**
 * Өдрийн / долоо хоногийн дуудлагын хураангуй — админд.
 */
class CallSummaryReport extends Notification
{
    /**
     * @param  'daily'|'weekly'  $period
     * @param  array<int,array<string,mixed>>  $branches
     */
    public function __construct(
        public readonly string $period,
        public readonly string $rangeLabel,
        public readonly int $total,
        public readonly int $answered,
        public readonly int $missed,
        public readonly int $unhandled,
        public readonly int $afterHours,
        public readonly int $appointments,
        public readonly ?float $answerRate,
        public readonly array $branches = [],
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'period' => $this->period,
            'range_label' => $this->rangeLabel,
            'total' => $this->total,
            'answered' => $this->answered,
            'missed' => $this->missed,
            'unhandled' => $this->unhandled,
            'after_hours' => $this->afterHours,
            'appointments' => $this->appointments,
            'answer_rate' => $this->answerRate,
            'branches' => $this->branches,
            'url' => '/admin/calls/reports',
        ];
    }
}
