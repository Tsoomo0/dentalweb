import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    CalendarDays, ChevronLeft, ChevronRight, Plus, Stethoscope, Trash2, X,
} from 'lucide-react';
import { FormEvent, useState, useEffect } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Branch   { id: number; name: string; }
interface Employee { id: number; name: string; position: string | null; branch_id: number | null; branch: string | null; }
interface Schedule {
    id: number; employee_id: number;
    employee_name: string; employee_position: string | null;
    date: string; shift_type: string; shift_label: string;
    start_time: string | null; end_time: string | null;
    room: string | null; assigned_doctor_id: number | null;
    assigned_doctor_name: string | null; notes: string | null;
}
interface PageProps {
    schedules: Schedule[]; employees: Employee[]; doctors: Employee[];
    branches: Branch[];
    year: number; month: number; [key: string]: unknown;
}
type ViewMode = 'month' | 'week' | 'day';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const MONTHS_MN = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар',
                   '7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];
const DAYS_MN   = ['Да','Мя','Лх','Пү','Ба','Бя','Ня'];
const DAYS_FULL = ['Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба','Ням'];

const SHIFT_COLORS: Record<string, string> = {
    morning:   'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    afternoon: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    full:      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    off:       'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};
const SHIFT_DOT: Record<string, string> = {
    morning: 'bg-sky-500', afternoon: 'bg-orange-500', full: 'bg-emerald-500', off: 'bg-gray-400',
};
const SHIFT_BORDER: Record<string, string> = {
    morning: 'border-l-sky-400', afternoon: 'border-l-orange-400',
    full: 'border-l-emerald-400', off: 'border-l-gray-300',
};

const SHIFTS = [
    { value: 'morning',   label: 'Өглөөний ээлж', time: '08:30–15:00' },
    { value: 'afternoon', label: 'Өдрийн ээлж',   time: '12:30–20:30' },
    { value: 'full',      label: 'Бүтэн өдөр',    time: '08:30–20:30' },
    { value: 'off',       label: 'Амралт',         time: '' },
];
const SHIFT_DEFAULTS: Record<string, { start: string; end: string }> = {
    morning:   { start: '08:30', end: '15:00' },
    afternoon: { start: '12:30', end: '20:30' },
    full:      { start: '08:30', end: '20:30' },
    off:       { start: '',      end: '' },
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function pad(n: number) { return String(n).padStart(2, '0'); }
function toDateStr(y: number, m: number, d: number) { return `${y}-${pad(m)}-${pad(d)}`; }
function parseDate(s: string) { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d); }
function addDays(date: Date, n: number) { const d = new Date(date); d.setDate(d.getDate()+n); return d; }
function getMondayOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
}
function isToday(y: number, m: number, d: number) {
    const n = new Date();
    return n.getFullYear()===y && (n.getMonth()+1)===m && n.getDate()===d;
}
function isTodayStr(s: string) {
    const n = new Date();
    return s === toDateStr(n.getFullYear(), n.getMonth()+1, n.getDate());
}
function buildMonthGrid(y: number, m: number): (number|null)[] {
    const first = new Date(y,m-1,1).getDay();
    const days  = new Date(y,m,0).getDate();
    const off   = first===0 ? 6 : first-1;
    const cells: (number|null)[] = Array(off).fill(null);
    for (let d=1;d<=days;d++) cells.push(d);
    while (cells.length%7) cells.push(null);
    return cells;
}
function isNurseOrAssistant(pos: string|null) {
    if (!pos) return false;
    const p = pos.toLowerCase();
    return p.includes('сувилагч') || p.includes('туслах');
}
function getShiftShort(type: string) {
    return type==='morning' ? 'Өглөө' : type==='afternoon' ? 'Өдөр' : type==='full' ? 'Бүтэн' : 'Амралт';
}
function shortName(full: string) {
    const parts = full.trim().split(' ');
    if (parts.length < 2) return full;
    return `${parts[0].charAt(0)}. ${parts.slice(1).join(' ')}`;
}
function initials(full: string) {
    return full.trim().split(' ').map(p => p.charAt(0).toUpperCase()).join('').slice(0, 2);
}

