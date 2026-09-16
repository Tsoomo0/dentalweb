import ReceptionLayout from '@/layouts/reception-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle, CalendarClock, Check, CheckCircle2, ChevronDown, ClipboardList,
    CreditCard, FlaskConical, Package, Plus, RotateCcw, Search,
    Sparkles, Trash2, X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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
    /* Буцаалт — төлбөр тооцоогүй, тусдаа мөчлөг */
    return_status: ReturnStatus;
    return_count: number;
    return_reason: string | null;
    returned_at: string | null;
    return_ready_date: string | null;
    return_closed_at: string | null;
    return_history: ReturnEntry[];
    notes: string | null;
    created_by_name: string | null;
}

type ReturnStatus = 'sent' | 'ready' | 'done' | null;

/** Нэг буцаалтын мөчлөг — хаагдсан ч түүхэнд хэвээр үлдэнэ */
interface ReturnEntry {
    id: number;
    attempt: number;
    status: 'sent' | 'ready' | 'done' | 'cancelled';
    reason: string;
    returned_at: string | null;
    ready_date: string | null;
    closed_at: string | null;
    cancelled_at: string | null;
    benders: string[];
    polishers: string[];
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

interface Branch { id: number; name: string }
interface Doctor { id: number; name: string }
interface Employee { id: number; name: string }
interface Props { orders: LabOrder[]; branches: Branch[]; doctors: Doctor[]; employees: Employee[] }

/* ── Таб — бүгд клиент талд, сервер рүү явахгүй ─────────────── */
type StatusKey = 'active' | 'sent_to_lab' | 'lab_ready' | 'returned' | 'completed' | 'all';

const STATUS_MATCH: Record<StatusKey, (o: LabOrder) => boolean> = {
    active:      o => !o.is_completed,
    sent_to_lab: o => !o.is_completed && !!o.sent_to_lab_date && !o.lab_ready_date,
    lab_ready:   o => !o.is_completed && !!o.lab_ready_date && !o.arrived_date,
    returned:    o => o.return_count > 0,
    completed:   o => o.is_completed,
    all:         () => true,
};

const TABS: { key: StatusKey; label: string; color: string }[] = [
    { key: 'active',      label: 'Идэвхтэй',     color: 'bg-violet-600' },
    { key: 'sent_to_lab', label: 'Лаб руу',      color: 'bg-violet-500' },
    { key: 'lab_ready',   label: 'Лабаас ирсэн', color: 'bg-indigo-600' },
    { key: 'returned',    label: 'Буцаалт',      color: 'bg-red-600' },
    { key: 'completed',   label: 'Дууссан',      color: 'bg-emerald-600' },
    { key: 'all',         label: 'Бүгд',         color: 'bg-gray-700' },
];

/** Мэдэгдлээс ирсэн ?status=... холбоосыг хүндэтгэнэ (нэг л удаа, эхлэхэд) */
function initialTab(): StatusKey {
    if (typeof window === 'undefined') return 'active';
    const s = new URLSearchParams(window.location.search).get('status');
    return s && s in STATUS_MATCH ? (s as StatusKey) : 'active';
}

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

const PAGE_SIZE = 10;

function today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function combinePatient(lastName: string | null, firstName: string, phone: string | null): string {
    return [lastName, firstName, phone].filter(Boolean).join(' ').trim();
}

/* Workflow stage based on filled dates */
function stage(o: LabOrder): { label: string; color: string } {
    // Буцаалт бусад төлөвөөс дээгүүр харагдана
    if (o.return_status === 'sent')  return { label: 'Буцаалт лаб дээр',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
    if (o.return_status === 'ready') return { label: 'Буцаалт янзлагдсан', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
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
export default function LabOrdersIndex({ orders, branches: _branches, doctors, employees: _employees }: Props) {
    void _branches; void _employees; // controller-аас ирдэг боловч ресепшнд хэрэгсэхгүй
    const [tab, setTab]         = useState<StatusKey>(initialTab);
    const [search, setSearch]   = useState('');
    const [workFilter, setWork] = useState('');
    const [labFilter, setLab]   = useState('');
    const [openId, setOpenId]   = useState<number | 'new' | null>(null);
    const [page, setPage]       = useState(1);

    // Realtime — 5 секунд тутамд шинэчилнэ (таб, шүүлтүүр хэвээр үлдэнэ)
    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['orders', 'notifications'] });
        }, 5000);
        return () => clearInterval(id);
    }, []);

    // Шүүлтүүр өөрчлөгдөхөд эхний хуудас руу
    useEffect(() => { setPage(1); }, [search, tab, workFilter, labFilter]);

    /* Хайлт + ажил + лаб — табнаас өмнөх шүүлт.
       Табны тоонууд үүнээс тоологдох тул харагдаж буй мөртэй үргэлж таарна. */
    const scoped = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter(o => {
            if (workFilter && o.work_description !== workFilter) return false;
            if (labFilter  && o.lab_name !== labFilter) return false;
            if (!q) return true;
            return (
                (o.patient_first_name ?? '').toLowerCase().includes(q) ||
                (o.patient_last_name ?? '').toLowerCase().includes(q) ||
                (o.patient_phone ?? '').toLowerCase().includes(q) ||
                (o.lab_name ?? '').toLowerCase().includes(q) ||
                (o.work_description ?? '').toLowerCase().includes(q) ||
                (o.doctor_name ?? '').toLowerCase().includes(q)
            );
        });
    }, [orders, search, workFilter, labFilter]);

    const tabCounts = useMemo(() => {
        const c = {} as Record<StatusKey, number>;
        for (const t of TABS) c[t.key] = scoped.filter(STATUS_MATCH[t.key]).length;
        return c;
    }, [scoped]);

    // Хүлээгдэж буй буцаалт — табны анхааруулах цэг
    const openReturns = useMemo(
        () => orders.filter(o => o.return_status === 'sent' || o.return_status === 'ready').length,
        [orders]
    );

    const filtered = useMemo(() => {
        const list = scoped.filter(STATUS_MATCH[tab]);
        if (tab !== 'returned') return list;
        // Буцаалтын таб — хүлээж авах ёстой нь эхэнд
        const rank = (o: LabOrder) => (o.return_status === 'ready' ? 0 : o.return_status === 'sent' ? 1 : 2);
        return [...list].sort((a, b) => rank(a) - rank(b));
    }, [scoped, tab]);

    /* Сонгогчийн жагсаалтууд — бүх бүртгэлээс, тоотойгоо */
    const workOptions = useMemo(() => countBy(orders, o => o.work_description), [orders]);
    const labOptions  = useMemo(() => countBy(orders, o => o.lab_name), [orders]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const current   = Math.min(page, pageCount);
    const visible   = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
    const openOrder = openId !== null && openId !== 'new' ? orders.find(o => o.id === openId) ?? null : null;

    const activeCount    = useMemo(() => orders.filter(o => !o.is_completed).length, [orders]);
    const completedCount = orders.length - activeCount;
    const outstanding    = useMemo(
        () => orders.reduce((s, o) => s + (o.is_completed ? 0 : o.outstanding), 0),
        [orders]
    );

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
                        <RInlineStat label="Идэвхтэй" value={activeCount.toLocaleString()} accent="violet" />
                        <RInlineStat label="Дууссан" value={completedCount.toLocaleString()} accent="emerald" />
                        <RInlineStat label="Дутуу" value={`${outstanding > 999 ? (outstanding / 1000).toFixed(0) + 'K' : outstanding}₮`} title={`${outstanding.toLocaleString()}₮`} accent="red" />
                    </div>
                </div>

                {/* Filters — бүгд клиент талд, хуудас дахин ачаалахгүй */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-card p-2 shadow-sm space-y-2">
                    {/* Мөр 1 — хайлт + ангилал */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-background px-3 py-1.5 flex-1 min-w-52">
                            <Search className="size-3.5 text-muted-foreground" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Өвчтөн, лаб, эмч, ажлаар хайх..."
                                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
                            {search && (
                                <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        <FilterSelect label="Ажил" value={workFilter} onChange={setWork}
                            options={workOptions} allLabel="Бүх ажил" />
                        <FilterSelect label="Лаб" value={labFilter} onChange={setLab}
                            options={labOptions} allLabel="Бүх лаб" />

                        {(workFilter || labFilter || search) && (
                            <button onClick={() => { setSearch(''); setWork(''); setLab(''); }}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-3" /> Цэвэрлэх
                            </button>
                        )}
                    </div>

                    {/* Мөр 2 — таб */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                            {TABS.map(t => (
                                <button key={t.key} onClick={() => setTab(t.key)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                                        tab === t.key
                                            ? `${t.color} text-white`
                                            : 'bg-white dark:bg-gray-900 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}>
                                    {t.label}
                                    {/* Хүлээгдэж буй буцаалт байвал анхааруулах цэг */}
                                    {t.key === 'returned' && openReturns > 0 && (
                                        <span className="size-1.5 rounded-full bg-red-500 animate-pulse"
                                            title={`${openReturns} буцаалт хүлээгдэж байна`} />
                                    )}
                                    <span className={`rounded-full px-1.5 text-[9px] tabular-nums ${
                                        tab === t.key ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
                                    }`}>{tabCounts[t.key]}</span>
                                </button>
                            ))}
                        </div>

                        <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
                            {filtered.length} бичлэг{pageCount > 1 && <> · {current}/{pageCount} хуудас</>}
                        </span>
                    </div>
                </div>

                {/* Compact Table */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-16 text-center text-muted-foreground">
                            <FlaskConical className="size-10 mx-auto mb-2 text-violet-300" />
                            <p className="text-sm font-semibold">Лаб бүртгэл байхгүй</p>
                            <p className="text-[11px] mt-1">
                                {search || workFilter || labFilter
                                    ? 'Энэ шүүлтэнд тохирох бүртгэл алга — "Цэвэрлэх" дарж бүгдийг харна уу'
                                    : '"Шинэ бүртгэл" товч даран эхлүүлнэ үү'}
                            </p>
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
                                                        o.return_status === 'ready' ? 'bg-amber-50/40 dark:bg-amber-950/10' :
                                                        o.return_status === 'sent' ? 'bg-red-50/30 dark:bg-red-950/10' :
                                                        o.is_completed ? 'bg-emerald-50/15 dark:bg-emerald-950/5' :
                                                        overdue ? 'bg-red-50/25 dark:bg-red-950/10' :
                                                        idx % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-gray-800/10'
                                                    }`}>
                                                    <td className="px-3 py-2 text-center text-gray-400 text-[11px] tabular-nums">{(current - 1) * PAGE_SIZE + idx + 1}</td>
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
                            {pageCount > 1 && (
                                <Pager page={current} pageCount={pageCount} total={filtered.length}
                                    from={(current - 1) * PAGE_SIZE + 1} to={Math.min(current * PAGE_SIZE, filtered.length)}
                                    onChange={setPage} />
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

    // Буцаалтын шалтгаан
    const [returnReason, setReturnReason] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const returnStatus = order?.return_status ?? null;
    const hasOpenReturn = returnStatus === 'sent' || returnStatus === 'ready';
    const returnHistory = order?.return_history ?? [];
    const currentReturn = returnHistory.find(r => r.status === 'sent' || r.status === 'ready') ?? null;
    const pastReturns   = returnHistory.filter(r => r !== currentReturn);

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

    // ── Буцаалт — төлбөр тооцоо огт хөндөгдөхгүй ────────────────────────────
    function sendReturn() {
        if (!order) return;
        if (!returnReason.trim()) {
            alert('Буцаалтын шалтгааныг бичнэ үү (ж.нь: шүдэнд таарахгүй байна).');
            return;
        }
        if (!confirm('Энэ ажлыг буцаалт болгож лаб руу явуулах уу?\n\nТөлбөр тооцоо өөрчлөгдөхгүй.')) return;
        setSaving(true);
        router.post(`${API_BASE}/${order.id}/return`, { return_reason: returnReason.trim() }, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setSaving(false),
        });
    }

    function closeReturn() {
        if (!order) return;
        if (!confirm('Буцаалтыг хүлээж авч хаах уу?')) return;
        setSaving(true);
        router.post(`${API_BASE}/${order.id}/return/close`, {}, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setSaving(false),
        });
    }

    function cancelReturn() {
        if (!order) return;
        if (!confirm('Буцаалтыг цуцлах уу? (Лаб хараахан янзалж эхлээгүй бол)')) return;
        setSaving(true);
        router.post(`${API_BASE}/${order.id}/return/cancel`, {}, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setSaving(false),
        });
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
            <div className="w-full max-w-3xl h-full bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
                            <FlaskConical className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-foreground truncate">
                                {isNew ? 'Шинэ лаб бүртгэл' : `${order?.patient_last_name ?? ''} ${order?.patient_first_name ?? ''}`.trim()}
                            </h2>
                            <p className="text-[10.5px] text-muted-foreground truncate">
                                {isNew
                                    ? 'Шинэ ажлын мэдээллийг бөглөнө үү'
                                    : [`#${order?.id}`, order?.lab_name, order?.work_description].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {!isNew && order && (
                            <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${stage(order).color}`}>
                                {stage(order).label}
                            </span>
                        )}
                        <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                {/* Content — нэг дэлгэцэнд багтахаар нягтруулсан */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {/* Захиалга */}
                    <Section icon={<ClipboardList className="size-3" />} title="Захиалга" color="violet">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
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
                            <Field label="Лабын нэр *">
                                <select value={form.lab_name} disabled={locked}
                                    onChange={e => set('lab_name', e.target.value)}
                                    className={inputCls(locked)}>
                                    <option value="">— Лаб сонгоно уу —</option>
                                    {LAB_NAMES.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </Field>
                            <Field label="Эмч">
                                <select value={form.doctor_id ?? ''} disabled={locked}
                                    onChange={e => set('doctor_id', e.target.value ? Number(e.target.value) : null)}
                                    className={inputCls(locked)}>
                                    <option value="">— Сонгох —</option>
                                    {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Өвчтөн (Овог Нэр Утас) *">
                                <input type="text" value={combinedPatient} disabled={locked}
                                    onChange={e => setPatient(e.target.value)}
                                    placeholder="Овог Нэр 99119911"
                                    className={inputCls(locked)} />
                            </Field>
                            <Field label="Хийгдэх ажил *">
                                <input type="text" value={form.work_description} disabled={locked}
                                    onChange={e => set('work_description', e.target.value)}
                                    placeholder="ж.нь: SMA (доод)"
                                    className={inputCls(locked)} />
                            </Field>
                        </div>
                    </Section>

                    {/* Лаб + хүлээн авах — нэг мөрөнд */}
                    {(() => {
                        const isKuticul = form.lab_name === 'Кутикул лаб';
                        const canReceive = !locked && !isNew && (isKuticul ? !!order?.lab_ready_date : true);
                        return (
                            <Section icon={<Package className="size-3" />} title="Лаб · Хүлээн авах" color="blue"
                                right={!canReceive && !locked && isKuticul
                                    ? <span className="text-[10px] text-muted-foreground">🔒 Лаб бэлэн болсны дараа</span>
                                    : undefined}>
                                {isKuticul && (
                                    <div className="grid grid-cols-3 gap-2">
                                        <MiniStat label={returnHistory.length > 0 ? 'Нугалсан (анхны)' : 'Нугалсан'} value={order?.bender_name ?? '—'} />
                                        <MiniStat label={returnHistory.length > 0 ? 'Өнгөлсөн (анхны)' : 'Өнгөлсөн'} value={order?.polisher_name ?? '—'} />
                                        <MiniStat label="Лаб бэлэн" value={order?.lab_ready_date ?? '—'} />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                                    <Field label="Ресепшнд ирсэн">
                                        <input type="date" value={form.arrived_date ?? ''} disabled={!canReceive && !locked ? true : locked}
                                            onChange={e => set('arrived_date', e.target.value || null)}
                                            className={inputCls(!canReceive)} />
                                    </Field>
                                    <Field label="Үйлчлүүлэгч авсан">
                                        <input type="date" value={form.pickup_date ?? ''} disabled={!canReceive && !locked ? true : locked}
                                            onChange={e => set('pickup_date', e.target.value || null)}
                                            className={inputCls(!canReceive)} />
                                    </Field>
                                </div>
                            </Section>
                        );
                    })()}

                    {/* Тооцоо — 3 талбар нэг мөрөнд, дүнгүүд нэг зурваст */}
                    <Section icon={<CreditCard className="size-3" />} title="Тооцоо" color="emerald">
                        <div className="grid grid-cols-[1fr_70px_1fr] gap-2">
                            <Field label="Төлөх дүн ₮">
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
                            <Field label="Төлсөн ₮">
                                <input type="number" min="0" value={form.amount_paid || ''} disabled={locked}
                                    onChange={e => set('amount_paid', parseInt(e.target.value) || 0)}
                                    className={`${inputCls(locked)} text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400`} />
                            </Field>
                        </div>

                        <div className="flex items-stretch divide-x divide-border rounded-lg border border-border bg-muted/30 text-[11px]">
                            {pct > 0 && (
                                <div className="flex-1 px-3 py-1.5">
                                    <div className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Хөнгөлөлт {pct}%</div>
                                    <div className="font-bold tabular-nums text-orange-600 dark:text-orange-400">−{discountAmount.toLocaleString()}₮</div>
                                </div>
                            )}
                            <div className="flex-1 px-3 py-1.5">
                                <div className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Цэвэр төлөх</div>
                                <div className="font-bold tabular-nums text-blue-600 dark:text-blue-400">{effectiveDue.toLocaleString()}₮</div>
                            </div>
                            <div className="flex-1 px-3 py-1.5">
                                <div className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Дутуу үлдэгдэл</div>
                                <div className={`font-bold tabular-nums ${outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {outstanding.toLocaleString()}₮
                                </div>
                            </div>
                        </div>

                        {/* Дууссан бүртгэлийн төлбөрийн мэдээлэл */}
                        {locked && order?.final_payment_receipt && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                                <span className="inline-flex items-center gap-1 font-bold"><CheckCircle2 className="size-3" /> Төлөгдсөн</span>
                                <span className="font-mono font-semibold">{order.final_payment_receipt}</span>
                                <span>{paymentMethodLabel(order.final_payment_method)}</span>
                                {order.final_payment_at && <span className="text-muted-foreground">{order.final_payment_at}</span>}
                            </div>
                        )}

                        {/* Дутуу тооцоо төлөх inline form */}
                        {!locked && !isNew && outstanding > 0 && (
                            <div className="rounded-lg border border-amber-300 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 space-y-2">
                                <div className="grid grid-cols-[1fr_120px] gap-2">
                                    <Field label="Баримтын дугаар *">
                                        <input type="text" value={paymentReceipt}
                                            onChange={e => setPaymentReceipt(e.target.value)}
                                            placeholder="ж.нь: A12345"
                                            autoComplete="off"
                                            className={`${inputCls(false)} font-mono`} />
                                    </Field>
                                    <Field label="Хэрэгсэл *">
                                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                            className={inputCls(false)}>
                                            {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                        </select>
                                    </Field>
                                </div>
                                <button onClick={payAndFinish} disabled={saving || !paymentReceipt.trim()}
                                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 text-[12.5px] font-bold text-white shadow-sm transition-colors">
                                    <CheckCircle2 className="size-3.5" /> {outstanding.toLocaleString()}₮ төлж дуусгах
                                </button>
                            </div>
                        )}
                    </Section>

                    {/* Буцаалт */}
                    {!isNew && order && (
                        <Section icon={<RotateCcw className="size-3" />} title="Буцаалт" color="red"
                            right={pastReturns.length > 0
                                ? <button onClick={() => setShowHistory(h => !h)}
                                    className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:underline">
                                    Түүх · {pastReturns.length} {showHistory ? '▲' : '▼'}
                                  </button>
                                : undefined}>
                            {returnStatus === 'sent' && (
                                <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/20 px-3 py-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9.5px] font-bold uppercase tracking-wide text-red-700 dark:text-red-400">Лаб дээр янзлагдаж байна</p>
                                        <p className="text-[12.5px] text-foreground">{order.return_reason}</p>
                                        {order.returned_at && <p className="text-[10px] text-muted-foreground">Явуулсан: {order.returned_at}</p>}
                                    </div>
                                    <button onClick={cancelReturn} disabled={saving}
                                        className="shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-[10.5px] font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors">
                                        Цуцлах
                                    </button>
                                </div>
                            )}

                            {returnStatus === 'ready' && (
                                <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 space-y-2">
                                    <div>
                                        <p className="text-[9.5px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">Лаб янзалж дуусгасан — хүлээж авна уу</p>
                                        <p className="text-[12.5px] text-foreground">{order.return_reason}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {[
                                                order.return_ready_date,
                                                currentReturn?.benders.length ? `нугалсан: ${currentReturn.benders.join(', ')}` : null,
                                                currentReturn?.polishers.length ? `өнгөлсөн: ${currentReturn.polishers.join(', ')}` : null,
                                            ].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                    <button onClick={closeReturn} disabled={saving}
                                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 px-3 py-2 text-[12.5px] font-bold text-white shadow-sm transition-colors">
                                        <CheckCircle2 className="size-3.5" /> Хүлээж авч хаах · төлбөргүй
                                    </button>
                                </div>
                            )}

                            {(returnStatus === null || returnStatus === 'done') && (
                                locked ? (
                                    <div className="flex items-end gap-2">
                                        <Field label="Буцаалтын шалтгаан">
                                            <input type="text" value={returnReason}
                                                onChange={e => setReturnReason(e.target.value)}
                                                placeholder="ж.нь: шүдэнд таарахгүй байна"
                                                className={inputCls(false)} />
                                        </Field>
                                        <button onClick={sendReturn} disabled={saving || !returnReason.trim()}
                                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition-colors">
                                            <RotateCcw className="size-3.5" /> Лаб руу буцаах
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-[10.5px] text-muted-foreground">
                                        Буцаалтыг зөвхөн <span className="font-semibold text-foreground">дууссан</span> бүртгэл дээр хийнэ.
                                    </p>
                                )
                            )}

                            {showHistory && pastReturns.length > 0 && <ReturnHistoryList items={pastReturns} />}
                        </Section>
                    )}

                    {/* Тэмдэглэл */}
                    <Section icon={<CalendarClock className="size-3" />} title="Тэмдэглэл" color="gray">
                        <textarea value={form.notes ?? ''} disabled={locked} rows={2}
                            onChange={e => set('notes', e.target.value || null)}
                            placeholder="Нэмэлт тэмдэглэл..."
                            className={`${inputCls(locked)} resize-none`} />
                    </Section>
                </div>

                {/* Footer */}
                <div className="border-t border-border bg-card px-4 py-2 flex items-center justify-between gap-2">
                    <div>
                        {!isNew && !locked && (
                            <button onClick={destroy}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/50 px-2.5 py-1.5 text-[11.5px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                                <Trash2 className="size-3" /> Устгах
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose}
                            className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-muted transition-colors">
                            Хаах
                        </button>
                        {!isNew && locked ? (
                            // Идэвхтэй буцаалттай үед дахин нээх нь төлөвүүдийг зөрчих тул нуугдана
                            hasOpenReturn ? null : (
                                <button onClick={reopen}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-colors">
                                    <RotateCcw className="size-3.5" /> Дахин засах
                                </button>
                            )
                        ) : (
                            <>
                                <button onClick={() => save()} disabled={saving}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-colors">
                                    <CheckCircle2 className="size-3.5" /> Хадгалах
                                </button>
                                {canFinish && outstanding === 0 && (
                                    <button onClick={finish} disabled={saving}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-colors">
                                        <CheckCircle2 className="size-3.5" /> Дуусгах
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

/* ── Ангилалын сонгогч (ажил / лаб) ───────────────────────── */
function countBy(list: LabOrder[], pick: (o: LabOrder) => string | null): { value: string; count: number }[] {
    const map = new Map<string, number>();
    for (const o of list) {
        const v = (pick(o) ?? '').trim();
        if (!v) continue;
        map.set(v, (map.get(v) ?? 0) + 1);
    }
    return [...map.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/**
 * Native <select>-ийн option-ууд хөтчийн өөрийн загвартай тул dark theme-д
 * уншигдахгүй болдог. Тиймээс өөрийн цэс — theme token-оор будагдана.
 */
function FilterSelect({ label, value, onChange, options, allLabel }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; count: number }[];
    allLabel: string;
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const active = value !== '';

    // Гадна дарах / Escape дарахад хаах
    useEffect(() => {
        if (!open) return;
        function onDown(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    useEffect(() => { if (!open) setQ(''); }, [open]);

    const shown = q.trim()
        ? options.filter(o => o.value.toLowerCase().includes(q.trim().toLowerCase()))
        : options;

    function pick(v: string) { onChange(v); setOpen(false); }

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen(o => !o)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors ${
                    active
                        ? 'border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-400'
                        : 'border-gray-200 dark:border-gray-700 bg-background text-muted-foreground hover:bg-muted'
                }`}>
                <span className="font-semibold">{label}</span>
                <span className={`max-w-32 truncate font-medium ${active ? '' : 'text-foreground'}`}>
                    {active ? value : allLabel}
                </span>
                <ChevronDown className={`size-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-full z-40 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                    {options.length > 8 && (
                        <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
                            <Search className="size-3 text-muted-foreground" />
                            <input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)}
                                placeholder="Шүүх..."
                                className="w-full bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none" />
                        </div>
                    )}

                    <div className="max-h-64 overflow-y-auto py-1">
                        <DropdownItem selected={value === ''} onClick={() => pick('')} label={allLabel} />
                        {shown.map(o => (
                            <DropdownItem key={o.value} selected={value === o.value}
                                onClick={() => pick(o.value)} label={o.value} count={o.count} />
                        ))}
                        {shown.length === 0 && (
                            <p className="px-3 py-3 text-center text-[11px] text-muted-foreground">Олдсонгүй</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function DropdownItem({ label, count, selected, onClick }: {
    label: string; count?: number; selected: boolean; onClick: () => void;
}) {
    return (
        <button type="button" onClick={onClick}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors ${
                selected
                    ? 'bg-violet-50 font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                    : 'text-foreground hover:bg-muted'
            }`}>
            <Check className={`size-3 shrink-0 ${selected ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
            <span className="flex-1 truncate">{label}</span>
            {count !== undefined && (
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums text-muted-foreground">
                    {count}
                </span>
            )}
        </button>
    );
}

/* ── Хуудаслалт ───────────────────────────────────────────── */
function Pager({ page, pageCount, total, from, to, onChange }: {
    page: number; pageCount: number; total: number; from: number; to: number;
    onChange: (p: number) => void;
}) {
    // 1 … 4 5 [6] 7 8 … 20 хэлбэрээр богиносгоно
    const nums: (number | '…')[] = [];
    for (let i = 1; i <= pageCount; i++) {
        if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) nums.push(i);
        else if (nums[nums.length - 1] !== '…') nums.push('…');
    }

    const btn = 'inline-flex items-center justify-center min-w-7 h-7 rounded-lg px-2 text-[11px] font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed';

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-3 py-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">
                {from}–{to} / нийт {total}
            </span>
            <div className="flex items-center gap-1">
                <button onClick={() => onChange(page - 1)} disabled={page <= 1}
                    className={`${btn} border border-gray-200 dark:border-gray-700 text-muted-foreground hover:bg-card`}>
                    ‹
                </button>
                {nums.map((n, i) => n === '…' ? (
                    <span key={`gap-${i}`} className="px-1 text-[11px] text-muted-foreground">…</span>
                ) : (
                    <button key={n} onClick={() => onChange(n)}
                        className={`${btn} ${
                            n === page
                                ? 'bg-violet-600 text-white shadow-sm'
                                : 'border border-gray-200 dark:border-gray-700 text-muted-foreground hover:bg-card'
                        }`}>
                        {n}
                    </button>
                ))}
                <button onClick={() => onChange(page + 1)} disabled={page >= pageCount}
                    className={`${btn} border border-gray-200 dark:border-gray-700 text-muted-foreground hover:bg-card`}>
                    ›
                </button>
            </div>
        </div>
    );
}

/* ── Буцаалтын түүх (мөчлөг бүр) ─────────────────────────── */
/** Буцаалтын мөчлөгийг янзалсан ажилтнууд — тод, бүтнээр нь */
function ReturnWorkers({ label, names }: { label: string; names: string[] }) {
    return (
        <div className="rounded-md bg-muted/40 px-2 py-1">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
            <div className="text-[12px] font-semibold text-foreground">
                {names.length > 0 ? names.join(', ') : <span className="font-normal text-muted-foreground/60">—</span>}
            </div>
        </div>
    );
}

const RETURN_STATUS_LABEL: Record<ReturnEntry['status'], { text: string; cls: string }> = {
    sent:      { text: 'Лаб дээр',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    ready:     { text: 'Янзалсан',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    done:      { text: 'Хаагдсан',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    cancelled: { text: 'Цуцлагдсан', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

function ReturnHistoryList({ items }: { items: ReturnEntry[] }) {
    if (!items || items.length === 0) return null;
    return (
        <div className="space-y-2">
            {items.map(r => {
                const s = RETURN_STATUS_LABEL[r.status];
                return (
                    <div key={r.id} className={`rounded-lg border px-2.5 py-1.5 ${
                        r.status === 'cancelled' ? 'border-border bg-muted/20 opacity-70' : 'border-border bg-card'
                    }`}>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-muted-foreground tabular-nums shrink-0">#{r.attempt}</span>
                            <span className="flex-1 truncate text-[12px] text-foreground" title={r.reason}>{r.reason}</span>
                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${s.cls}`}>{s.text}</span>
                        </div>

                        {/* Буцаалтыг янзалсан ажилтан — тод, тасрахгүй */}
                        {(r.benders.length > 0 || r.polishers.length > 0) && (
                            <div className="mt-1 grid grid-cols-2 gap-1.5">
                                <ReturnWorkers label="Нугалсан" names={r.benders} />
                                <ReturnWorkers label="Өнгөлсөн" names={r.polishers} />
                            </div>
                        )}

                        <div className="mt-1 text-[10px] text-muted-foreground">
                            {[
                                r.returned_at?.slice(0, 10),
                                r.ready_date && `янзалсан ${r.ready_date}`,
                                r.closed_at && `хаасан ${r.closed_at.slice(0, 10)}`,
                            ].filter(Boolean).join(' · ')}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ── Drawer helpers ───────────────────────── */
type SectionColor = 'violet' | 'emerald' | 'indigo' | 'blue' | 'gray' | 'red';

/** Хөнгөн гарчиг — картны хүрээ, том icon-гүй тул босоо зай хэмнэнэ */
function Section({ icon, title, color, right, children }: {
    icon: React.ReactNode; title: string; color: SectionColor;
    right?: React.ReactNode; children: React.ReactNode;
}) {
    const palette: Record<SectionColor, string> = {
        violet:  'from-violet-500 to-fuchsia-600',
        emerald: 'from-emerald-500 to-teal-600',
        indigo:  'from-indigo-500 to-violet-600',
        blue:    'from-blue-500 to-indigo-600',
        gray:    'from-gray-500 to-slate-600',
        red:     'from-red-500 to-orange-600',
    };
    return (
        <section className="space-y-1.5">
            <div className="flex items-center gap-1.5">
                <span className={`flex size-4 shrink-0 items-center justify-center rounded bg-gradient-to-br ${palette[color]} text-white`}>
                    {icon}
                </span>
                <h3 className="text-[10.5px] font-bold uppercase tracking-wide text-foreground">{title}</h3>
                <span className="h-px flex-1 bg-border" />
                {right}
            </div>
            <div className="space-y-2">{children}</div>
        </section>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block min-w-0 flex-1">
            <span className="text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
            <div className="mt-0.5">{children}</div>
        </label>
    );
}

/** Лаб талаас бөглөгддөг зөвхөн уншигдах жижиг нүд */
function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-muted/30 px-2.5 py-1">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground truncate">{label}</div>
            <div className="text-[12px] font-semibold text-foreground truncate" title={value}>{value || '—'}</div>
        </div>
    );
}

function inputCls(disabled: boolean) {
    void disabled;
    return 'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-background px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 disabled:cursor-not-allowed';
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
