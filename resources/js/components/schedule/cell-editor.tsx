import { AlertTriangle, Ban, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    DOW_FULL, MONTHS, dowIndex, fmtHours, inkOn, parseDS, shiftMinutes, templatesFor,
    type Board, type BoardEmployee, type Branch, type DayInput, type DoctorOption, type ShiftInput, type Template,
} from './types';

/**
 * Нэг ажилтны нэг өдрийг дэлгэрэнгүй засах: олон ээлж (өөр салбарт ч), тусгай цаг,
 * цайны цаг, хамт ажиллах эмч, өрөө, тэмдэглэл.
 */
interface Row extends ShiftInput { _key: string; custom: boolean; }

let seq = 0;
const newKey = () => `r${++seq}`;

export default function CellEditor({ employee, date, board, templates, branches, doctors, lockedBranchId, onSave, onClose }: {
    employee: BoardEmployee; date: string; board: Board; templates: Template[]; branches: Branch[];
    doctors: DoctorOption[]; lockedBranchId: number | null;
    onSave: (day: DayInput) => void; onClose: () => void;
}) {
    const defaultBranch = lockedBranchId ?? board.branch_id ?? employee.branch_id;
    const options = useMemo(
        () => templatesFor(templates, employee.position_id, defaultBranch),
        [templates, employee.position_id, defaultBranch],
    );
    const tplMap = useMemo(() => new Map(templates.map(t => [t.id, t])), [templates]);

    const existing = board.shifts.filter(s => s.employee_id === employee.id && s.date === date && s.state !== 'removed');
    const [rows, setRows] = useState<Row[]>(() => existing.map(s => {
        const t = s.template_id ? tplMap.get(s.template_id) : undefined;
        return {
            _key: newKey(), id: s.id, template_id: s.template_id, kind: s.kind, branch_id: s.branch_id,
            start_time: s.start_time, end_time: s.end_time, break_minutes: s.break_minutes,
            assigned_doctor_id: s.assigned_doctor_id, room: s.room, note: s.note,
            custom: !t || t.start_time !== s.start_time || t.end_time !== s.end_time,
        };
    }));

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const leave = board.leaves.find(l => l.employee_id === employee.id && l.date === date);
    const unavailable = board.unavailable.find(u => u.employee_id === employee.id && u.date === date);
    const conflicts = board.conflicts.filter(c => c.employee_id === employee.id && c.date === date);
    const changed = existing.filter(s => s.state === 'changed' && s.was);

    const update = (k: string, patch: Partial<Row>) => setRows(rs => rs.map(r => r._key === k ? { ...r, ...patch } : r));

    const pickTemplate = (k: string, value: string) => {
        if (value === 'custom') { update(k, { template_id: null, kind: 'work', custom: true }); return; }
        const t = tplMap.get(Number(value));
        if (!t) return;
        update(k, {
            template_id: t.id, kind: t.kind, custom: false,
            start_time: t.start_time, end_time: t.end_time, break_minutes: t.break_minutes,
            ...(t.kind === 'off' ? { branch_id: null, assigned_doctor_id: null, room: null } : {}),
        });
    };

    const addRow = () => {
        const first = options.find(t => t.kind === 'work');
        setRows(rs => [...rs, {
            _key: newKey(), template_id: first?.id ?? null, kind: 'work', branch_id: defaultBranch,
            start_time: first?.start_time ?? '09:00', end_time: first?.end_time ?? '18:00',
            break_minutes: first?.break_minutes ?? 0, custom: !first,
        }]);
    };

    const save = () => {
        onSave({
            employee_id: employee.id, date,
            shifts: rows.map(r => {
                const off = r.kind === 'off';
                return {
                    id: r.id ?? undefined, template_id: r.template_id ?? null, kind: off ? 'off' : 'work',
                    branch_id: off ? null : (r.branch_id ?? defaultBranch),
                    start_time: off ? null : (r.start_time || null), end_time: off ? null : (r.end_time || null),
                    break_minutes: off ? 0 : Number(r.break_minutes ?? 0),
                    assigned_doctor_id: off ? null : (r.assigned_doctor_id ?? null),
                    room: off ? null : (r.room || null), note: r.note || null,
                };
            }),
        });
    };

    const d = parseDS(date);
    const total = rows.filter(r => r.kind !== 'off').reduce((a, r) => a + shiftMinutes(r.start_time, r.end_time, Number(r.break_minutes ?? 0)), 0);
    const field = 'h-8 w-full rounded-lg border border-border bg-background px-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';
    const sortedDoctors = [...doctors].filter(x => x.id !== employee.id)
        .sort((a, b) => Number(b.branch_id === defaultBranch) - Number(a.branch_id === defaultBranch) || a.name.localeCompare(b.name));

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
            <div onMouseDown={e => e.stopPropagation()}
                className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
                <header className="flex items-center gap-3 border-b bg-gradient-to-br from-indigo-50 via-card to-violet-50/60 px-5 py-3.5 dark:from-indigo-950/40 dark:to-violet-950/20">
                    <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
                        <span className="text-[9px] font-bold uppercase leading-none opacity-80">{DOW_FULL[dowIndex(date)].slice(0, 2)}</span>
                        <span className="text-base font-black leading-none">{d.getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{employee.name}</p>
                        <p className="text-[11px] text-muted-foreground">{MONTHS[d.getMonth()]}ын {d.getDate()}, {DOW_FULL[dowIndex(date)]} · {employee.position ?? '—'}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"><X className="size-4" /></button>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                    {(leave || unavailable || conflicts.length > 0 || changed.length > 0) && (
                        <div className="space-y-1.5">
                            {leave && (
                                <p className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-700 dark:text-violet-300">
                                    {leave.label}{leave.status === 'pending' ? ' — хүсэлт хүлээгдэж байна' : ' — батлагдсан'}
                                </p>
                            )}
                            {unavailable && (
                                <p className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-300">
                                    <Ban className="size-3.5" /> Ажилтан боломжгүй гэж тэмдэглэсэн{unavailable.note ? `: ${unavailable.note}` : ''}
                                </p>
                            )}
                            {conflicts.map((c, i) => (
                                <p key={i} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${c.level === 'error' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
                                    <AlertTriangle className="size-3.5 shrink-0" /> {c.message}
                                </p>
                            ))}
                            {changed.map(s => (
                                <p key={s.id} className="rounded-lg bg-indigo-500/10 px-3 py-2 text-xs text-indigo-700 dark:text-indigo-300">Нийтлэгдсэн хувилбар: {s.was}</p>
                            ))}
                        </div>
                    )}

                    {rows.length === 0 && (
                        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">Энэ өдөр хуваарь алга.</p>
                    )}

                    {rows.map((r, i) => {
                        const t = r.template_id ? tplMap.get(r.template_id) : undefined;
                        const off = r.kind === 'off';
                        return (
                            <div key={r._key} className="rounded-xl border border-border/70 bg-background/60 p-3"
                                style={{ borderLeft: `4px solid ${t?.color ?? (off ? '#94a3b8' : '#6366f1')}` }}>
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{rows.length > 1 ? `${i + 1}-р ээлж` : 'Ээлж'}</span>
                                    {!off && <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">· {fmtHours(shiftMinutes(r.start_time, r.end_time, Number(r.break_minutes ?? 0)))}</span>}
                                    <button type="button" onClick={() => setRows(rs => rs.filter(x => x._key !== r._key))}
                                        className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600" title="Ээлжийг хасах">
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>

                                {/* Загвар — товчоор */}
                                <div className="mb-2 flex flex-wrap gap-1">
                                    {options.map(o => (
                                        <button key={o.id} type="button" onClick={() => pickTemplate(r._key, String(o.id))}
                                            title={o.start_time ? `${o.name} ${o.start_time}–${o.end_time}` : o.name}
                                            className={`flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition ${r.template_id === o.id && !r.custom ? 'ring-2 ring-offset-1 ring-indigo-500' : 'hover:bg-muted'}`}>
                                            <b className="rounded px-1 text-[10px]" style={{ background: o.color, color: inkOn(o.color) }}>{o.code}</b>{o.name}
                                        </button>
                                    ))}
                                    <button type="button" onClick={() => pickTemplate(r._key, 'custom')}
                                        className={`h-7 rounded-lg border px-2 text-[11px] font-semibold ${r.custom && !off ? 'ring-2 ring-offset-1 ring-indigo-500' : 'hover:bg-muted'}`}>Тусгай цаг</button>
                                </div>

                                {!off && (
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        <label className="text-[10px] font-semibold text-muted-foreground">Эхлэх
                                            <input type="time" className={field} value={r.start_time ?? ''}
                                                onChange={e => update(r._key, { start_time: e.target.value, custom: true })} />
                                        </label>
                                        <label className="text-[10px] font-semibold text-muted-foreground">Дуусах
                                            <input type="time" className={field} value={r.end_time ?? ''}
                                                onChange={e => update(r._key, { end_time: e.target.value, custom: true })} />
                                        </label>
                                        <label className="text-[10px] font-semibold text-muted-foreground">Цайны цаг (мин)
                                            <input type="number" min={0} max={600} step={15} className={field} value={r.break_minutes ?? 0}
                                                onChange={e => update(r._key, { break_minutes: Number(e.target.value) })} />
                                        </label>
                                        <label className="text-[10px] font-semibold text-muted-foreground">Салбар
                                            <select className={field} disabled={lockedBranchId !== null} value={r.branch_id ?? defaultBranch ?? ''}
                                                onChange={e => update(r._key, { branch_id: e.target.value ? Number(e.target.value) : null })}>
                                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </label>
                                        {!employee.is_doctor && (
                                            <label className="col-span-2 text-[10px] font-semibold text-muted-foreground">Хамт ажиллах эмч
                                                <select className={field} value={r.assigned_doctor_id ?? ''}
                                                    onChange={e => update(r._key, { assigned_doctor_id: e.target.value ? Number(e.target.value) : null })}>
                                                    <option value="">—</option>
                                                    {sortedDoctors.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                                                </select>
                                            </label>
                                        )}
                                        <label className={`${employee.is_doctor ? 'col-span-2' : 'col-span-2'} text-[10px] font-semibold text-muted-foreground`}>Өрөө / кресло
                                            <input className={field} maxLength={50} value={r.room ?? ''} placeholder="Жишээ: 3"
                                                onChange={e => update(r._key, { room: e.target.value })} />
                                        </label>
                                    </div>
                                )}
                                <label className="mt-2 block text-[10px] font-semibold text-muted-foreground">Тэмдэглэл
                                    <input className={field} maxLength={500} value={r.note ?? ''} onChange={e => update(r._key, { note: e.target.value })} />
                                </label>
                            </div>
                        );
                    })}

                    {rows.length < 4 && (
                        <button type="button" onClick={addRow}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-300 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/30">
                            <Plus className="size-3.5" /> {rows.length ? 'Өөр ээлж нэмэх (жишээ нь өөр салбарт)' : 'Ээлж нэмэх'}
                        </button>
                    )}
                </div>

                <footer className="flex items-center gap-2 border-t bg-muted/20 px-5 py-3">
                    <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">Нийт: {fmtHours(total)}</span>
                    <button type="button" onClick={onClose} className="ml-auto h-9 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted">Болих</button>
                    <button type="button" onClick={save}
                        className="h-9 rounded-lg bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 text-sm font-semibold text-white shadow-md ring-1 ring-inset ring-white/20 hover:brightness-110">
                        Хадгалах
                    </button>
                </footer>
            </div>
        </div>
    );
}
