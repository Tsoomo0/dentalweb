import { AptDetailModal, type ModalAppt } from '@/components/cal-modals';
import DoctorLayout from '@/layouts/doctor-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    CalendarCheck2, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight,
    Clock, Menu, Stethoscope, User, X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ─── Types ─── */
interface Experience { year: string; title: string; institution: string }
interface Doctor {
    id: number; name: string; specialization: string | null; degree: string | null;
    experience_years: number; experiences: Experience[] | null;
    description: string | null; phone: string | null; email: string | null;
    photo_url: string | null; branch_name: string | null;
    online_slots: object[]; is_active: boolean;
}
interface Appt {
    id: number; appointment_number: string;
    patient_name: string; patient_phone: string; patient_email: string | null;
    service: string | null; type: 'online' | 'in_person';
    appointment_date: string; appointment_time: string;
    appointment_time_end: string | null; formatted_date: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    payment_status: string | null;
    notes: string | null; branch_name: string | null;
    _senior_name?: string;
    _senior_color?: string;
}
interface SeniorDoctorProp { id: number; name: string; appointments: Appt[] }
interface Stats { today: number; upcoming: number; pending: number; total: number }
interface Props { doctor: Doctor; appointments: Appt[]; senior_doctors: SeniorDoctorProp[]; stats: Stats }

/* ─── Constants ─── */
const DAYS_MN   = ['Дав','Мяг','Лха','Пүр','Баа','Бям','Ням'];
const MONTHS_MN = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар','7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];

const STATUS_CHIP: Record<string, string> = {
    pending:   'bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300',
    confirmed: 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300',
    cancelled: 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
    completed: 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300',
};
const STATUS_LABEL: Record<string, string> = {
    pending: 'Хүлээгдэж байна', confirmed: 'Баталгаажсан',
    cancelled: 'Цуцлагдсан', completed: 'Дууссан',
};
const STATUS_DOT: Record<string, string> = {
    pending: 'bg-yellow-400', confirmed: 'bg-green-500',
    cancelled: 'bg-red-400', completed: 'bg-blue-400',
};

const IP_PAL     = { bg: '#8b5cf6', light: 'rgba(139,92,246,0.15)', border: '#7c3aed' };
const ONLINE_PAL = { bg: '#3b82f6', light: 'rgba(59,130,246,0.15)', border: '#2563eb' };
function aptPal(type: string) { return type === 'online' ? ONLINE_PAL : IP_PAL; }
function initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

const SENIOR_PALETTE = [
    { bg: '#10b981', light: 'rgba(16,185,129,0.18)',  border: '#059669' },
    { bg: '#06b6d4', light: 'rgba(6,182,212,0.18)',   border: '#0891b2' },
    { bg: '#f59e0b', light: 'rgba(245,158,11,0.18)',  border: '#d97706' },
    { bg: '#ec4899', light: 'rgba(236,72,153,0.18)',  border: '#db2777' },
    { bg: '#6366f1', light: 'rgba(99,102,241,0.18)',  border: '#4f46e5' },
    { bg: '#84cc16', light: 'rgba(132,204,22,0.18)',  border: '#65a30d' },
];
function seniorPal(i: number) { return SENIOR_PALETTE[i % SENIOR_PALETTE.length]; }


function aptColorForAppt(a: Appt) {
    if (a._senior_color) {
        const c = a._senior_color;
        return { bg: c, light: `${c}22`, border: c };
    }
    return aptPal(a.type);
}

function toMins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function aptEndMins<T extends { appointment_time: string; appointment_time_end: string | null }>(a: T) {
    return a.appointment_time_end ? toMins(a.appointment_time_end) : toMins(a.appointment_time) + 20;
}
function computeColumns<T extends { appointment_time: string; appointment_time_end: string | null }>(
    apts: T[]
): Array<{ apt: T; col: number; totalCols: number }> {
    if (!apts.length) return [];
    const sorted = [...apts].sort((a, b) => toMins(a.appointment_time) - toMins(b.appointment_time));
    const colEnd: number[] = [];
    const cols: number[] = [];
    for (const a of sorted) {
        const s = toMins(a.appointment_time);
        let c = colEnd.findIndex(e => e <= s);
        if (c === -1) c = colEnd.length;
        cols.push(c);
        colEnd[c] = aptEndMins(a);
    }
    return sorted.map((apt, i) => {
        const s = toMins(apt.appointment_time), e = aptEndMins(apt);
        const maxCol = Math.max(...sorted.map((o, j) => (toMins(o.appointment_time) < e && aptEndMins(o) > s ? cols[j] : 0)));
        return { apt, col: cols[i], totalCols: maxCol + 1 };
    });
}

