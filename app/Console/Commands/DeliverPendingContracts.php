<?php

namespace App\Console\Commands;

use App\Jobs\DeliverEmployeeDocument;
use App\Models\HR\EmployeeDocument;
use Illuminate\Console\Command;

/**
 * Баталгаажсан ч и-мэйл нь хүрээгүй үлдсэн гэрээг дахин илгээнэ.
 *
 * Гарын үсэг зурах үед хүргэлт хариу буцаасны дараа шууд явдаг ч
 * сервер унтрах, сүлжээ тасрах зэргээр тасалдаж болзошгүй. Энэ команд
 * тийм баримтуудыг олж дахин илгээх нөөц арга юм.
 */
class DeliverPendingContracts extends Command
{
    protected $signature = 'hr:deliver-contracts
                            {--minutes=15 : Хэдэн минутын өмнөх баримтаас эхлэн шалгах}
                            {--limit=20 : Нэг удаад илгээх дээд тоо}';

    protected $description = 'Баталгаажсан ч и-мэйл нь хүрээгүй гэрээг дахин илгээнэ';

    public function handle(): int
    {
        $documents = EmployeeDocument::where('status', 'completed')
            ->whereNull('delivered_at')
            ->where('completed_at', '<=', now()->subMinutes((int) $this->option('minutes')))
            ->orderBy('completed_at')
            ->limit((int) $this->option('limit'))
            ->get();

        if ($documents->isEmpty()) {
            $this->info('Хүлээгдэж буй гэрээ байхгүй.');

            return self::SUCCESS;
        }

        foreach ($documents as $document) {
            $this->line("#{$document->id} {$document->title} — {$document->employee_name}");
            DeliverEmployeeDocument::dispatchSync($document->id);
        }

        $this->info($documents->count().' гэрээ илгээхээр боловсрууллаа.');

        return self::SUCCESS;
    }
}
