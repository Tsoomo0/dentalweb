import { Building2, CalendarRange, ChevronLeft, ChevronRight, Fingerprint, MapPin, PencilLine, RotateCcw, Usb } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Ирцийн хуудсууд (өдрөөр / нэгтгэл / ажилтны тайлан)-ын хуваалцдаг төрөл,
 * туслах функц, жижиг бүрэлдэхүүнүүд.
 */

export const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
export const WEEKDAYS_SHORT = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];

/** Цагийн шугамын хүрээ — 06:00–22:00 */
const DAY_START = 6 * 60;
const DAY_END = 22 * 60;
export const TICKS = [9, 12, 15, 18];

export type Source = 'gps' | 'pull' | 'push' | 'usb' | 'manual';

/** Хуваарьтай харьцуулсан төлөв (AttendanceEvaluator.php) + амралтын өдөр (AttendanceReport.php). */
export type DayStatus = 'on_time' | 'late' | 'absent' | 'missing' | 'upcoming' | 'unscheduled' | 'present' | 'leave' | 'off' | null;

export interface AttendanceLog {
    /** Ирээгүй өдрийн мөрөнд ирцийн бүртгэл байхгүй тул null */
    id: number | null; key: string; date: string; is_today: boolean; employee_id: number;
    employee_name: string; full_name: string; photo_url: string | null; position: string | null;
    checked_in_at: string | null; checked_out_at: string | null;
    check_in_source: Source | null; check_out_source: Source | null;
    worked_minutes: number;
    scheduled_start: string | null; scheduled_end: string | null; scheduled_minutes: number; shift_label: string | null;
    late_minutes: number | null; early_leave_minutes: number | null; overtime_minutes: number | null;
    status: DayStatus; no_checkout: boolean;
    /** Тухайн өдөр ажилласан салбар: ээлжийнх → хуруу дарсан төхөөрөмжийнх → үндсэн */
    branch_id: number | null;
    home_branch_id: number | null; home_branch: string | null;
    /** Үндсэн салбараасаа өөр хаана хуруу дарсан (жишээ нь Сансарын эмч Хороололд) */
    branches?: string[];
}

export interface SummaryRow {
    employee_id: number; employee_name: string; full_name: string; position: string | null; photo_url: string | null;
    branch_id: number | null; branch_name: string | null;
    planned_days: number; planned_minutes: number; worked_days: number; worked_minutes: number;
    on_time_days: number; late_count: number; late_minutes: number; early_count: number; early_minutes: number;
    overtime_minutes: number; absent_days: number; leave_days: number; unscheduled_days: number; no_checkout: number;
}

export interface Option { id: number; name: string; branch_id?: number | null }

export type PeriodType = 'half_month' | 'month' | 'quarter' | 'half_year' | 'year';

export interface Period {
    type: PeriodType; from: string; to: string; label: string; range: string; days: number;
    prev: string; next: string | null; is_current: boolean;
}

export interface Rules { late_grace: number; overtime_min: number }

/** Ирц ямар аргаар бүртгэгдсэн — байршил (утас) эсвэл хурууны хээний төхөөрөмж. */
export const SOURCE_META: Record<Source, { icon: React.ElementType; label: string }> = {
    gps:  { icon: MapPin,      label: 'Утсаар байршлаар' },
    pull: { icon: Fingerprint, label: 'Хурууны хээ (4370)' },
    push: { icon: Fingerprint, label: 'Хурууны хээ (Push)' },
    usb:  { icon: Usb,         label: 'USB файлаас' },
    manual: { icon: PencilLine, label: 'HR гараар нэмсэн' },
};

const AVATAR_TONES = [
    'from-sky-400 to-blue-600', 'from-violet-400 to-purple-600', 'from-emerald-400 to-teal-600',
    'from-amber-400 to-orange-600', 'from-rose-400 to-pink-600', 'from-cyan-400 to-sky-600',
];