/* ─── Helpers ─── */
function pad(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function getDays(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDow(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7; }

/* ─── Main ─── */
export default function DoctorDashboard({ doctor, appointments, senior_doctors, stats }: Props) {
    const today    = new Date();
    const todayStr = pad(today.getFullYear(), today.getMonth(), today.getDate());

    const [nowTime, setNowTime] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNowTime(new Date()), 60_000);
        return () => clearInterval(id);
    }, []);

    const [year,  setYear]  = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [selected, setSelected] = useState<string | null>(null);
    const [view, setView]   = useState<'month' | 'week' | 'day'>('month');
    const [detail, setDetail] = useState<Appt | null>(null);
    const dayScrollRef = useRef<HTMLDivElement>(null);

    const [checkedSeniors, setCheckedSeniors] = useState<number[]>([]);
    const toggleSenior = (id: number) =>
        setCheckedSeniors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const [doctorPanelOpen, setDoctorPanelOpen] = useState(false);

    const seniorColorMap = useMemo(() => {
        const map: Record<number, string> = {};
        senior_doctors.forEach((s, i) => { map[s.id] = seniorPal(i).bg; });
        return map;
    }, [senior_doctors]);

    /* ── Mobile: always day view ── */
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    const selDay = selected ?? todayStr;

    /* ── Scroll day view to current hour ── */
    useEffect(() => {
        if (view === 'day' && dayScrollRef.current) {
            dayScrollRef.current.scrollTop = Math.max(0, (today.getHours() - 8) * 120 - 32);
        }
    }, [view, selected]);

    /* ── Lock scroll on desktop calendar ── */
    useEffect(() => {
        if (!isMobile) {
            const prev = document.documentElement.style.overflow;
            document.documentElement.style.overflow = 'hidden';
            return () => { document.documentElement.style.overflow = prev; };
        }
    }, [isMobile]);

    /* ── Navigation ── */
    function prevMonth() { month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1); }
    function nextMonth() { month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1); }
    function prevDay() {
        const d = new Date(selDay + 'T00:00'); d.setDate(d.getDate() - 1);
        const s = pad(d.getFullYear(), d.getMonth(), d.getDate());
        setSelected(s); setYear(d.getFullYear()); setMonth(d.getMonth());
    }
    function nextDay() {
        const d = new Date(selDay + 'T00:00'); d.setDate(d.getDate() + 1);
        const s = pad(d.getFullYear(), d.getMonth(), d.getDate());
        setSelected(s); setYear(d.getFullYear()); setMonth(d.getMonth());
    }
    function prevWeek() {
        const d = new Date(selDay + 'T00:00'); d.setDate(d.getDate() - 7);
        const s = pad(d.getFullYear(), d.getMonth(), d.getDate());
        setSelected(s); setYear(d.getFullYear()); setMonth(d.getMonth());
    }
    function nextWeek() {
        const d = new Date(selDay + 'T00:00'); d.setDate(d.getDate() + 7);
        const s = pad(d.getFullYear(), d.getMonth(), d.getDate());
        setSelected(s); setYear(d.getFullYear()); setMonth(d.getMonth());
    }

    /* ── Calendar data ── */
    const allApts = useMemo(() => {
        const own = appointments.filter(a => a.status === 'confirmed');
        const senior = checkedSeniors.flatMap(id => {
            const s = senior_doctors.find(x => x.id === id);
            if (!s) return [];
            const color = seniorColorMap[id];
            return s.appointments.map(a => ({ ...a, _senior_name: s.name, _senior_color: color }));
        });
        return [...own, ...senior];
    }, [appointments, checkedSeniors, senior_doctors, seniorColorMap]);

    const aptByDate = useMemo(() => {
        const map: Record<string, Appt[]> = {};
        for (const a of allApts) (map[a.appointment_date] ??= []).push(a);
        return map;
    }, [allApts]);

    const weekStart = useMemo(() => {
        const d = selected ? new Date(selected + 'T00:00') : new Date(year, month, 1);
        const s = new Date(d); s.setDate(d.getDate() - (d.getDay() + 6) % 7); return s;
    }, [selected, year, month]);
    const weekDays = useMemo(() =>
        Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; }),
        [weekStart]
    );

    const daysInMonth  = getDays(year, month);
    const firstWeekDay = getFirstDow(year, month);
    const totalCells   = Math.ceil((firstWeekDay + daysInMonth) / 7) * 7;

    /* ── Day view constants ── */
    const HOUR_START = 8;
    const HOUR_END   = 21;
    const HOUR_H     = 120;
    const PX_PER_MIN = HOUR_H / 60;
    const nowTop = ((nowTime.getHours() * 60 + nowTime.getMinutes() - HOUR_START * 60) / 60) * HOUR_H;

    function aptTop(time: string) {
        const [h, m] = time.split(':').map(Number);
        return Math.max(0, ((h * 60 + m - HOUR_START * 60) / 60) * HOUR_H);
    }

    /* ── Stats pills ── */
    const statItems = [
        { label: 'Өнөөдөр',    value: stats.today,    icon: CalendarClock,  grad: 'from-blue-500 to-indigo-600' },
        { label: 'Баталгаажсан', value: stats.upcoming, icon: CalendarCheck2, grad: 'from-green-500 to-teal-600' },
        { label: 'Хүлээгдэж буй', value: stats.pending, icon: Clock,          grad: 'from-yellow-500 to-orange-500' },
        { label: 'Нийт',        value: stats.total,    icon: User,           grad: 'from-zinc-500 to-zinc-700' },
    ];

    const isDesktop = !isMobile;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Хяналтын самбар', href: '/doctor/dashboard' },
        { title: 'Календарь',       href: '/doctor/calendar' },
    ];

    return (
        <DoctorLayout breadcrumbs={breadcrumbs}>
            <Head title="Календарь" />

            {detail && <AptDetailModal apt={{ ...detail, doctor_id: null, doctor_name: null, doctor_spec: null, branch_id: null, admin_notes: null, created_by: null, confirmed_by: null } as unknown as ModalAppt} onClose={() => setDetail(null)} readonly />}

            {/* ── Desktop layout: full-height calendar ── */}
            {isDesktop ? (
                <div className="flex overflow-hidden" style={{ height: 'calc(100svh - 4rem)' }}>

                    {/* Left panel */}
                    <div className="flex w-56 shrink-0 flex-col overflow-hidden border-r bg-card">
                        <div className="cal-scroll flex flex-1 flex-col gap-4 overflow-y-auto p-3">

                            {/* Stats */}
                            <div className="space-y-2 pt-1">
                                {statItems.map(s => (
                                    <div key={s.label} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
                                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${s.grad} text-white`}>
                                            <s.icon className="size-3.5" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold leading-none tabular-nums">{s.value}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t" />

                            {/* Mini calendar */}
                            <div className="select-none">
                                <div className="flex items-center justify-between mb-1.5">
                                    <button onClick={prevMonth} className="rounded p-0.5 hover:bg-muted transition-colors">
                                        <ChevronLeft className="size-3.5 text-muted-foreground" />
                                    </button>
                                    <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(todayStr); }}
                                        className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                                        {year} · {MONTHS_MN[month]}
                                    </button>
                                    <button onClick={nextMonth} className="rounded p-0.5 hover:bg-muted transition-colors">
                                        <ChevronRight className="size-3.5 text-muted-foreground" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-7 mb-0.5">
                                    {DAYS_MN.map(d => (
                                        <div key={d} className="text-center text-[9px] font-semibold text-muted-foreground/60 py-0.5">{d[0]}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-y-0.5">
                                    {Array.from({ length: Math.ceil((getFirstDow(year, month) + getDays(year, month)) / 7) * 7 }, (_, idx) => {
                                        const dayNum  = idx - getFirstDow(year, month) + 1;
                                        const inMonth = dayNum >= 1 && dayNum <= getDays(year, month);
                                        const ds      = inMonth ? pad(year, month, dayNum) : '';
                                        const isToday = ds === todayStr;
                                        const isSel   = ds === selected;
                                        const hasCnt  = ds ? (aptByDate[ds]?.length ?? 0) : 0;
                                        return (
                                            <button key={idx} disabled={!inMonth}
                                                onClick={() => { if (inMonth) setSelected(isSel ? null : ds); }}
                                                className={`relative flex flex-col items-center justify-center rounded-full text-[10px] font-medium h-6 w-6 mx-auto transition-colors ${
                                                    !inMonth  ? 'opacity-0 pointer-events-none' :
                                                    isToday   ? 'bg-red-600 text-white font-bold' :
                                                    isSel     ? 'bg-red-100 text-red-700 dark:bg-red-950/40 font-bold' :
                                                    'text-foreground hover:bg-muted'
                                                }`}>
                                                {dayNum}
                                                {hasCnt > 0 && !isToday && (
                                                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 size-1 rounded-full bg-red-500" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>


                            {/* Senior doctors filter */}
                            {senior_doctors.length > 0 && (
                                <>
                                    <div className="border-t" />
                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                <Stethoscope className="size-3.5" /> Ахлах эмч нар
                                            </div>
                                            {checkedSeniors.length > 0 && (
                                                <button onClick={() => setCheckedSeniors([])}
                                                    className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors">
                                                    бүгд
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-0.5">
                                            {senior_doctors.map((s, i) => {
                                                const pal     = seniorPal(i);
                                                const checked = checkedSeniors.includes(s.id);
                                                const count   = (() => {
                                                    if (view === 'day') return s.appointments.filter(a => a.appointment_date === selDay).length;
                                                    if (view === 'week') {
                                                        const wds = new Set(weekDays.map(d => pad(d.getFullYear(), d.getMonth(), d.getDate())));
                                                        return s.appointments.filter(a => wds.has(a.appointment_date)).length;
                                                    }
                                                    const mo = String(month + 1).padStart(2, '0');
                                                    return s.appointments.filter(a => a.appointment_date.startsWith(`${year}-${mo}`)).length;
                                                })();
                                                return (
                                                    <label key={s.id}
                                                        className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors select-none ${checked ? 'bg-muted/80' : 'hover:bg-muted/60'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => toggleSenior(s.id)}
                                                            className="size-3.5 rounded cursor-pointer"
                                                            style={{ accentColor: pal.bg }}
                                                        />
                                                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                                                            style={{ background: pal.bg }}>
                                                            {initials(s.name)}
                                                        </div>
                                                        <span className="flex-1 truncate text-xs">{s.name}</span>
                                                        {count > 0 && (
                                                            <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                                                                style={{ background: pal.light, color: pal.border }}>
                                                                {count}
                                                            </span>
                                                        )}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Legend */}
                            <div className="mt-auto border-t pt-3 space-y-1.5">
                                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                                    <span key={k} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <span className={`size-2 rounded-full ${STATUS_DOT[k]}`} /> {v}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main calendar area */}
                    <div className="flex flex-1 flex-col overflow-hidden p-4 gap-3 min-w-0">
                        {/* Toolbar */}
                        <div className="rounded-xl border bg-card overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(todayStr); }}
                                        className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                                        Өнөөдөр
                                    </button>
                                    <div className="flex items-center gap-0.5">
                                        <button onClick={view === 'day' ? prevDay : view === 'week' ? prevWeek : prevMonth}
                                            className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                                            <ChevronLeft className="size-4" />
                                        </button>
                                        <button onClick={view === 'day' ? nextDay : view === 'week' ? nextWeek : nextMonth}
                                            className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                                            <ChevronRight className="size-4" />
                                        </button>
                                    </div>
                                    {view === 'day' ? (() => {
                                        const d = new Date(selDay + 'T00:00');
                                        return <h2 className="text-base font-bold">{d.getFullYear()} оны {MONTHS_MN[d.getMonth()]} {d.getDate()}, {DAYS_MN[(d.getDay() + 6) % 7]}</h2>;
                                    })() : view === 'week' ? (() => {
                                        const wEnd = new Date(weekStart); wEnd.setDate(weekStart.getDate() + 6);
                                        return <h2 className="text-base font-bold">{weekStart.getFullYear()} оны {MONTHS_MN[weekStart.getMonth()]} {weekStart.getDate()} – {wEnd.getDate()}</h2>;
                                    })() : (
                                        <h2 className="text-base font-bold">{year} оны {MONTHS_MN[month]}</h2>
                                    )}
                                </div>
                                <div className="flex overflow-hidden rounded-lg border text-xs font-medium">
                                    {([{ v: 'month', l: 'Сар' }, { v: 'week', l: '7 хоног' }, { v: 'day', l: 'Өдөр' }] as const).map(({ v, l }) => (
                                        <button key={v} onClick={() => { setView(v); if (v === 'day' && !selected) setSelected(todayStr); }}
                                            className={`px-3 py-1.5 transition-colors ${view === v ? 'bg-red-600 text-white' : 'hover:bg-muted'}`}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Calendar grid */}
                        <div className="flex flex-1 overflow-hidden rounded-xl border bg-card">
                            <div className="flex w-full flex-col overflow-hidden">

                                {/* ── Month view ── */}
                                {view === 'month' && (
                                    <div className="flex flex-1 flex-col overflow-hidden">
                                        <div className="grid grid-cols-7 border-b">
                                            {DAYS_MN.map(d => (
                                                <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
                                            ))}
                                        </div>
                                        <div className="cal-scroll grid flex-1 grid-cols-7 overflow-auto">
                                            {Array.from({ length: totalCells }, (_, idx) => {
                                                const dayNum = idx - firstWeekDay + 1;
                                                const inM    = dayNum >= 1 && dayNum <= daysInMonth;
                                                const ds     = inM ? pad(year, month, dayNum) : '';
                                                const dapts  = ds ? (aptByDate[ds] ?? []) : [];
                                                const isToday = ds === todayStr;
                                                const isSel   = ds === selected;
                                                return (
                                                    <div key={idx}
                                                        onClick={() => inM && setSelected(isSel ? null : ds)}
                                                        className={`group min-h-[80px] cursor-pointer border-b border-r p-1.5 transition-colors ${
                                                            !inM   ? 'bg-muted/20 opacity-30' :
                                                            isSel  ? 'bg-red-50 dark:bg-red-950/20' : 'hover:bg-muted/20'
                                                        }`}>
                                                        {inM && (
                                                            <>
                                                                <div className="mb-1 flex items-center justify-between">
                                                                    <span className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                                                                        isToday ? 'bg-red-600 text-white' :
                                                                        isSel   ? 'text-red-600 font-bold' : 'text-foreground'
                                                                    }`}>{dayNum}</span>
                                                                </div>
                                                                <div className="space-y-px">
                                                                    {dapts.slice(0, 4).map(a => {
                                                                        const p2 = aptColorForAppt(a);
                                                                        const ac = p2.border;
                                                                        return (
                                                                            <div key={`${a.id}-${a._senior_name ?? ''}`}
                                                                                onClick={e => { e.stopPropagation(); setSelected(ds); setDetail(a); }}
                                                                                className="flex items-center gap-1 rounded-sm py-0.5 pl-1.5 pr-1 text-[10px] font-semibold cursor-pointer overflow-hidden hover:opacity-75 transition-opacity"
                                                                                style={{ background: p2.light, borderLeft: `3px solid ${ac}` }}>
                                                                                <span className="shrink-0 tabular-nums" style={{ color: ac }}>{a.appointment_time}</span>
                                                                                <span className="truncate" style={{ color: ac }}>{a._senior_name ? `[${a._senior_name.split(' ')[0]}] ` : ''}{a.patient_name}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {dapts.length > 4 && (
                                                                        <p className="px-1.5 text-[10px] font-semibold text-red-500">+{dapts.length - 4}</p>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* ── Week view ── */}
                                {view === 'week' && (() => {
                                    const totalH  = (HOUR_END - HOUR_START) * HOUR_H;
                                    const COL_MIN = 110;
                                    return (
                                        <div className="flex flex-1 flex-col overflow-hidden">
                                            <div ref={dayScrollRef} className="cal-scroll flex-1 overflow-auto">
                                                <div style={{ minWidth: '100%', width: 56 + 7 * COL_MIN }}>
                                                    <div className="sticky top-0 z-20 flex border-b bg-card shadow-sm">
                                                        <div className="w-14 shrink-0 border-r bg-card" />
                                                        {weekDays.map(d => {
                                                            const ds  = pad(d.getFullYear(), d.getMonth(), d.getDate());
                                                            const isT = ds === todayStr;
                                                            const cnt = (aptByDate[ds] ?? []).length;
                                                            return (
                                                                <div key={ds}
                                                                    onClick={() => { setSelected(ds); setView('day'); }}
                                                                    className="flex flex-1 cursor-pointer flex-col items-center border-r py-2 last:border-r-0 hover:bg-muted/30 transition-colors"
                                                                    style={{ minWidth: COL_MIN }}>
                                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{DAYS_MN[(d.getDay() + 6) % 7]}</p>
                                                                    <span className={`mt-1 flex size-8 items-center justify-center rounded-full text-sm font-bold ${isT ? 'bg-red-600 text-white' : 'text-foreground'}`}>
                                                                        {d.getDate()}
                                                                    </span>
                                                                    {cnt > 0 && <span className="mt-0.5 text-[9px] font-medium text-red-500">{cnt} цаг</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="relative flex" style={{ height: totalH }}>
                                                        <div className="relative w-14 shrink-0 border-r">
                                                            {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
                                                                <div key={i} className="absolute right-2 text-[10px] font-medium text-muted-foreground select-none"
                                                                    style={{ top: i * HOUR_H - 7 }}>
                                                                    {String(HOUR_START + i).padStart(2, '0')}:00
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {weekDays.map(d => {
                                                            const ds    = pad(d.getFullYear(), d.getMonth(), d.getDate());
                                                            const isT   = ds === todayStr;
                                                            const wapts = (aptByDate[ds] ?? []).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
                                                            return (
                                                                <div key={ds} className="relative flex-1 border-r last:border-r-0"
                                                                    style={{ minWidth: COL_MIN, height: totalH }}>
                                                                    {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                                                                        <div key={i} style={{ position:'absolute', left:0, right:0, top: i * HOUR_H, borderTop:'1px solid var(--cal-line-hour)' }} />
                                                                    ))}
                                                                    {computeColumns(wapts).map(({ apt: a, col, totalCols }) => {
                                                                        const p2 = aptColorForAppt(a);
                                                                        const ac = p2.border;
                                                                        const h = Math.max(22, (aptEndMins(a) - toMins(a.appointment_time)) * PX_PER_MIN);
                                                                        return (
                                                                            <div key={`${a.id}-${a._senior_name ?? ''}`}
                                                                                onClick={() => setDetail(a)}
                                                                                title={`${a.appointment_time}${a.appointment_time_end ? '–' + a.appointment_time_end : ''} · ${a.patient_name}${a._senior_name ? ` (${a._senior_name})` : ''}`}
                                                                                className="absolute cursor-pointer overflow-hidden rounded px-1.5 pt-0.5 transition-all hover:brightness-95 hover:shadow-md"
                                                                                style={{
                                                                                    top: aptTop(a.appointment_time), height: h,
                                                                                    left: `calc(${col * 100 / totalCols}% + 1px)`,
                                                                                    width: `calc(${100 / totalCols}% - 2px)`,
                                                                                    zIndex: col + 1,
                                                                                    background: p2.light,
                                                                                    border: `1px solid ${ac}50`,
                                                                                    borderLeftWidth: 3,
                                                                                    borderLeftColor: ac,
                                                                                    color: ac,
                                                                                }}>
                                                                                <p className="font-bold tabular-nums truncate leading-tight" style={{ fontSize: 9 }}>
                                                                                    {a.appointment_time}{a.appointment_time_end ? `–${a.appointment_time_end}` : ''}{a.type === 'online' ? ' 💻' : ''}
                                                                                </p>
                                                                                {h > 30 && <p className="truncate font-semibold leading-tight" style={{ fontSize: 10 }}>{a.patient_name}</p>}
                                                                                {h > 46 && a._senior_name && <p className="truncate opacity-70 leading-tight" style={{ fontSize: 9 }}>👤 {a._senior_name}</p>}
                                                                                {h > 46 && !a._senior_name && a.service && <p className="truncate opacity-70 leading-tight" style={{ fontSize: 9 }}>{a.service}</p>}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {isT && nowTop >= 0 && nowTop <= totalH && (
                                                                        <div className="pointer-events-none absolute left-0 right-0 z-10 flex items-center" style={{ top: nowTop }}>
                                                                            <div className="size-2 shrink-0 rounded-full bg-red-500 -ml-1" />
                                                                            <div className="flex-1 border-t-2 border-red-500" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* ── Day view (desktop) ── */}
                                {view === 'day' && (() => {
                                    const totalH = (HOUR_END - HOUR_START) * HOUR_H;
                                    const dapts  = (aptByDate[selDay] ?? []).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
                                    const isToday = selDay === todayStr;
                                    return (
                                        <div ref={dayScrollRef} className="cal-scroll flex-1 overflow-auto">
                                            <div style={{ minHeight: totalH + 40 }}>
                                                <div className="relative flex" style={{ height: totalH }}>
                                                    <div className="relative w-14 shrink-0 border-r">
                                                        {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
                                                            <div key={i}>
                                                                <div className="absolute right-2 text-[10px] font-medium text-muted-foreground select-none" style={{ top: i * HOUR_H - 7 }}>
                                                                    {String(HOUR_START + i).padStart(2, '0')}:00
                                                                </div>
                                                                {i < HOUR_END - HOUR_START && (
                                                                    <div className="absolute right-2 text-[9px] text-muted-foreground/40 select-none" style={{ top: i * HOUR_H + HOUR_H / 2 - 6 }}>
                                                                        :30
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="relative flex-1">
                                                        {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                                                            <div key={i} style={{ position:'absolute', left:0, right:0, top: i * HOUR_H, borderTop:'1px solid var(--cal-line-hour)' }} />
                                                        ))}
                                                        {Array.from({ length: (HOUR_END - HOUR_START) * 2 }, (_, i) => {
                                                            if (i % 2 === 0) return null;
                                                            return <div key={`h${i}`} style={{ position:'absolute', left:0, right:0, top: i * (HOUR_H / 2), borderTop:'1px solid var(--cal-line-half)' }} />;
                                                        })}
                                                        {computeColumns(dapts).map(({ apt: a, col, totalCols }) => {
                                                            const p2 = aptColorForAppt(a);
                                                            const ac = p2.border;
                                                            const top = aptTop(a.appointment_time);
                                                            const h = Math.max(24, (aptEndMins(a) - toMins(a.appointment_time)) * PX_PER_MIN);
                                                            return (
                                                                <div key={`${a.id}-${a._senior_name ?? ''}`}
                                                                    onClick={() => setDetail(a)}
                                                                    title={`${a.appointment_time}${a.appointment_time_end ? '–' + a.appointment_time_end : ''} · ${a.patient_name}${a._senior_name ? ` (${a._senior_name})` : ''}`}
                                                                    className="absolute cursor-pointer overflow-hidden rounded px-1.5 pt-0.5 transition-all hover:brightness-95 hover:shadow-md"
                                                                    style={{
                                                                        top, height: h,
                                                                        left: `calc(${col * 100 / totalCols}% + 1px)`,
                                                                        width: `calc(${100 / totalCols}% - 2px)`,
                                                                        zIndex: col + 1,
                                                                        background: p2.light,
                                                                        border: `1px solid ${ac}50`,
                                                                        borderLeftWidth: 3,
                                                                        borderLeftColor: ac,
                                                                        color: ac,
                                                                    }}>
                                                                    <p className="font-bold tabular-nums truncate leading-tight" style={{ fontSize: 9 }}>
                                                                        {a.appointment_time}{a.appointment_time_end ? `–${a.appointment_time_end}` : ''}{a.type === 'online' ? ' 💻' : ''}
                                                                    </p>
                                                                    {h > 30 && <p className="truncate font-semibold leading-tight" style={{ fontSize: 10 }}>{a.patient_name}</p>}
                                                                    {h > 46 && a._senior_name && <p className="truncate opacity-70 leading-tight" style={{ fontSize: 9 }}>👤 {a._senior_name}</p>}
                                                                    {h > 46 && !a._senior_name && a.service && <p className="truncate opacity-70 leading-tight" style={{ fontSize: 9 }}>{a.service}</p>}
                                                                </div>
                                                            );
                                                        })}
                                                        {isToday && nowTop >= 0 && nowTop <= totalH && (
                                                            <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top: nowTop }}>
                                                                <div className="size-3 shrink-0 rounded-full bg-red-500 -ml-1.5" />
                                                                <div className="flex-1 border-t-2 border-red-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {dapts.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                                                        <CalendarClock className="size-10 opacity-20" />
                                                        <p className="text-sm">Энэ өдөр захиалга байхгүй</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <p className="text-center text-[11px] text-muted-foreground opacity-60">
                            Нүд дарах — сонгох • Захиалга дарах — дэлгэрэнгүй харах
                        </p>
                    </div>
                </div>
            ) : (
                /* ── Mobile — Dark calendar (Сар / 7х / Өдөр views) ── */
                <div className="bg-background text-foreground" style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

                    {/* ── HEADER ── */}
                    <div className="bg-background border-b border-border" style={{ flexShrink:0, padding:'10px 16px 0', userSelect:'none' }}>
                        {/* Top row: menu · date · view toggle */}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                            {senior_doctors.length > 0 ? (
                                <button onClick={() => setDoctorPanelOpen(true)}
                                    className="bg-muted hover:bg-muted/80 transition-colors"
                                    style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer', position:'relative', flexShrink:0 }}>
                                    <Menu className="text-foreground" style={{ width:18, height:18 }} />
                                    {checkedSeniors.length > 0 && (
                                        <span style={{ position:'absolute', top:4, right:4, width:7, height:7, borderRadius:'50%', background:'#22c55e', border:'1.5px solid hsl(var(--card))' }} />
                                    )}
                                </button>
                            ) : (
                                <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(todayStr); setView('day'); }}
                                    className="bg-muted hover:bg-muted/80 transition-colors"
                                    style={{ padding:'6px 10px', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, color:'hsl(var(--foreground))' }}>
                                    Өнөөдөр
                                </button>
                            )}
                            <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(todayStr); }}
                                style={{ textAlign:'center', background:'none', border:'none', cursor:'pointer' }}>
                                <div className="text-muted-foreground" style={{ fontSize:11, fontWeight:500 }}>{year} · {MONTHS_MN[month]}</div>
                                <div className="text-foreground" style={{ fontSize:17, fontWeight:700 }}>
                                    {new Date(selDay + 'T00:00').getDate()}-ны өдөр
                                </div>
                            </button>
                            <div className="bg-muted" style={{ display:'flex', borderRadius:10, padding:2, gap:1 }}>
                                {(['month','week','day'] as const).map((v, vi) => (
                                    <button key={v} onClick={() => { setView(v); if (v === 'day' && !selected) setSelected(todayStr); }}
                                        style={{
                                            padding:'4px 9px', borderRadius:8, fontSize:11, fontWeight:700, border:'none', cursor:'pointer',
                                            background: view === v ? '#22c55e' : 'transparent',
                                            color: view === v ? 'white' : 'hsl(var(--muted-foreground))',
                                        }}>
                                        {['Сар','7х','Өдөр'][vi]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Week strip (Sun→Sat) */}
                        {(() => {
                            const selDate = new Date(selDay + 'T00:00');
                            const dow = selDate.getDay();
                            const weekSun = new Date(selDate);
                            weekSun.setDate(selDate.getDate() - dow);
                            return (
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', paddingBottom:8 }}>
                                    {['Ня','Да','Мя','Лх','Пу','Ба','Бя'].map((dn, i) => {
                                        const d = new Date(weekSun); d.setDate(weekSun.getDate() + i);
                                        const ds = pad(d.getFullYear(), d.getMonth(), d.getDate());
                                        const isT = ds === todayStr;
                                        const isSel = ds === selDay;
                                        const cnt = aptByDate[ds]?.length ?? 0;
                                        return (
                                            <button key={ds} onClick={() => { setSelected(ds); setYear(d.getFullYear()); setMonth(d.getMonth()); }}
                                                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'none', border:'none', cursor:'pointer', padding:'2px 0' }}>
                                                <span style={{ fontSize:9, color:'hsl(var(--muted-foreground))', fontWeight:600, textTransform:'uppercase' }}>{dn}</span>
                                                <span style={{
                                                    width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                                                    fontSize:14, fontWeight: isSel || isT ? 700 : 400,
                                                    background: isSel ? '#22c55e' : 'transparent',
                                                    color: isSel ? 'white' : isT ? '#22c55e' : 'hsl(var(--foreground))',
                                                }}>{d.getDate()}</span>
                                                <span style={{ width:5, height:5, borderRadius:'50%', background: cnt > 0 ? (isSel ? 'white' : '#22c55e') : 'transparent' }} />
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                    </div>

                    {/* ── CONTENT AREA ── */}
                    <div style={{ flex:1, overflow:'hidden', position:'relative' }}>

                        {/* ── DAY VIEW ── */}
                        {view === 'day' && (
                            <div ref={dayScrollRef} style={{ height:'100%', overflowY:'auto' }}>
                                {(() => {
                                    const dapts = (aptByDate[selDay] ?? []).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
                                    const totalH = (HOUR_END - HOUR_START) * HOUR_H;
                                    const isToday = selDay === todayStr;
                                    const cols = computeColumns(dapts);
                                    return (
                                        <div style={{ minHeight: totalH + 48 }}>
                                            <div style={{ position:'relative', display:'flex', height: totalH }}>
                                                <div style={{ width:52, flexShrink:0, position:'relative' }}>
                                                    {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
                                                        <div key={i} style={{ position:'absolute', right:8, top: i * HOUR_H - 7, fontSize:10, color:'hsl(var(--muted-foreground))', fontWeight:500, userSelect:'none' }}>
                                                            {String(HOUR_START + i).padStart(2,'0')}:00
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ flex:1, position:'relative', borderLeft:'1px solid var(--cal-line-hour)' }}>
                                                    {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                                                        <div key={i} style={{ position:'absolute', left:0, right:0, top: i * HOUR_H, borderTop:'1px solid var(--cal-line-hour)' }} />
                                                    ))}
                                                    {Array.from({ length: (HOUR_END - HOUR_START) * 2 }, (_, i) => {
                                                        if (i % 2 === 0) return null;
                                                        return <div key={`hh${i}`} style={{ position:'absolute', left:0, right:0, top: i * (HOUR_H / 2), borderTop:'1px solid var(--cal-line-half)' }} />;
                                                    })}
                                                    {cols.map(({ apt: a, col, totalCols }) => {
                                                        const pal2 = aptColorForAppt(a);
                                                        const top = aptTop(a.appointment_time);
                                                        const durMins = aptEndMins(a) - toMins(a.appointment_time);
                                                        const h = Math.max(26, Math.round(durMins * PX_PER_MIN));
                                                        const colW = `calc((100% - 6px) / ${totalCols})`;
                                                        const colL = `calc(${col} * (100% - 6px) / ${totalCols} + 3px)`;
                                                        const compact = h < 46;
                                                        return (
                                                            <div key={`${a.id}-${a._senior_name ?? ''}`} onClick={() => setDetail(a)}
                                                                style={{
                                                                    position:'absolute', top, height: h, width: colW, left: colL,
                                                                    zIndex: col + 1,
                                                                    background: compact
                                                                        ? `${pal2.bg}28`
                                                                        : `linear-gradient(145deg, ${pal2.bg}55, ${pal2.bg}33)`,
                                                                    borderTop: `1px solid ${pal2.bg}40`,
                                                                    borderRight: `1px solid ${pal2.bg}40`,
                                                                    borderBottom: `1px solid ${pal2.bg}40`,
                                                                    borderLeft: `3px solid ${pal2.bg}`,
                                                                    borderRadius: compact ? 6 : 10,
                                                                    cursor:'pointer', overflow:'hidden',
                                                                    display:'flex',
                                                                    alignItems: compact ? 'center' : 'flex-start',
                                                                    gap: compact ? 4 : 7,
                                                                    padding: compact ? '0 6px' : '6px 8px 5px',
                                                                    backdropFilter: compact ? undefined : 'blur(4px)',
                                                                }}>
                                                                {!compact && (
                                                                    <div style={{
                                                                        width:24, height:24, borderRadius:'50%', flexShrink:0,
                                                                        background: pal2.bg, overflow:'hidden',
                                                                        display:'flex', alignItems:'center', justifyContent:'center',
                                                                        fontSize:13, marginTop:1,
                                                                    }}>
                                                                        {a._senior_name ? '👤' : a.type === 'online' ? '💻' : '🏥'}
                                                                    </div>
                                                                )}
                                                                <div style={{ flex:1, minWidth:0 }}>
                                                                    {compact ? (
                                                                        <p style={{ fontSize:10, fontWeight:700, color: pal2.bg, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1 }}>
                                                                            {a.appointment_time} {a.patient_name.split(' ')[0]}
                                                                        </p>
                                                                    ) : (
                                                                        <>
                                                                            <p style={{ fontSize:12, fontWeight:700, color:'hsl(var(--foreground))', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1.3, marginBottom:2 }}>
                                                                                {a.patient_name}
                                                                            </p>
                                                                            <p style={{ fontSize:10, color: pal2.bg, fontWeight:600, lineHeight:1.2 }}>
                                                                                {a.appointment_time}{a.appointment_time_end ? `–${a.appointment_time_end}` : ''}
                                                                            </p>
                                                                            {h > 80 && a._senior_name && (
                                                                                <span style={{
                                                                                    display:'inline-block', marginTop:3,
                                                                                    padding:'1px 7px', borderRadius:99,
                                                                                    fontSize:9, fontWeight:700,
                                                                                    background:`${pal2.bg}35`, color: pal2.bg,
                                                                                }}>👤 {a._senior_name}</span>
                                                                            )}
                                                                            {h > 80 && !a._senior_name && a.service && (
                                                                                <span style={{
                                                                                    display:'inline-block', marginTop:3,
                                                                                    padding:'1px 7px', borderRadius:99,
                                                                                    fontSize:9, fontWeight:700,
                                                                                    background:`${pal2.bg}35`, color: pal2.bg,
                                                                                }}>{a.service}</span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {isToday && nowTop >= 0 && nowTop <= totalH && (
                                                        <div style={{ position:'absolute', left:0, right:0, top: nowTop, zIndex:20, display:'flex', alignItems:'center', pointerEvents:'none' }}>
                                                            <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444', marginLeft:-5, flexShrink:0 }} />
                                                            <div style={{ flex:1, borderTop:'2px solid #ef4444' }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {dapts.length === 0 && (
                                                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:'80px 0', color:'hsl(var(--muted-foreground))' }}>
                                                    <CalendarClock style={{ width:40, height:40, opacity:0.25 }} />
                                                    <p style={{ fontSize:14 }}>Энэ өдөр захиалга байхгүй</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* ── MONTH VIEW ── */}
                        {view === 'month' && (
                            <div style={{ height:'100%', overflowY:'auto', display:'flex', flexDirection:'column' }}>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px 4px', flexShrink:0 }}>
                                    <button onClick={prevMonth} style={{ padding:6, borderRadius:8, background:'hsl(var(--muted))', border:'none', cursor:'pointer' }}>
                                        <ChevronLeft style={{ width:18, height:18, color:'hsl(var(--foreground))' }} />
                                    </button>
                                    <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(todayStr); }}
                                        style={{ fontSize:14, fontWeight:700, color:'hsl(var(--foreground))', background:'none', border:'none', cursor:'pointer' }}>
                                        {year} · {MONTHS_MN[month]}
                                    </button>
                                    <button onClick={nextMonth} style={{ padding:6, borderRadius:8, background:'hsl(var(--muted))', border:'none', cursor:'pointer' }}>
                                        <ChevronRight style={{ width:18, height:18, color:'hsl(var(--foreground))' }} />
                                    </button>
                                </div>
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 12px', flexShrink:0 }}>
                                    {['Ня','Да','Мя','Лх','Пу','Ба','Бя'].map(dn => (
                                        <div key={dn} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'hsl(var(--muted-foreground))', padding:'4px 0', textTransform:'uppercase' }}>{dn}</div>
                                    ))}
                                </div>
                                {(() => {
                                    const firstDowSun = new Date(year, month, 1).getDay();
                                    const daysInMo = getDays(year, month);
                                    const totalCellsMo = Math.ceil((firstDowSun + daysInMo) / 7) * 7;
                                    return (
                                        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 12px 4px', flexShrink:0 }}>
                                            {Array.from({ length: totalCellsMo }, (_, idx) => {
                                                const dayNum = idx - firstDowSun + 1;
                                                const inMonth = dayNum >= 1 && dayNum <= daysInMo;
                                                const dateStr = inMonth ? pad(year, month, dayNum) : '';
                                                const isT2 = dateStr === todayStr;
                                                const isSel2 = dateStr === selDay;
                                                const cnt = dateStr ? (aptByDate[dateStr]?.length ?? 0) : 0;
                                                return (
                                                    <button key={idx} disabled={!inMonth}
                                                        onClick={() => inMonth && setSelected(dateStr)}
                                                        style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'3px 1px', gap:2, background:'none', border:'none', borderTop: idx >= 7 ? '1px solid var(--cal-line-hour)' : undefined, borderRight: (idx % 7) < 6 ? '1px solid var(--cal-line-half)' : undefined, cursor: inMonth ? 'pointer' : 'default', opacity: inMonth ? 1 : 0 }}>
                                                        <span style={{
                                                            width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                                                            fontSize:13, fontWeight: isSel2 || isT2 ? 700 : 400,
                                                            background: isSel2 ? '#22c55e' : 'transparent',
                                                            color: isSel2 ? 'white' : isT2 ? '#22c55e' : 'hsl(var(--foreground))',
                                                        }}>{dayNum}</span>
                                                        <div style={{ display:'flex', gap:2, minHeight:5 }}>
                                                            {Array.from({ length: Math.min(cnt, 3) }, (_, j) => (
                                                                <span key={j} style={{ width:4, height:4, borderRadius:'50%', background: isSel2 ? 'rgba(255,255,255,0.7)' : '#22c55e' }} />
                                                            ))}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                                <div style={{ flex:1, borderTop:'1px solid hsl(var(--border))', padding:'10px 16px 16px', overflowY:'auto' }}>
                                    <p style={{ fontSize:11, fontWeight:700, color:'hsl(var(--muted-foreground))', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                                        {MONTHS_MN[new Date(selDay+'T00:00').getMonth()]} {new Date(selDay+'T00:00').getDate()}
                                    </p>
                                    {(() => {
                                        const dapts = (aptByDate[selDay] ?? []).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
                                        if (dapts.length === 0) return <p style={{ fontSize:13, color:'hsl(var(--muted-foreground))', fontStyle:'italic' }}>Захиалга байхгүй</p>;
                                        return (
                                            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                                                {dapts.map(a => {
                                                    const pal = aptColorForAppt(a);
                                                    return (
                                                        <button key={`${a.id}-${a._senior_name ?? ''}`} onClick={() => setDetail(a)}
                                                            style={{
                                                                width:'100%', display:'flex', alignItems:'center', gap:12,
                                                                padding:'10px 12px',
                                                                borderTop: `1px solid ${pal.bg}30`,
                                                                borderRight: `1px solid ${pal.bg}30`,
                                                                borderBottom: `1px solid ${pal.bg}30`,
                                                                borderLeft: `3px solid ${pal.bg}`,
                                                                borderRadius:12,
                                                                background: `${pal.bg}0d`,
                                                                textAlign:'left', cursor:'pointer',
                                                            }}>
                                                            <span style={{ fontSize:13, fontWeight:700, color: pal.bg, width:40, flexShrink:0 }}>
                                                                {a.appointment_time}
                                                            </span>
                                                            <div style={{ flex:1, minWidth:0 }}>
                                                                <p className="text-foreground" style={{ fontSize:14, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:2 }}>
                                                                    {a.patient_name}
                                                                </p>
                                                                <p style={{ fontSize:11, color:'hsl(var(--muted-foreground))' }}>
                                                                    {a._senior_name
                                                                        ? <span style={{ color: pal.bg }}>👤 {a._senior_name}</span>
                                                                        : <><span style={{ color: pal.bg }}>{a.type === 'online' ? 'Онлайн' : 'Биечлэн'}</span>{a.service && ` · ${a.service}`}</>
                                                                    }
                                                                </p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* ── WEEK VIEW (7х) ── */}
                        {view === 'week' && (
                            <div style={{ height:'100%', overflowY:'auto', overflowX:'hidden' }}>
                                {(() => {
                                    const selDate = new Date(selDay + 'T00:00');
                                    const dow = selDate.getDay();
                                    const weekSun2 = new Date(selDate);
                                    weekSun2.setDate(selDate.getDate() - dow);
                                    const wdays = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekSun2); d.setDate(weekSun2.getDate() + i); return d; });
                                    const totalH = (HOUR_END - HOUR_START) * HOUR_H;
                                    return (
                                        <>
                                            <div style={{ position:'relative', display:'flex', height: totalH }}>
                                                <div style={{ width:36, flexShrink:0, position:'relative' }}>
                                                    {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
                                                        <div key={i} style={{ position:'absolute', right:4, top: i * HOUR_H - 7, fontSize:9, color:'hsl(var(--muted-foreground))', fontWeight:500, userSelect:'none' }}>
                                                            {String(HOUR_START + i).padStart(2,'00')}
                                                        </div>
                                                    ))}
                                                </div>
                                                {wdays.map((d) => {
                                                    const ds = pad(d.getFullYear(), d.getMonth(), d.getDate());
                                                    const isT = ds === todayStr;
                                                    const colApts = (aptByDate[ds] ?? []).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
                                                    return (
                                                        <div key={ds} style={{ flex:1, position:'relative', borderLeft:'1px solid var(--cal-line-hour)' }}>
                                                            {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                                                                <div key={i} style={{ position:'absolute', left:0, right:0, top: i * HOUR_H, borderTop:'1px solid var(--cal-line-hour)' }} />
                                                            ))}
                                                            {computeColumns(colApts).map(({ apt: a, col, totalCols }) => {
                                                                const pal2 = aptColorForAppt(a);
                                                                const top2 = aptTop(a.appointment_time);
                                                                const endM3 = (() => {
                                                                    if (!a.appointment_time_end) return null;
                                                                    const [eh, em] = a.appointment_time_end.split(':').map(Number);
                                                                    const [sh, sm] = a.appointment_time.split(':').map(Number);
                                                                    return (eh * 60 + em) - (sh * 60 + sm);
                                                                })();
                                                                const h3 = endM3 && endM3 > 10 ? Math.max(28, endM3 * PX_PER_MIN) : 28;
                                                                return (
                                                                    <div key={`${a.id}-${a._senior_name ?? ''}`} onClick={() => { setSelected(ds); setDetail(a); }}
                                                                        style={{
                                                                            position:'absolute',
                                                                            left: `calc(${col} * 100% / ${totalCols} + 1px)`,
                                                                            right: `calc(${totalCols - col - 1} * 100% / ${totalCols} + 1px)`,
                                                                            top: top2, height: h3,
                                                                            zIndex: col + 1,
                                                                            background: pal2.light,
                                                                            borderTop: `1px solid ${pal2.bg}40`,
                                                                            borderRight: `1px solid ${pal2.bg}40`,
                                                                            borderBottom: `1px solid ${pal2.bg}40`,
                                                                            borderLeft: `3px solid ${pal2.bg}`,
                                                                            borderRadius:6, cursor:'pointer', overflow:'hidden',
                                                                            padding:'3px 5px',
                                                                        }}>
                                                                        <p style={{ fontSize:9, fontWeight:700, color: pal2.border, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }}>
                                                                            {a.patient_name.split(' ')[0]}
                                                                        </p>
                                                                        {h3 > 40 && (
                                                                            <p style={{ fontSize:8, color: pal2.border, opacity:0.75, lineHeight:1.2 }}>{a.appointment_time}</p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            {isT && nowTop >= 0 && nowTop <= totalH && (
                                                                <div style={{ position:'absolute', left:0, right:0, top: nowTop, zIndex:20, borderTop:'1.5px solid #ef4444', pointerEvents:'none' }} />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* ── DOCTOR PANEL (bottom drawer) ── */}
                    {doctorPanelOpen && senior_doctors.length > 0 && (
                        <div style={{ position:'fixed', inset:0, zIndex:60 }} onClick={() => setDoctorPanelOpen(false)}>
                            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)' }} />
                            <div className="bg-card" style={{
                                position:'absolute', bottom:0, left:0, right:0,
                                borderRadius:'20px 20px 0 0',
                                maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden',
                            }} onClick={e => e.stopPropagation()}>
                                {/* Header */}
                                <div className="border-b border-border" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px' }}>
                                    <div>
                                        <p className="text-muted-foreground" style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>Харагдах</p>
                                        <p className="text-foreground" style={{ fontSize:18, fontWeight:700 }}>Ахлах эмч нар</p>
                                    </div>
                                    <button onClick={() => setDoctorPanelOpen(false)}
                                        className="bg-muted hover:bg-muted/80 transition-colors"
                                        style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
                                        <X className="text-foreground" style={{ width:16, height:16 }} />
                                    </button>
                                </div>
                                {/* Toggle all */}
                                <div style={{ padding:'10px 20px', borderBottom:'1px solid hsl(var(--border))' }}>
                                    <button
                                        onClick={() => setCheckedSeniors(
                                            checkedSeniors.length > 0 ? [] : senior_doctors.map(s => s.id)
                                        )}
                                        className="bg-muted hover:bg-muted/80 text-foreground transition-colors"
                                        style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, border:'none', cursor:'pointer', width:'100%' }}>
                                        <span style={{ fontSize:16, lineHeight:1 }}>≡</span>
                                        <span style={{ fontSize:13, fontWeight:500 }}>
                                            Бүгдийг {checkedSeniors.length > 0 ? 'харуулах' : 'нуух'}
                                        </span>
                                    </button>
                                </div>
                                {/* Doctor list */}
                                <div style={{ overflowY:'auto', flex:1 }}>
                                    {senior_doctors.map((s, i) => {
                                        const pal     = seniorPal(i);
                                        const checked = checkedSeniors.includes(s.id);
                                        const dayCount = (aptByDate[selDay] ?? []).filter(a => a._senior_name === s.name).length;
                                        return (
                                            <button key={s.id} onClick={() => toggleSenior(s.id)}
                                                style={{
                                                    width:'100%', display:'flex', alignItems:'center', gap:12,
                                                    padding:'11px 20px', border:'none', cursor:'pointer',
                                                    background: checked ? pal.bg + '22' : 'transparent',
                                                    borderBottom:'1px solid hsl(var(--border))',
                                                    textAlign:'left',
                                                }}>
                                                {/* Custom checkbox */}
                                                <div style={{
                                                    width:20, height:20, borderRadius:5,
                                                    border:`2px solid ${checked ? pal.bg : 'hsl(var(--border))'}`,
                                                    background: checked ? pal.bg : 'transparent', flexShrink:0,
                                                    display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s',
                                                }}>
                                                    {checked && <span style={{ color:'white', fontSize:11, fontWeight:900, lineHeight:1 }}>✓</span>}
                                                </div>
                                                {/* Avatar */}
                                                <div style={{
                                                    width:36, height:36, borderRadius:'50%', flexShrink:0,
                                                    background: pal.bg, overflow:'hidden',
                                                    display:'flex', alignItems:'center', justifyContent:'center',
                                                    fontSize:13, fontWeight:800, color:'white',
                                                }}>
                                                    {initials(s.name)}
                                                </div>
                                                {/* Name */}
                                                <span className="text-foreground" style={{ flex:1, fontSize:14, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                                    {s.name}
                                                </span>
                                                {/* Count */}
                                                {dayCount > 0 && (
                                                    <span style={{
                                                        flexShrink:0, borderRadius:99, padding:'3px 8px',
                                                        background: pal.light, color: pal.border,
                                                        fontSize:11, fontWeight:700,
                                                    }}>
                                                        {dayCount} цаг
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </DoctorLayout>
    );
}
