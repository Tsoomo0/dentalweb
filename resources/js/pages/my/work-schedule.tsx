import MyLayout from '@/layouts/my-layout';
import { ChatIcon } from '@/components/chat-icon';
import { NotificationBell } from '@/components/notification-bell';
import { ToastContainer } from '@/components/toast';
import { DOW_FULL, DOW_SHORT, MONTHS, dowIndex, fmtHours, inkOn, parseDS, todayDS } from '@/components/schedule/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlarmClock, ArrowLeftRight, Ban, Building2, Check, ChevronLeft, ChevronRight, Clock, DoorOpen,
    Fingerprint, Hourglass, MapPin, Stethoscope, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

/**
 * Ажилтны өөрийн хуваарь: нийтлэгдсэн ээлж + ирцийн харьцуулалт (хоцорсон, илүү цаг),
 * "боломжгүй өдөр" тэмдэглэх, ээлж шилжүүлэх/солилцох хүсэлт.
 */

interface DayShift {
    id: number; kind: 'work' | 'off'; name: string; code: string | null; color: string;
    start_time: string | null; end_time: string | null; minutes: number;
    branch: string | null; doctor: string | null; room: string | null; note: string | null; swap_pending: boolean;
}
interface DayAttendance { in: string | null; out: string | null; status: string | null; late: number; early: number; overtime: number; worked: number; }
interface Day {
    date: string; shifts: DayShift[];
    leave: { type: string; label: string; status: string } | null;
    unavailable: { id: number; note: string | null } | null;
    attendance: DayAttendance | null;
}
interface Swap {
    id: number; direction: 'in' | 'out'; status: string; status_label: string; is_swap: boolean;
    other: string | null; shift: string | null; target_shift: string | null; note: string | null;
    rejection_reason: string | null; can_respond: boolean; can_cancel: boolean;
}
interface Colleague { id: number; name: string; position: string | null; same_position: boolean; shifts: { id: number; date: string; label: string }[]; }
interface PageProps {
    employee: { id: number; full_name: string; position: string | null; branch: string | null; photo_url: string | null; initials: string } | null;
    month?: string; days?: Day[]; swaps?: Swap[]; colleagues?: Colleague[];
    [key: string]: unknown;
}

