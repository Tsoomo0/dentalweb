import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { DayEditor, type EditTarget } from '@/components/hr/attendance/day-editor';
import {
    type AttendanceLog, Avatar, BranchChips, type BranchKey, branchKeyOf, CheckOut, DayTimeline, dayLabel, type DayStatus,
    employeeUrl, fmtHours, fmtMins, ghostBtn, GuestBadge, type Option, parseDay, type Period, PeriodPicker, type PeriodType,
    pillSelect, ratio, type Rules, Stat, StatStrip, Status, type SummaryRow, Time, TimelineTicks, todayStr, useNowMinutes, WEEKDAYS_SHORT, Worked,
    addDays,
} from '@/components/hr/attendance/shared';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowDown, ArrowUp, Building2, CalendarDays, ChevronLeft, ChevronRight, Clock, Download, Fingerprint, ListChecks, MapPin,
    PencilLine, Plus, Search, Table2, X,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface WeekDay { date: string; rows: { b: number | null; s: DayStatus; in: boolean }[] }

interface BaseProps {
    rules: Rules; employees: Option[]; branches: Option[]; branch_id: number | null;
    [key: string]: unknown;
}
type PageProps = BaseProps & (
    | { view: 'day'; date: string; logs: AttendanceLog[]; week: WeekDay[] }
    | { view: 'report'; period: Period; summary: SummaryRow[] }
);

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/dashboard' },
    { title: 'Ирцийн бүртгэл', href: '/hr/attendance' },
];

const ROW_GRID = 'grid items-center gap-x-4 gap-y-2 grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1.3fr)_64px_124px_72px_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_64px_124px_72px_minmax(0,0.9fr)]';

/** Хуваарьт ажлын өдөр (ирсэн эсэхээс үл хамаарна) */
const SCHEDULED: DayStatus[] = ['on_time', 'late', 'present', 'absent', 'missing', 'upcoming'];

const matches = (q: string, ...names: string[]) => !q || names.some(n => n.toLowerCase().includes(q));

/** Салбаруудыг тохиргооны дарааллаар, салбаргүйг хамгийн сүүлд. */
function groupByBranch<T>(items: T[], keyOf: (item: T) => number | null, branches: Option[]) {
    const map = new Map<number | 'none', T[]>();
    for (const it of items) {
        const k = branchKeyOf(keyOf(it));
        map.set(k, [...(map.get(k) ?? []), it]);
    }
    const order: (number | 'none')[] = [...branches.map(b => b.id), 'none'];
    return order.filter(k => map.has(k)).map(k => ({
        key: k,
        name: k === 'none' ? 'Салбаргүй' : branches.find(b => b.id === k)?.name ?? 'Салбар',
        items: map.get(k)!,
    }));
}

/* ───────────────────────── Хуудас ───────────────────────── */

export default function HrAttendanceIndex() {
    const props = usePage<PageProps>().props;
    const [branch, setBranch] = useState<BranchKey>(props.branch_id ?? '');
    const [query, setQuery] = useState('');
    const [editing, setEditing] = useState<EditTarget | null>(null);

    const branchParam = typeof branch === 'number' ? branch : undefined;

    function go(params: Record<string, string | undefined>) {
        router.get('/hr/attendance', { ...params, branch_id: branchParam }, { preserveScroll: true, preserveState: true });
    }

    function exportExcel(params: Record<string, string | undefined>) {
        const q = new URLSearchParams();
        Object.entries({ ...params, branch_id: branchParam ? String(branchParam) : undefined })
            .forEach(([k, v]) => { if (v) q.set(k, v); });
        window.location.href = `/hr/attendance/export-excel?${q.toString()}`;
    }

    const shell = { branches: props.branches, branch, setBranch, query, setQuery, employees: props.employees };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ирцийн бүртгэл" />
            <div className="space-y-3 p-3 md:p-4">
                {props.view === 'day' ? (
                    <DayView {...shell} date={props.date} logs={props.logs} week={props.week}
                        go={go} onEdit={setEditing}
                        onExport={() => exportExcel({ view: 'day', date: props.date })} />
                ) : (
                    <ReportView {...shell} period={props.period} summary={props.summary}
                        go={go}
                        onExport={() => exportExcel({ period: props.period.type, date: props.period.from })} />
                )}
            </div>
            {editing && (
                <DayEditor key={`${editing.employee_id}-${editing.date}`} target={editing} employees={props.employees} onClose={() => setEditing(null)} />
            )}
            <ToastContainer />
        </AppLayout>
    );
}

