import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertCircle, CalendarDays, CheckCircle2, Clock,
    Download, FileSpreadsheet, MapPin, Pencil, Phone,
    Trash2, Users, X, XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface VacationRequest {
    id: number;
    employee_id: number;
    employee_name: string;
    employee_number: string;
    photo_url: string | null;
    position: string | null;
    branch: string | null;
    start_date: string;
    end_date: string;
    days: number;
    replacement: string | null;
    location_during_leave: string;
    emergency_phone: string;
    had_annual_leave_this_year: boolean;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
    vacation_days: number;
    vacation_extra_days: number;
    used_days_this_year: number;
    remaining_days: number;
}

interface Props { requests: VacationRequest[] }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/employees' },
    { title: 'Ээлжийн амралт', href: '/hr/vacation-requests' },
];

function Avatar({ url, name }: { url: string | null; name: string }) {
    const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return url
        ? <img src={url} alt={name} className="size-8 rounded-full object-cover shrink-0" />
        : <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500">{ini}</div>;
}

function StatusBadge({ status }: { status: string }) {
    const cfg = {
        pending:  { cls: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',  dot: 'bg-amber-400',  label: 'Хүлээгдэж байна' },
        approved: { cls: 'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400',  dot: 'bg-green-400',  label: 'Зөвшөөрсөн' },
        rejected: { cls: 'bg-red-50   text-red-600   dark:bg-red-950/30   dark:text-red-400',    dot: 'bg-red-400',    label: 'Цуцалсан' },
    }[status] ?? { cls: '', dot: '', label: status };
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
            <span className={`size-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function RemainingBadge({ remaining, allowed }: { remaining: number; allowed: number }) {
    const pct = allowed > 0 ? Math.round((remaining / allowed) * 100) : 0;
    const color = pct > 50 ? 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400'
        : pct > 20 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400'
        : 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400';
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
            {remaining}/{allowed} өдөр
        </span>
    );
}

export default function HrVacationRequests({ requests }: Props) {
    const [filter, setFilter]     = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [expanded, setExpanded] = useState<number | null>(null);
    const [rejectId, setRejectId] = useState<number | null>(null);
    const [balanceId, setBalanceId] = useState<number | null>(null);

    const rejectForm  = useForm({ rejection_reason: '' });
    const balanceForm = useForm({ vacation_days: 15, vacation_extra_days: 0 });

    useEffect(() => {
        const t = setInterval(() => router.reload({ only: ['requests'] }), 15_000);
        return () => clearInterval(t);
    }, []);

    const pending  = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    function approve(id: number) {
        router.patch(`/hr/vacation-requests/${id}/approve`, {}, { preserveScroll: true });
    }

    function destroy(id: number, employeeName: string) {
        if (!confirm(`${employeeName}-ийн ээлжийн амралтын хүсэлтийг бүрмөсөн устгах уу?`)) return;
        router.delete(`/hr/vacation-requests/${id}`, { preserveScroll: true });
    }

    function submitReject(e: React.FormEvent) {
        e.preventDefault();
        if (!rejectId) return;
        rejectForm.patch(`/hr/vacation-requests/${rejectId}/reject`, {
            preserveScroll: true,
            onSuccess: () => { setRejectId(null); rejectForm.reset(); },
        });
    }

    function openBalance(r: VacationRequest) {
        setBalanceId(r.employee_id);
        balanceForm.setData({
            vacation_days:       r.vacation_days,
            vacation_extra_days: r.vacation_extra_days,
        });
    }

    function submitBalance(e: React.FormEvent) {
        e.preventDefault();
        if (!balanceId) return;
        balanceForm.patch(`/hr/vacation-requests/employees/${balanceId}/balance`, {
            preserveScroll: true,
            onSuccess: () => { setBalanceId(null); balanceForm.reset(); },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ээлжийн амралт" />

            <div className="flex flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Ээлжийн амралтын хүсэлт</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Ажилтнуудын ээлжийн амралтыг удирдах</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {pending > 0 && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                                {pending} хүсэлт хүлээгдэж байна
                            </span>
                        )}
                        <a href="/hr/vacation-requests/export-excel"
                            className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                            <FileSpreadsheet className="size-3.5 text-green-600" /> Excel
                        </a>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2">
                    {([
                        { key: 'all',      label: 'Бүгд',           value: requests.length, icon: Users,        active: 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900' },
                        { key: 'pending',  label: 'Хүлээгдэж буй',  value: pending,         icon: Clock,        active: 'bg-amber-500 text-white' },
                        { key: 'approved', label: 'Зөвшөөрсөн',     value: approved,        icon: CheckCircle2, active: 'bg-green-600 text-white' },
                        { key: 'rejected', label: 'Цуцалсан',        value: rejected,        icon: XCircle,      active: 'bg-red-500 text-white' },
                    ] as const).map(s => (
                        <button key={s.key}
                            onClick={() => setFilter(s.key)}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                                filter === s.key
                                    ? s.active + ' shadow-sm'
                                    : 'border bg-card text-muted-foreground hover:text-foreground'
                            }`}>
                            <s.icon className="size-3.5" />
                            {s.label}
                            <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none ${
                                filter === s.key ? 'bg-white/20' : 'bg-muted text-muted-foreground'
                            }`}>{s.value}</span>
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="py-20 text-center">
                            <CalendarDays className="size-8 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">Ээлжийн амралтын хүсэлт байхгүй байна</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="border-b bg-muted/40">
                                <tr className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <th className="px-5 py-3 text-left">Ажилтан</th>
                                    <th className="px-4 py-3 text-left">Огноо / Хоног</th>
                                    <th className="px-4 py-3 text-left">Үлдсэн хоног</th>
                                    <th className="px-4 py-3 text-left">Статус</th>
                                    <th className="px-4 py-3 text-left">Илгээсэн</th>
                                    <th className="px-4 py-3 text-right">Үйлдэл</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filtered.map(r => (
                                    <>
                                        <tr key={r.id}
                                            className={`transition-colors hover:bg-muted/20 ${expanded === r.id ? 'bg-muted/20' : ''}`}>
                                            {/* Employee */}
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Avatar url={r.photo_url} name={r.employee_name} />
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-foreground truncate">{r.employee_name}</p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {[r.position, r.branch].filter(Boolean).join(' · ')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Date */}
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-foreground whitespace-nowrap">
                                                    {r.start_date} — {r.end_date}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{r.days} өдөр</p>
                                            </td>

                                            {/* Remaining */}
                                            <td className="px-4 py-3">
                                                <RemainingBadge remaining={r.remaining_days} allowed={r.vacation_days + r.vacation_extra_days} />
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {r.used_days_this_year} өдөр ашигласан
                                                </p>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>

                                            {/* Created */}
                                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{r.created_at}</td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <a href={`/hr/vacation-requests/${r.id}/pdf`} target="_blank"
                                                        className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                                                        <Download className="size-3" /> PDF
                                                    </a>
                                                    <button
                                                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                                                        className="rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                                                        {expanded === r.id ? 'Хаах' : 'Дэлгэрэнгүй'}
                                                    </button>
                                                    {r.status === 'pending' && (
                                                        <>
                                                            <button onClick={() => approve(r.id)}
                                                                className="rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors">
                                                                Зөвшөөрөх
                                                            </button>
                                                            <button onClick={() => setRejectId(r.id)}
                                                                className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors">
                                                                Цуцлах
                                                            </button>
                                                        </>
                                                    )}
                                                    <button onClick={() => destroy(r.id, r.employee_name)}
                                                        title="Бүрмөсөн устгах"
                                                        className="flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-red-950/10 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                                                        <Trash2 className="size-3" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded detail row */}
                                        {expanded === r.id && (
                                            <tr key={`${r.id}-detail`} className="bg-muted/10">
                                                <td colSpan={6} className="px-5 py-5 border-t border-border/40">
                                                    <div className="grid grid-cols-3 gap-6 text-sm">
                                                        <div className="space-y-3">
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Шалтгаан</p>
                                                                <p className="text-foreground leading-relaxed">{r.reason}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Орлох ажилтан</p>
                                                                <p className="text-foreground">{r.replacement ?? <span className="text-muted-foreground">Заагаагүй</span>}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Энэ жил авсан эсэх</p>
                                                                <p className="text-foreground">{r.had_annual_leave_this_year ? 'Тийм' : 'Үгүй'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                                                                    <MapPin className="size-3" /> Байршил
                                                                </p>
                                                                <p className="text-foreground">{r.location_during_leave}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                                                                    <Phone className="size-3" /> Яаралтай утас
                                                                </p>
                                                                <p className="text-foreground">{r.emergency_phone}</p>
                                                            </div>
                                                            {r.status !== 'pending' && r.reviewed_by && (
                                                                <div>
                                                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Шийдвэрлэсэн</p>
                                                                    <p className="text-foreground">{r.reviewed_by}</p>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">{r.reviewed_at}</p>
                                                                </div>
                                                            )}
                                                            {r.rejection_reason && (
                                                                <div className="flex items-start gap-1.5 rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2">
                                                                    <AlertCircle className="size-3.5 text-red-500 mt-0.5 shrink-0" />
                                                                    <p className="text-xs text-red-600 dark:text-red-400">{r.rejection_reason}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Balance panel */}
                                                        <div>
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Амралтын үлдэгдэл</p>
                                                            <div className="rounded-xl border bg-card p-4 space-y-2">
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-muted-foreground">Үндсэн хоног</span>
                                                                    <span className="font-semibold">{r.vacation_days} өдөр</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-muted-foreground">Нэмэлт хоног</span>
                                                                    <span className="font-semibold text-blue-600">{r.vacation_extra_days} өдөр</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-muted-foreground">Ашигласан ({new Date().getFullYear()})</span>
                                                                    <span className="font-semibold text-orange-600">{r.used_days_this_year} өдөр</span>
                                                                </div>
                                                                <div className="border-t pt-2 flex justify-between text-sm">
                                                                    <span className="font-semibold text-foreground">Үлдсэн</span>
                                                                    <span className={`font-bold ${r.remaining_days > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {r.remaining_days} өдөр
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={() => openBalance(r)}
                                                                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                                                                    <Pencil className="size-3" /> Хоног тохируулах
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <ToastContainer />

            {/* Reject modal */}
            {rejectId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border bg-card shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b">
                            <div>
                                <h3 className="font-bold text-foreground">Хүсэлт цуцлах</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {requests.find(r => r.id === rejectId)?.employee_name}
                                </p>
                            </div>
                            <button onClick={() => { setRejectId(null); rejectForm.reset(); }}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>
                        <form onSubmit={submitReject} className="p-5 space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                    Цуцлах шалтгаан <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={rejectForm.data.rejection_reason}
                                    onChange={e => rejectForm.setData('rejection_reason', e.target.value)}
                                    rows={4} autoFocus
                                    placeholder="Шалтгааныг дэлгэрэнгүй бичнэ үү..."
                                    className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                                />
                                {rejectForm.errors.rejection_reason && (
                                    <p className="mt-1 text-xs text-red-500">{rejectForm.errors.rejection_reason}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button type="submit"
                                    disabled={rejectForm.processing || !rejectForm.data.rejection_reason.trim()}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                                    {rejectForm.processing
                                        ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        : <XCircle className="size-4" />}
                                    Цуцлах
                                </button>
                                <button type="button"
                                    onClick={() => { setRejectId(null); rejectForm.reset(); }}
                                    className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                                    Болих
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Balance modal */}
            {balanceId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border bg-card shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b">
                            <div>
                                <h3 className="font-bold text-foreground">Амралтын хоног тохируулах</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {requests.find(r => r.employee_id === balanceId)?.employee_name}
                                </p>
                            </div>
                            <button onClick={() => setBalanceId(null)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>
                        <form onSubmit={submitBalance} className="p-5 space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                    Үндсэн амралтын хоног
                                </label>
                                <input
                                    type="number" min={0} max={365}
                                    value={balanceForm.data.vacation_days}
                                    onChange={e => balanceForm.setData('vacation_days', parseInt(e.target.value) || 0)}
                                    className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                    Нэмэлт хоног <span className="text-muted-foreground/60 font-normal">(admin-аас нэмэх)</span>
                                </label>
                                <input
                                    type="number" min={0} max={365}
                                    value={balanceForm.data.vacation_extra_days}
                                    onChange={e => balanceForm.setData('vacation_extra_days', parseInt(e.target.value) || 0)}
                                    className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                            <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Нийт зөвшөөрөгдсөн</span>
                                    <span className="font-bold text-foreground">
                                        {balanceForm.data.vacation_days + balanceForm.data.vacation_extra_days} өдөр
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button type="submit"
                                    disabled={balanceForm.processing}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                    {balanceForm.processing
                                        ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        : <CheckCircle2 className="size-4" />}
                                    Хадгалах
                                </button>
                                <button type="button"
                                    onClick={() => setBalanceId(null)}
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
