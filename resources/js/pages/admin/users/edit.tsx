import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Building2, Eye, EyeOff, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface Branch  { id: number; name: string }
interface Role    { id: number; name: string }
interface UserData {
    id: number; name: string; email: string;
    role_id: number | null; role_name: string | null;
    branch_id: number | null; is_active: boolean;
}
interface Props { user: UserData; branches: Branch[]; roles: Role[] }

const ROLE_INFO: Record<string, { label: string; desc: string; icon: React.ElementType; color: string; ring: string }> = {
    admin: {
        label: 'Систем Админ',
        desc:  'Системийн бүрэн эрхтэй удирдлага',
        icon:  ShieldCheck,
        color: 'text-red-600',
        ring:  'border-red-500 bg-red-50 dark:bg-red-950/30',
    },
    receptionist: {
        label: 'Ресепшн',
        desc:  'Цаг захиалга болон өөрийн салбарыг удирддаг',
        icon:  UserRound,
        color: 'text-blue-600',
        ring:  'border-blue-500 bg-blue-50 dark:bg-blue-950/30',
    },
};

export default function UserEdit({ user, branches, roles }: Props) {
    const [showPass, setShowPass] = useState(false);
    const [showConf, setShowConf] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Админ',       href: '/admin/dashboard' },
        { title: 'Хэрэглэгчид', href: '/admin/users' },
        { title: user.name,     href: `/admin/users/${user.id}/edit` },
    ];

    const { data, setData, put, processing, errors } = useForm({
        name:                  user.name,
        email:                 user.email,
        password:              '',
        password_confirmation: '',
        role_id:               user.role_id ?? (roles[0]?.id ?? '') as number | string,
        branch_id:             user.branch_id ?? ('' as number | string),
        is_active:             user.is_active,
    });

    const selectedRole = roles.find(r => r.id === Number(data.role_id));
    const isReception  = selectedRole?.name === 'receptionist';

    function submit(e: FormEvent) {
        e.preventDefault();
        put(`/admin/users/${user.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${user.name} — засах`} />
            <div className="flex flex-1 flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/admin/users"
                        className="flex size-9 items-center justify-center rounded-xl border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm">
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div>
                        <p className="text-sm text-muted-foreground">Хэрэглэгчид</p>
                        <h1 className="text-xl font-bold">{user.name} — мэдээлэл засах</h1>
                    </div>
                </div>

                <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">

                    {/* ── Left ── */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Role */}
                        <div className="rounded-2xl border bg-card p-5 shadow-sm">
                            <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Роль</h2>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {roles.map(r => {
                                    const info     = ROLE_INFO[r.name];
                                    const Icon     = info?.icon ?? UserRound;
                                    const selected = Number(data.role_id) === r.id;
                                    return (
                                        <button key={r.id} type="button"
                                            onClick={() => { setData('role_id', r.id); if (r.name !== 'receptionist') setData('branch_id', ''); }}
                                            className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${selected ? (info?.ring ?? 'border-zinc-400') : 'border-border hover:border-zinc-300 dark:hover:border-zinc-600'}`}>
                                            <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-white dark:bg-zinc-900 shadow-sm' : 'bg-muted'}`}>
                                                <Icon className={`size-5 ${selected ? (info?.color ?? '') : 'text-muted-foreground'}`} />
                                            </div>
                                            <div>
                                                <p className={`font-semibold text-sm ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {info?.label ?? r.name}
                                                </p>
                                                {info?.desc && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{info.desc}</p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.role_id && <p className="mt-2 text-xs text-red-500">{errors.role_id}</p>}
                        </div>

                        {/* Branch */}
                        {isReception && (
                            <div className="rounded-2xl border bg-card p-5 shadow-sm">
                                <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Салбар</h2>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {branches.map(b => (
                                        <button key={b.id} type="button"
                                            onClick={() => setData('branch_id', b.id)}
                                            className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm transition-all ${Number(data.branch_id) === b.id
                                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                                                : 'border-border hover:border-zinc-300 dark:hover:border-zinc-600'}`}>
                                            <Building2 className={`size-4 shrink-0 ${Number(data.branch_id) === b.id ? 'text-blue-500' : 'text-muted-foreground'}`} />
                                            {b.name}
                                        </button>
                                    ))}
                                </div>
                                {errors.branch_id && <p className="mt-2 text-xs text-red-500">{errors.branch_id}</p>}
                            </div>
                        )}

                        {/* Personal info */}
                        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Хувийн мэдээлэл</h2>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Бүтэн нэр *</label>
                                <input type="text" value={data.name} onChange={e => setData('name', e.target.value)}
                                    autoFocus
                                    className="border-input bg-background w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">И-мэйл хаяг *</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                    <input type="email" value={data.email} onChange={e => setData('email', e.target.value)}
                                        className="border-input bg-background w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                </div>
                                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                            </div>
                        </div>

                        {/* Password */}
                        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2">
                                <KeyRound className="size-4 text-muted-foreground" />
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Нууц үг солих</h2>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">хоосон орхивол өөрчлөгдөхгүй</span>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Шинэ нууц үг</label>
                                    <div className="relative">
                                        <input type={showPass ? 'text' : 'password'}
                                            value={data.password} onChange={e => setData('password', e.target.value)}
                                            placeholder="Доод тал нь 8 тэмдэгт"
                                            className="border-input bg-background w-full rounded-xl border px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                        <button type="button" onClick={() => setShowPass(v => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Нууц үг давтах</label>
                                    <div className="relative">
                                        <input type={showConf ? 'text' : 'password'}
                                            value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)}
                                            placeholder="Нууц үгийг давтана уу"
                                            className="border-input bg-background w-full rounded-xl border px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                        <button type="button" onClick={() => setShowConf(v => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            {showConf ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right ── */}
                    <div className="space-y-5">
                        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-5">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Тохиргоо</h2>

                            <label className="flex cursor-pointer items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium">Идэвхтэй эсэх</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Идэвхтэй байвал нэвтрэх боломжтой</p>
                                </div>
                                <div onClick={() => setData('is_active', !data.is_active)}
                                    className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${data.is_active ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
                                    <div className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${data.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </div>
                            </label>

                            <hr />

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Роль</span>
                                    <span className="font-medium">{ROLE_INFO[selectedRole?.name ?? '']?.label ?? '—'}</span>
                                </div>
                                {isReception && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Салбар</span>
                                        <span className="font-medium">{data.branch_id ? (branches.find(b => b.id === Number(data.branch_id))?.name ?? '—') : '—'}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Статус</span>
                                    <span className={`font-medium ${data.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                        {data.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                                    </span>
                                </div>
                            </div>

                            <button type="submit" disabled={processing}
                                className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
                                {processing ? 'Хадгалж байна...' : 'Хадгалах'}
                            </button>
                            <Link href="/admin/users"
                                className="block w-full rounded-xl border py-2.5 text-center text-sm font-medium hover:bg-muted transition-colors">
                                Болих
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
