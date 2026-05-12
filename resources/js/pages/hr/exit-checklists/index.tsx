import AppLayout from '@/layouts/app-layout';
import { Link, router, usePage } from '@inertiajs/react';
import { CheckCircle2, Circle, Clock, LogOut, Plus, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface Checklist {
    id: number;
    employee_id: number;
    employee_name: string;
    position: string | null;
    branch: string | null;
    exit_date: string;
    exit_type: string;
    status: string;
    progress: number;
    completed_count: number;
    total_items: number;
    created_at: string;
}
interface PageProps {
    checklists: Checklist[];
    filters: { status?: string; q?: string };
    [key: string]: unknown;
}

const EXIT_TYPE: Record<string, { label: string; color: string }> = {
    resignation:   { label: 'Өөрийн хүсэлтээр',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    termination:   { label: 'Халагдсан',                color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    contract_end:  { label: 'Гэрээ дуусгавар',          color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
    retirement:    { label: 'Тэтгэвэр',                 color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    death:         { label: 'Нас барсан',               color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    other:         { label: 'Бусад',                    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
};

const STATUS_CFG: Record<string, { label: string; icon: typeof Circle; cls: string }> = {
    draft:       { label: 'Ноорог',       icon: Circle,        cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
    in_progress: { label: 'Явагдаж байна', icon: Clock,         cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' },
    completed:   { label: 'Дуусгасан',    icon: CheckCircle2,  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
};

function ProgressBar({ value }: { value: number }) {
    return (
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
                className={`h-full rounded-full transition-all ${value === 100 ? 'bg-emerald-500' : value > 50 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                style={{ width: `${value}%` }}
            />
        </div>
    );
}

export default function ExitChecklistIndex() {
    const { checklists, filters } = usePage<PageProps>().props;

    const [search,       setSearch]       = useState(filters.q ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? '');

    function applyFilter(status: string, q?: string) {
        const params: Record<string, string> = {};
        if (status) params.status = status;
        if (q ?? search) params.q = q ?? search;
        router.get('/hr/exit-checklists', params, { preserveState: true, only: ['checklists', 'filters'] });
    }

    function handleDelete(id: number) {
        if (!confirm('Устгах уу?')) return;
        router.delete(`/hr/exit-checklists/${id}`, { preserveScroll: true });
    }

    const STATUS_TABS = [
        { key: '', label: 'Бүгд' },
        { key: 'draft', label: 'Ноорог' },
        { key: 'in_progress', label: 'Явагдаж байна' },
        { key: 'completed', label: 'Дуусгасан' },
    ];

    return (
        <AppLayout breadcrumbs={[{ title: 'HR', href: '/hr/employees' }, { title: 'Гарах бүртгэл', href: '/hr/exit-checklists' }]}>
            <div className="p-4 md:p-6 space-y-4">

                {/* Top bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <LogOut className="size-5 text-red-500" />
                        Гарах бүртгэл
                        <span className="text-sm font-normal text-muted-foreground">({checklists.length})</span>
                    </h1>
                    <div className="flex items-center gap-2">
                        <form onSubmit={e => { e.preventDefault(); applyFilter(statusFilter, search); }} className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Хайх..."
                                className="w-44 rounded-xl border bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            {search && (
                                <button type="button" onClick={() => { setSearch(''); applyFilter(statusFilter, ''); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <X className="size-3.5 text-muted-foreground" />
                                </button>
                            )}
                        </form>
                        <Link href="/hr/exit-checklists/create"
                            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
                            <Plus className="size-4" /> Шинэ бүртгэл
                        </Link>
                    </div>
                </div>

                {/* Status tabs */}
                <div className="flex gap-1.5 flex-wrap">
                    {STATUS_TABS.map(t => (
                        <button key={t.key} onClick={() => { setStatusFilter(t.key); applyFilter(t.key); }}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors
                                ${statusFilter === t.key ? 'bg-red-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* List */}
                {checklists.length === 0 ? (
                    <div className="py-20 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <LogOut className="size-12 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
                        <p className="text-sm text-muted-foreground">Гарах бүртгэл байхгүй байна</p>
                        <Link href="/hr/exit-checklists/create"
                            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
                            <Plus className="size-4" /> Шинэ бүртгэл
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {checklists.map(c => {
                            const exitCfg  = EXIT_TYPE[c.exit_type]  ?? EXIT_TYPE.other;
                            const statCfg  = STATUS_CFG[c.status]    ?? STATUS_CFG.draft;
                            const StatIcon = statCfg.icon;
                            return (
                                <Link key={c.id} href={`/hr/exit-checklists/${c.id}`}
                                    className="flex items-center gap-4 rounded-2xl border bg-card hover:shadow-md transition-all px-4 py-3 group">

                                    {/* Avatar */}
                                    <div className="size-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-700 dark:text-red-300 font-black text-sm shrink-0">
                                        {c.employee_name?.charAt(0) ?? '?'}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{c.employee_name}</p>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${exitCfg.color}`}>{exitCfg.label}</span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                            {c.position}{c.branch ? ` · ${c.branch}` : ''}
                                        </p>
                                        <div className="mt-1.5 flex items-center gap-3">
                                            <ProgressBar value={c.progress} />
                                            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                                                {c.completed_count}/{c.total_items}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right side */}
                                    <div className="text-right shrink-0 space-y-1">
                                        <div className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statCfg.cls}`}>
                                            <StatIcon className="size-3" />
                                            {statCfg.label}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">Сүүлийн өдөр: {c.exit_date}</p>
                                    </div>

                                    {/* Delete */}
                                    <button
                                        onClick={e => { e.preventDefault(); handleDelete(c.id); }}
                                        className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shrink-0">
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
