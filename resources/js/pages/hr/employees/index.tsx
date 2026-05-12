import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Baby, Briefcase, Building2, ChevronLeft, ChevronRight, Download, Edit2, Eye,
    LayoutGrid, List, Phone, Plus, Search,
    Trash2, UserCheck, UserX, Users,
} from 'lucide-react';
import { useState } from 'react';

interface Employee {
    id: number;
    employee_number: string;
    full_name: string;
    photo_url: string | null;
    position: string | null;
    branch: string | null;
    branch_id: number | null;
    phone: string;
    gender: 'male' | 'female' | null;
    children_count: number;
    status: 'active' | 'inactive';
    hired_date: string | null;
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

interface Branch { id: number; name: string }
interface Filters { search?: string; status?: string; branch_id?: string }
interface Props { employees: Paginated<Employee>; branches: Branch[]; filters: Filters }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/employees' },
    { title: 'Ажилтнууд', href: '/hr/employees' },
];

const AVATAR_COLORS = [
    'from-red-400 to-red-600',
    'from-blue-400 to-blue-600',
    'from-emerald-400 to-emerald-600',
    'from-violet-400 to-violet-600',
    'from-amber-400 to-amber-600',
    'from-pink-400 to-pink-600',
    'from-cyan-400 to-cyan-600',
    'from-indigo-400 to-indigo-600',
];

