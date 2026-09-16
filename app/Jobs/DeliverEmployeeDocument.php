<?php

namespace App\Jobs;

use App\Mail\EmployeeDocumentCompletedMail;
use App\Models\HR\EmployeeDocument;
use App\Models\User;
use App\Notifications\EmployeeDocumentSigned;
use App\Services\HR\EmployeeDocumentPdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Баталгаажсан гэрээг PDF болгож, хоёр талд и-мэйлээр илгээнэ.
 *
 * PDF үүсгэх нь хэдэн секунд авдаг тул гарын үсэг зурах хүсэлтийг
 * саатуулахгүйн тулд энэ ажлыг дараалалд шилжүүлж гүйцэтгэнэ.
 * PDF-ийг нэг л удаа үүсгээд хоёр захидалд ижил файлыг хавсаргана.
 */
class DeliverEmployeeDocument implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public int $timeout = 180;

    public function __construct(public readonly int $documentId) {}

    public function handle(): void
    {
        $document = EmployeeDocument::with(['employee.user', 'employee.position', 'employee.branch', 'employerUser', 'creator'])
            ->find($this->documentId);

        if (! $document || $document->status !== 'completed') {
            return;
        }

        // PDF-ийг нэг удаа үүсгэж диск рүү хадгална — захидлууд үүнийг хавсаргана
        try {
            EmployeeDocumentPdf::store($document);
            $document->refresh();
        } catch (\Throwable $e) {
            Log::error('EmployeeDocument PDF generation failed', ['id' => $document->id, 'error' => $e->getMessage()]);
            $document->forceFill(['delivery_error' => 'PDF үүсгэхэд алдаа гарлаа: '.$e->getMessage()])->save();

            throw $e;
        }

        $sent = [];
        $errors = [];

        foreach ($this->recipients($document) as $email => $role) {
            try {
                Mail::to($email)->send(new EmployeeDocumentCompletedMail($document, $role));
                $sent[] = $email;
            } catch (\Throwable $e) {
                $errors[] = $email.': '.$e->getMessage();
                Log::error('EmployeeDocument mail failed', ['id' => $document->id, 'to' => $email, 'error' => $e->getMessage()]);
            }
        }

        $document->forceFill([
            'delivered_at' => $sent ? now() : null,
            'delivered_to' => $sent,
            'delivery_error' => $errors ? implode(' | ', $errors) : null,
        ])->save();

        // Хоёр тал руу явсны дараа HR / админд мэдэгдэнэ
        foreach ($this->staff($document) as $user) {
            try {
                $user->notify(new EmployeeDocumentSigned($document));
            } catch (\Throwable $e) {
                Log::warning('EmployeeDocument signed notification failed', ['id' => $document->id, 'error' => $e->getMessage()]);
            }
        }
    }

    public function failed(\Throwable $e): void
    {
        EmployeeDocument::whereKey($this->documentId)->update([
            'delivery_error' => mb_substr($e->getMessage(), 0, 500),
        ]);
    }

    /**
     * Хүлээн авагчид — ажилтан болон ажил олгогчийн тал.
     *
     * @return array<string, string> и-мэйл => үүрэг
     */
    private function recipients(EmployeeDocument $document): array
    {
        $list = [];

        $employeeEmail = $document->employee?->email ?: $document->employee?->user?->email;
        if ($employeeEmail) {
            $list[$employeeEmail] = 'employee';
        }

        foreach ($this->employerEmails($document) as $email) {
            // Нэг хаяг давхардвал ажилтны хувилбар давамгайлна
            if (! isset($list[$email])) {
                $list[$email] = 'employer';
            }
        }

        return $list;
    }

    /** @return array<int, string> */
    private function employerEmails(EmployeeDocument $document): array
    {
        $emails = [];

        if ($document->employerUser?->email) {
            $emails[] = $document->employerUser->email;
        }

        if (! $emails && $document->creator?->email) {
            $emails[] = $document->creator->email;
        }

        if (! $emails) {
            $emails = User::whereHas('role', fn ($q) => $q->where('name', 'admin'))
                ->whereNotNull('email')
                ->pluck('email')
                ->all();
        }

        return array_values(array_unique(array_filter($emails)));
    }

    /** @return Collection<int, User> */
    private function staff(EmployeeDocument $document)
    {
        $users = User::whereHas('role', fn ($q) => $q->where('name', 'admin'))->get();

        if ($document->creator && ! $users->contains('id', $document->creator->id)) {
            $users->push($document->creator);
        }

        return $users;
    }
}
