import ReceptionLayout from '@/layouts/reception-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle, CalendarClock, CheckCircle2, ClipboardList, CreditCard,
    FlaskConical, Package, Plus, RotateCcw, Search, Send,
    Sparkles, Trash2, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

/* ── Types ─────────────────────────────────────────────── */
interface LabOrder {
    id: number;
    order_date: string;
    sent_to_lab_date: string | null;
    lab_name: string;
    patient_last_name: string | null;
    patient_first_name: string;
    patient_phone: string | null;
    branch_id: number | null;
    branch_name: string | null;
    doctor_id: number | null;
    doctor_name: string | null;
    work_description: string;
    amount_due: number;
    discount_percent: number;
    effective_due: number;
    amount_paid: number;
    outstanding: number;
    final_payment_receipt: string | null;
    final_payment_method: string | null;
    final_payment_at: string | null;
    bender_employee_id: number | null;
    bender_name: string | null;
    polisher_employee_id: number | null;
    polisher_name: string | null;
    lab_ready_date: string | null;
    arrived_date: string | null;
    pickup_date: string | null;
    is_completed: boolean;
    completed_at: string | null;
    notes: string | null;
    created_by_name: string | null;
}

const PAYMENT_METHODS = [
    { value: 'cash',     label: 'Бэлэн' },
    { value: 'card',     label: 'Карт' },
    { value: 'mobile',   label: 'Мобайл' },
    { value: 'storepay', label: 'StorePay' },
];

function paymentMethodLabel(m: string | null): string {
    return PAYMENT_METHODS.find(p => p.value === m)?.label ?? m ?? '—';
}

interface Stats {
    active: number; completed: number;
    sent_to_lab: number; lab_ready: number;
    total_due: number; total_paid: number; total_outstanding: number;
}
interface Branch { id: number; name: string }
interface Doctor { id: number; name: string }
interface Employee { id: number; name: string }
interface Filters { status: 'active' | 'sent_to_lab' | 'lab_ready' | 'completed' | 'all'; search: string }
interface Props { orders: LabOrder[]; stats: Stats; branches: Branch[]; doctors: Doctor[]; employees: Employee[]; filters: Filters }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар', href: '/reception/dashboard' },
    { title: 'Лаб бүртгэл',     href: '/reception/lab-orders' },
];

const API_BASE = '/reception/lab-orders';

const LAB_NAMES = [
    'Кутикул лаб',
    'Дөрвөн бэрх лаб',
    '13-н лаб',
    'Эвада лаб',
    'Pro connect D лаб',
];

const PAGE_SIZE = 30;

function today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function go(patch: Partial<Filters>, current: Filters) {
    router.get(API_BASE, {
        status: patch.status ?? current.status,
        q:      patch.search ?? current.search,
    }, { preserveState: false });
}

function combinePatient(lastName: string | null, firstName: string, phone: string | null): string {
    return [lastName, firstName, phone].filter(Boolean).join(' ').trim();
}

