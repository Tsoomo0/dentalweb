<?php

namespace Tests\Unit;

use App\Support\Payroll\Formula;
use App\Support\Payroll\PayrollSchema;
use PHPUnit\Framework\TestCase;

/**
 * Системийн бодолт нь нягтлангийн Excel файлын дүнтэй яг таарч байгааг шалгана.
 *
 * Хүлээгдэж буй дүнг "2026 оны 7-р сар эхний/сүүл цалин · Оффис" файлаас
 * шууд авсан — томьёо өөрчлөгдвөл энэ тест унана.
 */
class PayrollSchemaTest extends TestCase
{
    public function test_first_half_matches_accountant_excel(): void
    {
        // Лувсандаш Оюунтүлхүүр — эхэн цалин
        $result = PayrollSchema::compute([
            'basic_salary' => 1800000,
            'working_days' => 7,
            'worked_days' => 7,
            'food_rate' => 10000,
            'food' => 70000,
            'milk_rate' => 2000,
        ], 'first');

        $this->assertEqualsWithDelta(900000, $result['advance_salary'], 0.01);
        $this->assertEqualsWithDelta(128571.42857143, $result['daily_rate'], 0.0001);
        $this->assertEqualsWithDelta(70000, $result['total_bonus'], 0.01);
        $this->assertEqualsWithDelta(0, $result['total_deduction'], 0.01);
        $this->assertEqualsWithDelta(900000, $result['worked_salary'], 0.01);
        $this->assertEqualsWithDelta(970000, $result['calc_salary'], 0.01);
        $this->assertEqualsWithDelta(970000, $result['net_hand'], 0.01);
        $this->assertEqualsWithDelta(970000, $result['bank_salary'], 0.01);
    }

    public function test_first_half_with_ath_bonus(): void
    {
        // Эрдэнэбилэг Энхбат — А.Т.Х 40% нэмэгдэлтэй
        $result = PayrollSchema::compute([
            'basic_salary' => 1500000,
            'working_days' => 7,
            'worked_days' => 7,
            'ath_bonus' => 300000,
            'food' => 70000,
        ], 'first');

        $this->assertEqualsWithDelta(370000, $result['total_bonus'], 0.01);
        $this->assertEqualsWithDelta(750000, $result['worked_salary'], 0.01);
        $this->assertEqualsWithDelta(1120000, $result['calc_salary'], 0.01);
    }

    public function test_deductions_reduce_calculated_salary_on_both_halves(): void
    {
        // Хоцролт/хуруу нь цалинг НЭМЭХГҮЙ, ХАСНА — хоёр хагаст ижил
        $input = [
            'basic_salary' => 1800000,
            'working_days' => 12,
            'worked_days' => 12,
            'tardy_minutes' => 55,      // 27,500₮
            'fingerprint_misses' => 1,  // 15,000₮
        ];

        foreach (['first', 'second'] as $half) {
            $with = PayrollSchema::compute($input, $half);
            $without = PayrollSchema::compute(array_merge($input, ['tardy_minutes' => 0, 'fingerprint_misses' => 0]), $half);

            $this->assertEqualsWithDelta(42500, $with['total_deduction'], 0.01, "{$half} хагас");
            $this->assertEqualsWithDelta(
                $without['calc_salary'] - 42500,
                $with['calc_salary'],
                0.01,
                "{$half} хагасын тооцсон цалингаас суутгал хасагдах ёстой"
            );
            $this->assertLessThan($without['net_hand'], $with['net_hand'], "{$half} хагас");
        }
    }

    public function test_second_half_matches_accountant_excel(): void
    {
        // Лувсандаш Оюунтүлхүүр — сүүл цалин (хоцролт + хуруу + гарт олгохоос суутгахтай)
        // prev_paid нь эхэн цалингийн "Банкаар олгох" дүнгээс татагддаг гар оролт —
        // нягтлангийн файлд байсан 900,000-аар шалгана
        $result = PayrollSchema::compute([
            'basic_salary' => 1800000,
            'prev_paid' => 900000,
            'holiday_advance' => 200000,
            'working_days' => 12,
            'worked_days' => 12,
            'food_rate' => 10000,
            'food' => 120000,
            'milk_rate' => 2000,
            'tardy_minutes' => 55,
            'fingerprint_misses' => 1,
            'hand_deduction' => 200,
        ], 'second');

        $this->assertEqualsWithDelta(900000, $result['nd_salary'], 0.01);
        $this->assertEqualsWithDelta(900000, $result['prev_paid'], 0.01);
        $this->assertEqualsWithDelta(75000, $result['daily_rate'], 0.01);
        $this->assertEqualsWithDelta(120000, $result['total_bonus'], 0.01);
        $this->assertEqualsWithDelta(27500, $result['tardiness'], 0.01);
        $this->assertEqualsWithDelta(15000, $result['no_fingerprint'], 0.01);
        $this->assertEqualsWithDelta(42500, $result['total_deduction'], 0.01);
        $this->assertEqualsWithDelta(900000, $result['worked_salary'], 0.01);

        // Тооцсон цалин = ажилласан өдрөөр + нэмэгдэл − суутгал
        // (нягтлангийн Excel дээр суутгалыг нэмдэг байсныг зассан)
        $this->assertEqualsWithDelta(977500, $result['calc_salary'], 0.01);
        $this->assertEqualsWithDelta(2077500, $result['nd_total'], 0.01);
        $this->assertEqualsWithDelta(238912.5, $result['ndsh'], 0.01);
        $this->assertEqualsWithDelta(169858.75, $result['income_tax'], 0.01);
        $this->assertEqualsWithDelta(408771.25, $result['ndsh_tax_total'], 0.01);
        $this->assertEqualsWithDelta(1668728.75, $result['net_hand'], 0.01);
        $this->assertEqualsWithDelta(568528.75, $result['bank_salary'], 0.01);
    }

