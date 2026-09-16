import { LabPeriodFilter, periodLabel, type PeriodFilters } from '@/components/lab-period-filter';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle, ArrowRight, Building2, CheckCircle2, Clock,
    FlaskConical, RotateCcw, Stethoscope, Wallet,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/* ── Types ─────────────────────────────────────────────── */
interface Stats {
    orders: number; active: number; completed: number;
    returned: number; return_total: number; return_open: number; return_rate: number;
    due: number; paid: number; outstanding: number;
}
interface MonthPoint { month: string; label: string; orders: number; completed: number; returned: number; due: number; paid: number }
interface WorkRow { work: string; orders: number; returned: number; return_total: number; return_rate: number; due: number }
interface BranchRow { branch: string; orders: number; returned: number; return_rate: number; due: number }
interface DoctorRow { doctor: string; orders: number; returned: number; return_rate: number; due: number }
interface EmployeeRow { id: number; name: string; branch_name: string | null; works: number; orders: number; returned: number; return_rate: number; fixed: number }
interface ReasonRow {
    lab_order_id: number; attempt: number; return_count: number; reason: string;
    returned_at: string | null; ready_date: string | null; closed_at: string | null;
    work_description: string; patient: string; branch_name: string | null;
}
interface Branch { id: number; name: string }

