import LabLayout from '@/layouts/lab-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle, CheckCircle2, FlaskConical, Search, Send,
    Sparkles, User, X,
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

interface Stats { active: number; completed: number; total_due: number; total_paid: number; total_outstanding: number }
interface Employee { id: number; name: string }
interface Filters { status: 'active' | 'completed' | 'all'; search: string }
interface Props {
    orders: LabOrder[];
    stats: Stats;
    employees: Employee[];
    filters: Filters;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар', href: '/lab/dashboard' },
    { title: 'Лаб бүртгэл',     href: '/lab/lab-orders' },
];

const API_BASE = '/lab/lab-orders';

function combinePatient(lastName: string | null, firstName: string, phone: string | null): string {
    return [lastName, firstName, phone].filter(Boolean).join(' ').trim();
}

function go(patch: Partial<Filters>, current: Filters) {
    router.get(API_BASE, {
        status: patch.status ?? current.status,
        q:      patch.search ?? current.search,
    }, { preserveState: false });
}

function stage(o: LabOrder): { label: string; color: string } {
    if (o.is_completed)     return { label: 'Дууссан',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    if (o.pickup_date)      return { label: 'Авсан',       color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    if (o.arrived_date)     return { label: 'Ресепшнд',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
    if (o.lab_ready_date)   return { label: 'Ажил бэлэн болсон', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' };
    if (o.sent_to_lab_date) return { label: 'Хүлээж авсан', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' };
    return { label: 'Шинэ', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
}

/* ══════════════════════════════════════════════════════════
   Main
══════════════════════════════════════════════════════════ */
export default function LabOrdersIndex({ orders, stats, employees, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [openId, setOpenId] = useState<number | null>(null);

    // Realtime — 5 секунд тутамд orders, stats, notifications шинэчилнэ
    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['orders', 'stats', 'notifications'] });
        }, 5000);
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
            (o.doctor_name ?? '').toLowerCase().includes(q)
        );
    }, [orders, search]);

    // Салбараар бүлэглэнэ
    const groupedByBranch = useMemo(() => {
        const groups = new Map<string, LabOrder[]>();
        for (const o of filtered) {
            const key = o.branch_name ?? '— Салбаргүй —';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(o);
        }
        return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [filtered]);

    const openOrder = openId !== null ? orders.find(o => o.id === openId) ?? null : null;

    return (
        <LabLayout breadcrumbs={breadcrumbs}>
            <Head title="Лаб бүртгэл" />

            <div className="flex flex-col gap-5 p-4 md:p-6">
                {/* Premium Header */}
                <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/40 dark:via-gray-900 dark:to-fuchsia-950/30 p-5 shadow-sm">
                    <div className="absolute -right-8 -top-8 size-32 rounded-full bg-violet-200/40 dark:bg-violet-700/20 blur-2xl" />
                    <div className="absolute -bottom-8 -left-8 size-24 rounded-full bg-fuchsia-200/40 dark:bg-fuchsia-700/20 blur-2xl" />

                    <div className="relative flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30">
                                <FlaskConical className="size-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    Лаб бүртгэл
                                    <Sparkles className="size-4 text-violet-500" />
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">Захиалга дээр дарж нугалсан / өнгөлсөн / бэлэн огноог тэмдэглэнэ</p>
                            </div>
                        </div>

                        <div className="flex gap-2 flex-wrap items-center">
                            <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 backdrop-blur px-4 py-2.5 text-right border border-violet-100/80 dark:border-violet-900/50">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Идэвхтэй</p>
                                <p className="text-lg font-bold text-violet-700 dark:text-violet-400 tabular-nums">{stats.active}</p>
                            </div>
                            <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 backdrop-blur px-4 py-2.5 text-right border border-emerald-100/80 dark:border-emerald-900/50">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Дууссан</p>
                                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{stats.completed}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-card p-3 shadow-sm">
                    <div className="relative flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-1.5 flex-1 min-w-60">
                        <Search className="size-4 text-muted-foreground" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Өвчтөн, лаб, эмч, ажлаар хайх..."
                            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
                    </div>

                    <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        {([
                            { key: 'active',    label: 'Идэвхтэй',  count: stats.active,    color: 'bg-violet-600' },
                            { key: 'completed', label: 'Дууссан',   count: stats.completed, color: 'bg-emerald-600' },
                            { key: 'all',       label: 'Бүгд',      count: stats.active + stats.completed, color: 'bg-gray-700' },
                        ] as const).map(t => (
                            <button key={t.key} onClick={() => go({ status: t.key }, filters)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${
                                    filters.status === t.key
                                        ? `${t.color} text-white`
                                        : 'bg-white dark:bg-gray-900 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}>
                                {t.label}
                                <span className={`rounded-full px-1.5 py-0 text-[10px] tabular-nums ${
                                    filters.status === t.key ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
                                }`}>{t.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grouped by branch */}
                {groupedByBranch.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm p-12 text-center text-muted-foreground">
                        <FlaskConical className="size-12 mx-auto mb-3 text-violet-300" />
                        <p className="text-sm font-semibold">Лаб бүртгэл байхгүй</p>
                        <p className="text-xs mt-1">Ресепшнээс ирэх захиалгыг хүлээж байна</p>
                    </div>
                ) : (
                    groupedByBranch.map(([branchName, orders]) => (
                        <div key={branchName} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-violet-100/60 to-fuchsia-100/40 dark:from-violet-950/40 dark:to-fuchsia-950/30 px-5 py-3">
                                <h2 className="text-sm font-bold text-foreground inline-flex items-center gap-2">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-violet-600 text-white text-xs font-bold">
                                        {branchName.charAt(0).toUpperCase()}
                                    </span>
                                    {branchName}
                                </h2>
                                <span className="text-[11px] text-muted-foreground">{orders.length} захиалга</span>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50/60 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wide">
                                        <th className="px-3 py-2 text-center font-semibold w-10">№</th>
                                        <th className="px-3 py-2 text-left font-semibold w-28">Лаб руу</th>
                                        <th className="px-3 py-2 text-left font-semibold">Өвчтөн</th>
                                        <th className="px-3 py-2 text-left font-semibold">Лаб / Ажил</th>
                                        <th className="px-3 py-2 text-left font-semibold w-28">Нугалсан</th>
                                        <th className="px-3 py-2 text-left font-semibold w-28">Өнгөлсөн</th>
                                        <th className="px-3 py-2 text-left font-semibold w-28">Бэлэн</th>
                                        <th className="px-3 py-2 text-center font-semibold w-28">Статус</th>
                                        <th className="px-3 py-2 text-center font-semibold w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((o, idx) => {
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
                                                <td className="px-3 py-3 text-xs text-gray-700 dark:text-gray-300 tabular-nums">
                                                    {o.sent_to_lab_date ?? '—'}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="font-semibold text-foreground truncate">{patient || '—'}</div>
                                                    {o.doctor_name && <div className="text-[11px] text-muted-foreground truncate">Эмч: {o.doctor_name}</div>}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="font-semibold text-foreground truncate">{o.lab_name}</div>
                                                    <div className="text-[11px] text-muted-foreground truncate">{o.work_description}</div>
                                                </td>
                                                <td className="px-3 py-3 text-xs">
                                                    {o.bender_name
                                                        ? <span className="text-gray-700 dark:text-gray-300">{o.bender_name}</span>
                                                        : <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-3 py-3 text-xs">
                                                    {o.polisher_name
                                                        ? <span className="text-gray-700 dark:text-gray-300">{o.polisher_name}</span>
                                                        : <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-3 py-3 text-xs tabular-nums">
                                                    {o.lab_ready_date
                                                        ? <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{o.lab_ready_date}</span>
                                                        : <span className="text-gray-300">—</span>}
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
                    💡 Мөр дээр дарж нугалсан / өнгөлсөн ажилтан болон бэлэн болсон огноог тэмдэглэнэ
                </p>
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
    const [benderId,  setBenderId]  = useState<number | null>(order.bender_employee_id);
    const [polisherId, setPolisherId] = useState<number | null>(order.polisher_employee_id);
    const [labReady,   setLabReady]   = useState<string | null>(order.lab_ready_date);
    const [saving, setSaving] = useState(false);

    const dirty =
        benderId !== order.bender_employee_id ||
        polisherId !== order.polisher_employee_id ||
        labReady !== order.lab_ready_date;

    function save() {
        if (!dirty) return;
        setSaving(true);
        router.patch(`${API_BASE}/${order.id}`, {
            bender_employee_id: benderId,
            polisher_employee_id: polisherId,
            lab_ready_date: labReady,
        } as never, {
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
                <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md">
                            <FlaskConical className="size-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-foreground">{order.lab_name}</h2>
                            <p className="text-xs text-muted-foreground">#{order.id}</p>
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
                    <div className="rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-violet-50/30 dark:bg-violet-950/10 p-4">
                        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                            <FlaskConical className="size-4 text-violet-600" />
                            Лаб ажилтны бөглөх хэсэг
                        </h3>

                        <div className="space-y-3">
                            <label className="block">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Нугалсан ажилтан</span>
                                <select value={benderId ?? ''} disabled={locked}
                                    onChange={e => setBenderId(e.target.value ? Number(e.target.value) : null)}
                                    className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 border-gray-200 dark:border-gray-700">
                                    <option value="">— Сонгох —</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </label>

                            <label className="block">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Өнгөлсөн ажилтан</span>
                                <select value={polisherId ?? ''} disabled={locked}
                                    onChange={e => setPolisherId(e.target.value ? Number(e.target.value) : null)}
                                    className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 border-gray-200 dark:border-gray-700">
                                    <option value="">— Сонгох —</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </label>

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
                </div>

                {/* Footer */}
                <div className="border-t border-border bg-card px-5 py-3 flex items-center justify-end gap-2">
                    <button onClick={onClose}
                        className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                        Хаах
                    </button>
                    {!locked && (
                        <button onClick={save} disabled={!dirty || saving}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors">
                            <CheckCircle2 className="size-4" /> Хадгалах
                        </button>
                    )}
                </div>
            </div>
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