/* Workflow stage based on filled dates */
function stage(o: LabOrder): { label: string; color: string } {
    if (o.is_completed)     return { label: 'Дууссан',          color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    if (o.pickup_date)      return { label: 'Үйлчлүүлэгч авсан', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    if (o.arrived_date)     return { label: 'Ресепшнд ирсэн',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
    if (o.lab_ready_date)   return { label: 'Лабаас ирсэн ажил', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' };
    if (o.sent_to_lab_date) return { label: 'Лаб руу явсан',     color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' };
    return { label: 'Захиалсан', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
}

/* ══════════════════════════════════════════════════════════
   Main
══════════════════════════════════════════════════════════ */
export default function LabOrdersIndex({ orders, stats, branches: _branches, doctors, employees: _employees, filters }: Props) {
    void _branches; void _employees; // controller-аас ирдэг боловч ресепшнд хэрэгсэхгүй
    const [search, setSearch] = useState(filters.search ?? '');
    const [openId, setOpenId] = useState<number | 'new' | null>(null);
    const [page, setPage] = useState(1);

    // Realtime — 5 секунд тутамд orders, stats, notifications шинэчилнэ
    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['orders', 'stats', 'notifications'] });
        }, 5000);
        return () => clearInterval(id);
    }, []);

    // Filter өөрчлөгдсөн үед pagination reset
    useEffect(() => { setPage(1); }, [search, filters.status]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return orders;
        return orders.filter(o =>
            (o.patient_first_name ?? '').toLowerCase().includes(q) ||
            (o.patient_last_name ?? '').toLowerCase().includes(q) ||
            (o.patient_phone ?? '').toLowerCase().includes(q) ||
            (o.lab_name ?? '').toLowerCase().includes(q) ||
            (o.work_description ?? '').toLowerCase().includes(q) ||
            (o.doctor_name ?? '').toLowerCase().includes(q)
        );
    }, [orders, search]);

    const openOrder = openId !== null && openId !== 'new' ? orders.find(o => o.id === openId) ?? null : null;
    const visible = filtered.slice(0, page * PAGE_SIZE);
    const hasMore = page * PAGE_SIZE < filtered.length;

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Лаб бүртгэл" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                {/* Compact Header */}
                <div className="rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/80 via-white to-fuchsia-50/60 dark:from-violet-950/30 dark:via-gray-900 dark:to-fuchsia-950/20 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-violet-100/60 dark:border-violet-900/40">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
                            <FlaskConical className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-base font-bold text-foreground inline-flex items-center gap-1.5">
                                Лаб бүртгэл
                                <Sparkles className="size-3.5 text-violet-500" />
                            </h1>
                            <p className="text-[11px] text-muted-foreground truncate">Мөр дээр дарж дэлгэрэнгүйг харах · засах</p>
                        </div>
                        <button onClick={() => setOpenId('new')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors">
                            <Plus className="size-3.5" /> Шинэ бүртгэл
                        </button>
                    </div>

                    {/* Compact inline stats */}
                    <div className="grid grid-cols-3 divide-x divide-violet-100/60 dark:divide-violet-900/30">
                        <RInlineStat label="Идэвхтэй" value={stats.active.toLocaleString()} accent="violet" />
                        <RInlineStat label="Дууссан" value={stats.completed.toLocaleString()} accent="emerald" />
                        <RInlineStat label="Дутуу" value={`${stats.total_outstanding > 999 ? (stats.total_outstanding / 1000).toFixed(0) + 'K' : stats.total_outstanding}₮`} title={`${stats.total_outstanding.toLocaleString()}₮`} accent="red" />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-card p-2 shadow-sm">
                    <div className="relative flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-background px-3 py-1.5 flex-1 min-w-60">
                        <Search className="size-3.5 text-muted-foreground" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Өвчтөн, лаб, эмч, ажлаар хайх..."
                            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
                    </div>

                    <div className="flex flex-wrap rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        {([
                            { key: 'active',      label: 'Идэвхтэй',      count: stats.active,     color: 'bg-violet-600' },
                            { key: 'sent_to_lab', label: 'Лаб руу',       count: stats.sent_to_lab, color: 'bg-violet-500' },
                            { key: 'lab_ready',   label: 'Лабаас ирсэн',  count: stats.lab_ready,   color: 'bg-indigo-600' },
                            { key: 'completed',   label: 'Дууссан',        count: stats.completed,   color: 'bg-emerald-600' },
                            { key: 'all',         label: 'Бүгд',           count: stats.active + stats.completed, color: 'bg-gray-700' },
                        ] as const).map(t => (
                            <button key={t.key} onClick={() => go({ status: t.key }, filters)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                                    filters.status === t.key
                                        ? `${t.color} text-white`
                                        : 'bg-white dark:bg-gray-900 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}>
                                {t.label}
                                <span className={`rounded-full px-1.5 text-[9px] tabular-nums ${
                                    filters.status === t.key ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
                                }`}>{t.count}</span>
                            </button>
                        ))}
                    </div>

                    <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
                        {filtered.length} бичлэг
                    </span>
                </div>

                {/* Compact Table */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-16 text-center text-muted-foreground">
                            <FlaskConical className="size-10 mx-auto mb-2 text-violet-300" />
                            <p className="text-sm font-semibold">Лаб бүртгэл байхгүй</p>
                            <p className="text-[11px] mt-1">"Шинэ бүртгэл" товч даран эхлүүлнэ үү</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto premium-scroll">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50/70 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wide">
                                            <th className="px-3 py-1.5 text-center font-semibold w-8">№</th>
                                            <th className="px-2 py-1.5 text-left font-semibold w-24">Захиалсан</th>
                                            <th className="px-2 py-1.5 text-left font-semibold">Өвчтөн</th>
                                            <th className="px-2 py-1.5 text-left font-semibold">Лаб / Ажил</th>
                                            <th className="px-2 py-1.5 text-left font-semibold w-28 hidden md:table-cell">Эмч</th>
                                            <th className="px-2 py-1.5 text-right font-semibold w-24">Дутуу</th>
                                            <th className="px-2 py-1.5 text-center font-semibold w-28">Статус</th>
                                            <th className="px-2 py-1.5 text-center font-semibold w-6"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visible.map((o, idx) => {
                                            const overdue = !o.is_completed && o.pickup_date && new Date(o.pickup_date) < new Date(today());
                                            const s = stage(o);
                                            const patient = combinePatient(o.patient_last_name, o.patient_first_name, o.patient_phone);
                                            return (
                                                <tr key={o.id}
                                                    onClick={() => setOpenId(o.id)}
                                                    className={`cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-violet-50/40 dark:hover:bg-violet-950/15 ${
                                                        o.is_completed ? 'bg-emerald-50/15 dark:bg-emerald-950/5' :
                                                        overdue ? 'bg-red-50/25 dark:bg-red-950/10' :
                                                        idx % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-gray-800/10'
                                                    }`}>
                                                    <td className="px-3 py-2 text-center text-gray-400 text-[11px] tabular-nums">{idx + 1}</td>
                                                    <td className="px-2 py-2 text-[11px] text-gray-700 dark:text-gray-300 tabular-nums whitespace-nowrap">
                                                        {o.order_date ?? '—'}
                                                    </td>
                                                    <td className="px-2 py-2 max-w-[200px]">
                                                        <div className="font-semibold text-foreground truncate text-[12px]">{patient || '—'}</div>
                                                    </td>
                                                    <td className="px-2 py-2 max-w-[260px]">
                                                        <div className="font-medium text-foreground truncate text-[12px]">{o.lab_name}</div>
                                                        <div className="text-[10px] text-muted-foreground truncate">{o.work_description}</div>
                                                    </td>
                                                    <td className="px-2 py-2 text-[11px] text-gray-700 dark:text-gray-300 truncate hidden md:table-cell">{o.doctor_name ?? '—'}</td>
                                                    <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
                                                        {o.outstanding > 0 ? (
                                                            <span className="rounded-md bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 font-bold text-red-700 dark:text-red-400 text-[11px]">
                                                                {o.outstanding.toLocaleString()}₮
                                                            </span>
                                                        ) : <span className="text-emerald-600 font-bold text-[11px]">✓</span>}
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap ${s.color}`}>
                                                            {s.label}
                                                        </span>
                                                        {overdue && (
                                                            <div className="mt-0.5 text-[9px] text-red-600 font-semibold inline-flex items-center gap-0.5">
                                                                <AlertCircle className="size-2.5" /> Хугацаа хэтэрсэн
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2 text-center text-gray-400">›</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-50 dark:bg-gray-800/60 border-t-2 border-violet-300 dark:border-violet-700">
                                            <td colSpan={5} className="px-3 py-2 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                                Нийт {filtered.length} бичлэг
                                            </td>
                                            <td className="px-2 py-2 text-right tabular-nums font-bold text-red-700 dark:text-red-400 text-[11px]">
                                                {filtered.reduce((s, o) => s + o.outstanding, 0).toLocaleString()}₮
                                            </td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            {hasMore && (
                                <div className="border-t border-border bg-muted/20">
                                    <button onClick={() => setPage(p => p + 1)}
                                        className="w-full px-3 py-2 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 font-semibold transition-colors">
                                        Үлдсэн {filtered.length - visible.length}-г харах
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <p className="text-[10px] text-muted-foreground text-center">
                    💡 Мөр дээр дарж дэлгэрэнгүйг харах, засах
                </p>
            </div>

            {/* Drawer */}
            {openId !== null && (
                <LabOrderDrawer
                    key={openId === 'new' ? 'new' : openId}
                    order={openOrder}
                    isNew={openId === 'new'}
                    doctors={doctors}
                    onClose={() => setOpenId(null)}
                />
            )}
        </ReceptionLayout>
    );
}

/* ══════════════════════════════════════════════════════════
   Drawer (slide-in side panel)
══════════════════════════════════════════════════════════ */
interface DrawerProps {
    order: LabOrder | null;
    isNew: boolean;
    doctors: Doctor[];
    onClose: () => void;
}

type DrawerForm = {
    order_date: string;
    sent_to_lab_date: string | null;
    lab_name: string;
    patient_first_name: string;
    patient_last_name: string | null;
    patient_phone: string | null;
    branch_id: number | null;
    doctor_id: number | null;
    work_description: string;
    amount_due: number;
    discount_percent: number;
    amount_paid: number;
    arrived_date: string | null;
    pickup_date: string | null;
    notes: string | null;
};

function initialForm(order: LabOrder | null): DrawerForm {
    if (!order) {
        return {
            order_date: today(),
            sent_to_lab_date: null,
            lab_name: '',
            patient_first_name: '',
            patient_last_name: null,
            patient_phone: null,
            branch_id: null,
            doctor_id: null,
            work_description: '',
            amount_due: 0,
            discount_percent: 0,
            amount_paid: 0,
            arrived_date: null,
            pickup_date: null,
            notes: null,
        };
    }
    return {
        order_date: order.order_date,
        sent_to_lab_date: order.sent_to_lab_date,
        lab_name: order.lab_name,
        patient_first_name: order.patient_first_name,
        patient_last_name: order.patient_last_name,
        patient_phone: order.patient_phone,
        branch_id: order.branch_id,
        doctor_id: order.doctor_id,
        work_description: order.work_description,
        amount_due: order.amount_due,
        discount_percent: order.discount_percent ?? 0,
        amount_paid: order.amount_paid,
        arrived_date: order.arrived_date,
        pickup_date: order.pickup_date,
        notes: order.notes,
    };
}

function LabOrderDrawer({ order, isNew, doctors, onClose }: DrawerProps) {
    const [form, setForm] = useState<DrawerForm>(() => initialForm(order));
    const [saving, setSaving] = useState(false);
    const [combinedPatient, setCombinedPatient] = useState(() =>
        combinePatient(order?.patient_last_name ?? null, order?.patient_first_name ?? '', order?.patient_phone ?? null)
    );

    // Дутуу тооцоо төлөх inline form
    const [paymentReceipt, setPaymentReceipt] = useState('');
    const [paymentMethod,  setPaymentMethod]  = useState('cash');

    const locked = order?.is_completed ?? false;
    const pct = Math.max(0, Math.min(100, form.discount_percent || 0));
    const effectiveDue = Math.round(form.amount_due * (100 - pct) / 100);
    const discountAmount = form.amount_due - effectiveDue;
    const outstanding = Math.max(0, effectiveDue - form.amount_paid);
    const canFinish = !isNew && order && !locked;

    function set<K extends keyof DrawerForm>(key: K, value: DrawerForm[K]) {
        setForm(prev => ({ ...prev, [key]: value }));
    }

    function setPatient(v: string) {
        setCombinedPatient(v);
        setForm(prev => ({ ...prev, patient_first_name: v, patient_last_name: null, patient_phone: null }));
    }

    function save(extra?: Partial<DrawerForm>) {
        const payload = { ...form, ...(extra ?? {}) };
        if (!payload.patient_first_name.trim() || !payload.lab_name.trim() || !payload.work_description.trim()) {
            alert('Өвчтөн, Лаб, Ажил талбарууд заавал бөглөгдөнө');
            return;
        }
        setSaving(true);
        if (isNew) {
            router.post(API_BASE, payload, {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onFinish: () => setSaving(false),
            });
        } else if (order) {
            router.patch(`${API_BASE}/${order.id}`, payload as never, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => onClose(),
                onFinish: () => setSaving(false),
            });
        }
    }

    function finish() {
        if (!order) return;
        if (outstanding > 0) {
            alert('Дутуу тооцоо байна. Эхлээд "Дутуу тооцоо төлөх" хэсгээс баримтын дугаар + төлбөрийн хэрэгсэл бөглөж дуусгана уу.');
            return;
        }
        if (!confirm('Энэ лаб бүртгэлийг ДУУСГАХ уу?')) return;
        setSaving(true);
        router.patch(`${API_BASE}/${order.id}`, { ...form, is_completed: true } as never, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setSaving(false),
        });
    }

    function payAndFinish() {
        if (!order) return;
        if (!paymentReceipt.trim()) {
            alert('Баримтын дугаарыг бөглөнө үү');
            return;
        }
        if (!confirm(`Баримт ${paymentReceipt} дээр ${outstanding.toLocaleString()}₮ төлж энэ бүртгэлийг ДУУСГАХ уу?`)) return;
        setSaving(true);
        router.patch(`${API_BASE}/${order.id}`, {
            ...form,
            amount_paid: effectiveDue, // хөнгөлөлт орсон цэвэр дүн = дутуугүй
            final_payment_receipt: paymentReceipt.trim(),
            final_payment_method: paymentMethod,
            is_completed: true,
        } as never, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setSaving(false),
        });
    }

    function reopen() {
        if (!order) return;
        if (!confirm('Дахин засах боломжтой болгох уу?')) return;
        router.patch(`${API_BASE}/${order.id}`, { is_completed: false } as never, { preserveScroll: true, onSuccess: () => onClose() });
    }

    function destroy() {
        if (!order) return;
        if (!confirm(`${order.patient_first_name} устгах уу?`)) return;
        router.delete(`${API_BASE}/${order.id}`, { preserveScroll: true, onSuccess: () => onClose() });
    }

    // Escape to close
    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="w-full max-w-2xl h-full bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md">
                            <FlaskConical className="size-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-foreground">
                                {isNew ? 'Шинэ лаб бүртгэл' : order?.lab_name}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {isNew ? 'Шинэ ажлын мэдээллийг бөглөнө үү' : `#${order?.id} • ${order?.created_by_name ?? ''}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors">
                        <X className="size-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                    {/* Section: Захиалга */}
                    <Section icon={<ClipboardList className="size-4" />} title="Захиалга" color="violet">
                        <Row>
                            <Field label="Захиалсан огноо *">
                                <input type="date" value={form.order_date} disabled={locked}
                                    onChange={e => set('order_date', e.target.value)}
                                    className={inputCls(locked)} />
                            </Field>
                            <Field label="Лаб руу явуулсан">
                                <input type="date" value={form.sent_to_lab_date ?? ''} disabled={locked}
                                    onChange={e => set('sent_to_lab_date', e.target.value || null)}
                                    className={inputCls(locked)} />
                            </Field>
                        </Row>
                        <Field label="Лабын нэр *">
                            <select value={form.lab_name} disabled={locked}
                                onChange={e => set('lab_name', e.target.value)}
                                className={inputCls(locked)}>
                                <option value="">— Лаб сонгоно уу —</option>
                                {LAB_NAMES.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </Field>
                        <Field label="Өвчтөн (Овог Нэр Утас) *">
                            <input type="text" value={combinedPatient} disabled={locked}
                                onChange={e => setPatient(e.target.value)}
                                placeholder="Овог Нэр 99119911"
                                className={inputCls(locked)} />
                        </Field>
                        <Field label="Эмч (тухайн салбарын)">
                            <select value={form.doctor_id ?? ''} disabled={locked}
                                onChange={e => set('doctor_id', e.target.value ? Number(e.target.value) : null)}
                                className={inputCls(locked)}>
                                <option value="">— Сонгох —</option>
                                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Хийгдэх ажил *">
                            <textarea value={form.work_description} disabled={locked} rows={2}
                                onChange={e => set('work_description', e.target.value)}
                                placeholder="Хийгдэх ажлын тайлбар"
                                className={`${inputCls(locked)} resize-none`} />
                        </Field>
                    </Section>

                    {/* Section: Лабораторид — зөвхөн "Кутикул лаб"-ын ажилд харагдана
                        (бусад гадны лабын ажлууд лаб портал-аар явахгүй) */}
                    {form.lab_name === 'Кутикул лаб' && (
                        <Section icon={<Send className="size-4" />} title="Лабораторид (лаб бөглөнө)" color="indigo">
                            <Row>
                                <ReadOnlyField label="Нугалсан" value={order?.bender_name ?? '—'} />
                                <ReadOnlyField label="Өнгөлсөн" value={order?.polisher_name ?? '—'} />
                            </Row>
                            <ReadOnlyField label="Лабораторид бэлэн болсон огноо" value={order?.lab_ready_date ?? '—'} />
                            <p className="text-[11px] text-muted-foreground italic">
                                💡 Эдгээр талбарыг лаб ажилтан өөрийн порталаасаа бөглөнө.
                            </p>
                        </Section>
                    )}

                    {/* Section: Хүлээн авах
                        - Кутикул лаб бол: лаб ажлаа дуусгаж lab_ready_date тэмдэглэснээс хойш идэвхжинэ
                        - Гадны лаб бол: шууд идэвхтэй (ресепшний хариуцлагаар хүлээн авна) */}
                    {(() => {
                        const isKuticul = form.lab_name === 'Кутикул лаб';
                        const canReceive = !locked && !isNew && (isKuticul ? !!order?.lab_ready_date : true);
                        return (
                            <Section icon={<Package className="size-4" />} title="Хүлээн авах" color="blue">
                                {!canReceive && !locked && isKuticul && (
                                    <div className="rounded-xl bg-muted/30 border border-dashed border-gray-200 dark:border-gray-700 p-3 text-xs text-muted-foreground italic">
                                        🔒 Лаб ажил бэлэн болсон гэдгээ тэмдэглэснээс хойш энэ хэсэг идэвхжинэ.
                                    </div>
                                )}
                                {!canReceive && !locked && !isKuticul && isNew && (
                                    <div className="rounded-xl bg-muted/30 border border-dashed border-gray-200 dark:border-gray-700 p-3 text-xs text-muted-foreground italic">
                                        🔒 Захиалгаа хадгалсны дараа энэ хэсэг идэвхжинэ.
                                    </div>
                                )}
                                <Row>
                                    <Field label="Ресепшнд ирсэн огноо">
                                        <input type="date" value={form.arrived_date ?? ''} disabled={!canReceive && !locked ? true : locked}
                                            onChange={e => set('arrived_date', e.target.value || null)}
                                            className={inputCls(!canReceive)} />
                                    </Field>
                                    <Field label="Үйлчлүүлэгч авсан огноо">
                                        <input type="date" value={form.pickup_date ?? ''} disabled={!canReceive && !locked ? true : locked}
                                            onChange={e => set('pickup_date', e.target.value || null)}
                                            className={inputCls(!canReceive)} />
                                    </Field>
                                </Row>
                            </Section>
                        );
                    })()}

                    {/* Section: Тооцоо */}
                    <Section icon={<CreditCard className="size-4" />} title="Тооцоо" color="emerald">
                        <div className="grid grid-cols-[1fr_90px] gap-3">
                            <Field label="Төлөх дүн (₮)">
                                <input type="number" min="0" value={form.amount_due || ''} disabled={locked}
                                    onChange={e => set('amount_due', parseInt(e.target.value) || 0)}
                                    className={`${inputCls(locked)} text-right tabular-nums`} />
                            </Field>
                            <Field label="Хөнг. %">
                                <input type="number" min="0" max="100" value={form.discount_percent || ''} disabled={locked}
                                    onChange={e => set('discount_percent', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                                    placeholder="0"
                                    className={`${inputCls(locked)} text-right tabular-nums`} />
                            </Field>
                        </div>
                        {pct > 0 && (
                            <div className="flex items-center justify-between rounded-xl bg-orange-50/60 dark:bg-orange-950/15 border border-orange-200/60 dark:border-orange-800/40 px-4 py-2 text-xs">
                                <span className="text-orange-700 dark:text-orange-300 font-medium">
                                    Хөнгөлөлт ({pct}%)
                                </span>
                                <span className="text-orange-700 dark:text-orange-300 font-bold tabular-nums">
                                    −{discountAmount.toLocaleString()}₮
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between rounded-xl bg-blue-50/60 dark:bg-blue-950/15 border border-blue-200/60 dark:border-blue-800/40 px-4 py-2 text-xs">
                            <span className="text-blue-700 dark:text-blue-300 font-medium">
                                Цэвэр төлөх дүн
                            </span>
                            <span className="text-blue-700 dark:text-blue-300 font-bold tabular-nums">
                                {effectiveDue.toLocaleString()}₮
                            </span>
                        </div>
                        <Field label="Төлсөн дүн (₮)">
                            <input type="number" min="0" value={form.amount_paid || ''} disabled={locked}
                                onChange={e => set('amount_paid', parseInt(e.target.value) || 0)}
                                className={`${inputCls(locked)} text-right tabular-nums text-emerald-700 dark:text-emerald-400 font-bold`} />
                        </Field>
                        <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                            <span className="text-sm font-semibold text-muted-foreground">Дутуу үлдэгдэл</span>
                            <span className={`text-lg font-bold tabular-nums ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {outstanding.toLocaleString()}₮
                            </span>
                        </div>

                        {/* Дууссан бүртгэлийн төлбөрийн мэдээлэл */}
                        {locked && order?.final_payment_receipt && (
                            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs">
                                <p className="font-bold text-emerald-700 dark:text-emerald-300 mb-1.5 inline-flex items-center gap-1">
                                    <CheckCircle2 className="size-3.5" /> Дутуу тооцоо төлөгдсөн
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-emerald-700 dark:text-emerald-300">
                                    <div>
                                        <span className="text-muted-foreground">Баримт:</span>{' '}
                                        <span className="font-mono font-semibold">{order.final_payment_receipt}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Хэрэгсэл:</span>{' '}
                                        <span className="font-semibold">{paymentMethodLabel(order.final_payment_method)}</span>
                                    </div>
                                    {order.final_payment_at && (
                                        <div className="col-span-2">
                                            <span className="text-muted-foreground">Огноо:</span>{' '}
                                            <span className="font-semibold">{order.final_payment_at}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Дутуу тооцоо төлөх inline form */}
                        {!locked && !isNew && outstanding > 0 && (
                            <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
                                <p className="text-sm font-bold text-amber-700 dark:text-amber-300 inline-flex items-center gap-1.5">
                                    <AlertCircle className="size-4" /> Дутуу тооцоо төлж дуусгах
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Үйлчлүүлэгч дутуу тооцоог нь төлж буй <strong>баримтын дугаар</strong> (өдрийн тооцооны нэр/дугаар, жишээ нь <code className="px-1 rounded bg-muted">A12345</code> эсвэл <code className="px-1 rounded bg-muted">RCP-001</code>) болон <strong>төлбөрийн хэрэгслийг</strong> бөглөнө үү.
                                </p>
                                <Row>
                                    <Field label="Баримтын дугаар (бичгээр) *">
                                        <input type="text" value={paymentReceipt}
                                            onChange={e => setPaymentReceipt(e.target.value)}
                                            placeholder="ж.нь: A12345"
                                            autoComplete="off"
                                            className={`${inputCls(false)} font-mono`} />
                                    </Field>
                                    <Field label="Төлбөрийн хэрэгсэл *">
                                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                            className={inputCls(false)}>
                                            {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                        </select>
                                    </Field>
                                </Row>
                                <button onClick={payAndFinish} disabled={saving || !paymentReceipt.trim()}
                                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors">
                                    <CheckCircle2 className="size-4" /> {outstanding.toLocaleString()}₮ төлж бүртгэл дуусгах
                                </button>
                            </div>
                        )}
                    </Section>

                    {/* Notes */}
                    <Section icon={<CalendarClock className="size-4" />} title="Тэмдэглэл" color="gray">
                        <textarea value={form.notes ?? ''} disabled={locked} rows={3}
                            onChange={e => set('notes', e.target.value || null)}
                            placeholder="Нэмэлт тэмдэглэл..."
                            className={`${inputCls(locked)} resize-none`} />
                    </Section>
                </div>

                {/* Footer */}
                <div className="border-t border-border bg-card px-5 py-3 flex items-center justify-between gap-2">
                    <div>
                        {!isNew && !locked && (
                            <button onClick={destroy}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                                <Trash2 className="size-3.5" /> Устгах
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                            Хаах
                        </button>
                        {!isNew && locked ? (
                            <button onClick={reopen}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors">
                                <RotateCcw className="size-4" /> Дахин засах
                            </button>
                        ) : (
                            <>
                                <button onClick={() => save()} disabled={saving}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors">
                                    <CheckCircle2 className="size-4" /> Хадгалах
                                </button>
                                {canFinish && outstanding === 0 && (
                                    <button onClick={finish} disabled={saving}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors">
                                        <CheckCircle2 className="size-4" /> Дуусгах
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Drawer helpers ───────────────────────── */
type SectionColor = 'violet' | 'emerald' | 'indigo' | 'blue' | 'gray';

function Section({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: SectionColor; children: React.ReactNode }) {
    const palette: Record<SectionColor, string> = {
        violet:  'from-violet-500 to-fuchsia-600',
        emerald: 'from-emerald-500 to-teal-600',
        indigo:  'from-indigo-500 to-violet-600',
        blue:    'from-blue-500 to-indigo-600',
        gray:    'from-gray-500 to-slate-600',
    };
    return (
        <div className="rounded-2xl border border-border bg-card/60 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
                <div className={`flex size-7 items-center justify-center rounded-lg bg-gradient-to-br ${palette[color]} text-white shadow-sm`}>
                    {icon}
                </div>
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
            </div>
            <div className="p-4 space-y-3">{children}</div>
        </div>
    );
}

function Row({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
            <div className="mt-1">{children}</div>
        </label>
    );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
    return (
        <div className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
            <div className="mt-1 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-muted/30 px-3 py-2 text-sm font-semibold text-foreground">
                {value || '—'}
            </div>
        </div>
    );
}

function inputCls(disabled: boolean) {
    return `w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 disabled:cursor-not-allowed border-gray-200 dark:border-gray-700`;
}

/* ── Compact inline stat ────────────────────────────────────────── */
function RInlineStat({ label, value, accent, title }: { label: string; value: string; accent: 'violet' | 'emerald' | 'red'; title?: string }) {
    const color = {
        violet:  'text-violet-700 dark:text-violet-400',
        emerald: 'text-emerald-700 dark:text-emerald-400',
        red:     'text-red-700 dark:text-red-400',
    }[accent];
    return (
        <div className="px-3 py-2 text-center" title={title}>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold truncate">{label}</p>
            <p className={`text-sm font-bold tabular-nums truncate ${color}`}>{value}</p>
        </div>
    );
}
