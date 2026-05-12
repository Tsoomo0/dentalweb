import DoctorLayout from '@/layouts/doctor-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
    Clock, Lock, Plus, Trash2, TrendingUp, Video, X, Zap,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { FormEvent, useMemo, useState } from 'react';

/* ─── Types ─────────────────────────────────────────── */
interface SlotAppointment {
    id: number;
    appointment_number: string;
    patient_name: string;
    patient_phone: string;
    patient_email: string | null;
    notes: string | null;
    meet_link: string | null;
    status: string;
    payment_status: string;
}
interface Slot {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    is_booked: boolean;
    appointment?: SlotAppointment;
}
interface Props { slots: Slot[]; hasAccess: boolean }

/* ─── Helpers ────────────────────────────────────────── */
const DAYS_MN   = ['Ням','Дав','Мяг','Лха','Пүр','Баа','Бям'];
const DAYS_SHORT = ['Да','Мя','Лх','Пү','Ба','Бя','Ня'];
const MONTHS_MN = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар',
                   '7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];

function pad2(n: number) { return String(n).padStart(2, '0'); }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }

function parseDate(s: string) { return new Date(s + 'T00:00'); }

function formatFull(s: string) {
    const d = parseDate(s);
    return { day: d.getDate(), month: MONTHS_MN[d.getMonth()], weekday: DAYS_MN[d.getDay()], iso: s };
}

function duration(start: string, end: string): { text: string; mins: number } {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return { text: '', mins: 0 };
    const h = Math.floor(mins / 60), m = mins % 60;
    return { text: h > 0 ? (m > 0 ? `${h}ц ${m}м` : `${h} цаг`) : `${m} мин`, mins };
}

/* Time → 0-1 fraction within 07:00-22:00 day window */
function timeFraction(t: string) {
    const [h, m] = t.split(':').map(Number);
    return Math.max(0, Math.min(1, ((h * 60 + m) - 7 * 60) / (15 * 60)));
}

/* ─── Quick-duration presets ─────────────────────────── */
const PRESETS = [
    { label: '10 мин', mins: 10 },
    { label: '20 мин', mins: 20 },
    { label: '30 мин', mins: 30 },
    { label: '40 мин', mins: 40 },
    { label: '50 мин', mins: 50 },
    { label: '60 мин', mins: 60 },
];

function addMinutes(time: string, mins: number) {
    const [h, m] = time.split(':').map(Number);
    const total  = h * 60 + m + mins;
    return `${pad2(Math.floor(total / 60) % 24)}:${pad2(total % 60)}`;
}

