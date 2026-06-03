<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Smalot\PdfParser\Parser as PdfParser;

/**
 * Хаан банкны "Депозит дансны дэлгэрэнгүй хуулга" файлыг (PDF/Excel) задлан унших.
 *
 * Гарах хэлбэр:
 *   [
 *     'account_number' => '5005027743008',
 *     'account_holder' => 'БААТАР ДӨЛГӨӨН',
 *     'period_from'    => '2026-05-13',
 *     'period_to'      => '2026-05-13',
 *     'credits' => [
 *       [
 *         'datetime'    => '2026-05-13 10:04:39',
 *         'amount'      => 65000,
 *         'description' => 'Хишгээ шүд',
 *         'partner'     => '5171008021',
 *       ],
 *       ...
 *     ],
 *   ]
 */
class KhanBankStatementParser
{
    /** Алгасах description-ууд (банкны коммисс) */
    private const SKIP_KEYWORDS = [
        'хураамж',
        'хүү',
    ];

    public function parse(UploadedFile $file): array
    {
        $ext = strtolower($file->getClientOriginalExtension());

        return match (true) {
            in_array($ext, ['pdf'])           => $this->parsePdf($file),
            in_array($ext, ['xls', 'xlsx'])   => $this->parseExcel($file),
            in_array($ext, ['csv'])           => $this->parseCsv($file),
            default => throw new \InvalidArgumentException("Дэмжихгүй файлын төрөл: $ext"),
        };
    }

    // ─────────────────────────────────────────────────────────
    // PDF
    // ─────────────────────────────────────────────────────────
    public function parsePdf(UploadedFile $file): array
    {
        $parser = new PdfParser;
        $pdf = $parser->parseFile($file->getRealPath());
        $text = $pdf->getText();

        return $this->extractFromText($text);
    }

