import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Building2, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, ChevronUp,
    Clock, Coins, FileSpreadsheet, Heart, Layers, Plus, Save, Search, Send, SendHorizontal, Trash2, Users, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface BonusRun {
    id: number; title: string; date: string | null;
    year: number; month: number;
    half: 'first' | 'second'; half_label: string; label: string | null;
    employee_id: number | null;
    employee_name: string | null;
    status: 'draft' | 'final'; entries_count: number; sent_entries_count: number;
    total_amount: number;
    created_at: string; created_by: string | null;
}
interface Branch { id: number; name: string }
interface Nurse { id: number; name: string; branch_id: number | null }
interface Props { runs: BonusRun[]; branches: Branch[]; nurses: Nurse[] }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/employees' },
    { title: 'Сувилагчийн урамшуулал', href: '/hr/nurse-bonus' },
];

const MONTHS = [
    { v:1,l:'1-р сар'},{v:2,l:'2-р сар'},{v:3,l:'3-р сар'},{v:4,l:'4-р сар'},
    {v:5,l:'5-р сар'},{v:6,l:'6-р сар'},{v:7,l:'7-р сар'},{v:8,l:'8-р сар'},
    {v:9,l:'9-р сар'},{v:10,l:'10-р сар'},{v:11,l:'11-р сар'},{v:12,l:'12-р сар'},
];

function StatusBadge({ run }: { run: BonusRun }) {
    if (run.status === 'final') return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="size-3" /> Баталгаажсан
        </span>
    );
    if (run.sent_entries_count > 0 && run.sent_entries_count < run.entries_count) return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
            <Send className="size-3" /> {run.sent_entries_count}/{run.entries_count} илгээсэн
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <Clock className="size-3" /> Ноорог
        </span>
    );
}

