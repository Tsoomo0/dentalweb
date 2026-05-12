import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { CalendarDays, CheckCircle2, Info, Pencil, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface EmployeeBalance {
    id: number;
    name: string;
    employee_number: string;
    photo_url: string | null;
    position: string | null;
    branch: string | null;
    vacation_days: number;
    vacation_extra_days: number;
    used: number;
    allowed: number;
    remaining: number;
}

interface Props {
    employees: EmployeeBalance[];
    year: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/employees' },
    { title: 'Ээлжийн амралт', href: '/hr/vacation-requests' },
    { title: 'Үлдэгдэл хоног', href: '/hr/vacation-balance' },
];

function Avatar({ url, name }: { url: string | null; name: string }) {
    const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return url
        ? <img src={url} alt={name} className="size-9 rounded-full object-cover object-top shrink-0 ring-2 ring-white dark:ring-gray-800" />
        : <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-gray-800">{ini}</div>;
}

function RemainingBadge({ remaining, allowed }: { remaining: number; allowed: number }) {
    const pct   = allowed > 0 ? (remaining / allowed) * 100 : 0;
    const color = pct > 60
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
        : pct > 30
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
        : 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400';
    return (
        <span className={`inline-flex items-center justify-center min-w-[36px] rounded-full px-2.5 py-1 text-sm font-bold ${color}`}>
            {remaining}
        </span>
    );
}

function MiniBar({ used, allowed }: { used: number; allowed: number }) {
    const pct   = allowed > 0 ? Math.min(100, (used / allowed) * 100) : 0;
    const color = pct < 50 ? 'bg-emerald-400' : pct < 80 ? 'bg-amber-400' : 'bg-red-400';
    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{used}/{allowed}</span>
        </div>
    );
}