interface Props {
    stats: Stats;
    monthly: MonthPoint[];
    workTypes: WorkRow[];
    branches: BranchRow[];
    doctors: DoctorRow[];
    employees: EmployeeRow[];
    reasons: ReasonRow[];
    filters: PeriodFilters & { branch: number | null };
    years: number[];
    branchList: Branch[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Удирдлага', href: '/admin/dashboard' },
    { title: 'Лабын тайлан', href: '/admin/lab-report' },
];

const money = (n: number) => `${n.toLocaleString()}₮`;
const short = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}K` : String(n));

export default function LabReport({
    stats, monthly, workTypes, branches, doctors, employees, reasons,
    filters, years, branchList,
}: Props) {
    function setBranch(id: number | null) {
        router.get('/admin/lab-report', {
            year: filters.year ?? undefined,
            quarter: filters.quarter ?? undefined,
            month: filters.month ?? undefined,
            branch: id ?? undefined,
        }, { preserveState: false, preserveScroll: true });
    }

    const maxWork = Math.max(...workTypes.map(w => w.orders), 1);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Лабын тайлан" />

            <div className="flex flex-col gap-3 p-4 md:p-6">
                {/* ── Header ─────────────────────────────── */}
                <div className="rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/80 via-card to-fuchsia-50/60 dark:from-violet-950/30 dark:via-card dark:to-fuchsia-950/20 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 px-4 md:px-5 py-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
                            <FlaskConical className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-base font-bold text-foreground">Лабын тайлан</h1>
                            <p className="text-[11px] text-muted-foreground truncate">
                                Кутикул лаб · {periodLabel(filters)} · захиалсан огноогоор
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {branchList.length > 1 && (
                                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                    <button onClick={() => setBranch(null)}
                                        className={`px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                                            !filters.branch ? 'bg-violet-600 text-white' : 'bg-card text-muted-foreground hover:bg-muted'
                                        }`}>Бүх салбар</button>
                                    {branchList.map(b => (
                                        <button key={b.id} onClick={() => setBranch(b.id)}
                                            className={`px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                                                filters.branch === b.id ? 'bg-violet-600 text-white' : 'bg-card text-muted-foreground hover:bg-muted'
                                            }`}>{b.name}</button>
                                    ))}
                                </div>
                            )}
                            <LabPeriodFilter url="/admin/lab-report" filters={filters} years={years} />
                        </div>
                    </div>
                </div>

                {/* ── KPI ────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
                    <Kpi icon={<FlaskConical className="size-4" />} label="Нийт захиалга" value={String(stats.orders)} tone="violet" />
                    <Kpi icon={<Clock className="size-4" />}        label="Идэвхтэй"      value={String(stats.active)} tone="blue" />
                    <Kpi icon={<CheckCircle2 className="size-4" />} label="Дууссан"       value={String(stats.completed)} tone="emerald" />
                    <Kpi icon={<RotateCcw className="size-4" />}    label="Буцаагдсан"    value={`${stats.returned} · ${stats.return_rate}%`}
                        tone="red" alert={stats.return_open > 0}
                        hint={`Нийт ${stats.return_total} удаа буцсан${stats.return_open ? ` · ${stats.return_open} нь явагдаж байна` : ''}`} />
                    <Kpi icon={<Wallet className="size-4" />}       label="Нийт төлбөр"   value={money(stats.due)} tone="indigo" />
                    <Kpi icon={<AlertCircle className="size-4" />}  label="Дутуу"         value={money(stats.outstanding)} tone="amber" />
                </div>

                {/* ── Чиг хандлага ───────────────────────── */}
                <div className="grid gap-3 lg:grid-cols-2">
                    <Panel title="Захиалгын чиг хандлага">
                        <Chart data={monthly} series={[
                            { key: 'orders',    name: 'Захиалга', color: '#8b5cf6' },
                            { key: 'completed', name: 'Дууссан',  color: '#10b981' },
                            { key: 'returned',  name: 'Буцаагдсан', color: '#ef4444', dashed: true },
                        ]} />
                    </Panel>
                    <Panel title="Орлогын чиг хандлага">
                        <Chart data={monthly} money series={[
                            { key: 'due',  name: 'Нийт төлбөр', color: '#6366f1' },
                            { key: 'paid', name: 'Төлсөн',      color: '#10b981' },
                        ]} />
                    </Panel>
                </div>

                {/* ── Ажлын төрлөөр ──────────────────────── */}
                <Panel title="Ажлын төрлөөр" subtitle="буцаалтын хувиар нь анхаарах ажлаа олно">
                    <div className="overflow-x-auto premium-scroll">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50/70 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wide">
                                    <th className="px-3 py-1.5 text-left font-semibold">Ажил</th>
                                    <th className="px-2 py-1.5 text-right font-semibold w-20">Захиалга</th>
                                    <th className="px-2 py-1.5 text-left font-semibold w-32 hidden md:table-cell">Эзлэх хувь</th>
                                    <th className="px-2 py-1.5 text-right font-semibold w-24">Буцаагдсан</th>
                                    <th className="px-2 py-1.5 text-right font-semibold w-20">Буцаалт %</th>
                                    <th className="px-2 py-1.5 text-right font-semibold w-28">Төлбөр</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workTypes.map((w, idx) => (
                                    <tr key={w.work} className={`border-b border-gray-100 dark:border-gray-800 ${idx % 2 ? 'bg-gray-50/30 dark:bg-gray-800/10' : ''}`}>
                                        <td className="px-3 py-2 font-medium text-foreground text-[12px]">{w.work}</td>
                                        <td className="px-2 py-2 text-right tabular-nums font-bold text-foreground">{w.orders}</td>
                                        <td className="px-2 py-2 hidden md:table-cell">
                                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-500"
                                                    style={{ width: `${(w.orders / maxWork) * 100}%` }} />
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-right tabular-nums">
                                            {w.returned > 0
                                                ? <span className="font-semibold text-red-600 dark:text-red-400">{w.returned}</span>
                                                : <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-2 py-2 text-right tabular-nums">
                                            {w.returned > 0
                                                ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                                    w.return_rate >= 30
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                  }`}>{w.return_rate}%</span>
                                                : <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{money(w.due)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                {/* ── Ажилтан ────────────────────────────── */}
                <Panel title="Ажилтны гүйцэтгэл" subtitle="лаб дуусгасан огноогоор"
                    action={<Link href="/admin/lab-employees" className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 inline-flex items-center gap-1 hover:underline">
                        Дэлгэрэнгүй <ArrowRight className="size-3" />
                    </Link>}>
                    <div className="overflow-x-auto premium-scroll">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50/70 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wide">
                                    <th className="px-3 py-1.5 text-left font-semibold">Ажилтан</th>
                                    <th className="px-2 py-1.5 text-left font-semibold w-28 hidden md:table-cell">Салбар</th>
                                    <th className="px-2 py-1.5 text-right font-semibold w-20">Ажил</th>
                                    <th className="px-2 py-1.5 text-right font-semibold w-20">Захиалга</th>
                                    <th className="px-2 py-1.5 text-right font-semibold w-24">Буцаагдсан</th>
                                    <th className="px-2 py-1.5 text-right font-semibold w-20">Буцаалт %</th>
                                    <th className="px-2 py-1.5 text-right font-semibold w-20">Янзалсан</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.length === 0 ? (
                                    <tr><td colSpan={7} className="px-3 py-8 text-center text-[11px] text-muted-foreground">Энэ хугацаанд ажил бүртгэгдээгүй</td></tr>
                                ) : employees.map((e, idx) => (
                                    <tr key={e.id} className={`border-b border-gray-100 dark:border-gray-800 hover:bg-violet-50/40 dark:hover:bg-violet-950/15 ${idx % 2 ? 'bg-gray-50/30 dark:bg-gray-800/10' : ''}`}>
                                        <td className="px-3 py-2">
                                            <Link href={`/admin/lab-employees/${e.id}`}
                                                className="font-semibold text-foreground text-[12px] hover:text-violet-600 dark:hover:text-violet-400">
                                                {e.name}
                                            </Link>
                                        </td>
                                        <td className="px-2 py-2 text-[11px] text-muted-foreground hidden md:table-cell">{e.branch_name ?? '—'}</td>
                                        <td className="px-2 py-2 text-right tabular-nums font-bold text-foreground">{e.works}</td>
                                        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{e.orders}</td>
                                        <td className="px-2 py-2 text-right tabular-nums">
                                            {e.returned > 0
                                                ? <span className="font-semibold text-red-600 dark:text-red-400">{e.returned}</span>
                                                : <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-2 py-2 text-right tabular-nums">
                                            {e.returned > 0
                                                ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                                    e.return_rate >= 30
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                  }`}>{e.return_rate}%</span>
                                                : <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-2 py-2 text-right tabular-nums">
                                            {e.fixed > 0
                                                ? <span className="font-semibold text-amber-600 dark:text-amber-400">{e.fixed}</span>
                                                : <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                {/* ── Салбар ба эмч ──────────────────────── */}
                <div className="grid gap-3 lg:grid-cols-2">
                    {branches.length > 0 && (
                        <Panel title="Салбараар" icon={<Building2 className="size-3.5 text-violet-500" />}>
                            <BreakdownTable rows={branches.map(b => ({
                                label: b.branch, orders: b.orders, returned: b.returned, rate: b.return_rate, due: b.due,
                            }))} />
                        </Panel>
                    )}
                    <Panel title="Эмчээр" icon={<Stethoscope className="size-3.5 text-violet-500" />}
                        className={branches.length === 0 ? 'lg:col-span-2' : ''}>
                        <BreakdownTable rows={doctors.map(d => ({
                            label: d.doctor, orders: d.orders, returned: d.returned, rate: d.return_rate, due: d.due,
                        }))} />
                    </Panel>
                </div>

                {/* ── Сүүлийн буцаалтууд ─────────────────── */}
                <Panel title="Сүүлийн буцаалтууд" icon={<RotateCcw className="size-3.5 text-red-500" />}
                    action={<Link href="/admin/lab-orders?status=returned" className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 inline-flex items-center gap-1 hover:underline">
                        Бүгдийг үзэх <ArrowRight className="size-3" />
                    </Link>}>
                    {reasons.length === 0 ? (
                        <p className="px-4 py-8 text-center text-[11px] text-muted-foreground">Энэ хугацаанд буцаалт бүртгэгдээгүй</p>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {reasons.map(r => (
                                <div key={`${r.lab_order_id}-${r.attempt}`} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-2">
                                    <span className="shrink-0 rounded-full bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 text-[9px] font-bold text-red-700 dark:text-red-300">
                                        #{r.attempt}{r.return_count > 1 ? `/${r.return_count}` : ''}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[12.5px] text-foreground">{r.reason}</p>
                                        <p className="text-[10px] text-muted-foreground truncate">
                                            {[r.work_description, r.patient, r.branch_name].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                        {r.returned_at} {r.ready_date ? `→ ${r.ready_date}` : '→ янзлагдаагүй'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            </div>
        </AppLayout>
    );
}

/* ── Components ─────────────────────────────────────────── */
function Panel({ title, subtitle, icon, action, className = '', children }: {
    title: string; subtitle?: string; icon?: React.ReactNode;
    action?: React.ReactNode; className?: string; children: React.ReactNode;
}) {
    return (
        <section className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden ${className}`}>
            <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-800 px-4 py-2">
                <div className="min-w-0">
                    <h2 className="text-[12px] font-bold text-foreground inline-flex items-center gap-1.5">{icon}{title}</h2>
                    {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

function Chart({ data, series, money: isMoney }: {
    data: MonthPoint[];
    series: { key: string; name: string; color: string; dashed?: boolean }[];
    money?: boolean;
}) {
    if (data.length === 0) {
        return <p className="flex h-48 items-center justify-center text-[11px] text-muted-foreground">Өгөгдөл алга</p>;
    }
    return (
        <div className="p-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                        {series.map(s => (
                            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" className="stroke-border" vertical={false} opacity={0.6} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" axisLine={false} tickLine={false} dy={4} />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" axisLine={false} tickLine={false}
                        allowDecimals={false} width={38} tickFormatter={v => (isMoney ? short(v) : v)} />
                    <Tooltip
                        formatter={(v) => (isMoney ? money(Number(v)) : String(v))}
                        contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', boxShadow: '0 4px 16px rgb(0 0 0 / 0.12)' }}
                        labelStyle={{ fontWeight: 700, marginBottom: 2 }}
                        cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} iconType="plainline" iconSize={14} />
                    {series.map(s => (
                        <Area key={s.key} type="monotone" dataKey={s.key} name={s.name}
                            stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? '4 3' : undefined}
                            fill={`url(#g-${s.key})`}
                            dot={{ r: 2.5, strokeWidth: 0, fill: s.color }} activeDot={{ r: 4 }} />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

function BreakdownTable({ rows }: { rows: { label: string; orders: number; returned: number; rate: number; due: number }[] }) {
    if (rows.length === 0) {
        return <p className="px-4 py-8 text-center text-[11px] text-muted-foreground">Өгөгдөл алга</p>;
    }
    return (
        <div className="overflow-x-auto premium-scroll">
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-gray-50/70 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wide">
                        <th className="px-3 py-1.5 text-left font-semibold">Нэр</th>
                        <th className="px-2 py-1.5 text-right font-semibold w-20">Захиалга</th>
                        <th className="px-2 py-1.5 text-right font-semibold w-24">Буцаалт</th>
                        <th className="px-2 py-1.5 text-right font-semibold w-28">Төлбөр</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, idx) => (
                        <tr key={r.label} className={`border-b border-gray-100 dark:border-gray-800 ${idx % 2 ? 'bg-gray-50/30 dark:bg-gray-800/10' : ''}`}>
                            <td className="px-3 py-2 font-medium text-foreground text-[12px] truncate max-w-[180px]">{r.label}</td>
                            <td className="px-2 py-2 text-right tabular-nums font-bold text-foreground">{r.orders}</td>
                            <td className="px-2 py-2 text-right tabular-nums">
                                {r.returned > 0
                                    ? <span className="text-red-600 dark:text-red-400 font-semibold">{r.returned} <span className="text-[10px] font-normal">({r.rate}%)</span></span>
                                    : <span className="text-muted-foreground/40">—</span>}
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{money(r.due)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

type Tone = 'violet' | 'blue' | 'emerald' | 'red' | 'indigo' | 'amber';

function Kpi({ icon, label, value, tone, alert, hint }: {
    icon: React.ReactNode; label: string; value: string; tone: Tone; alert?: boolean; hint?: string;
}) {
    const t = {
        violet:  { bg: 'bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400',    text: 'text-violet-700 dark:text-violet-400' },
        blue:    { bg: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',            text: 'text-blue-700 dark:text-blue-400' },
        emerald: { bg: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400', text: 'text-emerald-700 dark:text-emerald-400' },
        red:     { bg: 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400',                text: 'text-red-700 dark:text-red-400' },
        indigo:  { bg: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',    text: 'text-indigo-700 dark:text-indigo-400' },
        amber:   { bg: 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',        text: 'text-amber-700 dark:text-amber-400' },
    }[tone];

    return (
        <div className={`relative rounded-xl border bg-card shadow-sm px-3 py-2.5 flex items-center gap-2.5 ${
            alert ? 'border-red-300/70 dark:border-red-800/60' : 'border-gray-200 dark:border-gray-800'
        }`} title={hint}>
            <div className={`size-8 shrink-0 rounded-lg flex items-center justify-center ${t.bg}`}>{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground font-semibold truncate">{label}</p>
                <p className={`text-[15px] font-bold tabular-nums truncate ${t.text}`}>{value}</p>
            </div>
            {alert && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-red-500 animate-pulse" />}
        </div>
    );
}
