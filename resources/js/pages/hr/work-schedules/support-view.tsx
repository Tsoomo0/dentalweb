import { router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import {
    Building2, CalendarClock, ChevronLeft, ChevronRight, Plus, Trash2, Users, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface SupportBranch { id: number; name: string; abbr: string; }
export interface SupportStaff {
    id: number; name: string; position: string | null; photo_url: string | null;
    branch_id: number | null; group: 'xray' | 'sterile' | 'reception' | 'cleaner' | 'technician';
}
export interface SupportSchedule {
    id: number; employee_id: number; date: string; shift_type: string;
    start_time: string | null; end_time: string | null; note: string | null;
}
export interface RoleAccent {
    grad: string;   // gradient (өдрийн чип, товч)
    hex: string;    // онцлох өнгө
    ring: string;   // өнөөдрийн ring
    soft: string;   // зөөлөн chip (bg + text)
    tile: string;   // landing hero gradient
}

const MONTHS_MN  = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар',
                    '7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];
const DAYS_SHORT = ['Да','Мя','Лх','Пү','Ба','Бя','Ня'];
const DAYS_FULL  = ['Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба','Ням'];

const SHIFT = [
    { value: 'morning',   label: 'Өглөө', btn: 'bg-sky-500' },
    { value: 'afternoon', label: 'Орой',  btn: 'bg-orange-500' },
    { value: 'full',      label: 'Бүтэн', btn: 'bg-emerald-500' },
    { value: 'off',       label: 'Амралт', btn: 'bg-gray-400' },
];
const SHIFT_TAG: Record<string, { label: string; dot: string; cls: string }> = {
    morning:   { label: 'Өгл',  dot: 'bg-sky-500',     cls: 'text-sky-600 dark:text-sky-400' },
    afternoon: { label: 'Орой', dot: 'bg-orange-500',  cls: 'text-orange-600 dark:text-orange-400' },
    full:      { label: 'Бүт',  dot: 'bg-emerald-500', cls: 'text-emerald-600 dark:text-emerald-400' },
    off:       { label: 'Амр',  dot: 'bg-gray-400',    cls: 'text-muted-foreground' },
};
const SHIFT_DEFAULT: Record<string, [string, string]> = {
    morning: ['08:30', '16:30'], afternoon: ['12:30', '20:30'], full: ['08:30', '20:30'], off: ['', ''],
};
const TILE_GRADIENTS = [
    'from-amber-400 to-orange-500', 'from-teal-400 to-emerald-500', 'from-sky-400 to-blue-500',
    'from-violet-400 to-indigo-500', 'from-rose-400 to-pink-500', 'from-cyan-400 to-blue-500',
];

function pad(n: number) { return String(n).padStart(2, '0'); }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function parseDate(s: string) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function isTodayStr(s: string) { return s === toDateStr(new Date()); }

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function RoleWeekView({ roleLabel, roleIcon, accent, staff, schedules, shifts, branches, weekStart, onNavWeek, apiBase = '/hr/support-schedules', lockedBranchId = null }: {
    roleLabel: string; roleIcon: React.ReactNode; accent: RoleAccent;
    staff: SupportStaff[]; schedules: SupportSchedule[]; shifts: Record<string, string>;
    branches: SupportBranch[]; weekStart: string; onNavWeek: (dateStr: string) => void;
    apiBase?: string; lockedBranchId?: number | null;
}) {
    const isLocked = lockedBranchId != null;
    const [branch, setBranch] = useState<number | 'all' | null>(
        isLocked ? lockedBranchId : (branches.length > 0 ? null : 'all'));
    const branchStaff = useMemo(() =>
        staff.filter(e => branch === 'all' || e.branch_id === branch)
             .sort((a, b) => a.name.localeCompare(b.name)),
        [staff, branch]);

    const weekDays = useMemo(() => {
        const start = parseDate(weekStart);
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }, [weekStart]);

    const [selected, setSelected] = useState<string>(() => {
        const t = toDateStr(new Date());
        return weekDays.some(d => toDateStr(d) === t) ? t : toDateStr(weekDays[0]);
    });
    useEffect(() => {
        if (!weekDays.some(d => toDateStr(d) === selected)) {
            const t = toDateStr(new Date());
            setSelected(weekDays.some(d => toDateStr(d) === t) ? t : toDateStr(weekDays[0]));
        }
    }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

    const schedMap = useMemo(() => {
        const m = new Map<string, SupportSchedule>();
        schedules.forEach(s => m.set(`${s.employee_id}|${s.date}`, s));
        return m;
    }, [schedules]);

    const [editor, setEditor] = useState<{ emp: SupportStaff; existing: SupportSchedule | null } | null>(null);

    function navWeek(dir: number) { onNavWeek(toDateStr(addDays(parseDate(weekStart), dir * 7))); }
    const weekLabel = (() => {
        const [a, b] = [weekDays[0], weekDays[6]];
        return a.getMonth() === b.getMonth()
            ? `${MONTHS_MN[a.getMonth()]} ${a.getDate()}–${b.getDate()}`
            : `${MONTHS_MN[a.getMonth()]} ${a.getDate()} – ${MONTHS_MN[b.getMonth()]} ${b.getDate()}`;
    })();

    const dayCount = (ds: string) =>
        branchStaff.filter(e => { const s = schedMap.get(`${e.id}|${ds}`); return s && s.shift_type !== 'off'; }).length;

    const selDate = parseDate(selected);
    const selDow  = (selDate.getDay() + 6) % 7;
    const branchName = branch === 'all' ? 'Бүх салбар' : branches.find(b => b.id === branch)?.name ?? '';

    /* ── Салбар сонгох landing (нягт) ── */
    if (branch === null) {
        return (
            <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 px-5 py-5 shadow-md">
                    <div className="absolute -right-8 -top-10 size-40 rounded-full bg-white/5 blur-2xl" />
                    <div className="relative flex items-center gap-3">
                        <div className={`flex size-11 items-center justify-center rounded-xl ${accent.soft} shadow-sm`}>
                            {roleIcon}
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight text-white leading-none">{roleLabel}</h2>
                            <p className="text-xs text-white/70 mt-1.5">Хуваарь оруулах салбараа сонгоно уу</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {branches.map((b, i) => {
                        const grad = TILE_GRADIENTS[i % TILE_GRADIENTS.length];
                        const cnt = staff.filter(e => e.branch_id === b.id).length;
                        return (
                            <button key={b.id} onClick={() => setBranch(b.id)}
                                className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700/70 bg-card p-3.5 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${grad}`} />
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 shrink-0">
                                        <Building2 className="size-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black tracking-tight truncate">{b.name}</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1"><Users className="size-3" /> {cnt}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                    <button onClick={() => setBranch('all')}
                        className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-card/50 p-3.5 text-left hover:border-gray-400 hover:bg-muted/40 hover:-translate-y-0.5 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground shrink-0">
                                <Building2 className="size-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black tracking-tight truncate">Бүх салбар</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1"><Users className="size-3" /> {staff.length}</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <button onClick={() => !isLocked && setBranch(null)} disabled={isLocked}
                    className={`group flex items-center gap-2 rounded-xl border bg-card pl-1.5 pr-3 py-1.5 shadow-sm transition-colors ${isLocked ? 'cursor-default' : 'hover:bg-muted/50'}`}>
                    <span className={`flex size-7 items-center justify-center rounded-lg ${accent.soft}`}><Building2 className="size-3.5" /></span>
                    <span className="text-left leading-tight">
                        <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-wide">{isLocked ? 'Салбар' : 'Салбар · солих'}</span>
                        <span className="block text-xs font-black">{branchName}</span>
                    </span>
                </button>
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center rounded-xl border bg-card p-0.5 shadow-sm">
                        <button onClick={() => navWeek(-1)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft className="size-4" /></button>
                        <span className="text-xs font-bold px-2.5 min-w-[124px] text-center tabular-nums">{weekLabel}</span>
                        <button onClick={() => navWeek(1)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronRight className="size-4" /></button>
                    </div>
                    <button onClick={() => onNavWeek(toDateStr(new Date()))}
                        className="px-2.5 py-1.5 rounded-xl border bg-card text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors shadow-sm">Өнөөдөр</button>
                </div>
            </div>

            {/* Day tabs — нягт */}
            <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((d, i) => {
                    const ds = toDateStr(d);
                    const isSel = ds === selected;
                    const today = isTodayStr(ds);
                    const wkend = i >= 5;
                    const cnt = dayCount(ds);
                    return (
                        <button key={ds} onClick={() => setSelected(ds)}
                            className={`relative rounded-xl py-1.5 flex flex-col items-center border transition-all duration-150 ${
                                isSel ? `${accent.soft} border-transparent`
                                : `bg-card border-transparent hover:bg-muted/40 ${today ? `ring-1 ${accent.ring}` : ''}`}`}>
                            <span className={`text-[9px] font-bold uppercase tracking-wide ${isSel ? 'opacity-70' : wkend ? 'text-orange-400' : 'text-muted-foreground'}`}>{DAYS_SHORT[i]}</span>
                            <span className={`text-base font-black leading-tight ${isSel ? '' : wkend ? 'text-orange-500/90' : 'text-foreground'}`}>{d.getDate()}</span>
                            <span className="h-1 mt-0.5 flex items-center">
                                {cnt > 0 ? <span className={`text-[8px] font-bold ${isSel ? 'opacity-70' : 'text-muted-foreground'}`}>{cnt}</span> : <span className={`size-1 rounded-full ${isSel ? 'bg-current opacity-40' : 'bg-gray-300 dark:bg-gray-600'}`} />}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Staff panel */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700/70 overflow-hidden bg-card shadow-sm">
                {/* Slim header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/30">
                    <div className="flex items-center gap-2.5">
                        <div className={`flex flex-col items-center justify-center rounded-lg px-2 py-1 ${accent.soft} min-w-[40px]`}>
                            <span className="text-sm font-black leading-none">{selDate.getDate()}</span>
                            <span className="text-[8px] font-medium opacity-70 leading-none mt-0.5">{selDate.getMonth() + 1} сар</span>
                        </div>
                        <div className="leading-tight">
                            <p className="text-sm font-black">{DAYS_FULL[selDow]}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span className={`flex size-3.5 items-center justify-center rounded ${accent.soft}`}>{roleIcon}</span>
                                {roleLabel}
                            </p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-1 rounded-lg px-2 py-1 ${accent.soft}`}>
                        <span className="text-sm font-black leading-none">{dayCount(selected)}</span>
                        <span className="text-[9px] font-bold opacity-80">ажиллах</span>
                    </div>
                </div>

                {/* Staff grid */}
                {branchStaff.length === 0 ? (
                    <p className="px-3 py-8 text-xs text-center text-muted-foreground italic">
                        Энэ салбарт {roleLabel.toLowerCase()} бүртгэгдээгүй байна
                    </p>
                ) : (
                    <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {branchStaff.map(emp => {
                            const s = schedMap.get(`${emp.id}|${selected}`) ?? null;
                            const off = s?.shift_type === 'off';
                            const active = s && !off;
                            const tag = s ? SHIFT_TAG[s.shift_type] : null;
                            const ini = emp.name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                            return (
                                <button key={emp.id} onClick={() => setEditor({ emp, existing: s })}
                                    className={`group text-left rounded-xl border p-1.5 pr-2.5 flex items-center gap-2 transition-all hover:shadow-sm hover:-translate-y-px ${
                                        active ? 'border-gray-200 dark:border-gray-700 bg-card'
                                        : s ? 'border-gray-100 dark:border-gray-800 bg-muted/30'
                                        : 'border-dashed border-gray-200 dark:border-gray-700 bg-transparent'}`}>
                                    <div className="size-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 overflow-hidden"
                                        style={{ background: active ? `${accent.hex}1a` : 'var(--muted)', color: active ? accent.hex : undefined }}>
                                        {emp.photo_url ? <img src={emp.photo_url} alt="" className="size-full object-cover" /> : ini}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-bold truncate text-foreground leading-tight">{emp.name}</p>
                                        {!s ? (
                                            <p className="text-[10px] font-semibold text-muted-foreground/60 mt-0.5 flex items-center gap-0.5 group-hover:text-muted-foreground">
                                                <Plus className="size-2.5" /> Цаг оруулах
                                            </p>
                                        ) : off ? (
                                            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">Амралттай</p>
                                        ) : (
                                            <p className="text-[10px] font-semibold mt-0.5 flex items-center gap-1 tabular-nums">
                                                <span className={`size-1.5 rounded-full shrink-0 ${tag?.dot}`} />
                                                <span className={tag?.cls}>{s.start_time}–{s.end_time}</span>
                                            </p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {editor && (
                <SupportCellEditor emp={editor.emp} date={selected} weekStart={weekStart} existing={editor.existing}
                    shifts={shifts} accent={accent} apiBase={apiBase} onClose={() => setEditor(null)} />
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
function SupportCellEditor({ emp, date, weekStart, existing, shifts, accent, apiBase, onClose }: {
    emp: SupportStaff; date: string; weekStart: string; existing: SupportSchedule | null;
    shifts: Record<string, string>; accent: RoleAccent; apiBase: string; onClose: () => void;
}) {
    const [shift, setShift] = useState(existing?.shift_type ?? 'full');
    const [start, setStart] = useState(existing?.start_time ?? SHIFT_DEFAULT.full[0]);
    const [end,   setEnd]   = useState(existing?.end_time ?? SHIFT_DEFAULT.full[1]);
    const [applyWeek, setApplyWeek] = useState(false);
    const [weekdaysOnly, setWeekdaysOnly] = useState(true);
    const [busy, setBusy] = useState(false);

    const d = parseDate(date);
    const dayLabel = `${DAYS_FULL[(d.getDay()+6)%7]}, ${MONTHS_MN[d.getMonth()]} ${d.getDate()}`;

    const opts = { preserveState: true, preserveScroll: true, only: ['support_schedules'] as string[],
        onStart: () => setBusy(true), onFinish: () => setBusy(false), onSuccess: onClose };

    function pickShift(v: string) {
        setShift(v);
        const [a, b] = SHIFT_DEFAULT[v] ?? ['', ''];
        setStart(a); setEnd(b);
    }
    function save() {
        const off = shift === 'off';
        const base = {
            employee_id: emp.id, shift_type: shift,
            start_time: off ? null : (start || null),
            end_time: off ? null : (end || null),
        };
        if (applyWeek) router.post(`${apiBase}/row-fill`, { ...base, week_start: weekStart, weekdays_only: weekdaysOnly } as Record<string, FormDataConvertible>, opts);
        else router.post(apiBase, { ...base, date } as Record<string, FormDataConvertible>, opts);
    }
    function clearCell() {
        if (!existing) { onClose(); return; }
        if (!confirm('Энэ өдрийн хуваарийг устгах уу?')) return;
        router.delete(`${apiBase}/${existing.id}`, opts);
    }

    const ini = emp.name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-sm rounded-2xl border bg-card shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
                    <div className={`size-9 rounded-xl ${accent.soft} flex items-center justify-center text-xs font-black overflow-hidden shrink-0`}>
                        {emp.photo_url ? <img src={emp.photo_url} alt="" className="size-full object-cover" /> : ini}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-black text-foreground tracking-tight truncate leading-tight">{emp.name}</h3>
                        <p className="text-[11px] text-muted-foreground truncate">{emp.position ?? ''} · {dayLabel}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
                </div>

                <div className="p-4 space-y-3.5">
                    <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Ээлж</label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {SHIFT.filter(s => s.value in shifts).map(s => (
                                <button key={s.value} type="button" onClick={() => pickShift(s.value)}
                                    className={`rounded-lg py-1.5 text-[11px] font-bold transition-colors ${
                                        shift === s.value ? `${s.btn} text-white shadow-sm` : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                                    {shifts[s.value] ?? s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {shift !== 'off' && (
                        <div className="grid grid-cols-2 gap-2.5">
                            <div>
                                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Эхлэх</label>
                                <input type="time" value={start} onChange={e => setStart(e.target.value)}
                                    className="w-full rounded-lg border bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Дуусах</label>
                                <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                                    className="w-full rounded-lg border bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600" />
                            </div>
                        </div>
                    )}

                    <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-muted/30 p-2.5 space-y-1.5">
                        <label className="flex items-center gap-2 text-[13px] font-medium text-foreground cursor-pointer">
                            <input type="checkbox" checked={applyWeek} onChange={e => setApplyWeek(e.target.checked)} className="rounded border-gray-300 size-3.5" />
                            Долоо хоногийн бүх өдөрт тавих
                        </label>
                        {applyWeek && (
                            <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer pl-6">
                                <input type="checkbox" checked={weekdaysOnly} onChange={e => setWeekdaysOnly(e.target.checked)} className="rounded border-gray-300 size-3.5" />
                                Зөвхөн ажлын өдөр (Да–Ба)
                            </label>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 px-4 py-3 border-t">
                    <button onClick={save} disabled={busy}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r ${accent.grad} px-4 py-2 text-sm font-bold text-white shadow-sm hover:shadow-md disabled:opacity-50 transition-shadow`}>
                        {busy ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <CalendarClock className="size-4" />}
                        Хадгалах
                    </button>
                    {existing && (
                        <button onClick={clearCell} disabled={busy}
                            className="rounded-lg border border-red-200 dark:border-red-800 px-2.5 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                            <Trash2 className="size-4" />
                        </button>
                    )}
                    <button onClick={onClose} className="rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Хаах</button>
                </div>
            </div>
        </div>
    );
}
