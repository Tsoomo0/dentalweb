import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle, Building2, CalendarClock, CheckCircle2, CreditCard,
    FileSpreadsheet, FlaskConical, Package, Receipt, Search, Send, Sparkles,
    Stethoscope, User, X,
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
    notes: string | null;
    created_by_name: string | null;
}

interface Stats {
    active: number;
    completed: number;
    total_due: number;
    total_paid: number;
    total_outstanding: number;
    final_paid_count: number;
}
interface Branch { id: number; name: string }
interface Filters { status: 'active' | 'completed' | 'all'; search: string; branch: number | null }
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

function stage(o: LabOrder): { label: string; color: string } {
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
export default function AdminLabOrdersIndex({ orders, stats, branches, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [openId, setOpenId] = useState<number | null>(null);

    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['orders', 'stats'] });
        }, 8000);
        return () => clearInterval(id);
    }, []);

    const filtered = useMemo(() => {
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

    const groupedByBranch = useMemo(() => {
        const m = new Map<string, LabOrder[]>();
        for (const o of filtered) {
            const key = o.branch_name ?? '— Салбаргүй —';
            if (!m.has(key)) m.set(key, []);
            m.get(key)!.push(o);
        }
        return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [filtered]);

    const openOrder = openId !== null ? orders.find(o => o.id === openId) ?? null : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Лаб бүртгэл" />

            <div className="flex flex-col gap-5 p-4 md:p-6">
                {/* Premium Header */}
                <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/40 dark:via-gray-900 dark:to-fuchsia-950/30 p-6 shadow-sm">
                    <div className="absolute -right-12 -top-12 size-48 rounded-full bg-violet-200/40 dark:bg-violet-700/20 blur-3xl" />
                    <div className="absolute -bottom-12 -left-12 size-40 rounded-full bg-fuchsia-200/40 dark:bg-fuchsia-700/20 blur-3xl" />

                    <div className="relative flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30">
                                <FlaskConical className="size-7" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                    Лаб бүртгэл
                                    <Sparkles className="size-5 text-violet-500" />
                                </h1>
                                <p className="text-sm text-muted-foreground mt-0.5">Бүх салбарын лаб ажлуудын ерөнхий хяналт</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats grid */}
                    <div className="relative mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                        <StatCard icon={<FlaskConical className="size-4" />} label="Идэвхтэй" value={stats.active.toLocaleString()} accent="violet" />
                        <StatCard icon={<CheckCircle2 className="size-4" />} label="Дууссан" value={stats.completed.toLocaleString()} accent="emerald" />
                        <StatCard icon={<CreditCard className="size-4" />} label="Нийт төлөх" value={`${stats.total_due.toLocaleString()}₮`} accent="gray" />
                        <StatCard icon={<CreditCard className="size-4" />} label="Нийт төлсөн" value={`${stats.total_paid.toLocaleString()}₮`} accent="emerald" />
                        <StatCard icon={<AlertCircle className="size-4" />} label="Дутуу" value={`${stats.total_outstanding.toLocaleString()}₮`} accent="red" />
                        <StatCard icon={<Receipt className="size-4" />} label="Баримтаар хаагдсан" value={stats.final_paid_count.toLocaleString()} accent="indigo" />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card p-3 shadow-sm">
                    <div className="relative flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-1.5 flex-1 min-w-60">
                        <Search className="size-4 text-muted-foreground" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Өвчтөн, лаб, эмч, ажил, баримтын дугаараар хайх..."
                            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
                    </div>

                    <select value={filters.branch ?? ''} onChange={e => go({ branch: e.target.value ? Number(e.target.value) : null }, filters)}
                        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-card px-3 py-1.5 text-sm">
                        <option value="">Бүх салбар</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        {([
                            { key: 'all',       label: 'Бүгд',     color: 'bg-gray-700' },
                            { key: 'active',    label: 'Идэвхтэй', color: 'bg-violet-600' },
                            { key: 'completed', label: 'Дууссан',  color: 'bg-emerald-600' },
                        ] as const).map(t => (
                            <button key={t.key} onClick={() => go({ status: t.key }, filters)}
                                className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                                    filters.status === t.key
                                        ? `${t.color} text-white`
                                        : 'bg-white dark:bg-gray-900 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <a href={`/admin/lab-orders/export?status=${filters.status}&branch=${filters.branch ?? ''}&q=${encodeURIComponent(filters.search)}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors">
                        <FileSpreadsheet className="size-3.5" />
                        Excel татах
                    </a>
                </div>

                {/* Grouped tables */}
                {groupedByBranch.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm p-12 text-center text-muted-foreground">
                        <FlaskConical className="size-12 mx-auto mb-3 text-violet-300" />
                        <p className="text-sm font-semibold">Лаб бүртгэл байхгүй</p>
                    </div>
                ) : (
                    groupedByBranch.map(([branchName, list]) => (
                        <div key={branchName} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-violet-100/60 to-fuchsia-100/40 dark:from-violet-950/40 dark:to-fuchsia-950/30 px-5 py-3">
                                <h2 className="text-sm font-bold text-foreground inline-flex items-center gap-2">
                                    <Building2 className="size-4 text-violet-600" />
                                    {branchName}
                                </h2>
                                <span className="text-[11px] text-muted-foreground tabular-nums">{list.length} захиалга</span>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50/60 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wide">
                                        <th className="px-3 py-2 text-center font-semibold w-10">№</th>
                                        <th className="px-3 py-2 text-left font-semibold w-28">Захиалсан</th>
                                        <th className="px-3 py-2 text-left font-semibold">Өвчтөн</th>
                                        <th className="px-3 py-2 text-left font-semibold">Лаб / Ажил</th>
                                        <th className="px-3 py-2 text-left font-semibold w-32">Эмч</th>
                                        <th className="px-3 py-2 text-right font-semibold w-28">Дүн</th>
                                        <th className="px-3 py-2 text-center font-semibold w-32">Статус</th>
                                        <th className="px-3 py-2 text-center font-semibold w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.map((o, idx) => {
                                        const s = stage(o);
                                        const patient = combinePatient(o.patient_last_name, o.patient_first_name, o.patient_phone);
                                        return (
                                            <tr key={o.id}
                                                onClick={() => setOpenId(o.id)}
                                                className={`cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-violet-50/40 dark:hover:bg-violet-950/15 ${
                                                    o.is_completed ? 'bg-emerald-50/20 dark:bg-emerald-950/5' :
                                                    idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/15'
                                                }`}>
                                                <td className="px-3 py-3 text-center text-gray-400 text-xs">{idx + 1}</td>
                                                <td className="px-3 py-3 text-xs text-gray-700 dark:text-gray-300 tabular-nums">{o.order_date ?? '—'}</td>
                                                <td className="px-3 py-3">
                                                    <div className="font-semibold text-foreground truncate">{patient || '—'}</div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="font-semibold text-foreground truncate">{o.lab_name}</div>
                                                    <div className="text-[11px] text-muted-foreground truncate">{o.work_description}</div>
                                                </td>
                                                <td className="px-3 py-3 text-xs text-gray-700 dark:text-gray-300 truncate">{o.doctor_name ?? '—'}</td>
                                                <td className="px-3 py-3 text-right tabular-nums text-xs">
                                                    <div className="font-bold text-foreground">{o.amount_due.toLocaleString()}₮</div>
                                                    {o.outstanding > 0 ? (
                                                        <div className="text-red-600 dark:text-red-400 font-semibold mt-0.5">
                                                            Дутуу: {o.outstanding.toLocaleString()}₮
                                                        </div>
                                                    ) : (
                                                        <div className="text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">✓ Бүтэн</div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${s.color}`}>
                                                        {s.label}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-center text-gray-400">›</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))
                )}

                <p className="text-[11px] text-muted-foreground text-center">
                    💡 Мөр дээр дарж бүх дэлгэрэнгүйг үзнэ үү
                </p>
            </div>

            {/* Detail Drawer */}
            {openOrder && (
                <AdminDetailDrawer key={openOrder.id} order={openOrder} onClose={() => setOpenId(null)} />
            )}
        </AppLayout>
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
            <div className="w-full max-w-2xl h-full bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="relative overflow-hidden border-b border-border bg-gradient-to-r from-violet-50 via-fuchsia-50 to-violet-50 dark:from-violet-950/30 dark:via-fuchsia-950/20 dark:to-violet-950/30 px-6 py-5">
                    <div className="absolute -right-6 -top-6 size-24 rounded-full bg-violet-300/30 blur-2xl" />
                    <div className="relative flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg">
                                <FlaskConical className="size-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">{order.lab_name}</h2>
                                <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5 mt-0.5">
                                    <span>#{order.id}</span>
                                    <span>•</span>
                                    <span>{order.branch_name ?? 'Салбаргүй'}</span>
                                    {order.created_by_name && (<><span>•</span><span>{order.created_by_name}</span></>)}
                                </p>
                                <div className="mt-1.5">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${s.color}`}>
                                        {s.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors">
                            <X className="size-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {/* Захиалга */}
                    <Section icon={<User className="size-4" />} title="Үндсэн мэдээлэл" color="violet">
                        <Grid2>
                            <Field label="Захиалсан огноо" value={order.order_date} />
                            <Field label="Лаб руу явуулсан" value={order.sent_to_lab_date} />
                        </Grid2>
                        <Field label="Өвчтөн" value={patient} highlight />
                        <Grid2>
                            <Field label="Салбар" value={order.branch_name} icon={<Building2 className="size-3.5" />} />
                            <Field label="Эмч" value={order.doctor_name} icon={<Stethoscope className="size-3.5" />} />
                        </Grid2>
                        <Field label="Хийгдсэн ажил" value={order.work_description} multiline />
                    </Section>

                    {/* Тооцоо */}
                    <Section icon={<CreditCard className="size-4" />} title="Тооцоо" color="emerald">
                        <div className="grid grid-cols-3 gap-3">
                            <Metric label="Төлөх дүн" value={`${order.amount_due.toLocaleString()}₮`} />
                            <Metric label="Төлсөн дүн" value={`${order.amount_paid.toLocaleString()}₮`} accent="emerald" />
                            <Metric label="Дутуу үлдэгдэл" value={`${order.outstanding.toLocaleString()}₮`} accent={order.outstanding > 0 ? 'red' : 'emerald'} />
                        </div>

                        {/* Баримтаар хаагдсан мэдээлэл */}
                        {order.final_payment_receipt && (
                            <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700/50 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
                                        <Receipt className="size-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Дутуу тооцоо төлөгдөж хаагдсан</p>
                                        <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">Энэ ажлын тооцоо дараах баримтаар бүрэн төлөгдсөн</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-200 dark:border-emerald-800/40">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Баримтын дугаар</p>
                                        <p className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-base mt-0.5">
                                            {order.final_payment_receipt}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Төлбөрийн хэрэгсэл</p>
                                        {method ? (
                                            <span className={`inline-flex mt-1 items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${method.color}`}>
                                                {method.label}
                                            </span>
                                        ) : <span className="text-sm text-muted-foreground">—</span>}
                                    </div>
                                    {order.final_payment_at && (
                                        <div className="col-span-2">
                                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Төлсөн огноо</p>
                                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5 inline-flex items-center gap-1.5">
                                                <CalendarClock className="size-3.5" />
                                                {order.final_payment_at}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Section>

                    {/* Лабораторид */}
                    <Section icon={<Send className="size-4" />} title="Лаборатори дахь ажил" color="indigo">
                        <Grid2>
                            <Field label="Нугалсан ажилтан" value={order.bender_name} />
                            <Field label="Өнгөлсөн ажилтан" value={order.polisher_name} />
                        </Grid2>
                        <Field label="Лабораторид бэлэн болсон" value={order.lab_ready_date} />
                    </Section>

                    {/* Хүлээн авах */}
                    <Section icon={<Package className="size-4" />} title="Хүлээн авах" color="blue">
                        <Grid2>
                            <Field label="Ресепшнд ирсэн" value={order.arrived_date} />
                            <Field label="Үйлчлүүлэгч авсан" value={order.pickup_date} />
                        </Grid2>
                        {order.is_completed && order.completed_at && (
                            <Field label="Бүртгэл дуусгасан" value={order.completed_at} icon={<CheckCircle2 className="size-3.5 text-emerald-600" />} />
                        )}
                    </Section>

                    {/* Тэмдэглэл */}
                    {order.notes && (
                        <Section icon={<CalendarClock className="size-4" />} title="Тэмдэглэл" color="gray">
                            <p className="rounded-xl bg-muted/30 px-4 py-3 text-sm text-foreground whitespace-pre-wrap">
                                {order.notes}
                            </p>
                        </Section>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-border bg-card px-6 py-3 flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground italic">👁 Удирдлагын зөвхөн харах горим</p>
                    <button onClick={onClose}
                        className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                        Хаах
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Helpers ───────────────────────────────────────────── */
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

function Grid2({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, value, icon, highlight, multiline }: {
    label: string;
    value: string | null | undefined;
    icon?: React.ReactNode;
    highlight?: boolean;
    multiline?: boolean;
}) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
            <div className={`mt-1 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-muted/20 px-3 py-2 text-sm ${highlight ? 'font-bold text-foreground' : 'text-foreground/90'} ${multiline ? 'whitespace-pre-wrap min-h-[2.5rem]' : ''}`}>
                <span className="inline-flex items-center gap-1.5">
                    {icon}
                    {value || <span className="text-muted-foreground italic">—</span>}
                </span>
            </div>
        </div>
    );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: 'emerald' | 'red' }) {
    const color =
        accent === 'emerald' ? 'text-emerald-700 dark:text-emerald-400' :
        accent === 'red'     ? 'text-red-700 dark:text-red-400' :
        'text-foreground';
    return (
        <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
            <p className={`text-base font-bold tabular-nums mt-0.5 ${color}`}>{value}</p>
        </div>
    );
}

type StatAccent = 'violet' | 'emerald' | 'red' | 'indigo' | 'gray' | 'blue';

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: StatAccent }) {
    const palette: Record<StatAccent, { gradient: string; text: string; border: string }> = {
        violet:  { gradient: 'from-violet-500 to-fuchsia-600',  text: 'text-violet-700 dark:text-violet-400',   border: 'border-violet-200/60 dark:border-violet-800/40' },
        emerald: { gradient: 'from-emerald-500 to-teal-600',    text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200/60 dark:border-emerald-800/40' },
        red:     { gradient: 'from-red-500 to-rose-600',        text: 'text-red-700 dark:text-red-400',         border: 'border-red-200/60 dark:border-red-800/40' },
        indigo:  { gradient: 'from-indigo-500 to-violet-600',   text: 'text-indigo-700 dark:text-indigo-400',   border: 'border-indigo-200/60 dark:border-indigo-800/40' },
        blue:    { gradient: 'from-blue-500 to-indigo-600',     text: 'text-blue-700 dark:text-blue-400',       border: 'border-blue-200/60 dark:border-blue-800/40' },
        gray:    { gradient: 'from-gray-500 to-slate-600',      text: 'text-gray-700 dark:text-gray-300',       border: 'border-gray-200/60 dark:border-gray-800/40' },
    };
    const p = palette[accent];
    return (
        <div className={`rounded-xl border bg-white/70 dark:bg-gray-900/60 backdrop-blur p-3 shadow-sm ${p.border}`}>
            <div className="flex items-center gap-2">
                <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${p.gradient} text-white shadow-sm`}>
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold truncate">{label}</p>
                    <p className={`text-sm font-bold tabular-nums truncate ${p.text}`}>{value}</p>
                </div>
            </div>
        </div>
    );
}
