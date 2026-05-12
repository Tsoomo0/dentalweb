import ReceptionLayout from '@/layouts/reception-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Banknote, Calendar, CheckCircle2, CreditCard,
    List, Plus, Search, Smartphone, Stethoscope, Wallet, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

/* ── Types ── */
interface ServiceItem { name: string; price: number | null }

interface PendingRecord {
    id: number; patient_id: number | null; patient_name: string;
    patient_number: string | null; doctor_name: string | null; doctor_id: number | null;
    services: ServiceItem[]; amount_charged: number | null;
    record_date: string | null; appointment_number: string | null; appointment_id: number | null;
}

interface PartialRecord extends PendingRecord {
    paid_amount: number | null; remaining: number; payment_method: string | null;
}

interface Installment {
    id: number; installment_number: number; amount: number;
    due_date: string | null; payment_method: string | null;
    paid_at: string | null; is_paid: boolean; is_overdue: boolean;
}

interface LeasingPlanData {
    id: number; total_amount: number; months: number; monthly_amount: number;
    paid_months: number; remaining_months: number; remaining_amount: number;
    start_date: string; end_date: string | null;
    installments: Installment[];
}

interface LeasingRecord extends PendingRecord {
    leasing_plan: LeasingPlanData | null;
}

interface TodayRecord {
    id: number; patient_name: string; doctor_name: string | null;
    services: ServiceItem[]; amount_charged: number | null;
    paid_amount: number | null; outstanding: number | null;
    payment_method: string | null;
    paid_at: string | null; type: 'treatment' | 'leasing' | 'partial';
}

interface Props {
    pending: PendingRecord[];
    partial: PartialRecord[];
    leasing: LeasingRecord[];
    today: TodayRecord[];
    today_total: number;
}

type Tab = 'pending' | 'ongoing' | 'today';

/* ── Constants ── */
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар', href: '/reception/dashboard' },
    { title: 'Эмчилгээний төлбөр', href: '/reception/treatment-payments' },
];

const LEASING_PAYMENT_METHODS = [
    { value: 'cash',     label: 'Бэлэн' },
    { value: 'card',     label: 'Карт' },
    { value: 'bank',     label: 'Данс' },
    { value: 'qpay',     label: 'QPay' },
    { value: 'storepay', label: 'StorePay' },
];

