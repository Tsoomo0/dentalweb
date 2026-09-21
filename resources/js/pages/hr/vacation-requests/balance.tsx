import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { CompletionRing, HR_PANEL_FX } from '@/components/hr/document-status';
import {
    HrEmpty, HrGhostButton, HrListBody, HrListCard, HrListHead, HrPager, HrPanel, HrRow,
    HrSearch, usePaged,
} from '@/components/hr/page-panel';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import {
    Briefcase, Building2, CalendarDays, CheckCircle2, Info, Pencil, Umbrella, X,
} from 'lucide-react';
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

/** Жагсаалтын баганын өргөн — толгой мөр ба өгөгдлийн мөр нэг утгыг хуваана. */
const ROW_COLS = 'lg:grid-cols-[minmax(0,1.6fr)_96px_96px_88px_minmax(0,180px)_96px_96px]';

function Avatar({ url, name }: { url: string | null; name: string }) {
    const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return url
        ? <img src={url} alt={name}
            className="size-9 shrink-0 rounded-xl object-cover object-top shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10" />
        : <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-600 text-[11px] font-black text-white shadow-sm ring-1 ring-inset ring-white/25">
            {ini}
        </div>;
}

/** Үлдэгдэл хоногийн шошго — хэр их үлдснээс хамаарч өнгө нь солигдоно. */
function RemainingPill({ remaining, allowed }: { remaining: number; allowed: number }) {
    const pct = allowed > 0 ? (remaining / allowed) * 100 : 0;
    const style = pct > 60
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60'
        : pct > 30
            ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60'
            : 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60';

    return (
        <span className={`inline-flex min-w-[42px] items-center justify-center rounded-full px-2 py-0.5 text-[13px] font-bold tabular-nums ring-1 ring-inset ${style}`}>
            {remaining}
        </span>
    );
}

function UsedBar({ used, allowed }: { used: number; allowed: number }) {
    const pct = allowed > 0 ? Math.min(100, (used / allowed) * 100) : 0;
    const color = pct < 50 ? 'bg-emerald-500' : pct < 80 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="min-w-0">
            <p className="flex items-center justify-between gap-2 text-[11px] leading-tight text-muted-foreground">
                <span className="tabular-nums"><span className="font-semibold text-foreground">{used}</span> / {allowed} өдөр</span>
                <span className="tabular-nums">{Math.round(pct)}%</span>
            </p>
            <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-muted">
                <span className={`block h-full rounded-full transition-[width] duration-700 ${color}`} style={{ width: `${pct}%` }} />
            </span>
        </div>
    );
}

