import LabLayout from '@/layouts/lab-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle, Check, CheckCircle2, ChevronDown, FlaskConical, RotateCcw,
    Search, Send, User, Users, X,
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
    amount_paid: number;
    outstanding: number;
    benders: Employee[];
    polishers: Employee[];
    lab_ready_date: string | null;
    arrived_date: string | null;
    pickup_date: string | null;
    is_completed: boolean;
    completed_at: string | null;
    /* Буцаалт */
    return_status: ReturnStatus;
    return_count: number;
    return_reason: string | null;
    returned_at: string | null;
    return_ready_date: string | null;
    return_benders: Employee[];
    return_polishers: Employee[];
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

interface Employee { id: number; name: string }
interface Props {
    orders: LabOrder[];
    employees: Employee[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар', href: '/lab/dashboard' },
    { title: 'Лаб бүртгэл',     href: '/lab/lab-orders' },
];

const API_BASE = '/lab/lab-orders';

function combinePatient(lastName: string | null, firstName: string, phone: string | null): string {
    return [lastName, firstName, phone].filter(Boolean).join(' ').trim();
}

function stage(o: LabOrder): { label: string; color: string } {
    // Буцаалт бусад бүх төлөвөөс дээгүүр — лаб хамгийн түрүүнд үүнийг харах ёстой
    if (o.return_status === 'sent')  return { label: 'Буцаалт ирсэн',   color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
    if (o.return_status === 'ready') return { label: 'Буцаалт янзалсан', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
    if (o.is_completed)     return { label: 'Дууссан',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    if (o.pickup_date)      return { label: 'Авсан',       color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    if (o.arrived_date)     return { label: 'Ресепшнд',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
    if (o.lab_ready_date)   return { label: 'Ажил бэлэн болсон', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' };
    if (o.sent_to_lab_date) return { label: 'Хүлээж авсан', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' };
    return { label: 'Шинэ', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
}

/* ── Таб — бүгд клиент талд, сервер рүү явахгүй ─────────────── */
type StatusKey = 'active' | 'pending' | 'ready' | 'returned' | 'completed' | 'all';

const STATUS_MATCH: Record<StatusKey, (o: LabOrder) => boolean> = {
    active:    o => !o.is_completed,
    pending:   o => !o.is_completed && !o.lab_ready_date,
    ready:     o => !o.is_completed && !!o.lab_ready_date,
    returned:  o => o.return_count > 0,
    completed: o => o.is_completed,
    all:       () => true,
};

const TABS: { key: StatusKey; label: string; color: string }[] = [
    { key: 'active',    label: 'Идэвхтэй',   color: 'bg-violet-600' },
    { key: 'pending',   label: 'Хийгдэж буй', color: 'bg-violet-500' },
    { key: 'ready',     label: 'Бэлэн',      color: 'bg-indigo-600' },
    { key: 'returned',  label: 'Буцаалт',    color: 'bg-red-600' },
    { key: 'completed', label: 'Дууссан',    color: 'bg-emerald-600' },
    { key: 'all',       label: 'Бүгд',       color: 'bg-gray-700' },
];

/** Мэдэгдлээс ирсэн ?status=... холбоосыг хүндэтгэнэ (эхлэхэд нэг л удаа) */
function initialTab(): StatusKey {
    if (typeof window === 'undefined') return 'active';
    const s = new URLSearchParams(window.location.search).get('status');
    return s && s in STATUS_MATCH ? (s as StatusKey) : 'active';
}

/* ══════════════════════════════════════════════════════════
   Main
══════════════════════════════════════════════════════════ */
const PAGE_SIZE = 10;

export default function LabOrdersIndex({ orders, employees }: Props) {
    const [tab, setTab]             = useState<StatusKey>(initialTab);
    const [search, setSearch]       = useState('');
    const [workFilter, setWork]     = useState('');
    const [branchFilter, setBranch] = useState('');
    const [openId, setOpenId]       = useState<number | null>(null);
    const [page, setPage]           = useState(1);

    // Realtime — 5 секунд тутамд шинэчилнэ (таб, шүүлтүүр хэвээр үлдэнэ)
    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['orders', 'notifications'] });
        }, 5000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => { setPage(1); }, [search, tab, workFilter, branchFilter]);

    /* Хайлт + ажил + салбар — табнаас өмнөх шүүлт.
       Табны тоонууд үүнээс тоологдох тул харагдаж буй мөртэй үргэлж таарна. */
    const scoped = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter(o => {
            if (workFilter && o.work_description !== workFilter) return false;
            if (branchFilter && (o.branch_name ?? '') !== branchFilter) return false;
            if (!q) return true;
            return (
                (o.patient_first_name ?? '').toLowerCase().includes(q) ||
                (o.patient_last_name ?? '').toLowerCase().includes(q) ||
                (o.patient_phone ?? '').toLowerCase().includes(q) ||
                (o.work_description ?? '').toLowerCase().includes(q) ||
                (o.doctor_name ?? '').toLowerCase().includes(q)
            );
        });
    }, [orders, search, workFilter, branchFilter]);

    const tabCounts = useMemo(() => {
        const c = {} as Record<StatusKey, number>;
        for (const t of TABS) c[t.key] = scoped.filter(STATUS_MATCH[t.key]).length;
        return c;
    }, [scoped]);

    // Янзлах ёстой буцаалт — табны анхааруулах цэг
    const openReturns = useMemo(() => orders.filter(o => o.return_status === 'sent').length, [orders]);

    const filtered = useMemo(() => {
        const list = scoped.filter(STATUS_MATCH[tab]);
        if (tab !== 'returned') return list;
        // Буцаалтын таб — янзлах ёстой нь эхэнд
        const rank = (o: LabOrder) => (o.return_status === 'sent' ? 0 : o.return_status === 'ready' ? 1 : 2);
        return [...list].sort((a, b) => rank(a) - rank(b));
    }, [scoped, tab]);

    const workOptions   = useMemo(() => countBy(orders, o => o.work_description), [orders]);
    const branchOptions = useMemo(() => countBy(orders, o => o.branch_name), [orders]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const current   = Math.min(page, pageCount);
    const visible   = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
    const openOrder = openId !== null ? orders.find(o => o.id === openId) ?? null : null;

    const activeCount = useMemo(() => orders.filter(o => !o.is_completed).length, [orders]);
    const readyCount  = useMemo(() => orders.filter(o => !o.is_completed && o.lab_ready_date).length, [orders]);

    return (
        <LabLayout breadcrumbs={breadcrumbs}>
            <Head title="Лаб бүртгэл" />

            <div className="flex flex-col gap-3 p-4 md:p-6">
                {/* Header */}
                <div className="rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/80 via-card to-fuchsia-50/60 dark:from-violet-950/30 dark:via-card dark:to-fuchsia-950/20 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-violet-100/60 dark:border-violet-900/40">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
                            <FlaskConical className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-base font-bold text-foreground">Лаб бүртгэл</h1>
                            <p className="text-[11px] text-muted-foreground truncate">
                                Мөр дээр дарж нугалсан / өнгөлсөн ажилтан, бэлэн огноог тэмдэглэнэ
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-violet-100/60 dark:divide-violet-900/30">
                        <LInlineStat label="Идэвхтэй" value={activeCount.toLocaleString()} accent="violet" />
                        <LInlineStat label="Бэлэн болсон" value={readyCount.toLocaleString()} accent="indigo" />
                        <LInlineStat label="Янзлах буцаалт" value={openReturns.toLocaleString()} accent="red" />
                    </div>
                </div>

                {/* Filters — бүгд клиент талд, хуудас дахин ачаалахгүй */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-card p-2 shadow-sm space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-background px-3 py-1.5 flex-1 min-w-52">
                            <Search className="size-3.5 text-muted-foreground" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Өвчтөн, эмч, ажлаар хайх..."
                                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
                            {search && (
                                <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        <FilterSelect label="Ажил" value={workFilter} onChange={setWork}
                            options={workOptions} allLabel="Бүх ажил" />
                        <FilterSelect label="Салбар" value={branchFilter} onChange={setBranch}
                            options={branchOptions} allLabel="Бүх салбар" />

                        {(workFilter || branchFilter || search) && (
                            <button onClick={() => { setSearch(''); setWork(''); setBranch(''); }}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-3" /> Цэвэрлэх
                            </button>
                        )}
                    </div>

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
                                    {t.key === 'returned' && openReturns > 0 && (
                                        <span className="size-1.5 rounded-full bg-red-500 animate-pulse"
                                            title={`${openReturns} буцаалт янзлах ёстой`} />
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

                {/* Table */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-16 text-center text-muted-foreground">
                            <FlaskConical className="size-10 mx-auto mb-2 text-violet-300" />
                            <p className="text-sm font-semibold">Лаб бүртгэл байхгүй</p>
                            <p className="text-[11px] mt-1">
                                {search || workFilter || branchFilter
                                    ? 'Энэ шүүлтэнд тохирох бүртгэл алга — "Цэвэрлэх" дарж бүгдийг харна уу'
                                    : 'Ресепшнээс ирэх захиалгыг хүлээж байна'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto premium-scroll">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50/70 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wide">
                                            <th className="px-3 py-1.5 text-center font-semibold w-8">№</th>
                                            <th className="px-2 py-1.5 text-left font-semibold w-24">Лаб руу</th>
                                            <th className="px-2 py-1.5 text-left font-semibold">Өвчтөн</th>
                                            <th className="px-2 py-1.5 text-left font-semibold">Ажил / Салбар</th>
                                            <th className="px-2 py-1.5 text-left font-semibold w-32 hidden lg:table-cell">Нугалсан</th>
                                            <th className="px-2 py-1.5 text-left font-semibold w-32 hidden lg:table-cell">Өнгөлсөн</th>
                                            <th className="px-2 py-1.5 text-left font-semibold w-24">Бэлэн</th>
                                            <th className="px-2 py-1.5 text-center font-semibold w-32">Статус</th>
                                            <th className="px-2 py-1.5 text-center font-semibold w-6"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visible.map((o, idx) => {
                                            const s = stage(o);
                                            const isReturn = o.return_status === 'sent' || o.return_status === 'ready';
                                            const patient = combinePatient(o.patient_last_name, o.patient_first_name, o.patient_phone);
                                            const readyDate = isReturn ? o.return_ready_date : o.lab_ready_date;
                                            return (
                                                <tr key={o.id}
                                                    onClick={() => setOpenId(o.id)}
                                                    className={`cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-violet-50/40 dark:hover:bg-violet-950/15 ${
                                                        o.return_status === 'sent' ? 'bg-red-50/30 dark:bg-red-950/10' :
                                                        o.return_status === 'ready' ? 'bg-amber-50/30 dark:bg-amber-950/10' :
                                                        o.is_completed ? 'bg-emerald-50/15 dark:bg-emerald-950/5' :
                                                        idx % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-gray-800/10'
                                                    }`}>
                                                    <td className="px-3 py-2 text-center text-gray-400 text-[11px] tabular-nums">
                                                        {(current - 1) * PAGE_SIZE + idx + 1}
                                                    </td>
                                                    <td className="px-2 py-2 text-[11px] text-gray-700 dark:text-gray-300 tabular-nums whitespace-nowrap">
                                                        {o.sent_to_lab_date ?? '—'}
                                                    </td>
                                                    <td className="px-2 py-2 max-w-[220px]">
                                                        <div className="font-semibold text-foreground truncate text-[12px]">{patient || '—'}</div>
                                                        {o.doctor_name && (
                                                            <div className="text-[10px] text-muted-foreground truncate">Эмч: {o.doctor_name}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2 max-w-[220px]">
                                                        <div className="font-medium text-foreground truncate text-[12px]">{o.work_description}</div>
                                                        {isReturn && o.return_reason
                                                            ? <div className="text-[10px] text-red-600 dark:text-red-400 truncate" title={o.return_reason}>
                                                                Шалтгаан: {o.return_reason}
                                                              </div>
                                                            : <div className="text-[10px] text-muted-foreground truncate">{o.branch_name ?? '—'}</div>}
                                                    </td>
                                                    <td className="px-2 py-2 hidden lg:table-cell">
                                                        <EmployeeChips items={isReturn ? o.return_benders : o.benders} tone="blue" />
                                                    </td>
                                                    <td className="px-2 py-2 hidden lg:table-cell">
                                                        <EmployeeChips items={isReturn ? o.return_polishers : o.polishers} tone="indigo" />
                                                    </td>
                                                    <td className="px-2 py-2 text-[11px] tabular-nums whitespace-nowrap">
                                                        {readyDate
                                                            ? <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                                                <CheckCircle2 className="size-3" /> {readyDate}
                                                              </span>
                                                            : <span className="text-muted-foreground/40">—</span>}
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap ${s.color}`}>
                                                            {s.label}
                                                        </span>
                                                        {o.return_count > 1 && (
                                                            <div className="mt-0.5 text-[9px] font-semibold text-red-600 dark:text-red-400">
                                                                {o.return_count} удаа буцсан
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
                                            <td colSpan={6} className="px-3 py-2 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                                Нийт {filtered.length} бичлэг
                                            </td>
                                            <td colSpan={3} className="px-2 py-2 text-right text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                                {filtered.filter(o => !o.is_completed && !o.lab_ready_date).length} ажил хийгдэж байна
                                            </td>
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
            </div>

            {/* Drawer */}
            {openOrder && (
                <LabWorkDrawer
                    key={openOrder.id}
                    order={openOrder}
                    employees={employees}
                    onClose={() => setOpenId(null)}
                />
            )}
        </LabLayout>
    );
}

/* ══════════════════════════════════════════════════════════
   Drawer — Лаб ажилтан зөвхөн өөрийн талбаруудаа засна
══════════════════════════════════════════════════════════ */
interface DrawerProps {
    order: LabOrder;
    employees: Employee[];
    onClose: () => void;
}

function LabWorkDrawer({ order, employees, onClose }: DrawerProps) {
    const [benderIds,   setBenderIds]   = useState<number[]>(order.benders.map(e => e.id));
    const [polisherIds, setPolisherIds] = useState<number[]>(order.polishers.map(e => e.id));
    const [labReady,    setLabReady]    = useState<string | null>(order.lab_ready_date);
    // Буцаалтын мөчлөг — анхны бүртгэлээс тусдаа хадгалагдана
    const [rBenderIds,   setRBenderIds]   = useState<number[]>(order.return_benders.map(e => e.id));
    const [rPolisherIds, setRPolisherIds] = useState<number[]>(order.return_polishers.map(e => e.id));
    const [rReady,       setRReady]       = useState<string | null>(order.return_ready_date);
    const [saving, setSaving] = useState(false);

    // Ресепшн буцаалтыг хаах хүртэл лаб засаж болно
    const isReturn = order.return_status === 'sent' || order.return_status === 'ready';
    // Идэвхтэй мөчлөг дээд талын улаан хэсэгт харагдаж байгаа тул түүхээс хасна
    const pastReturns = order.return_history.filter(r => !(isReturn && (r.status === 'sent' || r.status === 'ready')));

    const sameIds = (a: number[], b: number[]) =>
        a.length === b.length && [...a].sort((x, y) => x - y).every((v, i) => v === [...b].sort((x, y) => x - y)[i]);

    const dirty = isReturn
        ? (!sameIds(rBenderIds, order.return_benders.map(e => e.id)) ||
           !sameIds(rPolisherIds, order.return_polishers.map(e => e.id)) ||
           rReady !== order.return_ready_date)
        : (!sameIds(benderIds, order.benders.map(e => e.id)) ||
           !sameIds(polisherIds, order.polishers.map(e => e.id)) ||
           labReady !== order.lab_ready_date);

    function save() {
        if (!dirty) return;
        setSaving(true);
        const payload = isReturn
            ? { return_bender_ids: rBenderIds, return_polisher_ids: rPolisherIds, return_ready_date: rReady }
            : { bender_ids: benderIds, polisher_ids: polisherIds, lab_ready_date: labReady };
        router.patch(`${API_BASE}/${order.id}`, payload as never, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setSaving(false),
        });
    }

    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const patient = combinePatient(order.patient_last_name, order.patient_first_name, order.patient_phone);
    const locked = order.is_completed;

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="w-full max-w-xl h-full bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className={`flex items-center justify-between border-b border-border px-5 py-4 ${
                    isReturn
                        ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20'
                        : 'bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`flex size-10 items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br ${
                            isReturn ? 'from-red-500 to-orange-600' : 'from-violet-500 to-fuchsia-600'
                        }`}>
                            {isReturn ? <RotateCcw className="size-5" /> : <FlaskConical className="size-5" />}
                        </div>
                        <div>
                            <h2 className="font-bold text-foreground">
                                {isReturn ? 'Буцаалтын ажил' : order.lab_name}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                #{order.id} · {order.work_description}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors">
                        <X className="size-5" />
                    </button>
                </div>

                {/* Read-only summary */}
                <div className="border-b border-border bg-muted/30 px-5 py-4 space-y-3">
                    <ReadonlyRow icon={<User className="size-3.5" />} label="Өвчтөн" value={patient || '—'} />
                    <ReadonlyRow icon={<Send className="size-3.5" />} label="Хүлээн авсан" value={order.sent_to_lab_date ?? '—'} />
                    <ReadonlyRow label="Захиалсан" value={order.order_date} />
                    {order.doctor_name && <ReadonlyRow label="Эмч" value={order.doctor_name} />}
                    {order.branch_name && <ReadonlyRow label="Салбар" value={order.branch_name} />}
                    <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Хийгдэх ажил</div>
                        <div className="rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground">
                            {order.work_description}
                        </div>
                    </div>
                </div>

                {/* Editable section: Лаб ажилтны мэдээлэл */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {isReturn ? (
                        <>
                            {/* Буцаалтын шалтгаан — ресепшнээс ирсэн */}
                            <div className="rounded-2xl border border-red-200/70 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/15 p-4">
                                <h3 className="text-sm font-bold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                                    <RotateCcw className="size-4" />
                                    Буцаалтын ажил
                                    {order.return_count > 1 && (
                                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
                                            {order.return_count} дэх удаа
                                        </span>
                                    )}
                                </h3>
                                <p className="text-[13px] text-foreground whitespace-pre-wrap">
                                    {order.return_reason || '— шалтгаан бичигдээгүй —'}
                                </p>
                                {order.returned_at && (
                                    <p className="mt-2 text-[10.5px] text-muted-foreground">
                                        Ресепшнээс буцаасан: {order.returned_at}
                                    </p>
                                )}
                                <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/70 dark:bg-black/20 px-3 py-2 text-[11px] text-red-700 dark:text-red-300">
                                    <AlertCircle className="size-3.5 shrink-0" />
                                    <span>Буцаалтын ажилд төлбөр тооцоо хийгдэхгүй.</span>
                                </div>
                            </div>

                            {/* Буцаалтыг янзлах хэсэг */}
                            <div className="rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-violet-50/30 dark:bg-violet-950/10 p-4">
                                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                    <FlaskConical className="size-4 text-violet-600" />
                                    Янзалсан ажилтан
                                </h3>

                                <div className="space-y-3">
                                    <EmployeeMultiSelect
                                        label="Нугалсан ажилтан"
                                        tone="blue"
                                        employees={employees}
                                        selected={rBenderIds}
                                        onToggle={id => setRBenderIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                                    />

                                    <EmployeeMultiSelect
                                        label="Өнгөлсөн ажилтан"
                                        tone="indigo"
                                        employees={employees}
                                        selected={rPolisherIds}
                                        onToggle={id => setRPolisherIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                                    />

                                    <label className="block">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Янзалж дууссан огноо</span>
                                        <input type="date" value={rReady ?? ''}
                                            onChange={e => setRReady(e.target.value || null)}
                                            className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 border-gray-200 dark:border-gray-700" />
                                    </label>
                                </div>

                                <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
                                    rReady
                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-muted/50 text-muted-foreground'
                                }`}>
                                    <CheckCircle2 className="size-4 shrink-0" />
                                    <span>{rReady
                                        ? 'Хадгалснаар буцаалт ресепшн рүү буцна.'
                                        : 'Янзалж дууссан огноо тэмдэглэвэл ресепшн рүү буцна.'}</span>
                                </div>
                            </div>

                            {/* Анхны ажлын мэдээлэл — лавлагаа */}
                            <div className="rounded-2xl border border-border bg-muted/20 p-4">
                                <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2.5">
                                    Анхны ажил (лавлагаа)
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2 text-xs">
                                        <span className="text-muted-foreground shrink-0">Нугалсан</span>
                                        <div className="flex justify-end"><EmployeeChips items={order.benders} tone="blue" /></div>
                                    </div>
                                    <div className="flex items-start justify-between gap-2 text-xs">
                                        <span className="text-muted-foreground shrink-0">Өнгөлсөн</span>
                                        <div className="flex justify-end"><EmployeeChips items={order.polishers} tone="indigo" /></div>
                                    </div>
                                    <ReadonlyRow label="Бэлэн болсон" value={order.lab_ready_date ?? '—'} />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-violet-50/30 dark:bg-violet-950/10 p-4">
                                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                    <FlaskConical className="size-4 text-violet-600" />
                                    Лаб ажилтны бөглөх хэсэг
                                </h3>

                                <div className="space-y-3">
                                    <EmployeeMultiSelect
                                        label="Нугалсан ажилтан"
                                        tone="blue"
                                        employees={employees}
                                        selected={benderIds}
                                        disabled={locked}
                                        onToggle={id => setBenderIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                                    />

                                    <EmployeeMultiSelect
                                        label="Өнгөлсөн ажилтан"
                                        tone="indigo"
                                        employees={employees}
                                        selected={polisherIds}
                                        disabled={locked}
                                        onToggle={id => setPolisherIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                                    />

                                    <label className="block">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Лабораторид бэлэн болсон огноо</span>
                                        <input type="date" value={labReady ?? ''} disabled={locked}
                                            onChange={e => setLabReady(e.target.value || null)}
                                            className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 border-gray-200 dark:border-gray-700" />
                                    </label>
                                </div>

                                {labReady && (
                                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                                        <CheckCircle2 className="size-4" />
                                        <span>Бэлэн болсон огноо тэмдэглэгдсэн. Хадгалснаар ресепшнрүү буцна.</span>
                                    </div>
                                )}
                            </div>

                            {locked && (
                                <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                                    <AlertCircle className="size-4" />
                                    <span>Энэ захиалга дууссан тул засах боломжгүй.</span>
                                </div>
                            )}
                        </>
                    )}

                    {/* Буцаалтын түүх — хаагдсаны дараа ч хэвээр үлдэнэ */}
                    {pastReturns.length > 0 && (
                        <div className="rounded-2xl border border-border bg-muted/10 p-4">
                            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                <RotateCcw className="size-4 text-muted-foreground" />
                                Буцаалтын түүх
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tabular-nums text-foreground">
                                    {pastReturns.length}
                                </span>
                            </h3>
                            <ReturnHistoryList items={pastReturns} />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-border bg-card px-5 py-3 flex items-center justify-end gap-2">
                    <button onClick={onClose}
                        className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                        Хаах
                    </button>
                    {(isReturn || !locked) && (
                        <button onClick={save} disabled={!dirty || saving}
                            className={`inline-flex items-center gap-1.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors ${
                                isReturn ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700'
                            }`}>
                            <CheckCircle2 className="size-4" /> Хадгалах
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Буцаалтын түүх (мөчлөг бүр) ─────────────────────────────────── */
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
                    <div key={r.id} className={`rounded-xl border px-3 py-2.5 ${
                        r.status === 'cancelled'
                            ? 'border-border bg-muted/20 opacity-70'
                            : 'border-border bg-card'
                    }`}>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                                {r.attempt} дэх буцаалт
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${s.cls}`}>{s.text}</span>
                        </div>
                        <p className="mt-1 text-[12.5px] text-foreground whitespace-pre-wrap">{r.reason}</p>

                        {/* Буцаалтыг янзалсан ажилтан — тод, тасрахгүй */}
                        {(r.benders.length > 0 || r.polishers.length > 0) && (
                            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                                <ReturnWorkers label="Нугалсан" names={r.benders} />
                                <ReturnWorkers label="Өнгөлсөн" names={r.polishers} />
                            </div>
                        )}

                        <div className="mt-1.5 space-y-0.5 text-[10.5px] text-muted-foreground">
                            {r.returned_at && <div>Буцаасан: {r.returned_at}</div>}
                            {r.ready_date  && <div>Янзалж дууссан: {r.ready_date}</div>}
                            {r.closed_at   && <div>Ресепшн хүлээж авсан: {r.closed_at}</div>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

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

/* ── Толгойн жижиг үзүүлэлт ──────────────────────────────────── */
function LInlineStat({ label, value, accent }: { label: string; value: string; accent: 'violet' | 'indigo' | 'red' }) {
    const color = {
        violet: 'text-violet-700 dark:text-violet-400',
        indigo: 'text-indigo-700 dark:text-indigo-400',
        red:    'text-red-700 dark:text-red-400',
    }[accent];
    return (
        <div className="px-3 py-2 text-center">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold truncate">{label}</p>
            <p className={`text-sm font-bold tabular-nums truncate ${color}`}>{value}</p>
        </div>
    );
}

/* ── Ангилалын сонгогч (ажил / салбар) ───────────────────────── */
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
    const nums: (number | '…')[] = [];
    for (let i = 1; i <= pageCount; i++) {
        if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) nums.push(i);
        else if (nums[nums.length - 1] !== '…') nums.push('…');
    }

    const btn = 'inline-flex items-center justify-center min-w-7 h-7 rounded-lg px-2 text-[11px] font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed';

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-3 py-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">{from}–{to} / нийт {total}</span>
            <div className="flex items-center gap-1">
                <button onClick={() => onChange(page - 1)} disabled={page <= 1}
                    className={`${btn} border border-gray-200 dark:border-gray-700 text-muted-foreground hover:bg-card`}>‹</button>
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
                    className={`${btn} border border-gray-200 dark:border-gray-700 text-muted-foreground hover:bg-card`}>›</button>
            </div>
        </div>
    );
}

/* ── Employee chips (хүснэгтэд харагдах) ─────────────────────────── */
type EmpTone = 'blue' | 'indigo';
const TONE_CHIP: Record<EmpTone, string> = {
    blue:   'bg-blue-50 dark:bg-blue-950/30 border-blue-200/60 dark:border-blue-800/40 text-blue-700 dark:text-blue-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200/60 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-400',
};

function EmployeeChips({ items, tone }: { items: Employee[]; tone: EmpTone }) {
    if (!items || items.length === 0) return <span className="text-muted-foreground/40">—</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {items.map(e => (
                <span key={e.id}
                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-medium ${TONE_CHIP[tone]}`}>
                    {e.name}
                </span>
            ))}
        </div>
    );
}

/* ── Олон ажилтан сонгогч (drawer) ──────────────────────────────── */
function EmployeeMultiSelect({ label, tone, employees, selected, disabled, onToggle }: {
    label: string;
    tone: EmpTone;
    employees: Employee[];
    selected: number[];
    disabled?: boolean;
    onToggle: (id: number) => void;
}) {
    const selectedTone: Record<EmpTone, string> = {
        blue:   'border-transparent bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/30',
        indigo: 'border-transparent bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30',
    };
    return (
        <div className="block">
            <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
                {selected.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold normal-case tabular-nums text-foreground">
                        <Users className="size-3" /> {selected.length}
                    </span>
                )}
            </span>
            {employees.length === 0 ? (
                <p className="mt-1 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    Лаб ажилтан бүртгэгдээгүй байна.
                </p>
            ) : (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {employees.map(e => {
                        const active = selected.includes(e.id);
                        return (
                            <button
                                key={e.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => onToggle(e.id)}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                                    active
                                        ? selectedTone[tone]
                                        : 'border-gray-200 bg-background text-foreground hover:border-violet-300 hover:bg-violet-50 dark:border-gray-700 dark:hover:border-violet-700 dark:hover:bg-violet-950/30'
                                }`}>
                                <span className={`flex size-4 items-center justify-center rounded-full border transition-colors ${
                                    active ? 'border-white/70 bg-white/20' : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                    {active && <Check className="size-3" strokeWidth={3.5} />}
                                </span>
                                {e.name}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ReadonlyRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                {icon}
                {label}
            </span>
            <span className="font-semibold text-foreground text-right truncate max-w-[60%]">{value}</span>
        </div>
    );
}
