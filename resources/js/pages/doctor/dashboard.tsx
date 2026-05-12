import DoctorLayout from '@/layouts/doctor-layout';
import { useIsMobile } from '@/hooks/use-mobile';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Activity, ArrowRight, BarChart3, Bell, CalendarCheck2, CalendarClock,
    CalendarDays, CheckCircle2, ChevronRight, Clock, PieChart,
    Sparkles, Stethoscope, TrendingUp, UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    Bar, BarChart as ReBarChart, CartesianGrid, Line, LineChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface TodayAppt {
    id: number; appointment_number: string; patient_name: string;
    patient_phone: string; appointment_time: string; appointment_time_end: string | null;
    service: string | null; type: 'online' | 'in_person'; status: string;
    treatment_sent: boolean;
}
interface PendingAppt {
    id: number; appointment_number: string; patient_name: string;
    patient_phone: string; appointment_date: string; formatted_date: string;
    appointment_time: string; service: string | null; type: 'online' | 'in_person';
}
interface Stats { today: number; pending: number; upcoming: number; total: number }
interface WeeklyPoint  { date: string; day: string; count: number }
interface MonthlyPoint { date: string; day: number; count: number }
interface Props {
    stats: Stats;
    today_appointments: TodayAppt[];
    pending_appointments: PendingAppt[];
    weekly_data: WeeklyPoint[];
    status_breakdown: Record<string, number>;
    monthly_data: MonthlyPoint[];
    type_stats: { online: number; in_person: number };
}

/* ─── Constants ──────────────────────────────────────────────────────── */
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Хяналтын самбар', href: '/doctor/dashboard' }];

const MONTHS_MN   = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар',
                     '7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];