function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
function initials(name: string)  { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

function Avatar({ employee, size = 'md' }: { employee: Employee; size?: 'sm' | 'md' }) {
    const cls = size === 'sm' ? 'size-9 rounded-xl text-sm' : 'size-20 rounded-2xl text-2xl';
    return employee.photo_url
        ? <img src={employee.photo_url} alt={employee.full_name} className={`${cls} object-cover object-top shadow-sm`} />
        : <div className={`${cls} flex items-center justify-center bg-gradient-to-br ${avatarColor(employee.id)} font-black text-white shadow-sm`}>{initials(employee.full_name)}</div>;
}

function StatusDot({ active }: { active: boolean }) {
    return <span className={`inline-flex size-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-zinc-400'}`} />;
}

function handleDelete(e: Employee) {
    if (window.confirm(`"${e.full_name}" ажилтныг устгах уу? Эмчийн бүртгэл болон нэвтрэх эрх хамт устгагдана.`)) {
        router.delete(`/hr/employees/${e.id}`);
    }
}

export default function EmployeesIndex({ employees, branches, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [view, setView]     = useState<'card' | 'table'>('card');

    function applyFilter(params: Record<string, string | undefined>) {
        router.get('/hr/employees', { ...filters, ...params }, { preserveState: true, replace: true });
    }

    function doSearch(e: React.FormEvent) {
        e.preventDefault();
        applyFilter({ search, page: undefined });
    }

    const statusFilter  = filters.status ?? 'all';
    const branchFilter  = filters.branch_id ? Number(filters.branch_id) : null;
    const list          = employees.data;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ажилтнууд" />

            <div className="flex h-full flex-1 flex-col gap-5 p-6">

                {/* ── Header ── */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">Ажилтнууд</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Нийт <span className="font-semibold text-foreground">{employees.total}</span> ажилтан бүртгэлтэй
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href="/hr/employees/export-excel"
                            className="flex items-center gap-2 rounded-xl border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
                        >
                            <Download className="size-4" /> Excel
                        </a>
                        <button
                            onClick={() => router.visit('/hr/employees/create')}
                            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700 transition-colors"
                        >
                            <Plus className="size-4" /> Ажилтан нэмэх
                        </button>
                    </div>
                </div>

                {/* ── Stat tiles ── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {([
                        { icon: Users,     label: 'Нийт',        value: employees.total,   grad: 'from-slate-500 to-slate-700',    ring: 'ring-slate-200 dark:ring-slate-700' },
                        { icon: UserCheck, label: 'Идэвхтэй',    value: '—',               grad: 'from-emerald-500 to-emerald-700', ring: 'ring-emerald-200 dark:ring-emerald-800' },
                        { icon: UserX,     label: 'Идэвхгүй',    value: '—',               grad: 'from-zinc-400 to-zinc-600',       ring: 'ring-zinc-200 dark:ring-zinc-700' },
                        { icon: Users,     label: 'Хуудас',      value: `${employees.current_page}/${employees.last_page}`, grad: 'from-blue-500 to-indigo-600', ring: 'ring-blue-200 dark:ring-blue-800' },
                        { icon: Baby,      label: 'Энэ хуудас',  value: list.length,       grad: 'from-amber-400 to-orange-500',    ring: 'ring-amber-200 dark:ring-amber-700' },
                    ] as const).map(s => (
                        <div key={s.label} className={`relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm ring-1 ${s.ring}`}>
                            <div className={`absolute right-0 top-0 size-20 -translate-y-4 translate-x-4 rounded-full bg-gradient-to-br ${s.grad} opacity-10`} />
                            <div className={`mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${s.grad}`}>
                                <s.icon className="size-4 text-white" />
                            </div>
                            <div className="text-2xl font-black leading-none text-foreground">{s.value}</div>
                            <div className="mt-1 text-xs font-medium text-muted-foreground">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* ── Filter bar ── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <form onSubmit={doSearch} className="relative flex-1 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Нэр, дугаар, тушаалаар хайх..."
                                className="w-full rounded-xl border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                            />
                        </div>
                        <button type="submit" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors">
                            Хайх
                        </button>
                    </form>

                    {/* Status */}
                    <div className="flex overflow-hidden rounded-xl border bg-muted/40 p-1 text-sm font-semibold gap-1 shrink-0">
                        {([['all', 'Бүгд'], ['active', 'Идэвхтэй'], ['inactive', 'Идэвхгүй']] as const).map(([v, l]) => (
                            <button key={v}
                                onClick={() => applyFilter({ status: v === 'all' ? undefined : v, page: undefined })}
                                className={`rounded-lg px-3.5 py-1.5 transition-all ${statusFilter === v ? 'bg-red-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                                {l}
                            </button>
                        ))}
                    </div>

                    {/* View toggle */}
                    <div className="flex overflow-hidden rounded-xl border bg-muted/40 p-1 gap-1 shrink-0">
                        <button onClick={() => setView('card')}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${view === 'card' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                            <LayoutGrid className="size-4" />
                        </button>
                        <button onClick={() => setView('table')}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${view === 'table' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                            <List className="size-4" />
                        </button>
                    </div>
                </div>

                {/* ── Branch chips ── */}
                {branches.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => applyFilter({ branch_id: undefined, page: undefined })}
                            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                branchFilter === null
                                    ? 'border-red-500 bg-red-600 text-white shadow-sm'
                                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                            }`}
                        >
                            <Building2 className="size-3" /> Бүгд
                        </button>
                        {branches.map(b => (
                            <button key={b.id}
                                onClick={() => applyFilter({ branch_id: String(b.id), page: undefined })}
                                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                    branchFilter === b.id
                                        ? 'border-red-500 bg-red-600 text-white shadow-sm'
                                        : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                                }`}
                            >
                                <Building2 className="size-3" />
                                {b.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Result count ── */}
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {employees.from}–{employees.to} / {employees.total} ажилтан
                </p>

                {/* ── Empty ── */}
                {list.length === 0 && (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed py-20">
                        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                            <Users className="size-8 text-muted-foreground/40" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-muted-foreground">Ажилтан олдсонгүй</p>
                            <p className="mt-1 text-xs text-muted-foreground">Хайлт эсвэл шүүлтүүрийг өөрчилнө үү</p>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    CARD VIEW
                ══════════════════════════════════════════ */}
                {list.length > 0 && view === 'card' && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {list.map(e => (
                            <div key={e.id}
                                className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                                <div className={`absolute inset-x-0 top-0 h-0.5 ${e.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />

                                <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-4 text-center">
                                    <div className="relative">
                                        <Avatar employee={e} size="md" />
                                        <span className={`absolute -bottom-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border-2 border-card ${e.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold leading-tight text-foreground">{e.full_name}</h3>
                                        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                                            {e.employee_number}
                                        </p>
                                    </div>
                                    {e.position && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                                            <Briefcase className="size-3 shrink-0" /> {e.position}
                                        </span>
                                    )}
                                </div>

                                <div className="mx-4 border-t border-dashed border-border/60" />

                                <div className="space-y-2 px-5 py-3">
                                    {e.branch && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Building2 className="size-3.5 shrink-0 opacity-50" />
                                            <span className="truncate">{e.branch}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Phone className="size-3.5 shrink-0 opacity-50" />
                                        <span>{e.phone}</span>
                                    </div>
                                    {e.hired_date && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <UserCheck className="size-3.5 shrink-0 opacity-50" />
                                            <span>{e.hired_date}-с ажиллаж байна</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto flex divide-x divide-border border-t bg-muted/30">
                                    <button onClick={() => router.visit(`/hr/employees/${e.id}`)}
                                        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                        <Eye className="size-3.5" /> Харах
                                    </button>
                                    <button onClick={() => router.visit(`/hr/employees/${e.id}/edit`)}
                                        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/30">
                                        <Edit2 className="size-3.5" /> Засах
                                    </button>
                                    <button onClick={() => handleDelete(e)}
                                        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30">
                                        <Trash2 className="size-3.5" /> Устгах
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    TABLE VIEW
                ══════════════════════════════════════════ */}
                {list.length > 0 && view === 'table' && (
                    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">Ажилтан</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">Тушаал</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">Салбар</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">Утас</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">Ажилд орсон</th>
                                    <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">Статус</th>
                                    <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-muted-foreground">Үйлдэл</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {list.map(e => (
                                    <tr key={e.id} className="group transition-colors hover:bg-muted/30">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <Avatar employee={e} size="sm" />
                                                <div>
                                                    <p className="font-semibold text-foreground leading-tight">{e.full_name}</p>
                                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">{e.employee_number}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {e.position
                                                ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                                                    <Briefcase className="size-3 shrink-0" />{e.position}
                                                  </span>
                                                : <span className="text-xs text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {e.branch
                                                ? <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Building2 className="size-3.5 shrink-0 opacity-50" />{e.branch}
                                                  </span>
                                                : <span className="text-xs text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Phone className="size-3.5 shrink-0 opacity-50" />{e.phone}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                                            {e.hired_date ?? '—'}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            {e.status === 'active'
                                                ? <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                                                    <StatusDot active /> Идэвхтэй
                                                  </span>
                                                : <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                                                    <StatusDot active={false} /> Идэвхгүй
                                                  </span>}
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                <button onClick={() => router.visit(`/hr/employees/${e.id}`)}
                                                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                                    <Eye className="size-3.5" /> Харах
                                                </button>
                                                <button onClick={() => router.visit(`/hr/employees/${e.id}/edit`)}
                                                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/30">
                                                    <Edit2 className="size-3.5" /> Засах
                                                </button>
                                                <button onClick={() => handleDelete(e)}
                                                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30">
                                                    <Trash2 className="size-3.5" /> Устгах
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── Pagination ── */}
                {employees.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <p className="text-muted-foreground">
                            {employees.from}–{employees.to} / {employees.total}
                        </p>
                        <div className="flex items-center gap-1">
                            {employees.links.map((link, i) => (
                                link.url ? (
                                    <button
                                        key={i}
                                        onClick={() => router.get(link.url!)}
                                        className={`flex size-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                                            link.active
                                                ? 'bg-red-600 text-white'
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
