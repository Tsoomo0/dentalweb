import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Clock, Edit, FolderOpen, Plus, Stethoscope, Trash2, X } from 'lucide-react';
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
    if (!min && !max) return '—';
    const fmt = (v: number) => `₮${Number(v).toLocaleString()}`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    return fmt(min ?? max!);
}

function SubTreatmentModal({ treatment, onClose }: { treatment: Treatment; onClose: () => void }) {
    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl border">
                    {/* Image */}
                    <div className="relative">
                        {treatment.image_url ? (
                            <img src={treatment.image_url} alt={treatment.title} className="h-36 w-full object-cover" />
                        ) : (
                            <div className="flex h-24 w-full items-center justify-center bg-muted">
                                <Stethoscope className="size-8 text-muted-foreground/30" />
                            </div>
                        )}
                        <button onClick={onClose}
                            className="absolute right-3 top-3 rounded-full bg-background/90 p-1.5 shadow hover:bg-background border">
                            <X className="size-4 text-foreground" />
                        </button>
                    </div>

                    <div className="p-5">
                        <span className="mb-2 inline-block rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
                            {treatment.category.icon && <span className="mr-1">{treatment.category.icon}</span>}
                            {treatment.category.name}
                        </span>
                        <h2 className="text-base font-bold text-foreground">{treatment.title}</h2>
                        <div className="mt-1 flex items-center gap-3 text-sm">
                            <span className="font-semibold text-red-600 dark:text-red-400">
                                {formatPrice(treatment.price_min, treatment.price_max)}
                            </span>
                            {treatment.duration_min && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="size-3" /> {treatment.duration_min} мин
                                </span>
                            )}
                        </div>
                        {treatment.description && (
                            <p className="mt-2 text-sm text-muted-foreground">{treatment.description}</p>
                        )}

                        <div className="mt-4 border-t pt-4">
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Дэд үйлчилгээ ({treatment.sub_treatments.length})
                            </h3>
                            {treatment.sub_treatments.length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">Дэд эмчилгээ байхгүй</p>
                            ) : (
                                <div className="max-h-52 space-y-2 overflow-y-auto">
                                    {treatment.sub_treatments.map((sub) => (
                                        <div key={sub.id}
                                            className={`flex items-center justify-between rounded-xl bg-muted px-3 py-2.5 ${!sub.is_active ? 'opacity-50' : ''}`}>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{sub.title}</p>
                                                {sub.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1">{sub.description}</p>
                                                )}
                                            </div>
                                            <span className="ml-3 flex-shrink-0 text-xs font-bold text-red-600 dark:text-red-400">
                                                {formatPrice(sub.price_min, sub.price_max)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex gap-2 border-t pt-4">
                            <Link href={`/admin/treatments/${treatment.id}/edit`}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                                <Edit className="size-4" /> Засах
                            </Link>
                            <button onClick={onClose}
                                className="flex-1 rounded-xl border py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors">
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Эмчилгээ & Үйлчилгээ" />

            {modalTreatment && (
                <SubTreatmentModal treatment={modalTreatment} onClose={() => setModalTreatment(null)} />
            )}

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Нийт {treatments.length} үйлчилгээ</p>
                        <h1 className="text-2xl font-bold tracking-tight">Эмчилгээ & Үйлчилгээ</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/admin/treatment-categories"
                            className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                            Ангилал
                        </Link>
                        <Link href="/admin/treatments/create"
                            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm">
                            <Plus className="size-4" /> Шинэ үйлчилгээ
                        </Link>
                    </div>
                </div>

                {/* ── Category Filter ── */}
                <div className="rounded-xl border bg-card p-1.5 flex flex-wrap gap-1">
                    {/* All button */}
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                            activeCategory === null
                                ? 'bg-background shadow text-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                        }`}
                    >
                        <FolderOpen className="size-4" />
                        Бүгд
                        <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                            activeCategory === null
                                ? 'bg-red-600 text-white'
                                : 'bg-muted text-muted-foreground'
                        }`}>
                            {treatments.length}
                        </span>
                    </button>

                    {categories.map((cat) => {
                        const count = treatments.filter((t) => t.treatment_category_id === cat.id).length;
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                                    isActive
                                        ? 'bg-background shadow text-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                                }`}
                            >
                                {cat.icon
                                    ? <span className="text-base leading-none">{cat.icon}</span>
                                    : <Stethoscope className="size-4" />
                                }
                                <span className="max-w-[140px] truncate">{cat.name}</span>
                                <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                                    isActive
                                        ? 'bg-red-600 text-white'
                                        : 'bg-muted text-muted-foreground'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Treatment Cards ── */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-24 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                            <Stethoscope className="size-6 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-foreground">Үйлчилгээ байхгүй байна</p>
                        <p className="mt-1 text-sm text-muted-foreground">Шинэ үйлчилгээ нэмж эхлэх</p>
                        <Link href="/admin/treatments/create"
                            className="mt-4 flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                            <Plus className="size-4" /> Нэмэх
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {filtered.map((treatment) => (
                            <div key={treatment.id}
                                className={`group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md ${
                                    !treatment.is_active ? 'opacity-60' : ''
                                }`}
                            >
                                {/* Image */}
                                <div className="relative h-36 w-full overflow-hidden bg-muted">
                                    {treatment.image_url ? (
                                        <img src={treatment.image_url} alt={treatment.title}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <Stethoscope className="size-10 text-muted-foreground/20" />
                                        </div>
                                    )}

                                    {/* Category badge */}
                                    <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-lg bg-background/90 dark:bg-background/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-foreground shadow-sm">
                                        {treatment.category.icon && <span>{treatment.category.icon}</span>}
                                        {treatment.category.name}
                                    </span>

                                    {!treatment.is_active && (
                                        <span className="absolute right-2.5 top-2.5 rounded-lg bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
                                            Идэвхгүй
                                        </span>
                                    )}

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                                        <Link href={`/admin/treatments/${treatment.id}/edit`}
                                            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-100 shadow">
                                            <Edit className="size-3.5" /> Засах
                                        </Link>
                                        <button onClick={() => deleteTreatment(treatment.id)}
                                            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 shadow">
                                            <Trash2 className="size-3.5" /> Устгах
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-3">
                                    <h3 className="line-clamp-2 text-sm font-semibold text-foreground leading-snug mb-1">
                                        {treatment.title}
                                    </h3>
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">
                                        {formatPrice(treatment.price_min, treatment.price_max)}
                                    </p>
                                    {treatment.description && (
                                        <p className="line-clamp-2 text-[11px] text-muted-foreground leading-relaxed mb-2">
                                            {treatment.description}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between border-t pt-2 mt-2">
                                        <div className="flex items-center gap-2">
                                            {treatment.duration_min && (
                                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                    <Clock className="size-3" /> {treatment.duration_min} мин
                                                </span>
                                            )}
                                            {treatment.sub_treatments.length > 0 && (
                                                <button onClick={() => setModalTreatment(treatment)}
                                                    className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/80 transition-colors">
                                                    +{treatment.sub_treatments.length} дэд
                                                </button>
                                            )}
                                        </div>
                                        <Link href={`/admin/treatments/${treatment.id}/edit`}
                                            className="text-[11px] font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">
                                            Засах →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Stats ── */}
                <div className="mt-auto flex items-center gap-6 border-t pt-4 text-sm text-muted-foreground">
                    <span>
                        <span className="font-semibold text-foreground">{treatments.filter((t) => t.is_active).length}</span>
                        {' '}идэвхтэй
                    </span>
                    <span>
                        <span className="font-semibold text-foreground">{categories.length}</span>
                        {' '}ангилал
                    </span>
                    <span>
                        <span className="font-semibold text-foreground">
                            {treatments.reduce((a, t) => a + t.sub_treatments.length, 0)}
                        </span>
                        {' '}дэд үйлчилгээ
                    </span>
                </div>
            </div>
        </AppLayout>
    );
}
