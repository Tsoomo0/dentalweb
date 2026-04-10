import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Edit2, Plus, Trash2, Upload } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';

interface TreatmentCategory {
    id: number;
    name: string;
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
    sub_treatments: SubTreatment[];
}

interface Props {
    treatment: Treatment;
    categories: TreatmentCategory[];
}

export default function TreatmentEdit({ treatment, categories }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const flash = props.flash;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Админ', href: '/admin/dashboard' },
        { title: 'Эмчилгээ', href: '/admin/treatments' },
        { title: treatment.title, href: `/admin/treatments/${treatment.id}/edit` },
    ];

    const [preview, setPreview] = useState<string | null>(treatment.image_url);
    const fileRef = useRef<HTMLInputElement>(null);
    const [showSubForm, setShowSubForm] = useState(false);
    const [editingSub, setEditingSub] = useState<SubTreatment | null>(null);

    const { data, setData, post, processing, errors } = useForm({
        _method: 'PUT',
        treatment_category_id: treatment.treatment_category_id,
        title: treatment.title,
        description: treatment.description ?? '',
        price_min: treatment.price_min?.toString() ?? '',
        price_max: treatment.price_max?.toString() ?? '',
        duration_min: treatment.duration_min?.toString() ?? '',
        is_active: treatment.is_active,
        image: null as File | null,
    });

    const subForm = useForm({
        title: '',
        description: '',
        price_min: '',
        price_max: '',
        duration_min: '',
        is_active: true as boolean,
    });

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        setData('image', file);
        if (file) setPreview(URL.createObjectURL(file));
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        post(`/admin/treatments/${treatment.id}`);
    }

    function submitSub(e: FormEvent) {
        e.preventDefault();
        if (editingSub) {
            subForm.put(`/admin/treatments/${treatment.id}/sub-treatments/${editingSub.id}`, {
                onSuccess: () => { setEditingSub(null); subForm.reset(); },
            });
        } else {
            subForm.post(`/admin/treatments/${treatment.id}/sub-treatments`, {
                onSuccess: () => { setShowSubForm(false); subForm.reset(); },
            });
        }
    }

    function startEditSub(sub: SubTreatment) {
        setEditingSub(sub);
        subForm.setData({
            title: sub.title,
            description: sub.description ?? '',
            price_min: sub.price_min?.toString() ?? '',
            price_max: sub.price_max?.toString() ?? '',
            duration_min: sub.duration_min?.toString() ?? '',
            is_active: sub.is_active,
        });
        setShowSubForm(true);
    }

    function deleteSub(subId: number) {
        if (confirm('Дэд эмчилгээг устгах уу?')) {
            router.delete(`/admin/treatments/${treatment.id}/sub-treatments/${subId}`);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Засах: ${treatment.title}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {flash?.success && (
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400">
                        <CheckCircle2 className="size-4 shrink-0" />
                        {flash.success}
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <Link href="/admin/treatments" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-5" />
                    </Link>
                    <h1 className="text-xl font-bold">Эмчилгээ засах</h1>
                </div>

                <form onSubmit={submit} encType="multipart/form-data" className="grid gap-6 lg:grid-cols-3">
                    {/* Left - main fields */}
                    <div className="space-y-5 lg:col-span-2">
                        {/* Category */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Ангилал *</label>
                            <select
                                value={data.treatment_category_id}
                                onChange={(e) => setData('treatment_category_id', Number(e.target.value))}
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            {errors.treatment_category_id && <p className="text-xs text-red-500">{errors.treatment_category_id}</p>}
                        </div>

                        {/* Title */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Эмчилгээний нэр *</label>
                            <input
                                type="text"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Тайлбар</label>
                            <textarea
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                rows={4}
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        {/* Price */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Үнэ (доод) ₮</label>
                                <input
                                    type="number"
                                    value={data.price_min}
                                    onChange={(e) => setData('price_min', e.target.value)}
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Үнэ (дээд) ₮</label>
                                <input
                                    type="number"
                                    value={data.price_max}
                                    onChange={(e) => setData('price_max', e.target.value)}
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                        </div>

                        {/* Duration */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Үргэлжлэх хугацаа (минут)</label>
                            <input
                                type="number"
                                value={data.duration_min}
                                onChange={(e) => setData('duration_min', e.target.value)}
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        {/* Active */}
                        <label className="flex cursor-pointer items-center gap-3">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="size-4 rounded accent-red-600"
                            />
                            <span className="text-sm font-medium">Идэвхтэй</span>
                        </label>
                    </div>

                    {/* Right - image */}
                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Зураг</label>
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="border-input flex min-h-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-zinc-900 text-white transition-colors hover:border-red-500"
                            >
                                {preview ? (
                                    <img src={preview} alt="preview" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 p-6 text-center">
                                        <Upload className="size-8 text-zinc-500" />
                                        <p className="text-sm text-zinc-400">Зураг солих</p>
                                    </div>
                                )}
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 lg:col-span-3">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                            {processing ? 'Хадгалж байна...' : 'Хадгалах'}
                        </button>
                        <Link href="/admin/treatments" className="rounded-lg border px-6 py-2 text-sm font-medium hover:bg-muted">
                            Цуцлах
                        </Link>
                    </div>
                </form>

                {/* Sub-treatments */}
                <div className="border-t pt-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-semibold">Дэд эмчилгээнүүд ({treatment.sub_treatments.length})</h2>
                        <button
                            onClick={() => { setShowSubForm(!showSubForm); setEditingSub(null); subForm.reset(); }}
                            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
                        >
                            <Plus className="size-4" /> Дэд эмчилгээ нэмэх
                        </button>
                    </div>

                    {/* Sub form */}
                    {showSubForm && (
                        <form onSubmit={submitSub} className="mb-4 rounded-xl border bg-muted/30 p-4 space-y-4">
                            <h3 className="text-sm font-medium">
                                {editingSub ? 'Дэд эмчилгээ засах' : 'Шинэ дэд эмчилгээ'}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="text-sm font-medium">Нэр *</label>
                                    <input
                                        type="text"
                                        value={subForm.data.title}
                                        onChange={(e) => subForm.setData('title', e.target.value)}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                    {subForm.errors.title && <p className="text-xs text-red-500">{subForm.errors.title}</p>}
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="text-sm font-medium">Тайлбар</label>
                                    <textarea
                                        value={subForm.data.description}
                                        onChange={(e) => subForm.setData('description', e.target.value)}
                                        rows={2}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Үнэ (доод) ₮</label>
                                    <input
                                        type="number"
                                        value={subForm.data.price_min}
                                        onChange={(e) => subForm.setData('price_min', e.target.value)}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Үнэ (дээд) ₮</label>
                                    <input
                                        type="number"
                                        value={subForm.data.price_max}
                                        onChange={(e) => subForm.setData('price_max', e.target.value)}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Хугацаа (мин)</label>
                                    <input
                                        type="number"
                                        value={subForm.data.duration_min}
                                        onChange={(e) => subForm.setData('duration_min', e.target.value)}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div className="flex items-center gap-2 self-end pb-2">
                                    <label className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={subForm.data.is_active}
                                            onChange={(e) => subForm.setData('is_active', e.target.checked)}
                                            className="size-4 accent-red-600"
                                        />
                                        <span className="text-sm">Идэвхтэй</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={subForm.processing}
                                    className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                    {subForm.processing ? 'Хадгалж байна...' : editingSub ? 'Шинэчлэх' : 'Нэмэх'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowSubForm(false); setEditingSub(null); subForm.reset(); }}
                                    className="rounded-lg border px-4 py-1.5 text-sm hover:bg-muted"
                                >
                                    Цуцлах
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Sub-treatment list */}
                    {treatment.sub_treatments.length > 0 ? (
                        <div className="space-y-2">
                            {treatment.sub_treatments.map((sub) => (
                                <div key={sub.id} className={`flex items-center justify-between rounded-xl border bg-zinc-900 px-4 py-3 text-white ${!sub.is_active ? 'opacity-50' : ''}`}>
                                    <div>
                                        <p className="font-medium">{sub.title}</p>
                                        {sub.description && <p className="mt-0.5 text-sm text-zinc-400 line-clamp-1">{sub.description}</p>}
                                        <div className="mt-1 flex gap-3 text-xs text-zinc-400">
                                            {(sub.price_min || sub.price_max) && (
                                                <span>
                                                    ₮{Number(sub.price_min).toLocaleString()}
                                                    {sub.price_max ? ` - ₮${Number(sub.price_max).toLocaleString()}` : ''}
                                                </span>
                                            )}
                                            {sub.duration_min && <span>{sub.duration_min} мин</span>}
                                            {!sub.is_active && <span className="text-zinc-500">Идэвхгүй</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => startEditSub(sub)}
                                            className="rounded-lg bg-zinc-700 p-1.5 hover:bg-zinc-600"
                                        >
                                            <Edit2 className="size-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteSub(sub.id)}
                                            className="rounded-lg bg-red-900 p-1.5 hover:bg-red-800"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm">Дэд эмчилгээ байхгүй байна.</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
