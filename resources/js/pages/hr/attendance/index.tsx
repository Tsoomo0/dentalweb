import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { router, usePage, Link } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Clock, Download, Timer, TrendingUp, User } from 'lucide-react';
import { useState } from 'react';

const MONTHS_MN = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар',
                   '7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];

interface AttendanceLog {
    id: number; date: string; employee_id: number;
    employee_name: string; position: string | null;
    checked_in_at: string | null; checked_out_at: string | null;
    worked_minutes: number;
    scheduled_start: string | null; scheduled_end: string | null;
    late_minutes: number | null; overtime_minutes: number | null;
}
interface Employee { id: number; name: string; }
interface Branch { id: number; name: string; }
interface PageProps {
    logs: AttendanceLog[]; employees: Employee[]; branches: Branch[];
    year: number; month: number; employee_id: number | null; branch_id: number | null;
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/dashboard' },
    { title: 'Ирцийн бүртгэл', href: '/hr/attendance' },
];

function fmtMins(mins: number | null) {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}ц ${m}мин` : `${m}мин`;
}

function StatTile({ icon: Icon, label, value, sub, color, bg }: {
    icon: React.ElementType; label: string; value: string | number;
    sub?: string; color: string; bg: string;
}) {
    return (
        <div className={`rounded-2xl ${bg} p-4 flex items-center gap-3`}>
            <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 bg-white/20`}>
                <Icon className={`size-5 ${color}`} />
            </div>
            <div>
                <p className="text-2xl font-black text-gray-900 dark:text-gray-100 leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</p>
                {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
            </div>
        </div>
    );
}

