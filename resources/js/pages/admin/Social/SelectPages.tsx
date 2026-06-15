import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { CheckCircle2, Facebook, Instagram } from 'lucide-react';

interface PageItem {
    page_id: string;
    page_name: string;
    ig_username: string | null;
    avatar: string | null;
    already_connected: boolean;
}

interface Props {
    pages: PageItem[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Social Bot', href: '/admin/social/accounts' },
    { title: 'Хуудас сонгох', href: '/admin/social/select' },
];

export default function SelectPages({ pages }: Props) {
    // Анхдагчаар: өмнө нь холбоогүй бүх хуудсыг сонгосон байдлаар эхэлнэ.
    const { data, setData, post, processing } = useForm<{ page_ids: string[] }>({
        page_ids: pages.map(p => p.page_id),
    });

    function toggle(pageId: string) {
        setData(
            'page_ids',
            data.page_ids.includes(pageId)
                ? data.page_ids.filter(id => id !== pageId)
                : [...data.page_ids, pageId],
        );
    }

    function submit() {
        post('/admin/social/select');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Хуудас сонгох" />

            <div className="mx-auto w-full max-w-2xl space-y-5 p-4">
                <div>
                    <h1 className="text-xl font-semibold">Холбох хуудсаа сонгоно уу</h1>
                    <p className="text-sm text-muted-foreground">
                        Facebook-аас татсан хуудсууд. Холбохыг хүссэн хуудсаа тэмдэглээд "Холбох" дарна уу.
                    </p>
                </div>

                <ul className="space-y-2">
                    {pages.map(p => {
                        const checked = data.page_ids.includes(p.page_id);
                        return (
                            <li key={p.page_id}>
                                <label
                                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                                        checked ? 'border-[#1877F2] bg-blue-50/50' : 'hover:bg-accent'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggle(p.page_id)}
                                        className="h-4 w-4 accent-[#1877F2]"
                                    />
                                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted">
                                        {p.avatar ? (
                                            <img src={p.avatar} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <Facebook className="h-5 w-5 text-[#1877F2]" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium">{p.page_name}</div>
                                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                                            <span>Page ID: {p.page_id}</span>
                                            {p.ig_username ? (
                                                <span className="inline-flex items-center gap-1 text-pink-600">
                                                    <Instagram className="h-3.5 w-3.5" /> @{p.ig_username}
                                                </span>
                                            ) : (
                                                <span className="text-amber-600">Instagram холбоогүй</span>
                                            )}
                                        </div>
                                    </div>
                                    {p.already_connected && (
                                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Холбогдсон
                                        </span>
                                    )}
                                </label>
                            </li>
                        );
                    })}
                </ul>

                <div className="flex items-center justify-end gap-2">
                    <a
                        href="/admin/social/accounts"
                        className="rounded-lg border px-4 py-2.5 text-sm hover:bg-accent"
                    >
                        Болих
                    </a>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={processing || data.page_ids.length === 0}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#166fe0] disabled:opacity-50"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Холбох ({data.page_ids.length})
                    </button>
                </div>
            </div>
        </AppLayout>
    );
}
