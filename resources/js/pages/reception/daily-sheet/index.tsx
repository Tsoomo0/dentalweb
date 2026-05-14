import ReceptionLayout from '@/layouts/reception-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { AlertCircle, Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Cloud, CloudOff, Plus, Search, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Doctor    { id: number; name: string }
interface Treatment { id: number; title: string }
interface AuthUser  { id: number; name: string }

interface Entry {
    id?: number;
    is_mine: boolean;
    source?: string | null;
    receptionist_name: string | null;
    patient_name: string;
    gender: string;
    diagnosis: string;
    appointment_number: string;
    discount: number;
    mobile_amount: number;
    card_amount: number;
    cash_amount: number;
    storepay_amount: number;
    total_amount: number;
    outstanding_amount: number;
    outstanding_paid_at?: string | null;
    doctor_id: number | null;
    doctor_name?: string | null;
}

interface Sheet {
    id: number;
    date: string;
    is_confirmed: boolean;
    submitted_at: string | null;
    receptionist: string | null;
    entries: Entry[];
}

interface OutstandingEntry {
    id: number;
    patient_name: string | null;
    diagnosis: string | null;
    outstanding_amount: number;
    date: string;
    receptionist_name: string | null;
    doctor_name: string | null;
    days_since: number;
    is_mine: boolean;
}

interface Props {
    sheet: Sheet | null;
    date: string;
    doctors: Doctor[];
    treatments: Treatment[];
    auth_user: AuthUser;
    outstanding_entries: OutstandingEntry[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар', href: '/reception/dashboard' },
    { title: 'Өдрийн тооцоо', href: '/reception/daily-sheet' },
];
const MONTHS_MN = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const DAY_LABELS = ['Да','Мя','Лх','Пү','Ба','Бя','Ня'];

function blank(authUser: AuthUser): Entry {
    return {
        is_mine: true, receptionist_name: authUser.name,
        patient_name: '', gender: '', diagnosis: '', appointment_number: '',
        discount: 0, mobile_amount: 0, card_amount: 0, cash_amount: 0,
        storepay_amount: 0, total_amount: 0, outstanding_amount: 0, doctor_id: null,
    };
}
function calcTotal(e: Pick<Entry,'mobile_amount'|'card_amount'|'cash_amount'|'storepay_amount'>): number {
    return e.mobile_amount + e.card_amount + e.cash_amount + e.storepay_amount;
}
function parseNum(s: string) {
    const v = parseInt(s.replace(/[^0-9]/g, ''), 10);
    return isNaN(v) ? 0 : v;
}
function fmt(n: number) { return n > 0 ? n.toLocaleString() : ''; }
function getDaysInMonth(year: number, month: number) { return new Date(year, month, 0).getDate(); }

function formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function matchesSearch(e: Entry, q: string): boolean {
    if (!q) return true;
    const lq = q.toLowerCase();
    return [e.patient_name, e.diagnosis, e.appointment_number, e.doctor_name, e.receptionist_name]
        .some(v => v?.toLowerCase().includes(lq));
}

function shortDoctorName(name: string | null | undefined): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    return parts[0][0] + '.' + parts.slice(1).join(' ');
}

