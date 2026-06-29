import AppLayout from '@/layouts/app-layout';
import { shortDoctorName } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Download, Printer, CheckCircle, Clock, Trash2, LockOpen, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Doctor { id: number; name: string }
interface Branch { id: number; name: string }

interface Entry {
    id: number;
    patient_name: string | null;
    gender: string | null;
    diagnosis: string | null;
    appointment_number: string | null;
    gross_amount: number;
    discount: number;
    mobile_amount: number;
    card_amount: number;
    cash_amount: number;
    storepay_amount: number;
    overpaid_amount: number;
    overpaid_used_at: string | null;
    total_amount: number;
    outstanding_amount: number;
    doctor_id: number | null;
    doctor_name: string | null;
    receptionist_name: string | null;
    supply_orthodontic_brush: number;
    supply_interdental_brush: number;
    supply_dental_floss: number;
    supply_wax: number;
    supply_retainer_case: number;
    supply_removable_app_case: number;
    entry_notes: string | null;
    technician_name: string | null;
}

interface SheetTotals {
    total_amount: number; discount: number;
    mobile_amount: number; card_amount: number;
    cash_amount: number; storepay_amount: number;
    outstanding_amount: number;
}

interface Sheet {
    id: number;
    date: string;
    branch: string | null;
    branch_id: number | null;
    is_confirmed: boolean;
    submitted_at: string | null;
    receptionist: string | null;
    morning_confirmed: boolean;
    morning_submitted_at: string | null;
    morning_receptionist: string | null;
    totals: SheetTotals;
    entries: Entry[];
}

interface OutstandingEntry {
    id: number;
    date: string;
    branch: string | null;
    patient_name: string | null;
    diagnosis: string | null;
    outstanding_amount: number;
    outstanding_paid_at: string | null;
    doctor_name: string | null;
    receptionist_name: string | null;
}

interface ReceptionEntry {
    id: number;
    date: string;
    branch: string | null;
    patient_name: string | null;
    gender: string | null;
    diagnosis: string | null;
    total_amount: number;
    cash_amount: number;
    card_amount: number;
    mobile_amount: number;
    storepay_amount: number;
    outstanding_amount: number;
    doctor_name: string | null;
}

interface ReceptionRecord {
    receptionist_name: string;
    total_entries: number;
    total_amount: number;
    cash_amount: number;
    card_amount: number;
    mobile_amount: number;
    storepay_amount: number;
    outstanding_amount: number;
    entries: ReceptionEntry[];
}

interface Filters {
    mode: 'day' | 'month';
    date: string;
    month: string;
    doctorId?: string;
    branchId?: string;
}

