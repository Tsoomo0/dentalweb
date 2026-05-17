import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Building2, CheckCircle2, Clock, Hash, Search, Sparkles, TrendingUp, User, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';

interface OverpaidEntry {
    id: number;
    date: string;
    branch: string | null;
    patient_name: string | null;
    diagnosis: string | null;
    appointment_number: string | null;
    overpaid_amount: number;
    overpaid_used_at: string | null;
    overpaid_used_receipt: string | null;
    overpaid_used_method: string | null;
    overpaid_used_amount: number | null;
    doctor_name: string | null;
    receptionist_name: string | null;
}
interface Branch { id: number; name: string }
interface Filters { branchId: string | null; tab: 'all' | 'pending' | 'used' }
interface Props { entries: OverpaidEntry[]; branches: Branch[]; filters: Filters }

const METHOD_LABELS: Record<string, string> = {
    mobile: 'Мобайл', card: 'Карт', cash: 'Бэлэн', storepay: 'Storepay',
};
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Илүү тооцоо', href: '/admin/overpaid' },
];

function go(patch: Partial<Filters>, current: Filters) {
    router.get('/admin/overpaid', {
        branchId: patch.branchId ?? current.branchId ?? '',
        tab:      patch.tab      ?? current.tab,
    }, { preserveState: false });
}

export default function AdminOverpaidIndex({ entries, branches, filters }: Props) {
    const [search, setSearch] = useState('');
    const pending = entries.filter(e => !e.overpaid_used_at);
    const used    = entries.filter(e => !!e.overpaid_used_at);
    const totalAmount = entries.reduce((s, e) => s + e.overpaid_amount, 0);
    const pendingAmt  = pending.reduce((s, e) => s + e.overpaid_amount, 0);
    const usedAmt     = used.reduce((s, e) => s + (e.overpaid_used_amount ?? e.overpaid_amount), 0);

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
            <Head title="Илүү тооцоо" />

            <div className="flex flex-col gap-5 p-4 md:p-6">

                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/40 dark:via-gray-900 dark:to-teal-950/30 p-5 shadow-sm">
                    <div className="absolute -right-8 -top-8 size-32 rounded-full bg-emerald-200/40 dark:bg-emerald-700/20 blur-2xl" />
                    <div className="absolute -bottom-8 -left-8 size-24 rounded-full bg-teal-200/40 dark:bg-teal-700/20 blur-2xl" />
                    <div className="relative flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
                                <TrendingUp className="size-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    Илүү тооцоо
                                    <Sparkles className="size-4 text-emerald-500" />
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Бүх салбарын илүү төлсөн дүн, ашиглалт хяналт
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 backdrop-blur px-4 py-2.5 text-right border border-emerald-100/80 dark:border-emerald-900/50">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Хүлээгдэж буй</p>
                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">+{pendingAmt.toLocaleString()}₮</p>
                                <p className="text-[10px] text-muted-foreground">{pending.length} бичлэг</p>
                            </div>
                            <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 backdrop-blur px-4 py-2.5 text-right border border-gray-200/80 dark:border-gray-700/50">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Ашигласан</p>
                                <p className="text-lg font-bold text-gray-600 dark:text-gray-300 tabular-nums">{usedAmt.toLocaleString()}₮</p>
                                <p className="text-[10px] text-muted-foreground">{used.length} бичлэг</p>
                            </div>
                            <div className="rounded-xl bg-emerald-600 px-4 py-2.5 text-right shadow-md shadow-emerald-500/30">
                                <p className="text-[10px] uppercase tracking-wide text-white/80 font-semibold">Нийт</p>
                                <p className="text-lg font-bold text-white tabular-nums">{totalAmount.toLocaleString()}₮</p>
                                <p className="text-[10px] text-white/80">{entries.length} бичлэг</p>
                            </div>
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
                            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                            <option value="">Бүх салбар</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        {([
                            { key: 'all',     label: 'Бүгд',           count: entries.length, color: 'bg-emerald-600 text-white' },
                            { key: 'pending', label: 'Хүлээгдэж буй',  count: pending.length, color: 'bg-amber-500 text-white' },
                            { key: 'used',    label: 'Ашигласан',      count: used.length,    color: 'bg-gray-700 text-white' },
                        ] as const).map(t => (
                            <button key={t.key} onClick={() => go({ tab: t.key }, filters)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${
                                    filters.tab === t.key
                                        ? t.color
                                        : 'bg-white dark:bg-gray-900 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}>
                                {t.label}
                                <span className={`rounded-full px-1.5 py-0 text-[10px] tabular-nums ${
                                    filters.tab === t.key ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
                                }`}>{t.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/30">
                        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                            <TrendingUp className="size-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">Илүү тооцоо байхгүй</p>
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
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Өвчтөн</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Оношилгоо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Баримт №</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-right font-semibold">Илүү дүн</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Төлөв</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Ашигласан баримт</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Хэлбэр</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Эмч</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Ресепшн</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((e, idx) => (
                                        <tr key={e.id} className={`group transition-colors ${
                                            idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/15'
                                        } hover:bg-emerald-50/40 dark:hover:bg-emerald-950/15`}>
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
                                                    <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                                        {(e.patient_name ?? '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-semibold text-foreground">{e.patient_name ?? '—'}</span>
                                                </div>
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 text-gray-500 max-w-40 truncate">{e.diagnosis ?? '—'}</td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 font-mono text-xs text-gray-500">
                                                {e.appointment_number ? <span className="inline-flex items-center gap-0.5"><Hash className="size-2.5 opacity-50" />{e.appointment_number}</span> : '—'}
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 text-right tabular-nums whitespace-nowrap">
                                                <span className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 font-bold text-emerald-700 dark:text-emerald-400">
                                                    +{e.overpaid_amount.toLocaleString()}₮
                                                </span>
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3">
                                                {e.overpaid_used_at ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                                        <CheckCircle2 className="size-3" /> Ашигласан
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                        <Clock className="size-3" /> Хүлээгдэж буй
                                                    </span>
                                                )}
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 font-mono text-gray-500">{e.overpaid_used_receipt ?? '—'}</td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3">
                                                {e.overpaid_used_method ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 dark:bg-violet-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                                                        <Wallet className="size-2.5" />{METHOD_LABELS[e.overpaid_used_method] ?? e.overpaid_used_method}
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