const STATUS: Record<string, { label: string; cls: string }> = {
    on_time: { label: 'Цагтаа', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    late: { label: 'Хоцорсон', cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
    absent: { label: 'Ирээгүй', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
    missing: { label: 'Ирээгүй байна', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
    unscheduled: { label: 'Хуваарьгүй өдөр', cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
    present: { label: 'Ирсэн', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    leave: { label: 'Чөлөөтэй', cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
};

export default function MyWorkSchedule() {
    const { employee, month = '', days = [], swaps = [], colleagues = [] } = usePage<PageProps>().props;
    const today = todayDS();
    const [selected, setSelected] = useState<string>(() => days.some(d => d.date === today) ? today : days[0]?.date ?? today);
    const [swapFor, setSwapFor] = useState<DayShift & { date: string } | null>(null);

    useEffect(() => {
        if (!days.some(d => d.date === selected)) setSelected(days.some(d => d.date === today) ? today : days[0]?.date ?? today);
    }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

    const stats = useMemo(() => {
        const work = days.filter(d => d.shifts.some(s => s.kind === 'work'));
        return {
            workDays: work.length,
            minutes: work.reduce((a, d) => a + d.shifts.reduce((b, s) => b + s.minutes, 0), 0),
            late: days.filter(d => (d.attendance?.late ?? 0) > 0).length,
            overtime: days.reduce((a, d) => a + (d.attendance?.overtime ?? 0), 0),
        };
    }, [days]);

    if (!employee) {
        return (
            <MyLayout breadcrumbs={[{ title: 'Ажлын хуваарь', href: '/my/work-schedule' }]}>
                <Head title="Ажлын хуваарь" />
                <p className="p-8 text-center text-sm text-muted-foreground">Таны ажилтны бүртгэл олдсонгүй. HR-т хандана уу.</p>
            </MyLayout>
        );
    }

    const [y, m] = month.split('-').map(Number);
    const go = (dy: number) => {
        const d = new Date(y, m - 1 + dy, 1);
        router.get('/my/work-schedule', { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }, { preserveState: true, preserveScroll: true });
    };

    const day = days.find(d => d.date === selected);
    const lead = days.length ? dowIndex(days[0].date) : 0;
    const incoming = swaps.filter(s => s.can_respond);

    return (
        <MyLayout breadcrumbs={[{ title: 'Ажлын хуваарь', href: '/my/work-schedule' }]}>
            <Head title="Ажлын хуваарь" />
            <div className="flex-1 overflow-y-auto pb-28 md:pb-8" style={{ background: 'var(--my-page-bg)', WebkitOverflowScrolling: 'touch' }}>

                {/* ── Толгой ── */}
                <div className="relative overflow-hidden px-4 pb-5 pt-3 md:mx-6 md:mt-6 md:rounded-3xl md:px-6"
                    style={{ background: 'linear-gradient(160deg, #ef4444 0%, #dc2626 30%, #b91c1c 65%, #7f1d1d 100%)' }}>
                    <div className="pointer-events-none absolute -right-14 -top-16 size-48 rounded-full bg-white/5" />
                    <div className="relative flex items-center gap-2.5 md:hidden">
                        <span className="flex-1 text-[11px] font-semibold tracking-wide text-white/65">HR · АЖЛЫН ХУВААРЬ</span>
                        <ChatIcon variant="ghost" />
                        <NotificationBell variant="ghost" />
                        <Link href="/my/profile" className="size-9 overflow-hidden rounded-full border-2 border-white/50 bg-white/20">
                            {employee.photo_url ? <img src={employee.photo_url} alt="" className="size-full object-cover object-top" />
                                : <span className="flex size-full items-center justify-center text-xs font-extrabold text-white">{employee.initials}</span>}
                        </Link>
                    </div>
                    <h1 className="relative mt-3 leading-none text-white">
                        <span className="text-3xl font-black">Ажлын </span>
                        <span className="font-serif text-2xl font-light italic text-white/70">хуваарь</span>
                    </h1>
                    <p className="relative mt-1.5 text-xs font-medium text-white/60">
                        {employee.full_name}{employee.position ? ` · ${employee.position}` : ''}{employee.branch ? ` · ${employee.branch}` : ''}
                    </p>
                    <div className="relative mt-3 grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-black/25 p-2.5 backdrop-blur">
                        <Stat value={String(stats.workDays)} label="Ажлын өдөр" />
                        <Stat value={fmtHours(stats.minutes)} label="Төлөвлөсөн" />
                        <Stat value={String(stats.late)} label="Хоцорсон" warn={stats.late > 0} />
                        <Stat value={fmtHours(stats.overtime)} label="Илүү цаг" />
                    </div>
                </div>

                <div className="mx-auto max-w-5xl space-y-3 px-3.5 pt-3 md:px-6">
                    {/* ── Ирсэн хүсэлт ── */}
                    {incoming.map(s => (
                        <div key={s.id} className="rounded-2xl border border-amber-300 bg-amber-50 p-3 shadow-sm dark:border-amber-800 dark:bg-amber-950/30">
                            <p className="flex items-center gap-1.5 text-xs font-bold"><ArrowLeftRight className="size-3.5 text-amber-600" /> {s.other} ээлж {s.is_swap ? 'солилцох' : 'шилжүүлэх'} хүсэлт илгээлээ</p>
                            <p className="mt-1 text-[11px]">{s.is_swap ? 'Та авах' : 'Та орлох'}: <b>{s.shift}</b></p>
                            {s.target_shift && <p className="text-[11px]">Оронд нь өгөх: <b>{s.target_shift}</b></p>}
                            {s.note && <p className="mt-0.5 text-[11px] italic text-muted-foreground">"{s.note}"</p>}
                            <div className="mt-2 flex gap-2">
                                <button type="button" onClick={() => router.patch(`/my/work-schedule/swaps/${s.id}/respond`, { accept: false }, { preserveScroll: true })}
                                    className="h-8 flex-1 rounded-xl bg-white text-xs font-semibold text-rose-600 shadow-sm dark:bg-white/10">Татгалзах</button>
                                <button type="button" onClick={() => router.patch(`/my/work-schedule/swaps/${s.id}/respond`, { accept: true }, { preserveScroll: true })}
                                    className="h-8 flex-1 rounded-xl bg-emerald-600 text-xs font-semibold text-white shadow-sm">Зөвшөөрөх</button>
                            </div>
                        </div>
                    ))}

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.25fr_1fr]">
                        {/* ── Сарын календарь ── */}
                        <section className="overflow-hidden rounded-3xl shadow-sm" style={{ background: 'var(--my-card-bg)' }}>
                            <div className="flex items-center gap-2 px-3 pb-2 pt-3">
                                <button type="button" onClick={() => go(-1)} className="flex size-9 items-center justify-center rounded-xl" style={{ background: 'var(--my-pill-bg)' }}><ChevronLeft className="size-4" /></button>
                                <p className="flex-1 text-center text-sm font-extrabold">{y} · {MONTHS[m - 1]}</p>
                                <button type="button" onClick={() => go(1)} className="flex size-9 items-center justify-center rounded-xl" style={{ background: 'var(--my-pill-bg)' }}><ChevronRight className="size-4" /></button>
                            </div>
                            <div className="grid grid-cols-7 border-b px-1" style={{ borderColor: 'var(--my-divider)' }}>
                                {DOW_SHORT.map((d, i) => <div key={d} className={`py-1.5 text-center text-[10px] font-extrabold ${i >= 5 ? 'text-orange-500' : 'text-muted-foreground'}`}>{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-0.5 p-1">
                                {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
                                {days.map(d => {
                                    const isSel = d.date === selected;
                                    const work = d.shifts.filter(s => s.kind === 'work');
                                    const att = d.attendance;
                                    return (
                                        <button key={d.date} type="button" onClick={() => setSelected(d.date)}
                                            className={`relative flex min-h-[62px] flex-col items-center gap-0.5 rounded-xl p-1 transition ${isSel ? 'bg-red-50 ring-2 ring-red-500 dark:bg-red-950/30' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                            <span className={`text-[12px] font-bold tabular-nums ${d.date === today ? 'flex size-5 items-center justify-center rounded-full bg-red-600 text-white' : ''}`}>{parseDS(d.date).getDate()}</span>
                                            {d.shifts.slice(0, 2).map(s => (
                                                <span key={s.id} className="w-full truncate rounded px-0.5 text-center text-[9px] font-black leading-[14px]"
                                                    style={{ background: s.color, color: inkOn(s.color) }}>{s.code ?? (s.kind === 'work' ? 'Ажил' : 'Амр')}{work.length === 1 && s.start_time ? ` ${s.start_time}` : ''}</span>
                                            ))}
                                            {d.shifts.length === 0 && d.leave && <span className="truncate text-[8px] font-bold text-violet-600">{d.leave.label}</span>}
                                            {d.unavailable && <Ban className="absolute left-1 top-1 size-2.5 text-rose-500" />}
                                            {att?.status && <span className={`absolute right-1 top-1 size-1.5 rounded-full ${att.status === 'late' || att.status === 'absent' ? 'bg-rose-500' : att.status === 'on_time' || att.status === 'present' ? 'bg-emerald-500' : 'bg-sky-400'}`} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* ── Сонгосон өдөр ── */}
                        {day && (
                            <section className="space-y-2 rounded-3xl p-3.5 shadow-sm" style={{ background: 'var(--my-card-bg)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="flex size-12 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow">
                                        <span className="text-[9px] font-bold uppercase opacity-80">{DOW_SHORT[dowIndex(day.date)]}</span>
                                        <span className="text-lg font-black leading-none">{parseDS(day.date).getDate()}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-extrabold">{DOW_FULL[dowIndex(day.date)]}</p>
                                        <p className="text-[11px] text-muted-foreground">{MONTHS[parseDS(day.date).getMonth()]}ын {parseDS(day.date).getDate()}{day.date === today ? ' · Өнөөдөр' : ''}</p>
                                    </div>
                                </div>

                                {day.shifts.length === 0 && !day.leave && <p className="rounded-2xl px-3 py-5 text-center text-xs text-muted-foreground" style={{ background: 'var(--my-pill-bg)' }}>Энэ өдөр хуваарь алга.</p>}
                                {day.leave && <p className="rounded-xl bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-700 dark:text-violet-300">{day.leave.label}{day.leave.status === 'pending' ? ' — хүсэлт хүлээгдэж байна' : ''}</p>}

                                {day.shifts.map(s => (
                                    <div key={s.id} className="rounded-2xl p-3" style={{ background: `${s.color}18`, borderLeft: `4px solid ${s.color}` }}>
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-md px-1.5 py-0.5 text-[11px] font-black" style={{ background: s.color, color: inkOn(s.color) }}>{s.code ?? '•'}</span>
                                            <span className="text-sm font-bold">{s.name}</span>
                                            {s.start_time && <span className="ml-auto text-sm font-extrabold tabular-nums">{s.start_time}–{s.end_time}</span>}
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                            {s.branch && <span className="flex items-center gap-1"><Building2 className="size-3" />{s.branch}</span>}
                                            {s.minutes > 0 && <span className="flex items-center gap-1"><Hourglass className="size-3" />{fmtHours(s.minutes)}</span>}
                                            {s.doctor && <span className="flex items-center gap-1"><Stethoscope className="size-3" />{s.doctor}</span>}
                                            {s.room && <span className="flex items-center gap-1"><MapPin className="size-3" />Өрөө {s.room}</span>}
                                        </div>
                                        {s.note && <p className="mt-1 text-[11px] italic">{s.note}</p>}
                                        {s.kind === 'work' && day.date >= today && (
                                            s.swap_pending
                                                ? <p className="mt-2 text-[11px] font-semibold text-amber-600">Шилжүүлэх хүсэлт хүлээгдэж байна</p>
                                                : <button type="button" onClick={() => setSwapFor({ ...s, date: day.date })}
                                                    className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-red-600"><ArrowLeftRight className="size-3" /> Ээлж шилжүүлэх / солилцох</button>
                                        )}
                                    </div>
                                ))}

                                {day.attendance && <AttendanceCard a={day.attendance} />}

                                {day.date >= today && (
                                    <button type="button"
                                        onClick={() => {
                                            const note = day.unavailable ? null : prompt('Шалтгаан (заавал биш):') ?? undefined;
                                            if (note === undefined && !day.unavailable) return;
                                            router.post('/my/work-schedule/availability', { date: day.date, note }, { preserveScroll: true });
                                        }}
                                        className={`flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold ${day.unavailable ? 'bg-rose-500/10 text-rose-600' : ''}`}
                                        style={day.unavailable ? undefined : { background: 'var(--my-pill-bg)' }}>
                                        <Ban className="size-3.5" />
                                        {day.unavailable ? `Боломжгүй гэж тэмдэглэсэн${day.unavailable.note ? ` (${day.unavailable.note})` : ''} — болих` : 'Энэ өдөр боломжгүй гэж тэмдэглэх'}
                                    </button>
                                )}
                            </section>
                        )}
                    </div>

                    {/* ── Хүсэлтүүд ── */}
                    {swaps.filter(s => !s.can_respond).length > 0 && (
                        <section className="rounded-3xl p-3.5 shadow-sm" style={{ background: 'var(--my-card-bg)' }}>
                            <p className="mb-2 text-xs font-extrabold">Ээлж солих хүсэлтүүд</p>
                            <div className="space-y-1.5">
                                {swaps.filter(s => !s.can_respond).map(s => (
                                    <div key={s.id} className="flex items-start gap-2 rounded-xl px-2.5 py-2" style={{ background: 'var(--my-pill-bg)' }}>
                                        <ArrowLeftRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-semibold">{s.direction === 'out' ? `→ ${s.other}` : `← ${s.other}`} · {s.shift}</p>
                                            <p className={`text-[10px] font-semibold ${s.status === 'approved' ? 'text-emerald-600' : s.status === 'rejected' || s.status === 'cancelled' ? 'text-rose-600' : 'text-amber-600'}`}>
                                                {s.status_label}{s.rejection_reason ? ` · ${s.rejection_reason}` : ''}
                                            </p>
                                        </div>
                                        {s.can_cancel && (
                                            <button type="button" onClick={() => router.patch(`/my/work-schedule/swaps/${s.id}/cancel`, {}, { preserveScroll: true })}
                                                className="text-[11px] font-semibold text-muted-foreground hover:text-rose-600">Цуцлах</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {swapFor && <SwapDialog shift={swapFor} colleagues={colleagues} onClose={() => setSwapFor(null)} />}
            <ToastContainer />
        </MyLayout>
    );
}

function Stat({ value, label, warn }: { value: string; label: string; warn?: boolean }) {
    return (
        <div className="rounded-xl bg-white/10 px-1 py-2 text-center">
            <p className={`text-lg font-black leading-none tabular-nums ${warn ? 'text-amber-300' : 'text-white'}`}>{value}</p>
            <p className="mt-1 text-[9px] font-semibold text-white/55">{label}</p>
        </div>
    );
}

function AttendanceCard({ a }: { a: DayAttendance }) {
    const st = a.status ? STATUS[a.status] : null;
    return (
        <div className="rounded-2xl p-3" style={{ background: 'var(--my-pill-bg)' }}>
            <div className="flex items-center gap-2">
                <Fingerprint className="size-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold">Ирц</span>
                {st && <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <Cell icon={Clock} label="Ирсэн" value={a.in ?? '—'} />
                <Cell icon={DoorOpen} label="Тарсан" value={a.out ?? '—'} />
                <Cell icon={Hourglass} label="Ажилласан" value={a.worked ? fmtHours(a.worked) : '—'} />
            </div>
            {(a.late > 0 || a.early > 0 || a.overtime > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                    {a.late > 0 && <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-700 dark:text-rose-300"><AlarmClock className="size-3" />{a.late} мин хоцорсон</span>}
                    {a.early > 0 && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">{a.early} мин эрт явсан</span>}
                    {a.overtime > 0 && <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-violet-700 dark:text-violet-300">+{fmtHours(a.overtime)} илүү цаг</span>}
                </div>
            )}
        </div>
    );
}

function Cell({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div>
            <p className="flex items-center justify-center gap-1 text-[9px] font-semibold text-muted-foreground"><Icon className="size-3" />{label}</p>
            <p className="text-sm font-extrabold tabular-nums">{value}</p>
        </div>
    );
}

function SwapDialog({ shift, colleagues, onClose }: { shift: DayShift & { date: string }; colleagues: Colleague[]; onClose: () => void }) {
    const [targetId, setTargetId] = useState<number | ''>('');
    const [mode, setMode] = useState<'cover' | 'swap'>('cover');
    const [targetShiftId, setTargetShiftId] = useState<number | ''>('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const target = colleagues.find(c => c.id === targetId);

    const submit = () => {
        if (!targetId || (mode === 'swap' && !targetShiftId)) return;
        setBusy(true);
        router.post('/my/work-schedule/swaps', {
            shift_id: shift.id, target_employee_id: targetId,
            target_shift_id: mode === 'swap' ? targetShiftId : null, note,
        }, { preserveScroll: true, onSuccess: onClose, onFinish: () => setBusy(false) });
    };

    const field = 'mt-1 h-10 w-full rounded-xl border bg-background px-2 text-sm';

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
            <div onMouseDown={e => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl">
                <div className="mb-3 flex items-center gap-2">
                    <ArrowLeftRight className="size-4 text-red-600" />
                    <p className="flex-1 text-sm font-bold">Ээлж шилжүүлэх</p>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground"><X className="size-4" /></button>
                </div>
                <p className="rounded-xl bg-muted px-3 py-2 text-xs"><b>{shift.date.slice(5).replace('-', '/')}</b> · {shift.name}{shift.start_time ? ` ${shift.start_time}–${shift.end_time}` : ''}{shift.branch ? ` · ${shift.branch}` : ''}</p>

                <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                    {(['cover', 'swap'] as const).map(k => (
                        <button key={k} type="button" onClick={() => setMode(k)}
                            className={`h-8 rounded-lg text-xs font-semibold ${mode === k ? 'bg-card shadow' : 'text-muted-foreground'}`}>
                            {k === 'cover' ? 'Орлуулах' : 'Солилцох'}
                        </button>
                    ))}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{mode === 'cover' ? 'Хамт ажилтан таны ээлжид гарна.' : 'Та хоёр бие биеийнхээ ээлжийг сольж гарна.'}</p>

                <label className="mt-3 block text-[11px] font-semibold text-muted-foreground">Хамт ажилтан
                    <select className={field} value={targetId} onChange={e => { setTargetId(e.target.value ? Number(e.target.value) : ''); setTargetShiftId(''); }}>
                        <option value="">— Сонгох —</option>
                        {colleagues.map(c => <option key={c.id} value={c.id}>{c.name}{c.position ? ` · ${c.position}` : ''}</option>)}
                    </select>
                </label>

                {mode === 'swap' && target && (
                    <label className="mt-2 block text-[11px] font-semibold text-muted-foreground">Түүний аль ээлжийг авах
                        <select className={field} value={targetShiftId} onChange={e => setTargetShiftId(e.target.value ? Number(e.target.value) : '')}>
                            <option value="">— Сонгох —</option>
                            {target.shifts.map(s => <option key={s.id} value={s.id}>{s.date.slice(5).replace('-', '/')} · {s.label}</option>)}
                        </select>
                        {target.shifts.length === 0 && <span className="mt-1 block text-[10px] text-amber-600">Ойрын 45 хоногт нийтлэгдсэн ээлж алга.</span>}
                    </label>
                )}

                <label className="mt-2 block text-[11px] font-semibold text-muted-foreground">Тайлбар
                    <input className={field} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="Жишээ: эмнэлэгт үзүүлэх" />
                </label>

                <p className="mt-3 text-[10px] text-muted-foreground">Хамт ажилтан зөвшөөрсний дараа HR батлахад хуваарь автоматаар солигдоно.</p>
                <button type="button" disabled={busy || !targetId || (mode === 'swap' && !targetShiftId)} onClick={submit}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-red-600 text-sm font-bold text-white disabled:opacity-50">
                    <Check className="size-4" /> Хүсэлт илгээх
                </button>
            </div>
        </div>
    );
}
