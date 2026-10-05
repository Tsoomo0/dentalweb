import {
    AlertTriangle, Ban, ChevronDown, ChevronRight, MoreHorizontal, Repeat, Stethoscope, UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
    DOW_SHORT, dowIndex, fmtHours, initials, inkOn, paletteOf, parseDS, resolveTemplate, todayDS,
    type Board, type BoardEmployee, type BoardShift, type Branch, type Conflict, type DayInput,
    type DoctorOption, type ShiftInput, type Template,
} from './types';

/**
 * Хуваарийн хүснэгт: мөр = ажилтан (албан тушаалаар бүлэглэсэн), багана = өдөр.
 *
 *   • Бийр сонгоод нүднүүд дээр дарж/чирж будна (Excel шиг тэгш өнцөгт).
 *   • Сонгох горимд: сум, Shift+сум, код/тоо товч, Delete, Enter, Ctrl+C/V/Z.
 *   • Давхар товшвол дэлгэрэнгүй засах цонх нээгдэнэ.
 */

export type Brush = Template | 'erase' | null;
export type RowAction = 'pattern' | 'pattern-from-week' | 'generate' | 'clear';

interface Cell { r: number; c: number; }

interface Props {
    board: Board;
    templates: Template[];
    branches: Branch[];
    doctors: DoctorOption[];
    view: 'week' | 'month';
    brush: Brush;
    canSetup: boolean;
    onApply: (days: DayInput[]) => void;
    onUndo: () => void;
    onEdit: (employee: BoardEmployee, date: string) => void;
    onRowAction: (employee: BoardEmployee, action: RowAction) => void;
    onBrushReset: () => void;
}

const key = (emp: number, date: string) => `${emp}|${date}`;

