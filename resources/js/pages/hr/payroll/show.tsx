import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle2, ChevronDown, ChevronUp, FileSpreadsheet, Lock, Save, Send, Unlock, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface PayrollRun {
    id: number; title: string; year: number; month: number;
    half: 'first' | 'second'; half_label: string;
    label: string | null; status: 'draft' | 'final'; notes: string | null;
}
interface EntryRow {
    id: number; employee_id: number; name: string;
    employee_number: string; register_number: string | null;
    position: string | null; bank_account: string | null;
    basic_salary: number; nd_salary: number;
    prev_paid: number; holiday_advance: number;
    ath_bonus: number; overtime_bonus: number; vacation_pay: number;
    working_days: number; worked_days: number; daily_rate: number;
    food: number; transport: number; milk: number;
    total_bonus: number; calc_salary: number; nd_total: number; ndsh: number;
    tardiness: number; no_fingerprint: number; other_deduction: number;
    income_tax: number; net_hand: number; bank_salary: number;
    is_sent: boolean;
}
interface Props { run: PayrollRun; entries: EntryRow[] }

function fmt(n: number) {
    if (n === 0) return '';
    return Math.round(n).toLocaleString('en-US');
}
function fmtFull(n: number) {
    if (!n) return '—';
    return Math.round(n).toLocaleString('en-US') + '₮';
}
function sum(entries: EntryRow[], key: keyof EntryRow): number {
    return entries.reduce((acc, e) => acc + (Number(e[key]) || 0), 0);
}

