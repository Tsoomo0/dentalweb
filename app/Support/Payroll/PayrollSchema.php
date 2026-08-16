<?php

namespace App\Support\Payroll;

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

/**
 * Эхэн / сүүл цалингийн хүснэгтийн бүтэц — БҮХ ГАЗРЫН ЦОРЫН ГАНЦ ЭХ СУРВАЛЖ.
 *
 * Энд нэг л удаа тодорхойлсноор дараах бүх зүйл автоматаар нийцнэ:
 *   · Систем дэх хүснэгт (hr/payroll/show.tsx)
 *   · Import template Excel (томьёотой)
 *   · Excel export (томьёотой)
 *   · Import уншилт
 *   · Ажилтны цалингийн задаргаа + имэйл
 *
 * Багана нэмэх/томьёо засах бол ЗӨВХӨН энэ файлыг өөрчилнө.
 *
 * Талбарын утга:
 *   key       — payroll_entries хүснэгтийн баганын нэр
 *   label     — дэлгэц/Excel дээр харагдах нэр
 *   group     — баганын бүлэг (толгой мөрөнд нэгтгэж харуулна)
 *   formula   — байвал автоматаар бодогдоно, байхгүй бол гараар оруулна
 *   linked    — өөр тооцооноос татагдана (эхэн цалингийн банкаар олгох дүн)
 *   overridable — томьёотой ч нягтлан гараар дарж бичиж болно
 *   default   — шинэ тооцоо үүсгэхэд бөглөгдөх утга
 *   int       — бүхэл тоо (минут, ширхэг)
 *   decimal   — бутархайг харуулна (ажилласан өдөр, банкаар олгох).  Бусад
 *               багана бүхэлчилж харагдана ч дотроо нарийвчлалаа хадгална.
 *   virtual   — зөвхөн харуулах/экспортлох, DB-д хадгалахгүй
 *   highlight — онцолж харуулах (Гарт олгох / Банкаар олгох)
 */
class PayrollSchema
{
    /** НДШ-ийн дээд хязгаар: 7,920,000₮ × 11.5% = 910,800₮ */
    public const NDSH_CAP_BASE = 7920000;

    public const NDSH_CAP_AMOUNT = 910800;

    /** 1 минут хоцролт / 1 удаа хуруу дараагүйн суутгал */
    public const TARDY_PER_MINUTE = 500;

    public const FINGERPRINT_PENALTY = 15000;

    /** ХХОАТ-ын сарын хөнгөлөлт */
    public const TAX_CREDIT = 14000;

    /** Шинэ тооцоо үүсгэхэд өгөгдмөлөөр бөглөгдөх нэгжийн үнэлгээ */
    public const FOOD_RATE_DEFAULT = 10000;

    public const MILK_RATE_DEFAULT = 2000;