/* ------------------------------------------------------------------ */
/*  DatePicker                                                          */
/* ------------------------------------------------------------------ */
function DatePicker({ value, onChange }: { value: string; onChange: (d: string) => void }) {
    const [open, setOpen] = useState(false);
    const [vm, setVm] = useState<{ y: number; m: number }>(() => {
        const [y, m] = value.split('-').map(Number);
        return { y, m };
    });
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const [y, m] = value.split('-').map(Number);
        setVm({ y, m });
    }, [value]);

    useEffect(() => {
        if (!open) return;
        const fn = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, [open]);

    const prevMonth = () => setVm(v => v.m === 1  ? { y: v.y - 1, m: 12 } : { ...v, m: v.m - 1 });
    const nextMonth = () => setVm(v => v.m === 12 ? { y: v.y + 1, m: 1  } : { ...v, m: v.m + 1 });

    const days   = getDaysInMonth(vm.y, vm.m);
    const offset = (new Date(vm.y, vm.m - 1, 1).getDay() + 6) % 7; // Monday-first
    const todayStr = formatDate(new Date());

    const selectDay = (d: number) => {
        onChange(`${vm.y}-${String(vm.m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
        setOpen(false);
    };

    const dObj = new Date(value + 'T00:00:00');
    const label = `${dObj.getFullYear()} оны ${MONTHS_MN[dObj.getMonth()]}-р сарын ${dObj.getDate()}`;

    return (
        <div ref={wrapRef} className="relative">
            <button onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-semibold text-gray-800 dark:text-gray-200">
                <Calendar className="size-4 text-gray-500 dark:text-gray-400" />
                <span>{label}</span>
                <ChevronDown className={`size-3.5 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1.5 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 w-62 select-none">
                    {/* Month nav */}
                    <div className="flex items-center justify-between mb-2">
                        <button onClick={prevMonth}
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
                            <ChevronLeft className="size-4" />
                        </button>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {vm.y} · {MONTHS_MN[vm.m - 1]}-р сар
                        </span>
                        <button onClick={nextMonth}
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
                            <ChevronRight className="size-4" />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-0.5">
                        {DAY_LABELS.map(d => (
                            <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
                        ))}
                    </div>

                    {/* Day grid */}
                    <div className="grid grid-cols-7 gap-0.5">
                        {Array.from({ length: offset }).map((_, i) => <div key={`x${i}`} />)}
                        {Array.from({ length: days }, (_, i) => i + 1).map(d => {
                            const ds = `${vm.y}-${String(vm.m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                            const isSel   = ds === value;
                            const isToday = ds === todayStr;
                            return (
                                <button key={d} onClick={() => selectDay(d)}
                                    className={[
                                        'text-xs py-1.5 rounded-lg font-medium transition-colors',
                                        isSel
                                            ? 'bg-blue-600 text-white'
                                            : isToday
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-1 ring-blue-300 dark:ring-blue-600'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                                    ].join(' ')}>
                                    {d}
                                </button>
                            );
                        })}
                    </div>

                    {/* Today shortcut */}
                    <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-2">
                        <button onClick={() => { onChange(todayStr); setOpen(false); }}
                            className="w-full text-xs text-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-0.5">
                            Өнөөдөр
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Numeric cell                                                        */
/* ------------------------------------------------------------------ */
function NumCell({ value, onChange, readOnly, cls }: {
    value: number; onChange?: (v: number) => void;
    readOnly?: boolean; cls?: string;
}) {
    const [raw, setRaw] = useState(value > 0 ? String(value) : '');
    const live = useRef(false);
    useEffect(() => { if (!live.current) setRaw(value > 0 ? String(value) : ''); }, [value]);

    const base = 'w-full h-8 text-right text-xs px-1.5 tabular-nums text-gray-900 dark:text-gray-100';
    if (readOnly) return (
        <div className={`${base} flex items-center justify-end ${cls ?? ''}`}>
            {value > 0 ? value.toLocaleString() : ''}
        </div>
    );
    return (
        <input type="text" inputMode="numeric" value={raw}
            onFocus={e => { live.current = true; e.target.select(); }}
            onBlur={() => {
                live.current = false;
                const n = parseNum(raw);
                setRaw(n > 0 ? String(n) : '');
                onChange?.(n);
            }}
            onChange={e => setRaw(e.target.value)}
            className={`${base} bg-transparent outline-none focus:bg-blue-50 dark:focus:bg-blue-900/30`}
        />
    );
}

/* ------------------------------------------------------------------ */
/*  Text cell                                                           */
/* ------------------------------------------------------------------ */
function TextCell({ value, onChange, readOnly, center, list }: {
    value: string; onChange?: (v: string) => void;
    readOnly?: boolean; center?: boolean; list?: string;
}) {
    const base = 'w-full h-8 text-xs px-1.5 bg-transparent outline-none text-gray-900 dark:text-gray-100';
    if (readOnly) return (
        <div className={`${base} flex items-center ${center ? 'justify-center' : ''} text-gray-700 dark:text-gray-300 overflow-hidden`}>
            <span className="truncate">{value}</span>
        </div>
    );
    return (
        <input type="text" value={value} list={list}
            onChange={e => onChange?.(e.target.value)}
            className={`${base} focus:bg-blue-50 dark:focus:bg-blue-900/30 ${center ? 'text-center' : ''}`}
        />
    );
}

/* ------------------------------------------------------------------ */
/*  Row                                                                 */
/* ------------------------------------------------------------------ */
function Row({
    entry, rowNum, editIdx, doctors, authUser, isConfirmed,
    isLast, onChange, onRemove, onTabLast, onSaveNow,
}: {
    entry: Entry; rowNum: number; editIdx: number; doctors: Doctor[]; authUser: AuthUser;
    isConfirmed: boolean; isLast: boolean;
    onChange?: (merged: Entry) => void;
    onRemove?: () => void;
    onTabLast?: () => void;
    onSaveNow?: () => void;
}) {
    const editable = entry.is_mine && !isConfirmed;
    const B   = 'border border-gray-200 dark:border-gray-700 overflow-hidden';
    const row = editIdx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/40';

    const upd = (patch: Partial<Entry>) => {
        if (!onChange) return;
        const merged = { ...entry, ...patch };
        merged.total_amount = calcTotal(merged);
        onChange(merged);
    };

    const lastCellTabProps = (isLast && editable && onTabLast)
        ? { onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); onTabLast(); } } }
        : {};

    return (
        <tr className={row}>
            <td className={`${B} text-center text-gray-400`}>
                <div className="h-8 flex items-center justify-center text-xs">{rowNum}</div>
            </td>
            <td className={`${B} p-0`}>
                <TextCell value={entry.patient_name} readOnly={!editable}
                    onChange={v => upd({ patient_name: v })} />
            </td>
            <td className={`${B} p-0`}>
                {!editable
                    ? <div className="h-8 flex items-center justify-center text-xs text-gray-700 dark:text-gray-300">{entry.gender}</div>
                    : <select value={entry.gender}
                        onChange={e => upd({ gender: e.target.value })}
                        className="w-full h-8 text-xs text-center bg-transparent text-gray-900 dark:text-gray-100 outline-none focus:bg-blue-50 dark:focus:bg-blue-900/30 dark:bg-gray-800 [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-900 dark:[&>option]:text-gray-100 cursor-pointer">
                        <option value="">—</option>
                        <option value="Эр">Эр</option>
                        <option value="Эм">Эм</option>
                      </select>
                }
            </td>
            <td className={`${B} p-0`}>
                <TextCell value={entry.diagnosis} readOnly={!editable}
                    list={editable ? 'treatments-list' : undefined}
                    onChange={v => upd({ diagnosis: v })} />
            </td>
            <td className={`${B} p-0`}>
                <TextCell value={entry.appointment_number} center readOnly={!editable}
                    onChange={v => upd({ appointment_number: v })} />
            </td>
            <td className={`${B} p-0`}>
                <NumCell value={entry.discount} readOnly={!editable} cls="text-gray-500"
                    onChange={v => upd({ discount: v })} />
            </td>
            <td className={`${B} p-0`}>
                <NumCell value={entry.mobile_amount} readOnly={!editable}
                    onChange={v => upd({ mobile_amount: v })} />
            </td>
            <td className={`${B} p-0`}>
                <NumCell value={entry.card_amount} readOnly={!editable}
                    onChange={v => upd({ card_amount: v })} />
            </td>
            <td className={`${B} p-0`}>
                <NumCell value={entry.cash_amount} readOnly={!editable}
                    onChange={v => upd({ cash_amount: v })} />
            </td>
            <td className={`${B} p-0`}>
                <NumCell value={entry.storepay_amount} readOnly={!editable}
                    onChange={v => upd({ storepay_amount: v })} />
            </td>
            <td className={`${B} p-0 bg-blue-50/40 dark:bg-blue-900/10`}>
                <NumCell value={entry.total_amount} readOnly cls="text-blue-700 dark:text-blue-400 font-semibold" />
            </td>
            <td className={`${B} p-0 ${entry.outstanding_paid_at ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-yellow-50/50 dark:bg-yellow-900/10'}`}>
                {entry.outstanding_paid_at ? (
                    <div className="w-full h-8 flex items-center justify-end px-1.5 text-xs tabular-nums text-green-600 dark:text-green-400 font-semibold line-through opacity-60">
                        {entry.outstanding_amount > 0 ? entry.outstanding_amount.toLocaleString() : ''}
                    </div>
                ) : (
                    <NumCell value={entry.outstanding_amount} readOnly={!editable}
                        cls="text-yellow-700 dark:text-yellow-400 font-semibold"
                        onChange={v => upd({ outstanding_amount: v })} />
                )}
            </td>
            <td className={`${B} p-0`}>
                {!editable
                    ? <div className="h-8 flex items-center px-1.5 text-xs text-gray-700 dark:text-gray-300 overflow-hidden">
                        <span className="truncate">{shortDoctorName(entry.doctor_name ?? doctors.find(d => d.id === entry.doctor_id)?.name)}</span>
                      </div>
                    : <select value={entry.doctor_id ?? ''}
                        onChange={e => {
                            upd({ doctor_id: e.target.value ? +e.target.value : null });
                            onSaveNow?.();
                        }}
                        className="w-full h-8 text-xs px-1 bg-transparent text-gray-900 dark:text-gray-100 outline-none focus:bg-blue-50 dark:focus:bg-blue-900/30 dark:bg-gray-800 [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-900 dark:[&>option]:text-gray-100 cursor-pointer">
                        <option value="">—</option>
                        {doctors.map(d => <option key={d.id} value={d.id}>{shortDoctorName(d.name)}</option>)}
                      </select>
                }
            </td>
            <td className={`${B} p-0`} {...(isLast ? lastCellTabProps : {})}>
                <div className="h-8 flex items-center px-1.5 text-xs text-gray-400 overflow-hidden">
                    <span className="truncate">{entry.receptionist_name ?? authUser.name}</span>
                </div>
            </td>
            <td className={`${B} p-0 text-center`}>
                {editable && onRemove && (
                    <button onClick={onRemove}
                        className="w-full h-8 flex items-center justify-center text-gray-300 hover:text-red-400">
                        <Trash2 className="size-3" />
                    </button>
                )}
            </td>
        </tr>
    );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */
export default function DailySheetIndex({ sheet, date, doctors, treatments, auth_user, outstanding_entries }: Props) {
    usePage<any>().props;
    const isConfirmed = sheet?.is_confirmed ?? false;

    const [myRows, setMyRows] = useState<Entry[]>(() => {
        const saved = sheet?.entries.filter(e => e.is_mine && !e.source) ?? [];
        return saved.length ? saved.map(e => ({ ...e })) : [blank(auth_user)];
    });

    const otherRows: Entry[] = sheet?.entries.filter(e => !e.is_mine && !e.source) ?? [];
    const sourceRows: Entry[] = sheet?.entries.filter(e => !!e.source) ?? [];

    useEffect(() => {
        if (isConfirmed) return;
        const id = setInterval(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router.reload({ only: ['sheet'], preserveState: true } as any);
        }, 3_000);
        return () => clearInterval(id);
    }, [isConfirmed]);

    /* ── Auto-save ── */
    const [saveState, setSaveState] = useState<'idle'|'saving'|'saved'|'error'>('idle');
    const timer            = useRef<ReturnType<typeof setTimeout>|null>(null);
    const firstRender      = useRef(true);
    const pendingImmediate = useRef(false);

    const doSave = useCallback((rows: Entry[]) => {
        if (timer.current) clearTimeout(timer.current);
        setSaveState('saving');
        router.post('/reception/daily-sheet/save',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { date, entries: rows as any },
            {
                preserveScroll: true,
                preserveState:  true,
                onSuccess: () => setSaveState('saved'),
                onError:   () => setSaveState('error'),
            }
        );
    }, [date]);

    useEffect(() => {
        if (firstRender.current) { firstRender.current = false; return; }
        if (isConfirmed) return;
        if (pendingImmediate.current) {
            pendingImmediate.current = false;
            doSave(myRows);
            return;
        }
        setSaveState('saving');
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => doSave(myRows), 1500);
        return () => { if (timer.current) clearTimeout(timer.current); };
    }, [myRows]);

    useEffect(() => {
        if (saveState !== 'saved') return;
        const t = setTimeout(() => setSaveState('idle'), 2000);
        return () => clearTimeout(t);
    }, [saveState]);

    /* ── Date nav ── */
    const gotoDate = (d: string) => router.get('/reception/daily-sheet', { date: d }, { preserveState: false });

    /* ── Row helpers ── */
    const updateRow = useCallback((idx: number, merged: Entry) => {
        setMyRows(prev => { const n=[...prev]; n[idx]=merged; return n; });
    }, []);
    const addRow    = useCallback(() => setMyRows(prev => [...prev, blank(auth_user)]), [auth_user]);
    const removeRow = useCallback((idx: number) => setMyRows(prev =>
        prev.length <= 1 ? [blank(auth_user)] : prev.filter((_, i) => i !== idx)
    ), [auth_user]);
    const triggerImmediateSave = useCallback(() => { pendingImmediate.current = true; }, []);

    /* ── Search ── */
    const [searchQuery, setSearchQuery] = useState('');
    const filteredMyRows    = myRows.map((e, i) => ({ e, i })).filter(({ e }) => matchesSearch(e, searchQuery));
    const filteredOtherRows = otherRows.map((e, i) => ({ e, i })).filter(({ e }) => matchesSearch(e, searchQuery));
    const isSearching = searchQuery.trim().length > 0;

    /* ── Totals (always from full rows, not filtered) ── */
    const allRows = [...myRows, ...otherRows, ...sourceRows];
    const T = {
        discount:    allRows.reduce((s,e)=>s+e.discount,0),
        mobile:      allRows.reduce((s,e)=>s+e.mobile_amount,0),
        card:        allRows.reduce((s,e)=>s+e.card_amount,0),
        cash:        allRows.reduce((s,e)=>s+e.cash_amount,0),
        storepay:    allRows.reduce((s,e)=>s+e.storepay_amount,0),
        total:       allRows.reduce((s,e)=>s+e.total_amount,0),
        outstanding: allRows.reduce((s,e)=>s+e.outstanding_amount,0),
    };
    const filledCount = allRows.filter(e => e.patient_name || e.total_amount > 0).length;

    /* ── Submit ── */
    const [confirming, setConfirming] = useState(false);
    const handleSubmit = () => {
        setConfirming(true);
        router.post('/reception/daily-sheet/submit', { date },
            { onFinish: () => setConfirming(false), preserveScroll: true });
    };

    /* ── 7 хоног хэтэрсэн анхааруулга ── */
    const overdueMyEntries = outstanding_entries.filter(e => e.is_mine && e.days_since >= 7);
    const [showOverdueNotif, setShowOverdueNotif] = useState(false);

    useEffect(() => {
        if (overdueMyEntries.length === 0) return;
        const KEY = `overdue_notif_dismissed_${auth_user.id}`;
        const lastDismissed = localStorage.getItem(KEY);
        const twelveHours = 12 * 60 * 60 * 1000;
        if (!lastDismissed || Date.now() - parseInt(lastDismissed) > twelveHours) {
            setShowOverdueNotif(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const B = 'border border-gray-200 dark:border-gray-700';

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Өдрийн тооцоо" />

            <datalist id="treatments-list">
                {treatments.map(t => <option key={t.id} value={t.title} />)}
            </datalist>

            {/* Overdue notification */}
            {showOverdueNotif && (
                <div className="mx-3 md:mx-5 mt-3 flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg px-4 py-3">
                    <AlertCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1 text-sm text-red-700 dark:text-red-300">
                        <span className="font-semibold">Анхааруулга:</span>{' '}
                        {overdueMyEntries.length} үйлчлүүлэгчийн тооцоо 7 хоногоос дээш хугацаанд хэтэрсэн байна.{' '}
                        <a href="/reception/outstanding" className="underline font-semibold hover:opacity-80">Дутуу тооцоо харах →</a>
                    </div>
                    <button onClick={() => {
                            setShowOverdueNotif(false);
                            localStorage.setItem(`overdue_notif_dismissed_${auth_user.id}`, String(Date.now()));
                        }}
                        className="text-red-400 hover:text-red-600 shrink-0">
                        <X className="size-4" />
                    </button>
                </div>
            )}

            <div className="flex flex-col gap-3 p-3 md:p-5">

                {/* Top bar */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Calendar date picker */}
                    <DatePicker value={date} onChange={gotoDate} />

                    {/* Save / confirmed status */}
                    {isConfirmed ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="size-3.5" /> Баталгаажсан — {sheet?.receptionist}
                        </span>
                    ) : saveState === 'saving' ? (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Cloud className="size-3.5 animate-pulse" /> Хадгалж байна...
                        </span>
                    ) : saveState === 'saved' ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <Cloud className="size-3.5" /> Хадгалагдлаа
                        </span>
                    ) : saveState === 'error' ? (
                        <span className="flex items-center gap-1 text-xs text-red-500">
                            <CloudOff className="size-3.5" /> Алдаа гарлаа
                        </span>
                    ) : null}

                    {/* Search */}
                    <div className="relative ml-auto">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Хайх..."
                            className="h-8 pl-8 pr-3 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600 w-44"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="size-3" />
                            </button>
                        )}
                    </div>

                    {/* Submit */}
                    {!isConfirmed && (
                        <button onClick={handleSubmit} disabled={confirming}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                            <CheckCircle2 className="size-3.5" />
                            {confirming ? 'Баталгаажуулж байна...' : `Баталгаажуулах (${auth_user.name})`}
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed', minWidth: 1060 }}>
                        <colgroup>
                            <col style={{ width: 30 }} />       {/* # */}
                            <col />                              {/* Үйлчлүүлэгч — уян */}
                            <col style={{ width: 50 }} />        {/* Хүйс */}
                            <col />                              {/* Оношилгоо/Эмчилгээ — уян */}
                            <col style={{ width: 96 }} />        {/* Дугаар */}
                            <col style={{ width: 78 }} />        {/* Хөнгөлөлт */}
                            <col style={{ width: 82 }} />        {/* Мобайл */}
                            <col style={{ width: 82 }} />        {/* Карт */}
                            <col style={{ width: 82 }} />        {/* Бэлэн */}
                            <col style={{ width: 82 }} />        {/* Storepay */}
                            <col style={{ width: 90 }} />        {/* Нийт дүн */}
                            <col style={{ width: 74 }} />        {/* Дутуу */}
                            <col style={{ width: 106 }} />       {/* Эмч */}
                            <col style={{ width: 86 }} />        {/* Ресепшн */}
                            <col style={{ width: 30 }} />        {/* Устгах */}
                        </colgroup>
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                <th className="border border-gray-300 dark:border-gray-600 px-1 py-2 text-center">№</th>
                                <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-left" style={{ minWidth: 110 }}>Үйлчлүүлэгч</th>
                                <th className="border border-gray-300 dark:border-gray-600 px-1 py-2 text-center">Хүйс</th>
                                <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-left" style={{ minWidth: 120 }}>Оношилгоо / эмчилгээ</th>
                                <th className="border border-gray-300 dark:border-gray-600 px-1 py-2 text-center">Дугаар</th>
                                <th className="border border-gray-300 dark:border-gray-600 px-1 py-2 text-right">Хөнгөлөлт</th>
                                <th className="border border-gray-300 dark:border-gray-600 px-1 py-2 text-right">Мобайл</th>
                                <th className="border border-gray-300 dark:border-gray-600 px-1 py-2 text-right">Карт</th>
                                <th className="border border-gray-300 dark:border-gray-600 px-1 py-2 text-right">Бэлэн</th>
                                <th className="border border-gray-300 dark:border-gray-600 px-1 py-2 text-right">Storepay</th>
                                <th className="border border-gray-300 dark:border-gray-600 px-1 py-2 text-right bg-blue-50 dark:bg-blue-900/20">Нийт дүн</th>
                                <th className="border border-gray-300 dark:border-gray-600 px-1 py-2 text-right bg-yellow-50 dark:bg-yellow-900/20">Дутуу</th>
                                <th className="border border-gray-300 dark:border-gray-600 px-1 py-2 text-left">Эмч</th>
                                <th className="border border-gray-300 dark:border-gray-600 px-1 py-2 text-left">Ресепшн</th>
                                <th className="border border-gray-300 dark:border-gray-600"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMyRows.map(({ e, i }, displayIdx) => (
                                <Row key={`m${i}`}
                                    entry={e}
                                    rowNum={displayIdx + 1}
                                    editIdx={i}
                                    doctors={doctors}
                                    authUser={auth_user}
                                    isConfirmed={isConfirmed}
                                    isLast={!isSearching && displayIdx === filteredMyRows.length - 1 && filteredOtherRows.length === 0}
                                    onChange={merged => updateRow(i, merged)}
                                    onRemove={() => removeRow(i)}
                                    onTabLast={addRow}
                                    onSaveNow={triggerImmediateSave}
                                />
                            ))}
                            {filteredOtherRows.map(({ e, i }, displayIdx) => (
                                <Row key={`o${i}`}
                                    entry={e}
                                    rowNum={filteredMyRows.length + displayIdx + 1}
                                    editIdx={i}
                                    doctors={doctors}
                                    authUser={auth_user}
                                    isConfirmed={isConfirmed}
                                    isLast={false}
                                />
                            ))}
                            {/* Дутуу тооцоо авсан мөрүүд — read-only, auto-generated */}
                            {sourceRows.map((e, i) => (
                                <Row key={`src${i}`}
                                    entry={{ ...e, is_mine: false }}
                                    rowNum={filteredMyRows.length + filteredOtherRows.length + i + 1}
                                    editIdx={i}
                                    doctors={doctors}
                                    authUser={auth_user}
                                    isConfirmed={true}
                                    isLast={false}
                                />
                            ))}
                            {isSearching && filteredMyRows.length === 0 && filteredOtherRows.length === 0 && (
                                <tr>
                                    <td colSpan={15} className="border border-gray-200 dark:border-gray-700 px-4 py-6 text-center text-gray-400 text-xs">
                                        «{searchQuery}» — тохирох бичлэг олдсонгүй
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-100 dark:bg-gray-800 font-semibold text-xs text-gray-800 dark:text-gray-200">
                                <td colSpan={5} className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-right">
                                    Нийт ({filledCount} бичлэг){isSearching && ` · хайлт: ${filteredMyRows.length + filteredOtherRows.length}`}
                                </td>
                                <td className={`${B} px-1.5 py-2 text-right tabular-nums`}>{fmt(T.discount)}</td>
                                <td className={`${B} px-1.5 py-2 text-right tabular-nums`}>{fmt(T.mobile)}</td>
                                <td className={`${B} px-1.5 py-2 text-right tabular-nums`}>{fmt(T.card)}</td>
                                <td className={`${B} px-1.5 py-2 text-right tabular-nums`}>{fmt(T.cash)}</td>
                                <td className={`${B} px-1.5 py-2 text-right tabular-nums`}>{fmt(T.storepay)}</td>
                                <td className={`${B} px-1.5 py-2 text-right tabular-nums bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300`}>{fmt(T.total)}</td>
                                <td className={`${B} px-1.5 py-2 text-right tabular-nums bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300`}>{fmt(T.outstanding)}</td>
                                <td className={`${B}`} colSpan={3}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Add row */}
                {!isConfirmed && !isSearching && (
                    <button onClick={addRow}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 self-start mt-0.5">
                        <Plus className="size-3.5" /> Мөр нэмэх
                    </button>
                )}

                {/* Summary cards */}
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mt-1">
                    {[
                        { label: 'Мобайл',   value: T.mobile,      color: 'text-gray-700 dark:text-gray-300' },
                        { label: 'Карт',     value: T.card,        color: 'text-gray-700 dark:text-gray-300' },
                        { label: 'Бэлэн',    value: T.cash,        color: 'text-gray-700 dark:text-gray-300' },
                        { label: 'Storepay', value: T.storepay,    color: 'text-gray-700 dark:text-gray-300' },
                        { label: 'Нийт дүн', value: T.total,       color: 'text-blue-700 dark:text-blue-400' },
                        { label: 'Дутуу',    value: T.outstanding, color: 'text-yellow-700 dark:text-yellow-400' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5">
                            <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                            <div className={`text-sm font-bold tabular-nums ${color}`}>{value.toLocaleString()}₮</div>
                        </div>
                    ))}
                </div>

            </div>
        </ReceptionLayout>
    );
}
