import { ToastContainer } from '@/components/toast';
import AppLayout from '@/layouts/app-layout';
import { computeRow, describeFormula, type PayrollColumn, type PayrollGroup } from '@/lib/payroll-formula';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle2, ChevronDown, ChevronUp, FileSpreadsheet, Lock, Save, Send, Unlock, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface PayrollRun {
    id: number;
    title: string;
    year: number;
    month: number;
    half: 'first' | 'second';
    half_label: string;
    label: string | null;
    status: 'draft' | 'final';
    notes: string | null;
}

interface EntryRow extends Record<string, unknown> {
    id: number;
    employee_id: number;
    name: string;
    employee_number: string;
    register_number: string | null;
    position: string | null;
    bank_account: string | null;
    is_sent: boolean;
}

interface Props {
    run: PayrollRun;
    entries: EntryRow[];
    columns: PayrollColumn[];
    groups: PayrollGroup[];
}

/** Бүлгийн өнгө — Tailwind class-ыг динамикаар угсарч болохгүй тул бүтнээр нь бичив. */
const GROUP_STYLES: Record<string, string> = {
    slate: 'text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/30',
    violet: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
    cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20',
    red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
};

function fmt(n: number) {
    if (!n) return '';
    return Math.round(n).toLocaleString('en-US');
}

function num(row: EntryRow, key: string): number {
    return Number(row[key]) || 0;
}

function sum(entries: EntryRow[], key: string): number {
    return entries.reduce((acc, e) => acc + num(e, key), 0);
}

/**
 * Гар оролтын нүд.  Томьёотой багана энд ирэхгүй — тэдгээрийг ComputedCell харуулна.
 *
 * Import хийсний дараа сервэрээс ирсэн шинэ утгыг барьж авахын тулд гаднын
 * өөрчлөлтийг ажиглана; өөрийн бичсэн утгыг дахин бичихгүй (жишээ нь "5." гэж
 * бичиж байхад цэг нь алга болохгүй).
 */
function InputCell({
    value,
    onChange,
    disabled,
    int,
    className,
}: {
    value: number;
    onChange: (v: number) => void;
    disabled?: boolean;
    int?: boolean;
    className?: string;
}) {
    const [str, setStr] = useState(() => (value === 0 ? '' : String(value)));
    const emitted = useRef(value);

    useEffect(() => {
        if (value !== emitted.current) {
            emitted.current = value;
            setStr(value === 0 ? '' : String(value));
        }
    }, [value]);

    if (disabled) {
        return <div className={`text-muted-foreground px-2 py-2 text-right text-xs tabular-nums ${className ?? ''}`}>{fmt(value)}</div>;
    }

    const emit = (raw: string) => {
        const n = int ? parseInt(raw) : parseFloat(raw);
        const next = isNaN(n) ? 0 : n;
        emitted.current = next;
        onChange(next);
    };

    return (
        <input
            type="number"
            value={str}
            onChange={(e) => {
                setStr(e.target.value);
                emit(e.target.value);
            }}
            onBlur={() => {
                const n = int ? parseInt(str) : parseFloat(str);
                setStr(isNaN(n) || n === 0 ? '' : String(n));
            }}
            placeholder="0"
            className={`focus:bg-muted/50 focus:ring-ring w-full min-w-[76px] rounded border-0 bg-transparent px-2 py-2 text-right text-xs tabular-nums outline-none focus:ring-1 ${className ?? ''}`}
        />
    );
}

/** Томьёогоор бодогдсон нүд — засах боломжгүй. */
function ComputedCell({ value, highlight }: { value: number; highlight?: boolean }) {
    return (
        <div
            className={`px-2 py-2 text-right text-xs tabular-nums ${
                highlight ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-foreground/70'
            }`}
        >
            {fmt(value)}
        </div>
    );
}

