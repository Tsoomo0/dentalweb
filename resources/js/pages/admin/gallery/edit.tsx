import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, ImageIcon, Upload } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';

interface Category {
    id: number;
    name: string;
}

interface GalleryItem {
    id: number;
    title: string;
    description: string | null;
    category_id: number | null;
    before_url: string;
    after_url: string;
    is_featured: boolean;
    is_active: boolean;
}

interface Props {
    item: GalleryItem;
    categories: Category[];
}

export default function GalleryEdit({ item, categories }: Props) {
    const [beforePreview, setBeforePreview] = useState<string | null>(item.before_url);
    const [afterPreview, setAfterPreview]   = useState<string | null>(item.after_url);
    const beforeRef = useRef<HTMLInputElement>(null);
    const afterRef  = useRef<HTMLInputElement>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Админ', href: '/admin/dashboard' },
        { title: 'Үр дүнгийн галерей', href: '/admin/gallery' },
        { title: item.title, href: `/admin/gallery/${item.id}/edit` },
    ];

    const { data, setData, post, processing, errors } = useForm<{
        title:        string;
        description:  string;
        category_id:  string;
        before_image: File | null;
        after_image:  File | null;
        is_featured:  boolean;
        is_active:    boolean;
        _method:      string;
    }>({
        title:        item.title,
        description:  item.description ?? '',
        category_id:  item.category_id ? String(item.category_id) : '',
        before_image: null,
        after_image:  null,
        is_featured:  item.is_featured,
        is_active:    item.is_active,
        _method:      'PUT',
    });

    function handleImage(
        field: 'before_image' | 'after_image',
        setPreview: (v: string | null) => void,
        e: React.ChangeEvent<HTMLInputElement>,
    ) {
        const file = e.target.files?.[0] ?? null;
        setData(field, file);
        if (file) setPreview(URL.createObjectURL(file));
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        post(`/admin/gallery/${item.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Засах — ${item.title}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/gallery" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-5" />
                    </Link>
                    <h1 className="text-xl font-bold">Үр дүн засах</h1>
                </div>

                <form onSubmit={submit} encType="multipart/form-data" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-5">
                        {/* Left — images */}
                        <div className="space-y-5 lg:col-span-3">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Өмнө / Дараа зургууд</p>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {/* Before */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Өмнөх зураг</label>
                                    <div
                                        onClick={() => beforeRef.current?.click()}
                                        className="relative flex min-h-52 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted transition-colors hover:border-red-400"
                                    >
                                        {beforePreview ? (
                                            <>
                                                <img src={beforePreview} alt="before" className="h-full w-full object-cover" />
                                                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                                                    Өмнө
                                                </span>
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/20">
                                                    <span className="rounded bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity hover:opacity-100">
                                                        Солих
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 p-6 text-center">
                                                <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                                                    <ImageIcon className="size-6 text-muted-foreground" />
                                                </div>
                                                <p className="text-xs text-muted-foreground">Өмнөх зураг оруулах</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={beforeRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImage('before_image', setBeforePreview, e)}
                                        className="hidden"
                                    />
                                    {errors.before_image && <p className="text-xs text-red-500">{errors.before_image}</p>}
                                </div>

                                {/* After */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Дараах зураг</label>
                                    <div
                                        onClick={() => afterRef.current?.click()}
                                        className="relative flex min-h-52 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted transition-colors hover:border-red-400"
                                    >
                                        {afterPreview ? (
                                            <>
                                                <img src={afterPreview} alt="after" className="h-full w-full object-cover" />
                                                <span className="absolute bottom-2 right-2 rounded bg-red-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                                                    Дараа
                                                </span>
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/20">
                                                    <span className="rounded bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity hover:opacity-100">
                                                        Солих
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 p-6 text-center">
                                                <div className="flex size-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
                                                    <Upload className="size-6 text-red-400" />
                                                </div>
                                                <p className="text-xs text-muted-foreground">Дараах зураг оруулах</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={afterRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImage('after_image', setAfterPreview, e)}
                                        className="hidden"
                                    />
                                    {errors.after_image && <p className="text-xs text-red-500">{errors.after_image}</p>}
                                </div>
                            </div>

                            {/* Preview combined */}
                            {beforePreview && afterPreview && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">Урьдчилан харах</p>
                                    <div className="relative flex h-40 overflow-hidden rounded-xl border">
                                        <div className="relative flex-1 overflow-hidden">
                                            <img src={beforePreview} alt="before" className="h-full w-full object-cover" />
                                            <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">Өмнө</span>
                                        </div>
                                        <div className="absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-white/80" />
                                        <div className="relative flex-1 overflow-hidden">
                                            <img src={afterPreview} alt="after" className="h-full w-full object-cover" />
                                            <span className="absolute bottom-2 right-2 rounded bg-red-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">Дараа</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right — meta */}
                        <div className="space-y-5 lg:col-span-2">
                            {/* Title */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Гарчиг *</label>
                                <input
                                    type="text"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    placeholder="Жишээ: Invisalign эмчилгээ..."
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
                                    placeholder="Эмчилгээний товч тайлбар..."
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            {/* Category */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Ангилал</label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setData('category_id', '')}
                                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                            data.category_id === ''
                                                ? 'bg-red-600 text-white'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        Ангилалгүй
                                    </button>
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setData('category_id', String(cat.id))}
                                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                                data.category_id === String(cat.id)
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Flags */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Тохиргоо</label>
                                {([
                                    { field: 'is_active',   label: 'Идэвхтэй', desc: 'Сайтад харагдана', dot: 'bg-green-500'  },
                                    { field: 'is_featured', label: 'Онцлох',   desc: 'Гол хэсэгт гарна', dot: 'bg-yellow-400' },
                                ] as const).map(({ field, label, desc, dot }) => (
                                    <button
                                        key={field}
                                        type="button"
                                        onClick={() => setData(field, !data[field])}
                                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                                            data[field]
                                                ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                                                : 'hover:bg-muted'
                                        }`}
                                    >
                                        <span className={`size-2 rounded-full ${data[field] ? dot : 'bg-zinc-300'}`} />
                                        <div>
                                            <p className="font-medium">{label}</p>
                                            <p className="text-xs text-muted-foreground">{desc}</p>
                                        </div>
                                        <span className={`ml-auto text-xs font-medium ${data[field] ? 'text-red-600' : 'text-muted-foreground'}`}>
                                            {data[field] ? 'Тийм' : 'Үгүй'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 border-t pt-4">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                            {processing ? 'Хадгалж байна...' : 'Шинэчлэх'}
                        </button>
                        <Link href="/admin/gallery" className="rounded-lg border px-6 py-2 text-sm font-medium hover:bg-muted">
                            Цуцлах
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
