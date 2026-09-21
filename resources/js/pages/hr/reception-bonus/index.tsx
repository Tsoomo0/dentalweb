import AppLayout from '@/layouts/app-layout';
import { CompletionRing, HR_PANEL_FX } from '@/components/hr/document-status';
import {
    HrButton, HrClearButton, HrEmpty, HrGhostButton, HrListBody, HrListCard, HrListHead,
    HrPager, HrPanel, HrRow, HrSearch, HrSelect, HrTabs,
} from '@/components/hr/page-panel';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Building2, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, FileSpreadsheet,
    Layers, Plus, Save, Send, Star, Trash2, Users, X, type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface BonusRun {
    id: number; title: string; year: number; month: number;
    half: 'first' | 'second'; half_label: string; label: string | null;
    status: 'draft' | 'final'; entries_count: number; sent_entries_count: number;
    total_bonus: number;
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

interface Branch { id: number; name: string }
interface Filters { state: string; year: string; branch: string; half: string; search: string }
interface Stats { total: number; draft: number; sending: number; final: number }

interface Props {
    runs: Paginated<BonusRun>;
    branches: Branch[];
    filters: Filters;
    stats: Stats;
    /** Шүүсэн бүх тооцооны урамшууллын дүн (зөвхөн энэ хуудсынх биш). */
    totalBonus: number;
}

/** Хэсэгчилэн шинэчлэх талбарууд — салбарын жагсаалтыг дахин татахгүй. */
const PARTIAL = ['runs', 'stats', 'filters', 'totalBonus'];

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
    { title: 'Ресепшний урамшуулал', href: '/hr/reception-bonus' },
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

function stateOf(run: BonusRun): RunState {
    if (run.status === 'final') return 'final';
    if (run.sent_entries_count > 0 && run.sent_entries_count < run.entries_count) return 'sending';
    if (run.sent_entries_count > 0 && run.sent_entries_count === run.entries_count) return 'sent';

    return 'draft';
}

function StatusPill({ run }: { run: BonusRun }) {
    const s = STATE[stateOf(run)];
    const Icon = s.icon;

    return (
        <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ring-1 ring-inset ${s.pill}`}>
            <Icon className="size-3 shrink-0" />
            <span className="truncate">
                {stateOf(run) === 'sending' ? `${run.sent_entries_count}/${run.entries_count} илгээсэн` : s.label}
            </span>
        </span>
    );
}

/* ───────────────────────── Шинэ тооцоо үүсгэх ───────────────────────── */

function CreateForm({ branches, onClose }: { branches: Branch[]; onClose: () => void }) {
    const now = new Date();
    const form = useForm({
        year: now.getFullYear(), month: now.getMonth() + 1,
        half: 'second' as 'first'|'second', branch_id: '' as string|number, notes: '',
    });
    const selectedBranch = branches.find(b => b.id == form.data.branch_id);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.post('/hr/reception-bonus', { onSuccess: onClose });
    }

    return (
        <form onSubmit={submit}>
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-950/40">
                            <CalendarDays className="size-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Хугацаа</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-zinc-400">Он *</label>
                            <input type="number" min={2020} max={2100} value={form.data.year}
                                onChange={e => form.setData('year', Number(e.target.value))}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-zinc-400">Сар *</label>
                            <select value={form.data.month} onChange={e => form.setData('month', Number(e.target.value))}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { v:'first',  l:'Сарын эхэн', sub:'1–15-ний хооронд',  active:'border-sky-400 bg-sky-50/60 dark:bg-sky-950/20' },
                            { v:'second', l:'Сарын сүүл', sub:'16–31-ний хооронд', active:'border-violet-400 bg-violet-50/60 dark:bg-violet-950/20' },
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
                <div className="border-t border-gray-100 dark:border-zinc-800" />
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-950/40">
                            <Building2 className="size-3.5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Салбар</p>
                    </div>
                    <select value={form.data.branch_id} onChange={e => form.setData('branch_id', e.target.value)}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">— Салбар сонгоно уу —</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    {form.errors.branch_id && <p className="text-xs text-red-500">{form.errors.branch_id}</p>}
                    {selectedBranch && (
                        <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/20">
                            <ChevronRight className="size-3 shrink-0 text-violet-500" />
                            <p className="text-xs text-violet-700 dark:text-violet-300">
                                <strong>{selectedBranch.name}</strong> салбарын ресепшн ажилтнуудын мөр үүснэ
                            </p>
                        </div>
                    )}
                </div>
                <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-zinc-400">Тэмдэглэл</label>
                    <textarea rows={2} value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                        placeholder="Нэмэлт тэмдэглэл..."
                        className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40" />
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-800/30">
                <button type="button" onClick={onClose}
                    className="rounded-xl border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                    Болих
                </button>
                <button type="submit" disabled={form.processing || !form.data.branch_id}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-violet-600/30 ring-1 ring-inset ring-white/20 transition-all hover:brightness-110 disabled:opacity-40 disabled:shadow-none">
                    {form.processing
                        ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        : <Save className="size-4" />}
                    Үүсгэх
                </button>
            </div>
        </form>
    );
}

/* ───────────────────────── Хуудас ───────────────────────── */

export default function ReceptionBonusIndex({ runs, branches, filters, stats, totalBonus }: Props) {
    const [delId, setDelId] = useState<number | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');
    const [pendingState, setPendingState] = useState<string | null>(null);

    const years = useMemo(() => {
        const now = new Date().getFullYear();

        return Array.from({ length: 6 }, (_, i) => now - i);
    }, []);

    const hasFilter = !!(filters.state || filters.year || filters.branch || filters.half || filters.search);

    function applyFilter(next: Partial<Filters>) {
        if (next.state !== undefined) setPendingState(next.state);

        router.visit('/hr/reception-bonus', {
            ...listVisit({ ...filters, ...next, page: 1 }),
            replace: true,
            showProgress: false,
        });
    }

    function goToPage(page: number) {
        router.visit('/hr/reception-bonus', { ...listVisit({ ...filters, page }), showProgress: false });
    }

    function clearFilters() {
        setSearch('');
        router.get('/hr/reception-bonus', {}, { preserveScroll: true, replace: true, only: PARTIAL });
    }

    useEffect(() => { setPendingState(null); }, [filters.state]);

    useEffect(() => {
        if (search === (filters.search ?? '')) return;
        const t = setTimeout(() => applyFilter({ search }), 400);

        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    function confirmDelete(id: number) {
        router.delete(`/hr/reception-bonus/${id}`, { onSuccess: () => setDelId(null) });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ресепшний урамшуулал" />

            {/* ════ MOBILE ════ */}
            <div className="md:hidden min-h-full bg-[#f2f2f7] dark:bg-zinc-950">
                <div className="px-4 pt-6 pb-24">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 px-1 mb-3">
                        Ресепшний урамшуулал
                    </p>
                    {runs.data.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 bg-white dark:bg-zinc-900 rounded-2xl" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                            <Star className="size-10 text-gray-200 dark:text-zinc-700" />
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Урамшуулал байхгүй байна</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                            {runs.data.map(r => (
                                <div key={r.id} className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-zinc-800 transition-colors cursor-pointer"
                                    onClick={() => router.visit(`/hr/reception-bonus/${r.id}`)}>
                                    <div className={`size-10 rounded-full bg-gradient-to-br ${STATE[stateOf(r)].ring} flex items-center justify-center shrink-0 text-white shadow-sm`}>
                                        <Star className="size-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{r.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <StatusPill run={r} />
                                            <span className="text-xs text-gray-400 dark:text-zinc-500">{r.entries_count} ажилтан</span>
                                        </div>
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); setDelId(r.id); }}
                                        className="size-8 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                                        <Trash2 className="size-4 text-red-500" />
                                    </button>
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
                    className="fixed bottom-6 right-5 flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg active:scale-95 transition-transform z-40">
                    <Plus className="size-5" /> Шинэ тооцоо
                </button>
            </div>

            {/* ════ DESKTOP ════ */}
            <div className="hidden md:block space-y-3 p-4 md:p-5">

                <HrPanel
                    tone="violet"
                    icon={Star}
                    title="Ресепшний урамшуулал"
                    badge="сард 2 удаа"
                    steps={['Тооцоо үүсгэх', 'Гүйцэтгэл бүртгэх', 'Баталгаажуулах', 'Ажилтанд илгээх']}
                    actions={
                        <>
                            <CompletionRing value={stats.final} total={stats.total} label="Баталгаажсан"
                                title={`Нийт ${stats.total} тооцооноос ${stats.final} нь баталгаажсан`} />

                            <div className="hidden shrink-0 rounded-xl border border-border/70 bg-background/70 px-3 py-1.5 text-right shadow-sm backdrop-blur xl:block">
                                <p className="text-[10px] leading-tight text-muted-foreground">Урамшууллын дүн</p>
                                <p className="text-[13px] font-bold leading-tight tabular-nums text-foreground">
                                    {fmt(totalBonus)}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">₮</span>
                                </p>
                            </div>

                            <HrSearch tone="violet" value={search} onChange={setSearch} placeholder="Сар, салбараар хайх…" />

                            <HrButton tone="violet" icon={Plus} onClick={() => setCreateOpen(true)}>Шинэ тооцоо</HrButton>
                        </>
                    }
                    tabs={
                        <HrTabs
                            tone="violet"
                            active={pendingState ?? filters.state ?? ''}
                            onChange={key => applyFilter({ state: key })}
                            items={[
                                { key: '', label: 'Бүгд', value: stats.total, Icon: Layers, on: 'from-slate-600 to-slate-700 shadow-slate-900/30' },
                                { key: 'draft', label: 'Ноорог', value: stats.draft, Icon: Clock, on: 'from-amber-400 to-amber-500 shadow-amber-500/40' },
                                { key: 'sending', label: 'Илгээсэн', value: stats.sending, Icon: Send, on: 'from-blue-500 to-blue-600 shadow-blue-600/40' },
                                { key: 'final', label: 'Баталгаажсан', value: stats.final, Icon: CheckCircle2, on: 'from-emerald-500 to-emerald-600 shadow-emerald-600/40' },
                            ]}
                        />
                    }
                    filters={
                        <>
                            <HrSelect tone="violet" value={filters.year} onChange={v => applyFilter({ year: v })}>
                                <option value="">Бүх он</option>
                                {years.map(y => <option key={y} value={y}>{y} он</option>)}
                            </HrSelect>

                            <HrSelect tone="violet" value={filters.branch} onChange={v => applyFilter({ branch: v })}>
                                <option value="">Бүх салбар</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </HrSelect>

                            <HrSelect tone="violet" value={filters.half} onChange={v => applyFilter({ half: v })}>
                                <option value="">Эхэн + сүүл</option>
                                <option value="first">Сарын эхэн</option>
                                <option value="second">Сарын сүүл</option>
                            </HrSelect>

                            {hasFilter && <HrClearButton onClick={clearFilters} />}
                        </>
                    }
                />

                {/* ── Жагсаалт ── */}
                {runs.data.length === 0 ? (
                    <HrEmpty
                        tone="violet"
                        icon={Star}
                        title={hasFilter ? 'Шүүлтүүрт тохирох тооцоо олдсонгүй' : 'Одоогоор урамшууллын тооцоо үүсгээгүй байна'}
                        hint={hasFilter
                            ? 'Шүүлтүүрээ өөрчилж эсвэл цэвэрлээд дахин үзнэ үү.'
                            : 'Салбар сонгон тооцоо үүсгэхэд ресепшн ажилтнуудаар мөр автоматаар бэлдэнэ.'}
                        action={hasFilter
                            ? <HrGhostButton onClick={clearFilters}>Шүүлтүүр цэвэрлэх</HrGhostButton>
                            : <HrButton tone="violet" icon={Plus} onClick={() => setCreateOpen(true)}>Эхний тооцоог үүсгэх</HrButton>}
                    />
                ) : (
                    <HrListCard>
                        <HrListHead cols={ROW_COLS}>
                            <span>Тооцоо</span>
                            <span>Салбар</span>
                            <span>Төлөв</span>
                            <span>Ажилтан</span>
                            <span className="text-right">Урамшуулал</span>
                            <span className="text-right">Үйлдэл</span>
                        </HrListHead>

                        <HrListBody>
                            {runs.data.map((r, i) => {
                                const s = STATE[stateOf(r)];
                                const sentPct = r.entries_count > 0 ? Math.round((r.sent_entries_count / r.entries_count) * 100) : 0;

                                return (
                                    <HrRow key={r.id} cols={ROW_COLS} index={i} accent={s.accent}
                                        onClick={() => router.visit(`/hr/reception-bonus/${r.id}`)}>

                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <span className="relative shrink-0" title={s.label}>
                                                <span className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ring-1 ring-inset ring-white/25 transition-transform duration-200 group-hover:scale-105 ${s.ring}`}>
                                                    <Star className="size-4" />
                                                </span>
                                                <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card ${s.dot}`} />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
                                                    {r.year} оны {r.month}-р сар
                                                    <span className="ml-1.5 font-normal text-muted-foreground">
                                                        {r.half === 'first' ? 'эхэн' : 'сүүл'}
                                                    </span>
                                                </p>
                                                <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] leading-tight text-muted-foreground">
                                                    <span className={`rounded px-1 py-px text-[10px] font-semibold ring-1 ring-inset ${
                                                        r.half === 'first'
                                                            ? 'bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300'
                                                            : 'bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300'}`}>
                                                        {r.half === 'first' ? '1–15' : '16–31'}
                                                    </span>
                                                    <span className="tabular-nums">{r.created_at}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="min-w-0">
                                            <p className="flex min-w-0 items-center gap-1.5 truncate text-[12px] leading-tight text-foreground">
                                                <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                                                {r.label ?? '—'}
                                            </p>
                                            {r.created_by && (
                                                <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">{r.created_by}</p>
                                            )}
                                        </div>

                                        <div className="min-w-0"><StatusPill run={r} /></div>

                                        <div className="min-w-0">
                                            <p className="flex items-center gap-1.5 truncate whitespace-nowrap text-[11px] leading-tight text-muted-foreground">
                                                <Users className="size-3.5 shrink-0" />
                                                <span><span className="font-semibold tabular-nums text-foreground">{r.entries_count}</span> ажилтан</span>
                                                {r.sent_entries_count > 0 && <span className="tabular-nums">· {r.sent_entries_count} илгээсэн</span>}
                                            </p>
                                            <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-muted">
                                                <span className={`block h-full rounded-full transition-[width] duration-700 ${s.dot}`}
                                                    style={{ width: `${sentPct}%` }} />
                                            </span>
                                        </div>

                                        <div className="min-w-0 lg:text-right">
                                            <p className="truncate text-[13px] font-semibold leading-tight tabular-nums text-foreground">
                                                {fmt(r.total_bonus)}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">₮</span>
                                            </p>
                                            <p className="text-[10px] leading-tight text-muted-foreground">нийт урамшуулал</p>
                                        </div>

                                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                            <a href={`/hr/reception-bonus/${r.id}/excel`} title="Excel татах"
                                                className="flex h-7 items-center gap-1 rounded-md border bg-background/60 px-2 text-[11px] font-medium text-muted-foreground transition-all hover:border-violet-500/40 hover:bg-muted hover:text-foreground active:scale-95">
                                                <FileSpreadsheet className="size-3" /> Excel
                                            </a>
                                            <button onClick={() => setDelId(r.id)} title="Устгах"
                                                className="flex size-7 items-center justify-center rounded-md border bg-background/60 text-red-500 transition-all hover:bg-red-50 active:scale-95 dark:hover:bg-red-950/30">
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </HrRow>
                                );
                            })}
                        </HrListBody>

                        <HrPager
                            page={runs.current_page} lastPage={runs.last_page}
                            from={runs.from} to={runs.to} total={runs.total} unit="тооцоо"
                            onPage={goToPage}
                            extra={
                                <>
                                    {hasFilter && <span className="ml-1">(шүүсэн)</span>}
                                    <span className="mx-1.5 text-muted-foreground/40">·</span>
                                    Нийт урамшуулал{' '}
                                    <span className="font-bold tabular-nums text-foreground">{fmt(totalBonus)}₮</span>
                                </>
                            }
                        />
                    </HrListCard>
                )}
            </div>

            {/* Create bottom sheet */}
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
                                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Шинэ урамшууллын тооцоо</h2>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Ресепшн ажилтнуудаар автоматаар мөр үүснэ</p>
                            </div>
                            <button onClick={() => setCreateOpen(false)}
                                className="size-8 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                <X className="size-4 text-gray-500" />
                            </button>
                        </div>
                        <CreateForm branches={branches} onClose={() => setCreateOpen(false)} />
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {delId !== null && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4"
                    onClick={() => setDelId(null)}>
                    <div className="w-full md:max-w-xs bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-2xl shadow-2xl p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="md:hidden flex justify-center mb-2">
                            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Устгах уу?</p>
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
