<?php

namespace App\Mail;

use App\Models\HR\EmployeeDocument;
use App\Services\HR\EmployeeDocumentPdf;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

/**
 * Хоёр тал гарын үсэг зурж баталгаажсаны дараа ажил олгогч болон
 * ажилтан хоёуланд нь PDF хавсаргаж илгээх и-мэйл.
 */
class EmployeeDocumentCompletedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly EmployeeDocument $document,
        public readonly string $recipientRole = 'employee', // employee | employer
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->document->title.' — баталгаажсан гэрээ',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.employee-document-completed',
            with: [
                'doc' => $this->document,
                'isEmployer' => $this->recipientRole === 'employer',
            ],
        );
    }

    /**
     * PDF-ийг захидал бүрд дахин үүсгэхгүй — өмнө нь хадгалсан файлыг
     * хавсаргана. Ямар нэг шалтгаанаар файл байхгүй бол шинээр үүсгэнэ.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        $disk = Storage::disk(EmployeeDocumentPdf::DISK);
        $name = EmployeeDocumentPdf::fileName($this->document);

        if ($this->document->pdf_path && $disk->exists($this->document->pdf_path)) {
            return [
                Attachment::fromStorageDisk(EmployeeDocumentPdf::DISK, $this->document->pdf_path)
                    ->as($name)
                    ->withMime('application/pdf'),
            ];
        }

        return [
            Attachment::fromData(
                fn () => EmployeeDocumentPdf::raw($this->document),
                $name,
            )->withMime('application/pdf'),
        ];
    }
}
