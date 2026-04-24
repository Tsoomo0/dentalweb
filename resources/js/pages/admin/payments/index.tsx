import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    BadgeCheck, Calendar, CheckCircle2, ChevronLeft,
    ChevronRight, CreditCard, ExternalLink, Link2, Mail, RefreshCw,
    Search, TrendingUp, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Payment {
    id: number;
    appointment_number: string;
    patient_name: string;
    patient_phone: string;
    patient_email: string | null;
    doctor_name: string | null;
    appointment_date: string;
    appointment_time: string;
    appointment_time_end: string | null;
    payment_status: 'pending' | 'paid' | 'failed' | 'cancelled';
    payment_amount: number;
    qpay_invoice_id: string | null;
    meet_link: string | null;
    status: string;
    created_at: string;
}
interface Stats {
    total_revenue: number;
    paid_count: number;
    pending_count: number;
    failed_count: number;
    with_meet_link: number;
    today_revenue: number;
}
interface Paginator {
    data: Payment[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Props {
    payments: Paginator;
    stats: Stats;
    filters: Record<string, string>;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Төлбөр', href: '/admin/payments' },
];

const PSTATUS = {
    pending:   { label: 'Хүлээгдэж буй', chip: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-400/30', dot: 'bg-yellow-400' },
    paid:      { label: 'Төлөгдсөн',     chip: 'bg-green-500/10  text-green-600  dark:text-green-400  border-green-400/30',  dot: 'bg-green-500' },
    failed:    { label: 'Амжилтгүй',     chip: 'bg-red-500/10    text-red-600    dark:text-red-400    border-red-400/30',    dot: 'bg-red-500'   },
    cancelled: { label: 'Цуцлагдсан',    chip: 'bg-muted         text-muted-foreground                border-border',        dot: 'bg-muted-foreground' },
} as const;

/* ─── Detail Modal ───────────────────────────────────────────────────────── */
function DetailModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
    const ps = PSTATUS[payment.payment_status] ?? PSTATUS.pending;

    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, []);

    function handleConfirm() {
        if (!confirm(`#${payment.appointment_number} захиалгыг гар аргаар баталгаажуулах уу?`)) return;
        router.post(`/admin/payments/${payment.id}/confirm`, {}, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    }

    function handleRegenMeet() {
        if (!confirm('Meet линкийг дахин үүсгэж имэйл явуулах уу?')) return;
        router.post(`/admin/payments/${payment.id}/regenerate-meet`, {}, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between border-b px-5 py-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Захиалгын дугаар</p>
                        <p className="font-bold">{payment.appointment_number}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${ps.chip}`}>
                            <span className={`size-1.5 rounded-full ${ps.dot}`} />
                            {ps.label}
                        </span>
                        <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">

                    {/* Amount highlight */}
                    <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                        <span className="text-sm text-muted-foreground">Төлбөрийн дүн</span>
                        <span className="text-2xl font-bold">
                            {payment.payment_amount.toLocaleString()}
                            <span className="ml-1 text-sm font-normal text-muted-foreground">₮</span>
                        </span>
                    </div>

                    {/* Patient */}
                    <div className="rounded-xl bg-muted/40 px-4 py-3 space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Үйлчлүүлэгч</p>
                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                            <span className="text-muted-foreground">Нэр</span>
                            <span className="font-medium text-right">{payment.patient_name}</span>
                            <span className="text-muted-foreground">Утас</span>
                            <span className="font-medium text-right">{payment.patient_phone}</span>
                            {payment.patient_email && <>
                                <span className="text-muted-foreground">Имэйл</span>
                                <span className="font-medium text-right break-all">{payment.patient_email}</span>
                            </>}
                        </div>
                    </div>

                    {/* Appointment */}
                    <div className="rounded-xl bg-muted/40 px-4 py-3 space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Цаг захиалга</p>
                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                            <span className="text-muted-foreground">Эмч</span>
                            <span className="font-medium text-right">{payment.doctor_name ?? '—'}</span>
                            <span className="text-muted-foreground">Огноо</span>
                            <span className="font-medium text-right">{payment.appointment_date}</span>
                            <span className="text-muted-foreground">Цаг</span>
                            <span className="font-medium text-right">
                                {payment.appointment_time}
                                {payment.appointment_time_end && ` – ${payment.appointment_time_end}`}
                            </span>
                        </div>
                    </div>

                    {/* QPay invoice */}
                    {payment.qpay_invoice_id && (
                        <div className="rounded-xl bg-muted/40 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">QPay Invoice ID</p>
                            <p className="font-mono text-xs bg-background rounded-lg px-3 py-2 border">{payment.qpay_invoice_id}</p>
                        </div>
                    )}

                    {/* Meet link */}
                    {payment.meet_link && (
                        <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">Google Meet линк</p>
                            <a href={payment.meet_link} target="_blank" rel="noreferrer"
                                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors break-all">
                                <Link2 className="size-4 shrink-0" />
                                {payment.meet_link}
                                <ExternalLink className="size-3 shrink-0 ml-auto" />
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t px-5 py-4 space-y-2">
                    {payment.payment_status !== 'paid' && (
                        <button onClick={handleConfirm}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors">
                            <BadgeCheck className="size-4" />
                            Гар аргаар баталгаажуулах
                        </button>
                    )}
                    {payment.payment_status === 'paid' && (
                        <button onClick={handleRegenMeet}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
                            <RefreshCw className="size-4" />
                            Meet линк дахин үүсгэж имэйл явуулах
                        </button>
                    )}
                    <button onClick={onClose}
                        className="flex w-full items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                        Хаах
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function PaymentsIndex({ payments, stats, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.payment_status ?? '');
    const [detail, setDetail] = useState<Payment | null>(null);

    function applyFilter() {
        router.get('/admin/payments', {
            ...(search       ? { search }                           : {}),
            ...(statusFilter ? { payment_status: statusFilter }     : {}),
            ...(dateFrom     ? { date_from: dateFrom }              : {}),
            ...(dateTo       ? { date_to: dateTo }                  : {}),
        }, { preserveState: true, replace: true });
    }

    function clearFilter() {
        setSearch(''); setDateFrom(''); setDateTo(''); setStatusFilter('');
        router.get('/admin/payments', {}, { preserveState: false, replace: true });
    }

    const hasFilter = search || statusFilter || dateFrom || dateTo;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Төлбөр удирдах" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* Page title */}
                <div>
                    <h1 className="text-2xl font-bold">Төлбөр удирдах</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Онлайн зөвлөгөөний бүх төлбөрийн мэдээлэл</p>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <StatCard label="Нийт орлого"     value={`${stats.total_revenue.toLocaleString()}₮`}   icon={TrendingUp}  color="text-emerald-500" bg="bg-emerald-500/10" />
                    <StatCard label="Өнөөдрийн орлого" value={`${stats.today_revenue.toLocaleString()}₮`}  icon={Calendar}    color="text-blue-500"    bg="bg-blue-500/10"    />
                    <StatCard label="Төлөгдсөн"        value={`${stats.paid_count} захиалга`}              icon={BadgeCheck}  color="text-green-500"   bg="bg-green-500/10"   />
                    <StatCard label="Хүлээгдэж буй"   value={`${stats.pending_count} захиалга`}            icon={RefreshCw}   color="text-yellow-500"  bg="bg-yellow-500/10"  />
                    <StatCard label="Meet линктэй"     value={`${stats.with_meet_link} захиалга`}          icon={Link2}       color="text-violet-500"  bg="bg-violet-500/10"  />
                    <StatCard label="Амжилтгүй"        value={`${stats.failed_count} захиалга`}            icon={CreditCard}  color="text-red-500"     bg="bg-red-500/10"     />
                </div>

                {/* Filter */}
                <div className="rounded-xl border">
                    <div className="flex flex-wrap items-end gap-3 p-4">
                        {/* Search */}
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && applyFilter()}
                                placeholder="Нэр, имэйл, дугаар..."
                                className="border-input bg-background w-full rounded-lg border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        {/* Status filter */}
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="border-input bg-background rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="">Бүх төлөв</option>
                            <option value="pending">Хүлээгдэж буй</option>
                            <option value="paid">Төлөгдсөн</option>
                            <option value="failed">Амжилтгүй</option>
                            <option value="cancelled">Цуцлагдсан</option>
                        </select>

                        {/* Date range */}
                        <div className="flex items-center gap-2">
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                className="border-input bg-background rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <span className="text-muted-foreground text-sm">–</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                className="border-input bg-background rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <button onClick={applyFilter}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
                            Шүүх
                        </button>

                        {hasFilter && (
                            <button onClick={clearFilter}
                                className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
                                <X className="size-4" />
                                Цэвэрлэх
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-xl border">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] text-sm">
                            <thead>
                                <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <th className="px-5 py-3">Дугаар</th>
                                    <th className="px-4 py-3">Үйлчлүүлэгч</th>
                                    <th className="px-4 py-3">Эмч</th>
                                    <th className="px-4 py-3">Огноо / Цаг</th>
                                    <th className="px-4 py-3">Дүн</th>
                                    <th className="px-4 py-3">Төлөв</th>
                                    <th className="px-4 py-3">Meet</th>
                                    <th className="px-4 py-3 text-right">Үйлдэл</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {payments.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center text-muted-foreground">
                                            <CreditCard className="mx-auto mb-3 size-8 opacity-30" />
                                            Төлбөр олдсонгүй
                                        </td>
                                    </tr>
                                ) : payments.data.map(p => (
                                    <PaymentRow key={p.id} payment={p} onDetail={() => setDetail(p)} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {payments.last_page > 1 && (
                        <div className="flex items-center justify-between border-t px-5 py-3">
                            <p className="text-sm text-muted-foreground">
                                {payments.from}–{payments.to} / нийт {payments.total}
                            </p>
                            <div className="flex gap-1">
                                {payments.links.map((link, i) => (
                                    <PaginationLink key={i} link={link} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {detail && <DetailModal payment={detail} onClose={() => setDetail(null)} />}
        </AppLayout>
    );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function StatCard({
    label, value, icon: Icon, color, bg,
}: {
    label: string; value: string;
    icon: React.ElementType; color: string; bg: string;
}) {
    return (
        <div className="rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                <div className={`rounded-lg p-2 ${bg}`}>
                    <Icon className={`size-4 ${color}`} />
                </div>
            </div>
            <p className="text-xl font-bold">{value}</p>
        </div>
    );
}

function PaymentRow({ payment, onDetail }: { payment: Payment; onDetail: () => void }) {
    const ps = PSTATUS[payment.payment_status] ?? PSTATUS.pending;

    return (
        <tr className="hover:bg-muted/40 transition-colors">
            <td className="px-5 py-3">
                <span className="font-mono text-xs font-semibold">{payment.appointment_number}</span>
            </td>
            <td className="px-4 py-3">
                <p className="font-medium">{payment.patient_name}</p>
                {payment.patient_email && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Mail className="size-3" />
                        {payment.patient_email}
                    </p>
                )}
            </td>
            <td className="px-4 py-3 text-muted-foreground">{payment.doctor_name ?? '—'}</td>
            <td className="px-4 py-3">
                <p>{payment.appointment_date}</p>
                <p className="text-xs text-muted-foreground">
                    {payment.appointment_time}{payment.appointment_time_end ? ` – ${payment.appointment_time_end}` : ''}
                </p>
            </td>
            <td className="px-4 py-3 font-semibold">
                {payment.payment_amount.toLocaleString()} ₮
            </td>
            <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${ps.chip}`}>
                    <span className={`size-1.5 rounded-full ${ps.dot}`} />
                    {ps.label}
                </span>
            </td>
            <td className="px-4 py-3">
                {payment.meet_link ? (
                    <a href={payment.meet_link} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-500/20 dark:text-blue-400 transition-colors">
                        <Link2 className="size-3" />
                        Нээх
                    </a>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                )}
            </td>
            <td className="px-4 py-3 text-right">
                <button onClick={onDetail}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                    Дэлгэрэнгүй
                </button>
            </td>
        </tr>
    );
}

function PaginationLink({ link }: { link: { url: string | null; label: string; active: boolean } }) {
    const isLeft  = link.label.includes('laquo');
    const isRight = link.label.includes('raquo');
    const label   = isLeft ? <ChevronLeft className="size-4" /> : isRight ? <ChevronRight className="size-4" /> : link.label;

    const base = 'flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-colors';

    if (!link.url) {
        return (
            <span className={`${base} ${link.active ? 'bg-red-600 font-bold text-white' : 'text-muted-foreground'}`}>
                {label}
            </span>
        );
    }

    return (
        <Link href={link.url}
            className={`${base} ${link.active ? 'bg-red-600 font-bold text-white' : 'border hover:bg-muted'}`}>
            {label}
        </Link>
    );
}
