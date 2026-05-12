import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Building2, Edit2, Hash, Plus, Search, ShieldCheck,
    Stethoscope, Trash2, UserCheck, UserMinus, UserRound, Users, X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

/* ─── Types ─── */
interface Branch { id: number; name: string }
interface UserRow {
    id: number; name: string; email: string;
    role: string | null; branch_id: number | null;
    branch_name: string | null; is_active: boolean; created_at: string;
    is_employee: boolean; position_name: string | null; full_name: string | null;
    is_patient: boolean; patient_number: string | null;
}
interface Stats { total: number; staff: number; patient: number; active: number }
interface Props  { users: UserRow[]; branches: Branch[]; stats: Stats }

type CategoryTab = 'staff' | 'patient';
type StaffFilter = 'all' | 'admin' | 'employee';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Хэрэглэгчид', href: '/admin/users' },
];

const ROLE_CHIP: Record<string, { label: string; bg: string; dot: string }> = {
    admin: {
        label: 'Систем Админ',
        bg:    'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800',
        dot:   'bg-red-500',
    },
    receptionist: {
        label: 'Ресепшн',
        bg:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
        dot:   'bg-blue-500',
    },
};

const AVATAR_COLORS = [
    'from-red-400 to-rose-600',
    'from-blue-400 to-indigo-600',
    'from-emerald-400 to-teal-600',
    'from-amber-400 to-orange-500',
    'from-violet-400 to-purple-600',
    'from-pink-400 to-fuchsia-500',
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
                                    <p className="text-xs text-red-600/80 dark:text-red-400 mt-0.5">Энэ үйлдлийг буцаах боломжгүй</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="rounded-lg p-1 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
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

/* ─── Staff Card ─── */
function StaffCard({ u, isMe, onToggle, onDelete }: {
    u: UserRow; isMe: boolean;
    onToggle: () => void; onDelete: () => void;
}) {
    const displayName = u.full_name || u.name;
    let chipEl: React.ReactNode = null;

    if (u.is_employee) {
        chipEl = (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700">
                <span className="size-1.5 rounded-full bg-slate-400" />
                {u.position_name ?? 'Ажилтан'}
            </span>
        );
    } else {
        const r = ROLE_CHIP[u.role ?? ''];
        if (r) {
            chipEl = (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${r.bg}`}>
                    <span className={`size-1.5 rounded-full ${r.dot}`} />
                    {r.label}
                </span>
            );
        }
    }

    return (
        <div className={`group relative rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${!u.is_active ? 'opacity-60' : ''}`}>
            <span className={`absolute right-4 top-4 size-2.5 rounded-full ring-2 ring-card ${u.is_active ? 'bg-emerald-400' : 'bg-zinc-300 dark:bg-zinc-600'}`} />

            <div className="p-5">
                <div className="flex items-center gap-3.5">
                    <div className={`flex size-13 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarColor(u.name)} text-xl font-bold text-white shadow-sm`}
                        style={{ width: 52, height: 52 }}>
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="font-semibold truncate leading-tight">{displayName}</p>
                            {isMe && (
                                <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                    Та
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                        {u.is_employee && u.name !== displayName && (
                            <p className="text-[10px] text-muted-foreground/50 truncate">@{u.name}</p>
                        )}
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    {chipEl}
                    {u.branch_name && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="size-3.5 shrink-0" />
                            <span className="truncate">{u.branch_name}</span>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t pt-3.5">
                    <p className="text-xs text-muted-foreground">{u.created_at}</p>
                    <div className="flex items-center gap-0.5">
                        {!isMe && !u.is_employee && (
                            <button onClick={onToggle} title={u.is_active ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
                                className={`rounded-lg p-1.5 transition-colors ${u.is_active
                                    ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                    : 'text-muted-foreground hover:bg-muted'}`}>
                                {u.is_active ? <UserCheck className="size-4" /> : <UserMinus className="size-4" />}
                            </button>
                        )}
                        <Link href={`/admin/users/${u.id}/edit`}
                            title={u.is_employee ? 'Нэвтрэх мэдээлэл солих' : 'Засах'}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Edit2 className="size-4" />
                        </Link>
                        {!isMe && !u.is_employee && (
                            <button onClick={onDelete}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors">
                                <Trash2 className="size-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Patient Card ─── */
function PatientCard({ u, onDelete }: { u: UserRow; onDelete: () => void }) {
    const displayName = u.full_name || u.name;

    return (
        <div className={`group relative rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${!u.is_active ? 'opacity-60' : ''}`}>
            <span className={`absolute right-4 top-4 size-2.5 rounded-full ring-2 ring-card ${u.is_active ? 'bg-emerald-400' : 'bg-zinc-300 dark:bg-zinc-600'}`} />

            <div className="p-5">
                <div className="flex items-center gap-3.5">
                    <div className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarColor(u.name)} text-xl font-bold text-white shadow-sm`}
                        style={{ width: 52, height: 52 }}>
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate leading-tight">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                    {u.patient_number && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800">
                            <Hash className="size-3" />
                            {u.patient_number}
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-teal-50 text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-800">
                        <span className="size-1.5 rounded-full bg-teal-400" />
                        Үйлчлүүлэгч
                    </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t pt-3.5">
                    <p className="text-xs text-muted-foreground">{u.created_at}</p>
                    <div className="flex items-center gap-0.5">
                        <Link href={`/admin/users/${u.id}/edit`}
                            title="Засах"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Edit2 className="size-4" />
                        </Link>
                        <button onClick={onDelete}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors">
                            <Trash2 className="size-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Main ─── */
export default function UsersIndex({ users, stats }: Props) {
    const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
    const [category, setCategory]         = useState<CategoryTab>('staff');
    const [staffFilter, setStaffFilter]   = useState<StaffFilter>('all');
    const [search, setSearch]             = useState('');
    const { auth } = usePage<{ auth: { user: { id: number } } }>().props;

    const staffUsers   = useMemo(() => users.filter(u => !u.is_patient), [users]);
    const patientUsers = useMemo(() => users.filter(u => u.is_patient), [users]);

    const adminCount    = staffUsers.filter(u => u.role === 'admin').length;
    const employeeCount = staffUsers.filter(u => u.is_employee).length;

    const filtered = useMemo(() => {
        let list = category === 'staff' ? staffUsers : patientUsers;

        if (category === 'staff' && staffFilter !== 'all') {
            if (staffFilter === 'admin')    list = list.filter(u => !u.is_employee);
            if (staffFilter === 'employee') list = list.filter(u => u.is_employee);
        }

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(u =>
                (u.full_name ?? u.name).toLowerCase().includes(q) ||
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                (u.position_name ?? '').toLowerCase().includes(q) ||
                (u.patient_number ?? '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [users, category, staffFilter, staffUsers, patientUsers, search]);

    function confirmDelete() {
        if (!deleteTarget) return;
        router.delete(`/admin/users/${deleteTarget.id}`, {
            onFinish: () => setDeleteTarget(null),
        });
    }

    function toggle(user: UserRow) {
        router.patch(`/admin/users/${user.id}/toggle`, {}, { preserveScroll: true });
    }

    function switchCategory(c: CategoryTab) {
        setCategory(c);
        setStaffFilter('all');
        setSearch('');
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
                        <Plus className="size-4" /> Шинэ Админ
                    </Link>
                </div>

                {/* ── Stats ── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { label: 'Нийт хэрэглэгч',  value: stats.total,   icon: Users,       from: 'from-zinc-500',     to: 'to-zinc-700' },
                        { label: 'Системийн ажилтан', value: stats.staff,   icon: ShieldCheck, from: 'from-red-500',      to: 'to-rose-700' },
                        { label: 'Үйлчлүүлэгч',      value: stats.patient, icon: Stethoscope, from: 'from-teal-500',     to: 'to-emerald-600' },
                        { label: 'Идэвхтэй',          value: stats.active,  icon: UserCheck,   from: 'from-emerald-500',  to: 'to-green-600' },
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

                {/* ── Category Tabs ── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Main category switch */}
                    <div className="flex rounded-2xl border bg-muted/30 p-1.5 gap-1 w-fit">
                        <button onClick={() => switchCategory('staff')}
                            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                                category === 'staff'
                                    ? 'bg-card shadow-sm text-foreground ring-1 ring-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}>
                            <UserRound className="size-4" />
                            Хэрэглэгч
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                category === 'staff'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                                    : 'bg-muted text-muted-foreground'
                            }`}>{stats.staff}</span>
                        </button>
                        <button onClick={() => switchCategory('patient')}
                            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                                category === 'patient'
                                    ? 'bg-card shadow-sm text-foreground ring-1 ring-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}>
                            <Stethoscope className="size-4" />
                            Үйлчлүүлэгч
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                category === 'patient'
                                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400'
                                    : 'bg-muted text-muted-foreground'
                            }`}>{stats.patient}</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative min-w-[200px] max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                        <input
                            type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={category === 'staff' ? 'Нэр, имэйл, албан тушаал…' : 'Нэр, имэйл, дугаар…'}
                            className="w-full rounded-xl border bg-card pl-8 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Staff sub-filter ── */}
                {category === 'staff' && (
                    <div className="flex items-center justify-between -mt-2">
                        <div className="flex rounded-xl border bg-muted/40 p-1 gap-0.5">
                            {([
                                { key: 'all' as StaffFilter,      label: 'Бүгд',       count: staffUsers.length },
                                { key: 'admin' as StaffFilter,    label: 'Систем',     count: adminCount },
                                { key: 'employee' as StaffFilter, label: 'Ажилтан',    count: employeeCount },
                            ]).map(f => (
                                <button key={f.key} onClick={() => setStaffFilter(f.key)}
                                    className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                                        staffFilter === f.key
                                            ? 'bg-card shadow-sm text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}>
                                    {f.label}
                                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                        staffFilter === f.key
                                            ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                                            : 'bg-muted text-muted-foreground'
                                    }`}>{f.count}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">{filtered.length} хэрэглэгч</p>
                    </div>
                )}

                {category === 'patient' && (
                    <div className="flex justify-end -mt-2">
                        <p className="text-xs text-muted-foreground">{filtered.length} үйлчлүүлэгч</p>
                    </div>
                )}

                {/* ── Grid ── */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-16 text-center">
                        <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-muted">
                            <Users className="size-7 text-muted-foreground/40" />
                        </div>
                        <p className="font-semibold text-sm">
                            {search
                                ? 'Хайлтад тохирох хэрэглэгч олдсонгүй'
                                : category === 'staff' ? 'Хэрэглэгч байхгүй байна' : 'Үйлчлүүлэгч байхгүй байна'}
                        </p>
                        {!search && category === 'staff' && (
                            <Link href="/admin/users/create"
                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">
                                <Plus className="size-3.5" /> Нэмэх
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {category === 'staff'
                            ? filtered.map(u => (
                                <StaffCard
                                    key={u.id} u={u}
                                    isMe={u.id === auth.user.id}
                                    onToggle={() => toggle(u)}
                                    onDelete={() => setDeleteTarget(u)}
                                />
                            ))
                            : filtered.map(u => (
                                <PatientCard
                                    key={u.id} u={u}
                                    onDelete={() => setDeleteTarget(u)}
                                />
                            ))
                        }
                    </div>
                )}
            </div>

            {deleteTarget && (
                <DeleteModal user={deleteTarget} onConfirm={confirmDelete} onClose={() => setDeleteTarget(null)} />
            )}
        </AppLayout>
    );
}