export default function VacationBalance({ employees, year }: Props) {
    const [search, setSearch] = useState('');
    const [editId, setEditId] = useState<number | null>(null);

    const editForm = useForm({ vacation_extra_days: 0 });

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return employees;

        return employees.filter(e =>
            e.name.toLowerCase().includes(q) ||
            e.employee_number.toLowerCase().includes(q) ||
            (e.position ?? '').toLowerCase().includes(q) ||
            (e.branch ?? '').toLowerCase().includes(q));
    }, [employees, search]);

    const paged = usePaged(filtered);

    const totalUsed = employees.reduce((s, e) => s + e.used, 0);
    const totalAllowed = employees.reduce((s, e) => s + e.allowed, 0);
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

    const previewAllowed = editEmp ? editEmp.vacation_days + editForm.data.vacation_extra_days : 0;
    const previewRemaining = editEmp ? Math.max(0, previewAllowed - editEmp.used) : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Үлдэгдэл хоног" />

            <div className="space-y-3 p-4 md:p-5">

                <HrPanel
                    tone="sky"
                    icon={Umbrella}
                    title="Үлдэгдэл хоног"
                    badge={`${year} он`}
                    subtitle={
                        <>
                            <span>{employees.length} ажилтан</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span>Нийт ашигласан <span className="font-semibold text-foreground">{totalUsed}</span> өдөр</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span>Дундаж үлдэгдэл <span className="font-semibold text-foreground">{avgRemaining}</span> өдөр</span>
                            {fullUsed > 0 && (
                                <>
                                    <span className="text-muted-foreground/40">·</span>
                                    <span className="text-red-500">{fullUsed} ажилтны амралт дууссан</span>
                                </>
                            )}
                        </>
                    }
                    actions={
                        <>
                            <CompletionRing value={totalUsed} total={totalAllowed} label="Ашигласан"
                                title={`Нийт ${totalAllowed} өдрөөс ${totalUsed} нь ашиглагдсан`} />

                            <HrSearch tone="sky" value={search} onChange={setSearch} placeholder="Нэр, дугаар, албаар хайх…" />

                            <HrGhostButton icon={CalendarDays} href="/hr/vacation-requests" title="Ээлжийн амралтын хүсэлтүүд">
                                Хүсэлтүүд
                            </HrGhostButton>
                        </>
                    }
                >
                    {/* Хөдөлмөрийн хуулийн тайлбар */}
                    <div className="relative mx-4 mb-3.5 flex items-start gap-2.5 rounded-xl border border-border/70 bg-background/70 px-3 py-2 shadow-sm backdrop-blur">
                        <Info className="mt-0.5 size-3.5 shrink-0 text-sky-500" />
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                            <span className="font-semibold text-foreground">Хөдөлмөрийн хууль 79-р зүйл:</span>{' '}
                            Үндсэн амралт <strong className="text-foreground">15 ажлын өдөр</strong> · НДШ-ийн жилээс хамаарч
                            5 жил тутамд <strong className="text-foreground">+1 өдөр</strong> нэмэгдэнэ
                            (5–9 жил → 16, 10–14 → 17, 15–19 → 18, 20–24 → 19, 25–29 → 20, 30+ → 21 өдөр).
                            НДШ-ийн жилийг ажилтны мэдээлэлд оруулна.
                        </p>
                    </div>
                </HrPanel>

                {/* ── Жагсаалт ── */}
                {filtered.length === 0 ? (
                    <HrEmpty tone="sky" icon={Umbrella}
                        title={search ? 'Хайлтад тохирох ажилтан олдсонгүй' : 'Ажилтан бүртгэгдээгүй байна'}
                        hint={search ? 'Хайлтаа өөрчилж дахин үзнэ үү.' : undefined} />
                ) : (
                    <HrListCard>
                        <HrListHead cols={ROW_COLS}>
                            <span>Ажилтан</span>
                            <span className="text-center">Үндсэн</span>
                            <span className="text-center">Нэмэгдэл</span>
                            <span className="text-center">Нийт</span>
                            <span>Ашигласан</span>
                            <span className="text-center">Үлдэгдэл</span>
                            <span className="text-right">Үйлдэл</span>
                        </HrListHead>

                        <HrListBody>
                            {paged.data.map((e, i) => (
                                <HrRow key={e.id} cols={ROW_COLS} index={i}
                                    accent={e.remaining === 0 ? 'bg-red-500' : e.remaining < 5 ? 'bg-amber-400' : 'bg-emerald-500'}>

                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <Avatar url={e.photo_url} name={e.name} />
                                        <div className="min-w-0">
                                            <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{e.name}</p>
                                            <p className="mt-0.5 flex min-w-0 items-center gap-2 truncate text-[11px] leading-tight text-muted-foreground">
                                                {e.branch && (
                                                    <span className="inline-flex items-center gap-1 truncate">
                                                        <Building2 className="size-3 shrink-0" />{e.branch}
                                                    </span>
                                                )}
                                                {e.position && (
                                                    <span className="inline-flex items-center gap-1 truncate">
                                                        <Briefcase className="size-3 shrink-0" />{e.position}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <p className="flex items-center justify-center gap-1 text-[13px] font-semibold tabular-nums text-foreground">
                                        {e.vacation_days}
                                        {e.vacation_days > 15 && (
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">+{e.vacation_days - 15}</span>
                                        )}
                                    </p>

                                    <p className="text-center">
                                        {e.vacation_extra_days > 0
                                            ? <span className="inline-flex min-w-[30px] items-center justify-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-sky-700 ring-1 ring-inset ring-sky-500/25 dark:text-sky-300">
                                                +{e.vacation_extra_days}
                                            </span>
                                            : <span className="text-[11px] text-muted-foreground/40">—</span>}
                                    </p>

                                    <p className="text-center text-[13px] font-bold tabular-nums text-foreground">{e.allowed}</p>

                                    <UsedBar used={e.used} allowed={e.allowed} />

                                    <p className="text-center"><RemainingPill remaining={e.remaining} allowed={e.allowed} /></p>

                                    <div className="flex items-center justify-end">
                                        <button onClick={() => openEdit(e)} title="Нэмэгдэл хоног засах"
                                            className="flex h-7 items-center gap-1 rounded-md border bg-background/60 px-2 text-[11px] font-medium text-muted-foreground transition-all hover:border-sky-500/40 hover:bg-muted hover:text-foreground active:scale-95">
                                            <Pencil className="size-3" /> Засах
                                        </button>
                                    </div>
                                </HrRow>
                            ))}
                        </HrListBody>

                        <HrPager page={paged.page} lastPage={paged.lastPage} from={paged.from} to={paged.to}
                            total={paged.total} unit="ажилтан" onPage={paged.setPage}
                            extra={
                                <>
                                    <span className="mx-1.5 text-muted-foreground/40">·</span>
                                    Нийт ашигласан <span className="font-bold tabular-nums text-foreground">{totalUsed}</span> / {totalAllowed} өдөр
                                </>
                            } />
                    </HrListCard>
                )}
            </div>

            <ToastContainer />

            {/* Засах цонх — зөвхөн нэмэгдэл хоног */}
            {editId !== null && editEmp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm overflow-hidden rounded-2xl border bg-card shadow-2xl">

                        <div className="flex items-center gap-3 border-b bg-muted/20 px-5 py-4">
                            <Avatar url={editEmp.photo_url} name={editEmp.name} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-foreground">{editEmp.name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {[editEmp.position, editEmp.branch].filter(Boolean).join(' · ')}
                                </p>
                            </div>
                            <button onClick={() => setEditId(null)}
                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted">
                                <X className="size-4" />
                            </button>
                        </div>

                        <form onSubmit={submitEdit} className="space-y-4 p-5">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                    Нэмэгдэл хоног <span className="font-normal text-muted-foreground/60">(захиргааны шийдвэрээр)</span>
                                </label>
                                <input
                                    type="number" min={0} max={365}
                                    value={editForm.data.vacation_extra_days}
                                    onChange={e => editForm.setData('vacation_extra_days', parseInt(e.target.value) || 0)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-center text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                                />
                            </div>

                            <div className="space-y-2 rounded-xl bg-muted/40 px-4 py-3">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Үндсэн амрах хоног</span>
                                    <span className="font-semibold tabular-nums text-foreground">{editEmp.vacation_days} өдөр</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Нэмэгдэл хоног</span>
                                    <span className="font-semibold tabular-nums text-sky-600 dark:text-sky-400">+{editForm.data.vacation_extra_days} өдөр</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Нийт зөвшөөрөгдсөн</span>
                                    <span className="font-bold tabular-nums text-foreground">{previewAllowed} өдөр</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Ашигласан ({year})</span>
                                    <span className="font-semibold tabular-nums text-orange-500">{editEmp.used} өдөр</span>
                                </div>
                                <div className="flex justify-between border-t border-border/60 pt-2 text-sm">
                                    <span className="font-semibold text-foreground">Шинэ үлдэгдэл</span>
                                    <span className={`font-bold tabular-nums ${previewRemaining > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {previewRemaining} өдөр
                                    </span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                    <div className={`h-full rounded-full transition-all ${
                                        previewAllowed > 0 && editEmp.used / previewAllowed < 0.5 ? 'bg-emerald-500'
                                            : editEmp.used / previewAllowed < 0.8 ? 'bg-amber-500' : 'bg-red-500'
                                    }`} style={{ width: `${previewAllowed > 0 ? Math.min(100, (editEmp.used / previewAllowed) * 100) : 0}%` }} />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button type="submit" disabled={editForm.processing}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sky-500 to-sky-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-600/30 ring-1 ring-inset ring-white/20 transition-all hover:brightness-110 disabled:opacity-50 disabled:shadow-none">
                                    {editForm.processing
                                        ? <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                        : <CheckCircle2 className="size-4" />}
                                    Хадгалах
                                </button>
                                <button type="button" onClick={() => setEditId(null)}
                                    className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted">
                                    Болих
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{HR_PANEL_FX}</style>
        </AppLayout>
    );
}
