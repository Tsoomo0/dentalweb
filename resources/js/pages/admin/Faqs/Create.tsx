import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Түгээмэл асуултууд', href: '/admin/faqs' },
    { title: 'Шинэ асуулт', href: '/admin/faqs/create' },
];

const CATEGORIES = ['Үйлчилгээ', 'Үнэ', 'Үйлчилгээний хугацаа', 'Төлбөрийн арга', 'Цүцлэлт', 'Бусад'];

export default function FaqCreate() {
    const { data, setData, post, processing, errors } = useForm<{
        question:  string;
        answer:    string;
        category:  string;
        is_active: boolean;
    }>({
        question:  '',
        answer:    '',
        category:  '',
        is_active: true,
    });

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/admin/faqs');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Шинэ асуулт нэмэх" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/faqs" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-5" />
                    </Link>
                    <h1 className="text-xl font-bold">Шинэ асуулт нэмэх</h1>
                </div>

                <form onSubmit={submit} className="max-w-2xl space-y-5">
                    {/* Question */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Асуулт *</label>
                        <input
                            type="text"
                            value={data.question}
                            onChange={(e) => setData('question', e.target.value)}
                            placeholder="Асуулт оруулна уу..."
                            autoFocus
                            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        {errors.question && <p className="text-xs text-red-500">{errors.question}</p>}
                    </div>

                    {/* Answer */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Хариулт *</label>
                        <textarea
                            value={data.answer}
                            onChange={(e) => setData('answer', e.target.value)}
                            rows={6}
                            placeholder="Дэлгэрэнгүй хариултыг оруулна уу..."
                            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        {errors.answer && <p className="text-xs text-red-500">{errors.answer}</p>}
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
                        {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Төлөв</label>
                        <div className="flex gap-3">
                            {([
                                { value: true,  label: 'Идэвхтэй',  desc: 'Сайтад харагдана',   dot: 'bg-green-500' },
                                { value: false, label: 'Идэвхгүй', desc: 'Нуугдсан байна',      dot: 'bg-zinc-400' },
                            ] as const).map(({ value, label, desc, dot }) => (
                                <button
                                    key={String(value)}
                                    type="button"
                                    onClick={() => setData('is_active', value)}
                                    className={`flex flex-1 items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                                        data.is_active === value
                                            ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                                            : 'hover:bg-muted'
                                    }`}
                                >
                                    <span className={`size-2 rounded-full ${dot}`} />
                                    <div>
                                        <p className="font-medium">{label}</p>
                                        <p className="text-xs text-muted-foreground">{desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                            {processing ? 'Хадгалж байна...' : 'Хадгалах'}
                        </button>
                        <Link href="/admin/faqs" className="rounded-lg border px-6 py-2 text-sm font-medium hover:bg-muted">
                            Цуцлах
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