    /**
     * PDF-аас гарах текстийг сегмент болгож (date+time-р split) унших.
     * PDF дотроос мөрийн төгсгөл алддаг тул line-base parsing найдваргүй.
     */
    private function extractFromText(string $text): array
    {
        $accountNumber = '';
        $accountHolder = '';
        $periodFrom    = '';
        $periodTo      = '';
        $credits = [];

        // IBAN-аас account number
        if (preg_match('/MN\d{2}\d{4}(\d{10,14})/', $text, $m)) {
            $accountNumber = ltrim($m[1], '0');
        }

        // Хэрэглэгчийн нэр
        if (preg_match('/Хэрэглэгч\s*:?\s*([А-ЯӨҮЁ\s]+?)\s*(?:Интервал|IBAN|Валют)/u', $text, $m)) {
            $accountHolder = trim($m[1]);
        }

        // Интервал
        if (preg_match('/Интервал\s*:?\s*(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/u', $text, $m)) {
            $periodFrom = $m[1];
            $periodTo   = $m[2];
        }

        // Хаан банкны PDF дотроос мөрийн төгсгөл найдваргүй (TAB-аар тусгаарлаж,
        // зарим тоонуудыг хооронд нь нийлүүлдэг). Жишээ нь:
        //   "2026-05-13 10:04:395171 1028.21 65000.00\t066028.21 Хишгээ шүд\t5171008021"
        //   - "10:04:39" + "5171" = цаг + бранч нийлчих
        //   - "\t0" + "66028.21" = дебит "0" + эцсийн үлдэгдэл нийлчих
        //
        // Credit row-ыг тогтоохдоо: TAB-ын өмнө 3 тоо (бранч + start + credit),
        // TAB-ын дараа "0" + ending балансаас эхлэж буй token гэж тогтоомжид суурилна.
        //
        // Дебит мөр (бид алгасна) нь өөр хэлбэртэй: TAB-ын өмнө 2 тоо, дараа "0-XXX..."

        $pattern = '~
            (\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})  # 1: date, 2: time
            \s*\d{4,5}                                  # branch (нийлчсэн ч ажиллана)
            \s+ [\d.]+                                  # эхний үлдэгдэл
            \s+ ([\d.]+)                                # 3: credit
            \s+ 0 ([\d.]+)                              # 4: ending (debit "0"-той нийлчсэн)
            \s+ (.+?)                                   # 5: description (greedy биш)
            (?: \s+ (\d{8,16}) )?                       # 6: partner (заримдаа байхгүй)
            (?= \s* (?:\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}|Нийт\sдүн|$) )
        ~suxi';

        if (preg_match_all($pattern, $text, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                $date    = $m[1];
                $time    = $m[2];
                $credit  = self::toNumber($m[3]);
                $desc    = trim($m[5]);
                $partner = $m[6] ?? null;

                if ($credit <= 0)             continue;
                if (self::isFeeRow($desc))    continue;
                if ($desc === '')             continue;

                $credits[] = [
                    'datetime'    => "$date $time",
                    'date'        => $date,
                    'time'        => $time,
                    'amount'      => (int) round($credit),
                    'description' => $desc,
                    'partner'     => $partner,
                ];
            }
        }

        return [
            'account_number'   => $accountNumber,
            'account_holder'   => $accountHolder,
            'period_from'      => $periodFrom ?: ($credits[0]['date'] ?? null),
            'period_to'        => $periodTo   ?: ($credits[count($credits) - 1]['date'] ?? null),
            'credits'          => $credits,
        ];
    }

    // ─────────────────────────────────────────────────────────
    // Excel  (Хаан банкны standart Excel format)
    // Толгойн нэрсээс баганын байрлалыг автоматаар олно (хатуу index биш).
    // ─────────────────────────────────────────────────────────
    public function parseExcel(UploadedFile $file): array
    {
        $rows = \Maatwebsite\Excel\Facades\Excel::toArray(null, $file->getRealPath());
        $sheet = $rows[0] ?? [];

        $accountNumber = '';
        $accountHolder = '';
        $periodFrom    = '';
        $periodTo      = '';
        $credits = [];

        $headerRowIdx = null;
        $colDate = $colBranch = $colStart = $colCredit = $colDebit = $colEnd = $colDesc = $colPartner = null;

        // 1) Header мөрийг олно + meta info уншина
        foreach ($sheet as $i => $row) {
            $joined = mb_strtolower(implode(' ', array_map(fn ($c) => self::cellToString($c), $row)));
            if ($accountHolder === '' && str_contains($joined, 'хэрэглэгч')) {
                // "Хэрэглэгч:" гэсэн нүдний дараагийн утгыг авна
                $foundLabel = false;
                foreach ($row as $c) {
                    $s = trim(self::cellToString($c));
                    if (! $foundLabel && preg_match('/хэрэглэгч/iu', $s)) {
                        $foundLabel = true;
                        continue;
                    }
                    if ($foundLabel && $s !== '') {
                        $accountHolder = $s;
                        break;
                    }
                }
            }
            if ($accountNumber === '' && preg_match('/MN\d{2}\d{4}(\d{10,14})/i', $joined, $m)) {
                $accountNumber = ltrim($m[1], '0');
            }
            if ($periodFrom === '' && preg_match('/интервал.*?(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/u', $joined, $m)) {
                $periodFrom = $m[1];
                $periodTo   = $m[2];
            }

            // Header мөр илрүүлэх — "гүйлгээний огноо" эсвэл "кредит гүйлгээ" гэсэн утгатай мөр
            if ($headerRowIdx === null && (str_contains($joined, 'гүйлгээний огноо') || str_contains($joined, 'кредит гүйлгээ'))) {
                $headerRowIdx = $i;
                foreach ($row as $idx => $c) {
                    $h = mb_strtolower(trim(self::cellToString($c)));
                    if ($h === '') continue;
                    if (str_contains($h, 'огноо'))      $colDate    = $idx;
                    elseif (str_contains($h, 'салбар')) $colBranch  = $idx;
                    elseif (str_contains($h, 'эхний'))  $colStart   = $idx;
                    elseif (str_contains($h, 'кредит')) $colCredit  = $idx;
                    elseif (str_contains($h, 'дебит'))  $colDebit   = $idx;
                    elseif (str_contains($h, 'эцсийн')) $colEnd     = $idx;
                    elseif (str_contains($h, 'утга'))   $colDesc    = $idx;
                    elseif (str_contains($h, 'харьцсан')) $colPartner = $idx;
                }
            }
        }

        if ($headerRowIdx === null || $colDate === null || $colCredit === null || $colDesc === null) {
            return [
                'account_number' => $accountNumber,
                'account_holder' => $accountHolder,
                'period_from'    => $periodFrom ?: null,
                'period_to'      => $periodTo ?: null,
                'credits'        => [],
            ];
        }

        // 2) Header дараах мөрүүдээс гүйлгээ унших
        for ($i = $headerRowIdx + 1; $i < count($sheet); $i++) {
            $row = $sheet[$i];
            if (empty(array_filter($row, fn ($c) => trim(self::cellToString($c)) !== ''))) continue;

            // Огноо — string, DateTime, эсвэл Excel serial (float) байж болно
            [$date, $time] = self::parseDateCell($row[$colDate] ?? null);
            if ($date === null) continue;

            $credit = self::toNumber(self::cellToString($row[$colCredit] ?? ''));
            $desc   = trim(self::cellToString($row[$colDesc] ?? ''));
            $partner = $colPartner !== null ? trim(self::cellToString($row[$colPartner] ?? '')) : null;

            if ($credit <= 0) continue;
            if (self::isFeeRow($desc)) continue;
            if ($desc === '') continue;

            $credits[] = [
                'datetime'    => "$date $time",
                'date'        => $date,
                'time'        => $time,
                'amount'      => (int) round($credit),
                'description' => $desc,
                'partner'     => $partner ?: null,
            ];
        }

        return [
            'account_number' => $accountNumber,
            'account_holder' => $accountHolder,
            'period_from'    => $periodFrom ?: ($credits[0]['date'] ?? null),
            'period_to'      => $periodTo ?: ($credits[count($credits) - 1]['date'] ?? null),
            'credits'        => $credits,
        ];
    }

    /**
     * Огнооны нүдийг (string / DateTime / Excel serial float) → ['Y-m-d', 'H:i:s'] хэлбэрт хувиргана.
     *
     * @return array{0: string|null, 1: string}
     */
    private static function parseDateCell(mixed $value): array
    {
        if ($value === null || $value === '') return [null, '00:00:00'];

        // DateTime обьект
        if ($value instanceof \DateTimeInterface) {
            return [$value->format('Y-m-d'), $value->format('H:i:s')];
        }

        // Excel serial (float тоо) — PhpSpreadsheet-ийн helper-аар
        if (is_numeric($value)) {
            try {
                $dt = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float) $value);
                return [$dt->format('Y-m-d'), $dt->format('H:i:s')];
            } catch (\Throwable) {
                // ignore
            }
        }

        // String
        $s = trim((string) $value);
        if (preg_match('/(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?/u', $s, $m)) {
            return [$m[1], $m[2] ?? '00:00:00'];
        }
        // Format жишээ: "5/13/2026 10:04:39"
        $ts = strtotime($s);
        if ($ts !== false) {
            return [date('Y-m-d', $ts), date('H:i:s', $ts)];
        }
        return [null, '00:00:00'];
    }

    /**
     * Excel нүдийг найдвартай string болгож хувиргана (DateTime, float гэх мэт).
     */
    private static function cellToString(mixed $value): string
    {
        if ($value === null) return '';
        if ($value instanceof \DateTimeInterface) return $value->format('Y-m-d H:i:s');
        return (string) $value;
    }

    // ─────────────────────────────────────────────────────────
    // CSV — Excel-ийн адил формат
    // ─────────────────────────────────────────────────────────
    public function parseCsv(UploadedFile $file): array
    {
        return $this->parseExcel($file);
    }

    // ─────────────────────────────────────────────────────────
    // Туслах
    // ─────────────────────────────────────────────────────────
    private static function toNumber(string $value): float
    {
        $v = str_replace([',', ' '], '', trim($value));
        if ($v === '' || $v === '-') return 0;
        return (float) $v;
    }

    private static function isFeeRow(string $description): bool
    {
        $lower = mb_strtolower($description);
        foreach (self::SKIP_KEYWORDS as $kw) {
            if (str_contains($lower, $kw)) return true;
        }
        return false;
    }
}
