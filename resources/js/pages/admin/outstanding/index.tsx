import AppLayout from '@/layouts/app-layout';
import { shortDoctorName } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight,
    Clock, Download, Filter, TrendingDown,
} from 'lucide-react';
import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Branch { id: number; name: string }

interface OutstandingEntry {
    id: number;
    date: string;
    branch: string | null;
    patient_name: string | null;
    diagnosis: string | null;
    appointment_number: string | null;
    outstanding_amount: number;
    doctor_name: string | null;
    receptionist_name: string | null;
    days_since: number;
    is_paid: boolean;
    outstanding_paid_at: string | null;
    outstanding_paid_method: string | null;
    outstanding_paid_receipt: string | null;
    outstanding_paid_amount: number | null;
}

type Mode = 'day' | 'week' | 'month' | 'all';

interface Filters {
    branchId: string | null;
    status: 'all' | 'unpaid' | 'paid';
    mode: Mode;
    date: string;
    month: string;
}

interface Props {
    entries: OutstandingEntry[];
    branches: Branch[];
    filters: Filters;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хянах самбар', href: '/admin/dashboard' },
    { title: 'Дутуу тооцоо', href: '/admin/outstanding' },
];

const METHOD_LABELS: Record<string, string> = {
    mobile: 'Мобайл', card: 'Карт', cash: 'Бэлэн', storepay: 'Storepay',
};
const MONTHS_MN = ['1','2','3','4','5','6','7','8','9','10','11','12'];

