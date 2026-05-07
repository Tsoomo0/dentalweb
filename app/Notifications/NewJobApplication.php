<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;

class NewJobApplication extends Notification
{
    public function __construct(
        public readonly string $applicantName,
        public readonly string $phone,
        public readonly ?string $email,
        public readonly ?string $position,
        public readonly string $submittedAt,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'applicant_name' => $this->applicantName,
            'phone'          => $this->phone,
            'email'          => $this->email,
            'position'       => $this->position,
            'submitted_at'   => $this->submittedAt,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toDatabase($notifiable));
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('📋 Шинэ ажлын анкет ирлээ — ' . $this->applicantName)
            ->view('emails.job-application-received', [
                'applicantName' => $this->applicantName,
                'phone'         => $this->phone,
                'email'         => $this->email,
                'position'      => $this->position,
                'submittedAt'   => $this->submittedAt,
            ]);
    }
}
