import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import {
    ArrivalChart, type ArrivalDatum, ChartCard, HoursChart, type HoursDatum, InsightRow, LegendKey, STATUS_SERIES, StatusDonut,
    StatusStackChart, type StatusDatum, VIZ_TOKENS,
} from '@/components/hr/attendance/charts';
import { DayEditor, type EditTarget } from '@/components/hr/attendance/day-editor';
import {
    addDays, type AttendanceLog, Avatar, CheckOut, dayLabel, employeeUrl, fmtHours, fmtMins, ghostBtn, type Option, parseDay,
    type Period, PeriodPicker, type PeriodType, pillSelect, ratio, type Rules, Stat, StatStrip, Status, type SummaryRow, Time,
    todayStr, toMins, useNowMinutes, WEEKDAYS_SHORT, Worked,
} from '@/components/hr/attendance/shared';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlarmClock, ArrowLeft, Building2, CalendarClock, ChartPie, CircleCheck, Download, Gauge, Hourglass, LogIn, LogOut, PencilLine, TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

interface EmployeeInfo {
    id: number; name: string; short_name: string; number: string | null; position: string | null;
    branch: string | null; photo_url: string | null; status: string;
}
interface MonthRow { from: string; to: string; summary: SummaryRow | null }
interface PageProps {
    employee: EmployeeInfo; period: Period; summary: SummaryRow | null; logs: AttendanceLog[];
    months: MonthRow[]; rules: Rules; employees: Option[];
    [key: string]: unknown;
}

type Totals = Omit<SummaryRow, 'employee_id' | 'employee_name' | 'full_name' | 'position' | 'photo_url' | 'branch_id' | 'branch_name'>;

const EMPTY: Totals = {
    planned_days: 0, planned_minutes: 0, worked_days: 0, worked_minutes: 0, on_time_days: 0, late_count: 0, late_minutes: 0,
    early_count: 0, early_minutes: 0, overtime_minutes: 0, absent_days: 0, leave_days: 0, unscheduled_days: 0, no_checkout: 0,
};

const isIssue = (l: AttendanceLog) =>
    !!l.late_minutes || !!l.early_leave_minutes || l.no_checkout || l.status === 'absent' || l.status === 'missing';

const hours = (mins: number) => Math.round((mins / 60) * 10) / 10;

const avg = (vals: number[]) => (vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null);
const hhmm = (m: number | null) => (m === null ? '—' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);