    /**
     * ЭХЭН ЦАЛИН — 27 багана (Excel дээр D..AD)
     *
     * Эхэн хагаст НДШ/ХХОАТ суутгахгүй — татварыг сүүл цалин дээр
     * сарын нийт дүнгээс нэг удаа бодно.
     */
    private static function firstHalf(): array
    {
        return [
            ['key' => 'basic_salary',   'label' => 'Үндсэн цалин',      'group' => 'Үндсэн'],
            ['key' => 'advance_salary', 'label' => 'Урьдчилгаа цалин',  'group' => 'Үндсэн',
                'formula' => '{basic_salary} / 2'],

            ['key' => 'working_days', 'label' => 'Ажиллавал зохих өдөр', 'group' => 'Өдөр', 'int' => true, 'sum' => false],
            ['key' => 'worked_days',  'label' => 'Ажилласан өдөр', 'decimal' => true,       'group' => 'Өдөр', 'sum' => false],
            ['key' => 'daily_rate',   'label' => '1 өдрийн цалин',       'group' => 'Өдөр',
                'formula' => 'IFERROR({advance_salary} / {working_days}, 0)'],

            ['key' => 'ath_bonus',      'label' => 'А.Т.Х 40%',     'group' => 'Нэмэгдэл'],
            ['key' => 'percent_salary', 'label' => 'Хувь цалин',    'group' => 'Нэмэгдэл'],
            ['key' => 'overtime_bonus', 'label' => 'Илүү цаг',      'group' => 'Нэмэгдэл'],
            ['key' => 'reward',         'label' => 'Урамшуулал',    'group' => 'Нэмэгдэл'],
            ['key' => 'hazard_bonus',   'label' => 'Хортой нөхцөл 10% болон зэргийн нэмэгдэл', 'group' => 'Нэмэгдэл'],
            ['key' => 'vacation_pay',   'label' => 'Ээлж.амр+хувь', 'group' => 'Нэмэгдэл'],

            ['key' => 'food_rate', 'label' => '1 өдрийн хоол унаа', 'group' => 'Хоол · Сүү',
                'default' => self::FOOD_RATE_DEFAULT],
            ['key' => 'food',      'label' => 'Олгосон хоол унаа',  'group' => 'Хоол · Сүү'],
            ['key' => 'milk_rate', 'label' => '1 өдрийн сүү',       'group' => 'Хоол · Сүү',
                'default' => self::MILK_RATE_DEFAULT],
            ['key' => 'milk',      'label' => 'Олгосон сүү',        'group' => 'Хоол · Сүү'],

            ['key' => 'total_bonus', 'label' => 'Нийт нэмэгдэл', 'group' => 'Нийт нэмэгдэл',
                'formula' => '{ath_bonus} + {percent_salary} + {overtime_bonus} + {reward} '
                            .'+ {hazard_bonus} + {vacation_pay} + {food} + {milk}'],

            ['key' => 'tardy_minutes',      'label' => 'Хоцорсон минутын тоо',   'group' => 'Суутгал', 'int' => true],
            ['key' => 'tardiness',          'label' => 'Хоцролт', 'counter' => ['key' => 'tardy_minutes', 'unit' => 'минут'],                'group' => 'Суутгал',
                'formula' => '{tardy_minutes} * '.self::TARDY_PER_MINUTE],
            ['key' => 'fingerprint_misses', 'label' => 'Хийгээгүй хурууны тоо',  'group' => 'Суутгал', 'int' => true],
            ['key' => 'no_fingerprint',     'label' => 'Хуруу', 'counter' => ['key' => 'fingerprint_misses', 'unit' => 'удаа'],                  'group' => 'Суутгал',
                'formula' => '{fingerprint_misses} * '.self::FINGERPRINT_PENALTY],
            ['key' => 'other_deduction',    'label' => 'Суутгал',                'group' => 'Суутгал'],
            ['key' => 'total_deduction',    'label' => 'Нийт суутгал',           'group' => 'Суутгал',
                'formula' => '{tardiness} + {no_fingerprint} + {other_deduction}'],

            ['key' => 'worked_salary', 'label' => 'Ажилласан өдрөөр цалин', 'group' => 'Тооцоо',
                'formula' => '{worked_days} * {daily_rate}'],
            ['key' => 'calc_salary',   'label' => 'Тооцсон цалин нийт',     'group' => 'Тооцоо',
                'formula' => '{worked_salary} + {total_bonus} - {total_deduction}'],
            ['key' => 'ndsh',          'label' => 'НДШ 11.5% ХХОАТ',        'group' => 'Тооцоо'],

            ['key' => 'net_hand',    'label' => 'Гарт олгох',    'group' => 'Гарт · Банк', 'highlight' => true, 'overridable' => true, 'decimal' => true,
                'formula' => '{calc_salary} - {ndsh}'],
            ['key' => 'bank_salary', 'label' => 'Банкаар олгох', 'group' => 'Гарт · Банк', 'highlight' => true, 'overridable' => true, 'decimal' => true,
                'formula' => '{net_hand}'],
        ];
    }