function MobileField({
    column,
    value,
    onChange,
    disabled,
    hint,
}: {
    column: PayrollColumn;
    value: number;
    onChange: (v: number) => void;
    disabled: boolean;
    hint: string;
}) {
    const [str, setStr] = useState(() => (value === 0 ? '' : String(value)));
    const emitted = useRef(value);

    useEffect(() => {
        if (value !== emitted.current) {
            emitted.current = value;
            setStr(value === 0 ? '' : String(value));
        }
    }, [value]);

    if (column.formula) {
        return (
            <span
                title={hint}
                className={`text-sm tabular-nums ${
                    column.highlight ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-zinc-400'
                }`}
            >
                {fmt(value) || '—'}
            </span>
        );
    }

    if (disabled) return <span className="text-sm text-gray-700 tabular-nums dark:text-gray-300">{fmt(value) || '—'}</span>;

    return (
        <input
            type="number"
            inputMode="decimal"
            value={str}
            onChange={(e) => {
                setStr(e.target.value);
                const n = column.int ? parseInt(e.target.value) : parseFloat(e.target.value);
                const next = isNaN(n) ? 0 : n;
                emitted.current = next;
                onChange(next);
            }}
            onBlur={() => {
                const n = column.int ? parseInt(str) : parseFloat(str);
                setStr(isNaN(n) || n === 0 ? '' : String(n));
            }}
            placeholder="0"
            className="w-28 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-right text-sm text-gray-900 tabular-nums outline-none focus:ring-2 focus:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-100"
        />
    );
}

