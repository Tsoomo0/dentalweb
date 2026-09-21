import AppLayout from '@/layouts/app-layout';
import { CompletionRing, HR_PANEL_FX } from '@/components/hr/document-status';
import {
    HrButton, HrClearButton, HrEmpty, HrGhostButton, HrListBody, HrListCard, HrListHead,
    HrPager, HrPanel, HrRow, HrSearch, HrSelect, HrTabs,
} from '@/components/hr/page-panel';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Briefcase, Building2, Download, Edit2, Eye, LayoutGrid, List, Phone, Plus,
    Trash2, UserCheck, Users, UserX,
} from 'lucide-react';
import { useEffect, useState } from 'react';

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
interface Stats { total: number; active: number; inactive: number }
interface Props { employees: Paginated<Employee>; branches: Branch[]; filters: Filters; stats: Stats }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/employees' },
    { title: 'Ажилтнууд', href: '/hr/employees' },
];

/** Жагсаалтын баганын өргөн — толгой мөр ба өгөгдлийн мөр нэг утгыг хуваана. */
const ROW_COLS = 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_128px_110px_112px_136px]';

const AVATAR_COLORS = [
    'from-rose-400 to-rose-600',
    'from-blue-400 to-blue-600',
    'from-emerald-400 to-emerald-600',
    'from-violet-400 to-violet-600',
    'from-amber-400 to-amber-600',
    'from-pink-400 to-pink-600',
    'from-cyan-400 to-cyan-600',
    'from-indigo-400 to-indigo-600',
];

function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

function Avatar({ employee, size = 'md' }: { employee: Employee; size?: 'sm' | 'md' }) {
    const cls = size === 'sm'
        ? 'size-9 rounded-xl text-[11px]'
        : 'size-20 rounded-2xl text-2xl';

    return employee.photo_url
        ? <img src={employee.photo_url} alt={employee.full_name}
            className={`${cls} object-cover object-top shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10`} />
        : <div className={`${cls} flex items-center justify-center bg-gradient-to-br ${avatarColor(employee.id)} font-black text-white shadow-sm ring-1 ring-inset ring-white/25`}>
            {initials(employee.full_name)}
        </div>;
}

function StatusPill({ active }: { active: boolean }) {
    return active ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold leading-tight text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Идэвхтэй
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold leading-tight text-zinc-500 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800/70 dark:text-zinc-400 dark:ring-zinc-700">
            <span className="size-1.5 rounded-full bg-zinc-400" /> Идэвхгүй
        </span>
    );
}

function handleDelete(e: Employee) {
    if (window.confirm(`"${e.full_name}" ажилтныг устгах уу? Эмчийн бүртгэл болон нэвтрэх эрх хамт устгагдана.`)) {
        router.delete(`/hr/employees/${e.id}`);
    }
}

