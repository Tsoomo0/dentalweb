import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    BadgeCheck,
    Banknote,
    BookOpen,
    Building2,
    CalendarCheck2,
    CalendarClock,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    CircleDollarSign,
    ClipboardList,
    Clock,
    MapPin,
    Plus,
    Stethoscope,
    TrendingUp,
    UserRound,
    Users,
    Video,
    XCircle,
} from 'lucide-react';
import {
    Bar,
    BarChart as ReBarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

/* ─── Types ─── */
interface Stats {
    appointments_today: number;
    appointments_pending: number;
    appointments_confirmed: number;
    appointments_cancelled: number;
    appointments_total: number;
    appointment_growth: number;
    apps_this_month: number;
    appointments_online: number;
    appointments_in_person: number;
    revenue_total: number;
    revenue_month: number;
    revenue_pending: number;
    doctors_total: number;
    doctors_active: number;
    treatments_total: number;
    treatments_active: number;
    categories_total: number;
    users_total: number;
    jobs_pending: number;
    jobs_total: number;
}

interface WeeklyPoint { date: string; day: string; count: number }
interface MonthlyRevenue { month: string; short: string; revenue: number }
interface Branch { id: number; name: string; doctors_count: number }

interface Appointment {
    id: number;
    appointment_number: string;
    patient_name: string;
    patient_phone: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
    type: 'online' | 'in_person';
    payment_status: string;
    payment_amount: number | null;
    service: string | null;
    doctor: { id: number; name: string } | null;
}

interface TodayAppointment {
    id: number;
    appointment_number: string;
    patient_name: string;
    appointment_time: string;
    status: string;
    type: 'online' | 'in_person';
    service: string | null;
    doctor: { id: number; name: string } | null;
}

interface JobApplication {
    id: number;
    last_name: string;
    first_name: string;
    email: string;
    status: string;
    created_at: string;
}

interface Props {
    stats: Stats;
    weekly_data: WeeklyPoint[];
    monthly_revenue: MonthlyRevenue[];
    status_breakdown: Record<string, number>;
    branches: Branch[];
    recent_appointments: Appointment[];
    today_appointments: TodayAppointment[];
    recent_jobs: JobApplication[];
}

/* ─── Helpers ─── */
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/admin/dashboard' }];

function fmt(n: number): string {
    return '₮' + n.toLocaleString('mn-MN');
}

function fmtShort(n: number): string {
    if (n >= 1_000_000) return '₮' + (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return '₮' + (n / 1_000).toFixed(0) + 'K';
    return fmt(n);
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'Хүлээгдэж буй', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    confirmed: { label: 'Баталгаажсан',  cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    completed: { label: 'Дууссан',        cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    cancelled: { label: 'Цуцалсан',       cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    no_show:   { label: 'Ирээгүй',        cls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' },
};

const JOB_STATUS: Record<string, { label: string; cls: string }> = {
    pending:     { label: 'Хүлээгдэж буй', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    reviewed:    { label: 'Хянасан',        cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    shortlisted: { label: 'Сонгогдсон',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    rejected:    { label: 'Татгалзсан',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; cls: string }> }) {
    const s = map[status] ?? { label: status, cls: 'bg-zinc-100 text-zinc-500' };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
            {s.label}
        </span>
    );
}

function TypeBadge({ type }: { type: 'online' | 'in_person' }) {
    return type === 'online' ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
            <Video className="size-3" />
            Онлайн
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
            <MapPin className="size-3" />
            Биечлэн
        </span>
    );
}

/* 7 өдрийн захиалга — Line chart */
function WeeklyChart({ data }: { data: WeeklyPoint[] }) {
    return (
        <ResponsiveContainer width="100%" height={56}>
            <LineChart data={data} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    formatter={(v: number) => [v + ' захиалга', '']}
                    labelFormatter={(l) => l}
                />
                <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#ef4444' }}
                    activeDot={{ r: 5 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

/* Сарын орлого — Bar chart */
function RevenueChart({ data }: { data: MonthlyRevenue[] }) {
    return (
        <ResponsiveContainer width="100%" height={160}>
            <ReBarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="short" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M' : v >= 1_000 ? (v / 1_000).toFixed(0) + 'K' : String(v)}
                />
                <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    formatter={(v: number) => ['₮' + v.toLocaleString('mn-MN'), 'Орлого']}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Bar dataKey="revenue" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </ReBarChart>
        </ResponsiveContainer>
    );
}

/* ─── Main Component ─── */
export default function AdminDashboard({
    stats,
    weekly_data,
    monthly_revenue,
    status_breakdown,
    branches,
    recent_appointments,
    today_appointments,
    recent_jobs,
}: Props) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('mn-MN', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });


    const totalStatusCount =
        (status_breakdown['pending'] ?? 0) +
        (status_breakdown['confirmed'] ?? 0) +
        (status_breakdown['completed'] ?? 0) +
        (status_breakdown['cancelled'] ?? 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">

                {/* ═══ HEADER ═══ */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Удирдлагын самбар</h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">{dateStr}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/admin/appointments/create"
                            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                        >
                            <CalendarClock className="size-4" />
                            Цаг захиалах
                        </Link>
                        <Link
                            href="/admin/treatments/create"
                            className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                            <Plus className="size-4" />
                            Шинэ эмчилгээ
                        </Link>
                    </div>
                </div>

                {/* ═══ KPI CARDS — row 1 ═══ */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    {/* Өнөөдрийн захиалга */}
                    <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-red-50 to-white p-5 dark:from-red-950/20 dark:to-background">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-muted-foreground text-sm font-medium">Өнөөдрийн захиалга</span>
                            <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                                <CalendarDays className="size-4 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold">{stats.appointments_today}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                            {stats.appointments_pending} хүлээгдэж буй · {stats.appointments_confirmed} баталгаажсан
                        </p>
                        <Link href="/admin/appointments" className="mt-3 flex items-center gap-1 text-xs text-red-600 hover:underline">
                            Харах <ArrowRight className="size-3" />
                        </Link>
                    </div>

                    {/* Сарын захиалга */}
                    <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-blue-50 to-white p-5 dark:from-blue-950/20 dark:to-background">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-muted-foreground text-sm font-medium">Энэ сарын захиалга</span>
                            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                                <CalendarCheck2 className="size-4 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold">{stats.apps_this_month}</p>
                        <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                            {stats.appointment_growth >= 0 ? (
                                <ArrowUpRight className="size-3 text-green-500" />
                            ) : (
                                <ArrowDownRight className="size-3 text-red-500" />
                            )}
                            <span className={stats.appointment_growth >= 0 ? 'text-green-600' : 'text-red-500'}>
                                {Math.abs(stats.appointment_growth)}%
                            </span>
                            өмнөх сартай харьцуулбал
                        </p>
                        <div className="mt-3">
                            <WeeklyChart data={weekly_data} />
                        </div>
                    </div>

                    {/* Энэ сарын орлого */}
                    <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-green-50 to-white p-5 dark:from-green-950/20 dark:to-background">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-muted-foreground text-sm font-medium">Энэ сарын орлого</span>
                            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                                <CircleDollarSign className="size-4 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold">{fmtShort(stats.revenue_month)}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                            {fmtShort(stats.revenue_pending)} хүлээгдэж буй
                        </p>
                        <Link href="/admin/payments" className="mt-3 flex items-center gap-1 text-xs text-green-600 hover:underline">
                            Харах <ArrowRight className="size-3" />
                        </Link>
                    </div>

                    {/* Ажлын анкет */}
                    <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-purple-50 to-white p-5 dark:from-purple-950/20 dark:to-background">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-muted-foreground text-sm font-medium">Ажлын анкет</span>
                            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                                <ClipboardList className="size-4 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-3xl font-bold">{stats.jobs_pending}</p>
                            <span className="text-muted-foreground mb-1 text-sm">/ {stats.jobs_total}</span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">шинэ анкет хүлээгдэж буй</p>
                        <Link href="/admin/job-applications" className="mt-3 flex items-center gap-1 text-xs text-purple-600 hover:underline">
                            Харах <ArrowRight className="size-3" />
                        </Link>
                    </div>
                </div>

                {/* ═══ KPI CARDS — row 2 ═══ */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    <div className="rounded-xl border p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-muted-foreground text-sm font-medium">Нийт орлого</span>
                            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
                                <Banknote className="size-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold">{fmtShort(stats.revenue_total)}</p>
                        <p className="text-muted-foreground mt-1 text-xs">{fmt(stats.revenue_total)} нийт</p>
                    </div>

                    {/* Онлайн vs Биечлэн */}
                    <div className="rounded-xl border p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-muted-foreground text-sm font-medium">Захиалгын төрөл</span>
                            <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-900/30">
                                <Video className="size-4 text-violet-600 dark:text-violet-400" />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div>
                                <p className="text-2xl font-bold text-violet-600">{stats.appointments_online}</p>
                                <p className="text-muted-foreground text-xs">Онлайн</p>
                            </div>
                            <div className="h-8 w-px bg-border" />
                            <div>
                                <p className="text-2xl font-bold text-sky-600">{stats.appointments_in_person}</p>
                                <p className="text-muted-foreground text-xs">Биечлэн</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-muted-foreground text-sm font-medium">Эмч нар</span>
                            <div className="rounded-lg bg-cyan-100 p-2 dark:bg-cyan-900/30">
                                <UserRound className="size-4 text-cyan-600 dark:text-cyan-400" />
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold">{stats.doctors_active}</p>
                            <span className="text-muted-foreground mb-0.5 text-sm">/ {stats.doctors_total}</span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">идэвхтэй эмч нар</p>
                    </div>

                    <div className="rounded-xl border p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-muted-foreground text-sm font-medium">Эмчилгээ</span>
                            <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                                <Stethoscope className="size-4 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold">{stats.treatments_active}</p>
                            <span className="text-muted-foreground mb-0.5 text-sm">/ {stats.treatments_total}</span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">{stats.categories_total} ангиллаас · {stats.users_total} хэрэглэгч</p>
                    </div>
                </div>

                {/* ═══ CHARTS + STATUS ROW ═══ */}
                <div className="grid gap-4 lg:grid-cols-3">

                    {/* Сарын орлогын график */}
                    <div className="rounded-xl border p-5 lg:col-span-2">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold">Сарын орлого <span className="text-xs font-normal text-muted-foreground">(онлайн зөвлөгөө)</span></h2>
                                <p className="text-muted-foreground text-xs">Сүүлийн 6 сар</p>
                            </div>
                            <TrendingUp className="text-muted-foreground size-4" />
                        </div>
                        <RevenueChart data={monthly_revenue} />
                    </div>

                    {/* Захиалгын статус */}
                    <div className="rounded-xl border p-5">
                        <div className="mb-4">
                            <h2 className="font-semibold">Захиалгын статус</h2>
                            <p className="text-muted-foreground text-xs">Нийт {stats.appointments_total}</p>
                        </div>
                        <div className="space-y-3">
                            {[
                                { key: 'pending',   label: 'Хүлээгдэж буй', color: 'bg-amber-400', icon: Clock },
                                { key: 'confirmed', label: 'Баталгаажсан',  color: 'bg-green-500', icon: CheckCircle2 },
                                { key: 'completed', label: 'Дууссан',        color: 'bg-blue-500',  icon: BadgeCheck },
                                { key: 'cancelled', label: 'Цуцалсан',       color: 'bg-red-400',   icon: XCircle },
                            ].map(({ key, label, color, icon: Icon }) => {
                                const count = status_breakdown[key] ?? 0;
                                const pct   = totalStatusCount > 0 ? (count / totalStatusCount) * 100 : 0;
                                return (
                                    <div key={key}>
                                        <div className="mb-1 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <Icon className="size-3 text-muted-foreground" />
                                                <span className="font-medium">{label}</span>
                                            </div>
                                            <span className="text-muted-foreground">{count}</span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className={`h-full rounded-full transition-all ${color}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Салбар эмч */}
                        {branches.length > 0 && (
                            <div className="mt-5 border-t pt-4">
                                <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Салбарын эмч</p>
                                <div className="space-y-2">
                                    {branches.map((b) => (
                                        <div key={b.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="size-3.5 text-muted-foreground" />
                                                <span className="text-xs truncate max-w-[120px]">{b.name}</span>
                                            </div>
                                            <span className="text-xs font-semibold text-muted-foreground">
                                                {b.doctors_count} эмч
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ TODAY APPOINTMENTS + QUICK ACTIONS ═══ */}
                <div className="grid gap-4 lg:grid-cols-3">

                    {/* Өнөөдрийн цагийн хуваарь */}
                    <div className="rounded-xl border lg:col-span-2">
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="size-4 text-red-500" />
                                <h2 className="font-semibold">Өнөөдрийн цагийн хуваарь</h2>
                                {stats.appointments_today > 0 && (
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                        {stats.appointments_today}
                                    </span>
                                )}
                            </div>
                            <Link href="/admin/appointments" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                Бүгдийг харах <ChevronRight className="size-3" />
                            </Link>
                        </div>

                        {today_appointments.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-10 text-center">
                                <CalendarClock className="size-8 text-muted-foreground/50" />
                                <p className="text-sm text-muted-foreground">Өнөөдөр захиалга байхгүй байна</p>
                                <Link href="/admin/appointments/create" className="text-xs text-red-600 hover:underline">
                                    + Цаг захиалах
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {today_appointments.map((a) => (
                                    <div key={a.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                                        <div className="flex min-w-[52px] flex-col items-center rounded-lg bg-muted px-2 py-1.5">
                                            <span className="text-xs font-bold leading-none">
                                                {a.appointment_time?.slice(0, 5) ?? '--:--'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="truncate text-sm font-medium">{a.patient_name}</p>
                                            <p className="text-muted-foreground truncate text-xs">
                                                {a.doctor?.name ?? '—'} · {a.service ?? '—'}
                                            </p>
                                        </div>
                                        <TypeBadge type={a.type} />
                                        <StatusBadge status={a.status} map={STATUS_MAP} />
                                        <Link href={`/admin/appointments/${a.id}`} className="text-muted-foreground hover:text-foreground">
                                            <ChevronRight className="size-4" />
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Хурдан үйлдлүүд */}
                    <div className="rounded-xl border p-5">
                        <h2 className="mb-4 font-semibold">Хурдан үйлдлүүд</h2>
                        <div className="grid gap-2">
                            {[
                                { href: '/admin/appointments/create', icon: CalendarClock, label: 'Цаг захиалах',       cls: 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30' },
                                { href: '/admin/doctors/create',      icon: UserRound,     label: 'Эмч нэмэх',         cls: 'text-cyan-600 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/20 dark:hover:bg-cyan-950/30' },
                                { href: '/admin/treatments/create',   icon: Stethoscope,   label: 'Эмчилгээ нэмэх',    cls: 'text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20 dark:hover:bg-orange-950/30' },
                                { href: '/admin/articles/create',     icon: BookOpen,      label: 'Нийтлэл бичих',     cls: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30' },
                                { href: '/admin/branches/create',     icon: Building2,     label: 'Салбар нэмэх',      cls: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30' },
                                { href: '/admin/gallery/create',      icon: ClipboardList, label: 'Галерей нэмэх',     cls: 'text-pink-600 bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/20 dark:hover:bg-pink-950/30' },
                            ].map(({ href, icon: Icon, label, cls }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${cls}`}
                                >
                                    <Icon className="size-4" />
                                    {label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ═══ RECENT APPOINTMENTS TABLE ═══ */}
                <div className="rounded-xl border">
                    <div className="flex items-center justify-between border-b px-5 py-4">
                        <div className="flex items-center gap-2">
                            <CalendarClock className="size-4 text-muted-foreground" />
                            <h2 className="font-semibold">Сүүлийн захиалгууд</h2>
                        </div>
                        <Link href="/admin/appointments" className="flex items-center gap-1 text-xs text-red-600 hover:underline">
                            Бүгдийг харах <ArrowRight className="size-3" />
                        </Link>
                    </div>

                    {recent_appointments.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10">
                            <CalendarClock className="size-8 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">Захиалга байхгүй байна</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b bg-muted/30">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Дугаар</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Өвчтөн</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Эмч</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Огноо</th>
                                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Төрөл</th>
                                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Статус</th>
                                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Төлбөр</th>
                                        <th className="px-5 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {recent_appointments.map((a) => (
                                        <tr key={a.id} className="transition-colors hover:bg-muted/30">
                                            <td className="px-5 py-3">
                                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                                                    {a.appointment_number}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <p className="font-medium">{a.patient_name}</p>
                                                <p className="text-muted-foreground text-xs">{a.patient_phone}</p>
                                            </td>
                                            <td className="px-5 py-3 text-muted-foreground">
                                                {a.doctor?.name ?? '—'}
                                            </td>
                                            <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                                                {a.appointment_date} {a.appointment_time?.slice(0, 5) ?? ''}
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <TypeBadge type={a.type} />
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <StatusBadge status={a.status} map={STATUS_MAP} />
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                {a.type === 'online' ? (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                            a.payment_status === 'paid'
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                                                        }`}>
                                                            {a.payment_status === 'paid' ? 'Төлсөн' : 'Хүлээгдэж буй'}
                                                        </span>
                                                        {a.payment_amount ? (
                                                            <span className="text-xs font-medium text-muted-foreground">{fmtShort(a.payment_amount)}</span>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <Link
                                                    href={`/admin/appointments/${a.id}`}
                                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                                >
                                                    Дэлгэрэнгүй <ChevronRight className="size-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ═══ RECENT JOB APPLICATIONS ═══ */}
                {recent_jobs.length > 0 && (
                    <div className="rounded-xl border">
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="size-4 text-muted-foreground" />
                                <h2 className="font-semibold">Сүүлийн ажлын анкетууд</h2>
                                {stats.jobs_pending > 0 && (
                                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                        {stats.jobs_pending} шинэ
                                    </span>
                                )}
                            </div>
                            <Link href="/admin/job-applications" className="flex items-center gap-1 text-xs text-red-600 hover:underline">
                                Бүгдийг харах <ArrowRight className="size-3" />
                            </Link>
                        </div>
                        <div className="divide-y">
                            {recent_jobs.map((j) => (
                                <div key={j.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                                        {j.last_name?.[0] ?? '?'}{j.first_name?.[0] ?? ''}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate text-sm font-medium">{j.last_name} {j.first_name}</p>
                                        <p className="text-muted-foreground truncate text-xs">{j.email}</p>
                                    </div>
                                    <StatusBadge status={j.status} map={JOB_STATUS} />
                                    <Link href={`/admin/job-applications/${j.id}`} className="text-muted-foreground hover:text-foreground">
                                        <ChevronRight className="size-4" />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </AppLayout>
    );
}
