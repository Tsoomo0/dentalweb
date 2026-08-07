<?php

namespace App\Support\Payroll;

/**
 * Цалингийн томьёоны жижиг хэл.
 *
 * Бичиглэл:  {талбар_нэр}, тоо, + - * /, хаалт, IF(нөхцөл, тийм, үгүй),
 *            IFERROR(илэрхийлэл, нөөц), > < >= <= =
 *
 * Нэг илэрхийллийг хоёр газар ашиглана:
 *   evaluate() → PHP/сервер талд дүн бодох
 *   toExcel()  → Excel файлд бодит "=" томьёо болгож бичих
 *
 * Ингэснээр систем ба Excel хоёрын томьёо хэзээ ч зөрөхгүй.
 * TS хувилбар: resources/js/lib/payroll-formula.ts (ижил дүрэмтэй)
 */
class Formula
{
    /** @var array<int, array{0:string, 1:string}> */
    private array $tokens = [];

    private int $pos = 0;

    private function __construct(private readonly array $values) {}

    /**
     * Илэрхийллийг тоон утгаар бодно.
     *
     * @param  array<string, mixed>  $values  талбарын нэр → утга
     */
    public static function evaluate(string $expr, array $values): float
    {
        $f = new self($values);
        $f->tokens = self::tokenize($expr);
        $f->pos = 0;

        $result = $f->parseExpr();

        if ($f->pos < count($f->tokens)) {
            throw new FormulaError("Илэрхийлэл бүрэн уншигдсангүй: {$expr}");
        }

        return is_finite($result) ? $result : 0.0;
    }

    /**
     * Илэрхийллийг Excel томьёо болгоно.  {basic_salary} → D2
     *
     * @param  array<string, string>  $letters  талбарын нэр → Excel баганын үсэг
     */
    public static function toExcel(string $expr, array $letters, int $row): string
    {
        $out = preg_replace_callback('/\{(\w+)\}/', function (array $m) use ($letters, $row): string {
            if (! isset($letters[$m[1]])) {
                throw new FormulaError("Excel багана олдсонгүй: {$m[1]}");
            }

            return $letters[$m[1]].$row;
        }, $expr);

        return '='.$out;
    }

    /** Илэрхийлэл дэх бүх талбарын нэр. */
    public static function refs(string $expr): array
    {
        preg_match_all('/\{(\w+)\}/', $expr, $m);

        return array_values(array_unique($m[1]));
    }

    // ── Tokenizer ─────────────────────────────────────────────────────────────

    private static function tokenize(string $expr): array
    {
        $tokens = [];
        $len = strlen($expr);
        $i = 0;

        while ($i < $len) {
            $c = $expr[$i];

            if (ctype_space($c)) {
                $i++;

                continue;
            }

            if ($c === '{') {
                $end = strpos($expr, '}', $i);
                if ($end === false) {
                    throw new FormulaError("'}' хаалт дутуу: {$expr}");
                }
                $tokens[] = ['ref', substr($expr, $i + 1, $end - $i - 1)];
                $i = $end + 1;

                continue;
            }

            if (ctype_digit($c) || $c === '.') {
                $j = $i;
                while ($j < $len && (ctype_digit($expr[$j]) || $expr[$j] === '.')) {
                    $j++;
                }
                $tokens[] = ['num', substr($expr, $i, $j - $i)];
                $i = $j;

                continue;
            }

            if (ctype_alpha($c)) {
                $j = $i;
                while ($j < $len && ctype_alnum($expr[$j])) {
                    $j++;
                }
                $tokens[] = ['fn', strtoupper(substr($expr, $i, $j - $i))];
                $i = $j;

                continue;
            }

            // >= <= давхар тэмдэгт
            $two = substr($expr, $i, 2);
            if ($two === '>=' || $two === '<=') {
                $tokens[] = ['op', $two];
                $i += 2;

                continue;
            }

            if (str_contains('+-*/(),><=', $c)) {
                $tokens[] = ['op', $c];
                $i++;

                continue;
            }

            throw new FormulaError("Танигдаагүй тэмдэгт '{$c}': {$expr}");
        }

        return $tokens;
    }

    // ── Recursive-descent parser ──────────────────────────────────────────────

    private function parseExpr(): float
    {
        $left = $this->parseAdditive();

        while ($this->isOp(['>', '<', '>=', '<=', '='])) {
            $op = $this->tokens[$this->pos++][1];
            $right = $this->parseAdditive();

            $left = match ($op) {
                '>' => $left > $right ? 1.0 : 0.0,
                '<' => $left < $right ? 1.0 : 0.0,
                '>=' => $left >= $right ? 1.0 : 0.0,
                '<=' => $left <= $right ? 1.0 : 0.0,
                '=' => $left === $right ? 1.0 : 0.0,
            };
        }

        return $left;
    }

