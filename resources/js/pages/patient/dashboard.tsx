import PatientLayout from '@/layouts/patient-layout';
import { NotificationBell } from '@/components/notification-bell';
import { useIsMobile } from '@/hooks/use-mobile';
import { Head, Link } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import {
    ArrowRight, CalendarDays, CheckCircle2, ChevronRight,
    ClipboardList, Clock, CreditCard, FileText,
    MapPin, Stethoscope, TrendingUp, UserCircle2, XCircle, AlertCircle,
} from 'lucide-react';
import {
    Area, AreaChart, CartesianGrid, Cell, Legend,
    Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

/* ── Types ──────────────────────────────────────────────────────────────── */
interface Appointment {
    id: number;
    appointment_number: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
    doctor?: { name: string };
    branch?: { name: string };
}
interface TreatmentRecord {
    id: number; treatment_type: string; record_date: string;
    doctor?: { name: string };
}
interface Patient {
    id: number; patient_number: string;
    last_name: string; first_name: string; phone: string;
    appointments?: Appointment[];
    treatment_records?: TreatmentRecord[];
}
interface Props {
    patient: Patient | null;
    status_counts: { pending: number; confirmed: number; completed: number; cancelled: number };
    monthly_counts: { month: string; count: number }[];
    next_appointment: {
        id: number; appointment_date: string; appointment_time: string | null;
        status: string;
        doctor?: { name: string } | null;
        branch?: { name: string } | null;
    } | null;
    total_charged: number;
    total_paid: number;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
    pending: 'Хүлээгдэж байна', confirmed: 'Баталгаажсан',
    completed: 'Дууссан', cancelled: 'Цуцлагдсан',
};
const STATUS_CLR: Record<string, { bg: string; text: string }> = {
    pending:   { bg: '#fef3c7', text: '#d97706' },
    confirmed: { bg: '#dbeafe', text: '#2563eb' },
    completed: { bg: '#d1fae5', text: '#059669' },
    cancelled: { bg: '#fee2e2', text: '#dc2626' },
};
const PIE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'];

function formatMnt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}М`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}К`;
    return n.toString();
}
function formatDate(s: string) {
    return new Date(s).toLocaleDateString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric' });
}
function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Өглөөний мэнд';
    if (h < 18) return 'Өдрийн мэнд';
    return 'Оройн мэнд';
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Үйлчлүүлэгчийн портал', href: '/patient/dashboard' },
    { title: 'Нүүр', href: '/patient/dashboard' },
];

const AreaTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--my-card-bg)', border: '1px solid var(--my-divider)', borderRadius: 12, padding: '8px 12px', fontSize: 12 }}>
            <p style={{ fontWeight: 700, color: 'var(--my-text)', margin: '0 0 2px' }}>{label}</p>
            <p style={{ color: '#10b981', margin: 0 }}>{payload[0].value} захиалга</p>
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════════════════
   MOBILE HOME