export const fieldCls = 'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20';
export const pillSelect = 'h-7 rounded-lg border-0 bg-white/80 px-2.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-black/5 backdrop-blur focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:bg-white/[0.06] dark:ring-white/10';
export const ghostBtn = 'flex h-7 items-center gap-1.5 rounded-lg bg-white/80 px-2.5 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:-translate-y-px hover:text-foreground hover:shadow dark:bg-white/[0.06] dark:ring-white/10';

/* ───────────────────────── Туслах функцууд ───────────────────────── */

export function fmtMins(mins: number | null | undefined) {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (!h) return `${m}м`;
    return m ? `${h}ц ${m}м` : `${h}ц`;
}

/** Самбарын том тоонд: 10 цагаас дээш бол бүхэл цагаар («180ц») */
export function fmtHours(mins: number) {
    if (!mins) return '0';
    return mins < 600 ? fmtMins(mins)! : `${Math.round(mins / 60)}ц`;
}

export const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const pct = (mins: number) => Math.min(100, Math.max(0, ((mins - DAY_START) / (DAY_END - DAY_START)) * 100));
export const tickLeft = (h: number) => `${pct(h * 60)}%`;

/** Хувь — хуваагч 0 бол null */
export const ratio = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : null);

export function ymd(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const todayStr = () => ymd(new Date());

export const parseDay = (date: string) => new Date(`${date}T00:00:00`);

/** «10-р сарын 7, Лхагва» */
export function dayLabel(date: string, withWeekday = true) {
    const d = parseDay(date);
    return `${d.getMonth() + 1}-р сарын ${d.getDate()}${withWeekday ? `, ${WEEKDAYS[d.getDay()]}` : ''}`;
}

export function addDays(date: string, n: number) {
    const d = parseDay(date);
    d.setDate(d.getDate() + n);
    return ymd(d);
}

function initials(name: string) {
    // "А.Цолмон" → "АЦ"
    return name.split(/[\s.]+/).filter(Boolean).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase();
}

export function useNowMinutes() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
    return now.getHours() * 60 + now.getMinutes();
}

/** Ажилтны ирцийн тайлангийн холбоос — тухайн өдрийг агуулсан сараар нээгдэнэ. */
export function employeeUrl(employeeId: number, params: { period?: PeriodType; date?: string } = {}) {
    const q = new URLSearchParams();
    if (params.period) q.set('period', params.period);
    if (params.date) q.set('date', params.date);
    const s = q.toString();
    return `/hr/attendance/employees/${employeeId}${s ? `?${s}` : ''}`;
}

/* ───────────────────────── Жижиг бүрэлдэхүүн ───────────────────────── */

