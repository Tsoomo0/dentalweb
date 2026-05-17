<?php

namespace App\Notifications;

use App\Mail\PayrollSlipMail;
use App\Models\HR\PayrollEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class PayrollSlipSent extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly PayrollEntry $entry) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (! empty($notifiable->email)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): PayrollSlipMail
    {
        return (new PayrollSlipMail($this->entry))->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'payroll_slip_sent',
            'run_id' => $this->entry->payroll_run_id,
            'run_title' => $this->entry->run->title,
            'net_hand' => $this->entry->net_hand,
            'bank_salary' => $this->entry->bank_salary,
            'message' => "Таны цалингийн задаргаа ирлээ: {$this->entry->run->title}",
            'url' => '/my/payroll',
        ];
    }
}
