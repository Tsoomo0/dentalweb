import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CheckCircle2, Edit, HelpCircle, MessageCircleQuestion, Plus, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';

interface Faq {
    id: number;
    question: string;
    answer: string;
    category: string | null;
    is_active: boolean;
    order: number;
}

interface Stats {
    total: number;
    active: number;
    inactive: number;
}

interface Props {
    faqs: Faq[];
    stats: Stats;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Түгээмэл асуултууд', href: '/admin/faqs' },
];

type Tab = 'all' | 'active' | 'inactive';

const CATEGORY_COLORS: Record<string, string> = {
    'Үйлчилгээ':            'bg-blue-100 text-blue-700',
    'Үнэ':                  'bg-green-100 text-green-700',
    'Үйлчилгээний хугацаа': 'bg-purple-100 text-purple-700',
    'Төлбөрийн арга':       'bg-yellow-100 text-yellow-700',
    'Цүцлэлт':              'bg-red-100 text-red-700',
};

function categoryColor(cat: string | null) {
    if (!cat) return 'bg-zinc-100 text-zinc-600';
    return CATEGORY_COLORS[cat] ?? 'bg-orange-100 text-orange-700';
}

export default function FaqIndex({ faqs, stats }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const [tab, setTab] = useState<Tab>('all');

    const filtered =
        tab === 'all'      ? faqs
        : tab === 'active' ? faqs.filter((f) => f.is_active)
        :                    faqs.filter((f) => !f.is_active);

    function deleteFaq(id: number, question: string) {
        if (confirm(`"${question}" асуултыг устгах уу?`)) router.delete(`/admin/faqs/${id}`);
    }

    function toggleFaq(id: number) {
        router.patch(`/admin/faqs/${id}/toggle`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Түгээмэл асуултууд" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {props.flash?.success && (
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400">
                        <CheckCircle2 className="size-4 shrink-0" />
                        {props.flash.success}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Контент удирдлага</p>
                        <h1 className="text-2xl font-bold">Түгээмэл асуултууд</h1>
                    </div>
                    <Link
                        href="/admin/faqs/create"
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                        <Plus className="size-4" /> Шинэ асуулт нэмэх
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Нийт асуулт</p>
                            <MessageCircleQuestion className="size-4 text-red-500" />
                        </div>
                        <p className="mt-2 text-3xl font-bold">{stats.total}</p>
                    </div>
                    <div className="rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Идэвхтэй</p>
                            <CheckCircle2 className="size-4 text-green-500" />
                        </div>
                        <p className="mt-2 text-3xl font-bold">{stats.active}</p>
                    </div>
                    <div className="rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Идэвхгүй</p>
                            <XCircle className="size-4 text-zinc-400" />
                        </div>
                        <p className="mt-2 text-3xl font-bold">{stats.inactive}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b">
                    {([
                        { key: 'all',      label: `Бүгд (${stats.total})` },
                        { key: 'active',   label: `Идэвхтэй (${stats.active})` },
                        { key: 'inactive', label: `Идэвхгүй (${stats.inactive})` },
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

                {/* FAQ list */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20">
                        <HelpCircle className="mb-3 size-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Асуулт байхгүй байна</p>
                        <Link href="/admin/faqs/create" className="mt-3 text-sm text-red-600 hover:underline">
                            + Шинэ асуулт нэмэх
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((faq) => (
                            <div
                                key={faq.id}
                                className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm"
                            >
                                {/* Top row */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30">
                                        <HelpCircle className="size-5 text-red-500" />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {faq.category && (
                                            <span
                                                className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${categoryColor(faq.category)}`}
                                            >
                                                {faq.category}
                                            </span>
                                        )}
                                        <span
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                faq.is_active
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                                    : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                                            }`}
                                        >
                                            {faq.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                                        </span>
                                    </div>
                                </div>

                                {/* Text */}
                                <div className="flex-1">
                                    <h3 className="font-semibold leading-snug line-clamp-2">{faq.question}</h3>
                                    <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{faq.answer}</p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 border-t pt-3">
                                    <button
                                        onClick={() => toggleFaq(faq.id)}
                                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                                    >
                                        {faq.is_active ? (
                                            <><XCircle className="size-3" /> Идэвхгүй</>
                                        ) : (
                                            <><CheckCircle2 className="size-3" /> Идэвхжүүлэх</>
                                        )}
                                    </button>
                                    <Link
                                        href={`/admin/faqs/${faq.id}/edit`}
                                        className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                                    >
                                        <Edit className="size-3" /> Засах
                                    </Link>
                                    <button
                                        onClick={() => deleteFaq(faq.id, faq.question)}
                                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                                    >
                                        <Trash2 className="size-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
