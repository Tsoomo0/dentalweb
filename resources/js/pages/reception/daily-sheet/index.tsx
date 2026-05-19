import ReceptionLayout from '@/layouts/reception-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { AlertCircle, Calendar, ChevronDown, ChevronLeft, ChevronRight, Cloud, CloudOff, Moon, Plus, Search, Sun, Trash2, Undo2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Doctor     { id: number; name: string }
interface Technician { id: number; name: string }
interface Treatment  { id: number; title: string }
interface AuthUser   { id: number; name: string }

interface Entry {
    id?: number;
    is_mine: boolean;
    source?: string | null;
    receptionist_name: string | null;
    patient_name: string;
    gender: string;
    diagnosis: string;
    appointment_number: string;
    gross_amount: number;
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
    technician_employee_id: number | null;
    technician_name?: string | null;
    supply_orthodontic_brush: number;
    supply_interdental_brush: number;
    supply_dental_floss: number;
    supply_wax: number;
    supply_retainer_case: number;
    supply_removable_app_case: number;
    entry_notes: string;
    is_morning_entry: boolean;
    overpaid_amount: number;
    overpaid_used_at?: string | null;
    refund_amount?: number;
    refunded_at?: string | null;
    refund_method?: string | null;
    refund_reason?: string | null;
    applied_credits?: AppliedCredit[];
}

interface AppliedCredit {
    kind: 'overpaid' | 'outstanding';
    amount: number;
    method: 'mobile' | 'card' | 'cash' | 'storepay' | null;
    from_date: string | null;
    from_name: string | null;
}

