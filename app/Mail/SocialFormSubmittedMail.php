<?php

namespace App\Mail;

use App\Models\Social\SocialForm;
use App\Models\Social\SocialFormSubmission;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SocialFormSubmittedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly SocialForm $form,
        public readonly SocialFormSubmission $submission,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "📋 Шинэ хүсэлт — {$this->form->name}");
    }

    public function content(): Content
    {
        // [{ label, value }] хэлбэрээр талбар бүрийн хариуг бэлдэнэ.
        $data = $this->submission->data ?? [];
        $rows = [];
        foreach ($this->form->fields ?? [] as $f) {
            $val = $data[$f['key']] ?? '';
            $rows[] = [
                'label' => $f['label'] ?? $f['key'],
                'value' => is_array($val) ? implode(', ', $val) : (string) $val,
            ];
        }

        return new Content(view: 'emails.social-form-submitted', with: [
            'form' => $this->form,
            'submission' => $this->submission,
            'rows' => $rows,
            'contactName' => $this->submission->contact?->name ?? $this->submission->contact?->username,
        ]);
    }
}
