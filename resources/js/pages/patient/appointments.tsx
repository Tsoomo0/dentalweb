import PatientLayout from '@/layouts/patient-layout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { NotificationBell } from '@/components/notification-bell';
import { useIsMobile } from '@/hooks/use-mobile';
import { type BreadcrumbItem } from '@/types';
import {
    CalendarDays, Clock, MapPin, Stethoscope, Plus, X,
    CheckCircle2, XCircle, AlertCircle, Loader2,
    ChevronLeft, ChevronRight, Video, CreditCard,
    FileText, Send,
} from 'lucide-react';
import { type FormEvent, useState, useEffect } from 'react';

/* ── Types ── */
interface Doctor { id: number; name: string; specialization: string | null }

interface Appointment {
    id: number;
    appointment_number: string;
    appointment_date: string;
    appointment_time: string | null;
    status: string;
    type: string | null;
    meet_link: string | null;
    payment_status: string | null;
    notes: string | null;
    doctor?: { name: string } | null;
    branch?: { name: string } | null;
}

interface Paginated {
    data: Appointment[];
    total: number;
    last_page: number;
    current_page: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface StatusCounts {
    all: number; pending: number; confirmed: number;
    completed: number; cancelled: number;
}

interface Props {
    patient: { id: number; patient_number: string; last_name: string; first_name: string } | null;
    appointments: Paginated | null;
    doctors: Doctor[];
    status_counts: StatusCounts;
    current_filter: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Үйлчлүүлэгчийн портал', href: '/patient/dashboard' },
    { title: 'Захиалгууд', href: '/patient/appointments' },
];

/* ── Label / color maps ── */
const STATUS_LABEL: Record<string, string> = {
    pending: 'Хүлээгдэж байна', confirmed: 'Баталгаажсан',
    completed: 'Дууссан', cancelled: 'Цуцлагдсан',
};
const STATUS_BG: Record<string, string> = {
    pending:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
    confirmed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    completed: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-400',
    cancelled: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-400',
};
const STATUS_STRIPE: Record<string, string> = {
    pending: 'bg-amber-400', confirmed: 'bg-emerald-500',
    completed: 'bg-teal-500', cancelled: 'bg-red-400',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
    pending:   <AlertCircle className="size-4 text-amber-500" />,
    confirmed: <CheckCircle2 className="size-4 text-emerald-500" />,
    completed: <CheckCircle2 className="size-4 text-teal-500" />,
    cancelled: <XCircle className="size-4 text-red-400" />,
};
const PAYMENT_LABEL: Record<string, string> = {
    pending: 'Төлбөр хүлээгдэж байна', paid: 'Төлсөн',
    partial: 'Хэсэгчлэн төлсөн', cancelled: 'Цуцлагдсан',
};
const PAYMENT_BG: Record<string, string> = {
    pending: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-400',
    paid:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    partial: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400',
};

/* ── Shared theme colors ── */
const HERO_GRADIENT = 'linear-gradient(155deg, #059669 0%, #10b981 45%, #0891b2 100%)';
const BTN_GRADIENT  = 'linear-gradient(135deg, #059669, #0891b2)';
const ACCENT        = '#059669';

/* ── Date helpers ── */
function fmtDay(s: string) { return new Date(s).toLocaleDateString('mn-MN', { weekday: 'short' }); }
function fmtDayNum(s: string) { return new Date(s).getDate(); }
function fmtMonth(s: string) { return new Date(s).toLocaleDateString('mn-MN', { month: 'short' }); }
function isUpcoming(s: string) { return new Date(s) >= new Date(new Date().toDateString()); }

/* ── Inline style helpers (dark-mode friendly) ── */
function statusStyle(status: string): React.CSSProperties {
    const map: Record<string, React.CSSProperties> = {
        pending:   { background: 'rgba(245,158,11,0.15)',  color: '#d97706' },
        confirmed: { background: 'rgba(16,185,129,0.15)',  color: '#059669' },
        completed: { background: 'rgba(20,184,166,0.15)',  color: '#0d9488' },
        cancelled: { background: 'rgba(239,68,68,0.15)',   color: '#dc2626' },
    };
    return map[status] ?? { background: 'var(--my-pill-bg)', color: 'var(--my-muted)' };
}
function paymentStyle(status: string): React.CSSProperties {
    const map: Record<string, React.CSSProperties> = {
        paid:      { background: 'rgba(16,185,129,0.15)',  color: '#059669' },
        partial:   { background: 'rgba(234,179,8,0.15)',   color: '#ca8a04' },
        cancelled: { background: 'rgba(239,68,68,0.15)',   color: '#dc2626' },
    };
    return map[status] ?? { background: 'var(--my-pill-bg)', color: 'var(--my-muted)' };
}

/* ── Booking modal ── */
function BookingModal({ open, onClose, doctors }: {
    open: boolean; onClose: () => void; doctors: Doctor[];
}) {
    const { data, setData, post, processing, errors, reset, wasSuccessful } = useForm({
        preferred_date: '', preferred_time: '', doctor_id: '', service: '', notes: '',
    });

    useEffect(() => {
        if (wasSuccessful) { reset(); onClose(); }
    }, [wasSuccessful]);

    function submit(e: FormEvent) { e.preventDefault(); post('/patient/appointments/request'); }
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full sm:max-w-lg mx-auto bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-5">
                    <div className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-white/10" />
                    <div className="flex items-center justify-between relative">
                        <div>
                            <h2 className="text-lg font-bold text-white">Цаг захиалах</h2>
                            <p className="text-xs text-white/70 mt-0.5">Хүсэлт илгээснээр ресепшн баталгаажуулна</p>
                        </div>
                        <button onClick={onClose} className="flex size-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
                            <X className="size-4" />
                        </button>
                    </div>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Хүссэн огноо <span className="text-red-500">*</span></label>
                            <div className={`flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5 transition-colors ${errors.preferred_date ? 'border-red-400' : 'border-input focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20'}`}>
                                <CalendarDays className="size-4 text-muted-foreground/60 shrink-0" />
                                <input type="date" min={new Date().toISOString().split('T')[0]} value={data.preferred_date} onChange={e => setData('preferred_date', e.target.value)} className="flex-1 bg-transparent text-sm text-foreground focus:outline-none min-w-0" />
                            </div>
                            {errors.preferred_date && <p className="text-[11px] text-red-500">{errors.preferred_date}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Хүссэн цаг</label>
                            <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-colors">
                                <Clock className="size-4 text-muted-foreground/60 shrink-0" />
                                <input type="time" value={data.preferred_time} onChange={e => setData('preferred_time', e.target.value)} className="flex-1 bg-transparent text-sm text-foreground focus:outline-none" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Эмч</label>
                        <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-colors">
                            <Stethoscope className="size-4 text-muted-foreground/60 shrink-0" />
                            <select value={data.doctor_id} onChange={e => setData('doctor_id', e.target.value)} className="flex-1 bg-transparent text-sm text-foreground focus:outline-none appearance-none">
                                <option value="">— Хамаагүй / Автоматаар —</option>
                                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}{d.specialization ? ` — ${d.specialization}` : ''}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Үйлчилгээний төрөл</label>
                        <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-colors">
                            <FileText className="size-4 text-muted-foreground/60 shrink-0" />
                            <input type="text" placeholder="Жишээ: Шүд авах, цэвэрлэгээ..." value={data.service} onChange={e => setData('service', e.target.value)} className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Нэмэлт тэмдэглэл</label>
                        <textarea rows={3} placeholder="Өвчний шинж тэмдэг, асуулт, хүсэлт..." value={data.notes} onChange={e => setData('notes', e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 resize-none transition-colors" />
                    </div>
                    <button type="submit" disabled={processing} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 transition-all duration-200 active:scale-[0.98]">
                        {processing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        {processing ? 'Илгээж байна...' : 'Хүсэлт илгээх'}
                    </button>
                </form>
            </div>
        </div>
    );
}

/* ── Mobile appointment card ── */
function MobileAptCard({ apt }: { apt: Appointment }) {
    const upcoming = apt.appointment_date ? isUpcoming(apt.appointment_date) : false;
    const stripeColor: Record<string, string> = {
        pending: '#f59e0b', confirmed: '#10b981', completed: '#14b8a6', cancelled: '#ef4444',
    };

    return (
        <div style={{
            background: 'var(--my-card-bg)', borderRadius: 18, overflow: 'hidden',
            boxShadow: '0 2px 14px rgba(0,0,0,0.07)', display: 'flex',
            border: upcoming && apt.status !== 'cancelled'
                ? '1px solid rgba(16,185,129,0.25)'
                : '1px solid var(--my-divider)',
        }}>
            {/* Left color stripe */}
            <div style={{ width: 4, flexShrink: 0, background: stripeColor[apt.status] ?? '#94a3b8' }} />

            <div style={{ flex: 1, padding: '14px 14px 14px 12px', display: 'flex', gap: 12 }}>
                {/* Date block */}
                <div style={{
                    width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: '10px 6px',
                    background: upcoming && apt.status !== 'cancelled'
                        ? BTN_GRADIENT
                        : 'var(--my-pill-bg)',
                }}>
                    {apt.appointment_date ? (
                        <>
                            <span style={{ fontSize: 9, fontWeight: 600, lineHeight: 1, color: upcoming && apt.status !== 'cancelled' ? 'rgba(255,255,255,0.75)' : 'var(--my-muted)' }}>
                                {fmtMonth(apt.appointment_date)}
                            </span>
                            <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: upcoming && apt.status !== 'cancelled' ? '#fff' : 'var(--my-text)' }}>
                                {fmtDayNum(apt.appointment_date)}
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 500, lineHeight: 1, color: upcoming && apt.status !== 'cancelled' ? 'rgba(255,255,255,0.6)' : 'var(--my-muted)' }}>
                                {fmtDay(apt.appointment_date)}
                            </span>
                        </>
                    ) : (
                        <CalendarDays size={18} style={{ color: 'var(--my-muted)' }} />
                    )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {/* Number + status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {STATUS_ICON[apt.status]}
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--my-muted)' }}>
                                #{apt.appointment_number}
                            </span>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '2px 8px', flexShrink: 0, ...statusStyle(apt.status) }}>
                            {STATUS_LABEL[apt.status] ?? apt.status}
                        </span>
                    </div>

                    {apt.appointment_time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Clock size={12} style={{ color: 'var(--my-muted)', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'var(--my-muted)' }}>{apt.appointment_time.slice(0, 5)}</span>
                            {apt.type === 'online' && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, background: 'rgba(8,145,178,0.12)', color: '#0891b2', borderRadius: 99, padding: '1px 7px' }}>
                                    <Video size={9} />Онлайн
                                </span>
                            )}
                        </div>
                    )}

                    {apt.doctor && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Stethoscope size={12} style={{ color: 'var(--my-muted)', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--my-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {apt.doctor.name}
                            </span>
                        </div>
                    )}

                    {apt.branch && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <MapPin size={12} style={{ color: 'var(--my-muted)', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'var(--my-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {apt.branch.name}
                            </span>
                        </div>
                    )}

                    {apt.notes && (
                        <p style={{ fontSize: 11, color: 'var(--my-faint)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                            "{apt.notes}"
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 1 }}>
                        {apt.payment_status && apt.payment_status !== 'pending' && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, borderRadius: 99, padding: '2px 8px', ...paymentStyle(apt.payment_status) }}>
                                <CreditCard size={9} />
                                {PAYMENT_LABEL[apt.payment_status] ?? apt.payment_status}
                            </span>
                        )}
                        {apt.meet_link && apt.status === 'confirmed' && (
                            <a href={apt.meet_link} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, background: BTN_GRADIENT, color: '#fff', borderRadius: 99, padding: '2px 10px', textDecoration: 'none' }}>
                                <Video size={9} />Нэгдэх
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Desktop appointment card ── */
function AptCard({ apt }: { apt: Appointment }) {
    const upcoming = apt.appointment_date ? isUpcoming(apt.appointment_date) : false;
    return (
        <div className={`group relative overflow-hidden rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${upcoming && apt.status !== 'cancelled' ? 'ring-1 ring-emerald-200 dark:ring-emerald-800/50' : ''}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${STATUS_STRIPE[apt.status] ?? 'bg-muted'}`} />
            <div className="pl-4 pr-5 py-4 flex gap-4">
                <div className={`flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2.5 min-w-[56px] ${upcoming && apt.status !== 'cancelled' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {apt.appointment_date ? (
                        <>
                            <span className="text-[10px] font-medium opacity-80 leading-none">{fmtMonth(apt.appointment_date)}</span>
                            <span className="text-2xl font-bold tabular-nums leading-tight">{fmtDayNum(apt.appointment_date)}</span>
                            <span className="text-[10px] opacity-70 leading-none">{fmtDay(apt.appointment_date)}</span>
                        </>
                    ) : <CalendarDays className="size-5 opacity-40" />}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                            {STATUS_ICON[apt.status]}
                            <span className="font-mono text-[11px] text-muted-foreground">#{apt.appointment_number}</span>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_BG[apt.status] ?? 'bg-muted text-muted-foreground'}`}>
                            {STATUS_LABEL[apt.status] ?? apt.status}
                        </span>
                    </div>
                    {apt.appointment_time && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="size-3.5 shrink-0" />
                            <span>{apt.appointment_time.slice(0, 5)}</span>
                            {apt.type === 'online' && (
                                <span className="flex items-center gap-1 ml-1 rounded-full bg-teal-50 text-teal-600 px-2 py-0.5 text-[10px] font-medium ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-400">
                                    <Video className="size-2.5" />Онлайн
                                </span>
                            )}
                        </div>
                    )}
                    {apt.doctor && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Stethoscope className="size-3.5 shrink-0" />
                            <span className="truncate font-medium text-foreground/80">{apt.doctor.name}</span>
                        </div>
                    )}
                    {apt.branch && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="size-3.5 shrink-0" />
                            <span className="truncate">{apt.branch.name}</span>
                        </div>
                    )}
                    {apt.notes && <p className="text-[11px] text-muted-foreground/70 truncate italic">"{apt.notes}"</p>}
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        {apt.payment_status && apt.payment_status !== 'pending' && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex items-center gap-1 ${PAYMENT_BG[apt.payment_status] ?? 'bg-muted text-muted-foreground'}`}>
                                <CreditCard className="size-2.5" />
                                {PAYMENT_LABEL[apt.payment_status] ?? apt.payment_status}
                            </span>
                        )}
                        {apt.meet_link && apt.status === 'confirmed' && (
                            <a href={apt.meet_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-2.5 py-0.5 text-[10px] font-semibold hover:opacity-90 transition-opacity shadow-sm">
                                <Video className="size-2.5" />Нэгдэх
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Mobile appointments view ── */
function MobileAppointments({ appointments, status_counts, current_filter, setModalOpen, setFilter, FILTERS }: {
    appointments: Paginated | null;
    status_counts: StatusCounts;
    current_filter: string;
    setModalOpen: (v: boolean) => void;
    setFilter: (s: string) => void;
    FILTERS: { key: string; label: string; count: number }[];
}) {
    const { props } = usePage<{ auth?: any; flash?: { success?: string } }>();
    const userName: string = (props as any)?.auth?.user?.name ?? 'Үйлчлүүлэгч';
    const flash = props.flash;
    const list = appointments?.data ?? [];

    return (
        <div style={{
            flex: 1, overflowY: 'auto', background: 'var(--my-page-bg)',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))',
        }}>
            {/* ── Hero ── */}
            <div style={{
                background: HERO_GRADIENT,
                padding: '20px 20px 64px', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', right: -24, top: -24, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: '35%', bottom: -24, width: 90, height: 90, borderRadius: '50%', background: 'rgba(0,0,0,0.1)', pointerEvents: 'none' }} />

                {/* Top bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, position: 'relative' }}>
                    <Link href="/patient/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            border: '2px solid rgba(255,255,255,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
                                {userName.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    </Link>
                    <h1 style={{ flex: 1, fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, textAlign: 'center' }}>
                        Захиалгууд
                    </h1>
                    <NotificationBell variant="ghost" />
                </div>

                {/* Stats + booking button */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, position: 'relative' }}>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '0 0 10px' }}>
                            Нийт <span style={{ fontWeight: 800, color: '#fff' }}>{status_counts.all}</span> захиалга
                        </p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {[
                                { label: 'Хүлээгдэж байна', count: status_counts.pending,   bg: 'rgba(251,191,36,0.2)',  text: '#fde68a', border: 'rgba(251,191,36,0.35)' },
                                { label: 'Баталгаажсан',     count: status_counts.confirmed, bg: 'rgba(255,255,255,0.18)', text: '#fff',    border: 'rgba(255,255,255,0.3)' },
                            ].map(s => (
                                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '4px 10px' }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: s.text }}>{s.count}</span>
                                    <span style={{ fontSize: 11, color: s.text }}>{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={() => setModalOpen(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: '#fff', borderRadius: 14, padding: '10px 14px',
                            border: 'none', cursor: 'pointer', flexShrink: 0,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                        }}
                    >
                        <Plus size={16} style={{ color: ACCENT }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>Захиалах</span>
                    </button>
                </div>
            </div>

            {/* ── Filter tabs (overlaps hero) ── */}
            <div style={{
                margin: '-28px 16px 14px', position: 'relative', zIndex: 2,
                background: 'var(--my-card-bg)', borderRadius: 18,
                boxShadow: '0 4px 24px rgba(0,0,0,0.1)', overflow: 'hidden',
            }}>
                <div style={{ display: 'flex', overflowX: 'auto' }}>
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '13px 14px', flexShrink: 0,
                                background: 'none', border: 'none', cursor: 'pointer',
                                borderBottom: current_filter === f.key ? `2px solid ${ACCENT}` : '2px solid transparent',
                                color: current_filter === f.key ? ACCENT : 'var(--my-muted)',
                                fontSize: 13, fontWeight: current_filter === f.key ? 700 : 500,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {f.label}
                            <span style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                minWidth: 20, height: 18, borderRadius: 99, padding: '0 5px',
                                background: current_filter === f.key ? ACCENT : 'var(--my-pill-bg)',
                                color: current_filter === f.key ? '#fff' : 'var(--my-muted)',
                                fontSize: 10, fontWeight: 700,
                            }}>
                                {f.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

                {flash?.success && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 14, padding: '12px 14px' }}>
                        <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#10b981', margin: 0 }}>{flash.success}</p>
                    </div>
                )}

                {list.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0 20px', gap: 16, textAlign: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ width: 72, height: 72, borderRadius: 24, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CalendarDays size={32} style={{ color: ACCENT }} />
                            </div>
                            <div style={{ position: 'absolute', right: -4, top: -4, width: 22, height: 22, borderRadius: '50%', background: BTN_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Plus size={12} style={{ color: '#fff' }} />
                            </div>
                        </div>
                        <div>
                            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--my-text)', margin: '0 0 6px' }}>
                                {current_filter ? 'Энэ статусын захиалга байхгүй' : 'Захиалга байхгүй'}
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--my-muted)', margin: 0, maxWidth: 240 }}>
                                {current_filter ? 'Өөр статус сонгож үзнэ үү' : 'Эмчилгээний цаг захиалах товчийг дарна уу'}
                            </p>
                        </div>
                        {!current_filter && (
                            <button onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: BTN_GRADIENT, borderRadius: 14, padding: '12px 22px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(5,150,105,0.35)' }}>
                                <Plus size={16} style={{ color: '#fff' }} />
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Цаг захиалах</span>
                            </button>
                        )}
                    </div>
                )}

                {list.map(apt => <MobileAptCard key={apt.id} apt={apt} />)}

                {(appointments?.last_page ?? 0) > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0' }}>
                        {appointments!.links.map((link, i) => {
                            const isArrow = link.label.includes('&laquo;') || link.label.includes('&raquo;');
                            const isPrev  = link.label.includes('&laquo;');
                            return link.url ? (
                                <Link key={i} href={link.url} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: 36, height: 36, borderRadius: 12, textDecoration: 'none',
                                    background: link.active ? BTN_GRADIENT : 'var(--my-card-bg)',
                                    color: link.active ? '#fff' : 'var(--my-muted)',
                                    fontSize: 13, fontWeight: 600,
                                    border: link.active ? 'none' : '1px solid var(--my-divider)',
                                    boxShadow: link.active ? '0 2px 8px rgba(5,150,105,0.35)' : 'none',
                                }}>
                                    {isArrow ? isPrev ? <ChevronLeft size={16} /> : <ChevronRight size={16} /> : link.label}
                                </Link>
                            ) : (
                                <span key={i} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: 36, height: 36, borderRadius: 12, opacity: 0.4,
                                    background: 'var(--my-card-bg)', color: 'var(--my-muted)',
                                    fontSize: 13, border: '1px solid var(--my-divider)',
                                }}>
                                    {isArrow ? isPrev ? <ChevronLeft size={16} /> : <ChevronRight size={16} /> : link.label}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Main export ── */
export default function PatientAppointments({
    patient, appointments, doctors, status_counts, current_filter,
}: Props) {
    const isMobile = useIsMobile();
    const list = appointments?.data ?? [];
    const [modalOpen, setModalOpen] = useState(false);
    const { props } = usePage<{ flash?: { success?: string } }>();
    const flash = props.flash;

    // 15 секунд тутамд захиалгуудыг шинэчилнэ
    useEffect(() => {
        const id = setInterval(() => {
            if (!document.hidden) {
                router.reload({ only: ['appointments', 'status_counts'] });
            }
        }, 15000);
        return () => clearInterval(id);
    }, []);

    function setFilter(s: string) {
        router.get('/patient/appointments', s ? { status: s } : {}, {
            preserveScroll: true, preserveState: true,
        });
    }

    const FILTERS = [
        { key: '',          label: 'Бүгд',              count: status_counts.all },
        { key: 'pending',   label: 'Хүлээгдэж байна',   count: status_counts.pending },
        { key: 'confirmed', label: 'Баталгаажсан',       count: status_counts.confirmed },
    ];

    return (
        <PatientLayout breadcrumbs={isMobile ? [] : breadcrumbs}>
            <Head title="Захиалгууд" />

            {isMobile ? (
                <MobileAppointments
                    appointments={appointments}
                    status_counts={status_counts}
                    current_filter={current_filter}
                    setModalOpen={setModalOpen}
                    setFilter={setFilter}
                    FILTERS={FILTERS}
                />
            ) : (
                <>
                    {/* ── Desktop Hero ── */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 px-6 pt-8 pb-14">
                        <div className="pointer-events-none absolute -right-8 -top-8 size-44 rounded-full bg-white/10" />
                        <div className="pointer-events-none absolute left-1/3 -bottom-6 size-32 rounded-full bg-black/10" />
                        <div className="relative flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-white/60">Үйлчлүүлэгчийн портал</p>
                                <h1 className="mt-1 text-2xl font-bold text-white">Миний захиалгууд</h1>
                                <p className="mt-0.5 text-sm text-white/60">
                                    Нийт <span className="font-semibold text-white">{status_counts.all}</span> захиалга
                                </p>
                            </div>
                            <button onClick={() => setModalOpen(true)} className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-md hover:bg-emerald-50 transition-colors active:scale-95">
                                <Plus className="size-4" />
                                <span className="hidden sm:inline">Цаг захиалах</span>
                                <span className="sm:hidden">Захиалах</span>
                            </button>
                        </div>
                        <div className="relative mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {[
                                { label: 'Хүлээгдэж байна', count: status_counts.pending,   color: 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/30' },
                                { label: 'Баталгаажсан',     count: status_counts.confirmed, color: 'bg-white/20 text-white ring-1 ring-white/30' },
                            ].map(s => (
                                <div key={s.label} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${s.color}`}>
                                    <span className="font-bold tabular-nums">{s.count}</span>
                                    <span>{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Desktop Filter tabs ── */}
                    <div className="relative -mt-5 mx-4 md:mx-6 rounded-2xl border bg-card shadow-md overflow-hidden">
                        <div className="flex overflow-x-auto scrollbar-hide">
                            {FILTERS.map(f => (
                                <button key={f.key} onClick={() => setFilter(f.key)}
                                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                        current_filter === f.key
                                            ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-400'
                                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                    }`}>
                                    {f.label}
                                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${current_filter === f.key ? 'bg-emerald-600 text-white dark:bg-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                        {f.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Desktop content ── */}
                    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                        {flash?.success && (
                            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 dark:bg-emerald-950/30">
                                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{flash.success}</p>
                            </div>
                        )}
                        {list.length === 0 && (
                            <div className="flex flex-1 flex-col items-center justify-center py-20 gap-5 text-center">
                                <div className="relative">
                                    <div className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40">
                                        <CalendarDays className="size-9 text-emerald-500" />
                                    </div>
                                    <div className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                                        <Plus className="size-3.5" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-foreground">
                                        {current_filter ? 'Энэ статусын захиалга байхгүй' : 'Захиалга байхгүй'}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                                        {current_filter ? 'Өөр статус сонгож үзнэ үү' : 'Эмчилгээний цаг захиалах товчийг дарна уу'}
                                    </p>
                                </div>
                                {!current_filter && (
                                    <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all active:scale-95">
                                        <Plus className="size-4" />Цаг захиалах
                                    </button>
                                )}
                            </div>
                        )}
                        {list.length > 0 && (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {list.map(apt => <AptCard key={apt.id} apt={apt} />)}
                            </div>
                        )}
                        {(appointments?.last_page ?? 0) > 1 && (
                            <div className="flex items-center justify-center gap-1 pt-2">
                                {appointments!.links.map((link, i) => {
                                    const isArrow = link.label.includes('&laquo;') || link.label.includes('&raquo;');
                                    const isPrev  = link.label.includes('&laquo;');
                                    return link.url ? (
                                        <Link key={i} href={link.url} className={`flex h-9 min-w-[36px] items-center justify-center rounded-xl px-3 text-sm font-medium transition-all ${link.active ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' : 'border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                            {isArrow ? isPrev ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" /> : link.label}
                                        </Link>
                                    ) : (
                                        <span key={i} className="flex h-9 min-w-[36px] items-center justify-center rounded-xl border bg-card px-3 text-sm text-muted-foreground opacity-40">
                                            {isArrow ? isPrev ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" /> : link.label}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            <BookingModal open={modalOpen} onClose={() => setModalOpen(false)} doctors={doctors} />
        </PatientLayout>
    );
}
