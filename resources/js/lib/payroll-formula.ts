/**
 * Цалингийн томьёо бодогч — app/Support/Payroll/Formula.php-ийн TS хувилбар.
 *
 * Томьёог сервер тал (PayrollSchema) дамжуулж өгдөг тул энд зөвхөн БОДОЛТ хийнэ.
 * Дүрэм нь PHP хувилбартай яг ижил байх ёстой — аль нэгийг засвал нөгөөг нь бас засна.
 *
 * Бичиглэл: {талбар}, тоо, + - * /, хаалт, IF(...), IFERROR(...), MIN/MAX/ROUND, > < >= <= =
 */

export interface PayrollColumn {
    key: string;
    label: string;
    group: string;
    color: string;
    /** Задаргаанд ямар үүрэгтэй харагдах: earning | deduction | day | rate | total | payout */
    role: 'earning' | 'deduction' | 'day' | 'rate' | 'total' | 'payout';
    formula: string | null;
    int: boolean;
    virtual: boolean;
    highlight: boolean;
    /** Нийт мөрөнд нэмэх эсэх (ажлын өдрийн тоог нэмэх утгагүй) */
    sum: boolean;
}

export interface PayrollGroup {
    label: string;
    color: string;
    span: number;
}

type Token = { type: 'num' | 'ref' | 'fn' | 'op'; value: string };

class FormulaError extends Error {}

function tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < expr.length) {
        const c = expr[i];

        if (/\s/.test(c)) {
            i++;
            continue;
        }

        if (c === '{') {
            const end = expr.indexOf('}', i);
            if (end === -1) throw new FormulaError(`'}' хаалт дутуу: ${expr}`);
            tokens.push({ type: 'ref', value: expr.slice(i + 1, end) });
            i = end + 1;
            continue;
        }

        if (/[0-9.]/.test(c)) {
            let j = i;
            while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
            tokens.push({ type: 'num', value: expr.slice(i, j) });
            i = j;
            continue;
        }

        if (/[a-zA-Z]/.test(c)) {
            let j = i;
            while (j < expr.length && /[a-zA-Z0-9]/.test(expr[j])) j++;
            tokens.push({ type: 'fn', value: expr.slice(i, j).toUpperCase() });
            i = j;
            continue;
        }

        const two = expr.slice(i, i + 2);
        if (two === '>=' || two === '<=') {
            tokens.push({ type: 'op', value: two });
            i += 2;
            continue;
        }

        if ('+-*/(),><='.includes(c)) {
            tokens.push({ type: 'op', value: c });
            i++;
            continue;
        }

        throw new FormulaError(`Танигдаагүй тэмдэгт '${c}': ${expr}`);
    }

    return tokens;
}

class Parser {
    private pos = 0;

    constructor(
        private tokens: Token[],
        private values: Record<string, number>,
    ) {}

    parse(): number {
        const result = this.expr();
        if (this.pos < this.tokens.length) throw new FormulaError('Илэрхийлэл бүрэн уншигдсангүй');
        return result;
    }

    private expr(): number {
        let left = this.additive();

        while (this.isOp(['>', '<', '>=', '<=', '='])) {
            const op = this.tokens[this.pos++].value;
            const right = this.additive();
            const bool =
                op === '>' ? left > right : op === '<' ? left < right : op === '>=' ? left >= right : op === '<=' ? left <= right : left === right;
            left = bool ? 1 : 0;
        }

        return left;
    }

    private additive(): number {
        let left = this.multiplicative();

        while (this.isOp(['+', '-'])) {
            const op = this.tokens[this.pos++].value;
            const right = this.multiplicative();
            left = op === '+' ? left + right : left - right;
        }

        return left;
    }

    private multiplicative(): number {
        let left = this.unary();

        while (this.isOp(['*', '/'])) {
            const op = this.tokens[this.pos++].value;
            const right = this.unary();

            if (op === '*') {
                left *= right;
            } else {
                if (right === 0) throw new FormulaError('Тэгд хуваасан');
                left /= right;
            }
        }

        return left;
    }

    private unary(): number {
        if (this.isOp(['-'])) {
            this.pos++;
            return -this.unary();
        }
        if (this.isOp(['+'])) {
            this.pos++;
            return this.unary();
        }
        return this.primary();
    }

