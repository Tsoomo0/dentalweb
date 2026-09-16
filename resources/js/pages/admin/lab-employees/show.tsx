import { LabPeriodFilter, LabWorkFilter, periodLabel, type PeriodFilters } from '@/components/lab-period-filter';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Building2, Check, ChevronDown, FileSpreadsheet, FlaskConical, Phone, RotateCcw, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface WorkRow {
    lab_order_id: number;
    work_date: string | null;
    role: 'bender' | 'polisher';
    work_description: string;
    patient: string;
    patient_phone: string | null;
    branch_name: string | null;
    doctor_name: string | null;
    order_date: string | null;
    sent_to_lab_date: string | null;
    lab_ready_date: string | null;
    arrived_date: string | null;
    pickup_date: string | null;
    amount_due: number;
    discount_percent: number;
    effective_due: number;
    amount_paid: number;
    outstanding: number;
    is_completed: boolean;
    return_status: 'sent' | 'ready' | 'done' | null;
    return_count: number;
    /** Энэ мөр нь бусдын буцаалтыг янзалсан ажил */
    is_return: boolean;
    attempt: number | null;
    reason: string | null;
    /** Өөрийн ажил бөгөөд дараа нь буцаагдсан */
    order_returned: boolean;
    /** Энэ захиалгад хийгдсэн бүх буцаалтын мөчлөг */
    return_cycles: ReturnCycle[];
}

interface ReturnCycle {
    attempt: number;
    returned_at: string | null;
    ready_date: string | null;
    closed_at: string | null;
    reason: string | null;
}

interface EmployeeInfo {
    id: number; employee_number: string; name: string; full_name: string;
    branch_name: string | null; photo_url: string | null;
    position_name: string | null; phone: string | null; status: string;
}

interface Summary {
    total: number; own: number; bender: number; polisher: number;
    orders: number; returned: number; return_rate: number; fixed: number;
    work_types: { work: string; count: number }[];
}

interface MonthPoint { month: string; label: string; own: number; fixed: number; returned: number }

interface Props {
    employee: EmployeeInfo;
    works: WorkRow[];
    summary: Summary;
    monthly: MonthPoint[];
    filters: PeriodFilters;
    years: number[];
}

/**
 * Анхдагч 15 — хүснэгтийн дээр график, самбар, шүүлтүүр байгаа тул
 * 15 мөр бол хуудас бүхэлдээ гүйлгэлтгүй багтана. 0 = бүгдийг нэг хуудсанд.
 */
const PAGE_SIZES = [15, 50, 100, 0];

