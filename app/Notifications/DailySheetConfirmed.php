<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class DailySheetConfirmed extends Notification
{
    public function __construct(
        public readonly string $branchName,
        public readonly string $date,
        public readonly string $receptionistName,
        public readonly int $sheetId,
        public readonly int $entryCount,
        public readonly int $totalAmount,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'branch_name' => $this->branchName,
            'date' => $this->date,
            'receptionist_name' => $this->receptionistName,
            'sheet_id' => $this->sheetId,
            'entry_count' => $this->entryCount,
            'total_amount' => $this->totalAmount,
        ];
    }
}
