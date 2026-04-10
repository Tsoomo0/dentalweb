import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, FileText, Upload } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Мэдээ ба Нийтлэл', href: '/admin/articles' },
    { title: 'Шинэ нийтлэл', href: '/admin/articles/create' },
];

const CATEGORIES = ['Технологи', 'Эрүүл мэнд', 'Хүүхдийн', 'Экологи', 'Мэдээлэл'];

export default function ArticleCreate() {
    const [preview, setPreview] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm<{
        title: string;
        content: string;
        excerpt: string;
        category: string;
        status: 'draft' | 'published' | 'archived';
        featured_image: File | null;
    }>({
        title:          '',
        content:        '',
        excerpt:        '',
        category:       '',
        status:         'draft',
        featured_image: null,
    });

    function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        setData('featured_image', file);
        if (file) setPreview(URL.createObjectURL(file));
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/admin/articles');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Шинэ нийтлэл нэмэх" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/articles" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-5" />
                    </Link>
                    <h1 className="text-xl font-bold">Шинэ нийтлэл нэмэх</h1>
                </div>

                <form onSubmit={submit} encType="multipart/form-data" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Left */}
                        <div className="space-y-5 lg:col-span-2">
                            {/* Title */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Гарчиг *</label>
                                <input
                                    type="text"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    placeholder="Нийтлэлийн гарчиг..."
                                    autoFocus
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                            </div>

                            {/* Excerpt */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Товч тайлбар</label>
                                <textarea
                                    value={data.excerpt}
                                    onChange={(e) => setData('excerpt', e.target.value)}
                                    rows={2}
                                    placeholder="Нийтлэлийн товч агуулга (500 тэмдэгт хүртэл)..."
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                {errors.excerpt && <p className="text-xs text-red-500">{errors.excerpt}</p>}
                            </div>

                            {/* Content */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Агуулга *</label>
                                <textarea
                                    value={data.content}
                                    onChange={(e) => setData('content', e.target.value)}
                                    rows={12}
                                    placeholder="Нийтлэлийн бүрэн агуулга..."
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                {errors.content && <p className="text-xs text-red-500">{errors.content}</p>}
                            </div>
                        </div>

                        {/* Right */}
                        <div className="space-y-5">
                            {/* Featured Image */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Нүүр зураг</label>
                                <div
                                    onClick={() => fileRef.current?.click()}
                                    className="flex min-h-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted transition-colors hover:border-red-500"
                                >
                                    {preview ? (
                                        <img src={preview} alt="preview" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 p-6 text-center">
                                            <div className="flex size-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
                                                <FileText className="size-7 text-red-400" />
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sm text-red-600">
                                                <Upload className="size-4" /> Зураг оруулах
                                            </div>
                                            <p className="text-xs text-muted-foreground">PNG, JPG — 5MB хүртэл</p>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImage}
                                    className="hidden"
                                />
                                {preview && (
                                    <button
                                        type="button"
                                        onClick={() => { setPreview(null); setData('featured_image', null); }}
                                        className="text-xs text-red-500 hover:underline"
                                    >
                                        Зураг хасах
                                    </button>
                                )}
                                {errors.featured_image && (
                                    <p className="text-xs text-red-500">{errors.featured_image}</p>
                                )}
                            </div>

                            {/* Category */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Ангилал</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setData('category', data.category === cat ? '' : cat)}
                                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                                data.category === cat
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={data.category}
                                    onChange={(e) => setData('category', e.target.value)}
                                    placeholder="Эсвэл өөр ангилал бичнэ үү..."
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
                            </div>

                            {/* Status */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Төлөв</label>
                                <div className="space-y-2">
                                    {([
                                        { value: 'draft',     label: 'Нооргор',     desc: 'Зөвхөн та харна' },
                                        { value: 'published', label: 'Нийтлэх',     desc: 'Сайтад харагдана' },
                                        { value: 'archived',  label: 'Архивлах',    desc: 'Нуугдсан байна' },
                                    ] as const).map(({ value, label, desc }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setData('status', value)}
                                            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                                                data.status === value
                                                    ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                                                    : 'hover:bg-muted'
                                            }`}
                                        >
                                            <span className={`size-2 rounded-full ${
                                                value === 'published' ? 'bg-green-500' :
                                                value === 'draft'     ? 'bg-yellow-500' :
                                                'bg-zinc-400'
                                            }`} />
                                            <div>
                                                <p className="font-medium">{label}</p>
                                                <p className="text-xs text-muted-foreground">{desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                {errors.status && <p className="text-xs text-red-500">{errors.status}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                            {processing ? 'Хадгалж байна...' : 'Хадгалах'}
                        </button>
                        <Link href="/admin/articles" className="rounded-lg border px-6 py-2 text-sm font-medium hover:bg-muted">
                            Цуцлах
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
