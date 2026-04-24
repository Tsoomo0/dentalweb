import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Award, Briefcase, Building2, CalendarDays, CheckCircle2, Edit, Mail, Phone, Plus, Trash2, UserRound, Users, X } from 'lucide-react';
import { useState } from 'react';

interface Branch { id: number; name: string }

interface Experience {
    year: string;
    title: string;
    institution: string;
}

interface Doctor {
    id: number;
    branch_id: number;
    name: string;
    specialization: string | null;
    degree: string | null;
    experience_years: number;
    experiences: Experience[] | null;
    photo_url: string | null;
    description: string | null;
    phone: string | null;
    email: string | null;
    is_active: boolean;
    branch: Branch;
    online_slots?: Array<{ is_booked: boolean }>;
}

interface Props {
    doctors: Doctor[];
    branches: Branch[];
    stats: { total: number; active: number };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Эмч нарын бүртгэл', href: '/admin/doctors' },
];

/* ─── Modal ─── */
function DoctorModal({ doctor, onClose }: { doctor: Doctor; onClose: () => void }) {
    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl">

                    {/* Photo — голлуулсан, дугуй */}
                    <div className="relative bg-gradient-to-b from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 pt-8 pb-4 flex flex-col items-center">
                        <button onClick={onClose} className="absolute right-3 top-3 rounded-lg bg-black/10 p-1.5 hover:bg-black/20 dark:bg-white/10">
                            <X className="size-4" />
                        </button>

                        <div className="size-32 overflow-hidden rounded-full border-4 border-white shadow-lg dark:border-zinc-700">
                            {doctor.photo_url ? (
                                <img src={doctor.photo_url} alt={doctor.name} className="h-full w-full object-cover object-top" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900">
                                    <UserRound className="size-14 text-blue-400" />
                                </div>
                            )}
                        </div>

                        <div className="mt-3 text-center px-6">
                            <h2 className="text-xl font-bold">{doctor.name}</h2>
                            {doctor.specialization && (
                                <p className="mt-0.5 text-sm font-medium text-red-600">{doctor.specialization}</p>
                            )}
                            {doctor.degree && (
                                <p className="mt-0.5 text-xs text-muted-foreground">{doctor.degree}</p>
                            )}
                            <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
                                <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                                    {doctor.branch.name}
                                </span>
                                {doctor.experience_years > 0 && (
                                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                        {doctor.experience_years} жилийн туршлага
                                    </span>
                                )}
                                <span className={`rounded px-2 py-0.5 text-xs font-medium ${doctor.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                    {doctor.is_active ? '● Идэвхтэй' : '● Идэвхгүй'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="max-h-72 overflow-y-auto px-5 py-4 space-y-4">

                        {/* Description */}
                        {doctor.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">{doctor.description}</p>
                        )}

                        {/* Contact */}
                        {(doctor.phone || doctor.email) && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Холбоо барих</p>
                                {doctor.phone && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="size-4 text-muted-foreground shrink-0" />
                                        <span>{doctor.phone}</span>
                                    </div>
                                )}
                                {doctor.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="size-4 text-muted-foreground shrink-0" />
                                        <span className="truncate">{doctor.email}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Experiences */}
                        {doctor.experiences && doctor.experiences.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                    <Briefcase className="size-4 text-muted-foreground" />
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ажлын туршлага</p>
                                </div>
                                <div className="space-y-2">
                                    {doctor.experiences.map((exp, i) => (
                                        <div key={i} className="flex gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                                            {exp.year && (
                                                <span className="shrink-0 text-xs font-medium text-muted-foreground mt-0.5 w-20">{exp.year}</span>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium leading-snug">{exp.title}</p>
                                                {exp.institution && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{exp.institution}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-2 border-t px-5 py-4">
                        <Link
                            href={`/admin/doctors/${doctor.id}/edit`}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700"
                        >
                            <Edit className="size-4" /> Засах
                        </Link>
                        <button onClick={onClose} className="flex-1 rounded-lg border py-2 text-sm text-muted-foreground hover:bg-muted">
                            Хаах
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ─── Main ─── */
export default function DoctorsIndex({ doctors, branches, stats }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const [branchFilter, setBranchFilter] = useState<number | null>(null);
    const [modalDoctor, setModalDoctor] = useState<Doctor | null>(null);

    const filtered = branchFilter ? doctors.filter((d) => d.branch_id === branchFilter) : doctors;

    function deleteDoctor(id: number, name: string) {
        if (confirm(`"${name}" эмчийг устгах уу?`)) router.delete(`/admin/doctors/${id}`);
    }

    function toggleActive(doctor: Doctor) {
        router.patch(`/admin/doctors/${doctor.id}/toggle`, {}, { preserveScroll: true });
    }

    const activePercent = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Эмч нарын бүртгэл" />

            {modalDoctor && <DoctorModal doctor={modalDoctor} onClose={() => setModalDoctor(null)} />}

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-muted-foreground text-sm">Манай нарийн мэргэжлийн шудний тусламж</p>
                        <h1 className="text-2xl font-bold">Эмч нарын бүртгэл</h1>
                    </div>
                    <Link href="/admin/doctors/create" className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                        <Plus className="size-4" /> Шинэ эмч нэмэх
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground text-sm">Нийт эмч</p>
                            <Users className="text-muted-foreground size-4" />
                        </div>
                        <p className="mt-2 text-3xl font-bold">{stats.total}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">{branches.length} салбарт</p>
                    </div>
                    <div className="rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground text-sm">Идэвхтэй эмч нар</p>
                            <UserRound className="text-muted-foreground size-4" />
                        </div>
                        <p className="mt-2 text-3xl font-bold">{activePercent}%</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">{stats.active} идэвхтэй</p>
                    </div>
                    <div className="rounded-xl border bg-red-600 p-4 text-white">
                        <p className="text-sm text-red-200">Өдөр ажиллаж буй</p>
                        <p className="mt-2 text-4xl font-bold">{stats.active}</p>
                        <p className="mt-0.5 text-sm text-red-200">Эмч</p>
                        <p className="mt-1 text-xs text-red-300">Энэ сарын ажиллаж буй эмч нар</p>
                    </div>
                </div>

                {/* Branch filter */}
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setBranchFilter(null)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${branchFilter === null ? 'bg-red-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                        Бүх салбар ({doctors.length})
                    </button>
                    {branches.map((b) => (
                        <button key={b.id} onClick={() => setBranchFilter(b.id)}
                            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${branchFilter === b.id ? 'bg-red-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                            <Building2 className="size-3" />
                            {b.name} ({doctors.filter((d) => d.branch_id === b.id).length})
                        </button>
                    ))}
                </div>

                {/* Doctor cards */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20">
                        <UserRound className="text-muted-foreground size-10 mb-3" />
                        <p className="text-muted-foreground text-sm">Эмч байхгүй байна</p>
                        <Link href="/admin/doctors/create" className="mt-3 text-sm text-red-600 hover:underline">+ Шинэ эмч нэмэх</Link>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filtered.map((doctor) => (
                            <div key={doctor.id}
                                className={`overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md ${!doctor.is_active ? 'opacity-60' : ''}`}>

                                {/* Photo */}
                                <div className="relative overflow-hidden bg-gradient-to-b from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 pt-6 pb-3 flex flex-col items-center">
                                    {/* Toggle */}
                                    <button onClick={() => toggleActive(doctor)} className="absolute right-2 top-2"
                                        title={doctor.is_active ? 'Идэвхгүй болгох' : 'Идэвхтэй болгох'}>
                                        <div className={`relative h-5 w-9 rounded-full transition-colors ${doctor.is_active ? 'bg-green-500' : 'bg-zinc-400'}`}>
                                            <div className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${doctor.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                        </div>
                                    </button>

                                    {/* Дугуй зураг */}
                                    <button onClick={() => setModalDoctor(doctor)}
                                        className="size-24 overflow-hidden rounded-full border-4 border-white shadow-md dark:border-zinc-700 hover:ring-2 hover:ring-red-500 transition-all">
                                        {doctor.photo_url ? (
                                            <img src={doctor.photo_url} alt={doctor.name} className="h-full w-full object-cover object-top" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900">
                                                <UserRound className="size-10 text-blue-400" />
                                            </div>
                                        )}
                                    </button>

                                    <span className="mt-2 rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                                        {doctor.branch.name}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="p-4 text-center">
                                    <h3 className="font-bold leading-tight">{doctor.name}</h3>
                                    {doctor.specialization && (
                                        <p className="mt-0.5 text-sm font-medium text-red-600">{doctor.specialization}</p>
                                    )}
                                    {doctor.degree && (
                                        <p className="mt-0.5 text-xs text-muted-foreground">{doctor.degree}</p>
                                    )}
                                    <div className="mt-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
                                        {doctor.experience_years > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Award className="size-3" />{doctor.experience_years}ж
                                            </span>
                                        )}
                                        {doctor.experiences && doctor.experiences.length > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="size-3" />{doctor.experiences.length} туршлага
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between border-t px-4 py-3">
                                    <button onClick={() => setModalDoctor(doctor)}
                                        className="text-xs text-red-600 hover:underline">
                                        Дэлгэрэнгүй харах
                                    </button>
                                    <div className="flex gap-2">
                                        <Link href={`/admin/doctors/${doctor.id}/slots`}
                                            className="flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950">
                                            <CalendarDays className="size-3" /> Цаг
                                        </Link>
                                        <Link href={`/admin/doctors/${doctor.id}/edit`}
                                            className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-muted">
                                            <Edit className="size-3" /> Засах
                                        </Link>
                                        <button onClick={() => deleteDoctor(doctor.id, doctor.name)}
                                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950">
                                            <Trash2 className="size-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add card */}
                        <Link href="/admin/doctors/create"
                            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-16 text-muted-foreground transition-colors hover:border-red-400 hover:text-red-500">
                            <Plus className="size-8" />
                            <span className="text-sm font-medium">Шинэ эмч бүртгэх</span>
                        </Link>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
