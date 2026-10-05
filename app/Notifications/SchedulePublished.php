<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** Ажилтны хуваарь нийтлэгдсэн/өөрчлөгдсөн — My портал руу хөтөлнө. */
class SchedulePublished extends Notification
{
    use Queueable;

    /**
     * @param  list<array{date: string, change: string, label: string}>  $changes
     */
    public function __construct(
        public readonly string $from,
        public readonly string $to,
        public readonly array $changes,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $count = count($this->changes);
        $onlyNew = collect($this->changes)->every(fn ($c) => $c['change'] === 'new');

        return [
            'type' => 'schedule_published',
            'from' => $this->from,
            'to' => $this->to,
            'count' => $count,
            'lines' => collect($this->changes)->sortBy('date')->take(5)->map(fn ($c) => [
                'date' => $c['date'],
                'change' => $c['change'],
                'label' => $c['label'],
            ])->values()->all(),
            'url' => '/my/work-schedule?date='.$this->from,
            'message' => $onlyNew
                ? "Таны ажлын хуваарь нийтлэгдлээ ({$count} өдөр)"
                : "Таны ажлын хуваарь өөрчлөгдлөө ({$count} өөрчлөлт)",
        ];
    }
}