function Cell({ value, onChange, disabled, int, highlight }: {
    value: number; onChange: (v: number) => void; disabled?: boolean; int?: boolean; highlight?: boolean;
}) {
    const [str, setStr] = useState(value === 0 ? '' : String(value));
    if (disabled) return (
        <div className={`px-2 py-2 text-right text-xs tabular-nums ${highlight ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
            {fmt(value)}
        </div>
    );
    return (
        <input type="number" value={str}
            onChange={e => {
                setStr(e.target.value);
                const n = int ? parseInt(e.target.value) : parseFloat(e.target.value);
                if (!isNaN(n)) onChange(n);
            }}
            onBlur={() => {
                const n = int ? parseInt(str) : parseFloat(str);
                if (isNaN(n) || n === 0) { setStr(''); onChange(0); }
                else setStr(String(n));
            }}
            placeholder="0"
            className={`w-full min-w-[72px] rounded border-0 bg-transparent px-2 py-2 text-right text-xs tabular-nums outline-none focus:bg-muted/50 focus:ring-1 focus:ring-ring ${highlight ? 'font-bold' : ''}`}
        />
    );
}

function GH({ label, cols, color }: { label: string; cols: number; color: string }) {
    return (
        <th colSpan={cols} className={`border-b border-r px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider ${color}`}>
            {label}
        </th>
    );
}

function MobileFieldInput({ value, onChange, disabled, int }: {
    value: number; onChange: (v: number) => void; disabled: boolean; int?: boolean;
}) {
    const [str, setStr] = useState(value === 0 ? '' : String(value));
    if (disabled) return <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">{fmt(value) || '—'}</span>;
    return (
        <input type="number" inputMode="decimal" value={str}
            onChange={e => {
                setStr(e.target.value);
                const n = int ? parseInt(e.target.value) : parseFloat(e.target.value);
                if (!isNaN(n)) onChange(n);
            }}
            onBlur={() => {
                const n = int ? parseInt(str) : parseFloat(str);
                if (isNaN(n) || n === 0) { setStr(''); onChange(0); }
                else setStr(String(n));
            }}
            placeholder="0"
            className="w-28 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-1.5 text-sm text-right tabular-nums text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-400"
        />
    );
}

const GROUPS = [
    {
        label: 'Үндсэн',
        color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30',
        fields: [
            { key: 'basic_salary',    label: 'Үндсэн цалин' },
            { key: 'nd_salary',       label: 'НД цалин' },
            { key: 'prev_paid',       label: 'Урьд олгосон' },
            { key: 'holiday_advance', label: 'Баярын урьд' },
        ],
    },
    {
        label: 'Нэмэгдэл',
        color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
        fields: [
            { key: 'ath_bonus',      label: 'А.Т.Х 40%' },
            { key: 'overtime_bonus', label: 'Илүү цаг 10%' },
            { key: 'vacation_pay',   label: 'Ээлж.амр+хувь' },
        ],
    },
    {
        label: 'Өдөр',
        color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20',
        fields: [
            { key: 'working_days', label: 'Ажлын өдөр', int: true },
            { key: 'worked_days',  label: 'Ажилласан',  int: true },
            { key: 'daily_rate',   label: '1 өдрийн цалин' },
        ],
    },
    {
        label: 'Хоол · Унаа · Сүү',
        color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
        fields: [
            { key: 'food',      label: 'Хоол' },
            { key: 'transport', label: 'Унаа' },
            { key: 'milk',      label: 'Сүү' },
        ],
    },
    {
        label: 'Тооцоо',
        color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
        fields: [
            { key: 'total_bonus',  label: 'Нийт нэмэгдэл' },
            { key: 'calc_salary',  label: 'Тооцсон цалин' },
            { key: 'nd_total',     label: 'НД цалин нийт' },
        ],
    },
    {
        label: 'Суутгал',
        color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
        fields: [
            { key: 'tardiness',       label: 'Хоцролт' },
            { key: 'no_fingerprint',  label: 'Хуруу' },
            { key: 'other_deduction', label: 'Суутгал' },
        ],
    },
    {
        label: 'НДШ / ХХОАТ',
        color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
        fields: [
            { key: 'ndsh',       label: 'НДШ 11.5%' },
            { key: 'income_tax', label: 'ХХОАТ' },
        ],
    },
] as const;

const HIGHLIGHT_FIELDS = ['net_hand', 'bank_salary'] as const;

function MobileEntryCard({ entry, idx, isFinal, runId, onSetField }: {
    entry: EntryRow; idx: number; isFinal: boolean; runId: number;
    onSetField: (idx: number, field: keyof EntryRow, v: number) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <button onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-4 text-left active:bg-gray-50 dark:active:bg-zinc-800 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{entry.name.slice(0,2)}</span>
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
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500">Гарт / Банк</p>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {entry.net_hand ? fmt(entry.net_hand) + '₮' : '—'}
                        </p>
                    </div>
                    {open ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
                </div>
            </button>

            {open && (
                <div className="border-t border-gray-100 dark:border-zinc-800 px-4 py-4 space-y-3">
                    {GROUPS.map(group => (
                        <div key={group.label} className="rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800">
                            <div className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${group.color}`}>
                                {group.label}
                            </div>
                            {group.fields.map((f, fi) => (
                                <div key={f.key} className={`flex items-center justify-between px-4 py-2.5 ${fi % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50/50 dark:bg-zinc-800/50'}`}>
                                    <span className="text-xs text-gray-600 dark:text-zinc-400">{f.label}</span>
                                    <MobileFieldInput
                                        value={entry[f.key as keyof EntryRow] as number || 0}
                                        disabled={isFinal}
                                        int={'int' in f ? f.int as boolean : false}
                                        onChange={v => onSetField(idx, f.key as keyof EntryRow, v)}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}

                    {/* Гарт / Банк highlight */}
                    <div className="rounded-2xl overflow-hidden border-2 border-emerald-200 dark:border-emerald-800">
                        <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20">
                            Гарт · Банк
                        </div>
                        {[
                            { key: 'net_hand',    label: 'Гарт олгох' },
                            { key: 'bank_salary', label: 'Банкаар олгох' },
                        ].map((f, fi) => (
                            <div key={f.key} className={`flex items-center justify-between px-4 py-3 ${fi === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-emerald-50/30 dark:bg-emerald-950/10'}`}>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{f.label}</span>
                                <MobileFieldInput
                                    value={entry[f.key as keyof EntryRow] as number || 0}
                                    disabled={isFinal}
                                    onChange={v => onSetField(idx, f.key as keyof EntryRow, v)}
                                />
                            </div>
                        ))}
                    </div>

                    {!isFinal && !entry.is_sent && (
                        <button onClick={() => router.post(`/hr/payroll/${runId}/entries/${entry.id}/send`)}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white active:scale-[0.98] transition-transform">
                            <Send className="size-4" /> Илгээх
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default function PayrollShow({ run, entries: initial }: Props) {
    const [entries, setEntries] = useState<EntryRow[]>(initial.map(e => ({ ...e })));
    const [saving, setSaving]   = useState(false);
    const [saved, setSaved]     = useState(false);
    const [importOpen, setImportOpen] = useState(false);

    useEffect(() => {
        setEntries(initial.map(e => ({ ...e })));
    }, [initial]);
    const [scrollEdge, setScrollEdge] = useState({ left: false, right: true });
    const tableRef = useRef<HTMLDivElement>(null);
    const fileRef  = useRef<HTMLInputElement>(null);
    const importForm = useForm<{ file: File | null }>({ file: null });

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

    const isFinal   = run.status === 'final';
    const sentCount = entries.filter(e => e.is_sent).length;

    function submitImport(e: React.FormEvent) {
        e.preventDefault();
        if (!importForm.data.file) return;
        importForm.post(`/hr/payroll/${run.id}/import`, {
            forceFormData: true,
            onSuccess: () => { setImportOpen(false); importForm.reset(); },
        });
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'HR', href: '/hr/employees' },
        { title: 'Цалингийн тооцоо', href: '/hr/payroll' },
        { title: run.title, href: `/hr/payroll/${run.id}` },
    ];

    function setField(idx: number, field: keyof EntryRow, value: number) {
        setSaved(false);
        setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
    }

    function save() {
        setSaving(true);
        router.put(`/hr/payroll/${run.id}`, { entries: entries.map(e => ({ ...e })) }, {
            onSuccess: () => setSaved(true),
            onFinish:  () => setSaving(false),
        });
    }
    function finalize() { router.patch(`/hr/payroll/${run.id}/finalize`, { entries: entries.map(e => ({ ...e })) }); }
    function reopen()   { router.patch(`/hr/payroll/${run.id}/reopen`); }

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

    type ColKey = keyof EntryRow;
    const cols: Array<{ key: ColKey; label: string; int?: boolean; highlight?: boolean }> = [
        { key: 'basic_salary',    label: 'Үндсэн цалин' },
        { key: 'nd_salary',       label: 'НД цалин' },
        { key: 'prev_paid',       label: 'Урьд олгосон' },
        { key: 'holiday_advance', label: 'Баярын урьд' },
        { key: 'ath_bonus',       label: 'А.Т.Х 40%' },
        { key: 'overtime_bonus',  label: 'Илүү цаг 10%' },
        { key: 'vacation_pay',    label: 'Ээлж.амр+хувь' },
        { key: 'working_days',    label: 'Ажлын өдөр', int: true },
        { key: 'worked_days',     label: 'Ажилласан',  int: true },
        { key: 'daily_rate',      label: '1 өдрийн цалин' },
        { key: 'food',      label: 'Хоол' },
        { key: 'transport', label: 'Унаа' },
        { key: 'milk',      label: 'Сүү' },
        { key: 'total_bonus',  label: 'Нийт нэмэгдэл' },
        { key: 'calc_salary',  label: 'Тооцсон цалин' },
        { key: 'nd_total',     label: 'НД цалин нийт' },
        { key: 'tardiness',       label: 'Хоцролт' },
        { key: 'no_fingerprint',  label: 'Хуруу' },
        { key: 'other_deduction', label: 'Суутгал' },
        { key: 'ndsh',       label: 'НДШ 11.5%' },
        { key: 'income_tax', label: 'ХХОАТ' },
        { key: 'net_hand',    label: 'Гарт олгох',    highlight: true },
        { key: 'bank_salary', label: 'Банкаар олгох', highlight: true },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={run.title} />

            {/* ════ MOBILE ════ */}
            <div className="md:hidden min-h-full bg-[#f2f2f7] dark:bg-zinc-950">
                {/* Sticky action bar */}
                <div className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-zinc-800 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate max-w-[160px]">{run.title}</p>
                            <div className="mt-0.5"><StatusBadge /></div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <a href={`/hr/payroll/${run.id}/template`}
                                className="size-9 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                <FileSpreadsheet className="size-4 text-gray-500 dark:text-zinc-400" />
                            </a>
                            {!isFinal && (
                                <button onClick={() => setImportOpen(true)}
                                    className="size-9 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                    <Upload className="size-4 text-gray-500 dark:text-zinc-400" />
                                </button>
                            )}
                            <a href={`/hr/payroll/${run.id}/excel`}
                                className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                                <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                            </a>
                            {isFinal ? (
                                <button onClick={reopen}
                                    className="flex items-center gap-1 rounded-xl border border-gray-200 dark:border-zinc-700 px-2.5 py-2 text-xs font-medium text-gray-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 active:scale-95 transition-transform">
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
                                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-2 text-xs font-bold text-white active:scale-95 transition-transform">
                                        <Lock className="size-3.5" /> Баталгаа
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-4 pt-4 pb-10 space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 px-1">
                        {entries.length} ажилтан
                    </p>
                    {entries.map((e, idx) => (
                        <MobileEntryCard key={e.id} entry={e} idx={idx}
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
                        <p className="text-xs text-muted-foreground mt-0.5">{entries.length} ажилтан</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href={`/hr/payroll/${run.id}/template`}
                            className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                            <FileSpreadsheet className="size-3.5" /> Template
                        </a>
                        {!isFinal && (
                            <button onClick={() => setImportOpen(true)}
                                className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                                <Upload className="size-3.5" /> Import
                            </button>
                        )}
                        <a href={`/hr/payroll/${run.id}/excel`}
                            className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                            <FileSpreadsheet className="size-3.5" /> Excel
                        </a>
                        {isFinal ? (
                            <button onClick={reopen}
                                className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                                <Unlock className="size-3.5" /> Нээх
                            </button>
                        ) : (
                            <>
                                <button onClick={save} disabled={saving}
                                    className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50">
                                    {saving
                                        ? <span className="size-3.5 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
                                        : <Save className="size-3.5" />}
                                    Хадгалах
                                </button>
                                <button onClick={finalize}
                                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
                                    <Lock className="size-3.5" /> Баталгаажуулах
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="relative rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className={`pointer-events-none absolute left-[148px] top-0 bottom-0 w-8 bg-gradient-to-r from-card/90 to-transparent z-20 transition-opacity duration-200 ${scrollEdge.left ? 'opacity-100' : 'opacity-0'}`} />
                    <div className={`pointer-events-none absolute right-0 top-0 bottom-0 w-10 rounded-r-2xl bg-gradient-to-l from-card/90 to-transparent z-20 transition-opacity duration-200 ${scrollEdge.right ? 'opacity-100' : 'opacity-0'}`} />
                    <div ref={tableRef} className="overflow-x-auto"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(120,120,120,0.35) transparent' }}>
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className="sticky left-0 z-10 bg-muted/30 border-r px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground min-w-[150px]">Ажилтан</th>
                                    <GH label="Үндсэн"           cols={4} color="text-slate-600 dark:text-slate-300" />
                                    <GH label="Нэмэгдэл"         cols={3} color="text-blue-600 dark:text-blue-400" />
                                    <GH label="Өдөр"             cols={3} color="text-violet-600 dark:text-violet-400" />
                                    <GH label="Хоол · Унаа · Сүү" cols={3} color="text-orange-600 dark:text-orange-400" />
                                    <GH label="Тооцоо"           cols={3} color="text-teal-600 dark:text-teal-400" />
                                    <GH label="Суутгал"          cols={3} color="text-red-600 dark:text-red-400" />
                                    <GH label="НДШ / ХХОАТ"      cols={2} color="text-purple-600 dark:text-purple-400" />
                                    <GH label="Гарт · Банк"      cols={2} color="text-emerald-600 dark:text-emerald-400" />
                                </tr>
                                <tr className="border-b bg-muted/15 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    <th className="sticky left-0 z-10 bg-muted/15 border-r px-3 py-2 text-left">Нэр</th>
                                    {cols.map(c => (
                                        <th key={c.key} className={`border-r px-2 py-2 text-right whitespace-nowrap ${c.highlight ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''}`}>
                                            {c.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {entries.map((e, idx) => (
                                    <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="sticky left-0 z-10 bg-card border-r px-3 py-1 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <a href={`/hr/employees/${e.employee_id}`}
                                                    className="font-semibold text-foreground text-xs hover:underline hover:text-red-600 transition-colors">
                                                    {e.name}
                                                </a>
                                                {e.is_sent
                                                    ? <span title="Илгээсэн"><CheckCircle2 className="size-3 text-emerald-500 shrink-0" /></span>
                                                    : !isFinal && (
                                                        <button title="Энэ ажилтанд илгээх"
                                                            onClick={() => router.post(`/hr/payroll/${run.id}/entries/${e.id}/send`)}
                                                            className="rounded p-0.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                                            <Send className="size-3" />
                                                        </button>
                                                    )
                                                }
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">{e.position ?? e.employee_number}</p>
                                        </td>
                                        {cols.map(c => (
                                            <td key={c.key} className={`border-r ${c.highlight ? 'bg-emerald-50/20 dark:bg-emerald-950/5' : ''}`}>
                                                <Cell value={e[c.key] as number} int={c.int} highlight={c.highlight} disabled={isFinal} onChange={v => setField(idx, c.key, v)} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 bg-muted/40 font-bold">
                                    <td className="sticky left-0 z-10 bg-muted/40 border-r px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Нийт</td>
                                    {cols.map(c => {
                                        if (c.int) return <td key={c.key} className="border-r" />;
                                        const total = sum(entries, c.key);
                                        return (
                                            <td key={c.key} className={`border-r px-2 py-2 text-right text-xs tabular-nums ${c.highlight ? 'bg-emerald-50/40 text-emerald-700 dark:bg-emerald-950/10' : ''}`}>
                                                {fmt(total)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                    Бүх нүдэнд нягтлан гараар дүн оруулна · Хадгалах товч дарж хадгална
                </p>
            </div>

            <ToastContainer />

            {/* Import Modal (shared) */}
            {importOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4"
                    onClick={() => setImportOpen(false)}>
                    <div className="w-full md:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-2xl shadow-xl"
                        onClick={e => e.stopPropagation()}>
                        <div className="md:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 px-5 py-4">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Excel Import</h2>
                            <button onClick={() => setImportOpen(false)}
                                className="size-8 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                <X className="size-4 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={submitImport} className="space-y-4 p-5">
                            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300">
                                <p className="font-semibold mb-1">Заавар:</p>
                                <ol className="list-decimal pl-4 space-y-0.5">
                                    <li>Эхлээд <strong>Template татах</strong> товч дарна</li>
                                    <li>Excel дээр утгуудыг оруулна (A, B, C багануудыг өөрчлөхгүй)</li>
                                    <li>Excel (.xlsx) хэлбэрээр хадгалаад энд upload хийнэ</li>
                                </ol>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-800 dark:text-gray-200">Excel файл сонгох</label>
                                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                                    onChange={e => importForm.setData('file', e.target.files?.[0] ?? null)}
                                    className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 dark:file:bg-zinc-800 file:px-2 file:py-1 file:text-xs file:font-medium text-gray-700 dark:text-gray-300"
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => setImportOpen(false)}
                                    className="rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-2 text-xs font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                                    Болих
                                </button>
                                <button type="submit" disabled={!importForm.data.file || importForm.processing}
                                    className="flex items-center gap-1.5 rounded-xl bg-gray-900 dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-gray-900 hover:opacity-80 transition-opacity disabled:opacity-40">
                                    {importForm.processing
                                        ? <span className="size-3.5 rounded-full border-2 border-white/30 border-t-white dark:border-gray-900/30 dark:border-t-gray-900 animate-spin" />
                                        : <Upload className="size-3.5" />}
                                    Import хийх
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
