import { LabPeriodFilter, LabWorkFilter, periodLabel, type PeriodFilters } from '@/components/lab-period-filter';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { FlaskConical, RotateCcw, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

interface LabEmployee {
    id: number;
    employee_number: string;
    name: string;
    full_name: string;
    branch_name: string | null;
    photo_url: string | null;
    status: string;
    bender: number;
    polisher: number;
    total: number;
    /** Өөрийн хийсэн тусдаа захиалгын тоо */
    orders: number;
    /** Түүнээс хэд нь буцаагдсан — чанарын үзүүлэлт */
    returned: number;
    return_rate: number;
    /** Бусдын буцаалтыг янзалсан ажил — чанарын алдаа биш */
    fixed: number;
}

interface Props {
    employees: LabEmployee[];
    filters: PeriodFilters;
    years: number[];
    workTypes: { value: string; count: number }[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Удирдлага', href: '/admin/dashboard' },
    { title: 'Лаб ажилтан', href: '/admin/lab-employees' },
];

export default function LabEmployeesIndex({ employees, filters, years, workTypes }: Props) {
    const [search, setSearch] = useState('');

    /** Ажилтны хуудас руу шүүлтүүрээ авч явна */
    function detailUrl(id: number): string {
        const q = new URLSearchParams();
        if (filters.year)    q.set('year', String(filters.year));
        if (filters.quarter) q.set('quarter', String(filters.quarter));
        if (filters.month)   q.set('month', String(filters.month));
        if (filters.work)    q.set('work', filters.work);
        const s = q.toString();
        return `/admin/lab-employees/${id}${s ? `?${s}` : ''}`;
    }

    /** Ажлын төрөл сервер талд тоологддог тул шинэчлэхэд хүсэлт явна */
    function setWork(work: string | null) {
        router.get('/admin/lab-employees', {
            year:    filters.year    ?? undefined,
            quarter: filters.quarter ?? undefined,
            month:   filters.month   ?? undefined,
            work:    work ?? undefined,
        }, { preserveState: false, preserveScroll: true });
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return employees;
        return employees.filter(e =>
            e.full_name.toLowerCase().includes(q) ||
            e.name.toLowerCase().includes(q) ||
            e.employee_number.toLowerCase().includes(q) ||
            (e.branch_name ?? '').toLowerCase().includes(q)
        );
    }, [employees, search]);

    const totals = useMemo(() => {
        const orders   = employees.reduce((s, e) => s + e.orders, 0);
        const returned = employees.reduce((s, e) => s + e.returned, 0);
        return {
            work:     employees.reduce((s, e) => s + e.total, 0),
            fixed:    employees.reduce((s, e) => s + e.fixed, 0),
            returned,
            rate:     orders > 0 ? Math.round((returned / orders) * 100) : 0,
            active:   employees.filter(e => e.total + e.fixed > 0).length,
        };
    }, [employees]);

    const max = Math.max(...employees.map(e => e.total + e.fixed), 1);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Лаб ажилтан" />

            <div className="flex flex-col gap-3 p-4 md:p-6">
                {/* Header */}
                <div className="rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/80 via-card to-fuchsia-50/60 dark:from-violet-950/30 dark:via-card dark:to-fuchsia-950/20 shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 px-4 md:px-5 py-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
                            <Users className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-base font-bold text-foreground">Лаб ажилтан</h1>
                            <p className="text-[11px] text-muted-foreground truncate">
                                Ажилтан дээр дарж хийсэн ажлын жагсаалтыг харна · {periodLabel(filters)}
                                {filters.work && <> · <span className="font-semibold text-violet-600 dark:text-violet-400">{filters.work}</span></>}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-violet-100/60 dark:divide-violet-900/30">
                        <Stat label="Ажил хийсэн ажилтан" value={`${totals.active} / ${employees.length}`} accent="violet" />
                        <Stat label="Нийт ажил" value={totals.work.toLocaleString()} accent="indigo" />
                        <Stat label="Буцаагдсан ажил" value={`${totals.returned} · ${totals.rate}%`} accent="red" />
                        <Stat label="Янзалсан ажил" value={totals.fixed.toLocaleString()} accent="amber" />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-card p-2 shadow-sm">
                    <div className="relative flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-background px-3 py-1.5 flex-1 min-w-52">
                        <Search className="size-3.5 text-muted-foreground" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Ажилтны нэр, дугаар, салбараар хайх..."
                            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
                    </div>

                    <LabWorkFilter value={filters.work ?? null} options={workTypes} onChange={setWork} />
                    <LabPeriodFilter url="/admin/lab-employees" filters={filters} years={years} />

                    <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
                        {filtered.length} ажилтан
                    </span>
                </div>

                {/* Table */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-card shadow-sm overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-16 text-center text-muted-foreground">
                            <Users className="size-10 mx-auto mb-2 text-violet-300" />
                            <p className="text-sm font-semibold text-foreground">Лаб ажилтан олдсонгүй</p>
                            <p className="text-[11px] mt-1">HR хэсгээс "Шүдний техникч" албан тушаалтай ажилтан бүртгэнэ үү</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto premium-scroll">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50/70 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wide">
                                        <th className="px-3 py-1.5 text-center font-semibold w-8">№</th>
                                        <th className="px-2 py-1.5 text-left font-semibold">Ажилтан</th>
                                        <th className="px-2 py-1.5 text-left font-semibold w-28 hidden md:table-cell">Салбар</th>
                                        <th className="px-2 py-1.5 text-right font-semibold w-20">Нугалсан</th>
                                        <th className="px-2 py-1.5 text-right font-semibold w-20">Өнгөлсөн</th>
                                        <th className="px-2 py-1.5 text-right font-semibold w-20">Нийт ажил</th>
                                        <th className="px-2 py-1.5 text-right font-semibold w-28" title="Өөрийн хийсэн ажлаас буцаагдсан нь">Буцаагдсан</th>
                                        <th className="px-2 py-1.5 text-right font-semibold w-24" title="Бусдын буцаалтыг янзалсан ажил">Янзалсан</th>
                                        <th className="px-2 py-1.5 text-left font-semibold w-36 hidden lg:table-cell">Ачаалал</th>
                                        <th className="px-2 py-1.5 text-center font-semibold w-6"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((e, idx) => {
                                        return (
                                            <tr key={e.id} className={`border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-violet-50/40 dark:hover:bg-violet-950/15 ${
                                                idx % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-gray-800/10'
                                            }`}>
                                                <td className="px-3 py-2 text-center text-gray-400 text-[11px] tabular-nums">{idx + 1}</td>
                                                <td className="px-2 py-2">
                                                    <Link href={detailUrl(e.id)} className="flex items-center gap-2 group">
                                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 overflow-hidden">
                                                            {e.photo_url
                                                                ? <img src={e.photo_url} alt="" className="size-full object-cover" />
                                                                : <FlaskConical className="size-3.5" />}
                                                        </span>
                                                        <span className="min-w-0">
                                                            <span className="block font-semibold text-foreground text-[12px] truncate group-hover:text-violet-600 dark:group-hover:text-violet-400">
                                                                {e.name}
                                                            </span>
                                                            <span className="block text-[10px] text-muted-foreground truncate">
                                                                {e.employee_number}
                                                                {e.status !== 'active' && <span className="ml-1 text-red-500">· идэвхгүй</span>}
                                                            </span>
                                                        </span>
                                                    </Link>
                                                </td>
                                                <td className="px-2 py-2 text-[11px] text-gray-700 dark:text-gray-300 truncate hidden md:table-cell">
                                                    {e.branch_name ?? '—'}
                                                </td>
                                                <td className="px-2 py-2 text-right tabular-nums text-[12px] font-semibold text-blue-600 dark:text-blue-400">
                                                    {e.bender || <span className="text-muted-foreground/40 font-normal">—</span>}
                                                </td>
                                                <td className="px-2 py-2 text-right tabular-nums text-[12px] font-semibold text-indigo-600 dark:text-indigo-400">
                                                    {e.polisher || <span className="text-muted-foreground/40 font-normal">—</span>}
                                                </td>
                                                <td className="px-2 py-2 text-right tabular-nums text-[13px] font-bold text-foreground">
                                                    {e.total || <span className="text-muted-foreground/40 font-normal">—</span>}
                                                    {e.orders > 0 && (
                                                        <div className="text-[9px] font-normal text-muted-foreground">{e.orders} захиалга</div>
                                                    )}
                                                </td>
                                                {/* Буцаагдсан — ӨӨРИЙН хийсэн ажлын чанарын үзүүлэлт */}
                                                <td className="px-2 py-2 text-right tabular-nums text-[12px]">
                                                    {e.returned > 0 ? (
                                                        <>
                                                            <span className="font-bold text-red-600 dark:text-red-400">{e.returned}</span>
                                                            <div className={`text-[9px] font-semibold ${
                                                                e.return_rate >= 20 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                                                            }`}>{e.return_rate}%</div>
                                                        </>
                                                    ) : <span className="text-muted-foreground/40">—</span>}
                                                </td>
                                                {/* Янзалсан — бусдын буцаалтыг засварласан нэмэлт ажил */}
                                                <td className="px-2 py-2 text-right tabular-nums text-[12px]">
                                                    {e.fixed > 0
                                                        ? <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                                                            <RotateCcw className="size-3" />{e.fixed}
                                                          </span>
                                                        : <span className="text-muted-foreground/40">—</span>}
                                                </td>
                                                <td className="px-2 py-2 hidden lg:table-cell">
                                                    <div className="flex h-1.5 rounded-full bg-muted overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-500"
                                                            style={{ width: `${(e.total / max) * 100}%` }} title={`${e.total} ажил`} />
                                                        <div className="h-full bg-amber-400"
                                                            style={{ width: `${(e.fixed / max) * 100}%` }} title={`${e.fixed} янзалсан`} />
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    <Link href={detailUrl(e.id)}
                                                        className="text-gray-400 hover:text-violet-500 transition-colors">›</Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50 dark:bg-gray-800/60 border-t-2 border-violet-300 dark:border-violet-700">
                                        <td colSpan={3} className="px-3 py-2 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                            Нийт {filtered.length} ажилтан
                                        </td>
                                        <td className="px-2 py-2 text-right text-[11px] font-bold tabular-nums text-blue-600 dark:text-blue-400">
                                            {filtered.reduce((s, e) => s + e.bender, 0)}
                                        </td>
                                        <td className="px-2 py-2 text-right text-[11px] font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                                            {filtered.reduce((s, e) => s + e.polisher, 0)}
                                        </td>
                                        <td className="px-2 py-2 text-right text-[11px] font-bold tabular-nums text-foreground">
                                            {filtered.reduce((s, e) => s + e.total, 0)}
                                        </td>
                                        <td className="px-2 py-2 text-right text-[11px] font-bold tabular-nums text-red-600 dark:text-red-400">
                                            {filtered.reduce((s, e) => s + e.returned, 0)}
                                        </td>
                                        <td className="px-2 py-2 text-right text-[11px] font-bold tabular-nums text-amber-600 dark:text-amber-400">
                                            {filtered.reduce((s, e) => s + e.fixed, 0)}
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: 'violet' | 'indigo' | 'red' | 'amber' }) {
    const color = {
        violet: 'text-violet-700 dark:text-violet-400',
        indigo: 'text-indigo-700 dark:text-indigo-400',
        red:    'text-red-700 dark:text-red-400',
        amber:  'text-amber-700 dark:text-amber-400',
    }[accent];
    return (
        <div className="px-3 py-2 text-center">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold truncate">{label}</p>
            <p className={`text-sm font-bold tabular-nums truncate ${color}`}>{value}</p>
        </div>
    );
}
