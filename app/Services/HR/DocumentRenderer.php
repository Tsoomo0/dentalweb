<?php

namespace App\Services\HR;

use App\Models\HR\Employee;
use App\Models\Setting;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * Гэрээ / ажлын байрны тодорхойлолтын загварт байгаа {{placeholder}}-уудыг
 * тухайн ажилтны бодит мэдээллээр орлуулна.
 */
class DocumentRenderer
{
    /**
     * Загварт ашиглаж болох бүх орлуулга — HR талын "Талбар оруулах"
     * цэс мөн эндээс уншина.
     *
     * @return array<int, array{group: string, items: array<int, array{key: string, label: string}>}>
     */
    public static function catalog(): array
    {
        return [
            [
                'group' => 'Ажилтан',
                'items' => [
                    ['key' => 'employee_name', 'label' => 'Ажилтны нэр (Б.Билгүүн)'],
                    ['key' => 'employee_full_name', 'label' => 'Ажилтны бүтэн нэр'],
                    ['key' => 'employee_last_name', 'label' => 'Овог'],
                    ['key' => 'employee_first_name', 'label' => 'Нэр'],
                    ['key' => 'employee_register', 'label' => 'Регистрийн дугаар'],
                    ['key' => 'employee_address', 'label' => 'Оршин суух хаяг'],
                    ['key' => 'employee_phone', 'label' => 'Утасны дугаар'],
                    ['key' => 'employee_email', 'label' => 'И-мэйл хаяг'],
                    ['key' => 'employee_birth_date', 'label' => 'Төрсөн огноо'],
                ],
            ],
            [
                'group' => 'Ажлын байр',
                'items' => [
                    ['key' => 'position', 'label' => 'Албан тушаал'],
                    ['key' => 'branch', 'label' => 'Салбар / нэгж'],
                    ['key' => 'hired_date', 'label' => 'Ажилд орсон огноо'],
                    ['key' => 'probation_end_date', 'label' => 'Туршилтын хугацаа дуусах'],
                    ['key' => 'salary', 'label' => 'Сарын үндсэн цалин (тоогоор)'],
                    ['key' => 'salary_text', 'label' => 'Сарын үндсэн цалин (үсгээр)'],
                    ['key' => 'contract_term', 'label' => 'Гэрээний хугацаа'],
                    ['key' => 'work_condition', 'label' => 'Хөдөлмөрийн нөхцөл'],
                ],
            ],
            [
                'group' => 'Байгууллага',
                'items' => [
                    ['key' => 'company_name', 'label' => 'Компанийн нэр'],
                    ['key' => 'director_name', 'label' => 'Захирлын нэр'],
                    ['key' => 'director_position', 'label' => 'Захирлын албан тушаал'],
                    ['key' => 'lawyer_name', 'label' => 'Хуулийн зөвлөхийн нэр'],
                ],
            ],
            [
                'group' => 'Баримт',
                'items' => [
                    ['key' => 'doc_number', 'label' => 'Гэрээний дугаар'],
                    ['key' => 'doc_date', 'label' => 'Байгуулсан огноо (2026 оны 09 сарын 02)'],
                    ['key' => 'doc_year', 'label' => 'Он'],
                    ['key' => 'doc_month', 'label' => 'Сар'],
                    ['key' => 'doc_day', 'label' => 'Өдөр'],
                    ['key' => 'effective_date', 'label' => 'Хүчин төгөлдөр болох огноо'],
                    ['key' => 'city', 'label' => 'Хот'],
                ],
            ],
        ];
    }

    /** Каталогийн бүх түлхүүрийг хавтгай жагсаалт болгож буцаана. */
    public static function keys(): array
    {
        $keys = [];
        foreach (self::catalog() as $group) {
            foreach ($group['items'] as $item) {
                $keys[] = $item['key'];
            }
        }

        return $keys;
    }

    /**
     * Ажилтан + гараар оруулсан утгуудаас орлуулгын массив бэлтгэнэ.
     *
     * @param  array<string, mixed>  $overrides  HR талаас гараар зассан утгууд
     */
    public static function variables(Employee $employee, array $overrides = [], ?CarbonInterface $date = null): array
    {
        $date = $date ? Carbon::parse($date) : Carbon::now();
        $salary = $overrides['salary'] ?? ($employee->salary !== null ? (float) $employee->salary : null);

        $vars = [
            'employee_name' => self::shortName($employee),
            'employee_full_name' => trim(($employee->last_name ?? '').' '.($employee->first_name ?? '')),
            'employee_last_name' => $employee->last_name ?? '',
            'employee_first_name' => $employee->first_name ?? '',
            'employee_register' => $employee->register_number ?? '',
            'employee_address' => $employee->address ?? '',
            'employee_phone' => $employee->phone ?? '',
            'employee_email' => $employee->email ?? '',
            'employee_birth_date' => $employee->birth_date ? $employee->birth_date->format('Y-m-d') : '',

            'position' => $employee->position?->name ?? '',
            'branch' => $employee->branch?->name ?? '',
            'hired_date' => $employee->hired_date ? $employee->hired_date->format('Y-m-d') : '',
            'probation_end_date' => $employee->probation_end_date ? $employee->probation_end_date->format('Y-m-d') : '',
            'salary' => $salary !== null ? number_format((float) $salary) : '',
            'salary_text' => $salary !== null ? self::moneyInWords((float) $salary) : '',
            'contract_term' => 'Хугацаагүй',
            'work_condition' => 'Хэвийн',

            'company_name' => Setting::get('company_legal_name', '“Кутикул” ХХК'),
            'director_name' => Setting::get('director_name', 'Ж. Оюунбилэг'),
            'director_position' => Setting::get('director_position', 'Гүйцэтгэх захирал'),
            'lawyer_name' => Setting::get('company_lawyer_name', 'Б. Дөлгөөн'),

            'doc_number' => '',
            'doc_date' => $date->year.' оны '.$date->format('m').' сарын '.$date->format('d'),
            'doc_year' => (string) $date->year,
            'doc_month' => $date->format('m'),
            'doc_day' => $date->format('d'),
            'effective_date' => $date->format('Y-m-d'),
            'city' => 'Улаанбаатар хот',
        ];

        // Гараар зассан утга үргэлж давамгайлна — HR тухайн гэрээнд
        // цалин, хугацаа зэргийг өөрчилж болно.
        foreach ($overrides as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $vars[$key] = (string) $value;
        }

        // Цалинг гараар зассан бол үсгээр бичсэн хэлбэрийг дахин тооцно.
        if (isset($overrides['salary']) && ! isset($overrides['salary_text']) && is_numeric(str_replace([',', ' '], '', (string) $overrides['salary']))) {
            $raw = (float) str_replace([',', ' '], '', (string) $overrides['salary']);
            $vars['salary'] = number_format($raw);
            $vars['salary_text'] = self::moneyInWords($raw);
        }

        return $vars;
    }

