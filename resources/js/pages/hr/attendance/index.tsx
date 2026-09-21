import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { HR_PANEL_FX } from '@/components/hr/document-status';
import { HrEmpty, HrGhostButton, HrListCard, HrPager, HrPanel, HrSelect, usePaged } from '@/components/hr/page-panel';
import { AlertTriangle, CheckCircle2, Clock, Download, Timer, TrendingUp } from 'lucide-react';
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

/** Толгой самбарын доор харагдах товч үзүүлэлт. */
function StatChip({ icon: Icon, label, value, tone }: {
    icon: React.ElementType; label: string; value: string | number; tone: string;
}) {
    return (
        <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-background/70 px-3 py-2 shadow-sm backdrop-blur">
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm ring-1 ring-inset ring-white/25 ${tone}`}>
                <Icon className="size-4" />
            </span>
            <div className="min-w-0">
                <p className="truncate text-[13px] font-bold leading-tight tabular-nums text-foreground">{value}</p>
                <p className="truncate text-[10px] leading-tight text-muted-foreground">{label}</p>
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

    /** Шүүлтүүр солигдонгуут шууд сервер рүү явуулна. */
    function applyFilter(next: Partial<{ year: number; month: number; employee: number | ''; branch: number | '' }> = {}) {
        const y = next.year ?? selYear;
        const m = next.month ?? selMonth;
        const emp = next.employee !== undefined ? next.employee : selEmployee;
        const br = next.branch !== undefined ? next.branch : selBranch;

        router.get('/hr/attendance', {
            year: y, month: m,
            employee_id: emp || undefined,
            branch_id: br || undefined,
        }, { preserveScroll: true, preserveState: true, replace: true });
    }

    function exportExcel() {
        const params = new URLSearchParams();
        params.set('year', String(selYear));
        params.set('month', String(selMonth));
        if (selEmployee) params.set('employee_id', String(selEmployee));
        if (selBranch) params.set('branch_id', String(selBranch));
        window.location.href = `/hr/attendance/export-excel?${params.toString()}`;
    }

    const paged = usePaged(logs);

    const totalWorked       = logs.reduce((s, l) => s + l.worked_minutes, 0);
    const lateCount         = logs.filter(l => l.late_minutes).length;
    const totalOvertimeMins = logs.reduce((s, l) => s + (l.overtime_minutes ?? 0), 0);
    const onTimeCount       = logs.filter(l => l.checked_in_at && !l.late_minutes).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-3 p-4 md:p-5">

                <HrPanel
                    tone="sky"
                    icon={Clock}
                    title="Ирцийн бүртгэл"
                    badge={`${MONTHS_MN[month - 1]} ${year}`}
                    subtitle={`${logs.length} бүртгэл · хуруу дарсан цагийн түүх`}
                    actions={
                        <HrGhostButton icon={Download} onClick={exportExcel} title="Excel татах">Excel татах</HrGhostButton>
                    }
                    filters={
                        <>
                            {branches.length > 1 && (
                                <HrSelect tone="sky" title="Салбар" value={String(selBranch)}
                                    onChange={v => {
                                        const br = v ? Number(v) : '';
                                        setSelBranch(br); setSelEmployee('');
                                        applyFilter({ branch: br, employee: '' });
                                    }}>
                                    <option value="">Бүх салбар</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </HrSelect>
                            )}

                            <HrSelect tone="sky" title="Ажилтан" value={String(selEmployee)}
                                onChange={v => {
                                    const emp = v ? Number(v) : '';
                                    setSelEmployee(emp); applyFilter({ employee: emp });
                                }}>
                                <option value="">Бүх ажилтан</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </HrSelect>

                            <HrSelect tone="sky" title="Сар" value={String(selMonth)}
                                onChange={v => { setSelMonth(Number(v)); applyFilter({ month: Number(v) }); }}>
                                {MONTHS_MN.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </HrSelect>

                            <HrSelect tone="sky" title="Он" value={String(selYear)}
                                onChange={v => { setSelYear(Number(v)); applyFilter({ year: Number(v) }); }}>
                                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y} он</option>)}
                            </HrSelect>
                        </>
                    }
                >
                    <div className="relative grid grid-cols-2 gap-2 px-4 pb-3.5 sm:grid-cols-4">
                        <StatChip icon={Clock} label="Нийт ажилласан" value={fmtMins(totalWorked) ?? '—'}
                            tone="from-sky-400 to-blue-600 shadow-blue-600/30" />
                        <StatChip icon={CheckCircle2} label="Цагтаа ирсэн" value={`${onTimeCount} удаа`}
                            tone="from-emerald-400 to-emerald-600 shadow-emerald-600/30" />
                        <StatChip icon={AlertTriangle} label="Хоцорсон" value={`${lateCount} удаа`}
                            tone="from-rose-400 to-red-600 shadow-red-600/30" />
                        <StatChip icon={TrendingUp} label="Нийт илүү цаг" value={fmtMins(totalOvertimeMins) ?? '—'}
                            tone="from-violet-400 to-violet-600 shadow-violet-600/30" />
                    </div>
                </HrPanel>

                {/* ── Table ── */}
                {logs.length === 0 ? (
                    <HrEmpty tone="sky" icon={Clock} title="Бүртгэл олдсонгүй"
                        hint={`${MONTHS_MN[selMonth - 1]} ${selYear}-д хуруу дарсан бүртгэл алга байна.`} />
                ) : (
                    <HrListCard className="overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 bg-gradient-to-b from-muted/70 to-muted/25 text-[10px] uppercase tracking-wider backdrop-blur">
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
                                {paged.data.map(log => (
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

                        <HrPager page={paged.page} lastPage={paged.lastPage} from={paged.from} to={paged.to}
                            total={paged.total} unit="бүртгэл" onPage={paged.setPage} />
                    </HrListCard>
                )}
            </div>
            <style>{HR_PANEL_FX}</style>
            <ToastContainer />
        </AppLayout>
    );
}
