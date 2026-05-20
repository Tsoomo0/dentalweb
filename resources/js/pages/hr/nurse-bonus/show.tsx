import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, ChevronDown, ChevronUp, FileSpreadsheet, Lock, Plus, Save, Send, Unlock, UserMinus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface BonusRun {
    id: number; title: string; date: string | null;
    year: number; month: number;
    half: 'first' | 'second'; half_label: string;
    label: string | null; status: 'draft' | 'final'; notes: string | null;
}
interface AvailableEmployee { id: number; name: string; employee_number: string }
interface EntryRow {
    id: number; employee_id: number; name: string;
    employee_number: string; position: string | null;
    clothing: number; hand_hygiene: number; chair_sterilization: number;
    equipment_prep: number; material_prep: number;
    visit_count: number;
    card_issued: number;
    card_collected: number; pre_exam_prep: number; exam_chair_prep: number;
    post_exam_chair_sterilize: number; tube_sterilization: number; suction_filter: number;
    quartz_before: number; quartz_after: number; xray: number; model_cast: number;
    implant: number; blood_pressure: number; complaint: number; absent: number;
    total_amount: number; is_sent: boolean;
}
interface CriterionDef { label: string; unit: string; price: number }
type CriteriaMap = Record<string, CriterionDef>;
interface Props { run: BonusRun; entries: EntryRow[]; criteria: CriteriaMap; available_employees: AvailableEmployee[] }

const PRE_KEYS = [
    'clothing', 'hand_hygiene', 'chair_sterilization', 'equipment_prep', 'material_prep',
] as const;
const POST_KEYS = [
    'card_issued', 'card_collected', 'pre_exam_prep', 'exam_chair_prep',
    'post_exam_chair_sterilize', 'tube_sterilization', 'suction_filter',
    'quartz_before', 'quartz_after', 'xray', 'model_cast', 'implant',
    'blood_pressure', 'complaint', 'absent',
] as const;
const KEYS = [...PRE_KEYS, ...POST_KEYS] as const;
type CKey = typeof KEYS[number];

function fmtMoney(n: number) {
    if (!n) return '';
    return Math.round(n).toLocaleString('en-US');
}

function calcNiilberOnoo(entry: EntryRow): number {
    const sumCounts = PRE_KEYS.reduce((acc, k) => acc + (entry[k] || 0), 0);
    return (entry.visit_count || 0) * sumCounts;
}

const DEDUCT_KEYS = ['complaint', 'absent'] as const;

function calcTotal(entry: EntryRow, _criteria: CriteriaMap): number {
    const niilberOnoo = calcNiilberOnoo(entry);
    // Нийлбэр оноогоос хойших баганууд: зөвхөн count нэмнэ
    const postAdd = POST_KEYS
        .filter(k => !(DEDUCT_KEYS as readonly string[]).includes(k))
        .reduce((acc, k) => acc + (entry[k] || 0), 0);
    // complaint, absent: 10,000 оноо тус бүр хасна
    const deduct = DEDUCT_KEYS.reduce((acc, k) => acc + (entry[k] || 0) * 10000, 0);
    return niilberOnoo + postAdd - deduct;
}

function CountCell({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled: boolean }) {
    const [str, setStr] = useState(value === 0 ? '' : String(value));
    if (disabled) return <div className="px-2 py-2 text-right text-xs tabular-nums text-muted-foreground">{value || ''}</div>;
    return (
        <input type="number" min={0} value={str}
            onChange={e => { setStr(e.target.value); const n = parseInt(e.target.value); if (!isNaN(n)) onChange(n); }}
            onBlur={() => { const n = parseInt(str); if (isNaN(n)||n===0){setStr('');onChange(0);}else setStr(String(n)); }}
            placeholder="0"
            className="w-full min-w-[56px] rounded border-0 bg-transparent px-2 py-2 text-right text-xs tabular-nums outline-none focus:bg-muted/50 focus:ring-1 focus:ring-ring"
        />
    );
}

function MobileCountInput({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled: boolean }) {
    const [str, setStr] = useState(value === 0 ? '' : String(value));
    if (disabled) return <span className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300">{value || '—'}</span>;
    return (
        <input type="number" min={0} inputMode="numeric" value={str}
            onChange={e => { setStr(e.target.value); const n = parseInt(e.target.value); if (!isNaN(n)) onChange(n); }}
            onBlur={() => { const n = parseInt(str); if (isNaN(n)||n===0){setStr('');onChange(0);}else setStr(String(n)); }}
            placeholder="0"
            className="w-20 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-1.5 text-sm text-right tabular-nums text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-violet-400"
        />
    );
}

