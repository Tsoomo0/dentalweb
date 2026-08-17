import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Building2, CheckCircle2, Clock, Hash, Pencil, Search, Sparkles, Trash2, TrendingUp, User, Wallet, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Usage {
    id: number;
    receipt: string;
    amount: number;
    method: string | null;
    /** Аль өдрийн тооцоонд баланслагдсан */
    target_date: string | null;
    used_by: string | null;
}

interface OverpaidEntry {
    id: number;
    date: string;
    branch: string | null;
    patient_name: string | null;
    diagnosis: string | null;
    appointment_number: string | null;
    overpaid_amount: number;
    used_amount: number;
    remaining_amount: number;
    usages: Usage[];
    doctor_name: string | null;
    receptionist_name: string | null;
}
interface Branch { id: number; name: string }
interface Filters { branchId: string | null; tab: 'all' | 'pending' | 'used' }
interface Counts { all: number; pending: number; used: number }
interface Summary { total: number; used: number; remaining: number }
interface Props {
    entries: OverpaidEntry[];
    branches: Branch[];
    filters: Filters;
    counts: Counts;
    summary: Summary;
}

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

type Modal =
    | { kind: 'edit'; entry: OverpaidEntry }
    | { kind: 'delete'; entry: OverpaidEntry }
    | { kind: 'usage'; entry: OverpaidEntry; usage: Usage };

