import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { FolderOpen, LayoutGrid, Plus, Stethoscope, Users } from 'lucide-react';

interface Stats {
    treatments_total: number;
    treatments_active: number;
    categories_total: number;
    users_total: number;
}

interface Treatment {
    id: number;
    title: string;
    price_min: number | null;
    price_max: number | null;
    is_active: boolean;
    created_at: string;
    category: { id: number; name: string };
}

interface Props {
    stats: Stats;
    recent_treatments: Treatment[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
];

function formatPrice(min: number | null, max: number | null): string {
    if (!min && !max) return '—';
    const fmt = (v: number) => `₮${Number(v).toLocaleString()}`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    return fmt(min ?? max!);
}

export default function AdminDashboard({ stats, recent_treatments }: Props) {
    const statCards = [
        {
            label: 'Нийт эмчилгээ',
            value: stats.treatments_total,
            sub: `${stats.treatments_active} идэвхтэй`,
            icon: Stethoscope,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
        },
        {
            label: 'Ангилал',
            value: stats.categories_total,
            sub: 'эмчилгээний ангилал',
            icon: FolderOpen,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
        },
        {
            label: 'Хэрэглэгч',
            value: stats.users_total,
            sub: 'бүртгэлтэй',
            icon: Users,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Dashboard</h1>
                        <p className="text-muted-foreground text-sm">Кутикул Клиник — Удирдлагын самбар</p>
                    </div>
                    <Link
                        href="/admin/treatments/create"
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                        <Plus className="size-4" />
                        Шинэ эмчилгээ
                    </Link>
                </div>

                {/* Stat cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                    {statCards.map((card) => (
                        <div key={card.label} className="rounded-xl border p-5">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-muted-foreground text-sm font-medium">{card.label}</span>
                                <div className={`rounded-lg p-2 ${card.bg}`}>
                                    <card.icon className={`size-5 ${card.color}`} />
                                </div>
                            </div>
                            <p className="text-3xl font-bold">{card.value}</p>
                            <p className="text-muted-foreground mt-1 text-xs">{card.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Recent treatments */}
                <div className="rounded-xl border">
                    <div className="flex items-center justify-between border-b px-5 py-4">
                        <h2 className="font-semibold">Сүүлд нэмэгдсэн эмчилгээ</h2>
                        <Link href="/admin/treatments" className="text-sm text-red-600 hover:underline">
                            Бүгдийг харах →
                        </Link>
                    </div>

                    {recent_treatments.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12">
                            <LayoutGrid className="text-muted-foreground size-8" />
                            <p className="text-muted-foreground text-sm">Эмчилгээ байхгүй байна</p>
                            <Link href="/admin/treatments/create" className="text-sm text-red-600 hover:underline">
                                + Шинэ эмчилгээ нэмэх
                            </Link>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 border-b">
                                <tr>
                                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Нэр</th>
                                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Ангилал</th>
                                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Үнэ</th>
                                    <th className="px-5 py-3 text-center font-medium text-muted-foreground">Төлөв</th>
                                    <th className="px-5 py-3 text-right font-medium text-muted-foreground"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {recent_treatments.map((t) => (
                                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-5 py-3 font-medium">{t.title}</td>
                                        <td className="px-5 py-3 text-muted-foreground">{t.category.name}</td>
                                        <td className="px-5 py-3 text-muted-foreground">
                                            {formatPrice(t.price_min, t.price_max)}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    t.is_active
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                                                }`}
                                            >
                                                {t.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <Link
                                                href={`/admin/treatments/${t.id}/edit`}
                                                className="text-red-600 hover:underline"
                                            >
                                                Засах
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