    public function test_second_half_without_advance_or_deductions(): void
    {
        // Мөнх-очир Одонцэцэг — эхэн цалингийн тооцоо олдоогүй тул урьдчилгаа хоосон
        $result = PayrollSchema::compute([
            'basic_salary' => 1500000,
            'working_days' => 12,
            'worked_days' => 12,
            'food_rate' => 10000,
            'milk_rate' => 2000,
        ], 'second');

        $this->assertSame(0.0, $result['prev_paid']);
        $this->assertEqualsWithDelta(62500, $result['daily_rate'], 0.01);
        $this->assertEqualsWithDelta(750000, $result['calc_salary'], 0.01);
        $this->assertEqualsWithDelta(750000, $result['nd_total'], 0.01);
    }

    public function test_advance_is_an_input_not_a_formula(): void
    {
        // "Олгосон урьдчилгаа цалин" нь эхэн цалингийн тооцооноос татагддаг тул
        // томьёогүй байх ёстой — PayrollController::advanceMap() бөглөнө
        $prevPaid = collect(PayrollSchema::columns('second'))->firstWhere('key', 'prev_paid');

        $this->assertSame('Олгосон урьдчилгаа цалин', $prevPaid['label']);
        $this->assertNull($prevPaid['formula']);
        $this->assertSame('bank_salary', $prevPaid['linked']);

        // Эхэн цалинд татагддаг багана байхгүй
        $this->assertSame([], PayrollSchema::linkedSources('first'));
    }

    public function test_advance_flows_into_nd_total_and_bank_salary(): void
    {
        // Эхэн цалингаар 970,000₮ банкаар олгосон гэж үзвэл
        $result = PayrollSchema::compute([
            'basic_salary' => 1800000,
            'prev_paid' => 970000,
            'working_days' => 12,
            'worked_days' => 12,
        ], 'second');

        // Урьдчилгаа нь НД цалин нийтэд нэмэгдэж, банкаар олгохоос хасагдана
        $this->assertEqualsWithDelta(970000 + 900000, $result['nd_total'], 0.01);
        $this->assertEqualsWithDelta($result['net_hand'] - 970000, $result['bank_salary'], 0.01);
    }

    public function test_worked_days_accepts_fractions(): void
    {
        // Хагас өдөр ажилласан тохиолдол — 6.5 өдөр бүхлээр тайрагдахгүй
        $worked = collect(PayrollSchema::columns('first'))->firstWhere('key', 'worked_days');
        $this->assertFalse($worked['int'], 'Ажилласан өдөр бутархай утга авах ёстой');

        $result = PayrollSchema::compute([
            'basic_salary' => 1400000,
            'working_days' => 7,
            'worked_days' => 6.5,
        ], 'first');

        $this->assertEqualsWithDelta(100000, $result['daily_rate'], 0.01);
        $this->assertEqualsWithDelta(650000, $result['worked_salary'], 0.01);
        $this->assertEqualsWithDelta(650000, $result['calc_salary'], 0.01);
    }

