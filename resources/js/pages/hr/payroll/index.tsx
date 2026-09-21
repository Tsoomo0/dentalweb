import AppLayout from '@/layouts/app-layout';
import { CompletionRing, HR_PANEL_FX } from '@/components/hr/document-status';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Building2, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, DollarSign,
    FileSpreadsheet, Layers, MoreHorizontal, Plus, Save, Search, Send, Trash2,
    Users, Wallet, X, type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface PayrollRun {
    id: number; title: string; year: number; month: number;
    half: 'first' | 'second'; half_label: string; label: string | null;
    status: 'draft' | 'final'; entries_count: number; sent_entries_count: number;
    total_bank: number;
    created_at: string; created_by: string | null;
}
interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
}

interface Filters { state: string; year: string; branch: string; half: string; search: string }

interface Stats { total: number; draft: number; sending: number; final: number }

interface Props {
    runs: Paginated<PayrollRun>;
    branches: { id: number; name: string }[];
    filters: Filters;
    stats: Stats;
    /** Шүүсэн бүх тооцооны банкаар олгох дүн (зөвхөн энэ хуудсынх биш). */
    totalBank: number;
}

/** Хэсэгчилэн шинэчлэх талбарууд — салбарын жагсаалтыг дахин татахгүй. */
const PARTIAL = ['runs', 'stats', 'filters', 'totalBank'];

/**
 * Урьдчилан татах (prefetch) болон бодит зочлолт яг ижил параметртэй байж
 * кэш таарна. Тиймээс хоёулаа энэ нэг функцээс тохиргоогоо авна.
 */
function listVisit(data: Record<string, string | number>) {
    return {
        method: 'get' as const,
        data,
        only: PARTIAL,
        preserveState: true,
        preserveScroll: true,
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/employees' },
    { title: 'Цалингийн тооцоо', href: '/hr/payroll' },
];

const MONTHS = [
    { v:1,l:'1-р сар'},{v:2,l:'2-р сар'},{v:3,l:'3-р сар'},{v:4,l:'4-р сар'},
    {v:5,l:'5-р сар'},{v:6,l:'6-р сар'},{v:7,l:'7-р сар'},{v:8,l:'8-р сар'},
    {v:9,l:'9-р сар'},{v:10,l:'10-р сар'},{v:11,l:'11-р сар'},{v:12,l:'12-р сар'},
];

/** Жагсаалтын баганын өргөн — толгой мөр ба өгөгдлийн мөр нэг утгыг хуваана. */
const ROW_COLS = 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_128px_178px_minmax(0,132px)_88px]';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/* ───────────────────────── Төлөв ───────────────────────── */

type RunState = 'final' | 'sending' | 'sent' | 'draft';

interface StateStyle { label: string; icon: LucideIcon; pill: string; dot: string; accent: string; ring: string }

const STATE: Record<RunState, StateStyle> = {
    final: {
        label: 'Баталгаажсан', icon: CheckCircle2,
        pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
        dot: 'bg-emerald-500', accent: 'bg-emerald-500',
        ring: 'from-emerald-400 via-emerald-500 to-teal-600 shadow-emerald-600/35',
    },
    sending: {
        label: 'Илгээж буй', icon: Send,
        pill: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/60',
        dot: 'bg-orange-500', accent: 'bg-orange-400',
        ring: 'from-orange-400 via-orange-500 to-amber-600 shadow-orange-600/35',
    },
    sent: {
        label: 'Бүгд илгээсэн', icon: Send,
        pill: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60',
        dot: 'bg-blue-500', accent: 'bg-blue-400',
        ring: 'from-blue-400 via-blue-500 to-indigo-600 shadow-blue-600/35',
    },
    draft: {
        label: 'Ноорог', icon: Clock,
        pill: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60',
        dot: 'bg-amber-500', accent: 'bg-amber-400',
        ring: 'from-amber-400 via-amber-500 to-orange-600 shadow-amber-600/35',
    },
};