const METHOD_BADGE: Record<string, string> = {
    cash:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    card:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    bank:     'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    qpay:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    storepay: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    partial:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    leasing:  'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

const METHOD_LABEL: Record<string, string> = {
    cash: 'Бэлэн', card: 'Карт', bank: 'Данс',
    qpay: 'QPay', storepay: 'StorePay', partial: 'Дутуу', leasing: 'Лизинг',
};

const PAY_METHODS = [
    { value: 'cash',     label: 'Бэлэн',    icon: Banknote  },
    { value: 'card',     label: 'Карт',     icon: CreditCard },
    { value: 'bank',     label: 'Данс',     icon: Smartphone },
    { value: 'qpay',     label: 'QPay',     icon: Smartphone },
    { value: 'storepay', label: 'StorePay', icon: Wallet    },
] as const;

function ServicesList({ services }: { services: ServiceItem[] }) {
    const filled = services.filter(s => s.name);
    if (filled.length === 0) return <span className="text-muted-foreground">—</span>;
    return <>{filled.map(s => s.name).join(', ')}</>;
}

function shortDoctorName(name: string | null): string | null {
    if (!name) return null;
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    return parts[0][0] + '.' + parts.slice(1).join(' ');
}

export default function TreatmentPaymentsIndex({ pending: initPending, partial: initPartial, leasing: initLeasing, today, today_total }: Props) {
    const { props } = usePage<{ flash: { success?: string; error?: string; info?: string } }>();
    const flash = props.flash;

    const [tab, setTab] = useState<Tab>('pending');

    /* ── Local state for live-updated lists ── */
    const [pending, setPending] = useState<PendingRecord[]>(initPending);
    const [partial, setPartial] = useState<PartialRecord[]>(initPartial);
    const [leasing, setLeasing] = useState<LeasingRecord[]>(initLeasing);

    /* ── 15s fetch poll ── */
    useEffect(() => {
        const poll = async () => {
            try {
                const res = await fetch('/reception/treatment-payments/poll', { credentials: 'same-origin' });
                if (!res.ok) return;
                const data = await res.json() as { pending: PendingRecord[]; partial: PartialRecord[]; leasing: LeasingRecord[] };
                setPending(data.pending);
                setPartial(data.partial);
                setLeasing(data.leasing);
            } catch { /* silent */ }
        };
        const id = setInterval(poll, 15_000);
        return () => clearInterval(id);
    }, []);

    /* ── Confirm modal state ── */
    type PayMode = 'normal' | 'partial' | 'leasing';
    type PayRow  = { method: string; amount: string };

    const [confirmingRecord, setConfirmingRecord] = useState<PendingRecord | null>(null);
    const [payMode, setPayMode]           = useState<PayMode>('normal');
    const [paymentRows, setPaymentRows]   = useState<PayRow[]>([{ method: 'cash', amount: '' }]);
    const [paidAmount, setPaidAmount]     = useState('');
    const [partialMethod, setPartialMethod] = useState('cash');
    const [leasingMonths, setLeasingMonths] = useState('3');
    const [paymentNote, setPaymentNote]   = useState('');
    const [discountPercent, setDiscountPercent] = useState('');
    const [processing, setProcessing]     = useState(false);

    /* ── Leasing installment modal state ── */
    const [leasingModal, setLeasingModal] = useState<LeasingRecord | null>(null);
    const [installMethod, setInstallMethod] = useState('cash');
    const [installCount, setInstallCount] = useState(1);
    const [scheduleModal, setScheduleModal] = useState<LeasingRecord | null>(null);

    /* ── Ongoing tab search ── */
    const [ongoingSearch, setOngoingSearch] = useState('');
    const ongoingQ = ongoingSearch.trim().toLowerCase();
    const filteredPartial = ongoingQ
        ? partial.filter(r => r.patient_name.toLowerCase().includes(ongoingQ) || (r.patient_number ?? '').toLowerCase().includes(ongoingQ) || (r.doctor_name ?? '').toLowerCase().includes(ongoingQ))
        : partial;
    const filteredLeasing = ongoingQ
        ? leasing.filter(r => r.patient_name.toLowerCase().includes(ongoingQ) || (r.patient_number ?? '').toLowerCase().includes(ongoingQ) || (r.doctor_name ?? '').toLowerCase().includes(ongoingQ))
        : leasing;

    function openConfirm(record: PendingRecord) {
        setConfirmingRecord(record);
        setPayMode('normal');
        setPaymentRows([{ method: 'cash', amount: '' }]);
        setPaidAmount('');
        setPartialMethod('cash');
        setLeasingMonths('3');
        setPaymentNote('');
        setDiscountPercent('');
    }

    function closeConfirm() { setConfirmingRecord(null); }

    function addRow()    { setPaymentRows(prev => [...prev, { method: 'cash', amount: '' }]); }
    function removeRow(i: number) { setPaymentRows(prev => prev.filter((_, j) => j !== i)); }
    function updateRow(i: number, field: 'method' | 'amount', val: string) {
        setPaymentRows(prev => prev.map((r, j) => j === i ? { ...r, [field]: val } : r));
    }

    function handleConfirm() {
        if (!confirmingRecord) return;
        setProcessing(true);
        let payload: Record<string, unknown>;
        if (payMode === 'partial') {
            payload = { payment_method: 'partial', partial_method: partialMethod, paid_amount: Number(paidAmount), payment_note: paymentNote || null, discount_percent: discountPercent ? Number(discountPercent) : null };
        } else if (payMode === 'leasing') {
            payload = { payment_method: 'leasing', months: Number(leasingMonths), payment_note: paymentNote || null, discount_percent: discountPercent ? Number(discountPercent) : null };
        } else {
            const effectiveAmount = prevPaid > 0 ? finalTotal - prevPaid : finalTotal;
            const payments = paymentRows.length === 1
                ? [{ method: paymentRows[0].method, amount: effectiveAmount }]
                : paymentRows.filter(r => Number(r.amount) > 0).map(r => ({ method: r.method, amount: Number(r.amount) }));
            payload = { payments, payment_note: paymentNote || null, discount_percent: discountPercent ? Number(discountPercent) : null };
        }
        router.patch(`/reception/treatment-payments/${confirmingRecord.id}/confirm`, payload as any, {
            preserveScroll: true,
            onSuccess: () => closeConfirm(),
            onFinish: () => setProcessing(false),
        });
    }

    function handlePayInstallment(plan: LeasingPlanData) {
        setProcessing(true);
        router.post(`/reception/leasing-plans/${plan.id}/pay`, {
            payment_method: installMethod,
            count: installCount,
        }, {
            preserveScroll: true,
            onSuccess: () => setLeasingModal(null),
            onFinish: () => setProcessing(false),
        });
    }

    const total    = confirmingRecord?.amount_charged ?? 0;
    const prevPaid = (confirmingRecord as PartialRecord | null)?.paid_amount ?? 0;
    const discPct  = Math.min(100, Math.max(0, Number(discountPercent) || 0));
    const discAmt  = Math.round(total * discPct / 100);
    const finalTotal = total - discAmt;
    const months   = Math.max(1, Number(leasingMonths) || 3);
    const monthly  = months > 0 ? Math.ceil(finalTotal / months) : 0;
    const partialRemaining = finalTotal - prevPaid - (Number(paidAmount) || 0);
    const rowsTotal = paymentRows.length >= 2
        ? paymentRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
        : finalTotal;
    const rowsDiff  = finalTotal - rowsTotal;
    const rowsOk    = paymentRows.length === 1 || (paymentRows.length >= 2 && rowsTotal > 0 && rowsTotal === finalTotal);
    const canConfirm = payMode === 'partial' ? !!paidAmount
                     : payMode === 'leasing' ? true
                     : rowsOk;

    const ongoingCount = partial.length + leasing.length;

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Эмчилгээний төлбөр" />

            <div className="flex flex-1 flex-col min-h-0">

                {/* ══ PAGE HEADER ══ */}
                <div className="shrink-0 border-b border-border bg-card px-6 pt-6 pb-0 space-y-4">

                    {/* Title row */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Эмчилгээний төлбөр
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Эмч илгээсэн тэмдэглэлүүдийн төлбөрийн удирдлага
                            </p>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Pending pill */}
                            <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3.5 py-1.5">
                                <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                                    {pending.length} хүлээгдэж буй
                                </span>
                            </div>

                            {/* Ongoing pill */}
                            {ongoingCount > 0 && (
                                <div className="flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 dark:bg-teal-950/20 dark:border-teal-800 px-3.5 py-1.5">
                                    <span className="size-2 rounded-full bg-teal-400" />
                                    <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">
                                        {ongoingCount} үргэлжлэх
                                    </span>
                                </div>
                            )}

                            {/* Today total card */}
                            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2.5 shadow-sm shadow-emerald-200 dark:shadow-emerald-950">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-100">
                                    Өнөөдрийн орлого
                                </p>
                                <p className="text-xl font-bold text-white tabular-nums leading-tight">
                                    {today_total.toLocaleString()}₮
                                </p>
                                <p className="text-[10px] text-emerald-200 mt-0.5">
                                    {today.length} гүйлгээ
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 px-4 py-3">
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{flash.success}</p>
                        </div>
                    )}
                    {flash?.error && (
                        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-4 py-3">
                            <X className="size-4 shrink-0 text-red-600 dark:text-red-400" />
                            <p className="text-sm font-medium text-red-700 dark:text-red-300">{flash.error}</p>
                        </div>
                    )}
                    {flash?.info && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 px-4 py-3">
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{flash.info}</p>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-0 -mb-px">
                        {([
                            { key: 'pending' as Tab, label: 'Хүлээгдэж буй', count: pending.length, color: 'amber' },
                            { key: 'ongoing' as Tab, label: 'Дутуу / Лизинг', count: ongoingCount, color: 'teal' },
                            { key: 'today'   as Tab, label: 'Өнөөдрийн тайлан', count: today.length, color: 'emerald' },
                        ]).map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                                    tab === t.key
                                        ? 'border-foreground text-foreground'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                }`}
                            >
                                {t.label}
                                <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[10px] font-bold ${
                                    tab === t.key
                                        ? t.color === 'amber'
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                            : t.color === 'teal'
                                            ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                        : 'bg-muted text-muted-foreground'
                                }`}>
                                    {t.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══ SCROLLABLE CONTENT ══ */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">

                    {/* ══ PENDING TAB ══ */}
                    {tab === 'pending' && (
                        pending.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card py-20 text-center shadow-sm">
                                <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30 mb-4">
                                    <CreditCard className="size-8 text-amber-400" />
                                </div>
                                <p className="text-base font-semibold text-foreground">Хүлээгдэж буй төлбөр байхгүй</p>
                                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                    Эмч эмчилгээний тэмдэглэл илгээхэд энд харагдана
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pending.map(rec => (
                                    <div
                                        key={rec.id}
                                        className="group relative flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-l-4 border-l-amber-400 bg-card px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
                                    >
                                        {/* Left icon */}
                                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
                                            <Stethoscope className="size-5 text-amber-500 dark:text-amber-400" />
                                        </div>

                                        {/* Main info */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-base font-bold text-foreground leading-tight">
                                                    {rec.patient_name}
                                                </span>
                                                {rec.patient_number && (
                                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
                                                        {rec.patient_number}
                                                    </span>
                                                )}
                                                {rec.appointment_number && (
                                                    <span className="rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-semibold">
                                                        #{rec.appointment_number}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                                {rec.doctor_name && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="size-1 rounded-full bg-muted-foreground/50" />
                                                        Эмч: <span className="font-medium text-foreground ml-0.5">{shortDoctorName(rec.doctor_name)}</span>
                                                    </span>
                                                )}
                                                {rec.record_date && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="size-3" />
                                                        {rec.record_date}
                                                    </span>
                                                )}
                                            </div>

                                            {rec.services.filter(s => s.name).length > 0 && (
                                                <div className="flex flex-wrap gap-1 pt-0.5">
                                                    {rec.services.filter(s => s.name).map((s, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground border border-border/60"
                                                        >
                                                            {s.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Right: amount + action */}
                                        <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
                                            {rec.amount_charged !== null && rec.amount_charged > 0 && (
                                                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                    {rec.amount_charged.toLocaleString()}₮
                                                </span>
                                            )}
                                            <button
                                                onClick={() => openConfirm(rec)}
                                                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2.5 text-sm font-semibold transition-all shadow-sm shadow-emerald-200 dark:shadow-emerald-950"
                                            >
                                                <CheckCircle2 className="size-4" />
                                                Баталгаажуулах
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* ══ ONGOING TAB ══ */}
                    {tab === 'ongoing' && (
                        <div className="space-y-4">

                            {/* Search bar */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                <input
                                    type="text"
                                    value={ongoingSearch}
                                    onChange={e => setOngoingSearch(e.target.value)}
                                    placeholder="Өвчтний нэр, дугаар, эмч хайх..."
                                    className="w-full rounded-xl border bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition-shadow"
                                />
                                {ongoingSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setOngoingSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-4" />
                                    </button>
                                )}
                            </div>

                            {ongoingQ && (
                                <p className="text-xs text-muted-foreground">
                                    {filteredPartial.length + filteredLeasing.length} үр дүн · "<span className="font-medium text-foreground">{ongoingSearch}</span>"
                                </p>
                            )}

                            {/* Partial payments section */}
                            {filteredPartial.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-px flex-1 bg-border" />
                                        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                            <Wallet className="size-3.5" />
                                            Дутуу төлбөр
                                            <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px]">
                                                {filteredPartial.length}
                                            </span>
                                        </span>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>

                                    {filteredPartial.map(rec => {
                                        const paidAmt = rec.paid_amount ?? 0;
                                        const totalAmt = rec.amount_charged ?? 0;
                                        const paidPct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0;
                                        return (
                                            <div
                                                key={rec.id}
                                                className="rounded-2xl border border-l-4 border-l-amber-400 bg-card shadow-sm transition-shadow hover:shadow-md overflow-hidden"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4">
                                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
                                                        <Wallet className="size-5 text-amber-500 dark:text-amber-400" />
                                                    </div>

                                                    <div className="flex-1 min-w-0 space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-base font-bold text-foreground">{rec.patient_name}</span>
                                                            {rec.patient_number && (
                                                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
                                                                    {rec.patient_number}
                                                                </span>
                                                            )}
                                                            {rec.payment_method && rec.payment_method !== 'partial' && (
                                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${METHOD_BADGE[rec.payment_method] ?? 'bg-muted text-muted-foreground'}`}>
                                                                    {METHOD_LABEL[rec.payment_method] ?? rec.payment_method}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                                                            {rec.doctor_name && <span>Эмч: <span className="font-medium text-foreground">{shortDoctorName(rec.doctor_name)}</span></span>}
                                                            {rec.record_date && (
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="size-3" />
                                                                    {rec.record_date}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Progress bar */}
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-muted-foreground">Төлөлтийн явц</span>
                                                                <span className="font-semibold text-foreground">{paidPct}%</span>
                                                            </div>
                                                            <div className="h-2 w-full rounded-full bg-amber-100 dark:bg-amber-950/30 overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full bg-amber-400 transition-all"
                                                                    style={{ width: `${paidPct}%` }}
                                                                />
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                                    Төлсөн: {paidAmt.toLocaleString()}₮
                                                                </span>
                                                                <span className="text-muted-foreground">
                                                                    Нийт: {totalAmt.toLocaleString()}₮
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Үлдэгдэл</p>
                                                            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                                                {rec.remaining.toLocaleString()}₮
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => openConfirm(rec)}
                                                            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-4 py-2.5 text-sm font-semibold transition-all shadow-sm shadow-amber-200 dark:shadow-amber-950"
                                                        >
                                                            <Banknote className="size-4" />
                                                            Үлдэгдэл төлөх
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Leasing section */}
                            {filteredLeasing.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-px flex-1 bg-border" />
                                        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400">
                                            <Calendar className="size-3.5" />
                                            Лизингийн төлбөр
                                            <span className="rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 text-[10px]">
                                                {filteredLeasing.length}
                                            </span>
                                        </span>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>

                                    {filteredLeasing.map(rec => {
                                        const plan = rec.leasing_plan;
                                        if (!plan) return null;
                                        const leasingPct = plan.months > 0 ? Math.round((plan.paid_months / plan.months) * 100) : 0;
                                        return (
                                            <div
                                                key={rec.id}
                                                className="rounded-2xl border border-l-4 border-l-teal-400 bg-card shadow-sm transition-shadow hover:shadow-md overflow-hidden"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4">
                                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/30">
                                                        <Calendar className="size-5 text-teal-600 dark:text-teal-400" />
                                                    </div>

                                                    <div className="flex-1 min-w-0 space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-base font-bold text-foreground">{rec.patient_name}</span>
                                                            {rec.patient_number && (
                                                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
                                                                    {rec.patient_number}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                                                            {rec.doctor_name && <span>Эмч: <span className="font-medium text-foreground">{shortDoctorName(rec.doctor_name)}</span></span>}
                                                            <span>Нийт: <span className="font-medium text-foreground">{plan.total_amount.toLocaleString()}₮</span></span>
                                                            <span>Сард: <span className="font-semibold text-teal-600 dark:text-teal-400">{plan.monthly_amount.toLocaleString()}₮</span></span>
                                                        </div>

                                                        {/* Installment dots + progress */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1 flex-wrap">
                                                                {plan.installments.map(inst => (
                                                                    <div
                                                                        key={inst.id}
                                                                        title={`${inst.installment_number}-р сар${inst.is_paid && inst.paid_at ? ` · ${inst.paid_at}` : ''}`}
                                                                        className={`size-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                                                                            inst.is_paid
                                                                                ? 'bg-teal-500 text-white shadow-sm shadow-teal-200 dark:shadow-teal-950'
                                                                                : 'bg-muted border border-border text-muted-foreground'
                                                                        }`}
                                                                    >
                                                                        {inst.installment_number}
                                                                    </div>
                                                                ))}
                                                                <span className="text-xs text-muted-foreground ml-1 font-medium">
                                                                    {plan.paid_months}/{plan.months} сар
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 w-full max-w-xs rounded-full bg-teal-100 dark:bg-teal-950/30 overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full bg-teal-400 transition-all"
                                                                    style={{ width: `${leasingPct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                                                        <div className="text-right">
                                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Сарын төлбөр</p>
                                                            <p className="text-xl font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                                                                {plan.monthly_amount.toLocaleString()}₮
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setScheduleModal(rec)}
                                                                className="flex items-center gap-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 active:scale-95 px-3 py-2 text-xs font-semibold transition-all"
                                                            >
                                                                <List className="size-3.5" />
                                                                Хуваарь
                                                            </button>
                                                            {plan.remaining_months > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setLeasingModal(rec);
                                                                        setInstallMethod('cash');
                                                                        setInstallCount(1);
                                                                    }}
                                                                    className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-3 py-2 text-xs font-semibold transition-all shadow-sm shadow-teal-200 dark:shadow-teal-950"
                                                                >
                                                                    <CheckCircle2 className="size-3.5" />
                                                                    Төлөх
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Empty state */}
                            {ongoingCount === 0 && (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card py-20 text-center shadow-sm">
                                    <div className="flex size-16 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/30 mb-4">
                                        <Wallet className="size-8 text-teal-400" />
                                    </div>
                                    <p className="text-base font-semibold text-foreground">Дутуу / лизинг байхгүй</p>
                                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                        Дутуу болон лизингийн төлбөрүүд энд харагдана
                                    </p>
                                </div>
                            )}
                            {ongoingCount > 0 && filteredPartial.length === 0 && filteredLeasing.length === 0 && (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card py-16 text-center shadow-sm">
                                    <Search className="size-8 text-muted-foreground/40 mb-3" />
                                    <p className="text-base font-semibold text-foreground">Үр дүн олдсонгүй</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        "<span className="font-medium">{ongoingSearch}</span>" хайлтад тохирох бүртгэл байхгүй
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══ TODAY TAB ══ */}
                    {tab === 'today' && (
                        <div className="space-y-5">
                            {/* Stats grid */}
                            {today_total > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {/* Total — spans full on mobile, first on desktop */}
                                    <div className="col-span-2 sm:col-span-1 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 shadow-sm shadow-emerald-200 dark:shadow-emerald-950 text-center">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-100 mb-1">Нийт орлого</p>
                                        <p className="text-3xl font-bold text-white tabular-nums leading-none">{today_total.toLocaleString()}₮</p>
                                        <p className="text-[11px] text-emerald-200 mt-1.5">{today.length} гүйлгээ</p>
                                    </div>

                                    {/* Cash */}
                                    <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-center">
                                        <div className="flex justify-center mb-2">
                                            <Banknote className="size-4 text-emerald-500" />
                                        </div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">Бэлэн</p>
                                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                            {today.filter(r => r.payment_method === 'cash').reduce((s, r) => s + (r.paid_amount ?? 0), 0).toLocaleString()}₮
                                        </p>
                                    </div>

                                    {/* Card / Bank / QPay */}
                                    <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/20 p-4 text-center">
                                        <div className="flex justify-center mb-2">
                                            <CreditCard className="size-4 text-blue-500" />
                                        </div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-0.5">Карт / Данс / QPay</p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                                            {today.filter(r => ['card', 'bank', 'qpay'].includes(r.payment_method ?? '')).reduce((s, r) => s + (r.paid_amount ?? 0), 0).toLocaleString()}₮
                                        </p>
                                    </div>

                                    {/* StorePay */}
                                    <div className="rounded-2xl border border-orange-100 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 p-4 text-center">
                                        <div className="flex justify-center mb-2">
                                            <Wallet className="size-4 text-orange-500" />
                                        </div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-0.5">StorePay</p>
                                        <p className="text-lg font-bold text-orange-700 dark:text-orange-300 tabular-nums">
                                            {today.filter(r => r.payment_method === 'storepay').reduce((s, r) => s + (r.paid_amount ?? 0), 0).toLocaleString()}₮
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Transaction list */}
                            {today.length === 0 ? (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card py-20 text-center shadow-sm">
                                    <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 mb-4">
                                        <CheckCircle2 className="size-8 text-emerald-400" />
                                    </div>
                                    <p className="text-base font-semibold text-foreground">Өнөөдөр төлбөр байхгүй</p>
                                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                        Баталгаажуулсан төлбөрүүд энд автоматаар харагдана
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                    <div className="divide-y divide-border">
                                        {today.map((rec, idx) => (
                                            <div
                                                key={rec.id}
                                                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                                            >
                                                {/* Time / index */}
                                                <div className="shrink-0 text-center w-10">
                                                    {rec.paid_at ? (
                                                        <span className="text-[10px] font-semibold text-muted-foreground leading-tight tabular-nums">
                                                            {rec.paid_at.slice(0, 5)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] font-bold text-muted-foreground/50">
                                                            {idx + 1}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Divider dot */}
                                                <div className={`shrink-0 size-1.5 rounded-full ${rec.type === 'partial' ? 'bg-amber-400' : 'bg-emerald-400'}`} />

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">{rec.patient_name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {rec.doctor_name && <span className="mr-2">{shortDoctorName(rec.doctor_name)}</span>}
                                                        <ServicesList services={rec.services} />
                                                    </p>
                                                </div>

                                                {/* Badge + amount */}
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {rec.type === 'leasing' && (
                                                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                                                            Лизинг
                                                        </span>
                                                    )}
                                                    {rec.type === 'partial' && (
                                                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                            Дутуу
                                                        </span>
                                                    )}
                                                    {rec.payment_method && (
                                                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${METHOD_BADGE[rec.payment_method] ?? 'bg-muted text-muted-foreground'}`}>
                                                            {METHOD_LABEL[rec.payment_method] ?? rec.payment_method}
                                                        </span>
                                                    )}
                                                    {rec.type === 'partial' ? (
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                                                {(rec.paid_amount ?? 0).toLocaleString()}₮
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground tabular-nums">
                                                                Нийт {(rec.amount_charged ?? 0).toLocaleString()}₮ · Үлдэгдэл <span className="text-red-500 font-semibold">{(rec.outstanding ?? 0).toLocaleString()}₮</span>
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                            {(rec.paid_amount ?? rec.amount_charged ?? 0).toLocaleString()}₮
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ══ CONFIRM MODAL ══ */}
            {confirmingRecord && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={closeConfirm}
                    />
                    <div className="relative z-10 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-card border shadow-2xl max-h-[92vh] overflow-y-auto">
                        {/* Modal handle (mobile) */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-10 h-1 rounded-full bg-border" />
                        </div>

                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/40">
                                    <CreditCard className="size-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-foreground text-base leading-tight">
                                        {confirmingRecord.patient_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Төлбөрийн арга сонгох</p>
                                </div>
                            </div>
                            <button
                                onClick={closeConfirm}
                                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-5">
                            {/* Summary card */}
                            <div className="rounded-xl border bg-muted/30 divide-y divide-border overflow-hidden">
                                {confirmingRecord.doctor_name && (
                                    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                                        <span className="text-muted-foreground">Эмч</span>
                                        <span className="font-medium text-foreground">{shortDoctorName(confirmingRecord.doctor_name)}</span>
                                    </div>
                                )}
                                {confirmingRecord.services.filter(s => s.name).length > 0 && (
                                    <div className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
                                        <span className="text-muted-foreground shrink-0">Үйлчилгээ</span>
                                        <span className="text-right text-xs text-foreground leading-relaxed">
                                            {confirmingRecord.services.filter(s => s.name).map(s => s.name).join(', ')}
                                        </span>
                                    </div>
                                )}
                                {'paid_amount' in confirmingRecord && (confirmingRecord as PartialRecord).paid_amount ? (
                                    <>
                                        <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                                            <span className="text-muted-foreground">Нийт дүн</span>
                                            <span className="font-medium tabular-nums">{(confirmingRecord.amount_charged ?? 0).toLocaleString()}₮</span>
                                        </div>
                                        <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                                            <span className="text-emerald-600 dark:text-emerald-400">Аль хэдийн төлсөн</span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                {((confirmingRecord as PartialRecord).paid_amount ?? 0).toLocaleString()}₮
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between px-4 py-3 text-sm bg-amber-50 dark:bg-amber-950/20">
                                            <span className="font-semibold text-amber-700 dark:text-amber-300">Үлдэгдэл</span>
                                            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                                {((confirmingRecord as PartialRecord).remaining ?? 0).toLocaleString()}₮
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                                        <span className="font-medium text-muted-foreground">Нийт дүн</span>
                                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                            {(confirmingRecord.amount_charged ?? 0).toLocaleString()}₮
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Discount row */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground">Хөнгөлөлт</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            value={discountPercent}
                                            onChange={e => setDiscountPercent(e.target.value)}
                                            placeholder="0"
                                            min="0"
                                            max="100"
                                            className="w-full rounded-xl border bg-background px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition-shadow"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">%</span>
                                    </div>
                                    {discAmt > 0 && (
                                        <span className="text-sm text-rose-600 dark:text-rose-400 font-semibold whitespace-nowrap">
                                            −{discAmt.toLocaleString()}₮
                                        </span>
                                    )}
                                </div>
                                {discAmt > 0 && (
                                    <div className="flex items-center justify-between rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 px-4 py-2.5 text-sm">
                                        <span className="text-rose-600 dark:text-rose-400 font-medium">Хөнгөлсний дараа</span>
                                        <span className="text-lg font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                                            {finalTotal.toLocaleString()}₮
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Payment method — normal mode */}
                            {payMode === 'normal' && (
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-foreground">Төлбөрийн арга</p>

                                    {paymentRows.map((row, i) => (
                                        <div key={i} className="space-y-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="grid grid-cols-5 gap-1.5 flex-1">
                                                    {PAY_METHODS.map(m => (
                                                        <button
                                                            key={m.value}
                                                            type="button"
                                                            onClick={() => updateRow(i, 'method', m.value)}
                                                            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-[11px] font-semibold transition-all active:scale-95 ${
                                                                row.method === m.value
                                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-500 shadow-sm'
                                                                    : 'border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/30'
                                                            }`}
                                                        >
                                                            <m.icon className="size-4" />
                                                            {m.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                {paymentRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeRow(i)}
                                                        className="shrink-0 flex size-9 items-center justify-center rounded-xl border text-muted-foreground hover:text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                                    >
                                                        <X className="size-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {paymentRows.length >= 2 && (
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={row.amount}
                                                        onChange={e => updateRow(i, 'amount', e.target.value)}
                                                        placeholder="Дүн оруулах"
                                                        min="1"
                                                        className="w-full rounded-xl border bg-background px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-shadow"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">₮</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={addRow}
                                        className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                                    >
                                        <Plus className="size-3.5" />
                                        Арга нэмэх
                                    </button>

                                    {paymentRows.length >= 2 && (
                                        <div className={`rounded-xl border px-4 py-2.5 flex items-center justify-between text-sm ${
                                            rowsOk
                                                ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20'
                                                : rowsTotal > finalTotal
                                                ? 'border-red-200 bg-red-50 dark:bg-red-950/20'
                                                : 'border-amber-200 bg-amber-50 dark:bg-amber-950/20'
                                        }`}>
                                            <span className="text-muted-foreground font-medium">Нийт</span>
                                            <span className={`font-bold tabular-nums ${
                                                rowsOk
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : rowsTotal > finalTotal
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : 'text-amber-600 dark:text-amber-400'
                                            }`}>
                                                {rowsTotal.toLocaleString()}₮ / {finalTotal.toLocaleString()}₮
                                                {rowsOk && ' ✓'}
                                                {!rowsOk && rowsDiff > 0 && ` · үлдэгдэл ${rowsDiff.toLocaleString()}₮`}
                                                {!rowsOk && rowsDiff < 0 && ` · илүү ${(-rowsDiff).toLocaleString()}₮`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Partial sub-form */}
                            {payMode === 'partial' && (
                                <div className="space-y-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                        Дутуу төлбөр
                                    </p>

                                    {/* Payment method selector */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground">Төлбөрийн арга</label>
                                        <div className="grid grid-cols-5 gap-1.5">
                                            {PAY_METHODS.map(m => (
                                                <button
                                                    key={m.value}
                                                    type="button"
                                                    onClick={() => setPartialMethod(m.value)}
                                                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-2.5 text-[11px] font-semibold transition-all active:scale-95 ${
                                                        partialMethod === m.value
                                                            ? 'border-amber-500 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-500 shadow-sm'
                                                            : 'border-border bg-background text-muted-foreground hover:bg-muted hover:border-muted-foreground/30'
                                                    }`}
                                                >
                                                    <m.icon className="size-4" />
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground">Өнөөдөр төлж буй дүн</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={paidAmount}
                                                onChange={e => setPaidAmount(e.target.value)}
                                                placeholder="0"
                                                min="1"
                                                className="w-full rounded-xl border bg-background px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-shadow"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">₮</span>
                                        </div>
                                    </div>
                                    {Number(paidAmount) > 0 && (
                                        <div className="flex items-center justify-between rounded-xl bg-amber-100 dark:bg-amber-900/30 px-3 py-2 text-sm">
                                            <span className="text-amber-700 dark:text-amber-300 font-medium">Үлдэгдэл</span>
                                            <span className={`font-bold tabular-nums ${
                                                partialRemaining > 0
                                                    ? 'text-amber-600 dark:text-amber-400'
                                                    : 'text-emerald-600 dark:text-emerald-400'
                                            }`}>
                                                {Math.max(0, partialRemaining).toLocaleString()}₮
                                                {partialRemaining <= 0 && ' ✓'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Leasing sub-form */}
                            {payMode === 'leasing' && (
                                <div className="space-y-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/20 p-4">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
                                        Лизингийн тооцоо
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-foreground">Нийт дүн</label>
                                            <div className="rounded-xl border bg-muted/50 px-3 py-2.5 text-sm font-bold tabular-nums">
                                                {finalTotal.toLocaleString()}₮
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-foreground">Сарын тоо</label>
                                            <input
                                                type="number"
                                                value={leasingMonths}
                                                onChange={e => setLeasingMonths(e.target.value)}
                                                min="1"
                                                max="60"
                                                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition-shadow"
                                            />
                                        </div>
                                    </div>
                                    {months > 0 && finalTotal > 0 && (
                                        <div className="rounded-xl bg-teal-100 dark:bg-teal-900/30 p-4 text-center">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">
                                                Сар бүрийн төлбөр
                                            </p>
                                            <p className="text-3xl font-bold text-teal-700 dark:text-teal-300 tabular-nums">
                                                {monthly.toLocaleString()}₮
                                            </p>
                                            <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                                                {months} сар × {monthly.toLocaleString()}₮
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Special mode toggles */}
                            <div className="flex items-center gap-2.5">
                                <span className="text-xs text-muted-foreground font-medium shrink-0">Тусгай:</span>
                                <button
                                    type="button"
                                    onClick={() => setPayMode(payMode === 'partial' ? 'normal' : 'partial')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                                        payMode === 'partial'
                                            ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-600'
                                            : 'border-border text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    Дутуу тооцоо
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPayMode(payMode === 'leasing' ? 'normal' : 'leasing')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                                        payMode === 'leasing'
                                            ? 'border-teal-400 bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-600'
                                            : 'border-border text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    Лизинг
                                </button>
                            </div>

                            {/* Note */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">
                                    Тэмдэглэл
                                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">(заавал биш)</span>
                                </label>
                                <input
                                    type="text"
                                    value={paymentNote}
                                    onChange={e => setPaymentNote(e.target.value)}
                                    placeholder="Нэмэлт тэмдэглэл..."
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                                />
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2.5 pt-1 border-t border-border">
                                <button
                                    onClick={handleConfirm}
                                    disabled={processing || !canConfirm}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white py-3 text-sm font-bold transition-all shadow-sm shadow-emerald-200 dark:shadow-emerald-950"
                                >
                                    {processing ? (
                                        <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="size-4" />
                                    )}
                                    Баталгаажуулах
                                </button>
                                <button
                                    onClick={closeConfirm}
                                    className="rounded-xl border px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    Цуцлах
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ LEASING SCHEDULE MODAL ══ */}
            {scheduleModal && scheduleModal.leasing_plan && (() => {
                const plan = scheduleModal.leasing_plan!;
                const pct  = plan.months > 0 ? Math.round((plan.paid_months / plan.months) * 100) : 0;
                return (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setScheduleModal(null)} />
                        <div className="relative z-10 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-card border shadow-2xl max-h-[90vh] flex flex-col">
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                                <div className="w-10 h-1 rounded-full bg-border" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-border shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950/40">
                                        <List className="size-5 text-teal-600 dark:text-teal-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground text-base leading-tight">{scheduleModal.patient_name}</p>
                                        <p className="text-xs text-muted-foreground">Лизингийн хуваарь · {plan.paid_months}/{plan.months} сар</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setScheduleModal(null)}
                                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>

                            {/* Summary strip */}
                            <div className="px-6 py-3 border-b border-border shrink-0 space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Нийт: <span className="font-semibold text-foreground">{plan.total_amount.toLocaleString()}₮</span></span>
                                    <span>Сард: <span className="font-semibold text-teal-600 dark:text-teal-400">{plan.monthly_amount.toLocaleString()}₮</span></span>
                                    <span className="font-semibold text-foreground">{pct}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-teal-100 dark:bg-teal-950/30 overflow-hidden">
                                    <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Төлсөн: {plan.paid_months} сар</span>
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">Үлдэгдэл: {plan.remaining_amount.toLocaleString()}₮</span>
                                </div>
                                <div className="flex justify-between text-[11px] text-muted-foreground border-t border-border pt-1.5">
                                    <span>Эхэлсэн: <span className="font-semibold text-foreground">{plan.start_date}</span></span>
                                    {plan.end_date && (
                                        <span>Дуусах: <span className="font-semibold text-foreground">{plan.end_date}</span></span>
                                    )}
                                </div>
                            </div>

                            {/* Installment list */}
                            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                                {plan.installments.map(inst => (
                                    <div
                                        key={inst.id}
                                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                                            inst.is_paid
                                                ? 'bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40'
                                                : inst.is_overdue
                                                ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800'
                                                : 'bg-card border border-border'
                                        }`}
                                    >
                                        <div className={`size-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                            inst.is_paid
                                                ? 'bg-teal-500 text-white'
                                                : inst.is_overdue
                                                ? 'bg-red-400 text-white'
                                                : 'bg-muted text-muted-foreground border border-border'
                                        }`}>
                                            {inst.installment_number}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground">{inst.installment_number}-р сар</p>
                                            {inst.due_date && (
                                                <p className={`text-[10px] mt-0.5 ${
                                                    inst.is_paid
                                                        ? 'text-teal-600 dark:text-teal-400'
                                                        : inst.is_overdue
                                                        ? 'text-red-500 font-semibold'
                                                        : 'text-muted-foreground'
                                                }`}>
                                                    {inst.is_overdue ? '⚠ Хоцорсон · ' : ''}Дуусах: {inst.due_date}
                                                </p>
                                            )}
                                        </div>
                                        <span className="font-bold tabular-nums text-foreground">{inst.amount.toLocaleString()}₮</span>
                                        {inst.is_paid ? (
                                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                                                <span className="rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap">
                                                    ✓ {inst.paid_at ?? 'Төлөгдсөн'}
                                                </span>
                                                {inst.payment_method && (
                                                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold whitespace-nowrap ${METHOD_BADGE[inst.payment_method] ?? 'bg-muted text-muted-foreground'}`}>
                                                        {METHOD_LABEL[inst.payment_method] ?? inst.payment_method}
                                                    </span>
                                                )}
                                            </div>
                                        ) : inst.is_overdue ? (
                                            <span className="rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap">
                                                Хоцорсон
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-muted text-muted-foreground border border-border px-2.5 py-1 text-[10px] font-medium whitespace-nowrap">
                                                Хүлээгдэж байна
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Footer actions */}
                            <div className="flex gap-2.5 px-6 py-4 border-t border-border shrink-0">
                                {plan.remaining_months > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setScheduleModal(null);
                                            setLeasingModal(scheduleModal);
                                            setInstallMethod('cash');
                                            setInstallCount(1);
                                        }}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white py-3 text-sm font-bold transition-all shadow-sm shadow-teal-200 dark:shadow-teal-950"
                                    >
                                        <CheckCircle2 className="size-4" />
                                        Сар төлөх
                                    </button>
                                )}
                                <button
                                    onClick={() => setScheduleModal(null)}
                                    className="rounded-xl border px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    Хаах
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ══ LEASING INSTALLMENT MODAL ══ */}
            {leasingModal && leasingModal.leasing_plan && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setLeasingModal(null)}
                    />
                    <div className="relative z-10 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-card border shadow-2xl">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-10 h-1 rounded-full bg-border" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950/40">
                                    <Calendar className="size-5 text-teal-600 dark:text-teal-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-foreground text-base leading-tight">Лизинг төлөх</p>
                                    <p className="text-xs text-muted-foreground">{leasingModal.patient_name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setLeasingModal(null)}
                                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-5">
                            {/* Amount summary */}
                            <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/30 dark:to-teal-900/20 p-5 text-center">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">
                                    {leasingModal.leasing_plan.paid_months + 1}
                                    {installCount > 1 ? `–${leasingModal.leasing_plan.paid_months + installCount}` : ''}
                                    -р сарын төлбөр
                                </p>
                                <p className="text-4xl font-bold text-teal-700 dark:text-teal-300 tabular-nums">
                                    {leasingModal.leasing_plan.installments
                                        .filter(i => !i.is_paid)
                                        .slice(0, installCount)
                                        .reduce((s, i) => s + i.amount, 0)
                                        .toLocaleString()}₮
                                </p>
                                <div className="mt-3 flex items-center justify-center gap-1 flex-wrap">
                                    {leasingModal.leasing_plan.installments.map(inst => (
                                        <div
                                            key={inst.id}
                                            className={`size-4 rounded-full ${
                                                inst.is_paid
                                                    ? 'bg-teal-500'
                                                    : 'bg-teal-200 dark:bg-teal-800'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-teal-600 dark:text-teal-400 mt-2">
                                    {leasingModal.leasing_plan.paid_months}/{leasingModal.leasing_plan.months} сар төлсөн
                                    · Үлдэгдэл {leasingModal.leasing_plan.remaining_months} сар
                                </p>
                            </div>

                            {/* Month count selector */}
                            {leasingModal.leasing_plan.remaining_months > 1 && (
                                <div className="space-y-2.5">
                                    <p className="text-sm font-semibold text-foreground">Хэдэн сар төлөх?</p>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setInstallCount(c => Math.max(1, c - 1))}
                                            className="flex size-10 items-center justify-center rounded-xl border-2 border-border text-xl font-bold text-muted-foreground hover:bg-muted hover:border-muted-foreground/40 transition-colors active:scale-95"
                                        >
                                            −
                                        </button>
                                        <div className="flex-1 rounded-xl border-2 border-teal-400 bg-teal-50 dark:bg-teal-950/20 py-2.5 text-center">
                                            <span className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                                                {installCount}
                                            </span>
                                            <span className="text-sm font-medium text-teal-600 dark:text-teal-400 ml-1.5">сар</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setInstallCount(c => Math.min(leasingModal.leasing_plan!.remaining_months, c + 1))}
                                            className="flex size-10 items-center justify-center rounded-xl border-2 border-border text-xl font-bold text-muted-foreground hover:bg-muted hover:border-muted-foreground/40 transition-colors active:scale-95"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Payment method */}
                            <div className="space-y-2.5">
                                <p className="text-sm font-semibold text-foreground">Төлбөрийн арга</p>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {LEASING_PAYMENT_METHODS.map(m => (
                                        <button
                                            key={m.value}
                                            type="button"
                                            onClick={() => setInstallMethod(m.value)}
                                            className={`rounded-xl border-2 py-2.5 text-xs font-semibold transition-all active:scale-95 ${
                                                installMethod === m.value
                                                    ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300 shadow-sm'
                                                    : 'border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/30'
                                            }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2.5 pt-1 border-t border-border">
                                <button
                                    onClick={() => handlePayInstallment(leasingModal.leasing_plan!)}
                                    disabled={processing}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white py-3 text-sm font-bold transition-all shadow-sm shadow-teal-200 dark:shadow-teal-950"
                                >
                                    {processing ? (
                                        <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="size-4" />
                                    )}
                                    Төлбөр бүртгэх
                                </button>
                                <button
                                    onClick={() => setLeasingModal(null)}
                                    className="rounded-xl border px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    Цуцлах
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ReceptionLayout>
    );
}