const WEEKDAYS_MN = ['Ням','Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба'];

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
    pending:   { label: 'Хүлээгдэж байна', dot: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    confirmed: { label: 'Баталгаажсан',    dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    cancelled: { label: 'Цуцлагдсан',      dot: 'bg-red-400',     badge: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
    completed: { label: 'Дууссан',         dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
};

const STATUS_INLINE: Record<string, { bg: string; color: string }> = {
    pending:   { bg: '#fef3c7', color: '#d97706' },
    confirmed: { bg: '#d1fae5', color: '#059669' },
    cancelled: { bg: '#fee2e2', color: '#dc2626' },
    completed: { bg: '#dbeafe', color: '#2563eb' },
};

function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function greeting(h: number) {
    if (h < 12) return 'Өглөөний мэнд';
    if (h < 17) return 'Өдрийн мэнд';
    return 'Оройн мэнд';
}

/* ══════════════════════════════════════════════════════════════════════
   MOBILE
══════════════════════════════════════════════════════════════════════ */
function MobileDashboard({ stats, today_appointments, pending_appointments, weekly_data, status_breakdown, monthly_data, type_stats }: Props) {
    const { auth } = usePage<{ auth: { doctor: { name: string; specialization: string | null; photo_url: string | null } | null } }>().props;
    const doctor     = auth.doctor;
    const doctorName = doctor?.name ?? '';

    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['stats', 'today_appointments', 'pending_appointments'] });
        }, 15_000);
        return () => clearInterval(id);
    }, []);

    const timeStr      = now.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' });
    const dateShort    = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
    const greet        = greeting(now.getHours());
    const sortedToday  = [...today_appointments].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    const completedToday = sortedToday.filter(a => a.status === 'completed' || a.treatment_sent).length;
    const progressPct    = sortedToday.length > 0 ? Math.round(completedToday / sortedToday.length * 100) : 0;
    const statusTotal    = Object.values(status_breakdown).reduce((s, v) => s + v, 0);

    return (
        <div style={{ background: 'var(--background)', minHeight: '100%', paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }}>

            {/* ═══ HERO ══════════════════════════════════════════════════════ */}
            <div style={{
                background: 'linear-gradient(155deg, #0f172a 0%, #450a0a 50%, #0f172a 100%)',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Decorative blobs */}
                <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', top: -80, right: -70, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'rgba(239,68,68,0.07)', bottom: -40, left: -30, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', top: 60, right: 40, pointerEvents: 'none' }} />
                {/* Dot grid */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />

                {/* Doctor info row */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px 16px 0', gap: 12, position: 'relative' }}>
                    {doctor?.photo_url ? (
                        <img src={doctor.photo_url} alt={doctorName} style={{ width: 50, height: 50, borderRadius: 16, objectFit: 'cover', objectPosition: 'top', border: '2px solid rgba(239,68,68,0.45)', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }} />
                    ) : (
                        <div style={{ width: 50, height: 50, borderRadius: 16, background: 'linear-gradient(135deg, #ef4444, #e11d48)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(239,68,68,0.35)', boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}>
                            <span style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>{doctorName ? initials(doctorName) : '?'}</span>
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 0.3 }}>
                            {greet} 👋
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, color: 'white', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Др. {doctorName || 'Эмч'}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(252,165,165,0.85)', fontWeight: 700, letterSpacing: 0.2 }}>
                            {doctor?.specialization ?? 'Эмч'}
                        </p>
                    </div>
                    {/* Live time */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>
                            {timeStr}
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: 9, color: 'rgba(255,255,255,0.38)', fontWeight: 600, letterSpacing: 0.4 }}>
                            {dateShort}
                        </p>
                    </div>
                </div>

                {/* Progress bar */}
                {sortedToday.length > 0 && (
                    <div style={{ padding: '12px 16px 0', position: 'relative' }}>
                        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Өнөөдрийн явц</span>
                                    <span style={{ fontSize: 10, color: 'white', fontWeight: 800 }}>{completedToday}/{sortedToday.length}</span>
                                </div>
                                <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #ef4444, #f43f5e)', width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
                                </div>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 900, color: progressPct === 100 ? '#4ade80' : 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
                                {progressPct}%
                            </span>
                        </div>
                    </div>
                )}

                {/* 3 stat glass tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '12px 14px 18px', position: 'relative' }}>
                    {[
                        { label: 'ӨНӨӨДӨР',   value: stats.today,    color: '#fca5a5' },
                        { label: 'ХҮЛЭЭГДЭЖ',  value: stats.pending,  color: '#fcd34d' },
                        { label: 'БАТЛАГДСАН', value: stats.upcoming, color: '#6ee7b7' },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: 'rgba(0,0,0,0.28)',
                            backdropFilter: 'blur(14px)',
                            WebkitBackdropFilter: 'blur(14px)',
                            borderRadius: 18, padding: '12px 6px', textAlign: 'center',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                        }}>
                            <p style={{ fontSize: 26, fontWeight: 900, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
                            <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', margin: '5px 0 0', fontWeight: 700, letterSpacing: 0.5 }}>
                                {s.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ CONTENT ═══════════════════════════════════════════════════ */}
            <div style={{ padding: '12px 14px 8px' }}>

                {/* ── Today's schedule ─────────────────────────────────────── */}
                <div style={{ background: 'var(--card)', borderRadius: 20, overflow: 'hidden', marginBottom: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(135deg, #ef4444, #e11d48)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0, boxShadow: '0 2px 8px rgba(239,68,68,0.35)' }}>
                            <CalendarCheck2 size={16} color="white" />
                        </div>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>Өнөөдрийн хуваарь</span>
                        {sortedToday.length > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 900, background: '#ef4444', color: 'white', borderRadius: 99, padding: '2px 8px', marginRight: 8 }}>
                                {sortedToday.length}
                            </span>
                        )}
                        <Link href="/doctor/calendar" style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                            Бүгд <ChevronRight size={13} color="#dc2626" />
                        </Link>
                    </div>

                    {sortedToday.length === 0 ? (
                        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                <CalendarClock size={24} color="var(--muted-foreground)" style={{ opacity: 0.4 }} />
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-foreground)', margin: '0 0 4px' }}>Өнөөдрийн захиалга байхгүй</p>
                            <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: 0, opacity: 0.6 }}>Календарь харах</p>
                        </div>
                    ) : (
                        <div>
                            {sortedToday.map((a, idx) => {
                                const si   = STATUS_INLINE[a.status] ?? STATUS_INLINE.pending;
                                const isNext = a.status === 'confirmed' && sortedToday.slice(0, idx).every(x => x.status !== 'confirmed');
                                return (
                                    <div key={a.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 11,
                                        padding: '11px 16px',
                                        borderBottom: idx < sortedToday.length - 1 ? '1px solid var(--border)' : 'none',
                                        background: isNext ? 'rgba(239,68,68,0.03)' : 'transparent',
                                        position: 'relative',
                                    }}>
                                        {isNext && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#ef4444', borderRadius: '0 3px 3px 0' }} />}
                                        {/* Time */}
                                        <div style={{ width: 48, flexShrink: 0, background: 'var(--muted)', borderRadius: 12, padding: '6px 4px', textAlign: 'center' }}>
                                            <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: 'var(--foreground)', lineHeight: 1 }}>{a.appointment_time}</p>
                                            {a.appointment_time_end && (
                                                <p style={{ margin: '2px 0 0', fontSize: 8, color: 'var(--muted-foreground)', lineHeight: 1 }}>{a.appointment_time_end}</p>
                                            )}
                                        </div>
                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {a.patient_name}
                                            </p>
                                            {a.service && (
                                                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {a.service}
                                                </p>
                                            )}
                                        </div>
                                        {/* Badges */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                                            {a.type === 'online' && (
                                                <span style={{ fontSize: 8, fontWeight: 800, background: '#dbeafe', color: '#2563eb', borderRadius: 99, padding: '2px 7px', letterSpacing: 0.3 }}>
                                                    ОНЛАЙН
                                                </span>
                                            )}
                                            <span style={{ fontSize: 9, fontWeight: 700, background: si.bg, color: si.color, borderRadius: 99, padding: '2px 8px' }}>
                                                {STATUS_CONFIG[a.status]?.label ?? a.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Pending appointments ─────────────────────────────────── */}
                {pending_appointments.length > 0 && (
                    <div style={{ background: 'var(--card)', borderRadius: 20, overflow: 'hidden', marginBottom: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0, boxShadow: '0 2px 8px rgba(245,158,11,0.35)', position: 'relative' }}>
                                <Bell size={16} color="white" />
                                {stats.pending > 0 && (
                                    <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: 'white', border: '1.5px solid var(--card)' }}>
                                        {stats.pending > 9 ? '9+' : stats.pending}
                                    </span>
                                )}
                            </div>
                            <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>Хүлээгдэж буй</span>
                            <Link href="/doctor/calendar" style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                                Бүгд <ChevronRight size={13} color="#dc2626" />
                            </Link>
                        </div>
                        <div>
                            {pending_appointments.slice(0, 5).map((a, idx) => (
                                <div key={a.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 11, padding: '11px 16px',
                                    borderBottom: idx < Math.min(pending_appointments.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                                }}>
                                    <div style={{ width: 38, height: 38, borderRadius: 13, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <span style={{ fontSize: 15, fontWeight: 900, color: '#d97706' }}>
                                            {a.patient_name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {a.patient_name}
                                        </p>
                                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {a.formatted_date} · {a.appointment_time}
                                        </p>
                                    </div>
                                    {a.type === 'online' && (
                                        <span style={{ fontSize: 9, fontWeight: 800, background: '#dbeafe', color: '#2563eb', borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}>
                                            Онлайн
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── 7-day bar chart ──────────────────────────────────────── */}
                <div style={{ background: 'var(--card)', borderRadius: 20, overflow: 'hidden', marginBottom: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 }}>
                            <BarChart3 size={16} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>Сүүлийн 7 хоног</p>
                            <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--muted-foreground)' }}>Баталгаажсан + дууссан</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#ef4444' }}>
                            {weekly_data.reduce((s, d) => s + d.count, 0)} нийт
                        </span>
                    </div>
                    <div style={{ padding: '8px 6px 12px' }}>
                        <ResponsiveContainer width="100%" height={130}>
                            <ReBarChart data={weekly_data} barSize={26} margin={{ top: 12, right: 6, left: -22, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' } as any} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' } as any} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)' }}
                                    formatter={((v: number | undefined) => [v ?? 0, 'Захиалга']) as any}
                                    cursor={{ fill: 'rgba(239,68,68,0.07)' }}
                                />
                                <Bar dataKey="count" fill="#ef4444" radius={[5, 5, 0, 0]}
                                    label={{ position: 'top', fontSize: 9, fill: 'var(--muted-foreground)', formatter: (v: number) => v > 0 ? v : '' } as any} />
                            </ReBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Status breakdown ─────────────────────────────────────── */}
                <div style={{ background: 'var(--card)', borderRadius: 20, overflow: 'hidden', marginBottom: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 }}>
                            <PieChart size={16} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>Захиалгын тоймлол</p>
                            <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--muted-foreground)' }}>Нийт статусаар</p>
                        </div>
                    </div>
                    <div style={{ padding: '14px 16px' }}>
                        {([
                            { key: 'confirmed', label: 'Баталгаажсан', color: '#22c55e' },
                            { key: 'pending',   label: 'Хүлээгдэж буй', color: '#f59e0b' },
                        ] as const).map(({ key, label, color }, i) => {
                            const val = status_breakdown[key] ?? 0;
                            const pct = statusTotal > 0 ? Math.round(val / statusTotal * 100) : 0;
                            return (
                                <div key={key} style={{ marginBottom: i < 1 ? 12 : 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                                            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{label}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 10, color: 'var(--muted-foreground)', opacity: 0.6 }}>{pct}%</span>
                                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--foreground)', minWidth: 20, textAlign: 'right' }}>{val}</span>
                                        </div>
                                    </div>
                                    <div style={{ height: 6, borderRadius: 99, background: 'var(--muted)', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', borderRadius: 99, background: color, width: `${pct}%`, transition: 'width 0.5s ease' }} />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Type ratio */}
                        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                            <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                Захиалгын төрөл
                            </p>
                            <div style={{ display: 'flex', gap: 12 }}>
                                {[
                                    { label: 'Биечлэн', value: type_stats.in_person, color: '#8b5cf6' },
                                    { label: 'Онлайн',  value: type_stats.online,    color: '#3b82f6' },
                                ].map(t => {
                                    const total = type_stats.online + type_stats.in_person;
                                    const pct   = total > 0 ? Math.round(t.value / total * 100) : 0;
                                    return (
                                        <div key={t.label} style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{t.label}</span>
                                                <span style={{ fontSize: 11, fontWeight: 800, color: t.color }}>{t.value}</span>
                                            </div>
                                            <div style={{ height: 7, borderRadius: 99, background: 'var(--muted)', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', borderRadius: 99, background: t.color, width: `${pct}%`, transition: 'width 0.5s ease' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   DESKTOP
══════════════════════════════════════════════════════════════════════ */
function DesktopDashboard({ stats, today_appointments, pending_appointments, weekly_data, status_breakdown, monthly_data, type_stats }: Props) {
    const { auth } = usePage<{ auth: { doctor: { name: string; specialization: string | null; photo_url: string | null } | null } }>().props;
    const doctor     = auth.doctor;
    const doctorName = doctor?.name ?? '';

    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['stats', 'today_appointments', 'pending_appointments'] });
        }, 15_000);
        return () => clearInterval(id);
    }, []);

    const timeStr = now.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = `${WEEKDAYS_MN[now.getDay()]}, ${now.getDate()} ${MONTHS_MN[now.getMonth()]} ${now.getFullYear()}`;
    const greet   = greeting(now.getHours());

    const completedToday = today_appointments.filter(a => a.status === 'completed').length;
    const progressPct    = today_appointments.length > 0 ? Math.round(completedToday / today_appointments.length * 100) : 0;
    const sortedToday    = [...today_appointments].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

    return (
        <div className="flex flex-1 flex-col gap-6 p-6">

            {/* ══ Hero welcome banner ════════════════════════════ */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 p-6 shadow-lg">
                <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-red-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-12 left-1/4 size-48 rounded-full bg-rose-500/10 blur-3xl" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
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
                                {greet}{doctorName ? `, Др. ${doctorName.split(' ')[0]}` : ''}!
                            </h1>
                            <p className="mt-0.5 text-sm text-slate-400">{dateStr}</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-start sm:items-end gap-2">
                        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 px-5 py-3 text-right">
                            <p className="text-4xl font-black tabular-nums text-white tracking-tight leading-none">
                                {timeStr.slice(0, 5)}
                                <span className="text-xl text-slate-400">{timeStr.slice(5)}</span>
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">Одоогийн цаг</p>
                        </div>
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
                    { label: 'Өнөөдрийн захиалга', value: stats.today,    icon: CalendarClock,  grad: 'from-red-500 to-rose-600',      href: '/doctor/calendar', ring: 'ring-red-200 dark:ring-red-900/40' },
                    { label: 'Хүлээгдэж буй',      value: stats.pending,  icon: Clock,          grad: 'from-amber-500 to-orange-500',  href: '/doctor/calendar', ring: 'ring-amber-200 dark:ring-amber-900/40' },
                    { label: 'Батлагдсан цаг',     value: stats.upcoming, icon: CalendarCheck2, grad: 'from-emerald-500 to-teal-500',  href: '/doctor/calendar', ring: 'ring-emerald-200 dark:ring-emerald-900/40' },
                    { label: 'Нийт захиалга',      value: stats.total,    icon: TrendingUp,     grad: 'from-violet-500 to-purple-600', href: '/doctor/calendar', ring: 'ring-violet-200 dark:ring-violet-900/40' },
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

            {/* ══ Charts row ═════════════════════════════════════ */}
            <div className="grid gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3 rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 border-b bg-muted/30 px-5 py-4">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/40">
                            <BarChart3 className="size-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Сүүлийн 7 хоног</p>
                            <p className="text-[11px] text-muted-foreground">Баталгаажсан + дууссан захиалга</p>
                        </div>
                    </div>
                    <div className="p-4 pt-5">
                        <ResponsiveContainer width="100%" height={180}>
                            <ReBarChart data={weekly_data} barSize={30} margin={{ top: 14, right: 8, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                                    formatter={((v: number | undefined) => [v ?? 0, 'Захиалга']) as any}
                                    cursor={{ fill: 'rgba(239,68,68,0.07)' }}
                                />
                                <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]}
                                    label={{ position: 'top', fontSize: 10, fill: 'hsl(var(--muted-foreground))', formatter: (v: number) => v > 0 ? v : '' } as any} />
                            </ReBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 border-b bg-muted/30 px-5 py-4">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/40">
                            <PieChart className="size-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Захиалгын тоймлол</p>
                            <p className="text-[11px] text-muted-foreground">Нийт статусаар</p>
                        </div>
                    </div>
                    <div className="p-5 space-y-3">
                        {([
                            { key: 'confirmed', label: 'Баталгаажсан', color: '#22c55e' },
                            { key: 'completed',  label: 'Дууссан',       color: '#3b82f6' },
                            { key: 'pending',   label: 'Хүлээгдэж буй', color: '#f59e0b' },
                            { key: 'cancelled', label: 'Цуцлагдсан',    color: '#ef4444' },
                        ] as const).map(({ key, label, color }) => {
                            const val   = status_breakdown[key] ?? 0;
                            const total = Object.values(status_breakdown).reduce((s, v) => s + v, 0);
                            const pct   = total > 0 ? Math.round(val / total * 100) : 0;
                            return (
                                <div key={key}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="size-2 rounded-full" style={{ background: color }} />
                                            <span className="text-xs text-muted-foreground">{label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground/60">{pct}%</span>
                                            <span className="text-xs font-bold tabular-nums w-6 text-right">{val}</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%`, background: color }} />
                                    </div>
                                </div>
                            );
                        })}
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">Захиалгын төрөл</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-muted-foreground">Биечлэн</span>
                                        <span className="text-xs font-bold tabular-nums">{type_stats.in_person}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        {(() => {
                                            const t = type_stats.online + type_stats.in_person;
                                            return <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: t > 0 ? `${Math.round(type_stats.in_person / t * 100)}%` : '0%' }} />;
                                        })()}
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-border shrink-0" />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-muted-foreground">Онлайн</span>
                                        <span className="text-xs font-bold tabular-nums text-blue-600 dark:text-blue-400">{type_stats.online}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        {(() => {
                                            const t = type_stats.online + type_stats.in_person;
                                            return <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: t > 0 ? `${Math.round(type_stats.online / t * 100)}%` : '0%' }} />;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ Monthly trend ══════════════════════════════════ */}
            {monthly_data.length > 1 && (
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 border-b bg-muted/30 px-5 py-4">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                            <Activity className="size-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Энэ сарын трэнд</p>
                            <p className="text-[11px] text-muted-foreground">{MONTHS_MN[now.getMonth()]} сарын өдрийн захиалгын тоо</p>
                        </div>
                        <span className="ml-auto rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {monthly_data.reduce((s, d) => s + d.count, 0)} нийт
                        </span>
                    </div>
                    <div className="p-4 pt-5">
                        <ResponsiveContainer width="100%" height={140}>
                            <LineChart data={monthly_data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                                    formatter={((v: number | undefined) => [v ?? 0, 'Захиалга']) as any}
                                    labelFormatter={(l: unknown) => `${l}-ний өдөр`}
                                />
                                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5}
                                    dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                                    activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: 'white' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ══ Main content grid ══════════════════════════════ */}
            <div className="grid gap-6 lg:grid-cols-5">

                {/* Today's schedule */}
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
                                        className={`group relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/20 ${isNext ? 'bg-red-50/40 dark:bg-red-950/10' : ''}`}>
                                        {isNext && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-red-500" />
                                        )}
                                        <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-muted/60 py-2 px-1 text-center">
                                            <span className="text-sm font-black tabular-nums leading-tight">{a.appointment_time}</span>
                                            {a.appointment_time_end && (
                                                <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{a.appointment_time_end}</span>
                                            )}
                                        </div>
                                        <div className={`size-2.5 shrink-0 rounded-full ${sc.dot} ${a.status === 'pending' ? 'animate-pulse' : ''}`} />
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
                                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${sc.badge}`}>
                                            {sc.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right column */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Pending */}
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
                                { label: 'Календарь',     href: '/doctor/calendar',     icon: CalendarDays,  color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950/30' },
                                { label: 'Онлайн цагууд', href: '/doctor/online-slots', icon: CalendarClock, color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950/30' },
                                { label: 'Профайл',        href: '/doctor/profile',      icon: Stethoscope,   color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30' },
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
    );
}

/* ══════════════════════════════════════════════════════════════════════
   EXPORT
══════════════════════════════════════════════════════════════════════ */
export default function DoctorDashboard(props: Props) {
    const isMobile = useIsMobile();
    return (
        <DoctorLayout breadcrumbs={breadcrumbs}>
            <Head title="Хяналтын самбар" />
            {isMobile ? <MobileDashboard {...props} /> : <DesktopDashboard {...props} />}
        </DoctorLayout>
    );
}
