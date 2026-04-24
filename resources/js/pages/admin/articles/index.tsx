import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { BarChart2, BookOpen, CheckCircle2, Edit, Eye, FileText, Plus, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Article {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    category: string | null;
    status: 'draft' | 'published' | 'archived';
    views: number;
    image_url: string | null;
    published_date: string | null;
    published_at: string | null;
    created_at: string;
}

interface Stats {
    total: number;
    published: number;
    draft: number;
    archived: number;
    avg_views: number;
}

interface Props {
    articles: Article[];
    stats: Stats;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Мэдээ ба Нийтлэл', href: '/admin/articles' },
];

type Tab = 'all' | 'published' | 'draft' | 'archived';

const STATUS_LABEL: Record<string, string> = {
    published: 'Нийтлэгдсэн',
    draft:     'Нооргор',
    archived:  'Архивласан',
};

const STATUS_CLASS: Record<string, string> = {
    published: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    draft:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
    archived:  'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

const CATEGORY_COLORS: Record<string, string> = {
    'Технологи':   'bg-blue-100 text-blue-700',
    'Эрүүл мэнд': 'bg-green-100 text-green-700',
    'Хүүхдийн':   'bg-purple-100 text-purple-700',
    'Экологи':     'bg-emerald-100 text-emerald-700',
};

function categoryColor(cat: string | null) {
    if (!cat) return 'bg-zinc-100 text-zinc-600';
    return CATEGORY_COLORS[cat] ?? 'bg-red-100 text-red-700';
}

function formatViews(n: number) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
}

export default function ArticlesIndex({ articles, stats }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const [tab, setTab] = useState<Tab>('all');

    const filtered = tab === 'all' ? articles : articles.filter((a) => a.status === tab);

    function deleteArticle(id: number, title: string) {
        if (confirm(`"${title}" нийтлэлийг устгах уу?`)) router.delete(`/admin/articles/${id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Мэдээ ба Нийтлэл" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Контент удирдлага</p>
                        <h1 className="text-2xl font-bold">Мэдээ ба Нийтлэл</h1>
                    </div>
                    <Link
                        href="/admin/articles/create"
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                        <Plus className="size-4" /> Шинэ мэдээ нэмэх
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Нийт нийтлэл</p>
                            <FileText className="size-4 text-red-500" />
                        </div>
                        <p className="mt-2 text-3xl font-bold">{stats.total}</p>
                    </div>
                    <div className="rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Нийтлэгдсэн</p>
                            <BookOpen className="size-4 text-blue-500" />
                        </div>
                        <p className="mt-2 text-3xl font-bold">{stats.published}</p>
                    </div>
                    <div className="rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Нооргор</p>
                            <Tag className="size-4 text-yellow-500" />
                        </div>
                        <p className="mt-2 text-3xl font-bold">{stats.draft}</p>
                    </div>
                    <div className="rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Дундаж хандалт</p>
                            <BarChart2 className="size-4 text-green-500" />
                        </div>
                        <p className="mt-2 text-3xl font-bold">{formatViews(stats.avg_views)}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b">
                    {([
                        { key: 'all',       label: `Бүх нийтлэл (${stats.total})` },
                        { key: 'published', label: `Нийтлэгдсэн (${stats.published})` },
                        { key: 'draft',     label: `Нооргор (${stats.draft})` },
                        { key: 'archived',  label: `Архивласан (${stats.archived})` },
                    ] as { key: Tab; label: string }[]).map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                                tab === key
                                    ? 'border-red-600 text-red-600'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Article list */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20">
                        <FileText className="mb-3 size-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Нийтлэл байхгүй байна</p>
                        <Link href="/admin/articles/create" className="mt-3 text-sm text-red-600 hover:underline">
                            + Шинэ нийтлэл нэмэх
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((article) => (
                            <div
                                key={article.id}
                                className="flex gap-4 rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm"
                            >
                                {/* Thumbnail */}
                                <div className="hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:block">
                                    {article.image_url ? (
                                        <img
                                            src={article.image_url}
                                            alt={article.title}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <FileText className="size-6 text-muted-foreground/40" />
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                                    <div>
                                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                            {article.category && (
                                                <span
                                                    className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${categoryColor(article.category)}`}
                                                >
                                                    {article.category}
                                                </span>
                                            )}
                                            {article.published_date && (
                                                <span className="text-xs text-muted-foreground">
                                                    {article.published_date}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-semibold leading-snug line-clamp-1">{article.title}</h3>
                                        {article.excerpt && (
                                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                                {article.excerpt}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[article.status]}`}
                                            >
                                                {STATUS_LABEL[article.status]}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Eye className="size-3" />
                                                {formatViews(article.views)}
                                            </span>
                                        </div>

                                        <div className="flex gap-2">
                                            <Link
                                                href={`/admin/articles/${article.id}/edit`}
                                                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                                            >
                                                <Edit className="size-3" /> Засах
                                            </Link>
                                            <button
                                                onClick={() => deleteArticle(article.id, article.title)}
                                                className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                                            >
                                                <Trash2 className="size-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
