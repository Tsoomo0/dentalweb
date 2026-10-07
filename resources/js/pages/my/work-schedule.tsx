import MyLayout from '@/layouts/my-layout';
import { ChatIcon } from '@/components/chat-icon';
import { NotificationBell } from '@/components/notification-bell';
import { ToastContainer } from '@/components/toast';
import { DOW_FULL, DOW_SHORT, MONTHS, dowIndex, fmtHours, inkOn, parseDS, todayDS } from '@/components/schedule/types';
import {
    ArrivalChart, type ArrivalDatum, ChartCard, HoursChart, type HoursDatum, InsightRow, LegendKey, StatusDonut, VIZ_TOKENS,
} from '@/components/hr/attendance/charts';
import {
    type AttendanceLog, CheckOut, dayLabel, type DayStatus, DayTimeline, fmtMins, Stat, Status, TICKS, tickLeft, Time, toMins,
    useNowMinutes, Worked,
} from '@/components/hr/attendance/shared';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlarmClock, ArrowLeftRight, Ban, Building2, CalendarClock, CalendarDays, CalendarRange, ChartPie, Check, ChevronLeft, ChevronRight,
    Clock, DoorOpen, Fingerprint, Gauge, Hourglass, LogIn, LogOut, MapPin, Stethoscope, TrendingUp, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

/**
 * Ажилтны өөрийн хуваарь: нийтлэгдсэн ээлж + ирц (ирсэн, тарсан, ажилласан цаг, хоцролт),
 * "боломжгүй өдөр" тэмдэглэх, ээлж шилжүүлэх/солилцох хүсэлт.
 *
 * Утсанд нэг багана; компьютерт (lg+) томоохон хуанли + сонгосон өдрийн хажуу самбар.
 */

interface DayShift {
    id: number; kind: 'work' | 'off'; name: string; code: string | null; color: string;
    start_time: string | null; end_time: string | null; minutes: number;
    branch: string | null; doctor: string | null; room: string | null; note: string | null; swap_pending: boolean;
}
interface DayAttendance { in: string | null; out: string | null; status: string | null; late: number; worked: number }
interface Day {
    date: string; shifts: DayShift[];
    leave: { type: string; label: string; status: string } | null;
    unavailable: { id: number; note: string | null } | null;
    attendance: DayAttendance | null;
}
interface Swap {
    id: number; direction: 'in' | 'out'; status: string; status_label: string; is_swap: boolean;
    other: string | null; shift: string | null; target_shift: string | null; note: string | null;
    rejection_reason: string | null; can_respond: boolean; can_cancel: boolean;
}
interface Colleague { id: number; name: string; position: string | null; same_position: boolean; shifts: { id: number; date: string; label: string }[] }
interface Employee { id: number; full_name: string; position: string | null; branch: string | null; photo_url: string | null; initials: string }
interface PageProps {
    employee: Employee | null;
    month?: string; days?: Day[]; swaps?: Swap[]; colleagues?: Colleague[]; late_grace?: number;
    [key: string]: unknown;
}

