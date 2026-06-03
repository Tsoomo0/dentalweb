import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, FileSpreadsheet, Lock, Plus, Save, Trash2, Unlock, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface BonusRun {
    id: number; title: string;
    year: number; month: number;
    half: 'first' | 'second'; half_label: string;
    label: string | null; status: 'draft' | 'final'; notes: string | null;
    branch_name: string | null;
    employee_id: number | null;
    employee_name: string | null;
    employee_position: string | null;
}
interface EntryRow {
    id: number; date: string;
    doctor_id: number | null; doctor_name: string | null;
    doctor_ids: number[]; doctor_names: string[];
    clothing: number; hand_hygiene: number; chair_sterilization: number;
    equipment_prep: number; material_prep: number;
    visit_count: number;
    card_issued: number; card_collected: number;
    pre_exam_prep: number; exam_chair_prep: number;
    post_exam_chair_sterilize: number; tube_sterilization: number; suction_filter: number;
    quartz_before: number; quartz_after: number; xray: number; model_cast: number;
    implant: number; blood_pressure: number; complaint: number; absent: number;
    total_amount: number; is_sent: boolean;
}
interface Doctor { id: number; name: string }
interface CriterionDef { label: string; unit: string; price: number }
type CriteriaMap = Record<string, CriterionDef>;
interface Props { run: BonusRun; entries: EntryRow[]; doctors: Doctor[]; criteria: CriteriaMap }

const PRE_KEYS = ['clothing', 'hand_hygiene', 'chair_sterilization', 'equipment_prep', 'material_prep'] as const;
const POST_KEYS = [
    'card_issued', 'card_collected', 'pre_exam_prep', 'exam_chair_prep',
    'post_exam_chair_sterilize', 'tube_sterilization', 'suction_filter',
    'quartz_before', 'quartz_after', 'xray', 'model_cast', 'implant',
    'blood_pressure', 'complaint', 'absent',
] as const;
const DEDUCT_KEYS = ['complaint', 'absent'] as const;
const KEYS = [...PRE_KEYS, ...POST_KEYS] as const;
type CKey = typeof KEYS[number];

function calcNiilberOnoo(entry: EntryRow): number {
    const sum = PRE_KEYS.reduce((acc, k) => acc + (entry[k] || 0), 0);
    return (entry.visit_count || 0) * sum;
}

function calcTotal(entry: EntryRow): number {
    const niilber = calcNiilberOnoo(entry);
    const postAdd = POST_KEYS
        .filter(k => !(DEDUCT_KEYS as readonly string[]).includes(k))
        .reduce((acc, k) => acc + (entry[k] || 0), 0);
    const deduct = DEDUCT_KEYS.reduce((acc, k) => acc + (entry[k] || 0) * 10000, 0);
    return niilber + postAdd - deduct;
}

function fmtDay(date: string): string {
    const parts = date.split('-');
    return `${parseInt(parts[1])}.${parseInt(parts[2]).toString().padStart(2, '0')}`;
}

function CountCell({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled: boolean }) {
    const [str, setStr] = useState(value === 0 ? '' : String(value));
    useEffect(() => { setStr(value === 0 ? '' : String(value)); }, [value]);
    if (disabled) return <div className="px-1.5 py-2 text-right text-[11px] tabular-nums text-muted-foreground">{value || ''}</div>;
    return (
        <input type="number" min={0} value={str}
            onChange={e => { setStr(e.target.value); const n = parseInt(e.target.value); if (!isNaN(n)) onChange(n); }}
            onBlur={() => { const n = parseInt(str); if (isNaN(n) || n === 0) { setStr(''); onChange(0); } else setStr(String(n)); }}
            placeholder="0"
            className="w-full min-w-[48px] rounded border-0 bg-transparent px-1.5 py-2 text-right text-[11px] tabular-nums outline-none focus:bg-violet-50 dark:focus:bg-violet-950/30 focus:ring-1 focus:ring-ring" />
    );
}

