import DoctorLayout from '@/layouts/doctor-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
    Clock, Lock, Plus, Trash2, TrendingUp, Video, X, Zap,
} from 'lucide-react';
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
        <div className={`relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm`}>
            <div className={`pointer-events-none absolute -right-4 -top-4 size-20 rounded-full opacity-10 ${accent}`} />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-3xl font-black tabular-nums leading-none">{value}</p>
                    <p className="mt-1.5 text-xs font-medium text-muted-foreground">{label}</p>
                    {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
                </div>
                <div className={`flex size-9 items-center justify-center rounded-xl ${accent} bg-opacity-15`}>
                    <Icon className="size-4" />
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

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* ══ Page header ══════════════════════════════════════ */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Онлайн цагийн хуваарь</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Өвчтөнүүдэд захиалуулах онлайн зөвлөгөөний цагаа удирдана уу
                        </p>
                    </div>
                    <button
                        onClick={() => setShowForm(v => !v)}
                        className={`flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-all ${
                            showForm
                                ? 'bg-muted text-foreground hover:bg-muted/80'
                                : 'bg-red-600 text-white hover:bg-red-700 shadow-red-200 dark:shadow-red-900/30'
                        }`}>
                        {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
                        {showForm ? 'Болих' : 'Цаг нэмэх'}
                    </button>
                </div>

                {/* ══ Stats row ════════════════════════════════════════ */}
                <div className="grid grid-cols-3 gap-4">
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
                    <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
                        <div className="flex items-center gap-2">
                            <Video className="size-4 text-muted-foreground" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                7 хоногийн хуваарь
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="mr-1 text-xs font-medium text-muted-foreground">{weekLabel}</span>
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
                                    <div className="flex items-center gap-4 border-b px-5 py-4">
                                        {/* Calendar date chip */}
                                        <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-red-500 to-red-700 shadow-sm shadow-red-200 dark:shadow-red-900/30">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-red-200 leading-none">{fd.weekday}</span>
                                            <span className="text-xl font-black text-white leading-tight">{fd.day}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm">{fd.weekday}, {fd.day} {fd.month}</p>
                                            {/* Fill rate bar */}
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                                    <div className="h-full rounded-full bg-amber-400 transition-all"
                                                        style={{ width: `${fillPct}%` }} />
                                                </div>
                                                <span className="shrink-0 text-[10px] text-muted-foreground">{fillPct}% дүүрсэн</span>
                                            </div>
                                        </div>
                                        {/* Day stat badges */}
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            {dayBook > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                                    <span className="size-1.5 rounded-full bg-amber-500" />
                                                    {dayBook} захиалсан
                                                </span>
                                            )}
                                            {dayFree > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-950/30 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">
                                                    <span className="size-1.5 rounded-full bg-green-500" />
                                                    {dayFree} чөлөөтэй
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
                                                    className={`group relative flex items-center gap-4 px-5 py-4 transition-colors ${
                                                        slot.is_booked
                                                            ? 'cursor-pointer hover:bg-amber-50/40 dark:hover:bg-amber-950/10'
                                                            : 'hover:bg-green-50/30 dark:hover:bg-green-950/10'
                                                    }`}>

                                                    {/* Colored left accent */}
                                                    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${
                                                        slot.is_booked ? 'bg-amber-400' : 'bg-green-400'
                                                    }`} />

                                                    {/* Index + time icon */}
                                                    <div className={`flex size-10 shrink-0 flex-col items-center justify-center rounded-xl text-[10px] font-black ${
                                                        slot.is_booked
                                                            ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                                                            : 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                                                    }`}>
                                                        <Clock className="size-4" />
                                                    </div>

                                                    {/* Time + visual bar */}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-base font-black tabular-nums leading-none">
                                                                {slot.start_time}
                                                            </span>
                                                            <span className="text-sm text-muted-foreground">–</span>
                                                            <span className="text-base font-black tabular-nums leading-none">
                                                                {slot.end_time}
                                                            </span>
                                                            {durText && (
                                                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                                    {durText}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Mini timeline bar */}
                                                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted/60">
                                                            <div className={`h-full rounded-full transition-all ${
                                                                slot.is_booked ? 'bg-amber-400' : 'bg-green-400'
                                                            }`} style={{ marginLeft: `${startF * 100}%`, width: `${Math.max(1, (endF - startF) * 100)}%` }} />
                                                        </div>
                                                    </div>

                                                    {/* Status badge */}
                                                    {slot.is_booked ? (
                                                        <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-3 py-2">
                                                            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                                                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Захиалагдсан</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-green-100 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 px-3 py-2">
                                                            <CheckCircle2 className="size-3.5 text-green-600 dark:text-green-400" />
                                                            <span className="text-xs font-semibold text-green-700 dark:text-green-400">Чөлөөтэй</span>
                                                        </div>
                                                    )}

                                                    {/* Delete */}
                                                    {!slot.is_booked && (
                                                        <button onClick={() => deleteSlot(slot.id)}
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
