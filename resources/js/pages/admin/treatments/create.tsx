import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';

interface TreatmentCategory {
    id: number;
    name: string;
}

interface SubTreatmentInput {
    title: string;
    description: string;
    price_min: string;
    price_max: string;
    duration_min: string;
    is_active: boolean;
    [key: string]: string | boolean;
}

interface Props {
    categories: TreatmentCategory[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Эмчилгээ', href: '/admin/treatments' },
    { title: 'Шинэ эмчилгээ', href: '/admin/treatments/create' },
];

const emptySubTreatment = (): SubTreatmentInput => ({
    title: '',
    description: '',
    price_min: '',
    price_max: '',
    duration_min: '',
    is_active: true,
});

export default function TreatmentCreate({ categories }: Props) {
    const [preview, setPreview] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm<{
        treatment_category_id: number | string;
        title: string;
        description: string;
        price_min: string;
        price_max: string;
        duration_min: string;
        is_active: boolean;
        image: File | null;
        sub_treatments: SubTreatmentInput[];
    }>({
        treatment_category_id: categories[0]?.id ?? '',
        title: '',
        description: '',
        price_min: '',
        price_max: '',
        duration_min: '',
        is_active: true,
        image: null,
        sub_treatments: [],
    });

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        setData('image', file);
        if (file) setPreview(URL.createObjectURL(file));
    }

    function addSub() {
        setData('sub_treatments', [...data.sub_treatments, emptySubTreatment()]);
    }

    function updateSub(i: number, field: keyof SubTreatmentInput, value: string | boolean) {
        const updated = [...data.sub_treatments];
        updated[i] = { ...updated[i], [field]: value };
        setData('sub_treatments', updated);
    }

    function removeSub(i: number) {
        setData('sub_treatments', data.sub_treatments.filter((_, idx) => idx !== i));
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/admin/treatments');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Шинэ эмчилгээ нэмэх" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/treatments" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-5" />
                    </Link>
                    <h1 className="text-xl font-bold">Шинэ эмчилгээ нэмэх</h1>
                </div>

                <form onSubmit={submit} encType="multipart/form-data" className="space-y-6">
                    {/* Main fields + image */}
                    <div className="grid gap-6 lg:grid-cols-3">
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
                                    placeholder="Жишээ: Дэзо зарогзалийн титан имплант"
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
                                    rows={3}
                                    placeholder="Эмчилгээний дэлгэрэнгүй тайлбар..."
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
                                        placeholder="50000"
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Үнэ (дээд) ₮</label>
                                    <input
                                        type="number"
                                        value={data.price_max}
                                        onChange={(e) => setData('price_max', e.target.value)}
                                        placeholder="100000"
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                            </div>

                            {/* Duration + Active */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Хугацаа (минут)</label>
                                    <input
                                        type="number"
                                        value={data.duration_min}
                                        onChange={(e) => setData('duration_min', e.target.value)}
                                        placeholder="60"
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div className="flex items-end pb-2">
                                    <label className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={data.is_active}
                                            onChange={(e) => setData('is_active', e.target.checked)}
                                            className="size-4 rounded accent-red-600"
                                        />
                                        <span className="text-sm font-medium">Идэвхтэй нийтлэх</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Image */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Зураг</label>
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="border-input flex min-h-52 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-zinc-900 text-white transition-colors hover:border-red-500"
                            >
                                {preview ? (
                                    <img src={preview} alt="preview" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 p-6 text-center">
                                        <Upload className="size-8 text-zinc-500" />
                                        <p className="text-sm text-zinc-400">Зураг сонгохын тулд дарна уу</p>
                                        <p className="text-xs text-zinc-600">PNG, JPG — 5MB хүртэл</p>
                                    </div>
                                )}
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                            {errors.image && <p className="text-xs text-red-500">{errors.image}</p>}
                            {preview && (
                                <button type="button" onClick={() => { setPreview(null); setData('image', null); }} className="text-xs text-red-500 hover:underline">
                                    Зураг хасах
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sub-treatments */}
                    <div className="rounded-xl border">
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <div>
                                <h2 className="font-semibold">Дэд эмчилгээнүүд</h2>
                                <p className="text-muted-foreground mt-0.5 text-xs">
                                    Энэ эмчилгээний дотор орох дэд үйлчилгээнүүд
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addSub}
                                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
                            >
                                <Plus className="size-4" /> Нэмэх
                            </button>
                        </div>

                        {data.sub_treatments.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-10">
                                <p className="text-muted-foreground text-sm">Дэд эмчилгээ байхгүй</p>
                                <button
                                    type="button"
                                    onClick={addSub}
                                    className="text-sm text-red-600 hover:underline"
                                >
                                    + Дэд эмчилгээ нэмэх
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {data.sub_treatments.map((sub, i) => (
                                    <div key={i} className="p-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">#{i + 1} Дэд эмчилгээ</span>
                                            <button
                                                type="button"
                                                onClick={() => removeSub(i)}
                                                className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="space-y-1.5 sm:col-span-2">
                                                <label className="text-xs font-medium">Нэр *</label>
                                                <input
                                                    type="text"
                                                    value={sub.title}
                                                    onChange={(e) => updateSub(i, 'title', e.target.value)}
                                                    placeholder="Дэд эмчилгээний нэр"
                                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                                />
                                            </div>
                                            <div className="space-y-1.5 sm:col-span-2">
                                                <label className="text-xs font-medium">Тайлбар</label>
                                                <input
                                                    type="text"
                                                    value={sub.description}
                                                    onChange={(e) => updateSub(i, 'description', e.target.value)}
                                                    placeholder="Товч тайлбар (заавал биш)"
                                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium">Үнэ (доод) ₮</label>
                                                <input
                                                    type="number"
                                                    value={sub.price_min}
                                                    onChange={(e) => updateSub(i, 'price_min', e.target.value)}
                                                    placeholder="50000"
                                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium">Үнэ (дээд) ₮</label>
                                                <input
                                                    type="number"
                                                    value={sub.price_max}
                                                    onChange={(e) => updateSub(i, 'price_max', e.target.value)}
                                                    placeholder="100000"
                                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium">Хугацаа (мин)</label>
                                                <input
                                                    type="number"
                                                    value={sub.duration_min}
                                                    onChange={(e) => updateSub(i, 'duration_min', e.target.value)}
                                                    placeholder="30"
                                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                                />
                                            </div>
                                            <div className="flex items-end pb-2">
                                                <label className="flex cursor-pointer items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={sub.is_active}
                                                        onChange={(e) => updateSub(i, 'is_active', e.target.checked)}
                                                        className="size-4 accent-red-600"
                                                    />
                                                    <span className="text-sm">Идэвхтэй</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3">
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
            </div>
        </AppLayout>
    );
}
