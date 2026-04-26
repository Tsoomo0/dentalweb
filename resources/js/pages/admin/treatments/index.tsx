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
                <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                    {/* Header */}
                    <div className="relative">
                        {treatment.image_url ? (
                            <img src={treatment.image_url} alt={treatment.title} className="h-36 w-full object-cover" />
                        ) : (
                            <div className="flex h-24 w-full items-center justify-center bg-gray-100">
                                <Stethoscope className="size-8 text-gray-300" />
                            </div>
                        )}
                        <button onClick={onClose}
                            className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 shadow hover:bg-white">
                            <X className="size-4 text-gray-600" />
                        </button>
                    </div>

                    <div className="p-5">
                        <span className="mb-2 inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                            {treatment.category.name}
                        </span>
                        <h2 className="text-base font-bold text-gray-900">{treatment.title}</h2>
                        <div className="mt-1 flex items-center gap-3 text-sm">
                            <span className="font-semibold text-red-600">{formatPrice(treatment.price_min, treatment.price_max)}</span>
                            {treatment.duration_min && (
                                <span className="flex items-center gap-1 text-gray-400">
                                    <Clock className="size-3" /> {treatment.duration_min} мин
                                </span>
                            )}
                        </div>
                        {treatment.description && (
                            <p className="mt-2 text-sm text-gray-500">{treatment.description}</p>
                        )}

                        {/* Sub-treatments */}
                        <div className="mt-4 border-t pt-4">
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                                Дэд үйлчилгээ ({treatment.sub_treatments.length})
                            </h3>
                            {treatment.sub_treatments.length === 0 ? (
                                <p className="py-4 text-center text-sm text-gray-400">Дэд эмчилгээ байхгүй</p>
                            ) : (
                                <div className="max-h-52 space-y-2 overflow-y-auto">
                                    {treatment.sub_treatments.map((sub) => (
                                        <div key={sub.id}
                                            className={`flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 ${!sub.is_active ? 'opacity-50' : ''}`}>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">{sub.title}</p>
                                                {sub.description && (
                                                    <p className="text-xs text-gray-400 line-clamp-1">{sub.description}</p>
                                                )}
                                            </div>
                                            <span className="ml-3 flex-shrink-0 text-xs font-bold text-red-600">
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
                                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
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
                            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                            Ангилал засах
                        </Link>
                        <Link href="/admin/treatments/create"
                            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm">
                            <Plus className="size-4" /> Шинэ үйлчилгээ
                        </Link>
                    </div>
                </div>

                {/* ── Category Filter ── */}
                <div className="flex flex-wrap gap-2">
                    {/* All */}
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all border ${
                            activeCategory === null
                                ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900'
                        }`}
                    >
                        <FolderOpen className="size-3.5" />
                        Бүгд
                        <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                            activeCategory === null ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
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
                                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all border ${
                                    isActive
                                        ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900'
                                }`}
                            >
                                {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
                                {cat.name}
                                <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Treatment Cards ── */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-24 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                            <Stethoscope className="size-6 text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-700">Үйлчилгээ байхгүй байна</p>
                        <p className="mt-1 text-sm text-gray-400">Шинэ үйлчилгээ нэмж эхлэх</p>
                        <Link href="/admin/treatments/create"
                            className="mt-4 flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                            <Plus className="size-4" /> Нэмэх
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {filtered.map((treatment) => (
                            <div key={treatment.id}
                                className={`group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:border-gray-200 ${
                                    !treatment.is_active ? 'opacity-60' : ''
                                }`}
                            >
                                {/* Image */}
                                <div className="relative h-36 w-full overflow-hidden bg-gray-50">
                                    {treatment.image_url ? (
                                        <img src={treatment.image_url} alt={treatment.title}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                                            <Stethoscope className="size-8 text-gray-200" />
                                        </div>
                                    )}

                                    {/* Category badge */}
                                    <span className="absolute left-2.5 top-2.5 rounded-lg bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-gray-700 shadow-sm">
                                        {treatment.category.icon && <span className="mr-1">{treatment.category.icon}</span>}
                                        {treatment.category.name}
                                    </span>

                                    {!treatment.is_active && (
                                        <span className="absolute right-2.5 top-2.5 rounded-lg bg-gray-800/80 px-2 py-0.5 text-[10px] font-medium text-gray-300">
                                            Идэвхгүй
                                        </span>
                                    )}

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
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
                                    <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 leading-snug mb-1">
                                        {treatment.title}
                                    </h3>
                                    <p className="text-xs font-bold text-red-600 mb-1">
                                        {formatPrice(treatment.price_min, treatment.price_max)}
                                    </p>
                                    {treatment.description && (
                                        <p className="line-clamp-2 text-[11px] text-gray-400 leading-relaxed mb-2">
                                            {treatment.description}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
                                        <div className="flex items-center gap-2">
                                            {treatment.duration_min && (
                                                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                    <Clock className="size-3" /> {treatment.duration_min} мин
                                                </span>
                                            )}
                                            {treatment.sub_treatments.length > 0 && (
                                                <button onClick={() => setModalTreatment(treatment)}
                                                    className="rounded-lg bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                                                    +{treatment.sub_treatments.length} дэд
                                                </button>
                                            )}
                                        </div>
                                        <Link href={`/admin/treatments/${treatment.id}/edit`}
                                            className="text-[11px] font-medium text-red-500 hover:text-red-700 transition-colors">
                                            Засах →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Stats bar ── */}
                <div className="mt-auto flex items-center gap-6 border-t border-gray-100 pt-4 text-sm text-muted-foreground">
                    <span>
                        <span className="font-semibold text-foreground">{treatments.filter((t) => t.is_active).length}</span>
                        {' '}идэвхтэй үйлчилгээ
                    </span>
                    <span>
                        <span className="font-semibold text-foreground">{categories.length}</span>
                        {' '}ангилал
                    </span>
                    <span>
                        <span className="font-semibold text-foreground">
                            {treatments.filter((t) => t.sub_treatments.length > 0).reduce((a, t) => a + t.sub_treatments.length, 0)}
                        </span>
                        {' '}дэд үйлчилгээ
                    </span>
                </div>
            </div>
        </AppLayout>
    );
}