/* ─── Stat card ──────────────────────────────────────── */
function StatCard({ icon: Icon, value, label, sub, accent }:
    { icon: React.ElementType; value: number; label: string; sub?: string; accent: string }) {
    return (
        <div className={`relative overflow-hidden rounded-2xl border bg-card p-3 sm:p-5 shadow-sm`}>
            <div className={`pointer-events-none absolute -right-4 -top-4 size-20 rounded-full opacity-10 ${accent}`} />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-2xl sm:text-3xl font-black tabular-nums leading-none">{value}</p>
                    <p className="mt-1 sm:mt-1.5 text-[10px] sm:text-xs font-medium text-muted-foreground leading-tight">{label}</p>
                    {sub && <p className="hidden sm:block text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
                </div>
                <div className={`flex size-7 sm:size-9 items-center justify-center rounded-xl ${accent} bg-opacity-15`}>
                    <Icon className="size-3.5 sm:size-4" />
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════
   Main component
════════════════════════════════════════════════════════ */
export default function OnlineSlots({ slots, hasAccess }: Props) {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const [showForm,    setShowForm]    = useState(false);
    const [deletingId,  setDeletingId]  = useState<string | null>(null);
    const [showPast,    setShowPast]    = useState(false);
    const [weekOffset,  setWeekOffset]  = useState(0);
    const [activeSlot,  setActiveSlot]  = useState<Slot | null>(null);

    const { data, setData, post, processing, reset } = useForm({
        date: '', start_time: '', end_time: '',
    });

    /* Apply preset duration */
    function applyPreset(mins: number) {
        if (!data.start_time) return;
        setData('end_time', addMinutes(data.start_time, mins));
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/doctor/online-slots', { onSuccess: () => { reset(); setShowForm(false); } });
    }

    function deleteSlot(id: string) {
        setDeletingId(id);
        router.delete(`/doctor/online-slots/${id}`, { onFinish: () => setDeletingId(null) });
    }

    const today    = toDateStr(new Date());
    const todayD   = new Date();

    /* Group slots */
    const grouped = useMemo(() =>
        slots.reduce<Record<string, Slot[]>>((acc, s) => {
            (acc[s.date] ??= []).push(s); return acc;
        }, {}),
    [slots]);

    const upcoming = useMemo(() =>
        Object.entries(grouped).filter(([d]) => d >= today).sort(([a],[b]) => a.localeCompare(b)),
    [grouped, today]);

    const past = useMemo(() =>
        Object.entries(grouped).filter(([d]) => d < today).sort(([a],[b]) => b.localeCompare(a)),
    [grouped, today]);

    /* Stats */
    const totalUpcoming = upcoming.reduce((s,[,a]) => s + a.length, 0);
    const totalBooked   = upcoming.reduce((s,[,a]) => s + a.filter(sl=>sl.is_booked).length, 0);
    const totalFree     = totalUpcoming - totalBooked;

    /* Week strip: Mon-Sun of the offset week */
    const weekDays = useMemo(() => {
        const base  = new Date(todayD);
        const dow   = (base.getDay() + 6) % 7; // Mon=0
        base.setDate(base.getDate() - dow + weekOffset * 7);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(base); d.setDate(base.getDate() + i);
            const iso = toDateStr(d);
            const cnt = grouped[iso]?.length ?? 0;
            const booked = grouped[iso]?.filter(s => s.is_booked).length ?? 0;
            return { d, iso, day: d.getDate(), dow: DAYS_SHORT[i], cnt, booked, isToday: iso === today };
        });
    }, [weekOffset, grouped, today]);

    const weekLabel = (() => {
        const first = weekDays[0], last = weekDays[6];
        if (first.d.getMonth() === last.d.getMonth())
            return `${first.d.getDate()}–${last.d.getDate()} ${MONTHS_MN[first.d.getMonth()]}`;
        return `${first.d.getDate()} ${MONTHS_MN[first.d.getMonth()]} – ${last.d.getDate()} ${MONTHS_MN[last.d.getMonth()]}`;
    })();

    const isMobile = useIsMobile();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Хяналтын самбар', href: '/doctor/dashboard' },
        { title: 'Онлайн цаг',      href: '/doctor/online-slots' },
    ];

    if (!hasAccess) {
        return (
            <DoctorLayout breadcrumbs={breadcrumbs}>
                <Head title="Онлайн цаг" />
                <div className="flex h-full flex-1 flex-col items-center justify-center gap-6 p-6">
                    <div className="flex size-24 items-center justify-center rounded-3xl bg-muted">
                        <Lock className="size-12 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold">Нэвтрэх эрх байхгүй</h1>
                        <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
                            Танд онлайн цаг захиалга хэсэгт нэвтрэх эрх олгогдоогүй байна.
                            Дэлгэрэнгүй мэдээллийг системийн администраторт хандана уу.
                        </p>
                    </div>
                </div>
            </DoctorLayout>
        );
    }

    /* ══════════════════ MOBILE ══════════════════ */
    if (isMobile) {
        const RED = '#dc2626';
        const inpStyle: React.CSSProperties = { width: '100%', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--background)', padding: '10px 12px', fontSize: 13, color: 'var(--foreground)', outline: 'none', boxSizing: 'border-box' };
        return (
            <DoctorLayout breadcrumbs={breadcrumbs}>
                <Head title="Онлайн цаг" />

                {/* ── Appointment detail modal (shared) ── */}
                {activeSlot && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setActiveSlot(null)}>
                        <div style={{ width: '100%', background: 'var(--card)', borderRadius: '28px 28px 0 0', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)', boxShadow: '0 -4px 40px rgba(0,0,0,0.2)', maxHeight: '85svh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                            <div style={{ width: 40, height: 5, background: 'var(--border)', borderRadius: 99, margin: '12px auto 0' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px 12px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Clock style={{ width: 18, height: 18, color: '#f59e0b' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Захиалгын дэлгэрэнгүй</p>
                                    <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)' }}>{activeSlot.date} · {activeSlot.start_time}–{activeSlot.end_time}</p>
                                </div>
                                <button onClick={() => setActiveSlot(null)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X style={{ width: 15, height: 15, color: 'var(--muted-foreground)' }} />
                                </button>
                            </div>
                            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {activeSlot.appointment ? (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--muted)', borderRadius: 12, padding: '10px 13px' }}>
                                            <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 500 }}>Захиалгын дугаар</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'monospace' }}>{activeSlot.appointment.appointment_number}</span>
                                        </div>
                                        <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
                                            <p style={{ margin: 0, padding: '8px 13px', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Үйлчлүүлэгч</p>
                                            {[
                                                { label: 'Нэр', value: activeSlot.appointment.patient_name, link: null },
                                                { label: 'Утас', value: activeSlot.appointment.patient_phone, link: `tel:${activeSlot.appointment.patient_phone}` },
                                                ...(activeSlot.appointment.patient_email ? [{ label: 'И-мэйл', value: activeSlot.appointment.patient_email, link: null }] : []),
                                            ].map((row, i, arr) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 13px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                                    <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{row.label}</span>
                                                    {row.link ? <a href={row.link} style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', textDecoration: 'none' }}>{row.value}</a>
                                                        : <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{row.value}</span>}
                                                </div>
                                            ))}
                                            {activeSlot.appointment.notes && (
                                                <div style={{ padding: '11px 13px', borderTop: '1px solid var(--border)' }}>
                                                    <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Тэмдэглэл</p>
                                                    <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)' }}>{activeSlot.appointment.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                        {activeSlot.appointment.meet_link ? (
                                            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                                <Video style={{ width: 28, height: 28, color: '#3b82f6' }} />
                                                <a href={activeSlot.appointment.meet_link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#2563eb', color: 'white', borderRadius: 14, padding: '12px 22px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                                                    <Video style={{ width: 16, height: 16 }} /> Meet-д орох
                                                </a>
                                                <p style={{ margin: 0, fontSize: 11, color: '#3b82f6', wordBreak: 'break-all', textAlign: 'center' }}>{activeSlot.appointment.meet_link}</p>
                                            </div>
                                        ) : (
                                            <div style={{ borderRadius: 12, border: '1px dashed var(--border)', padding: '12px', textAlign: 'center' }}>
                                                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>Meet линк үүсгэгдээгүй байна{activeSlot.appointment.payment_status !== 'paid' ? ' (төлбөр төлөгдөөгүй)' : ''}</p>
                                            </div>
                                        )}
                                    </>
                                ) : <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>Мэдээлэл олдсонгүй</p>}
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh', background: 'var(--background)' }}>

                    {/* ══ HERO ══ */}
                    <div style={{ background: 'linear-gradient(155deg,#0f172a 0%,#450a0a 55%,#0f172a 100%)', padding: '18px 16px 20px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(220,38,38,0.12)' }} />
                        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                        <div style={{ position: 'absolute', top: 20, left: '40%', width: 60, height: 60, borderRadius: '50%', background: 'rgba(220,38,38,0.08)' }} />

                        {/* Title + add button */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, position: 'relative', zIndex: 1 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(220,38,38,0.25)', border: '1px solid rgba(220,38,38,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Video style={{ width: 15, height: 15, color: '#fca5a5' }} />
                                    </div>
                                    <h1 style={{ margin: 0, color: 'white', fontSize: 20, fontWeight: 800, lineHeight: 1 }}>Онлайн цаг</h1>
                                </div>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Онлайн зөвлөгөөний цагийн хуваарь</p>
                            </div>
                            <button onClick={() => setShowForm(v => !v)} style={{ background: showForm ? 'rgba(255,255,255,0.12)' : RED, color: 'white', border: showForm ? '1px solid rgba(255,255,255,0.2)' : 'none', borderRadius: 14, padding: '9px 15px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: showForm ? 'none' : '0 4px 18px rgba(220,38,38,0.45)', flexShrink: 0 }}>
                                {showForm ? <X style={{ width: 15, height: 15 }} /> : <Plus style={{ width: 15, height: 15 }} />}
                                {showForm ? 'Болих' : 'Нэмэх'}
                            </button>
                        </div>

                        {/* Stat pills */}
                        <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
                            {([
                                { label: 'Нийт цаг', value: totalUpcoming, c: '#60a5fa', bg: 'rgba(96,165,250,0.14)', border: 'rgba(96,165,250,0.25)' },
                                { label: 'Захиалагдсан', value: totalBooked, c: '#fbbf24', bg: 'rgba(251,191,36,0.14)', border: 'rgba(251,191,36,0.25)' },
                                { label: 'Чөлөөтэй', value: totalFree, c: '#34d399', bg: 'rgba(52,211,153,0.14)', border: 'rgba(52,211,153,0.25)' },
                            ] as const).map((s, i) => (
                                <div key={i} style={{ flex: 1, background: s.bg, borderRadius: 16, padding: '11px 12px', border: `1px solid ${s.border}` }}>
                                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.value}</p>
                                    <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 500, lineHeight: 1.2 }}>{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ══ WEEK STRIP ══ */}
                    <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 4px' }}>
                            <button onClick={() => setWeekOffset(v => v - 1)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronLeft style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{weekLabel}</span>
                                {weekOffset !== 0 && (
                                    <button onClick={() => setWeekOffset(0)} style={{ background: 'rgba(220,38,38,0.1)', color: RED, border: 'none', borderRadius: 8, padding: '3px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Өнөөдөр</button>
                                )}
                            </div>
                            <button onClick={() => setWeekOffset(v => v + 1)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronRight style={{ width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', padding: '4px 10px 12px' }}>
                            {weekDays.map(({ iso, day, dow, cnt, booked, isToday }) => {
                                const free = cnt - booked;
                                const isPast = iso < today;
                                return (
                                    <div key={iso} onClick={() => { if (!isPast && cnt === 0) { setShowForm(true); setData('date', iso); } }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: isPast ? 0.35 : 1, cursor: !isPast && cnt === 0 ? 'pointer' : 'default' }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const }}>{dow}</span>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: isToday ? RED : cnt > 0 ? 'rgba(59,130,246,0.1)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: isToday ? 'white' : cnt > 0 ? '#3b82f6' : 'var(--foreground)', boxShadow: isToday ? '0 4px 14px rgba(220,38,38,0.4)' : 'none', transition: 'all 0.15s' }}>
                                            {day}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: 10 }}>
                                            {booked > 0 && <div style={{ width: 18, height: 3, borderRadius: 99, background: '#f59e0b' }} />}
                                            {free > 0 && <div style={{ width: 18, height: 3, borderRadius: 99, background: '#10b981' }} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ══ SCROLLABLE CONTENT ══ */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '14px', paddingBottom: 'calc(96px + env(safe-area-inset-bottom,0px))', display: 'flex', flexDirection: 'column', gap: 12 }}>

                        {/* ── ADD FORM ── */}
                        {showForm && (
                            <div style={{ background: 'var(--card)', borderRadius: 20, border: `2px solid rgba(220,38,38,0.2)`, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 4px 20px rgba(220,38,38,0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Plus style={{ width: 16, height: 16, color: RED }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Шинэ онлайн цаг</p>
                                        <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)' }}>Огноо болон цагийг оруулна уу</p>
                                    </div>
                                    <button onClick={() => { setShowForm(false); reset(); }} style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <X style={{ width: 14, height: 14, color: 'var(--muted-foreground)' }} />
                                    </button>
                                </div>

                                {/* Date */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6 }}>Огноо <span style={{ color: RED }}>*</span></label>
                                    <input type="date" value={data.date} min={today} onChange={e => setData('date', e.target.value)} style={inpStyle} />
                                    {errors.date && <p style={{ margin: '4px 0 0', fontSize: 11, color: RED }}>{errors.date}</p>}
                                </div>

                                {/* Time inputs side-by-side */}
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6 }}>Эхлэх цаг <span style={{ color: RED }}>*</span></label>
                                        <input type="time" value={data.start_time} onChange={e => setData('start_time', e.target.value)} style={inpStyle} />
                                        {errors.start_time && <p style={{ margin: '4px 0 0', fontSize: 11, color: RED }}>{errors.start_time}</p>}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6 }}>Дуусах цаг <span style={{ color: RED }}>*</span></label>
                                        <input type="time" value={data.end_time} onChange={e => setData('end_time', e.target.value)} style={inpStyle} />
                                        {errors.end_time && <p style={{ margin: '4px 0 0', fontSize: 11, color: RED }}>{errors.end_time}</p>}
                                    </div>
                                </div>

                                {/* Quick presets */}
                                <div>
                                    <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <Zap style={{ width: 12, height: 12 }} /> Хурдан сонголт
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                                        {PRESETS.map(p => (
                                            <button key={p.mins} type="button" onClick={() => applyPreset(p.mins)} disabled={!data.start_time} style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', borderRadius: 10, padding: '7px 13px', fontSize: 12, fontWeight: 700, cursor: data.start_time ? 'pointer' : 'not-allowed', opacity: data.start_time ? 1 : 0.4, transition: 'all 0.15s' }}>
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Duration preview */}
                                {data.start_time && data.end_time && (() => {
                                    const { text, mins } = duration(data.start_time, data.end_time);
                                    const startF = timeFraction(data.start_time);
                                    const endF   = timeFraction(data.end_time);
                                    if (mins <= 0) return null;
                                    return (
                                        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                    <Clock style={{ width: 15, height: 15, color: '#3b82f6' }} />
                                                    <span style={{ fontSize: 14, fontWeight: 800, color: '#3b82f6' }}>{data.start_time} – {data.end_time}</span>
                                                </div>
                                                <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 800 }}>{text}</span>
                                            </div>
                                            <div style={{ height: 6, borderRadius: 99, background: 'var(--muted)', overflow: 'hidden', position: 'relative' }}>
                                                <div style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#3b82f6,#6366f1)', left: `${startF * 100}%`, width: `${Math.max(1, (endF - startF) * 100)}%` }} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted-foreground)' }}>
                                                <span>07:00</span><span>14:30</span><span>22:00</span>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Submit */}
                                <div style={{ display: 'flex', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                                    <button type="button" onClick={(e) => submit(e as unknown as FormEvent)} disabled={processing} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: RED, color: 'white', border: 'none', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: processing ? 0.6 : 1, boxShadow: '0 4px 14px rgba(220,38,38,0.35)' }}>
                                        {processing ? <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> : <Plus style={{ width: 16, height: 16 }} />}
                                        {processing ? 'Хадгалж байна…' : 'Нэмэх'}
                                    </button>
                                    <button type="button" onClick={() => { setShowForm(false); reset(); }} style={{ flex: 1, background: 'var(--muted)', color: 'var(--muted-foreground)', border: 'none', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Болих</button>
                                </div>
                            </div>
                        )}

                        {/* ── UPCOMING SLOTS ── */}
                        {upcoming.length > 0 ? (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <CalendarDays style={{ width: 15, height: 15, color: RED }} />
                                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Ирэх цагуудын хуваарь</span>
                                    <span style={{ marginLeft: 'auto', background: 'rgba(220,38,38,0.1)', color: RED, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{totalUpcoming} цаг · {upcoming.length} өдөр</span>
                                </div>
                                {upcoming.map(([date, daySlots]) => {
                                    const fd      = formatFull(date);
                                    const sorted  = [...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
                                    const dayBook = daySlots.filter(s => s.is_booked).length;
                                    const dayFree = daySlots.length - dayBook;
                                    const fillPct = daySlots.length > 0 ? Math.round(dayBook / daySlots.length * 100) : 0;
                                    return (
                                        <div key={date} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                                            {/* Day header */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                                                <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(145deg,#ef4444,#b91c1c)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}>
                                                    <span style={{ fontSize: 7, fontWeight: 800, color: 'rgba(255,200,200,0.85)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{fd.weekday.slice(0,3)}</span>
                                                    <span style={{ fontSize: 19, fontWeight: 900, color: 'white', lineHeight: 1 }}>{fd.day}</span>
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{fd.weekday}, {fd.day} {fd.month}</p>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}>
                                                        <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${fillPct}%`, background: 'linear-gradient(90deg,#f59e0b,#f97316)', borderRadius: 99, transition: 'width 0.3s ease' }} />
                                                        </div>
                                                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, flexShrink: 0 }}>{fillPct}%</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                                    {dayBook > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(245,158,11,0.12)', color: '#d97706', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />{dayBook}</span>}
                                                    {dayFree > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', color: '#059669', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />{dayFree}</span>}
                                                </div>
                                            </div>
                                            {/* Slot rows */}
                                            <div>
                                                {sorted.map((slot, idx) => {
                                                    const { text: durText, mins: durMins } = duration(slot.start_time, slot.end_time);
                                                    const startF = timeFraction(slot.start_time);
                                                    const endF   = timeFraction(slot.end_time);
                                                    const isBooked = slot.is_booked;
                                                    const accentColor = isBooked ? '#f59e0b' : '#10b981';
                                                    return (
                                                        <div key={slot.id} onClick={() => isBooked && setActiveSlot(slot)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px', borderBottom: idx < sorted.length - 1 ? '1px solid var(--border)' : 'none', position: 'relative', cursor: isBooked ? 'pointer' : 'default', background: isBooked ? 'rgba(245,158,11,0.02)' : 'transparent' }}>
                                                            {/* left accent */}
                                                            <div style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 4, borderRadius: 99, background: accentColor }} />
                                                            {/* icon */}
                                                            <div style={{ width: 42, height: 42, borderRadius: 13, background: isBooked ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${accentColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                <Clock style={{ width: 18, height: 18, color: accentColor }} />
                                                            </div>
                                                            {/* time info */}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>
                                                                    {slot.start_time} <span style={{ color: 'var(--muted-foreground)', fontWeight: 300 }}>–</span> {slot.end_time}
                                                                </p>
                                                                {durText && (
                                                                    <div style={{ marginTop: 5 }}>
                                                                        <div style={{ height: 3, borderRadius: 99, background: 'var(--muted)', overflow: 'hidden', marginBottom: 3 }}>
                                                                            <div style={{ height: '100%', background: accentColor, borderRadius: 99, marginLeft: `${startF * 100}%`, width: `${Math.max(2, (endF - startF) * 100)}%` }} />
                                                                        </div>
                                                                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{durText}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* right side */}
                                                            {isBooked ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 999, padding: '6px 11px', flexShrink: 0 }}>
                                                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
                                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>Захиалагдсан</span>
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, padding: '6px 10px' }}>
                                                                        <CheckCircle2 style={{ width: 12, height: 12, color: '#10b981' }} />
                                                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>Чөлөөтэй</span>
                                                                    </div>
                                                                    <button onClick={e => { e.stopPropagation(); deleteSlot(slot.id); }} disabled={deletingId === slot.id} style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: deletingId === slot.id ? 0.5 : 1 }}>
                                                                        {deletingId === slot.id
                                                                            ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(239,68,68,0.3)', borderTopColor: '#ef4444', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                                                                            : <Trash2 style={{ width: 14, height: 14, color: '#ef4444' }} />}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        ) : (
                            /* ── Empty state ── */
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--card)', borderRadius: 24, border: '2px dashed var(--border)', padding: '48px 24px', textAlign: 'center' }}>
                                <div style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(99,102,241,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                    <Video style={{ width: 32, height: 32, color: '#3b82f6' }} />
                                </div>
                                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>Онлайн цаг байхгүй байна</p>
                                <p style={{ margin: '6px 0 20px', fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5, maxWidth: 260 }}>Өвчтөнүүдэд онлайн зөвлөгөө авах боломж олгохын тулд цагаа нэмэх хэрэгтэй</p>
                                <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: RED, color: 'white', border: 'none', borderRadius: 14, padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(220,38,38,0.35)' }}>
                                    <Plus style={{ width: 16, height: 16 }} /> Эхний цагаа нэмэх
                                </button>
                            </div>
                        )}

                        {/* ── PAST SLOTS ── */}
                        {past.length > 0 && (
                            <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
                                <button onClick={() => setShowPast(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)' }}>
                                        <Clock style={{ width: 15, height: 15 }} />
                                        Өнгөрсөн цагуудын түүх
                                        <span style={{ background: 'var(--muted)', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{past.reduce((s, [, a]) => s + a.length, 0)}</span>
                                    </span>
                                    <ChevronDown style={{ width: 16, height: 16, color: 'var(--muted-foreground)', transform: showPast ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                </button>
                                {showPast && (
                                    <div style={{ borderTop: '1px solid var(--border)' }}>
                                        {past.map(([date, daySlots]) => {
                                            const fd = formatFull(date);
                                            return (
                                                <div key={date} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'var(--muted)' }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: 9, background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--muted-foreground)', flexShrink: 0 }}>{fd.day}</div>
                                                        <p style={{ margin: 0, flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>{fd.weekday}, {fd.day} {fd.month}</p>
                                                        <span style={{ background: 'var(--background)', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)' }}>{daySlots.length} цаг</span>
                                                    </div>
                                                    <div style={{ opacity: 0.5 }}>
                                                        {[...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time)).map((slot, i, arr) => (
                                                            <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderTop: '1px solid var(--border)' }}>
                                                                <Clock style={{ width: 13, height: 13, color: 'var(--muted-foreground)', flexShrink: 0 }} />
                                                                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{slot.start_time} – {slot.end_time}</span>
                                                                <span style={{ fontSize: 11, fontWeight: 600, color: slot.is_booked ? '#d97706' : 'var(--muted-foreground)' }}>{slot.is_booked ? 'Захиалагдсан' : 'Хэрэглэгдээгүй'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </DoctorLayout>
        );
    }

    return (
        <DoctorLayout breadcrumbs={breadcrumbs}>
            <Head title="Онлайн цаг" />

            {/* ══ Appointment detail modal ══════════════════════════ */}
            {activeSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setActiveSlot(null)}>
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl border"
                        onClick={e => e.stopPropagation()}>

                        {/* Modal header */}
                        <div className="flex items-center justify-between border-b bg-amber-50 dark:bg-amber-950/20 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/40">
                                    <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">Захиалгын дэлгэрэнгүй</p>
                                    <p className="text-xs text-muted-foreground">
                                        {activeSlot.date} · {activeSlot.start_time}–{activeSlot.end_time}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setActiveSlot(null)}
                                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {activeSlot.appointment ? (
                                <>
                                    {/* Appointment number */}
                                    <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-2.5">
                                        <span className="text-xs text-muted-foreground font-medium">Захиалгын дугаар</span>
                                        <span className="text-sm font-bold">{activeSlot.appointment.appointment_number}</span>
                                    </div>

                                    {/* Patient info */}
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Үйлчлүүлэгчийн мэдээлэл</p>
                                        <div className="rounded-xl border divide-y overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-3">
                                                <span className="text-xs text-muted-foreground">Нэр</span>
                                                <span className="text-sm font-semibold">{activeSlot.appointment.patient_name}</span>
                                            </div>
                                            <div className="flex items-center justify-between px-4 py-3">
                                                <span className="text-xs text-muted-foreground">Утас</span>
                                                <a href={`tel:${activeSlot.appointment.patient_phone}`}
                                                    className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                                    {activeSlot.appointment.patient_phone}
                                                </a>
                                            </div>
                                            {activeSlot.appointment.patient_email && (
                                                <div className="flex items-center justify-between px-4 py-3">
                                                    <span className="text-xs text-muted-foreground">И-мэйл</span>
                                                    <span className="text-sm font-semibold">{activeSlot.appointment.patient_email}</span>
                                                </div>
                                            )}
                                            {activeSlot.appointment.notes && (
                                                <div className="px-4 py-3">
                                                    <span className="text-xs text-muted-foreground">Тэмдэглэл</span>
                                                    <p className="mt-1 text-sm">{activeSlot.appointment.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Meet link */}
                                    {activeSlot.appointment.meet_link ? (
                                        <div className="space-y-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Google Meet линк</p>
                                            <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40 p-4 text-center space-y-3">
                                                <Video className="size-8 text-blue-500 mx-auto" />
                                                <a href={activeSlot.appointment.meet_link} target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-sm">
                                                    <Video className="size-4" />
                                                    Meet-д орох
                                                </a>
                                                <p className="text-xs text-blue-600 dark:text-blue-400 break-all">
                                                    {activeSlot.appointment.meet_link}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-dashed px-4 py-3 text-center">
                                            <p className="text-xs text-muted-foreground">
                                                Meet линк үүсгэгдээгүй байна
                                                {activeSlot.appointment.payment_status !== 'paid' && ' (төлбөр төлөгдөөгүй)'}
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="py-6 text-center">
                                    <p className="text-sm text-muted-foreground">Захиалгын мэдээлэл олдсонгүй</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex h-full flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6">

                {/* ══ Page header ══════════════════════════════════════ */}
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold truncate">Онлайн цагийн хуваарь</h1>
                        <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground hidden sm:block">
                            Өвчтөнүүдэд захиалуулах онлайн зөвлөгөөний цагаа удирдана уу
                        </p>
                    </div>
                    <button
                        onClick={() => setShowForm(v => !v)}
                        className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 sm:px-5 sm:py-2.5 text-sm font-semibold shadow-sm transition-all ${
                            showForm
                                ? 'bg-muted text-foreground hover:bg-muted/80'
                                : 'bg-red-600 text-white hover:bg-red-700 shadow-red-200 dark:shadow-red-900/30'
                        }`}>
                        {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
                        {showForm ? 'Болих' : 'Цаг нэмэх'}
                    </button>
                </div>

                {/* ══ Stats row ════════════════════════════════════════ */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <StatCard icon={CalendarDays} value={totalUpcoming} label="Ирэх цагууд"
                        sub={totalUpcoming > 0 ? `${upcoming.length} өдөр` : undefined}
                        accent="bg-blue-500 text-blue-600 dark:text-blue-400" />
                    <StatCard icon={TrendingUp} value={totalBooked} label="Захиалагдсан"
                        sub={totalUpcoming > 0 ? `${Math.round(totalBooked/totalUpcoming*100)}%` : undefined}
                        accent="bg-amber-500 text-amber-600 dark:text-amber-400" />
                    <StatCard icon={CheckCircle2} value={totalFree} label="Чөлөөтэй"
                        sub="захиалах боломжтой"
                        accent="bg-green-500 text-green-600 dark:text-green-400" />
                </div>

                {/* ══ Week strip ═══════════════════════════════════════ */}
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2.5 sm:px-5 sm:py-3">
                        <div className="flex items-center gap-1.5">
                            <Video className="size-3.5 text-muted-foreground" />
                            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden xs:block">
                                7 хоногийн хуваарь
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="mr-1 text-[11px] sm:text-xs font-medium text-muted-foreground">{weekLabel}</span>
                            <button onClick={() => setWeekOffset(v => v - 1)}
                                className="flex size-7 items-center justify-center rounded-lg hover:bg-muted transition-colors">
                                <ChevronLeft className="size-4 text-muted-foreground" />
                            </button>
                            {weekOffset !== 0 && (
                                <button onClick={() => setWeekOffset(0)}
                                    className="rounded-lg px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                                    Өнөөдөр
                                </button>
                            )}
                            <button onClick={() => setWeekOffset(v => v + 1)}
                                className="flex size-7 items-center justify-center rounded-lg hover:bg-muted transition-colors">
                                <ChevronRight className="size-4 text-muted-foreground" />
                            </button>
                        </div>
                    </div>

                    {/* Day cells */}
                    <div className="grid grid-cols-7 divide-x">
                        {weekDays.map(({ d, iso, day, dow, cnt, booked, isToday }) => {
                            const free = cnt - booked;
                            const isPast = iso < today;
                            return (
                                <div key={iso}
                                    onClick={() => { if (!isPast && cnt === 0) { setShowForm(true); setData('date', iso); } }}
                                    className={`flex flex-col items-center gap-2 px-2 py-4 transition-colors
                                        ${isPast ? 'opacity-40' : cnt === 0 ? 'cursor-pointer hover:bg-muted/30' : ''}
                                    `}>
                                    {/* Day label */}
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{dow}</span>

                                    {/* Date circle */}
                                    <div className={`flex size-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                                        isToday
                                            ? 'bg-red-600 text-white shadow-sm shadow-red-200 dark:shadow-red-900/30'
                                            : cnt > 0
                                                ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                                                : 'text-foreground'
                                    }`}>
                                        {day}
                                    </div>

                                    {/* Slot pills */}
                                    {cnt > 0 ? (
                                        <div className="flex flex-col items-center gap-1 w-full">
                                            {booked > 0 && (
                                                <div className="w-full rounded-full bg-amber-400/80 text-center"
                                                    style={{ height: 4 }} />
                                            )}
                                            {free > 0 && (
                                                <div className="w-full rounded-full bg-green-400/80"
                                                    style={{ height: 4 }} />
                                            )}
                                            <span className="text-[10px] font-semibold text-muted-foreground">{cnt} цаг</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1">
                                            {!isPast && (
                                                <div className="w-5 border-t border-dashed border-muted-foreground/20" />
                                            )}
                                            <span className="text-[9px] text-muted-foreground/40">{isPast ? '' : '+ нэмэх'}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ══ Add slot form ════════════════════════════════════ */}
                {showForm && (
                    <div className="overflow-hidden rounded-2xl border bg-card shadow-md">
                        <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-4">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/40">
                                <Plus className="size-4 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Шинэ онлайн цаг нэмэх</p>
                                <p className="text-[11px] text-muted-foreground">Огноо болон цагийн мэдээллийг оруулна уу</p>
                            </div>
                            <button onClick={() => { setShowForm(false); reset(); }}
                                className="ml-auto flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>

                        <form onSubmit={submit} className="p-5 space-y-5">
                            {/* Inputs row */}
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Огноо <span className="text-red-500">*</span>
                                    </label>
                                    <input type="date" value={data.date} min={today}
                                        onChange={e => setData('date', e.target.value)}
                                        className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                    {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Эхлэх цаг <span className="text-red-500">*</span>
                                    </label>
                                    <input type="time" value={data.start_time}
                                        onChange={e => setData('start_time', e.target.value)}
                                        className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                    {errors.start_time && <p className="text-xs text-red-500">{errors.start_time}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Дуусах цаг <span className="text-red-500">*</span>
                                    </label>
                                    <input type="time" value={data.end_time}
                                        onChange={e => setData('end_time', e.target.value)}
                                        className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                    {errors.end_time && <p className="text-xs text-red-500">{errors.end_time}</p>}
                                </div>
                            </div>

                            {/* Quick preset buttons */}
                            <div className="space-y-2">
                                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    <Zap className="size-3" /> Хурдан сонголт
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {PRESETS.map(p => (
                                        <button key={p.mins} type="button"
                                            onClick={() => applyPreset(p.mins)}
                                            disabled={!data.start_time}
                                            className="rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-800 dark:hover:bg-red-950/20 disabled:opacity-40 disabled:cursor-not-allowed">
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Duration preview */}
                            {data.start_time && data.end_time && (() => {
                                const { text, mins } = duration(data.start_time, data.end_time);
                                const startF = timeFraction(data.start_time);
                                const endF   = timeFraction(data.end_time);
                                if (mins <= 0) return null;
                                return (
                                    <div className="rounded-xl border bg-blue-50/50 dark:bg-blue-950/10 p-4 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Clock className="size-4 text-blue-500" />
                                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                                                    {data.start_time} – {data.end_time}
                                                </span>
                                            </div>
                                            <span className="rounded-full bg-blue-100 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                                                {text}
                                            </span>
                                        </div>
                                        {/* Timeline bar */}
                                        <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                                            <div className="absolute top-0 h-full rounded-full bg-blue-500"
                                                style={{ left: `${startF * 100}%`, width: `${(endF - startF) * 100}%` }} />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-muted-foreground">
                                            <span>07:00</span><span>14:30</span><span>22:00</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="flex gap-3 pt-1">
                                <button type="submit" disabled={processing}
                                    className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
                                    {processing ? (
                                        <><span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Хадгалж байна...</>
                                    ) : (
                                        <><Plus className="size-4" /> Нэмэх</>
                                    )}
                                </button>
                                <button type="button" onClick={() => { setShowForm(false); reset(); }}
                                    className="rounded-xl border px-6 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                                    Болих
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ══ Upcoming slots ═══════════════════════════════════ */}
                {upcoming.length > 0 ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="size-4 text-red-500" />
                            <h2 className="text-sm font-semibold">Ирэх цагуудын хуваарь</h2>
                            <span className="ml-auto rounded-full bg-red-100 dark:bg-red-950/40 px-2.5 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">
                                {totalUpcoming} цаг · {upcoming.length} өдөр
                            </span>
                        </div>

                        {upcoming.map(([date, daySlots]) => {
                            const fd      = formatFull(date);
                            const sorted  = [...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
                            const dayBook = daySlots.filter(s => s.is_booked).length;
                            const dayFree = daySlots.length - dayBook;
                            const fillPct = daySlots.length > 0 ? Math.round(dayBook / daySlots.length * 100) : 0;

                            return (
                                <div key={date} className="overflow-hidden rounded-2xl border bg-card shadow-sm">

                                    {/* ── Date header ── */}
                                    <div className="flex items-center gap-3 border-b px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
                                        {/* Calendar date chip */}
                                        <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl sm:size-12 sm:rounded-2xl bg-gradient-to-b from-red-500 to-red-700 shadow-sm shadow-red-200 dark:shadow-red-900/30">
                                            <span className="text-[8px] font-bold uppercase tracking-widest text-red-200 leading-none">{fd.weekday.slice(0,3)}</span>
                                            <span className="text-lg sm:text-xl font-black text-white leading-tight">{fd.day}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm">{fd.weekday}, {fd.day} {fd.month}</p>
                                            {/* Fill rate bar */}
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                                    <div className="h-full rounded-full bg-amber-400 transition-all"
                                                        style={{ width: `${fillPct}%` }} />
                                                </div>
                                                <span className="shrink-0 text-[10px] text-muted-foreground">{fillPct}%</span>
                                            </div>
                                        </div>
                                        {/* Day stat badges */}
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            {dayBook > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                                    <span className="size-1.5 rounded-full bg-amber-500" />
                                                    {dayBook}
                                                </span>
                                            )}
                                            {dayFree > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-950/30 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">
                                                    <span className="size-1.5 rounded-full bg-green-500" />
                                                    {dayFree}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Slots ── */}
                                    <div className="divide-y">
                                        {sorted.map((slot, idx) => {
                                            const { text: durText, mins: durMins } = duration(slot.start_time, slot.end_time);
                                            const startF = timeFraction(slot.start_time);
                                            const endF   = timeFraction(slot.end_time);

                                            return (
                                                <div key={slot.id}
                                                    onClick={() => slot.is_booked && setActiveSlot(slot)}
                                                    className={`group relative flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4 transition-colors ${
                                                        slot.is_booked
                                                            ? 'cursor-pointer hover:bg-amber-50/40 dark:hover:bg-amber-950/10'
                                                            : 'hover:bg-green-50/30 dark:hover:bg-green-950/10'
                                                    }`}>

                                                    {/* Colored left accent */}
                                                    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${
                                                        slot.is_booked ? 'bg-amber-400' : 'bg-green-400'
                                                    }`} />

                                                    {/* Time icon */}
                                                    <div className={`flex size-9 shrink-0 flex-col items-center justify-center rounded-xl text-[10px] font-black ${
                                                        slot.is_booked
                                                            ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                                                            : 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                                                    }`}>
                                                        <Clock className="size-4" />
                                                    </div>

                                                    {/* Time + visual bar */}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-sm sm:text-base font-black tabular-nums leading-none">
                                                                {slot.start_time}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">–</span>
                                                            <span className="text-sm sm:text-base font-black tabular-nums leading-none">
                                                                {slot.end_time}
                                                            </span>
                                                            {durText && (
                                                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                                    {durText}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Mini timeline bar */}
                                                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/60">
                                                            <div className={`h-full rounded-full transition-all ${
                                                                slot.is_booked ? 'bg-amber-400' : 'bg-green-400'
                                                            }`} style={{ marginLeft: `${startF * 100}%`, width: `${Math.max(1, (endF - startF) * 100)}%` }} />
                                                        </div>
                                                    </div>

                                                    {/* Status badge */}
                                                    {slot.is_booked ? (
                                                        <div className="flex shrink-0 items-center gap-1 rounded-xl bg-amber-100 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-2.5 py-1.5 sm:gap-1.5 sm:px-3 sm:py-2">
                                                            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                                                            <span className="text-[11px] sm:text-xs font-semibold text-amber-700 dark:text-amber-400">Захиалагдсан</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex shrink-0 items-center gap-1 rounded-xl bg-green-100 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 px-2.5 py-1.5 sm:gap-1.5 sm:px-3 sm:py-2">
                                                            <CheckCircle2 className="size-3 sm:size-3.5 text-green-600 dark:text-green-400" />
                                                            <span className="text-[11px] sm:text-xs font-semibold text-green-700 dark:text-green-400">Чөлөөтэй</span>
                                                        </div>
                                                    )}

                                                    {/* Delete */}
                                                    {!slot.is_booked && (
                                                        <button onClick={(e) => { e.stopPropagation(); deleteSlot(slot.id); }}
                                                            disabled={deletingId === slot.id}
                                                            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 transition-all disabled:opacity-50">
                                                            {deletingId === slot.id
                                                                ? <span className="size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                                : <Trash2 className="size-4" />
                                                            }
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* ── Empty state ── */
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-8 py-20 text-center">
                        <div className="mb-5 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/40">
                            <Video className="size-9 text-blue-500 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold">Онлайн цаг байхгүй байна</h3>
                        <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
                            Өвчтөнүүдэд онлайн зөвлөгөө авах боломж олгохын тулд цагаа нэмэх хэрэгтэй
                        </p>
                        <button onClick={() => setShowForm(true)}
                            className="mt-6 flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm shadow-red-200 dark:shadow-red-900/30">
                            <Plus className="size-4" />
                            Эхний цагаа нэмэх
                        </button>
                    </div>
                )}

                {/* ══ Past slots ═══════════════════════════════════════ */}
                {past.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        <button onClick={() => setShowPast(v => !v)}
                            className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-muted/30">
                            <span className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
                                <Clock className="size-4" />
                                Өнгөрсөн цагуудын түүх
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">
                                    {past.reduce((s, [, a]) => s + a.length, 0)}
                                </span>
                            </span>
                            <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${showPast ? 'rotate-180' : ''}`} />
                        </button>

                        {showPast && (
                            <div className="border-t">
                                {past.map(([date, daySlots]) => {
                                    const fd = formatFull(date);
                                    return (
                                        <div key={date} className="border-b last:border-b-0">
                                            <div className="flex items-center gap-3 bg-muted/20 px-5 py-2.5">
                                                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-black text-muted-foreground">
                                                    {fd.day}
                                                </div>
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                    {fd.weekday}, {fd.day} {fd.month}
                                                </p>
                                                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                                                    {daySlots.length} цаг
                                                </span>
                                            </div>
                                            <div className="divide-y opacity-50">
                                                {[...daySlots]
                                                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                                    .map(slot => (
                                                        <div key={slot.id} className="flex items-center gap-3 px-5 py-2.5">
                                                            <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                                                            <span className="flex-1 text-sm font-medium tabular-nums">
                                                                {slot.start_time} – {slot.end_time}
                                                            </span>
                                                            <span className={`text-[11px] font-semibold ${slot.is_booked ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                                                {slot.is_booked ? 'Захиалагдсан' : 'Хэрэглэгдээгүй'}
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div className="h-4" />
            </div>
        </DoctorLayout>
    );
}
