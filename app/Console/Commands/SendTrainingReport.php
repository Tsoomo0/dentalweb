<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\LabTrainingSummary;
use App\Services\Lab\TrainingDigest;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;

/**
 * Сургалтын хураангуйг админд илгээнэ.
 *
 *   php artisan lab:training-report              → өнгөрсөн долоо хоног
 *   php artisan lab:training-report --days=30    → сүүлийн 30 хоног
 *   php artisan lab:training-report --dry-run    → зөвхөн дэлгэц дээр хэвлэнэ
 *
 * `calls:report`-той ижил зарчмаар ажиллана: тайлан нь админыг хүлээхгүй,
 * өөрөө очно. Ялгаа нь — дуудлагын тайлан идэвх байхгүй бол чимээгүй өнгөрдөг
 * бол сургалтын хураангуй нь ЯГ ТЭР ҮЕД хамгийн хэрэгтэй. Хэн ч хичээл
 * үзээгүй долоо хоног бол тэр өөрөө хамгийн чухал мэдээлэл.
 */
class SendTrainingReport extends Command
{
    protected $signature = 'lab:training-report {--days=} {--dry-run}';

    protected $description = 'Дотоод сургалтын хураангуйг админд илгээх';

    public function handle(): int
    {
        [$from, $to, $label] = $this->range();

        $digest = TrainingDigest::build($from, $to);

        $this->table(['Үзүүлэлт', 'Утга'], [
            ['Хугацаа', $label],
            ['Хамрах хүрээ', $digest['audience']],
            ['Ерөнхий дуусгалт', $digest['completion_percent'].'%'],
            ['Суралцсан ажилтан', $digest['active_staff']],
            ['Дуусгасан хичээл', $digest['completions']],
            ['Өгсөн шалгалт', $digest['exams_taken'].' ('.$digest['exams_passed'].' тэнцсэн)'],
            ['Хугацаа хэтэрсэн', $digest['overdue_total']],
        ]);

        if ($this->option('dry-run')) {
            $this->info('Туршилтын горим — и-мэйл илгээсэнгүй.');

            return self::SUCCESS;
        }

        $admins = User::whereHas('role', fn ($q) => $q->where('name', 'admin'))->get();

        if ($admins->isEmpty()) {
            $this->warn('Админ хэрэглэгч олдсонгүй.');

            return self::SUCCESS;
        }

        Notification::send($admins, new LabTrainingSummary($digest, $label));

        $this->info("{$label}: хураангуйг {$admins->count()} админд илгээлээ.");

        return self::SUCCESS;
    }

    /** @return array{0: Carbon, 1: Carbon, 2: string} */
    protected function range(): array
    {
        if ($days = (int) $this->option('days')) {
            $from = Carbon::now()->subDays(max(1, $days))->startOfDay();
            $to   = Carbon::now();

            return [$from, $to, "сүүлийн {$days} хоног"];
        }

        // Даваа гарагт ажиллана — өнгөрсөн бүтэн долоо хоногийг тайлагнана
        $from = Carbon::now()->subWeek()->startOfWeek();
        $to   = Carbon::now()->subWeek()->endOfWeek();

        return [$from, $to, $from->format('m/d').' – '.$to->format('m/d')];
    }
}