type SwapTarget = DayShift & { date: string };

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
    on_time: { label: 'Цагтаа', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
    late: { label: 'Хоцорсон', cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
    absent: { label: 'Ирээгүй', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300', dot: 'bg-rose-600' },
    missing: { label: 'Ирээгүй байна', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
    unscheduled: { label: 'Хуваарьгүй өдөр', cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-300', dot: 'bg-sky-400' },
    present: { label: 'Ирсэн', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
    leave: { label: 'Чөлөөтэй', cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
};

const HEADER_BG = 'linear-gradient(160deg, #ef4444 0%, #dc2626 30%, #b91c1c 65%, #7f1d1d 100%)';
const card = { background: 'var(--my-card-bg)' };
const pill = { background: 'var(--my-pill-bg)' };

const dayTitle = (date: string) => `${MONTHS[parseDS(date).getMonth()]}ын ${parseDS(date).getDate()}`;

function toggleUnavailable(day: Day) {
    const note = day.unavailable ? null : prompt('Шалтгаан (заавал биш):') ?? undefined;
    if (note === undefined && !day.unavailable) return;
    router.post('/my/work-schedule/availability', { date: day.date, note }, { preserveScroll: true });
}

export default function MyWorkSchedule() {
    const { employee, month = '', days = [], swaps = [], colleagues = [], late_grace = 5 } = usePage<PageProps>().props;
    const today = todayDS();
    const [selected, setSelected] = useState<string>(() => days.some(d => d.date === today) ? today : days[0]?.date ?? today);
    const [swapFor, setSwapFor] = useState<SwapTarget | null>(null);

    useEffect(() => {
        if (!days.some(d => d.date === selected)) setSelected(days.some(d => d.date === today) ? today : days[0]?.date ?? today);
    }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

    const stats = useMemo(() => {
        const work = days.filter(d => d.shifts.some(s => s.kind === 'work'));
        const late = days.filter(d => (d.attendance?.late ?? 0) > 0);
        return {
            workDays: work.length,
            minutes: work.reduce((a, d) => a + d.shifts.reduce((b, s) => b + s.minutes, 0), 0),
            worked: days.reduce((a, d) => a + (d.attendance?.worked ?? 0), 0),
            late: late.length,
            lateMinutes: late.reduce((a, d) => a + (d.attendance?.late ?? 0), 0),
        };
    }, [days]);

    if (!employee) {
        return (
            <MyLayout breadcrumbs={[{ title: 'Ажлын хуваарь', href: '/my/work-schedule' }]}>
                <Head title="Ажлын хуваарь" />
                <p className="p-8 text-center text-sm text-muted-foreground">Таны ажилтны бүртгэл олдсонгүй. HR-т хандана уу.</p>
            </MyLayout>
        );
    }

    const [y, m] = month.split('-').map(Number);
    const go = (dy: number) => {
        const d = new Date(y, m - 1 + dy, 1);
        router.get('/my/work-schedule', { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }, { preserveState: true, preserveScroll: true });
    };

    const view = {
        employee, y, m, days, today, selected, setSelected, stats, go, swaps,
        day: days.find(d => d.date === selected),
        lead: days.length ? dowIndex(days[0].date) : 0,
        isCurrentMonth: month === today.slice(0, 7),
        onSwap: setSwapFor,
        grace: late_grace,
    };

    return (
        <MyLayout breadcrumbs={[{ title: 'Ажлын хуваарь', href: '/my/work-schedule' }]}>
            <Head title="Ажлын хуваарь" />
            <div className="flex-1 overflow-y-auto pb-28 md:pb-8" style={{ background: 'var(--my-page-bg)', WebkitOverflowScrolling: 'touch' }}>
                <div className="lg:hidden"><MobileView {...view} /></div>
                <div className="hidden lg:block"><DesktopView {...view} /></div>
            </div>

            {swapFor && <SwapDialog shift={swapFor} colleagues={colleagues} onClose={() => setSwapFor(null)} />}
            <ToastContainer />
        </MyLayout>
    );
}

interface ViewProps {
    employee: Employee; y: number; m: number; days: Day[]; today: string;
    selected: string; setSelected: (d: string) => void;
    stats: { workDays: number; minutes: number; worked: number; late: number; lateMinutes: number };
    go: (dy: number) => void; swaps: Swap[]; day: Day | undefined; lead: number; isCurrentMonth: boolean;
    onSwap: (s: SwapTarget) => void;
    grace: number;
}

/* ═══════════════════════════ Утас / таблет ═══════════════════════════ */

function MobileView({ employee, y, m, days, today, selected, setSelected, stats, go, swaps, day, lead, onSwap }: ViewProps) {
    return (
        <>
            {/* ── Толгой ── */}
            <div className="relative overflow-hidden px-4 pb-5 pt-3 md:mx-6 md:mt-6 md:rounded-3xl md:px-6" style={{ background: HEADER_BG }}>
                <div className="pointer-events-none absolute -right-14 -top-16 size-48 rounded-full bg-white/5" />
                <div className="relative flex items-center gap-2.5 md:hidden">
                    <span className="flex-1 text-[11px] font-semibold tracking-wide text-white/65">HR · АЖЛЫН ХУВААРЬ</span>
                    <ChatIcon variant="ghost" />
                    <NotificationBell variant="ghost" />
                    <Link href="/my/profile" className="size-9 overflow-hidden rounded-full border-2 border-white/50 bg-white/20">
                        {employee.photo_url ? <img src={employee.photo_url} alt="" className="size-full object-cover object-top" />
                            : <span className="flex size-full items-center justify-center text-xs font-extrabold text-white">{employee.initials}</span>}
                    </Link>
                </div>
                <h1 className="relative mt-3 leading-none text-white">
                    <span className="text-3xl font-black">Ажлын </span>
                    <span className="font-serif text-2xl font-light italic text-white/70">хуваарь</span>
                </h1>
                <p className="relative mt-1.5 text-xs font-medium text-white/60">
                    {employee.full_name}{employee.position ? ` · ${employee.position}` : ''}{employee.branch ? ` · ${employee.branch}` : ''}
                </p>
                <div className="relative mt-3 grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-black/25 p-2.5 backdrop-blur">
                    <MobileStat value={String(stats.workDays)} label="Ажлын өдөр" />
                    <MobileStat value={fmtHours(stats.minutes)} label="Төлөвлөсөн" />
                    <MobileStat value={fmtHours(stats.worked)} label="Ажилласан" />
                    <MobileStat value={String(stats.late)} label="Хоцорсон" warn={stats.late > 0} />
                </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-3 px-3.5 pt-3 md:px-6">
                <IncomingSwaps swaps={swaps} />

                {/* ── Сарын календарь ── */}
                <section className="overflow-hidden rounded-3xl shadow-sm" style={card}>
                    <div className="flex items-center gap-2 px-3 pb-2 pt-3">
                        <button type="button" onClick={() => go(-1)} className="flex size-9 items-center justify-center rounded-xl" style={pill}><ChevronLeft className="size-4" /></button>
                        <p className="flex-1 text-center text-sm font-extrabold">{y} · {MONTHS[m - 1]}</p>
                        <button type="button" onClick={() => go(1)} className="flex size-9 items-center justify-center rounded-xl" style={pill}><ChevronRight className="size-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 border-b px-1" style={{ borderColor: 'var(--my-divider)' }}>
                        {DOW_SHORT.map((d, i) => <div key={d} className={`py-1.5 text-center text-[10px] font-extrabold ${i >= 5 ? 'text-orange-500' : 'text-muted-foreground'}`}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 p-1">
                        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
                        {days.map(d => {
                            const isSel = d.date === selected;
                            const work = d.shifts.filter(s => s.kind === 'work');
                            const att = d.attendance;
                            return (
                                <button key={d.date} type="button" onClick={() => setSelected(d.date)}
                                    className={`relative flex min-h-[62px] flex-col items-center gap-0.5 rounded-xl p-1 transition ${isSel ? 'bg-red-50 ring-2 ring-red-500 dark:bg-red-950/30' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                    <span className={`text-[12px] font-bold tabular-nums ${d.date === today ? 'flex size-5 items-center justify-center rounded-full bg-red-600 text-white' : ''}`}>{parseDS(d.date).getDate()}</span>
                                    {d.shifts.slice(0, 2).map(s => (
                                        <span key={s.id} className="w-full truncate rounded px-0.5 text-center text-[9px] font-black leading-[14px]"
                                            style={{ background: s.color, color: inkOn(s.color) }}>{s.code ?? (s.kind === 'work' ? 'Ажил' : 'Амр')}{work.length === 1 && s.start_time ? ` ${s.start_time}` : ''}</span>
                                    ))}
                                    {d.shifts.length === 0 && d.leave && <span className="truncate text-[8px] font-bold text-violet-600">{d.leave.label}</span>}
                                    {d.unavailable && <Ban className="absolute left-1 top-1 size-2.5 text-rose-500" />}
                                    {att?.status && <span className={`absolute right-1 top-1 size-1.5 rounded-full ${STATUS[att.status]?.dot ?? 'bg-sky-400'}`} />}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {day && (
                    <section className="rounded-3xl p-3.5 shadow-sm" style={card}>
                        <DayDetail day={day} today={today} onSwap={onSwap} />
                    </section>
                )}

                <SwapHistory swaps={swaps} />
            </div>
        </>
    );
}

function MobileStat({ value, label, warn }: { value: string; label: string; warn?: boolean }) {
    return (
        <div className="rounded-xl bg-white/10 px-1 py-2 text-center">
            <p className={`text-lg font-black leading-none tabular-nums ${warn ? 'text-amber-300' : 'text-white'}`}>{value}</p>
            <p className="mt-1 text-[9px] font-semibold text-white/55">{label}</p>
        </div>
    );
}

/* ═══════════════════════════ Компьютер ═══════════════════════════ */

/** Админ талын ирцийн бүрэлдэхүүнүүдэд (цагийн шугам, төлөв) зориулж өдрийг AttendanceLog хэлбэрт оруулна. */
function toLog(d: Day, today: string): AttendanceLog {
    const work = d.shifts.filter(s => s.kind === 'work');
    const timed = work.filter(s => s.start_time && s.end_time);
    const a = d.attendance;
    return {
        id: null, key: d.date, date: d.date, is_today: d.date === today, employee_id: 0,
        employee_name: '', full_name: '', photo_url: null, position: null,
        checked_in_at: a?.in ?? null, checked_out_at: a?.out ?? null, check_in_source: null, check_out_source: null,
        worked_minutes: a?.worked ?? 0,
        scheduled_start: timed[0]?.start_time ?? null, scheduled_end: timed[timed.length - 1]?.end_time ?? null,
        scheduled_minutes: work.reduce((x, s) => x + s.minutes, 0),
        shift_label: work.map(s => s.name).join(' + ') || null,
        late_minutes: a?.late || null, early_leave_minutes: null, overtime_minutes: null,
        status: (a?.status as DayStatus | undefined) ?? null,
        no_checkout: !!a?.in && !a.out && d.date < today,
        branch_id: null, home_branch_id: null, home_branch: null,
    };
}

const avg = (vals: number[]) => (vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null);
const hhmm = (v: number | null) => (v === null ? '—' : `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`);
const hasContent = (d: Day) => d.shifts.length > 0 || !!d.leave || !!d.attendance || !!d.unavailable;

function DesktopView({ employee, y, m, days, today, selected, setSelected, stats, go, swaps, day, lead, isCurrentMonth, onSwap, grace }: ViewProps) {
    const nowMins = useNowMinutes();
    const workedPct = stats.minutes ? Math.round((stats.worked / stats.minutes) * 100) : null;
    const logs = days.map(d => toLog(d, today));
    const byDate = new Map(logs.map(l => [l.date, l]));
    const rows = days.filter(hasContent);

    // Төлөвөөр өдрийн тоо (цаггүй ээлжийн «ирсэн»-ийг цагтаад тооцно)
    const count = (...st: string[]) => days.filter(d => st.includes(d.attendance?.status ?? '')).length;
    const counts = { on_time: count('on_time', 'present'), late: count('late'), unscheduled: count('unscheduled'), leave: count('leave'), absent: count('absent') };
    const onTimePct = counts.on_time + counts.late ? Math.round((counts.on_time / (counts.on_time + counts.late)) * 100) : null;

    const hoursData: HoursDatum[] = days.map(d => {
        const l = byDate.get(d.date)!;
        const future = d.date > today;
        const live = l.is_today && l.checked_in_at && !l.checked_out_at ? Math.max(0, nowMins - toMins(l.checked_in_at)) : 0;
        const workedMin = l.worked_minutes || live;
        const empty = !l.scheduled_minutes && !workedMin;
        return {
            key: d.date, label: String(parseDS(d.date).getDate()), title: dayLabel(d.date),
            worked: future || empty ? null : Math.round((workedMin / 60) * 10) / 10,
            planned: future || empty ? null : Math.round((l.scheduled_minutes / 60) * 10) / 10,
            workedMin, plannedMin: l.scheduled_minutes,
        };
    });

    const arrivalData: ArrivalDatum[] = logs.map(l => ({
        key: l.date, label: String(parseDS(l.date).getDate()), title: dayLabel(l.date),
        diff: l.checked_in_at && l.scheduled_start ? toMins(l.checked_in_at) - toMins(l.scheduled_start) : null,
        checkedIn: l.checked_in_at, start: l.scheduled_start,
    }));

    const arrived = logs.filter(l => l.checked_in_at);
    // Хуваарьтай өдрүүдээс хэдэнд нь ирсэн (хуваарьгүй ажилласан өдөр «Өдрийн бүтэц»-д тусдаа)
    const attended = days.filter(d => d.shifts.some(s => s.kind === 'work') && d.attendance?.in).length;
    const left = logs.filter(l => l.checked_out_at);
    const mostLate = logs.reduce<AttendanceLog | null>((mx, l) => ((l.late_minutes ?? 0) > (mx?.late_minutes ?? 0) ? l : mx), null);
    const next = days.find(d => d.date >= today && d.shifts.some(s => s.kind === 'work'));
    const nextWork = next?.shifts.filter(s => s.kind === 'work') ?? [];

    const navBtn = 'flex h-full w-7 items-center justify-center text-muted-foreground transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10';

    return (
        <div className={`space-y-3 p-4 xl:px-5 ${VIZ_TOKENS}`}>
            {/* ═══ Толгой + үзүүлэлтүүд ═══ */}
            <section className="overflow-hidden rounded-2xl border border-red-200/60 bg-gradient-to-br from-red-50/80 via-card to-rose-50/60 shadow-sm dark:border-red-900/40 dark:from-red-950/30 dark:via-card dark:to-rose-950/20">
                <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <span className="size-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-sm ring-2 ring-card">
                        {employee.photo_url ? <img src={employee.photo_url} alt="" className="size-full object-cover object-top" />
                            : <span className="flex size-full items-center justify-center text-xs font-bold text-white">{employee.initials}</span>}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-base font-bold text-foreground">Ажлын хуваарь ба ирц</h1>
                        <p className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                            <span>{employee.full_name}</span>
                            {employee.position && <span>{employee.position}</span>}
                            {employee.branch && <span className="inline-flex items-center gap-1"><Building2 className="size-3" />{employee.branch}</span>}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isCurrentMonth && (
                            <button type="button" onClick={() => router.get('/my/work-schedule', {}, { preserveScroll: true })}
                                className="h-7 rounded-lg bg-white/80 px-2.5 text-[11px] font-semibold text-muted-foreground shadow-sm ring-1 ring-black/5 hover:text-foreground dark:bg-white/[0.06] dark:ring-white/10">
                                Энэ сар
                            </button>
                        )}
                        <div className="flex h-7 items-center overflow-hidden rounded-lg bg-white/80 shadow-sm ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10">
                            <button type="button" onClick={() => go(-1)} title="Өмнөх сар" className={navBtn}><ChevronLeft className="size-4" /></button>
                            <span className="flex min-w-[130px] items-center justify-center gap-1.5 px-1 text-[11px] font-bold">
                                <CalendarRange className="size-3.5 text-red-500" />{y} оны {MONTHS[m - 1]}
                            </span>
                            <button type="button" onClick={() => go(1)} title="Дараагийн сар" className={navBtn}><ChevronRight className="size-4" /></button>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-6 divide-x divide-red-100/80 border-t border-red-100/80 dark:divide-white/10 dark:border-white/10">
                    <Stat label="Ажлын өдөр" value={stats.workDays} accent="rose" />
                    <Stat label="Төлөвлөсөн" value={fmtHours(stats.minutes)} accent="sky" />
                    <Stat label="Ажилласан" value={fmtHours(stats.worked)} sub={workedPct !== null ? `${workedPct}%` : undefined} accent="indigo" />
                    <Stat label="Ирсэн өдөр" value={attended} sub={`/ ${stats.workDays}`} accent="emerald" title="Хуваарьтай өдрүүдээс ирсэн нь" />
                    <Stat label="Хоцорсон" value={stats.late} sub={stats.lateMinutes ? `${stats.lateMinutes} мин` : undefined} accent="red" />
                    <Stat label="Чөлөө" value={counts.leave} accent="violet" />
                </div>
            </section>

            <IncomingSwaps swaps={swaps} grid />

            {/* ═══ Графикууд ═══ */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <ChartCard title="Ажилласан цаг" icon={TrendingUp}
                    legend={<><LegendKey color="var(--att-blue)" label="Ажилласан" /><LegendKey color="var(--att-plan-bg)" label="Төлөвлөсөн" /></>}>
                    <HoursChart data={hoursData} variant="bar" showDiff={false} onPick={setSelected} />
                </ChartCard>
                <ChartCard title="Ирсэн цаг" icon={CalendarClock}
                    legend={<><LegendKey color="var(--att-blue)" label="Цагтаа" /><LegendKey color="var(--att-orange)" label="Хоцорсон" /></>}>
                    <ArrivalChart data={arrivalData} grace={grace} onPick={setSelected} />
                </ChartCard>
                <ChartCard title="Өдрийн бүтэц" icon={ChartPie}>
                    <StatusDonut center={onTimePct !== null ? `${onTimePct}%` : '—'} centerLabel="цагтаа ирсэн" counts={counts} />
                </ChartCard>
                <ChartCard title="Үзүүлэлт" icon={Gauge}>
                    <div className="divide-y divide-border/50">
                        <InsightRow icon={LogIn} tone="bg-sky-500/10 text-sky-600 dark:text-sky-400" label="Дундаж ирсэн" value={hhmm(avg(arrived.map(l => toMins(l.checked_in_at!))))} />
                        <InsightRow icon={LogOut} tone="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" label="Дундаж тарсан" value={hhmm(avg(left.map(l => toMins(l.checked_out_at!))))} />
                        <InsightRow icon={Hourglass} tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" label="Өдрийн дундаж" value={fmtMins(avg(left.map(l => l.worked_minutes))) ?? '—'} />
                        <InsightRow icon={AlarmClock} tone="bg-orange-500/10 text-orange-600 dark:text-orange-400" label="Хамгийн их хоцорсон"
                            value={mostLate ? fmtMins(mostLate.late_minutes) ?? '—' : '—'} sub={mostLate ? dayLabel(mostLate.date) : undefined} />
                        <InsightRow icon={CalendarDays} tone="bg-red-500/10 text-red-600 dark:text-red-400" label="Дараагийн ээлж"
                            value={nextWork[0]?.start_time ?? (next ? 'Цаггүй' : '—')} sub={next ? `${dayLabel(next.date)}${nextWork[0]?.branch ? ` · ${nextWork[0].branch}` : ''}` : undefined} />
                    </div>
                </ChartCard>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-3 2xl:grid-cols-[minmax(0,1fr)_380px]">
                {/* ═══ Өдөр бүрээр ═══ */}
                <section className="flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
                    <h2 className="flex items-center gap-1.5 border-b border-border/60 bg-muted/30 px-3 py-2 text-xs font-bold">
                        <CalendarDays className="size-3.5 text-red-500" />Өдөр бүрээр
                        <span className="ml-auto text-[10px] font-medium text-muted-foreground">Мөр дээр дарж дэлгэрэнгүйг харна</span>
                    </h2>
                    {rows.length === 0 ? (
                        <p className="px-4 py-8 text-center text-xs text-muted-foreground">Энэ сард нийтлэгдсэн ээлж ч, ирц ч алга.</p>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                <tr className="border-b border-border/50">
                                    <th className="px-3 py-1.5 text-left font-semibold">Огноо</th>
                                    <th className="px-2 py-1.5 text-left font-semibold">Ээлж</th>
                                    <th className="hidden w-[24%] px-2 py-1.5 font-semibold 2xl:table-cell">
                                        <span className="relative block h-3">
                                            {TICKS.map(h => <span key={h} className="absolute -translate-x-1/2 tabular-nums" style={{ left: tickLeft(h) }}>{String(h).padStart(2, '0')}:00</span>)}
                                        </span>
                                    </th>
                                    <th className="px-2 py-1.5 text-left font-semibold">Ирсэн</th>
                                    <th className="px-2 py-1.5 text-left font-semibold">Тарсан</th>
                                    <th className="px-2 py-1.5 text-left font-semibold">Ажилласан</th>
                                    <th className="px-3 py-1.5 text-right font-semibold">Төлөв</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {rows.map(d => {
                                    const l = byDate.get(d.date)!;
                                    const dt = parseDS(d.date);
                                    const weekend = dowIndex(d.date) >= 5;
                                    const work = d.shifts.filter(s => s.kind === 'work');
                                    return (
                                        <tr key={d.date} onClick={() => setSelected(d.date)}
                                            className={`cursor-pointer transition-colors ${d.date === selected ? 'bg-red-50/80 dark:bg-red-950/25' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'}`}>
                                            <td className={`whitespace-nowrap px-3 py-1.5 ${d.date === today ? 'text-red-600 dark:text-red-400' : ''}`}>
                                                <span className="font-bold tabular-nums">{String(dt.getMonth() + 1).padStart(2, '0')}.{String(dt.getDate()).padStart(2, '0')}</span>
                                                <span className={`ml-1.5 text-[10px] font-semibold uppercase ${weekend ? 'text-orange-500' : 'text-muted-foreground'}`}>{DOW_SHORT[dowIndex(d.date)]}</span>
                                                {d.unavailable && <Ban className="ml-1.5 inline size-3 text-rose-500" />}
                                            </td>
                                            <td className="max-w-[220px] px-2 py-1.5">
                                                {work.length > 0 ? (
                                                    <span className="flex min-w-0 items-center gap-1.5">
                                                        <span className="size-2 shrink-0 rounded-[3px]" style={{ background: work[0].color }} />
                                                        <span className="truncate font-medium">{l.shift_label}</span>
                                                        {l.scheduled_start && <span className="shrink-0 tabular-nums text-muted-foreground">{l.scheduled_start}–{l.scheduled_end}</span>}
                                                    </span>
                                                ) : <span className="text-muted-foreground">{d.shifts.length ? d.shifts.map(s => s.name).join(', ') : d.leave ? d.leave.label : 'Хуваарьгүй'}</span>}
                                            </td>
                                            <td className="hidden px-2 py-1.5 2xl:table-cell"><DayTimeline log={l} nowMins={nowMins} /></td>
                                            <td className="px-2 py-1.5"><Time value={l.checked_in_at} source={null} /></td>
                                            <td className="px-2 py-1.5"><CheckOut log={l} /></td>
                                            <td className="px-2 py-1.5"><Worked log={l} nowMins={nowMins} /></td>
                                            <td className="px-3 py-1.5"><div className="flex justify-end"><RowStatus d={d} log={l} today={today} /></div></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    {/* Сарын нийт — хүснэгт хажуу самбарын өндрөөр сунахад доод ирмэгт байрлана */}
                    <footer className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                        <span><b className="text-foreground">{MONTHS[m - 1]}</b> · {rows.length} өдөр бүртгэлтэй</span>
                        <span>Төлөвлөсөн <b className="text-foreground">{fmtHours(stats.minutes)}</b></span>
                        <span>Ажилласан <b className="text-foreground">{fmtHours(stats.worked)}</b></span>
                        <span>Хоцорсон <b className={stats.late ? 'text-rose-600' : 'text-foreground'}>{stats.late} удаа{stats.lateMinutes ? ` · ${stats.lateMinutes} мин` : ''}</b></span>
                        <span className="ml-auto hidden items-center gap-3 2xl:flex">
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded border border-dashed border-sky-400/70 bg-sky-400/5" />Хуваарь</span>
                            <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />Ажилласан</span>
                        </span>
                    </footer>
                </section>

                {/* ═══ Хажуу самбар ═══ */}
                <aside className="flex flex-col gap-3 self-start">
                    <MiniCalendar days={days} lead={lead} today={today} selected={selected} onSelect={setSelected} />
                    {day && (
                        <section className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
                            <DayDetail day={day} today={today} onSwap={onSwap} />
                        </section>
                    )}
                    <SwapHistory swaps={swaps} compact />
                </aside>
            </div>
        </div>
    );
}

/** Хүснэгтийн төлөв: ирцийн төлөв, эсвэл ирээдүйн ээлж / амралт / чөлөө. */
function RowStatus({ d, log, today }: { d: Day; log: AttendanceLog; today: string }) {
    const chip = 'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset';
    if (log.status) return <Status log={log} />;
    if (d.leave) return <span className={`${chip} bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300`}>{d.leave.label}{d.leave.status === 'pending' ? ' (хүлээгдэж буй)' : ''}</span>;
    if (d.date >= today && d.shifts.some(s => s.kind === 'work')) return <span className={`${chip} bg-sky-500/5 text-sky-700 ring-sky-500/25 dark:text-sky-300`}>Төлөвлөсөн</span>;
    if (d.shifts.some(s => s.kind === 'off')) return <span className={`${chip} bg-muted text-muted-foreground ring-border`}>Амралт</span>;
    return <span className="text-muted-foreground/40">—</span>;
}

/** Өдөр сонгох жижиг хуанли — ээлжтэй өдөр өнгөт зураастай. */
function MiniCalendar({ days, lead, today, selected, onSelect }: {
    days: Day[]; lead: number; today: string; selected: string; onSelect: (d: string) => void;
}) {
    return (
        <section className="rounded-xl border border-border/70 bg-card p-2.5 shadow-sm">
            <div className="grid grid-cols-7 gap-0.5">
                {DOW_SHORT.map((w, i) => <span key={w} className={`pb-1 text-center text-[9px] font-bold ${i >= 5 ? 'text-orange-500' : 'text-muted-foreground'}`}>{w}</span>)}
                {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} />)}
                {days.map(d => {
                    const work = d.shifts.find(s => s.kind === 'work');
                    const sel = d.date === selected;
                    const status = d.attendance?.status ? STATUS[d.attendance.status] : null;
                    return (
                        <button key={d.date} type="button" onClick={() => onSelect(d.date)}
                            title={[d.shifts.map(s => s.name).join(', '), d.leave?.label, d.unavailable ? 'Боломжгүй' : null].filter(Boolean).join(' · ') || undefined}
                            className={`relative flex h-9 flex-col items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums transition ${sel ? 'bg-red-600 text-white shadow-sm' : d.date === today ? 'text-red-600 ring-1 ring-red-400' : 'hover:bg-black/5 dark:hover:bg-white/5'} ${d.date < today && !sel ? 'text-muted-foreground' : ''}`}>
                            {parseDS(d.date).getDate()}
                            <span className="mt-0.5 h-1 w-4 rounded-full" style={{ background: work ? work.color : d.leave ? '#8b5cf6' : 'transparent' }} />
                            {status && <span className={`absolute right-1 top-1 size-1.5 rounded-full ${status.dot}`} />}
                            {d.unavailable && <Ban className={`absolute left-0.5 top-0.5 size-2.5 ${sel ? 'text-white' : 'text-rose-500'}`} />}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

/* ═══════════════════════════ Нийтлэг хэсгүүд ═══════════════════════════ */

function IncomingSwaps({ swaps, grid }: { swaps: Swap[]; grid?: boolean }) {
    const incoming = swaps.filter(s => s.can_respond);
    if (incoming.length === 0) return null;

    return (
        <div className={grid ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
            {incoming.map(s => (
                <div key={s.id} className="rounded-2xl border border-amber-300 bg-amber-50 p-3 shadow-sm dark:border-amber-800 dark:bg-amber-950/30">
                    <p className="flex items-center gap-1.5 text-xs font-bold"><ArrowLeftRight className="size-3.5 text-amber-600" /> {s.other} ээлж {s.is_swap ? 'солилцох' : 'шилжүүлэх'} хүсэлт илгээлээ</p>
                    <p className="mt-1 text-[11px]">{s.is_swap ? 'Та авах' : 'Та орлох'}: <b>{s.shift}</b></p>
                    {s.target_shift && <p className="text-[11px]">Оронд нь өгөх: <b>{s.target_shift}</b></p>}
                    {s.note && <p className="mt-0.5 text-[11px] italic text-muted-foreground">"{s.note}"</p>}
                    <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => router.patch(`/my/work-schedule/swaps/${s.id}/respond`, { accept: false }, { preserveScroll: true })}
                            className="h-8 flex-1 rounded-xl bg-white text-xs font-semibold text-rose-600 shadow-sm dark:bg-white/10">Татгалзах</button>
                        <button type="button" onClick={() => router.patch(`/my/work-schedule/swaps/${s.id}/respond`, { accept: true }, { preserveScroll: true })}
                            className="h-8 flex-1 rounded-xl bg-emerald-600 text-xs font-semibold text-white shadow-sm">Зөвшөөрөх</button>
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Сонгосон өдөр: ээлжүүд, чөлөө, ирц, «боломжгүй» тэмдэглэгээ. */
function DayDetail({ day, today, onSwap }: { day: Day; today: string; onSwap: (s: SwapTarget) => void }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <div className="flex size-12 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow">
                    <span className="text-[9px] font-bold uppercase opacity-80">{DOW_SHORT[dowIndex(day.date)]}</span>
                    <span className="text-lg font-black leading-none">{parseDS(day.date).getDate()}</span>
                </div>
                <div>
                    <p className="text-sm font-extrabold">{DOW_FULL[dowIndex(day.date)]}</p>
                    <p className="text-[11px] text-muted-foreground">{dayTitle(day.date)}{day.date === today ? ' · Өнөөдөр' : ''}</p>
                </div>
            </div>

            {day.shifts.length === 0 && !day.leave && <p className="rounded-2xl px-3 py-5 text-center text-xs text-muted-foreground" style={pill}>Энэ өдөр хуваарь алга.</p>}
            {day.leave && <p className="rounded-xl bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-700 dark:text-violet-300">{day.leave.label}{day.leave.status === 'pending' ? ' — хүсэлт хүлээгдэж байна' : ''}</p>}

            {day.shifts.map(s => (
                <div key={s.id} className="rounded-2xl p-3" style={{ background: `${s.color}18`, borderLeft: `4px solid ${s.color}` }}>
                    <div className="flex items-center gap-2">
                        <span className="rounded-md px-1.5 py-0.5 text-[11px] font-black" style={{ background: s.color, color: inkOn(s.color) }}>{s.code ?? '•'}</span>
                        <span className="text-sm font-bold">{s.name}</span>
                        {s.start_time && <span className="ml-auto text-sm font-extrabold tabular-nums">{s.start_time}–{s.end_time}</span>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {s.branch && <span className="flex items-center gap-1"><Building2 className="size-3" />{s.branch}</span>}
                        {s.minutes > 0 && <span className="flex items-center gap-1"><Hourglass className="size-3" />{fmtHours(s.minutes)}</span>}
                        {s.doctor && <span className="flex items-center gap-1"><Stethoscope className="size-3" />{s.doctor}</span>}
                        {s.room && <span className="flex items-center gap-1"><MapPin className="size-3" />Өрөө {s.room}</span>}
                    </div>
                    {s.note && <p className="mt-1 text-[11px] italic">{s.note}</p>}
                    {s.kind === 'work' && day.date >= today && (
                        s.swap_pending
                            ? <p className="mt-2 text-[11px] font-semibold text-amber-600">Шилжүүлэх хүсэлт хүлээгдэж байна</p>
                            : <button type="button" onClick={() => onSwap({ ...s, date: day.date })}
                                className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-red-600"><ArrowLeftRight className="size-3" /> Ээлж шилжүүлэх / солилцох</button>
                    )}
                </div>
            ))}

            {/* Чөлөөтэй өдөр бүртгэлгүй бол ирцийн хоосон карт хэрэггүй — чөлөө нь дээр харагдана */}
            {day.attendance && (day.attendance.in || day.attendance.status !== 'leave') && <AttendanceCard a={day.attendance} />}

            {day.date >= today && (
                <button type="button" onClick={() => toggleUnavailable(day)}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold ${day.unavailable ? 'bg-rose-500/10 text-rose-600' : ''}`}
                    style={day.unavailable ? undefined : pill}>
                    <Ban className="size-3.5" />
                    {day.unavailable ? `Боломжгүй гэж тэмдэглэсэн${day.unavailable.note ? ` (${day.unavailable.note})` : ''} — болих` : 'Энэ өдөр боломжгүй гэж тэмдэглэх'}
                </button>
            )}
        </div>
    );
}

/** Ажилтанд харагдах ирц: ирсэн, тарсан, ажилласан цаг ба хоцролт. */
function AttendanceCard({ a }: { a: DayAttendance }) {
    const st = a.status ? STATUS[a.status] : null;
    return (
        <div className="rounded-2xl p-3" style={pill}>
            <div className="flex items-center gap-2">
                <Fingerprint className="size-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold">Ирц</span>
                {a.late > 0 && <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300"><AlarmClock className="size-3" />{a.late} мин хоцорсон</span>}
                {st && <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <Cell icon={Clock} label="Ирсэн" value={a.in ?? '—'} />
                <Cell icon={DoorOpen} label="Тарсан" value={a.out ?? '—'} />
                <Cell icon={Hourglass} label="Ажилласан" value={a.worked ? fmtHours(a.worked) : '—'} />
            </div>
        </div>
    );
}

function Cell({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div>
            <p className="flex items-center justify-center gap-1 text-[9px] font-semibold text-muted-foreground"><Icon className="size-3" />{label}</p>
            <p className="text-sm font-extrabold tabular-nums">{value}</p>
        </div>
    );
}

function SwapHistory({ swaps, compact }: { swaps: Swap[]; compact?: boolean }) {
    const list = swaps.filter(s => !s.can_respond);
    if (list.length === 0) return null;

    return (
        <section className={compact ? 'rounded-xl border border-border/70 bg-card p-3 shadow-sm' : 'rounded-3xl p-3.5 shadow-sm'} style={compact ? undefined : card}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold"><ArrowLeftRight className="size-3.5 text-red-600" />Ээлж солих хүсэлтүүд</p>
            <div className="space-y-1.5">
                {list.map(s => (
                    <div key={s.id} className="flex items-start gap-2 rounded-xl px-2.5 py-2" style={pill}>
                        <ArrowLeftRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold">{s.direction === 'out' ? `→ ${s.other}` : `← ${s.other}`} · {s.shift}</p>
                            <p className={`text-[10px] font-semibold ${s.status === 'approved' ? 'text-emerald-600' : s.status === 'rejected' || s.status === 'cancelled' ? 'text-rose-600' : 'text-amber-600'}`}>
                                {s.status_label}{s.rejection_reason ? ` · ${s.rejection_reason}` : ''}
                            </p>
                        </div>
                        {s.can_cancel && (
                            <button type="button" onClick={() => router.patch(`/my/work-schedule/swaps/${s.id}/cancel`, {}, { preserveScroll: true })}
                                className="text-[11px] font-semibold text-muted-foreground hover:text-rose-600">Цуцлах</button>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

function SwapDialog({ shift, colleagues, onClose }: { shift: SwapTarget; colleagues: Colleague[]; onClose: () => void }) {
    const [targetId, setTargetId] = useState<number | ''>('');
    const [mode, setMode] = useState<'cover' | 'swap'>('cover');
    const [targetShiftId, setTargetShiftId] = useState<number | ''>('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const target = colleagues.find(c => c.id === targetId);

    const submit = () => {
        if (!targetId || (mode === 'swap' && !targetShiftId)) return;
        setBusy(true);
        router.post('/my/work-schedule/swaps', {
            shift_id: shift.id, target_employee_id: targetId,
            target_shift_id: mode === 'swap' ? targetShiftId : null, note,
        }, { preserveScroll: true, onSuccess: onClose, onFinish: () => setBusy(false) });
    };

    const field = 'mt-1 h-10 w-full rounded-xl border bg-background px-2 text-sm';

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
            <div onMouseDown={e => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl">
                <div className="mb-3 flex items-center gap-2">
                    <ArrowLeftRight className="size-4 text-red-600" />
                    <p className="flex-1 text-sm font-bold">Ээлж шилжүүлэх</p>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground"><X className="size-4" /></button>
                </div>
                <p className="rounded-xl bg-muted px-3 py-2 text-xs"><b>{shift.date.slice(5).replace('-', '/')}</b> · {shift.name}{shift.start_time ? ` ${shift.start_time}–${shift.end_time}` : ''}{shift.branch ? ` · ${shift.branch}` : ''}</p>

                <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                    {(['cover', 'swap'] as const).map(k => (
                        <button key={k} type="button" onClick={() => setMode(k)}
                            className={`h-8 rounded-lg text-xs font-semibold ${mode === k ? 'bg-card shadow' : 'text-muted-foreground'}`}>
                            {k === 'cover' ? 'Орлуулах' : 'Солилцох'}
                        </button>
                    ))}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{mode === 'cover' ? 'Хамт ажилтан таны ээлжид гарна.' : 'Та хоёр бие биеийнхээ ээлжийг сольж гарна.'}</p>

                <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Хамт ажилтан
                    <select className={field} value={targetId} onChange={e => { setTargetId(e.target.value ? Number(e.target.value) : ''); setTargetShiftId(''); }}>
                        <option value="">— Сонгох —</option>
                        {colleagues.map(c => <option key={c.id} value={c.id}>{c.name}{c.position ? ` · ${c.position}` : ''}</option>)}
                    </select>
                </label>

                {mode === 'swap' && target && (
                    <label className="mt-2 block text-[11px] font-semibold text-muted-foreground">Түүний аль ээлжийг авах
                        <select className={field} value={targetShiftId} onChange={e => setTargetShiftId(e.target.value ? Number(e.target.value) : '')}>
                            <option value="">— Сонгох —</option>
                            {target.shifts.map(s => <option key={s.id} value={s.id}>{s.date.slice(5).replace('-', '/')} · {s.label}</option>)}
                        </select>
                        {target.shifts.length === 0 && <span className="mt-1 block text-[10px] text-amber-600">Ойрын 45 хоногт нийтлэгдсэн ээлж алга.</span>}
                    </label>
                )}

                <label className="mt-2 block text-[11px] font-semibold text-muted-foreground">Тайлбар
                    <input className={field} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="Жишээ: эмнэлэгт үзүүлэх" />
                </label>

                <p className="mt-3 text-[10px] text-muted-foreground">Хамт ажилтан зөвшөөрсний дараа HR батлахад хуваарь автоматаар солигдоно.</p>
                <button type="button" disabled={busy || !targetId || (mode === 'swap' && !targetShiftId)} onClick={submit}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-red-600 text-sm font-bold text-white disabled:opacity-50">
                    <Check className="size-4" /> Хүсэлт илгээх
                </button>
            </div>
        </div>
    );
}