interface Sheet {
    id: number;
    date: string;
    is_confirmed: boolean;
    submitted_at: string | null;
    receptionist: string | null;
    morning_confirmed: boolean;
    morning_submitted_at: string | null;
    morning_receptionist: string | null;
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
    technicians: Technician[];
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

const SUPPLY_COLS: { key: keyof Pick<Entry,
    'supply_orthodontic_brush'|'supply_interdental_brush'|'supply_dental_floss'|
    'supply_wax'|'supply_retainer_case'|'supply_removable_app_case'>; label: string }[] = [
    { key: 'supply_orthodontic_brush',  label: 'Гажигийн сойз' },
    { key: 'supply_interdental_brush',  label: 'Завсрын сойз' },
    { key: 'supply_dental_floss',       label: 'Шүдний утас' },
    { key: 'supply_wax',                label: 'Вакс' },
    { key: 'supply_retainer_case',      label: 'Бэхжүүлэгчний сав' },
    { key: 'supply_removable_app_case', label: 'Авагддаг апп сав' },
];

function blank(authUser: AuthUser): Entry {
    return {
        is_mine: true, receptionist_name: authUser.name,
        patient_name: '', gender: '', diagnosis: '', appointment_number: '',
        gross_amount: 0, discount: 0, mobile_amount: 0, card_amount: 0, cash_amount: 0,
        storepay_amount: 0, total_amount: 0, outstanding_amount: 0, doctor_id: null, technician_employee_id: null,
        supply_orthodontic_brush: 0, supply_interdental_brush: 0,
        supply_dental_floss: 0, supply_wax: 0,
        supply_retainer_case: 0, supply_removable_app_case: 0,
        entry_notes: '', is_morning_entry: false, overpaid_amount: 0,
    };
}

function calcTotal(e: Pick<Entry,'gross_amount'|'discount'|'mobile_amount'|'card_amount'|'cash_amount'|'storepay_amount'>): number {
    if (e.gross_amount > 0) {
        return Math.round(e.gross_amount * (1 - (e.discount || 0) / 100));
    }
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
    const offset = (new Date(vm.y, vm.m - 1, 1).getDay() + 6) % 7;
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
                    <div className="flex items-center justify-between mb-2">
                        <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"><ChevronLeft className="size-4" /></button>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{vm.y} · {MONTHS_MN[vm.m - 1]}-р сар</span>
                        <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"><ChevronRight className="size-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 mb-0.5">
                        {DAY_LABELS.map(d => <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                        {Array.from({ length: offset }).map((_, i) => <div key={`x${i}`} />)}
                        {Array.from({ length: days }, (_, i) => i + 1).map(d => {
                            const ds = `${vm.y}-${String(vm.m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                            const isSel = ds === value;
                            const isToday = ds === todayStr;
                            return (
                                <button key={d} onClick={() => selectDay(d)} className={[
                                    'text-xs py-1.5 rounded-lg font-medium transition-colors',
                                    isSel ? 'bg-blue-600 text-white'
                                        : isToday ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-1 ring-blue-300 dark:ring-blue-600'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                                ].join(' ')}>{d}</button>
                            );
                        })}
                    </div>
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
    value: number; onChange?: (v: number) => void; readOnly?: boolean; cls?: string;
}) {
    const [raw, setRaw] = useState(value > 0 ? String(value) : '');
    const live = useRef(false);
    useEffect(() => { if (!live.current) setRaw(value > 0 ? String(value) : ''); }, [value]);
    const base = 'w-full h-8 text-right text-xs px-1.5 tabular-nums text-gray-900 dark:text-gray-100';
    if (readOnly) return <div className={`${base} flex items-center justify-end ${cls ?? ''}`}>{value > 0 ? value.toLocaleString() : ''}</div>;
    return (
        <input type="text" inputMode="numeric" value={raw}
            onFocus={e => { live.current = true; e.target.select(); }}
            onBlur={() => { live.current = false; const n = parseNum(raw); setRaw(n > 0 ? String(n) : ''); onChange?.(n); }}
            onChange={e => setRaw(e.target.value)}
            className={`${base} bg-transparent outline-none focus:bg-blue-50 dark:focus:bg-blue-900/30`}
        />
    );
}

/* ------------------------------------------------------------------ */
/*  Payment cell with optional refund overlay                           */
/* ------------------------------------------------------------------ */
function PayCellWithRefund({ B, value, onChange, readOnly, refundShow, refundLabel }: {
    B: string;
    value: number; onChange?: (v: number) => void; readOnly?: boolean;
    refundShow?: number | null; refundLabel?: string;
}) {
    const show = !!refundShow && refundShow > 0;
    return (
        <td className={`${B} p-0 relative ${show ? 'bg-red-50/40 dark:bg-red-900/15' : ''}`}>
            <NumCell value={value} onChange={onChange} readOnly={readOnly} />
            {show && (
                <div className="px-1.5 pb-1 -mt-0.5 text-right tabular-nums text-[10px] font-bold text-red-600 dark:text-red-400 line-through"
                    title={refundLabel ? `Буцаалт (${refundLabel}): ${refundShow!.toLocaleString()}₮` : `Буцаалт: ${refundShow!.toLocaleString()}₮`}>
                    −{refundShow!.toLocaleString()}
                </div>
            )}
        </td>
    );
}

/* ------------------------------------------------------------------ */
/*  Text cell                                                           */
/* ------------------------------------------------------------------ */
function TextCell({ value, onChange, readOnly, center, list }: {
    value: string; onChange?: (v: string) => void; readOnly?: boolean; center?: boolean; list?: string;
}) {
    const base = 'w-full h-8 text-xs px-1.5 bg-transparent outline-none text-gray-900 dark:text-gray-100';
    if (readOnly) return (
        <div className={`${base} flex items-center ${center ? 'justify-center' : ''} text-gray-700 dark:text-gray-300 overflow-hidden`}>
            <span className="truncate">{value}</span>
        </div>
    );
    return <input type="text" value={value} list={list} onChange={e => onChange?.(e.target.value)} className={`${base} focus:bg-blue-50 dark:focus:bg-blue-900/30 ${center ? 'text-center' : ''}`} />;
}

/* ------------------------------------------------------------------ */
/*  Supply qty cell (narrow, center)                                    */
/* ------------------------------------------------------------------ */
function SupplyCell({ value, onChange, readOnly }: {
    value: number; onChange?: (v: number) => void; readOnly?: boolean;
}) {
    const [raw, setRaw] = useState(value > 0 ? String(value) : '');
    const live = useRef(false);
    useEffect(() => { if (!live.current) setRaw(value > 0 ? String(value) : ''); }, [value]);
    if (readOnly) return (
        <div className="w-full h-8 flex items-center justify-center text-xs tabular-nums text-gray-700 dark:text-gray-300">
            {value > 0 ? value : ''}
        </div>
    );
    return (
        <input type="text" inputMode="numeric" value={raw}
            onFocus={e => { live.current = true; e.target.select(); }}
            onBlur={() => { live.current = false; const n = parseNum(raw); setRaw(n > 0 ? String(n) : ''); onChange?.(n); }}
            onChange={e => setRaw(e.target.value)}
            className="w-full h-8 text-center text-xs tabular-nums bg-transparent outline-none text-gray-800 dark:text-gray-200 focus:bg-blue-50 dark:focus:bg-blue-900/30"
        />
    );
}

/* ------------------------------------------------------------------ */
/*  Doctor / Technician custom select                                   */
/* ------------------------------------------------------------------ */
function DoctorSelect({ value, onChange, doctors, technicians }: {
    value: string;
    onChange: (v: string) => void;
    doctors: Doctor[];
    technicians: Technician[];
}) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, minWidth: 176 });
    const btnRef  = useRef<HTMLButtonElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);

    const handleOpen = () => {
        if (!open && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, minWidth: Math.max(r.width, 176) });
        }
        setOpen(v => !v);
    };

    useEffect(() => {
        if (!open) return;
        const fn = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!btnRef.current?.contains(t) && !dropRef.current?.contains(t)) setOpen(false);
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, [open]);

    const displayName = value.startsWith('d:')
        ? shortDoctorName(doctors.find(d => `d:${d.id}` === value)?.name)
        : value.startsWith('t:')
            ? (technicians.find(t => `t:${t.id}` === value)?.name ?? '')
            : '';

    const itemCls = (v: string) => [
        'px-3 py-1.5 text-xs cursor-pointer select-none',
        value === v
            ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
    ].join(' ');

    const pick = (v: string) => { onChange(v); setOpen(false); };

    return (
        <div className="w-full h-8">
            <button ref={btnRef} type="button" onClick={handleOpen}
                className="w-full h-8 flex items-center justify-between px-1.5 gap-1 text-xs text-gray-900 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <span className="truncate">{displayName || <span className="text-gray-400">—</span>}</span>
                <ChevronDown className={`size-3 shrink-0 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && createPortal(
                <div ref={dropRef}
                    style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.minWidth, zIndex: 9999 }}
                    className="max-h-64 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
                    <div className={itemCls('')} onClick={() => pick('')}>—</div>
                    {technicians.length === 0 ? (
                        doctors.map(d => (
                            <div key={`d:${d.id}`} className={itemCls(`d:${d.id}`)} onClick={() => pick(`d:${d.id}`)}>
                                {shortDoctorName(d.name)}
                            </div>
                        ))
                    ) : (<>
                        <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold tracking-wider uppercase text-gray-400 dark:text-gray-500">Эмч</div>
                        {doctors.map(d => (
                            <div key={`d:${d.id}`} className={itemCls(`d:${d.id}`)} onClick={() => pick(`d:${d.id}`)}>
                                {shortDoctorName(d.name)}
                            </div>
                        ))}
                        <div className="mx-3 my-1 border-t border-gray-100 dark:border-gray-800" />
                        <div className="px-3 pt-1 pb-0.5 text-[10px] font-semibold tracking-wider uppercase text-gray-400 dark:text-gray-500">Рентген техникч</div>
                        {technicians.map(t => (
                            <div key={`t:${t.id}`} className={itemCls(`t:${t.id}`)} onClick={() => pick(`t:${t.id}`)}>
                                {t.name}
                            </div>
                        ))}
                    </>)}
                </div>,
                document.body
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Row                                                                 */
/* ------------------------------------------------------------------ */
function Row({
    entry, rowNum, editIdx, doctors, technicians, authUser, isConfirmed,
    isLast, onChange, onRemove, onTabLast, onSaveNow, onRefund,
}: {
    entry: Entry; rowNum: number; editIdx: number;
    doctors: Doctor[]; technicians: Technician[]; authUser: AuthUser;
    isConfirmed: boolean; isLast: boolean;
    onChange?: (merged: Entry) => void;
    onRemove?: () => void;
    onTabLast?: () => void;
    onSaveNow?: () => void;
    onRefund?: (entry: Entry) => void;
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
            {/* № */}
            <td className={`${B} text-center text-gray-400`}>
                <div className="h-8 flex items-center justify-center text-xs">{rowNum}</div>
            </td>
            {/* Үйлчлүүлэгч */}
            <td className={`${B} p-0`}><TextCell value={entry.patient_name} readOnly={!editable} onChange={v => upd({ patient_name: v })} /></td>
            {/* Хүйс */}
            <td className={`${B} p-0`}>
                {!editable
                    ? <div className="h-8 flex items-center justify-center text-xs text-gray-700 dark:text-gray-300">{entry.gender}</div>
                    : <select value={entry.gender} onChange={e => upd({ gender: e.target.value })}
                        className="w-full h-8 text-xs text-center bg-transparent text-gray-900 dark:text-gray-100 outline-none focus:bg-blue-50 dark:focus:bg-blue-900/30 dark:bg-gray-800 [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-900 dark:[&>option]:text-gray-100 cursor-pointer">
                        <option value="">—</option>
                        <option value="Эр">Эр</option>
                        <option value="Эм">Эм</option>
                    </select>
                }
            </td>
            {/* Оношилгоо */}
            <td className={`${B} p-0`}><TextCell value={entry.diagnosis} readOnly={!editable} list={editable ? 'treatments-list' : undefined} onChange={v => upd({ diagnosis: v })} /></td>
            {/* Дугаар */}
            <td className={`${B} p-0`}><TextCell value={entry.appointment_number} center readOnly={!editable} onChange={v => upd({ appointment_number: v })} /></td>
            {/* Нийт төлөх ёстой дүн */}
            <td className={`${B} p-0`}><NumCell value={entry.gross_amount} readOnly={!editable} onChange={v => upd({ gross_amount: v })} /></td>
            {/* Хөнгөлөлт % */}
            <td className={`${B} p-0`}>
                {!editable
                    ? <div className="h-8 flex items-center justify-end px-1.5 text-xs tabular-nums text-gray-500">
                        {entry.discount > 0 ? `${entry.discount}%` : ''}
                      </div>
                    : <div className="relative">
                        <NumCell value={entry.discount} readOnly={false} cls="text-gray-500 pr-4"
                            onChange={v => upd({ discount: Math.min(100, Math.max(0, v)) })} />
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">%</span>
                      </div>
                }
            </td>
            {/* Мобайл */}
            <PayCellWithRefund B={B} value={entry.mobile_amount} readOnly={!editable}
                onChange={v => upd({ mobile_amount: v })}
                refundShow={entry.refunded_at && entry.refund_method === 'mobile' ? entry.refund_amount : 0} />
            {/* Карт (Данс ч мөн адил карт баганаас баланслана) */}
            <PayCellWithRefund B={B} value={entry.card_amount} readOnly={!editable}
                onChange={v => upd({ card_amount: v })}
                refundShow={entry.refunded_at && (entry.refund_method === 'card' || entry.refund_method === 'bank') ? entry.refund_amount : 0}
                refundLabel={entry.refund_method === 'bank' ? 'Данс' : ''} />
            {/* Бэлэн */}
            <PayCellWithRefund B={B} value={entry.cash_amount} readOnly={!editable}
                onChange={v => upd({ cash_amount: v })}
                refundShow={entry.refunded_at && entry.refund_method === 'cash' ? entry.refund_amount : 0} />
            {/* Storepay */}
            <PayCellWithRefund B={B} value={entry.storepay_amount} readOnly={!editable}
                onChange={v => upd({ storepay_amount: v })}
                refundShow={entry.refunded_at && entry.refund_method === 'storepay' ? entry.refund_amount : 0} />
            {/* Илүү дүн (auto) */}
            {(() => {
                const paySum = entry.mobile_amount + entry.card_amount + entry.cash_amount + entry.storepay_amount;
                const overpaidAmt = entry.gross_amount > 0 && paySum > entry.total_amount
                    ? paySum - entry.total_amount
                    : (entry.overpaid_amount ?? 0);
                const isUsed = !!entry.overpaid_used_at;
                const credits = entry.applied_credits ?? [];
                const hasOverpaid = overpaidAmt > 0;
                const hasCredits  = credits.length > 0;
                return (
                    <td className={`${B} p-0 ${hasOverpaid ? (isUsed ? 'bg-gray-50/60 dark:bg-gray-800/40' : 'bg-green-50/60 dark:bg-green-900/20') : ''}`}>
                        <div className="min-h-8 flex flex-col items-end justify-center px-1.5 text-[11px] tabular-nums font-semibold gap-0.5">
                            {hasOverpaid && (
                                <span className={isUsed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-green-700 dark:text-green-400'}>
                                    +{overpaidAmt.toLocaleString()}
                                </span>
                            )}
                            {credits.map((c, i) => (
                                <span key={i}
                                    title={`${c.kind === 'overpaid' ? 'Илүү тооцоо' : 'Дутуу тооцоо'} ${c.from_date ?? ''} ${c.from_name ?? ''}-аас ${c.amount.toLocaleString()}₮ ${c.method ?? ''}`}
                                    className={`tabular-nums ${
                                        c.kind === 'overpaid'
                                            ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                            : 'text-amber-700 dark:text-amber-400 font-semibold'
                                    }`}>
                                    {c.amount.toLocaleString()}
                                </span>
                            ))}
                            {!hasOverpaid && !hasCredits && <div className="h-4" />}
                        </div>
                    </td>
                );
            })()}
            {/* Нийт дүн — зөрүү шалгах */}
            {(() => {
                const paySum = entry.mobile_amount + entry.card_amount + entry.cash_amount + entry.storepay_amount;
                const creditSum = (entry.applied_credits ?? []).reduce((s, c) => s + (c.amount ?? 0), 0);
                const effective = paySum + creditSum;
                const underpaid = entry.gross_amount > 0 && effective > 0 && effective < entry.total_amount;
                const overpaid  = entry.gross_amount > 0 && effective > entry.total_amount;
                return (
                    <td className={`${B} p-0 ${entry.refunded_at ? 'bg-red-50/40 dark:bg-red-900/15' : underpaid ? 'bg-orange-50/60 dark:bg-orange-900/20' : overpaid ? 'bg-green-50/40 dark:bg-green-900/10' : 'bg-blue-50/40 dark:bg-blue-900/10'}`}
                        title={entry.refunded_at ? `Refund-ийн дараа: ${(entry.total_amount - (entry.refund_amount ?? 0)).toLocaleString()}₮` : underpaid ? `Дутуу: ${(entry.total_amount - effective).toLocaleString()}₮` : overpaid ? `Илүү: +${(effective - entry.total_amount).toLocaleString()}₮` : undefined}>
                        {entry.refunded_at ? (
                            <div className="px-1.5">
                                <div className="h-4 flex items-center justify-end text-[10px] tabular-nums line-through opacity-50 text-gray-500">
                                    {entry.total_amount.toLocaleString()}
                                </div>
                                <div className="h-5 flex items-center justify-end text-xs tabular-nums font-bold text-red-600 dark:text-red-400">
                                    {(entry.total_amount - (entry.refund_amount ?? 0)).toLocaleString()}
                                </div>
                            </div>
                        ) : (
                            <NumCell value={entry.total_amount} readOnly
                                cls={underpaid ? 'text-orange-600 dark:text-orange-400 font-semibold' : overpaid ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-blue-700 dark:text-blue-400 font-semibold'} />
                        )}
                    </td>
                );
            })()}
            {/* Дутуу — gross байвал auto, үгүй бол гар оруулга */}
            {(() => {
                const paySum = entry.mobile_amount + entry.card_amount + entry.cash_amount + entry.storepay_amount;
                const creditSum = (entry.applied_credits ?? []).reduce((s, c) => s + (c.amount ?? 0), 0);
                const effective = paySum + creditSum;
                const autoUnderpaid = entry.gross_amount > 0 && effective < entry.total_amount
                    ? entry.total_amount - effective
                    : 0;
                const display = entry.gross_amount > 0 ? autoUnderpaid : entry.outstanding_amount;
                return (
                    <td className={`${B} p-0 ${entry.outstanding_paid_at ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-yellow-50/60 dark:bg-yellow-900/15'}`}>
                        {entry.outstanding_paid_at ? (
                            <div className="w-full h-8 flex items-center justify-end px-1.5 text-xs tabular-nums text-green-600 dark:text-green-400 font-semibold line-through opacity-60">
                                {entry.outstanding_amount > 0 ? entry.outstanding_amount.toLocaleString() : ''}
                            </div>
                        ) : entry.gross_amount > 0 ? (
                            <div className="w-full h-8 flex items-center justify-end px-1.5 text-xs tabular-nums text-yellow-700 dark:text-yellow-400 font-semibold"
                                title="Автомат: Нийт төлөх − Төлсөн нийлбэр">
                                {display > 0 ? display.toLocaleString() : ''}
                            </div>
                        ) : (
                            <NumCell value={entry.outstanding_amount} readOnly={!editable}
                                cls="text-yellow-700 dark:text-yellow-400 font-semibold"
                                onChange={v => upd({ outstanding_amount: v })} />
                        )}
                    </td>
                );
            })()}
            {/* Эмч */}
            <td className={`${B} p-0`}>
                {!editable
                    ? <div className="h-8 flex items-center px-1.5 text-xs text-gray-700 dark:text-gray-300 overflow-hidden">
                        <span className="truncate">
                            {entry.doctor_id
                                ? shortDoctorName(entry.doctor_name ?? doctors.find(d => d.id === entry.doctor_id)?.name)
                                : entry.technician_employee_id
                                    ? (entry.technician_name ?? technicians.find(t => t.id === entry.technician_employee_id)?.name ?? '')
                                    : ''}
                        </span>
                      </div>
                    : <DoctorSelect
                        value={entry.doctor_id ? `d:${entry.doctor_id}` : entry.technician_employee_id ? `t:${entry.technician_employee_id}` : ''}
                        onChange={val => {
                            if (!val) upd({ doctor_id: null, technician_employee_id: null });
                            else if (val.startsWith('d:')) upd({ doctor_id: +val.slice(2), technician_employee_id: null });
                            else upd({ doctor_id: null, technician_employee_id: +val.slice(2) });
                            onSaveNow?.();
                        }}
                        doctors={doctors}
                        technicians={technicians}
                    />
                }
            </td>
            {/* Ресепшн */}
            <td className={`${B} p-0`}>
                <div className="h-8 flex items-center px-1.5 text-xs text-gray-400 overflow-hidden">
                    <span className="truncate">{entry.receptionist_name ?? authUser.name}</span>
                </div>
            </td>

            {/* ── Хэрэгсэл баганууд ── */}
            {SUPPLY_COLS.map(({ key }) => (
                <td key={key} className={`${B} p-0`}>
                    <SupplyCell value={entry[key] as number} readOnly={!editable} onChange={v => upd({ [key]: v } as any)} />
                </td>
            ))}

            {/* Устгах / Буцаалт */}
            <td className={`${B} p-0 text-center`} {...(isLast ? lastCellTabProps : {})}>
                <div className="flex items-center justify-center gap-0.5">
                    {!entry.refunded_at && onRefund && (entry.mobile_amount + entry.card_amount + entry.cash_amount + entry.storepay_amount > 0) && (
                        <button onClick={() => onRefund(entry)}
                            title="Буцаалт хийх"
                            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors">
                            <Undo2 className="size-3" />
                        </button>
                    )}
                    {entry.refunded_at && (
                        <span title={`Буцаасан: ${entry.refund_amount?.toLocaleString()}₮ ${entry.refund_method}`}
                            className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 text-[9px] font-bold text-red-700 dark:text-red-300 leading-none">
                            ↩ {((entry.refund_amount ?? 0) / 1000).toFixed(0)}K
                        </span>
                    )}
                    {editable && onRemove && (
                        <button onClick={onRemove} className="h-7 w-7 flex items-center justify-center text-gray-300 hover:text-red-400">
                            <Trash2 className="size-3" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}

/* ------------------------------------------------------------------ */
/*  Refund Modal                                                        */
/* ------------------------------------------------------------------ */
function RefundModal({ entry, onClose }: { entry: Entry; onClose: () => void }) {
    const paySum = entry.mobile_amount + entry.card_amount + entry.cash_amount + entry.storepay_amount;
    const [amount, setAmount] = useState(String(paySum));
    const [method, setMethod] = useState<'bank' | 'mobile' | 'cash' | 'storepay'>('bank');
    const [reason, setReason] = useState('');
    const [busy, setBusy]     = useState(false);
    const parsed = parseInt(amount.replace(/[^0-9]/g, ''), 10) || 0;

    function submit() {
        if (parsed <= 0) return;
        if (!entry.id) return;
        setBusy(true);
        router.post(`/reception/daily-sheet/refund/${entry.id}`, {
            amount: parsed, method, reason: reason.trim() || null,
        }, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setBusy(false),
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border bg-card shadow-2xl overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-red-400 via-red-500 to-red-600" />
                <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-base font-bold text-foreground">Буцаалт хийх</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {entry.patient_name ?? '—'} · {entry.diagnosis ?? ''}
                            </p>
                        </div>
                        <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                            <X className="size-4" />
                        </button>
                    </div>

                    <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Анх төлсөн дүн</span>
                            <span className="font-bold tabular-nums">{paySum.toLocaleString()}₮</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Буцаах дүн</label>
                        <div className="relative">
                            <input type="text" inputMode="numeric" value={amount}
                                onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-background px-4 py-2.5 pr-8 text-base font-bold tabular-nums text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₮</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Буцаах хэлбэр</label>
                        <div className="grid grid-cols-4 gap-2">
                            {(['bank', 'mobile', 'cash', 'storepay'] as const).map(m => (
                                <button key={m} type="button" onClick={() => setMethod(m)}
                                    className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                                        method === m
                                            ? 'bg-red-600 border-red-600 text-white'
                                            : 'border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-red-400'
                                    }`}>
                                    {m === 'bank' ? 'Данс' : m === 'mobile' ? 'Мобайл' : m === 'cash' ? 'Бэлэн' : 'Storepay'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                            Шалтгаан <span className="normal-case font-normal">(заавал биш)</span>
                        </label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                            placeholder="Жишээ: Үйлчилгээ хүсэхгүй болсон..."
                            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-background px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none transition" />
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button onClick={submit} disabled={busy || parsed <= 0}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
                            {busy
                                ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                : <Undo2 className="size-4" />}
                            Буцаалт хийх
                        </button>
                        <button onClick={onClose}
                            className="rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted">
                            Цуцлах
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */
export default function DailySheetIndex({ sheet, date, doctors, technicians, treatments, auth_user, outstanding_entries }: Props) {
    usePage<any>().props;
    const isConfirmed     = sheet?.is_confirmed ?? false;
    const isMorningLocked = sheet?.morning_confirmed ?? false;
    const [refundEntry, setRefundEntry] = useState<Entry | null>(null);
    const [waitingForSave, setWaitingForSave] = useState<number | null>(null);

    // Өглөөний мөрүүд (хаагдсан, state-гүй)
    const morningRows: Entry[] = isMorningLocked
        ? (sheet?.entries.filter(e => e.is_morning_entry) ?? [])
        : [];

    // Миний засварлагддаг мөрүүд (morning entry биш)
    const [myRows, setMyRows] = useState<Entry[]>(() => {
        const saved = sheet?.entries.filter(e => e.is_mine && !e.source && !e.is_morning_entry) ?? [];
        return saved.length ? saved.map(e => ({ ...e })) : [blank(auth_user)];
    });

    const otherRows: Entry[] = sheet?.entries.filter(e => !e.is_mine && !e.source && !e.is_morning_entry && !e.refunded_at) ?? [];
    const sourceRows: Entry[] = sheet?.entries.filter(e => !!e.source) ?? [];
    // Бүх buцаалт хийсэн мөрүүд (server-ээс шууд)
    const refundedRows: Entry[] = sheet?.entries.filter(e => !!e.refunded_at && !e.source && !e.is_morning_entry) ?? [];

    useEffect(() => {
        if (isConfirmed) return;
        const id = setInterval(() => {
            router.reload({ only: ['sheet'], preserveState: true } as any);
        }, 3_000);
        return () => clearInterval(id);
    }, [isConfirmed]);

    // Admin unlock хийсний дараа myRows-г server-ийн өгөгдлөөр дахин тохируул.
    // myRows нь blank row л байвал (засварлаагүй) server-ийн бодит мөрүүдээр солино.
    useEffect(() => {
        const isBlank = myRows.length === 1 && myRows[0].id === undefined;
        if (!isBlank) return;
        const serverMine = sheet?.entries.filter(e => e.is_mine && !e.source && !e.is_morning_entry) ?? [];
        if (serverMine.length > 0) {
            setMyRows(serverMine.map(e => ({ ...e })));
        }
    }, [sheet?.entries]);

    /* ── Auto-save ── */
    const [saveState, setSaveState] = useState<'idle'|'saving'|'saved'|'error'>('idle');
    const timer            = useRef<ReturnType<typeof setTimeout>|null>(null);
    const firstRender      = useRef(true);
    const pendingImmediate = useRef(false);
    const myRowsRef        = useRef(myRows);
    myRowsRef.current = myRows;

    // Сервер sheet шинэчлэгдэх бүрд myRows-ийн id, refund мэдээллийг автомат sync хийнэ.
    // Хэрэглэгчийн засаж буй талбаруудад халдахгүй.
    useEffect(() => {
        if (!sheet) return;
        const serverMyRows = sheet.entries.filter(e => e.is_mine && !e.source && !e.is_morning_entry);
        if (serverMyRows.length === 0) return;
        setMyRows(prev => {
            let changed = false;
            const next = prev.map((row, idx) => {
                const server = serverMyRows[idx];
                if (!server) return row;
                if (row.id === server.id && row.refund_amount === server.refund_amount) return row;
                changed = true;
                return {
                    ...row,
                    id: server.id,
                    refund_amount: server.refund_amount,
                    refunded_at: server.refunded_at,
                    refund_method: server.refund_method,
                    refund_reason: server.refund_reason,
                };
            });
            return changed ? next : prev;
        });
    }, [sheet]);

    // Refund button дэрэх үед серверийн fresh entry-ийг (id-тай) олно
    const openRefundForRow = useCallback((rowIdx: number) => {
        const myServerRows = (sheet?.entries ?? []).filter(e => e.is_mine && !e.source && !e.is_morning_entry);
        const server = myServerRows[rowIdx];
        if (server && server.id) {
            setRefundEntry(server);
            return;
        }
        setWaitingForSave(rowIdx);
        pendingImmediate.current = true;
        setMyRows(prev => [...prev]);
    }, [sheet]);

    // Save амжилттай дууссаны дараа хүлээгдэж буй row-н Refund modal-ыг нээнэ
    useEffect(() => {
        if (waitingForSave === null) return;
        if (saveState !== 'saved') return;
        const myServerRows = (sheet?.entries ?? []).filter(e => e.is_mine && !e.source && !e.is_morning_entry);
        const server = myServerRows[waitingForSave];
        if (server && server.id) {
            setRefundEntry(server);
        }
        setWaitingForSave(null);
    }, [saveState, sheet, waitingForSave]);

    // Inertia props шинэчлэгдэхэд morning lock болсон тохиолдолд myRows reset хийнэ
    const prevMorningLocked = useRef(isMorningLocked);
    useEffect(() => {
        if (isMorningLocked && !prevMorningLocked.current) {
            const saved = (sheet?.entries ?? []).filter(e => e.is_mine && !e.source && !e.is_morning_entry);
            setMyRows(saved.length ? saved.map(e => ({ ...e })) : [blank(auth_user)]);
        }
        prevMorningLocked.current = isMorningLocked;
    }, [isMorningLocked]); // eslint-disable-line react-hooks/exhaustive-deps


    const scrollRef      = useRef<HTMLDivElement>(null);
    const prevRowCount   = useRef(myRows.length);
    useEffect(() => {
        if (myRows.length > prevRowCount.current) {
            requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
            });
        }
        prevRowCount.current = myRows.length;
    }, [myRows.length]);

    const doSave = useCallback((rows: Entry[]) => {
        if (timer.current) clearTimeout(timer.current);
        setSaveState('saving');
        router.post('/reception/daily-sheet/save',
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
            doSave(myRowsRef.current);
            return;
        }
        setSaveState('saving');
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => doSave(myRowsRef.current), 1500);
        return () => { if (timer.current) clearTimeout(timer.current); };
    }, [myRows]);

    useEffect(() => {
        if (saveState !== 'saved') return;
        const t = setTimeout(() => setSaveState('idle'), 2000);
        return () => clearTimeout(t);
    }, [saveState]);

    const gotoDate = (d: string) => router.get('/reception/daily-sheet', { date: d }, { preserveState: false });

    const updateRow = useCallback((idx: number, merged: Entry) => {
        setMyRows(prev => { const n=[...prev]; n[idx]=merged; return n; });
    }, []);
    const addRow    = useCallback(() => setMyRows(prev => [...prev, blank(auth_user)]), [auth_user]);
    const removeRow = useCallback((idx: number) => setMyRows(prev =>
        prev.length <= 1 ? [blank(auth_user)] : prev.filter((_, i) => i !== idx)
    ), [auth_user]);
    const triggerImmediateSave = useCallback(() => { pendingImmediate.current = true; }, []);

    const [searchQuery, setSearchQuery] = useState('');
    const filteredMyRows    = myRows.map((e, i) => ({ e, i })).filter(({ e }) => matchesSearch(e, searchQuery));
    const filteredOtherRows = otherRows.map((e, i) => ({ e, i })).filter(({ e }) => matchesSearch(e, searchQuery));
    const isSearching = searchQuery.trim().length > 0;

    const allRows = [...morningRows, ...myRows, ...otherRows, ...sourceRows];
    // Refund-аар хасагдах дүнг тооцох helper
    const refundBy = (col: 'mobile' | 'card' | 'cash' | 'storepay') => refundedRows.reduce((s, e) => {
        if (!e.refund_amount) return s;
        // bank refund нь карт баганаас хасагдана
        const eff = e.refund_method === 'bank' ? 'card' : e.refund_method;
        return eff === col ? s + e.refund_amount : s;
    }, 0);

    const T = {
        gross:       allRows.reduce((s,e) => s + e.gross_amount, 0),
        discount:    allRows.reduce((s,e) => {
            const g = e.gross_amount || 0;
            const d = e.discount || 0;
            return s + Math.round(g * (d / 100));
        }, 0),
        // Payment column total = idэвхтэй мөрүүдээс — refund-ийн ижил method дүн
        mobile:      allRows.reduce((s,e) => s + e.mobile_amount, 0)   - refundBy('mobile'),
        card:        allRows.reduce((s,e) => s + e.card_amount, 0)     - refundBy('card'),
        cash:        allRows.reduce((s,e) => s + e.cash_amount, 0)     - refundBy('cash'),
        storepay:    allRows.reduce((s,e) => s + e.storepay_amount, 0) - refundBy('storepay'),
        overpaid:    allRows.reduce((s,e) => s + (e.overpaid_amount ?? 0), 0),
        // Нийт дүн: total - refund
        total:       allRows.reduce((s,e) => s + e.total_amount - (e.refund_amount ?? 0), 0),
        outstanding: allRows.reduce((s, e) => {
            if (e.refunded_at) return s;
            const paySum = e.mobile_amount + e.card_amount + e.cash_amount + e.storepay_amount;
            const creditSum = (e.applied_credits ?? []).reduce((cs, c) => cs + (c.amount ?? 0), 0);
            const effective = paySum + creditSum;
            const autoUnderpaid = e.gross_amount > 0 && effective < e.total_amount ? e.total_amount - effective : 0;
            const value = e.gross_amount > 0 ? autoUnderpaid : e.outstanding_amount;
            return s + value;
        }, 0),
        refund: refundedRows.reduce((s, e) => s + (e.refund_amount ?? 0), 0),
    };
    const filledCount = allRows.filter(e => e.patient_name || e.total_amount > 0).length;



    const [confirmingMorning, setConfirmingMorning] = useState(false);
    const handleSubmitMorning = () => {
        setConfirmingMorning(true);
        router.post('/reception/daily-sheet/submit-morning', { date },
            { onFinish: () => setConfirmingMorning(false), preserveScroll: true });
    };

    const [confirming, setConfirming] = useState(false);
    const handleSubmit = () => {
        setConfirming(true);
        router.post('/reception/daily-sheet/submit', { date },
            { onFinish: () => setConfirming(false), preserveScroll: true });
    };

    const overdueMyEntries = outstanding_entries.filter(e => e.is_mine && e.days_since >= 7);
    const [showOverdueNotif, setShowOverdueNotif] = useState(false);
    useEffect(() => {
        if (overdueMyEntries.length === 0) return;
        const KEY = `overdue_notif_dismissed_${auth_user.id}`;
        const lastDismissed = localStorage.getItem(KEY);
        const twelveHours = 12 * 60 * 60 * 1000;
        if (!lastDismissed || Date.now() - parseInt(lastDismissed) > twelveHours) setShowOverdueNotif(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const B  = 'border border-gray-200 dark:border-gray-700';
    const BH = 'border border-gray-300 dark:border-gray-600';

    /* Эргүүлэгдсэн толгойн өндөр — хамгийн урт label-аар тодорхойлогдоно */
    const rotatedHeaderStyle: React.CSSProperties = {
        writingMode: 'vertical-lr',
        transform: 'rotate(180deg)',
        whiteSpace: 'nowrap',
        padding: '6px 4px',
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.2,
    };

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Өдрийн тооцоо" />

            <datalist id="treatments-list">
                {treatments.map(t => <option key={t.id} value={t.title} />)}
            </datalist>

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
                    }} className="text-red-400 hover:text-red-600 shrink-0">
                        <X className="size-4" />
                    </button>
                </div>
            )}

            <div className="flex flex-col gap-3 p-3 md:p-5">

                {/* Top bar */}
                <div className="flex flex-wrap items-center gap-2">
                    <DatePicker value={date} onChange={gotoDate} />

                    {/* Хадгалалтын төлөв */}
                    {!isConfirmed && (
                        saveState === 'saving' ? (
                            <span className="flex items-center gap-1 text-xs text-gray-400"><Cloud className="size-3.5 animate-pulse" /> Хадгалж байна...</span>
                        ) : saveState === 'saved' ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><Cloud className="size-3.5" /> Хадгалагдлаа</span>
                        ) : saveState === 'error' ? (
                            <span className="flex items-center gap-1 text-xs text-red-500"><CloudOff className="size-3.5" /> Алдаа гарлаа</span>
                        ) : null
                    )}

                    {/* Хайх */}
                    <div className="relative ml-auto">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Хайх..."
                            className="h-8 pl-8 pr-3 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600 w-44" />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="size-3" />
                            </button>
                        )}
                    </div>

                    {/* ── Өглөөний баталгаажуулалт ── */}
                    {isMorningLocked ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 px-2.5 py-1 rounded-full">
                            <Sun className="size-3.5" /> Өглөө — {sheet?.morning_receptionist}
                        </span>
                    ) : !isConfirmed ? (
                        <button onClick={handleSubmitMorning} disabled={confirmingMorning}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
                            <Sun className="size-3.5" />
                            {confirmingMorning ? '...' : 'Өглөө баталгаажуулах'}
                        </button>
                    ) : null}

                    {/* ── Өдрийн баталгаажуулалт ── */}
                    {isConfirmed ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 px-2.5 py-1 rounded-full">
                            <Moon className="size-3.5" /> Өдөр — {sheet?.receptionist}
                        </span>
                    ) : isMorningLocked ? (
                        <button onClick={handleSubmit} disabled={confirming}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                            <Moon className="size-3.5" />
                            {confirming ? '...' : 'Өдөр баталгаажуулах'}
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={confirming}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                            <Moon className="size-3.5" />
                            {confirming ? '...' : 'Өдөр баталгаажуулах'}
                        </button>
                    )}
                </div>

                {/* ── Хүснэгт ── */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div ref={scrollRef} className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '72vh' }}>
                        <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed', minWidth: 1400 }}>
                            <colgroup>
                                <col style={{ width: 30 }} />   {/* № */}
                                <col />                          {/* Үйлчлүүлэгч */}
                                <col style={{ width: 48 }} />   {/* Хүйс */}
                                <col />                          {/* Оношилгоо */}
                                <col style={{ width: 88 }} />   {/* Дугаар */}
                                <col style={{ width: 90 }} />   {/* Нийт төлөх ёстой дүн */}
                                <col style={{ width: 58 }} />   {/* Хөнг. % */}
                                <col style={{ width: 78 }} />   {/* Мобайл */}
                                <col style={{ width: 78 }} />   {/* Карт */}
                                <col style={{ width: 78 }} />   {/* Бэлэн */}
                                <col style={{ width: 78 }} />   {/* Storepay */}
                                <col style={{ width: 72 }} />   {/* Илүү дүн */}
                                <col style={{ width: 78 }} />   {/* Нийт дүн */}
                                <col style={{ width: 70 }} />   {/* Дутуу */}
                                <col style={{ width: 130 }} />  {/* Эмч */}
                                <col style={{ width: 80 }} />   {/* Ресепшн */}
                                {/* Хэрэгсэл — нарийн, эргүүлэгдсэн толгойтой */}
                                <col style={{ width: 30 }} />
                                <col style={{ width: 30 }} />
                                <col style={{ width: 30 }} />
                                <col style={{ width: 30 }} />
                                <col style={{ width: 30 }} />
                                <col style={{ width: 30 }} />
                                {/* Устгах */}
                                <col style={{ width: 28 }} />
                            </colgroup>

                            {/* ── Header ── */}
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" style={{ verticalAlign: 'bottom' }}>
                                    <th className={`${BH} px-1 pb-1.5 text-center`}>№</th>
                                    <th className={`${BH} px-2 pb-1.5 text-left`} style={{ minWidth: 100 }}>Үйлчлүүлэгч</th>
                                    <th className={`${BH} px-1 pb-1.5 text-center`}>Хүйс</th>
                                    <th className={`${BH} px-2 pb-1.5 text-left`} style={{ minWidth: 110 }}>Оношилгоо / эмчилгээ</th>
                                    <th className={`${BH} px-1 pb-1.5 text-center`}>Дугаар</th>
                                    <th className={`${BH} px-1 pb-1.5 text-center`}>Нийт төлөх</th>
                                    <th className={`${BH} px-1 pb-1.5 text-center`}>Хөнг.%</th>
                                    <th className={`${BH} px-1 pb-1.5 text-center`}>Мобайл</th>
                                    <th className={`${BH} px-1 pb-1.5 text-center`}>Карт</th>
                                    <th className={`${BH} px-1 pb-1.5 text-center`}>Бэлэн</th>
                                    <th className={`${BH} px-1 pb-1.5 text-center`}>Storepay</th>
                                    <th className={`${BH} px-1 pb-1.5 text-center text-green-700 dark:text-green-400`}>Илүү</th>
                                    <th className={`${BH} px-1 pb-1.5 text-center bg-blue-50 dark:bg-blue-900/20`}>Нийт дүн</th>
                                    <th className={`${BH} px-1 pb-1.5 text-center bg-yellow-100 dark:bg-yellow-900/30`}>Дутуу</th>
                                    <th className={`${BH} px-1 pb-1.5 text-left`}>Эмч</th>
                                    <th className={`${BH} px-1 pb-1.5 text-left`}>Ресепшн</th>
                                    {/* Эргүүлэгдсэн толгойтой хэрэгсэл баганууд */}
                                    {SUPPLY_COLS.map(({ key, label }) => (
                                        <th key={key} className={`${BH} text-center align-bottom`}>
                                            <div style={rotatedHeaderStyle} className="text-gray-600 dark:text-gray-400 mx-auto">
                                                {label}
                                            </div>
                                        </th>
                                    ))}
                                        <th className={`${BH}`}></th>
                                </tr>
                            </thead>

                            <tbody>
                                {/* ── Өглөөний хэсэг (morning confirmed үед) ── */}
                                {isMorningLocked && !isSearching && morningRows.length > 0 && (
                                    <>
                                        <tr>
                                            <td colSpan={23} className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                                ☀️ Өглөөний бүртгэл — баталгаажсан
                                            </td>
                                        </tr>
                                        {morningRows.map((e, i) => (
                                            <Row key={`morning${i}`}
                                                entry={e} rowNum={i + 1} editIdx={i}
                                                doctors={doctors} technicians={technicians} authUser={auth_user} isConfirmed={true}
                                                isLast={false}
                                            />
                                        ))}
                                        <tr>
                                            <td colSpan={23} className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
                                                🌙 Өдрийн бүртгэл
                                            </td>
                                        </tr>
                                    </>
                                )}

                                {/* ── Миний засварлагддаг мөрүүд ── */}
                                {filteredMyRows.map(({ e, i }, displayIdx) => (
                                    <Row key={`m${i}`}
                                        entry={e} rowNum={(isMorningLocked ? morningRows.length : 0) + displayIdx + 1} editIdx={i}
                                        doctors={doctors} technicians={technicians} authUser={auth_user} isConfirmed={isConfirmed}
                                        isLast={!isSearching && displayIdx === filteredMyRows.length - 1 && filteredOtherRows.length === 0}
                                        onChange={merged => updateRow(i, merged)}
                                        onRemove={() => removeRow(i)}
                                        onTabLast={addRow}
                                        onSaveNow={triggerImmediateSave}
                                        onRefund={() => openRefundForRow(i)}
                                    />
                                ))}
                                {filteredOtherRows.map(({ e, i }, displayIdx) => (
                                    <Row key={`o${i}`}
                                        entry={e} rowNum={(isMorningLocked ? morningRows.length : 0) + filteredMyRows.length + displayIdx + 1} editIdx={i}
                                        doctors={doctors} technicians={technicians} authUser={auth_user} isConfirmed={isConfirmed}
                                        isLast={false}
                                    />
                                ))}
                                {sourceRows.map((e, i) => (
                                    <Row key={`src${i}`}
                                        entry={{ ...e, is_mine: false }}
                                        rowNum={filteredMyRows.length + filteredOtherRows.length + i + 1}
                                        editIdx={i} doctors={doctors} technicians={technicians} authUser={auth_user} isConfirmed={true} isLast={false}
                                    />
                                ))}
                                {isSearching && filteredMyRows.length === 0 && filteredOtherRows.length === 0 && (
                                    <tr>
                                        <td colSpan={23} className={`${B} px-4 py-6 text-center text-gray-400 text-xs`}>
                                            «{searchQuery}» — тохирох бичлэг олдсонгүй
                                        </td>
                                    </tr>
                                )}
                            </tbody>

                            {/* ── Нийт ── */}
                            <tfoot className="sticky bottom-0 z-10">
                                <tr className="bg-gray-100 dark:bg-gray-800 font-semibold text-xs text-gray-800 dark:text-gray-200">
                                    <td colSpan={5} className={`${BH} px-2 py-2 text-right`}>
                                        Нийт ({filledCount} бичлэг){isSearching && ` · хайлт: ${filteredMyRows.length + filteredOtherRows.length}`}
                                    </td>
                                    <td className={`${B} px-1.5 py-2 text-right tabular-nums`}>{fmt(T.gross)}</td>
                                    <td className={`${B} px-1.5 py-2 text-right tabular-nums text-orange-700 dark:text-orange-400`}
                                        title="Хөнгөлсөн нийт дүн (₮)">
                                        {T.discount > 0 ? `-${fmt(T.discount)}` : ''}
                                    </td>
                                    <td className={`${B} px-1.5 py-2 text-right tabular-nums`}>{fmt(T.mobile)}</td>
                                    <td className={`${B} px-1.5 py-2 text-right tabular-nums`}>{fmt(T.card)}</td>
                                    <td className={`${B} px-1.5 py-2 text-right tabular-nums`}>{fmt(T.cash)}</td>
                                    <td className={`${B} px-1.5 py-2 text-right tabular-nums`}>{fmt(T.storepay)}</td>
                                    <td className={`${B} px-1.5 py-2 text-right tabular-nums text-green-700 dark:text-green-400`}>{fmt(T.overpaid)}</td>
                                    <td className={`${B} px-1.5 py-2 text-right tabular-nums bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300`}>{fmt(T.total)}</td>
                                    <td className={`${B} px-1.5 py-2 text-right tabular-nums bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300`}>{fmt(T.outstanding)}</td>
                                    <td className={`${B}`} colSpan={9}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Мөр нэмэх */}
                    {!isConfirmed && !isSearching && (
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2">
                            <button onClick={addRow}
                                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                <Plus className="size-3.5" /> Мөр нэмэх
                            </button>
                        </div>
                    )}
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-3 lg:grid-cols-8 gap-2 mt-1">
                    {[
                        { label: 'Мобайл',     value: T.mobile,      color: 'text-gray-700 dark:text-gray-300' },
                        { label: 'Карт',       value: T.card,        color: 'text-gray-700 dark:text-gray-300' },
                        { label: 'Бэлэн',      value: T.cash,        color: 'text-gray-700 dark:text-gray-300' },
                        { label: 'Storepay',   value: T.storepay,    color: 'text-gray-700 dark:text-gray-300' },
                        { label: 'Хөнгөлсөн',  value: T.discount,    color: 'text-orange-600 dark:text-orange-400' },
                        { label: 'Буцаасан',   value: T.refund,      color: 'text-red-600 dark:text-red-400' },
                        { label: 'Нийт дүн',   value: T.total,       color: 'text-blue-700 dark:text-blue-400' },
                        { label: 'Дутуу',      value: T.outstanding, color: 'text-yellow-700 dark:text-yellow-400' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5">
                            <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                            <div className={`text-sm font-bold tabular-nums ${color}`}>{value.toLocaleString()}₮</div>
                        </div>
                    ))}
                </div>

            </div>

            {refundEntry && (
                <RefundModal entry={refundEntry} onClose={() => setRefundEntry(null)} />
            )}

        </ReceptionLayout>
    );
}
