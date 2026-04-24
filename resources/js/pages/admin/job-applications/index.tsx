import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ClipboardList, Download, Eye, Search, Trash2,
    Clock, Star, XCircle, Users,
    Phone, Mail, Calendar, ArrowRight,
} from 'lucide-react';
import { useState } from 'react';

interface Application {
    id: number;
    full_name: string;
    email: string | null;
    phone_mobile: string | null;
    status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected';
    created_at: string;
}

interface Stats {
    total: number;
    pending: number;
    reviewed: number;
    shortlisted: number;
    rejected: number;
}

interface Props {
    applications: Application[];
    stats: Stats;
    filters: { status?: string; search?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Ажлын анкет', href: '/admin/job-applications' },
];

type Tab = 'all' | 'pending' | 'reviewed' | 'shortlisted' | 'rejected';

const STATUS_META: Record<string, {
    label: string;
    dot: string;
    cls: string;
    bar: string;
}> = {
    pending:     { label: 'Хүлээгдэж буй', dot: 'bg-amber-400',   cls: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',   bar: 'bg-amber-400'   },
    reviewed:    { label: 'Хянасан',         dot: 'bg-blue-400',    cls: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',           bar: 'bg-blue-400'    },
    shortlisted: { label: 'Сонгогдсон',      dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', bar: 'bg-emerald-500' },
    rejected:    { label: 'Татгалзсан',       dot: 'bg-zinc-400',    cls: 'bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700',          bar: 'bg-zinc-400'    },
};

export default function JobApplicationsIndex({ applications, stats, filters }: Props) {
    const [tab, setTab]       = useState<Tab>((filters.status as Tab) || 'all');
    const [search, setSearch] = useState(filters.search || '');

    const filtered = tab === 'all' ? applications : applications.filter(a => a.status === tab);

    const displayed = search.trim()
        ? filtered.filter(a =>
            a.full_name.toLowerCase().includes(search.toLowerCase()) ||
            (a.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (a.phone_mobile ?? '').includes(search)
          )
        : filtered;

    function deleteApp(id: number, name: string) {
        if (confirm(`"${name}"-н анкетыг устгах уу?`)) {
            router.delete(`/admin/job-applications/${id}`);
        }
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/admin/job-applications', { status: tab === 'all' ? '' : tab, search }, {
            preserveState: true, replace: true,
        });
    }

    const STAT_CARDS = [
        {
            label: 'Нийт анкет',
            value: stats.total,
            icon: Users,
            iconCls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
            accent: 'border-t-red-500',
        },
        {
            label: 'Хүлээгдэж буй',
            value: stats.pending,
            icon: Clock,
            iconCls: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            accent: 'border-t-amber-400',
        },
        {
            label: 'Сонгогдсон',
            value: stats.shortlisted,
            icon: Star,
            iconCls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
            accent: 'border-t-emerald-500',
        },
        {
            label: 'Татгалзсан',
            value: stats.rejected,
            icon: XCircle,
            iconCls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
            accent: 'border-t-zinc-400',
        },
    ];

    const TABS: { key: Tab; label: string; count: number }[] = [
        { key: 'all',         label: 'Бүгд',         count: stats.total      },
        { key: 'pending',     label: 'Хүлээгдэж буй', count: stats.pending    },
        { key: 'reviewed',    label: 'Хянасан',       count: stats.reviewed   },
        { key: 'shortlisted', label: 'Сонгогдсон',    count: stats.shortlisted},
        { key: 'rejected',    label: 'Татгалзсан',    count: stats.rejected   },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ажлын анкет" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* ── Header ── */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            <ClipboardList className="size-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Хүний нөөц</p>
                            <h1 className="text-xl font-bold leading-tight">Ажлын анкет</h1>
                        </div>
                    </div>
                    <a
                        href={`/admin/job-applications/export-csv${tab !== 'all' ? '?status=' + tab : ''}`}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                    >
                        <Download className="size-4" />
                        <span className="hidden sm:inline">Excel татах</span>
                    </a>
                </div>

                {/* ── Stats ── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {STAT_CARDS.map(card => (
                        <div
                            key={card.label}
                            className={`rounded-2xl border-t-4 border bg-card p-5 shadow-sm ${card.accent}`}
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                                <div className={`flex size-9 items-center justify-center rounded-xl ${card.iconCls}`}>
                                    <card.icon className="size-4" />
                                </div>
                            </div>
                            <p className="mt-3 text-4xl font-extrabold tracking-tight">{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* ── Search ── */}
                <form onSubmit={handleSearch}>
                    <div className="flex gap-2">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Нэр, и-мэйл, утасны дугаар хайх..."
                                className="w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm"
                        >
                            Хайх
                        </button>
                    </div>
                </form>

                {/* ── Tabs ── */}
                <div className="flex items-center gap-0.5 border-b">
                    {TABS.map(({ key, label, count }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                                tab === key
                                    ? 'text-red-600'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {label}
                            <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none ${
                                tab === key
                                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-muted text-muted-foreground'
                            }`}>
                                {count}
                            </span>
                            {tab === key && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-red-600" />
                            )}
                        </button>
                    ))}
                </div>

                {/* ── List ── */}
                {displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-24 text-center">
                        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
                            <ClipboardList className="size-8 text-muted-foreground" />
                        </div>
                        <p className="text-base font-semibold text-muted-foreground">Анкет байхгүй байна</p>
                        <p className="mt-1 text-sm text-muted-foreground/70">Энэ ангилалд хамаарах анкет олдсонгүй</p>
                    </div>
                ) : (
                    <div className="divide-y rounded-2xl border bg-card overflow-hidden shadow-sm">
                        {displayed.map((app) => {
                            const meta = STATUS_META[app.status];
                            const initials = app.full_name
                                .split(' ')
                                .map(w => w[0] ?? '')
                                .join('')
                                .slice(0, 2)
                                .toUpperCase();

                            return (
                                <div
                                    key={app.id}
                                    className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
                                >
                                    {/* Avatar */}
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-400 to-rose-600 text-sm font-extrabold text-white shadow-sm">
                                        {initials}
                                    </div>

                                    {/* Info */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <span className="font-semibold text-sm leading-tight">{app.full_name}</span>
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                                                <span className={`size-1.5 rounded-full ${meta.dot}`} />
                                                {meta.label}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                            {app.phone_mobile && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="size-3 text-red-400" /> {app.phone_mobile}
                                                </span>
                                            )}
                                            {app.email && (
                                                <span className="hidden sm:flex items-center gap-1">
                                                    <Mail className="size-3" /> {app.email}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Calendar className="size-3" /> {app.created_at}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex shrink-0 items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={`/admin/job-applications/${app.id}`}
                                            className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:border-red-300 hover:text-red-600 transition-colors"
                                        >
                                            <Eye className="size-3.5" />
                                            <span className="hidden sm:inline">Харах</span>
                                            <ArrowRight className="size-3" />
                                        </Link>
                                        <button
                                            onClick={() => deleteApp(app.id, app.full_name)}
                                            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/50 transition-colors"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