    /**
     * СҮҮЛ ЦАЛИН — 33 багана (Excel дээр D..AJ)
     *
     * Сарын нийт НД цалингаас НДШ болон ХХОАТ-ыг энд нэг удаа бодож,
     * эхэн хагаст олгосон урьдчилгааг банкаар олгохоос хасна.
     */
    private static function secondHalf(): array
    {
        return [
            ['key' => 'basic_salary',    'label' => 'Үндсэн цалин',     'group' => 'Үндсэн'],
            ['key' => 'nd_salary',       'label' => 'НД цалин',         'group' => 'Үндсэн',
                'formula' => '{basic_salary} / 2'],
            // Мөн сар/салбарын ЭХЭН цалингийн "Банкаар олгох" дүнгээс шууд татагдана.
            // Өөр тооцооны мөрөөс хамаардаг тул томьёогоор бодох боломжгүй —
            // PayrollController::firstHalfValues() серверийн талд бөглөнө.
            ['key' => 'prev_paid',       'label' => 'Олгосон урьдчилгаа цалин', 'group' => 'Үндсэн',
                'linked' => 'bank_salary'],
            ['key' => 'holiday_advance', 'label' => 'Баярын урьд',      'group' => 'Үндсэн'],

            ['key' => 'working_days', 'label' => 'Ажилвал зохих өдөр', 'group' => 'Өдөр', 'int' => true, 'sum' => false],
            ['key' => 'worked_days',  'label' => 'Ажилласан өдөр', 'decimal' => true,     'group' => 'Өдөр', 'sum' => false],
            ['key' => 'daily_rate',   'label' => '1 өдрийн цалин',     'group' => 'Өдөр',
                'formula' => 'IFERROR({nd_salary} / {working_days}, 0)'],

            // Эхэн цалин дээр суутгасан НДШ/ХХОАТ.  "Олгосон урьдчилгаа цалин" нь
            // татвараа хассан ЦЭВЭР дүн тул энэ суутгалыг буцааж нэмэгдэлд оруулж
            // байж сарын татварын суурь НИЙТ дүн болно.
            ['key' => 'prev_ndsh',      'label' => 'НДШ 11.5% ХХОАТ (эхэн)', 'group' => 'Эхэн цалингаас',
                'linked' => 'ndsh', 'role' => 'earning'],

            ['key' => 'ath_bonus',      'label' => 'А.Т.Х 40%',      'group' => 'Нэмэгдэл'],
            ['key' => 'percent_salary', 'label' => 'Хувь цалин',     'group' => 'Нэмэгдэл'],
            ['key' => 'overtime_bonus', 'label' => 'Илүү цаг',       'group' => 'Нэмэгдэл'],
            ['key' => 'reward',         'label' => 'Урамшуулал',     'group' => 'Нэмэгдэл'],
            ['key' => 'hazard_bonus',   'label' => 'Хортой нөхцөл 10% болон зэргийн нэмэгдэл', 'group' => 'Нэмэгдэл'],
            ['key' => 'vacation_pay',   'label' => 'Ээлжийн амралт', 'group' => 'Нэмэгдэл'],

            ['key' => 'food_rate', 'label' => '1 өдрийн хоол унаа', 'group' => 'Хоол · Сүү',
                'default' => self::FOOD_RATE_DEFAULT],
            ['key' => 'food',      'label' => 'Олгосон хоол унаа',  'group' => 'Хоол · Сүү'],
            ['key' => 'milk_rate', 'label' => '1 өдрийн сүү',       'group' => 'Хоол · Сүү',
                'default' => self::MILK_RATE_DEFAULT],
            ['key' => 'milk',      'label' => 'Олгосон сүү',        'group' => 'Хоол · Сүү'],

            // Эхэн хагаст суутгасан НДШ/ХХОАТ энд буцаж нэмэгдэнэ
            ['key' => 'total_bonus', 'label' => 'Нийт нэмэгдэл', 'group' => 'Нийт нэмэгдэл',
                'formula' => '{ath_bonus} + {percent_salary} + {overtime_bonus} + {reward} '
                            .'+ {hazard_bonus} + {vacation_pay} + {food} + {milk} + {prev_ndsh}'],

            ['key' => 'tardy_minutes',      'label' => 'Хоцорсон болон цагаас эрт явсан минутын тоо',
                'group' => 'Суутгал', 'int' => true],
            ['key' => 'tardiness',          'label' => 'Хоцролт', 'counter' => ['key' => 'tardy_minutes', 'unit' => 'минут'],               'group' => 'Суутгал',
                'formula' => '{tardy_minutes} * '.self::TARDY_PER_MINUTE],
            ['key' => 'fingerprint_misses', 'label' => 'Хийгээгүй хурууны тоо', 'group' => 'Суутгал', 'int' => true],
            ['key' => 'no_fingerprint',     'label' => 'Хуруу', 'counter' => ['key' => 'fingerprint_misses', 'unit' => 'удаа'],                 'group' => 'Суутгал',
                'formula' => '{fingerprint_misses} * '.self::FINGERPRINT_PENALTY],
            ['key' => 'other_deduction',    'label' => 'Суутгал',               'group' => 'Суутгал'],
            ['key' => 'total_deduction',    'label' => 'Нийт суутгал',          'group' => 'Суутгал',
                'formula' => '{tardiness} + {no_fingerprint} + {other_deduction}'],

            ['key' => 'worked_salary', 'label' => 'Ажилласан өдрөөр цалин', 'group' => 'Тооцоо',
                'formula' => '{daily_rate} * {worked_days}'],
            ['key' => 'calc_salary',   'label' => 'Тооцсон цалин нийт',     'group' => 'Тооцоо',
                'formula' => '{worked_salary} + {total_bonus} - {total_deduction}'],
            ['key' => 'nd_total',      'label' => 'Нийт НД цалин',          'group' => 'Тооцоо',
                'formula' => '{prev_paid} + {holiday_advance} + {calc_salary}'],

            ['key' => 'ndsh',           'label' => 'НДШ 11.5%', 'group' => 'НДШ / ХХОАТ', 'overridable' => true,
                'formula' => 'IF({nd_total} > '.self::NDSH_CAP_BASE.', '.self::NDSH_CAP_AMOUNT.', {nd_total} * 0.115)'],
            ['key' => 'income_tax',     'label' => 'ХХОАТ 10%', 'group' => 'НДШ / ХХОАТ', 'overridable' => true,
                'formula' => '({nd_total} - {ndsh}) * 0.1 - '.self::TAX_CREDIT],
            ['key' => 'ndsh_tax_total', 'label' => 'НДШ+ХХОАТ',  'group' => 'НДШ / ХХОАТ', 'virtual' => true,
                'formula' => '{ndsh} + {income_tax}'],

            ['key' => 'net_hand',       'label' => 'Нийт гарт олгох',       'group' => 'Гарт · Банк', 'highlight' => true, 'overridable' => true, 'decimal' => true,
                'formula' => '{nd_total} - {ndsh_tax_total}'],
            ['key' => 'bank_salary',    'label' => 'Банкаар олгох',         'group' => 'Гарт · Банк', 'highlight' => true, 'overridable' => true, 'decimal' => true,
                'formula' => '{net_hand} - {prev_paid} - {holiday_advance} - {hand_deduction}'],
            ['key' => 'hand_deduction', 'label' => 'Гарт олгохоос суутгах', 'group' => 'Гарт · Банк'],
        ];
    }

