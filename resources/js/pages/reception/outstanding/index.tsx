import ReceptionLayout from '@/layouts/reception-layout';
import { shortDoctorName } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronLeft,
    ChevronRight, ChevronUp, Clock, TrendingDown, X,
} from 'lucide-react';
import { useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface OutstandingEntry {
    id: number;
    patient_name: string | null;
    gender: string | null;
    diagnosis: string | null;
    appointment_number: string | null;
    outstanding_amount: number;
    date: string;
    receptionist_name: string | null;
    doctor_name: string | null;
    days_since: number;
    is_mine: boolean;
    is_paid: boolean;
    outstanding_paid_at: string | null;
    outstanding_paid_receipt: string | null;
    outstanding_paid_method: string | null;
    outstanding_paid_amount: number | null;
}

type Mode = 'day' | 'week' | 'month' | 'all';

interface Filters { mode: Mode; date: string; month: string }
interface Props { entries: OutstandingEntry[]; filters: Filters }

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар', href: '/reception/dashboard' },
    { title: 'Дутуу тооцоо',    href: '/reception/outstanding' },
];
const METHOD_LABELS: Record<string, string> = {
    mobile: 'Мобайл', card: 'Карт', cash: 'Бэлэн', storepay: 'Storepay',
};
const METHODS = ['cash', 'mobile', 'card', 'storepay'] as const;
const MONTHS_MN = ['1','2','3','4','5','6','7','8','9','10','11','12'];

