import AppLayout from '@/layouts/app-layout';
import { Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle, BookOpen, CalendarCheck, CalendarDays,
    ChevronRight, Clock, MessageSquare, Package,
    Users, Wallet,
} from 'lucide-react';
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid,
    Cell, Legend, Pie, PieChart, ResponsiveContainer,
    Tooltip, XAxis, YAxis,
} from 'recharts';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Stats {
    total_employees: number;
    pending_leave: number;
    pending_vacation: number;
    pending_feedback: number;
    pending_book_rental: number;
    equipment_out: number;
    by_status: Record<string, number>;
}
interface TodayAttendance {
    scheduled: number; checked_in: number; checked_out: number;
    not_checked_in: number; late: number;
}
interface PendingLeave {
    id: number; employee: string; position: string | null;
    leave_type: string; start_date: string; end_date: string; created_at: string;
}
interface PendingVacation {
    id: number; employee: string; position: string | null;
    start_date: string; end_date: string; created_at: string;
}
interface PendingRental {
    id: number; employee: string; book: string; created_at: string;
}
interface ProbationAlert {
    id: number; name: string; position: string | null;
    branch: string | null; probation_end_date: string;
}
interface Warning {
    id: number; employee: string; type: string;
    severity: string; title: string; incident_date: string;
}
interface Feedback {
    id: number; employee: string; type: string; subject: string; created_at: string;
}
interface PageProps {
    stats: Stats;
    today_shifts: Record<string, number>;
    pending_leave: PendingLeave[];
    pending_vacation: PendingVacation[];
    pending_rentals: PendingRental[];
    probation_alerts: ProbationAlert[];
    active_warnings: Warning[];
    recent_feedback: Feedback[];
    latest_payroll: { id: number; label: string; status: string; year: number; month: number } | null;
    today: string;
    today_attendance: TodayAttendance;
    chart_by_branch: { name: string; count: number }[];
    chart_by_position: { name: string; count: number }[];
    chart_request_trend: { label: string; leave: number; vacation: number }[];
    chart_payroll_trend: { label: string; total: number }[];
    chart_leave_status: { name: string; value: number }[];
    [key: string]: unknown;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const SHIFT_LABELS: Record<string, string> = {
    morning: 'Өглөө', afternoon: 'Орой', full: 'Бүтэн', off: 'Чөлөөт',
};
const SHIFT_COLOR: Record<string, string> = {
    morning:   'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    afternoon: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    full:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    off:       'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};
const SHIFT_DOT: Record<string, string> = {
    morning: 'bg-sky-500', afternoon: 'bg-orange-500', full: 'bg-emerald-500', off: 'bg-gray-400',
};
const SEV_COLOR: Record<string, string> = {
    low:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    high:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const FEEDBACK_TYPE: Record<string, string> = {
    suggestion: 'Санал', request: 'Хүсэлт', complaint: 'Гомдол',
};
const LEAVE_TYPE: Record<string, string> = {
    sick: 'Өвчний', family: 'Гэр бүлийн', personal: 'Хувийн', other: 'Бусад',
};
const PAYROLL_STATUS: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Ноорог', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' },
    final: { label: 'Баталсан', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
};
const STATUS_LABEL: Record<string, string> = {
    pending: 'Хүлээгдэж буй', approved: 'Зөвшөөрсөн', rejected: 'Татгалзсан',
};
const PIE_COLORS = ['#f59e0b', '#10b981', '#ef4444', '#6366f1'];
const BAR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

function daysBetween(a: string, b: string) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/* ─── Shared card wrapper ────────────────────────────────────────────────── */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <div className={`rounded-2xl border bg-card p-4 ${className}`}>{children}</div>;
}