export default function HrAttendanceIndex() {
    const { logs, employees, branches, year, month, employee_id, branch_id } = usePage<PageProps>().props;

    const [selEmployee, setSelEmployee] = useState<number | ''>(employee_id ?? '');
    const [selBranch,   setSelBranch]   = useState<number | ''>(branch_id ?? '');
    const [selYear,  setSelYear]  = useState(year);
    const [selMonth, setSelMonth] = useState(month);

    function applyFilter() {
        router.get('/hr/attendance', {
            year: selYear, month: selMonth,
            employee_id: selEmployee || undefined,
            branch_id: selBranch || undefined,
        }, { preserveScroll: true });
    }

    function exportExcel() {
        const params = new URLSearchParams();
        params.set('year', String(selYear));
        params.set('month', String(selMonth));
        if (selEmployee) params.set('employee_id', String(selEmployee));
        if (selBranch) params.set('branch_id', String(selBranch));
        window.location.href = `/hr/attendance/export-excel?${params.toString()}`;
    }

    const totalWorked       = logs.reduce((s, l) => s + l.worked_minutes, 0);
    const lateCount         = logs.filter(l => l.late_minutes).length;
    const totalOvertimeMins = logs.reduce((s, l) => s + (l.overtime_minutes ?? 0), 0);
    const onTimeCount       = logs.filter(l => l.checked_in_at && !l.late_minutes).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="p-4 md:p-6 space-y-5">

                {/* ── Header ── */}
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Ирцийн бүртгэл</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {MONTHS_MN[month - 1]} {year} · {logs.length} бүртгэл
                        </p>
                    </div>
                    <button
                        onClick={exportExcel}
                        className="flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                    >
                        <Download className="size-4" /> Excel татах
                    </button>
                </div>

                {/* ── Stat tiles ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatTile icon={Clock}        label="Нийт ажилласан"  value={fmtMins(totalWorked) ?? '—'}  color="text-blue-600"    bg="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900" />
                    <StatTile icon={CheckCircle2} label="Цагтаа ирсэн"    value={onTimeCount}                  color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900" sub="удаа" />
                    <StatTile icon={AlertTriangle} label="Хоцорсон"       value={lateCount}                    color="text-red-600"     bg="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900" sub="удаа" />
                    <StatTile icon={TrendingUp}   label="Нийт илүү цаг"   value={fmtMins(totalOvertimeMins) ?? '—'} color="text-violet-600" bg="bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900" />
                </div>

                {/* ── Filters ── */}
                <div className="bg-card rounded-2xl border border-border p-4 flex flex-wrap gap-3 items-end">
                    {branches.length > 1 && (
                        <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Салбар</label>
                            <select
                                value={selBranch}
                                onChange={e => { setSelBranch(e.target.value ? Number(e.target.value) : ''); setSelEmployee(''); }}
                                className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                <option value="">Бүгд</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Ажилтан</label>
                        <select
                            value={selEmployee}
                            onChange={e => setSelEmployee(e.target.value ? Number(e.target.value) : '')}
                            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="">Бүгд</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Сар</label>
                        <select
                            value={selMonth}
                            onChange={e => setSelMonth(Number(e.target.value))}
                            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            {MONTHS_MN.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Жил</label>
                        <select
                            value={selYear}
                            onChange={e => setSelYear(Number(e.target.value))}
                            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={applyFilter}
                        className="rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors"
                    >
                        Шүүх
                    </button>
                </div>

                {/* ── Table ── */}
                {logs.length === 0 ? (
                    <div className="bg-card rounded-2xl border border-border p-16 flex flex-col items-center gap-3">
                        <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
                            <Clock className="size-7 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground">Бүртгэл олдсонгүй</p>
                        <p className="text-xs text-muted-foreground">{MONTHS_MN[selMonth-1]} {selYear}-д бүртгэл байхгүй байна</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-2xl border border-border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-muted-foreground tracking-wide">Огноо</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold text-muted-foreground tracking-wide">Ажилтан</th>
                                    <th className="px-4 py-3.5 text-center text-xs font-bold text-muted-foreground tracking-wide">Хуваарь</th>
                                    <th className="px-4 py-3.5 text-center text-xs font-bold text-muted-foreground tracking-wide">Ирсэн</th>
                                    <th className="px-4 py-3.5 text-center text-xs font-bold text-muted-foreground tracking-wide">Тарсан</th>
                                    <th className="px-4 py-3.5 text-center text-xs font-bold text-muted-foreground tracking-wide">Хоцорсон</th>
                                    <th className="px-4 py-3.5 text-center text-xs font-bold text-muted-foreground tracking-wide">Илүү цаг</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-bold text-muted-foreground tracking-wide">Ажилласан</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-4 py-3.5">
                                            <span className="font-semibold text-xs text-foreground">{log.date}</span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="size-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shrink-0 text-white text-xs font-black">
                                                    {log.employee_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-foreground text-xs leading-tight">{log.employee_name}</p>
                                                    {log.position && <p className="text-[10px] text-muted-foreground mt-0.5">{log.position}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            {log.scheduled_start && log.scheduled_end ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                                    <Timer className="size-3 shrink-0" />
                                                    {log.scheduled_start}–{log.scheduled_end}
                                                </span>
                                            ) : <span className="text-muted-foreground text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            {log.checked_in_at ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                    {log.checked_in_at}
                                                </span>
                                            ) : <span className="text-muted-foreground text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            {log.checked_out_at ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-400">
                                                    {log.checked_out_at}
                                                </span>
                                            ) : log.checked_in_at ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-700">
                                                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                    Ажиллаж байна
                                                </span>
                                            ) : <span className="text-muted-foreground text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            {log.late_minutes ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-2.5 py-1 text-xs font-bold text-red-600">
                                                    <AlertTriangle className="size-3 shrink-0" />
                                                    {fmtMins(log.late_minutes)}
                                                </span>
                                            ) : log.checked_in_at ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                                    <CheckCircle2 className="size-3.5" /> Цагтаа
                                                </span>
                                            ) : <span className="text-muted-foreground text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            {log.overtime_minutes ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 px-2.5 py-1 text-xs font-bold text-violet-700 dark:text-violet-400">
                                                    +{fmtMins(log.overtime_minutes)}
                                                </span>
                                            ) : <span className="text-muted-foreground text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            {log.worked_minutes > 0 ? (
                                                <span className="font-bold text-foreground text-xs">{fmtMins(log.worked_minutes)}</span>
                                            ) : <span className="text-muted-foreground text-xs">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 border-border bg-muted/30">
                                <tr>
                                    <td colSpan={5} className="px-4 py-3 text-xs font-bold text-muted-foreground">
                                        Нийт {logs.length} бүртгэл
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {lateCount > 0 && (
                                            <span className="text-xs font-bold text-red-600">{lateCount} удаа</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {totalOvertimeMins > 0 && (
                                            <span className="text-xs font-bold text-violet-600">{fmtMins(totalOvertimeMins)}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-xs font-bold text-foreground">{fmtMins(totalWorked) ?? '—'}</span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
            <ToastContainer />
        </AppLayout>
    );
}
