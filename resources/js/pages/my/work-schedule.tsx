import MyLayout from '@/layouts/my-layout';
import { ChatIcon } from '@/components/chat-icon';
import { NotificationBell } from '@/components/notification-bell';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Stethoscope, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const RED  = '#dc2626';
const RED2 = '#b91c1c';
const RED3 = '#7f1d1d';

const SC: Record<string, string> = {
    morning: '#0ea5e9', afternoon: '#f97316', full: '#10b981', off: '#94a3b8',
};
const SL: Record<string, string> = {
    morning: '#f0f9ff', afternoon: '#fff7ed', full: '#f0fdf4', off: '#f8fafc',
};
const SHIFT_SHORT: Record<string, string> = {
    morning: 'Өгл', afternoon: 'Өдөр', full: 'Бүт', off: 'Амр',
};

const MONTHS_MN = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар',
                   '7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];
const DAYS_MN   = ['Да','Мя','Лх','Пү','Ба','Бя','Ня'];
const DAYS_FULL = ['Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба','Ням'];

/* Desktop constants */
const SHIFT_BG: Record<string, string> = {
    morning: 'bg-sky-500', afternoon: 'bg-orange-500', full: 'bg-emerald-500', off: 'bg-gray-400',
};
const SHIFT_CARD: Record<string, string> = {
    morning:   'bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800',
    afternoon: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
    full:      'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
    off:       'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-700',
};
const SHIFT_TEXT: Record<string, string> = {
    morning:   'text-sky-700 dark:text-sky-300',
    afternoon: 'text-orange-700 dark:text-orange-300',
    full:      'text-emerald-700 dark:text-emerald-300',
    off:       'text-gray-500 dark:text-gray-400',
};

interface Employee { full_name: string; position: string | null; photo_url: string | null; initials: string; }
interface Schedule {
    id: number; date: string; shift_type: string; shift_label: string;
    start_time: string | null; end_time: string | null;
    room: string | null; assigned_doctor_name: string | null; notes: string | null;
}
interface PageProps { employee: Employee | null; schedules: Schedule[]; year: number; month: number; [key: string]: unknown; }
type ViewMode = 'month' | 'week' | 'day';

function pad(n: number) { return String(n).padStart(2, '0'); }
function toDS(y: number, m: number, d: number) { return `${y}-${pad(m)}-${pad(d)}`; }
function parseDate(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(date: Date, n: number) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function getMondayOfWeek(date: Date) {
    const d = new Date(date), day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return d;
}
function isToday(y: number, m: number, d: number) {
    const n = new Date(); return n.getFullYear() === y && (n.getMonth() + 1) === m && n.getDate() === d;
}
function isTodayStr(s: string) {
    const n = new Date(); return s === toDS(n.getFullYear(), n.getMonth() + 1, n.getDate());
}
function buildGrid(year: number, month: number): (number | null)[] {
    const first = new Date(year, month - 1, 1).getDay();
    const days  = new Date(year, month, 0).getDate();
    const off   = first === 0 ? 6 : first - 1;
    const cells: (number | null)[] = Array(off).fill(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);
    return cells;
}
function getShiftShort(t: string) {
    return t === 'morning' ? 'Өглөө' : t === 'afternoon' ? 'Өдөр' : t === 'full' ? 'Бүтэн' : 'Амралт';
}

/* ── Detail rows (shared mobile + desktop) ── */
function DetailRows({ s, compact }: { s: Schedule; compact?: boolean }) {
    const p = compact ? '10px 12px' : '12px 14px';
    const fs = compact ? 13 : 14;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 8 }}>
            {s.start_time && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--my-pill-bg)', borderRadius: 14, padding: p }}>
                    <Clock size={compact ? 14 : 16} color="var(--my-muted)" />
                    <span style={{ fontSize: fs, fontWeight: 700, color: 'var(--my-input-text)' }}>{s.start_time} — {s.end_time}</span>
                </div>
            )}
            {s.room && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--my-pill-bg)', borderRadius: 14, padding: p }}>
                    <MapPin size={compact ? 14 : 16} color="var(--my-muted)" />
                    <span style={{ fontSize: fs, fontWeight: 600, color: 'var(--my-input-text)' }}>Өрөө: {s.room}</span>
                </div>
            )}
            {s.assigned_doctor_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#eff6ff', borderRadius: 14, padding: p, border: '1px solid #bfdbfe' }}>
                    <Stethoscope size={compact ? 14 : 16} color="#3b82f6" />
                    <span style={{ fontSize: fs, fontWeight: 600, color: '#1e40af' }}>Эмч: {s.assigned_doctor_name}</span>
                </div>
            )}
            {s.notes && (
                <div style={{ background: 'var(--my-pill-bg)', borderRadius: 14, padding: p }}>
                    <p style={{ fontSize: 9, color: 'var(--my-faint)', margin: '0 0 3px', fontWeight: 700, letterSpacing: 0.5 }}>ТЭМДЭГЛЭЛ</p>
                    <p style={{ fontSize: fs - 1, color: 'var(--my-muted)', margin: 0 }}>{s.notes}</p>
                </div>
            )}
        </div>
    );
}

