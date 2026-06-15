import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { AlertCircle, CalendarDays, CheckCircle2, Clock, Download, FileSpreadsheet, Trash2, Users, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LeaveRequest {
    id: number;
    employee_name: string; employee_number: string;
    photo_url: string | null;
    position: string | null; branch: string | null;
    start_date: string; end_date: string; days: number;
    leave_type: string; reason: string;
    replacement: string | null;
    makeup_date: string | null; makeup_note: string | null;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null;
    reviewed_by: string | null; reviewed_at: string | null;
    created_at: string;
}
interface Props { requests: LeaveRequest[] }

const LEAVE_TYPES: Record<string, string> = { sick: 'Өвчтэй', personal: 'Хувийн' };

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/employees' },
    { title: 'Чөлөөний хүсэлт', href: '/hr/leave-requests' },
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

export default function HrLeaveRequests({ requests }: Props) {
    const [filter, setFilter]     = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [expanded, setExpanded] = useState<number | null>(null);
    const [rejectId, setRejectId] = useState<number | null>(null);
    const rejectForm = useForm({ rejection_reason: '' });

    useEffect(() => {
        const t = setInterval(() => router.reload({ only: ['requests'] }), 15_000);
        return () => clearInterval(t);
    }, []);

    const pending  = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    function approve(id: number) {
        router.patch(`/hr/leave-requests/${id}/approve`, {}, { preserveScroll: true });
    }
    function destroy(id: number, employeeName: string) {
        if (!confirm(`${employeeName}-ийн чөлөөний хүсэлтийг бүрмөсөн устгах уу?`)) return;
        router.delete(`/hr/leave-requests/${id}`, { preserveScroll: true });
    }
    function submitReject(e: React.FormEvent) {
        e.preventDefault();
        if (!rejectId) return;
        rejectForm.patch(`/hr/leave-requests/${rejectId}/reject`, {
            preserveScroll: true,
            onSuccess: () => { setRejectId(null); rejectForm.reset(); },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Чөлөөний хүсэлт" />

            <div className="flex flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Чөлөөний хүсэлт</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Ажилтнуудын чөлөөний хүсэлтийг удирдах</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {pending > 0 && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                                {pending} хүсэлт хүлээгдэж байна
                            </span>
                        )}
                        <a href="/hr/leave-requests/export-excel"
                            className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                            <FileSpreadsheet className="size-3.5 text-green-600" /> Excel
                        </a>
                    </div>
                </div>

                {/* Stats + filter */}
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
                                    : 'border bg-card text-muted-foreground hover:text-foreground hover:border-border'
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
                            <p className="text-sm text-muted-foreground">Чөлөөний хүсэлт байхгүй байна</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="border-b bg-muted/40">
                                <tr className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <th className="px-5 py-3 text-left">Ажилтан</th>
                                    <th className="px-4 py-3 text-left">Огноо</th>
                                    <th className="px-4 py-3 text-left">Төрөл</th>
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

                                            {/* Type */}
                                            <td className="px-4 py-3">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                    r.leave_type === 'sick'
                                                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                                                        : 'bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400'
                                                }`}>{LEAVE_TYPES[r.leave_type] ?? r.leave_type}</span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <StatusBadge status={r.status} />
                                            </td>

                                            {/* Created */}
                                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                {r.created_at}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <a href={`/hr/leave-requests/${r.id}/pdf`} target="_blank"
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

                                        {/* Expanded row */}
                                        {expanded === r.id && (
                                            <tr key={`${r.id}-detail`} className="bg-muted/10">
                                                <td colSpan={6} className="px-5 py-4 border-t border-border/40">
                                                    <div className="grid grid-cols-3 gap-6 text-sm">
                                                        <div>
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Шалтгаан</p>
                                                            <p className="text-foreground leading-relaxed">{r.reason}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Орлох ажилтан</p>
                                                            <p className="text-foreground">{r.replacement ?? <span className="text-muted-foreground">Заагаагүй</span>}</p>
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 mt-3">Нөхөж ажиллах өдөр</p>
                                                            {r.makeup_date ? (
                                                                <>
                                                                    <p className="text-foreground">{r.makeup_date}</p>
                                                                    {r.makeup_note && <p className="text-xs text-muted-foreground mt-0.5">{r.makeup_note}</p>}
                                                                </>
                                                            ) : <span className="text-muted-foreground">Заагаагүй</span>}
                                                        </div>
                                                        <div>
                                                            {r.status !== 'pending' && r.reviewed_by && (
                                                                <>
                                                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Шийдвэрлэсэн</p>
                                                                    <p className="text-foreground">{r.reviewed_by}</p>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">{r.reviewed_at}</p>
                                                                </>
                                                            )}
                                                            {r.rejection_reason && (
                                                                <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2">
                                                                    <AlertCircle className="size-3.5 text-red-500 mt-0.5 shrink-0" />
                                                                    <p className="text-xs text-red-600 dark:text-red-400">{r.rejection_reason}</p>
                                                                </div>
                                                            )}
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
        </AppLayout>
    );
}