export default function VacationBalance({ employees, year }: Props) {
    const [search, setSearch] = useState('');
    const [editId, setEditId] = useState<number | null>(null);

    const editForm = useForm({ vacation_extra_days: 0 });

    const filtered = useMemo(() =>
        employees.filter(e =>
            !search ||
            e.name.toLowerCase().includes(search.toLowerCase()) ||
            e.employee_number.toLowerCase().includes(search.toLowerCase()) ||
            (e.position ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (e.branch ?? '').toLowerCase().includes(search.toLowerCase())
        ),
    [employees, search]);

    const totalUsed    = employees.reduce((s, e) => s + e.used, 0);
    const avgRemaining = employees.length > 0
        ? Math.round(employees.reduce((s, e) => s + e.remaining, 0) / employees.length)
        : 0;
    const fullUsed = employees.filter(e => e.remaining === 0).length;

    const editEmp = employees.find(e => e.id === editId);

    function openEdit(e: EmployeeBalance) {
        setEditId(e.id);
        editForm.setData({ vacation_extra_days: e.vacation_extra_days });
    }

    function submitEdit(ev: React.FormEvent) {
        ev.preventDefault();
        if (!editId) return;
        editForm.patch(`/hr/vacation-requests/employees/${editId}/balance`, {
            preserveScroll: true,
            onSuccess: () => { setEditId(null); editForm.reset(); },
        });
    }

    const previewAllowed   = editEmp ? editEmp.vacation_days + editForm.data.vacation_extra_days : 0;
    const previewRemaining = editEmp ? Math.max(0, previewAllowed - editEmp.used) : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Үлдэгдэл хоног" />

            <div className="flex flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Үлдэгдэл хоног</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {year} он · {employees.length} ажилтан · Хөдөлмөрийн хуулийн 79-р зүйлийн дагуу
                        </p>
                    </div>
                    <a href="/hr/vacation-requests"
                        className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                        <CalendarDays className="size-3.5" /> Хүсэлтүүд
                    </a>
                </div>

                {/* НДШ хуулийн тайлбар */}
                <div className="flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 px-4 py-3">
                    <Info className="size-4 text-blue-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        <span className="font-semibold">Хөдөлмөрийн хууль 79-р зүйл:</span>{' '}
                        Үндсэн амралт <strong>15 ажлын өдөр</strong> · НДШ жил бүрийн
                        5 жил тутамд <strong>+1 өдөр</strong> нэмэгдэнэ (5-9 жил → 16, 10-14 → 17, 15-19 → 18, 20-24 → 19, 25-29 → 20, 30+ → 21 өдөр)
                        · НДШ жилийг ажилтны мэдээлэлд оруулна.
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Нийт ашигласан',  value: totalUsed,    sub: 'өдөр',           color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-950/20' },
                        { label: 'Дундаж үлдэгдэл', value: avgRemaining, sub: 'өдөр / ажилтан', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
                        { label: 'Амралт дууссан',  value: fullUsed,     sub: 'ажилтан',        color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950/20' },
                    ].map(s => (
                        <div key={s.label} className={`rounded-2xl border shadow-sm px-5 py-4 ${s.bg}`}>
                            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                            <p className="text-xs font-medium text-foreground mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                        type="text" value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Нэр, дугаар, алба хайх..."
                        className="w-full rounded-xl border bg-card pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    />
                    {search && (
                        <button onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/40">
                            <tr className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                <th className="px-5 py-3 text-left">Ажилтан</th>
                                <th className="px-4 py-3 text-center">Үндсэн амрах хоног</th>
                                <th className="px-4 py-3 text-center">Нэмэгдэл хоног</th>
                                <th className="px-4 py-3 text-center">Нийт хоног</th>
                                <th className="px-4 py-3 text-center">Ашигласан</th>
                                <th className="px-4 py-3 text-center">Үлдэгдэл</th>
                                <th className="px-4 py-3 text-right">Үйлдэл</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                                        Хайлтад тохирох ажилтан олдсонгүй
                                    </td>
                                </tr>
                            ) : filtered.map(e => (
                                <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                                    {/* Employee */}
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar url={e.photo_url} name={e.name} />
                                            <div className="min-w-0">
                                                <p className="font-semibold text-foreground truncate">{e.name}</p>
                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                    {e.branch && (
                                                        <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                                            🏢 {e.branch}
                                                        </span>
                                                    )}
                                                    {e.position && (
                                                        <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                                            💼 {e.position}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Vacation days (computed from ndsh) */}
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="text-sm font-bold text-foreground">{e.vacation_days}</span>
                                            {e.vacation_days > 15 && (
                                                <span className="text-[11px] text-emerald-600 font-semibold">+{e.vacation_days - 15}</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Extra days */}
                                    <td className="px-4 py-3 text-center">
                                        {e.vacation_extra_days > 0
                                            ? <span className="inline-flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 min-w-[28px] px-2 py-0.5 text-xs font-bold">+{e.vacation_extra_days}</span>
                                            : <span className="text-muted-foreground text-sm">—</span>
                                        }
                                    </td>

                                    {/* Total */}
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-sm font-bold text-foreground">{e.allowed}</span>
                                    </td>

                                    {/* Used progress */}
                                    <td className="px-4 py-3">
                                        <div className="flex justify-center">
                                            <MiniBar used={e.used} allowed={e.allowed} />
                                        </div>
                                    </td>

                                    {/* Remaining */}
                                    <td className="px-4 py-3 text-center">
                                        <RemainingBadge remaining={e.remaining} allowed={e.allowed} />
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => openEdit(e)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                            <Pencil className="size-3" /> Засах
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ToastContainer />

            {/* Edit modal — зөвхөн нэмэгдэл хоног */}
            {editId !== null && editEmp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border bg-card shadow-2xl overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/20">
                            <Avatar url={editEmp.photo_url} name={editEmp.name} />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-foreground truncate">{editEmp.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {[editEmp.position, editEmp.branch].filter(Boolean).join(' · ')}
                                </p>
                            </div>
                            <button onClick={() => setEditId(null)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>

                        <form onSubmit={submitEdit} className="p-5 space-y-4">

                            {/* Нэмэгдэл хоног */}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                    Нэмэгдэл хоног <span className="font-normal text-muted-foreground/60">(захиргааны шийдвэрээр)</span>
                                </label>
                                <input
                                    type="number" min={0} max={365}
                                    value={editForm.data.vacation_extra_days}
                                    onChange={e => editForm.setData('vacation_extra_days', parseInt(e.target.value) || 0)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground text-center font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            {/* Live preview */}
                            <div className="rounded-xl bg-muted/40 px-4 py-3 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Үндсэн амрах хоног</span>
                                    <span className="font-semibold text-foreground">{editEmp.vacation_days} өдөр</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Нэмэгдэл хоног</span>
                                    <span className="font-semibold text-blue-600">+{editForm.data.vacation_extra_days} өдөр</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Нийт зөвшөөрөгдсөн</span>
                                    <span className="font-bold text-foreground">{previewAllowed} өдөр</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Ашигласан ({year})</span>
                                    <span className="font-semibold text-orange-500">{editEmp.used} өдөр</span>
                                </div>
                                <div className="border-t border-border/60 pt-2 flex justify-between text-sm">
                                    <span className="font-semibold text-foreground">Шинэ үлдэгдэл</span>
                                    <span className={`font-bold ${previewRemaining > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {previewRemaining} өдөр
                                    </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${
                                        previewAllowed > 0 && editEmp.used / previewAllowed < 0.5 ? 'bg-emerald-400'
                                        : editEmp.used / previewAllowed < 0.8 ? 'bg-amber-400' : 'bg-red-400'
                                    }`} style={{ width: `${previewAllowed > 0 ? Math.min(100, (editEmp.used / previewAllowed) * 100) : 0}%` }} />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2">
                                <button type="submit" disabled={editForm.processing}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-sm font-bold text-background hover:opacity-90 disabled:opacity-50 transition-all">
                                    {editForm.processing
                                        ? <span className="size-4 rounded-full border-2 border-background/30 border-t-background animate-spin" />
                                        : <CheckCircle2 className="size-4" />}
                                    Хадгалах
                                </button>
                                <button type="button" onClick={() => setEditId(null)}
                                    className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                                    Болих
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
