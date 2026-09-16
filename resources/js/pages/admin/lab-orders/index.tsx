import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Building2, CalendarClock, Check, ChevronLeft, ChevronRight,
    CreditCard, FileSpreadsheet, FlaskConical, Package, Receipt, RotateCcw, Search,
    Sparkles, User, Wallet, X,
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
    bender_name: string | null;
    polisher_name: string | null;
    lab_ready_date: string | null;
    arrived_date: string | null;
    pickup_date: string | null;
    is_completed: boolean;
    completed_at: string | null;
    /* Буцаалт */
    return_status: 'sent' | 'ready' | 'done' | null;
    return_count: number;
    return_reason: string | null;
    returned_at: string | null;
    return_ready_date: string | null;
    return_closed_at: string | null;
    return_history: ReturnEntry[];
    payroll_counted: boolean;
    payroll_counted_at: string | null;
    notes: string | null;
    created_by_name: string | null;
}

/** Нэг буцаалтын мөчлөг */
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

interface Stats {
    active: number;
    completed: number;
    total_due: number;
    total_paid: number;
    total_outstanding: number;
    final_paid_count: number;
    payroll_counted: number;
    returned: number;
    return_open: number;
    return_total: number;
}
interface Branch { id: number; name: string }
interface Filters { status: 'active' | 'completed' | 'all' | 'payroll' | 'returned'; search: string; branch: number | null }
interface Props { orders: LabOrder[]; stats: Stats; branches: Branch[]; filters: Filters }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Удирдлага', href: '/admin/dashboard' },
    { title: 'Лаб бүртгэл', href: '/admin/lab-orders' },
];

