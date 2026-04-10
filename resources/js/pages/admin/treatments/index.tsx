import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Clock, Edit, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface TreatmentCategory {
    id: number;
    name: string;
    icon: string | null;
    is_active: boolean;
}

interface SubTreatment {
    id: number;
    title: string;
    description: string | null;
    price_min: number | null;
    price_max: number | null;
    duration_min: number | null;
    is_active: boolean;
}

interface Treatment {
    id: number;
    treatment_category_id: number;
    title: string;
    description: string | null;
    image_url: string | null;
    price_min: number | null;
    price_max: number | null;
    duration_min: number | null;
    is_active: boolean;
    category: TreatmentCategory;
    sub_treatments: SubTreatment[];
}

interface Props {
    categories: TreatmentCategory[];
    treatments: Treatment[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Эмчилгээ & Үйлчилгээ', href: '/admin/treatments' },
];

function formatPrice(min: number | null, max: number | null): string {
    if (!min && !max) return 'Үнэ тодорхойгүй';
    const fmt = (v: number) => `₮${Number(v).toLocaleString()}`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    return fmt(min ?? max!);
}

function SubTreatmentModal({ treatment, onClose }: { treatment: Treatment; onClose: () => void }) {
    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-zinc-900 text-white shadow-2xl">
                    {/* Header */}
                    <div className="relative">
                        {treatment.image_url ? (
                            <img
                                src={treatment.image_url}
                                alt={treatment.title}
                                className="h-40 w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-24 w-full items-center justify-center bg-zinc-800">
                                <span className="text-zinc-600 text-sm">Зураг байхгүй</span>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="absolute right-3 top-3 rounded-lg bg-black/50 p-1.5 hover:bg-black/70"
                        >
                            <X className="size-4" />
                        </button>
                    </div>

                    <div className="p-5">
                        {/* Treatment info */}
                        <div className="mb-4">
                            <span className="mb-1.5 inline-block rounded bg-red-600 px-2 py-0.5 text-xs font-semibold uppercase">
                                {treatment.category.name}
                            </span>
                            <h2 className="text-lg font-bold leading-snug">{treatment.title}</h2>
                            <div className="mt-1 flex items-center gap-3 text-sm">
                                <span className="font-semibold text-red-400">
                                    {formatPrice(treatment.price_min, treatment.price_max)}
                                </span>
                                {treatment.duration_min && (
                                    <span className="flex items-center gap-1 text-zinc-400">
                                        <Clock className="size-3" />
                                        {treatment.duration_min} мин
                                    </span>
                                )}
                            </div>
                            {treatment.description && (
                                <p className="mt-2 text-sm text-zinc-400">{treatment.description}</p>
                            )}
                        </div>

                        {/* Sub-treatments */}
                        <div className="border-t border-zinc-700 pt-4">
                            <h3 className="mb-3 text-sm font-semibold text-zinc-300">
                                Дэд эмчилгээнүүд ({treatment.sub_treatments.length})
                            </h3>

                            {treatment.sub_treatments.length === 0 ? (
                                <p className="py-4 text-center text-sm text-zinc-500">
                                    Дэд эмчилгээ байхгүй байна
                                </p>
                            ) : (
                                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                                    {treatment.sub_treatments.map((sub) => (
                                        <div
                                            key={sub.id}
                                            className={`rounded-lg bg-zinc-800 p-3 ${!sub.is_active ? 'opacity-50' : ''}`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">{sub.title}</p>
                                                    {sub.description && (
                                                        <p className="mt-0.5 text-xs text-zinc-400 line-clamp-2">
                                                            {sub.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-xs font-semibold text-red-400">
                                                        {formatPrice(sub.price_min, sub.price_max)}
                                                    </p>
                                                    {sub.duration_min && (
                                                        <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-zinc-500">
                                                            <Clock className="size-3" />
                                                            {sub.duration_min} мин
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {!sub.is_active && (
                                                <span className="mt-1 inline-block rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
                                                    Идэвхгүй
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="mt-4 flex gap-2 border-t border-zinc-700 pt-4">
                            <Link
                                href={`/admin/treatments/${treatment.id}/edit`}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700"
                            >
                                <Edit className="size-4" /> Засах
                            </Link>
                            <button
                                onClick={onClose}
                                className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                            >
                                Хаах
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function TreatmentsIndex({ categories, treatments }: Props) {
    const [activeCategory, setActiveCategory] = useState<number | null>(null);
    const [modalTreatment, setModalTreatment] = useState<Treatment | null>(null);

    const filtered = activeCategory
        ? treatments.filter((t) => t.treatment_category_id === activeCategory)
        : treatments;

    function deleteTreatment(id: number) {
        if (confirm('Энэ эмчилгээг устгах уу?')) {
            router.delete(`/admin/treatments/${id}`);
        }
    }

    const categoryColors: Record<number, string> = {};
    const palette = ['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-yellow-600', 'bg-purple-600', 'bg-pink-600'];
    categories.forEach((cat, i) => {
        categoryColors[cat.id] = palette[i % palette.length];
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Эмчилгээ & Үйлчилгээ" />

            {/* Sub-treatment modal */}
            {modalTreatment && (
                <SubTreatmentModal
                    treatment={modalTreatment}
                    onClose={() => setModalTreatment(null)}
                />
            )}

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-muted-foreground text-sm">Эмчилгээний ангилал</p>
                        <h1 className="text-2xl font-bold">Эмчилгээ ба Үйлчилгээ</h1>
                    </div>
                    <Link
                        href="/admin/treatments/create"
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                        <Plus className="size-4" />
                        Шинэ үйлчилгээ нэмэх
                    </Link>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground mr-2 text-sm font-medium">Идэвхтэй ангилал:</span>
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                            activeCategory === null
                                ? 'bg-red-600 text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                    >
                        Бүх үйлчилгээ ({treatments.length})
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                                activeCategory === cat.id
                                    ? 'bg-red-600 text-white'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                            {cat.icon && <span>{cat.icon}</span>}
                            {cat.name} ({treatments.filter((t) => t.treatment_category_id === cat.id).length})
                        </button>
                    ))}
                    <Link
                        href="/admin/treatment-categories"
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-full border border-dashed px-3 py-1.5 text-sm transition-colors"
                    >
                        <Plus className="size-3" /> Шинэ ангилал
                    </Link>
                </div>

                {/* Treatment Cards */}
                {filtered.length === 0 ? (
                    <div className="border-muted flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20">
                        <p className="text-muted-foreground text-sm">Эмчилгээ байхгүй байна</p>
                        <Link href="/admin/treatments/create" className="mt-3 text-sm text-red-600 hover:underline">
                            + Шинэ эмчилгээ нэмэх
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {filtered.map((treatment) => (
                            <div
                                key={treatment.id}
                                className={`group relative overflow-hidden rounded-xl bg-zinc-900 text-white transition-opacity ${
                                    !treatment.is_active ? 'opacity-50' : ''
                                }`}
                            >
                                {/* Image */}
                                <div className="relative h-32 w-full overflow-hidden bg-zinc-800">
                                    {treatment.image_url ? (
                                        <img
                                            src={treatment.image_url}
                                            alt={treatment.title}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <span className="text-sm text-zinc-600">Зураг байхгүй</span>
                                        </div>
                                    )}
                                    <span
                                        className={`absolute left-3 top-3 rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white ${
                                            categoryColors[treatment.treatment_category_id] ?? 'bg-zinc-600'
                                        }`}
                                    >
                                        {treatment.category.name}
                                    </span>
                                    {!treatment.is_active && (
                                        <span className="absolute right-3 top-3 rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                                            Идэвхгүй
                                        </span>
                                    )}
                                    {/* Hover actions */}
                                    <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                                        <Link
                                            href={`/admin/treatments/${treatment.id}/edit`}
                                            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
                                        >
                                            <Edit className="size-4" /> Засах
                                        </Link>
                                        <button
                                            onClick={() => deleteTreatment(treatment.id)}
                                            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                                        >
                                            <Trash2 className="size-4" /> Устгах
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-3">
                                    <h3 className="mb-1 line-clamp-2 text-sm font-semibold leading-snug">{treatment.title}</h3>
                                    <p className="mb-1 text-xs font-bold text-red-400">
                                        {formatPrice(treatment.price_min, treatment.price_max)}
                                    </p>
                                    {treatment.description && (
                                        <p className="mb-2 line-clamp-2 text-xs text-zinc-400">{treatment.description}</p>
                                    )}

                                    <div className="flex items-center justify-between border-t border-zinc-700 pt-2 text-xs text-zinc-400">
                                        <div className="flex items-center gap-2">
                                            {treatment.duration_min && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="size-3" />
                                                    {treatment.duration_min} мин
                                                </span>
                                            )}
                                            {treatment.sub_treatments.length > 0 && (
                                                <button
                                                    onClick={() => setModalTreatment(treatment)}
                                                    className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-200 hover:bg-zinc-600"
                                                >
                                                    +{treatment.sub_treatments.length} дэд
                                                </button>
                                            )}
                                        </div>
                                        <Link
                                            href={`/admin/treatments/${treatment.id}/edit`}
                                            className="text-red-400 hover:text-red-300 hover:underline"
                                        >
                                            Засах →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats bar */}
                <div className="border-muted mt-auto flex items-center gap-6 border-t pt-4 text-sm">
                    <span>
                        <span className="text-foreground font-bold">{treatments.filter((t) => t.is_active).length}</span>
                        <span className="text-muted-foreground ml-1">идэвхтэй үйлчилгээ</span>
                    </span>
                    <span>
                        <span className="text-foreground font-bold">{categories.length}</span>
                        <span className="text-muted-foreground ml-1">идэвхтэй ангилал</span>
                    </span>
                </div>
            </div>
        </AppLayout>
    );
}
