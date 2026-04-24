import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CheckCircle2, Edit, ImageIcon, Images, Plus, Star, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';

interface Category {
    id: number;
    name: string;
}

interface GalleryItem {
    id: number;
    title: string;
    description: string | null;
    category_id: number | null;
    category_name: string | null;
    before_url: string;
    after_url: string;
    is_featured: boolean;
    is_active: boolean;
    order: number;
}

interface Stats {
    total: number;
    active: number;
    featured: number;
}

interface Props {
    items: GalleryItem[];
    categories: Category[];
    stats: Stats;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Үр дүнгийн галерей', href: '/admin/gallery' },
];

export default function GalleryIndex({ items, categories, stats }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const [filterCat, setFilterCat] = useState<number | 'all'>('all');

    const filtered = filterCat === 'all' ? items : items.filter((i) => i.category_id === filterCat);

    function deleteItem(id: number, title: string) {
        if (confirm(`"${title}" устгах уу?`)) router.delete(`/admin/gallery/${id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Үр дүнгийн галерей" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Контент удирдлага</p>
                        <h1 className="text-2xl font-bold">Үр дүнгийн галерей</h1>
                    </div>
                    <Link
                        href="/admin/gallery/create"
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                        <Plus className="size-4" /> Шинэ үр дүн нэмэх
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Нийт</p>
                            <Images className="size-4 text-red-500" />
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
                            <p className="text-sm text-muted-foreground">Онцлох</p>
                            <Star className="size-4 text-yellow-500" />
                        </div>
                        <p className="mt-2 text-3xl font-bold">{stats.featured}</p>
                    </div>
                </div>

                {/* Category filter */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setFilterCat('all')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            filterCat === 'all'
                                ? 'bg-red-600 text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                    >
                        Бүгд ({items.length})
                    </button>
                    {categories.map((cat) => {
                        const count = items.filter((i) => i.category_id === cat.id).length;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setFilterCat(cat.id)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                    filterCat === cat.id
                                        ? 'bg-red-600 text-white'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                            >
                                {cat.name} ({count})
                            </button>
                        );
                    })}
                </div>

                {/* Grid */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20">
                        <Images className="mb-3 size-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Үр дүн байхгүй байна</p>
                        <Link href="/admin/gallery/create" className="mt-3 text-sm text-red-600 hover:underline">
                            + Шинэ үр дүн нэмэх
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((item) => (
                            <div
                                key={item.id}
                                className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
                            >
                                {/* Before / After images */}
                                <div className="relative flex h-48 overflow-hidden">
                                    {/* Before */}
                                    <div className="relative flex-1 overflow-hidden">
                                        <img
                                            src={item.before_url}
                                            alt="Өмнө"
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                                            Өмнө
                                        </span>
                                    </div>

                                    {/* Divider */}
                                    <div className="absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-white/80 shadow-sm" />

                                    {/* After */}
                                    <div className="relative flex-1 overflow-hidden">
                                        <img
                                            src={item.after_url}
                                            alt="Дараа"
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <span className="absolute bottom-2 right-2 rounded bg-red-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                                            Дараа
                                        </span>
                                    </div>

                                    {/* Badges top-right */}
                                    <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
                                        {item.is_featured && (
                                            <span className="flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-yellow-900">
                                                <Star className="size-2.5" /> Онцлох
                                            </span>
                                        )}
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                item.is_active
                                                    ? 'bg-green-500/90 text-white'
                                                    : 'bg-zinc-500/80 text-white'
                                            }`}
                                        >
                                            {item.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                                        </span>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex flex-1 flex-col gap-2 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-semibold leading-snug line-clamp-1">{item.title}</h3>
                                        {item.category_name && (
                                            <span className="shrink-0 rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-950/40">
                                                {item.category_name}
                                            </span>
                                        )}
                                    </div>
                                    {item.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 border-t px-4 py-3">
                                    <Link
                                        href={`/admin/gallery/${item.id}/edit`}
                                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                                    >
                                        <Edit className="size-3" /> Засах
                                    </Link>
                                    <button
                                        onClick={() => deleteItem(item.id, item.title)}
                                        className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                                    >
                                        <Trash2 className="size-3" /> Устгах
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