function CreateForm({ branches, nurses, onClose }: { branches: Branch[]; nurses: Nurse[]; onClose: () => void }) {
    const now = new Date();
    const form = useForm({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        half: 'first' as 'first' | 'second',
        branch_id: '' as string | number,
        employee_id: '' as string | number,
        notes: '',
    });
    const selectedBranch = branches.find(b => b.id == form.data.branch_id);
    const filteredNurses = useMemo(
        () => form.data.branch_id ? nurses.filter(n => n.branch_id == form.data.branch_id) : nurses,
        [nurses, form.data.branch_id]
    );

    // Сонгосон сувилагч салбараас гарвал утгыг арилгана
    useEffect(() => {
        if (form.data.employee_id && !filteredNurses.find(n => n.id == form.data.employee_id)) {
            form.setData('employee_id', '');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data.branch_id]);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.post('/hr/nurse-bonus', { onSuccess: onClose });
    }

    return (
        <form onSubmit={submit}>
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-950/40">
                            <CalendarDays className="size-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wider">Хугацаа</p>
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
                                onClick={() => form.setData('half', opt.v as 'first' | 'second')}
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
                        <div className="flex size-6 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950/40">
                            <Building2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wider">Салбар</p>
                    </div>
                    <select value={form.data.branch_id} onChange={e => form.setData('branch_id', e.target.value)}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">— Салбар сонгоно уу —</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    {form.errors.branch_id && <p className="text-xs text-red-500">{form.errors.branch_id}</p>}
                </div>
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider">Сувилагч</p>
                    <select value={form.data.employee_id} onChange={e => form.setData('employee_id', e.target.value)}
                        disabled={!form.data.branch_id}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50">
                        <option value="">{form.data.branch_id ? '— Сувилагч сонгоно уу —' : 'Эхлээд салбар сонгоно уу'}</option>
                        {filteredNurses.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                    {form.errors.employee_id && <p className="text-xs text-red-500">{form.errors.employee_id}</p>}
                    {selectedBranch && form.data.employee_id && (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
                            <ChevronRight className="size-3 text-emerald-500 shrink-0" />
                            <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                Тухайн хагас сарын <strong>{form.data.half === 'first' ? '1–15' : '16–31'}</strong> өдрүүдэд хоосон мөрүүд үүснэ
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
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30">
                <button type="button" onClick={onClose}
                    className="rounded-xl border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                    Болих
                </button>
                <button type="submit" disabled={form.processing || !form.data.branch_id || !form.data.employee_id}
                    className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 transition-all">
                    {form.processing
                        ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        : <Save className="size-4" />}
                    Үүсгэх
                </button>
            </div>
        </form>
    );
}

function StatCard({ icon: Icon, label, value, accent, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; accent: string; sub?: string }) {
    return (
        <div className={`rounded-2xl border bg-card shadow-sm p-4 flex items-center gap-3`}>
            <div className={`size-10 rounded-xl flex items-center justify-center ${accent}`}>
                <Icon className="size-5" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-foreground tabular-nums leading-tight mt-0.5">{value}</p>
                {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
            </div>
        </div>
    );
}

function fmtMnt(n: number): string {
    if (!n) return '0₮';
    return Math.round(n).toLocaleString() + '₮';
}

function periodKey(r: BonusRun): string {
    return `${r.year}-${String(r.month).padStart(2, '0')}-${r.half}`;
}
function periodLabel(r: BonusRun): string {
    return `${r.year} оны ${r.month}-р сар · ${r.half === 'first' ? '1–15' : '16–31'}`;
}

function DesktopView({ runs, drafts, onCreate, onBulk, onDelete }: {
    runs: BonusRun[]; drafts: BonusRun[];
    onCreate: () => void; onBulk: () => void; onDelete: (id: number) => void;
}) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'final'>('all');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const finalRuns = runs.filter(r => r.status === 'final');
    const totalAmount = runs.reduce((s, r) => s + (r.total_amount || 0), 0);
    const draftAmount = drafts.reduce((s, r) => s + (r.total_amount || 0), 0);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return runs.filter(r => {
            if (statusFilter !== 'all' && r.status !== statusFilter) return false;
            if (q && !(r.employee_name?.toLowerCase().includes(q) || r.label?.toLowerCase().includes(q))) return false;
            return true;
        });
    }, [runs, search, statusFilter]);

    const grouped = useMemo(() => {
        const m = new Map<string, { key: string; label: string; runs: BonusRun[]; year: number; month: number; half: string }>();
        filtered.forEach(r => {
            const k = periodKey(r);
            if (!m.has(k)) m.set(k, { key: k, label: periodLabel(r), runs: [], year: r.year, month: r.month, half: r.half });
            m.get(k)!.runs.push(r);
        });
        return Array.from(m.values()).sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            if (a.month !== b.month) return b.month - a.month;
            return a.half === 'first' ? 1 : -1;
        });
    }, [filtered]);

    function toggle(k: string) { setCollapsed(p => ({ ...p, [k]: !p[k] })); }

    return (
        <div className="hidden md:flex flex-col gap-5 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Сувилагчийн урамшуулал</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Өдөр өдрөөр урамшуулал бүртгэх</p>
                </div>
                <div className="flex items-center gap-2">
                    {drafts.length > 0 && (
                        <button onClick={onBulk}
                            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors">
                            <SendHorizontal className="size-4" /> Бүгдэнд илгээх ({drafts.length})
                        </button>
                    )}
                    <button onClick={onCreate}
                        className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm">
                        <Plus className="size-4" /> Шинэ тооцоо
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={Layers}  label="Нийт тооцоо"   value={runs.length}        accent="bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400" />
                <StatCard icon={Clock}   label="Ноорог"         value={drafts.length}      accent="bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" sub={draftAmount ? fmtMnt(draftAmount) : undefined} />
                <StatCard icon={CheckCircle2} label="Баталгаажсан" value={finalRuns.length}   accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" />
                <StatCard icon={Coins}   label="Нийт мөнгөн дүн" value={fmtMnt(totalAmount)} accent="bg-yellow-100 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400" />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card shadow-sm px-3 py-2">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Сувилагч эсвэл салбараар хайх..."
                        className="w-full rounded-lg border bg-background pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
                    {[
                        { v: 'all',   l: 'Бүгд' },
                        { v: 'draft', l: 'Ноорог' },
                        { v: 'final', l: 'Баталгаажсан' },
                    ].map(opt => (
                        <button key={opt.v} onClick={() => setStatusFilter(opt.v as never)}
                            className={`rounded-md px-3 py-1 text-[11px] font-semibold transition-colors ${
                                statusFilter === opt.v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            }`}>
                            {opt.l}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grouped list */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card py-20 text-center">
                    <Heart className="size-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">{runs.length === 0 ? 'Урамшуулал байхгүй байна' : 'Хайлтад тохирох тооцоо алга'}</p>
                    {runs.length === 0 && <button onClick={onCreate} className="mt-4 text-xs text-primary underline">Шинэ тооцоо үүсгэх</button>}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {grouped.map(g => {
                        const isCollapsed = collapsed[g.key];
                        const gDrafts = g.runs.filter(r => r.status === 'draft').length;
                        const gFinal  = g.runs.filter(r => r.status === 'final').length;
                        const gAmount = g.runs.reduce((s, r) => s + (r.total_amount || 0), 0);
                        return (
                            <div key={g.key} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                <button onClick={() => toggle(g.key)}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-violet-50/60 via-card to-card dark:from-violet-950/20 dark:via-card hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-2.5">
                                        <div className="size-8 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                                            <CalendarDays className="size-4 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-foreground">{g.label}</p>
                                            <p className="text-[11px] text-muted-foreground">{g.runs.length} ажилтан · {fmtMnt(gAmount)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {gDrafts > 0 && (
                                            <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                                {gDrafts} ноорог
                                            </span>
                                        )}
                                        {gFinal > 0 && (
                                            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                                {gFinal} баталгаажсан
                                            </span>
                                        )}
                                        {isCollapsed ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronUp className="size-4 text-muted-foreground" />}
                                    </div>
                                </button>
                                {!isCollapsed && (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-y bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                <th className="px-5 py-2.5 text-left">Сувилагч</th>
                                                <th className="px-3 py-2.5 text-left">Салбар</th>
                                                <th className="px-3 py-2.5 text-left">Статус</th>
                                                <th className="px-3 py-2.5 text-center">Өдөр</th>
                                                <th className="px-3 py-2.5 text-right">Дүн ₮</th>
                                                <th className="px-3 py-2.5 text-right">Огноо</th>
                                                <th className="px-3 py-2.5 text-right">Үйлдэл</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/40">
                                            {g.runs.map(r => (
                                                <tr key={r.id} className="group hover:bg-muted/20 transition-colors cursor-pointer"
                                                    onClick={() => router.visit(`/hr/nurse-bonus/${r.id}`)}>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="size-8 rounded-full bg-pink-100 dark:bg-pink-950/40 flex items-center justify-center shrink-0">
                                                                <Heart className="size-4 text-pink-600 dark:text-pink-400" />
                                                            </div>
                                                            <p className="font-semibold text-sm text-foreground">{r.employee_name ?? '—'}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                            <Building2 className="size-3" /> {r.label ?? '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3"><StatusBadge run={r} /></td>
                                                    <td className="px-3 py-3 text-center">
                                                        <span className="inline-flex items-center gap-1 text-xs">
                                                            <Users className="size-3 text-muted-foreground" />
                                                            <span className="font-semibold">{r.entries_count}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-right text-sm font-bold tabular-nums text-violet-700 dark:text-violet-400">
                                                        {r.total_amount ? fmtMnt(r.total_amount) : '—'}
                                                    </td>
                                                    <td className="px-3 py-3 text-right">
                                                        <p className="text-[11px] text-muted-foreground">{r.created_at}</p>
                                                    </td>
                                                    <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
                                                        <div className="inline-flex items-center gap-1">
                                                            <a href={`/hr/nurse-bonus/${r.id}/excel`} target="_blank"
                                                                title="Excel татах"
                                                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 transition-colors opacity-0 group-hover:opacity-100">
                                                                <FileSpreadsheet className="size-3.5" />
                                                            </a>
                                                            <button onClick={() => onDelete(r.id)} title="Устгах"
                                                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100">
                                                                <Trash2 className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function NurseBonusIndex({ runs, branches, nurses }: Props) {
    const [delId, setDelId]         = useState<number | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [bulkOpen, setBulkOpen]   = useState(false);
    const [bulkSending, setBulkSending] = useState(false);

    const drafts = useMemo(() => runs.filter(r => r.status === 'draft'), [runs]);

    function confirmDelete(id: number) {
        router.delete(`/hr/nurse-bonus/${id}`, { onSuccess: () => setDelId(null) });
    }

    function bulkSend() {
        if (drafts.length === 0) return;
        setBulkSending(true);
        router.post('/hr/nurse-bonus/bulk-finalize', { ids: drafts.map(d => d.id) } as never, {
            onSuccess: () => setBulkOpen(false),
            onFinish: () => setBulkSending(false),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Сувилагчийн урамшуулал" />

            {/* ════ MOBILE ════ */}
            <div className="md:hidden min-h-full bg-[#f2f2f7] dark:bg-zinc-950">
                <div className="px-4 pt-6 pb-24">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 px-1 mb-3">
                        Сувилагчийн урамшуулал
                    </p>
                    {runs.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 bg-white dark:bg-zinc-900 rounded-2xl" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                            <Heart className="size-10 text-gray-200 dark:text-zinc-700" />
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Урамшуулал байхгүй байна</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                            {runs.map(r => (
                                <div key={r.id} className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-zinc-800 transition-colors cursor-pointer"
                                    onClick={() => router.visit(`/hr/nurse-bonus/${r.id}`)}>
                                    <div className="size-10 rounded-full bg-pink-100 dark:bg-pink-950/40 flex items-center justify-center shrink-0">
                                        <Heart className="size-5 text-pink-600 dark:text-pink-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{r.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <StatusBadge run={r} />
                                            <span className="text-xs text-gray-400 dark:text-zinc-500">{r.entries_count} өдөр</span>
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
                </div>

                {/* FAB */}
                <div className="fixed bottom-6 right-5 flex flex-col items-end gap-2 z-40">
                    {drafts.length > 0 && (
                        <button onClick={() => setBulkOpen(true)}
                            className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg active:scale-95 transition-transform">
                            <SendHorizontal className="size-4" /> Бүгдэнд илгээх ({drafts.length})
                        </button>
                    )}
                    <button onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg active:scale-95 transition-transform">
                        <Plus className="size-5" /> Шинэ тооцоо
                    </button>
                </div>
            </div>

            {/* ════ DESKTOP ════ */}
            <DesktopView
                runs={runs}
                drafts={drafts}
                onCreate={() => setCreateOpen(true)}
                onBulk={() => setBulkOpen(true)}
                onDelete={id => setDelId(id)}
            />


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
                                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Тухайн өдрийн Сувилагч ажилтнуудаар автоматаар мөр үүснэ</p>
                            </div>
                            <button onClick={() => setCreateOpen(false)}
                                className="size-8 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                <X className="size-4 text-gray-500" />
                            </button>
                        </div>
                        <CreateForm branches={branches} nurses={nurses} onClose={() => setCreateOpen(false)} />
                    </div>
                </div>
            )}

            {/* Bulk send confirm */}
            {bulkOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4"
                    onClick={() => !bulkSending && setBulkOpen(false)}>
                    <div className="w-full md:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                        onClick={e => e.stopPropagation()}>
                        <div className="md:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                        </div>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2.5">
                                <div className="size-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                                    <SendHorizontal className="size-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Бүгдэнд илгээх</h2>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{drafts.length} ноорог баталгаажиж ажилтанд илгээгдэнэ</p>
                                </div>
                            </div>
                            <button onClick={() => setBulkOpen(false)} disabled={bulkSending}
                                className="size-8 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center disabled:opacity-50">
                                <X className="size-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
                            {drafts.map(d => (
                                <div key={d.id} className="flex items-center gap-2.5 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30 px-3 py-2">
                                    <div className="size-7 rounded-lg bg-pink-100 dark:bg-pink-950/40 flex items-center justify-center shrink-0">
                                        <Heart className="size-3.5 text-pink-600 dark:text-pink-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{d.employee_name ?? '—'}</p>
                                        <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                                            {d.year}.{String(d.month).padStart(2, '0')} · {d.half === 'first' ? '1–15' : '16–31'} · {d.label} · {d.entries_count} өдөр
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30">
                            <button onClick={() => setBulkOpen(false)} disabled={bulkSending}
                                className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                                Болих
                            </button>
                            <button onClick={bulkSend} disabled={bulkSending || drafts.length === 0}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                {bulkSending
                                    ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    : <SendHorizontal className="size-4" />}
                                Илгээх ({drafts.length})
                            </button>
                        </div>
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
        </AppLayout>
    );
}