══════════════════════════════════════════════════════════════════════════ */
function MobileHome({ patient, status_counts, monthly_counts, next_appointment, total_charged, total_paid }: Props) {
    const appointments   = patient?.appointments ?? [];
    const treatmentCount = patient?.treatment_records?.length ?? 0;
    const totalApts      = status_counts.pending + status_counts.confirmed + status_counts.completed + status_counts.cancelled;
    const pendingBalance = Math.max(0, total_charged - total_paid);
    const initial        = (patient?.first_name ?? 'Ү').charAt(0).toUpperCase();
    const fullName       = `${patient?.last_name ?? ''} ${patient?.first_name ?? ''}`.trim() || 'Үйлчлүүлэгч';

    return (
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--my-page-bg)', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' }}>

            {/* ═══ HERO ════════════════════════════════════════════════════ */}
            <div style={{
                background: 'linear-gradient(155deg, #059669 0%, #10b981 45%, #0891b2 100%)',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Decorative blobs */}
                <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', top: -70, right: -70, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: 50, right: 30, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', bottom: -50, left: -40, pointerEvents: 'none' }} />

                {/* Top bar: greeting + bell + avatar */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 0', gap: 10, position: 'relative' }}>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 600, margin: 0, letterSpacing: 0.3 }}>
                            {greeting()} 👋
                        </p>
                    </div>
                    <NotificationBell variant="ghost" />
                    <Link href="/patient/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            border: '2.5px solid rgba(255,255,255,0.55)',
                            background: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                        }}>
                            <span style={{ fontSize: 15, fontWeight: 900, color: 'white' }}>{initial}</span>
                        </div>
                    </Link>
                </div>

                {/* Name + card number */}
                <div style={{ padding: '10px 18px 0', position: 'relative' }}>
                    <h1 style={{ margin: '0 0 4px', lineHeight: 1.15 }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: -0.5 }}>{fullName}</span>
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 14px', fontWeight: 500 }}>
                        Карт №:{' '}
                        <span style={{ color: 'white', fontWeight: 700, fontFamily: 'monospace' }}>
                            {patient?.patient_number ?? '—'}
                        </span>
                    </p>
                </div>

                {/* Mini stat tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '0 14px 16px', position: 'relative' }}>
                    {[
                        { label: 'Нийт цаг',    value: totalApts },
                        { label: 'Эмчилгээ',     value: treatmentCount },
                        { label: 'Хүлээгдэж',    value: status_counts.pending + status_counts.confirmed },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(10px)',
                            borderRadius: 16, padding: '11px 6px', textAlign: 'center',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}>
                            <p style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{s.value}</p>
                            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', margin: '4px 0 0', fontWeight: 700, letterSpacing: 0.3 }}>
                                {s.label.toUpperCase()}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ CONTENT ════════════════════════════════════════════════ */}
            <div style={{ padding: '12px 14px 24px' }}>

                {/* ── Next appointment ── */}
                {next_appointment ? (
                    <Link href="/patient/appointments" style={{ textDecoration: 'none', display: 'block', marginBottom: 10 }}>
                        <div style={{
                            background: 'var(--my-card-bg)', borderRadius: 20,
                            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                        }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 15, flexShrink: 0,
                                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                            }}>
                                <CalendarDays size={22} color="white" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 10, fontWeight: 800, color: '#3b82f6', letterSpacing: 0.6, margin: '0 0 3px' }}>
                                    ДАРААГИЙН ЗАХИАЛГА
                                </p>
                                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--my-text)', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {formatDate(next_appointment.appointment_date)}
                                    {next_appointment.appointment_time && (
                                        <span style={{ color: '#3b82f6', marginLeft: 6 }}>{next_appointment.appointment_time}</span>
                                    )}
                                </p>
                                <p style={{ fontSize: 12, color: 'var(--my-muted)', margin: 0 }}>
                                    {next_appointment.doctor?.name ?? 'Эмч тодорхойгүй'}
                                    {next_appointment.branch && ` · ${next_appointment.branch.name}`}
                                </p>
                            </div>
                            <ChevronRight size={16} color="var(--my-faint)" />
                        </div>
                    </Link>
                ) : (
                    <Link href="/patient/appointments" style={{ textDecoration: 'none', display: 'block', marginBottom: 10 }}>
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(8,145,178,0.08))',
                            border: '1.5px dashed rgba(16,185,129,0.3)',
                            borderRadius: 20, padding: '16px', display: 'flex', alignItems: 'center', gap: 14,
                        }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                                background: 'rgba(16,185,129,0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <CalendarDays size={20} color="#10b981" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 14, fontWeight: 700, color: '#10b981', margin: '0 0 2px' }}>Цаг захиалах</p>
                                <p style={{ fontSize: 12, color: 'var(--my-muted)', margin: 0 }}>Шинэ захиалга үүсгэх</p>
                            </div>
                            <ChevronRight size={16} color="#10b981" />
                        </div>
                    </Link>
                )}

                {/* ── 4 stat tiles (2x2) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    {[
                        { label: 'Нийт захиалга', value: totalApts,                  color: '#3b82f6', bg: '#eff6ff', Icon: CalendarDays,  href: '/patient/appointments' },
                        { label: 'Эмчилгээ',       value: treatmentCount,             color: '#7c3aed', bg: '#faf5ff', Icon: ClipboardList,  href: '/patient/treatments'  },
                        { label: 'Нийт дүн',        value: formatMnt(total_charged) + '₮', color: '#059669', bg: '#f0fdf4', Icon: CreditCard,    href: '/patient/treatments'  },
                        { label: 'Үлдэгдэл',        value: formatMnt(pendingBalance) + '₮', color: pendingBalance > 0 ? '#ea580c' : '#059669', bg: pendingBalance > 0 ? '#fff7ed' : '#f0fdf4', Icon: TrendingUp, href: '/patient/treatments' },
                    ].map(s => (
                        <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
                            <div style={{
                                background: 'var(--my-card-bg)', borderRadius: 20,
                                padding: '16px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                            }}>
                                <div style={{
                                    width: 42, height: 42, borderRadius: 13, background: s.bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                                }}>
                                    <s.Icon size={19} color={s.color} />
                                </div>
                                <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--my-text)', margin: '0 0 3px', lineHeight: 1 }}>{s.value}</p>
                                <p style={{ fontSize: 11, color: 'var(--my-muted)', margin: 0, fontWeight: 600 }}>{s.label}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* ── Quick actions (2x2) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    {[
                        { href: '/patient/appointments',  Icon: CalendarDays, label: 'Захиалга авах',  sub: 'Шинэ цаг захиалах',        color: '#2563eb', bg: '#eff6ff' },
                        { href: '/patient/treatments',    Icon: Stethoscope,  label: 'Эмчилгээ',       sub: 'Эмчилгээний түүх',         color: '#7c3aed', bg: '#faf5ff' },
                        { href: '/patient/profile',       Icon: UserCircle2,  label: 'Профайл',         sub: 'Хувийн мэдээлэл',          color: '#059669', bg: '#f0fdf4' },
                        { href: '/patient/consent-forms', Icon: FileText,     label: 'Зөвшөөрлүүд',    sub: 'Гарын үсгийн маягтууд',    color: '#0891b2', bg: '#ecfeff' },
                    ].map(item => (
                        <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                            <div style={{
                                background: 'var(--my-card-bg)', borderRadius: 20,
                                padding: '16px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                                display: 'flex', flexDirection: 'column', gap: 10,
                            }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 14, background: item.bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <item.Icon size={20} color={item.color} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--my-text)', margin: '0 0 2px' }}>{item.label}</p>
                                    <p style={{ fontSize: 11, color: 'var(--my-muted)', margin: 0 }}>{item.sub}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* ── Recent appointments ── */}
                <div style={{ background: 'var(--my-card-bg)', borderRadius: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 12px', borderBottom: '1px solid var(--my-divider)' }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0,
                        }}>
                            <CalendarDays size={15} color="white" />
                        </div>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: 'var(--my-text)' }}>Сүүлийн захиалгууд</span>
                        <Link href="/patient/appointments" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 700 }}>Бүгд</span>
                            <ChevronRight size={13} color="#3b82f6" />
                        </Link>
                    </div>

                    {appointments.length === 0 ? (
                        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--my-pill-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                <CalendarDays size={22} color="var(--my-faint)" />
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-muted)', margin: '0 0 4px' }}>Захиалга байхгүй байна</p>
                            <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: 0 }}>Захиалга авахдаа "Захиалгууд" цэс рүү орно уу</p>
                        </div>
                    ) : (
                        appointments.slice(0, 5).map((apt, i) => {
                            const clr = STATUS_CLR[apt.status] ?? { bg: '#f1f5f9', text: '#64748b' };
                            return (
                                <div key={apt.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '13px 16px',
                                    borderBottom: i < Math.min(appointments.length, 5) - 1 ? '1px solid var(--my-divider)' : 'none',
                                }}>
                                    <div style={{ flexShrink: 0 }}>
                                        {apt.status === 'completed' && <CheckCircle2 size={18} color="#10b981" />}
                                        {apt.status === 'cancelled' && <XCircle size={18} color="#ef4444" />}
                                        {(apt.status === 'pending' || apt.status === 'confirmed') && <Clock size={18} color="#3b82f6" />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-text)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {apt.doctor?.name ?? 'Эмч тодорхойгүй'}
                                        </p>
                                        <p style={{ fontSize: 11, color: 'var(--my-muted)', margin: 0 }}>
                                            {apt.appointment_date}{apt.appointment_time ? ` · ${apt.appointment_time}` : ''}
                                        </p>
                                    </div>
                                    <span style={{
                                        flexShrink: 0, fontSize: 10, fontWeight: 700,
                                        background: clr.bg, color: clr.text,
                                        borderRadius: 99, padding: '3px 10px',
                                    }}>
                                        {STATUS_LABEL[apt.status] ?? apt.status}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   DESKTOP HOME  (existing design, kept intact)
══════════════════════════════════════════════════════════════════════════ */
function DesktopHome({ patient, status_counts, monthly_counts, next_appointment, total_charged, total_paid }: Props) {
    const appointments   = patient?.appointments ?? [];
    const treatmentCount = patient?.treatment_records?.length ?? 0;
    const totalApts      = status_counts.pending + status_counts.confirmed + status_counts.completed + status_counts.cancelled;
    const pendingBalance = Math.max(0, total_charged - total_paid);

    const pieData = [
        { name: 'Хүлээгдэж байна', value: status_counts.pending },
        { name: 'Баталгаажсан',    value: status_counts.confirmed },
        { name: 'Дууссан',         value: status_counts.completed },
        { name: 'Цуцлагдсан',      value: status_counts.cancelled },
    ].filter(d => d.value > 0);

    const hasChartData = monthly_counts.some(m => m.count > 0);

    return (
        <div className="flex flex-1 flex-col gap-6 p-6">

            {/* ── Hero card ── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-6 text-white shadow-lg">
                <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -right-4 top-16 size-24 rounded-full bg-white/5" />
                <div className="pointer-events-none absolute bottom-0 left-1/2 size-32 rounded-full bg-black/5" />
                <div className="relative flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/70">Үйлчлүүлэгчийн портал</p>
                        <h1 className="mt-1 text-2xl font-bold leading-tight">
                            Тавтай морилно уу,<br />
                            <span className="text-white">{patient?.last_name ?? ''} {patient?.first_name ?? ''}</span>
                        </h1>
                        <p className="mt-2 text-sm text-white/70">
                            Карт №:{' '}
                            <span className="font-mono font-semibold text-white">{patient?.patient_number ?? '—'}</span>
                        </p>
                    </div>
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold backdrop-blur-sm">
                        {(patient?.first_name ?? 'Ү').charAt(0).toUpperCase()}
                    </div>
                </div>
                <div className="relative mt-5 grid grid-cols-3 gap-3">
                    {[
                        { label: 'Нийт цаг',      value: totalApts },
                        { label: 'Эмчилгээ',       value: treatmentCount },
                        { label: 'Хүлээгдэж буй',  value: status_counts.pending + status_counts.confirmed },
                    ].map(s => (
                        <div key={s.label} className="rounded-xl bg-white/15 px-3 py-2 text-center backdrop-blur-sm">
                            <p className="text-xl font-bold">{s.value}</p>
                            <p className="text-[10px] text-white/70 leading-tight">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Next appointment ── */}
            {next_appointment && (
                <Link href="/patient/appointments"
                    className="flex items-center gap-4 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 shadow-sm hover:bg-blue-100/70 transition-colors dark:border-blue-800 dark:bg-blue-950/30">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow">
                        <Clock className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Дараагийн захиалга</p>
                        <p className="text-sm font-semibold text-foreground">
                            {formatDate(next_appointment.appointment_date)}
                            {next_appointment.appointment_time && <span className="ml-2 text-blue-600 dark:text-blue-400">{next_appointment.appointment_time}</span>}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            {next_appointment.doctor && <span className="flex items-center gap-1"><Stethoscope className="size-3" />{next_appointment.doctor.name}</span>}
                            {next_appointment.branch && <span className="flex items-center gap-1"><MapPin className="size-3" />{next_appointment.branch.name}</span>}
                        </div>
                    </div>
                </Link>
            )}

            {/* ── Stat cards ── */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Нийт захиалга', value: totalApts, icon: CalendarDays, gradient: 'from-blue-500 to-indigo-600', href: '/patient/appointments' },
                    { label: 'Эмчилгээ', value: treatmentCount, icon: ClipboardList, gradient: 'from-violet-500 to-purple-600', href: '/patient/treatments' },
                    { label: 'Нийт дүн', value: formatMnt(total_charged) + '₮', icon: CreditCard, gradient: 'from-emerald-500 to-teal-600', href: '/patient/treatments' },
                    { label: 'Үлдэгдэл', value: formatMnt(pendingBalance) + '₮', icon: TrendingUp, gradient: pendingBalance > 0 ? 'from-orange-500 to-red-500' : 'from-emerald-500 to-teal-600', href: '/patient/treatments' },
                ].map(s => (
                    <Link key={s.label} href={s.href} className="group rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                        <div className="flex items-start justify-between">
                            <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-sm`}>
                                <s.icon className="size-4" />
                            </div>
                            <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-1" />
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl font-bold tabular-nums text-foreground">{s.value}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* ── Charts ── */}
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="font-semibold text-foreground">Захиалгын динамик</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Сүүлийн 6 сарын захиалга</p>
                        </div>
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                            <TrendingUp className="size-3.5" />
                        </div>
                    </div>
                    {hasChartData ? (
                        <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={monthly_counts} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<AreaTooltip />} />
                                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#10b981', strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-44 items-center justify-center text-muted-foreground/50">
                            <div className="text-center"><TrendingUp className="size-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Дата байхгүй байна</p></div>
                        </div>
                    )}
                </div>
                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="font-semibold text-foreground">Статус</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Захиалгын төлөв</p>
                        </div>
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                            <CalendarDays className="size-3.5" />
                        </div>
                    </div>
                    {pieData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={140}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={3} dataKey="value">
                                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v: any) => [`${v} захиалга`]} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-1.5 mt-1">
                                {pieData.map((d, i) => (
                                    <div key={d.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block size-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                            <span className="text-muted-foreground">{d.name}</span>
                                        </div>
                                        <span className="font-semibold tabular-nums text-foreground">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex h-44 items-center justify-center text-muted-foreground/50">
                            <div className="text-center"><CalendarDays className="size-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Дата байхгүй байна</p></div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Recent appointments ── */}
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                            <CalendarDays className="size-3.5" />
                        </div>
                        <h2 className="font-semibold text-foreground">Сүүлийн захиалгууд</h2>
                    </div>
                    <Link href="/patient/appointments" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Бүгд <ArrowRight className="size-3" />
                    </Link>
                </div>
                {appointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
                        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                            <CalendarDays className="size-6 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Захиалга байхгүй байна</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {appointments.slice(0, 5).map(apt => (
                            <div key={apt.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                                <div className="shrink-0">
                                    {apt.status === 'completed' && <CheckCircle2 className="size-4 text-emerald-500" />}
                                    {apt.status === 'cancelled' && <XCircle className="size-4 text-red-400" />}
                                    {(apt.status === 'pending' || apt.status === 'confirmed') && <AlertCircle className="size-4 text-amber-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{apt.doctor?.name ?? 'Эмч тодорхойгүй'}</p>
                                    <p className="text-xs text-muted-foreground">{apt.appointment_date}{apt.appointment_time && <span className="ml-1">{apt.appointment_time}</span>}</p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold`}
                                    style={{ background: STATUS_CLR[apt.status]?.bg ?? '#f1f5f9', color: STATUS_CLR[apt.status]?.text ?? '#64748b' }}>
                                    {STATUS_LABEL[apt.status] ?? apt.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Quick links ── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { href: '/patient/profile',       icon: UserCircle2,  label: 'Профайл засах',      desc: 'Хувийн мэдээлэл шинэчлэх', gradient: 'from-emerald-500 to-teal-600' },
                    { href: '/patient/appointments',  icon: CalendarDays, label: 'Захиалга авах',       desc: 'Шинэ цаг захиалах',         gradient: 'from-blue-500 to-indigo-600' },
                    { href: '/patient/treatments',    icon: Stethoscope,  label: 'Эмчилгээ',            desc: 'Эмчилгээний түүх',           gradient: 'from-violet-500 to-purple-600' },
                    { href: '/patient/consent-forms', icon: FileText,     label: 'Зөвшөөрлийн маягт',  desc: 'Гарын үсэг зурсан маягтууд', gradient: 'from-orange-500 to-rose-500' },
                ].map(item => (
                    <Link key={item.href} href={item.href}
                        className="group flex items-center gap-3.5 rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-sm`}>
                            <item.icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground text-sm truncate">{item.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                        </div>
                        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </Link>
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   EXPORT
══════════════════════════════════════════════════════════════════════════ */
export default function PatientDashboard(props: Props) {
    const isMobile = useIsMobile();
    return (
        <PatientLayout breadcrumbs={breadcrumbs}>
            <Head title="Нүүр" />
            {isMobile
                ? <MobileHome {...props} />
                : <DesktopHome {...props} />
            }
        </PatientLayout>
    );
}