/* ── Desktop detail helper ── */
function DesktopDetail({ s }: { s: Schedule }) {
    return (
        <div className="space-y-2.5">
            {s.start_time && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                    <Clock className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold tabular-nums">{s.start_time} — {s.end_time}</span>
                </div>
            )}
            {s.room && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">Өрөө / Суудал: {s.room}</span>
                </div>
            )}
            {s.assigned_doctor_name && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                    <Stethoscope className="size-4 text-blue-500 shrink-0" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Хариуцах эмч: {s.assigned_doctor_name}</span>
                </div>
            )}
            {s.notes && (
                <div className="p-3 bg-muted/50 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">Тэмдэглэл</p>
                    <p className="text-sm">{s.notes}</p>
                </div>
            )}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════ */
export default function MyWorkSchedule() {
    const { employee, schedules: initial, year, month } = usePage<PageProps>().props;
    const [schedules, setSchedules] = useState(initial);
    const [view,      setView]      = useState<ViewMode>('month');
    const [selected,  setSelected]  = useState<Schedule | null>(null);
    const [focusDate, setFocusDate] = useState(() => {
        const n = new Date();
        return toDS(n.getFullYear(), n.getMonth() + 1, n.getDate());
    });

    useEffect(() => { setSchedules(initial); }, [initial]);

    const byDate = schedules.reduce<Record<string, Schedule>>((acc, s) => {
        acc[s.date] = s; return acc;
    }, {});

    function loadMonth(y: number, m: number, keepFocus?: string) {
        router.get('/my/work-schedule', { year: y, month: m }, {
            preserveState: true,
            only: ['schedules', 'year', 'month'],
            onSuccess: () => { if (keepFocus) setFocusDate(keepFocus); },
        });
    }
    function navMonth(dy: number) {
        let m = month + dy, y = year;
        if (m > 12) { m = 1; y++; }
        if (m < 1)  { m = 12; y--; }
        loadMonth(y, m);
    }
    function navWeek(dir: number) {
        const mon  = getMondayOfWeek(parseDate(focusDate));
        const next = addDays(mon, dir * 7);
        const fd   = toDS(next.getFullYear(), next.getMonth() + 1, next.getDate());
        setFocusDate(fd);
        const nm = next.getMonth() + 1, ny = next.getFullYear();
        if (ny !== year || nm !== month) loadMonth(ny, nm, fd);
    }
    function navDay(dir: number) {
        const next = addDays(parseDate(focusDate), dir);
        const fd   = toDS(next.getFullYear(), next.getMonth() + 1, next.getDate());
        setFocusDate(fd);
        const nm = next.getMonth() + 1, ny = next.getFullYear();
        if (ny !== year || nm !== month) loadMonth(ny, nm, fd);
    }

    const counts   = schedules.reduce<Record<string, number>>((a, s) => { a[s.shift_type] = (a[s.shift_type] ?? 0) + 1; return a; }, {});
    const workDays = schedules.filter(s => s.shift_type !== 'off').length;

    const weekDates = Array.from({ length: 7 }, (_, i) =>
        addDays(getMondayOfWeek(parseDate(focusDate)), i)
    );

    const headerLabel = view === 'month'
        ? `${year} · ${MONTHS_MN[month - 1]}`
        : view === 'week'
            ? (() => {
                const [mon, sun] = [weekDates[0], weekDates[6]];
                return mon.getMonth() === sun.getMonth()
                    ? `${MONTHS_MN[mon.getMonth()]} ${mon.getDate()}–${sun.getDate()}`
                    : `${mon.getDate()} ${MONTHS_MN[mon.getMonth()]} – ${sun.getDate()} ${MONTHS_MN[sun.getMonth()]}`;
              })()
            : (() => {
                const d = parseDate(focusDate);
                return `${DAYS_FULL[(d.getDay() + 6) % 7]}, ${d.getDate()} ${MONTHS_MN[d.getMonth()]}`;
              })();

    const navPrev = () => view === 'month' ? navMonth(-1) : view === 'week' ? navWeek(-1) : navDay(-1);
    const navNext = () => view === 'month' ? navMonth(1)  : view === 'week' ? navWeek(1)  : navDay(1);

    /* ══════════════════════════ RENDER ══════════════════════════ */
    return (
        <MyLayout breadcrumbs={[{ title: 'Ажлын хуваарь', href: '/my/work-schedule' }]}>
            <Head title="Ажлын хуваарь" />

            {/* ═══════════════════ MOBILE ═══════════════════ */}
            <div className="md:hidden" style={{ flex: 1, background: 'var(--my-page-bg)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' } as React.CSSProperties}>

                {/* ─── RED HERO ──────────────────────────────────── */}
                <div style={{ background: `linear-gradient(160deg, #ef4444 0%, ${RED} 30%, ${RED2} 65%, ${RED3} 100%)`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -60, right: -60, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: 40, right: 40, pointerEvents: 'none' }} />

                    {/* Top bar */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 0', gap: 10, position: 'relative' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, flex: 1, letterSpacing: 0.3 }}>HR · АЖЛЫН ХУВААРЬ</span>
                        <ChatIcon variant="ghost" />
                        <NotificationBell variant="ghost" />
                        <Link href="/my/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {employee?.photo_url
                                    ? <img src={employee.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                                    : <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{employee?.initials ?? '?'}</span>
                                }
                            </div>
                        </Link>
                    </div>

                    {/* Title */}
                    <div style={{ padding: '14px 18px 14px', position: 'relative' }}>
                        <h1 style={{ margin: '0 0 5px', lineHeight: 1.1, letterSpacing: -0.8 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>Ажлын </span>
                            <span style={{ fontSize: 28, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontFamily: 'Georgia, "Times New Roman", serif' }}>хуваарь</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 14px', fontWeight: 500 }}>
                            {employee?.full_name ?? '—'}{employee?.position ? ` · ${employee.position}` : ''}
                        </p>

                        {/* Stats glassmorphism */}
                        <div style={{ borderRadius: 20, background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(12px)', padding: '14px 16px', marginBottom: 4, border: '1px solid rgba(255,255,255,0.12)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: 0.6 }}>
                                    {MONTHS_MN[month - 1].toUpperCase()} · {year}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ flex: 1.2, background: 'rgba(255,255,255,0.12)', borderRadius: 13, padding: '10px 10px', textAlign: 'center' }}>
                                    <p style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{workDays}</p>
                                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: '4px 0 0', fontWeight: 600 }}>Ажлын өдөр</p>
                                </div>
                                {(['morning', 'afternoon', 'full', 'off'] as const)
                                    .filter(k => counts[k])
                                    .slice(0, 3)
                                    .map(k => (
                                        <div key={k} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 13, padding: '10px 6px', textAlign: 'center', borderLeft: `3px solid ${SC[k]}` }}>
                                            <p style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{counts[k]}</p>
                                            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontWeight: 600 }}>{SHIFT_SHORT[k]}</p>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── CONTENT AREA ──────────────────────────────── */}
                <div style={{ padding: '12px 14px 32px' }}>

                    {/* Nav card */}
                    <div style={{ background: 'var(--my-card-bg)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--my-shadow)', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 12px 8px', gap: 8 }}>
                            <button onClick={navPrev} style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--my-pill-bg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                <ChevronLeft size={16} color="var(--my-muted)" />
                            </button>
                            <p style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 800, color: 'var(--my-input-text)', margin: 0 }}>{headerLabel}</p>
                            <button onClick={navNext} style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--my-pill-bg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                <ChevronRight size={16} color="var(--my-muted)" />
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, padding: '0 12px 12px' }}>
                            {(['month', 'week', 'day'] as ViewMode[]).map(v => (
                                <button key={v} onClick={() => setView(v)} style={{
                                    flex: 1, padding: '8px 0', borderRadius: 11, border: 'none', cursor: 'pointer',
                                    background: view === v ? RED : 'var(--my-pill-bg)',
                                    color: view === v ? 'white' : 'var(--my-muted)',
                                    fontSize: 12, fontWeight: view === v ? 800 : 600,
                                }}>
                                    {v === 'month' ? 'Сар' : v === 'week' ? '7 хон' : 'Өдөр'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── MONTH VIEW ── */}
                    {view === 'month' && (() => {
                        const grid = buildGrid(year, month);
                        return (
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                {/* Day headers */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--my-divider)' }}>
                                    {DAYS_MN.map((d, i) => (
                                        <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 10, fontWeight: 800, color: i >= 5 ? '#f97316' : 'var(--my-faint)', letterSpacing: 0.4 }}>{d}</div>
                                    ))}
                                </div>
                                {/* Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                                    {grid.map((day, idx) => {
                                        const dateStr = day ? toDS(year, month, day) : '';
                                        const sched   = day ? byDate[dateStr] : null;
                                        const today   = day ? isToday(year, month, day) : false;
                                        const weekend = idx % 7 >= 5;
                                        const sc      = sched ? SC[sched.shift_type] ?? '#9ca3af' : '';
                                        return (
                                            <div key={idx}
                                                onClick={() => day && sched ? setSelected(sched) : undefined}
                                                style={{
                                                    minHeight: 60, position: 'relative',
                                                    borderBottom: '1px solid var(--my-divider)',
                                                    borderRight: '1px solid var(--my-divider)',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                    paddingTop: 3, paddingBottom: 4,
                                                    background: today ? '#fff5f5' : weekend && day ? '#fffbf7' : 'var(--my-card-bg)',
                                                    cursor: day && sched ? 'pointer' : 'default',
                                                }}
                                            >
                                                {sched && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: sc }} />}
                                                {day && (
                                                    <>
                                                        <div style={{
                                                            width: 26, height: 26, borderRadius: '50%',
                                                            background: today ? RED : 'transparent',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            marginTop: 4,
                                                        }}>
                                                            <span style={{ fontSize: 12, fontWeight: today ? 800 : 600, color: today ? 'white' : weekend ? '#f97316' : 'var(--my-text)' }}>
                                                                {day}
                                                            </span>
                                                        </div>
                                                        {sched && sched.shift_type !== 'off' && (
                                                            <span style={{ fontSize: 9, fontWeight: 700, color: sc, marginTop: 2 }}>
                                                                {SHIFT_SHORT[sched.shift_type]}
                                                            </span>
                                                        )}
                                                        {sched?.start_time && (
                                                            <span style={{ fontSize: 8, color: 'var(--my-faint)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                                                {sched.start_time}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                {schedules.length === 0 && (
                                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                                            <CalendarDays size={28} color="#d1d5db" />
                                        </div>
                                        <p style={{ fontSize: 13, color: 'var(--my-faint)', margin: 0 }}>Энэ сарын хуваарь байхгүй байна</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* ── WEEK VIEW ── */}
                    {view === 'week' && (() => {
                        const focusSched = byDate[focusDate];
                        const fd    = parseDate(focusDate);
                        const fdDow = (fd.getDay() + 6) % 7;
                        const fdToday = isTodayStr(focusDate);
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {/* 7 day cards */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
                                    {weekDates.map((d, i) => {
                                        const ds    = toDS(d.getFullYear(), d.getMonth() + 1, d.getDate());
                                        const sched = byDate[ds];
                                        const today = isTodayStr(ds);
                                        const wkend = i >= 5;
                                        const focus = ds === focusDate;
                                        const sc    = sched ? SC[sched.shift_type] ?? '#9ca3af' : '';
                                        const dow   = (d.getDay() + 6) % 7;
                                        return (
                                            <button key={i} onClick={() => setFocusDate(ds)} style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                background: 'var(--my-card-bg)', borderRadius: 16, overflow: 'hidden',
                                                border: 'none', cursor: 'pointer', padding: 0,
                                                outline: focus ? `2.5px solid ${RED}` : today ? '2px solid #fca5a5' : '2px solid transparent',
                                                boxShadow: focus ? '0 4px 16px rgba(220,38,38,0.2)' : 'var(--my-shadow)',
                                            }}>
                                                <div style={{
                                                    width: '100%', padding: '7px 0 5px', textAlign: 'center',
                                                    background: today ? RED : wkend ? '#fff7ed' : 'var(--my-pill-bg)',
                                                }}>
                                                    <span style={{ fontSize: 9, fontWeight: 700, color: today ? 'rgba(255,255,255,0.75)' : wkend ? '#f97316' : 'var(--my-faint)', display: 'block' }}>
                                                        {DAYS_MN[dow]}
                                                    </span>
                                                    <span style={{ fontSize: 17, fontWeight: 900, color: today ? 'white' : wkend ? '#f97316' : 'var(--my-input-text)', display: 'block', lineHeight: 1.1 }}>
                                                        {d.getDate()}
                                                    </span>
                                                </div>
                                                <div style={{ padding: '6px 4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minHeight: 44 }}>
                                                    {sched ? (
                                                        <>
                                                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: sc, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <span style={{ fontSize: 7, fontWeight: 900, color: 'white' }}>
                                                                    {SHIFT_SHORT[sched.shift_type]?.slice(0, 2)}
                                                                </span>
                                                            </div>
                                                            {sched.start_time && (
                                                                <span style={{ fontSize: 7, color: 'var(--my-faint)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{sched.start_time}</span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span style={{ fontSize: 13, color: 'var(--my-faint)', fontWeight: 700 }}>—</span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Selected day detail */}
                                <div style={{ background: 'var(--my-card-bg)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                    <div style={{
                                        padding: '16px 18px',
                                        background: fdToday ? `linear-gradient(135deg, ${RED}, ${RED2})` : 'linear-gradient(135deg, #374151, #1f2937)',
                                        display: 'flex', alignItems: 'center', gap: 14,
                                    }}>
                                        <div>
                                            <p style={{ fontSize: 38, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{fd.getDate()}</p>
                                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: '2px 0 0', fontWeight: 600 }}>{MONTHS_MN[fd.getMonth()]}</p>
                                        </div>
                                        <div style={{ width: 1, height: 44, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: 17, fontWeight: 800, color: 'white', margin: 0 }}>{DAYS_FULL[fdDow]}</p>
                                            {fdToday && <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>Өнөөдөр</span>}
                                        </div>
                                        {focusSched && (
                                            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 12px', textAlign: 'right', border: '1px solid rgba(255,255,255,0.25)', flexShrink: 0 }}>
                                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '0 0 2px', fontWeight: 600 }}>{focusSched.shift_label}</p>
                                                {focusSched.start_time && <p style={{ fontSize: 13, fontWeight: 900, color: 'white', margin: 0 }}>{focusSched.start_time}–{focusSched.end_time}</p>}
                                            </div>
                                        )}
                                    </div>
                                    {focusSched ? (
                                        <div style={{ padding: '14px 14px 16px' }}>
                                            <DetailRows s={focusSched} compact />
                                        </div>
                                    ) : (
                                        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                                                <CalendarDays size={28} color="#d1d5db" />
                                            </div>
                                            <p style={{ fontSize: 13, color: 'var(--my-faint)', margin: 0 }}>Энэ өдрийн хуваарь байхгүй байна</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── DAY VIEW ── */}
                    {view === 'day' && (() => {
                        const sched  = byDate[focusDate];
                        const d      = parseDate(focusDate);
                        const today  = isTodayStr(focusDate);
                        const dow    = (d.getDay() + 6) % 7;
                        const wkend  = dow >= 5;
                        return (
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                <div style={{
                                    padding: '18px 18px',
                                    background: today ? `linear-gradient(135deg, ${RED}, ${RED2})`
                                        : wkend ? 'linear-gradient(135deg, #f97316, #ea580c)'
                                        : 'linear-gradient(135deg, #374151, #1f2937)',
                                    display: 'flex', alignItems: 'center', gap: 16,
                                }}>
                                    <div>
                                        <p style={{ fontSize: 46, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{d.getDate()}</p>
                                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: '3px 0 0', fontWeight: 600 }}>{MONTHS_MN[d.getMonth()]} {d.getFullYear()}</p>
                                    </div>
                                    <div style={{ width: 1, height: 52, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: 0 }}>{DAYS_FULL[dow]}</p>
                                        {today && <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 8px', borderRadius: 99, fontWeight: 600, marginTop: 4, display: 'inline-block' }}>Өнөөдөр</span>}
                                        {wkend && !today && <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 8px', borderRadius: 99, fontWeight: 600, marginTop: 4, display: 'inline-block' }}>Амралтын өдөр</span>}
                                    </div>
                                    {sched && (
                                        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.25)', textAlign: 'right', flexShrink: 0 }}>
                                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '0 0 2px', fontWeight: 600 }}>{sched.shift_label}</p>
                                            {sched.start_time && <p style={{ fontSize: 14, fontWeight: 900, color: 'white', margin: 0 }}>{sched.start_time}–{sched.end_time}</p>}
                                        </div>
                                    )}
                                </div>
                                {sched ? (
                                    <div style={{ padding: '16px 14px 20px' }}>
                                        <DetailRows s={sched} />
                                    </div>
                                ) : (
                                    <div style={{ padding: '52px 20px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                                            <CalendarDays size={32} color="#d1d5db" />
                                        </div>
                                        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-muted)', margin: '0 0 4px' }}>Хуваарь байхгүй</p>
                                        <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0 }}>Энэ өдрийн ажлын хуваарь оруулагдаагүй байна</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* ═══════════════════ DESKTOP ═══════════════════ */}
            <div className="hidden md:block p-4 md:p-6 space-y-4">

                {/* Top bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <CalendarDays className="size-5 text-blue-500" />
                        Миний хуваарь
                    </h1>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex rounded-xl border bg-card overflow-hidden text-sm">
                            {(['month', 'week', 'day'] as ViewMode[]).map(v => (
                                <button key={v} onClick={() => setView(v)}
                                    className={`px-3 py-1.5 font-medium transition-colors ${view === v ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}>
                                    {v === 'month' ? 'Сар' : v === 'week' ? '7 хоног' : 'Өдөр'}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-1 rounded-xl border bg-card px-1">
                            <button onClick={navPrev} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                                <ChevronLeft className="size-4" />
                            </button>
                            <span className="text-sm font-semibold px-2 min-w-[130px] text-center">{headerLabel}</span>
                            <button onClick={navNext} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                        <button onClick={() => {
                            const n = new Date();
                            const fd = toDS(n.getFullYear(), n.getMonth() + 1, n.getDate());
                            setFocusDate(fd);
                            if (n.getFullYear() !== year || (n.getMonth() + 1) !== month)
                                loadMonth(n.getFullYear(), n.getMonth() + 1, fd);
                        }} className="px-3 py-1.5 rounded-xl border bg-card text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                            Өнөөдөр
                        </button>
                    </div>
                </div>

                {/* Stats */}
                {view === 'month' && schedules.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="rounded-xl border bg-card p-3 text-center">
                            <p className="text-2xl font-bold">{workDays}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Ажлын өдөр</p>
                        </div>
                        {counts.morning ? (
                            <div className="rounded-xl border bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 p-3 text-center">
                                <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">{counts.morning}</p>
                                <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5">Өглөөний ээлж</p>
                            </div>
                        ) : null}
                        {counts.afternoon ? (
                            <div className="rounded-xl border bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 p-3 text-center">
                                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{counts.afternoon}</p>
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">Өдрийн ээлж</p>
                            </div>
                        ) : null}
                        {counts.off ? (
                            <div className="rounded-xl border bg-gray-50 dark:bg-gray-900/20 p-3 text-center">
                                <p className="text-2xl font-bold text-gray-500">{counts.off}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Амралт</p>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Month view */}
                {view === 'month' && (() => {
                    const grid = buildGrid(year, month);
                    return (
                        <>
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-card shadow-sm">
                                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                    {DAYS_MN.map(d => (
                                        <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7">
                                    {grid.map((day, idx) => {
                                        const dateStr  = day ? toDS(year, month, day) : '';
                                        const schedule = day ? byDate[dateStr] : null;
                                        const today    = day ? isToday(year, month, day) : false;
                                        const isWkend  = idx % 7 >= 5;
                                        return (
                                            <div key={idx}
                                                onClick={() => {
                                                    if (!day) return;
                                                    if (schedule) setSelected(schedule);
                                                    else { setFocusDate(dateStr); setView('day'); }
                                                }}
                                                className={`relative min-h-[90px] border-b border-r border-gray-100 dark:border-gray-800 p-1.5 transition-all
                                                    ${day ? 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10' : 'bg-gray-50/50 dark:bg-gray-900/30'}
                                                    ${isWkend && day ? 'bg-orange-50/30 dark:bg-orange-900/5' : ''}
                                                    ${today ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}
                                                `}>
                                                {schedule && (
                                                    <div className={`absolute inset-x-0 top-0 h-[3px] rounded-t ${SHIFT_BG[schedule.shift_type] ?? 'bg-gray-300'}`} />
                                                )}
                                                {day && (
                                                    <>
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setFocusDate(toDS(year, month, day)); setView('day'); }}
                                                            className={`text-xs font-bold flex items-center justify-center w-6 h-6 rounded-full mb-1 hover:ring-2 hover:ring-blue-400 transition-all
                                                                ${today ? 'bg-blue-600 text-white' : isWkend ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300'}
                                                            `}>
                                                            {day}
                                                        </button>
                                                        {schedule ? (
                                                            <div className={`rounded-lg border px-1.5 py-1 ${SHIFT_CARD[schedule.shift_type]}`}>
                                                                <div className="flex items-center gap-1 mb-0.5">
                                                                    <span className={`size-1.5 rounded-full shrink-0 ${SHIFT_BG[schedule.shift_type]}`} />
                                                                    <span className={`text-[10px] font-semibold truncate flex-1 ${SHIFT_TEXT[schedule.shift_type]}`}>
                                                                        {getShiftShort(schedule.shift_type)}
                                                                    </span>
                                                                </div>
                                                                {schedule.start_time && (
                                                                    <p className={`text-[9px] font-medium tabular-nums ${SHIFT_TEXT[schedule.shift_type]} opacity-80`}>
                                                                        {schedule.start_time}–{schedule.end_time}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-[9px] text-gray-300 dark:text-gray-700">—</div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {schedules.length === 0 && (
                                <div className="py-10 text-center text-muted-foreground">
                                    <CalendarDays className="size-10 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Энэ сарын хуваарь одоогоор оруулагдаагүй байна</p>
                                </div>
                            )}
                        </>
                    );
                })()}

                {/* Week view */}
                {view === 'week' && (() => {
                    const focusSched = byDate[focusDate];
                    const fd = parseDate(focusDate);
                    const fdDow = (fd.getDay() + 6) % 7;
                    const fdWeekend = fdDow >= 5;
                    const fdToday = isTodayStr(focusDate);
                    return (
                        <div className="space-y-4">
                            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                                <div className="grid grid-cols-7 gap-1.5 min-w-[360px]">
                                    {weekDates.map((d, i) => {
                                        const ds    = toDS(d.getFullYear(), d.getMonth() + 1, d.getDate());
                                        const sched = byDate[ds];
                                        const today = isTodayStr(ds);
                                        const wkend = i >= 5;
                                        const dow   = (d.getDay() + 6) % 7;
                                        const focus = ds === focusDate;
                                        return (
                                            <button key={i} onClick={() => setFocusDate(ds)}
                                                className={`relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all text-left
                                                    ${focus ? 'border-blue-500 shadow-lg shadow-blue-100 dark:shadow-blue-900/30'
                                                    : today ? 'border-blue-400 dark:border-blue-600'
                                                    : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}`}>
                                                <div className={`w-full py-2.5 flex flex-col items-center gap-0.5
                                                    ${today ? 'bg-blue-600' : wkend ? 'bg-orange-50 dark:bg-orange-950/30' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                                    <span className={`text-[10px] font-semibold leading-none
                                                        ${today ? 'text-blue-100' : wkend ? 'text-orange-400' : 'text-muted-foreground'}`}>
                                                        {DAYS_MN[dow]}
                                                    </span>
                                                    <span className={`text-xl font-black leading-tight
                                                        ${today ? 'text-white' : wkend ? 'text-orange-500' : 'text-gray-800 dark:text-gray-100'}`}>
                                                        {d.getDate()}
                                                    </span>
                                                </div>
                                                <div className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-1 min-h-[72px]
                                                    ${today ? 'bg-blue-50/60 dark:bg-blue-900/10' : wkend ? 'bg-orange-50/20 dark:bg-orange-950/10' : 'bg-card'}`}>
                                                    {sched ? (
                                                        <>
                                                            <span className={`size-8 rounded-full flex items-center justify-center shrink-0 ${SHIFT_BG[sched.shift_type]}`}>
                                                                <span className="text-white text-[9px] font-black">{getShiftShort(sched.shift_type).slice(0, 2)}</span>
                                                            </span>
                                                            {sched.start_time && <span className="text-[9px] text-muted-foreground font-semibold tabular-nums leading-none">{sched.start_time}</span>}
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-200 dark:text-gray-700 text-base font-bold">—</span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className={`rounded-2xl border overflow-hidden
                                ${fdToday ? 'border-blue-200 dark:border-blue-800'
                                : fdWeekend ? 'border-orange-200 dark:border-orange-800'
                                : 'border-gray-200 dark:border-gray-700'}`}>
                                <div className={`px-5 py-4 flex items-center gap-4
                                    ${fdToday ? 'bg-gradient-to-r from-blue-600 to-blue-500'
                                    : fdWeekend ? 'bg-gradient-to-r from-orange-500 to-orange-400'
                                    : 'bg-gradient-to-r from-gray-700 to-gray-600'}`}>
                                    <div className="text-white">
                                        <p className="text-4xl font-black leading-none">{fd.getDate()}</p>
                                        <p className="text-xs font-semibold opacity-70 mt-0.5">{MONTHS_MN[fd.getMonth()]}</p>
                                    </div>
                                    <div className="w-px h-10 bg-white/20" />
                                    <div className="flex-1">
                                        <p className="text-white text-lg font-bold">{DAYS_FULL[fdDow]}</p>
                                        {fdToday && <span className="text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">Өнөөдөр</span>}
                                    </div>
                                    {focusSched && (
                                        <div className="text-right">
                                            <p className="text-white text-xs font-semibold opacity-70">{focusSched.shift_label}</p>
                                            {focusSched.start_time && <p className="text-white text-sm font-black tabular-nums">{focusSched.start_time}–{focusSched.end_time}</p>}
                                        </div>
                                    )}
                                </div>
                                {focusSched ? (
                                    <div className="p-4 bg-card"><DesktopDetail s={focusSched} /></div>
                                ) : (
                                    <div className="py-10 text-center bg-card">
                                        <CalendarDays className="size-8 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
                                        <p className="text-sm text-muted-foreground">Энэ өдрийн хуваарь байхгүй байна</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Day view */}
                {view === 'day' && (() => {
                    const sched  = byDate[focusDate];
                    const d      = parseDate(focusDate);
                    const today  = isTodayStr(focusDate);
                    const dow    = (d.getDay() + 6) % 7;
                    const wkend  = dow >= 5;
                    return (
                        <div className={`rounded-2xl border overflow-hidden
                            ${today ? 'border-blue-200 dark:border-blue-800'
                            : wkend ? 'border-orange-200 dark:border-orange-800'
                            : 'border-gray-200 dark:border-gray-700'}`}>
                            <div className={`px-4 py-3 flex items-center gap-3
                                ${today ? 'bg-gradient-to-r from-blue-600 to-blue-500'
                                : wkend ? 'bg-gradient-to-r from-orange-500 to-orange-400'
                                : 'bg-gradient-to-r from-gray-700 to-gray-600'}`}>
                                <div className="text-white">
                                    <p className="text-3xl font-black leading-none">{d.getDate()}</p>
                                    <p className="text-[11px] font-semibold opacity-70 mt-0.5">{MONTHS_MN[d.getMonth()]} {d.getFullYear()}</p>
                                </div>
                                <div className="w-px h-8 bg-white/20" />
                                <div className="flex-1">
                                    <p className="text-white text-sm font-bold">{DAYS_FULL[dow]}</p>
                                    {today && <span className="inline-block text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-medium">Өнөөдөр</span>}
                                    {wkend && !today && <span className="inline-block text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-medium">Амралтын өдөр</span>}
                                </div>
                                {sched && (
                                    <div className="shrink-0 text-right bg-white/15 border border-white/30 rounded-xl px-3 py-1.5">
                                        <p className="text-white text-[11px] font-semibold opacity-80 leading-tight">{sched.shift_label}</p>
                                        {sched.start_time && <p className="text-white text-sm font-black tabular-nums">{sched.start_time}–{sched.end_time}</p>}
                                    </div>
                                )}
                            </div>
                            {sched ? (
                                <div className="p-3 bg-card"><DesktopDetail s={sched} /></div>
                            ) : (
                                <div className="py-8 text-center bg-card">
                                    <CalendarDays className="size-7 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
                                    <p className="text-sm text-muted-foreground">Энэ өдрийн хуваарь байхгүй байна</p>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Month-view detail bottom sheet */}
            {selected && (
                <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--my-sheet-bg)', borderRadius: '26px 26px 0 0', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)' }}>
                        <div style={{ width: 36, height: 4, background: 'var(--my-divider)', borderRadius: 99, margin: '14px auto 8px' }} />
                        {/* Header */}
                        <div style={{ margin: '0 14px 14px', padding: '14px 16px', background: SL[selected.shift_type] ?? 'var(--my-pill-bg)', borderRadius: 18 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 14, background: SC[selected.shift_type] ?? '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <CalendarDays size={18} color="white" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--my-text)', margin: 0 }}>{selected.shift_label}</p>
                                    <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: '2px 0 0' }}>{selected.date}</p>
                                </div>
                                <button onClick={() => setSelected(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--my-pill-bg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <X size={14} color="var(--my-muted)" />
                                </button>
                            </div>
                        </div>
                        <div style={{ padding: '0 14px' }}>
                            <DetailRows s={selected} />
                        </div>
                        <div style={{ padding: '14px 14px 0' }}>
                            <button onClick={() => setSelected(null)} style={{ width: '100%', padding: '14px', background: 'var(--my-pill-bg)', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--my-muted)' }}>
                                Хаах
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MyLayout>
    );
}