function stateOf(run: PayrollRun): RunState {
    if (run.status === 'final') return 'final';
    if (run.sent_entries_count > 0 && run.sent_entries_count < run.entries_count) return 'sending';
    if (run.sent_entries_count > 0 && run.sent_entries_count === run.entries_count) return 'sent';

    return 'draft';
}

function StatusPill({ run, className = '' }: { run: PayrollRun; className?: string }) {
    const s = STATE[stateOf(run)];
    const Icon = s.icon;

    return (
        <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ring-1 ring-inset ${s.pill} ${className}`}>
            <Icon className="size-3 shrink-0" />
            <span className="truncate">
                {stateOf(run) === 'sending' ? `${run.sent_entries_count}/${run.entries_count} илгээсэн` : s.label}
            </span>
        </span>
    );
}

/* ───────────────────────── Шинэ тооцоо үүсгэх ───────────────────────── */

function CreateForm({ branches, onClose, postUrl }: {
    branches: { id: number; name: string }[];
    onClose: () => void;
    postUrl: string;
}) {
    const now = new Date();
    const form = useForm({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        half: 'second' as 'first' | 'second',
        branch_id: '' as string | number,
        notes: '',
    });
    const selectedBranch = branches.find(b => b.id == form.data.branch_id);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.post(postUrl, { onSuccess: onClose });
    }

    return (
        <form onSubmit={submit}>
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-950/40">
                            <CalendarDays className="size-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Хугацаа</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Он *</label>
                            <input type="number" min={2020} max={2100} value={form.data.year}
                                onChange={e => form.setData('year', Number(e.target.value))}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Сар *</label>
                            <select value={form.data.month} onChange={e => form.setData('month', Number(e.target.value))}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { v:'first',  l:'Эхний цалин', sub:'1–15-ний хооронд',  active:'border-sky-400 bg-sky-50/60 dark:bg-sky-950/20' },
                            { v:'second', l:'Сүүл цалин',  sub:'16–31-ний хооронд', active:'border-violet-400 bg-violet-50/60 dark:bg-violet-950/20' },
                        ].map(opt => (
                            <button key={opt.v} type="button"
                                onClick={() => form.setData('half', opt.v as 'first'|'second')}
                                className={`relative rounded-xl border-2 px-4 py-2.5 text-left transition-all ${
                                    form.data.half === opt.v ? opt.active + ' shadow-sm' : 'border-border text-muted-foreground hover:bg-muted'
                                }`}>
                                {form.data.half === opt.v && <span className="absolute top-2 right-2 size-1.5 rounded-full bg-current opacity-60" />}
                                <p className="font-semibold text-sm">{opt.l}</p>
                                <p className="text-[11px] opacity-60 mt-0.5">{opt.sub}</p>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="border-t" />
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950/40">
                            <Building2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Салбар</p>
                    </div>
                    <select value={form.data.branch_id} onChange={e => form.setData('branch_id', e.target.value)}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">— Салбар сонгоно уу —</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    {form.errors.branch_id && <p className="text-xs text-red-500">{form.errors.branch_id}</p>}
                    {selectedBranch && (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
                            <ChevronRight className="size-3 text-emerald-500 shrink-0" />
                            <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                <strong>{selectedBranch.name}</strong> салбарын ажилтнуудын мөр үүснэ
                            </p>
                        </div>
                    )}
                </div>
                <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Тэмдэглэл</label>
                    <textarea rows={2} value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                        placeholder="Нэмэлт тэмдэглэл..."
                        className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40" />
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t bg-muted/20">
                <button type="button" onClick={onClose}
                    className="rounded-xl border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                    Болих
                </button>
                <button type="submit" disabled={form.processing || !form.data.branch_id}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 ring-1 ring-inset ring-white/20 transition-all hover:brightness-110 disabled:opacity-40 disabled:shadow-none">
                    {form.processing
                        ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        : <Save className="size-4" />}
                    Үүсгэх
                </button>
            </div>
        </form>
    );
}

/* ───────────────────────── Хуудаслалтын товч ───────────────────────── */

function PageBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} disabled={disabled}
            className="flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-background">
            {children}
        </button>
    );
}

/* ───────────────────────── Жагсаалтын мөр ───────────────────────── */

function RunRow({ run, index, menuOpen, onMenu, onCloseMenu, onDelete }: {
    run: PayrollRun;
    index: number;
    menuOpen: boolean;
    onMenu: () => void;
    onCloseMenu: () => void;
    onDelete: () => void;
}) {
    const state = stateOf(run);
    const s = STATE[state];
    const sentPct = run.entries_count > 0 ? Math.round((run.sent_entries_count / run.entries_count) * 100) : 0;

    return (
        <div
            style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
            onClick={() => router.visit(`/hr/payroll/${run.id}`)}
            className={`group relative grid animate-in cursor-pointer items-center gap-x-3 gap-y-2 px-4 py-2.5 transition-colors duration-200 fade-in slide-in-from-bottom-1 fill-mode-backwards hover:bg-gradient-to-r hover:from-muted/70 hover:via-muted/40 hover:to-transparent ${menuOpen ? 'z-30' : ''} ${ROW_COLS}`}>

            {/* Хулганаар дээгүүр очиход төлвийн өнгө сэмхэн гарч ирнэ */}
            <span aria-hidden className={`absolute inset-y-1.5 left-0 w-[3px] rounded-r-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${s.accent}`} />

            {/* Тооцоо */}
            <div className="flex min-w-0 items-center gap-2.5">
                <span className="relative shrink-0" title={s.label}>
                    <span className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ring-1 ring-inset ring-white/25 transition-transform duration-200 group-hover:scale-105 ${s.ring}`}>
                        <Wallet className="size-4" />
                    </span>
                    <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card ${s.dot}`} />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
                        {run.year} оны {run.month}-р сар
                        <span className="ml-1.5 font-normal text-muted-foreground">
                            {run.half === 'first' ? 'эхний цалин' : 'сүүл цалин'}
                        </span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] leading-tight text-muted-foreground">
                        <span className={`rounded px-1 py-px text-[10px] font-semibold ring-1 ring-inset ${
                            run.half === 'first'
                                ? 'bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300'
                                : 'bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300'}`}>
                            {run.half === 'first' ? '1–15' : '16–31'}
                        </span>
                        <span className="tabular-nums">{run.created_at}</span>
                    </p>
                </div>
            </div>

            {/* Салбар */}
            <div className="min-w-0">
                <p className="flex min-w-0 items-center gap-1.5 truncate text-[12px] leading-tight text-foreground">
                    <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                    {run.label ?? '—'}
                </p>
                {run.created_by && (
                    <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">{run.created_by}</p>
                )}
            </div>

            {/* Төлөв */}
            <div className="min-w-0"><StatusPill run={run} /></div>

            {/* Ажилтан ба илгээлтийн явц */}
            <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate whitespace-nowrap text-[11px] leading-tight text-muted-foreground">
                    <Users className="size-3.5 shrink-0" />
                    <span><span className="font-semibold tabular-nums text-foreground">{run.entries_count}</span> ажилтан</span>
                    {run.sent_entries_count > 0 && (
                        <span className="tabular-nums">· {run.sent_entries_count} илгээсэн</span>
                    )}
                </p>
                <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-muted">
                    <span className={`block h-full rounded-full transition-[width] duration-700 ${s.dot}`}
                        style={{ width: `${sentPct}%` }} />
                </span>
            </div>

            {/* Олгох дүн */}
            <div className="min-w-0 lg:text-right">
                <p className="truncate text-[13px] font-semibold leading-tight tabular-nums text-foreground">
                    {fmt(run.total_bank)}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">₮</span>
                </p>
                <p className="text-[10px] leading-tight text-muted-foreground">банкаар олгох</p>
            </div>

            {/* Үйлдэл */}
            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                <a href={`/hr/payroll/${run.id}/excel`} title="Excel татах"
                    className="flex h-7 items-center gap-1 rounded-md border bg-background/60 px-2 text-[11px] font-medium text-muted-foreground transition-all hover:border-emerald-500/40 hover:bg-muted hover:text-foreground active:scale-95">
                    <FileSpreadsheet className="size-3" /> Excel
                </a>

                <div className="relative">
                    <button onClick={onMenu} title="Бусад үйлдэл"
                        className={`flex size-7 items-center justify-center rounded-md border text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 ${
                            menuOpen ? 'bg-muted text-foreground' : 'bg-background/60'}`}>
                        <MoreHorizontal className="size-3.5" />
                    </button>

                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={onCloseMenu} />
                            <div className="absolute right-0 z-50 mt-1 w-44 origin-top-right animate-in overflow-hidden rounded-xl border bg-popover py-1 shadow-2xl ring-1 ring-black/5 zoom-in-95 fade-in duration-150 dark:ring-white/10">
                                <button onClick={() => { onCloseMenu(); router.visit(`/hr/payroll/${run.id}`); }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-muted">
                                    <Layers className="size-3.5 text-muted-foreground" /> Задаргаа харах
                                </button>
                                <a href={`/hr/payroll/${run.id}/excel`} onClick={onCloseMenu}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-muted">
                                    <FileSpreadsheet className="size-3.5 text-muted-foreground" /> Excel татах
                                </a>
                                <div className="my-1 h-px bg-border" />
                                <button onClick={() => { onCloseMenu(); onDelete(); }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                                    <Trash2 className="size-3.5" /> Устгах
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────── Хуудас ───────────────────────── */

export default function PayrollIndex({ runs, branches, filters, stats, totalBank }: Props) {
    const [delId, setDelId] = useState<number | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [menuFor, setMenuFor] = useState<number | null>(null);

    const [search, setSearch] = useState(filters.search ?? '');
    // Сервер хариу ирэхээс өмнө сонгосон таб идэвхтэй харагдана
    const [pendingState, setPendingState] = useState<string | null>(null);

    // Он сонгох жагсаалт — эдүгээгээс 5 жилийн өмнө хүртэл
    const years = useMemo(() => {
        const now = new Date().getFullYear();

        return Array.from({ length: 6 }, (_, i) => now - i);
    }, []);

    const hasFilter = !!(filters.state || filters.year || filters.branch || filters.half || filters.search);

    /** Шүүлтүүрийг сервер рүү дамжуулна — зөвхөн жагсаалт, тоо дахин татагдана. */
    function applyFilter(next: Partial<Filters>) {
        if (next.state !== undefined) setPendingState(next.state);

        router.visit('/hr/payroll', {
            ...listVisit({ ...filters, ...next, page: 1 }),
            replace: true,
            showProgress: false,
        });
    }

    function goToPage(page: number) {
        router.visit('/hr/payroll', {
            ...listVisit({ ...filters, page }),
            showProgress: false,
        });
    }

    function clearFilters() {
        setSearch('');
        router.get('/hr/payroll', {}, { preserveScroll: true, replace: true, only: PARTIAL });
    }

    // Серверээс төлөв батлагдмагц түр хадгалсан сонголтыг суллана
    useEffect(() => { setPendingState(null); }, [filters.state]);

    // Хайлтыг бичиж дуусахад нь илгээнэ
    useEffect(() => {
        if (search === (filters.search ?? '')) return;
        const t = setTimeout(() => applyFilter({ search }), 400);

        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    function confirmDelete(id: number) {
        router.delete(`/hr/payroll/${id}`, { onSuccess: () => setDelId(null) });
    }

    /**
     * Табуудын өгөгдлийг урьдчилан татаж кэшлэнэ — дарахад сүлжээ хүлээхгүй,
     * шууд солигдоно.
     */
    useEffect(() => {
        const t = setTimeout(() => {
            for (const key of ['', 'draft', 'sending', 'final']) {
                if (key === (filters.state ?? '')) continue;
                router.prefetch(
                    '/hr/payroll',
                    listVisit({ ...filters, state: key, page: 1 }),
                    { cacheFor: ['20s', '2m'] },
                );
            }
        }, 150);

        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.state, filters.year, filters.branch, filters.half, filters.search]);

    const tabs: Array<{ key: '' | RunState; label: string; value: number; Icon: LucideIcon; on: string }> = [
        { key: '',        label: 'Бүгд',         value: stats.total,   Icon: Layers,       on: 'bg-gradient-to-b from-slate-600 to-slate-700 shadow-slate-900/30' },
        { key: 'draft',   label: 'Ноорог',       value: stats.draft,   Icon: Clock,        on: 'bg-gradient-to-b from-amber-400 to-amber-500 shadow-amber-500/40' },
        { key: 'sending', label: 'Илгээсэн',     value: stats.sending, Icon: Send,         on: 'bg-gradient-to-b from-blue-500 to-blue-600 shadow-blue-600/40' },
        { key: 'final',   label: 'Баталгаажсан', value: stats.final,   Icon: CheckCircle2, on: 'bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-emerald-600/40' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Цалингийн тооцоо" />

            {/* ════ MOBILE ════ */}
            <div className="md:hidden min-h-full bg-[#f2f2f7] dark:bg-zinc-950">
                <div className="px-4 pt-6 pb-24">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 px-1 mb-3">
                        Цалингийн тооцоо
                    </p>

                    {runs.data.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 bg-white dark:bg-zinc-900 rounded-2xl" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                            <DollarSign className="size-10 text-gray-200 dark:text-zinc-700" />
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Цалингийн тооцоо байхгүй байна</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                            {runs.data.map(r => (
                                <div key={r.id} className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-zinc-800 transition-colors cursor-pointer"
                                    onClick={() => router.visit(`/hr/payroll/${r.id}`)}>
                                    <div className={`size-10 rounded-full bg-gradient-to-br ${STATE[stateOf(r)].ring} flex items-center justify-center shrink-0 text-white shadow-sm`}>
                                        <Wallet className="size-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{r.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <StatusPill run={r} />
                                            <span className="text-xs text-gray-400 dark:text-zinc-500">{r.entries_count} ажилтан</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <a href={`/hr/payroll/${r.id}/excel`}
                                            className="size-8 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                            <FileSpreadsheet className="size-4 text-gray-500 dark:text-zinc-400" />
                                        </a>
                                        <button onClick={() => setDelId(r.id)}
                                            className="size-8 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                                            <Trash2 className="size-4 text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {runs.last_page > 1 && (
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-white dark:bg-zinc-900 px-4 py-2.5" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                            <button disabled={runs.current_page === 1} onClick={() => goToPage(runs.current_page - 1)}
                                className="flex size-8 items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 disabled:opacity-40">
                                <ChevronLeft className="size-4" />
                            </button>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">
                                <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{runs.current_page} / {runs.last_page}</span>
                                <span className="ml-1.5 tabular-nums">({runs.total} тооцоо)</span>
                            </p>
                            <button disabled={runs.current_page === runs.last_page} onClick={() => goToPage(runs.current_page + 1)}
                                className="flex size-8 items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 disabled:opacity-40">
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* FAB */}
                <button onClick={() => setCreateOpen(true)}
                    className="fixed bottom-6 right-5 flex items-center gap-2 rounded-full bg-gray-900 dark:bg-white px-5 py-3.5 text-sm font-bold text-white dark:text-gray-900 shadow-lg active:scale-95 transition-transform z-40">
                    <Plus className="size-5" /> Шинэ тооцоо
                </button>
            </div>

            {/* ════ DESKTOP ════ */}
            <div className="hidden md:block space-y-3 p-4 md:p-5">

                {/* ── Толгой + түргэн шүүлтүүр (нэг самбар) ── */}
                <section className="relative isolate overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-emerald-50/80 via-card to-teal-50/50 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(16,185,129,0.35)] dark:from-emerald-950/30 dark:via-card dark:to-teal-950/20">
                    {/* Гоёл — хөвөгч туяа ба нарийн торон бүтэц */}
                    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                        <div className="hr-drift absolute -left-20 -top-28 size-64 rounded-full bg-emerald-400/25 blur-3xl dark:bg-emerald-500/20" />
                        <div className="hr-drift-2 absolute -right-16 -top-32 size-64 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/15" />
                        <div className="hr-drift-2 absolute -bottom-32 left-1/3 size-56 rounded-full bg-sky-400/10 blur-3xl" />
                        <div className="hr-grid absolute inset-0 opacity-[0.55]" />
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
                    </div>

                    <div className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-3 px-4 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/35 ring-1 ring-inset ring-white/30">
                                <span aria-hidden className="absolute inset-x-1.5 top-1 h-1/3 rounded-full bg-white/25 blur-[2px]" />
                                <Wallet className="relative size-5" />
                            </span>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h1 className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-lg font-extrabold leading-none tracking-tight text-transparent">
                                        Цалингийн тооцоо
                                    </h1>
                                    <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/25 sm:inline dark:text-emerald-300">
                                        сард 2 удаа
                                    </span>
                                </div>
                                <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] leading-none text-muted-foreground">
                                    {['Тооцоо үүсгэх', 'Задаргаа бөглөх', 'Баталгаажуулах', 'Ажилтанд илгээх'].map((step, i) => (
                                        <span key={step} className="inline-flex items-center gap-1">
                                            {i > 0 && <ChevronRight className="size-3 text-emerald-500/50" />}
                                            {step}
                                        </span>
                                    ))}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-1 shrink-0 items-center justify-end gap-2">
                            <CompletionRing value={stats.final} total={stats.total} label="Баталгаажсан"
                                title={`Нийт ${stats.total} тооцооноос ${stats.final} нь баталгаажсан`} />

                            <div className="hidden shrink-0 rounded-xl border border-border/70 bg-background/70 px-3 py-1.5 text-right shadow-sm backdrop-blur xl:block">
                                <p className="text-[10px] leading-tight text-muted-foreground">Банкаар олгох дүн</p>
                                <p className="text-[13px] font-bold leading-tight tabular-nums text-foreground">
                                    {fmt(totalBank)}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">₮</span>
                                </p>
                            </div>

                            <div className="relative min-w-[180px] max-w-xs flex-1 sm:w-56 sm:flex-none">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                <input value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Сар, салбараар хайх…"
                                    className="h-9 w-full rounded-xl border border-border/70 bg-background/70 pl-8 pr-7 text-xs shadow-sm backdrop-blur transition-all placeholder:text-muted-foreground focus:border-emerald-500/60 focus:outline-none focus:ring-4 focus:ring-emerald-500/10" />
                                {search && (
                                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            <button onClick={() => setCreateOpen(true)}
                                className="group relative isolate flex h-9 items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-3.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/35 ring-1 ring-inset ring-white/25 transition-all hover:-translate-y-px hover:shadow-xl hover:shadow-emerald-600/45 hover:brightness-110 active:translate-y-0 active:scale-[0.97]">
                                <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                                <Plus className="relative size-3.5 transition-transform duration-300 group-hover:rotate-90" />
                                <span className="relative">Шинэ тооцоо</span>
                            </button>
                        </div>
                    </div>

                    <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-border/50 bg-background/40 px-3 py-2 backdrop-blur-sm">
                        <div className="flex items-center gap-1 overflow-x-auto">
                            {tabs.map(({ key, label, value, Icon, on }) => {
                                const active = (pendingState ?? filters.state ?? '') === key;

                                return (
                                    <button key={key || 'all'} onClick={() => applyFilter({ state: key })}
                                        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all active:scale-[0.97] ${
                                            active
                                                ? `${on} text-white shadow-md ring-1 ring-inset ring-white/25`
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                        <Icon className="size-3.5 shrink-0" />
                                        {label}
                                        <span className={`rounded px-1 text-[10px] font-semibold tabular-nums ${
                                            active ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'}`}>
                                            {value}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2">
                            <select value={filters.year} onChange={e => applyFilter({ year: e.target.value })}
                                className="h-8 rounded-lg border border-border/70 bg-background/70 px-2 text-xs text-foreground backdrop-blur focus:border-emerald-500/60 focus:outline-none focus:ring-4 focus:ring-emerald-500/10">
                                <option value="">Бүх он</option>
                                {years.map(y => <option key={y} value={y}>{y} он</option>)}
                            </select>

                            <select value={filters.branch} onChange={e => applyFilter({ branch: e.target.value })}
                                className="h-8 rounded-lg border border-border/70 bg-background/70 px-2 text-xs text-foreground backdrop-blur focus:border-emerald-500/60 focus:outline-none focus:ring-4 focus:ring-emerald-500/10">
                                <option value="">Бүх салбар</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>

                            <select value={filters.half} onChange={e => applyFilter({ half: e.target.value })}
                                className="h-8 rounded-lg border border-border/70 bg-background/70 px-2 text-xs text-foreground backdrop-blur focus:border-emerald-500/60 focus:outline-none focus:ring-4 focus:ring-emerald-500/10">
                                <option value="">Эхэн + сүүл</option>
                                <option value="first">Эхний цалин</option>
                                <option value="second">Сүүл цалин</option>
                            </select>

                            {hasFilter && (
                                <button title="Шүүлтүүр цэвэрлэх" onClick={clearFilters}
                                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.97]">
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── Жагсаалт ── */}
                {runs.data.length === 0 ? (
                    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-card/40 px-6 py-14 text-center">
                        <div aria-hidden className="pointer-events-none absolute left-1/2 top-8 size-40 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
                        <span className="relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/40 ring-1 ring-inset ring-border">
                            <Wallet className="size-5 text-muted-foreground/70" />
                        </span>
                        <p className="relative mt-3 text-sm font-semibold text-foreground">
                            {hasFilter ? 'Шүүлтүүрт тохирох тооцоо олдсонгүй' : 'Одоогоор цалингийн тооцоо үүсгээгүй байна'}
                        </p>
                        <p className="relative mt-1 max-w-sm text-xs text-muted-foreground">
                            {hasFilter
                                ? 'Шүүлтүүрээ өөрчилж эсвэл цэвэрлээд дахин үзнэ үү.'
                                : 'Салбар сонгон тооцоо үүсгэхэд тухайн салбарын ажилтнуудаар мөр автоматаар бэлдэнэ.'}
                        </p>
                        {hasFilter ? (
                            <button onClick={clearFilters}
                                className="relative mt-4 flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.97]">
                                <X className="size-3.5" /> Шүүлтүүр цэвэрлэх
                            </button>
                        ) : (
                            <button onClick={() => setCreateOpen(true)}
                                className="relative mt-4 flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-600 px-3 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 ring-1 ring-inset ring-white/20 transition-all hover:brightness-110 active:scale-[0.97]">
                                <Plus className="size-3.5" /> Эхний тооцоог үүсгэх
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-20px_rgba(0,0,0,0.25)]">
                        {/* Баганын гарчиг */}
                        <div className={`hidden gap-x-3 rounded-t-2xl border-b border-border/60 bg-gradient-to-b from-muted/70 to-muted/25 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur lg:grid ${ROW_COLS}`}>
                            <span>Тооцоо</span>
                            <span>Салбар</span>
                            <span>Төлөв</span>
                            <span>Ажилтан</span>
                            <span className="text-right">Олгох дүн</span>
                            <span className="text-right">Үйлдэл</span>
                        </div>

                        <div className="divide-y divide-border/50 [&>*:first-child]:rounded-t-[15px] [&>*:last-child]:rounded-b-[15px] lg:[&>*:first-child]:rounded-t-none">
                            {runs.data.map((r, i) => (
                                <RunRow
                                    key={r.id}
                                    run={r}
                                    index={i}
                                    menuOpen={menuFor === r.id}
                                    onMenu={() => setMenuFor(menuFor === r.id ? null : r.id)}
                                    onCloseMenu={() => setMenuFor(null)}
                                    onDelete={() => setDelId(r.id)}
                                />
                            ))}
                        </div>

                        {/* Дүн ба хуудаслалт */}
                        <div className="flex items-center justify-between gap-3 rounded-b-2xl border-t border-border/60 bg-gradient-to-b from-muted/10 to-muted/30 px-4 py-2">
                            <p className="text-[11px] text-muted-foreground">
                                <span className="font-semibold tabular-nums text-foreground">{runs.from}–{runs.to}</span> / {runs.total} тооцоо
                                {hasFilter && <span className="ml-1">(шүүсэн)</span>}
                                <span className="mx-1.5 text-muted-foreground/40">·</span>
                                Банкаар олгох нийт{' '}
                                <span className="font-bold tabular-nums text-foreground">{fmt(totalBank)}₮</span>
                            </p>

                            {runs.last_page > 1 && (
                                <div className="flex items-center gap-1">
                                    <PageBtn disabled={runs.current_page === 1} onClick={() => goToPage(runs.current_page - 1)}>
                                        <ChevronLeft className="size-3.5" />
                                    </PageBtn>
                                    <span className="px-2 text-[11px] font-medium tabular-nums text-muted-foreground">
                                        {runs.current_page} / {runs.last_page}
                                    </span>
                                    <PageBtn disabled={runs.current_page === runs.last_page} onClick={() => goToPage(runs.current_page + 1)}>
                                        <ChevronRight className="size-3.5" />
                                    </PageBtn>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Create bottom sheet (shared) ── */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4"
                    onClick={() => setCreateOpen(false)}>
                    <div className="w-full md:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}>
                        <div className="md:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                        </div>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Шинэ цалингийн тооцоо</h2>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Салбарын ажилтнуудаар автоматаар мөр үүснэ</p>
                            </div>
                            <button onClick={() => setCreateOpen(false)}
                                className="size-8 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                <X className="size-4 text-gray-500 dark:text-zinc-400" />
                            </button>
                        </div>
                        <CreateForm branches={branches} onClose={() => setCreateOpen(false)} postUrl="/hr/payroll" />
                    </div>
                </div>
            )}

            {/* ── Delete confirm bottom sheet (shared) ── */}
            {delId !== null && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4"
                    onClick={() => setDelId(null)}>
                    <div className="w-full md:max-w-xs bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-2xl shadow-2xl p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="md:hidden flex justify-center mb-2">
                            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Цалингийн тооцоог устгах уу?</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">Устгасан тооцоог сэргээх боломжгүй.</p>
                        <div className="flex gap-2">
                            <button onClick={() => confirmDelete(delId)}
                                className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white active:scale-[0.98] transition-transform">
                                Устгах
                            </button>
                            <button onClick={() => setDelId(null)}
                                className="flex-1 rounded-2xl bg-gray-100 dark:bg-zinc-800 py-3 text-sm font-semibold text-gray-600 dark:text-zinc-300 active:scale-[0.98] transition-transform">
                                Болих
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{HR_PANEL_FX}</style>
        </AppLayout>
    );
}
