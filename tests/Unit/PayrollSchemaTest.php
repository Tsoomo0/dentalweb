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

    public function test_second_half_matches_accountant_excel(): void
    {
        // Лувсандаш Оюунтүлхүүр — сүүл цалин (хоцролт + хуруу + гарт олгохоос суутгахтай)
        $result = PayrollSchema::compute([
            'basic_salary' => 1800000,
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
        $this->assertEqualsWithDelta(1062500, $result['calc_salary'], 0.01);
        $this->assertEqualsWithDelta(2162500, $result['nd_total'], 0.01);
        $this->assertEqualsWithDelta(248687.5, $result['ndsh'], 0.01);
        $this->assertEqualsWithDelta(177381.25, $result['income_tax'], 0.01);
        $this->assertEqualsWithDelta(426068.75, $result['ndsh_tax_total'], 0.01);
        $this->assertEqualsWithDelta(1736431.25, $result['net_hand'], 0.01);
        $this->assertEqualsWithDelta(636231.25, $result['bank_salary'], 0.01);
    }

    public function test_second_half_without_advance_or_deductions(): void
    {
        // Мөнх-очир Одонцэцэг — урьдчилгаа болон суутгалгүй
        $result = PayrollSchema::compute([
            'basic_salary' => 1500000,
            'working_days' => 12,
            'worked_days' => 12,
            'food_rate' => 10000,
            'milk_rate' => 2000,
        ], 'second');

        // Excel дээр F (Урьдчилгаа) хоосон байсан ч систем нь Үндсэн/2 гэж бодно
        $this->assertEqualsWithDelta(750000, $result['prev_paid'], 0.01);
        $this->assertEqualsWithDelta(62500, $result['daily_rate'], 0.01);
        $this->assertEqualsWithDelta(750000, $result['calc_salary'], 0.01);
        $this->assertEqualsWithDelta(1500000, $result['nd_total'], 0.01);
    }

    public function test_ndsh_is_capped(): void
    {
        // НД цалин 7,920,000-аас давбал НДШ нь 910,800-д тогтоно
        $high = PayrollSchema::compute(['basic_salary' => 40000000, 'working_days' => 12, 'worked_days' => 12], 'second');
        $this->assertEqualsWithDelta(910800, $high['ndsh'], 0.01);

        // Үндсэн 2 сая → урьдчилгаа 1 сая + тооцсон 1 сая = НД цалин нийт 2 сая
        $low = PayrollSchema::compute(['basic_salary' => 2000000, 'working_days' => 12, 'worked_days' => 12], 'second');
        $this->assertEqualsWithDelta(2000000, $low['nd_total'], 0.01);
        $this->assertEqualsWithDelta(2000000 * 0.115, $low['ndsh'], 0.01);
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

        // Нягтлангийн файл дахь баганын байрлалтай тааруулна
        $this->assertSame('D', $letters['basic_salary']);
        $this->assertSame('E', $letters['nd_salary']);
        $this->assertSame('AD', $letters['nd_total']);
        $this->assertSame('AJ', $letters['hand_deduction']);

        $columns = collect(PayrollSchema::columns('second'))->keyBy('key');

        $this->assertSame(
            '=IF(AD2 > 7920000, 910800, AD2 * 0.115)',
            Formula::toExcel($columns['ndsh']['formula'], $letters, 2)
        );
        $this->assertSame(
            '=(AD2 - AE2) * 0.1 - 14000',
            Formula::toExcel($columns['income_tax']['formula'], $letters, 2)
        );
        $this->assertSame(
            '=AH2 - F2 - G2 - AJ2',
            Formula::toExcel($columns['bank_salary']['formula'], $letters, 2)
        );
    }

    public function test_column_counts_match_accountant_layout(): void
    {
        // Excel дээр эхэн: D..AD (27), сүүл: D..AJ (33)
        $this->assertCount(27, PayrollSchema::columns('first'));
        $this->assertCount(33, PayrollSchema::columns('second'));

        $this->assertSame('AD', PayrollSchema::excelLetters('first')['bank_salary']);
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
