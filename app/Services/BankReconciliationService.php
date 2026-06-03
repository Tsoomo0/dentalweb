<?php

namespace App\Services;

use App\Models\DailySheetEntry;
use Illuminate\Support\Carbon;

/**
 * Системийн мобайл орлогуудыг банкны хуулгатай тулгана.
 *
 * Гарах хэлбэр:
 *   [
 *     'matched'       => [{ entry, bank, confidence, status }, ...],
 *     'system_only'   => [{ entry }, ...],   // банкинд орж ирээгүй (МАШ ЧУХАЛ — анхааруулга)
 *     'bank_only'     => [{ bank }, ...],    // системд алга гэвч банкинд орсон
 *     'totals'        => { system, bank, matched, ... },
 *   ]
 */
class BankReconciliationService
{
    public function __construct(private PatientNameMatcher $matcher) {}

    /**
     * @param  int  $branchId
     * @param  string  $date  YYYY-MM-DD — тэр өдрийн мобайл орлогуудыг шалгана
     * @param  array  $statement
     */
    public function reconcile(int $branchId, string $date, array $statement): array
    {
        $bankCredits = $statement['credits'] ?? [];
        // Зөвхөн сонгосон өдрийн банкны мөрүүдийг авна
        $bankCredits = array_values(array_filter($bankCredits, function ($c) use ($date) {
            if (empty($c['date'])) return true;
            return $c['date'] === $date;
        }));

        $systemEntries = $this->loadSystemMobileEntries($branchId, $date);

        // Bank-н мөр бүрт түр index өгнө
        $bankPool = [];
        foreach ($bankCredits as $idx => $c) {
            $bankPool[] = array_merge($c, ['idx' => $idx, 'used' => false]);
        }

        $matched     = [];
        $systemOnly  = [];

        // ── Алгоритм ──
        // 1. Эхлээд нэр + дүн өндөр оноотой match-уудыг авна (зөвхөн 1 boundary)
        // 2. Дараа нь үлдсэн дүн ижил мөрүүдийг bag-match хийнэ (нэр сул байсан ч)
        // 3. Тулгагдаагүй системийн entries-ийг "ОРОЛЫН ИРЭЭГҮЙ" гэж заана
        // 4. Тулгагдаагүй банкны мөрүүдийг "ЗӨВХӨН БАНКИНД" гэж заана

        // Шат 1: high-confidence (нэр таарсан) match
        foreach ($systemEntries as $entry) {
            $best = null; // ['idx' => x, 'score' => 0..1]
            foreach ($bankPool as $bp) {
                if ($bp['used'])                continue;
                if ($bp['amount'] !== (int) $entry->mobile_amount) continue;
                $score = $this->matcher->score((string) $entry->patient_name, (string) $bp['description']);
                if ($score >= 0.7 && ($best === null || $score > $best['score'])) {
                    $best = ['idx' => $bp['idx'], 'score' => $score];
                }
            }
            if ($best !== null) {
                // Тэмдэглэе
                foreach ($bankPool as &$bp) {
                    if ($bp['idx'] === $best['idx']) { $bp['used'] = true; break; }
                }
                unset($bp);
                $matched[] = [
                    'entry'      => $this->shapeEntry($entry),
                    'bank'       => $this->shapeBank($bankCredits[$best['idx']]),
                    'confidence' => round($best['score'] * 100),
                    'status'     => $best['score'] >= 0.9 ? 'matched' : 'matched_low',
                ];
                $entry->_matched = true; // mark
            }
        }

        // Шат 2: үлдсэн entries-д bag-match (зөвхөн дүнгээр)
        foreach ($systemEntries as $entry) {
            if (! empty($entry->_matched)) continue;

            $picked = null;
            foreach ($bankPool as &$bp) {
                if ($bp['used']) continue;
                if ($bp['amount'] !== (int) $entry->mobile_amount) continue;
                $picked = $bp;
                $bp['used'] = true;
                break;
            }
            unset($bp);

            if ($picked) {
                $matched[] = [
                    'entry'      => $this->shapeEntry($entry),
                    'bank'       => $this->shapeBank($picked),
                    'confidence' => 50, // зөвхөн дүн таарсан
                    'status'     => 'amount_only',
                ];
                $entry->_matched = true;
            } else {
                $systemOnly[] = ['entry' => $this->shapeEntry($entry)];
            }
        }

        // Зөвхөн банкинд үлдсэн
        $bankOnly = [];
        foreach ($bankPool as $bp) {
            if ($bp['used']) continue;
            $bankOnly[] = ['bank' => $this->shapeBank($bp)];
        }

        return [
            'matched'      => $matched,
            'system_only'  => $systemOnly,
            'bank_only'    => $bankOnly,
            'totals' => [
                'system_count'   => count($systemEntries),
                'system_total'   => array_sum($systemEntries->pluck('mobile_amount')->all()),
                'bank_count'     => count($bankCredits),
                'bank_total'     => array_sum(array_column($bankCredits, 'amount')),
                'matched_count'  => count($matched),
                'matched_total'  => array_sum(array_map(fn ($m) => $m['bank']['amount'], $matched)),
                'system_only_count' => count($systemOnly),
                'system_only_total' => array_sum(array_map(fn ($s) => $s['entry']['mobile_amount'], $systemOnly)),
                'bank_only_count'   => count($bankOnly),
                'bank_only_total'   => array_sum(array_map(fn ($b) => $b['bank']['amount'], $bankOnly)),
            ],
        ];
    }

    private function loadSystemMobileEntries(int $branchId, string $date): \Illuminate\Support\Collection
    {
        return DailySheetEntry::query()
            ->whereHas('dailySheet', function ($q) use ($branchId, $date) {
                $q->where('branch_id', $branchId)
                    ->whereDate('date', $date);
            })
            ->where('mobile_amount', '>', 0)
            ->orderBy('created_at')
            ->get();
    }

    private function shapeEntry(DailySheetEntry $e): array
    {
        return [
            'id'             => $e->id,
            'daily_sheet_id' => $e->daily_sheet_id,
            'patient_name'   => $e->patient_name,
            'mobile_amount'  => (int) $e->mobile_amount,
            'created_at'     => $e->created_at?->format('H:i'),
        ];
    }

    private function shapeBank(array $b): array
    {
        return [
            'idx'         => $b['idx'] ?? null,
            'datetime'    => $b['datetime'] ?? null,
            'time'        => $b['time'] ?? null,
            'amount'      => (int) $b['amount'],
            'description' => $b['description'] ?? '',
            'partner'     => $b['partner'] ?? null,
        ];
    }
}
