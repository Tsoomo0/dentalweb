<?php

namespace App\Notifications;

use App\Models\HR\Employee;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class LateCheckIn extends Notification
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Employee $employee,
        public readonly string $checkedInAt,
        public readonly string $scheduledStart,
        public readonly int $lateMinutes,
        public readonly string $date,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'            => 'late_check_in',
            'employee_name'   => $this->employee->full_name,
            'employee_number' => $this->employee->employee_number,
            'date'            => $this->date,
            'checked_in_at'   => $this->checkedInAt,
            'scheduled_start' => $this->scheduledStart,
            'late_minutes'    => $this->lateMinutes,
            'message'         => "{$this->employee->full_name} {$this->lateMinutes} минут хоцорч ирлээ ({$this->scheduledStart} → {$this->checkedInAt})",
        ];
    }
}
