import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Building2, Edit2, Plus, ShieldCheck, Trash2,
    UserCheck, UserMinus, UserRound, Users, X,
} from 'lucide-react';
import { useState } from 'react';

/* ─── Types ─── */
interface Branch { id: number; name: string }
interface UserRow {
    id: number; name: string; email: string;
    role: string | null; branch_id: number | null;
    branch_name: string | null; is_active: boolean; created_at: string;
}
interface Stats { total: number; admin: number; receptionist: number; active: number }
interface Props  { users: UserRow[]; branches: Branch[]; stats: Stats }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Хэрэглэгчид', href: '/admin/users' },
];

/* Role visual config */
const ROLE: Record<string, { label: string; chip: string; dot: string }> = {
    admin: {
        label: 'Систем Админ',
        chip:  'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-800',
        dot:   'bg-red-500',
    },
    receptionist: {
        label: 'Ресепшн',
        chip:  'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-800',
        dot:   'bg-blue-500',
    },
};

/* Avatar color based on name */
const AVATAR_COLORS = [
    'from-red-400 to-rose-500',
    'from-blue-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-violet-400 to-purple-500',
];
function avatarColor(name: string) {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

/* ─── Delete Modal ─── */
function DeleteModal({ user, onConfirm, onClose }: { user: UserRow; onConfirm: () => void; onClose: () => void }) {
    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl ring-1 ring-border overflow-hidden">
                    <div className="bg-red-50 dark:bg-red-950/20 px-6 py-5">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                                    <Trash2 className="size-5 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-red-900 dark:text-red-200">Хэрэглэгч устгах</h3>
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Энэ үйлдлийг буцаах боломжгүй</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="rounded-lg p-1 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">
                                <X className="size-4" />
                            </button>
                        </div>
                    </div>
                    <div className="px-6 py-5">
                        <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{user.name}</span> хэрэглэгчийг системээс бүрмөсөн устгах уу?
                        </p>
                        <div className="mt-5 flex gap-3">
                            <button onClick={onConfirm}
                                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
                                Тийм, устгах
                            </button>
                            <button onClick={onClose}
                                className="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                                Болих
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ─── Main ─── */
export default function UsersIndex({ users, stats }: Props) {
    const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
    const { auth } = usePage<{ auth: { user: { id: number } } }>().props;

    function confirmDelete() {
        if (!deleteTarget) return;
        router.delete(`/admin/users/${deleteTarget.id}`, {
            onFinish: () => setDeleteTarget(null),
        });
    }

    function toggle(user: UserRow) {
        router.patch(`/admin/users/${user.id}/toggle`, {}, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Хэрэглэгчид" />
            <div className="flex flex-1 flex-col gap-6 p-6">

                {/* ── Header ── */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Системийн удирдлага</p>
                        <h1 className="text-2xl font-bold tracking-tight">Хэрэглэгчид</h1>
                    </div>
                    <Link href="/admin/users/create"
                        className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors">
                        <Plus className="size-4" />
                        Шинэ хэрэглэгч
                    </Link>
                </div>

                {/* ── Stats ── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { label: 'Нийт хэрэглэгч', value: stats.total,        icon: Users,      from: 'from-zinc-500',   to: 'to-zinc-600' },
                        { label: 'Систем админ',    value: stats.admin,        icon: ShieldCheck,from: 'from-red-500',    to: 'to-rose-600' },
                        { label: 'Ресепшн ажилтан', value: stats.receptionist, icon: UserRound,  from: 'from-blue-500',   to: 'to-indigo-600' },
                        { label: 'Идэвхтэй',        value: stats.active,       icon: UserCheck,  from: 'from-emerald-500',to: 'to-teal-600' },
                    ].map((s) => (
                        <div key={s.label} className="rounded-2xl border bg-card p-5 flex items-center gap-4 shadow-sm">
                            <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.from} ${s.to} text-white shadow-sm`}>
                                <s.icon className="size-5" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold tabular-nums">{s.value}</p>
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── User Cards ── */}
                {users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center">
                        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                            <Users className="size-8 text-muted-foreground/50" />
                        </div>
                        <p className="font-semibold">Хэрэглэгч байхгүй байна</p>
                        <p className="mt-1 text-sm text-muted-foreground">Шинэ хэрэглэгч нэмж эхлээрэй</p>
                        <Link href="/admin/users/create"
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                            <Plus className="size-4" /> Нэмэх
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {users.map((u) => {
                            const roleInfo = ROLE[u.role ?? ''];
                            const isMe = u.id === auth.user.id;
                            return (
                                <div key={u.id}
                                    className={`group relative rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md ${!u.is_active ? 'opacity-60' : ''}`}>

                                    {/* Active indicator */}
                                    <span className={`absolute right-4 top-4 size-2 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-zinc-300 dark:bg-zinc-600'}`} />

                                    <div className="p-5">
                                        {/* Avatar + name */}
                                        <div className="flex items-center gap-4">
                                            <div className={`flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarColor(u.name)} text-xl font-bold text-white shadow-sm`}>
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold truncate">{u.name}</p>
                                                    {isMe && (
                                                        <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                            Та
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                            </div>
                                        </div>

                                        {/* Role + Branch */}
                                        <div className="mt-4 space-y-2">
                                            {roleInfo && (
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${roleInfo.chip}`}>
                                                        <span className={`size-1.5 rounded-full ${roleInfo.dot}`} />
                                                        {roleInfo.label}
                                                    </span>
                                                </div>
                                            )}
                                            {u.branch_name && (
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Building2 className="size-3.5 shrink-0" />
                                                    <span className="truncate">{u.branch_name}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="mt-4 flex items-center justify-between border-t pt-4">
                                            <p className="text-xs text-muted-foreground">Бүртгэсэн: {u.created_at}</p>
                                            <div className="flex items-center gap-1">
                                                {/* Active toggle */}
                                                {!isMe && (
                                                    <button onClick={() => toggle(u)} title={u.is_active ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
                                                        className={`rounded-lg p-1.5 transition-colors ${u.is_active
                                                            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                                            : 'text-muted-foreground hover:bg-muted'}`}>
                                                        {u.is_active ? <UserCheck className="size-4" /> : <UserMinus className="size-4" />}
                                                    </button>
                                                )}
                                                <Link href={`/admin/users/${u.id}/edit`}
                                                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                                    <Edit2 className="size-4" />
                                                </Link>
                                                {!isMe && (
                                                    <button onClick={() => setDeleteTarget(u)}
                                                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors">
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {deleteTarget && (
                <DeleteModal user={deleteTarget} onConfirm={confirmDelete} onClose={() => setDeleteTarget(null)} />
            )}
        </AppLayout>
    );
}