export default function RosterGrid({
    board, templates, branches, doctors, view, brush, canSetup, onApply, onUndo, onEdit, onRowAction, onBrushReset,
}: Props) {
    const days = board.period.days;
    const month = view === 'month';
    const today = todayDS();
    const tplMap = useMemo(() => new Map(templates.map(t => [t.id, t])), [templates]);
    const branchMap = useMemo(() => new Map(branches.map(b => [b.id, b])), [branches]);
    const doctorMap = useMemo(() => new Map(doctors.map(d => [d.id, d])), [doctors]);
    const palette = useMemo(() => paletteOf(templates), [templates]);

    /* ── Индексүүд ── */
    const shiftsByCell = useMemo(() => {
        const m = new Map<string, BoardShift[]>();
        for (const s of board.shifts) {
            const k = key(s.employee_id, s.date);
            const list = m.get(k) ?? [];
            list.push(s);
            m.set(k, list);
        }
        m.forEach(list => list.sort((a, b) => (a.start_time ?? '99').localeCompare(b.start_time ?? '99')));
        return m;
    }, [board.shifts]);
    const leaveByCell = useMemo(() => new Map(board.leaves.map(l => [key(l.employee_id, l.date), l])), [board.leaves]);
    const unavailableByCell = useMemo(() => new Map(board.unavailable.map(u => [key(u.employee_id, u.date), u])), [board.unavailable]);
    const conflictsByCell = useMemo(() => {
        const m = new Map<string, Conflict[]>();
        for (const c of board.conflicts) {
            const k = key(c.employee_id, c.date);
            m.set(k, [...(m.get(k) ?? []), c]);
        }
        return m;
    }, [board.conflicts]);
    const coverageByCell = useMemo(() => new Map(board.coverage.map(c => [`${c.position_id}|${c.date}`, c])), [board.coverage]);
    const patternSet = useMemo(() => new Set(board.patterns), [board.patterns]);
    const weeklyOver = useMemo(() => new Set(board.conflicts.filter(c => c.code === 'weekly').map(c => c.employee_id)), [board.conflicts]);

    /* ── Бүлэг (албан тушаал) ба харагдах мөрүүд ── */
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const sections = useMemo(() => {
        const list: { key: string; label: string; positionId: number | null; employees: BoardEmployee[] }[] = [];
        for (const e of board.employees) {
            const k = e.position_id ? `p${e.position_id}` : 'none';
            let sec = list.find(s => s.key === k);
            if (!sec) {
                sec = { key: k, label: e.position ?? 'Албан тушаалгүй', positionId: e.position_id, employees: [] };
                list.push(sec);
            }
            sec.employees.push(e);
        }
        return list;
    }, [board.employees]);
    const rows = useMemo(() => sections.flatMap(s => collapsed.has(s.key) ? [] : s.employees), [sections, collapsed]);

    /* ── Сонголт ── */
    const [anchor, setAnchor] = useState<Cell | null>(null);
    const [focus, setFocus] = useState<Cell | null>(null);
    const [dragging, setDragging] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);
    const clipboard = useRef<ShiftInput[][][] | null>(null);

    const rect = useMemo(() => {
        if (!anchor || !focus) return null;
        return {
            r1: Math.min(anchor.r, focus.r), r2: Math.max(anchor.r, focus.r),
            c1: Math.min(anchor.c, focus.c), c2: Math.max(anchor.c, focus.c),
        };
    }, [anchor, focus]);
    const inRect = (r: number, c: number) => !!rect && r >= rect.r1 && r <= rect.r2 && c >= rect.c1 && c <= rect.c2;
    const rectSize = rect ? (rect.r2 - rect.r1 + 1) * (rect.c2 - rect.c1 + 1) : 0;

    // Хуудас солигдоход (7 хоног/салбар) сонголтыг цэвэрлэнэ
    useEffect(() => { setAnchor(null); setFocus(null); }, [board.period.start, board.branch_id, view]);

    useEffect(() => {
        const up = () => setDragging(false);
        window.addEventListener('mouseup', up);
        return () => window.removeEventListener('mouseup', up);
    }, []);

    /* ── Нүдэнд хэрэглэх оролт ── */
    const inputFor = useCallback((t: Template, emp: BoardEmployee): ShiftInput => {
        const branchId = board.branch_id ?? emp.branch_id;
        const resolved = resolveTemplate(t, templates, emp.position_id, branchId);
        return resolved.kind === 'off' ? { template_id: resolved.id } : { template_id: resolved.id, branch_id: branchId };
    }, [board.branch_id, templates]);

    const cellsOf = (r: { r1: number; r2: number; c1: number; c2: number }) => {
        const out: { emp: BoardEmployee; date: string }[] = [];
        for (let i = r.r1; i <= r.r2; i++) for (let j = r.c1; j <= r.c2; j++) {
            if (rows[i] && days[j]) out.push({ emp: rows[i], date: days[j] });
        }
        return out;
    };

    /** Олон нүдэнд нэг загвар/арчих — батлагдсан чөлөөтэй нүдийг алгасна (санамсаргүй дарахаас хамгаална). */
    const applyToRect = useCallback((r: { r1: number; r2: number; c1: number; c2: number }, what: Template | 'erase') => {
        const cells = cellsOf(r);
        const multi = cells.length > 1;
        const out: DayInput[] = [];
        for (const { emp, date } of cells) {
            const leave = leaveByCell.get(key(emp.id, date));
            if (multi && what !== 'erase' && leave?.status === 'approved') continue;
            const current = (shiftsByCell.get(key(emp.id, date)) ?? []).filter(s => s.state !== 'removed');
            if (what === 'erase') {
                if (current.length) out.push({ employee_id: emp.id, date, shifts: [] });
                continue;
            }
            out.push({ employee_id: emp.id, date, shifts: [inputFor(what, emp)] });
        }
        if (out.length) onApply(out);
    }, [rows, days, leaveByCell, shiftsByCell, inputFor, onApply]); // eslint-disable-line react-hooks/exhaustive-deps

    const toInput = (s: BoardShift): ShiftInput => ({
        template_id: s.template_id, kind: s.kind, branch_id: s.branch_id, start_time: s.start_time, end_time: s.end_time,
        break_minutes: s.break_minutes, assigned_doctor_id: s.assigned_doctor_id, room: s.room, note: s.note,
    });

    const copySelection = () => {
        if (!rect) return;
        const block: ShiftInput[][][] = [];
        for (let i = rect.r1; i <= rect.r2; i++) {
            const row: ShiftInput[][] = [];
            for (let j = rect.c1; j <= rect.c2; j++) {
                const list = (shiftsByCell.get(key(rows[i].id, days[j])) ?? []).filter(s => s.state !== 'removed');
                row.push(list.map(toInput));
            }
            block.push(row);
        }
        clipboard.current = block;
    };

    const paste = () => {
        const block = clipboard.current;
        if (!block || !rect) return;
        const out: DayInput[] = [];
        const single = block.length === 1 && block[0].length === 1;
        // Ганц нүд хуулсан бол сонгосон бүх нүдийг дүүргэнэ, үгүй бол блокийг сонгосон нүднээс эхлүүлнэ
        const rEnd = single ? rect.r2 : Math.min(rows.length - 1, rect.r1 + block.length - 1);
        const cEnd = single ? rect.c2 : Math.min(days.length - 1, rect.c1 + block[0].length - 1);
        for (let i = rect.r1; i <= rEnd; i++) for (let j = rect.c1; j <= cEnd; j++) {
            const src = single ? block[0][0] : block[i - rect.r1][j - rect.c1];
            out.push({ employee_id: rows[i].id, date: days[j], shifts: src.map(s => ({ ...s, id: undefined })) });
        }
        if (out.length) onApply(out);
    };

    /* ── Гар ── */
    const move = (dr: number, dc: number, extend: boolean) => {
        const cur = focus ?? { r: 0, c: 0 };
        const next = { r: Math.max(0, Math.min(rows.length - 1, cur.r + dr)), c: Math.max(0, Math.min(days.length - 1, cur.c + dc)) };
        setFocus(next);
        if (!extend) setAnchor(next);
        requestAnimationFrame(() => {
            gridRef.current?.querySelector<HTMLElement>(`[data-cell="${next.r}-${next.c}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
    };

    const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (!rows.length) return;
        const target = e.target as HTMLElement;
        if (target.closest('input,select,textarea,button[role="menuitem"]')) return;
        const mod = e.ctrlKey || e.metaKey;

        if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); onUndo(); return; }
        if (e.key === 'Escape') { setAnchor(null); setFocus(null); onBrushReset(); return; }

        const arrows: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
        if (arrows[e.key]) { e.preventDefault(); move(arrows[e.key][0], arrows[e.key][1], e.shiftKey); return; }
        if (e.key === 'Tab') { e.preventDefault(); move(0, e.shiftKey ? -1 : 1, false); return; }
        if (!rect || !focus) return;

        if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelection(); return; }
        if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); paste(); return; }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); applyToRect(rect, 'erase'); return; }
        if (e.key === 'Enter') { e.preventDefault(); onEdit(rows[focus.r], days[focus.c]); return; }
        if (mod || e.altKey || e.key.length !== 1) return;

        // 1–9 → палитрын дараалал; үсэг → яг тэр кодтой загвар
        let t: Template | undefined;
        if (/^[1-9]$/.test(e.key)) t = palette[Number(e.key) - 1];
        else t = palette.find(p => p.code.toLowerCase() === e.key.toLowerCase());
        if (t) {
            e.preventDefault();
            applyToRect(rect, t);
            if (rectSize === 1) move(0, 1, false); // ганц нүд бол дараагийн өдөр рүү шилжинэ
        }
    };

    /* ── Хулгана ── */
    const onCellDown = (r: number, c: number, e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        gridRef.current?.focus({ preventScroll: true });
        if (e.shiftKey && anchor) { setFocus({ r, c }); return; }
        setAnchor({ r, c });
        setFocus({ r, c });
        setDragging(true);
    };
    const onCellEnter = (r: number, c: number) => { if (dragging) setFocus({ r, c }); };
    const onCellUp = () => {
        if (dragging && brush && rect) applyToRect(rect, brush);
        setDragging(false);
    };

    /* ── Өдрийн нийлбэр (харагдаж буй мөрүүдээр) ── */
    const dayTotals = useMemo(() => days.map(d => {
        let people = 0, minutes = 0;
        for (const e of board.employees) {
            const list = (shiftsByCell.get(key(e.id, d)) ?? []).filter(s => s.state !== 'removed' && s.kind === 'work'
                && (board.branch_id === null || s.branch_id === board.branch_id));
            if (list.length) people++;
            minutes += list.reduce((a, s) => a + s.minutes, 0);
        }
        return { people, minutes };
    }), [days, board.employees, board.branch_id, shiftsByCell]);

    // Сарын харагдацад 31 өдөр нэг дэлгэцэнд багтах ёстой — нэрийн баганыг нарийсгана
    const gridCols = month
        ? `minmax(140px,170px) repeat(${days.length}, minmax(28px,1fr)) 52px`
        : `minmax(170px,210px) repeat(${days.length}, minmax(104px,1fr)) 64px`;

    if (board.employees.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
                <UserRound className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm font-semibold">Энэ салбарт ажилтан алга</p>
                <p className="mt-1 text-xs text-muted-foreground">Ажилтны бүртгэлд салбар, албан тушаалыг нь оноосон эсэхийг шалгана уу.</p>
            </div>
        );
    }

    let rowIndex = -1;

    return (
        <div className="relative">
            <div ref={gridRef} tabIndex={0} onKeyDown={onKeyDown} onMouseUp={onCellUp}
                className={`select-none overflow-auto rounded-2xl border border-border/70 bg-card shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 ${brush ? 'cursor-crosshair' : ''}`}
                style={{ maxHeight: 'calc(100vh - 230px)' }}>
                <div className="grid min-w-max" style={{ gridTemplateColumns: gridCols }}>
                    {/* ── Толгой ── */}
                    <div className="sticky left-0 top-0 z-30 flex items-end border-b border-r border-border/70 bg-muted/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                        Ажилтан
                    </div>
                    {days.map((d, j) => {
                        const dow = dowIndex(d);
                        const isToday = d === today;
                        return (
                            <button key={d} type="button"
                                onClick={() => { if (rows.length) { setAnchor({ r: 0, c: j }); setFocus({ r: rows.length - 1, c: j }); gridRef.current?.focus(); } }}
                                title="Энэ өдрийн бүх мөрийг сонгох"
                                className={`sticky top-0 z-20 flex flex-col items-center justify-center border-b border-r border-border/50 py-1.5 backdrop-blur transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/30 ${
                                    isToday ? 'bg-indigo-100/90 dark:bg-indigo-950/70' : dow >= 5 ? 'bg-orange-50/90 dark:bg-orange-950/30' : 'bg-muted/80'}`}>
                                <span className={`text-[9px] font-bold uppercase leading-none ${dow >= 5 ? 'text-orange-500' : 'text-muted-foreground'}`}>{DOW_SHORT[dow]}</span>
                                <span className={`text-sm font-black leading-tight tabular-nums ${isToday ? 'text-indigo-600 dark:text-indigo-300' : ''}`}>{parseDS(d).getDate()}</span>
                                {!month && <span className="text-[9px] font-medium leading-none text-muted-foreground tabular-nums">{dayTotals[j].people} хүн</span>}
                            </button>
                        );
                    })}
                    <div className="sticky right-0 top-0 z-20 flex items-end justify-center border-b border-l border-border/70 bg-muted/80 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                        Цаг
                    </div>

                    {/* ── Бүлэг бүр ── */}
                    {sections.map(sec => {
                        const isCollapsed = collapsed.has(sec.key);
                        return (
                            <SectionRows key={sec.key}>
                                <button type="button"
                                    onClick={() => setCollapsed(s => { const n = new Set(s); if (n.has(sec.key)) n.delete(sec.key); else n.add(sec.key); return n; })}
                                    className="sticky left-0 z-10 flex items-center gap-1.5 border-b border-r border-border/60 bg-slate-50 px-3 py-1.5 text-left text-[11px] font-bold text-foreground dark:bg-slate-900">
                                    {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                    <span className="truncate">{sec.label}</span>
                                    <span className="rounded bg-muted px-1 text-[10px] font-semibold text-muted-foreground">{sec.employees.length}</span>
                                </button>
                                {days.map(d => {
                                    const cov = sec.positionId ? coverageByCell.get(`${sec.positionId}|${d}`) : undefined;
                                    return (
                                        <div key={d} className="flex items-center justify-center border-b border-r border-border/40 bg-slate-50 dark:bg-slate-900">
                                            {cov && (
                                                <span title={`Шаардлага: ${cov.required}, тавигдсан: ${cov.actual}`}
                                                    className={`rounded px-1 text-[10px] font-bold tabular-nums ${cov.actual < cov.required
                                                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                                    {cov.actual}/{cov.required}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                                <div className="sticky right-0 border-b border-l border-border/40 bg-slate-50 dark:bg-slate-900" />

                                {!isCollapsed && sec.employees.map(emp => {
                                    rowIndex++;
                                    const r = rowIndex;
                                    const minutes = board.hours[emp.id] ?? 0;
                                    return (
                                        <SectionRows key={emp.id}>
                                            <RowHeader emp={emp} hasPattern={patternSet.has(emp.id)} canSetup={canSetup} view={view}
                                                homeBranch={emp.branch_id ? branchMap.get(emp.branch_id)?.name : undefined}
                                                onAction={a => onRowAction(emp, a)} />
                                            {days.map((d, c) => (
                                                <GridCell key={d}
                                                    r={r} c={c} month={month}
                                                    shifts={shiftsByCell.get(key(emp.id, d)) ?? []}
                                                    leave={leaveByCell.get(key(emp.id, d))}
                                                    unavailable={unavailableByCell.get(key(emp.id, d))}
                                                    conflicts={conflictsByCell.get(key(emp.id, d))}
                                                    selected={inRect(r, c)} focused={focus?.r === r && focus?.c === c}
                                                    weekend={dowIndex(d) >= 5} isToday={d === today}
                                                    tplMap={tplMap} branchMap={branchMap} doctorMap={doctorMap}
                                                    boardBranch={board.branch_id} homeBranch={emp.branch_id}
                                                    onDown={e => onCellDown(r, c, e)} onEnter={() => onCellEnter(r, c)}
                                                    onDouble={() => onEdit(emp, d)} />
                                            ))}
                                            <div className={`sticky right-0 z-10 flex items-center justify-center border-b border-l border-border/40 bg-card text-[11px] font-bold tabular-nums ${weeklyOver.has(emp.id) ? 'text-rose-600' : 'text-foreground'}`}
                                                title={weeklyOver.has(emp.id) ? '7 хоногийн цагийн хязгаараас хэтэрсэн' : 'Энэ хугацааны ажлын цаг'}>
                                                {fmtHours(minutes)}
                                            </div>
                                        </SectionRows>
                                    );
                                })}
                            </SectionRows>
                        );
                    })}

                    {/* ── Хөл: өдрийн нийлбэр ── */}
                    <div className="sticky bottom-0 left-0 z-30 border-r border-t border-border/70 bg-muted/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                        Нийт ажиллах
                    </div>
                    {dayTotals.map((t, j) => (
                        <div key={days[j]} className="sticky bottom-0 z-20 flex flex-col items-center justify-center border-r border-t border-border/50 bg-muted/90 py-1 backdrop-blur">
                            <span className="text-[11px] font-black tabular-nums">{t.people}</span>
                            {!month && <span className="text-[9px] text-muted-foreground tabular-nums">{fmtHours(t.minutes)}</span>}
                        </div>
                    ))}
                    <div className="sticky bottom-0 right-0 z-30 flex items-center justify-center border-l border-t border-border/70 bg-muted/90 text-[11px] font-black tabular-nums backdrop-blur">
                        {fmtHours(Object.values(board.hours).reduce((a, b) => a + b, 0))}
                    </div>
                </div>
            </div>

            {/* ── Олон нүд сонгосон үеийн самбар ── */}
            {!brush && rect && rectSize > 1 && !dragging && (
                <div className="pointer-events-none sticky bottom-3 z-40 mt-2 flex justify-center">
                    <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-card/95 px-2 py-1.5 shadow-xl backdrop-blur">
                        <span className="px-1.5 text-[11px] font-semibold text-muted-foreground">{rectSize} нүд</span>
                        {palette.slice(0, 9).map(t => (
                            <button key={t.id} type="button" onClick={() => applyToRect(rect, t)} title={t.name}
                                className="flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-[11px] font-black shadow-sm transition hover:scale-105"
                                style={{ background: t.color, color: inkOn(t.color) }}>{t.code}</button>
                        ))}
                        <span className="mx-0.5 h-5 w-px bg-border" />
                        <button type="button" onClick={() => applyToRect(rect, 'erase')} className="h-7 rounded-lg px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-500/10">Цэвэрлэх</button>
                        <button type="button" onClick={copySelection} className="h-7 rounded-lg px-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted">Хуулах</button>
                        {clipboard.current && <button type="button" onClick={paste} className="h-7 rounded-lg px-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted">Буулгах</button>}
                    </div>
                </div>
            )}
        </div>
    );
}