/* ------------------------------------------------------------------ */
/*  Date helpers                                                        */
/* ------------------------------------------------------------------ */
function fmtDate(dt: Date): string {
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}
function addDays(d: string, n: number): string {
    const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() + n); return fmtDate(dt);
}
function addMonths(m: string, n: number): string {
    const [y, mo] = m.split('-').map(Number);
    const dt = new Date(y, mo - 1 + n, 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
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
    const end = new Date(d + 'T00:00:00');
    const start = new Date(d + 'T00:00:00'); start.setDate(start.getDate() - 6);
    const f = (dt: Date) => `${MONTHS_MN[dt.getMonth()]}-р сарын ${dt.getDate()}`;
    return `${f(start)} – ${f(end)}`;
}

/* ------------------------------------------------------------------ */
/*  Navigate                                                            */
/* ------------------------------------------------------------------ */
function go(patch: Partial<Filters>, current: Filters) {
    const p: Record<string, string> = {
        mode:  patch.mode  ?? current.mode,
        date:  patch.date  ?? current.date,
        month: patch.month ?? current.month,
    };
    router.get('/reception/outstanding', p, { preserveScroll: false, preserveState: false });
}

/* ------------------------------------------------------------------ */
/*  Period nav bar                                                      */
/* ------------------------------------------------------------------ */
function PeriodNav({ filters }: { filters: Filters }) {
    const { mode, date, month } = filters;
    const today     = fmtDate(new Date());
    const thisMonth = today.slice(0, 7);

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

    const isAtPresent = mode === 'day'   ? date  === today
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
            <span className="text-sm font-semibold text-foreground min-w-48 text-center select-none">
                {label}
            </span>
            {next && (
                <>
                    <button onClick={next} disabled={isAtPresent}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <ChevronRight className="size-4" />
                    </button>
                    {!isAtPresent && (
                        <button
                            onClick={() => go(mode === 'month' ? { month: thisMonth } : { date: today }, filters)}
                            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            Өнөөдөр
                        </button>
                    )}
                </>
            )}
            {mode === 'day' && (
                <input type="date" value={date} max={today}
                    onChange={e => e.target.value && go({ date: e.target.value }, filters)}
                    className="ml-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
            {mode === 'month' && (
                <input type="month" value={month} max={thisMonth}
                    onChange={e => e.target.value && go({ month: e.target.value }, filters)}
                    className="ml-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Pay Modal                                                           */
/* ------------------------------------------------------------------ */
function PayModal({ entry, onClose }: { entry: OutstandingEntry; onClose: () => void }) {
    const [method,  setMethod]  = useState<'mobile' | 'card' | 'cash' | 'storepay'>('cash');
    const [amount,  setAmount]  = useState(String(entry.outstanding_amount));
    const [receipt, setReceipt] = useState(entry.appointment_number ?? '');
    const [busy,    setBusy]    = useState(false);
    const parsedAmt = parseInt(amount.replace(/[^0-9]/g, ''), 10) || 0;

    function submit() {
        if (parsedAmt <= 0) return;
        setBusy(true);
        router.post(`/reception/daily-sheet/pay-outstanding/${entry.id}`, {
            paid_amount: parsedAmt, paid_method: method,
            paid_receipt: receipt.trim() || null,
        }, {
            preserveScroll: true,
            onFinish: () => { setBusy(false); onClose(); },
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border bg-card shadow-2xl overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400" />
                <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <h3 className="text-base font-bold text-foreground">Дутуу тооцоо төлөх</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {entry.patient_name ?? '—'} · {entry.date}
                                {entry.doctor_name ? ` · ${shortDoctorName(entry.doctor_name)}` : ''}
                            </p>
                        </div>
                        <button onClick={onClose}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                            <X className="size-4" />
                        </button>
                    </div>

                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 mb-5 space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Дутуу дүн</span>
                            <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums text-base">
                                {entry.outstanding_amount.toLocaleString()}₮
                            </span>
                        </div>
                        {entry.diagnosis && (
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Оношилгоо</span>
                                <span className="font-medium text-foreground">{entry.diagnosis}</span>
                            </div>
                        )}
                        {entry.appointment_number && (
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Захиалгын №</span>
                                <span className="font-mono text-foreground">{entry.appointment_number}</span>
                            </div>
                        )}
                        {entry.days_since > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Хугацаа хэтэрсэн</span>
                                <span className={`font-semibold ${entry.days_since >= 7 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                    {entry.days_since} хоног
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Төлсөн дүн</label>
                            <div className="relative">
                                <input type="text" inputMode="numeric" value={amount}
                                    onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-background px-4 py-2.5 pr-8 text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500 transition" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₮</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Төлбөрийн хэлбэр</label>
                            <div className="grid grid-cols-4 gap-2">
                                {METHODS.map(m => (
                                    <button key={m} type="button" onClick={() => setMethod(m)}
                                        className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                                            method === m
                                                ? 'bg-green-600 border-green-600 text-white shadow-md shadow-green-200 dark:shadow-green-900/30'
                                                : 'border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-green-400 hover:text-green-600'
                                        }`}>
                                        {METHOD_LABELS[m]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                                Баримтын дугаар <span className="normal-case font-normal">(заавал биш)</span>
                            </label>
                            <input type="text" value={receipt} onChange={e => setReceipt(e.target.value)}
                                placeholder="Жишээ: TXN-12345"
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-background px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 transition" />
                        </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                        <button onClick={submit} disabled={busy || parsedAmt <= 0}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                            {busy
                                ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                : <CheckCircle2 className="size-4" />}
                            Төлөгдлөө гэж тэмдэглэх
                        </button>
                        <button onClick={onClose}
                            className="rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
                            Цуцлах
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Days badge                                                          */
/* ------------------------------------------------------------------ */
function DaysBadge({ days }: { days: number }) {
    if (days === 0) return <span className="text-gray-400 text-[11px]">Өнөөдөр</span>;
    const cls = days >= 7
        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
        : days >= 3
            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
    return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${cls}`}>{days}хн</span>;
}

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */
export default function OutstandingIndex({ entries, filters }: Props) {
    const [modal,    setModal]    = useState<OutstandingEntry | null>(null);

    const unpaid  = entries.filter(e => !e.is_paid);
    const paid    = entries.filter(e => e.is_paid);
    const overdue = unpaid.filter(e => e.days_since >= 7);
    const [showPaid, setShowPaid] = useState(paid.length > 0);

    const totalUnpaid = unpaid.reduce((s, e) => s + e.outstanding_amount, 0);

    const MODE_TABS: { key: Mode; label: string }[] = [
        { key: 'day',   label: 'Өдөр'   },
        { key: 'week',  label: '7 хоног' },
        { key: 'month', label: 'Сар'     },
        { key: 'all',   label: 'Бүгд'   },
    ];

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Дутуу тооцоо" />

            <div className="flex flex-col gap-4 p-3 md:p-5">

                {/* ── Header ── */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <TrendingDown className="size-5 text-yellow-600" />
                            <h1 className="text-lg font-bold text-foreground">Дутуу тооцоо</h1>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Салбарын дутуу тооцоо</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {unpaid.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700">
                                <Clock className="size-3" />
                                {unpaid.length} дутуу · {totalUnpaid.toLocaleString()}₮
                            </span>
                        )}
                        {overdue.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700">
                                <AlertTriangle className="size-3" />
                                {overdue.length} хэтэрсэн
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Mode tabs + period nav ── */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        {MODE_TABS.map(t => (
                            <button key={t.key}
                                onClick={() => go({ mode: t.key }, filters)}
                                className={`px-3.5 py-2 text-sm font-semibold transition-colors ${
                                    filters.mode === t.key
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white dark:bg-gray-900 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    {filters.mode !== 'all' && <PeriodNav filters={filters} />}
                </div>

                {/* ── Unpaid section ── */}
                {unpaid.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-muted-foreground">
                        <CheckCircle2 className="size-12 text-green-400 opacity-60" />
                        <div className="text-center">
                            <p className="text-sm font-semibold">Дутуу тооцоо байхгүй</p>
                            <p className="text-xs mt-1">Сонгосон хугацаанд бичлэг олдсонгүй</p>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl overflow-hidden border border-amber-200 dark:border-amber-800 shadow-sm">
                        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 border-b border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-sm font-bold text-amber-800 dark:text-amber-300">Төлөгдөөгүй дутуу тооцоо</span>
                            </div>
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                                {unpaid.length} бичлэг · {totalUnpaid.toLocaleString()}₮
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse" style={{ minWidth: 680 }}>
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-[10.5px] uppercase tracking-wide">
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left font-semibold">Огноо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left font-semibold">Үйлчлүүлэгч</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left font-semibold">Оношилгоо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left font-semibold">Баримт №</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-right font-semibold">Дутуу дүн</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-center font-semibold">Хоног</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left font-semibold">Ресепшн</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left font-semibold">Эмч</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-center font-semibold w-20"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {unpaid.map((e, idx) => {
                                        const od7 = e.days_since >= 7;
                                        const od3 = e.days_since >= 3 && e.days_since < 7;
                                        const rowBg = od7 ? 'bg-red-50 dark:bg-red-950/20'
                                            : od3 ? 'bg-orange-50/60 dark:bg-orange-950/10'
                                            : idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-amber-50/30 dark:bg-amber-900/5';
                                        return (
                                            <tr key={e.id} className={`${rowBg} transition-colors`}>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{e.date}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{e.patient_name ?? '—'}</span>
                                                    {e.gender && (
                                                        <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-semibold ${e.gender === 'Эр' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'}`}>
                                                            {e.gender}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500 max-w-36 truncate">{e.diagnosis ?? '—'}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 font-mono text-gray-500">{e.appointment_number ?? '—'}</td>
                                                <td className={`border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-right font-bold tabular-nums whitespace-nowrap ${od7 ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                                    {e.outstanding_amount.toLocaleString()}₮
                                                </td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-center">
                                                    <DaysBadge days={e.days_since} />
                                                </td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500">{e.receptionist_name ?? '—'}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500">{e.doctor_name ? shortDoctorName(e.doctor_name) : '—'}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-center">
                                                    <button onClick={() => setModal(e)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-green-600 hover:bg-green-700 active:scale-95 text-white transition-all shadow-sm">
                                                        <CheckCircle2 className="size-3" /> Төлөх
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Paid history ── */}
                {paid.length > 0 && (
                    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        <button onClick={() => setShowPaid(v => !v)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="size-4 text-green-500" />
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Төлөгдсөн тооцоо</span>
                                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 px-2 py-0.5 rounded-full font-semibold">{paid.length}</span>
                            </div>
                            {showPaid ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                        </button>
                        {showPaid && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse" style={{ minWidth: 780 }}>
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-[10.5px] uppercase tracking-wide">
                                            <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left font-semibold">Огноо</th>
                                            <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left font-semibold">Үйлчлүүлэгч</th>
                                            <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left font-semibold">Оношилгоо</th>
                                            <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-right font-semibold">Дутуу дүн</th>
                                            <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-right font-semibold">Төлсөн дүн</th>
                                            <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left font-semibold">Хэлбэр</th>
                                            <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left font-semibold">Баримт №</th>
                                            <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left font-semibold">Төлсөн огноо</th>
                                            <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left font-semibold">Ресепшн</th>
                                            <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 text-left font-semibold">Эмч</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paid.map((e, idx) => (
                                            <tr key={e.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/15'}>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500 whitespace-nowrap">{e.date}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 font-medium text-gray-700 dark:text-gray-300">
                                                    {e.patient_name ?? '—'}
                                                    {e.gender && (
                                                        <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-semibold ${e.gender === 'Эр' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'}`}>
                                                            {e.gender}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500 max-w-32 truncate">{e.diagnosis ?? '—'}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-right tabular-nums text-gray-400 line-through">{e.outstanding_amount.toLocaleString()}₮</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-right tabular-nums font-bold text-green-700 dark:text-green-400">
                                                    {e.outstanding_paid_amount?.toLocaleString() ?? '—'}₮
                                                </td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-600 dark:text-gray-300">
                                                    {e.outstanding_paid_method ? METHOD_LABELS[e.outstanding_paid_method] ?? e.outstanding_paid_method : '—'}
                                                </td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 font-mono text-gray-500">{e.outstanding_paid_receipt ?? '—'}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500 whitespace-nowrap">{e.outstanding_paid_at ?? '—'}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500">{e.receptionist_name ?? '—'}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 text-gray-500">{e.doctor_name ? shortDoctorName(e.doctor_name) : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Legend */}
                {unpaid.length > 0 && (
                    <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800 inline-block" />7+ хоног хэтэрсэн</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-50 border border-orange-200 inline-block" />3–6 хоног</span>
                    </div>
                )}

            </div>

            {modal && <PayModal entry={modal} onClose={() => setModal(null)} />}
        </ReceptionLayout>
    );
}