    /**
     * Ажилтны цалингийн задаргаанд багана ямар үүрэгтэй харагдахыг заана.
     *   earning   — орлого / нэмэгдэл
     *   deduction — суутгагдах дүн
     *   day       — өдрийн тоо ба өдрийн үнэлгээ
     *   rate      — нэгжийн үнэлгээ (задаргаанд харуулахгүй)
     *   total     — дүнгийн мөр
     *   payout    — эцсийн олгох дүн
     */
    private const GROUP_ROLES = [
        'Үндсэн' => 'earning',
        'Өдөр' => 'day',
        'Эхэн цалингаас' => 'reference',
        'Нэмэгдэл' => 'earning',
        'Хоол · Сүү' => 'earning',
        'Нийт нэмэгдэл' => 'total',
        'Суутгал' => 'deduction',
        'Тооцоо' => 'total',
        'НДШ / ХХОАТ' => 'deduction',
        'Гарт · Банк' => 'payout',
    ];

    /** Бүлгээсээ өөр үүрэгтэй тусгай баганууд. */
    private const ROLE_OVERRIDES = [
        'food_rate' => 'rate',
        'milk_rate' => 'rate',
        'tardy_minutes' => 'rate',
        'fingerprint_misses' => 'rate',
        // Урьдчилгаа болон баярын урьд нь аль хэдийн олгогдсон тул
        // банкаар олгохоос хасагдана — задаргаанд суутгал талд харагдана
        'prev_paid' => 'deduction',
        'holiday_advance' => 'deduction',
        'hand_deduction' => 'deduction',
        // Эхэн цалин дээр "Тооцоо" бүлэгт байрладаг ч утгаараа суутгал
        'ndsh' => 'deduction',
        // Дараах хоёр нь өөрсдийнхөө бүрэлдэхүүн мөрүүдийн шууд нийлбэр —
        // задаргаанд давхардуулж харуулахгүй
        'ndsh_tax_total' => 'reference',
        'total_deduction' => 'reference',
    ];

