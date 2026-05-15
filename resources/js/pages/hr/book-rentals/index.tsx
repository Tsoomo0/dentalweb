import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    BookOpen, CheckCircle2, Clock, RotateCcw, Tag, Trash2, Undo2, Users, X, XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Rental {
    id: number;
    book_id: number;
    book_title: string;
    book_author: string | null;
    book_isbn: string | null;
    book_cover_url: string | null;
    category_name: string | null;
    category_color: string;
    employee_id: number;
    employee_name: string;
    employee_number: string;
    employee_photo: string | null;
    position: string | null;
    branch: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'returned';
    rejection_reason: string | null;
    notes: string | null;
    approved_by: string | null;
    approved_at: string | null;
    returned_at: string | null;
    created_at: string;
}
interface Props { rentals: Rental[] }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/employees' },
    { title: 'Номын сан', href: '/hr/books' },
    { title: 'Түрээсийн хүсэлт', href: '/hr/book-rentals' },
];

const COLOR_MAP: Record<string, string> = {
    blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    red:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    teal:   'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    gray:   'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
};

function StatusBadge({ status }: { status: string }) {
    const cfg = {
        pending:  { cls: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',  dot: 'bg-amber-400',  label: 'Хүлээгдэж байна' },
        approved: { cls: 'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400',  dot: 'bg-green-400',  label: 'Зөвшөөрсөн' },
        rejected: { cls: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',          dot: 'bg-red-400',    label: 'Цуцалсан' },
        returned: { cls: 'bg-gray-50 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',      dot: 'bg-gray-400',   label: 'Буцаасан' },
    }[status] ?? { cls: '', dot: '', label: status };
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
            <span className={`size-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
    const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return url
        ? <img src={url} alt={name} className="size-8 rounded-full object-cover shrink-0" />
        : <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500">{ini}</div>;
}

function BookCover({ url, title }: { url: string | null; title: string }) {
    const ini = title.slice(0, 2).toUpperCase();
    return url
        ? <img src={url} alt={title} className="size-10 rounded-lg object-cover shrink-0 border border-border/30" />
        : <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-600 text-xs font-bold border border-border/30">{ini}</div>;
}

export default function HrBookRentals({ rentals }: Props) {
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'returned'>('all');
    const [rejectId, setRejectId] = useState<number | null>(null);
    const rejectForm = useForm({ rejection_reason: '' });

    useEffect(() => {
        const t = setInterval(() => router.reload({ only: ['rentals'] }), 15_000);
        return () => clearInterval(t);
    }, []);

    const pending  = rentals.filter(r => r.status === 'pending').length;
    const approved = rentals.filter(r => r.status === 'approved').length;
    const rejected = rentals.filter(r => r.status === 'rejected').length;
    const returned = rentals.filter(r => r.status === 'returned').length;

    const filtered = filter === 'all' ? rentals : rentals.filter(r => r.status === filter);

    function approve(id: number) {
        router.patch(`/hr/book-rentals/${id}/approve`, {}, { preserveScroll: true });
    }

    function submitReject(e: React.FormEvent) {
        e.preventDefault();
        if (!rejectId) return;
        rejectForm.patch(`/hr/book-rentals/${rejectId}/reject`, {
            preserveScroll: true,
            onSuccess: () => { setRejectId(null); rejectForm.reset(); },
        });
    }

    function destroy(id: number, bookTitle: string, employeeName: string) {
        if (!confirm(`${employeeName} — "${bookTitle}" түрээсийн хүсэлтийг устгах уу?`)) return;
        router.delete(`/hr/book-rentals/${id}`, { preserveScroll: true });
    }

    function markReturned(id: number) {
        router.patch(`/hr/book-rentals/${id}/return`, {}, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Номын түрээсийн хүсэлт" />

            <div className="flex flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Номын түрээсийн хүсэлт</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Ажилтнуудын номын түрээсийн хүсэлтийг удирдах</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {pending > 0 && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                                {pending} хүсэлт хүлээгдэж байна
                            </span>
                        )}
                        <a href="/hr/books"
                            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                            <BookOpen className="size-3.5" /> Номын жагсаалт
                        </a>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2 flex-wrap">
                    {([
                        { key: 'all',      label: 'Бүгд',           value: rentals.length, icon: Users        },
                        { key: 'pending',  label: 'Хүлээгдэж буй',  value: pending,        icon: Clock        },
                        { key: 'approved', label: 'Зөвшөөрсөн',     value: approved,       icon: CheckCircle2 },
                        { key: 'rejected', label: 'Цуцалсан',        value: rejected,       icon: XCircle      },
                        { key: 'returned', label: 'Буцаасан',        value: returned,       icon: Undo2        },
                    ] as const).map(s => (
                        <button key={s.key}
                            onClick={() => setFilter(s.key)}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                                filter === s.key
                                    ? 'bg-violet-600 text-white shadow-sm'
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
                            <BookOpen className="size-8 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">Түрээсийн хүсэлт байхгүй байна</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="border-b bg-muted/40">
                                <tr className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <th className="px-5 py-3 text-left">НОМ</th>
                                    <th className="px-4 py-3 text-left">АЖИЛТАН</th>
                                    <th className="px-4 py-3 text-left">СТАТУС</th>
                                    <th className="px-4 py-3 text-left">ОГНОО</th>
                                    <th className="px-4 py-3 text-right">ҮЙЛДЭЛ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filtered.map(r => (
                                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                                        {/* Book */}
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <BookCover url={r.book_cover_url} title={r.book_title} />
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-foreground truncate max-w-[200px]">{r.book_title}</p>
                                                    {r.book_author && (
                                                        <p className="text-xs text-muted-foreground truncate">{r.book_author}</p>
                                                    )}
                                                    {r.category_name && (
                                                        <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${COLOR_MAP[r.category_color] ?? COLOR_MAP.blue}`}>
                                                            <Tag className="size-2.5" /> {r.category_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Employee */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Avatar url={r.employee_photo} name={r.employee_name} />
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-foreground truncate">{r.employee_name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {[r.position, r.branch].filter(Boolean).join(' · ')}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            <div>
                                                <StatusBadge status={r.status} />
                                                {r.status === 'rejected' && r.rejection_reason && (
                                                    <p className="mt-1 text-xs text-red-500 max-w-[150px] truncate">{r.rejection_reason}</p>
                                                )}
                                                {r.status === 'returned' && r.returned_at && (
                                                    <p className="mt-1 text-[11px] text-muted-foreground">{r.returned_at} буцаасан</p>
                                                )}
                                            </div>
                                        </td>

                                        {/* Date */}
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            <p>{r.created_at}</p>
                                            {r.approved_at && (
                                                <p className="mt-0.5 text-green-600 dark:text-green-400">
                                                    Зөвшөөрсөн: {r.approved_at}
                                                </p>
                                            )}
                                            {r.approved_by && (
                                                <p className="mt-0.5 text-muted-foreground/60">{r.approved_by}</p>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1.5">
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
                                                {r.status === 'approved' && (
                                                    <button onClick={() => markReturned(r.id)}
                                                        className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 border px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                                        <RotateCcw className="size-3" /> Буцааж авсан
                                                    </button>
                                                )}
                                                <button onClick={() => destroy(r.id, r.book_title, r.employee_name)}
                                                    title="Бүрмөсөн устгах"
                                                    className="flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-red-950/10 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                                                    <Trash2 className="size-3" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
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
                                    {rentals.find(r => r.id === rejectId)?.book_title}
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
                                    className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
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
