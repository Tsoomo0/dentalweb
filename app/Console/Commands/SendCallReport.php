<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\CallSummaryReport;
use App\Services\CallPro\CallReportService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;

/**
 * Дуудлагын хураангуй тайланг админд илгээнэ.
 *
 *   php artisan calls:report            → өнөөдрийн тайлан (ажлын өдрийн төгсгөлд)
 *   php artisan calls:report --weekly   → өнгөрсөн долоо хоног (даваа гарагт)
 *   php artisan calls:report --date=... → тодорхой өдрийн тайлан (гараар)
 */
class SendCallReport extends Command
{
    protected $signature = 'calls:report {--weekly} {--date=}';

    protected $description = 'Дуудлагын өдрийн/долоо хоногийн хураангуйг админд илгээх';

    public function handle(CallReportService $reports): int
    {
        $weekly = (bool) $this->option('weekly');

        [$from, $to, $label] = $this->range($weekly);

        $totals = $reports->totals($from, $to, null);

        // Дуудлага огт байхгүй өдөр тайлан илгээх нь зөвхөн чимээ шуугиан.
        if ($totals['total'] === 0) {
            $this->info("{$label}: дуудлага байхгүй — тайлан илгээсэнгүй.");

            return self::SUCCESS;
        }

        $admins = User::whereHas('role', fn ($q) => $q->where('name', 'admin'))->get();

        if ($admins->isEmpty()) {
            $this->warn('Админ хэрэглэгч олдсонгүй.');

            return self::SUCCESS;
        }

        Notification::send($admins, new CallSummaryReport(
            period: $weekly ? 'weekly' : 'daily',
            rangeLabel: $label,
            total: $totals['total'],
            answered: $totals['answered'],
            missed: $totals['missed'],
            unhandled: $totals['unhandled'],
            afterHours: $totals['after_hours'],
            appointments: $totals['appointments'],
            answerRate: $totals['answer_rate'],
            branches: collect($reports->byBranch($from, $to))
                ->map(fn (array $b) => [
                    'name' => $b['period'],
                    'total' => $b['total'],
                    'missed' => $b['missed'],
                    'unhandled' => $b['unhandled'],
                    'answer_rate' => $b['answer_rate'],
                ])
                ->all(),
        ));

        $this->info("{$label}: {$totals['total']} дуудлага, {$totals['missed']} алдсан — {$admins->count()} админд илгээлээ.");

        return self::SUCCESS;
    }

    /** @return array{0:string,1:string,2:string} */
    private function range(bool $weekly): array
    {
        if ($date = $this->option('date')) {
            $day = Carbon::parse($date);

            return [$day->toDateString(), $day->toDateString(), $day->format('Y-m-d')];
        }

        if ($weekly) {
            // Даваа гарагт ажиллана — өнгөрсөн бүтэн долоо хоногийг тайлагнана.
            $start = Carbon::now()->subWeek()->startOfWeek();
            $end = Carbon::now()->subWeek()->endOfWeek();

            return [
                $start->toDateString(),
                $end->toDateString(),
                $start->format('m/d').' – '.$end->format('m/d'),
            ];
        }

        $today = Carbon::today();

        return [$today->toDateString(), $today->toDateString(), $today->format('Y-m-d')];
    }
}
