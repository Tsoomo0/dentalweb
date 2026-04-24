import ReceptionLayout from '@/layouts/reception-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import {
    Building2, CheckCircle2, Eye, EyeOff,
    KeyRound, Mail, MapPin, Shield, ShieldCheck,
    UserRound,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface UserData {
    id: number;
    name: string;
    email: string;
    role: string | null;
    branch_name: string | null;
    created_at: string;
}
interface Props { user: UserData }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар', href: '/reception/dashboard' },
    { title: 'Миний профайл',   href: '/reception/profile' },
];

const ROLE: Record<string, { label: string; color: string }> = {
    admin:        { label: 'Систем Администратор', color: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400' },
    receptionist: { label: 'Ресепшн Ажилтан',     color: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400' },
};

const GRADIENTS = [
    'from-red-500 via-red-600 to-rose-700',
    'from-blue-500 via-blue-600 to-indigo-700',
    'from-emerald-500 via-emerald-600 to-teal-700',
    'from-amber-500 via-amber-600 to-orange-700',
    'from-violet-500 via-violet-600 to-purple-700',
];
function grad(name: string) {
    return GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];
}

export default function ReceptionProfile({ user }: Props) {
    const [showNew,     setShowNew]     = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, post, processing, errors, recentlySuccessful, reset } = useForm({
        name:                  user.name,
        password:              '',
        password_confirmation: '',
    });

    const roleInfo = ROLE[user.role ?? ''] ?? null;

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/reception/profile', {
            onSuccess: () => reset('password', 'password_confirmation'),
        });
    }

    function initials(name: string) {
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }

    const infoItems = [
        user.email       && { icon: Mail,      label: 'И-мэйл',  value: user.email },
        user.branch_name && { icon: Building2, label: 'Салбар',  value: user.branch_name },
        user.created_at  && { icon: MapPin,    label: 'Бүртгэгдсэн', value: user.created_at },
    ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Миний профайл" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* ── Page header ── */}
                <div>
                    <h1 className="text-2xl font-bold">Миний профайл</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Таны бүртгэлийн мэдээлэл болон тохиргоо</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">

                    {/* ── LEFT: Profile card ── */}
                    <div className="lg:col-span-1 space-y-4">

                        {/* Photo + name card */}
                        <div className="rounded-2xl border bg-card shadow-sm">
                            {/* Gradient banner */}
                            <div className={`h-24 bg-gradient-to-br ${grad(user.name)} relative rounded-t-2xl overflow-hidden`}>
                                <div className="pointer-events-none absolute inset-0 opacity-20"
                                    style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                            </div>

                            {/* Avatar — overlaps banner */}
                            <div className="px-6 pb-5">
                                <div className="relative -mt-10 mb-4 w-fit">
                                    <div className={`flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br ${grad(user.name)} text-2xl font-bold text-white ring-4 ring-card shadow-lg`}>
                                        {initials(user.name)}
                                    </div>
                                </div>

                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h2 className="text-lg font-bold leading-tight">{user.name}</h2>
                                        <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
                                    </div>
                                    {roleInfo && (
                                        <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${roleInfo.color}`}>
                                            <span className="size-1.5 rounded-full bg-current opacity-70" />
                                            {roleInfo.label}
                                        </span>
                                    )}
                                </div>

                                {user.branch_name && (
                                    <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <MapPin className="size-3.5 shrink-0" />
                                        {user.branch_name}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info list */}
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

                    {/* ── RIGHT: Edit form ── */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Success banner */}
                        {recentlySuccessful && (
                            <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 px-4 py-3">
                                <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0" />
                                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                    Амжилттай хадгалагдлаа.
                                </p>
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-5">

                            {/* Name */}
                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                <div className="border-b bg-muted/30 px-5 py-3 flex items-center gap-2">
                                    <UserRound className="size-4 text-muted-foreground" />
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Хувийн мэдээлэл</p>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Бүтэн нэр
                                        </label>
                                        <div className="relative">
                                            <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                            <input type="text"
                                                value={data.name}
                                                onChange={e => setData('name', e.target.value)}
                                                className="w-full rounded-xl border bg-background pl-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                        </div>
                                        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            И-мэйл хаяг
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                            <input type="email" value={user.email} disabled
                                                className="w-full rounded-xl border bg-muted pl-10 py-2.5 text-sm text-muted-foreground cursor-not-allowed" />
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">И-мэйл хаягийг зөвхөн Систем Администратор өөрчилж болно</p>
                                    </div>
                                </div>
                            </div>

                            {/* Password */}
                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                <div className="border-b bg-muted/30 px-5 py-3 flex items-center gap-2">
                                    <Shield className="size-4 text-muted-foreground" />
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Нууц үг солих</p>
                                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">хоосон орхивол өөрчлөгдөхгүй</span>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Шинэ нууц үг
                                        </label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                            <input type={showNew ? 'text' : 'password'}
                                                value={data.password}
                                                onChange={e => setData('password', e.target.value)}
                                                placeholder="Хамгийн багадаа 8 тэмдэгт"
                                                className="w-full rounded-xl border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                            <button type="button" onClick={() => setShowNew(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </div>
                                        {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Нууц үг давтах
                                        </label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                            <input type={showConfirm ? 'text' : 'password'}
                                                value={data.password_confirmation}
                                                onChange={e => setData('password_confirmation', e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full rounded-xl border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                            <button type="button" onClick={() => setShowConfirm(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="flex items-center gap-3">
                                <button type="submit" disabled={processing}
                                    className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
                                    {processing ? (
                                        <>
                                            <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                            Хадгалж байна...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="size-4" />
                                            Хадгалах
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </ReceptionLayout>
    );
}
