import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Upload } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';

interface Branch {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    image_url: string | null;
    description: string | null;
    doctor_count: number;
    is_featured: boolean;
    is_active: boolean;
}

interface Props {
    branch: Branch;
}

export default function BranchEdit({ branch }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Админ', href: '/admin/dashboard' },
        { title: 'Салбарууд', href: '/admin/branches' },
        { title: branch.name, href: `/admin/branches/${branch.id}/edit` },
    ];

    const [preview, setPreview] = useState<string | null>(branch.image_url);
    const fileRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm({
        _method: 'PUT',
        name: branch.name,
        address: branch.address ?? '',
        phone: branch.phone ?? '',
        description: branch.description ?? '',
        doctor_count: branch.doctor_count.toString(),
        is_featured: branch.is_featured,
        is_active: branch.is_active,
        image: null as File | null,
    });

    function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        setData('image', file);
        if (file) setPreview(URL.createObjectURL(file));
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        post(`/admin/branches/${branch.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Засах: ${branch.name}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/branches" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-5" />
                    </Link>
                    <h1 className="text-xl font-bold">Салбар засах</h1>
                </div>

                <form onSubmit={submit} encType="multipart/form-data" className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-5 lg:col-span-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Салбарын нэр *</label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Хаяг</label>
                            <input
                                type="text"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Утас</label>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Тайлбар</label>
                            <textarea
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                rows={3}
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

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

                        <div className="flex flex-col gap-3">
                            <label className="flex cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                    className="size-4 accent-red-600"
                                />
                                <span className="text-sm font-medium">Идэвхтэй</span>
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
                                    <p className="text-muted-foreground text-sm">Зураг солих</p>
                                </div>
                            )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
                    </div>

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