/* ------------------------------------------------------------------ */
/*  Date helpers                                                        */
/* ------------------------------------------------------------------ */
function addDays(d: string, n: number): string {
    const dt = new Date(d + 'T00:00:00');
    dt.setDate(dt.getDate() + n);
    return fmtDate(dt);
}
function addMonths(m: string, n: number): string {
    const [y, mo] = m.split('-').map(Number);
    const dt = new Date(y, mo - 1 + n, 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}
function fmtDate(dt: Date): string {
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}
function dateLabelMn(d: string): string {
    const dt = new Date(d + 'T00:00:00');
    return `${dt.getFullYear()} оны ${MONTHS_MN[dt.getMonth()]}-р сарын ${dt.getDate()}`;
}
function monthLabelMn(m: string): string {
    const [y, mo] = m.split('-').map(Number);
    return `${y} оны ${MONTHS_MN[mo - 1]}-р сар`;
}
function weekLabelMn(d: string): string {
    const end   = new Date(d + 'T00:00:00');
    const start = new Date(d + 'T00:00:00');
    start.setDate(start.getDate() - 6);
    const fmt = (dt: Date) => `${MONTHS_MN[dt.getMonth()]}-р сарын ${dt.getDate()}`;
    return `${fmt(start)} – ${fmt(end)}`;
}

/* ------------------------------------------------------------------ */
/*  Navigation helper                                                   */
/* ------------------------------------------------------------------ */
function go(patch: Partial<Filters>, current: Filters) {
    const p: Record<string, string> = {
        status:   patch.status   ?? current.status,
        mode:     patch.mode     ?? current.mode,
        date:     patch.date     ?? current.date,
        month:    patch.month    ?? current.month,
    };
    if (patch.branchId !== undefined ? patch.branchId : current.branchId) {
        p.branchId = (patch.branchId !== undefined ? patch.branchId : current.branchId) as string;
    }
    router.get('/admin/outstanding', p, { preserveScroll: false, preserveState: false });
}

function exportUrl(f: Filters): string {
    const p = new URLSearchParams({ status: f.status, mode: f.mode, date: f.date, month: f.month });
    if (f.branchId) p.set('branchId', f.branchId);
    return `/admin/outstanding/export?${p.toString()}`;
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                           */
/* ------------------------------------------------------------------ */
function StatCard({ label, count, amount, color, icon }: {
    label: string; count: number; amount: number;
    color: 'yellow' | 'green' | 'red';
    icon: ReactNode;
}) {
    const c = {
        yellow: { wrap: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20', lbl: 'text-yellow-600 dark:text-yellow-400', num: 'text-yellow-900 dark:text-yellow-100', amt: 'text-yellow-700 dark:text-yellow-300' },
        green:  { wrap: 'border-green-200  dark:border-green-800  bg-green-50  dark:bg-green-900/20',  lbl: 'text-green-600  dark:text-green-400',  num: 'text-green-900  dark:text-green-100',  amt: 'text-green-700  dark:text-green-300'  },
        red:    { wrap: 'border-red-200    dark:border-red-800    bg-red-50    dark:bg-red-900/20',    lbl: 'text-red-600    dark:text-red-400',    num: 'text-red-900    dark:text-red-100',    amt: 'text-red-700    dark:text-red-300'    },
    }[color];
    return (
        <div className={`rounded-xl border px-5 py-4 flex-1 min-w-36 ${c.wrap}`}>
            <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${c.lbl}`}>
                {icon}{label}
            </div>
            <p className={`text-2xl font-bold tabular-nums ${c.num}`}>{count}</p>
            <p className={`text-sm font-semibold tabular-nums mt-0.5 ${c.amt}`}>{amount.toLocaleString()}₮</p>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Period navigator                                                     */
/* ------------------------------------------------------------------ */
function PeriodNav({ filters }: { filters: Filters }) {
    const { mode, date, month } = filters;

    const label = mode === 'day'   ? dateLabelMn(date)
                : mode === 'week'  ? weekLabelMn(date)
                : mode === 'month' ? monthLabelMn(month)
                : 'Бүх цаг үе';

    const prev = mode === 'day'   ? () => go({ date:  addDays(date, -1)    }, filters)
               : mode === 'week'  ? () => go({ date:  addDays(date, -7)    }, filters)
               : mode === 'month' ? () => go({ month: addMonths(month, -1) }, filters)
               : null;

    const next = mode === 'day'   ? () => go({ date:  addDays(date, +1)    }, filters)
               : mode === 'week'  ? () => go({ date:  addDays(date, +7)    }, filters)
               : mode === 'month' ? () => go({ month: addMonths(month, +1) }, filters)
               : null;

    const today        = fmtDate(new Date());
    const thisMonth    = today.slice(0, 7);
    const isAtPresent  = mode === 'day'   ? date  === today
                       : mode === 'week'  ? date  === today
                       : mode === 'month' ? month === thisMonth
                       : true;

    return (
        <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm">
            {prev && (
                <button onClick={prev}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <ChevronLeft className="size-4" />
                </button>
            )}
            <span className="text-sm font-semibold text-foreground min-w-52 text-center select-none">
                {label}
            </span>
            {next && (
                <>
                    <button onClick={next} disabled={isAtPresent}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <ChevronRight className="size-4" />
                    </button>
                    {!isAtPresent && (
                        <button
                            onClick={() => go(
                                mode === 'month' ? { month: thisMonth } : { date: today },
                                filters
                            )}
                            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ml-0.5"
                        >
                            Өнөөдөр
                        </button>
                    )}
                </>
            )}
            {/* Date input for day mode */}
            {mode === 'day' && (
                <input
                    type="date"
                    value={date}
                    max={today}
                    onChange={e => e.target.value && go({ date: e.target.value }, filters)}
                    className="ml-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            )}
            {/* Month input for month mode */}
            {mode === 'month' && (
                <input
                    type="month"
                    value={month}
                    max={thisMonth}
                    onChange={e => e.target.value && go({ month: e.target.value }, filters)}
                    className="ml-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */
export default function AdminOutstandingIndex({ entries, branches, filters }: Props) {
    const unpaid  = entries.filter(e => !e.is_paid);
    const paid    = entries.filter(e => e.is_paid);
    const overdue = unpaid.filter(e => e.days_since >= 7);

    const totalUnpaid  = unpaid.reduce((s, e) => s + e.outstanding_amount, 0);
    const totalPaid    = paid.reduce((s, e) => s + (e.outstanding_paid_amount ?? 0), 0);
    const totalOverdue = overdue.reduce((s, e) => s + e.outstanding_amount, 0);

    const MODE_TABS = [
        { key: 'day'   as Mode, label: 'Өдөр'    },
        { key: 'week'  as Mode, label: '7 хоног'  },
        { key: 'month' as Mode, label: 'Сар'      },
        { key: 'all'   as Mode, label: 'Бүгд'     },
    ];

    const STATUS_TABS = [
        { key: 'all'    as const, label: 'Бүгд'    },
        { key: 'unpaid' as const, label: 'Дутуу'   },
        { key: 'paid'   as const, label: 'Төлсөн'  },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Дутуу тооцоо" />

            <div className="flex flex-col gap-4 p-4 md:p-6">

                {/* ── Header ── */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <TrendingDown className="size-5 text-yellow-600" />
                            <h1 className="text-xl font-bold text-foreground">Дутуу тооцоо</h1>
                            {unpaid.length > 0 && (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700">
                                    {unpaid.length}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Бүх салбар · Нэгтгэсэн харагдац</p>
                    </div>
                    <a href={exportUrl(filters)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                        <Download className="size-4" />
                        Excel татах
                    </a>
                </div>

                {/* ── Mode tabs + period nav ── */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Mode toggle */}
                    <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        {MODE_TABS.map(t => (
                            <button key={t.key}
                                onClick={() => go({ mode: t.key }, filters)}
                                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                                    filters.mode === t.key
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white dark:bg-gray-900 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Period navigator */}
                    {filters.mode !== 'all' && <PeriodNav filters={filters} />}
                </div>

                {/* ── Secondary filters ── */}
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 shadow-sm">
                    <Filter className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold text-muted-foreground">Шүүлт:</span>

                    <select
                        value={filters.branchId ?? ''}
                        onChange={e => go({ branchId: e.target.value || null }, filters)}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                        <option value="">Бүх салбар</option>
                        {branches.map(b => (
                            <option key={b.id} value={String(b.id)}>{b.name}</option>
                        ))}
                    </select>

                    <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                        {STATUS_TABS.map(t => (
                            <button key={t.key}
                                onClick={() => go({ status: t.key }, filters)}
                                className={`px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                                    filters.status === t.key
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-background text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <span className="ml-auto text-xs text-muted-foreground">{entries.length} бичлэг</span>
                </div>

                {/* ── Stat cards ── */}
                <div className="flex flex-wrap gap-3">
                    <StatCard label="Төлөгдөөгүй"    count={unpaid.length}  amount={totalUnpaid}  color="yellow" icon={<Clock className="size-3" />} />
                    <StatCard label="7хн+ хэтэрсэн"  count={overdue.length} amount={totalOverdue} color="red"    icon={<AlertTriangle className="size-3" />} />
                    <StatCard label="Төлөгдсөн"       count={paid.length}    amount={totalPaid}    color="green"  icon={<CheckCircle2 className="size-3" />} />
                </div>

                {/* ── Table ── */}
                {entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-muted-foreground">
                        <CheckCircle2 className="size-14 text-green-400 opacity-60" />
                        <div className="text-center">
                            <p className="text-sm font-semibold">Дутуу тооцоо байхгүй байна</p>
                            <p className="text-xs mt-1">Сонгосон хугацаа болон шүүлтийн дагуу бичлэг олдсонгүй</p>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse" style={{ minWidth: 920 }}>
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wide">
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Огноо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Салбар</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Үйлчлүүлэгч</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Оношилгоо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Баримт №</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-right font-semibold">Дутуу дүн</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-center font-semibold">Хоног</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Эмч</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Ресепшн</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold min-w-44">Статус / Дэлгэрэнгүй</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((e, idx) => {
                                        const od7 = !e.is_paid && e.days_since >= 7;
                                        const od3 = !e.is_paid && e.days_since >= 3 && e.days_since < 7;
                                        const rowBg = e.is_paid
                                            ? idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/15'
                                            : od7  ? 'bg-red-50 dark:bg-red-950/20'
                                            : od3  ? 'bg-orange-50/70 dark:bg-orange-950/10'
                                            : idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-amber-50/30 dark:bg-amber-900/5';
                                        return (
                                            <tr key={e.id} className={`${rowBg} hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors`}>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500 whitespace-nowrap">{e.date}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500 dark:text-gray-500 whitespace-nowrap">{e.branch ?? '—'}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 font-semibold text-gray-800 dark:text-gray-200">{e.patient_name ?? '—'}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500 max-w-36 truncate">{e.diagnosis ?? '—'}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 font-mono text-gray-500">{e.appointment_number ?? '—'}</td>
                                                <td className={`border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-right font-bold tabular-nums whitespace-nowrap ${
                                                    e.is_paid ? 'text-gray-400 line-through'
                                                    : od7 ? 'text-red-600 dark:text-red-400'
                                                    : 'text-amber-700 dark:text-amber-400'}`}>
                                                    {e.outstanding_amount.toLocaleString()}₮
                                                </td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-center">
                                                    {e.is_paid ? (
                                                        <span className="text-gray-300 dark:text-gray-600">—</span>
                                                    ) : (
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                            od7 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                            : od3 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                        }`}>
                                                            {e.days_since === 0 ? 'Өнөөдөр' : `${e.days_since}хн`}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500">{e.doctor_name ? shortDoctorName(e.doctor_name) : '—'}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500">{e.receptionist_name ?? '—'}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5">
                                                    {e.is_paid ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 dark:text-green-400">
                                                                <CheckCircle2 className="size-3" /> Төлөгдсөн
                                                            </span>
                                                            {e.outstanding_paid_amount != null && (
                                                                <span className="text-[11px] font-bold text-green-700 dark:text-green-400 tabular-nums">
                                                                    {e.outstanding_paid_amount.toLocaleString()}₮{e.outstanding_paid_method ? ` · ${METHOD_LABELS[e.outstanding_paid_method] ?? e.outstanding_paid_method}` : ''}
                                                                </span>
                                                            )}
                                                            {e.outstanding_paid_receipt && (
                                                                <span className="text-[10px] font-mono text-gray-400">{e.outstanding_paid_receipt}</span>
                                                            )}
                                                            {e.outstanding_paid_at && (
                                                                <span className="text-[10px] text-gray-400">{e.outstanding_paid_at}</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                                            <Clock className="size-3" /> Хүлээгдэж байна
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {entries.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-gray-100 dark:bg-gray-800">
                                            <td colSpan={5} className="border-t-2 border-gray-300 dark:border-gray-600 px-3 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                                Нийт {entries.length} бичлэг
                                            </td>
                                            <td className="border-t-2 border-gray-300 dark:border-gray-600 px-3 py-2.5 text-right text-xs font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                                                {totalUnpaid > 0 ? `${totalUnpaid.toLocaleString()}₮` : '—'}
                                            </td>
                                            <td colSpan={4} className="border-t-2 border-gray-300 dark:border-gray-600 px-3 py-2.5 text-xs text-gray-500">
                                                {overdue.length > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                                                        <AlertTriangle className="size-3" /> {overdue.length} хэтэрсэн бичлэг
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800 inline-block" />7+ хоног хэтэрсэн</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 inline-block" />3–6 хоног</span>
                    <span className="flex items-center gap-1.5"><AlertCircle className="size-3" /> Ресепшн төлөхийг хүлээж байна</span>
                </div>

            </div>
        </AppLayout>
    );
}