/** CSS grid-д мөрийг шууд хүүхэд болгон задлах (display: contents). */
function SectionRows({ children }: { children: React.ReactNode }) {
    return <div className="contents">{children}</div>;
}

function RowHeader({ emp, hasPattern, canSetup, view, homeBranch, onAction }: {
    emp: BoardEmployee; hasPattern: boolean; canSetup: boolean; view: 'week' | 'month'; homeBranch?: string;
    onAction: (a: RowAction) => void;
}) {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [open]);

    return (
        <div className="group sticky left-0 z-10 flex min-h-[46px] items-center gap-2 border-b border-r border-border/50 bg-card px-2.5 py-1">
            {emp.photo_url
                ? <img src={emp.photo_url} alt="" className="size-7 shrink-0 rounded-full object-cover object-top" />
                : <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-[10px] font-bold text-white">{initials(emp.name)}</span>}
            <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-[12px] font-semibold leading-tight">
                    <span className="truncate">{emp.short_name}</span>
                    {emp.is_doctor && <Stethoscope className="size-3 shrink-0 text-emerald-500" />}
                    {hasPattern && <Repeat className="size-3 shrink-0 text-indigo-400" aria-label="Хэв маягтай" />}
                </p>
                <p className="truncate text-[10px] leading-tight text-muted-foreground">
                    {emp.is_guest ? <span className="font-semibold text-amber-600">Зочин · {homeBranch ?? '—'}</span> : emp.position ?? '—'}
                </p>
            </div>
            {!emp.is_guest && (
                <div className="relative">
                    <button type="button" onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
                        className="flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-muted group-hover:opacity-100 focus:opacity-100"
                        title="Мөрийн үйлдэл">
                        <MoreHorizontal className="size-3.5" />
                    </button>
                    {open && (
                        <div className="absolute left-0 top-7 z-50 w-56 overflow-hidden rounded-xl border bg-popover py-1 text-[12px] shadow-xl">
                            {canSetup && <MenuItem onClick={() => onAction('pattern')}>Хэв маяг тохируулах…</MenuItem>}
                            {canSetup && view === 'week' && <MenuItem onClick={() => onAction('pattern-from-week')}>Энэ 7 хоногийг хэв маяг болгох</MenuItem>}
                            <MenuItem onClick={() => onAction('generate')}>Хэв маягаар бөглөх (энэ мөр)</MenuItem>
                            <MenuItem danger onClick={() => onAction('clear')}>Энэ хугацааны мөрийг цэвэрлэх</MenuItem>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
    return (
        <button type="button" role="menuitem" onClick={onClick}
            className={`block w-full px-3 py-1.5 text-left transition hover:bg-muted ${danger ? 'text-rose-600' : ''}`}>
            {children}
        </button>
    );
}

function GridCell({
    r, c, month, shifts, leave, unavailable, conflicts, selected, focused, weekend, isToday,
    tplMap, branchMap, doctorMap, boardBranch, homeBranch, onDown, onEnter, onDouble,
}: {
    r: number; c: number; month: boolean; shifts: BoardShift[];
    leave?: { label: string; status: string }; unavailable?: { note: string | null }; conflicts?: Conflict[];
    selected: boolean; focused: boolean; weekend: boolean; isToday: boolean;
    tplMap: Map<number, Template>; branchMap: Map<number, Branch>; doctorMap: Map<number, DoctorOption>;
    boardBranch: number | null; homeBranch: number | null;
    onDown: (e: React.MouseEvent) => void; onEnter: () => void; onDouble: () => void;
}) {
    const hasError = conflicts?.some(x => x.level === 'error');
    const approvedLeave = leave?.status === 'approved';
    const title = [
        leave ? `${leave.label}${leave.status === 'pending' ? ' (хүсэлт хүлээгдэж буй)' : ''}` : null,
        unavailable ? `Боломжгүй гэж тэмдэглэсэн${unavailable.note ? `: ${unavailable.note}` : ''}` : null,
        ...(conflicts ?? []).map(x => `⚠ ${x.message}`),
        ...shifts.filter(s => s.was).map(s => `Өмнө: ${s.was}`),
    ].filter(Boolean).join('\n');

    return (
        <div data-cell={`${r}-${c}`} title={title || undefined}
            onMouseDown={onDown} onMouseEnter={onEnter} onDoubleClick={onDouble}
            className={`relative flex min-h-[46px] flex-col justify-center gap-0.5 border-b border-r border-border/40 p-[3px] transition-colors ${
                selected ? 'bg-indigo-500/10' : isToday ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : weekend ? 'bg-orange-50/30 dark:bg-orange-950/10' : ''
            } ${focused ? 'z-[5] outline outline-2 -outline-offset-2 outline-indigo-500' : ''}`}
            style={approvedLeave ? { backgroundImage: 'repeating-linear-gradient(135deg, rgba(139,92,246,0.10) 0 6px, transparent 6px 12px)' } : undefined}>

            {shifts.map(s => (
                <ShiftChip key={s.id} s={s} month={month} tpl={s.template_id ? tplMap.get(s.template_id) : undefined}
                    otherBranch={s.kind === 'work' && s.branch_id !== null && s.branch_id !== (boardBranch ?? homeBranch)
                        ? branchMap.get(s.branch_id)?.abbr : undefined}
                    doctor={!month && s.assigned_doctor_id ? doctorMap.get(s.assigned_doctor_id)?.name : undefined} />
            ))}

            {shifts.length === 0 && leave && (
                <span className={`truncate text-center text-[9px] font-bold ${approvedLeave ? 'text-violet-600 dark:text-violet-400' : 'text-amber-600'}`}>
                    {month ? (approvedLeave ? 'Ч' : '?') : leave.status === 'pending' ? `${leave.label}?` : leave.label}
                </span>
            )}

            {unavailable && (
                <Ban className="absolute left-0.5 top-0.5 size-2.5 text-rose-500" aria-label="Боломжгүй" />
            )}
            {conflicts && conflicts.length > 0 && (
                <AlertTriangle className={`absolute right-0.5 top-0.5 size-2.5 ${hasError ? 'text-rose-600' : 'text-amber-500'}`} />
            )}
        </div>
    );
}

function ShiftChip({ s, month, tpl, otherBranch, doctor }: {
    s: BoardShift; month: boolean; tpl?: Template; otherBranch?: string; doctor?: string;
}) {
    const color = tpl?.color ?? (s.kind === 'work' ? '#6366f1' : '#94a3b8');
    const code = tpl?.code ?? (s.kind === 'work' ? 'Т' : 'А');
    const draft = s.state === 'new' || s.state === 'changed';
    const removed = s.state === 'removed';
    const time = s.start_time && s.end_time ? `${s.start_time}–${s.end_time}` : (tpl?.name ?? '');

    if (month) {
        return (
            <span className={`flex h-[18px] items-center justify-center rounded text-[10px] font-black leading-none ${removed ? 'line-through opacity-40' : ''}`}
                style={draft
                    ? { border: `1.5px dashed ${color}`, color, background: `${color}14` }
                    : { background: color, color: inkOn(color) }}>
                {code}{otherBranch ? <sup className="ml-px text-[7px]">{otherBranch.slice(0, 1)}</sup> : null}
            </span>
        );
    }

    return (
        <span className={`flex min-w-0 flex-col rounded-md px-1 py-[2px] text-[10px] leading-tight shadow-sm ${removed ? 'line-through opacity-40' : ''}`}
            style={draft
                ? { border: `1.5px dashed ${color}`, background: `${color}14`, color: 'inherit' }
                : { background: `${color}26`, borderLeft: `3px solid ${color}` }}>
            <span className="flex min-w-0 items-center gap-1">
                <b className="shrink-0 rounded px-1 text-[10px] font-black" style={{ background: color, color: inkOn(color) }}>{code}</b>
                <span className="min-w-0 flex-1 truncate font-semibold tabular-nums">{time}</span>
                {otherBranch && <span className="shrink-0 rounded bg-amber-500/20 px-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300">{otherBranch}</span>}
                {draft && <span className="size-1.5 shrink-0 rounded-full bg-indigo-500" title={s.state === 'changed' ? `Өөрчилсөн${s.was ? ` (өмнө: ${s.was})` : ''}` : 'Шинэ, нийтлээгүй'} />}
            </span>
            {doctor && <span className="truncate pl-0.5 text-[9px] font-medium text-emerald-700 dark:text-emerald-400">↔ {doctor}</span>}
        </span>
    );
}
