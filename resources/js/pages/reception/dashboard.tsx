import ReceptionLayout from '@/layouts/reception-layout';
import { shortDoctorName } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle, ArrowRight, Banknote, Bell, Building2,
    CalendarCheck2, CalendarClock, CheckCircle2, ChevronRight,
    ClipboardList, Clock, CreditCard, MapPin, Percent, Phone,
    Smartphone, Sparkles, TrendingUp, Undo2, UserRound, Users, Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';

/* ─── Types ─────────────────────────────────────────── */
interface BranchInfo { id: number; name: string; address: string | null; phone: string | null }
interface TodayAppt  {
    id: number; appointment_number: string; patient_name: string;
    patient_phone: string; appointment_time: string; appointment_time_end: string | null;
    service: string | null; status: string; doctor_name: string | null;
}
interface PendingAppt {
    id: number; appointment_number: string; patient_name: string;
    patient_phone: string; appointment_date: string; formatted_date: string;
    appointment_time: string; service: string | null; doctor_name: string | null;
}
interface Stats { today: number; pending: number; confirmed: number; total: number }
interface DailyStats {
    today_revenue: number; today_outstanding: number;
    today_cash: number; today_card: number; today_mobile: number; today_storepay: number;
    today_patients: number; is_confirmed: boolean;
    today_discount: number; today_overpaid: number; today_refund: number; today_refund_count: number;
    outstanding_total: number; outstanding_count: number;
    overpaid_total: number; overpaid_count: number;
    refund_month_total: number; refund_month_count: number;
}
interface TreatmentStats {
    pending_count: number; partial_count: number; leasing_count: number; today_paid_amount: number;
}
interface PatientStats { total: number; new_this_month: number }
interface Props {
    branch: BranchInfo | null; stats: Stats;
    today_appointments: TodayAppt[]; pending_appointments: PendingAppt[];
    daily_stats: DailyStats; treatment_stats: TreatmentStats; patient_stats: PatientStats;
}

/* ─── Constants ──────────────────────────────────────── */
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Хяналтын самбар', href: '/reception/dashboard' }];

const MONTHS_MN = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар',
                   '7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];
