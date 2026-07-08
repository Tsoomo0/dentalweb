import { router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import { Braces, Building2, CalendarRange, ChevronLeft, ChevronRight, Stethoscope, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface OrthoBranch    { id: number; name: string; abbr: string; }
export interface OrthoDoctor     { id: number; name: string; abbr: string; }
export interface OrthoAssistant  { id: number; name: string; position: string | null; photo_url: string | null; }
export interface OrthoSchedule {
    id: number; employee_id: number; date: string; state: string;
    branch_id: number | null; assigned_doctor_id: number | null; note: string | null;
}

const MONTHS_MN = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар',
                   '7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];
const DOW_MN = ['Ня','Да','Мя','Лх','Пү','Ба','Бя'];

const DOC_PALETTE = [
    { bg: '#059669', text: '#fff' }, { bg: '#db2777', text: '#fff' },
    { bg: '#2563eb', text: '#fff' }, { bg: '#d97706', text: '#fff' },
    { bg: '#7c3aed', text: '#fff' }, { bg: '#0d9488', text: '#fff' },
    { bg: '#e11d48', text: '#fff' }, { bg: '#4f46e5', text: '#fff' },
];
const STATE_STYLE: Record<string, { bg: string; text: string; short: string; full: string }> = {
    warehouse: { bg: '#64748b', text: '#fff', short: 'Агуул', full: 'Агуулах' },
    off:       { bg: '#ef4444', text: '#fff', short: 'Амр',   full: 'Амралт' },
    vacation:  { bg: '#3b82f6', text: '#fff', short: 'Ээлж',  full: 'Ээлжийн амралт' },
    holiday:   { bg: '#d97706', text: '#fff', short: 'Баяр',  full: 'Наадам / Баяр' },
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function dateStr(y: number, m: number, d: number) { return `${y}-${pad(m)}-${pad(d)}`; }
function isToday(s: string) { const n = new Date(); return s === dateStr(n.getFullYear(), n.getMonth()+1, n.getDate()); }

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function OrthoView({ assistants, doctors, branches, schedules, states, year, month, onNavMonth, apiBase = '/hr/ortho-schedules', lockedBranchId = null }: {
    assistants: OrthoAssistant[]; doctors: OrthoDoctor[]; branches: OrthoBranch[];
    schedules: OrthoSchedule[]; states: Record<string, string>;
    year: number; month: number; onNavMonth: (y: number, m: number) => void;
    apiBase?: string; lockedBranchId?: number | null;
}) {
    const docColor = useMemo(() => {
        const m = new Map<number, { bg: string; text: string }>();
        doctors.forEach((d, i) => m.set(d.id, DOC_PALETTE[i % DOC_PALETTE.length]));
        return m;
    }, [doctors]);
    const docAbbr = useMemo(() => new Map(doctors.map(d => [d.id, d.abbr])), [doctors]);
    const branchAbbr = useMemo(() => new Map(branches.map(b => [b.id, b.abbr])), [branches]);

    const schedMap = useMemo(() => {
        const m = new Map<string, OrthoSchedule>();
        schedules.forEach(s => m.set(`${s.employee_id}|${s.date}`, s));
        return m;
    }, [schedules]);

    const days = useMemo(() => {
        const count = new Date(year, month, 0).getDate();
        return Array.from({ length: count }, (_, i) => {
            const d = i + 1;
            const dow = new Date(year, month - 1, d).getDay();
            return { d, dow, ds: dateStr(year, month, d) };
        });
    }, [year, month]);

    const [editor, setEditor] = useState<{ emp: OrthoAssistant; ds: string; existing: OrthoSchedule | null; range?: { start: string; end: string; ids: number[] } } | null>(null);

    function navMonth(dir: number) {
        let m = month + dir, y = year;
        if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
        onNavMonth(y, m);
    }

    function cellContent(s: OrthoSchedule) {
        if (s.state === 'work') {
            const col = s.assigned_doctor_id ? docColor.get(s.assigned_doctor_id) : null;
            const bAbbr = s.branch_id ? branchAbbr.get(s.branch_id) ?? '' : '';
            const dAbbr = s.assigned_doctor_id ? docAbbr.get(s.assigned_doctor_id) ?? '' : '';
            return { bg: col?.bg ?? '#9ca3af', top: bAbbr, mainShort: dAbbr || 'Ажил', mainFull: dAbbr || 'Ажиллах' };
        }
        const st = STATE_STYLE[s.state];
        return st ? { bg: st.bg, top: '', mainShort: st.short, mainFull: st.full } : { bg: '#9ca3af', top: '', mainShort: '?', mainFull: '?' };
    }

    /* Дараалсан ижил өдрүүдийг нэг бар болгож нэгтгэх */
    const sigOf = (s: OrthoSchedule) => s.state === 'work' ? `work|${s.branch_id}|${s.assigned_doctor_id}` : s.state;
    type Seg = { kind: 'empty'; ds: string; dow: number } | { kind: 'filled'; ds: string; endDs: string; span: number; schedule: OrthoSchedule; ids: number[] };
    function buildSegments(empId: number): Seg[] {
        const segs: Seg[] = [];
        let i = 0;
        while (i < days.length) {
            const s = schedMap.get(`${empId}|${days[i].ds}`);
            if (!s) { segs.push({ kind: 'empty', ds: days[i].ds, dow: days[i].dow }); i++; continue; }
            const sig = sigOf(s);
            let j = i; const ids: number[] = [];
            while (j < days.length) {
                const sj = schedMap.get(`${empId}|${days[j].ds}`);
                if (sj && sigOf(sj) === sig) { ids.push(sj.id); j++; } else break;
            }
            segs.push({ kind: 'filled', ds: days[i].ds, endDs: days[j-1].ds, span: j - i, schedule: s, ids });
            i = j;
        }
        return segs;
    }

    return (
        <div className="space-y-4">
            {/* Month nav */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 rounded-full border bg-card p-1 shadow-sm">
                    <button onClick={() => navMonth(-1)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft className="size-4" /></button>
                    <span className="text-sm font-bold px-3 min-w-[120px] text-center">{year} · {MONTHS_MN[month-1]}</span>
                    <button onClick={() => navMonth(1)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"><ChevronRight className="size-4" /></button>
                </div>
                <button onClick={() => { const n = new Date(); onNavMonth(n.getFullYear(), n.getMonth()+1); }}
                    className="px-3.5 py-2 rounded-full border bg-card text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors shadow-sm">Энэ сар</button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {doctors.map(d => {
                    const c = docColor.get(d.id)!;
                    return (
                        <span key={d.id} className="flex items-center gap-1.5 text-xs">
                            <span className="size-3 rounded" style={{ background: c.bg }} />
                            <span className="font-bold" style={{ color: c.bg }}>{d.abbr}</span>
                            <span className="text-muted-foreground">= {d.name}</span>
                        </span>
                    );
                })}
                {Object.entries(STATE_STYLE).map(([k, v]) => (
                    <span key={k} className="flex items-center gap-1.5 text-xs">
                        <span className="size-3 rounded" style={{ background: v.bg }} />
                        <span className="text-muted-foreground">{v.short}</span>
                    </span>
                ))}
            </div>

            {/* Grid */}
            {assistants.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground rounded-3xl border border-dashed">
                    Гажиг заслын туслах эмч бүртгэгдээгүй байна. (Албан тушаалд "гажиг" орсон ажилтан)
                </div>
            ) : (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-auto bg-card shadow-sm">
                    <div style={{ display: 'grid', gridTemplateColumns: `180px repeat(${days.length}, minmax(46px, 1fr))`, minWidth: 180 + days.length * 46 }}>
                        <div className="sticky top-0 left-0 z-30 bg-gray-50 dark:bg-gray-900 border-b border-r border-gray-200 dark:border-gray-800 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center">
                            Туслах эмч
                        </div>
                        {days.map(({ d, dow, ds }) => {
                            const today = isToday(ds);
                            const wkend = dow === 0 || dow === 6;
                            return (
                                <div key={ds}
                                    className={`sticky top-0 z-20 border-b border-r last:border-r-0 border-gray-200 dark:border-gray-800 py-1.5 text-center ${
                                        today ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' : 'bg-gray-50 dark:bg-gray-900 ' + (wkend ? 'text-orange-500/80' : 'text-muted-foreground')}`}>
                                    <p className="text-[13px] font-bold leading-none">{d}</p>
                                    <p className="text-[8px] font-medium uppercase mt-0.5 opacity-70">{DOW_MN[dow]}</p>
                                </div>
                            );
                        })}

                        {assistants.map(emp => (
                            <div key={emp.id} className="contents">
                                <div className="sticky left-0 z-10 bg-card border-b border-r border-gray-200 dark:border-gray-800 px-3 py-2 flex items-center gap-2.5">
                                    <div className="size-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300 text-[10px] font-semibold flex items-center justify-center shrink-0 overflow-hidden">
                                        {emp.photo_url ? <img src={emp.photo_url} alt="" className="size-full object-cover" /> : emp.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                                    </div>
                                    <span className="text-[13px] font-medium truncate">{emp.name}</span>
                                </div>
                                {buildSegments(emp.id).map(seg => {
                                    if (seg.kind === 'empty') {
                                        return (
                                            <button key={seg.ds} onClick={() => setEditor({ emp, ds: seg.ds, existing: null })}
                                                className="group border-b border-r last:border-r-0 border-gray-100 dark:border-gray-800/70 min-h-[42px] transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                                <span className="hidden group-hover:flex items-center justify-center h-full w-full text-gray-300 dark:text-gray-600 text-base font-medium">+</span>
                                            </button>
                                        );
                                    }
                                    const c = cellContent(seg.schedule);
                                    return (
                                        <button key={seg.ds} style={{ gridColumn: `span ${seg.span}` }}
                                            onClick={() => setEditor({ emp, ds: seg.ds, existing: seg.schedule, range: { start: seg.ds, end: seg.endDs, ids: seg.ids } })}
                                            className="group border-b border-r last:border-r-0 border-gray-100 dark:border-gray-800/70 min-h-[42px] p-1 flex items-center justify-center transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <span className="w-full h-full rounded-md flex flex-col items-center justify-center px-0.5 py-0.5 overflow-hidden"
                                                style={{ background: `${c.bg}1a`, color: c.bg }}>
                                                {c.top && <span className="text-[8px] font-medium uppercase leading-none opacity-70 truncate max-w-full">{c.top}</span>}
                                                <span className="font-bold leading-tight truncate max-w-full" style={{ fontSize: seg.span > 1 ? 11 : 10 }}>
                                                    {seg.span > 1 ? c.mainFull : c.mainShort}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {editor && (
                <OrthoEditor emp={editor.emp} ds={editor.ds} existing={editor.existing} range={editor.range}
                    doctors={doctors} branches={branches} states={states} apiBase={apiBase} lockedBranchId={lockedBranchId}
                    onClose={() => setEditor(null)} />
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
function OrthoEditor({ emp, ds, existing, range, doctors, branches, states, apiBase, lockedBranchId, onClose }: {
    emp: OrthoAssistant; ds: string; existing: OrthoSchedule | null;
    range?: { start: string; end: string; ids: number[] };
    doctors: OrthoDoctor[]; branches: OrthoBranch[]; states: Record<string, string>;
    apiBase: string; lockedBranchId: number | null; onClose: () => void;
}) {
    const [state, setState]   = useState(existing?.state ?? 'work');
    const [branchId, setBranchId] = useState(existing?.branch_id ? String(existing.branch_id) : (lockedBranchId ? String(lockedBranchId) : ''));
    const [docId, setDocId]   = useState(existing?.assigned_doctor_id ? String(existing.assigned_doctor_id) : '');
    const [endDate, setEndDate] = useState(range && range.end !== range.start ? range.end : '');
    const [allAsst, setAllAsst] = useState(false);
    const [busy, setBusy]     = useState(false);

    const [, m, d] = ds.split('-').map(Number);
    const dayLabel = `${m}-р сарын ${d}`;

    const opts = { preserveState: true, preserveScroll: true, only: ['ortho_schedules'] as string[],
        onStart: () => setBusy(true), onFinish: () => setBusy(false), onSuccess: onClose };

    function save() {
        const useRange = (endDate && endDate !== ds) || allAsst;
        const work = state === 'work';
        if (useRange) {
            router.post(`${apiBase}/range`, {
                employee_id: allAsst ? null : emp.id,
                date: ds, end_date: endDate || ds, state,
                branch_id: work && branchId ? Number(branchId) : null,
                assigned_doctor_id: work && docId ? Number(docId) : null,
                all_assistants: allAsst,
            } as Record<string, FormDataConvertible>, opts);
        } else {
            router.post(apiBase, {
                employee_id: emp.id, date: ds, state,
                branch_id: work && branchId ? Number(branchId) : null,
                assigned_doctor_id: work && docId ? Number(docId) : null,
            } as Record<string, FormDataConvertible>, opts);
        }
    }
    function clearCell() {
        if (!existing) { onClose(); return; }
        if (!confirm('Устгах уу?')) return;
        if (range && range.ids.length > 1) {
            router.post(`${apiBase}/clear-range`,
                { employee_id: emp.id, date: range.start, end_date: range.end } as Record<string, FormDataConvertible>, opts);
        } else {
            router.delete(`${apiBase}/${existing.id}`, opts);
        }
    }

    const STATE_BTN: Record<string, string> = {
        work: 'bg-emerald-600', warehouse: 'bg-slate-500',
        off: 'bg-red-500', vacation: 'bg-blue-600', holiday: 'bg-green-600',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-3xl border bg-card shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-rose-50 to-pink-50/50 dark:from-gray-900 dark:to-rose-950/30">
                    <div>
                        <h3 className="font-black text-foreground tracking-tight">{emp.name}</h3>
                        <p className="text-xs text-muted-foreground">{emp.position ?? ''} · {dayLabel}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Төлөв</label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {Object.entries(states).map(([k, label]) => (
                                <button key={k} type="button" onClick={() => setState(k)}
                                    className={`rounded-lg py-2 text-xs font-semibold transition-colors ${state === k ? `${STATE_BTN[k]} text-white` : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {state === 'work' && (
                        <>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Building2 className="size-3" /> Салбар</label>
                                <select value={branchId} onChange={e => setBranchId(e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
                                    <option value="">— Салбар сонгох —</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Stethoscope className="size-3" /> Хариуцах эмч</label>
                                <select value={docId} onChange={e => setDocId(e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
                                    <option value="">— Эмч сонгох —</option>
                                    {doctors.map(dc => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Хугацаа / Бүх туслах эмч */}
                    <div className="rounded-xl border border-dashed border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 p-3 space-y-2">
                        <label className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5"><CalendarRange className="size-3.5" /> Хугацаагаар оруулах (заавал биш)</label>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-muted-foreground shrink-0">{m}/{d}</span>
                            <span className="text-muted-foreground">—</span>
                            <input type="date" value={endDate} min={ds} onChange={e => setEndDate(e.target.value)}
                                className="flex-1 rounded-lg border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
                        </div>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                            <input type="checkbox" checked={allAsst} onChange={e => setAllAsst(e.target.checked)}
                                className="rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
                            Бүх гажиг заслын туслах эмчид мөрдөх (ж: Наадам)
                        </label>
                    </div>
                </div>

                <div className="flex gap-2 px-5 py-4 border-t">
                    <button onClick={save} disabled={busy}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-500/30 hover:shadow-lg disabled:opacity-50 transition-shadow">
                        {busy ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Braces className="size-4" />}
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
