import LabLayout from '@/layouts/lab-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle, Building2, CheckCircle2, ChevronDown, ChevronUp, FlaskConical, Search, Send,
    User, X,
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
const PAGE_PER_BRANCH = 25;

export default function LabOrdersIndex({ orders, stats, employees, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [openId, setOpenId] = useState<number | null>(null);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

    // Салбараар бүлэглээд idэвхтэй/дууссан-аар сорт хийнэ
    const groupedByBranch = useMemo(() => {
        const groups = new Map<string, LabOrder[]>();
        for (const o of filtered) {
            const key = o.branch_name ?? '— Салбаргүй —';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(o);
        }
        // Захиалга бүрийг идэвхтэй→дууссан, сүүлийн огноогоор эрэмбэлнэ
        groups.forEach(arr => {
            arr.sort((a, b) => {
                if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
                return (b.order_date ?? '').localeCompare(a.order_date ?? '');
            });
        });
        return Array.from(groups.entries()).sort(([, a], [, b]) => b.length - a.length);
    }, [filtered]);

    function toggleCollapse(key: string) { setCollapsed(p => ({ ...p, [key]: !p[key] })); }
    function toggleExpand(key: string)   { setExpanded(p => ({ ...p, [key]: !p[key] })); }
    function collapseAll() { setCollapsed(Object.fromEntries(groupedByBranch.map(([k]) => [k, true]))); }
    function expandAll()   { setCollapsed({}); }

    const openOrder = openId !== null ? orders.find(o => o.id === openId) ?? null : null;

    return (
        <LabLayout breadcrumbs={breadcrumbs}>
            <Head title="Лаб бүртгэл" />

            <div className="flex flex-col gap-5 p-4 md:p-6">
                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl border border-violet-200/50 dark:border-violet-800/40 bg-gradient-to-br from-violet-50 via-card to-fuchsia-50/30 dark:from-violet-950/30 dark:via-card dark:to-fuchsia-950/20 shadow-sm">
                    <div className="absolute -right-12 -top-12 size-40 rounded-full bg-violet-200/30 dark:bg-violet-700/15 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 right-1/3 size-32 rounded-full bg-fuchsia-200/30 dark:bg-fuchsia-700/15 blur-3xl pointer-events-none" />

                    <div className="relative flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                        <div className="flex items-center gap-3.5">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30">
                                <FlaskConical className="size-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground leading-tight">Лаб бүртгэл</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">Захиалга дээр дарж нугалсан / өнгөлсөн / бэлэн огноог тэмдэглэнэ</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <StatChip label="Идэвхтэй" value={stats.active}                       tone="violet" />
                            <StatChip label="Дууссан"  value={stats.completed}                    tone="emerald" />
                            <StatChip label="Нийт"     value={stats.active + stats.completed}     tone="gray" />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card shadow-sm px-4 py-3">
                    <div className="relative flex-1 min-w-[260px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Өвчтөн, лаб, эмч, ажлаар хайх..."
                            className="w-full rounded-xl border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 transition-all" />
                    </div>

                    <div className="flex items-center rounded-xl border bg-muted/30 p-1">
                        {([
                            { key: 'active',    label: 'Идэвхтэй',  count: stats.active,    color: 'text-violet-700 dark:text-violet-400',   active: 'bg-violet-100 dark:bg-violet-950/40' },
                            { key: 'completed', label: 'Дууссан',   count: stats.completed, color: 'text-emerald-700 dark:text-emerald-400', active: 'bg-emerald-100 dark:bg-emerald-950/40' },
                            { key: 'all',       label: 'Бүгд',      count: stats.active + stats.completed, color: 'text-foreground', active: 'bg-card shadow-sm' },
                        ] as const).map(t => (
                            <button key={t.key} onClick={() => go({ status: t.key }, filters)}
                                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                    filters.status === t.key
                                        ? `${t.active} ${t.color}`
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}>
                                {t.label}
                                <span className={`rounded-full px-1.5 py-0 text-[10px] tabular-nums ${
                                    filters.status === t.key ? 'bg-white/60 dark:bg-black/30' : 'bg-muted'
                                }`}>{t.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Collapse controls — only when many groups */}
                {groupedByBranch.length > 1 && (
                    <div className="flex items-center justify-between -mb-2 px-1">
                        <span className="text-[11px] text-muted-foreground">{groupedByBranch.length} салбар · {filtered.length} захиалга</span>
                        <div className="flex items-center gap-1.5">
                            <button onClick={expandAll}
                                className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline">
                                Бүгдийг дэлгэх
                            </button>
                            <span className="text-muted-foreground/40">·</span>
                            <button onClick={collapseAll}
                                className="text-[11px] font-semibold text-muted-foreground hover:underline">
                                Бүгдийг хумих
                            </button>
                        </div>
                    </div>
                )}

                {/* Grouped by branch */}
                {groupedByBranch.length === 0 ? (
                    <div className="rounded-2xl border bg-card shadow-sm py-16 text-center">
                        <div className="mx-auto size-14 rounded-2xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center mb-3">
                            <FlaskConical className="size-7 text-violet-300 dark:text-violet-700" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">Лаб бүртгэл байхгүй</p>
                        <p className="text-xs text-muted-foreground mt-1">Ресепшнээс ирэх захиалгыг хүлээж байна</p>
                    </div>
                ) : (
                    groupedByBranch.map(([branchName, orders]) => {
                        const isCollapsed = collapsed[branchName];
                        const isExpanded  = expanded[branchName];
                        const visible = isExpanded ? orders : orders.slice(0, PAGE_PER_BRANCH);
                        const active    = orders.filter(o => !o.is_completed).length;
                        const completed = orders.length - active;

                        return (
                        <div key={branchName} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                            <button onClick={() => toggleCollapse(branchName)}
                                className="w-full flex items-center justify-between border-b bg-gradient-to-r from-violet-50/60 via-card to-card dark:from-violet-950/20 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                                <h2 className="text-base font-bold text-foreground inline-flex items-center gap-2.5">
                                    <span className="size-9 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                                        <Building2 className="size-4 text-violet-600 dark:text-violet-400" />
                                    </span>
                                    {branchName}
                                </h2>
                                <div className="flex items-center gap-2">
                                    {active > 0 && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-950/40 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 dark:text-violet-400 tabular-nums">
                                            <span className="size-1.5 rounded-full bg-violet-500" />
                                            {active} идэвхтэй
                                        </span>
                                    )}
                                    {completed > 0 && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                            <span className="size-1.5 rounded-full bg-emerald-500" />
                                            {completed} дууссан
                                        </span>
                                    )}
                                    {isCollapsed
                                        ? <ChevronDown className="size-4 text-muted-foreground" />
                                        : <ChevronUp className="size-4 text-muted-foreground" />}
                                </div>
                            </button>
                            {!isCollapsed && (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/20 text-muted-foreground text-[10.5px] uppercase tracking-wider font-bold">
                                        <th className="px-4 py-2.5 text-left w-10">№</th>
                                        <th className="px-4 py-2.5 text-left w-28">Лаб руу</th>
                                        <th className="px-4 py-2.5 text-left">Өвчтөн</th>
                                        <th className="px-4 py-2.5 text-left">Лаб / Ажил</th>
                                        <th className="px-4 py-2.5 text-left w-32">Нугалсан</th>
                                        <th className="px-4 py-2.5 text-left w-32">Өнгөлсөн</th>
                                        <th className="px-4 py-2.5 text-left w-28">Бэлэн</th>
                                        <th className="px-4 py-2.5 text-center w-28">Статус</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {visible.map((o, idx) => {
                                        const s = stage(o);
                                        const patient = combinePatient(o.patient_last_name, o.patient_first_name, o.patient_phone);
                                        return (
                                            <tr key={o.id}
                                                onClick={() => setOpenId(o.id)}
                                                className={`group cursor-pointer transition-colors hover:bg-violet-50/40 dark:hover:bg-violet-950/15 ${
                                                    o.is_completed ? 'bg-emerald-50/30 dark:bg-emerald-950/5' : ''
                                                }`}>
                                                <td className="px-4 py-3.5 text-center text-[11px] text-muted-foreground tabular-nums">{idx + 1}</td>
                                                <td className="px-4 py-3.5 text-[11px] tabular-nums text-foreground">
                                                    {o.sent_to_lab_date ?? <span className="text-muted-foreground/40">—</span>}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="font-semibold text-foreground text-[13px] truncate">{patient || '—'}</div>
                                                    {o.doctor_name && <div className="text-[10.5px] text-muted-foreground truncate">Эмч: {o.doctor_name}</div>}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="font-semibold text-foreground text-[13px] truncate">{o.lab_name}</div>
                                                    <div className="text-[10.5px] text-muted-foreground truncate">{o.work_description}</div>
                                                </td>
                                                <td className="px-4 py-3.5 text-[11px]">
                                                    {o.bender_name
                                                        ? <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 px-1.5 py-0.5 text-blue-700 dark:text-blue-400 font-medium">{o.bender_name}</span>
                                                        : <span className="text-muted-foreground/40">—</span>}
                                                </td>
                                                <td className="px-4 py-3.5 text-[11px]">
                                                    {o.polisher_name
                                                        ? <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 px-1.5 py-0.5 text-indigo-700 dark:text-indigo-400 font-medium">{o.polisher_name}</span>
                                                        : <span className="text-muted-foreground/40">—</span>}
                                                </td>
                                                <td className="px-4 py-3.5 text-[11px] tabular-nums">
                                                    {o.lab_ready_date
                                                        ? <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                                                            <CheckCircle2 className="size-3" />
                                                            {o.lab_ready_date}
                                                          </span>
                                                        : <span className="text-muted-foreground/40">—</span>}
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${s.color}`}>
                                                        {s.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            )}
                            {!isCollapsed && orders.length > PAGE_PER_BRANCH && (
                                <button onClick={() => toggleExpand(branchName)}
                                    className="w-full border-t bg-muted/20 hover:bg-muted/40 transition-colors px-4 py-2 text-[12px] font-semibold text-violet-700 dark:text-violet-400">
                                    {isExpanded
                                        ? `Хумих (${PAGE_PER_BRANCH} харагдаж байна)`
                                        : `Бүгдийг үзэх (нийт ${orders.length})`}
                                </button>
                            )}
                        </div>
                        );
                    })
                )}
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

function StatChip({ label, value, tone }: { label: string; value: number; tone: 'violet' | 'emerald' | 'gray' }) {
    const styles = {
        violet:  { bg: 'bg-violet-100/80 dark:bg-violet-950/40',   text: 'text-violet-700 dark:text-violet-400',   dot: 'bg-violet-500',   border: 'border-violet-200/60 dark:border-violet-800/40' },
        emerald: { bg: 'bg-emerald-100/80 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-200/60 dark:border-emerald-800/40' },
        gray:    { bg: 'bg-gray-100/80 dark:bg-gray-800/60',       text: 'text-gray-700 dark:text-gray-300',       dot: 'bg-gray-500',     border: 'border-gray-200/60 dark:border-gray-700/40' },
    }[tone];
    return (
        <div className={`inline-flex items-center gap-2 rounded-xl border ${styles.border} bg-card/80 backdrop-blur px-3 py-1.5 shadow-sm`}>
            <span className={`size-1.5 rounded-full ${styles.dot}`} />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</span>
            <span className={`text-base font-bold tabular-nums ${styles.text}`}>{value}</span>
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