const PAYMENT_METHODS: Record<string, { label: string; color: string }> = {
    cash:     { label: 'Бэлэн',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    card:     { label: 'Карт',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    mobile:   { label: 'Мобайл',   color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
    storepay: { label: 'StorePay', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
};

function combinePatient(lastName: string | null, firstName: string, phone: string | null): string {
    return [lastName, firstName, phone].filter(Boolean).join(' ').trim();
}

/** Буцаалтын мөчлөгийг янзалсан ажилтнууд — тод, бүтнээр нь */
function ReturnWorkers({ label, names }: { label: string; names: string[] }) {
    return (
        <div className="rounded-md bg-card/70 dark:bg-black/20 px-2 py-1">
            <div className="text-[9.5px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
            <div className="text-[12.5px] font-semibold text-foreground">
                {names.length > 0 ? names.join(', ') : <span className="font-normal text-muted-foreground/60">—</span>}
            </div>
        </div>
    );
}

const RETURN_STATUS_LABEL: Record<ReturnEntry['status'], { text: string; cls: string }> = {
    sent:      { text: 'Лаб дээр',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    ready:     { text: 'Зассан',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    done:      { text: 'Хаагдсан',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    cancelled: { text: 'Цуцлагдсан', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

function stage(o: LabOrder): { label: string; color: string } {
    // Дуусаагүй буцаалт л статусыг дарна. Буцаалт хаагдсан бол ажил
    // "Дууссан" төлөвтөө буцаж очно — түүх нь return_count-д үлдэнэ.
    if (o.return_status === 'sent')  return { label: 'Буцаагдсан',        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
    if (o.return_status === 'ready') return { label: 'Буцаалт янзлагдсан', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
    if (o.is_completed)     return { label: 'Дууссан',            color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    if (o.pickup_date)      return { label: 'Үйлчлүүлэгч авсан',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    if (o.arrived_date)     return { label: 'Ресепшнд ирсэн',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
    if (o.lab_ready_date)   return { label: 'Лабаас ирсэн',       color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' };
    if (o.sent_to_lab_date) return { label: 'Лаб руу явсан',      color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' };
    return { label: 'Захиалсан', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
}

function go(patch: Partial<Filters>, current: Filters) {
    router.get('/admin/lab-orders', {
        status: patch.status ?? current.status,
        q:      patch.search ?? current.search,
        branch: patch.branch !== undefined ? patch.branch : current.branch,
    }, { preserveState: false });
}

/* ══════════════════════════════════════════════════════════
   Main
══════════════════════════════════════════════════════════ */
const PAGE_SIZE = 10;
const ALL_TAB = '__all__';
const NO_BRANCH = '— Салбаргүй —';

export default function AdminLabOrdersIndex({ orders, stats, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [openId, setOpenId] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState<string>(ALL_TAB);

    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['orders', 'stats'] });
        }, 8000);
        return () => clearInterval(id);
    }, []);

    // Хайлт хийсний дараа зөвхөн салбараар нь шүүсэн жагсаалт
    const searchFiltered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return orders;
        return orders.filter(o =>
            (o.patient_first_name ?? '').toLowerCase().includes(q) ||
            (o.patient_last_name ?? '').toLowerCase().includes(q) ||
            (o.patient_phone ?? '').toLowerCase().includes(q) ||
            (o.lab_name ?? '').toLowerCase().includes(q) ||
            (o.work_description ?? '').toLowerCase().includes(q) ||
            (o.doctor_name ?? '').toLowerCase().includes(q) ||
            (o.final_payment_receipt ?? '').toLowerCase().includes(q)
        );
    }, [orders, search]);

    // Салбар бүрийн таб (зөвхөн бичлэгтэй салбарууд) + тоо
    const branchTabs = useMemo(() => {
        const m = new Map<string, number>();
        for (const o of searchFiltered) {
            const key = o.branch_name ?? NO_BRANCH;
            m.set(key, (m.get(key) ?? 0) + 1);
        }
        return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [searchFiltered]);

    // Идэвхтэй таб алга болвол "Бүгд" рүү буцаана
    useEffect(() => {
        if (activeTab !== ALL_TAB && !branchTabs.some(([name]) => name === activeTab)) {
            setActiveTab(ALL_TAB);
        }
    }, [branchTabs, activeTab]);

    // Идэвхтэй табаар шүүсэн жагсаалт
    const tabFiltered = useMemo(() => {
        if (activeTab === ALL_TAB) return searchFiltered;
        return searchFiltered.filter(o => (o.branch_name ?? NO_BRANCH) === activeTab);
    }, [searchFiltered, activeTab]);

    useEffect(() => { setPage(1); }, [search, filters.status, activeTab]);

    const totalPages = Math.max(1, Math.ceil(tabFiltered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageOrders = useMemo(
        () => tabFiltered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
        [tabFiltered, safePage],
    );
    const tabOutstanding = useMemo(() => tabFiltered.reduce((s, o) => s + o.outstanding, 0), [tabFiltered]);
    const activeBranchId = activeTab === ALL_TAB ? '' : (tabFiltered[0]?.branch_id ?? '');
    const exportHref = `/admin/lab-orders/export?status=${filters.status}&branch=${activeBranchId}&q=${encodeURIComponent(search)}`;

    const togglePayroll = (o: LabOrder, e: React.MouseEvent) => {
        e.stopPropagation();
        router.post(`/admin/lab-orders/${o.id}/payroll`, {}, {
            preserveScroll: true,
            preserveState: true,
            only: ['orders', 'stats'],
        });
    };

    const openOrder = openId !== null ? orders.find(o => o.id === openId) ?? null : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Лаб бүртгэл" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                {/* Compact Header + Stats */}
                <div className="rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/80 via-white to-fuchsia-50/60 dark:from-violet-950/30 dark:via-gray-900 dark:to-fuchsia-950/20 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-violet-100/60 dark:border-violet-900/40">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
                            <FlaskConical className="size-4" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-base font-bold text-foreground inline-flex items-center gap-1.5">
                                Лаб бүртгэл
                                <Sparkles className="size-3.5 text-violet-500" />
                            </h1>
                            <p className="text-[11px] text-muted-foreground">Бүх салбарын лаб ажлууд</p>
                        </div>
                        <a href={exportHref}
                            className="hidden md:inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors">
                            <FileSpreadsheet className="size-3.5" />
                            Excel
                        </a>
                    </div>

                    {/* Compact inline stats */}
                    <div className="grid grid-cols-4 md:grid-cols-8 divide-x divide-violet-100/60 dark:divide-violet-900/30">
                        <InlineStat label="Идэвхтэй" value={stats.active.toLocaleString()} accent="violet" />
                        <InlineStat label="Дууссан" value={stats.completed.toLocaleString()} accent="emerald" />
                        <InlineStat label="Буцаагдсан" value={stats.returned.toLocaleString()}
                            title={`${stats.returned} ажил · нийт ${stats.return_total} удаа буцсан${stats.return_open > 0 ? ` · ${stats.return_open} нь одоо явагдаж байна` : ''}`}
                            accent="red" />
                        <InlineStat label="Нийт төлөх" value={`${(stats.total_due / 1000).toFixed(0)}K₮`} title={`${stats.total_due.toLocaleString()}₮`} accent="gray" />
                        <InlineStat label="Төлсөн" value={`${(stats.total_paid / 1000).toFixed(0)}K₮`} title={`${stats.total_paid.toLocaleString()}₮`} accent="emerald" />
                        <InlineStat label="Дутуу" value={`${(stats.total_outstanding / 1000).toFixed(0)}K₮`} title={`${stats.total_outstanding.toLocaleString()}₮`} accent="red" />
                        <InlineStat label="Хаагдсан" value={stats.final_paid_count.toLocaleString()} accent="indigo" />
                        <InlineStat label="Цалин бодсон" value={stats.payroll_counted.toLocaleString()} accent="blue" />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-card p-2 shadow-sm">
                    <div className="relative flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-background px-3 py-1.5 flex-1 min-w-60">
                        <Search className="size-3.5 text-muted-foreground" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Өвчтөн, лаб, эмч, баримт..."
                            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
                    </div>

                    <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        {([
                            { key: 'all',       label: 'Бүгд',     color: 'bg-gray-700' },
                            { key: 'active',    label: 'Идэвхтэй', color: 'bg-violet-600' },
                            { key: 'completed', label: 'Дууссан',  color: 'bg-emerald-600' },
                            { key: 'returned',  label: 'Буцаалт',  color: 'bg-red-600' },
                            { key: 'payroll',   label: 'Цалин бодсон', color: 'bg-blue-600' },
                        ] as const).map(t => (
                            <button key={t.key} onClick={() => go({ status: t.key }, filters)}
                                className={`px-3 py-1.5 text-[11px] font-semibold transition-all ${
                                    filters.status === t.key
                                        ? `${t.color} text-white`
                                        : 'bg-white dark:bg-gray-900 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
                        {tabFiltered.length} бичлэг
                    </span>

                    <a href={exportHref}
                        className="md:hidden inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white">
                        <FileSpreadsheet className="size-3.5" />
                    </a>
                </div>

                {/* Branch tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto premium-scroll rounded-xl border border-gray-200 dark:border-gray-800 bg-card p-1.5 shadow-sm">
                    <TabButton active={activeTab === ALL_TAB} onClick={() => setActiveTab(ALL_TAB)} label="Бүгд" count={searchFiltered.length} />
                    {branchTabs.map(([name, count]) => (
                        <TabButton key={name} active={activeTab === name} onClick={() => setActiveTab(name)} label={name} count={count} />
                    ))}
                </div>

                {/* Table */}
                {tabFiltered.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm p-12 text-center text-muted-foreground">
                        <FlaskConical className="size-10 mx-auto mb-2 text-violet-300" />
                        <p className="text-sm font-semibold">Лаб бүртгэл байхгүй</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-violet-100/40 to-fuchsia-100/30 dark:from-violet-950/30 dark:to-fuchsia-950/20 px-4 py-2.5">
                            <div className="flex items-center gap-2">
                                <Building2 className="size-3.5 text-violet-600" />
                                <h2 className="text-sm font-bold text-foreground">{activeTab === ALL_TAB ? 'Бүх салбар' : activeTab}</h2>
                                <span className="rounded-full bg-violet-100 dark:bg-violet-950/40 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300 tabular-nums">
                                    {tabFiltered.length}
                                </span>
                            </div>
                            {tabOutstanding > 0 && (
                                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 tabular-nums">
                                    Дутуу {tabOutstanding.toLocaleString()}₮
                                </span>
                            )}
                        </div>
                        <div className="overflow-x-auto premium-scroll">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50/70 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wide">
                                        <th className="px-3 py-1.5 text-center font-semibold w-8">№</th>
                                        <th className="px-2 py-1.5 text-left font-semibold w-24">Захиалсан</th>
                                        <th className="px-2 py-1.5 text-left font-semibold">Өвчтөн</th>
                                        <th className="px-2 py-1.5 text-left font-semibold">Лаб / Ажил</th>
                                        <th className="px-2 py-1.5 text-left font-semibold w-28 hidden md:table-cell">Эмч</th>
                                        <th className="px-2 py-1.5 text-right font-semibold w-24">Дүн</th>
                                        <th className="px-2 py-1.5 text-right font-semibold w-20 hidden md:table-cell">Дутуу</th>
                                        <th className="px-2 py-1.5 text-center font-semibold w-28">Статус</th>
                                        <th className="px-2 py-1.5 text-center font-semibold w-16">
                                            <span className="inline-flex items-center justify-center gap-1">
                                                <Wallet className="size-3 text-blue-500" />Цалин
                                            </span>
                                        </th>
                                        <th className="px-2 py-1.5 text-center font-semibold w-6"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageOrders.map((o, idx) => {
                                        const s = stage(o);
                                        const patient = combinePatient(o.patient_last_name, o.patient_first_name, o.patient_phone);
                                        const rowNo = (safePage - 1) * PAGE_SIZE + idx + 1;
                                        return (
                                            <tr key={o.id}
                                                onClick={() => setOpenId(o.id)}
                                                className={`cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-violet-50/40 dark:hover:bg-violet-950/15 ${
                                                    o.return_status === 'sent' ? 'bg-red-50/30 dark:bg-red-950/10' :
                                                    o.return_status === 'ready' ? 'bg-amber-50/30 dark:bg-amber-950/10' :
                                                    o.is_completed ? 'bg-emerald-50/15 dark:bg-emerald-950/5' :
                                                    idx % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-gray-800/10'
                                                }`}>
                                                <td className="px-3 py-2 text-center text-gray-400 text-[11px] tabular-nums">{rowNo}</td>
                                                <td className="px-2 py-2 text-[11px] text-gray-700 dark:text-gray-300 tabular-nums whitespace-nowrap">{o.order_date ?? '—'}</td>
                                                <td className="px-2 py-2 max-w-[200px]">
                                                    <div className="font-semibold text-foreground truncate text-[12px]">{patient || '—'}</div>
                                                </td>
                                                <td className="px-2 py-2 max-w-[260px]">
                                                    <div className="font-medium text-foreground truncate text-[12px]">{o.lab_name}</div>
                                                    {o.return_count > 0 && o.return_reason
                                                        ? <div className={`text-[10px] truncate ${
                                                            o.return_status === 'sent' || o.return_status === 'ready'
                                                                ? 'text-red-600 dark:text-red-400'
                                                                : 'text-muted-foreground'
                                                          }`} title={o.return_reason}>
                                                            {o.work_description} · {o.return_reason}
                                                          </div>
                                                        : <div className="text-[10px] text-muted-foreground truncate">{o.work_description}</div>}
                                                </td>
                                                <td className="px-2 py-2 text-[11px] text-gray-700 dark:text-gray-300 truncate hidden md:table-cell">{o.doctor_name ?? '—'}</td>
                                                <td className="px-2 py-2 text-right tabular-nums text-[11px] whitespace-nowrap">
                                                    <span className="font-bold text-foreground">{(o.effective_due ?? o.amount_due).toLocaleString()}₮</span>
                                                    {o.discount_percent > 0 && (
                                                        <div className="text-[9px] text-orange-600 dark:text-orange-400">−{o.discount_percent}%</div>
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 text-right tabular-nums text-[11px] whitespace-nowrap hidden md:table-cell">
                                                    {o.outstanding > 0 ? (
                                                        <span className="text-red-600 dark:text-red-400 font-bold">{o.outstanding.toLocaleString()}₮</span>
                                                    ) : (
                                                        <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap ${s.color}`}>
                                                        {s.label}
                                                    </span>
                                                    {/* Түүхийн тэмдэглэгээ — статус биш, зөвхөн лавлагаа */}
                                                    {o.return_count > 0 && (
                                                        <div className={`mt-0.5 text-[9px] font-semibold ${
                                                            o.return_status === 'sent' || o.return_status === 'ready'
                                                                ? 'text-red-600 dark:text-red-400'
                                                                : 'text-muted-foreground'
                                                        }`}>
                                                            {o.return_count} удаа буцсан
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    <PayrollCheck
                                                        checked={o.payroll_counted}
                                                        countedAt={o.payroll_counted_at}
                                                        onClick={e => togglePayroll(o, e)}
                                                    />
                                                </td>
                                                <td className="px-2 py-2 text-center text-gray-400">›</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination
                                page={safePage}
                                totalPages={totalPages}
                                total={tabFiltered.length}
                                pageSize={PAGE_SIZE}
                                onPage={setPage}
                            />
                        )}
                    </div>
                )}

                <p className="text-[10px] text-muted-foreground text-center">
                    💡 Мөр дээр дарж дэлгэрэнгүйг үзнэ үү · Салбар бүрийг табаар шүүнэ · «Цалин» нүдэн дээр дарж цалин бодогдсоныг тэмдэглэнэ
                </p>
            </div>

            {/* Detail Drawer */}
            {openOrder && (
                <AdminDetailDrawer key={openOrder.id} order={openOrder} onClose={() => setOpenId(null)} />
            )}
        </AppLayout>
    );
}

/* ── Payroll checkbox ───────────────────────────────────────────── */
function PayrollCheck({ checked, countedAt, onClick }: {
    checked: boolean;
    countedAt: string | null;
    onClick: (e: React.MouseEvent) => void;
}) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={onClick}
            title={checked
                ? `Цалин бодогдсон${countedAt ? ' · ' + countedAt.slice(0, 10) : ''} · дарж болих`
                : 'Цалин бодогдсон гэж тэмдэглэх'}
            className={`group relative inline-flex size-[22px] items-center justify-center rounded-[7px] border outline-none transition-all duration-200 active:scale-90 focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                checked
                    ? 'border-transparent bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/40'
                    : 'border-gray-300 bg-white text-transparent hover:border-blue-400 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-blue-500 dark:hover:bg-blue-950/40'
            }`}>
            {checked ? (
                <Check className="size-3.5 animate-in zoom-in-50 duration-200" strokeWidth={3.5} />
            ) : (
                <Check className="size-3.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-500" strokeWidth={3} />
            )}
        </button>
    );
}

/* ── Branch tab ─────────────────────────────────────────────────── */
function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
    return (
        <button onClick={onClick}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                active
                    ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-violet-50 dark:hover:bg-violet-950/30'
            }`}>
            {label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                active ? 'bg-white/25 text-white' : 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
            }`}>
                {count}
            </span>
        </button>
    );
}

/* ── Pagination ─────────────────────────────────────────────────── */
function Pagination({ page, totalPages, total, pageSize, onPage }: {
    page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void;
}) {
    // Харагдах хуудасны дугаарууд (одоогийн хуудасны эргэн тойрон)
    const pages: number[] = [];
    const from = Math.max(1, page - 2);
    const to = Math.min(totalPages, from + 4);
    for (let i = Math.max(1, to - 4); i <= to; i++) pages.push(i);

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(total, page * pageSize);

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-3 py-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">
                {start}–{end} / {total}
            </span>
            <div className="flex items-center gap-1">
                <button onClick={() => onPage(page - 1)} disabled={page <= 1}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-violet-50 dark:hover:bg-violet-950/30 disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronLeft className="size-3.5" />
                </button>
                {pages[0] > 1 && (
                    <>
                        <PageDot n={1} active={page === 1} onClick={() => onPage(1)} />
                        {pages[0] > 2 && <span className="px-1 text-[11px] text-muted-foreground">…</span>}
                    </>
                )}
                {pages.map(p => (
                    <PageDot key={p} n={p} active={p === page} onClick={() => onPage(p)} />
                ))}
                {pages[pages.length - 1] < totalPages && (
                    <>
                        {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-[11px] text-muted-foreground">…</span>}
                        <PageDot n={totalPages} active={page === totalPages} onClick={() => onPage(totalPages)} />
                    </>
                )}
                <button onClick={() => onPage(page + 1)} disabled={page >= totalPages}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-violet-50 dark:hover:bg-violet-950/30 disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronRight className="size-3.5" />
                </button>
            </div>
        </div>
    );
}

function PageDot({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick}
            className={`min-w-[28px] rounded-lg px-2 py-1 text-[11px] font-semibold tabular-nums transition-colors ${
                active
                    ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm'
                    : 'border border-border bg-card text-muted-foreground hover:bg-violet-50 dark:hover:bg-violet-950/30'
            }`}>
            {n}
        </button>
    );
}

/* ── Compact inline stat ────────────────────────────────────────── */
function InlineStat({ label, value, accent, title }: { label: string; value: string; accent: StatAccent; title?: string }) {
    const color = {
        violet:  'text-violet-700 dark:text-violet-400',
        emerald: 'text-emerald-700 dark:text-emerald-400',
        red:     'text-red-700 dark:text-red-400',
        indigo:  'text-indigo-700 dark:text-indigo-400',
        blue:    'text-blue-700 dark:text-blue-400',
        gray:    'text-foreground',
    }[accent];
    return (
        <div className="px-3 py-2 text-center" title={title}>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold truncate">{label}</p>
            <p className={`text-sm font-bold tabular-nums truncate ${color}`}>{value}</p>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   Detail Drawer (read-only, premium)
══════════════════════════════════════════════════════════ */
function AdminDetailDrawer({ order, onClose }: { order: LabOrder; onClose: () => void }) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const s = stage(order);
    const patient = combinePatient(order.patient_last_name, order.patient_first_name, order.patient_phone);
    const method = order.final_payment_method ? PAYMENT_METHODS[order.final_payment_method] : null;

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="w-full max-w-3xl h-full bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md">
                            <FlaskConical className="size-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-[15px] font-bold text-foreground truncate">{patient || '—'}</h2>
                            <p className="text-[11.5px] text-muted-foreground truncate">
                                {[`#${order.id}`, order.lab_name, order.work_description, order.branch_name].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${s.color}`}>{s.label}</span>
                        <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors">
                            <X className="size-5" />
                        </button>
                    </div>
                </div>

                {/* Body — нэг дэлгэцэнд багтахаар нягтруулсан */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {/* Үндсэн мэдээлэл */}
                    <Section icon={<User className="size-3.5" />} title="Үндсэн мэдээлэл" color="violet">
                        <div className="grid grid-cols-2 gap-2.5">
                            <Field label="Өвчтөн" value={patient} highlight />
                            <Field label="Хийгдсэн ажил" value={order.work_description} highlight />
                            <Field label="Захиалсан" value={order.order_date} />
                            <Field label="Лаб руу явуулсан" value={order.sent_to_lab_date} />
                            <Field label="Салбар" value={order.branch_name} />
                            <Field label="Эмч" value={order.doctor_name} />
                        </div>
                    </Section>

                    {/* Буцаалт — мөчлөг бүр тусдаа хадгалагдана */}
                    {order.return_history.length > 0 && (
                        <Section icon={<RotateCcw className="size-3.5" />} title={`Буцаалт · ${order.return_count} удаа`} color="red"
                            right={<span className="text-[10.5px] text-muted-foreground">төлбөр тооцоо хийгдээгүй</span>}>
                            <div className="space-y-2">
                                {order.return_history.map(r => {
                                    const st = RETURN_STATUS_LABEL[r.status];
                                    return (
                                        <div key={r.id} className={`rounded-lg border px-3 py-2 ${
                                            r.status === 'cancelled'
                                                ? 'border-border bg-muted/20 opacity-70'
                                                : 'border-red-200/60 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/15'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                <span className="shrink-0 text-[11px] font-bold text-muted-foreground tabular-nums">#{r.attempt}</span>
                                                <span className="flex-1 truncate text-[13px] text-foreground" title={r.reason}>{r.reason}</span>
                                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold ${st.cls}`}>{st.text}</span>
                                            </div>

                                            {/* Буцаалтыг янзалсан ажилтан — тод, тасрахгүй */}
                                            {(r.benders.length > 0 || r.polishers.length > 0) && (
                                                <div className="mt-1.5 grid grid-cols-2 gap-2">
                                                    <ReturnWorkers label="Нугалсан" names={r.benders} />
                                                    <ReturnWorkers label="Өнгөлсөн" names={r.polishers} />
                                                </div>
                                            )}

                                            <div className="mt-1.5 text-[11px] text-muted-foreground">
                                                {[
                                                    r.returned_at && `буцаасан ${r.returned_at.slice(0, 10)}`,
                                                    r.ready_date && `янзалсан ${r.ready_date}`,
                                                    r.closed_at && `хүлээж авсан ${r.closed_at.slice(0, 10)}`,
                                                ].filter(Boolean).join(' · ')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Section>
                    )}

                    {/* Тооцоо */}
                    <Section icon={<CreditCard className="size-3.5" />} title="Тооцоо" color="emerald">
                        <div className="flex items-stretch divide-x divide-border rounded-lg border border-border bg-muted/30">
                            <Metric label="Төлөх дүн" value={`${order.amount_due.toLocaleString()}₮`} />
                            {order.discount_percent > 0 && (
                                <Metric label={`Хөнгөлөлт ${order.discount_percent}%`} value={`−${(order.amount_due - order.effective_due).toLocaleString()}₮`} accent="orange" />
                            )}
                            <Metric label="Цэвэр төлөх" value={`${order.effective_due.toLocaleString()}₮`} accent="blue" />
                            <Metric label="Төлсөн" value={`${order.amount_paid.toLocaleString()}₮`} accent="emerald" />
                            <Metric label="Дутуу үлдэгдэл" value={`${order.outstanding.toLocaleString()}₮`} accent={order.outstanding > 0 ? 'red' : 'emerald'} />
                        </div>

                        {/* Баримтаар хаагдсан мэдээлэл */}
                        {order.final_payment_receipt && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 text-[12px] text-emerald-700 dark:text-emerald-300">
                                <span className="inline-flex items-center gap-1.5 font-bold"><Receipt className="size-3.5" /> Баримтаар хаагдсан</span>
                                <span className="font-mono font-semibold">{order.final_payment_receipt}</span>
                                {method && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${method.color}`}>{method.label}</span>}
                                {order.final_payment_at && <span className="text-muted-foreground">{order.final_payment_at}</span>}
                            </div>
                        )}
                    </Section>

                    {/* Лаб · Хүлээн авах · Цалин */}
                    <Section icon={<Package className="size-3.5" />} title="Лаб · Хүлээн авах" color="blue">
                        <div className="grid grid-cols-2 gap-2.5">
                            {/* Буцаалттай бол анхны мөчлөгийнх гэдгийг тодруулна */}
                            <Field label={order.return_count > 0 ? 'Нугалсан (анхны ажил)' : 'Нугалсан'} value={order.bender_name} />
                            <Field label={order.return_count > 0 ? 'Өнгөлсөн (анхны ажил)' : 'Өнгөлсөн'} value={order.polisher_name} />
                            <Field label="Лаб бэлэн болсон" value={order.lab_ready_date} />
                            <Field label="Ресепшнд ирсэн" value={order.arrived_date} />
                            <Field label="Үйлчлүүлэгч авсан" value={order.pickup_date} />
                            <Field label="Бүртгэл дуусгасан" value={order.completed_at} />
                            <Field label="Цалин бодогдсон"
                                value={order.payroll_counted ? (order.payroll_counted_at ?? 'Тийм') : 'Үгүй'} />
                            <Field label="Бүртгэсэн" value={order.created_by_name} />
                        </div>
                    </Section>

                    {/* Тэмдэглэл */}
                    {order.notes && (
                        <Section icon={<CalendarClock className="size-3.5" />} title="Тэмдэглэл" color="gray">
                            <p className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-[13px] text-foreground whitespace-pre-wrap">
                                {order.notes}
                            </p>
                        </Section>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-border bg-card px-5 py-2.5 flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground italic">👁 Удирдлагын зөвхөн харах горим</p>
                    <button onClick={onClose}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted transition-colors">
                        Хаах
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Helpers ───────────────────────────────────────────── */
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
        <section className="space-y-2">
            <div className="flex items-center gap-2">
                <span className={`flex size-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${palette[color]} text-white shadow-sm`}>
                    {icon}
                </span>
                <h3 className="text-[11.5px] font-bold uppercase tracking-wide text-foreground">{title}</h3>
                <span className="h-px flex-1 bg-border" />
                {right}
            </div>
            <div className="space-y-2.5">{children}</div>
        </section>
    );
}

/** Зөвхөн харах нүд */
function Field({ label, value, highlight }: {
    label: string;
    value: string | null | undefined;
    highlight?: boolean;
}) {
    return (
        <div className="min-w-0 rounded-lg border border-border bg-muted/20 px-3 py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold truncate">{label}</p>
            <p className={`truncate text-[13px] ${highlight ? 'font-bold text-foreground' : 'font-medium text-foreground/90'}`}
                title={value ?? undefined}>
                {value || <span className="text-muted-foreground/60">—</span>}
            </p>
        </div>
    );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: 'emerald' | 'red' | 'orange' | 'blue' }) {
    const color =
        accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
        accent === 'red'     ? 'text-red-600 dark:text-red-400' :
        accent === 'orange'  ? 'text-orange-600 dark:text-orange-400' :
        accent === 'blue'    ? 'text-blue-600 dark:text-blue-400' :
        'text-foreground';
    return (
        <div className="flex-1 min-w-0 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{label}</div>
            <div className={`mt-0.5 text-[15px] font-bold tabular-nums truncate ${color}`}>{value}</div>
        </div>
    );
}

type StatAccent = 'violet' | 'emerald' | 'red' | 'indigo' | 'gray' | 'blue';
