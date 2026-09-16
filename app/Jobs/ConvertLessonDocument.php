<?php

namespace App\Jobs;

use App\Models\Lab\LabLesson;
use App\Services\Lab\DocumentService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * PPT/DOCX хичээлийг PDF болгож хөрвүүлнэ.
 *
 * Дараалалд явуулсны шалтгаан: 40MB-ийн илтгэл хөрвүүлэхэд минут ч болж
 * магадгүй. Админ хадгалах товч дараад хүлээж суух ёсгүй — хичээл нь
 * "хөрвүүлж байна" төлөвтэй үүсээд, бэлэн болмогц өөрөө шинэчлэгдэнэ.
 *
 * Дахин оролдохгүй: LibreOffice суулгаагүй, эсвэл файл эвдэрсэн зэрэг
 * шалтгаанууд дахин оролдоод засрахгүй. DocumentService нь алдааг хичээл
 * дээр бичих тул админ юу болсныг хараад PDF-ээр байршуулж болно.
 */
class ConvertLessonDocument implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    /** Дараалалд удаан гацахаас сэргийлнэ — хөрвүүлэлтийн хугацаа + нөөц. */
    public int $timeout = 300;

    public function __construct(public readonly int $lessonId) {}

    public function handle(DocumentService $docs): void
    {
        $lesson = LabLesson::find($this->lessonId);

        // Хичээл нь хөрвүүлэлт дуусахаас өмнө устсан байж болно
        if (! $lesson || ! $lesson->doc_source_path) {
            return;
        }

        $docs->convert($lesson);
    }
}