function defaultDateForHalf(run: BonusRun): string {
    const m = String(run.month).padStart(2, '0');
    const day = run.half === 'first' ? '01' : '16';
    return `${run.year}-${m}-${day}`;
}

export default function NurseBonusShow({ run, entries: initial, doctors, criteria }: Props) {
    const [entries, setEntries] = useState<EntryRow[]>(initial.map(e => ({
        ...e,
        doctor_ids:   Array.isArray(e.doctor_ids) ? e.doctor_ids : (e.doctor_id ? [e.doctor_id] : []),
        doctor_names: Array.isArray(e.doctor_names) ? e.doctor_names : (e.doctor_name ? [e.doctor_name] : []),
    })));
    const [saving, setSaving]   = useState(false);
    const [saved, setSaved]     = useState(false);
    const [newDate, setNewDate] = useState<string>(defaultDateForHalf(run));
    const [adding, setAdding]   = useState(false);
    const [openDocPicker, setOpenDocPicker] = useState<number | null>(null); // entry idx
    const tableRef = useRef<HTMLDivElement>(null);

    const isFinal = run.status === 'final';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'HR', href: '/hr/employees' },
        { title: 'Сувилагчийн урамшуулал', href: '/hr/nurse-bonus' },
        { title: run.title, href: `/hr/nurse-bonus/${run.id}` },
    ];

    useEffect(() => {
        setEntries(prev => {
            const prevIds = prev.map(e => e.id).join(',');
            const nextIds = initial.map(e => e.id).join(',');
            const normalize = (e: EntryRow) => ({
                ...e,
                doctor_ids:   Array.isArray(e.doctor_ids) ? e.doctor_ids : (e.doctor_id ? [e.doctor_id] : []),
                doctor_names: Array.isArray(e.doctor_names) ? e.doctor_names : (e.doctor_name ? [e.doctor_name] : []),
            });
            if (prevIds === nextIds) return prev;
            return initial.map(srv => {
                const local = prev.find(p => p.id === srv.id);
                return local ? normalize({ ...srv, ...local }) : normalize({ ...srv });
            });
        });
    }, [initial]);

    function setField(idx: number, field: CKey | 'visit_count' | 'doctor_id', value: number | null) {
        setSaved(false);
        setEntries(prev => prev.map((e, i) => {
            if (i !== idx) return e;
            const updated = { ...e, [field]: value as never };
            updated.total_amount = calcTotal(updated);
            return updated;
        }));
    }

    function toggleDoctor(idx: number, doctorId: number) {
        setSaved(false);
        setEntries(prev => prev.map((e, i) => {
            if (i !== idx) return e;
            const has = e.doctor_ids.includes(doctorId);
            const ids = has ? e.doctor_ids.filter(d => d !== doctorId) : [...e.doctor_ids, doctorId];
            const names = ids
                .map(id => doctors.find(d => d.id === id)?.name)
                .filter((n): n is string => !!n);
            return { ...e, doctor_ids: ids, doctor_names: names, doctor_id: ids[0] ?? null };
        }));
    }

    function removeDoctor(idx: number, doctorId: number) { toggleDoctor(idx, doctorId); }

    function save() {
        setSaving(true);
        router.put(`/hr/nurse-bonus/${run.id}`, { entries: entries.map(e => ({ ...e })) } as never, {
            onSuccess: () => setSaved(true),
            onFinish:  () => setSaving(false),
        });
    }
    function finalize() { router.patch(`/hr/nurse-bonus/${run.id}/finalize`, { entries: entries.map(e => ({ ...e })) } as never); }
    function reopen()   { router.patch(`/hr/nurse-bonus/${run.id}/reopen`); }

    function addRow() {
        if (!newDate) return;
        setAdding(true);
        router.post(`/hr/nurse-bonus/${run.id}/entries`, { date: newDate } as never, {
            preserveScroll: true,
            onFinish: () => setAdding(false),
        });
    }

    function removeRow(entryId: number) {
        if (!confirm('Энэ мөрийг устгах уу?')) return;
        router.delete(`/hr/nurse-bonus/${run.id}/entries/${entryId}`, { preserveScroll: true });
    }

    function StatusBadge() {
        if (isFinal) return (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="size-3" /> Баталгаажсан
            </span>
        );
        if (saved) return (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                <Save className="size-3" /> Хадгалсан
            </span>
        );
        return <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">Ноорог</span>;
    }

    const criteriaList = Object.entries(criteria) as [CKey, CriterionDef][];
    const grandTotal = entries.reduce((s, e) => s + (e.total_amount || 0), 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={run.title} />

            <div className="flex flex-col gap-4 p-4">
                {/* Header info block */}
                <div className="rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/60 via-white to-fuchsia-50/40 dark:from-violet-950/30 dark:via-gray-900 dark:to-fuchsia-950/20 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-4 gap-4 border-b border-violet-100/60 dark:border-violet-900/40">
                        <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Ажилтны нэр</p>
                            <p className="text-sm font-bold text-foreground mt-0.5">{run.employee_name ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Албан тушаал</p>
                            <p className="text-sm font-bold text-foreground mt-0.5">{run.employee_position ?? 'Сувилагч'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Салбар</p>
                            <p className="text-sm font-bold text-foreground mt-0.5">{run.branch_name ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Хугацаа</p>
                            <p className="text-sm font-bold text-foreground mt-0.5">
                                {run.year} оны {run.month}-р сар · {run.half === 'first' ? '1–15' : '16–31'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                        <div className="inline-flex items-center gap-2">
                            <h1 className="text-base font-bold text-foreground">{run.title}</h1>
                            <StatusBadge />
                        </div>
                        <div className="flex items-center gap-2">
                            <a href={`/hr/nurse-bonus/${run.id}/excel`} target="_blank"
                                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors">
                                <FileSpreadsheet className="size-3.5" /> Excel
                            </a>
                            {isFinal ? (
                                <button onClick={reopen}
                                    className="flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors">
                                    <Unlock className="size-3.5" /> Нээх
                                </button>
                            ) : (
                                <>
                                    <button onClick={save} disabled={saving}
                                        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50">
                                        {saving
                                            ? <span className="size-3 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
                                            : <Save className="size-3.5" />}
                                        Хадгал
                                    </button>
                                    <button onClick={finalize}
                                        className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors">
                                        <Lock className="size-3.5" /> Баталгаажуул
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Мөр нэмэх */}
                {!isFinal && (
                    <div className="rounded-xl border border-dashed border-violet-300/60 dark:border-violet-800/40 bg-violet-50/30 dark:bg-violet-950/10 px-4 py-2.5 flex flex-wrap items-center gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">Мөр нэмэх</span>
                        <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                            className="rounded-lg border bg-background px-2.5 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-violet-500" />
                        <button onClick={addRow} disabled={adding || !newDate}
                            className="inline-flex items-center gap-1 rounded-lg bg-violet-600 hover:bg-violet-700 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors disabled:opacity-50">
                            {adding ? <span className="size-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Plus className="size-3.5" />}
                            Нэмэх
                        </button>
                        <span className="text-[10px] text-muted-foreground ml-auto">Ажилласан өдрөө сонгоод нэмнэ. Хоосон өдөр оруулах шаардлагагүй.</span>
                    </div>
                )}

                {/* Excel-style daily table */}
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div ref={tableRef} className="overflow-x-auto premium-scroll">
                        <table className="w-full border-collapse text-[11px]">
                            <thead>
                                <tr className="bg-muted/40">
                                    <th className="sticky left-0 z-10 bg-muted/40 border-r px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide min-w-[58px]">Сар.өдөр</th>
                                    <th className="sticky left-[58px] z-10 bg-muted/40 border-r px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide min-w-[140px]">Гарсан эмч</th>
                                    {criteriaList.map(([key, c], i) => {
                                        const isAfterPre = key === 'material_prep';
                                        return [
                                            <th key={key} className={`border-r px-1 py-1.5 text-center min-w-[68px] ${(PRE_KEYS as readonly string[]).includes(key) ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''}`}>
                                                <p className="text-[10px] font-semibold leading-tight">{c.label}</p>
                                                <p className="text-[9px] text-muted-foreground mt-0.5">{Math.abs(c.price).toLocaleString()}₮/{c.unit}</p>
                                            </th>,
                                            isAfterPre && (
                                                <>
                                                    <th key="visit_count" className="border-r border-l-2 border-l-blue-300 dark:border-l-blue-700 px-1 py-1.5 text-center bg-blue-50/50 dark:bg-blue-950/20 min-w-[68px]">
                                                        <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400">Үзлэгийн тоо</p>
                                                    </th>
                                                    <th key="niilber" className="border-r px-1 py-1.5 text-center bg-emerald-50/50 dark:bg-emerald-950/20 min-w-[80px]">
                                                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Нийлбэр оноо</p>
                                                    </th>
                                                </>
                                            ),
                                        ];
                                    })}
                                    <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-400 bg-yellow-100 dark:bg-yellow-900/20 min-w-[90px]">Нийт ₮</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {entries.length === 0 && (
                                    <tr>
                                        <td colSpan={criteriaList.length + 5} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                                            Мөр алга. Дээрх <span className="font-semibold text-violet-700 dark:text-violet-400">"Мөр нэмэх"</span> хэсгээс ажилласан өдрөө нэмнэ үү.
                                        </td>
                                    </tr>
                                )}
                                {entries.map((e, idx) => {
                                    const niilber = calcNiilberOnoo(e);
                                    return (
                                        <tr key={e.id} className="group hover:bg-muted/15">
                                            <td className="sticky left-0 z-10 bg-card border-r px-2 py-1.5 text-center text-[11px] font-semibold tabular-nums relative">
                                                <span>{fmtDay(e.date)}</span>
                                                {!isFinal && (
                                                    <button onClick={() => removeRow(e.id)} title="Мөр устгах"
                                                        className="absolute right-0.5 top-1/2 -translate-y-1/2 size-4 rounded hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Trash2 className="size-2.5" />
                                                    </button>
                                                )}
                                            </td>
                                            <td className="sticky left-[58px] z-10 bg-card border-r px-1.5 py-1">
                                                <DoctorMultiSelect
                                                    isFinal={isFinal}
                                                    selectedIds={e.doctor_ids}
                                                    selectedNames={e.doctor_names}
                                                    doctors={doctors}
                                                    isOpen={openDocPicker === idx}
                                                    onToggleOpen={() => setOpenDocPicker(p => p === idx ? null : idx)}
                                                    onClose={() => setOpenDocPicker(null)}
                                                    onToggle={(docId) => toggleDoctor(idx, docId)}
                                                    onRemove={(docId) => removeDoctor(idx, docId)}
                                                />
                                            </td>
                                            {criteriaList.map(([key], i) => {
                                                const isPre = (PRE_KEYS as readonly string[]).includes(key);
                                                const cell = (
                                                    <td key={key} className={`border-r ${isPre ? 'bg-blue-50/15 dark:bg-blue-950/5' : ''}`}>
                                                        <CountCell value={e[key] as number} disabled={isFinal} onChange={v => setField(idx, key, v)} />
                                                    </td>
                                                );
                                                if (key === 'material_prep') {
                                                    return [
                                                        cell,
                                                        <td key="visit_count" className="border-r border-l-2 border-l-blue-300 dark:border-l-blue-700 bg-blue-50/30 dark:bg-blue-950/10">
                                                            <CountCell value={e.visit_count || 0} disabled={isFinal} onChange={v => setField(idx, 'visit_count', v)} />
                                                        </td>,
                                                        <td key="niilber" className="border-r px-2 py-2 text-right text-[11px] tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10">
                                                            {niilber ? niilber.toLocaleString() : '—'}
                                                        </td>,
                                                    ];
                                                }
                                                return cell;
                                            })}
                                            <td className="px-2 py-2 text-right text-[11px] tabular-nums font-bold text-violet-700 dark:text-violet-400 bg-yellow-50/40 dark:bg-yellow-950/10">
                                                {e.total_amount ? Math.round(e.total_amount).toLocaleString() : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 bg-muted/50 font-bold">
                                    <td className="sticky left-0 z-10 bg-muted/50 border-r px-2 py-2 text-center text-[10px] uppercase">Нийт</td>
                                    <td className="sticky left-[58px] z-10 bg-muted/50 border-r" />
                                    {KEYS.map(key => {
                                        const total = entries.reduce((s, e) => s + ((e[key as keyof EntryRow] as number) || 0), 0);
                                        const cell = <td key={key} className="border-r px-2 py-2 text-right text-[11px] tabular-nums text-muted-foreground">{total || ''}</td>;
                                        if (key === 'material_prep') {
                                            const totalVisit = entries.reduce((s, e) => s + (e.visit_count || 0), 0);
                                            const totalNiilber = entries.reduce((s, e) => s + calcNiilberOnoo(e), 0);
                                            return [
                                                cell,
                                                <td key="vc" className="border-r border-l-2 border-l-blue-300 dark:border-l-blue-700 px-2 py-2 text-right text-[11px] tabular-nums text-blue-700 dark:text-blue-400 bg-blue-50/40">{totalVisit || ''}</td>,
                                                <td key="nb" className="border-r px-2 py-2 text-right text-[11px] tabular-nums font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/40">{totalNiilber ? totalNiilber.toLocaleString() : ''}</td>,
                                            ];
                                        }
                                        return cell;
                                    })}
                                    <td className="px-2 py-2 text-right text-[12px] tabular-nums font-bold text-violet-700 dark:text-violet-400 bg-yellow-200/60 dark:bg-yellow-800/30">
                                        {Math.round(grandTotal).toLocaleString()}₮
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <p className="text-[10px] text-muted-foreground text-center">
                    💡 Сар.өдөр болон Гарсан эмч баганууд хадуурахгүй sticky · Хадгалах товч даран хадгална
                </p>
            </div>

            <ToastContainer />
        </AppLayout>
    );
}

/* ─────────────────────────────────────────────────────────────
   DoctorMultiSelect — chip + popover (олон эмч сонгох)
───────────────────────────────────────────────────────────── */
interface DoctorMultiSelectProps {
    isFinal: boolean;
    selectedIds: number[];
    selectedNames: string[];
    doctors: Doctor[];
    isOpen: boolean;
    onToggleOpen: () => void;
    onClose: () => void;
    onToggle: (doctorId: number) => void;
    onRemove: (doctorId: number) => void;
}

function DoctorMultiSelect({
    isFinal, selectedIds, selectedNames, doctors,
    isOpen, onToggleOpen, onClose, onToggle, onRemove,
}: DoctorMultiSelectProps) {
    const [filter, setFilter] = useState('');
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popRef = useRef<HTMLDivElement>(null);
    const [popPos, setPopPos] = useState<{ top: number; left: number } | null>(null);

    // Popover-ийн координатыг calculation хийнэ
    useEffect(() => {
        if (!isOpen || !triggerRef.current) return;
        const POP_W = 240;
        const POP_H = 320;
        function place() {
            const r = triggerRef.current!.getBoundingClientRect();
            let top  = r.bottom + 4;
            let left = r.left;
            if (left + POP_W > window.innerWidth - 8)  left = window.innerWidth - POP_W - 8;
            if (top  + POP_H > window.innerHeight - 8) top  = Math.max(8, r.top - POP_H - 4);
            setPopPos({ top, left });
        }
        place();
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        return () => {
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        function onDocClick(e: MouseEvent) {
            const t = e.target as Node;
            if (triggerRef.current?.contains(t)) return;
            if (popRef.current?.contains(t))    return;
            onClose();
        }
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [isOpen, onClose]);

    const filteredDoctors = filter.trim()
        ? doctors.filter(d => d.name.toLowerCase().includes(filter.trim().toLowerCase()))
        : doctors;

    // Locked view: just chips
    if (isFinal) {
        return (
            <div className="flex flex-wrap gap-1 py-1">
                {selectedNames.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground">—</span>
                ) : selectedNames.map((n, i) => (
                    <span key={i} className="inline-flex items-center rounded bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 text-[10px] font-medium">
                        {n}
                    </span>
                ))}
            </div>
        );
    }

    return (
        <>
            <button ref={triggerRef} type="button" onClick={onToggleOpen}
                className="w-full min-h-[26px] flex flex-wrap items-center gap-1 rounded px-1.5 py-1 text-left text-[11px] hover:bg-violet-50/50 dark:hover:bg-violet-950/20 outline-none transition-colors">
                {selectedIds.length === 0 ? (
                    <span className="text-muted-foreground">— сонго —</span>
                ) : (
                    selectedIds.map(id => {
                        const name = doctors.find(d => d.id === id)?.name ?? `#${id}`;
                        return (
                            <span key={id}
                                className="inline-flex items-center gap-0.5 rounded bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 pl-1.5 pr-0.5 py-0.5 text-[10px] font-medium">
                                {name}
                                <button type="button"
                                    onClick={(ev) => { ev.stopPropagation(); onRemove(id); }}
                                    className="rounded-full p-0.5 hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors"
                                    title="Хасах">
                                    <X className="size-2.5" />
                                </button>
                            </span>
                        );
                    })
                )}
            </button>

            {isOpen && popPos && typeof document !== 'undefined' && createPortal(
                <div ref={popRef}
                    style={{ position: 'fixed', top: popPos.top, left: popPos.left, width: 240, maxHeight: 320, zIndex: 9999 }}
                    className="rounded-lg border bg-popover text-popover-foreground shadow-xl overflow-hidden flex flex-col">
                    <div className="border-b p-1.5 bg-background">
                        <input
                            autoFocus
                            value={filter}
                            onChange={ev => setFilter(ev.target.value)}
                            placeholder="Эмчийн нэрээр хайх..."
                            className="w-full rounded border bg-background px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-violet-500"
                        />
                    </div>
                    <ul className="overflow-y-auto flex-1 py-1 bg-popover">
                        {filteredDoctors.length === 0 && (
                            <li className="px-3 py-2 text-[11px] text-muted-foreground italic">
                                {doctors.length === 0 ? 'Энэ салбарт эмч холбогдоогүй байна' : 'Эмч олдсонгүй'}
                            </li>
                        )}
                        {filteredDoctors.map(d => {
                            const checked = selectedIds.includes(d.id);
                            return (
                                <li key={d.id}>
                                    <button type="button" onClick={() => onToggle(d.id)}
                                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-left transition-colors ${
                                            checked
                                                ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold'
                                                : 'hover:bg-muted'
                                        }`}>
                                        <span className={`size-3.5 rounded border flex items-center justify-center transition-colors ${
                                            checked ? 'bg-violet-600 border-violet-600' : 'border-gray-300 dark:border-gray-600'
                                        }`}>
                                            {checked && <CheckCircle2 className="size-3 text-white" />}
                                        </span>
                                        <span className="flex-1 truncate">{d.name}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="border-t bg-muted/30 px-2 py-1 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                            {selectedIds.length} сонгогдсон / нийт {doctors.length}
                        </span>
                        <button type="button" onClick={onClose}
                            className="text-[10px] text-violet-700 dark:text-violet-400 hover:underline font-semibold">
                            Хаах
                        </button>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