    private function parseAdditive(): float
    {
        $left = $this->parseMultiplicative();

        while ($this->isOp(['+', '-'])) {
            $op = $this->tokens[$this->pos++][1];
            $right = $this->parseMultiplicative();
            $left = $op === '+' ? $left + $right : $left - $right;
        }

        return $left;
    }

    private function parseMultiplicative(): float
    {
        $left = $this->parseUnary();

        while ($this->isOp(['*', '/'])) {
            $op = $this->tokens[$this->pos++][1];
            $right = $this->parseUnary();

            if ($op === '*') {
                $left *= $right;
            } else {
                if ($right == 0.0) {
                    throw new FormulaError('Тэгд хуваасан');
                }
                $left /= $right;
            }
        }

        return $left;
    }

    private function parseUnary(): float
    {
        if ($this->isOp(['-'])) {
            $this->pos++;

            return -$this->parseUnary();
        }

        if ($this->isOp(['+'])) {
            $this->pos++;

            return $this->parseUnary();
        }

        return $this->parsePrimary();
    }

    private function parsePrimary(): float
    {
        $token = $this->tokens[$this->pos] ?? null;

        if ($token === null) {
            throw new FormulaError('Илэрхийлэл гэнэт дуусав');
        }

        [$type, $value] = $token;

        if ($type === 'num') {
            $this->pos++;

            return (float) $value;
        }

        if ($type === 'ref') {
            $this->pos++;

            return (float) ($this->values[$value] ?? 0);
        }

        if ($type === 'fn') {
            return $this->parseFunction($value);
        }

        if ($type === 'op' && $value === '(') {
            $this->pos++;
            $inner = $this->parseExpr();
            $this->expect(')');

            return $inner;
        }

        throw new FormulaError("Хүлээгдээгүй тэмдэгт: {$value}");
    }

    private function parseFunction(string $name): float
    {
        $this->pos++;          // функцийн нэр
        $this->expect('(');

        if ($name === 'IF') {
            $cond = $this->parseExpr();
            $this->expect(',');

            // Аль нэг салаа нь алдаатай байж болзошгүй тул хэрэгтэйг нь л бодно
            if ($cond != 0.0) {
                $result = $this->parseExpr();
                $this->expect(',');
                $this->skipExpr();
            } else {
                $this->skipExpr();
                $this->expect(',');
                $result = $this->parseExpr();
            }

            $this->expect(')');

            return $result;
        }

        if ($name === 'IFERROR') {
            $start = $this->pos;

            try {
                $result = $this->parseExpr();
                $this->expect(',');
                $this->skipExpr();
                $this->expect(')');

                return $result;
            } catch (FormulaError) {
                $this->pos = $start;
                $this->skipExpr();
                $this->expect(',');
                $fallback = $this->parseExpr();
                $this->expect(')');

                return $fallback;
            }
        }

        if ($name === 'MIN' || $name === 'MAX' || $name === 'ROUND') {
            $args = [$this->parseExpr()];
            while ($this->isOp([','])) {
                $this->pos++;
                $args[] = $this->parseExpr();
            }
            $this->expect(')');

            return match ($name) {
                'MIN' => min($args),
                'MAX' => max($args),
                'ROUND' => round($args[0], (int) ($args[1] ?? 0)),
            };
        }

        throw new FormulaError("Дэмжигдээгүй функц: {$name}");
    }

    /**
     * Нэг аргументыг алдаа тооцохгүйгээр алгасана (хаалт/таслалын гүнийг тоолж).
     */
    private function skipExpr(): void
    {
        $depth = 0;

        while ($this->pos < count($this->tokens)) {
            [$type, $value] = $this->tokens[$this->pos];

            if ($type === 'op') {
                if ($value === '(') {
                    $depth++;
                } elseif ($value === ')') {
                    if ($depth === 0) {
                        return;
                    }
                    $depth--;
                } elseif ($value === ',' && $depth === 0) {
                    return;
                }
            }

            $this->pos++;
        }
    }

    private function isOp(array $ops): bool
    {
        $token = $this->tokens[$this->pos] ?? null;

        return $token !== null && $token[0] === 'op' && in_array($token[1], $ops, true);
    }

    private function expect(string $op): void
    {
        if (! $this->isOp([$op])) {
            throw new FormulaError("'{$op}' хүлээгдэж байсан");
        }

        $this->pos++;
    }
}
