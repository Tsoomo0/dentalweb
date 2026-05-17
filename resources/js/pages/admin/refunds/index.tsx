import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Building2, ChevronLeft, ChevronRight, Clock, Hash, MessageSquare, Search, Undo2, User, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';

interface RefundEntry {
    id: number;
    date: string;
    branch: string | null;
    patient_name: string | null;
    diagnosis: string | null;
    appointment_number: string | null;
    refund_amount: number;
    refund_method: string | null;
    refund_reason: string | null;
    refunded_at: string | null;
    doctor_name: string | null;
    receptionist_name: string | null;
}
interface Branch { id: number; name: string }
type Mode = 'day' | 'week' | 'month' | 'all';
interface Filters { branchId: string | null; mode: Mode; date: string; month: string }
interface Props { entries: RefundEntry[]; branches: Branch[]; filters: Filters; totalSelected: number }

const METHOD_LABELS: Record<string, string> = {
    bank: 'Данс', mobile: 'Мобайл', cash: 'Бэлэн', storepay: 'Storepay', card: 'Карт',
};
const METHOD_COLORS: Record<string, string> = {
    bank:     'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300',
    mobile:   'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
    cash:     'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300',
    storepay: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    card:     'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300',
};
const MONTHS_MN = ['1','2','3','4','5','6','7','8','9','10','11','12'];

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Буцаалт', href: '/admin/refunds' },
];

function fmtDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function addDays(d: string, n: number) { const dt = new Date(d+'T00:00:00'); dt.setDate(dt.getDate()+n); return fmtDate(dt); }
function addMonths(m: string, n: number) {
    const [y, mo] = m.split('-').map(Number);
    const dt = new Date(y, mo - 1 + n, 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}
function dateLabelMn(d: string) {
    const dt = new Date(d + 'T00:00:00');
    return `${dt.getFullYear()} оны ${MONTHS_MN[dt.getMonth()]}-р сарын ${dt.getDate()}`;
}
function monthLabelMn(m: string) {
    const [y, mo] = m.split('-').map(Number);
    return `${y} оны ${MONTHS_MN[mo - 1]}-р сар`;
}
function weekLabelMn(d: string) {
    const end = new Date(d + 'T00:00:00');
    const start = new Date(d + 'T00:00:00'); start.setDate(start.getDate() - 6);
    const f = (dt: Date) => `${MONTHS_MN[dt.getMonth()]}-р сарын ${dt.getDate()}`;
    return `${f(start)} – ${f(end)}`;
}

function go(patch: Partial<Filters>, current: Filters) {
    router.get('/admin/refunds', {
        branchId: patch.branchId ?? current.branchId ?? '',
        mode:     patch.mode     ?? current.mode,
        date:     patch.date     ?? current.date,
        month:    patch.month    ?? current.month,
    }, { preserveState: false });
}

export default function AdminRefundsIndex({ entries, branches, filters, totalSelected }: Props) {
    const [search, setSearch] = useState('');
    const today     = fmtDate(new Date());
    const thisMonth = today.slice(0, 7);

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
            (e.refund_reason ?? '').toLowerCase().includes(q) ||
            (e.diagnosis ?? '').toLowerCase().includes(q)
        );
    }, [entries, search]);

    // Method-аар тооцоо
    const byMethod = useMemo(() => {
        const acc: Record<string, number> = {};
        for (const e of entries) {
            const m = e.refund_method ?? 'unknown';
            acc[m] = (acc[m] ?? 0) + e.refund_amount;
        }
        return acc;
    }, [entries]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Буцаалт" />

            <div className="flex flex-col gap-5 p-4 md:p-6">

                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl border border-red-200/60 dark:border-red-800/40 bg-gradient-to-br from-red-50 via-white to-rose-50 dark:from-red-950/40 dark:via-gray-900 dark:to-rose-950/30 p-5 shadow-sm">
                    <div className="absolute -right-8 -top-8 size-32 rounded-full bg-red-200/40 dark:bg-red-700/20 blur-2xl" />
                    <div className="absolute -bottom-8 -left-8 size-24 rounded-full bg-rose-200/40 dark:bg-rose-700/20 blur-2xl" />
                    <div className="relative flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30">
                                <Undo2 className="size-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">Буцаалт</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {label} · Бүх салбарын буцаалтын тайлан
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <div className="rounded-xl bg-red-600 px-4 py-2.5 text-right shadow-md shadow-red-500/30">
                                <p className="text-[10px] uppercase tracking-wide text-white/80 font-semibold">Нийт буцаалт</p>
                                <p className="text-lg font-bold text-white tabular-nums">−{totalSelected.toLocaleString()}₮</p>
                                <p className="text-[10px] text-white/80">{entries.length} бичлэг</p>
                            </div>
                        </div>
                    </div>

                    {/* Method breakdown */}
                    {Object.keys(byMethod).length > 0 && (
                        <div className="relative mt-4 flex flex-wrap gap-2">
                            {Object.entries(byMethod).map(([m, amt]) => (
                                <div key={m} className={`rounded-lg px-3 py-1.5 text-xs ${METHOD_COLORS[m] ?? 'bg-gray-100 text-gray-600'}`}>
                                    <span className="font-semibold">{METHOD_LABELS[m] ?? m}</span>
                                    <span className="ml-2 font-bold tabular-nums">{amt.toLocaleString()}₮</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card p-3 shadow-sm">
                    <div className="relative flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-1.5 flex-1 min-w-60">
                        <Search className="size-4 text-muted-foreground" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Өвчтөн, баримт, шалтгаанаар хайх..."
                            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Building2 className="size-4 text-muted-foreground" />
                        <select value={filters.branchId ?? ''}
                            onChange={e => go({ branchId: e.target.value || null }, filters)}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30">
                            <option value="">Бүх салбар</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        {MODES.map(t => (
                            <button key={t.key} onClick={() => go({ mode: t.key }, filters)}
                                className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                                    filters.mode === t.key
                                        ? 'bg-red-600 text-white'
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
                                className="rounded-lg px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                Өнөөдөр
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/30">
                        <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                            <Undo2 className="size-8 text-red-600 dark:text-red-400" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">Буцаалт байхгүй</p>
                        <p className="text-xs text-muted-foreground mt-1">Сонгосон шүүлтэд тохирох буцаалт олдсонгүй</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse" style={{ minWidth: 1100 }}>
                                <thead>
                                    <tr className="bg-gray-50/80 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-[10.5px] uppercase tracking-wide">
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Анх огноо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Салбар</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Өвчтөн</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Оношилгоо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Баримт №</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-right font-semibold">Буцаасан дүн</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Хэлбэр</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Шалтгаан</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Буцаасан огноо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Эмч</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Ресепшн</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((e, idx) => (
                                        <tr key={e.id} className={`group transition-colors ${
                                            idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/15'
                                        } hover:bg-red-50/40 dark:hover:bg-red-950/15`}>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300 font-medium">{e.date}</td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3">
                                                {e.branch ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                                                        <Building2 className="size-2.5" />{e.branch}
                                                    </span>
                                                ) : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex size-7 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-[10px] font-bold text-red-700 dark:text-red-300">
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
                                                <span className="rounded-lg bg-red-50 dark:bg-red-950/40 px-2 py-1 font-bold text-red-700 dark:text-red-400">
                                                    −{e.refund_amount.toLocaleString()}₮
                                                </span>
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3">
                                                {e.refund_method ? (
                                                    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${METHOD_COLORS[e.refund_method] ?? 'bg-gray-100 text-gray-600'}`}>
                                                        <Wallet className="size-2.5" />{METHOD_LABELS[e.refund_method] ?? e.refund_method}
                                                    </span>
                                                ) : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 max-w-40 truncate" title={e.refund_reason ?? ''}>
                                                {e.refund_reason ? (
                                                    <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400 italic">
                                                        <MessageSquare className="size-3 opacity-50 shrink-0" />{e.refund_reason}
                                                    </span>
                                                ) : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 whitespace-nowrap">
                                                {e.refunded_at ? (
                                                    <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                                        <Clock className="size-3 opacity-50" />{e.refunded_at}
                                                    </span>
                                                ) : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 text-gray-500">{e.doctor_name ?? '—'}</td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3">
                                                {e.receptionist_name ? (
                                                    <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                                        <User className="size-3 opacity-50" />{e.receptionist_name}
                                                    </span>
                                                ) : <span className="text-gray-400">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