function MobileEntryCard({
    entry,
    idx,
    isFinal,
    runId,
    columns,
    onSetField,
}: {
    entry: EntryRow;
    idx: number;
    isFinal: boolean;
    runId: number;
    columns: PayrollColumn[];
    onSetField: (idx: number, field: string, v: number) => void;
}) {
    const [open, setOpen] = useState(false);

    // Баганыг бүлгээр нь эмхэлнэ (schema-ийн дараалал хадгалагдана)
    const grouped = useMemo(() => {
        const out: Array<{ label: string; color: string; columns: PayrollColumn[] }> = [];
        for (const col of columns) {
            const last = out[out.length - 1];
            if (last && last.label === col.group) last.columns.push(col);
            else out.push({ label: col.group, color: col.color, columns: [col] });
        }
        return out;
    }, [columns]);

    return (
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors active:bg-gray-50 dark:active:bg-zinc-800"
            >
                <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/40">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{entry.name.slice(0, 2)}</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{entry.name}</p>
                            {entry.is_sent && <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">{entry.position ?? entry.employee_number}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500">Гарт олгох</p>
                        <p className="text-xs font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                            {num(entry, 'net_hand') ? fmt(num(entry, 'net_hand')) + '₮' : '—'}
                        </p>
                    </div>
                    {open ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
                </div>
            </button>

            {open && (
                <div className="space-y-3 border-t border-gray-100 px-4 py-4 dark:border-zinc-800">
                    {grouped.map((group) => (
                        <div key={group.label} className="overflow-hidden rounded-2xl border border-gray-100 dark:border-zinc-800">
                            <div
                                className={`px-4 py-2 text-[10px] font-bold tracking-wider uppercase ${GROUP_STYLES[group.color] ?? GROUP_STYLES.slate}`}
                            >
                                {group.label}
                            </div>
                            {group.columns.map((col, fi) => (
                                <div
                                    key={col.key}
                                    className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
                                        fi % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50/50 dark:bg-zinc-800/50'
                                    }`}
                                >
                                    <span className="text-xs text-gray-600 dark:text-zinc-400">
                                        {col.formula && <span className="mr-1 text-[10px] text-gray-400">ƒ</span>}
                                        {col.label}
                                    </span>
                                    <MobileField
                                        column={col}
                                        value={num(entry, col.key)}
                                        disabled={isFinal}
                                        hint={col.formula ? describeFormula(col.formula, columns) : ''}
                                        onChange={(v) => onSetField(idx, col.key, v)}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}

                    {!isFinal && !entry.is_sent && (
                        <button
                            onClick={() => router.post(`/hr/payroll/${runId}/entries/${entry.id}/send`)}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
                        >
                            <Send className="size-4" /> Илгээх
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default function PayrollShow({ run, entries: initial, columns, groups }: Props) {
    const [entries, setEntries] = useState<EntryRow[]>(() => initial.map((e) => computeRow(e, columns)));
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [scrollEdge, setScrollEdge] = useState({ left: false, right: true });

    const tableRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const importForm = useForm<{ file: File | null }>({ file: null });

    useEffect(() => {
        setEntries(initial.map((e) => computeRow(e, columns)));
    }, [initial, columns]);

    useEffect(() => {
        const el = tableRef.current;
        if (!el) return;
        const check = () =>
            setScrollEdge({
                left: el.scrollLeft > 4,
                right: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
            });
        check();
        el.addEventListener('scroll', check, { passive: true });
        window.addEventListener('resize', check);
        return () => {
            el.removeEventListener('scroll', check);
            window.removeEventListener('resize', check);
        };
    }, []);

    const isFinal = run.status === 'final';
    const sentCount = entries.filter((e) => e.is_sent).length;
    const inputCount = columns.filter((c) => !c.formula).length;

    function submitImport(e: React.FormEvent) {
        e.preventDefault();
        if (!importForm.data.file) return;
        importForm.post(`/hr/payroll/${run.id}/import`, {
            forceFormData: true,
            onSuccess: () => {
                setImportOpen(false);
                importForm.reset();
            },
        });
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'HR', href: '/hr/employees' },
        { title: 'Цалингийн тооцоо', href: '/hr/payroll' },
        { title: run.title, href: `/hr/payroll/${run.id}` },
    ];

    /** Гар оролт өөрчлөгдөхөд тухайн мөрийн бүх томьёог шууд дахин бодно. */
    function setField(idx: number, field: string, value: number) {
        setSaved(false);
        setEntries((prev) => prev.map((e, i) => (i === idx ? computeRow({ ...e, [field]: value }, columns) : e)));
    }

    /**
     * Сервер рүү зөвхөн гар оролтыг илгээнэ — томьёотой баганыг PayrollSchema
     * дахин бодох тул хөтчийн бодолт эрх мэдэлгүй.
     */
    function payload(): Array<Record<string, number>> {
        const inputKeys = columns.filter((c) => !c.formula).map((c) => c.key);

        return entries.map((e) => {
            const row: Record<string, number> = { id: e.id };
            for (const key of inputKeys) row[key] = num(e, key);
            return row;
        });
    }

    function save() {
        setSaving(true);
        router.put(
            `/hr/payroll/${run.id}`,
            { entries: payload() },
            {
                onSuccess: () => setSaved(true),
                onFinish: () => setSaving(false),
            },
        );
    }
    function finalize() {
        router.patch(`/hr/payroll/${run.id}/finalize`, { entries: payload() });
    }
    function reopen() {
        router.patch(`/hr/payroll/${run.id}/reopen`);
    }

    function StatusBadge() {
        if (isFinal)
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <CheckCircle2 className="size-3" /> Баталгаажсан
                </span>
            );
        if (saved)
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                    <Save className="size-3" /> Хадгалсан
                </span>
            );
        if (sentCount > 0 && sentCount < entries.length)
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                    <Send className="size-3" /> {sentCount}/{entries.length} илгээсэн
                </span>
            );
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                Ноорог
            </span>
        );
    }

    function HalfBadge() {
        const first = run.half === 'first';
        return (
            <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    first
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                }`}
            >
                {first ? 'Эхэн цалин' : 'Сүүл цалин'}
            </span>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={run.title} />

            {/* ════ MOBILE ════ */}
            <div className="min-h-full bg-[#f2f2f7] md:hidden dark:bg-zinc-950">
                <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="max-w-[160px] truncate text-sm leading-tight font-bold text-gray-900 dark:text-gray-100">{run.title}</p>
                            <div className="mt-0.5 flex items-center gap-1">
                                <HalfBadge />
                                <StatusBadge />
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <a
                                href={`/hr/payroll/${run.id}/template`}
                                className="flex size-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-800"
                            >
                                <FileSpreadsheet className="size-4 text-gray-500 dark:text-zinc-400" />
                            </a>
                            {!isFinal && (
                                <button
                                    onClick={() => setImportOpen(true)}
                                    className="flex size-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-800"
                                >
                                    <Upload className="size-4 text-gray-500 dark:text-zinc-400" />
                                </button>
                            )}
                            <a
                                href={`/hr/payroll/${run.id}/excel`}
                                className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30"
                            >
                                <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                            </a>
                            {isFinal ? (
                                <button
                                    onClick={reopen}
                                    className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-600 transition-transform active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                >
                                    <Unlock className="size-3.5" /> Нээх
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={save}
                                        disabled={saving}
                                        className="flex size-9 items-center justify-center rounded-xl bg-gray-100 transition-transform active:scale-95 disabled:opacity-50 dark:bg-zinc-800"
                                    >
                                        {saving ? (
                                            <span className="size-4 animate-spin rounded-full border-2 border-gray-400/30 border-t-gray-600" />
                                        ) : (
                                            <Save className="size-4 text-gray-600 dark:text-zinc-300" />
                                        )}
                                    </button>
                                    <button
                                        onClick={finalize}
                                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-2 text-xs font-bold text-white transition-transform active:scale-95"
                                    >
                                        <Lock className="size-3.5" /> Баталгаа
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-3 px-4 pt-4 pb-10">
                    <p className="px-1 text-[11px] font-bold tracking-wider text-gray-500 uppercase dark:text-zinc-400">{entries.length} ажилтан</p>
                    {entries.map((e, idx) => (
                        <MobileEntryCard key={e.id} entry={e} idx={idx} isFinal={isFinal} runId={run.id} columns={columns} onSetField={setField} />
                    ))}
                    {!isFinal && (
                        <button
                            onClick={save}
                            disabled={saving}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-sm font-bold text-white shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-gray-900"
                        >
                            {saving ? (
                                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                                <Save className="size-4" />
                            )}
                            Хадгалах
                        </button>
                    )}
                </div>
            </div>

            {/* ════ DESKTOP ════ */}
            <div className="hidden flex-col gap-4 p-4 md:flex">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-foreground text-lg font-bold">{run.title}</h1>
                            <HalfBadge />
                            <StatusBadge />
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                            {entries.length} ажилтан · {inputCount} гар оролт · {columns.length - inputCount} томьёо
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={`/hr/payroll/${run.id}/template`}
                            className="text-muted-foreground hover:bg-muted flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                        >
                            <FileSpreadsheet className="size-3.5" /> Template
                        </a>
                        {!isFinal && (
                            <button
                                onClick={() => setImportOpen(true)}
                                className="text-muted-foreground hover:bg-muted flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                            >
                                <Upload className="size-3.5" /> Import
                            </button>
                        )}
                        <a
                            href={`/hr/payroll/${run.id}/excel`}
                            className="text-muted-foreground hover:bg-muted flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                        >
                            <FileSpreadsheet className="size-3.5" /> Excel
                        </a>
                        {isFinal ? (
                            <button
                                onClick={reopen}
                                className="text-muted-foreground hover:bg-muted flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                            >
                                <Unlock className="size-3.5" /> Нээх
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={save}
                                    disabled={saving}
                                    className="text-foreground hover:bg-muted flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                                >
                                    {saving ? (
                                        <span className="border-foreground/30 border-t-foreground size-3.5 animate-spin rounded-full border-2" />
                                    ) : (
                                        <Save className="size-3.5" />
                                    )}
                                    Хадгалах
                                </button>
                                <button
                                    onClick={finalize}
                                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                                >
                                    <Lock className="size-3.5" /> Баталгаажуулах
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="bg-card relative overflow-hidden rounded-2xl border shadow-sm">
                    <div
                        className={`from-card/90 pointer-events-none absolute top-0 bottom-0 left-[148px] z-20 w-8 bg-gradient-to-r to-transparent transition-opacity duration-200 ${scrollEdge.left ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <div
                        className={`from-card/90 pointer-events-none absolute top-0 right-0 bottom-0 z-20 w-10 rounded-r-2xl bg-gradient-to-l to-transparent transition-opacity duration-200 ${scrollEdge.right ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <div
                        ref={tableRef}
                        className="overflow-x-auto"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(120,120,120,0.35) transparent' }}
                    >
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="bg-muted/30 border-b">
                                    <th className="bg-muted/30 text-muted-foreground sticky left-0 z-10 min-w-[150px] border-r px-3 py-1.5 text-left text-[10px] font-bold tracking-wider uppercase">
                                        Ажилтан
                                    </th>
                                    {groups.map((g) => (
                                        <th
                                            key={g.label}
                                            colSpan={g.span}
                                            className={`border-r border-b px-2 py-1.5 text-center text-[10px] font-bold tracking-wider uppercase ${GROUP_STYLES[g.color] ?? GROUP_STYLES.slate}`}
                                        >
                                            {g.label}
                                        </th>
                                    ))}
                                </tr>
                                <tr className="bg-muted/15 text-muted-foreground border-b text-[10px] font-semibold tracking-wide uppercase">
                                    <th className="bg-muted/15 sticky left-0 z-10 border-r px-3 py-2 text-left">Нэр</th>
                                    {columns.map((c) => (
                                        <th
                                            key={c.key}
                                            title={c.formula ? describeFormula(c.formula, columns) : 'Гараар оруулна'}
                                            className={`border-r px-2 py-2 text-right whitespace-nowrap ${
                                                c.highlight ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : c.formula ? 'bg-muted/40' : ''
                                            }`}
                                        >
                                            {c.formula && <span className="mr-0.5 text-[9px] font-normal opacity-60">ƒ</span>}
                                            {c.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-border/40 divide-y">
                                {entries.map((e, idx) => (
                                    <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="bg-card sticky left-0 z-10 border-r px-3 py-1 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <a
                                                    href={`/hr/employees/${e.employee_id}`}
                                                    className="text-foreground text-xs font-semibold transition-colors hover:text-red-600 hover:underline"
                                                >
                                                    {e.name}
                                                </a>
                                                {e.is_sent ? (
                                                    <span title="Илгээсэн">
                                                        <CheckCircle2 className="size-3 shrink-0 text-emerald-500" />
                                                    </span>
                                                ) : (
                                                    !isFinal && (
                                                        <button
                                                            title="Энэ ажилтанд илгээх"
                                                            onClick={() => router.post(`/hr/payroll/${run.id}/entries/${e.id}/send`)}
                                                            className="text-muted-foreground rounded p-0.5 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                                        >
                                                            <Send className="size-3" />
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                            <p className="text-muted-foreground text-[10px]">{e.position ?? e.employee_number}</p>
                                        </td>
                                        {columns.map((c) => (
                                            <td
                                                key={c.key}
                                                className={`border-r ${
                                                    c.highlight ? 'bg-emerald-50/20 dark:bg-emerald-950/5' : c.formula ? 'bg-muted/20' : ''
                                                }`}
                                            >
                                                {c.formula ? (
                                                    <ComputedCell value={num(e, c.key)} highlight={c.highlight} />
                                                ) : (
                                                    <InputCell
                                                        value={num(e, c.key)}
                                                        int={c.int}
                                                        disabled={isFinal}
                                                        onChange={(v) => setField(idx, c.key, v)}
                                                    />
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-muted/40 border-t-2 font-bold">
                                    <td className="bg-muted/40 text-muted-foreground sticky left-0 z-10 border-r px-3 py-2 text-[10px] font-bold tracking-wider uppercase">
                                        Нийт
                                    </td>
                                    {columns.map((c) => {
                                        if (!c.sum) return <td key={c.key} className="border-r" />;
                                        return (
                                            <td
                                                key={c.key}
                                                className={`border-r px-2 py-2 text-right text-xs tabular-nums ${
                                                    c.highlight ? 'bg-emerald-50/40 text-emerald-700 dark:bg-emerald-950/10' : ''
                                                }`}
                                            >
                                                {fmt(sum(entries, c.key))}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                <p className="text-muted-foreground text-center text-[11px]">
                    <span className="font-semibold">ƒ</span> тэмдэгтэй саарал багана томьёогоор өөрөө бодогдоно · Цагаан нүдэнд гараар дүн оруулна
                </p>
            </div>

            <ToastContainer />

            {/* Import Modal (shared) */}
            {importOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
                    onClick={() => setImportOpen(false)}
                >
                    <div
                        className="w-full rounded-t-3xl bg-white shadow-xl md:max-w-md md:rounded-2xl dark:bg-zinc-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-center pt-3 pb-1 md:hidden">
                            <div className="h-1 w-10 rounded-full bg-gray-200 dark:bg-zinc-700" />
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-zinc-800">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                Excel Import — {run.half === 'first' ? 'Эхэн цалин' : 'Сүүл цалин'}
                            </h2>
                            <button
                                onClick={() => setImportOpen(false)}
                                className="flex size-8 items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-800"
                            >
                                <X className="size-4 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={submitImport} className="space-y-4 p-5">
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300">
                                <p className="mb-1 font-semibold">Заавар:</p>
                                <ol className="list-decimal space-y-0.5 pl-4">
                                    <li>
                                        Эхлээд <strong>Template татах</strong> товч дарна
                                    </li>
                                    <li>
                                        <strong>Цагаан</strong> нүдэнд утгуудыг оруулна (A, B, C багануудыг өөрчлөхгүй)
                                    </li>
                                    <li>
                                        <strong>Саарал ƒ</strong> багана томьёотой — гар хүрэх шаардлагагүй
                                    </li>
                                    <li>Excel (.xlsx) хэлбэрээр хадгалаад энд upload хийнэ</li>
                                </ol>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-800 dark:text-gray-200">Excel файл сонгох</label>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={(e) => importForm.setData('file', e.target.files?.[0] ?? null)}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs file:font-medium dark:border-zinc-700 dark:text-gray-300 dark:file:bg-zinc-800"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setImportOpen(false)}
                                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                    Болих
                                </button>
                                <button
                                    type="submit"
                                    disabled={!importForm.data.file || importForm.processing}
                                    className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40 dark:bg-white dark:text-gray-900"
                                >
                                    {importForm.processing ? (
                                        <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-gray-900/30 dark:border-t-gray-900" />
                                    ) : (
                                        <Upload className="size-3.5" />
                                    )}
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
