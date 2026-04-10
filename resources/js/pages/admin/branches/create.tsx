import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Upload } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Салбарууд', href: '/admin/branches' },
    { title: 'Шинэ салбар', href: '/admin/branches/create' },
];

const TYPES = ['тов', 'төрөлжсөн', 'клиник', '24/7'] as const;

export default function BranchCreate() {
    const [preview, setPreview] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        type: 'клиник' as string,
        address: '',
        phone: '',
        description: '',
        doctor_count: '0',
        is_featured: false as boolean,
        is_active: true as boolean,
        image: null as File | null,
    });

    function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        setData('image', file);
        if (file) setPreview(URL.createObjectURL(file));
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/admin/branches');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Шинэ салбар нэмэх" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/branches" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-5" />
                    </Link>
                    <h1 className="text-xl font-bold">Шинэ салбар нэмэх</h1>
                </div>

                <form onSubmit={submit} encType="multipart/form-data" className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-5 lg:col-span-2">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Салбарын нэр *</label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Жишээ: Хотын төв клиник"
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                autoFocus
                            />
                            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                        </div>

                        {/* Type */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Төрөл *</label>
                            <div className="flex flex-wrap gap-2">
                                {TYPES.map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setData('type', t)}
                                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                                            data.type === t
                                                ? 'bg-red-600 text-white'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            {errors.type && <p className="text-xs text-red-500">{errors.type}</p>}
                        </div>

                        {/* Address */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Хаяг</label>
                            <input
                                type="text"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                placeholder="Жишээ: Сүхбаатар дүүрэг, 1-р хороо, 72 тоот"
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        {/* Phone */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Утас</label>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                placeholder="+976 9911 2233"
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Тайлбар</label>
                            <textarea
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                rows={3}
                                placeholder="Салбарын тухай товч тайлбар..."
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        {/* Doctor count */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Эмчийн тоо</label>
                            <input
                                type="number"
                                value={data.doctor_count}
                                onChange={(e) => setData('doctor_count', e.target.value)}
                                min="0"
                                className="border-input bg-background w-40 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        {/* Toggles */}
                        <div className="flex flex-col gap-3">
                            <label className="flex cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                    className="size-4 accent-red-600"
                                />
                                <span className="text-sm font-medium">Идэвхтэй байдлаар нийтлэх</span>
                            </label>
                            <label className="flex cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={data.is_featured}
                                    onChange={(e) => setData('is_featured', e.target.checked)}
                                    className="size-4 accent-yellow-500"
                                />
                                <span className="text-sm font-medium">Онцлох салбар болгох ⭐</span>
                            </label>
                        </div>
                    </div>

                    {/* Image */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Зураг</label>
                        <div
                            onClick={() => fileRef.current?.click()}
                            className="flex min-h-52 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted transition-colors hover:border-red-500"
                        >
                            {preview ? (
                                <img src={preview} alt="preview" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center gap-2 p-6 text-center">
                                    <Upload className="text-muted-foreground size-8" />
                                    <p className="text-muted-foreground text-sm">Зураг сонгох</p>
                                    <p className="text-xs text-muted-foreground/60">PNG, JPG — 5MB хүртэл</p>
                                </div>
                            )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
                        {errors.image && <p className="text-xs text-red-500">{errors.image}</p>}
                        {preview && (
                            <button type="button" onClick={() => { setPreview(null); setData('image', null); }} className="text-xs text-red-500 hover:underline">
                                Зураг хасах
                            </button>
                        )}
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
                        <Link href="/admin/branches" className="rounded-lg border px-6 py-2 text-sm font-medium hover:bg-muted">
                            Цуцлах
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