    private primary(): number {
        const token = this.tokens[this.pos];
        if (!token) throw new FormulaError('Илэрхийлэл гэнэт дуусав');

        if (token.type === 'num') {
            this.pos++;
            return parseFloat(token.value);
        }

        if (token.type === 'ref') {
            this.pos++;
            return Number(this.values[token.value]) || 0;
        }

        if (token.type === 'fn') {
            return this.func(token.value);
        }

        if (token.value === '(') {
            this.pos++;
            const inner = this.expr();
            this.expect(')');
            return inner;
        }

        throw new FormulaError(`Хүлээгдээгүй тэмдэгт: ${token.value}`);
    }

    private func(name: string): number {
        this.pos++;
        this.expect('(');

        if (name === 'IF') {
            const cond = this.expr();
            this.expect(',');

            let result: number;
            if (cond !== 0) {
                result = this.expr();
                this.expect(',');
                this.skip();
            } else {
                this.skip();
                this.expect(',');
                result = this.expr();
            }

            this.expect(')');
            return result;
        }

        if (name === 'IFERROR') {
            const start = this.pos;
            try {
                const result = this.expr();
                this.expect(',');
                this.skip();
                this.expect(')');
                return result;
            } catch (e) {
                if (!(e instanceof FormulaError)) throw e;
                this.pos = start;
                this.skip();
                this.expect(',');
                const fallback = this.expr();
                this.expect(')');
                return fallback;
            }
        }

        if (name === 'MIN' || name === 'MAX' || name === 'ROUND') {
            const args = [this.expr()];
            while (this.isOp([','])) {
                this.pos++;
                args.push(this.expr());
            }
            this.expect(')');

            if (name === 'MIN') return Math.min(...args);
            if (name === 'MAX') return Math.max(...args);

            const factor = Math.pow(10, args[1] ?? 0);
            return Math.round(args[0] * factor) / factor;
        }

        throw new FormulaError(`Дэмжигдээгүй функц: ${name}`);
    }

    /** Нэг аргументыг бодохгүйгээр алгасана. */
    private skip(): void {
        let depth = 0;

        while (this.pos < this.tokens.length) {
            const t = this.tokens[this.pos];

            if (t.type === 'op') {
                if (t.value === '(') depth++;
                else if (t.value === ')') {
                    if (depth === 0) return;
                    depth--;
                } else if (t.value === ',' && depth === 0) return;
            }

            this.pos++;
        }
    }

    private isOp(ops: string[]): boolean {
        const t = this.tokens[this.pos];
        return !!t && t.type === 'op' && ops.includes(t.value);
    }

    private expect(op: string): void {
        if (!this.isOp([op])) throw new FormulaError(`'${op}' хүлээгдэж байсан`);
        this.pos++;
    }
}

/** Токенийг дахин задлахгүйн тулд хадгална — хүснэгт бичих бүрт бодогддог. */
const tokenCache = new Map<string, Token[]>();

export function evaluateFormula(expr: string, values: Record<string, number>): number {
    let tokens = tokenCache.get(expr);
    if (!tokens) {
        tokens = tokenize(expr);
        tokenCache.set(expr, tokens);
    }

    try {
        const result = new Parser(tokens, values).parse();
        return Number.isFinite(result) ? result : 0;
    } catch {
        return 0;
    }
}

/**
 * Мөрийн бүх томьёог schema-ийн дарааллаар бодож, шинэ мөр буцаана.
 * PayrollSchema::compute()-тэй ижил логик.
 */
export function computeRow<T extends Record<string, unknown>>(row: T, columns: PayrollColumn[]): T {
    const values: Record<string, number> = {};

    for (const col of columns) {
        values[col.key] = Number(row[col.key]) || 0;
    }

    for (const col of columns) {
        if (!col.formula) continue;
        values[col.key] = evaluateFormula(col.formula, values);
    }

    const next = { ...row } as Record<string, unknown>;
    for (const col of columns) {
        next[col.key] = values[col.key];
    }

    return next as T;
}

/** Томьёог хүнд ойлгомжтой байдлаар харуулах: {basic_salary} → Үндсэн цалин */
export function describeFormula(expr: string, columns: PayrollColumn[]): string {
    const labels = new Map(columns.map((c) => [c.key, c.label]));

    return expr.replace(/\{(\w+)\}/g, (_, key: string) => labels.get(key) ?? key);
}