    /**
     * Загварын биед орлуулга хийнэ. Утга нь HTML рүү орж байгаа тул
     * тэмдэгтүүдийг escape хийж, зөвхөн загварын өөрийнх нь HTML үлдээнэ.
     */
    public static function render(string $body, array $variables): string
    {
        return preg_replace_callback('/\{\{\s*([a-z0-9_]+)\s*\}\}/i', function ($m) use ($variables) {
            $key = strtolower($m[1]);

            if (! array_key_exists($key, $variables)) {
                return $m[0];
            }

            return e((string) $variables[$key]);
        }, $body) ?? $body;
    }

    /** Загварт орлуулагдаагүй үлдсэн талбаруудыг олно (анхааруулга харуулахад). */
    public static function missingKeys(string $body, array $variables): array
    {
        preg_match_all('/\{\{\s*([a-z0-9_]+)\s*\}\}/i', $body, $matches);

        $missing = [];
        foreach ($matches[1] ?? [] as $key) {
            $key = strtolower($key);
            if (! array_key_exists($key, $variables) || $variables[$key] === '') {
                $missing[$key] = true;
            }
        }

        return array_keys($missing);
    }

    /** "Баясгалан" + "Билгүүн" → "Б.Билгүүн" */
    public static function shortName(Employee $employee): string
    {
        $last = trim((string) $employee->last_name);
        $first = trim((string) $employee->first_name);

        if ($last === '') {
            return $first;
        }

        return mb_substr($last, 0, 1).'.'.$first;
    }

    // ── Тоог үсгээр бичих ────────────────────────────────────────────────────

    /** 1200000 → "нэг сая хоёр зуун мянган төгрөг" */
    public static function moneyInWords(float $amount): string
    {
        $whole = (int) round($amount);
        $words = self::numberInWords($whole);

        return $words === '' ? '' : $words.' төгрөг';
    }

    /**
     * Тоог монгол үсгээр (тодотгох хэлбэрээр) бичнэ.
     * Тодотгох хэлбэр гэдэг нь "хоёр зуун мянган төгрөг" гэх мэт дараагийн
     * үгээ тодотгож байгаа хэлбэр — гэрээнд ийм хэлбэрээр бичигддэг.
     */
    public static function numberInWords(int $number): string
    {
        if ($number === 0) {
            return 'тэг';
        }

        $negative = $number < 0;
        $number = abs($number);

        $scales = ['', 'мянган', 'сая', 'тэрбум', 'их наяд'];

        // Гурав гурваар нь баруунаас нь бүлэглэнэ
        $groups = [];
        while ($number > 0) {
            $groups[] = $number % 1000;
            $number = intdiv($number, 1000);
        }

        $parts = [];
        for ($i = count($groups) - 1; $i >= 0; $i--) {
            if ($groups[$i] === 0) {
                continue;
            }
            $chunk = self::threeDigitsInWords($groups[$i]);
            $scale = $scales[$i] ?? '';
            $parts[] = trim($chunk.($scale !== '' ? ' '.$scale : ''));
        }

        $result = implode(' ', $parts);

        return $negative ? 'хасах '.$result : $result;
    }

    private static function threeDigitsInWords(int $n): string
    {
        // Тодотгох хэлбэр: "гурван", "дөрвөн" гэх мэт
        $ones = [1 => 'нэг', 'хоёр', 'гурван', 'дөрвөн', 'таван', 'зургаан', 'долоон', 'найман', 'есөн'];
        $tens = [1 => 'арван', 'хорин', 'гучин', 'дөчин', 'тавин', 'жаран', 'далан', 'наян', 'ерэн'];

        $words = [];

        $h = intdiv($n, 100);
        if ($h > 0) {
            $words[] = $ones[$h].' зуун';
        }

        $rest = $n % 100;
        $t = intdiv($rest, 10);
        if ($t > 0) {
            $words[] = $tens[$t];
        }

        $o = $rest % 10;
        if ($o > 0) {
            $words[] = $ones[$o];
        }

        return implode(' ', $words);
    }
}
