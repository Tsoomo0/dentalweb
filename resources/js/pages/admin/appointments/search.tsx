import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft, CalendarRange, CheckCircle2, ChevronDown, ChevronUp,
    Monitor, Search, User, UserCheck, X,
} from 'lucide-react';
import { type ReactElement, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Doctor   { id: number; name: string; specialization: string | null }
interface Appointment {
    id: number; appointment_number: string;
    patient_name: string; patient_phone: string; patient_email: string | null;
    doctor_id: number | null; doctor_name: string | null; doctor_spec: string | null;
    branch_id: number | null; branch_name: string | null;
    service: string | null; type: 'online' | 'in_person';
    appointment_date: string; appointment_time: string;
    appointment_time_end: string | null; formatted_date: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    notes: string | null; admin_notes: string | null;
    created_by: string | null; confirmed_by: string | null;
}
interface CreatorStat { role: string; total: number; pending: number; confirmed: number; completed: number; cancelled: number }
interface Props {
    appointments: Appointment[];
    creatorStats: Record<string, CreatorStat>;
    doctors: Doctor[];
    creators: string[];
    filters: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Цаг захиалга', href: '/admin/appointments' },
    { title: 'Хайлт', href: '/admin/appointments/search' },
];

const STATUS_COLORS: Record<string, { chip: string; dot: string; label: string }> = {
    pending:   { chip: 'bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-400', label: 'Хүлээгдэж байна' },
    confirmed: { chip: 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300',   dot: 'bg-green-500',  label: 'Баталгаажсан' },
    cancelled: { chip: 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',               dot: 'bg-red-400',    label: 'Цуцлагдсан' },
    completed: { chip: 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300',         dot: 'bg-blue-400',   label: 'Дууссан' },
};
const ALL_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
const TYPE_ICON: Record<string, ReactElement> = {
    online:    <Monitor className="size-3" />,
    in_person: <User className="size-3" />,
};

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function AppointmentsSearch({ appointments, creatorStats, doctors, creators, filters }: Props) {
    const [q,         setQ]         = useState(filters.q          ?? '');
    const [status,    setStatus]    = useState(filters.status     ?? '');
    const [type,      setType]      = useState(filters.type       ?? '');
    const [doctorId,  setDoctorId]  = useState(filters.doctor_id  ?? '');
    const [createdBy, setCreatedBy] = useState(filters.created_by ?? '');
    const [dateFrom,  setDateFrom]  = useState(filters.date_from  ?? '');
    const [dateTo,    setDateTo]    = useState(filters.date_to    ?? '');
    const [sortField, setSortField] = useState<keyof Appointment>('appointment_date');
    const [sortAsc,   setSortAsc]   = useState(false);
    const [changingStatus, setChangingStatus] = useState<number | null>(null);

    const { props } = usePage<{ flash?: { success?: string } }>();

    function doSearch(overrides?: Partial<Record<string, string>>) {
        const merged: Record<string, string> = {
            ...(q         ? { q }                    : {}),
            ...(status    ? { status }                : {}),
            ...(type      ? { type }                  : {}),
            ...(doctorId  ? { doctor_id: doctorId }   : {}),
            ...(createdBy ? { created_by: createdBy } : {}),
            ...(dateFrom  ? { date_from: dateFrom }   : {}),
            ...(dateTo    ? { date_to: dateTo }       : {}),
            ...overrides,
        };
        // remove keys with empty string from overrides
        Object.keys(merged).forEach(k => { if (merged[k] === '') delete merged[k]; });
        router.get('/admin/appointments/search', merged, { preserveState: true, preserveScroll: true });
    }

    function clearAll() {
        setQ(''); setStatus(''); setType(''); setDoctorId(''); setCreatedBy(''); setDateFrom(''); setDateTo('');
        router.get('/admin/appointments/search', {}, { preserveState: false });
    }

    function changeStatus(id: number, newStatus: string) {
        router.patch(`/admin/appointments/${id}/status`, { status: newStatus }, {
            preserveScroll: true,
            onSuccess: () => setChangingStatus(null),
        });
    }

    const hasFilter = q || status || type || doctorId || createdBy || dateFrom || dateTo;

    function toggleSort(field: keyof Appointment) {
        if (sortField === field) setSortAsc(a => !a);
        else { setSortField(field); setSortAsc(true); }
    }

    const sorted = [...appointments].sort((a, b) => {
        let av: string | number = a[sortField] ?? '';
        let bv: string | number = b[sortField] ?? '';
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return sortAsc ? -1 : 1;
        if (av > bv) return sortAsc ? 1 : -1;
        return 0;
    });

    function SortIcon({ field }: { field: keyof Appointment }) {
        if (sortField !== field) return <ChevronDown className="size-3 opacity-30" />;
        return sortAsc ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />;
    }

    /* ── filter chip ── */
    function FilterChip({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {label}: <span className="font-semibold">{value}</span>
                <button onClick={onClear} className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors">
                    <X className="size-2.5" />
                </button>
            </span>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Цаг захиалга — Хайлт" />

            <div className="flex h-full flex-col gap-3 p-4">

                {/* ── Top bar ── */}
                <div className="flex items-center gap-3">
                    <button onClick={() => router.get('/admin/appointments')}
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                        <ArrowLeft className="size-3.5" />
                        Буцах
                    </button>
                    <h1 className="text-sm font-semibold">Цаг захиалга — Хайлт &amp; Шүүлтүүр</h1>
                    {props.flash?.success && (
                        <span className="rounded-lg border border-green-300 bg-green-50 px-3 py-1 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            {props.flash.success}
                        </span>
                    )}
                    {appointments.length > 0 && (
                        <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {appointments.length} үр дүн
                        </span>
                    )}
                </div>

                {/* ── Search bar (1 row) ── */}
                <div className="flex items-center gap-2 rounded-xl border bg-card shadow-sm px-4 py-2.5">
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <input
                        type="text" value={q}
                        onChange={e => setQ(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && doSearch({ q })}
                        placeholder="Нэр, утас, и-мэйл, захиалгын дугаар хайх..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    />
                    {q && (
                        <button onClick={() => { setQ(''); doSearch({ q: '' }); }}
                            className="rounded-full p-1 hover:bg-muted transition-colors text-muted-foreground">
                            <X className="size-3.5" />
                        </button>
                    )}
                    <button onClick={() => doSearch({ q })}
                        className="shrink-0 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                        Хайх
                    </button>
                </div>

                {/* ── Filter chips row ── */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Status filter */}
                    <div className="flex items-center gap-1 rounded-lg border bg-card px-2 py-1 shadow-sm">
                        <span className="text-[10px] font-medium text-muted-foreground mr-1">Статус</span>
                        {ALL_STATUSES.map(s => (
                            <button key={s} onClick={() => { const nv = status === s ? '' : s; setStatus(nv); doSearch({ status: nv }); }}
                                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                                    status === s
                                        ? STATUS_COLORS[s].chip + ' border shadow-sm scale-105'
                                        : 'text-muted-foreground hover:bg-muted border border-transparent'
                                }`}>
                                <span className={`size-1.5 rounded-full ${STATUS_COLORS[s].dot}`} />
                                {STATUS_COLORS[s].label}
                            </button>
                        ))}
                    </div>

                    {/* Type filter */}
                    <div className="flex items-center gap-1 rounded-lg border bg-card px-2 py-1 shadow-sm">
                        <span className="text-[10px] font-medium text-muted-foreground mr-1">Төрөл</span>
                        {([['online', 'Онлайн', <Monitor className="size-3" key="o" />], ['in_person', 'Биечлэн', <User className="size-3" key="i" />]] as [string, string, ReactElement][]).map(([v, label, icon]) => (
                            <button key={v} onClick={() => { const nv = type === v ? '' : v; setType(nv); doSearch({ type: nv }); }}
                                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                                    type === v
                                        ? (v === 'online' ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border shadow-sm scale-105' : 'bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border shadow-sm scale-105')
                                        : 'text-muted-foreground hover:bg-muted border border-transparent'
                                }`}>
                                {icon}{label}
                            </button>
                        ))}
                    </div>

                    {/* Doctor filter */}
                    <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1 shadow-sm">
                        <span className="text-[10px] font-medium text-muted-foreground">Эмч</span>
                        <select value={doctorId} onChange={e => { setDoctorId(e.target.value); doSearch({ doctor_id: e.target.value }); }}
                            className="bg-card text-foreground text-xs py-0.5 outline-none cursor-pointer [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-900 dark:[&>option]:text-gray-100">
                            <option value="">Бүгд</option>
                            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        {doctorId && <button onClick={() => { setDoctorId(''); doSearch({ doctor_id: '' }); }} className="text-muted-foreground hover:text-foreground"><X className="size-3" /></button>}
                    </div>

                    {/* Creator filter */}
                    <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1 shadow-sm">
                        <UserCheck className="size-3.5 text-muted-foreground" />
                        <select value={createdBy} onChange={e => { setCreatedBy(e.target.value); doSearch({ created_by: e.target.value }); }}
                            className="bg-card text-foreground text-xs py-0.5 outline-none cursor-pointer [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-900 dark:[&>option]:text-gray-100">
                            <option value="">Бүх бүртгэгч</option>
                            {creators.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {createdBy && <button onClick={() => { setCreatedBy(''); doSearch({ created_by: '' }); }} className="text-muted-foreground hover:text-foreground"><X className="size-3" /></button>}
                    </div>

                    {/* Date range */}
                    <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 shadow-sm">
                        <CalendarRange className="size-3.5 shrink-0 text-muted-foreground" />
                        <input type="date" value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); doSearch({ date_from: e.target.value }); }}
                            className="bg-transparent text-xs outline-none text-foreground cursor-pointer w-[120px]" />
                        <span className="text-muted-foreground text-xs">–</span>
                        <input type="date" value={dateTo}
                            onChange={e => { setDateTo(e.target.value); doSearch({ date_to: e.target.value }); }}
                            className="bg-transparent text-xs outline-none text-foreground cursor-pointer w-[120px]" />
                        {(dateFrom || dateTo) && (
                            <button onClick={() => { setDateFrom(''); setDateTo(''); doSearch({ date_from: '', date_to: '' }); }} className="text-muted-foreground hover:text-foreground">
                                <X className="size-3" />
                            </button>
                        )}
                    </div>

                    {hasFilter && (
                        <button onClick={clearAll}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                            <X className="size-3" />
                            Бүгдийг цэвэрлэх
                        </button>
                    )}
                </div>

                <div className="flex flex-1 gap-3 overflow-hidden min-h-0">

                    {/* ── Results table ── */}
                    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card">
                        {sorted.length === 0 ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground py-20">
                                <Search className="size-10 opacity-20" />
                                <p className="text-sm">{hasFilter ? 'Тохирох захиалга олдсонгүй' : 'Хайлтын нөхцөл оруулна уу'}</p>
                            </div>
                        ) : (
                            <div className="overflow-auto flex-1">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm border-b">
                                        <tr>
                                            {([
                                                ['appointment_number', 'Дугаар'],
                                                ['patient_name',       'Үйлчлүүлэгч'],
                                                ['appointment_date',   'Огноо / Цаг'],
                                                ['doctor_name',        'Эмч'],
                                                ['type',               'Төрөл'],
                                                ['created_by',         'Бүртгэсэн'],
                                            ] as [keyof Appointment, string][]).map(([f, label]) => (
                                                <th key={f} onClick={() => toggleSort(f)}
                                                    className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap">
                                                    <span className="flex items-center gap-1">{label}<SortIcon field={f} /></span>
                                                </th>
                                            ))}
                                            <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Статус</th>
                                            <th className="w-12" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {sorted.map(a => (
                                            <tr key={a.id} className="hover:bg-muted/20 transition-colors group">
                                                <td className="px-4 py-3 font-mono text-[11px] font-bold text-foreground whitespace-nowrap">
                                                    {a.appointment_number}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-foreground truncate max-w-[160px]">{a.patient_name}</p>
                                                    <p className="text-muted-foreground mt-0.5">{a.patient_phone}</p>
                                                    {a.patient_email && <p className="text-muted-foreground/70 truncate max-w-[160px]">{a.patient_email}</p>}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <p className="font-semibold text-foreground">{a.formatted_date}</p>
                                                    <p className="text-muted-foreground mt-0.5 tabular-nums">
                                                        {a.appointment_time}{a.appointment_time_end ? `–${a.appointment_time_end}` : ''}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {a.doctor_name
                                                        ? <><p className="font-medium text-foreground truncate max-w-[130px]">{a.doctor_name}</p>
                                                            {a.doctor_spec && <p className="text-muted-foreground/70 truncate max-w-[130px]">{a.doctor_spec}</p>}</>
                                                        : <span className="text-muted-foreground/40">—</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium
                                                        ${a.type === 'online'
                                                            ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                                                            : 'bg-slate-50 border-slate-300 text-slate-700 dark:bg-slate-900/30 dark:border-slate-600 dark:text-slate-300'}`}>
                                                        {TYPE_ICON[a.type]}
                                                        {a.type === 'online' ? 'Онлайн' : 'Биечлэн'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {a.created_by
                                                        ? <span className="flex items-center gap-1 text-muted-foreground"><UserCheck className="size-3 shrink-0" />{a.created_by}</span>
                                                        : <span className="text-muted-foreground/30">—</span>}
                                                    {a.confirmed_by && (
                                                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 mt-0.5">
                                                            <CheckCircle2 className="size-3 shrink-0" />{a.confirmed_by}
                                                        </span>
                                                    )}
                                                </td>
                                                {/* ── Inline status changer ── */}
                                                <td className="px-4 py-3">
                                                    {changingStatus === a.id ? (
                                                        <div className="flex flex-col gap-1 rounded-lg border bg-popover shadow-md p-1 w-36">
                                                            {ALL_STATUSES.map(s => (
                                                                <button key={s} onClick={() => changeStatus(a.id, s)}
                                                                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-left transition-colors
                                                                        ${a.status === s ? STATUS_COLORS[s].chip + ' border' : 'hover:bg-muted'}`}>
                                                                    <span className={`size-2 rounded-full shrink-0 ${STATUS_COLORS[s].dot}`} />
                                                                    {STATUS_COLORS[s].label}
                                                                </button>
                                                            ))}
                                                            <button onClick={() => setChangingStatus(null)}
                                                                className="mt-0.5 rounded-md px-2.5 py-1 text-[10px] text-muted-foreground hover:bg-muted text-center">
                                                                Хаах
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => setChangingStatus(a.id)}
                                                            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all hover:shadow-sm hover:scale-105 ${STATUS_COLORS[a.status].chip}`}>
                                                            <span className={`size-1.5 rounded-full ${STATUS_COLORS[a.status].dot}`} />
                                                            {STATUS_COLORS[a.status].label}
                                                            <ChevronDown className="size-2.5 ml-0.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── Creator stats panel ── */}
                    <div className="w-64 shrink-0 flex flex-col gap-2">
                        <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                            <span className="flex items-center gap-2 text-sm font-semibold">
                                <UserCheck className="size-4 text-primary" />
                                Бүртгэгчид
                            </span>
                            <span className="text-xs text-muted-foreground">{Object.keys(creatorStats).length} хүн</span>
                        </div>

                        <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-15rem)]">
                            {Object.entries(creatorStats).length === 0 ? (
                                <div className="rounded-xl border bg-card flex flex-col items-center justify-center py-8 gap-1.5 text-muted-foreground">
                                    <UserCheck className="size-6 opacity-20" />
                                    <p className="text-xs">Мэдээлэл байхгүй</p>
                                </div>
                            ) : (
                                Object.entries(creatorStats)
                                    .sort((a, b) => b[1].total - a[1].total)
                                    .map(([name, s]) => {
                                        const isAdmin  = s.role === 'Админ';
                                        const isActive = createdBy === name;
                                        const pct = s.total > 0 ? Math.round((s.confirmed + s.completed) / s.total * 100) : 0;
                                        return (
                                            <button key={name}
                                                onClick={() => {
                                                    const nv = isActive ? '' : name;
                                                    setCreatedBy(nv);
                                                    doSearch({ created_by: nv });
                                                }}
                                                className={`rounded-xl border bg-card p-3.5 text-left transition-all hover:shadow-sm
                                                    ${isActive ? 'ring-2 ring-primary border-primary/40 bg-primary/5' : 'hover:bg-muted/40'}`}>
                                                <div className="flex items-center gap-2.5 mb-3">
                                                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white
                                                        ${isAdmin ? 'bg-violet-500' : 'bg-sky-500'}`}>
                                                        {name.slice(0, 1).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold truncate leading-tight">{name}</p>
                                                        <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium
                                                            ${isAdmin
                                                                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                                                                : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'}`}>
                                                            {s.role}
                                                        </span>
                                                    </div>
                                                    <span className={`shrink-0 text-lg font-bold tabular-nums ${isActive ? 'text-primary' : 'text-foreground'}`}>
                                                        {s.total}
                                                    </span>
                                                </div>
                                                {s.total > 0 && (
                                                    <div className="mb-2.5">
                                                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                                            <span>Гүйцэтгэл</span>
                                                            <span className="font-semibold">{pct}%</span>
                                                        </div>
                                                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex gap-1">
                                                    {[
                                                        { v: s.pending,   bg: 'bg-yellow-50 dark:bg-yellow-900/20', tc: 'text-yellow-800 dark:text-yellow-300', sc: 'text-yellow-600 dark:text-yellow-500', label: 'Хүлээгдэж' },
                                                        { v: s.confirmed, bg: 'bg-green-50 dark:bg-green-900/20',  tc: 'text-green-800 dark:text-green-300',   sc: 'text-green-600 dark:text-green-500',  label: 'Баталгаа' },
                                                        { v: s.completed, bg: 'bg-blue-50 dark:bg-blue-900/20',   tc: 'text-blue-800 dark:text-blue-300',    sc: 'text-blue-600 dark:text-blue-500',   label: 'Дууссан' },
                                                        { v: s.cancelled, bg: 'bg-red-50 dark:bg-red-900/20',    tc: 'text-red-700 dark:text-red-300',      sc: 'text-red-500',                       label: 'Цуцлагдсан' },
                                                    ].map(({ v, bg, tc, sc, label }) => (
                                                        <div key={label} className={`flex-1 rounded-lg ${bg} px-1.5 py-1 text-center`}>
                                                            <p className={`text-[11px] font-bold ${tc}`}>{v}</p>
                                                            <p className={`text-[9px] ${sc} leading-tight`}>{label}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </button>
                                        );
                                    })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
