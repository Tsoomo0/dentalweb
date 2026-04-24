import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Building2, CheckCircle2, Clock, Edit, MapPin, Phone, Plus, Star, Trash2, Users } from 'lucide-react';

interface Branch {
    id: number;
    name: string;
    type: 'тов' | 'төрөлжсөн' | 'клиник' | '24/7';
    address: string | null;
    phone: string | null;
    image_url: string | null;
    description: string | null;
    doctor_count: number;
    is_featured: boolean;
    is_active: boolean;
}

interface Props {
    branches: Branch[];
    total_doctors: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Салбарууд', href: '/admin/branches' },
];

const typeBadge: Record<string, string> = {
    'тов':       'bg-red-600',
    'төрөлжсөн': 'bg-blue-600',
    'клиник':    'bg-green-700',
    '24/7':      'bg-orange-600',
};

export default function BranchesIndex({ branches, total_doctors }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();

    function deleteBranch(id: number, name: string) {
        if (confirm(`"${name}" салбарыг устгах уу?`)) {
            router.delete(`/admin/branches/${id}`);
        }
    }

    const featured = branches.find((b) => b.is_featured && b.is_active);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Салбарууд" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-muted-foreground text-sm">Байгууллагын удирдлага</p>
                        <h1 className="text-2xl font-bold">Эмнэлгийн салбарууд</h1>
                    </div>
                    <Link
                        href="/admin/branches/create"
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                        <Plus className="size-4" />
                        Шинэ салбар нэмэх
                    </Link>
                </div>

                {/* Stats + Featured */}
                <div className="grid gap-4 lg:grid-cols-3">
                    {/* Stats */}
                    <div className="flex gap-4 lg:col-span-1">
                        <div className="flex-1 rounded-xl border p-4">
                            <p className="text-muted-foreground text-xs font-medium">Нийт салбар</p>
                            <p className="mt-1 text-3xl font-bold">{branches.length}</p>
                            <p className="text-muted-foreground mt-0.5 text-xs">{branches.filter((b) => b.is_active).length} идэвхтэй</p>
                        </div>
                        <div className="flex-1 rounded-xl border p-4">
                            <p className="text-muted-foreground text-xs font-medium">Идэвхтэй эмч нар</p>
                            <p className="mt-1 text-3xl font-bold">{total_doctors}</p>
                            <p className="text-muted-foreground mt-0.5 text-xs">нийт бүртгэлтэй</p>
                        </div>
                    </div>

                    {/* Featured branch */}
                    {featured ? (
                        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-teal-50 to-cyan-50 p-4 dark:from-teal-950/30 dark:to-cyan-950/30 lg:col-span-2">
                            <div className="flex items-start gap-4">
                                {featured.image_url ? (
                                    <img src={featured.image_url} alt={featured.name} className="size-16 rounded-lg object-cover" />
                                ) : (
                                    <div className="flex size-16 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900">
                                        <Building2 className="size-8 text-teal-600" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Star className="size-4 fill-yellow-400 text-yellow-400" />
                                        <p className="text-xs font-medium text-teal-700 dark:text-teal-400">Удаагийн нэгдэл</p>
                                    </div>
                                    <h3 className="mt-0.5 font-bold">{featured.name}</h3>
                                    {featured.address && (
                                        <p className="text-muted-foreground mt-0.5 text-sm">{featured.address}</p>
                                    )}
                                    <p className="text-muted-foreground mt-1 text-xs">{new Date().getFullYear()} оны {new Date().getMonth()+1}-р сард нэмэгдсэн</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center rounded-xl border border-dashed lg:col-span-2">
                            <p className="text-muted-foreground text-sm">Онцлох салбар тохируулаагүй байна</p>
                        </div>
                    )}
                </div>

                {/* Branch cards */}
                {branches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20">
                        <Building2 className="text-muted-foreground size-10 mb-3" />
                        <p className="text-muted-foreground text-sm">Салбар байхгүй байна</p>
                        <Link href="/admin/branches/create" className="mt-3 text-sm text-red-600 hover:underline">
                            + Шинэ салбар нэмэх
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {branches.map((branch) => (
                            <div
                                key={branch.id}
                                className={`group relative overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md ${
                                    !branch.is_active ? 'opacity-60' : ''
                                }`}
                            >
                                {/* Image */}
                                {branch.image_url ? (
                                    <div className="relative h-36 overflow-hidden bg-muted">
                                        <img src={branch.image_url} alt={branch.name} className="h-full w-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                                            <h3 className="font-bold text-white leading-tight">{branch.name}</h3>
                                            <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold uppercase text-white ${typeBadge[branch.type] ?? 'bg-zinc-600'}`}>
                                                {branch.type}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex h-20 items-center justify-between bg-muted px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-10 items-center justify-center rounded-lg bg-background">
                                                <Building2 className="text-muted-foreground size-5" />
                                            </div>
                                            <h3 className="font-bold">{branch.name}</h3>
                                        </div>
                                        <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase text-white ${typeBadge[branch.type] ?? 'bg-zinc-600'}`}>
                                            {branch.type}
                                        </span>
                                    </div>
                                )}

                                <div className="p-4 space-y-2">
                                    {branch.address && (
                                        <div className="flex items-start gap-2 text-sm">
                                            <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                                            <span className="text-muted-foreground line-clamp-2">{branch.address}</span>
                                        </div>
                                    )}
                                    {branch.phone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="text-muted-foreground size-4 shrink-0" />
                                            <span className="text-muted-foreground">{branch.phone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users className="text-muted-foreground size-4 shrink-0" />
                                        <span className="text-muted-foreground">{branch.doctor_count} эмчийн ажилтан</span>
                                    </div>

                                    {branch.is_featured && (
                                        <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                                            <Star className="size-3 fill-current" />
                                            <span>Онцлох салбар</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between border-t px-4 py-3">
                                    <span className={`text-xs font-medium ${branch.is_active ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                        {branch.is_active ? '● Идэвхтэй' : '● Идэвхгүй'}
                                    </span>
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/admin/branches/${branch.id}/edit`}
                                            className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                                        >
                                            <Edit className="size-3" /> Засах
                                        </Link>
                                        <button
                                            onClick={() => deleteBranch(branch.id, branch.name)}
                                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                                        >
                                            <Trash2 className="size-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add new card */}
                        <Link
                            href="/admin/branches/create"
                            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 text-muted-foreground transition-colors hover:border-red-400 hover:text-red-500"
                        >
                            <Plus className="size-8" />
                            <span className="text-sm font-medium">Шинэ салбар бүртгэх</span>
                        </Link>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
