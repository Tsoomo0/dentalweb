import ReceptionLayout from '@/layouts/reception-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, TrendingUp, X } from 'lucide-react';
import { useMemo, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Usage {
    receipt: string;
    amount: number;
    method: string | null;
    used_at: string | null;
    used_by: string | null;
}

interface OverpaidEntry {
    id: number;
    patient_name: string | null;
    gender: string | null;
    diagnosis: string | null;
    appointment_number: string | null;
    overpaid_amount: number;
    used_amount: number;
    remaining_amount: number;
    date: string;
    receptionist_name: string | null;
    doctor_name: string | null;
    is_mine: boolean;
    usages: Usage[];
}

type Tab = 'pending' | 'used';

interface TodayReceipt { appointment_number: string; patient_name: string | null }

interface Props {
    entries: OverpaidEntry[];
    tab: Tab;
    pendingCount: number;
    todayReceipts: TodayReceipt[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар', href: '/reception/dashboard' },
    { title: 'Илүү тооцоо',    href: '/reception/overpaid' },
];

const METHOD_LABELS: Record<string, string> = {
    mobile: 'Мобайл', card: 'Карт', cash: 'Бэлэн', storepay: 'Storepay',
};

function parseNum(s: string) {
    const v = parseInt(s.replace(/[^0-9]/g, ''), 10);
    return isNaN(v) ? 0 : v;
}

/* ------------------------------------------------------------------ */
/*  Apply Modal                                                         */
/* ------------------------------------------------------------------ */
function ApplyModal({ entry, todayReceipts, onClose }: {
    entry: OverpaidEntry;
    todayReceipts: TodayReceipt[];
    onClose: () => void;
}) {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const remaining = entry.remaining_amount;
    const [receipt, setReceipt] = useState('');
    const [amountStr, setAmountStr] = useState(String(remaining));
    const [busy, setBusy] = useState(false);

    const amount = parseNum(amountStr);

    const matched = useMemo(
        () => todayReceipts.find(r => r.appointment_number === receipt.trim()) || null,
        [todayReceipts, receipt],
    );
    const nameMismatch = matched && entry.patient_name && matched.patient_name
        && matched.patient_name.trim().toLowerCase() !== entry.patient_name.trim().toLowerCase();

    const amountTooBig = amount > remaining;
    const canSubmit = receipt.trim().length > 0 && amount > 0 && !amountTooBig;

    function submit() {
        if (!canSubmit) return;
        setBusy(true);
        router.post(`/reception/daily-sheet/apply-overpaid/${entry.id}`, {
            paid_receipt: receipt.trim(),
            amount,
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => onClose(),
            onFinish: () => setBusy(false),
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border bg-card shadow-2xl overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400" />
                <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <h3 className="text-base font-bold text-foreground">Илүү тооцоо ашиглах</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {entry.patient_name ?? '—'} · {entry.date}
                                {entry.doctor_name ? ` · ${entry.doctor_name}` : ''}
                            </p>
                        </div>
                        <button onClick={onClose}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                            <X className="size-4" />
                        </button>
                    </div>

                    {/* Amount info */}
                    <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 mb-4 space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Нийт илүү дүн</span>
                            <span className="font-bold text-green-700 dark:text-green-400 tabular-nums">
                                +{entry.overpaid_amount.toLocaleString()}₮
                            </span>
                        </div>
                        {entry.used_amount > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Ашигласан</span>
                                <span className="font-medium text-muted-foreground tabular-nums">
                                    −{entry.used_amount.toLocaleString()}₮
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm border-t border-green-200 dark:border-green-800 pt-1.5">
                            <span className="text-muted-foreground font-medium">Үлдэгдэл</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums text-base">
                                {remaining.toLocaleString()}₮
                            </span>
                        </div>
                    </div>

                    {/* Amount input */}
                    <div className="space-y-2 mb-4">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Ашиглах дүн
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={amountStr}
                                autoFocus
                                onFocus={e => e.target.select()}
                                onChange={e => setAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-background px-4 py-2.5 pr-8 text-base font-bold tabular-nums text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₮</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setAmountStr(String(remaining))}
                                className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-medium">
                                Бүгдийг ({remaining.toLocaleString()}₮)
                            </button>
                            {amountTooBig && (
                                <span className="text-[11px] text-red-600 dark:text-red-400">Үлдэгдлээс их байна</span>
                            )}
                        </div>
                        {errors?.amount && (
                            <p className="text-xs text-red-600 dark:text-red-400">{errors.amount}</p>
                        )}
                    </div>

                    {/* Receipt — шууд бичих */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Баримтын дугаар
                        </label>
                        <input
                            type="text"
                            value={receipt}
                            placeholder="Баримтын дугаараа бичнэ үү..."
                            list="today-receipts"
                            onChange={e => setReceipt(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-background px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                        />
                        <datalist id="today-receipts">
                            {todayReceipts.map(r => (
                                <option key={r.appointment_number} value={r.appointment_number}>
                                    {r.patient_name ?? ''}
                                </option>
                            ))}
                        </datalist>

                        {/* Server-side error */}
                        {errors?.paid_receipt && (
                            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2.5 flex items-start gap-2">
                                <AlertCircle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-800 dark:text-red-300">{errors.paid_receipt}</p>
                            </div>
                        )}

                        {/* Name mismatch warning */}
                        {nameMismatch && (
                            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5 flex items-start gap-2">
                                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 dark:text-amber-300">
                                    Анхаар: <strong>{receipt}</strong> баримт нь <strong>{matched?.patient_name}</strong>{' '}
                                    нэр дээр, харин илүү тооцоо <strong>{entry.patient_name}</strong> дээр байна.
                                </p>
                            </div>
                        )}

                        {/* Preview — баримт бүртгэлтэй бол баланслана, үгүй бол шинэ мөр үүснэ */}
                        {receipt.trim() && !nameMismatch && amount > 0 && !amountTooBig && (
                            matched ? (
                                <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2">
                                    <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0" />
                                    <span className="text-sm text-green-800 dark:text-green-300">
                                        <strong className="font-mono">{receipt}</strong> баримтад{' '}
                                        <strong>{amount.toLocaleString()}₮</strong> баланслагдана.
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2">
                                    <CheckCircle2 className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                    <span className="text-sm text-blue-800 dark:text-blue-300">
                                        <strong className="font-mono">{receipt}</strong> баримтаар{' '}
                                        <strong>{entry.patient_name ?? '—'}</strong>-ийн шинэ мөр өнөөдрийн тооцоонд үүсч,{' '}
                                        <strong>{amount.toLocaleString()}₮</strong> баланслагдана.
                                    </span>
                                </div>
                            )
                        )}
                    </div>

                    <div className="flex gap-2 mt-6">
                        <button onClick={submit} disabled={busy || !canSubmit}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                            {busy
                                ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                : <CheckCircle2 className="size-4" />}
                            Ашиглах
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
/*  Main page                                                           */
/* ------------------------------------------------------------------ */
export default function OverpaidIndex({ entries, tab, pendingCount, todayReceipts }: Props) {
    const [applyEntry, setApplyEntry] = useState<OverpaidEntry | null>(null);

    const gotoTab = (t: Tab) => router.get('/reception/overpaid', { tab: t }, { preserveState: false });

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Илүү тооцоо" />

            <div className="flex flex-col gap-4 p-3 md:p-5">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-9 rounded-xl bg-green-100 dark:bg-green-900/30">
                        <TrendingUp className="size-5 text-green-700 dark:text-green-400" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-foreground">Илүү тооцоо</h1>
                        <p className="text-xs text-muted-foreground">Үйлчлүүлэгчийн илүү төлсөн дүн</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 w-fit">
                    <button
                        onClick={() => gotoTab('pending')}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                            tab === 'pending'
                                ? 'bg-white dark:bg-gray-900 text-green-700 dark:text-green-400 shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}>
                        Ашиглаагүй
                        {pendingCount > 0 && (
                            <span className="flex items-center justify-center size-5 rounded-full bg-green-600 text-[10px] font-bold text-white">
                                {pendingCount > 9 ? '9+' : pendingCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => gotoTab('used')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                            tab === 'used'
                                ? 'bg-white dark:bg-gray-900 text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}>
                        Ашигласан
                    </button>
                </div>

                {/* Table */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    {entries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                            <TrendingUp className="size-10 opacity-20" />
                            <p className="text-sm">
                                {tab === 'pending' ? 'Ашиглаагүй илүү тооцоо байхгүй байна.' : 'Ашигласан тооцоо байхгүй байна.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                                        <th className="px-4 py-3 text-left">Огноо</th>
                                        <th className="px-4 py-3 text-left">Үйлчлүүлэгч</th>
                                        <th className="px-4 py-3 text-left">Оношилгоо</th>
                                        <th className="px-4 py-3 text-left">Баримт №</th>
                                        <th className="px-4 py-3 text-right">Илүү дүн</th>
                                        {tab === 'pending' && <th className="px-4 py-3 text-right">Үлдэгдэл</th>}
                                        <th className="px-4 py-3 text-left">Эмч</th>
                                        <th className="px-4 py-3 text-left">Ресепшн</th>
                                        {tab === 'used' && <th className="px-4 py-3 text-left">Ашиглалт</th>}
                                        {tab === 'pending' && <th className="px-4 py-3" />}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {entries.map(e => (
                                        <tr key={e.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors align-top">
                                            <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{e.date}</td>
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-foreground">{e.patient_name ?? '—'}</span>
                                                {e.gender && <span className="ml-1.5 text-xs text-muted-foreground">{e.gender}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground text-sm max-w-[180px] truncate">{e.diagnosis ?? '—'}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.appointment_number ?? '—'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-bold text-green-700 dark:text-green-400 tabular-nums">
                                                    +{e.overpaid_amount.toLocaleString()}₮
                                                </span>
                                                {e.used_amount > 0 && (
                                                    <div className="text-[10px] text-muted-foreground tabular-nums">
                                                        ашигласан −{e.used_amount.toLocaleString()}
                                                    </div>
                                                )}
                                            </td>
                                            {tab === 'pending' && (
                                                <td className="px-4 py-3 text-right">
                                                    <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                                        {e.remaining_amount.toLocaleString()}₮
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-sm text-muted-foreground">{e.doctor_name ?? '—'}</td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">{e.receptionist_name ?? '—'}</td>
                                            {tab === 'used' && (
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        {e.usages.map((u, i) => (
                                                            <div key={i} className="flex items-center gap-1.5 text-xs">
                                                                <span className="font-mono text-muted-foreground">{u.receipt}</span>
                                                                <span className="font-semibold tabular-nums text-foreground">
                                                                    {u.amount.toLocaleString()}₮
                                                                </span>
                                                                {u.method && (
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        ({METHOD_LABELS[u.method] ?? u.method})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            )}
                                            {tab === 'pending' && (
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => setApplyEntry(e)}
                                                        className="rounded-lg bg-green-600 hover:bg-green-700 px-3 py-1.5 text-xs font-bold text-white transition-colors">
                                                        Ашиглах
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>

            {applyEntry && (
                <ApplyModal entry={applyEntry} todayReceipts={todayReceipts} onClose={() => setApplyEntry(null)} />
            )}
        </ReceptionLayout>
    );
}