function MobileEntryCard({ entry, idx, criteria, isFinal, runId, onSetField }: {
    entry: EntryRow; idx: number; criteria: CriteriaMap;
    isFinal: boolean; runId: number;
    onSetField: (idx: number, key: CKey, v: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const criteriaList = Object.entries(criteria) as [CKey, CriterionDef][];

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <button onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-4 text-left active:bg-gray-50 dark:active:bg-zinc-800 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-pink-100 dark:bg-pink-950/40 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-pink-600 dark:text-pink-400">{entry.name.slice(0,2)}</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{entry.name}</p>
                            {entry.is_sent && <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">{entry.position ?? entry.employee_number}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500">Нийт</p>
                        <p className="text-sm font-bold text-violet-600 dark:text-violet-400">
                            {entry.total_amount ? fmtMoney(entry.total_amount) + '₮' : '—'}
                        </p>
                    </div>
                    {open ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
                </div>
            </button>

            {open && (
                <div className="border-t border-gray-100 dark:border-zinc-800 px-4 py-4 space-y-3">
                    <div className="rounded-2xl bg-gray-50 dark:bg-zinc-800 overflow-hidden">
                        {criteriaList.map(([key, c], i) => {
                            const count = entry[key as keyof EntryRow] as number || 0;
                            const amount = count * c.price;
                            return (
                                <div key={key} className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-700 last:border-0 ${i % 2 === 0 ? '' : 'bg-white/50 dark:bg-zinc-700/30'}`}>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug">{c.label}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                                            {c.price < 0 ? `-${Math.abs(c.price).toLocaleString('en-US')}₮` : `+${c.price.toLocaleString('en-US')}₮`} / {c.unit}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <MobileCountInput value={count} disabled={isFinal} onChange={v => onSetField(idx, key, v)} />
                                        <span className={`w-18 text-right text-xs tabular-nums font-semibold ${amount < 0 ? 'text-red-600' : amount > 0 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300'}`}>
                                            {amount ? Math.round(amount).toLocaleString('en-US') + '₮' : '—'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="flex items-center justify-between px-4 py-3 bg-violet-50 dark:bg-violet-950/30 border-t-2 border-violet-200 dark:border-violet-800">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Нийт</span>
                            <span className="text-sm font-bold text-violet-700 dark:text-violet-400 tabular-nums">
                                {entry.total_amount ? fmtMoney(entry.total_amount) + '₮' : '—'}
                            </span>
                        </div>
                    </div>

                    {!isFinal && !entry.is_sent && (
                        <button onClick={() => router.post(`/hr/nurse-bonus/${runId}/entries/${entry.id}/send`)}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3 text-sm font-semibold text-white active:scale-[0.98] transition-transform">
                            <Send className="size-4" /> Илгээх
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default function NurseBonusShow({ run, entries: initial, criteria, available_employees }: Props) {
    const [entries, setEntries] = useState<EntryRow[]>(initial.map(e => ({ ...e })));
    const [saving, setSaving]   = useState(false);
    const [saved, setSaved]     = useState(false);
    const [scrollEdge, setScrollEdge] = useState({ left: false, right: true });
    const [showAddEmp, setShowAddEmp] = useState(false);
    const [removeEmpId, setRemoveEmpId] = useState<number | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    // Inertia-аас шинэ entries prop ирэхэд (ажилтан нэмэх/хасах үед) local state-ийг шинэчлэнэ.
    // Зөвхөн мөрүүдийн ID-ийн жагсаалт өөрчлөгдсөн үед бүрэн солино,
    // ингэснээр хэрэглэгчийн засаж буй тоо хэвээр үлдэнэ.
    useEffect(() => {
        setEntries(prev => {
            const prevIds = prev.map(e => e.id).join(',');
            const nextIds = initial.map(e => e.id).join(',');
            if (prevIds === nextIds) return prev;
            return initial.map(srv => {
                const local = prev.find(p => p.id === srv.id);
                return local ? { ...srv, ...local } : { ...srv };
            });
        });
    }, [initial]);

    function addEmployee(employeeId: number) {
        router.post(`/hr/nurse-bonus/${run.id}/entries`, { employee_id: employeeId }, {
            preserveScroll: true,
            onSuccess: () => setShowAddEmp(false),
        });
    }
    function removeEmployee(entryId: number) {
        router.delete(`/hr/nurse-bonus/${run.id}/entries/${entryId}`, {
            preserveScroll: true,
            onSuccess: () => setRemoveEmpId(null),
        });
    }

    const isFinal   = run.status === 'final';
    const sentCount = entries.filter(e => e.is_sent).length;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'HR', href: '/hr/employees' },
        { title: 'Сувилагчийн урамшуулал', href: '/hr/nurse-bonus' },
        { title: run.title, href: `/hr/nurse-bonus/${run.id}` },
    ];

    useEffect(() => {
        const el = tableRef.current;
        if (!el) return;
        const check = () => setScrollEdge({
            left:  el.scrollLeft > 4,
            right: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
        });
        check();
        el.addEventListener('scroll', check, { passive: true });
        window.addEventListener('resize', check);
        return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
    }, []);

    function setField(idx: number, field: CKey | 'visit_count', value: number) {
        setSaved(false);
        setEntries(prev => prev.map((e, i) => {
            if (i !== idx) return e;
            const updated = { ...e, [field]: value };
            updated.total_amount = calcTotal(updated, criteria);
            return updated;
        }));
    }

    function save() {
        setSaving(true);
        router.put(`/hr/nurse-bonus/${run.id}`, { entries: entries.map(e => ({ ...e })) }, {
            onSuccess: () => setSaved(true),
            onFinish:  () => setSaving(false),
        });
    }
    function finalize() { router.patch(`/hr/nurse-bonus/${run.id}/finalize`, { entries: entries.map(e => ({ ...e })) }); }
    function reopen()   { router.patch(`/hr/nurse-bonus/${run.id}/reopen`); }

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
        if (sentCount > 0 && sentCount < entries.length) return (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                <Send className="size-3" /> {sentCount}/{entries.length} илгээсэн
            </span>
        );
        return <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">Ноорог</span>;
    }

    const criteriaList = Object.entries(criteria) as [CKey, CriterionDef][];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={run.title} />

            {/* ════ MOBILE ════ */}
            <div className="md:hidden min-h-full bg-[#f2f2f7] dark:bg-zinc-950">
                {/* Sticky action bar */}
                <div className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-zinc-800 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{run.title}</p>
                            <div className="mt-0.5"><StatusBadge /></div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <a href={`/hr/nurse-bonus/${run.id}/excel`} target="_blank"
                                className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                                <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                            </a>
                            {isFinal ? (
                                <button onClick={reopen}
                                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 px-3 py-2 text-xs font-medium text-gray-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 active:scale-95 transition-transform">
                                    <Unlock className="size-3.5" /> Нээх
                                </button>
                            ) : (
                                <>
                                    <button onClick={save} disabled={saving}
                                        className="size-9 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform">
                                        {saving
                                            ? <span className="size-4 rounded-full border-2 border-gray-400/30 border-t-gray-600 animate-spin" />
                                            : <Save className="size-4 text-gray-600 dark:text-zinc-300" />}
                                    </button>
                                    <button onClick={finalize}
                                        className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white active:scale-95 transition-transform">
                                        <Lock className="size-3.5" /> Баталгаа
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-4 pt-4 pb-10 space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 px-1">
                        {entries.length} сувилагч ажилтан
                    </p>
                    {entries.map((e, idx) => (
                        <MobileEntryCard key={e.id} entry={e} idx={idx} criteria={criteria}
                            isFinal={isFinal} runId={run.id} onSetField={setField} />
                    ))}
                    {!isFinal && (
                        <button onClick={save} disabled={saving}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gray-900 dark:bg-white py-4 text-sm font-bold text-white dark:text-gray-900 active:scale-[0.98] transition-transform shadow-sm disabled:opacity-50">
                            {saving
                                ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                : <Save className="size-4" />}
                            Хадгалах
                        </button>
                    )}
                </div>
            </div>

            {/* ════ DESKTOP ════ */}
            <div className="hidden md:flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-foreground">{run.title}</h1>
                            <StatusBadge />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{entries.length} сувилагч ажилтан</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href={`/hr/nurse-bonus/${run.id}/excel`} target="_blank"
                            className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/30 transition-colors">
                            <FileSpreadsheet className="size-3.5" /> Excel
                        </a>
                        {isFinal ? (
                            <button onClick={reopen}
                                className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                                <Unlock className="size-3.5" /> Нээх
                            </button>
                        ) : (
                            <>
                                {available_employees.length > 0 && (
                                    <button onClick={() => setShowAddEmp(true)}
                                        className="flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                        <Plus className="size-3.5" /> Ажилтан нэмэх
                                    </button>
                                )}
                                <button onClick={save} disabled={saving}
                                    className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50">
                                    {saving
                                        ? <span className="size-3.5 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
                                        : <Save className="size-3.5" />}
                                    Хадгалах
                                </button>
                                <button onClick={finalize}
                                    className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors">
                                    <Lock className="size-3.5" /> Баталгаажуулах
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="relative rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className={`pointer-events-none absolute left-[148px] top-0 bottom-0 w-8 bg-gradient-to-r from-card/90 to-transparent z-20 transition-opacity duration-200 ${scrollEdge.left ? 'opacity-100' : 'opacity-0'}`} />
                    <div className={`pointer-events-none absolute right-0 top-0 bottom-0 w-10 rounded-r-2xl bg-gradient-to-l from-card/90 to-transparent z-20 transition-opacity duration-200 ${scrollEdge.right ? 'opacity-100' : 'opacity-0'}`} />
                    <div ref={tableRef} className="overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(120,120,120,0.35) transparent' }}>
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className="sticky left-0 z-10 bg-muted/30 border-r px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground min-w-[150px]">Ажилтан</th>
                                    {criteriaList.map(([key, c]) => {
                                        const isPreLast = key === 'material_prep';
                                        return (
                                            <th key={key} className={`border-r px-2 py-1.5 text-center ${isPreLast ? '' : ''}`}>
                                                <p className="text-[10px] font-semibold text-foreground/80 whitespace-nowrap">{c.label}</p>
                                                <p className="text-[10px] text-muted-foreground">{Math.abs(c.price).toLocaleString('en-US')}₮ / {c.unit}</p>
                                            </th>
                                        );
                                    }).reduce((acc: React.ReactNode[], node, i, arr) => {
                                        acc.push(node);
                                        if (criteriaList[i]?.[0] === 'material_prep') {
                                            acc.push(
                                                <th key="visit_count" className="border-r border-l-2 border-l-blue-300 dark:border-l-blue-700 px-2 py-1.5 text-center bg-blue-50/50 dark:bg-blue-950/20 min-w-[80px]">
                                                    <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">Нийт үзлэгийн тоо</p>
                                                    <p className="text-[10px] text-muted-foreground">удаа</p>
                                                </th>,
                                                <th key="niilber_onoo" className="border-r px-2 py-1.5 text-center bg-emerald-50/50 dark:bg-emerald-950/20 min-w-[90px]">
                                                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">Нийлбэр оноо</p>
                                                    <p className="text-[10px] text-muted-foreground">= тоо × нийлбэр</p>
                                                </th>
                                            );
                                        }
                                        return acc;
                                    }, [])}
                                    <th className="px-3 py-1.5 text-right text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 whitespace-nowrap min-w-[100px]">Нийт ₮</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {entries.map((e, idx) => (
                                    <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="sticky left-0 z-10 bg-card border-r px-3 py-1 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-foreground text-xs">{e.name}</span>
                                                {e.is_sent
                                                    ? <span title="Илгээсэн"><CheckCircle2 className="size-3 text-emerald-500 shrink-0" /></span>
                                                    : !isFinal && (
                                                        <>
                                                            <button title="Энэ ажилтанд илгээх"
                                                                onClick={() => router.post(`/hr/nurse-bonus/${run.id}/entries/${e.id}/send`)}
                                                                className="rounded p-0.5 text-muted-foreground hover:text-violet-600 hover:bg-violet-50 transition-colors">
                                                                <Send className="size-3" />
                                                            </button>
                                                            <button title="Энэ ажилтныг хасах"
                                                                onClick={() => setRemoveEmpId(e.id)}
                                                                className="rounded p-0.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                                                                <UserMinus className="size-3" />
                                                            </button>
                                                        </>
                                                    )
                                                }
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">{e.position ?? e.employee_number}</p>
                                        </td>
                                        {KEYS.map(key => {
                                            const cell = (
                                                <td key={key} className="border-r">
                                                    <CountCell value={e[key] as number} disabled={isFinal} onChange={v => setField(idx, key, v)} />
                                                </td>
                                            );
                                            if (key === 'material_prep') {
                                                const niilberOnoo = calcNiilberOnoo(e);
                                                return [
                                                    cell,
                                                    <td key="visit_count" className="border-r border-l-2 border-l-blue-300 dark:border-l-blue-700 bg-blue-50/30 dark:bg-blue-950/10">
                                                        <CountCell value={e.visit_count || 0} disabled={isFinal} onChange={v => setField(idx, 'visit_count', v)} />
                                                    </td>,
                                                    <td key="niilber_onoo" className="border-r px-2 py-2 text-right text-xs tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10 whitespace-nowrap">
                                                        {niilberOnoo ? niilberOnoo.toLocaleString('en-US') : '—'}
                                                    </td>,
                                                ];
                                            }
                                            return cell;
                                        })}
                                        <td className="px-3 py-2 text-right text-xs tabular-nums font-bold text-violet-700 dark:text-violet-400 bg-violet-50/20 dark:bg-violet-950/5 whitespace-nowrap">
                                            {e.total_amount ? fmtMoney(e.total_amount) + '₮' : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 bg-muted/40 font-bold">
                                    <td className="sticky left-0 z-10 bg-muted/40 border-r px-3 py-2 text-[10px] font-bold uppercase text-muted-foreground">Нийт</td>
                                    {KEYS.map(key => {
                                        const total = entries.reduce((s, e) => s + (e[key as keyof EntryRow] as number || 0), 0);
                                        const cell = <td key={key} className="border-r px-2 py-2 text-right text-xs tabular-nums text-muted-foreground">{total || ''}</td>;
                                        if (key === 'material_prep') {
                                            const totalVisit = entries.reduce((s, e) => s + (e.visit_count || 0), 0);
                                            const totalNiilber = entries.reduce((s, e) => s + calcNiilberOnoo(e), 0);
                                            return [
                                                cell,
                                                <td key="visit_count" className="border-r border-l-2 border-l-blue-300 dark:border-l-blue-700 px-2 py-2 text-right text-xs tabular-nums text-blue-700 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/10">{totalVisit || ''}</td>,
                                                <td key="niilber_onoo" className="border-r px-2 py-2 text-right text-xs tabular-nums font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/10 whitespace-nowrap">{totalNiilber ? totalNiilber.toLocaleString('en-US') : ''}</td>,
                                            ];
                                        }
                                        return cell;
                                    })}
                                    <td className="px-3 py-2 text-right text-xs tabular-nums font-bold text-violet-700 dark:text-violet-400 bg-violet-50/40 dark:bg-violet-950/10">
                                        {fmtMoney(entries.reduce((s, e) => s + (e.total_amount || 0), 0))}₮
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                    Тоо оруулахад дүн автоматаар тооцогдоно · Хадгалах товч дарж хадгална
                </p>
            </div>

            {/* Ажилтан нэмэх modal */}
            {showAddEmp && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4"
                    onClick={() => setShowAddEmp(false)}>
                    <div className="w-full md:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}>
                        <div className="md:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                        </div>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Ажилтан нэмэх</h2>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Энэ өдрийн урамшуулалд нэмэх Сувилагчийг сонгоно уу</p>
                            </div>
                            <button onClick={() => setShowAddEmp(false)}
                                className="size-8 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                <X className="size-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="px-5 py-3 max-h-[60vh] overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800">
                            {available_employees.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">Нэмж болох Сувилагч ажилтан байхгүй байна</p>
                            ) : available_employees.map(emp => (
                                <button key={emp.id} onClick={() => addEmployee(emp.id)}
                                    className="w-full flex items-center justify-between gap-2 py-3 hover:bg-muted/30 transition-colors -mx-2 px-2 rounded-lg">
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{emp.name}</p>
                                        <p className="text-xs text-muted-foreground">{emp.employee_number}</p>
                                    </div>
                                    <span className="rounded-lg bg-blue-100 dark:bg-blue-950/40 p-1.5">
                                        <Plus className="size-3.5 text-blue-600 dark:text-blue-400" />
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Ажилтан хасах баталгаажуулалт */}
            {removeEmpId !== null && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4"
                    onClick={() => setRemoveEmpId(null)}>
                    <div className="w-full md:max-w-xs bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-2xl shadow-2xl p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="md:hidden flex justify-center mb-2">
                            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Энэ ажилтныг хасах уу?</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">Тухайн өдрийн урамшууллаас энэ ажилтны мөр устгагдана. Дараа дахин нэмэх боломжтой.</p>
                        <div className="flex gap-2">
                            <button onClick={() => removeEmployee(removeEmpId)}
                                className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white active:scale-[0.98] transition-transform">
                                Хасах
                            </button>
                            <button onClick={() => setRemoveEmpId(null)}
                                className="flex-1 rounded-2xl bg-gray-100 dark:bg-zinc-800 py-3 text-sm font-semibold text-gray-600 dark:text-zinc-300 active:scale-[0.98] transition-transform">
                                Болих
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ToastContainer />
        </AppLayout>
    );
}