function eachDay(from: string, to: string) {
    const out: string[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
    return out;
}

export default function HrAttendanceEmployee() {
    const { employee, period, summary, logs, months, rules, employees } = usePage<PageProps>().props;
    const [editing, setEditing] = useState<EditTarget | null>(null);
    const nowMins = useNowMinutes();
    const today = todayStr();
    const s: Totals = { ...EMPTY, ...(summary ?? {}) };
    const byDate = new Map(logs.map(l => [l.date, l]));
    const short = period.type === 'half_month' || period.type === 'month';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'HR', href: '/hr/dashboard' },
        { title: 'Ирцийн бүртгэл', href: '/hr/attendance' },
        { title: employee.short_name, href: employeeUrl(employee.id) },
    ];

    const navigate = (type: PeriodType, date?: string) =>
        router.get(employeeUrl(employee.id, { period: type, date }), {}, { preserveScroll: true, preserveState: true });

    const edit = (date: string) => {
        if (date > today) return;
        setEditing({ employee_id: employee.id, date, name: employee.short_name, photo_url: employee.photo_url });
    };

    function exportExcel() {
        const q = new URLSearchParams({ employee_id: String(employee.id), period: period.type, date: period.from });
        window.location.href = `/hr/attendance/export-excel?${q.toString()}`;
    }

    /* ── Графикийн өгөгдөл ── */
    const monthLabel = (from: string) => `${parseDay(from).getMonth() + 1}-р сар`;
    const monthTotals = (m: MonthRow): Totals => ({ ...EMPTY, ...(m.summary ?? {}) });

    // Өнөөдөр ажиллаж байгаа бол одоог хүртэлх хугацааг харуулна
    const workedOf = (l: AttendanceLog) =>
        l.worked_minutes || (l.is_today && l.checked_in_at && !l.checked_out_at ? Math.max(0, nowMins - toMins(l.checked_in_at)) : 0);

    const hoursData: HoursDatum[] = short
        ? eachDay(period.from, period.to).map(date => {
            const l = byDate.get(date);
            const future = date > today;
            const workedMin = l ? workedOf(l) : 0;
            const plannedMin = l?.scheduled_minutes ?? 0;
            return {
                key: date, label: String(Number(date.slice(8))), title: dayLabel(date),
                worked: future || !l ? null : hours(workedMin), planned: future || !l ? null : hours(plannedMin), workedMin, plannedMin,
            };
        })
        : months.map(m => {
            const t = monthTotals(m);
            return {
                key: m.from, label: `${parseDay(m.from).getMonth() + 1}-р`, title: monthLabel(m.from),
                worked: m.from > today ? null : hours(t.worked_minutes), planned: m.from > today ? null : hours(t.planned_minutes), workedMin: t.worked_minutes, plannedMin: t.planned_minutes,
            };
        });

    const arrivalData: ArrivalDatum[] = eachDay(period.from, period.to).map(date => {
        const l = byDate.get(date);
        const ok = l?.checked_in_at && l.scheduled_start;
        return {
            key: date, label: String(Number(date.slice(8))), title: dayLabel(date),
            diff: ok ? toMins(l.checked_in_at!) - toMins(l.scheduled_start!) : null,
            checkedIn: l?.checked_in_at ?? null, start: l?.scheduled_start ?? null,
        };
    });

    const statusData: StatusDatum[] = months.map(m => {
        const t = monthTotals(m);
        return {
            key: m.from, label: `${parseDay(m.from).getMonth() + 1}-р`, title: monthLabel(m.from),
            on_time: t.on_time_days, late: t.late_count, unscheduled: t.unscheduled_days, leave: t.leave_days, absent: t.absent_days,
        };
    });

    // Дундаж үзүүлэлтүүд
    const arrived = logs.filter(l => l.checked_in_at);
    const left = logs.filter(l => l.checked_out_at);
    const avgIn = avg(arrived.map(l => toMins(l.checked_in_at!)));
    const avgOut = avg(left.map(l => toMins(l.checked_out_at!)));
    const avgWorked = avg(left.map(l => l.worked_minutes));
    const mostLate = logs.reduce<AttendanceLog | null>((m, l) => ((l.late_minutes ?? 0) > (m?.late_minutes ?? 0) ? l : m), null);
    const longest = left.reduce<AttendanceLog | null>((m, l) => (l.worked_minutes > (m?.worked_minutes ?? 0) ? l : m), null);

    const workedPct = ratio(s.worked_minutes, s.planned_minutes);
    const onTimePct = ratio(s.on_time_days, s.on_time_days + s.late_count);
    const tableRows = short ? [...logs].reverse().filter(l => l.status !== 'off') : logs.filter(isIssue);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Ирц — ${employee.short_name}`} />
            <div className={`space-y-3 p-4 ${VIZ_TOKENS}`}>

                {/* ═══ Толгой + үзүүлэлтүүд ═══ */}
                <section className="overflow-hidden rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50/80 via-card to-indigo-50/60 shadow-sm dark:border-sky-800/40 dark:from-sky-950/30 dark:via-card dark:to-indigo-950/20">
                    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                        <Link href="/hr/attendance" title="Ирцийн бүртгэл рүү буцах"
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted">
                            <ArrowLeft className="size-4" />
                        </Link>
                        <Avatar name={employee.short_name} photoUrl={employee.photo_url} seed={employee.id} size="size-10" />
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-base font-bold text-foreground">
                                {employee.name}
                                {employee.status !== 'active' && <span className="ml-1.5 rounded-full bg-muted px-1.5 py-px align-middle text-[10px] font-semibold text-muted-foreground">Идэвхгүй</span>}
                            </h1>
                            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                {employee.number && <span className="tabular-nums">{employee.number}</span>}
                                <span>{employee.position ?? 'Албан тушаалгүй'}</span>
                                {employee.branch && <span className="inline-flex items-center gap-1"><Building2 className="size-3" />{employee.branch}</span>}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <select className={`${pillSelect} max-w-[190px]`} value={employee.id} title="Өөр ажилтан"
                                onChange={e => router.get(employeeUrl(Number(e.target.value), { period: period.type, date: period.from }))}>
                                {!employees.some(e => e.id === employee.id) && <option value={employee.id}>{employee.name}</option>}
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            <button onClick={exportExcel} className={ghostBtn} title="Энэ хугацааны ирцийг Excel-ээр татах">
                                <Download className="size-3.5" /><span className="hidden sm:inline">Excel</span>
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-sky-100/80 px-4 py-2 dark:border-white/10">
                        <PeriodPicker period={period} onNavigate={navigate} />
                    </div>

                    <StatStrip className="grid-cols-4 md:grid-cols-8">
                        <Stat label="Ирсэн өдөр" value={s.worked_days} sub={`/ ${s.planned_days}`} accent="sky" title={`${s.planned_days} өдөр төлөвлөсөн`} />
                        <Stat label="Ажилласан" value={fmtHours(s.worked_minutes)} sub={workedPct !== null ? `${workedPct}%` : undefined} accent="indigo"
                            title={`${fmtMins(s.worked_minutes) ?? '0'} / ${fmtMins(s.planned_minutes) ?? '0'} төлөвлөсөн`} />
                        <Stat label="Цагтаа" value={onTimePct !== null ? `${onTimePct}%` : '—'} sub={`${s.on_time_days} өд`} accent="emerald" />
                        <Stat label="Хоцорсон" value={s.late_count} sub={fmtMins(s.late_minutes) ?? undefined} accent="rose" title={`${rules.late_grace} минутаас илүү хоцорсон өдөр`} />
                        <Stat label="Эрт явсан" value={s.early_count} sub={fmtMins(s.early_minutes) ?? undefined} accent="amber" />
                        <Stat label="Илүү цаг" value={fmtHours(s.overtime_minutes)} accent="violet" title={`${rules.overtime_min} минутаас дээш үлдсэн`} />
                        <Stat label="Ирээгүй" value={s.absent_days} sub={s.no_checkout ? `${s.no_checkout} тараагүй` : undefined} accent="red" />
                        <Stat label="Чөлөө" value={s.leave_days} sub={s.unscheduled_days ? `+${s.unscheduled_days} хуваарьгүй` : undefined} accent="violet" />
                    </StatStrip>
                </section>

                {/* ═══ Графикууд ═══ */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <ChartCard title="Ажилласан цаг" icon={TrendingUp}
                        legend={<><LegendKey color="var(--att-blue)" label="Ажилласан" line={!short} /><LegendKey color={short ? 'var(--att-plan-bg)' : 'var(--att-plan)'} label="Төлөвлөсөн" line={!short} /></>}>
                        <HoursChart data={hoursData} variant={short ? 'bar' : 'area'} onPick={short ? edit : key => navigate('month', key)} />
                    </ChartCard>

                    <ChartCard title="Өдрийн бүтэц" icon={ChartPie}>
                        <StatusDonut center={onTimePct !== null ? `${onTimePct}%` : '—'} centerLabel="цагтаа ирсэн" counts={{
                            on_time: s.on_time_days, late: s.late_count, unscheduled: s.unscheduled_days, leave: s.leave_days, absent: s.absent_days,
                        }} />
                    </ChartCard>

                    {short ? (
                        <ChartCard title="Ирсэн цаг" icon={CalendarClock}
                            legend={<><LegendKey color="var(--att-blue)" label="Цагтаа" /><LegendKey color="var(--att-orange)" label="Хоцорсон" /></>}>
                            <ArrivalChart data={arrivalData} grace={rules.late_grace} onPick={edit} />
                        </ChartCard>
                    ) : (
                        <ChartCard title="Сар бүрийн ирц" icon={CalendarClock}
                            legend={STATUS_SERIES.map(x => <LegendKey key={x.key} color={x.color} label={x.label} />)}>
                            <StatusStackChart data={statusData} onPick={key => navigate('month', key)} />
                        </ChartCard>
                    )}

                    <ChartCard title="Үзүүлэлт" icon={Gauge}>
                        <div className="divide-y divide-border/50">
                            <InsightRow icon={LogIn} tone="bg-sky-500/10 text-sky-600 dark:text-sky-400" label="Дундаж ирсэн" value={hhmm(avgIn)} />
                            <InsightRow icon={LogOut} tone="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" label="Дундаж тарсан" value={hhmm(avgOut)} />
                            <InsightRow icon={Hourglass} tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" label="Өдрийн дундаж" value={fmtMins(avgWorked) ?? '—'} />
                            <InsightRow icon={AlarmClock} tone="bg-orange-500/10 text-orange-600 dark:text-orange-400" label="Хамгийн их хоцорсон"
                                value={mostLate ? fmtMins(mostLate.late_minutes) ?? '—' : '—'} sub={mostLate ? dayLabel(mostLate.date) : undefined} />
                            <InsightRow icon={TrendingUp} tone="bg-violet-500/10 text-violet-600 dark:text-violet-400" label="Хамгийн урт өдөр"
                                value={longest ? fmtMins(longest.worked_minutes) ?? '—' : '—'} sub={longest ? dayLabel(longest.date) : undefined} />
                        </div>
                    </ChartCard>
                </div>

                {/* ═══ Хүснэгтүүд ═══ */}
                {months.length > 1 && <MonthTable months={months} onPick={m => navigate('month', m)} />}

                <DayTable title={short ? 'Өдөр бүрээр' : `Анхаарах өдрүүд · ${tableRows.length}`} rows={tableRows} nowMins={nowMins} onEdit={edit}
                    empty={short ? 'Энэ хугацаанд ирц ч, хуваарь ч алга.' : 'Хоцролт, эрт явалт, тасалсан өдөр алга.'} />
            </div>
            {editing && (
                <DayEditor key={`${editing.employee_id}-${editing.date}`} target={editing} employees={employees} onClose={() => setEditing(null)} />
            )}
            <ToastContainer />
        </AppLayout>
    );
}

/* ───────────────────────── Сар бүрийн задаргаа ───────────────────────── */

function MonthTable({ months, onPick }: { months: MonthRow[]; onPick: (monthStart: string) => void }) {
    const td = 'px-2 py-1.5 text-right tabular-nums';
    const th = 'px-2 py-1.5 text-right font-semibold';
    const h = (m: number) => fmtMins(m) ?? '—';
    const today = todayStr();

    return (
        <section className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
            <table className="w-full min-w-[760px] text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                        <th className="px-3 py-1.5 text-left font-semibold">Сар</th>
                        <th className={th}>Төлөвлөсөн</th><th className={th}>Ирсэн</th><th className={th}>Ажилласан</th>
                        <th className={th}>Цагтаа</th><th className={th}>Хоцорсон</th><th className={th}>Эрт явсан</th>
                        <th className={th}>Илүү цаг</th><th className={th}>Ирээгүй</th><th className={th}>Чөлөө</th><th className={th}>Тараагүй</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {months.map(m => {
                        const s = { ...EMPTY, ...(m.summary ?? {}) };
                        const pct = ratio(s.worked_minutes, s.planned_minutes);
                        const onTime = ratio(s.on_time_days, s.on_time_days + s.late_count);
                        return (
                            <tr key={m.from} onClick={() => onPick(m.from)} title="Энэ сарын тайлан"
                                className={`cursor-pointer hover:bg-sky-50/60 dark:hover:bg-white/[0.03] ${m.from > today ? 'text-muted-foreground/50' : ''}`}>
                                <td className="px-3 py-1.5 font-semibold">{parseDay(m.from).getMonth() + 1}-р сар</td>
                                <td className={td}>{s.planned_days ? `${s.planned_days} өд · ${h(s.planned_minutes)}` : '—'}</td>
                                <td className={td}>{s.worked_days || '—'}</td>
                                <td className={td}>{s.worked_minutes ? <>{h(s.worked_minutes)}{pct !== null && <span className="ml-1 text-[10px] text-muted-foreground">{pct}%</span>}</> : '—'}</td>
                                <td className={td}>{onTime !== null ? `${onTime}%` : '—'}</td>
                                <td className={`${td} ${s.late_count ? 'font-semibold text-rose-600' : 'text-muted-foreground'}`}>{s.late_count ? `${s.late_count} · ${h(s.late_minutes)}` : '—'}</td>
                                <td className={`${td} ${s.early_count ? 'text-amber-600' : 'text-muted-foreground'}`}>{s.early_count ? `${s.early_count} · ${h(s.early_minutes)}` : '—'}</td>
                                <td className={`${td} ${s.overtime_minutes ? 'font-semibold text-violet-600' : 'text-muted-foreground'}`}>{s.overtime_minutes ? h(s.overtime_minutes) : '—'}</td>
                                <td className={`${td} ${s.absent_days ? 'font-bold text-rose-700' : 'text-muted-foreground'}`}>{s.absent_days || '—'}</td>
                                <td className={`${td} text-muted-foreground`}>{s.leave_days || '—'}</td>
                                <td className={`${td} ${s.no_checkout ? 'text-amber-600' : 'text-muted-foreground'}`}>{s.no_checkout || '—'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
}

/* ───────────────────────── Өдрийн хүснэгт ───────────────────────── */

function DayTable({ title, rows, nowMins, onEdit, empty }: {
    title: string; rows: AttendanceLog[]; nowMins: number; onEdit: (date: string) => void; empty: string;
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            <h2 className="border-b border-border/60 bg-muted/30 px-3 py-2 text-xs font-bold text-foreground">{title}</h2>
            {rows.length === 0 ? (
                <p className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-muted-foreground">
                    <CircleCheck className="size-4 text-emerald-500" />{empty}
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-xs">
                        <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            <tr className="border-b border-border/50">
                                <th className="px-3 py-1.5 text-left font-semibold">Огноо</th>
                                <th className="px-2 py-1.5 text-left font-semibold">Хуваарь</th>
                                <th className="px-2 py-1.5 text-left font-semibold">Ирсэн</th>
                                <th className="px-2 py-1.5 text-left font-semibold">Тарсан</th>
                                <th className="px-2 py-1.5 text-left font-semibold">Ажилласан</th>
                                <th className="px-3 py-1.5 text-right font-semibold">Төлөв</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {rows.map(log => {
                                const d = parseDay(log.date);
                                const weekend = d.getDay() === 0 || d.getDay() === 6;
                                return (
                                    <tr key={log.key} tabIndex={0} title="Бүртгэлүүдийг харах, гараар засах"
                                        onClick={() => onEdit(log.date)} onKeyDown={e => { if (e.key === 'Enter') onEdit(log.date); }}
                                        className="group cursor-pointer hover:bg-sky-50/60 focus-visible:bg-sky-50/60 focus-visible:outline-none dark:hover:bg-white/[0.03]">
                                        <td className={`whitespace-nowrap px-3 py-1.5 ${log.is_today ? 'text-sky-600 dark:text-sky-400' : ''}`}>
                                            <span className="font-bold tabular-nums">{String(d.getMonth() + 1).padStart(2, '0')}.{String(d.getDate()).padStart(2, '0')}</span>
                                            <span className={`ml-1.5 text-[10px] font-semibold uppercase ${weekend ? 'text-rose-500/80' : 'text-muted-foreground'}`}>{WEEKDAYS_SHORT[d.getDay()]}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                                            {log.shift_label ?? 'Хуваарьгүй'}
                                            {log.scheduled_start && <span className="tabular-nums"> · {log.scheduled_start}–{log.scheduled_end}</span>}
                                        </td>
                                        <td className="px-2 py-1.5"><Time value={log.checked_in_at} source={log.check_in_source} /></td>
                                        <td className="px-2 py-1.5"><CheckOut log={log} /></td>
                                        <td className="px-2 py-1.5"><Worked log={log} nowMins={nowMins} /></td>
                                        <td className="px-3 py-1.5">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Status log={log} />
                                                <PencilLine className="size-3 shrink-0 text-muted-foreground/40 transition group-hover:text-sky-600" />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