    /** Бүлгийн өнгө (Tailwind class) — дэлгэцэнд ашиглана. */
    private const GROUP_COLORS = [
        'Үндсэн' => 'slate',
        'Өдөр' => 'violet',
        'Эхэн цалингаас' => 'sky',
        'Нэмэгдэл' => 'blue',
        'Хоол · Сүү' => 'orange',
        'Нийт нэмэгдэл' => 'cyan',
        'Суутгал' => 'red',
        'Тооцоо' => 'teal',
        'НДШ / ХХОАТ' => 'purple',
        'Гарт · Банк' => 'emerald',
    ];

    /**
     * Тухайн хагасын бүх багана — нэмэлт талбарууд нь бөглөгдсөн байдлаар.
     *
     * @return array<int, array{key:string, label:string, group:string, color:string, role:string,
     *                          formula:?string, int:bool, virtual:bool, highlight:bool, sum:bool,
     *                          linked:bool, overridable:bool, default:float}>
     */
    public static function columns(string $half): array
    {
        $raw = $half === 'first' ? self::firstHalf() : self::secondHalf();

        return array_map(fn (array $c) => [
            'key' => $c['key'],
            'label' => $c['label'],
            'group' => $c['group'],
            'color' => self::GROUP_COLORS[$c['group']] ?? 'slate',
            'role' => $c['role'] ?? self::ROLE_OVERRIDES[$c['key']] ?? self::GROUP_ROLES[$c['group']] ?? 'earning',
            'formula' => $c['formula'] ?? null,
            'int' => $c['int'] ?? false,
            // Бутархайг харуулах эсэх.  Утга нь дотроо үргэлж бүрэн нарийвчлалтай
            // хадгалагдана — энэ нь зөвхөн ХАРУУЛАХ хэлбэрийг заана.
            'decimal' => $c['decimal'] ?? false,
            'virtual' => $c['virtual'] ?? false,
            'highlight' => $c['highlight'] ?? false,
            // Эхэн цалингийн аль баганаас татагдахыг заана (гараар оруулахгүй)
            'linked' => $c['linked'] ?? null,
            // Ажилтны задаргаанд дүнгийн хажууд харуулах тоо ширхэг
            // (Хоцролт 27,500₮ → "Хоцролт (55 минут)")
            'counter' => $c['counter'] ?? null,
            // Томьёотой ч гараар дарж бичиж болох эсэх
            'overridable' => $c['overridable'] ?? false,
            // Шинэ тооцоо үүсгэхэд бөглөгдөх утга
            'default' => $c['default'] ?? 0,
            // Ажлын өдрийн тоог ажилтан хооронд нэмэх утгагүй тул нийлбэрээс хасна
            'sum' => $c['sum'] ?? true,
        ], $raw);
    }

    /** Бүлгүүд дараалалаараа, багана тус бүрийн тоотой (colspan-д хэрэглэнэ). */
    public static function groups(string $half): array
    {
        $groups = [];

        foreach (self::columns($half) as $col) {
            $last = count($groups) - 1;

            if ($last >= 0 && $groups[$last]['label'] === $col['group']) {
                $groups[$last]['span']++;
            } else {
                $groups[] = ['label' => $col['group'], 'color' => $col['color'], 'span' => 1];
            }
        }

        return $groups;
    }