    public function test_payout_columns_can_be_overridden_by_hand(): void
    {
        $this->assertSame(['ndsh', 'income_tax', 'net_hand', 'bank_salary'], PayrollSchema::overridableKeys('second'));
        $this->assertSame(['net_hand', 'bank_salary'], PayrollSchema::overridableKeys('first'));

        $input = [
            'basic_salary' => 1800000,
            'prev_paid' => 900000,
            'holiday_advance' => 200000,
            'working_days' => 12,
            'worked_days' => 12,
        ];

        $auto = PayrollSchema::compute($input, 'second');

        // Гарт олгохыг гараар бутархай дүнгээр дарж бичихэд банкаар олгох нь дагана
        $manual = PayrollSchema::compute(
            array_merge($auto, ['net_hand' => 1700000.75]),
            'second',
            ['net_hand']
        );

        $this->assertEqualsWithDelta(1700000.75, $manual['net_hand'], 0.001);
        $this->assertEqualsWithDelta(1700000.75 - 900000 - 200000, $manual['bank_salary'], 0.001);

        // Хоёуланг нь дарж бичвэл аль аль нь хэвээр үлдэнэ
        $both = PayrollSchema::compute(
            array_merge($auto, ['net_hand' => 1_000_000.5, 'bank_salary' => 250_000.25]),
            'second',
            ['net_hand', 'bank_salary']
        );

        $this->assertEqualsWithDelta(1000000.5, $both['net_hand'], 0.001);
        $this->assertEqualsWithDelta(250000.25, $both['bank_salary'], 0.001);
    }

    public function test_taxes_can_be_overridden_and_downstream_follows(): void
    {
        $base = [
            'basic_salary' => 1800000,
            'prev_paid' => 970000,
            'holiday_advance' => 200000,
            'working_days' => 12,
            'worked_days' => 12,
        ];

        $auto = PayrollSchema::compute($base, 'second');

        // НДШ-г гараар дарж бичихэд ХХОАТ болон гарт олгох нь дагаж дахин бодогдоно
        $manual = PayrollSchema::compute(array_merge($auto, ['ndsh' => 200000]), 'second', ['ndsh']);

        $this->assertEqualsWithDelta(200000, $manual['ndsh'], 0.01);
        $this->assertEqualsWithDelta(($manual['nd_total'] - 200000) * 0.1 - 14000, $manual['income_tax'], 0.01);
        $this->assertEqualsWithDelta($manual['nd_total'] - 200000 - $manual['income_tax'], $manual['net_hand'], 0.01);

        // Хоёуланг нь дарж бичвэл аль аль нь хэвээр үлдэнэ
        $both = PayrollSchema::compute(
            array_merge($auto, ['ndsh' => 200000, 'income_tax' => 111111.11]),
            'second',
            ['ndsh', 'income_tax']
        );

        $this->assertEqualsWithDelta(200000, $both['ndsh'], 0.01);
        $this->assertEqualsWithDelta(111111.11, $both['income_tax'], 0.01);
        $this->assertEqualsWithDelta($both['nd_total'] - 311111.11, $both['net_hand'], 0.01);
    }

    public function test_unknown_override_keys_are_ignored(): void
    {
        // Томьёотой ч overridable бус баганыг дарж бичих оролдлого нөлөөлөхгүй
        $result = PayrollSchema::compute(
            ['basic_salary' => 1800000, 'working_days' => 12, 'worked_days' => 12, 'nd_salary' => 1],
            'second',
            ['nd_salary']
        );

        $this->assertEqualsWithDelta(900000, $result['nd_salary'], 0.01);
    }

    public function test_first_half_tax_column_is_pulled_into_second_half(): void
    {
        // Эхэн цалингийн "НДШ 11.5% ХХОАТ" → сүүл цалингийн лавлагаа багана
        $this->assertSame(
            ['prev_paid' => 'bank_salary', 'prev_ndsh' => 'ndsh'],
            PayrollSchema::linkedSources('second')
        );
        $this->assertSame([], PayrollSchema::linkedSources('first'));

        // А.Т.Х 40%-ийн яг өмнө байрлана
        $keys = array_column(PayrollSchema::columns('second'), 'key');
        $this->assertSame('ath_bonus', $keys[array_search('prev_ndsh', $keys, true) + 1]);

        // Зөвхөн лавлагаа — тооцоонд огт нөлөөлөхгүй
        $base = ['basic_salary' => 1800000, 'prev_paid' => 970000, 'working_days' => 12, 'worked_days' => 12];
        $without = PayrollSchema::compute($base, 'second');
        $with = PayrollSchema::compute(array_merge($base, ['prev_ndsh' => 999999]), 'second');

        $this->assertSame($without['net_hand'], $with['net_hand']);
        $this->assertSame($without['bank_salary'], $with['bank_salary']);
        $this->assertEqualsWithDelta(999999, $with['prev_ndsh'], 0.01);
    }

    public function test_only_worked_days_and_payouts_show_decimals(): void
    {
        // Ажилласан өдөр, Гарт олгох, Банкаар олгох гурав л бутархайгаар харагдана
        foreach (['first', 'second'] as $half) {
            $decimal = array_values(array_map(
                fn ($c) => $c['key'],
                array_filter(PayrollSchema::columns($half), fn ($c) => $c['decimal'])
            ));

            $this->assertSame(['worked_days', 'net_hand', 'bank_salary'], $decimal, "{$half} хагас");
        }
    }

