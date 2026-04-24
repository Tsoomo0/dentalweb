import DoctorLayout from '@/layouts/doctor-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import {
    Award, Briefcase, Building2, CalendarDays, CheckCircle2,
    Eye, EyeOff, KeyRound, Mail, MapPin, Phone, Shield,
    Stethoscope, UserRound,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

interface Experience {
    year: string;
    title: string;
    institution: string;
}

interface Doctor {
    id: number;
    name: string;
    email: string;
    specialization: string | null;
    degree: string | null;
    experience_years: number;
    experiences: Experience[] | null;
    description: string | null;
    phone: string | null;
    is_active: boolean;
    photo_url: string | null;
    branch_name: string | null;
}

interface Props {
    doctor: Doctor;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар', href: '/doctor/dashboard' },
    { title: 'Миний профайл', href: '/doctor/profile' },
];

export default function DoctorProfile({ doctor }: Props) {
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew,     setShowNew]     = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, put, processing, errors, reset, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    function submitPassword(e: FormEvent) {
        e.preventDefault();
        put('/doctor/profile/password', {
            onSuccess: () => reset(),
        });
    }

    function initials(name: string) {
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }

    const infoItems = [
        doctor.specialization && { icon: Stethoscope, label: 'Мэргэжил',       value: doctor.specialization },
        doctor.degree         && { icon: Award,       label: 'Зэрэг',          value: doctor.degree },
        doctor.experience_years && { icon: Briefcase, label: 'Туршлага',       value: `${doctor.experience_years} жил` },
        doctor.branch_name    && { icon: Building2,   label: 'Салбар',         value: doctor.branch_name },
        doctor.phone          && { icon: Phone,       label: 'Утас',           value: doctor.phone },
        doctor.email          && { icon: Mail,        label: 'И-мэйл',         value: doctor.email },
    ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

    return (
        <DoctorLayout breadcrumbs={breadcrumbs}>
            <Head title="Миний профайл" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* ── Page header ── */}
                <div>
                    <h1 className="text-2xl font-bold">Миний профайл</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Таны мэргэжлийн мэдээлэл болон тохиргоо</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">

                    {/* ── LEFT: Profile card ── */}
                    <div className="lg:col-span-1 space-y-4">

                        {/* Photo + name card */}
                        <div className="rounded-2xl border bg-card shadow-sm">
                            {/* Gradient banner */}
                            <div className="h-24 bg-gradient-to-br from-red-500 via-red-600 to-rose-700 relative rounded-t-2xl overflow-hidden">
                                <div className="pointer-events-none absolute inset-0 opacity-20"
                                    style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                            </div>

                            {/* Avatar — overlaps banner */}
                            <div className="px-6 pb-5">
                                <div className="relative -mt-10 mb-4 w-fit">
                                    {doctor.photo_url ? (
                                        <img src={doctor.photo_url} alt={doctor.name}
                                            className="size-20 rounded-2xl object-cover object-top ring-4 ring-card shadow-lg" />
                                    ) : (
                                        <div className="flex size-20 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/50 ring-4 ring-card shadow-lg">
                                            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                {initials(doctor.name)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h2 className="text-lg font-bold leading-tight">{doctor.name}</h2>
                                        {doctor.specialization && (
                                            <p className="text-sm text-muted-foreground mt-0.5">{doctor.specialization}</p>
                                        )}
                                    </div>
                                    {doctor.is_active ? (
                                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-100 dark:bg-green-950/40 px-2.5 py-1 text-[11px] font-semibold text-green-700 dark:text-green-400">
                                            <span className="size-1.5 rounded-full bg-green-500" />
                                            Идэвхтэй
                                        </span>
                                    ) : (
                                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                                            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                                            Идэвхгүй
                                        </span>
                                    )}
                                </div>

                                {doctor.branch_name && (
                                    <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <MapPin className="size-3.5 shrink-0" />
                                        {doctor.branch_name}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contact & info list */}
                        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                            <div className="border-b bg-muted/30 px-5 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Мэдээлэл</p>
                            </div>
                            <div className="divide-y">
                                {infoItems.map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="flex items-center gap-3 px-5 py-3">
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                            <Icon className="size-3.5 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                                            <p className="truncate text-sm font-medium">{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Details + password ── */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Description */}
                        {doctor.description && (
                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                <div className="border-b bg-muted/30 px-5 py-3 flex items-center gap-2">
                                    <UserRound className="size-4 text-muted-foreground" />
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Товч танилцуулга</p>
                                </div>
                                <div className="px-5 py-4">
                                    <p className="text-sm leading-relaxed text-foreground/80">{doctor.description}</p>
                                </div>
                            </div>
                        )}

                        {/* Experiences */}
                        {doctor.experiences && doctor.experiences.length > 0 && (
                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                <div className="border-b bg-muted/30 px-5 py-3 flex items-center gap-2">
                                    <CalendarDays className="size-4 text-muted-foreground" />
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Туршлага & боловсрол</p>
                                </div>
                                <div className="divide-y">
                                    {doctor.experiences.map((exp, i) => (
                                        <div key={i} className="flex items-start gap-4 px-5 py-4">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30 text-[11px] font-bold text-red-600 dark:text-red-400">
                                                {exp.year}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-sm leading-tight">{exp.title}</p>
                                                {exp.institution && (
                                                    <p className="text-sm text-muted-foreground mt-0.5">{exp.institution}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Password change */}
                        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                            <div className="border-b bg-muted/30 px-5 py-3 flex items-center gap-2">
                                <Shield className="size-4 text-muted-foreground" />
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Нууц үг солих</p>
                            </div>

                            <form onSubmit={submitPassword} className="p-5 space-y-4">

                                {/* Success banner */}
                                {recentlySuccessful && (
                                    <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 px-4 py-3">
                                        <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0" />
                                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                            Нууц үг амжилттай өөрчлөгдлөө.
                                        </p>
                                    </div>
                                )}

                                <div className="grid gap-4 sm:grid-cols-1">
                                    {/* Current password */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Одоогийн нууц үг
                                        </label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                            <input
                                                type={showCurrent ? 'text' : 'password'}
                                                value={data.current_password}
                                                onChange={e => setData('current_password', e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full rounded-xl border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                            <button type="button" onClick={() => setShowCurrent(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                                {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </div>
                                        {errors.current_password && (
                                            <p className="text-xs text-red-500">{errors.current_password}</p>
                                        )}
                                    </div>

                                    {/* New password */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Шинэ нууц үг
                                        </label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                            <input
                                                type={showNew ? 'text' : 'password'}
                                                value={data.password}
                                                onChange={e => setData('password', e.target.value)}
                                                placeholder="Хамгийн багадаа 8 тэмдэгт"
                                                className="w-full rounded-xl border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                            <button type="button" onClick={() => setShowNew(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </div>
                                        {errors.password && (
                                            <p className="text-xs text-red-500">{errors.password}</p>
                                        )}
                                    </div>

                                    {/* Confirm password */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Нууц үг давтах
                                        </label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                            <input
                                                type={showConfirm ? 'text' : 'password'}
                                                value={data.password_confirmation}
                                                onChange={e => setData('password_confirmation', e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full rounded-xl border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                            <button type="button" onClick={() => setShowConfirm(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </div>
                                        {errors.password_confirmation && (
                                            <p className="text-xs text-red-500">{errors.password_confirmation}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-1">
                                    <button type="submit" disabled={processing}
                                        className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
                                        {processing ? (
                                            <>
                                                <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                                Хадгалж байна...
                                            </>
                                        ) : (
                                            <>
                                                <Shield className="size-4" />
                                                Нууц үг солих
                                            </>
                                        )}
                                    </button>
                                    <p className="text-xs text-muted-foreground">Хамгийн багадаа 8 тэмдэгт байх ёстой</p>
                                </div>
                            </form>
                        </div>

                        {/* Admin info note */}
                        <div className="flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 px-4 py-3.5">
                            <Shield className="size-4 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                                Таны мэргэжлийн мэдээлэл (зураг, мэргэжил, туршлага гэх мэт)-ийг зөвхөн систем хариуцсан <strong>администратор</strong> өөрчлөх боломжтой. Өөрчлөлт хийлгэхийг хүсвэл администратортай холбогдоно уу.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </DoctorLayout>
    );
}