/* ─── Avatar colors ─────────────────────────────────────────────────────── */
const AVATAR_COLORS: Record<string, string> = {
    morning:   'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
    afternoon: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    full:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    off:       'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

/* ─── Month chip ─────────────────────────────────────────────────────────── */
function ScheduleChip({ s, onClick }: { s: Schedule; onClick: (e: React.MouseEvent) => void }) {
    const col = SHIFT_COLORS[s.shift_type] ?? SHIFT_COLORS.full;
    return (
        <div onClick={onClick}
            title={`${s.employee_name} · ${s.shift_label}${s.start_time ? ' ' + s.start_time + '–' + s.end_time : ''}${s.room ? ' · Өрөө ' + s.room : ''}`}
            className={`rounded-lg px-1.5 py-1 text-[10px] font-semibold cursor-pointer hover:opacity-80 active:scale-95 transition-all flex items-center gap-1.5 ${col}`}>
            <span className="size-4 rounded-md flex items-center justify-center bg-white/40 dark:bg-black/20 text-[8px] font-black shrink-0 leading-none">
                {s.employee_name.charAt(0)}
            </span>
            <span className="truncate flex-1">{shortName(s.employee_name)}</span>
            {s.start_time && (
                <span className="shrink-0 opacity-70 text-[9px] font-medium tabular-nums">{s.start_time}</span>
            )}
        </div>
    );
}

/* ─── Week card ─────────────────────────────────────────────────────────── */
function WeekCard({ s, onClick }: { s: Schedule; onClick: (e: React.MouseEvent) => void }) {
    const bord = SHIFT_BORDER[s.shift_type] ?? 'border-l-gray-300';
    const dot  = SHIFT_DOT[s.shift_type]   ?? SHIFT_DOT.full;
    return (
        <div onClick={onClick}
            className={`rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${bord} bg-card hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer p-2`}>
            <div className="flex items-center gap-1.5">
                <div className={`size-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${AVATAR_COLORS[s.shift_type] ?? AVATAR_COLORS.full}`}>
                    {initials(s.employee_name)}
                </div>
                <span className="text-[11px] font-semibold truncate text-gray-900 dark:text-gray-100">{shortName(s.employee_name)}</span>
            </div>
            {s.start_time && (
                <div className="flex items-center gap-1 mt-1.5">
                    <span className={`size-1.5 rounded-full shrink-0 ${dot}`} />
                    <span className="text-[9px] text-muted-foreground">{s.start_time}–{s.end_time}</span>
                </div>
            )}
            {s.room && <p className="text-[9px] text-muted-foreground mt-0.5 truncate">📍 {s.room}</p>}
            {s.assigned_doctor_name && (
                <p className="text-[9px] text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-0.5 truncate">
                    <Stethoscope className="size-2.5 shrink-0" />{shortName(s.assigned_doctor_name)}
                </p>
            )}
        </div>
    );
}

/* ─── Popup card ─────────────────────────────────────────────────────────── */
function PopupCard({ s, onClick }: { s: Schedule; onClick: () => void }) {
    const bord = SHIFT_BORDER[s.shift_type] ?? 'border-l-gray-300';
    return (
        <div onClick={onClick}
            className={`rounded-xl border border-l-4 ${bord} bg-card hover:shadow-sm transition-all cursor-pointer p-3 flex items-start gap-3`}>
            <div className={`size-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${AVATAR_COLORS[s.shift_type] ?? AVATAR_COLORS.full}`}>
                {initials(s.employee_name)}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{shortName(s.employee_name)}</p>
                {s.employee_position && <p className="text-[11px] text-muted-foreground truncate">{s.employee_position}</p>}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                    {s.shift_label}{s.start_time ? ` · ${s.start_time}–${s.end_time}` : ''}
                </p>
                {s.room && <p className="text-[11px] text-muted-foreground">📍 {s.room}</p>}
                {s.assigned_doctor_name && (
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1 truncate">
                        <Stethoscope className="size-3 shrink-0" />{shortName(s.assigned_doctor_name)}
                    </p>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function WorkSchedulesIndex() {
    const { schedules: serverSchedules, employees, doctors, branches, year, month } =
        usePage<PageProps>().props;

    const [schedules,    setSchedules]    = useState(serverSchedules);
    const [view,         setView]         = useState<ViewMode>('month');
    const [focusDate,    setFocusDate]    = useState(() => {
        const n = new Date();
        return toDateStr(n.getFullYear(), n.getMonth()+1, n.getDate());
    });
    const [filterBranch, setFilterBranch] = useState<number | ''>('');
    const [filterEmp,    setFilterEmp]    = useState<number | ''>('');
    const [dayPopup,     setDayPopup]     = useState<string | null>(null);

    // Modal
    const [modal,    setModal]        = useState<'create'|'edit'|null>(null);
    const [editItem, setEditItem]     = useState<Schedule|null>(null);

    useEffect(() => setSchedules(serverSchedules), [serverSchedules]);

    /* ── Form ── */
    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
        employee_id: '', date: '', shift_type: 'full',
        start_time: '08:30', end_time: '20:30',
        room: '', assigned_doctor_id: '', notes: '',
    });

    /* ── Server navigation (month reload) ── */
    function loadMonth(y: number, m: number, keepFocus?: string) {
        router.get('/hr/work-schedules', { year: y, month: m }, {
            preserveState: true,
            only: ['schedules', 'year', 'month'],
            onSuccess: () => { if (keepFocus) setFocusDate(keepFocus); },
        });
    }

    /* ── Month view navigation ── */
    function navMonth(dy: number) {
        let m = month + dy, y = year;
        if (m > 12) { m = 1; y++; }
        if (m < 1)  { m = 12; y--; }
        loadMonth(y, m);
    }

    /* ── Week view navigation ── */
    function getWeekDates(): Date[] {
        const mon = getMondayOfWeek(parseDate(focusDate));
        return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    }
    function navWeek(dir: number) {
        const mon = getMondayOfWeek(parseDate(focusDate));
        const next = addDays(mon, dir * 7);
        const newFocus = toDateStr(next.getFullYear(), next.getMonth()+1, next.getDate());
        setFocusDate(newFocus);
        const nm = next.getMonth()+1, ny = next.getFullYear();
        if (ny !== year || nm !== month) loadMonth(ny, nm, newFocus);
    }

    /* ── Day view navigation ── */
    function navDay(dir: number) {
        const d = parseDate(focusDate);
        const next = addDays(d, dir);
        const newFocus = toDateStr(next.getFullYear(), next.getMonth()+1, next.getDate());
        setFocusDate(newFocus);
        const nm = next.getMonth()+1, ny = next.getFullYear();
        if (ny !== year || nm !== month) loadMonth(ny, nm, newFocus);
    }

    /* ── Modal helpers ── */
    function openCreate(dateStr: string) {
        reset();
        setData(d => ({ ...d, date: dateStr, shift_type: 'full', start_time: '08:30', end_time: '20:30' }));
        setEditItem(null); setDayPopup(null); setModal('create');
    }
    function openEdit(s: Schedule, e?: React.MouseEvent) {
        e?.stopPropagation();
        setData({
            employee_id:        String(s.employee_id),
            date:               s.date,
            shift_type:         s.shift_type,
            start_time:         s.start_time  ?? '',
            end_time:           s.end_time    ?? '',
            room:               s.room        ?? '',
            assigned_doctor_id: s.assigned_doctor_id ? String(s.assigned_doctor_id) : '',
            notes:              s.notes       ?? '',
        });
        setEditItem(s); setDayPopup(null); setModal('edit');
    }
    function handleShiftChange(v: string) {
        const def = SHIFT_DEFAULTS[v];
        setData(d => ({ ...d, shift_type: v, start_time: def.start, end_time: def.end }));
    }
    function handleCreate(e: FormEvent) {
        e.preventDefault();
        post('/hr/work-schedules', { preserveScroll: true, onSuccess: () => { setModal(null); reset(); } });
    }
    function handleUpdate(e: FormEvent) {
        e.preventDefault();
        if (!editItem) return;
        put(`/hr/work-schedules/${editItem.id}`, { preserveScroll: true, onSuccess: () => { setModal(null); reset(); } });
    }
    function handleDelete() {
        if (!editItem || !confirm('Устгах уу?')) return;
        destroy(`/hr/work-schedules/${editItem.id}`, { preserveScroll: true, onSuccess: () => setModal(null) });
    }

    /* ── Filtered data ── */
    const branchEmpIds = filterBranch
        ? new Set(employees.filter(e => e.branch_id === filterBranch).map(e => e.id))
        : null;
    const filtered = schedules.filter(s => {
        if (filterEmp   && s.employee_id !== filterEmp)          return false;
        if (branchEmpIds && !branchEmpIds.has(s.employee_id))    return false;
        return true;
    });
    const byDate = filtered.reduce<Record<string, Schedule[]>>((acc, s) => {
        (acc[s.date] ??= []).push(s); return acc;
    }, {});

    const displayedEmployees = filterBranch
        ? employees.filter(e => e.branch_id === filterBranch)
        : employees;

    const selectedEmp   = employees.find(e => String(e.id) === data.employee_id);
    const showDocPicker = isNurseOrAssistant(selectedEmp?.position ?? null)
                       || (modal === 'edit' && isNurseOrAssistant(editItem?.employee_position ?? null));

    /* ── Week dates ── */
    const weekDates = getWeekDates();

    /* ── Header label ── */
    const headerLabel = view === 'month'
        ? `${year} · ${MONTHS_MN[month-1]}`
        : view === 'week'
            ? (() => {
                const [mon, sun] = [weekDates[0], weekDates[6]];
                return `${mon.getMonth()===sun.getMonth()
                    ? `${MONTHS_MN[mon.getMonth()]} ${mon.getDate()}–${sun.getDate()}`
                    : `${mon.getDate()} ${MONTHS_MN[mon.getMonth()]} – ${sun.getDate()} ${MONTHS_MN[sun.getMonth()]}`}`;
              })()
            : (() => {
                const d = parseDate(focusDate);
                return `${DAYS_FULL[(d.getDay()+6)%7]}, ${d.getDate()} ${MONTHS_MN[d.getMonth()]}`;
              })();

    /* ══════════════════════════ RENDER ══════════════════════════ */
    return (
        <AppLayout breadcrumbs={[{ title: 'HR', href: '/hr/employees' }, { title: 'Ажлын хуваарь', href: '/hr/work-schedules' }]}>
            <div className="p-4 md:p-6 space-y-4">

                {/* ── Top bar ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <CalendarDays className="size-5 text-blue-500" />
                            Ажлын хуваарь
                        </h1>

                        {/* View toggle */}
                        <div className="flex rounded-xl border bg-card overflow-hidden text-sm">
                            {(['month','week','day'] as ViewMode[]).map(v => (
                                <button key={v} onClick={() => { setView(v); if (v==='day'&&!focusDate) setFocusDate(toDateStr(year,month,1)); }}
                                    className={`px-3 py-1.5 font-medium transition-colors ${view===v ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}>
                                    {v==='month'?'Сар':v==='week'?'7 хоног':'Өдөр'}
                                </button>
                            ))}
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center gap-1 rounded-xl border bg-card px-1">
                            <button onClick={() => view==='month' ? navMonth(-1) : view==='week' ? navWeek(-1) : navDay(-1)}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                                <ChevronLeft className="size-4" />
                            </button>
                            <span className="text-sm font-semibold px-2 min-w-[120px] text-center">{headerLabel}</span>
                            <button onClick={() => view==='month' ? navMonth(1)  : view==='week' ? navWeek(1)  : navDay(1)}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                                <ChevronRight className="size-4" />
                            </button>
                        </div>

                        {/* Today */}
                        <button onClick={() => {
                            const n = new Date();
                            const fd = toDateStr(n.getFullYear(),n.getMonth()+1,n.getDate());
                            setFocusDate(fd);
                            if (n.getFullYear()!==year||(n.getMonth()+1)!==month) loadMonth(n.getFullYear(),n.getMonth()+1,fd);
                        }} className="px-3 py-1.5 rounded-xl border bg-card text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                            Өнөөдөр
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {branches.length > 0 && (
                            <select value={filterBranch}
                                onChange={e => { setFilterBranch(e.target.value ? Number(e.target.value) : ''); setFilterEmp(''); }}
                                className="rounded-xl border bg-background text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 max-w-[160px]">
                                <option value="">Бүх салбар</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        )}
                        <select value={filterEmp} onChange={e => setFilterEmp(e.target.value ? Number(e.target.value) : '')}
                            className="rounded-xl border bg-background text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 max-w-[180px]">
                            <option value="">Бүх ажилтан</option>
                            {displayedEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <button onClick={() => openCreate(focusDate || toDateStr(year,month,new Date().getDate()))}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                            <Plus className="size-4" /> Хуваарь нэмэх
                        </button>
                    </div>
                </div>

                {/* ── Legend ── */}
                <div className="flex flex-wrap gap-3">
                    {SHIFTS.map(s => (
                        <div key={s.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={`size-2.5 rounded-full ${SHIFT_DOT[s.value]}`} />
                            {s.label}{s.time ? ` (${s.time})` : ''}
                        </div>
                    ))}
                </div>

                {/* ══════════════ MONTH VIEW ══════════════ */}
                {view === 'month' && (() => {
                    const grid = buildMonthGrid(year, month);
                    return (
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-card shadow-sm">
                            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                {DAYS_MN.map(d => (
                                    <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {grid.map((day, idx) => {
                                    const dateStr     = day ? toDateStr(year,month,day) : '';
                                    const dayScheds   = day ? (byDate[dateStr] ?? []) : [];
                                    const today       = day ? isToday(year,month,day) : false;
                                    const isWeekend   = idx%7 >= 5;
                                    const MAX_SHOW    = 3;
                                    const visible     = dayScheds.slice(0, MAX_SHOW);
                                    const remaining   = dayScheds.length - MAX_SHOW;

                                    return (
                                        <div key={idx}
                                            onClick={() => day && openCreate(dateStr)}
                                            className={`relative min-h-[110px] border-b border-r border-gray-100 dark:border-gray-800 p-1.5 transition-all
                                                ${day ? 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10' : 'bg-gray-50/50 dark:bg-gray-900/30'}
                                                ${isWeekend && day ? 'bg-orange-50/40 dark:bg-orange-900/5' : ''}
                                                ${today ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}
                                            `}>
                                            {/* Colored top accent */}
                                            {day && dayScheds.length > 0 && (
                                                <div className={`absolute inset-x-0 top-0 h-[3px] rounded-t
                                                    ${dayScheds.some(s => s.shift_type === 'full') ? 'bg-emerald-400'
                                                    : dayScheds.some(s => s.shift_type === 'morning') ? 'bg-sky-400'
                                                    : dayScheds.some(s => s.shift_type === 'afternoon') ? 'bg-orange-400'
                                                    : 'bg-gray-300'}`} />
                                            )}
                                            {day && (
                                                <>
                                                    {/* Date + count */}
                                                    <div className="flex items-center justify-between mb-1 pt-0.5">
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setFocusDate(dateStr); setView('day'); }}
                                                            className={`text-xs font-bold flex items-center justify-center w-6 h-6 rounded-full hover:ring-2 hover:ring-blue-400 transition-all
                                                                ${today ? 'bg-blue-600 text-white' : isWeekend ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300'}
                                                            `}>
                                                            {day}
                                                        </button>
                                                        {dayScheds.length > 0 && (
                                                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full
                                                                ${today ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-800 text-muted-foreground'}`}>
                                                                {dayScheds.length}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Chips or compact summary */}
                                                    {dayScheds.length > 5 ? (
                                                        /* Compact mode: 5+ employees → shift summary */
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setDayPopup(dateStr); }}
                                                            className="w-full space-y-0.5 text-left">
                                                            {(['morning','full','afternoon','off'] as const).map(type => {
                                                                const cnt = dayScheds.filter(s => s.shift_type === type).length;
                                                                if (!cnt) return null;
                                                                return (
                                                                    <div key={type} className={`flex items-center justify-between rounded-md px-1.5 py-0.5 ${SHIFT_COLORS[type]}`}>
                                                                        <div className="flex items-center gap-1">
                                                                            <span className={`size-1.5 rounded-full shrink-0 ${SHIFT_DOT[type]}`} />
                                                                            <span className="text-[9px] font-semibold">{getShiftShort(type)}</span>
                                                                        </div>
                                                                        <span className="text-[10px] font-black">{cnt}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </button>
                                                    ) : (
                                                        /* Normal chip display */
                                                        <div className="space-y-0.5">
                                                            {visible.map(s => (
                                                                <ScheduleChip key={s.id} s={s} onClick={e => openEdit(s, e)} />
                                                            ))}
                                                            {remaining > 0 && (
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); setDayPopup(dateStr); }}
                                                                    className="w-full text-left px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                                                    +{remaining} ажилтан
                                                                </button>
                                                            )}
                                                            {dayScheds.length === 0 && (
                                                                <div className="text-[9px] text-gray-300 dark:text-gray-700 pt-1">—</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* ══════════════ WEEK VIEW ══════════════ */}
                {view === 'week' && (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-card shadow-sm">
                        {/* Week header */}
                        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                            {weekDates.map((d, i) => {
                                const ds    = toDateStr(d.getFullYear(), d.getMonth()+1, d.getDate());
                                const today = isTodayStr(ds);
                                const wkend = i >= 5;
                                const cnt   = byDate[ds]?.length ?? 0;
                                return (
                                    <div key={i} className={`py-3 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0 transition-colors
                                        ${today ? 'bg-blue-600' : wkend ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                        <p className={`text-[11px] font-semibold ${today ? 'text-blue-100' : wkend ? 'text-orange-400 dark:text-orange-500' : 'text-muted-foreground'}`}>
                                            {DAYS_MN[i]}
                                        </p>
                                        <button
                                            onClick={() => { setFocusDate(ds); setView('day'); }}
                                            className={`mx-auto mt-1 text-sm font-bold flex items-center justify-center w-8 h-8 rounded-full transition-all
                                                ${today ? 'bg-white/20 text-white hover:bg-white/30'
                                                : wkend ? 'text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                                                : 'text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'}
                                            `}>
                                            {d.getDate()}
                                        </button>
                                        {cnt > 0 ? (
                                            <span className={`mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full
                                                ${today ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-muted-foreground'}`}>
                                                {cnt}
                                            </span>
                                        ) : (
                                            <span className="mt-1.5 inline-block text-[10px] opacity-0 select-none">0</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Week body */}
                        <div className="grid grid-cols-7 divide-x divide-gray-100 dark:divide-gray-800">
                            {weekDates.map((d, i) => {
                                const ds     = toDateStr(d.getFullYear(), d.getMonth()+1, d.getDate());
                                const scheds = byDate[ds] ?? [];
                                const wkend  = i >= 5;
                                const today  = isTodayStr(ds);
                                return (
                                    <div key={i}
                                        onClick={() => openCreate(ds)}
                                        className={`min-h-[200px] p-2 cursor-pointer transition-colors space-y-1.5
                                            ${today ? 'bg-blue-50/30 dark:bg-blue-900/10 hover:bg-blue-50/50 dark:hover:bg-blue-900/15'
                                            : wkend ? 'bg-orange-50/30 dark:bg-orange-900/5 hover:bg-orange-50/60 dark:hover:bg-orange-900/10'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}
                                        `}>
                                        {scheds.map(s => (
                                            <WeekCard key={s.id} s={s} onClick={e => openEdit(s, e)} />
                                        ))}
                                        {scheds.length === 0 && (
                                            <div className="flex items-center justify-center min-h-[120px]">
                                                <Plus className="size-4 text-gray-200 dark:text-gray-700" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ══════════════ DAY VIEW ══════════════ */}
                {view === 'day' && (() => {
                    const dayScheds = byDate[focusDate] ?? [];
                    const d         = parseDate(focusDate);
                    const today     = isTodayStr(focusDate);
                    const dow       = (d.getDay() + 6) % 7; // Mon=0
                    const isWeekend = dow >= 5;

                    const SHIFT_ORDER = ['morning', 'full', 'afternoon', 'off'];
                    const groups = SHIFT_ORDER.map(key => ({
                        key,
                        items: dayScheds.filter(s => s.shift_type === key),
                    })).filter(g => g.items.length > 0);

                    const AVATAR_BG: Record<string, string> = {
                        morning:   'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
                        afternoon: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
                        full:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
                        off:       'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                    };
                    const GROUP_HEADER: Record<string, string> = {
                        morning:   'bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800',
                        afternoon: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
                        full:      'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
                        off:       'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-700',
                    };
                    const GROUP_TITLE: Record<string, string> = {
                        morning:   'text-sky-700 dark:text-sky-300',
                        afternoon: 'text-orange-700 dark:text-orange-300',
                        full:      'text-emerald-700 dark:text-emerald-300',
                        off:       'text-gray-500 dark:text-gray-400',
                    };

                    return (
                        <div className="space-y-5">

                            {/* ── Date banner ── */}
                            <div className={`rounded-2xl border overflow-hidden ${today ? 'border-blue-200 dark:border-blue-800' : isWeekend ? 'border-orange-200 dark:border-orange-800' : 'border-gray-200 dark:border-gray-700'}`}>
                                <div className={`px-6 py-5 flex items-center gap-5
                                    ${today ? 'bg-gradient-to-r from-blue-600 to-blue-500'
                                    : isWeekend ? 'bg-gradient-to-r from-orange-500 to-orange-400'
                                    : 'bg-gradient-to-r from-gray-700 to-gray-600 dark:from-gray-600 dark:to-gray-700'}`}>
                                    {/* Big day number */}
                                    <div className="text-white">
                                        <p className="text-5xl font-black leading-none">{d.getDate()}</p>
                                        <p className="text-sm font-semibold opacity-80 mt-1">{MONTHS_MN[d.getMonth()]} {d.getFullYear()}</p>
                                    </div>

                                    <div className="w-px h-12 bg-white/20" />

                                    {/* Day name + stats */}
                                    <div className="flex-1">
                                        <p className="text-white text-xl font-bold">{DAYS_FULL[dow]}</p>
                                        {today && <span className="inline-block mt-1 text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">Өнөөдөр</span>}
                                        {isWeekend && !today && <span className="inline-block mt-1 text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">Амралтын өдөр</span>}
                                    </div>

                                    {/* Stats */}
                                    <div className="text-right">
                                        <p className="text-3xl font-black text-white">{dayScheds.filter(s => s.shift_type !== 'off').length}</p>
                                        <p className="text-xs text-white/70">ажлын ажилтан</p>
                                        {dayScheds.some(s => s.shift_type === 'off') && (
                                            <p className="text-xs text-white/50 mt-0.5">{dayScheds.filter(s => s.shift_type === 'off').length} амралттай</p>
                                        )}
                                    </div>

                                    {/* Add button */}
                                    <button onClick={() => openCreate(focusDate)}
                                        className="flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 px-3 py-2 text-white text-sm font-semibold transition-colors">
                                        <Plus className="size-4" /> Нэмэх
                                    </button>
                                </div>

                                {/* Shift summary bar */}
                                {dayScheds.length > 0 && (
                                    <div className="flex divide-x divide-gray-100 dark:divide-gray-800 bg-card">
                                        {SHIFTS.map(s => {
                                            const cnt = dayScheds.filter(x => x.shift_type === s.value).length;
                                            if (!cnt) return null;
                                            return (
                                                <div key={s.value} className="flex-1 flex items-center gap-2 px-4 py-2.5">
                                                    <span className={`size-2.5 rounded-full shrink-0 ${SHIFT_DOT[s.value]}`} />
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{cnt} ажилтан</p>
                                                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* ── Empty state ── */}
                            {dayScheds.length === 0 && (
                                <div className="py-20 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                                    <CalendarDays className="size-12 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
                                    <p className="text-sm text-muted-foreground">Энэ өдөр хуваарь байхгүй байна</p>
                                    <button onClick={() => openCreate(focusDate)}
                                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                                        <Plus className="size-4" /> Хуваарь нэмэх
                                    </button>
                                </div>
                            )}

                            {/* ── Shift groups ── */}
                            {groups.map(group => (
                                <div key={group.key} className="space-y-2">
                                    {/* Group header */}
                                    <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 ${GROUP_HEADER[group.key]}`}>
                                        <span className={`size-3 rounded-full shrink-0 ${SHIFT_DOT[group.key]}`} />
                                        <span className={`font-bold text-sm ${GROUP_TITLE[group.key]}`}>
                                            {SHIFTS.find(s => s.value === group.key)?.label}
                                        </span>
                                        {SHIFTS.find(s => s.value === group.key)?.time && (
                                            <span className={`text-xs opacity-60 ${GROUP_TITLE[group.key]}`}>
                                                {SHIFTS.find(s => s.value === group.key)?.time}
                                            </span>
                                        )}
                                        <span className={`ml-auto text-xs font-semibold ${GROUP_TITLE[group.key]}`}>
                                            {group.items.length} ажилтан
                                        </span>
                                    </div>

                                    {/* Employee cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                                        {group.items.map(s => (
                                            <button key={s.id} onClick={() => openEdit(s)}
                                                className="text-left rounded-xl border border-gray-200 dark:border-gray-700 bg-card hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all group p-3.5 flex items-start gap-3">

                                                {/* Avatar */}
                                                <div className={`size-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${AVATAR_BG[s.shift_type]}`}>
                                                    {initials(s.employee_name)}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {shortName(s.employee_name)}
                                                    </p>
                                                    {s.employee_position && (
                                                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{s.employee_position}</p>
                                                    )}
                                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5">
                                                        {s.start_time && (
                                                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                                <span className={`size-1.5 rounded-full ${SHIFT_DOT[s.shift_type]}`} />
                                                                {s.start_time}–{s.end_time}
                                                            </span>
                                                        )}
                                                        {s.room && (
                                                            <span className="text-[11px] text-muted-foreground">📍 {s.room}</span>
                                                        )}
                                                    </div>
                                                    {s.assigned_doctor_name && (
                                                        <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1 truncate">
                                                            <Stethoscope className="size-3 shrink-0" />
                                                            {shortName(s.assigned_doctor_name)}
                                                        </p>
                                                    )}
                                                    {s.notes && (
                                                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 italic">{s.notes}</p>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* ── Day popup ("+N more") ── */}
            {dayPopup && (
                <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setDayPopup(null)}>
                    <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:inset-auto z-50"
                        onClick={e => e.stopPropagation()}
                        style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="w-full max-w-sm rounded-2xl border bg-card shadow-xl p-4 mx-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-sm">{dayPopup} — бүх хуваарь</h4>
                                <button onClick={() => setDayPopup(null)}><X className="size-4 text-muted-foreground" /></button>
                            </div>
                            <div className="space-y-1.5 max-h-72 overflow-y-auto">
                                {(byDate[dayPopup] ?? []).map(s => (
                                    <PopupCard key={s.id} s={s} onClick={() => openEdit(s)} />
                                ))}
                            </div>
                            <button onClick={() => { setDayPopup(null); openCreate(dayPopup); }}
                                className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                                <Plus className="size-4" /> Хуваарь нэмэх
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Create / Edit Modal ── */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b">
                            <h3 className="font-bold text-foreground">
                                {modal==='create' ? 'Хуваарь нэмэх' : 'Хуваарь засах'}
                            </h3>
                            <button onClick={() => { setModal(null); reset(); }}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>

                        <form onSubmit={modal==='create' ? handleCreate : handleUpdate}
                            className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

                            {/* Employee */}
                            {modal==='create' ? (
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Ажилтан *</label>
                                    <select value={data.employee_id} onChange={e => setData('employee_id', e.target.value)}
                                        className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">— Ажилтан сонгох —</option>
                                        {displayedEmployees.map(e => (
                                            <option key={e.id} value={e.id}>{e.name}{e.position ? ` · ${e.position}` : ''}</option>
                                        ))}
                                    </select>
                                    {errors.employee_id && <p className="mt-1 text-xs text-red-500">{errors.employee_id}</p>}
                                </div>
                            ) : (
                                <div className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
                                    <span className="font-medium">{editItem?.employee_name}</span>
                                    {editItem?.employee_position && <span className="text-muted-foreground ml-2 text-xs">{editItem.employee_position}</span>}
                                </div>
                            )}

                            {/* Date */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Огноо *</label>
                                <input type="date" value={data.date} onChange={e => setData('date', e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
                            </div>

                            {/* Shift type */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ээлжийн төрөл *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {SHIFTS.map(s => (
                                        <button key={s.value} type="button" onClick={() => handleShiftChange(s.value)}
                                            className={`rounded-xl border py-2.5 px-2 text-xs font-medium text-center transition-colors ${
                                                data.shift_type===s.value
                                                    ? `${SHIFT_COLORS[s.value]} border-current`
                                                    : 'text-muted-foreground hover:bg-muted border-border'
                                            }`}>
                                            <div className={`size-2 rounded-full mx-auto mb-1 ${SHIFT_DOT[s.value]}`} />
                                            <div>{s.label}</div>
                                            {s.time && <div className="text-[10px] opacity-60 mt-0.5">{s.time}</div>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Times */}
                            {data.shift_type !== 'off' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Эхлэх цаг</label>
                                        <input type="time" value={data.start_time} onChange={e => setData('start_time', e.target.value)}
                                            className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Дуусах цаг</label>
                                        <input type="time" value={data.end_time} onChange={e => setData('end_time', e.target.value)}
                                            className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>
                            )}

                            {/* Room */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                    Өрөө / Суудал <span className="opacity-60">(заавал биш)</span>
                                </label>
                                <input value={data.room} onChange={e => setData('room', e.target.value)}
                                    placeholder="Жнэ: Өрөө 1, Суудал A..."
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>

                            {/* Doctor picker for nurses/assistants */}
                            {showDocPicker && (
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                        <Stethoscope className="size-3" /> Хариуцах эмч <span className="opacity-60">(заавал биш)</span>
                                    </label>
                                    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 mb-1.5">
                                        Тухайн өдөр ямар эмчтэй хамт ажиллахыг сонгоно
                                    </div>
                                    <select value={data.assigned_doctor_id} onChange={e => setData('assigned_doctor_id', e.target.value)}
                                        className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">— Эмч сонгох —</option>
                                        {doctors.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}{d.position ? ` · ${d.position}` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                    Тэмдэглэл <span className="opacity-60">(заавал биш)</span>
                                </label>
                                <textarea value={data.notes} onChange={e => setData('notes', e.target.value)}
                                    rows={2} placeholder="Нэмэлт мэдээлэл..."
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button type="submit"
                                    disabled={processing || !data.date || (modal==='create' && !data.employee_id)}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                    {processing
                                        ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        : <CalendarDays className="size-4" />}
                                    {modal==='create' ? 'Хадгалах' : 'Шинэчлэх'}
                                </button>
                                {modal==='edit' && (
                                    <button type="button" onClick={handleDelete}
                                        className="rounded-xl border border-red-200 dark:border-red-800 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                                        <Trash2 className="size-4" />
                                    </button>
                                )}
                                <button type="button" onClick={() => { setModal(null); reset(); }}
                                    className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                                    Цуцлах
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ToastContainer />
        </AppLayout>
    );
}
