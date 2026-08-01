<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class NewJobApplication extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    /** SMTP түр саатсан тохиолдолд дахин оролдоно */
    public int $tries = 3;

    public array $backoff = [30, 120];

    public function __construct(
        public readonly string $applicantName,
        public readonly string $phone,
        public readonly ?string $email,
        public readonly ?string $position,
        public readonly string $submittedAt,
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (! empty($notifiable->email)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'applicant_name' => $this->applicantName,
            'phone' => $this->phone,
            'email' => $this->email,
            'position' => $this->position,
            'submitted_at' => $this->submittedAt,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('📋 Шинэ ажлын анкет ирлээ — '.$this->applicantName)
            ->view('emails.job-application-received', [
                'applicantName' => $this->applicantName,
                'phone' => $this->phone,
                'email' => $this->email,
                'position' => $this->position,
                'submittedAt' => $this->submittedAt,
            ]);
    }
}
