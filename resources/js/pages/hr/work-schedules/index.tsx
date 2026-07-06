import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import OrthoView, { type OrthoAssistant, type OrthoBranch, type OrthoDoctor, type OrthoSchedule } from './ortho-view';
import { router, usePage } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import {
    Braces, Building2, CalendarClock, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Copy,
    Plus, Printer, Save, Stethoscope, Trash2, Users, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Branch   { id: number; name: string; abbr: string; }
interface Employee {
    id: number; name: string; position_id: number | null; position: string | null;
    role_group: string; branch_id: number | null; branch: string | null; photo_url: string | null;
}
interface Doctor   { id: number; name: string; }
interface Schedule {
    id: number; employee_id: number; date: string;
    shift_type: string; shift_label: string;
    start_time: string | null; end_time: string | null;
    room: string | null; assigned_doctor_id: number | null;
    duties: string[]; notes: string | null;
}
interface CardProduceRow { doctor_id: number | null; nurse_id: number | null; }
interface NurseTimeRow   { person_id: number | null; time: string; }
interface DayTasks {
    card_produce?: CardProduceRow[]; card_collect?: NurseTimeRow[];
    model_room?: NurseTimeRow[]; print_cover?: NurseTimeRow[];
}
interface PageProps {
    employees: Employee[]; doctors: Doctor[]; branches: Branch[];
    schedules: Schedule[]; day_plans: Record<string, DayTasks>;
    task_types: Record<string, string>; week_start: string;
    ortho_assistants: OrthoAssistant[]; ortho_doctors: OrthoDoctor[];
    ortho_schedules: OrthoSchedule[]; ortho_states: Record<string, string>;
    ortho_year: number; ortho_month: number;
    [key: string]: unknown;
}
type Row = { s: Schedule; emp: Employee };

/* ─── Constants ──────────────────────────────────────────────────────────── */
const MONTHS_MN  = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар',
                    '7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];
const DAYS_SHORT = ['Да','Мя','Лх','Пү','Ба','Бя','Ня'];
const DAYS_FULL  = ['Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба','Ням'];

/* Зүүн багана = эмч + үйлчилгээний роль; Баруун багана = сувилагч/туслах */
const LEFT_ROLES  = new Set(['doctor', 'xray', 'reception', 'cleaner', 'technician', 'other']);
const RIGHT_ROLES = new Set(['nurse', 'assistant']);

const SHIFTS = [
    { value: 'morning',   label: 'Өглөө' },
    { value: 'afternoon', label: 'Орой' },
    { value: 'full',      label: 'Бүтэн' },
    { value: 'custom',    label: 'Тусгай' },
    { value: 'off',       label: 'Амралт' },
];
const SHIFT_BTN: Record<string, string> = {
    morning: 'bg-sky-600', afternoon: 'bg-orange-600',
    full: 'bg-emerald-600', custom: 'bg-violet-600', off: 'bg-gray-500',
};

/* Эмчийн өнгөний палитр (PDF шиг пастел) + үйлчилгээний ролийн өнгө */
const DOC_PALETTE = [
    { bg: '#bbf7d0', text: '#166534' }, { bg: '#fbcfe8', text: '#9d174d' },
    { bg: '#bfdbfe', text: '#1e40af' }, { bg: '#ddd6fe', text: '#5b21b6' },
    { bg: '#fde68a', text: '#854d0e' }, { bg: '#99f6e4', text: '#115e59' },
    { bg: '#c7d2fe', text: '#3730a3' }, { bg: '#fecdd3', text: '#9f1239' },
];
const ROLE_FIXED: Record<string, { bg: string; text: string }> = {
    xray:       { bg: '#fdba74', text: '#7c2d12' },
    reception:  { bg: '#fde047', text: '#713f12' },
    cleaner:    { bg: '#e2e8f0', text: '#334155' },
    technician: { bg: '#a5f3fc', text: '#155e75' },
    other:      { bg: '#e5e7eb', text: '#374151' },
};

/* Албан тушаалын секцийн эрэмбэ + өнгө */
const ROLE_ORDER: Record<string, number> = {
    nurse: 1, assistant: 2, reception: 3, xray: 4, technician: 5, cleaner: 6, other: 7,
};
const ROLE_BADGE: Record<string, string> = {
    nurse:      'bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400',
    assistant:  'bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400',
    reception:  'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
    xray:       'bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400',
    technician: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400',
    cleaner:    'bg-lime-100 text-lime-600 dark:bg-lime-950/50 dark:text-lime-400',
    other:      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};
function roleBadge(r: string) { return ROLE_BADGE[r] ?? ROLE_BADGE.other; }

/* Салбар tile-ийн градиент */
const TILE_GRADIENTS = [
    'from-indigo-500 to-violet-600',
    'from-emerald-500 to-teal-600',
    'from-sky-500 to-blue-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-blue-500',
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function pad(n: number) { return String(n).padStart(2, '0'); }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function parseDate(s: string) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function isTodayStr(s: string) { return s === toDateStr(new Date()); }
function shiftDefaults(role: string, shift: string): [string, string] {
    const doc = role === 'doctor';
    switch (shift) {
        case 'morning':   return doc ? ['09:00', '15:00'] : ['08:30', '16:30'];
        case 'afternoon': return doc ? ['15:00', '20:00'] : ['12:30', '20:30'];
        case 'full':      return doc ? ['09:00', '20:00'] : ['08:30', '20:30'];
        default:          return ['', ''];
    }
}
function timeText(s: Schedule) {
    if (s.shift_type === 'off') return 'Амралт';
    if (!s.start_time && !s.end_time) return '';
    return `${s.start_time ?? ''}-${s.end_time ?? ''}`;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function WorkSchedulesIndex() {
    const { employees, doctors, branches, schedules, day_plans, task_types, week_start,
        ortho_assistants, ortho_doctors, ortho_schedules, ortho_states, ortho_year, ortho_month } =
        usePage<PageProps>().props;

    const [tab, setTab] = useState<'clinic' | 'ortho'>('clinic');

    /* ── Lookups ── */
    const empMap = useMemo(() => {
        const m = new Map<number, Employee>();
        employees.forEach(e => m.set(e.id, e));
        return m;
    }, [employees]);

    const docColorIndex = useMemo(() => {
        const m = new Map<number, number>();
        employees.filter(e => e.role_group === 'doctor').forEach((e, i) => m.set(e.id, i));
        return m;
    }, [employees]);
    function colorFor(emp: Employee): { bg: string; text: string } | null {
        if (emp.role_group === 'doctor') return DOC_PALETTE[(docColorIndex.get(emp.id) ?? 0) % DOC_PALETTE.length];
        return ROLE_FIXED[emp.role_group] ?? null;
    }

    /* ── Week days ── */
    const weekDays = useMemo(() => {
        const start = parseDate(week_start);
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }, [week_start]);

    /* ── Selected day ── */
    const [selected, setSelected] = useState<string>(() => {
        const t = toDateStr(new Date());
        return weekDays.some(d => toDateStr(d) === t) ? t : toDateStr(weekDays[0]);
    });
    useEffect(() => {
        if (!weekDays.some(d => toDateStr(d) === selected)) {
            const t = toDateStr(new Date());
            setSelected(weekDays.some(d => toDateStr(d) === t) ? t : toDateStr(weekDays[0]));
        }
    }, [week_start]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Selected branch (null = салбар сонгох landing) ── */
    const [branch, setBranch] = useState<number | 'all' | null>(branches.length > 0 ? null : 'all');
    const branchEmployees = useMemo(() =>
        employees.filter(e => branch === 'all' || e.branch_id === branch),
        [employees, branch]);
    const branchEmpIds = useMemo(() => new Set(branchEmployees.map(e => e.id)), [branchEmployees]);

    /* ── Scheduled rows for the selected day (within branch) ── */
    const dayRows = useMemo<Row[]>(() =>
        schedules
            .filter(s => s.date === selected)
            .map(s => ({ s, emp: empMap.get(s.employee_id)! }))
            .filter(x => x.emp && branchEmpIds.has(x.emp.id)),
        [schedules, selected, empMap, branchEmpIds]);

    const rightRows = dayRows.filter(x => RIGHT_ROLES.has(x.emp.role_group));

    const shiftOrd = (s: Schedule) => s.shift_type === 'afternoon' ? 1 : s.shift_type === 'off' ? 2 : 0;
    /* Эмч нар дээр (Өглөө→Орой) */
    const doctorRows = dayRows.filter(x => x.emp.role_group === 'doctor')
        .sort((a, b) => shiftOrd(a.s) - shiftOrd(b.s) || (a.s.start_time ?? '').localeCompare(b.s.start_time ?? ''));
    const rightSorted = [...rightRows].sort((a, b) => (a.s.start_time ?? '').localeCompare(b.s.start_time ?? ''));

    /* Эмч бүрт хариуцах сувилагчид */
    const presentDoctorIds = new Set(doctorRows.map(x => x.emp.id));
    const nursesByDoctor = new Map<number, Row[]>();
    const pairedSchedIds = new Set<number>();
    for (const n of rightSorted) {
        const did = n.s.assigned_doctor_id;
        if (did && presentDoctorIds.has(did)) {
            const arr = nursesByDoctor.get(did) ?? [];
            arr.push(n); nursesByDoctor.set(did, arr);
            pairedSchedIds.add(n.s.id);
        }
    }

    /* Эмчээс бусад, эмчид хослоогүй ажилтнуудыг АЛБАН ТУШААЛААР нь бүлэглэх */
    const staffSecMap = new Map<string, { key: string; label: string; role: string; items: Row[] }>();
    for (const x of dayRows) {
        if (x.emp.role_group === 'doctor' || pairedSchedIds.has(x.s.id)) continue;
        const key = x.emp.position_id ? `p${x.emp.position_id}` : `r-${x.emp.role_group}`;
        const label = x.emp.position ?? 'Бусад';
        if (!staffSecMap.has(key)) staffSecMap.set(key, { key, label, role: x.emp.role_group, items: [] });
        staffSecMap.get(key)!.items.push(x);
    }
    const staffSections = [...staffSecMap.values()]
        .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || a.label.localeCompare(b.label));
    staffSections.forEach(s => s.items.sort((a, b) => a.emp.name.localeCompare(b.emp.name)));

    const docCount   = doctorRows.filter(x => x.s.shift_type !== 'off').length;
    const nurseCount = rightRows.filter(x => x.s.shift_type !== 'off').length;
    const dayCount = (ds: string) =>
        schedules.filter(s => s.date === ds && s.shift_type !== 'off' && branchEmpIds.has(s.employee_id)).length;

    /* ── Editor / picker ── */
    const [editor, setEditor] = useState<{ employee: Employee; existing: Schedule | null; presetDoctorId?: number } | null>(null);
    const [picker, setPicker] = useState<{ kind: 'doctor' | 'staff' | 'nurse'; doctorId?: number } | null>(null);

    /* ── Navigation ── */
    function navWeek(dir: number) {
        const target = addDays(parseDate(week_start), dir * 7);
        router.get('/hr/work-schedules', { date: toDateStr(target) },
            { preserveState: true, preserveScroll: true, only: ['schedules', 'day_plans', 'week_start'] });
    }
    function goToday() {
        const t = toDateStr(new Date());
        router.get('/hr/work-schedules', { date: t },
            { preserveState: true, preserveScroll: true, only: ['schedules', 'day_plans', 'week_start'],
              onSuccess: () => setSelected(t) });
    }
    function copyPrevWeek() {
        if (!confirm('Өмнөх 7 хоногийн хуваарийг энэ долоо хоног руу хуулах уу?')) return;
        router.post('/hr/work-schedules/copy-week', { target_week_start: week_start },
            { preserveState: true, preserveScroll: true, only: ['schedules', 'day_plans'] });
    }

    const weekLabel = (() => {
        const [a, b] = [weekDays[0], weekDays[6]];
        return a.getMonth() === b.getMonth()
            ? `${MONTHS_MN[a.getMonth()]} ${a.getDate()}–${b.getDate()}`
            : `${a.getDate()} ${MONTHS_MN[a.getMonth()]} – ${b.getDate()} ${MONTHS_MN[b.getMonth()]}`;
    })();

    const selDate = parseDate(selected);
    const selDow  = (selDate.getDay() + 6) % 7;

    /* ── Time badge ── */
    function TimeBadge({ s }: { s: Schedule }) {
        if (s.shift_type === 'off')
            return <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">Амралт</span>;
        return <span className="text-[11px] font-bold tabular-nums text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-0.5 shrink-0">{timeText(s)}</span>;
    }

    /* ── Doctor + assigned nurses (paired row, PDF шиг) ── */
    function DoctorPair({ x, nurses }: { x: Row; nurses: Row[] }) {
        const col = colorFor(x.emp);
        const off = x.s.shift_type === 'off';
        const accent = col?.text ?? '#94a3b8';
        const tag = x.s.shift_type === 'afternoon' ? 'Орой' : 'Өглөө';
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 rounded-2xl border border-gray-100 dark:border-gray-800 bg-card overflow-hidden shadow-sm hover:shadow-md transition-all"
                style={{ borderLeftWidth: 4, borderLeftColor: off ? '#cbd5e1' : accent }}>
                {/* Doctor */}
                <button onClick={() => setEditor({ employee: x.emp, existing: x.s })}
                    className="flex items-center gap-2.5 px-3.5 py-3 text-left transition-all hover:brightness-[0.97]"
                    style={{ background: off ? undefined : col ? `${col.bg}26` : undefined }}>
                    {off
                        ? <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground bg-muted rounded px-1.5 py-0.5">Амралт</span>
                        : <span className={`text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 ${x.s.shift_type === 'afternoon' ? 'text-orange-600 bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400' : 'text-sky-600 bg-sky-100 dark:bg-sky-950/40 dark:text-sky-400'}`}>{tag}</span>}
                    <span className="flex-1 min-w-0 text-sm font-black truncate" style={off ? undefined : { color: accent }}>{x.emp.name}</span>
                    {!off && <TimeBadge s={x.s} />}
                </button>
                {/* Assigned nurses */}
                <div className="border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/20">
                    {nurses.map(n => (
                        <button key={n.s.id} onClick={() => setEditor({ employee: n.emp, existing: n.s })}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-muted/50 border-b border-gray-100/70 dark:border-gray-800/50 last:border-b-0 transition-colors">
                            <span className="size-1.5 rounded-full bg-indigo-400 shrink-0" />
                            <span className="flex-1 min-w-0 text-[13px] font-semibold truncate">{n.emp.name}</span>
                            <TimeBadge s={n.s} />
                        </button>
                    ))}
                    <button onClick={() => setPicker({ kind: 'nurse', doctorId: x.emp.id })}
                        className="w-full flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 transition-colors">
                        <Plus className="size-3" /> Сувилагч нэмэх
                    </button>
                </div>
            </div>
        );
    }

    /* ── Other staff / unassigned nurse simple row ── */
    function SimpleRow({ x, accentHex }: { x: Row; accentHex: string }) {
        const off = x.s.shift_type === 'off';
        const assignedName = x.s.assigned_doctor_id ? empMap.get(x.s.assigned_doctor_id)?.name : null;
        const tag = x.s.shift_type === 'afternoon' ? 'Орой' : (x.s.shift_type === 'morning' || x.s.shift_type === 'full') ? 'Өглөө' : null;
        const ini = x.emp.name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        return (
            <button onClick={() => setEditor({ employee: x.emp, existing: x.s })}
                className="group text-left rounded-2xl border border-gray-100 dark:border-gray-800 bg-card p-3 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                <div className="size-9 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 overflow-hidden"
                    style={{ background: off ? 'var(--muted)' : `${accentHex}1a`, color: off ? undefined : accentHex }}>
                    {x.emp.photo_url ? <img src={x.emp.photo_url} alt="" className="size-full object-cover" /> : ini}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold truncate text-foreground">{x.emp.name}</p>
                    {off ? (
                        <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">Амралттай</p>
                    ) : (
                        <p className="text-[11px] font-semibold tabular-nums text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            {tag && <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: accentHex }}>{tag}</span>}
                            {x.s.start_time}–{x.s.end_time}
                        </p>
                    )}
                    {assignedName && (
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 truncate font-semibold mt-0.5">
                            <Stethoscope className="size-2.5 shrink-0" />{assignedName}
                        </p>
                    )}
                </div>
            </button>
        );
    }

    /* ════════════════════════ RENDER ════════════════════════ */
    return (
        <AppLayout breadcrumbs={[{ title: 'HR', href: '/hr/employees' }, { title: 'Ажлын хуваарь', href: '/hr/work-schedules' }]}>
            <div className="p-4 md:p-6 space-y-5">

                {/* ── Top bar ── */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
                            <CalendarDays className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-gray-100 leading-none">Ажлын хуваарь</h1>
                            <p className="text-xs text-muted-foreground mt-1">Эмч · сувилагчийн 7 хоногийн хуваарь</p>
                        </div>
                    </div>
                    {tab === 'clinic' && branch !== null && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-0.5 rounded-full border bg-card p-1 shadow-sm">
                                <button onClick={() => navWeek(-1)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft className="size-4" /></button>
                                <span className="text-sm font-bold px-3 min-w-[140px] text-center">{weekLabel}</span>
                                <button onClick={() => navWeek(1)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"><ChevronRight className="size-4" /></button>
                            </div>
                            <button onClick={goToday} className="px-3.5 py-2 rounded-full border bg-card text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors shadow-sm">Өнөөдөр</button>
                            <button onClick={copyPrevWeek}
                                className="flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors shadow-sm">
                                <Copy className="size-4" /> <span className="hidden sm:inline">Өмнөх 7 хоног хуулах</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Tabs (шууд солигдоно) ── */}
                <div className="flex items-center gap-1 rounded-full border bg-card p-1 shadow-sm w-fit">
                    <button onClick={() => setTab('clinic')}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${tab === 'clinic' ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow' : 'text-muted-foreground hover:bg-muted'}`}>
                        <CalendarDays className="size-4" /> Эмч сувилагчийн хуваарь
                    </button>
                    <button onClick={() => setTab('ortho')}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${tab === 'ortho' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow' : 'text-muted-foreground hover:bg-muted'}`}>
                        <Braces className="size-4" /> Гажиг засал / туслах эмчийн хуваарь
                    </button>
                </div>

                {tab === 'ortho' ? (
                    <OrthoView
                        assistants={ortho_assistants}
                        doctors={ortho_doctors}
                        branches={branches as OrthoBranch[]}
                        schedules={ortho_schedules}
                        states={ortho_states}
                        year={ortho_year}
                        month={ortho_month}
                        onNavMonth={(y, m) => router.get('/hr/work-schedules', { oyear: y, omonth: m },
                            { preserveState: true, preserveScroll: true, only: ['ortho_schedules', 'ortho_year', 'ortho_month'] })}
                    />
                ) : branch === null ? (
                    /* ══════ Landing: салбар сонгох (premium full-width) ══════ */
                    <div className="space-y-6">
                        {/* Hero */}
                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-800 via-slate-800 to-indigo-900 px-8 py-9 shadow-xl">
                            <div className="absolute -right-12 -top-16 size-56 rounded-full bg-indigo-500/20 blur-3xl" />
                            <div className="absolute right-32 top-4 size-28 rounded-full bg-violet-500/10 blur-2xl" />
                            <div className="relative flex items-center gap-4">
                                <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/20 text-white shadow-lg">
                                    <Plus className="size-7" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight text-white leading-none">Хуваарь нэмэх</h2>
                                    <p className="text-sm text-white/60 mt-2">Аль салбарын 7 хоногийн хуваарь оруулахаа сонгоно уу</p>
                                </div>
                            </div>
                        </div>

                        {/* Branch tiles — full width */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {branches.map((b, i) => {
                                const grad = TILE_GRADIENTS[i % TILE_GRADIENTS.length];
                                const cnt = employees.filter(e => e.branch_id === b.id).length;
                                return (
                                    <button key={b.id} onClick={() => setBranch(b.id)}
                                        className="group relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700/70 bg-card p-5 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                                        <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${grad}`} />
                                        <div className="flex items-center gap-4">
                                            <div className={`flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-white shadow-lg shrink-0`}>
                                                <Building2 className="size-7" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-lg font-black tracking-tight truncate">{b.name}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Users className="size-3" /> {cnt} ажилтан</p>
                                            </div>
                                            <ChevronRight className="size-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-indigo-500 transition-all shrink-0" />
                                        </div>
                                    </button>
                                );
                            })}
                            {/* Бүх салбар */}
                            <button onClick={() => setBranch('all')}
                                className="group relative overflow-hidden rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-card/50 p-5 text-left hover:border-gray-400 hover:bg-muted/40 hover:-translate-y-1 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground shrink-0">
                                        <Building2 className="size-7" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-lg font-black tracking-tight truncate">Бүх салбар</p>
                                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Users className="size-3" /> {employees.length} ажилтан</p>
                                    </div>
                                    <ChevronRight className="size-5 text-muted-foreground group-hover:translate-x-1 transition-all shrink-0" />
                                </div>
                            </button>
                        </div>
                    </div>
                ) : (
                  <>
                {/* ── Идэвхтэй салбар ── */}
                <div className="flex items-center justify-between rounded-2xl border bg-card px-4 py-2.5 shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"><Building2 className="size-4" /></div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide leading-none">Салбар</p>
                            <p className="text-sm font-black leading-tight mt-0.5">{branch === 'all' ? 'Бүх салбар' : branches.find(b => b.id === branch)?.name}</p>
                        </div>
                    </div>
                    <button onClick={() => setBranch(null)}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg px-2.5 py-1.5 transition-colors">
                        <Building2 className="size-3.5" /> Салбар солих
                    </button>
                </div>

                {/* ── Day tabs ── */}
                <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((d, i) => {
                        const ds = toDateStr(d);
                        const isSel = ds === selected;
                        const today = isTodayStr(ds);
                        const wkend = i >= 5;
                        const cnt = dayCount(ds);
                        return (
                            <button key={ds} onClick={() => setSelected(ds)}
                                className={`relative rounded-2xl py-2.5 flex flex-col items-center transition-all duration-200 ${
                                    isSel ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 -translate-y-0.5'
                                    : `bg-card border hover:border-indigo-300 hover:shadow-md ${today ? 'ring-2 ring-indigo-400/60' : ''}`}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSel ? 'text-white/80' : wkend ? 'text-orange-500' : 'text-muted-foreground'}`}>{DAYS_SHORT[i]}</span>
                                <span className={`text-xl font-black leading-tight ${isSel ? 'text-white' : wkend ? 'text-orange-500' : 'text-foreground'}`}>{d.getDate()}</span>
                                <span className={`mt-0.5 text-[9px] font-bold ${isSel ? 'text-white/70' : 'text-muted-foreground'}`}>{cnt > 0 ? `${cnt}` : '·'}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Day sheet ── */}
                <div className="rounded-3xl border border-gray-200 dark:border-gray-700/70 overflow-hidden bg-card shadow-xl shadow-gray-200/40 dark:shadow-black/20">
                    {/* Banner */}
                    <div className="relative overflow-hidden bg-gradient-to-r from-slate-800 via-slate-800 to-indigo-900 px-6 py-4">
                        <div className="absolute -right-10 -top-12 size-48 rounded-full bg-indigo-500/20 blur-3xl" />
                        <div className="relative flex items-center gap-5">
                            <div className="text-white">
                                <p className="text-4xl font-black leading-none">{selDate.getDate()}</p>
                                <p className="text-[11px] font-medium text-white/60 mt-0.5">{MONTHS_MN[selDate.getMonth()]}</p>
                            </div>
                            <div className="w-px h-11 bg-white/15" />
                            <div className="flex-1">
                                <p className="text-white text-lg font-bold leading-tight">{DAYS_FULL[selDow]}</p>
                                <p className="text-[11px] text-white/50">{selDate.getFullYear()} он · {branch === 'all' ? 'Бүх салбар' : branches.find(b => b.id === branch)?.name}</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="rounded-2xl bg-white/10 backdrop-blur px-3.5 py-1.5 text-center min-w-[60px]">
                                    <p className="text-lg font-black text-white leading-none">{docCount}</p>
                                    <p className="text-[9px] text-white/60 mt-0.5 flex items-center justify-center gap-0.5"><Stethoscope className="size-2.5" /> Эмч</p>
                                </div>
                                <div className="rounded-2xl bg-white/10 backdrop-blur px-3.5 py-1.5 text-center min-w-[60px]">
                                    <p className="text-lg font-black text-white leading-none">{nurseCount}</p>
                                    <p className="text-[9px] text-white/60 mt-0.5 flex items-center justify-center gap-0.5"><Users className="size-2.5" /> Сувилагч</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 sm:p-6 space-y-7">

                        {/* Эмч ↔ хариуцах сувилагч */}
                        <div>
                            <div className="flex items-center gap-2.5 mb-3">
                                <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><Stethoscope className="size-4" /></span>
                                <h2 className="text-base font-black tracking-tight">Эмч <span className="font-bold text-muted-foreground">↔ хариуцах сувилагч</span></h2>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{doctorRows.length}</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent dark:from-gray-700" />
                            </div>
                            <div className="space-y-2.5">
                                {doctorRows.map(x => <DoctorPair key={x.s.id} x={x} nurses={nursesByDoctor.get(x.emp.id) ?? []} />)}
                            </div>
                            {doctorRows.length === 0 && <p className="px-3 py-6 text-xs text-center text-muted-foreground italic rounded-2xl border border-dashed">Эмчийн цаг тавиагүй байна</p>}
                            <button onClick={() => setPicker({ kind: 'doctor' })}
                                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-900 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                                <Plus className="size-3.5" /> Эмч нэмэх
                            </button>
                        </div>

                        {/* Албан тушаал бүрээр (Ресепшн, Ариутгалын сувилагч, Рентген техникч...) */}
                        {staffSections.map(sec => (
                            <div key={sec.key}>
                                <div className="flex items-center gap-2.5 mb-3">
                                    <span className={`flex size-8 items-center justify-center rounded-xl ${roleBadge(sec.role)}`}><Users className="size-4" /></span>
                                    <h2 className="text-base font-black tracking-tight">{sec.label}</h2>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${roleBadge(sec.role)}`}>{sec.items.length}</span>
                                    <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent dark:from-gray-700" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                                    {sec.items.map(x => <SimpleRow key={x.s.id} x={x} accentHex={colorFor(x.emp)?.text ?? '#6366f1'} />)}
                                </div>
                            </div>
                        ))}

                        {/* Ажилтан нэмэх */}
                        <button onClick={() => setPicker({ kind: 'staff' })}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-xs font-bold text-muted-foreground hover:bg-muted transition-colors">
                            <Plus className="size-3.5" /> Ажилтан нэмэх (сувилагч, ресепшн, рентген, үйлчлэгч...)
                        </button>
                    </div>

                    {/* Tasks */}
                    <TaskSection
                        key={selected}
                        date={selected}
                        initial={day_plans[selected] ?? {}}
                        taskTypes={task_types}
                        employees={branchEmployees}
                        doctors={doctors}
                        empMap={empMap}
                        colorFor={colorFor}
                    />
                </div>
                  </>
                )}
            </div>

            {picker && (
                <AddPicker
                    kind={picker.kind}
                    employees={branchEmployees}
                    scheduledIds={new Set(dayRows.map(x => x.emp.id))}
                    onClose={() => setPicker(null)}
                    onPick={(emp) => { const did = picker.doctorId; setPicker(null); setEditor({ employee: emp, existing: null, presetDoctorId: did }); }}
                />
            )}

            {editor && (
                <CellEditor
                    employee={editor.employee}
                    date={selected}
                    weekStart={week_start}
                    existing={editor.existing}
                    presetDoctorId={editor.presetDoctorId}
                    doctors={doctors}
                    onClose={() => setEditor(null)}
                />
            )}

            <ToastContainer />
        </AppLayout>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Task section ("Хийх ажил")                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
function TaskSection({ date, initial, taskTypes, employees, doctors, empMap, colorFor }: {
    date: string; initial: DayTasks; taskTypes: Record<string, string>;
    employees: Employee[]; doctors: Doctor[]; empMap: Map<number, Employee>;
    colorFor: (e: Employee) => { bg: string; text: string } | null;
}) {
    const [tasks, setTasks] = useState<DayTasks>(initial);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy]   = useState(false);
    useEffect(() => { setTasks(initial); setDirty(false); }, [initial]);

    const nurses = useMemo(() => employees.filter(e => e.role_group === 'nurse' || e.role_group === 'assistant'), [employees]);
    function update(next: DayTasks) { setTasks(next); setDirty(true); }
    function save() {
        setBusy(true);
        router.post('/hr/work-schedules/save-tasks', { date, tasks: tasks as unknown as Record<string, FormDataConvertible> },
            { preserveState: true, preserveScroll: true, only: ['day_plans'],
              onFinish: () => setBusy(false), onSuccess: () => setDirty(false) });
    }

    const cp = tasks.card_produce ?? [];
    function setCp(rows: CardProduceRow[]) { update({ ...tasks, card_produce: rows }); }
    function ntList(key: 'card_collect' | 'model_room' | 'print_cover') { return tasks[key] ?? []; }
    function setNt(key: 'card_collect' | 'model_room' | 'print_cover', rows: NurseTimeRow[]) { update({ ...tasks, [key]: rows }); }
    const selCls = 'rounded-lg border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

    return (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gradient-to-b from-gray-50/80 to-transparent dark:from-gray-900/40">
            <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                        <ClipboardList className="size-4" />
                    </div>
                    <h3 className="text-base font-black tracking-tight">Хийх ажил</h3>
                </div>
                {dirty && (
                    <button onClick={save} disabled={busy}
                        className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-500/30 hover:shadow-lg disabled:opacity-50 transition-shadow">
                        {busy ? <span className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Save className="size-3.5" />}
                        Хадгалах
                    </button>
                )}
            </div>

            <div className="px-5 pb-5 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-3">
                {/* Карт, загвар гаргах */}
                <div className="rounded-2xl border bg-card p-3.5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2.5">
                        <div className="flex size-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><ClipboardList className="size-3.5" /></div>
                        <p className="text-xs font-bold">{taskTypes.card_produce}</p>
                    </div>
                    <div className="space-y-1.5">
                        {cp.map((row, i) => {
                            const docEmp = row.doctor_id ? empMap.get(row.doctor_id) : undefined;
                            const col = docEmp ? colorFor(docEmp) : null;
                            return (
                                <div key={i} className="flex items-center gap-1.5">
                                    <select value={row.doctor_id ?? ''} onChange={e => setCp(cp.map((r,j) => j===i ? { ...r, doctor_id: e.target.value ? Number(e.target.value) : null } : r))}
                                        className={`${selCls} flex-1`} style={col ? { background: col.bg, color: col.text } : undefined}>
                                        <option value="">— Эмч сонгох —</option>
                                        {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                    <span className="text-muted-foreground text-xs">→</span>
                                    <select value={row.nurse_id ?? ''} onChange={e => setCp(cp.map((r,j) => j===i ? { ...r, nurse_id: e.target.value ? Number(e.target.value) : null } : r))}
                                        className={`${selCls} flex-1`}>
                                        <option value="">— Сувилагч сонгох —</option>
                                        {nurses.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                                    </select>
                                    <button onClick={() => setCp(cp.filter((_,j) => j!==i))} className="p-1 text-red-400 hover:text-red-600"><X className="size-3.5" /></button>
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={() => setCp([...cp, { doctor_id: null, nurse_id: null }])}
                        className="mt-2 flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                        <Plus className="size-3" /> Мөр нэмэх
                    </button>
                </div>

                <NurseTimeBlock label={taskTypes.card_collect} rows={ntList('card_collect')} nurses={nurses}
                    onChange={rows => setNt('card_collect', rows)} selCls={selCls} optionalPerson
                    icon={<CalendarClock className="size-3.5" />} accent="bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400" />
                <NurseTimeBlock label={taskTypes.model_room} rows={ntList('model_room')} nurses={nurses}
                    onChange={rows => setNt('model_room', rows)} selCls={selCls}
                    icon={<ClipboardList className="size-3.5" />} accent="bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400" />
                <NurseTimeBlock label={taskTypes.print_cover} rows={ntList('print_cover')} nurses={employees}
                    onChange={rows => setNt('print_cover', rows)} selCls={selCls}
                    icon={<Printer className="size-3.5" />} accent="bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400" />
            </div>
        </div>
    );
}

function NurseTimeBlock({ label, rows, nurses, onChange, selCls, optionalPerson, icon, accent }: {
    label: string; rows: NurseTimeRow[]; nurses: Employee[];
    onChange: (rows: NurseTimeRow[]) => void; selCls: string; optionalPerson?: boolean;
    icon?: React.ReactNode; accent?: string;
}) {
    return (
        <div className="rounded-2xl border bg-card p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-2.5">
                {icon && <div className={`flex size-6 items-center justify-center rounded-lg ${accent}`}>{icon}</div>}
                <p className="text-xs font-bold">{label}</p>
            </div>
            <div className="space-y-1.5">
                {rows.map((row, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <select value={row.person_id ?? ''} onChange={e => onChange(rows.map((r,j) => j===i ? { ...r, person_id: e.target.value ? Number(e.target.value) : null } : r))}
                            className={`${selCls} flex-1`}>
                            <option value="">{optionalPerson ? '— Сонгох (заавал биш) —' : '— Сонгох —'}</option>
                            {nurses.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                        </select>
                        <input value={row.time} onChange={e => onChange(rows.map((r,j) => j===i ? { ...r, time: e.target.value } : r))}
                            placeholder="20:00-20:30" className={`${selCls} w-28`} />
                        <button onClick={() => onChange(rows.filter((_,j) => j!==i))} className="p-1 text-red-400 hover:text-red-600"><X className="size-3.5" /></button>
                    </div>
                ))}
            </div>
            <button onClick={() => onChange([...rows, { person_id: null, time: '' }])}
                className="mt-2 flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                <Plus className="size-3" /> Мөр нэмэх
            </button>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Add picker                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
function AddPicker({ kind, employees, scheduledIds, onClose, onPick }: {
    kind: 'doctor' | 'staff' | 'nurse'; employees: Employee[];
    scheduledIds: Set<number>; onClose: () => void; onPick: (e: Employee) => void;
}) {
    const [q, setQ] = useState('');
    const roles = kind === 'doctor' ? new Set(['doctor'])
        : kind === 'nurse' ? RIGHT_ROLES
        : new Set([...LEFT_ROLES, ...RIGHT_ROLES].filter(r => r !== 'doctor'));
    const title = kind === 'doctor' ? 'Эмч нэмэх' : kind === 'nurse' ? 'Сувилагч нэмэх' : 'Ажилтан нэмэх';
    const list = employees
        .filter(e => roles.has(e.role_group) && !scheduledIds.has(e.id))
        .filter(e => !q || e.name.toLowerCase().includes(q.toLowerCase()));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-sm rounded-3xl border bg-card shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-3.5 border-b">
                    <h3 className="font-bold text-sm">{title}</h3>
                    <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
                </div>
                <div className="p-3">
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Хайх..." autoFocus
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <div className="max-h-80 overflow-y-auto space-y-1">
                        {list.map(e => (
                            <button key={e.id} onClick={() => onPick(e)}
                                className="w-full flex items-center justify-between text-left rounded-lg px-3 py-2 hover:bg-muted">
                                <span className="text-sm font-medium">{e.name}</span>
                                {e.position && <span className="text-[11px] text-muted-foreground">{e.position}</span>}
                            </button>
                        ))}
                        {list.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">Олдсонгүй</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Cell editor                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
function CellEditor({ employee, date, weekStart, existing, presetDoctorId, doctors, onClose }: {
    employee: Employee; date: string; weekStart: string; existing: Schedule | null;
    presetDoctorId?: number; doctors: Doctor[]; onClose: () => void;
}) {
    const showAssign = employee.role_group === 'nurse' || employee.role_group === 'assistant';
    const def = shiftDefaults(employee.role_group, 'full');

    const [shift, setShift] = useState(existing?.shift_type ?? 'full');
    const [start, setStart] = useState(existing?.start_time ?? def[0]);
    const [end,   setEnd]   = useState(existing?.end_time ?? def[1]);
    const [docId, setDocId] = useState(existing?.assigned_doctor_id ? String(existing.assigned_doctor_id) : (presetDoctorId ? String(presetDoctorId) : ''));
    const [applyWeek, setApplyWeek] = useState(false);
    const [weekdaysOnly, setWeekdaysOnly] = useState(true);
    const [busy, setBusy] = useState(false);

    const d = parseDate(date);
    const dayLabel = `${DAYS_FULL[(d.getDay()+6)%7]}, ${d.getDate()} ${MONTHS_MN[d.getMonth()]}`;

    function pickShift(v: string) {
        setShift(v);
        if (v !== 'off' && v !== 'custom') { const [a, b] = shiftDefaults(employee.role_group, v); setStart(a); setEnd(b); }
        if (v === 'off') { setStart(''); setEnd(''); }
    }
    const opts = { preserveState: true, preserveScroll: true, only: ['schedules'] as string[],
        onStart: () => setBusy(true), onFinish: () => setBusy(false), onSuccess: onClose };

    function save() {
        const base = {
            employee_id: employee.id, shift_type: shift,
            start_time: shift === 'off' ? null : (start || null),
            end_time: shift === 'off' ? null : (end || null),
            assigned_doctor_id: showAssign && docId ? Number(docId) : null,
            room: null,
        };
        if (applyWeek) router.post('/hr/work-schedules/row-fill', { ...base, week_start: weekStart, weekdays_only: weekdaysOnly }, opts);
        else router.post('/hr/work-schedules', { ...base, date }, opts);
    }
    function clearCell() {
        if (!existing) { onClose(); return; }
        if (!confirm('Энэ өдрийн хуваарийг устгах уу?')) return;
        router.delete(`/hr/work-schedules/${existing.id}`, opts);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-3xl border bg-card shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-slate-50 to-indigo-50/50 dark:from-gray-900 dark:to-indigo-950/30">
                    <div>
                        <h3 className="font-black text-foreground tracking-tight">{employee.name}</h3>
                        <p className="text-xs text-muted-foreground">{employee.position ?? ''} · {dayLabel}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
                </div>

                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ээлж</label>
                        <div className="grid grid-cols-5 gap-1.5">
                            {SHIFTS.map(s => (
                                <button key={s.value} type="button" onClick={() => pickShift(s.value)}
                                    className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                                        shift === s.value ? `${SHIFT_BTN[s.value]} text-white` : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {shift !== 'off' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Эхлэх</label>
                                <input type="time" value={start} onChange={e => setStart(e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Дуусах</label>
                                <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                    )}

                    {showAssign && shift !== 'off' && (
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <Stethoscope className="size-3" /> Хариуцах эмч <span className="opacity-60">(заавал биш)</span>
                            </label>
                            <select value={docId} onChange={e => setDocId(e.target.value)}
                                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="">— Эмч сонгох —</option>
                                {doctors.map(dc => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 cursor-pointer">
                            <input type="checkbox" checked={applyWeek} onChange={e => setApplyWeek(e.target.checked)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            Энэ ээлжийг долоо хоногийн бүх өдөрт тавих
                        </label>
                        {applyWeek && (
                            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pl-6">
                                <input type="checkbox" checked={weekdaysOnly} onChange={e => setWeekdaysOnly(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                Зөвхөн ажлын өдрүүд (Да–Ба)
                            </label>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 px-5 py-4 border-t">
                    <button onClick={save} disabled={busy}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/30 hover:shadow-lg disabled:opacity-50 transition-shadow">
                        {busy ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <CalendarClock className="size-4" />}
                        Хадгалах
                    </button>
                    {existing && (
                        <button onClick={clearCell} disabled={busy}
                            className="rounded-xl border border-red-200 dark:border-red-800 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                            <Trash2 className="size-4" />
                        </button>
                    )}
                    <button onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">Цуцлах</button>
                </div>
            </div>
        </div>
    );
}