interface Props {
    sheets: Sheet[];
    doctors: Doctor[];
    branches: Branch[];
    filters: Filters;
    grandTotals: SheetTotals;
    outstandingEntries: OutstandingEntry[];
    receptionRegistry: ReceptionRecord[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
const MONTHS_MN = ['1','2','3','4','5','6','7','8','9','10','11','12'];

function fmt(n: number) { return n > 0 ? n.toLocaleString() : '—' }

function fmtDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDateTime(dt: string) {
    const d = new Date(dt);
    return `${fmtDate(dt.slice(0, 10))} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function dateLabelMn(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getFullYear()} оны ${d.getMonth() + 1}-р сарын ${d.getDate()}-ний өдөр`;
}

function monthLabelMn(monthStr: string) {
    const [y, m] = monthStr.split('-').map(Number);
    return `${y} оны ${MONTHS_MN[m - 1]}-р сар`;
}

function addDays(dateStr: string, n: number): string {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addMonths(monthStr: string, n: number): string {
    const [y, m] = monthStr.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function sumTotals(arr: Sheet[]): SheetTotals {
    return arr.reduce((acc, sh) => ({
        total_amount:       acc.total_amount       + sh.totals.total_amount,
        cash_amount:        acc.cash_amount        + sh.totals.cash_amount,
        card_amount:        acc.card_amount        + sh.totals.card_amount,
        mobile_amount:      acc.mobile_amount      + sh.totals.mobile_amount,
        storepay_amount:    acc.storepay_amount    + sh.totals.storepay_amount,
        outstanding_amount: acc.outstanding_amount + sh.totals.outstanding_amount,
        discount:           acc.discount           + sh.totals.discount,
    }), { total_amount: 0, cash_amount: 0, card_amount: 0, mobile_amount: 0, storepay_amount: 0, outstanding_amount: 0, discount: 0 });
}

const SUPPLY_COLS = [
    { key: 'supply_orthodontic_brush'  as const, label: 'Гажигийн сойз' },
    { key: 'supply_interdental_brush'  as const, label: 'Завсрын сойз' },
    { key: 'supply_dental_floss'       as const, label: 'Шүдний утас' },
    { key: 'supply_wax'                as const, label: 'Вакс' },
    { key: 'supply_retainer_case'      as const, label: 'Бэхжүүлэгчний сав' },
    { key: 'supply_removable_app_case' as const, label: 'Авагддаг апп сав' },
];

const rotatedHeaderStyle: React.CSSProperties = {
    writingMode: 'vertical-lr',
    transform: 'rotate(180deg)',
    whiteSpace: 'nowrap',
    padding: '6px 4px',
    fontSize: 11,
    fontWeight: 500,
    lineHeight: 1.2,
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хянах самбар', href: '/admin/dashboard' },
    { title: 'Өдрийн тооцоо', href: '/admin/daily-sheets' },
];

type Tab = 'sheets' | 'outstanding' | 'reception';

/* ------------------------------------------------------------------ */
/*  Export / Print dropdown button                                      */
/* ------------------------------------------------------------------ */
function ExportMenuButton({ icon, label, branches, colorCls, onAll, onBranch }: {
    icon: React.ReactNode;
    label: string;
    branches: Branch[];
    colorCls: string;
    onAll: () => void;
    onBranch: (id: number, name: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const fn = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button onClick={() => setOpen(v => !v)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${colorCls}`}>
                {icon}
                {label}
                <ChevronDown className={`size-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                        Хэмжээ сонгох
                    </div>
                    <button onClick={() => { onAll(); setOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium">
                        Бүх салбар
                    </button>
                    {branches.length > 1 && (
                        <>
                            <div className="mx-3 my-0.5 border-t border-gray-100 dark:border-gray-800" />
                            {branches.map(b => (
                                <button key={b.id} onClick={() => { onBranch(b.id, b.name); setOpen(false); }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    {b.name}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Entries table (shared between day-mode and month-mode)             */
/* ------------------------------------------------------------------ */
function EntriesTable({ sheet, onDeleteEntry }: { sheet: Sheet; onDeleteEntry?: (id: number) => void }) {
    return (
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '60vh' }}>
            <table className="text-xs border-collapse w-full" style={{ minWidth: 1100 }}>
                <colgroup>
                    <col style={{ width: 28 }} />
                    <col />
                    <col style={{ width: 36 }} />
                    <col />
                    <col style={{ width: 72 }} />  {/* Дугаар */}
                    <col style={{ width: 80 }} />  {/* Нийт төлөх */}
                    <col style={{ width: 52 }} />  {/* Хөнг.% */}
                    <col style={{ width: 60 }} />
                    <col style={{ width: 60 }} />
                    <col style={{ width: 60 }} />
                    <col style={{ width: 60 }} />
                    <col style={{ width: 64 }} />  {/* Илүү дүн */}
                    <col style={{ width: 70 }} />
                    <col style={{ width: 60 }} />
                    <col style={{ width: 72 }} />
                    <col style={{ width: 72 }} />
                    {SUPPLY_COLS.map(c => <col key={c.key} style={{ width: 34 }} />)}
                    <col style={{ width: 120 }} />
                    <col style={{ width: 32 }} />
                </colgroup>
                <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400" style={{ verticalAlign: 'bottom' }}>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-center">№</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-left">Үйлчлүүлэгч</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-center">Хүйс</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-left">Оношилгоо/Эмчилгээ</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-center">Дугаар</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-center">Нийт төлөх</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-center">Хөнг.%</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-center">Мобайл</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-center">Карт</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-center">Бэлэн</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-center">Storepay</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-center bg-green-50 dark:bg-green-900/20">Илүү дүн</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-center bg-blue-50 dark:bg-blue-900/20">Нийт дүн</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-center bg-yellow-50 dark:bg-yellow-900/20">Дутуу</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-left w-28">Эмч</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-left">Ресепшн</th>
                        {SUPPLY_COLS.map(c => (
                            <th key={c.key} className="border-b border-gray-200 dark:border-gray-700 text-center" style={{ verticalAlign: 'bottom', height: 90 }}>
                                <span style={rotatedHeaderStyle}>{c.label}</span>
                            </th>
                        ))}
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-left">Тэмдэглэл</th>
                        <th className="border-b border-gray-200 dark:border-gray-700 px-2 pb-1.5 text-center"></th>
                    </tr>
                </thead>
                <tbody>
                    {sheet.entries.map((e, i) => (
                        <tr key={e.id} className={i % 2 === 0 ? '' : 'bg-gray-50/60 dark:bg-gray-800/30'}>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-center text-gray-400">{i + 1}</td>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5">{e.patient_name ?? '—'}</td>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-center">{e.gender ?? ''}</td>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5">{e.diagnosis ?? '—'}</td>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-center text-gray-500">{e.appointment_number ?? ''}</td>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-right">{fmt(e.gross_amount)}</td>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-center text-gray-500">{e.discount > 0 ? `${e.discount}%` : ''}</td>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-right">{fmt(e.mobile_amount)}</td>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-right">{fmt(e.card_amount)}</td>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-right">{fmt(e.cash_amount)}</td>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-right">{fmt(e.storepay_amount)}</td>
                            <td className={`border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-right bg-green-50/50 dark:bg-green-900/10 ${e.overpaid_amount > 0 ? (e.overpaid_used_at ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-green-700 dark:text-green-400 font-semibold') : ''}`}
                                title={e.overpaid_amount > 0 ? (e.overpaid_used_at ? `Илүүдсэн ${e.overpaid_amount.toLocaleString()}₮ — ашигласан` : `Илүүдсэн ${e.overpaid_amount.toLocaleString()}₮`) : undefined}>
                                {e.overpaid_amount > 0 ? `+${e.overpaid_amount.toLocaleString()}` : '—'}
                            </td>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-right font-semibold text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10">
                                {fmt(e.total_amount)}
                            </td>
                            <td className={`border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-right bg-yellow-50/60 dark:bg-yellow-900/10 ${e.outstanding_amount > 0 ? 'text-yellow-700 dark:text-yellow-400 font-semibold' : ''}`}>
                                {fmt(e.outstanding_amount)}
                            </td>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5">
                                {e.doctor_name ? (
                                    <>
                                        <div>{shortDoctorName(e.doctor_name)}</div>
                                        {e.technician_name && (
                                            <div className="text-[10px] text-gray-400 mt-0.5">{e.technician_name}</div>
                                        )}
                                    </>
                                ) : e.technician_name ? (
                                    <div>{e.technician_name}</div>
                                ) : '—'}
                            </td>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-gray-500">{e.receptionist_name ?? '—'}</td>
                            {SUPPLY_COLS.map(c => (
                                <td key={c.key} className="border-b border-gray-100 dark:border-gray-800 px-1 py-1.5 text-center">
                                    {e[c.key] > 0 ? e[c.key] : <span className="text-gray-300">—</span>}
                                </td>
                            ))}
                            <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-gray-500 text-xs" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.entry_notes ?? ''}>
                                {e.entry_notes || ''}
                            </td>
                            <td className="border-b border-gray-100 dark:border-gray-800 px-1 py-1.5 text-center">
                                {onDeleteEntry && (
                                    <button
                                        onClick={() => onDeleteEntry(e.id)}
                                        title="Мөр устгах"
                                        className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-gray-100 dark:bg-gray-800 font-semibold text-xs">
                        <td colSpan={4} className="px-2 py-1.5 text-right text-gray-600 dark:text-gray-400">Нийт</td>
                        <td />
                        <td className="px-2 py-1.5 text-right">{fmt(sheet.entries.reduce((s,e)=>s+e.gross_amount,0))}</td>
                        <td className="px-2 py-1.5 text-right text-orange-600 dark:text-orange-400">
                            {(() => {
                                const total = sheet.entries.reduce((s, e) => s + Math.round(e.gross_amount * (e.discount || 0) / 100), 0);
                                return total > 0 ? `-${total.toLocaleString()}` : '—';
                            })()}
                        </td>
                        <td className="px-2 py-1.5 text-right">{fmt(sheet.totals.mobile_amount)}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(sheet.totals.card_amount)}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(sheet.totals.cash_amount)}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(sheet.totals.storepay_amount)}</td>
                        <td className="px-2 py-1.5 text-right bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                            {(() => {
                                const t = sheet.entries.reduce((s, e) => s + (e.overpaid_amount || 0), 0);
                                return t > 0 ? `+${t.toLocaleString()}` : '—';
                            })()}
                        </td>
                        <td className="px-2 py-1.5 text-right bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">{fmt(sheet.totals.total_amount)}</td>
                        <td className="px-2 py-1.5 text-right bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">{fmt(sheet.totals.outstanding_amount)}</td>
                        <td colSpan={10} />
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */
export default function DailySheetsIndex({
    sheets, doctors, branches, filters, grandTotals, outstandingEntries, receptionRegistry,
}: Props) {
    const [tab, setTab]                 = useState<Tab>('sheets');
    const [expanded, setExpanded]       = useState<Set<number>>(new Set());
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
    const [expandedRec, setExpandedRec] = useState<Set<number>>(new Set());

    // ── Real-time: Polling-ийн оронд Reverb websocket ──
    // Аль ч салбар/огнооны өдрийн тооцоо өөрчлөгдөхөд 'daily-sheets-admin' суваг руу
    // 'sheet.updated' ирнэ → одоогийн шүүлтүүрээ хадгалан зөвхөн өгөгдлийн prop-уудыг шинэчилнэ.
    useEffect(() => {
        const Echo = (window as any).Echo;
        if (!Echo) return;
        let t: ReturnType<typeof setTimeout> | null = null;
        const refresh = () => {
            if (t) clearTimeout(t);
            t = setTimeout(() => {
                // reload нь default-аар preserveState + preserveScroll хийдэг
                router.reload({
                    only: ['sheets', 'grandTotals', 'outstandingEntries', 'receptionRegistry'],
                });
            }, 400);
        };
        const channel = Echo.private('daily-sheets-admin');
        channel.listen('.sheet.updated', refresh);
        return () => {
            if (t) clearTimeout(t);
            try { channel.stopListening('.sheet.updated', refresh); } catch { /* noop */ }
            Echo.leave('daily-sheets-admin');
        };
    }, []);

    type ModalAction = 'delete' | 'unlock' | 'delete-entry';
    const [actionTarget, setActionTarget] = useState<{ type: ModalAction; id: number } | null>(null);
    const [actionCode, setActionCode]     = useState('');
    const [actionError, setActionError]   = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const openModal  = (type: ModalAction, id: number) => { setActionTarget({ type, id }); setActionCode(''); setActionError(null); };
    const closeModal = () => { setActionTarget(null); setActionCode(''); setActionError(null); };
    const handleAction = () => {
        if (!actionTarget || !actionCode) return;
        setActionLoading(true);
        const cb = {
            onSuccess: () => closeModal(),
            onError: (errors: Record<string, string>) => setActionError(errors.code ?? 'Алдаа гарлаа.'),
            onFinish: () => setActionLoading(false),
        };
        if (actionTarget.type === 'delete') {
            router.delete(`/admin/daily-sheets/${actionTarget.id}`, { data: { code: actionCode }, ...cb });
        } else if (actionTarget.type === 'delete-entry') {
            router.delete(`/admin/daily-sheet-entries/${actionTarget.id}`, { data: { code: actionCode }, ...cb });
        } else {
            router.post(`/admin/daily-sheets/${actionTarget.id}/unlock`, { code: actionCode }, cb);
        }
    };

    const toggle = (id: number) => setExpanded(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const toggleDate = (d: string) => setExpandedDates(prev => {
        const next = new Set(prev);
        next.has(d) ? next.delete(d) : next.add(d);
        return next;
    });

    const toggleRec = (idx: number) => setExpandedRec(prev => {
        const next = new Set(prev);
        next.has(idx) ? next.delete(idx) : next.add(idx);
        return next;
    });

    const applyFilter = (patch: Partial<Filters>) => {
        router.get('/admin/daily-sheets', { ...filters, ...patch }, { preserveState: false });
    };

    /* ---------- Navigation ---------- */
    const prevDay   = () => applyFilter({ date: addDays(filters.date, -1) });
    const nextDay   = () => applyFilter({ date: addDays(filters.date, +1) });
    const prevMonth = () => applyFilter({ month: addMonths(filters.month, -1) });
    const nextMonth = () => applyFilter({ month: addMonths(filters.month, +1) });

    const periodLabel = filters.mode === 'day'
        ? dateLabelMn(filters.date)
        : monthLabelMn(filters.month);

    /* ---------- Month mode: group sheets by date ---------- */
    const sheetsByDate = sheets.reduce((acc, sheet) => {
        if (!acc[sheet.date]) acc[sheet.date] = [];
        acc[sheet.date].push(sheet);
        return acc;
    }, {} as Record<string, Sheet[]>);
    const sortedDates = Object.keys(sheetsByDate).sort((a, b) => b.localeCompare(a));

    /* ---------- Export ---------- */
    const exportExcel = (branchId?: number) => {
        const params = new URLSearchParams({
            mode: filters.mode,
            date: filters.date,
            month: filters.month,
        });
        if (filters.doctorId) params.set('doctor_id', filters.doctorId);
        const bid = branchId ?? (filters.branchId ? Number(filters.branchId) : undefined);
        if (bid) params.set('branch_id', String(bid));
        window.location.href = `/admin/daily-sheets/export-excel?${params}`;
    };

    const handlePrint = (branchId?: number, branchName?: string) => {
        const targetSheets = branchId ? sheets.filter(s => s.branch_id === branchId) : sheets;
        const totals       = branchId ? sumTotals(targetSheets) : grandTotals;
        const titleLabel   = branchId ? `${periodLabel} — ${branchName}` : periodLabel;

        const win = window.open('', '_blank', 'width=1280,height=900');
        if (!win) return;

        const rows = targetSheets.flatMap(sheet =>
            sheet.entries.map((e, i) => `
                <tr>
                    <td>${fmtDate(sheet.date)}</td>
                    <td>${sheet.branch ?? '—'}</td>
                    <td style="text-align:center">${i + 1}</td>
                    <td>${e.patient_name ?? '—'}</td>
                    <td style="text-align:center">${e.gender ?? ''}</td>
                    <td>${e.diagnosis ?? '—'}</td>
                    <td style="text-align:right">${e.discount > 0 ? e.discount.toLocaleString() : '—'}</td>
                    <td style="text-align:right">${e.mobile_amount > 0 ? e.mobile_amount.toLocaleString() : '—'}</td>
                    <td style="text-align:right">${e.card_amount > 0 ? e.card_amount.toLocaleString() : '—'}</td>
                    <td style="text-align:right">${e.cash_amount > 0 ? e.cash_amount.toLocaleString() : '—'}</td>
                    <td style="text-align:right">${e.storepay_amount > 0 ? e.storepay_amount.toLocaleString() : '—'}</td>
                    <td style="text-align:right">${e.overpaid_amount > 0 ? '+' + e.overpaid_amount.toLocaleString() : '—'}</td>
                    <td style="text-align:right;font-weight:bold">${e.total_amount.toLocaleString()}</td>
                    <td style="text-align:right">${e.outstanding_amount > 0 ? e.outstanding_amount.toLocaleString() : '—'}</td>
                    <td>${e.doctor_name ?? '—'}</td>
                    <td>${e.receptionist_name ?? '—'}</td>
                </tr>
            `)
        ).join('');

        win.document.write(`<!DOCTYPE html><html><head>
            <meta charset="UTF-8">
            <title>Өдрийн тооцоо — ${titleLabel}</title>
            <style>
                body{font-family:Arial,sans-serif;font-size:9pt;margin:10mm}
                h2{margin-bottom:8px;font-size:13pt}
                table{border-collapse:collapse;width:100%;margin-bottom:12px}
                th,td{border:1px solid #bbb;padding:3px 6px}
                th{background:#e8e8e8;font-size:8pt}
                tfoot td{background:#d8e8ff;font-weight:bold}
                @page{size:landscape;margin:10mm}
            </style>
            </head><body>
            <h2>Өдрийн тооцоо — ${titleLabel}</h2>
            <table>
                <thead><tr>
                    <th>Огноо</th><th>Салбар</th><th>№</th><th>Үйлчлүүлэгч</th><th>Хүйс</th>
                    <th>Оношилгоо/Эмчилгээ</th><th>Хөнгөлөлт</th><th>Мобайл</th><th>Карт</th><th>Бэлэн</th>
                    <th>Storepay</th><th>Илүү дүн</th><th>Нийт дүн</th><th>Дутуу</th><th>Эмч</th><th>Ресепшн</th>
                </tr></thead>
                <tbody>${rows}</tbody>
                <tfoot><tr>
                    <td colspan="6" style="text-align:right">Нийт дүн:</td>
                    <td style="text-align:right">${totals.discount.toLocaleString()}</td>
                    <td style="text-align:right">${totals.mobile_amount.toLocaleString()}</td>
                    <td style="text-align:right">${totals.card_amount.toLocaleString()}</td>
                    <td style="text-align:right">${totals.cash_amount.toLocaleString()}</td>
                    <td style="text-align:right">${totals.storepay_amount.toLocaleString()}</td>
                    <td style="text-align:right">${(() => { const t = targetSheets.reduce((s, sh) => s + sh.entries.reduce((a, e) => a + (e.overpaid_amount || 0), 0), 0); return t > 0 ? '+' + t.toLocaleString() : '—'; })()}</td>
                    <td style="text-align:right">${totals.total_amount.toLocaleString()}</td>
                    <td style="text-align:right">${totals.outstanding_amount.toLocaleString()}</td>
                    <td colspan="2"></td>
                </tr></tfoot>
            </table></body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
    };

    const unpaidCount = outstandingEntries.filter(e => !e.outstanding_paid_at).length;

    /* ---------------------------------------------------------------- */
    /*  Filter bar                                                       */
    /* ---------------------------------------------------------------- */
    const filterBar = (
        <div className="flex flex-wrap items-center gap-2">

            {/* Өдөр / Сар toggle */}
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-xs font-medium">
                <button
                    onClick={() => applyFilter({ mode: 'day' })}
                    className={`px-3 py-1.5 transition-colors ${
                        filters.mode === 'day'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}>
                    Өдөр
                </button>
                <button
                    onClick={() => applyFilter({ mode: 'month' })}
                    className={`px-3 py-1.5 border-l border-gray-300 dark:border-gray-600 transition-colors ${
                        filters.mode === 'month'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}>
                    Сар
                </button>
            </div>

            {/* Navigation */}
            {filters.mode === 'day' ? (
                <div className="flex items-center gap-1">
                    <button onClick={prevDay}
                        className="p-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <ChevronLeft className="size-4" />
                    </button>
                    <span className="text-sm font-semibold px-2 min-w-52 text-center">{periodLabel}</span>
                    <button onClick={nextDay}
                        className="p-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <ChevronRight className="size-4" />
                    </button>
                    <input
                        type="date"
                        value={filters.date}
                        onChange={e => applyFilter({ date: e.target.value })}
                        className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 outline-none ml-1"
                    />
                </div>
            ) : (
                <div className="flex items-center gap-1">
                    <button onClick={prevMonth}
                        className="p-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <ChevronLeft className="size-4" />
                    </button>
                    <span className="text-sm font-semibold px-2 min-w-40 text-center">{periodLabel}</span>
                    <button onClick={nextMonth}
                        className="p-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <ChevronRight className="size-4" />
                    </button>
                    <input
                        type="month"
                        value={filters.month}
                        onChange={e => applyFilter({ month: e.target.value })}
                        className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 outline-none ml-1"
                    />
                </div>
            )}

            {/* Doctor filter — all tabs */}
            <select
                value={filters.doctorId ?? ''}
                onChange={e => applyFilter({ doctorId: e.target.value || undefined })}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 outline-none">
                <option value="">— Бүх эмч —</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            <select
                value={filters.branchId ?? ''}
                onChange={e => applyFilter({ branchId: e.target.value || undefined })}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 outline-none">
                <option value="">— Бүх салбар —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            {tab === 'sheets' && (
                <div className="ml-auto flex items-center gap-2">
                    <ExportMenuButton
                        icon={<Download className="size-3.5" />}
                        label="Excel татах"
                        branches={branches}
                        colorCls="border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                        onAll={() => exportExcel()}
                        onBranch={(id) => exportExcel(id)}
                    />
                    <ExportMenuButton
                        icon={<Printer className="size-3.5" />}
                        label="Хэвлэх / PDF"
                        branches={branches}
                        colorCls="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onAll={() => handlePrint()}
                        onBranch={(id, name) => handlePrint(id, name)}
                    />
                </div>
            )}
        </div>
    );

    const emptyLabel = filters.mode === 'day' ? 'Энэ өдөр' : 'Энэ сард';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Өдрийн тооцоо" />

            <div className="flex flex-col gap-4 p-4 md:p-6">

                {filterBar}

                {/* Tabs */}
                <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700">
                    {([
                        { key: 'sheets',      label: 'Тооцооны жагсаалт' },
                        { key: 'outstanding', label: `Дутуу тооцоо${unpaidCount > 0 ? ` (${unpaidCount})` : ''}` },
                        { key: 'reception',   label: 'Ресепшний бүртгэл' },
                    ] as { key: Tab; label: string }[]).map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                tab === t.key
                                    ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Totals cards — always visible */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {[
                        { label: 'Мобайл',    value: grandTotals.mobile_amount,      color: 'text-gray-700 dark:text-gray-300',         prefix: '' },
                        { label: 'Карт',      value: grandTotals.card_amount,        color: 'text-gray-700 dark:text-gray-300',         prefix: '' },
                        { label: 'Бэлэн',     value: grandTotals.cash_amount,        color: 'text-gray-700 dark:text-gray-300',         prefix: '' },
                        { label: 'Storepay',  value: grandTotals.storepay_amount,    color: 'text-gray-700 dark:text-gray-300',         prefix: '' },
                        { label: 'Нийт дүн',  value: grandTotals.total_amount,       color: 'text-blue-700 dark:text-blue-400',         prefix: '' },
                        { label: 'Дутуу',     value: grandTotals.outstanding_amount, color: 'text-yellow-600 dark:text-yellow-400',     prefix: '' },
                        { label: 'Хөнгөлөлт', value: grandTotals.discount,           color: 'text-orange-600 dark:text-orange-400',     prefix: '-' },
                    ].map(({ label, value, color, prefix }) => (
                        <div key={label} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5">
                            <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                            <div className={`text-sm font-bold ${color}`}>{value > 0 ? `${prefix}${value.toLocaleString()}₮` : '—'}</div>
                        </div>
                    ))}
                </div>

                {/* ======================================================== */}
                {/* TAB 1 — Тооцооны жагсаалт                                */}
                {/* ======================================================== */}
                {tab === 'sheets' && (
                    <div className="flex flex-col gap-2">
                        {/* ---- DAY MODE: accordion per branch ---- */}
                        {filters.mode === 'day' && (
                            sheets.length === 0 ? (
                                <div className="text-center py-16 text-sm text-gray-400">{emptyLabel} тооцоо байхгүй байна.</div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {sheets.map(sheet => {
                                        const isOpen = expanded.has(sheet.id);
                                        return (
                                            <div key={sheet.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                                                <button
                                                    onClick={() => toggle(sheet.id)}
                                                    className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60">

                                                    <span className="text-sm font-semibold">{sheet.branch ?? 'Салбаргүй'}</span>

                                                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                                        {sheet.entries.length} бүртгэл
                                                    </span>

                                                    {sheet.morning_confirmed && (
                                                        <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                                                            ☀️ Өглөө · {sheet.morning_receptionist}
                                                        </span>
                                                    )}

                                                    {sheet.is_confirmed ? (
                                                        <span className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full">
                                                            🌙 Баталгаажсан · {sheet.receptionist}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full">
                                                            Засварлаж байна
                                                        </span>
                                                    )}

                                                    <div className="ml-auto flex items-center gap-4">
                                                        <div className="hidden sm:flex flex-wrap gap-2 text-xs text-gray-500">
                                                            {sheet.totals.mobile_amount > 0 && <span>Мобайл: {sheet.totals.mobile_amount.toLocaleString()}₮</span>}
                                                            {sheet.totals.card_amount > 0 && <span>Карт: {sheet.totals.card_amount.toLocaleString()}₮</span>}
                                                            {sheet.totals.cash_amount > 0 && <span>Бэлэн: {sheet.totals.cash_amount.toLocaleString()}₮</span>}
                                                            {sheet.totals.storepay_amount > 0 && <span>Storepay: {sheet.totals.storepay_amount.toLocaleString()}₮</span>}
                                                        </div>
                                                        <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                                                            Нийт: {sheet.totals.total_amount.toLocaleString()}₮
                                                        </span>
                                                        {sheet.totals.outstanding_amount > 0 && (
                                                            <span className="text-xs text-yellow-700 dark:text-yellow-400">
                                                                Дутуу: {sheet.totals.outstanding_amount.toLocaleString()}₮
                                                            </span>
                                                        )}
                                                        {isOpen ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
                                                    </div>
                                                </button>

                                                {isOpen && (
                                                    <div className="border-t border-gray-200 dark:border-gray-700">
                                                        <EntriesTable sheet={sheet} onDeleteEntry={(id) => openModal("delete-entry", id)} />
                                                        <div className="flex justify-end gap-2 px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                            {(sheet.is_confirmed || sheet.morning_confirmed) && (
                                                                <button onClick={() => openModal('unlock', sheet.id)}
                                                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                                                                    <LockOpen className="size-3.5" /> Нээх
                                                                </button>
                                                            )}
                                                            <button onClick={() => openModal('delete', sheet.id)}
                                                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                                <Trash2 className="size-3.5" /> Устгах
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}

                        {/* ---- MONTH MODE: accordion per date, sub-sections per branch ---- */}
                        {filters.mode === 'month' && (
                            sortedDates.length === 0 ? (
                                <div className="text-center py-16 text-sm text-gray-400">{emptyLabel} тооцоо байхгүй байна.</div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {sortedDates.map(d => {
                                        const dateSheets = sheetsByDate[d];
                                        const isOpen = expandedDates.has(d);
                                        const tot = sumTotals(dateSheets);
                                        const totalEntries = dateSheets.reduce((s, sh) => s + sh.entries.length, 0);

                                        return (
                                            <div key={d} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                                                {/* Date accordion header */}
                                                <button
                                                    onClick={() => toggleDate(d)}
                                                    className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60">

                                                    <span className="text-sm font-semibold min-w-28">{fmtDate(d)}</span>

                                                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                                        {totalEntries} бүртгэл
                                                    </span>

                                                    {/* Branch badges */}
                                                    <div className="flex flex-wrap gap-1">
                                                        {dateSheets.map(sh => (
                                                            <span key={sh.id} className={`text-xs px-2 py-0.5 rounded-full border ${
                                                                sh.is_confirmed
                                                                    ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                                                    : 'text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                                            }`}>
                                                                {sh.branch ?? 'Салбаргүй'}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    <div className="ml-auto flex items-center gap-4">
                                                        <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                                                            Нийт: {tot.total_amount.toLocaleString()}₮
                                                        </span>
                                                        {tot.outstanding_amount > 0 && (
                                                            <span className="text-xs text-yellow-700 dark:text-yellow-400">
                                                                Дутуу: {tot.outstanding_amount.toLocaleString()}₮
                                                            </span>
                                                        )}
                                                        {isOpen ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
                                                    </div>
                                                </button>

                                                {/* Date accordion body — per-branch sections */}
                                                {isOpen && (
                                                    <div className="border-t border-gray-200 dark:border-gray-700">
                                                        {dateSheets.map((sheet, si) => (
                                                            <div key={sheet.id}>
                                                                {/* Branch header (only if multiple branches) */}
                                                                {dateSheets.length > 1 && (
                                                                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                                            {sheet.branch ?? 'Салбаргүй'}
                                                                        </span>
                                                                        {sheet.morning_confirmed && (
                                                                            <span className="text-xs text-amber-600 dark:text-amber-400">
                                                                                ☀️ {sheet.morning_receptionist}
                                                                            </span>
                                                                        )}
                                                                        {sheet.is_confirmed ? (
                                                                            <span className="text-xs text-green-600 dark:text-green-400">
                                                                                🌙 Баталгаажсан · {sheet.receptionist}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-xs text-gray-400">Засварлаж байна</span>
                                                                        )}
                                                                        <span className="ml-auto text-xs text-blue-700 dark:text-blue-400 font-semibold">
                                                                            Нийт: {sheet.totals.total_amount.toLocaleString()}₮
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <EntriesTable sheet={sheet} onDeleteEntry={(id) => openModal("delete-entry", id)} />
                                                                <div className="flex justify-end gap-2 px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                                    {sheet.is_confirmed && (
                                                                        <button onClick={() => openModal('unlock', sheet.id)}
                                                                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                                                                            <LockOpen className="size-3.5" /> Нээх
                                                                        </button>
                                                                    )}
                                                                    <button onClick={() => openModal('delete', sheet.id)}
                                                                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                                        <Trash2 className="size-3.5" /> Устгах
                                                                    </button>
                                                                </div>
                                                                {si < dateSheets.length - 1 && (
                                                                    <div className="border-t-2 border-gray-200 dark:border-gray-600" />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* ======================================================== */}
                {/* TAB 2 — Дутуу тооцоо                                     */}
                {/* ======================================================== */}
                {tab === 'outstanding' && (
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-3">
                            <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2.5 min-w-40">
                                <div className="text-xs text-yellow-700 dark:text-yellow-400">Төлөгдөөгүй</div>
                                <div className="text-lg font-bold text-yellow-800 dark:text-yellow-300">
                                    {outstandingEntries.filter(e => !e.outstanding_paid_at).length} бүртгэл
                                </div>
                                <div className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                                    {outstandingEntries.filter(e => !e.outstanding_paid_at).reduce((s, e) => s + e.outstanding_amount, 0).toLocaleString()}₮
                                </div>
                            </div>
                            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-2.5 min-w-40">
                                <div className="text-xs text-green-700 dark:text-green-400">Төлөгдсөн</div>
                                <div className="text-lg font-bold text-green-800 dark:text-green-300">
                                    {outstandingEntries.filter(e => e.outstanding_paid_at).length} бүртгэл
                                </div>
                                <div className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                                    {outstandingEntries.filter(e => e.outstanding_paid_at).reduce((s, e) => s + e.outstanding_amount, 0).toLocaleString()}₮
                                </div>
                            </div>
                        </div>

                        {outstandingEntries.length === 0 ? (
                            <div className="text-center py-16 text-sm text-gray-400">{emptyLabel} дутуу тооцоо байхгүй байна.</div>
                        ) : (
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="text-xs border-collapse w-full">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                {filters.mode === 'month' && (
                                                    <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Огноо</th>
                                                )}
                                                <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Салбар</th>
                                                <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Үйлчлүүлэгч</th>
                                                <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Оношилгоо/Эмчилгээ</th>
                                                <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2 text-right">Дутуу дүн</th>
                                                <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Эмч</th>
                                                <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Ресепшн</th>
                                                <th className="border-b border-gray-200 dark:border-gray-700 px-3 py-2 text-center">Статус</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {outstandingEntries.map((e, i) => (
                                                <tr key={e.id} className={i % 2 === 0 ? '' : 'bg-gray-50/60 dark:bg-gray-800/30'}>
                                                    {filters.mode === 'month' && (
                                                        <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2">{fmtDate(e.date)}</td>
                                                    )}
                                                    <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2 text-gray-500">{e.branch ?? '—'}</td>
                                                    <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2 font-medium">{e.patient_name ?? '—'}</td>
                                                    <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2">{e.diagnosis ?? '—'}</td>
                                                    <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2 text-right font-semibold text-yellow-700 dark:text-yellow-400">
                                                        {e.outstanding_amount.toLocaleString()}₮
                                                    </td>
                                                    <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2">{e.doctor_name ? shortDoctorName(e.doctor_name) : '—'}</td>
                                                    <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2 text-gray-500">{e.receptionist_name ?? '—'}</td>
                                                    <td className="border-b border-gray-100 dark:border-gray-800 px-3 py-2 text-center">
                                                        {e.outstanding_paid_at ? (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                                                                    <CheckCircle className="size-3" />
                                                                    Төлөгдсөн
                                                                </span>
                                                                <span className="text-[10px] text-gray-400">{fmtDateTime(e.outstanding_paid_at)}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
                                                                <Clock className="size-3" />
                                                                Дутуу
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ======================================================== */}
                {/* TAB 3 — Ресепшний бүртгэл                                */}
                {/* ======================================================== */}
                {tab === 'reception' && (
                    <div className="flex flex-col gap-2">
                        {receptionRegistry.length === 0 ? (
                            <div className="text-center py-16 text-sm text-gray-400">{emptyLabel} бүртгэл байхгүй байна.</div>
                        ) : (
                            receptionRegistry.map((rec, idx) => {
                                const isOpen = expandedRec.has(idx);
                                return (
                                    <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                                        <button
                                            onClick={() => toggleRec(idx)}
                                            className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60">
                                            <span className="text-sm font-semibold">{rec.receptionist_name}</span>
                                            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                                {rec.total_entries} бүртгэл
                                            </span>
                                            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                                {rec.mobile_amount > 0 && <span>Мобайл: {rec.mobile_amount.toLocaleString()}₮</span>}
                                                {rec.card_amount > 0 && <span>Карт: {rec.card_amount.toLocaleString()}₮</span>}
                                                {rec.cash_amount > 0 && <span>Бэлэн: {rec.cash_amount.toLocaleString()}₮</span>}
                                                {rec.storepay_amount > 0 && <span>Storepay: {rec.storepay_amount.toLocaleString()}₮</span>}
                                            </div>
                                            <div className="ml-auto flex items-center gap-3">
                                                <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                                                    Нийт: {rec.total_amount.toLocaleString()}₮
                                                </span>
                                                {rec.outstanding_amount > 0 && (
                                                    <span className="text-xs text-yellow-700 dark:text-yellow-400">
                                                        Дутуу: {rec.outstanding_amount.toLocaleString()}₮
                                                    </span>
                                                )}
                                                {isOpen ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
                                            </div>
                                        </button>

                                        {isOpen && (
                                            <div className="border-t border-gray-200 dark:border-gray-700 overflow-x-auto">
                                                <table className="text-xs border-collapse w-full">
                                                    <thead>
                                                        <tr className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                            <th className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center w-8">№</th>
                                                            {filters.mode === 'month' && (
                                                                <th className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left">Огноо</th>
                                                            )}
                                                            <th className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left">Салбар</th>
                                                            <th className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left">Үйлчлүүлэгч</th>
                                                            <th className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center">Хүйс</th>
                                                            <th className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left">Оношилгоо/Эмчилгээ</th>
                                                            <th className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-right">Мобайл</th>
                                                            <th className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-right">Карт</th>
                                                            <th className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-right">Бэлэн</th>
                                                            <th className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-right">Storepay</th>
                                                            <th className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-right bg-blue-50 dark:bg-blue-900/20">Нийт дүн</th>
                                                            <th className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-right bg-yellow-50 dark:bg-yellow-900/20">Дутуу</th>
                                                            <th className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left">Эмч</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rec.entries.map((e, i) => (
                                                            <tr key={e.id} className={i % 2 === 0 ? '' : 'bg-gray-50/60 dark:bg-gray-800/30'}>
                                                                <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-center text-gray-400">{i + 1}</td>
                                                                {filters.mode === 'month' && (
                                                                    <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5">{fmtDate(e.date)}</td>
                                                                )}
                                                                <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-gray-500">{e.branch ?? '—'}</td>
                                                                <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5">{e.patient_name ?? '—'}</td>
                                                                <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-center">{e.gender ?? ''}</td>
                                                                <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5">{e.diagnosis ?? '—'}</td>
                                                                <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-right">{fmt(e.mobile_amount)}</td>
                                                                <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-right">{fmt(e.card_amount)}</td>
                                                                <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-right">{fmt(e.cash_amount)}</td>
                                                                <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-right">{fmt(e.storepay_amount)}</td>
                                                                <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-right font-semibold text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10">
                                                                    {fmt(e.total_amount)}
                                                                </td>
                                                                <td className={`border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 text-right bg-yellow-50/60 dark:bg-yellow-900/10 ${e.outstanding_amount > 0 ? 'text-yellow-700 dark:text-yellow-400 font-semibold' : ''}`}>
                                                                    {fmt(e.outstanding_amount)}
                                                                </td>
                                                                <td className="border-b border-gray-100 dark:border-gray-800 px-2 py-1.5">{e.doctor_name ? shortDoctorName(e.doctor_name) : '—'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="bg-gray-100 dark:bg-gray-800 font-semibold text-xs">
                                                            <td colSpan={filters.mode === 'month' ? 6 : 5} className="px-2 py-1.5 text-right text-gray-600 dark:text-gray-400">Нийт</td>
                                                            <td className="px-2 py-1.5 text-right">{fmt(rec.mobile_amount)}</td>
                                                            <td className="px-2 py-1.5 text-right">{fmt(rec.card_amount)}</td>
                                                            <td className="px-2 py-1.5 text-right">{fmt(rec.cash_amount)}</td>
                                                            <td className="px-2 py-1.5 text-right">{fmt(rec.storepay_amount)}</td>
                                                            <td className="px-2 py-1.5 text-right bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">{fmt(rec.total_amount)}</td>
                                                            <td className="px-2 py-1.5 text-right bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">{fmt(rec.outstanding_amount)}</td>
                                                            <td />
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

            </div>

            {/* PIN confirmation modal */}
            {actionTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                {actionTarget.type === 'delete' ? 'Тооцоо устгах' : actionTarget.type === 'delete-entry' ? 'Мөр устгах' : 'Тооцоо нээх'}
                            </h3>
                            <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="size-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="px-5 py-4 flex flex-col gap-3">
                            <p className="text-xs text-gray-500">
                                {actionTarget.type === 'delete'
                                    ? 'Энэ тооцоог устгахын тулд хамгаалалтын кодыг оруулна уу.'
                                    : actionTarget.type === 'delete-entry'
                                        ? 'Энэ мөрийг устгахын тулд хамгаалалтын кодыг оруулна уу.'
                                        : 'Тооцоог засварлахаар нээхийн тулд хамгаалалтын кодыг оруулна уу.'}
                            </p>
                            <input
                                type="password"
                                value={actionCode}
                                onChange={e => setActionCode(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAction()}
                                placeholder="Код оруулах..."
                                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                            {actionError && (
                                <p className="text-xs text-red-600 dark:text-red-400">{actionError}</p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                            <button onClick={closeModal}
                                className="text-xs px-4 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                Болих
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={!actionCode || actionLoading}
                                className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                                    actionTarget.type === 'unlock'
                                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                }`}>
                                {actionLoading ? 'Түр хүлээнэ үү...' : actionTarget.type === 'unlock' ? 'Нээх' : 'Устгах'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