export default function AdminOverpaidIndex({ entries, branches, filters, counts, summary }: Props) {
    const [search, setSearch] = useState('');

    /* ── Засах / устгах ── */
    const [modal,  setModal]  = useState<Modal | null>(null);
    const [amount, setAmount] = useState('');
    const [code,   setCode]   = useState('');
    const [reason, setReason] = useState('');
    const [error,  setError]  = useState<string | null>(null);
    const [busy,   setBusy]   = useState(false);

    const openModal = (m: Modal) => {
        setModal(m);
        setAmount(m.kind === 'edit' ? String(m.entry.overpaid_amount) : '');
        setCode(''); setReason(''); setError(null);
    };
    const closeModal = () => { setModal(null); setError(null); };

    function submit() {
        if (!modal || !code || busy) return;

        const opts = {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: (errors: Record<string, string>) =>
                setError(errors.code ?? errors.amount ?? 'Алдаа гарлаа.'),
            onFinish: () => setBusy(false),
        };

        setBusy(true);

        if (modal.kind === 'edit') {
            router.patch(`/admin/overpaid/${modal.entry.id}`, { code, reason, amount: Number(amount) }, opts);
        } else if (modal.kind === 'delete') {
            router.delete(`/admin/overpaid/${modal.entry.id}`, { data: { code, reason }, ...opts });
        } else {
            router.delete(`/admin/overpaid/usages/${modal.usage.id}`, { data: { code, reason }, ...opts });
        }
    }

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
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Үлдэгдэл</p>
                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">+{summary.remaining.toLocaleString()}₮</p>
                                <p className="text-[10px] text-muted-foreground">{counts.pending} бичлэг</p>
                            </div>
                            <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 backdrop-blur px-4 py-2.5 text-right border border-gray-200/80 dark:border-gray-700/50">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Ашигласан</p>
                                <p className="text-lg font-bold text-gray-600 dark:text-gray-300 tabular-nums">{summary.used.toLocaleString()}₮</p>
                                <p className="text-[10px] text-muted-foreground">{counts.used} бичлэг</p>
                            </div>
                            <div className="rounded-xl bg-emerald-600 px-4 py-2.5 text-right shadow-md shadow-emerald-500/30">
                                <p className="text-[10px] uppercase tracking-wide text-white/80 font-semibold">Нийт</p>
                                <p className="text-lg font-bold text-white tabular-nums">{summary.total.toLocaleString()}₮</p>
                                <p className="text-[10px] text-white/80">{counts.all} бичлэг</p>
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
                            { key: 'all',     label: 'Бүгд',           count: counts.all,     color: 'bg-emerald-600 text-white' },
                            { key: 'pending', label: 'Үлдэгдэлтэй',    count: counts.pending, color: 'bg-amber-500 text-white' },
                            { key: 'used',    label: 'Ашигласан',      count: counts.used,    color: 'bg-gray-700 text-white' },
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
                            <table className="w-full text-xs border-collapse" style={{ minWidth: 1200 }}>
                                <thead>
                                    <tr className="bg-gray-50/80 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-[10.5px] uppercase tracking-wide">
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Огноо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Салбар</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Өвчтөн</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Оношилгоо</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Баримт №</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-right font-semibold">Илүү дүн</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-right font-semibold">Ашигласан</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-right font-semibold">Үлдэгдэл</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Төлөв</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Ашиглалт</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Эмч</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left font-semibold">Ресепшн</th>
                                        <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-center font-semibold w-20">Үйлдэл</th>
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
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 text-right tabular-nums whitespace-nowrap text-gray-500">
                                                {e.used_amount > 0 ? `−${e.used_amount.toLocaleString()}₮` : '—'}
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 text-right tabular-nums whitespace-nowrap">
                                                <span className={e.remaining_amount > 0
                                                    ? 'font-bold text-amber-700 dark:text-amber-400'
                                                    : 'text-gray-400'}>
                                                    {e.remaining_amount.toLocaleString()}₮
                                                </span>
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3">
                                                {e.remaining_amount === 0 ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                                        <CheckCircle2 className="size-3" /> Ашигласан
                                                    </span>
                                                ) : e.used_amount > 0 ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                                        <Clock className="size-3" /> Хэсэгчилсэн
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                        <Clock className="size-3" /> Хүлээгдэж буй
                                                    </span>
                                                )}
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3">
                                                {e.usages.length === 0 ? <span className="text-gray-400">—</span> : (
                                                    <div className="flex flex-col gap-1">
                                                        {e.usages.map(u => (
                                                            <div key={u.id} className="flex items-center gap-1.5 whitespace-nowrap"
                                                                title={u.used_by ? `Ашигласан: ${u.used_by}` : undefined}>
                                                                {u.target_date && (
                                                                    <span className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                                        {u.target_date}
                                                                    </span>
                                                                )}
                                                                <span className="font-mono text-gray-500">{u.receipt}</span>
                                                                <span className="font-semibold tabular-nums text-foreground">
                                                                    {u.amount.toLocaleString()}₮
                                                                </span>
                                                                {u.method && (
                                                                    <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-50 dark:bg-violet-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                                                                        <Wallet className="size-2.5" />{METHOD_LABELS[u.method] ?? u.method}
                                                                    </span>
                                                                )}
                                                                <button onClick={() => openModal({ kind: 'usage', entry: e, usage: u })}
                                                                    title="Энэ ашиглалтыг устгах"
                                                                    className="ml-0.5 inline-flex items-center justify-center rounded p-0.5 text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                                                    <X className="size-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 text-gray-500">{e.doctor_name ?? '—'}</td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3">
                                                {e.receptionist_name ? (
                                                    <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                                        <User className="size-3 opacity-50" />{e.receptionist_name}
                                                    </span>
                                                ) : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-3">
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <button onClick={() => openModal({ kind: 'edit', entry: e })}
                                                        title="Илүү дүнг засах"
                                                        className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                                                        <Pencil className="size-3.5" />
                                                    </button>
                                                    <button onClick={() => openModal({ kind: 'delete', entry: e })}
                                                        disabled={e.used_amount > 0}
                                                        title={e.used_amount > 0
                                                            ? 'Эхлээд ашиглалтын бичлэгүүдийг устгана уу'
                                                            : 'Илүү тооцоог устгах'}
                                                        className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:cursor-not-allowed disabled:text-gray-200 dark:disabled:text-gray-700 disabled:hover:bg-transparent">
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Засах / устгах баталгаажуулалт */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={ev => { if (ev.target === ev.currentTarget) closeModal(); }}>
                    <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                {modal.kind === 'edit' ? 'Илүү тооцоо засах'
                                    : modal.kind === 'delete' ? 'Илүү тооцоо устгах'
                                    : 'Ашиглалт устгах'}
                            </h3>
                            <button onClick={closeModal} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="size-4 text-gray-500" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 px-5 py-4">
                            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5 space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Үйлчлүүлэгч</span>
                                    <span className="font-semibold text-foreground">{modal.entry.patient_name ?? '—'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Огноо / Салбар</span>
                                    <span className="text-foreground">{modal.entry.date} · {modal.entry.branch ?? '—'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Илүү дүн</span>
                                    <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                                        {modal.entry.overpaid_amount.toLocaleString()}₮
                                    </span>
                                </div>
                                {modal.entry.used_amount > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Ашигласан / Үлдэгдэл</span>
                                        <span className="tabular-nums text-foreground">
                                            {modal.entry.used_amount.toLocaleString()}₮ / {modal.entry.remaining_amount.toLocaleString()}₮
                                        </span>
                                    </div>
                                )}
                                {modal.kind === 'usage' && (
                                    <div className="flex justify-between text-xs border-t border-emerald-200/70 dark:border-emerald-800/70 pt-1 mt-1">
                                        <span className="text-muted-foreground">Устгах ашиглалт</span>
                                        <span className="font-semibold tabular-nums text-foreground">
                                            {modal.usage.receipt} · {modal.usage.amount.toLocaleString()}₮
                                            {modal.usage.target_date ? ` · ${modal.usage.target_date}` : ''}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {modal.kind === 'edit' && (
                                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                                    Шинэ илүү дүн (₮)
                                    <input
                                        type="number"
                                        min={Math.max(1, modal.entry.used_amount)}
                                        value={amount}
                                        onChange={ev => setAmount(ev.target.value)}
                                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-foreground tabular-nums outline-none focus:ring-2 focus:ring-emerald-500"
                                        autoFocus
                                    />
                                </label>
                            )}

                            <p className="text-xs text-gray-500">
                                {modal.kind === 'edit'
                                    ? 'Ашигласан дүнгээс бага болгох боломжгүй. Өдрийн тооцооны орлогын мөр хэвээр үлдэнэ.'
                                    : modal.kind === 'delete'
                                    ? 'Зөвхөн илүү дүн устана — өдрийн тооцооны орлогын мөр хэвээр үлдэнэ.'
                                    : 'Энэ хэсэгчилсэн ашиглалт устаж, дүн нь үлдэгдэл рүү буцна. Ашигласан өдрийн тооцоонд уг баримт дахин дутуу болж болзошгүй.'}
                                {' '}Үргэлжлүүлэхийн тулд хамгаалалтын кодыг оруулна уу.
                            </p>

                            <input
                                type="password"
                                value={code}
                                onChange={ev => setCode(ev.target.value)}
                                onKeyDown={ev => ev.key === 'Enter' && submit()}
                                placeholder="Код оруулах..."
                                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
                                autoFocus={modal.kind !== 'edit'}
                            />
                            <input
                                type="text"
                                value={reason}
                                onChange={ev => setReason(ev.target.value)}
                                onKeyDown={ev => ev.key === 'Enter' && submit()}
                                placeholder="Шалтгаан (заавал биш)"
                                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
                            />
                            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
                        </div>

                        <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-5 py-3">
                            <button onClick={closeModal}
                                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                Болих
                            </button>
                            <button onClick={submit}
                                disabled={!code || busy || (modal.kind === 'edit' && (!amount || Number(amount) < 1))}
                                className={`rounded-lg px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors ${
                                    modal.kind === 'edit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                                }`}>
                                {busy ? 'Түр хүлээнэ үү...' : modal.kind === 'edit' ? 'Хадгалах' : 'Устгах'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