export default function EmployeesIndex({ employees, branches, filters, stats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [view, setView] = useState<'card' | 'table'>('table');
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);

    function applyFilter(params: Record<string, string | undefined>) {
        router.get('/hr/employees', { ...filters, ...params }, { preserveState: true, preserveScroll: true, replace: true });
    }

    // Хайлтыг бичиж дуусахад нь илгээнэ
    useEffect(() => {
        if (search === (filters.search ?? '')) return;
        const t = setTimeout(() => applyFilter({ search, page: undefined }), 400);

        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => { setPendingStatus(null); }, [filters.status]);

    const statusFilter = pendingStatus ?? filters.status ?? '';
    const hasFilter = !!(filters.search || filters.status || filters.branch_id);
    const list = employees.data;

    function clearFilters() {
        setSearch('');
        router.get('/hr/employees', {}, { preserveScroll: true, replace: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ажилтнууд" />

            <div className="space-y-3 p-4 md:p-5">

                <HrPanel
                    tone="rose"
                    icon={Users}
                    title="Ажилтнууд"
                    badge={`${stats.total} бүртгэл`}
                    subtitle={
                        <>
                            <span className="inline-flex items-center gap-1"><UserCheck className="size-3 text-emerald-500" /> {stats.active} идэвхтэй</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="inline-flex items-center gap-1"><UserX className="size-3 text-zinc-400" /> {stats.inactive} идэвхгүй</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="inline-flex items-center gap-1"><Building2 className="size-3 text-rose-400" /> {branches.length} салбар</span>
                        </>
                    }
                    actions={
                        <>
                            <CompletionRing value={stats.active} total={stats.total} label="Идэвхтэй"
                                title={`Нийт ${stats.total} ажилтнаас ${stats.active} нь идэвхтэй`} />

                            <HrSearch tone="rose" value={search} onChange={setSearch}
                                placeholder="Нэр, дугаар, тушаалаар хайх…" />

                            <div className="flex h-9 items-center gap-0.5 rounded-xl border border-border/70 bg-background/70 p-0.5 shadow-sm backdrop-blur">
                                {([['table', List], ['card', LayoutGrid]] as const).map(([v, Icon]) => (
                                    <button key={v} onClick={() => setView(v)} title={v === 'table' ? 'Жагсаалт' : 'Хөрөг'}
                                        className={`flex size-8 items-center justify-center rounded-lg transition-all ${
                                            view === v ? 'bg-muted text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                                        <Icon className="size-3.5" />
                                    </button>
                                ))}
                            </div>

                            <HrGhostButton icon={Download} href="/hr/employees/export-excel" title="Excel татах">Excel</HrGhostButton>

                            <HrButton tone="rose" icon={Plus} onClick={() => router.visit('/hr/employees/create')}>
                                Ажилтан нэмэх
                            </HrButton>
                        </>
                    }
                    tabs={
                        <HrTabs
                            tone="rose"
                            active={statusFilter}
                            onChange={key => { setPendingStatus(key); applyFilter({ status: key || undefined, page: undefined }); }}
                            items={[
                                { key: '', label: 'Бүгд', value: stats.total, Icon: Users, on: 'from-slate-600 to-slate-700 shadow-slate-900/30' },
                                { key: 'active', label: 'Идэвхтэй', value: stats.active, Icon: UserCheck, on: 'from-emerald-500 to-emerald-600 shadow-emerald-600/40' },
                                { key: 'inactive', label: 'Идэвхгүй', value: stats.inactive, Icon: UserX, on: 'from-zinc-500 to-zinc-600 shadow-zinc-700/40' },
                            ]}
                        />
                    }
                    filters={
                        <>
                            <HrSelect tone="rose" value={filters.branch_id ?? ''}
                                onChange={v => applyFilter({ branch_id: v || undefined, page: undefined })}>
                                <option value="">Бүх салбар</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </HrSelect>

                            {hasFilter && <HrClearButton onClick={clearFilters} />}
                        </>
                    }
                />

                {/* ── Жагсаалт ── */}
                {list.length === 0 ? (
                    <HrEmpty
                        tone="rose"
                        icon={Users}
                        title={hasFilter ? 'Хайлтад тохирох ажилтан олдсонгүй' : 'Одоогоор ажилтан бүртгээгүй байна'}
                        hint={hasFilter
                            ? 'Хайлт эсвэл шүүлтүүрээ өөрчилж дахин үзнэ үү.'
                            : 'Ажилтан нэмснээр гэрээ, цалин, ирцийн бүртгэл рүү шууд холбогдоно.'}
                        action={hasFilter
                            ? <HrGhostButton onClick={clearFilters}>Шүүлтүүр цэвэрлэх</HrGhostButton>
                            : <HrButton tone="rose" icon={Plus} onClick={() => router.visit('/hr/employees/create')}>Эхний ажилтныг нэмэх</HrButton>}
                    />
                ) : view === 'table' ? (
                    <HrListCard>
                        <HrListHead cols={ROW_COLS}>
                            <span>Ажилтан</span>
                            <span>Албан тушаал</span>
                            <span>Салбар</span>
                            <span>Утас</span>
                            <span>Ажилд орсон</span>
                            <span>Төлөв</span>
                            <span className="text-right">Үйлдэл</span>
                        </HrListHead>

                        <HrListBody>
                            {list.map((e, i) => (
                                <HrRow key={e.id} cols={ROW_COLS} index={i}
                                    accent={e.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}
                                    onClick={() => router.visit(`/hr/employees/${e.id}`)}>

                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <span className="relative shrink-0">
                                            <Avatar employee={e} size="sm" />
                                            <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card ${
                                                e.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{e.full_name}</p>
                                            <p className="truncate text-[11px] uppercase leading-tight tracking-wide text-muted-foreground/70">
                                                {e.employee_number}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="min-w-0">
                                        {e.position ? (
                                            <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-lg bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border/60">
                                                <Briefcase className="size-3 shrink-0" />
                                                <span className="truncate">{e.position}</span>
                                            </span>
                                        ) : <span className="text-[11px] text-muted-foreground/40">—</span>}
                                    </div>

                                    <p className="flex min-w-0 items-center gap-1.5 truncate text-[12px] text-foreground">
                                        {e.branch
                                            ? <><Building2 className="size-3.5 shrink-0 text-muted-foreground" />{e.branch}</>
                                            : <span className="text-[11px] text-muted-foreground/40">—</span>}
                                    </p>

                                    <p className="flex min-w-0 items-center gap-1.5 truncate text-[11px] tabular-nums text-muted-foreground">
                                        <Phone className="size-3.5 shrink-0" />{e.phone}
                                    </p>

                                    <p className="text-[11px] tabular-nums text-muted-foreground">{e.hired_date ?? '—'}</p>

                                    <div className="min-w-0"><StatusPill active={e.status === 'active'} /></div>

                                    <div className="flex items-center justify-end gap-1" onClick={ev => ev.stopPropagation()}>
                                        <button onClick={() => router.visit(`/hr/employees/${e.id}`)} title="Дэлгэрэнгүй"
                                            className="flex h-7 items-center gap-1 rounded-md border bg-background/60 px-2 text-[11px] font-medium text-muted-foreground transition-all hover:border-rose-500/40 hover:bg-muted hover:text-foreground active:scale-95">
                                            <Eye className="size-3" /> Харах
                                        </button>
                                        <button onClick={() => router.visit(`/hr/employees/${e.id}/edit`)} title="Засах"
                                            className="flex size-7 items-center justify-center rounded-md border bg-background/60 text-blue-600 transition-all hover:bg-blue-50 active:scale-95 dark:text-blue-400 dark:hover:bg-blue-950/30">
                                            <Edit2 className="size-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(e)} title="Устгах"
                                            className="flex size-7 items-center justify-center rounded-md border bg-background/60 text-red-500 transition-all hover:bg-red-50 active:scale-95 dark:hover:bg-red-950/30">
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </HrRow>
                            ))}
                        </HrListBody>

                        <HrPager
                            page={employees.current_page} lastPage={employees.last_page}
                            from={employees.from} to={employees.to} total={employees.total} unit="ажилтан"
                            onPage={p => applyFilter({ page: String(p) })}
                            extra={hasFilter ? <span className="ml-1">(шүүсэн)</span> : null}
                        />
                    </HrListCard>
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {list.map((e, i) => (
                                <div key={e.id}
                                    style={{ animationDelay: `${Math.min(i, 12) * 28}ms` }}
                                    className="group relative flex animate-in flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-20px_rgba(0,0,0,0.25)] transition-all fade-in slide-in-from-bottom-1 fill-mode-backwards hover:-translate-y-0.5 hover:shadow-lg">
                                    <div className={`absolute inset-x-0 top-0 h-0.5 ${e.status === 'active' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />

                                    <div className="flex flex-col items-center gap-3 px-5 pb-4 pt-6 text-center">
                                        <div className="relative">
                                            <Avatar employee={e} size="md" />
                                            <span className={`absolute -bottom-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border-2 border-card ${
                                                e.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold leading-tight text-foreground">{e.full_name}</h3>
                                            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                                                {e.employee_number}
                                            </p>
                                        </div>
                                        {e.position && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border/60">
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
                                            <span className="tabular-nums">{e.phone}</span>
                                        </div>
                                        {e.hired_date && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <UserCheck className="size-3.5 shrink-0 opacity-50" />
                                                <span className="tabular-nums">{e.hired_date}-с ажиллаж байна</span>
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

                        <HrListCard>
                            <HrPager
                                page={employees.current_page} lastPage={employees.last_page}
                                from={employees.from} to={employees.to} total={employees.total} unit="ажилтан"
                                onPage={p => applyFilter({ page: String(p) })}
                                extra={hasFilter ? <span className="ml-1">(шүүсэн)</span> : null}
                            />
                        </HrListCard>
                    </>
                )}
            </div>

            <style>{HR_PANEL_FX}</style>
        </AppLayout>
    );
}