const WEEKDAYS_MN = ['Ням','Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба'];

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
    pending:   { label: 'Хүлээгдэж байна', dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    confirmed: { label: 'Баталгаажсан',    dot: 'bg-emerald-400',badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    cancelled: { label: 'Цуцлагдсан',      dot: 'bg-red-400',    badge: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
    completed: { label: 'Дууссан',         dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
};

/* ─── Helpers ────────────────────────────────────────── */
function confirm(id: number) {
    router.patch(`/reception/appointments/${id}/status`, { status: 'confirmed' });
}

function hour(t: string) { return parseInt(t.split(':')[0], 10); }

/* ════════════════════════════════════════════════════════
   Main component
════════════════════════════════════════════════════════ */
export default function ReceptionDashboard({ branch, stats, today_appointments, pending_appointments, daily_stats, treatment_stats, patient_stats }: Props) {
    const { auth } = usePage<{ auth: { user: { name: string } | null } }>().props;
    const userName = auth.user?.name ?? '';

    /* Live clock */
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    /* 15s data refresh */
    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['stats', 'today_appointments', 'pending_appointments'] });
        }, 15_000);
        return () => clearInterval(id);
    }, []);

    const timeStr = now.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = `${WEEKDAYS_MN[now.getDay()]}, ${now.getDate()} ${MONTHS_MN[now.getMonth()]} ${now.getFullYear()}`;

    const greeting = (() => {
        const h = now.getHours();
        if (h < 12) return 'Өглөөний мэнд';
        if (h < 17) return 'Өдрийн мэнд';
        return 'Оройн мэнд';
    })();

    function initials(name: string) {
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const completedToday = today_appointments.filter(a => a.status === 'completed').length;
    const progressPct = today_appointments.length > 0
        ? Math.round(completedToday / today_appointments.length * 100) : 0;

    /* Group today's apts by hour for timeline */
    const sortedToday = [...today_appointments].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Хяналтын самбар" />
            <div className="flex flex-1 flex-col gap-6 p-6">

                {/* ══ Hero welcome banner ════════════════════════════ */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 shadow-lg">
                    {/* Blobs */}
                    <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-blue-500/10 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-12 left-1/4 size-48 rounded-full bg-indigo-500/10 blur-3xl" />
                    {/* Dot grid */}
                    <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                        {/* Left: greeting */}
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg text-xl font-black text-white">
                                {userName ? initials(userName) : <UserRound className="size-6" />}
                            </div>
                            <div>
                                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-0.5 ring-1 ring-blue-400/20">
                                    <Sparkles className="size-3 text-blue-400" />
                                    <span className="text-[11px] font-semibold text-blue-300">Ресепшн</span>
                                </div>
                                <h1 className="text-2xl font-black text-white leading-tight">
                                    {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}!
                                </h1>
                                <p className="mt-0.5 text-sm text-slate-400">{dateStr}</p>
                                {branch && (
                                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                                        <Building2 className="size-3.5 shrink-0" />
                                        {branch.name}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: live clock */}
                        <div className="flex flex-col items-start sm:items-end gap-2">
                            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 px-5 py-3 text-right">
                                <p className="text-4xl font-black tabular-nums text-white tracking-tight leading-none">
                                    {timeStr.slice(0, 5)}
                                    <span className="text-xl text-slate-400">{timeStr.slice(5)}</span>
                                </p>
                                <p className="mt-1 text-[11px] text-slate-500">Одоогийн цаг</p>
                            </div>

                            {/* Today's progress */}
                            {today_appointments.length > 0 && (
                                <div className="w-full sm:w-auto rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-2.5">
                                    <div className="flex items-center justify-between gap-6 mb-1.5">
                                        <span className="text-[11px] text-slate-400">Өнөөдрийн явц</span>
                                        <span className="text-[11px] font-bold text-white">{completedToday}/{today_appointments.length}</span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all"
                                            style={{ width: `${progressPct}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ══ Stats row ══════════════════════════════════════ */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { label: 'Өнөөдрийн захиалга', value: stats.today,     icon: CalendarClock,  grad: 'from-blue-500 to-indigo-600',    href: `/reception/appointments?date=${todayDate}`,        ring: 'ring-blue-200 dark:ring-blue-900/40' },
                        { label: 'Хүлээгдэж буй',      value: stats.pending,   icon: Clock,          grad: 'from-amber-500 to-orange-500',   href: '/reception/appointments?status=pending',           ring: 'ring-amber-200 dark:ring-amber-900/40' },
                        { label: 'Баталгаажсан',       value: stats.confirmed, icon: CalendarCheck2, grad: 'from-emerald-500 to-teal-500',   href: '/reception/appointments?status=confirmed',         ring: 'ring-emerald-200 dark:ring-emerald-900/40' },
                        { label: 'Нийт захиалга',      value: stats.total,     icon: TrendingUp,     grad: 'from-violet-500 to-purple-600',  href: '/reception/appointments',                          ring: 'ring-violet-200 dark:ring-violet-900/40' },
                    ].map(s => (
                        <Link key={s.label} href={s.href}
                            className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-200">
                            {/* Subtle gradient blob */}
                            <div className={`pointer-events-none absolute -right-6 -top-6 size-24 rounded-full blur-2xl opacity-10 bg-gradient-to-br ${s.grad}`} />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.grad} text-white shadow-sm ring-4 ${s.ring}`}>
                                        <s.icon className="size-5" />
                                    </div>
                                    <ArrowRight className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                                </div>
                                <p className="text-3xl font-black tabular-nums leading-none">{s.value}</p>
                                <p className="mt-1.5 text-xs font-medium text-muted-foreground">{s.label}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* ══ Main content grid ══════════════════════════════ */}
                <div className="grid gap-6 lg:grid-cols-5">

                    {/* ── Today's schedule (wider) ── */}
                    <div className="lg:col-span-3 rounded-2xl border bg-card shadow-sm overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
                                    <CalendarCheck2 className="size-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Өнөөдрийн хуваарь</p>
                                    <p className="text-[11px] text-muted-foreground">{dateStr}</p>
                                </div>
                                {today_appointments.length > 0 && (
                                    <span className="rounded-full bg-blue-100 dark:bg-blue-950/40 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                                        {today_appointments.length}
                                    </span>
                                )}
                            </div>
                            <Link href={`/reception/appointments?date=${todayDate}`}
                                className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors">
                                Бүгд <ChevronRight className="size-3.5" />
                            </Link>
                        </div>

                        {/* Timeline */}
                        {sortedToday.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                                    <CalendarClock className="size-6 text-muted-foreground/40" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">Өнөөдрийн захиалга байхгүй</p>
                                <Link href={`/reception/appointments`}
                                    className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors shadow-sm mt-1">
                                    <CalendarClock className="size-3.5" />
                                    Цаг захиалга руу
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y max-h-[480px] overflow-y-auto">
                                {sortedToday.map((a, idx) => {
                                    const sc = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.pending;
                                    const isNext = a.status === 'confirmed' &&
                                        sortedToday.slice(0, idx).every(x => x.status !== 'confirmed');
                                    return (
                                        <div key={a.id}
                                            className={`group relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/20 ${
                                                isNext ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''
                                            }`}>

                                            {/* Next indicator */}
                                            {isNext && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-blue-500" />
                                            )}

                                            {/* Time block */}
                                            <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-muted/60 py-2 px-1 text-center">
                                                <span className="text-sm font-black tabular-nums leading-tight">{a.appointment_time}</span>
                                                {a.appointment_time_end && (
                                                    <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{a.appointment_time_end}</span>
                                                )}
                                            </div>

                                            {/* Status dot */}
                                            <div className={`size-2.5 shrink-0 rounded-full ${sc.dot} ${a.status === 'pending' ? 'animate-pulse' : ''}`} />

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate leading-tight">{a.patient_name}</p>
                                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                                    {a.doctor_name && (
                                                        <span className="flex items-center gap-1">
                                                            <UserRound className="size-3 shrink-0" />
                                                            {shortDoctorName(a.doctor_name)}
                                                        </span>
                                                    )}
                                                    {a.service && <span className="truncate">{a.service}</span>}
                                                </div>
                                            </div>

                                            {/* Status badge */}
                                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${sc.badge}`}>
                                                {sc.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Right column ── */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Pending requests */}
                        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="relative flex size-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40">
                                        <Bell className="size-4 text-amber-600 dark:text-amber-400" />
                                        {stats.pending > 0 && (
                                            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">
                                                {stats.pending > 9 ? '9+' : stats.pending}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-semibold">Хүлээгдэж буй</p>
                                </div>
                                <Link href="/reception/appointments?status=pending"
                                    className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors">
                                    Бүгд <ChevronRight className="size-3.5" />
                                </Link>
                            </div>

                            {pending_appointments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                                    <CheckCircle2 className="size-10 text-emerald-400/50" />
                                    <p className="text-sm font-medium text-muted-foreground">Бүх захиалга шийдэгдсэн</p>
                                    <p className="text-xs text-muted-foreground/60">Хүлээгдэж буй захиалга байхгүй</p>
                                </div>
                            ) : (
                                <div className="divide-y max-h-[320px] overflow-y-auto">
                                    {pending_appointments.map(a => (
                                        <div key={a.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-amber-50/40 dark:hover:bg-amber-950/10 transition-colors">
                                            {/* Patient avatar */}
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/30 text-[11px] font-black text-amber-700 dark:text-amber-400">
                                                {a.patient_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate leading-tight">{a.patient_name}</p>
                                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                    <CalendarClock className="size-3 shrink-0" />
                                                    <span className="truncate">{a.formatted_date} {a.appointment_time}</span>
                                                </div>
                                                {a.doctor_name && (
                                                    <p className="text-[11px] text-muted-foreground truncate">{shortDoctorName(a.doctor_name)}</p>
                                                )}
                                            </div>
                                            <button onClick={() => confirm(a.id)}
                                                className="flex shrink-0 items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm">
                                                <CheckCircle2 className="size-3.5" />
                                                Батлах
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Branch card */}
                        {branch && (
                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                <div className="border-b bg-muted/30 px-5 py-3 flex items-center gap-2">
                                    <Building2 className="size-4 text-muted-foreground" />
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Салбарын мэдээлэл</p>
                                </div>
                                <div className="p-5 space-y-3">
                                    <div>
                                        <p className="text-base font-bold leading-tight">{branch.name}</p>
                                    </div>
                                    {branch.address && (
                                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <MapPin className="size-4 shrink-0 mt-0.5 text-muted-foreground/60" />
                                            <span>{branch.address}</span>
                                        </div>
                                    )}
                                    {branch.phone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="size-4 shrink-0 text-muted-foreground/60" />
                                            <a href={`tel:${branch.phone}`} className="font-semibold hover:text-red-600 transition-colors">
                                                {branch.phone}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Quick links */}
                        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                            <div className="border-b bg-muted/30 px-5 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Хурдан холбоос</p>
                            </div>
                            <div className="p-3 space-y-1">
                                {[
                                    { label: 'Цаг захиалга',          href: '/reception/appointments',                   icon: CalendarClock,  color: 'text-blue-600 dark:text-blue-400',      bg: 'bg-blue-50 dark:bg-blue-950/30' },
                                    { label: 'Өнөөдрийн захиалга',    href: `/reception/appointments?date=${todayDate}`, icon: CalendarCheck2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                                    { label: 'Эмчилгээний төлбөр',    href: '/reception/treatment-payments',             icon: CreditCard,     color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-950/30' },
                                    { label: 'Өвчтний карт',          href: '/reception/patients',                       icon: Users,          color: 'text-teal-600 dark:text-teal-400',      bg: 'bg-teal-50 dark:bg-teal-950/30' },
                                    { label: 'Өдрийн тооцоо',         href: '/reception/daily-sheet',                    icon: ClipboardList,  color: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
                                    { label: 'Миний профайл',         href: '/reception/profile',                        icon: UserRound,      color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-950/30' },
                                ].map(item => (
                                    <Link key={item.href} href={item.href}
                                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50 group">
                                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                                            <item.icon className={`size-4 ${item.color}`} />
                                        </div>
                                        <span>{item.label}</span>
                                        <ChevronRight className="ml-auto size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══ Bottom summary row ══════════════════════════════ */}
                <div className="grid gap-5 lg:grid-cols-3">

                    {/* ── Daily Sheet summary ── */}
                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/40">
                                    <ClipboardList className="size-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Өдрийн тооцоо</p>
                                    <p className="text-[11px] text-muted-foreground">Өнөөдрийн дүгнэлт</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {daily_stats.is_confirmed ? (
                                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle2 className="size-3" /> Баталгаажсан
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                        <Clock className="size-3" /> Хүлээгдэж байна
                                    </span>
                                )}
                                <Link href="/reception/daily-sheet"
                                    className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors">
                                    Нээх <ChevronRight className="size-3.5" />
                                </Link>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Revenue total */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Нийт орлого</span>
                                <span className="text-xl font-black tabular-nums text-indigo-600 dark:text-indigo-400">
                                    {daily_stats.today_revenue.toLocaleString()}₮
                                </span>
                            </div>
                            {/* Payment breakdown */}
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Мобайл',   value: daily_stats.today_mobile,   icon: Smartphone, color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-950/20' },
                                    { label: 'Карт',     value: daily_stats.today_card,     icon: CreditCard,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
                                    { label: 'Бэлэн',    value: daily_stats.today_cash,     icon: Banknote,    color: 'text-teal-600 dark:text-teal-400',      bg: 'bg-teal-50 dark:bg-teal-950/20' },
                                    { label: 'Storepay', value: daily_stats.today_storepay, icon: Wallet,      color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-950/20' },
                                ].map(item => (
                                    <div key={item.label} className={`rounded-xl px-3 py-2 ${item.bg}`}>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <item.icon className={`size-3 ${item.color}`} />
                                            <span className="text-[10px] text-muted-foreground">{item.label}</span>
                                        </div>
                                        <p className={`text-sm font-bold tabular-nums ${item.color}`}>
                                            {item.value > 0 ? item.value.toLocaleString() + '₮' : '—'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            {/* Today discount/overpaid/refund chips */}
                            {(daily_stats.today_discount > 0 || daily_stats.today_overpaid > 0 || daily_stats.today_refund > 0) && (
                                <div className="grid grid-cols-3 gap-2">
                                    {daily_stats.today_discount > 0 && (
                                        <div className="rounded-xl bg-orange-50 dark:bg-orange-950/20 px-2.5 py-2 text-center">
                                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                                <Percent className="size-3 text-orange-600 dark:text-orange-400" />
                                                <span className="text-[10px] text-muted-foreground">Хөнгөлсөн</span>
                                            </div>
                                            <p className="text-xs font-bold tabular-nums text-orange-700 dark:text-orange-400">−{(daily_stats.today_discount/1000).toFixed(0)}K</p>
                                        </div>
                                    )}
                                    {daily_stats.today_overpaid > 0 && (
                                        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-2 text-center">
                                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                                <TrendingUp className="size-3 text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-[10px] text-muted-foreground">Илүү</span>
                                            </div>
                                            <p className="text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">+{(daily_stats.today_overpaid/1000).toFixed(0)}K</p>
                                        </div>
                                    )}
                                    {daily_stats.today_refund > 0 && (
                                        <div className="rounded-xl bg-red-50 dark:bg-red-950/20 px-2.5 py-2 text-center">
                                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                                <Undo2 className="size-3 text-red-600 dark:text-red-400" />
                                                <span className="text-[10px] text-muted-foreground">Буцаалт</span>
                                            </div>
                                            <p className="text-xs font-bold tabular-nums text-red-700 dark:text-red-400">−{(daily_stats.today_refund/1000).toFixed(0)}K</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Outstanding */}
                            {daily_stats.outstanding_count > 0 && (
                                <Link href="/reception/outstanding" className="flex items-center gap-2 rounded-xl bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2.5 hover:bg-yellow-100 dark:hover:bg-yellow-950/30 transition-colors">
                                    <AlertCircle className="size-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">Дутуу тооцоо</p>
                                        <p className="text-[11px] text-yellow-600/70 dark:text-yellow-400/70">{daily_stats.outstanding_count} бичлэг</p>
                                    </div>
                                    <span className="text-sm font-black tabular-nums text-yellow-700 dark:text-yellow-400 shrink-0">
                                        {daily_stats.outstanding_total.toLocaleString()}₮
                                    </span>
                                    <ChevronRight className="size-3.5 text-yellow-600/50" />
                                </Link>
                            )}

                            {/* Overpaid pending */}
                            {daily_stats.overpaid_count > 0 && (
                                <Link href="/reception/overpaid" className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors">
                                    <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Илүү тооцоо</p>
                                        <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">{daily_stats.overpaid_count} бичлэг хүлээгдэж буй</p>
                                    </div>
                                    <span className="text-sm font-black tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">
                                        +{daily_stats.overpaid_total.toLocaleString()}₮
                                    </span>
                                    <ChevronRight className="size-3.5 text-emerald-600/50" />
                                </Link>
                            )}

                            {/* Refund this month */}
                            {daily_stats.refund_month_count > 0 && (
                                <Link href="/reception/refunds" className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/20 px-3 py-2.5 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors">
                                    <Undo2 className="size-4 text-red-600 dark:text-red-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-red-700 dark:text-red-300">Буцаалт ({now.getMonth() + 1}-р сар)</p>
                                        <p className="text-[11px] text-red-600/70 dark:text-red-400/70">{daily_stats.refund_month_count} бичлэг</p>
                                    </div>
                                    <span className="text-sm font-black tabular-nums text-red-700 dark:text-red-400 shrink-0">
                                        −{daily_stats.refund_month_total.toLocaleString()}₮
                                    </span>
                                    <ChevronRight className="size-3.5 text-red-600/50" />
                                </Link>
                            )}

                            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                                <span>Өнөөдрийн үйлчлүүлэгч</span>
                                <span className="font-semibold text-foreground">{daily_stats.today_patients} хүн</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Treatment payments summary ── */}
                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40">
                                    <CreditCard className="size-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Эмчилгээний төлбөр</p>
                                    <p className="text-[11px] text-muted-foreground">Төлбөрийн дүгнэлт</p>
                                </div>
                            </div>
                            <Link href="/reception/treatment-payments"
                                className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors">
                                Нээх <ChevronRight className="size-3.5" />
                            </Link>
                        </div>
                        <div className="p-5 space-y-3">
                            {/* Today paid */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Өнөөдөр авсан</span>
                                <span className="text-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                                    {treatment_stats.today_paid_amount > 0
                                        ? treatment_stats.today_paid_amount.toLocaleString() + '₮'
                                        : '—'}
                                </span>
                            </div>
                            {/* Status breakdown */}
                            <div className="space-y-2">
                                {[
                                    {
                                        label: 'Хүлээгдэж буй',
                                        value: treatment_stats.pending_count,
                                        dot: 'bg-amber-400',
                                        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                                        href: '/reception/treatment-payments',
                                    },
                                    {
                                        label: 'Хэсэгчлэн төлсөн',
                                        value: treatment_stats.partial_count,
                                        dot: 'bg-blue-400',
                                        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                                        href: '/reception/treatment-payments',
                                    },
                                    {
                                        label: 'Хэсэгчилсэн төлөлт',
                                        value: treatment_stats.leasing_count,
                                        dot: 'bg-teal-400',
                                        badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
                                        href: '/reception/treatment-payments',
                                    },
                                ].map(item => (
                                    <Link key={item.label} href={item.href}
                                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/40 transition-colors group">
                                        <div className={`size-2 rounded-full shrink-0 ${item.dot}`} />
                                        <span className="flex-1 text-sm text-muted-foreground">{item.label}</span>
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${item.badge}`}>
                                            {item.value}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                            {treatment_stats.pending_count === 0 && treatment_stats.partial_count === 0 && treatment_stats.leasing_count === 0 && (
                                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                                    <CheckCircle2 className="size-8 text-emerald-400/50" />
                                    <p className="text-xs text-muted-foreground">Хүлээгдэж буй төлбөр байхгүй</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Patient stats ── */}
                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-950/40">
                                    <Users className="size-4 text-teal-600 dark:text-teal-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Өвчтний карт</p>
                                    <p className="text-[11px] text-muted-foreground">Өвчтний статистик</p>
                                </div>
                            </div>
                            <Link href="/reception/patients"
                                className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors">
                                Нээх <ChevronRight className="size-3.5" />
                            </Link>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Total */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Нийт өвчтөн</span>
                                <span className="text-3xl font-black tabular-nums text-teal-600 dark:text-teal-400">
                                    {patient_stats.total.toLocaleString()}
                                </span>
                            </div>
                            {/* New this month */}
                            <div className="rounded-xl bg-teal-50 dark:bg-teal-950/20 px-4 py-3 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">Энэ сард шинэ</p>
                                    <p className="text-[11px] text-teal-600/70 dark:text-teal-400/70 mt-0.5">Бүртгэгдсэн өвчтөн</p>
                                </div>
                                <span className="text-2xl font-black tabular-nums text-teal-600 dark:text-teal-400">
                                    +{patient_stats.new_this_month}
                                </span>
                            </div>
                            {/* Actions */}
                            <div className="space-y-1 border-t pt-3">
                                {[
                                    { label: 'Шинэ өвчтөн бүртгэх', href: '/reception/patients/create', icon: UserRound, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30' },
                                    { label: 'Бүх өвчтний жагсаалт', href: '/reception/patients',         icon: Users,     color: 'text-slate-600 dark:text-slate-400',  bg: 'bg-slate-50 dark:bg-slate-800/30' },
                                    { label: 'Хэрэглэгч',            href: '/reception/patient-users',    icon: CheckCircle2, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30' },
                                ].map(item => (
                                    <Link key={item.href} href={item.href}
                                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50 group">
                                        <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                                            <item.icon className={`size-3.5 ${item.color}`} />
                                        </div>
                                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                                        <ChevronRight className="ml-auto size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                <div className="h-2" />
            </div>
        </ReceptionLayout>
    );
}