    public function test_non_decimal_columns_keep_full_precision(): void
    {
        // Бүхэлчилж ХАРУУЛАХ нь утгыг өөрчлөхгүй — тооцоо бүтэн дүнгээр үргэлжилнэ
        $result = PayrollSchema::compute([
            'basic_salary' => 1800000,
            'prev_paid' => 900000,
            'holiday_advance' => 200000,
            'working_days' => 12,
            'worked_days' => 12,
            'food' => 120000,
            'tardy_minutes' => 55,
            'fingerprint_misses' => 1,
            'hand_deduction' => 200,
        ], 'second');

        $this->assertEqualsWithDelta(238912.5, $result['ndsh'], 0.001);
        $this->assertEqualsWithDelta(1668728.75, $result['net_hand'], 0.001);
        $this->assertEqualsWithDelta(568528.75, $result['bank_salary'], 0.001);
    }

    public function test_food_and_milk_rates_have_defaults(): void
    {
        $expected = ['food_rate' => 10000.0, 'milk_rate' => 2000.0];

        $this->assertSame($expected, PayrollSchema::defaults('first'));
        $this->assertSame($expected, PayrollSchema::defaults('second'));
    }

    public function test_ndsh_is_capped(): void
    {
        // НД цалин 7,920,000-аас давбал НДШ нь 910,800-д тогтоно
        $high = PayrollSchema::compute(['basic_salary' => 40000000, 'working_days' => 12, 'worked_days' => 12], 'second');
        $this->assertEqualsWithDelta(910800, $high['ndsh'], 0.01);

        // Үндсэн 2 сая, урьдчилгаагүй → НД цалин нийт нь тооцсон цалин буюу 1 сая
        $low = PayrollSchema::compute(['basic_salary' => 2000000, 'working_days' => 12, 'worked_days' => 12], 'second');
        $this->assertEqualsWithDelta(1000000, $low['nd_total'], 0.01);
        $this->assertEqualsWithDelta(1000000 * 0.115, $low['ndsh'], 0.01);
    }

    public function test_zero_working_days_does_not_break(): void
    {
        $result = PayrollSchema::compute(['basic_salary' => 1500000, 'working_days' => 0], 'first');

        $this->assertSame(0.0, $result['daily_rate']);
        $this->assertSame(0.0, $result['worked_salary']);
    }

    public function test_excel_translation_produces_expected_formulas(): void
    {
        $letters = PayrollSchema::excelLetters('second');

        $this->assertSame('D', $letters['basic_salary']);
        $this->assertSame('E', $letters['nd_salary']);
        $this->assertSame('AE', $letters['nd_total']);
        $this->assertSame('AK', $letters['hand_deduction']);

        $columns = collect(PayrollSchema::columns('second'))->keyBy('key');

        $this->assertSame(
            '=IF(AE2 > 7920000, 910800, AE2 * 0.115)',
            Formula::toExcel($columns['ndsh']['formula'], $letters, 2)
        );
        $this->assertSame(
            '=(AE2 - AF2) * 0.1 - 14000',
            Formula::toExcel($columns['income_tax']['formula'], $letters, 2)
        );
        $this->assertSame(
            '=AI2 - F2 - G2 - AK2',
            Formula::toExcel($columns['bank_salary']['formula'], $letters, 2)
        );
    }

    public function test_column_counts(): void
    {
        // Эхэн: D..AD (27).  Сүүл: D..AK (34) — эхэн цалингийн НДШ/ХХОАТ
        // лавлагаа багана нэмэгдсэнээр нягтлангийн анхны файлаас нэгээр илүү.
        $this->assertCount(27, PayrollSchema::columns('first'));
        $this->assertCount(34, PayrollSchema::columns('second'));

        $this->assertSame('AD', PayrollSchema::excelLetters('first')['bank_salary']);
        $this->assertSame('AK', PayrollSchema::excelLetters('second')['hand_deduction']);
    }

    public function test_formula_language_basics(): void
    {
        $this->assertSame(7.0, Formula::evaluate('1 + 2 * 3', []));
        $this->assertSame(9.0, Formula::evaluate('(1 + 2) * 3', []));
        $this->assertSame(-5.0, Formula::evaluate('-{a}', ['a' => 5]));
        $this->assertSame(2.0, Formula::evaluate('IF({a} > 3, 2, 9)', ['a' => 5]));
        $this->assertSame(9.0, Formula::evaluate('IF({a} > 3, 2, 9)', ['a' => 1]));
        $this->assertSame(0.0, Formula::evaluate('IFERROR({a} / {b}, 0)', ['a' => 5, 'b' => 0]));
        $this->assertSame(2.5, Formula::evaluate('IFERROR({a} / {b}, 0)', ['a' => 5, 'b' => 2]));
    }
}
