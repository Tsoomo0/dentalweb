import DoctorLayout from '@/layouts/doctor-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight, Bell, CalendarCheck2, CalendarClock,
    CheckCircle2, ChevronRight, Clock, Stethoscope,
    Sparkles, TrendingUp, UserRound, CalendarDays,
} from 'lucide-react';
import { useEffect, useState } from 'react';

/* ─── Types ─────────────────────────────────────────── */
interface TodayAppt {
    id: number; appointment_number: string; patient_name: string;
    patient_phone: string; appointment_time: string; appointment_time_end: string | null;
    service: string | null; type: 'online' | 'in_person'; status: string;
}
interface PendingAppt {
    id: number; appointment_number: string; patient_name: string;
    patient_phone: string; appointment_date: string; formatted_date: string;
    appointment_time: string; service: string | null; type: 'online' | 'in_person';
}
interface Stats { today: number; pending: number; upcoming: number; total: number }
interface Props { stats: Stats; today_appointments: TodayAppt[]; pending_appointments: PendingAppt[] }

/* ─── Constants ──────────────────────────────────────── */
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Хяналтын самбар', href: '/doctor/dashboard' }];

const MONTHS_MN  = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар',
                    '7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];
const WEEKDAYS_MN = ['Ням','Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба'];

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
    pending:   { label: 'Хүлээгдэж байна', dot: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    confirmed: { label: 'Баталгаажсан',    dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    cancelled: { label: 'Цуцлагдсан',      dot: 'bg-red-400',     badge: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
    completed: { label: 'Дууссан',         dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
};

/* ════════════════════════════════════════════════════════
   Main component
════════════════════════════════════════════════════════ */
export default function DoctorDashboard({ stats, today_appointments, pending_appointments }: Props) {
    const { auth } = usePage<{ auth: { doctor: { name: string; specialization: string | null; photo_url: string | null } | null } }>().props;
    const doctor = auth.doctor;
    const doctorName = doctor?.name ?? '';

    /* Live clock */
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
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

    const todayDate     = new Date().toISOString().split('T')[0];
    const completedToday = today_appointments.filter(a => a.status === 'completed').length;
    const progressPct   = today_appointments.length > 0
        ? Math.round(completedToday / today_appointments.length * 100) : 0;

    const sortedToday = [...today_appointments].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

    return (
        <DoctorLayout breadcrumbs={breadcrumbs}>
            <Head title="Хяналтын самбар" />
            <div className="flex flex-1 flex-col gap-6 p-6">

                {/* ══ Hero welcome banner ════════════════════════════ */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 p-6 shadow-lg">
                    {/* Blobs */}
                    <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-red-500/10 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-12 left-1/4 size-48 rounded-full bg-rose-500/10 blur-3xl" />
                    {/* Dot grid */}
                    <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                        {/* Left: greeting */}
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            {doctor?.photo_url ? (
                                <img src={doctor.photo_url} alt={doctorName}
                                    className="size-14 shrink-0 rounded-2xl object-cover object-top ring-2 ring-red-500/40 shadow-lg" />
                            ) : (
                                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg text-xl font-black text-white">
                                    {doctorName ? initials(doctorName) : <UserRound className="size-6" />}
                                </div>
                            )}
                            <div>
                                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-0.5 ring-1 ring-red-400/20">
                                    <Sparkles className="size-3 text-red-400" />
                                    <span className="text-[11px] font-semibold text-red-300">
                                        {doctor?.specialization ?? 'Эмч'}
                                    </span>
                                </div>
                                <h1 className="text-2xl font-black text-white leading-tight">
                                    {greeting}{doctorName ? `, Др. ${doctorName.split(' ')[0]}` : ''}!
                                </h1>
                                <p className="mt-0.5 text-sm text-slate-400">{dateStr}</p>
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
                                        <div className="h-full rounded-full bg-gradient-to-r from-red-400 to-rose-400 transition-all"
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
                        { label: 'Өнөөдрийн захиалга', value: stats.today,    icon: CalendarClock,  grad: 'from-red-500 to-rose-600',      href: `/doctor/calendar`,                    ring: 'ring-red-200 dark:ring-red-900/40' },
                        { label: 'Хүлээгдэж буй',      value: stats.pending,  icon: Clock,          grad: 'from-amber-500 to-orange-500',  href: '/doctor/calendar',                    ring: 'ring-amber-200 dark:ring-amber-900/40' },
                        { label: 'Батлагдсан цаг',     value: stats.upcoming, icon: CalendarCheck2, grad: 'from-emerald-500 to-teal-500',  href: '/doctor/calendar',                    ring: 'ring-emerald-200 dark:ring-emerald-900/40' },
                        { label: 'Нийт захиалга',      value: stats.total,    icon: TrendingUp,     grad: 'from-violet-500 to-purple-600', href: '/doctor/calendar',                    ring: 'ring-violet-200 dark:ring-violet-900/40' },
                    ].map(s => (
                        <Link key={s.label} href={s.href}
                            className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-200">
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

                    {/* ── Today's schedule ── */}
                    <div className="lg:col-span-3 rounded-2xl border bg-card shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/40">
                                    <CalendarCheck2 className="size-4 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Өнөөдрийн хуваарь</p>
                                    <p className="text-[11px] text-muted-foreground">{dateStr}</p>
                                </div>
                                {today_appointments.length > 0 && (
                                    <span className="rounded-full bg-red-100 dark:bg-red-950/40 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-400">
                                        {today_appointments.length}
                                    </span>
                                )}
                            </div>
                            <Link href="/doctor/calendar"
                                className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors">
                                Бүгд <ChevronRight className="size-3.5" />
                            </Link>
                        </div>

                        {sortedToday.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                                    <CalendarClock className="size-6 text-muted-foreground/40" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">Өнөөдрийн захиалга байхгүй</p>
                                <Link href="/doctor/calendar"
                                    className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors shadow-sm mt-1">
                                    <CalendarClock className="size-3.5" />
                                    Календарь харах
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
                                                isNext ? 'bg-red-50/40 dark:bg-red-950/10' : ''
                                            }`}>
                                            {isNext && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-red-500" />
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
                                                    {a.service && <span className="truncate">{a.service}</span>}
                                                    {a.type === 'online' && (
                                                        <span className="rounded-full bg-blue-100 dark:bg-blue-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                                            Онлайн
                                                        </span>
                                                    )}
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
                                <Link href="/doctor/calendar"
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
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/30 text-[11px] font-black text-amber-700 dark:text-amber-400">
                                                {a.patient_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate leading-tight">{a.patient_name}</p>
                                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                    <CalendarClock className="size-3 shrink-0" />
                                                    <span className="truncate">{a.formatted_date} {a.appointment_time}</span>
                                                </div>
                                                {a.service && (
                                                    <p className="text-[11px] text-muted-foreground truncate">{a.service}</p>
                                                )}
                                            </div>
                                            {a.type === 'online' && (
                                                <span className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-950/30 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                                    Онлайн
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick links */}
                        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                            <div className="border-b bg-muted/30 px-5 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Хурдан холбоос</p>
                            </div>
                            <div className="p-3 space-y-1">
                                {[
                                    { label: 'Календарь',        href: '/doctor/calendar',     icon: CalendarDays,  color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950/30' },
                                    { label: 'Онлайн цагууд',    href: '/doctor/online-slots', icon: CalendarClock, color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950/30' },
                                    { label: 'Мэргэжлийн мэдээлэл', href: '/doctor/profile',  icon: Stethoscope,   color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30' },
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

                <div className="h-2" />
            </div>
        </DoctorLayout>
    );
}