const ROLE_LABEL: Record<WorkRow['role'], { text: string; cls: string }> = {
    bender:   { text: 'Нугалсан', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    polisher: { text: 'Өнгөлсөн', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
};

type Tab = 'all' | 'bender' | 'polisher' | 'returned' | 'fixed';

/** Ажлын явцын алхам — хаана хүрсэн бэ */
function processStep(w: WorkRow): { step: number; label: string; cls: string } {
    if (w.return_status === 'sent')  return { step: 3, label: 'Буцаалт лаб дээр',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
    if (w.return_status === 'ready') return { step: 4, label: 'Буцаалт янзлагдсан', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
    if (w.is_completed)   return { step: 5, label: 'Дууссан',            cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    if (w.pickup_date)    return { step: 5, label: 'Үйлчлүүлэгч авсан',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    if (w.arrived_date)   return { step: 4, label: 'Ресепшнд ирсэн',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
    if (w.lab_ready_date) return { step: 3, label: 'Лаб бэлэн болсон',   cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' };
    if (w.sent_to_lab_date) return { step: 2, label: 'Лаб дээр байна',   cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' };
    return { step: 1, label: 'Захиалсан', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
}

export default function LabEmployeeShow({ employee, works, summary, monthly, filters, years }: Props) {
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<Tab>('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    // Ажлын төрөл — бүх мөр ачаалагдсан тул клиент талд шууд шүүнэ
    const [work, setWork] = useState<string | null>(filters.work ?? null);

    /** Энэ ажилтны хийсэн ажлын төрлүүд — тоотойгоо */
    const workOptions = useMemo(() => {
        const map = new Map<string, number>();
        for (const w of works) map.set(w.work_description, (map.get(w.work_description) ?? 0) + 1);
        return [...map.entries()]
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    }, [works]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Удирдлага', href: '/admin/dashboard' },
        { title: 'Лаб ажилтан', href: '/admin/lab-employees' },
        { title: employee.name, href: `/admin/lab-employees/${employee.id}` },
    ];

    useEffect(() => { setPage(1); }, [search, tab, work, pageSize]);

    const scoped = useMemo(() => {
        const q = search.trim().toLowerCase();
        return works.filter(w => {
            if (work && w.work_description !== work) return false;
            if (!q) return true;
            return (
                w.patient.toLowerCase().includes(q) ||
                w.work_description.toLowerCase().includes(q) ||
                (w.doctor_name ?? '').toLowerCase().includes(q) ||
                (w.branch_name ?? '').toLowerCase().includes(q) ||
                String(w.lab_order_id).includes(q)
            );
        });
    }, [works, search, work]);

    const tabCounts = useMemo(() => ({
        all:      scoped.length,
        bender:   scoped.filter(w => !w.is_return && w.role === 'bender').length,
        polisher: scoped.filter(w => !w.is_return && w.role === 'polisher').length,
        returned: scoped.filter(w => w.order_returned).length,
        fixed:    scoped.filter(w => w.is_return).length,
    }), [scoped]);

    const filtered = useMemo(() => {
        switch (tab) {
            case 'bender':   return scoped.filter(w => !w.is_return && w.role === 'bender');
            case 'polisher': return scoped.filter(w => !w.is_return && w.role === 'polisher');
            case 'returned': return scoped.filter(w => w.order_returned);
            case 'fixed':    return scoped.filter(w => w.is_return);
            default:         return scoped;
        }
    }, [scoped, tab]);

    const perPage   = pageSize || filtered.length || 1;
    const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
    const current   = Math.min(page, pageCount);
    const visible   = filtered.slice((current - 1) * perPage, current * perPage);

    const TABS: { key: Tab; label: string; color: string }[] = [
        { key: 'all',      label: 'Бүгд',       color: 'bg-gray-700' },
        { key: 'bender',   label: 'Нугалсан',   color: 'bg-blue-600' },
        { key: 'polisher', label: 'Өнгөлсөн',   color: 'bg-indigo-600' },
        { key: 'returned', label: 'Буцаагдсан', color: 'bg-red-600' },
        { key: 'fixed',    label: 'Янзалсан',   color: 'bg-amber-600' },
    ];

    const roleData = [
        { name: 'Нугалсан', value: summary.bender, color: '#3b82f6' },
        { name: 'Өнгөлсөн', value: summary.polisher, color: '#6366f1' },
        { name: 'Янзалсан', value: summary.fixed, color: '#f59e0b' },
    ].filter(d => d.value > 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={employee.name} />

            <div className="flex flex-col gap-3 p-4 md:p-6">
                {/* ── Header ─────────────────────────────── */}
                <div className="rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/80 via-card to-fuchsia-50/60 dark:from-violet-950/30 dark:via-card dark:to-fuchsia-950/20 shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 px-4 md:px-5 py-3">
                        <Link href="/admin/lab-employees"
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-background text-muted-foreground hover:bg-muted transition-colors">
                            <ArrowLeft className="size-4" />
                        </Link>
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm overflow-hidden">
                            {employee.photo_url
                                ? <img src={employee.photo_url} alt="" className="size-full object-cover" />
                                : <FlaskConical className="size-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-base font-bold text-foreground truncate">{employee.name}</h1>
                            <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span>{employee.employee_number}</span>
                                {employee.position_name && <span>{employee.position_name}</span>}
                                {employee.branch_name && <span className="inline-flex items-center gap-1"><Building2 className="size-3" />{employee.branch_name}</span>}
                                {employee.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3" />{employee.phone}</span>}
                            </p>
                        </div>
                        <span className="rounded-lg border border-violet-200 dark:border-violet-800/50 bg-card px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-400">
                            {periodLabel(filters)}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-6 divide-x divide-violet-100/60 dark:divide-violet-900/30">
                        <Stat label="Нийт ажил"   value={summary.own.toLocaleString()} accent="violet" />
                        <Stat label="Захиалга"    value={summary.orders.toLocaleString()} accent="violet" />
                        <Stat label="Нугалсан"    value={summary.bender.toLocaleString()} accent="blue" />
                        <Stat label="Өнгөлсөн"    value={summary.polisher.toLocaleString()} accent="indigo" />
                        <Stat label="Буцаагдсан"  value={`${summary.returned} · ${summary.return_rate}%`} accent="red"
                            hint="Өөрийн хийсэн ажлаас буцаагдсан нь" />
                        <Stat label="Янзалсан"    value={summary.fixed.toLocaleString()} accent="amber"
                            hint="Бусдын буцаалтыг засварласан нэмэлт ажил" />
                    </div>
                </div>

                {/* ── График ─────────────────────────────── */}
                <div className="grid gap-3 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden">
                        <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-2">
                            <h2 className="text-[12px] font-bold text-foreground">Сараар</h2>
                        </div>
                        <div className="p-3 h-56">
                            {monthly.length === 0 ? (
                                <p className="flex h-full items-center justify-center text-[11px] text-muted-foreground">Өгөгдөл алга</p>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={monthly} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                                        <defs>
                                            {[
                                                { id: 'gOwn', color: '#8b5cf6' },
                                                { id: 'gRet', color: '#ef4444' },
                                                { id: 'gFix', color: '#f59e0b' },
                                            ].map(g => (
                                                <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%"   stopColor={g.color} stopOpacity={0.22} />
                                                    <stop offset="100%" stopColor={g.color} stopOpacity={0} />
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        <CartesianGrid strokeDasharray="2 4" className="stroke-border" vertical={false} opacity={0.6} />
                                        <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground"
                                            axisLine={false} tickLine={false} dy={4} />
                                        <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground"
                                            axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                                        <Tooltip
                                            contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', boxShadow: '0 4px 16px rgb(0 0 0 / 0.12)' }}
                                            labelStyle={{ fontWeight: 700, marginBottom: 2 }}
                                            cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} />
                                        <Legend wrapperStyle={{ fontSize: 10 }} iconType="plainline" iconSize={14} />
                                        <Area type="monotone" dataKey="own" name="Хийсэн ажил" stroke="#8b5cf6" strokeWidth={2}
                                            fill="url(#gOwn)" dot={{ r: 2.5, strokeWidth: 0, fill: '#8b5cf6' }} activeDot={{ r: 4 }} />
                                        <Area type="monotone" dataKey="fixed" name="Янзалсан" stroke="#f59e0b" strokeWidth={2}
                                            fill="url(#gFix)" dot={{ r: 2.5, strokeWidth: 0, fill: '#f59e0b' }} activeDot={{ r: 4 }} />
                                        <Area type="monotone" dataKey="returned" name="Буцаагдсан" stroke="#ef4444" strokeWidth={2}
                                            strokeDasharray="4 3" fill="url(#gRet)" dot={{ r: 2.5, strokeWidth: 0, fill: '#ef4444' }} activeDot={{ r: 4 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden">
                        <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-2">
                            <h2 className="text-[12px] font-bold text-foreground">Үүргээр</h2>
                        </div>
                        <div className="p-3 h-56">
                            {roleData.length === 0 ? (
                                <p className="flex h-full items-center justify-center text-[11px] text-muted-foreground">Өгөгдөл алга</p>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={roleData} dataKey="value" nameKey="name"
                                            innerRadius={46} outerRadius={62} paddingAngle={3} cornerRadius={4}
                                            stroke="none">
                                            {roleData.map(d => <Cell key={d.name} fill={d.color} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', boxShadow: '0 4px 16px rgb(0 0 0 / 0.12)' }} />
                                        <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" iconSize={8} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Ажлын төрлөөр ──────────────────────── */}
                {summary.work_types.length > 0 && (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-2">
                            <h2 className="text-[12px] font-bold text-foreground">Ажлын төрлөөр</h2>
                            <span className="text-[10px] text-muted-foreground">дарж шүүнэ</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 p-3">
                            {summary.work_types.map(w => {
                                const active = work === w.work;
                                return (
                                    <button key={w.work} onClick={() => setWork(active ? null : w.work)}
                                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] transition-colors ${
                                            active
                                                ? 'border-violet-400 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/30'
                                                : 'border-gray-200 dark:border-gray-700 bg-muted/30 hover:bg-muted'
                                        }`}>
                                        <span className={`font-medium ${active ? 'text-violet-700 dark:text-violet-300' : 'text-foreground'}`}>
                                            {w.work}
                                        </span>
                                        <span className="rounded-full bg-violet-100 dark:bg-violet-950/40 px-1.5 text-[10px] font-bold tabular-nums text-violet-700 dark:text-violet-400">
                                            {w.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Filters ────────────────────────────── */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-card p-2 shadow-sm space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-background px-3 py-1.5 flex-1 min-w-52">
                            <Search className="size-3.5 text-muted-foreground" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Өвчтөн, ажил, эмч, захиалгын дугаараар хайх..."
                                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
                        </div>
                        <LabWorkFilter value={work} options={workOptions} onChange={setWork} />
                        <LabPeriodFilter url={`/admin/lab-employees/${employee.id}`} filters={filters} years={years} />
                        {/* Шүүлтүүрийн хажууд — татахдаа тэдгээрийг дагана */}
                        <ExportMenu employeeId={employee.id} filters={filters} work={work} rowCount={filtered.length} />
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
                                    <span className={`rounded-full px-1.5 text-[9px] tabular-nums ${
                                        tab === t.key ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
                                    }`}>{tabCounts[t.key]}</span>
                                </button>
                            ))}
                        </div>
                        {/* Хуудасны хэмжээ — нэг хуудсанд багтаж байвал сонгох шаардлагагүй */}
                        <div className="ml-auto flex items-center gap-1.5">
                            {filtered.length > PAGE_SIZES[0] && (
                                <>
                                    <span className="text-[10px] text-muted-foreground">Хуудсанд:</span>
                                    <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        {PAGE_SIZES.map(s => (
                                            <button key={s} onClick={() => setPageSize(s)}
                                                className={`px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                                                    pageSize === s
                                                        ? 'bg-violet-600 text-white'
                                                        : 'bg-white dark:bg-gray-900 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                                                }`}>
                                                {s === 0 ? 'Бүгд' : s}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                                {filtered.length} мөр{pageCount > 1 && <> · {current}/{pageCount}</>}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Бүрэн хүснэгт (Excel маягаар) ──────── */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-16 text-center text-muted-foreground">
                            <FlaskConical className="size-10 mx-auto mb-2 text-violet-300" />
                            <p className="text-sm font-semibold text-foreground">Ажил олдсонгүй</p>
                            <p className="text-[11px] mt-1">Энэ хугацаанд бүртгэгдсэн ажил байхгүй байна</p>
                        </div>
                    ) : (
                        <>
                            {/* Богино жагсаалтад дотоод гүйлгэлт үүсгэхгүй — зөвхөн хэвтээ.
                                Урт жагсаалт (50+) дээр л өндрийг хязгаарлаж толгойг наана. */}
                            <div className={visible.length > 25
                                ? 'overflow-auto premium-scroll max-h-[70vh]'
                                : 'overflow-x-auto premium-scroll'}>
                                <table className="w-full text-xs whitespace-nowrap">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wide shadow-[0_1px_0_0_hsl(var(--border))]">
                                            <th className="px-3 py-1.5 text-center font-semibold">№</th>
                                            <th className="px-2 py-1.5 text-left font-semibold">Огноо</th>
                                            <th className="px-2 py-1.5 text-center font-semibold">Захиалга</th>
                                            <th className="px-2 py-1.5 text-left font-semibold">Өвчтөн</th>
                                            <th className="px-2 py-1.5 text-left font-semibold">Утас</th>
                                            <th className="px-2 py-1.5 text-left font-semibold">Ажил</th>
                                            <th className="px-2 py-1.5 text-left font-semibold">Салбар</th>
                                            <th className="px-2 py-1.5 text-left font-semibold">Эмч</th>
                                            <th className="px-2 py-1.5 text-center font-semibold">Үүрэг</th>
                                            <th className="px-2 py-1.5 text-center font-semibold">Төрөл</th>
                                            {/* Ажлын явц — 1 → 5 дараалал */}
                                            <th className="px-2 py-1.5 text-left font-semibold bg-violet-100 dark:bg-violet-950"
                                                title="Ресепшн захиалгыг үүсгэсэн огноо">1. Захиалсан</th>
                                            <th className="px-2 py-1.5 text-left font-semibold bg-violet-100 dark:bg-violet-950"
                                                title="Ажил лаб руу явсан огноо">2. Лаб руу явсан</th>
                                            <th className="px-2 py-1.5 text-left font-semibold bg-violet-100 dark:bg-violet-950"
                                                title="Лаб ажлаа дуусгасан огноо">3. Лаб бэлэн болсон</th>
                                            <th className="px-2 py-1.5 text-left font-semibold bg-violet-100 dark:bg-violet-950"
                                                title="Бэлэн ажил лабаас ресепшнд буцаж ирсэн огноо">4. Ресепшнд ирсэн</th>
                                            <th className="px-2 py-1.5 text-left font-semibold bg-violet-100 dark:bg-violet-950"
                                                title="Үйлчлүүлэгч ажлаа гартаа авсан огноо">5. Үйлчлүүлэгч авсан</th>
                                            <th className="px-2 py-1.5 text-left font-semibold bg-red-100 dark:bg-red-950"
                                                title="Дуссаны дараа хэдэн удаа буцаагдаж, хэзээ янзлагдсан">Буцаалтын мөчлөг</th>
                                            <th className="px-2 py-1.5 text-center font-semibold"
                                                title="Ажил одоо хаана байгаа">Одоогийн явц</th>
                                            {/* Тооцоо */}
                                            <th className="px-2 py-1.5 text-right font-semibold">Төлөх</th>
                                            <th className="px-2 py-1.5 text-right font-semibold">Хөнг.</th>
                                            <th className="px-2 py-1.5 text-right font-semibold">Төлсөн</th>
                                            <th className="px-2 py-1.5 text-right font-semibold">Дутуу</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visible.map((w, idx) => {
                                            const role = ROLE_LABEL[w.role];
                                            const proc = processStep(w);
                                            return (
                                                <tr key={`${w.lab_order_id}-${w.role}-${w.is_return}-${w.attempt ?? 0}`}
                                                    className={`border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-violet-50/40 dark:hover:bg-violet-950/15 ${
                                                        w.is_return ? 'bg-amber-50/25 dark:bg-amber-950/10' :
                                                        w.order_returned ? 'bg-red-50/25 dark:bg-red-950/10' :
                                                        idx % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-gray-800/10'
                                                    }`}>
                                                    <td className="px-3 py-2 text-center text-gray-400 text-[11px] tabular-nums">
                                                        {(current - 1) * perPage + idx + 1}
                                                    </td>
                                                    <td className="px-2 py-2 text-[11px] tabular-nums font-semibold text-foreground">{w.work_date ?? '—'}</td>
                                                    <td className="px-2 py-2 text-center text-[11px] tabular-nums text-muted-foreground">#{w.lab_order_id}</td>
                                                    <td className="px-2 py-2 text-[12px] font-semibold text-foreground">{w.patient || '—'}</td>
                                                    <td className="px-2 py-2 text-[11px] tabular-nums text-muted-foreground">{w.patient_phone ?? '—'}</td>
                                                    <td className="px-2 py-2 text-[12px] font-medium text-foreground">{w.work_description}</td>
                                                    <td className="px-2 py-2 text-[11px] text-gray-700 dark:text-gray-300">{w.branch_name ?? '—'}</td>
                                                    <td className="px-2 py-2 text-[11px] text-gray-700 dark:text-gray-300">{w.doctor_name ?? '—'}</td>
                                                    <td className="px-2 py-2 text-center">
                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${role.cls}`}>
                                                            {role.text}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        {w.is_return ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300"
                                                                title={w.reason ?? undefined}>
                                                                <RotateCcw className="size-2.5" />
                                                                Янзалсан{w.attempt && w.attempt > 1 ? ` #${w.attempt}` : ''}
                                                            </span>
                                                        ) : w.order_returned ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-[9px] font-bold text-red-700 dark:text-red-300"
                                                                title={w.reason ?? undefined}>
                                                                Буцаагдсан{w.return_count > 1 ? ` ${w.return_count}x` : ''}
                                                            </span>
                                                        ) : (
                                                            /* Энгийн ажил — тэмдэглэгээгүй. Зөвхөн ялгарах тохиолдол харагдана */
                                                            <span className="text-muted-foreground/30">—</span>
                                                        )}
                                                    </td>
                                                    <ProcCell value={w.order_date} />
                                                    <ProcCell value={w.sent_to_lab_date} />
                                                    <ProcCell value={w.lab_ready_date} />
                                                    <ProcCell value={w.arrived_date} />
                                                    <ProcCell value={w.pickup_date} />
                                                    <ReturnCycleCell cycles={w.return_cycles} highlight={w.attempt} />
                                                    <td className="px-2 py-2 text-center">
                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${proc.cls}`}>
                                                            {proc.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-[11px] tabular-nums text-foreground">{w.amount_due.toLocaleString()}</td>
                                                    <td className="px-2 py-2 text-right text-[11px] tabular-nums text-orange-600 dark:text-orange-400">
                                                        {w.discount_percent > 0 ? `${w.discount_percent}%` : '—'}
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-[11px] tabular-nums text-emerald-600 dark:text-emerald-400">{w.amount_paid.toLocaleString()}</td>
                                                    <td className="px-2 py-2 text-right text-[11px] tabular-nums">
                                                        {w.outstanding > 0
                                                            ? <span className="font-bold text-red-600 dark:text-red-400">{w.outstanding.toLocaleString()}</span>
                                                            : <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-50 dark:bg-gray-800/60 border-t-2 border-violet-300 dark:border-violet-700 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                            <td colSpan={9} className="px-3 py-2">Нийт {filtered.length} мөр</td>
                                            <td colSpan={8} className="px-2 py-2 text-center">
                                                {filtered.filter(w => w.order_returned).length} буцаагдсан ·{' '}
                                                {filtered.filter(w => w.is_return).length} янзалсан
                                            </td>
                                            <td className="px-2 py-2 text-right tabular-nums">
                                                {filtered.reduce((s, w) => s + w.amount_due, 0).toLocaleString()}
                                            </td>
                                            <td></td>
                                            <td className="px-2 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                                                {filtered.reduce((s, w) => s + w.amount_paid, 0).toLocaleString()}
                                            </td>
                                            <td className="px-2 py-2 text-right tabular-nums text-red-600 dark:text-red-400">
                                                {filtered.reduce((s, w) => s + w.outstanding, 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            {pageCount > 1 && <Pager page={current} pageCount={pageCount} total={filtered.length}
                                from={(current - 1) * perPage + 1} to={Math.min(current * perPage, filtered.length)}
                                onChange={setPage} />}
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

/* ── Excel татах — багана сонгох цэс ─────────────────────── */
const EXPORT_GROUPS: { key: string; label: string; hint: string }[] = [
    { key: 'main',    label: 'Үндсэн мэдээлэл', hint: 'Огноо · Захиалга № · Өвчтөн · Утас · Ажил · Салбар · Эмч' },
    { key: 'role',    label: 'Үүрэг ба төрөл',  hint: 'Нугалсан/Өнгөлсөн · Анхны ажил / Буцаагдсан / Янзалсан' },
    { key: 'process', label: 'Ажлын явц',       hint: '5 алхмын огноо · Одоогийн явц' },
    { key: 'returns', label: 'Буцаалт',         hint: 'Хэдэн удаа · Мөчлөгийн огноо · Шалтгаан' },
    { key: 'money',   label: 'Тооцоо',          hint: 'Төлөх · Хөнгөлөлт · Цэвэр · Төлсөн · Дутуу' },
];

function ExportMenu({ employeeId, filters, work, rowCount }: {
    employeeId: number;
    filters: PeriodFilters;
    work: string | null;
    rowCount: number;
}) {
    const [open, setOpen] = useState(false);
    const [groups, setGroups] = useState<string[]>(EXPORT_GROUPS.map(g => g.key));
    const ref = useRef<HTMLDivElement>(null);

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

    function toggle(key: string) {
        setGroups(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    }

    const href = useMemo(() => {
        const q = new URLSearchParams();
        if (filters.year)    q.set('year', String(filters.year));
        if (filters.quarter) q.set('quarter', String(filters.quarter));
        if (filters.month)   q.set('month', String(filters.month));
        if (work)            q.set('work', work);
        // Баганын дараалал EXPORT_GROUPS-ынхтай ижил байхаар эрэмбэлнэ
        q.set('groups', EXPORT_GROUPS.filter(g => groups.includes(g.key)).map(g => g.key).join(','));
        return `/admin/lab-employees/${employeeId}/export?${q.toString()}`;
    }, [employeeId, filters, work, groups]);

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen(o => !o)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors">
                <FileSpreadsheet className="size-3.5" /> Excel
                <ChevronDown className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full z-40 mt-1 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                    <div className="border-b border-border px-3 py-2">
                        <p className="text-[11.5px] font-bold text-foreground">Аль хэсгийг татах вэ</p>
                        <p className="text-[10px] text-muted-foreground">
                            {periodLabel(filters)}{work ? ` · ${work}` : ''} · {rowCount} мөр
                        </p>
                    </div>

                    <div className="max-h-72 overflow-y-auto py-1">
                        {EXPORT_GROUPS.map(g => {
                            const on = groups.includes(g.key);
                            return (
                                <button key={g.key} type="button" onClick={() => toggle(g.key)}
                                    className="flex w-full items-start gap-2 px-3 py-1.5 text-left transition-colors hover:bg-muted">
                                    <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                        on
                                            ? 'border-violet-500 bg-violet-500 text-white'
                                            : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                        {on && <Check className="size-3" strokeWidth={3.5} />}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-[12px] font-semibold text-foreground">{g.label}</span>
                                        <span className="block text-[10px] text-muted-foreground">{g.hint}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2 border-t border-border px-3 py-2">
                        <button type="button"
                            onClick={() => setGroups(groups.length === EXPORT_GROUPS.length ? [] : EXPORT_GROUPS.map(g => g.key))}
                            className="text-[10.5px] font-semibold text-violet-600 dark:text-violet-400 hover:underline">
                            {groups.length === EXPORT_GROUPS.length ? 'Бүгдийг арилгах' : 'Бүгдийг сонгох'}
                        </button>
                        <a href={groups.length ? href : undefined}
                            onClick={e => { if (!groups.length) e.preventDefault(); else setOpen(false); }}
                            className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition-colors ${
                                groups.length
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'bg-gray-400 cursor-not-allowed'
                            }`}>
                            <FileSpreadsheet className="size-3.5" /> Татах
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Components ─────────────────────────────────────────── */
function ProcCell({ value }: { value: string | null }) {
    return (
        <td className="px-2 py-2 text-[11px] tabular-nums bg-violet-50/25 dark:bg-violet-950/10">
            {value ?? <span className="text-muted-foreground/40">—</span>}
        </td>
    );
}

/**
 * Буцаалтын мөчлөгүүд — 5 алхмын дараа орох давталт.
 * Мөчлөг бүр: буцаасан огноо → янзалж дуусгасан огноо.
 * `highlight` нь тухайн мөр аль мөчлөгийн ажил болохыг заана.
 */
function ReturnCycleCell({ cycles, highlight }: { cycles: ReturnCycle[]; highlight: number | null }) {
    if (!cycles || cycles.length === 0) {
        return (
            <td className="px-2 py-2 text-[11px] bg-red-50/20 dark:bg-red-950/10">
                <span className="text-muted-foreground/40">—</span>
            </td>
        );
    }

    return (
        <td className="px-2 py-2 bg-red-50/20 dark:bg-red-950/10">
            <div className="space-y-0.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 text-[9px] font-bold text-red-700 dark:text-red-300">
                    <RotateCcw className="size-2.5" />{cycles.length} удаа
                </span>
                {cycles.map(c => (
                    <div key={c.attempt}
                        className={`text-[10px] tabular-nums ${
                            highlight === c.attempt
                                ? 'font-bold text-amber-700 dark:text-amber-400'
                                : 'text-muted-foreground'
                        }`}
                        title={c.reason ?? undefined}>
                        #{c.attempt} {c.returned_at ?? '—'} → {c.ready_date ?? 'янзлагдаагүй'}
                    </div>
                ))}
            </div>
        </td>
    );
}

function Stat({ label, value, accent, hint }: {
    label: string; value: string; accent: 'violet' | 'blue' | 'indigo' | 'red' | 'amber'; hint?: string;
}) {
    const color = {
        violet: 'text-violet-700 dark:text-violet-400',
        blue:   'text-blue-700 dark:text-blue-400',
        indigo: 'text-indigo-700 dark:text-indigo-400',
        red:    'text-red-700 dark:text-red-400',
        amber:  'text-amber-700 dark:text-amber-400',
    }[accent];
    return (
        <div className="px-3 py-2 text-center" title={hint}>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold truncate">{label}</p>
            <p className={`text-sm font-bold tabular-nums truncate ${color}`}>{value}</p>
        </div>
    );
}

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