    /** Гараар оруулах баганы нэрс. */
    public static function inputKeys(string $half): array
    {
        return array_values(array_map(
            fn ($c) => $c['key'],
            array_filter(self::columns($half), fn ($c) => $c['formula'] === null)
        ));
    }

    /**
     * Эхэн цалингаас татагддаг баганууд.
     *
     * @return array<string, string> энэ хагасын багана → эхэн цалингийн эх багана
     */
    public static function linkedSources(string $half): array
    {
        $out = [];

        foreach (self::columns($half) as $col) {
            if ($col['linked'] !== null) {
                $out[$col['key']] = $col['linked'];
            }
        }

        return $out;
    }

    /** DB-д хадгалагдах баганы нэрс (virtual-ыг оруулахгүй). */
    public static function storedKeys(string $half): array
    {
        return array_values(array_map(
            fn ($c) => $c['key'],
            array_filter(self::columns($half), fn ($c) => ! $c['virtual'])
        ));
    }

    /**
     * Мөрийн бүх томьёог дарааллаар нь бодож, дүүргэсэн мөрийг буцаана.
     *
     * Томьёо нь өөрөөсөө өмнөх багана эсвэл дурын гар оролтыг л ашиглана
     * (bank_salary → hand_deduction гэх мэт "хойшоо" заалт нь гар оролт тул асуудалгүй).
     *
     * $overrides дотор нэр нь байгаа багана томьёогоор бодогдохгүй —
     * нягтлангийн гараар бичсэн дүн хэвээр үлдэнэ.
     *
     * @param  array<string, mixed>  $row
     * @param  array<int, string>  $overrides
     * @return array<string, float>
     */
    public static function compute(array $row, string $half, array $overrides = []): array
    {
        $values = [];

        // Эхлээд бүх утгыг тоо болгож бэлдэнэ
        foreach (self::columns($half) as $col) {
            $values[$col['key']] = (float) ($row[$col['key']] ?? 0);
        }

        $overridable = self::overridableKeys($half);

        foreach (self::columns($half) as $col) {
            if ($col['formula'] === null) {
                continue;
            }

            // Гараар дарж бичсэн бол томьёог алгасана
            if (in_array($col['key'], $overrides, true) && in_array($col['key'], $overridable, true)) {
                continue;
            }

            $values[$col['key']] = Formula::evaluate($col['formula'], $values);
        }

        return $values;
    }

    /** Гараар дарж бичиж болох баганы нэрс. */
    public static function overridableKeys(string $half): array
    {
        return array_values(array_map(
            fn ($c) => $c['key'],
            array_filter(self::columns($half), fn ($c) => $c['overridable'])
        ));
    }

    /**
     * Шинэ тооцоо үүсгэхэд бөглөгдөх өгөгдмөл утгууд.
     *
     * @return array<string, float>
     */
    public static function defaults(string $half): array
    {
        $out = [];

        foreach (self::columns($half) as $col) {
            if ($col['default'] != 0) {
                $out[$col['key']] = (float) $col['default'];
            }
        }

        return $out;
    }

    /**
     * Excel баганын үсэг — талбар бүрт.  Эхний 3 багана: id, нэр, дугаар.
     *
     * @return array<string, string> key → 'D', 'E', ...
     */
    public static function excelLetters(string $half, int $startIndex = 4): array
    {
        $letters = [];
        $index = $startIndex;   // A=id, B=нэр, C=дугаар, эхний өгөгдлийн багана = D

        foreach (self::columns($half) as $col) {
            $letters[$col['key']] = Coordinate::stringFromColumnIndex($index++);
        }

        return $letters;
    }

    /** Excel/Import толгой мөр. */
    public static function headings(string $half): array
    {
        return array_merge(
            ['id', 'Ажилтны нэр', 'Ажилтны дугаар'],
            array_map(fn ($c) => $c['label'], self::columns($half))
        );
    }
}
