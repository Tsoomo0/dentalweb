import AppLayout from '@/layouts/app-layout';
import MyLayout from '@/layouts/my-layout';
import { HrGhostButton, HrPanel, HrTabs } from '@/components/hr/page-panel';
import { HR_PANEL_FX } from '@/components/hr/document-status';
import { ToastContainer, showToast } from '@/components/toast';
import CellEditor from '@/components/schedule/cell-editor';
import PatternEditor, { type PatternEmployee } from '@/components/schedule/pattern-editor';
import RequestsPanel, { type AvailabilityItem, type SwapItem } from '@/components/schedule/requests-panel';
import RosterGrid, { type Brush, type RowAction } from '@/components/schedule/roster-grid';
import SetupPanel, { type StaffingRule } from '@/components/schedule/setup-panel';
import TasksPanel from '@/components/schedule/tasks-panel';
import {
    MONTHS, addDays, inkOn, mondayOf, paletteOf, parseDS, shiftMinutes, todayDS,
    type Board, type BoardEmployee, type BoardShift, type Branch, type DayInput, type DoctorOption,
    type Position, type ShiftInput, type Template,
} from '@/components/schedule/types';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle, ArrowLeftRight, CalendarClock, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Copy,
    Eraser, Keyboard, Loader2, MousePointer2, Printer, Repeat, RotateCcw, Send, Settings2, Undo2, Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Tab = 'board' | 'requests' | 'tasks' | 'setup';

interface PageProps {
    portal: 'hr' | 'my';
    route_base: string;
    locked_branch_id: number | null;
    view: 'week' | 'month';
    date: string;
    branch: number | null;
    tab: Tab;
    board: Board;
    templates: Template[];
    branches: Branch[];
    doctors: DoctorOption[];
    positions: Position[];
    reception_tasks: Record<string, string>;
    nurse_tasks: Record<string, string>;
    // HR
    swaps?: SwapItem[];
    availability?: AvailabilityItem[];
    all_templates?: Template[];
    staffing_rules?: StaffingRule[];
    pattern_employees?: PatternEmployee[];
    settings?: Record<string, number>;
    // My
    manager_name?: string;
    manager_position?: string | null;
    [key: string]: unknown;
}

let tempId = -1;