/* ───────────────────────── Толгой самбар (хоёр харагдацад нийтлэг) ───────────────────────── */

interface ShellProps {
    branches: Option[]; branch: BranchKey; setBranch: (b: BranchKey) => void;
    query: string; setQuery: (q: string) => void; employees: Option[];
}

function Header({ view, go, onExport, onAdd, toolbar, kpis, counts, legend, branches, branch, setBranch, query, setQuery, employees }: ShellProps & {
    view: 'day' | 'report';
    go: (params: Record<string, string | undefined>) => void;
    onExport: () => void;
    onAdd?: () => void;
    toolbar: ReactNode; kpis: ReactNode;
    counts: Map<number | 'none', number>;
    legend?: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50/80 via-card to-indigo-50/60 shadow-sm dark:border-sky-800/40 dark:from-sky-950/30 dark:via-card dark:to-indigo-950/20">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-sm">
                    <Clock className="size-4" />
                </span>
                <h1 className="text-base font-bold text-foreground" title="Хурууны хээ болон утсаар бүртгэсэн ирсэн, тарсан цаг">Ирцийн бүртгэл</h1>
                <div className="flex h-7 items-center rounded-lg bg-white/80 p-0.5 shadow-sm ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10">
                    {([['day', 'Өдрөөр', ListChecks], ['report', 'Нэгтгэл тайлан', Table2]] as const).map(([k, label, Icon]) => (
                        <button key={k} type="button" onClick={() => k !== view && go(k === 'report' ? { view: 'report' } : {})}
                            className={`flex h-full items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition ${view === k ? 'bg-sky-600 text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}>
                            <Icon className="size-3.5" />{label}
                        </button>
                    ))}
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                    <select className={`${pillSelect} max-w-[170px]`} value="" title="Ажилтны ирцийн тайлан"
                        onChange={e => e.target.value && router.visit(employeeUrl(Number(e.target.value)))}>
                        <option value="">Ажилтны тайлан…</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    {onAdd && (
                        <button onClick={onAdd} className={ghostBtn} title="Хуруу дарахаа мартсан ажилтанд ирц нэмэх">
                            <Plus className="size-3.5" /><span className="hidden sm:inline">Ирц нэмэх</span>
                        </button>
                    )}
                    <a href="/hr/schedule" className={ghostBtn} title="Хуваарийг засах — ирц нийтлэгдсэн хуваарьтай харьцуулагдана">
                        <CalendarDays className="size-3.5" /><span className="hidden lg:inline">Хуваарь</span>
                    </a>
                    <a href="/hr/attendance/devices" className={ghostBtn} title="Хурууны хээний төхөөрөмжүүд">
                        <Fingerprint className="size-3.5" /><span className="hidden lg:inline">Төхөөрөмж</span>
                    </a>
                    <button onClick={onExport} className={ghostBtn} title="Харагдаж буй хугацааг Excel-ээр татах">
                        <Download className="size-3.5" /><span className="hidden lg:inline">Excel</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-sky-100/80 px-4 py-2 dark:border-white/10">
                {toolbar}
            </div>

            {kpis}

            <div className="flex flex-wrap items-center gap-2 border-t border-sky-100/80 bg-white/40 px-4 py-2 dark:border-white/10 dark:bg-white/[0.02]">
                <BranchChips branches={branches} counts={counts} value={branch} onChange={setBranch} />
                <label className="relative ml-auto flex items-center">
                    <Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ажилтан хайх"
                        className={`${pillSelect} w-40 pl-8 pr-7`} />
                    {query && (
                        <button type="button" onClick={() => setQuery('')} className="absolute right-1.5 rounded p-0.5 text-muted-foreground hover:text-foreground">
                            <X className="size-3.5" />
                        </button>
                    )}
                </label>
                {legend}
            </div>
        </section>
    );
}

/* ───────────────────────── Өдрөөр ───────────────────────── */

function DayView({ date, logs, week, go, onEdit, onExport, ...shell }: ShellProps & {
    date: string; logs: AttendanceLog[]; week: WeekDay[];
    go: (params: Record<string, string | undefined>) => void;
    onEdit: (t: EditTarget) => void;
    onExport: () => void;
}) {
    const nowMins = useNowMinutes();
    const today = todayStr();
    const isToday = date === today;
    const q = shell.query.trim().toLowerCase();
    const inBranch = (b: number | null) => shell.branch === '' || branchKeyOf(b) === shell.branch;

    const searched = logs.filter(l => matches(q, l.full_name, l.employee_name));
    const counts = new Map<number | 'none', number>();
    for (const l of searched) {
        if (l.status === 'off') continue;
        const k = branchKeyOf(l.branch_id);
        counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const visible = searched.filter(l => inBranch(l.branch_id));
    const groups = groupByBranch(visible, l => l.branch_id, shell.branches);

    const working = visible.filter(l => l.status !== 'off' && l.status !== 'leave');
    const present = working.filter(l => l.checked_in_at);
    const scheduled = working.filter(l => SCHEDULED.includes(l.status)).length;
    const onTime = working.filter(l => l.status === 'on_time').length;
    const late = working.filter(l => l.late_minutes);
    const absent = working.filter(l => l.status === 'absent' || l.status === 'missing').length;
    const leave = visible.filter(l => l.status === 'leave').length;
    const off = visible.filter(l => l.status === 'off').length;
    const ongoing = present.filter(l => l.is_today && !l.checked_out_at).length;
    const totalWorked = present.reduce((s, l) => s + l.worked_minutes, 0);
    const totalOvertime = present.reduce((s, l) => s + (l.overtime_minutes ?? 0), 0);

    const goDay = (d: string) => go(d === today ? {} : { date: d });

    const open = (l: AttendanceLog) => router.visit(employeeUrl(l.employee_id, { period: 'month', date: l.date }));
    const edit = (l: AttendanceLog) => onEdit({ employee_id: l.employee_id, date: l.date, name: l.employee_name, photo_url: l.photo_url });

    const navBtn = 'flex h-full w-7 items-center justify-center text-muted-foreground transition hover:bg-black/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-white/10';

    const toolbar = (
        <>
            <div className="flex h-7 items-center overflow-hidden rounded-lg bg-white/80 shadow-sm ring-1 ring-black/5 backdrop-blur dark:bg-white/[0.06] dark:ring-white/10">
                <button type="button" onClick={() => goDay(addDays(date, -1))} title="Өмнөх өдөр" className={navBtn}><ChevronLeft className="size-4" /></button>
                <label className="relative flex h-full min-w-[140px] cursor-pointer items-center justify-center gap-1.5 px-1 text-[11px] font-bold text-foreground" title="Өдөр сонгох">
                    <CalendarDays className="size-3.5 text-sky-500" />{dayLabel(date)}
                    <input type="date" value={date} max={today} onChange={e => e.target.value && goDay(e.target.value)}
                        className="absolute inset-0 cursor-pointer opacity-0" />
                </label>
                <button type="button" disabled={isToday} onClick={() => goDay(addDays(date, 1))} title="Дараагийн өдөр" className={navBtn}><ChevronRight className="size-4" /></button>
            </div>
            {!isToday && <button type="button" onClick={() => goDay(today)} className={ghostBtn}>Өнөөдөр</button>}
            <WeekStrip week={week} date={date} today={today} inBranch={inBranch} onPick={goDay} />
        </>
    );

    const lateMins = late.reduce((a, l) => a + (l.late_minutes ?? 0), 0);
    const kpis = (
        <StatStrip className="grid-cols-3 md:grid-cols-6">
            <Stat label="Ирсэн" value={present.length} sub={`/ ${scheduled}`} accent="sky" title={`${scheduled} хүн хуваарьтай`} />
            <Stat label="Цагтаа" value={onTime} sub={ratio(onTime, onTime + late.length) !== null ? `${ratio(onTime, onTime + late.length)}%` : undefined} accent="emerald" />
            <Stat label="Хоцорсон" value={late.length} sub={fmtMins(lateMins) ?? undefined} accent="rose" />
            <Stat label={isToday ? 'Ирээгүй байна' : 'Ирээгүй'} value={absent} accent="red" />
            <Stat label="Чөлөө / амралт" value={leave} sub={off ? `+${off} амралт` : undefined} accent="violet" />
            {isToday
                ? <Stat label="Ажиллаж байна" value={ongoing} accent="amber" />
                : <Stat label="Нийт ажилласан" value={fmtHours(totalWorked)} sub={totalOvertime ? `+${fmtMins(totalOvertime)}` : undefined} accent="amber" />}
        </StatStrip>
    );

    const legend = (
        <div className="hidden items-center gap-4 text-[11px] text-muted-foreground xl:flex">
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded border border-dashed border-sky-400/70 bg-sky-400/5" />Хуваарь</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />Ажилласан</span>
            <span className="flex items-center gap-1"><Fingerprint className="size-3 text-sky-500/80" />Хурууны хээ</span>
            <span className="flex items-center gap-1"><MapPin className="size-3 text-sky-500/80" />Утсаар</span>
            <span className="flex items-center gap-1"><PencilLine className="size-3 text-sky-500/80" />Гараар</span>
        </div>
    );

    return (
        <>
            <Header view="day" go={go} onExport={onExport} toolbar={toolbar} kpis={kpis} counts={counts} legend={legend}
                onAdd={() => onEdit({ employee_id: '', date, name: null, photo_url: null })} {...shell} />

            {working.length === 0 && leave === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-4 py-14 text-center">
                    <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-600 dark:from-sky-950/50 dark:to-indigo-950/50 dark:text-sky-300">
                        <Clock className="size-5" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">Бүртгэл алга</p>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                        {q ? `«${shell.query}» нэртэй ажилтан энэ өдөр алга.` : `${dayLabel(date)}-нд ирц ч, нийтлэгдсэн хуваарь ч алга.`}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {/* Баганын гарчиг — бүх салбарын картад нийтлэг */}
                    <div className={`${ROW_GRID} hidden px-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid`}>
                        <span>Ажилтан</span>
                        <TimelineTicks />
                        <span>Ирсэн</span>
                        <span>Тарсан</span>
                        <span>Ажилласан</span>
                        <span className="text-right">Төлөв</span>
                    </div>

                    {groups.map(g => {
                        const rows = g.items.filter(l => l.status !== 'leave' && l.status !== 'off');
                        const leaves = g.items.filter(l => l.status === 'leave');
                        const offs = g.items.filter(l => l.status === 'off');
                        const gPresent = rows.filter(l => l.checked_in_at).length;
                        const gScheduled = rows.filter(l => SCHEDULED.includes(l.status)).length;
                        const gLate = rows.filter(l => l.late_minutes).length;
                        const gAbsent = rows.filter(l => l.status === 'absent' || l.status === 'missing').length;
                        const gOngoing = rows.filter(l => l.is_today && l.checked_in_at && !l.checked_out_at).length;

                        return (
                            <section key={String(g.key)} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                                <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-border/60 bg-gradient-to-r from-muted/60 via-muted/20 to-transparent px-4 py-1.5">
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-400 to-sky-600 text-white shadow-sm">
                                        <Building2 className="size-3.5" />
                                    </span>
                                    <p className="text-[13px] font-bold text-foreground">{g.name}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        <span className="font-semibold text-foreground">{gPresent}</span>{gScheduled ? ` / ${gScheduled}` : ''} ирсэн
                                        {gOngoing > 0 && <> · <span className="font-medium text-emerald-600 dark:text-emerald-400">{gOngoing} ажиллаж байна</span></>}
                                        {gLate > 0 && <> · <span className="font-medium text-rose-600 dark:text-rose-400">{gLate} хоцорсон</span></>}
                                        {gAbsent > 0 && <> · <span className="font-semibold text-rose-700 dark:text-rose-400">{gAbsent} ирээгүй</span></>}
                                    </p>
                                </header>

                                <div className="divide-y divide-border/50">
                                    {rows.map(log => (
                                        <div key={log.key} role="link" tabIndex={0} title="Дарж ажилтны ирцийн тайланг харах"
                                            onClick={() => open(log)} onKeyDown={e => { if (e.key === 'Enter') open(log); }}
                                            className={`${ROW_GRID} group cursor-pointer px-4 py-1.5 transition-colors hover:bg-sky-50/60 focus-visible:bg-sky-50/60 focus-visible:outline-none dark:hover:bg-white/[0.03]`}>
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <Avatar name={log.employee_name} photoUrl={log.photo_url} seed={log.employee_id} size="size-7" />
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-semibold leading-tight text-foreground group-hover:text-sky-700 dark:group-hover:text-sky-300">
                                                        {log.employee_name}
                                                    </p>
                                                    <p className="flex min-w-0 items-center gap-1 truncate text-[10px] leading-tight text-muted-foreground">
                                                        <GuestBadge log={log} />
                                                        {log.position ?? 'Албан тушаалгүй'}
                                                        {log.scheduled_start && log.scheduled_end && <span className="tabular-nums"> · {log.scheduled_start}–{log.scheduled_end}</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="hidden lg:block"><DayTimeline log={log} nowMins={nowMins} /></div>
                                            <div className="hidden sm:block"><Time value={log.checked_in_at} source={log.check_in_source} /></div>
                                            <div className="hidden sm:block"><CheckOut log={log} /></div>
                                            <div className="hidden sm:block"><Worked log={log} nowMins={nowMins} /></div>
                                            <div className="flex items-center justify-end gap-1.5">
                                                <div className="flex flex-col items-end gap-1">
                                                    {/* Гар утсанд цагууд статусын дээр */}
                                                    <span className="flex items-center gap-1.5 sm:hidden">
                                                        <Time value={log.checked_in_at} source={log.check_in_source} />
                                                        <span className="text-muted-foreground/50">→</span>
                                                        <CheckOut log={log} />
                                                    </span>
                                                    <Status log={log} />
                                                </div>
                                                <button type="button" title="Бүртгэлүүдийг харах, гараар засах"
                                                    onClick={e => { e.stopPropagation(); edit(log); }}
                                                    className="rounded-md p-1.5 text-muted-foreground/60 transition hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300">
                                                    <PencilLine className="size-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {rows.length === 0 && <p className="px-4 py-3 text-xs text-muted-foreground">Энэ өдөр ажилласан хүн алга.</p>}
                                </div>

                                {(leaves.length > 0 || offs.length > 0) && (
                                    <footer className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 bg-muted/20 px-4 py-1.5">
                                        <PeopleLine label="Чөлөөтэй" tone="text-violet-700 dark:text-violet-300" people={leaves} />
                                        <PeopleLine label="Амралт" tone="text-muted-foreground" people={offs} />
                                    </footer>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}
        </>
    );
}

/** Салбарын картын доод мөр — чөлөөтэй/амарч буй хүмүүс (дарвал ажилтны тайлан). */
function PeopleLine({ label, tone, people }: { label: string; tone: string; people: AttendanceLog[] }) {
    if (people.length === 0) return null;
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[11px] font-semibold ${tone}`}>{label}:</span>
            {people.map(p => (
                <a key={p.key} href={employeeUrl(p.employee_id, { period: 'month', date: p.date })}
                    className="flex items-center gap-1.5 rounded-full bg-card py-0.5 pl-0.5 pr-2 text-[11px] font-medium text-foreground shadow-sm ring-1 ring-border transition hover:ring-sky-400">
                    <Avatar name={p.employee_name} photoUrl={p.photo_url} seed={p.employee_id} size="size-5" />
                    {p.employee_name}
                </a>
            ))}
        </div>
    );
}

/** Долоо хоногийн өдрүүд — өдөр бүрт ирсэн / хоцорсон / ирээгүйн товч тоо (сонгосон салбараар). */
function WeekStrip({ week, date, today, inBranch, onPick }: {
    week: WeekDay[]; date: string; today: string; inBranch: (b: number | null) => boolean; onPick: (d: string) => void;
}) {
    return (
        <div className="flex items-center gap-1">
            {week.map(d => {
                const rows = d.rows.filter(r => inBranch(r.b));
                const present = rows.filter(r => r.in).length;
                const issues = rows.filter(r => r.s === 'late' || r.s === 'absent' || r.s === 'missing').length;
                const future = d.date > today;
                const active = d.date === date;
                const day = parseDay(d.date);
                return (
                    <button key={d.date} type="button" disabled={future} onClick={() => onPick(d.date)}
                        title={future ? 'Ирээдүйн өдөр' : `${dayLabel(d.date)} · ${present} ирсэн${issues ? ` · ${issues} хоцорсон/ирээгүй` : ''}`}
                        className={`flex h-7 w-10 flex-col items-center justify-center rounded-md text-[9px] font-semibold leading-none shadow-sm ring-1 transition disabled:opacity-35 ${active
                            ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white ring-white/20'
                            : `bg-white/80 text-muted-foreground ring-black/5 hover:text-foreground dark:bg-white/[0.06] dark:ring-white/10 ${d.date === today ? 'ring-2 ring-sky-400/60' : ''}`}`}>
                        <span className="uppercase tracking-wide opacity-80">{WEEKDAYS_SHORT[day.getDay()]} {day.getDate()}</span>
                        {!future && (
                            <span className="mt-0.5 flex items-center gap-1 tabular-nums">
                                <span className={active ? 'text-white' : 'text-foreground'}>{present}</span>
                                {issues > 0 && <span className={`rounded px-0.5 ${active ? 'bg-white/25 text-white' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'}`}>{issues}</span>}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/* ───────────────────────── Нэгтгэл тайлан ───────────────────────── */

type SortKey = 'name' | 'planned' | 'worked_days' | 'worked' | 'on_time' | 'late' | 'early' | 'overtime' | 'absent' | 'leave' | 'no_checkout';

const onTimeRate = (r: Pick<SummaryRow, 'on_time_days' | 'late_count'>) => ratio(r.on_time_days, r.on_time_days + r.late_count);

const SORT_VALUE: Record<SortKey, (r: SummaryRow) => number | string> = {
    name: r => r.employee_name,
    planned: r => r.planned_minutes,
    worked_days: r => r.worked_days,
    worked: r => r.worked_minutes,
    on_time: r => onTimeRate(r) ?? -1,
    late: r => r.late_minutes,
    early: r => r.early_minutes,
    overtime: r => r.overtime_minutes,
    absent: r => r.absent_days,
    leave: r => r.leave_days,
    no_checkout: r => r.no_checkout,
};

const NUM_KEYS = ['planned_days', 'planned_minutes', 'worked_days', 'worked_minutes', 'on_time_days', 'late_count', 'late_minutes',
    'early_count', 'early_minutes', 'overtime_minutes', 'absent_days', 'leave_days', 'unscheduled_days', 'no_checkout'] as const;
type Totals = Record<(typeof NUM_KEYS)[number], number>;

function totalsOf(rows: SummaryRow[]): Totals {
    const t = Object.fromEntries(NUM_KEYS.map(k => [k, 0])) as Totals;
    for (const r of rows) for (const k of NUM_KEYS) t[k] += r[k];
    return t;
}

function ReportView({ period, summary, go, onExport, ...shell }: ShellProps & {
    period: Period; summary: SummaryRow[];
    go: (params: Record<string, string | undefined>) => void;
    onExport: () => void;
}) {
    const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });
    const q = shell.query.trim().toLowerCase();

    const searched = summary.filter(r => matches(q, r.full_name, r.employee_name));
    const counts = new Map<number | 'none', number>();
    for (const r of searched) {
        const k = branchKeyOf(r.branch_id);
        counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const visible = searched.filter(r => shell.branch === '' || branchKeyOf(r.branch_id) === shell.branch);

    const val = SORT_VALUE[sort.key];
    const sorted = [...visible].sort((a, b) => {
        const x = val(a), y = val(b);
        const c = typeof x === 'string' ? x.localeCompare(String(y)) : x - (y as number);
        return c * sort.dir || a.employee_name.localeCompare(b.employee_name);
    });
    const groups = groupByBranch(sorted, r => r.branch_id, shell.branches);

    const t = totalsOf(visible);
    const navigate = (type: PeriodType, date?: string) => go({ view: 'report', period: type, date });

    const kpis = (
        <StatStrip className="grid-cols-3 md:grid-cols-6">
            <Stat label="Ажилтан" value={visible.length} sub={`${t.worked_days} өдөр`} accent="sky" title={`Нийт ${t.worked_days} ирсэн өдөр`} />
            <Stat label="Ажилласан" value={fmtHours(t.worked_minutes)} sub={ratio(t.worked_minutes, t.planned_minutes) !== null ? `${ratio(t.worked_minutes, t.planned_minutes)}%` : undefined}
                accent="indigo" title={`Төлөвлөсөн ${fmtMins(t.planned_minutes) ?? '0'}, ажилласан ${fmtMins(t.worked_minutes) ?? '0'}`} />
            <Stat label="Цагтаа" value={onTimeRate(t) !== null ? `${onTimeRate(t)}%` : '—'} sub={`${t.on_time_days} өд`} accent="emerald" />
            <Stat label="Хоцорсон" value={t.late_count} sub={fmtMins(t.late_minutes) ?? undefined} accent="rose" />
            <Stat label="Ирээгүй" value={t.absent_days} sub={t.leave_days ? `${t.leave_days} чөлөө` : undefined} accent="red" />
            <Stat label="Илүү цаг" value={fmtHours(t.overtime_minutes)} sub={t.early_count ? `${t.early_count} эрт явсан` : undefined} accent="violet" />
        </StatStrip>
    );

    const th = (key: SortKey, label: string, align = 'text-right') => (
        <th className={`px-2 py-1.5 font-semibold ${align}`}>
            <button type="button" onClick={() => setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'name' ? 1 : -1 }))}
                className={`inline-flex items-center gap-0.5 uppercase tracking-wider hover:text-foreground ${sort.key === key ? 'text-foreground' : ''}`}>
                {label}
                {sort.key === key && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
            </button>
        </th>
    );

    return (
        <>
            <Header view="report" go={go} onExport={onExport} toolbar={<PeriodPicker period={period} onNavigate={navigate} />}
                kpis={kpis} counts={counts} {...shell} />

            {visible.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-card px-4 py-14 text-center text-sm text-muted-foreground">
                    {q ? `«${shell.query}» нэртэй ажилтан алга.` : `${period.label}-д хуваарь ч, ирц ч алга.`}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-sm">
                    <table className="w-full min-w-[960px] text-xs">
                        <thead className="bg-muted/50 text-[10px] text-muted-foreground">
                            <tr>
                                {th('name', 'Ажилтан', 'text-left pl-3')}
                                {th('planned', 'Төлөвлөсөн')}{th('worked_days', 'Ирсэн өдөр')}{th('worked', 'Ажилласан')}
                                {th('on_time', 'Цагтаа')}{th('late', 'Хоцорсон')}{th('early', 'Эрт явсан')}{th('overtime', 'Илүү цаг')}
                                {th('absent', 'Ирээгүй')}{th('leave', 'Чөлөө')}{th('no_checkout', 'Тараагүй')}
                            </tr>
                        </thead>
                        {groups.map(g => (
                            <tbody key={String(g.key)} className="divide-y divide-border/50 border-t border-border/70">
                                <tr className="bg-gradient-to-r from-indigo-50/80 to-transparent dark:from-indigo-950/30">
                                    <td colSpan={11} className="px-3 py-1.5">
                                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 dark:text-indigo-300">
                                            <Building2 className="size-3.5" />{g.name}
                                            <span className="font-medium text-muted-foreground">· {g.items.length} ажилтан</span>
                                        </span>
                                    </td>
                                </tr>
                                {g.items.map(r => (
                                    <SummaryLine key={r.employee_id} row={r}
                                        onClick={() => router.visit(employeeUrl(r.employee_id, { period: period.type, date: period.from }))} />
                                ))}
                                {groups.length > 1 && <TotalsLine label={`${g.name} · нийт`} totals={totalsOf(g.items)} subtle />}
                            </tbody>
                        ))}
                        <tfoot className="border-t-2 border-border">
                            <TotalsLine label={`Нийт · ${visible.length} ажилтан`} totals={t} />
                        </tfoot>
                    </table>
                </div>
            )}
        </>
    );
}

const td = 'px-2 py-1 text-right tabular-nums';
const h = (m: number) => fmtMins(m) ?? '—';

function SummaryLine({ row: r, onClick }: { row: SummaryRow; onClick: () => void }) {
    const workedPct = ratio(r.worked_minutes, r.planned_minutes);
    const onTime = onTimeRate(r);
    return (
        <tr onClick={onClick} className="cursor-pointer hover:bg-sky-50/60 dark:hover:bg-white/[0.03]" title="Дарж ажилтны ирцийн тайланг харах">
            <td className="py-1.5 pl-3 pr-2">
                <div className="flex items-center gap-2">
                    <Avatar name={r.employee_name} photoUrl={r.photo_url} seed={r.employee_id} size="size-6" />
                    <p className="min-w-0 truncate">
                        <span className="font-semibold">{r.employee_name}</span>
                        <span className="ml-1.5 text-[10px] text-muted-foreground">{r.position ?? ''}</span>
                    </p>
                </div>
            </td>
            <td className={td}>{r.planned_days ? <>{r.planned_days}<span className="text-[10px] text-muted-foreground"> өд · {h(r.planned_minutes)}</span></> : '—'}</td>
            <td className={td}>
                {r.worked_days || '—'}
                {r.unscheduled_days > 0 && <span className="ml-1 text-[10px] text-muted-foreground" title="Хуваарьгүй өдөр ажилласан">+{r.unscheduled_days}</span>}
            </td>
            <td className={td}>
                <span className="inline-flex items-center gap-1.5">
                    {h(r.worked_minutes)}
                    {workedPct !== null && (
                        <span className="h-1 w-10 overflow-hidden rounded-full bg-muted" title={`Төлөвлөсний ${workedPct}%`}>
                            <span className={`block h-full rounded-full ${workedPct < 90 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, workedPct)}%` }} />
                        </span>
                    )}
                    {workedPct !== null && <span className={`w-8 text-[10px] ${workedPct < 90 ? 'text-amber-600' : 'text-muted-foreground'}`}>{workedPct}%</span>}
                </span>
            </td>
            <td className={`${td} ${onTime !== null && onTime < 80 ? 'font-semibold text-amber-600' : ''}`}>{onTime !== null ? `${onTime}%` : '—'}</td>
            <td className={`${td} ${r.late_count ? 'font-semibold text-rose-600' : 'text-muted-foreground'}`}>{r.late_count ? <>{r.late_count}<span className="text-[10px] font-normal"> · {h(r.late_minutes)}</span></> : '—'}</td>
            <td className={`${td} ${r.early_count ? 'text-amber-600' : 'text-muted-foreground'}`}>{r.early_count ? <>{r.early_count}<span className="text-[10px]"> · {h(r.early_minutes)}</span></> : '—'}</td>
            <td className={`${td} ${r.overtime_minutes ? 'font-semibold text-violet-600' : 'text-muted-foreground'}`}>{r.overtime_minutes ? h(r.overtime_minutes) : '—'}</td>
            <td className={`${td} ${r.absent_days ? 'font-bold text-rose-700' : 'text-muted-foreground'}`}>{r.absent_days || '—'}</td>
            <td className={`${td} text-muted-foreground`}>{r.leave_days || '—'}</td>
            <td className={`${td} ${r.no_checkout ? 'text-amber-600' : 'text-muted-foreground'}`}>{r.no_checkout || '—'}</td>
        </tr>
    );
}

function TotalsLine({ label, totals: t, subtle }: { label: string; totals: Totals; subtle?: boolean }) {
    const onTime = onTimeRate(t);
    return (
        <tr className={subtle ? 'bg-muted/25 font-semibold text-foreground/80' : 'bg-muted/40 font-bold'}>
            <td className="px-3 py-1.5">{label}</td>
            <td className={td}>{t.planned_days}<span className="text-[10px] font-medium text-muted-foreground"> өд · {h(t.planned_minutes)}</span></td>
            <td className={td}>{t.worked_days}</td>
            <td className={td}>{h(t.worked_minutes)}</td>
            <td className={td}>{onTime !== null ? `${onTime}%` : '—'}</td>
            <td className={td}>{t.late_count}</td>
            <td className={td}>{t.early_count}</td>
            <td className={td}>{h(t.overtime_minutes)}</td>
            <td className={td}>{t.absent_days}</td>
            <td className={td}>{t.leave_days}</td>
            <td className={td}>{t.no_checkout}</td>
        </tr>
    );
}
