import AppLayout from '@/layouts/app-layout';
import { shortDoctorName } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle, Building2, CheckCircle2, ChevronLeft, ChevronRight,
    Clock, Download, Hash, MessageSquare, Search, TrendingDown, User, Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';

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

interface Props { entries: OutstandingEntry[]; branches: Branch[]; filters: Filters }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Дутуу тооцоо', href: '/admin/outstanding' },
];

const METHOD_LABELS: Record<string, string> = {
    mobile: 'Мобайл', card: 'Карт', cash: 'Бэлэн', storepay: 'Storepay',
};
const METHOD_COLORS: Record<string, string> = {
    mobile:   'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
    card:     'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300',
    cash:     'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300',
    storepay: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
};
const MONTHS_MN = ['1','2','3','4','5','6','7','8','9','10','11','12'];

function addDays(d: string, n: number): string {
    const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() + n); return fmtDate(dt);
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
    const end = new Date(d + 'T00:00:00');
    const start = new Date(d + 'T00:00:00'); start.setDate(start.getDate() - 6);
    const fmt = (dt: Date) => `${MONTHS_MN[dt.getMonth()]}-р сарын ${dt.getDate()}`;
    return `${fmt(start)} – ${fmt(end)}`;
}

function go(patch: Partial<Filters>, current: Filters) {
    const p: Record<string, string> = {
        status: patch.status ?? current.status,
        mode:   patch.mode   ?? current.mode,
        date:   patch.date   ?? current.date,
        month:  patch.month  ?? current.month,
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

export default function AdminOutstandingIndex({ entries, branches, filters }: Props) {
    const [search, setSearch] = useState('');
    const today     = fmtDate(new Date());
    const thisMonth = today.slice(0, 7);

    const unpaid  = entries.filter(e => !e.is_paid);
    const paid    = entries.filter(e => e.is_paid);
    const overdue = unpaid.filter(e => e.days_since >= 7);

    const totalUnpaid  = unpaid.reduce((s, e) => s + e.outstanding_amount, 0);
    const totalPaid    = paid.reduce((s, e) => s + (e.outstanding_paid_amount ?? 0), 0);
    const totalOverdue = overdue.reduce((s, e) => s + e.outstanding_amount, 0);

    const label = filters.mode === 'day'   ? dateLabelMn(filters.date)
                : filters.mode === 'week'  ? weekLabelMn(filters.date)
                : filters.mode === 'month' ? monthLabelMn(filters.month)
                : 'Бүх цаг үе';

    const MODES: { key: Mode; label: string }[] = [
        { key: 'day',   label: 'Өдөр'    },
        { key: 'week',  label: '7 хоног' },
        { key: 'month', label: 'Сар'     },
        { key: 'all',   label: 'Бүгд'    },
    ];

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return entries;
        return entries.filter(e =>
            (e.patient_name ?? '').toLowerCase().includes(q) ||
            (e.appointment_number ?? '').toLowerCase().includes(q) ||
            (e.diagnosis ?? '').toLowerCase().includes(q)
        );
    }, [entries, search]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Дутуу тооцоо" />

            <div className="flex flex-col gap-5 p-4 md:p-6">

                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-amber-950/40 dark:via-gray-900 dark:to-yellow-950/30 p-5 shadow-sm">
                    <div className="absolute -right-8 -top-8 size-32 rounded-full bg-amber-200/40 dark:bg-amber-700/20 blur-2xl" />
                    <div className="absolute -bottom-8 -left-8 size-24 rounded-full bg-yellow-200/40 dark:bg-yellow-700/20 blur-2xl" />
                    <div className="relative flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/30">
                                <TrendingDown className="size-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">Дутуу тооцоо</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {label} · Бүх салбарын нэгтгэсэн харагдац
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 backdrop-blur px-4 py-2.5 text-right border border-amber-100/80 dark:border-amber-900/50">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Төлөгдөөгүй</p>
                                <p className="text-lg font-bold text-amber-700 dark:text-amber-400 tabular-nums">{totalUnpaid.toLocaleString()}₮</p>
                                <p className="text-[10px] text-muted-foreground">{unpaid.length} бичлэг</p>
                            </div>
                            <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 backdrop-blur px-4 py-2.5 text-right border border-red-100/80 dark:border-red-900/50">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">7+ хэтэрсэн</p>
                                <p className="text-lg font-bold text-red-600 dark:text-red-400 tabular-nums">{totalOverdue.toLocaleString()}₮</p>
                                <p className="text-[10px] text-muted-foreground">{overdue.length} бичлэг</p>
                            </div>
                            <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 backdrop-blur px-4 py-2.5 text-right border border-green-100/80 dark:border-green-900/50">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Төлөгдсөн</p>
                                <p className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">{totalPaid.toLocaleString()}₮</p>
                                <p className="text-[10px] text-muted-foreground">{paid.length} бичлэг</p>
                            </div>
                            <a href={exportUrl(filters)}
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-500/30 hover:bg-amber-700 transition-colors">
                                <Download className="size-4" /> Excel
                            </a>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card p-3 shadow-sm">
                    <div className="relative flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-1.5 flex-1 min-w-60">
                        <Search className="size-4 text-muted-foreground" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Өвчтөн, баримт, оношилгоогоор хайх..."
                            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Building2 className="size-4 text-muted-foreground" />
                        <select value={filters.branchId ?? ''}
                            onChange={e => go({ branchId: e.target.value || null }, filters)}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                            <option value="">Бүх салбар</option>
                            {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                        </select>
                    </div>

                    <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        {MODES.map(t => (
                            <button key={t.key} onClick={() => go({ mode: t.key }, filters)}
                                className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                                    filters.mode === t.key
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-white dark:bg-gray-900 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {filters.mode !== 'all' && (
                        <div className="flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-1.5 py-0.5 shadow-sm">
                            <button onClick={() => filters.mode === 'month'
                                ? go({ month: addMonths(filters.month, -1) }, filters)
                                : go({ date: addDays(filters.date, filters.mode === 'week' ? -7 : -1) }, filters)
                            } className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                                <ChevronLeft className="size-4" />
                            </button>
                            <button onClick={() => filters.mode === 'month'
                                ? go({ month: addMonths(filters.month, 1) }, filters)
                                : go({ date: addDays(filters.date, filters.mode === 'week' ? 7 : 1) }, filters)
                            } className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                                <ChevronRight className="size-4" />
                            </button>
                            <button onClick={() => go(filters.mode === 'month' ? { month: thisMonth } : { date: today }, filters)}
                                className="rounded-lg px-2 py-1 text-[11px] font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                                Өнөөдөр
                            </button>
                        </div>
                    )}

                    <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        {([
                            { key: 'all',    label: 'Бүгд',    color: 'bg-gray-700' },
                            { key: 'unpaid', label: 'Дутуу',   color: 'bg-amber-600' },
                            { key: 'paid',   label: 'Төлсөн',  color: 'bg-green-600' },
                        ] as const).map(t => (
                            <button key={t.key} onClick={() => go({ status: t.key }, filters)}
                                className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                                    filters.status === t.key
                                        ? `${t.color} text-white`
                                        : 'bg-white dark:bg-gray-900 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/30">
                        <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                            <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">Дутуу тооцоо байхгүй</p>
                        <p className="text-xs text-muted-foreground mt-1">Сонгосон шүүлтэд тохирох бичлэг олдсонгүй</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse" style={{ minWidth: 1100 }}>
                                <thead>
                                    <tr className="bg-gray-50/80 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-[10.5px] uppercase tracking-wide">
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Огноо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Салбар</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Үйлчлүүлэгч</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Оношилгоо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Баримт №</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-right font-semibold">Дутуу дүн</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-center font-semibold">Хоног</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Эмч</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Ресепшн</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold min-w-48">Статус / Дэлгэрэнгүй</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((e, idx) => {
                                        const od7 = !e.is_paid && e.days_since >= 7;
                                        const od3 = !e.is_paid && e.days_since >= 3 && e.days_since < 7;
                                        const rowBg = e.is_paid
                                            ? idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/15'
                                            : od7 ? 'bg-red-50/60 dark:bg-red-950/15'
                                            : od3 ? 'bg-orange-50/50 dark:bg-orange-950/10'
                                            : idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-amber-50/20 dark:bg-amber-900/5';
                                        return (
                                            <tr key={e.id} className={`${rowBg} hover:bg-amber-50/40 dark:hover:bg-amber-950/15 transition-colors`}>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">{e.date}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3">
                                                    {e.branch ? (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                                                            <Building2 className="size-2.5" />{e.branch}
                                                        </span>
                                                    ) : <span className="text-gray-400">—</span>}
                                                </td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`flex size-7 items-center justify-center rounded-full text-[10px] font-bold ${
                                                            e.is_paid
                                                                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                                                : od7
                                                                    ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                                                    : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                                        }`}>
                                                            {(e.patient_name ?? '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-semibold text-foreground">{e.patient_name ?? '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 text-gray-500 max-w-36 truncate">{e.diagnosis ?? '—'}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 font-mono text-xs text-gray-500">
                                                    {e.appointment_number ? <span className="inline-flex items-center gap-0.5"><Hash className="size-2.5 opacity-50" />{e.appointment_number}</span> : '—'}
                                                </td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 text-right tabular-nums whitespace-nowrap">
                                                    <span className={`rounded-lg px-2 py-1 font-bold ${
                                                        e.is_paid
                                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 line-through'
                                                            : od7
                                                                ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                                                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                                                    }`}>
                                                        {e.outstanding_amount.toLocaleString()}₮
                                                    </span>
                                                </td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 text-center">
                                                    {e.is_paid ? (
                                                        <span className="text-gray-300 dark:text-gray-600">—</span>
                                                    ) : (
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            od7 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                            : od3 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                        }`}>
                                                            {e.days_since === 0 ? 'Өнөөдөр' : `${e.days_since}хн`}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 text-gray-500">{e.doctor_name ? shortDoctorName(e.doctor_name) : '—'}</td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3">
                                                    {e.receptionist_name ? (
                                                        <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                                            <User className="size-3 opacity-50" />{e.receptionist_name}
                                                        </span>
                                                    ) : <span className="text-gray-400">—</span>}
                                                </td>
                                                <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3">
                                                    {e.is_paid ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="inline-flex items-center gap-1 rounded-md bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-300">
                                                                    <CheckCircle2 className="size-2.5" /> Төлөгдсөн
                                                                </span>
                                                                {e.outstanding_paid_amount != null && (
                                                                    <span className="text-[11px] font-bold text-green-700 dark:text-green-400 tabular-nums">
                                                                        +{e.outstanding_paid_amount.toLocaleString()}₮
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[10px]">
                                                                {e.outstanding_paid_method && (
                                                                    <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-semibold ${METHOD_COLORS[e.outstanding_paid_method] ?? 'bg-gray-100 text-gray-600'}`}>
                                                                        <Wallet className="size-2.5" />{METHOD_LABELS[e.outstanding_paid_method] ?? e.outstanding_paid_method}
                                                                    </span>
                                                                )}
                                                                {e.outstanding_paid_receipt && (
                                                                    <span className="font-mono text-gray-400">{e.outstanding_paid_receipt}</span>
                                                                )}
                                                                {e.outstanding_paid_at && (
                                                                    <span className="text-gray-400">· {e.outstanding_paid_at}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                            <Clock className="size-2.5" /> Хүлээгдэж байна
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {filtered.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-gray-50 dark:bg-gray-800/60">
                                            <td colSpan={5} className="border-t-2 border-amber-300 dark:border-amber-700 px-3 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                                Нийт {filtered.length} бичлэг
                                            </td>
                                            <td className="border-t-2 border-amber-300 dark:border-amber-700 px-3 py-2.5 text-right text-xs font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                                                {totalUnpaid > 0 ? `${totalUnpaid.toLocaleString()}₮` : '—'}
                                            </td>
                                            <td colSpan={4} className="border-t-2 border-amber-300 dark:border-amber-700 px-3 py-2.5 text-xs">
                                                {overdue.length > 0 && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-red-700 dark:text-red-400 font-semibold">
                                                        <AlertTriangle className="size-3" /> {overdue.length} хэтэрсэн
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
                <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground px-1">
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800" />
                        7+ хоног хэтэрсэн
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-orange-50 dark:bg-orange-950/20 border border-orange-300 dark:border-orange-800" />
                        3–6 хоног
                    </span>
                    <span className="flex items-center gap-1.5">
                        <MessageSquare className="size-3" /> Ресепшнээс төлөхийг хүлээж байна
                    </span>
                </div>

            </div>
        </AppLayout>
    );
}