export default function ScheduleIndex() {
    const props = usePage<PageProps>().props;
    const { portal, route_base: base, locked_branch_id: lockedBranch, view, templates, branches, doctors, positions } = props;
    const isHr = portal === 'hr';
    const Layout = isHr ? AppLayout : MyLayout;

    const [board, setBoard] = useState<Board>(props.board);
    const [tab, setTab] = useState<Tab>(props.tab ?? 'board');
    const [brush, setBrush] = useState<Brush>(null);
    const [editor, setEditor] = useState<{ employee: BoardEmployee; date: string } | null>(null);
    const [patternFor, setPatternFor] = useState<PatternEmployee | null>(null);
    const [pending, setPending] = useState(0);
    const [showConflicts, setShowConflicts] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const undoStack = useRef<DayInput[][]>([]);
    const queue = useRef<Promise<unknown>>(Promise.resolve());

    useEffect(() => { setBoard(props.board); undoStack.current = []; }, [props.board]);

    const palette = useMemo(() => paletteOf(templates), [templates]);
    const tplMap = useMemo(() => new Map(templates.map(t => [t.id, t])), [templates]);
    const empMap = useMemo(() => new Map(board.employees.map(e => [e.id, e])), [board.employees]);
    const branchParam = board.branch_id ?? 'all';
    const params = { branch: branchParam, view, date: board.period.start };

    /* ── Навигаци ── */
    const nav = (next: Partial<{ branch: number | 'all'; view: 'week' | 'month'; date: string }>) => {
        router.get(base, { ...params, ...next }, {
            preserveState: true, preserveScroll: true, replace: true,
            only: ['board', 'view', 'date', 'branch'],
        });
    };
    const shiftPeriod = (dir: number) => {
        if (view === 'week') nav({ date: addDays(board.period.start, dir * 7) });
        else {
            const d = parseDS(board.period.start);
            d.setMonth(d.getMonth() + dir);
            nav({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` });
        }
    };

    /* ── Сервер рүү (дараалалтай) ── */
    const send = useCallback((path: string, body: Record<string, unknown>, opts: { optimistic?: Board; quiet?: boolean } = {}) => {
        const before = board;
        if (opts.optimistic) setBoard(opts.optimistic);
        setPending(n => n + 1);
        queue.current = queue.current.then(() => axios.post(`${base}/${path}`, { ...params, ...body })
            .then(r => {
                setBoard(r.data.board);
                if (r.data.message && !opts.quiet) showToast('success', r.data.message);
            })
            .catch(e => {
                setBoard(before);
                const msg = e.response?.data?.message ?? 'Хадгалж чадсангүй. Дахин оролдоно уу.';
                showToast('error', e.response?.status === 403 ? 'Энэ ажилтны хуваарийг гаргах эрхгүй байна.' : msg);
            })
            .finally(() => setPending(n => n - 1)));
    }, [base, board, params.branch, params.view, params.date]); // eslint-disable-line react-hooks/exhaustive-deps

    /** Нүднүүдийг солих — шууд дэлгэцэнд тусгаад (optimistic) сервер рүү илгээнэ. */
    const applyDays = useCallback((days: DayInput[], recordUndo = true) => {
        if (!days.length) return;
        const keys = new Set(days.map(d => `${d.employee_id}|${d.date}`));

        if (recordUndo) {
            const prev = days.map(d => ({
                employee_id: d.employee_id, date: d.date,
                shifts: board.shifts.filter(s => s.employee_id === d.employee_id && s.date === d.date && s.state !== 'removed').map(toInput),
            }));
            undoStack.current = [...undoStack.current.slice(-19), prev];
        }

        const provisional: BoardShift[] = days.flatMap(d => d.shifts.map(s => {
            const t = s.template_id ? tplMap.get(s.template_id) : undefined;
            const kind = t?.kind ?? s.kind ?? 'work';
            const start = s.start_time !== undefined ? s.start_time : t?.start_time ?? null;
            const end = s.end_time !== undefined ? s.end_time : t?.end_time ?? null;
            return {
                id: tempId--, employee_id: d.employee_id, date: d.date, branch_id: kind === 'off' ? null : s.branch_id ?? null,
                template_id: s.template_id ?? null, kind, start_time: kind === 'off' ? null : start, end_time: kind === 'off' ? null : end,
                break_minutes: s.break_minutes ?? t?.break_minutes ?? 0,
                minutes: kind === 'off' ? 0 : shiftMinutes(start, end, s.break_minutes ?? t?.break_minutes ?? 0),
                assigned_doctor_id: s.assigned_doctor_id ?? null, room: s.room ?? null, note: s.note ?? null,
                state: 'new' as const, was: null,
            };
        }));

        send('days', { days }, {
            optimistic: { ...board, shifts: [...board.shifts.filter(s => !keys.has(`${s.employee_id}|${s.date}`)), ...provisional] },
            quiet: true,
        });
    }, [board, send, tplMap]);

    const undo = useCallback(() => {
        const last = undoStack.current.pop();
        if (last) applyDays(last, false);
        else showToast('info', 'Буцаах үйлдэл алга.');
    }, [applyDays]);

    /* ── Хэрэгслийн мөрийн үйлдлүүд ── */
    const generate = () => {
        if (!confirm('Хэв маягаар хоосон өдрүүдийг бөглөх үү?\nАль хэдийн хуваарьтай болон чөлөөтэй өдөр хөндөгдөхгүй.')) return;
        send('generate', { overwrite: false });
    };
    const copyWeek = () => {
        const source = view === 'week' ? addDays(board.period.start, -7) : mondayOf(board.period.start);
        const msg = view === 'week'
            ? 'Өмнөх 7 хоногийн хуваарийг энэ 7 хоногийн ХООСОН өдрүүдэд хуулах уу?'
            : 'Сарын эхний 7 хоногийн хуваарийг сарын бусад ХООСОН өдрүүдэд гарагаар нь давтах уу?';
        if (confirm(msg)) send('copy', { source_monday: source, overwrite: false });
    };
    const publish = () => {
        if (!board.draft_count) { showToast('info', 'Нийтлэх өөрчлөлт алга.'); return; }
        const errors = board.conflicts.filter(c => c.level === 'error').length;
        if (errors && !confirm(`${errors} алдаа байна (давхцал, чөлөөтэй өдөр гэх мэт). Тэгсэн ч нийтлэх үү?`)) return;
        send('publish', {});
    };
    const discard = () => {
        if (board.draft_count && confirm(`Нийтлээгүй ${board.draft_count} өөрчлөлтийг цуцалж, нийтлэгдсэн хувилбарт буцаах уу?`)) send('discard', {});
    };
    const print = () => window.open(`${base}/print?${new URLSearchParams({ branch: String(branchParam), view, date: board.period.start })}`, '_blank');

    const onRowAction = (emp: BoardEmployee, action: RowAction) => {
        if (action === 'generate') send('generate', { employee_ids: [emp.id], overwrite: false });
        if (action === 'clear') {
            if (!confirm(`${emp.short_name}-ийн энэ хугацааны хуваарийг цэвэрлэх үү?`)) return;
            applyDays(board.period.days.map(date => ({ employee_id: emp.id, date, shifts: [] })));
        }
        if (action === 'pattern') {
            const pe = props.pattern_employees?.find(p => p.id === emp.id);
            if (pe) setPatternFor(pe);
        }
        if (action === 'pattern-from-week') {
            router.post(`/hr/schedule/patterns/${emp.id}/from-week`, { monday: board.period.start }, { preserveScroll: true, preserveState: true });
        }
    };

    /* ── Гарын товчоор бийр сонгох (хүснэгтэд фокусгүй үед ч) ── */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setBrush(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const periodLabel = (() => {
        const a = parseDS(board.period.start), b = parseDS(board.period.end);
        if (view === 'month') return `${a.getFullYear()} · ${MONTHS[a.getMonth()]}`;
        return a.getMonth() === b.getMonth()
            ? `${MONTHS[a.getMonth()]} ${a.getDate()}–${b.getDate()}`
            : `${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}`;
    })();
    const branchName = board.branch_id ? branches.find(b => b.id === board.branch_id)?.name : 'Бүх салбар';
    const errorCount = board.conflicts.filter(c => c.level === 'error').length;
    const warnCount = board.conflicts.length - errorCount;
    const pendingSwaps = (props.swaps ?? []).filter(s => s.status === 'pending_approval').length;

    const tabs = [
        { key: 'board', label: 'Хуваарь', Icon: CalendarDays },
        ...(isHr ? [{ key: 'requests', label: 'Хүсэлт', Icon: ArrowLeftRight, value: pendingSwaps || undefined }] : []),
        { key: 'tasks', label: 'Өдрийн хийх зүйлс', Icon: ClipboardList },
        ...(isHr ? [{ key: 'setup', label: 'Загвар ба дүрэм', Icon: Settings2 }] : []),
    ];

    return (
        <Layout breadcrumbs={isHr
            ? [{ title: 'HR', href: '/hr/dashboard' }, { title: 'Ажлын хуваарь', href: base }]
            : [{ title: 'Хуваарь гаргах', href: base }]}>
            <Head title="Ажлын хуваарь" />
            <div className={isHr ? 'space-y-3 p-4 md:p-5' : 'space-y-3 p-3 pb-28 sm:p-4 md:p-6 max-md:flex-1 max-md:overflow-y-auto'}>
                <HrPanel tone="indigo" icon={CalendarDays}
                    title={isHr ? 'Ажлын хуваарь' : 'Хуваарь гаргах'}
                    badge={branchName}
                    steps={isHr ? ['Загвар', 'Хэв маягаар бөглөх', 'Засах', 'Нийтлэх → ажилтанд мэдэгдэл', 'Ирцтэй харьцуулна'] : undefined}
                    subtitle={!isHr ? `${props.manager_name ?? ''}${props.manager_position ? ` · ${props.manager_position}` : ''}` : undefined}
                    actions={tab === 'board' ? (
                        <>
                            <div className="flex h-9 items-center gap-0.5 rounded-xl border border-border/70 bg-background/70 px-1 shadow-sm backdrop-blur">
                                <button type="button" onClick={() => shiftPeriod(-1)} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><ChevronLeft className="size-3.5" /></button>
                                <span className="min-w-[128px] px-1 text-center text-xs font-bold tabular-nums">{periodLabel}</span>
                                <button type="button" onClick={() => shiftPeriod(1)} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><ChevronRight className="size-3.5" /></button>
                            </div>
                            <HrGhostButton icon={CalendarClock} onClick={() => nav({ date: todayDS() })}>Өнөөдөр</HrGhostButton>
                            <div className="flex h-9 items-center rounded-xl border border-border/70 bg-background/70 p-0.5 shadow-sm">
                                {(['week', 'month'] as const).map(v => (
                                    <button key={v} type="button" onClick={() => nav({ view: v })}
                                        className={`h-full rounded-lg px-2.5 text-xs font-semibold ${view === v ? 'bg-indigo-600 text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}>
                                        {v === 'week' ? '7 хоног' : 'Сар'}
                                    </button>
                                ))}
                            </div>
                            <HrGhostButton icon={Printer} onClick={print} title="A4 хэвлэх">Хэвлэх</HrGhostButton>
                        </>
                    ) : undefined}
                    tabs={<HrTabs tone="indigo" active={tab} onChange={k => setTab(k as Tab)} items={tabs} />}
                    filters={tab === 'board' && lockedBranch === null ? (
                        <select value={String(branchParam)} onChange={e => nav({ branch: e.target.value === 'all' ? 'all' : Number(e.target.value) })}
                            className="h-8 rounded-lg border border-border/70 bg-background/70 px-2 text-xs font-semibold">
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            <option value="all">Бүх салбар</option>
                        </select>
                    ) : undefined}
                />

                {tab === 'board' && (
                    <>
                        {/* ── Хэрэгслийн мөр ── */}
                        <div className="sticky top-0 z-30 flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/70 bg-card/95 px-2.5 py-2 shadow-sm backdrop-blur">
                            <button type="button" onClick={() => setBrush(null)} title="Сонгох горим (Esc)"
                                className={`flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold ${!brush ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'}`}>
                                <MousePointer2 className="size-3.5" /> Сонгох
                            </button>
                            <span className="mx-0.5 h-6 w-px bg-border" />
                            <span className="hidden text-[11px] font-semibold text-muted-foreground lg:inline">Бийр:</span>
                            {palette.map((t, i) => {
                                const active = brush !== null && brush !== 'erase' && brush.id === t.id;
                                return (
                                    <button key={t.id} type="button" onClick={() => setBrush(active ? null : t)}
                                        title={`${t.name}${t.start_time ? ` ${t.start_time}–${t.end_time}` : ''} · товч: ${t.code.length === 1 ? t.code : ''}${i < 9 ? ` / ${i + 1}` : ''}`}
                                        className={`flex h-8 items-center gap-1 rounded-lg border px-1.5 text-[11px] font-semibold transition ${active ? 'ring-2 ring-indigo-500 ring-offset-1' : 'hover:bg-muted'}`}>
                                        <b className="flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-black" style={{ background: t.color, color: inkOn(t.color) }}>{t.code}</b>
                                        <span className="hidden 2xl:inline">{t.name}</span>
                                    </button>
                                );
                            })}
                            <button type="button" onClick={() => setBrush(brush === 'erase' ? null : 'erase')} title="Арчих бийр"
                                className={`flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold ${brush === 'erase' ? 'ring-2 ring-rose-500 ring-offset-1 text-rose-600' : 'text-muted-foreground hover:bg-muted'}`}>
                                <Eraser className="size-3.5" />
                            </button>
                            <span className="mx-0.5 h-6 w-px bg-border" />
                            <ToolButton icon={Wand2} onClick={generate} title="Ажилтнуудын давтагдах хэв маягаар хоосон өдрүүдийг бөглөх">Хэв маягаар бөглөх</ToolButton>
                            <ToolButton icon={Copy} onClick={copyWeek} title={view === 'week' ? 'Өмнөх 7 хоногоос хуулах' : 'Эхний 7 хоногийг сар даяар давтах'}>
                                {view === 'week' ? 'Өмнөх 7 хоног' : '1-р 7 хоногийг давтах'}
                            </ToolButton>
                            <ToolButton icon={Undo2} onClick={undo} title="Буцаах (Ctrl+Z)" />
                            <ToolButton icon={Keyboard} onClick={() => setShowHelp(s => !s)} title="Товчлол" />

                            <div className="ml-auto flex items-center gap-1.5">
                                {pending > 0 && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                                {board.conflicts.length > 0 && (
                                    <div className="relative">
                                        <button type="button" onClick={() => setShowConflicts(s => !s)}
                                            className={`flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-bold ${errorCount ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
                                            <AlertTriangle className="size-3.5" /> {errorCount ? `${errorCount} алдаа` : ''}{errorCount && warnCount ? ' · ' : ''}{warnCount ? `${warnCount} анхааруулга` : ''}
                                        </button>
                                        {showConflicts && (
                                            <div className="absolute right-0 top-9 z-50 max-h-80 w-80 overflow-y-auto rounded-xl border bg-popover p-1 shadow-xl">
                                                {board.conflicts.map((c, i) => {
                                                    const emp = empMap.get(c.employee_id);
                                                    return (
                                                        <button key={i} type="button"
                                                            onClick={() => { if (emp) setEditor({ employee: emp, date: c.date }); setShowConflicts(false); }}
                                                            className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] hover:bg-muted">
                                                            <span className={`mt-1 size-1.5 shrink-0 rounded-full ${c.level === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                                            <span><b>{emp?.short_name}</b> · {c.date.slice(5).replace('-', '/')}<br /><span className="text-muted-foreground">{c.message}</span></span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {board.draft_count > 0 && (
                                    <button type="button" onClick={discard} title="Нийтлээгүй өөрчлөлтийг цуцлах"
                                        className="flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted">
                                        <RotateCcw className="size-3.5" /> <span className="hidden sm:inline">Цуцлах</span>
                                    </button>
                                )}
                                <button type="button" onClick={publish} disabled={!board.draft_count}
                                    className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-600 px-3 text-[11px] font-bold text-white shadow-md ring-1 ring-inset ring-white/20 hover:brightness-110 disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none">
                                    <Send className="size-3.5" /> Нийтлэх{board.draft_count ? ` (${board.draft_count})` : ''}
                                </button>
                            </div>
                        </div>

                        {showHelp && <ShortcutHelp palette={palette} />}

                        {brush && (
                            <p className="rounded-xl bg-indigo-500/10 px-3 py-1.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                                {brush === 'erase' ? 'Арчих бийр' : `"${brush.name}" бийр`} идэвхтэй — нүднүүд дээр дарж эсвэл чирж будна. Болих: Esc.
                            </p>
                        )}

                        <RosterGrid board={board} templates={templates} branches={branches} doctors={doctors} view={view}
                            brush={brush} canSetup={isHr}
                            onApply={days => applyDays(days)} onUndo={undo}
                            onEdit={(employee, date) => setEditor({ employee, date })}
                            onRowAction={onRowAction} onBrushReset={() => setBrush(null)} />

                        <Legend />
                    </>
                )}

                {tab === 'requests' && isHr && (
                    <RequestsPanel swaps={props.swaps ?? []} availability={props.availability ?? []} branches={branches} />
                )}
                {tab === 'tasks' && (
                    <TasksPanel routeBase={base} branches={branches} branchId={board.branch_id ?? lockedBranch}
                        receptionTasks={props.reception_tasks} nurseTasks={props.nurse_tasks} />
                )}
                {tab === 'setup' && isHr && (
                    <SetupPanel templates={props.all_templates ?? templates} branches={branches} positions={positions}
                        employees={props.pattern_employees ?? []} rules={props.staffing_rules ?? []} settings={props.settings ?? {}} />
                )}
            </div>

            {editor && (
                <CellEditor employee={editor.employee} date={editor.date} board={board} templates={templates}
                    branches={branches} doctors={doctors} lockedBranchId={lockedBranch}
                    onSave={day => { applyDays([day]); setEditor(null); }} onClose={() => setEditor(null)} />
            )}
            {patternFor && (
                <PatternEditor employee={patternFor} templates={templates} branches={branches} onClose={() => setPatternFor(null)} />
            )}

            <ToastContainer />
            <style>{HR_PANEL_FX}</style>
        </Layout>
    );
}

function toInput(s: BoardShift): ShiftInput {
    return {
        template_id: s.template_id, kind: s.kind, branch_id: s.branch_id, start_time: s.start_time, end_time: s.end_time,
        break_minutes: s.break_minutes, assigned_doctor_id: s.assigned_doctor_id, room: s.room, note: s.note,
    };
}

function ToolButton({ icon: Icon, children, onClick, title }: {
    icon: React.ElementType; children?: React.ReactNode; onClick: () => void; title?: string;
}) {
    return (
        <button type="button" onClick={onClick} title={title}
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <Icon className="size-3.5" />{children && <span className="hidden md:inline">{children}</span>}
        </button>
    );
}

function ShortcutHelp({ palette }: { palette: Template[] }) {
    const rows: [string, string][] = [
        ['Дарах / чирэх', 'Нүд сонгох (тэгш өнцөгт)'],
        ['Бийр + дарах/чирэх', 'Сонгосон загвараар будах'],
        ['← ↑ → ↓ (Shift)', 'Шилжих (сонголт тэлэх)'],
        [palette.filter(t => t.code.length === 1).map(t => t.code).join(' ') + ' / 1–9', 'Сонгосон нүдэнд загвар тавих'],
        ['Delete', 'Цэвэрлэх'],
        ['Enter / давхар товшилт', 'Дэлгэрэнгүй засах (тусгай цаг, 2 салбар, эмч)'],
        ['Ctrl+C / Ctrl+V', 'Хуулах / буулгах'],
        ['Ctrl+Z', 'Буцаах'],
        ['Огнооны толгой дарах', 'Тэр өдрийг бүхэлд нь сонгох'],
    ];
    return (
        <div className="grid grid-cols-1 gap-x-6 gap-y-1 rounded-2xl border bg-card px-4 py-3 text-[11px] shadow-sm sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(([k, v]) => (
                <p key={k}><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">{k}</kbd> <span className="text-muted-foreground">{v}</span></p>
            ))}
        </div>
    );
}

function Legend() {
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded border-l-[3px] border-indigo-500 bg-indigo-500/15" />Нийтлэгдсэн</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded border-[1.5px] border-dashed border-indigo-500" />Ноорог (нийтлээгүй)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded" style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(139,92,246,0.35) 0 3px, transparent 3px 6px)' }} />Чөлөө / ээлжийн амралт</span>
            <span className="flex items-center gap-1.5"><span className="rounded bg-amber-500/20 px-1 text-[9px] font-bold text-amber-700">Хор</span>Өөр салбарт</span>
            <span className="flex items-center gap-1.5"><AlertTriangle className="size-3 text-amber-500" />Анхааруулга</span>
            <span className="flex items-center gap-1.5"><Repeat className="size-3 text-indigo-400" />Хэв маягтай</span>
        </div>
    );
}