function StatCard({ icon: Icon, label, value, href, color, sub }:
    { icon: React.ElementType; label: string; value: number; href: string; color: string; sub?: string }) {
    return (
        <Link href={href} className="rounded-2xl border bg-card hover:shadow-md transition-all p-5 flex items-center gap-4 group">
            <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="size-6" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-2xl font-black text-gray-900 dark:text-gray-100 leading-none">{value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{label}</p>
                {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
            </div>
            <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
        </Link>
    );
}

function SectionHeader({ title, href, count }: { title: string; href?: string; count?: number }) {
    return (
        <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                {title}
                {!!count && count > 0 && (
                    <span className="inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1">
                        {count}
                    </span>
                )}
            </h2>
            {href && (
                <Link href={href} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                    Бүгдийг харах <ChevronRight className="size-3" />
                </Link>
            )}
        </div>
    );
}

/* ─── Custom tooltip ─────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border bg-card shadow-lg px-3 py-2 text-xs">
            {label && <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</p>}
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="size-2 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-muted-foreground">{p.name}:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{p.value.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function HrDashboard() {
    const {
        stats, today_shifts, today, today_attendance,
        pending_leave, pending_vacation, pending_rentals,
        probation_alerts, active_warnings, recent_feedback,
        latest_payroll,
        chart_by_branch, chart_by_position,
        chart_request_trend, chart_payroll_trend, chart_leave_status,
    } = usePage<PageProps>().props;

    const todayDate = new Date(today);
    const dateLabel = `${todayDate.getFullYear()} оны ${todayDate.getMonth() + 1}-р сарын ${todayDate.getDate()}`;
    const totalScheduled = Object.values(today_shifts).reduce((s, n) => s + n, 0);
    const totalPendingApprovals = stats.pending_leave + stats.pending_vacation + stats.pending_book_rental;

    return (
        <AppLayout breadcrumbs={[{ title: 'HR', href: '/hr/employees' }, { title: 'Хянах самбар', href: '/hr/dashboard' }]}>
            <div className="p-4 md:p-6 space-y-6">

                {/* ── Header ── */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">HR Хянах самбар</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
                    </div>
                    {totalPendingApprovals > 0 && (
                        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400">
                            {totalPendingApprovals} хүлээгдэж буй хүсэлт
                        </div>
                    )}
                </div>

                {/* ── Stat cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard icon={Users}        label="Нийт ажилтан"      value={stats.total_employees}     href="/hr/employees"         color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" />
                    <StatCard icon={CalendarDays}  label="Чөлөоний хүсэлт"  value={stats.pending_leave}       href="/hr/leave-requests"    color="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400" sub={stats.pending_leave > 0 ? 'Хүлээгдэж буй' : undefined} />
                    <StatCard icon={CalendarCheck} label="Ээлжийн амралт"   value={stats.pending_vacation}    href="/hr/vacation-requests"  color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" sub={stats.pending_vacation > 0 ? 'Хүлээгдэж буй' : undefined} />
                    <StatCard icon={MessageSquare} label="Санал хүсэлт"     value={stats.pending_feedback}    href="/hr/feedback"           color="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400" />
                    <StatCard icon={BookOpen}      label="Номын хүсэлт"     value={stats.pending_book_rental} href="/hr/book-rentals"       color="bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400" />
                    <StatCard icon={Package}       label="Гаргасан тоног"   value={stats.equipment_out}       href="/hr/equipment"          color="bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400" />
                </div>

                {/* ── Charts row 1 ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Requests over 6 months - Area chart */}
                    <Card className="lg:col-span-2">
                        <SectionHeader title="Сүүлийн 6 сарын хүсэлтийн тоо" />
                        {chart_request_trend.every(d => d.leave === 0 && d.vacation === 0) ? (
                            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Өгөгдөл байхгүй</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={chart_request_trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradLeave" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradVac" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }}
                                        formatter={v => v === 'leave' ? 'Чөлөо' : 'Амралт'} />
                                    <Area type="monotone" dataKey="leave" name="leave" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradLeave)" dot={{ r: 3, fill: '#8b5cf6' }} />
                                    <Area type="monotone" dataKey="vacation" name="vacation" stroke="#10b981" strokeWidth={2} fill="url(#gradVac)" dot={{ r: 3, fill: '#10b981' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </Card>

                    {/* Leave status pie */}
                    <Card>
                        <SectionHeader title="Чөлөоний хүсэлтийн статус" />
                        {chart_leave_status.length === 0 ? (
                            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Өгөгдөл байхгүй</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={chart_leave_status} cx="50%" cy="50%" innerRadius={52} outerRadius={78}
                                        paddingAngle={3} dataKey="value" nameKey="name">
                                        {chart_leave_status.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0];
                                            return (
                                                <div className="rounded-xl border bg-card shadow-lg px-3 py-2 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="size-2 rounded-full" style={{ background: d.payload.fill }} />
                                                        <span>{STATUS_LABEL[d.name as string] ?? d.name}</span>
                                                        <span className="font-bold">{d.value}</span>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }}
                                        formatter={v => STATUS_LABEL[v] ?? v} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </div>

                {/* ── Charts row 2 ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Employees by branch */}
                    <Card>
                        <SectionHeader title="Салбараар ажилтны тоо" href="/hr/employees" />
                        {chart_by_branch.length === 0 ? (
                            <div className="h-52 flex items-center justify-center text-xs text-muted-foreground">Өгөгдөл байхгүй</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={Math.max(180, chart_by_branch.length * 42)}>
                                <BarChart data={chart_by_branch} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                    <Bar dataKey="count" name="Ажилтан" radius={[0, 6, 6, 0]} maxBarSize={22}>
                                        {chart_by_branch.map((_, i) => (
                                            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Card>

                    {/* Employees by position */}
                    <Card>
                        <SectionHeader title="Албан тушаалаар ажилтны тоо" href="/hr/positions" />
                        {chart_by_position.length === 0 ? (
                            <div className="h-52 flex items-center justify-center text-xs text-muted-foreground">Өгөгдөл байхгүй</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={Math.max(180, chart_by_position.length * 36)}>
                                <BarChart data={chart_by_position} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                    <Bar dataKey="count" name="Ажилтан" radius={[0, 6, 6, 0]} maxBarSize={20}>
                                        {chart_by_position.map((_, i) => (
                                            <Cell key={i} fill={BAR_COLORS[(i + 2) % BAR_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </div>

                {/* Payroll trend */}
                {chart_payroll_trend.length > 1 && (
                    <Card>
                        <SectionHeader title="Цалингийн нийт олговор (баталсан тооцоо)" href="/hr/payroll" />
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={chart_payroll_trend} margin={{ top: 4, right: 4, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradPayroll" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                                    tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                                <Tooltip content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    return (
                                        <div className="rounded-xl border bg-card shadow-lg px-3 py-2 text-xs">
                                            <p className="font-semibold mb-1">{label}</p>
                                            <p className="text-blue-600 font-bold">{Number(payload[0].value).toLocaleString()}₮</p>
                                        </div>
                                    );
                                }} />
                                <Area type="monotone" dataKey="total" name="Нийт олговор" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradPayroll)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                )}

                {/* ── Main content grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* LEFT: Pending approvals */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* Leave requests */}
                        <Card>
                            <SectionHeader title="Чөлөоний хүсэлт" href="/hr/leave-requests" count={stats.pending_leave} />
                            {pending_leave.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-4 text-center">Хүлээгдэж буй хүсэлт байхгүй</p>
                            ) : (
                                <div className="space-y-2">
                                    {pending_leave.map(r => (
                                        <div key={r.id} className="flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2.5">
                                            <div className="size-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-700 dark:text-violet-300 font-black text-xs shrink-0">
                                                {r.employee?.charAt(0) ?? '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{r.employee}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{r.position}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
                                                    {LEAVE_TYPE[r.leave_type] ?? r.leave_type}
                                                </span>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">{r.start_date} – {r.end_date}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        {/* Vacation requests */}
                        <Card>
                            <SectionHeader title="Ээлжийн амралтын хүсэлт" href="/hr/vacation-requests" count={stats.pending_vacation} />
                            {pending_vacation.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-4 text-center">Хүлээгдэж буй хүсэлт байхгүй</p>
                            ) : (
                                <div className="space-y-2">
                                    {pending_vacation.map(r => (
                                        <div key={r.id} className="flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2.5">
                                            <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-black text-xs shrink-0">
                                                {r.employee?.charAt(0) ?? '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{r.employee}</p>
                                                <p className="text-[10px] text-muted-foreground">{r.position}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{r.start_date} – {r.end_date}</p>
                                                <p className="text-[10px] text-muted-foreground">{daysBetween(r.start_date, r.end_date)} хоног</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        {/* Feedback */}
                        {recent_feedback.length > 0 && (
                            <Card>
                                <SectionHeader title="Шийдвэрлэгдээгүй санал хүсэлт" href="/hr/feedback" count={stats.pending_feedback} />
                                <div className="space-y-2">
                                    {recent_feedback.map(f => (
                                        <div key={f.id} className="flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2.5">
                                            <div className="size-8 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-700 dark:text-orange-300 shrink-0">
                                                <MessageSquare className="size-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{f.subject}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{f.employee}</p>
                                            </div>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 shrink-0">
                                                {FEEDBACK_TYPE[f.type] ?? f.type}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* RIGHT: sidebar panels */}
                    <div className="space-y-4">

                        {/* Today's attendance */}
                        <Link href="/hr/attendance" className="block no-underline">
                            <Card className="hover:shadow-md transition-all cursor-pointer">
                                <SectionHeader title="Өнөөдрийн ирц" href="/hr/attendance" />
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-emerald-500" />
                                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Бүртгэсэн</span>
                                        </div>
                                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{today_attendance.checked_in} <span className="text-[10px] font-normal opacity-70">ажилтан</span></span>
                                    </div>
                                    {today_attendance.late > 0 && (
                                        <div className="flex items-center justify-between rounded-xl bg-red-50 dark:bg-red-950/30 px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="size-2 rounded-full bg-red-500" />
                                                <span className="text-xs font-semibold text-red-600">Хоцорсон</span>
                                            </div>
                                            <span className="text-sm font-black text-red-600">{today_attendance.late} <span className="text-[10px] font-normal opacity-70">ажилтан</span></span>
                                        </div>
                                    )}
                                    {today_attendance.not_checked_in > 0 && (
                                        <div className="flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="size-2 rounded-full bg-amber-500" />
                                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Бүртгэгдээгүй</span>
                                            </div>
                                            <span className="text-sm font-black text-amber-700 dark:text-amber-400">{today_attendance.not_checked_in} <span className="text-[10px] font-normal opacity-70">ажилтан</span></span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between rounded-xl bg-gray-100 dark:bg-gray-800 px-3 py-2 mt-1">
                                        <div className="flex items-center gap-2">
                                            <Clock className="size-3.5 text-muted-foreground" />
                                            <span className="text-xs font-semibold text-muted-foreground">Нийт хуваарьтай</span>
                                        </div>
                                        <span className="text-sm font-black text-gray-900 dark:text-gray-100">{today_attendance.scheduled}</span>
                                    </div>
                                </div>
                            </Card>
                        </Link>

                        {/* Today's schedule */}
                        <Card>
                            <SectionHeader title="Өнөөдрийн хуваарь" href="/hr/work-schedules" />
                            {totalScheduled === 0 ? (
                                <p className="text-xs text-muted-foreground py-3 text-center">Өнөөдөр хуваарь байхгүй</p>
                            ) : (
                                <div className="space-y-2">
                                    {(['full', 'morning', 'afternoon', 'off'] as const).map(type => {
                                        const cnt = today_shifts[type] ?? 0;
                                        if (!cnt) return null;
                                        return (
                                            <div key={type} className={`flex items-center justify-between rounded-xl px-3 py-2 ${SHIFT_COLOR[type]}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className={`size-2 rounded-full ${SHIFT_DOT[type]}`} />
                                                    <span className="text-xs font-semibold">{SHIFT_LABELS[type]}</span>
                                                </div>
                                                <span className="text-sm font-black">{cnt} <span className="text-[10px] font-normal opacity-70">ажилтан</span></span>
                                            </div>
                                        );
                                    })}
                                    <div className="flex items-center justify-between rounded-xl bg-gray-100 dark:bg-gray-800 px-3 py-2 mt-1">
                                        <div className="flex items-center gap-2">
                                            <Clock className="size-3.5 text-muted-foreground" />
                                            <span className="text-xs font-semibold text-muted-foreground">Нийт</span>
                                        </div>
                                        <span className="text-sm font-black text-gray-900 dark:text-gray-100">{totalScheduled}</span>
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* Latest payroll */}
                        <Card>
                            <SectionHeader title="Сүүлийн цалин" href="/hr/payroll" />
                            {latest_payroll ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{latest_payroll.label}</p>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PAYROLL_STATUS[latest_payroll.status]?.cls ?? 'bg-gray-100 text-gray-500'}`}>
                                            {PAYROLL_STATUS[latest_payroll.status]?.label ?? latest_payroll.status}
                                        </span>
                                    </div>
                                    <Link href={`/hr/payroll/${latest_payroll.id}`}
                                        className="flex items-center justify-center gap-1.5 w-full rounded-xl border py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                                        <Wallet className="size-3.5" /> Дэлгэрэнгүй
                                    </Link>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground py-3 text-center">Цалингийн тооцоо байхгүй</p>
                            )}
                        </Card>

                        {/* Book rentals */}
                        {pending_rentals.length > 0 && (
                            <Card>
                                <SectionHeader title="Номын хүсэлт" href="/hr/book-rentals" count={stats.pending_book_rental} />
                                <div className="space-y-2">
                                    {pending_rentals.map(r => (
                                        <div key={r.id} className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2">
                                            <BookOpen className="size-4 text-sky-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold truncate">{r.book}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{r.employee}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Employee status */}
                        <Card>
                            <SectionHeader title="Ажилтны статус" href="/hr/employees" />
                            <div className="space-y-2">
                                {Object.entries(stats.by_status).map(([status, count]) => (
                                    <div key={status} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`size-2 rounded-full ${status === 'active' ? 'bg-emerald-500' : status === 'inactive' ? 'bg-gray-400' : 'bg-yellow-500'}`} />
                                            <span className="text-xs text-muted-foreground">
                                                {status === 'active' ? 'Идэвхтэй' : status === 'inactive' ? 'Идэвхгүй' : status}
                                            </span>
                                        </div>
                                        <span className="text-sm font-black text-gray-900 dark:text-gray-100">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* ── Alerts row ── */}
                {(probation_alerts.length > 0 || active_warnings.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {probation_alerts.length > 0 && (
                            <div className="rounded-2xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20 p-4">
                                <SectionHeader title="⏳ Туршилтын хугацаа дуусна (30 хоногт)" count={probation_alerts.length} />
                                <div className="space-y-2">
                                    {probation_alerts.map(e => {
                                        const days = daysBetween(today, e.probation_end_date);
                                        return (
                                            <Link key={e.id} href={`/hr/employees/${e.id}/edit`}
                                                className="flex items-center gap-3 rounded-xl border border-yellow-200 dark:border-yellow-800 bg-card px-3 py-2.5 hover:shadow-sm transition-all">
                                                <div className="size-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center text-yellow-700 font-black text-xs shrink-0">
                                                    {e.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold truncate">{e.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{e.position}{e.branch ? ` · ${e.branch}` : ''}</p>
                                                </div>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${days <= 7 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'}`}>
                                                    {days}ᵭ
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {active_warnings.length > 0 && (
                            <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-4">
                                <SectionHeader title="⚠ Хүлээн зөвшөөрөгдөөгүй сануулга" href="/hr/warnings" count={active_warnings.length} />
                                <div className="space-y-2">
                                    {active_warnings.map(w => (
                                        <div key={w.id} className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-card px-3 py-2.5">
                                            <AlertTriangle className="size-4 text-red-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold truncate">{w.title}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{w.employee} · {w.incident_date}</p>
                                            </div>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${SEV_COLOR[w.severity] ?? SEV_COLOR.low}`}>
                                                {w.severity === 'high' ? 'Өндөр' : w.severity === 'medium' ? 'Дунд' : 'Бага'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </AppLayout>
    );
}