/** Ажилтны зураг; байхгүй эсвэл ачаалагдахгүй бол нэрийн эхний үсгүүд. */
export function Avatar({ name, photoUrl, seed, size = 'size-8' }: { name: string; photoUrl: string | null; seed: number; size?: string }) {
    const [broken, setBroken] = useState(false);

    if (photoUrl && !broken) {
        return (
            <img src={photoUrl} alt={name} loading="lazy" onError={() => setBroken(true)}
                className={`${size} shrink-0 rounded-full object-cover object-top shadow-sm ring-2 ring-card`} />
        );
    }

    return (
        <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white shadow-sm ring-2 ring-card ${AVATAR_TONES[seed % AVATAR_TONES.length]}`}>
            {initials(name)}
        </span>
    );
}

export const Dash = () => <span className="text-muted-foreground/40">—</span>;

export function Time({ value, source }: { value: string | null; source: Source | null }) {
    if (!value) return <Dash />;
    const meta = source ? SOURCE_META[source] : undefined;
    return (
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums text-foreground" title={meta?.label}>
            {meta && <meta.icon className="size-3 text-sky-500/80" />}
            {value}
        </span>
    );
}

export function CheckOut({ log }: { log: AttendanceLog }) {
    if (log.checked_out_at) return <Time value={log.checked_out_at} source={log.check_out_source} />;
    if (!log.checked_in_at) return <Dash />;
    return log.is_today ? (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-300">
            <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Ажиллаж байна
        </span>
    ) : (
        <span className="whitespace-nowrap rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:text-amber-300">Тараагүй</span>
    );
}

const pill = 'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset';

/** Нийтлэгдсэн хуваарьтай үед л хоцорсон/цагтаа гэж дүгнэнэ — хуваарьгүй бол дүгнэх суурь байхгүй. */
export function Status({ log }: { log: AttendanceLog }) {
    const main: Record<NonNullable<DayStatus>, React.ReactNode> = {
        late: <span className={`${pill} bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300`}>{fmtMins(log.late_minutes)} хоцорсон</span>,
        on_time: <span className={`${pill} bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300`}>Цагтаа</span>,
        present: <span className={`${pill} bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300`}>Ирсэн</span>,
        absent: <span className={`${pill} bg-rose-600 text-white ring-rose-600`}>Ирээгүй</span>,
        missing: <span className={`${pill} bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300`}>Ирээгүй байна</span>,
        upcoming: <span className={`${pill} bg-sky-500/5 text-sky-700 ring-sky-500/25 dark:text-sky-300`} title="Ээлж нь хараахан эхлээгүй">Ээлж эхлээгүй</span>,
        leave: <span className={`${pill} bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300`}>Чөлөөтэй</span>,
        off: <span className={`${pill} bg-muted text-muted-foreground ring-border`}>Амралт</span>,
        unscheduled: <span className={`${pill} bg-muted text-muted-foreground ring-border`} title="Нийтлэгдсэн хуваарьгүй өдөр ажилласан">Хуваарьгүй</span>,
    };
    return (
        <div className="flex flex-wrap items-center justify-end gap-1 whitespace-nowrap">
            {log.status ? main[log.status] : <span className={`${pill} bg-muted text-muted-foreground ring-border`}>Хуваарьгүй</span>}
            {log.early_leave_minutes ? (
                <span className={`${pill} bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300`} title="Хуваарийн дуусахаас эрт тарсан">−{fmtMins(log.early_leave_minutes)} эрт</span>
            ) : null}
            {log.overtime_minutes ? (
                <span className={`${pill} bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300`} title="Илүү цаг">+{fmtMins(log.overtime_minutes)}</span>
            ) : null}
        </div>
    );
}

/**
 * Ажлын өдрийн цагийн шугам: саарал тасархай хүрээ = хуваарь, өнгөт зураас = бодит
 * ирсэн→тарсан. Өнөөдөр ажиллаж байгаа бол "одоо" хүртэл анивчиж үргэлжилнэ.
 */
export function DayTimeline({ log, nowMins }: { log: AttendanceLog; nowMins: number }) {
    const tone = log.late_minutes || log.status === 'absent' ? 'late' : log.scheduled_start ? 'ok' : 'neutral';
    const bar = { ok: 'from-emerald-400 to-emerald-500', late: 'from-rose-400 to-rose-500', neutral: 'from-sky-400 to-blue-500' }[tone];
    const dot = { ok: 'bg-emerald-500', late: 'bg-rose-500', neutral: 'bg-blue-500' }[tone];

    const inM = log.checked_in_at ? toMins(log.checked_in_at) : null;
    const ongoing = !!inM && !log.checked_out_at && log.is_today;
    const outM = log.checked_out_at ? toMins(log.checked_out_at) : ongoing ? Math.max(nowMins, (inM ?? 0) + 1) : null;

    return (
        <div className="relative h-5">
            {/* Суурь шугам ба цагийн тэмдэг */}
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
            {TICKS.map(h => (
                <div key={h} className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-border" style={{ left: tickLeft(h) }} />
            ))}

            {/* Хуваарь */}
            {log.scheduled_start && log.scheduled_end && (
                <div className="absolute top-1/2 h-3.5 -translate-y-1/2 rounded-md border border-dashed border-sky-400/60 bg-sky-400/5"
                    style={{ left: `${pct(toMins(log.scheduled_start))}%`, width: `${pct(toMins(log.scheduled_end)) - pct(toMins(log.scheduled_start))}%` }} />
            )}

            {/* Бодит ажилласан хугацаа */}
            {inM !== null && outM !== null && (
                <div className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r ${bar} ${ongoing ? 'opacity-80' : ''}`}
                    style={{ left: `${pct(inM)}%`, width: `${Math.max(0.8, pct(outM) - pct(inM))}%` }} />
            )}
            {inM !== null && (
                <div className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card ${dot}`} style={{ left: `${pct(inM)}%` }} />
            )}
            {outM !== null && !ongoing && (
                <div className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card ${dot}`} style={{ left: `${pct(outM)}%` }} />
            )}
            {ongoing && (
                <span className="absolute top-1/2 flex size-2.5 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pct(outM!)}%` }}>
                    <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${dot}`} />
                    <span className={`relative inline-flex size-2.5 rounded-full ring-2 ring-card ${dot}`} />
                </span>
            )}
        </div>
    );
}

/** Цагийн шугамын гарчгийн цагууд (09:00, 12:00 …) */
export function TimelineTicks() {
    return (
        <span className="relative hidden h-3 lg:block">
            {TICKS.map(h => (
                <span key={h} className="absolute -translate-x-1/2 tabular-nums" style={{ left: tickLeft(h) }}>{String(h).padStart(2, '0')}:00</span>
            ))}
        </span>
    );
}

/** Өнөөдөр ажиллаж байгаа хүний одоог хүртэл ажилласан хугацаа. */
export function Worked({ log, nowMins }: { log: AttendanceLog; nowMins: number }) {
    if (log.worked_minutes) return <span className="text-xs font-semibold tabular-nums text-foreground">{fmtMins(log.worked_minutes)}</span>;
    if (log.is_today && log.checked_in_at && !log.checked_out_at) {
        const live = nowMins - toMins(log.checked_in_at);
        if (live > 0) return <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400" title="Одоог хүртэл">{fmtMins(live)}</span>;
    }
    return <Dash />;
}

export type Accent = 'sky' | 'blue' | 'emerald' | 'rose' | 'red' | 'amber' | 'violet' | 'indigo' | 'slate';

const ACCENT: Record<Accent, string> = {
    sky: 'text-sky-700 dark:text-sky-400',
    blue: 'text-blue-700 dark:text-blue-400',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    rose: 'text-rose-600 dark:text-rose-400',
    red: 'text-red-700 dark:text-red-400',
    amber: 'text-amber-700 dark:text-amber-400',
    violet: 'text-violet-700 dark:text-violet-400',
    indigo: 'text-indigo-700 dark:text-indigo-400',
    slate: 'text-foreground',
};

/** Жижиг үзүүлэлтийн мөр (лабын ажилтны тайлангийнхтай ижил хэв маяг). */
export function StatStrip({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`grid divide-x divide-sky-100/80 border-t border-sky-100/80 dark:divide-white/10 dark:border-white/10 ${className}`}>
            {children}
        </div>
    );
}

export function Stat({ label, value, sub, accent = 'slate', title }: {
    label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: Accent; title?: string;
}) {
    return (
        <div className="min-w-0 px-2 py-1.5 text-center" title={title}>
            <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="truncate text-sm font-bold leading-tight">
                <span className={ACCENT[accent]}>{value}</span>
                {sub && <span className="ml-1 text-[10px] font-medium text-muted-foreground">{sub}</span>}
            </p>
        </div>
    );
}

/** Үндсэн салбараасаа өөр газар ажилласан өдөр — «Үндсэн: Хороолол» */
export function GuestBadge({ log }: { log: AttendanceLog }) {
    if (!log.home_branch || log.home_branch_id === log.branch_id) return null;
    return (
        <span title="Энэ өдөр үндсэн салбараасаа өөр газар ажилласан"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-500/10 px-1.5 py-px text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:text-indigo-300">
            <Building2 className="size-2.5" />Үндсэн: {log.home_branch}
        </span>
    );
}

/* ───────────────────────── Салбарын шүүлтүүр ───────────────────────── */

/** '' = бүх салбар, 'none' = салбаргүй ажилтан */
export type BranchKey = number | 'none' | '';

export const branchKeyOf = (id: number | null): number | 'none' => id ?? 'none';

export function BranchChips({ branches, counts, value, onChange }: {
    branches: Option[];
    /** Салбар бүрийн мөрийн тоо; key = branch id | 'none' */
    counts: Map<number | 'none', number>;
    value: BranchKey;
    onChange: (v: BranchKey) => void;
}) {
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    const items: { key: BranchKey; name: string; count: number }[] = [
        { key: '', name: 'Бүх салбар', count: total },
        ...branches.map(b => ({ key: b.id as BranchKey, name: b.name, count: counts.get(b.id) ?? 0 })),
    ];
    if (counts.get('none')) items.push({ key: 'none', name: 'Салбаргүй', count: counts.get('none') ?? 0 });

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {items.map(it => {
                const active = value === it.key;
                return (
                    <button key={String(it.key)} type="button" onClick={() => onChange(it.key)}
                        className={`flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold shadow-sm ring-1 transition ${active
                            ? 'bg-sky-600 text-white ring-sky-600'
                            : `bg-white/80 ring-black/5 hover:text-foreground dark:bg-white/[0.06] dark:ring-white/10 ${it.count ? 'text-foreground/80' : 'text-muted-foreground/60'}`}`}>
                        {it.key !== '' && <Building2 className="size-3 opacity-70" />}
                        {it.name}
                        <span className={`rounded-md px-1.5 text-[10px] tabular-nums ${active ? 'bg-white/20' : 'bg-muted text-muted-foreground'}`}>{it.count}</span>
                    </button>
                );
            })}
        </div>
    );
}

/* ───────────────────────── Үечлэл сонгогч ───────────────────────── */

export const PERIOD_TYPES: [PeriodType, string][] = [
    ['half_month', '15 хоног'], ['month', 'Сар'], ['quarter', 'Улирал'], ['half_year', '6 сар'], ['year', 'Жил'],
];

/**
 * 15 хоног / сар / улирал / 6 сар / жил + өмнөх, дараагийн үе.
 * Төрөл солиход одоогийн үе бол өнөөдрийг, үгүй бол үеийн сүүлийн өдрийг агуулсан үе рүү очно.
 */
export function PeriodPicker({ period, onNavigate }: { period: Period; onNavigate: (type: PeriodType, date?: string) => void }) {
    const navBtn = 'flex h-full w-7 items-center justify-center text-muted-foreground transition hover:bg-black/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-white/10';

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-7 items-center rounded-lg bg-white/80 p-0.5 shadow-sm ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10">
                {PERIOD_TYPES.map(([type, label]) => (
                    <button key={type} type="button"
                        onClick={() => type !== period.type && onNavigate(type, period.is_current ? undefined : period.to)}
                        className={`h-full rounded-md px-2 text-[11px] font-semibold transition ${period.type === type ? 'bg-sky-600 text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}>
                        {label}
                    </button>
                ))}
            </div>

            <div className="flex h-7 items-center overflow-hidden rounded-lg bg-white/80 shadow-sm ring-1 ring-black/5 backdrop-blur dark:bg-white/[0.06] dark:ring-white/10">
                <button type="button" onClick={() => onNavigate(period.type, period.prev)} title="Өмнөх үе" className={navBtn}>
                    <ChevronLeft className="size-4" />
                </button>
                <span className="flex min-w-[140px] items-center justify-center gap-1.5 px-1 text-[11px] font-bold tabular-nums text-foreground" title={period.range}>
                    <CalendarRange className="size-3.5 text-sky-500" />{period.label}
                </span>
                <button type="button" disabled={!period.next} onClick={() => period.next && onNavigate(period.type, period.next)} title="Дараагийн үе" className={navBtn}>
                    <ChevronRight className="size-4" />
                </button>
            </div>
            <span className="hidden text-[11px] tabular-nums text-muted-foreground sm:inline">{period.range} · {period.days} хоног</span>
            {!period.is_current && (
                <button type="button" onClick={() => onNavigate(period.type)} className={ghostBtn} title="Одоогийн үе рүү буцах">
                    <RotateCcw className="size-3.5" />Одоо
                </button>
            )}
        </div>
    );
}
