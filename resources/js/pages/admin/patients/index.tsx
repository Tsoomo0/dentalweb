import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Search, UserRound } from 'lucide-react';
import { useState } from 'react';

interface Patient {
    id: number;
    patient_number: string;
    last_name: string;
    first_name: string;
    phone: string;
    phone2: string | null;
    gender: 'male' | 'female' | 'other' | null;
    date_of_birth: string | null;
    branch: { name: string } | null;
    appointments_count: number;
    treatment_records_count: number;
    created_at: string;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    patients: Paginated<Patient>;
    search: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Өвчтнүүд', href: '/admin/patients' },
];

const GENDER: Record<string, string> = { male: 'Эрэгтэй', female: 'Эмэгтэй', other: 'Бусад' };

export default function AdminPatientsIndex({ patients, search: initSearch }: Props) {
    const [search, setSearch] = useState(initSearch ?? '');

    function doSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/admin/patients', { search }, { preserveState: false });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Өвчтнүүд" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Өвчтнүүд</h1>
                        <p className="text-sm text-muted-foreground">Нийт {patients.total} өвчтөн</p>
                    </div>
                </div>

                {/* Search */}
                <form onSubmit={doSearch} className="flex gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Нэр, утас, бүртгэлийн дугаараар хайх..."
                            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <button
                        type="submit"
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                        Хайх
                    </button>
                    {initSearch && (
                        <button
                            type="button"
                            onClick={() => { setSearch(''); router.get('/admin/patients'); }}
                            className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                        >
                            Цэвэрлэх
                        </button>
                    )}
                </form>

                {/* Table */}
                <div className="flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 text-left">Өвчтөн</th>
                                <th className="px-4 py-3 text-left">Утас</th>
                                <th className="px-4 py-3 text-left">Хүйс</th>
                                <th className="px-4 py-3 text-left">Салбар</th>
                                <th className="px-4 py-3 text-center">Захиалга</th>
                                <th className="px-4 py-3 text-center">Эмчилгээ</th>
                                <th className="px-4 py-3 text-right">Үйлдэл</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {patients.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <UserRound className="mx-auto mb-2 size-10 text-muted-foreground/30" />
                                        <p className="text-sm text-muted-foreground">Өвчтөн олдсонгүй</p>
                                    </td>
                                </tr>
                            ) : patients.data.map(p => (
                                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                {(p.last_name?.[0] ?? '') + (p.first_name?.[0] ?? '')}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-foreground">
                                                    {p.last_name} {p.first_name}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono">{p.patient_number}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{p.gender ? GENDER[p.gender] : '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{p.branch?.name ?? '—'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                                            {p.appointments_count}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                            {p.treatment_records_count}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Link
                                            href={`/admin/patients/${p.id}`}
                                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                                        >
                                            Харах
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {patients.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <p className="text-muted-foreground">
                            {patients.from}–{patients.to} / {patients.total}
                        </p>
                        <div className="flex items-center gap-1">
                            {patients.links.map((link, i) => (
                                link.url ? (
                                    <button
                                        key={i}
                                        onClick={() => router.get(link.url!)}
                                        className={`flex size-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                                            link.active
                                                ? 'bg-primary text-primary-foreground'
                                                : 'border hover:bg-muted text-muted-foreground'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span key={i} className="flex size-8 items-center justify-center rounded-lg text-xs text-muted-foreground/40">
                                        {link.label.includes('&laquo;') ? <ChevronLeft className="size-3.5" /> : link.label.includes('&raquo;') ? <ChevronRight className="size-3.5" /> : link.label}
                                    </span>
                                )
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
