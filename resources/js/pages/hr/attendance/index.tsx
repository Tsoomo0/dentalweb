import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { HrPager, usePaged } from '@/components/hr/page-panel';
import axios from 'axios';
import {
    AlarmClock, CalendarCheck2, CalendarDays, ChevronLeft, ChevronRight, Clock, DoorOpen, Download, Fingerprint, Hourglass,
    Info, ListChecks, MapPin, PencilLine, Plus, Table2, Trash2, Usb, UserCheck, UserX, X,
} from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
const WEEKDAYS_SHORT = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];

/** Цагийн шугамын хүрээ — 06:00–22:00 */
const DAY_START = 6 * 60;
const DAY_END = 22 * 60;
const TICKS = [9, 12, 15, 18];

type Source = 'gps' | 'pull' | 'push' | 'usb' | 'manual';

interface DayPunch {
    id: number; time: string; source: Source; punch_type: number | null;
    device_name: string | null; note: string | null; created_by: string | null;
    created_at: string | null; can_delete: boolean;
}

/** Засах цонхонд нээгдсэн өдөр — мөрөөс бол ажилтан/огноо тогтмол, "Ирц нэмэх"-ээс бол сонгоно. */
interface EditTarget { employee_id: number | ''; date: string; name: string | null; photo_url: string | null; }

/** Хуваарьтай харьцуулсан төлөв (AttendanceEvaluator.php). */
type DayStatus = 'on_time' | 'late' | 'absent' | 'missing' | 'unscheduled' | 'present' | 'leave' | null;

interface AttendanceLog {
    /** Ирээгүй өдрийн мөрөнд ирцийн бүртгэл байхгүй тул null */
    id: number | null; key: string; date: string; is_today: boolean; employee_id: number;
    employee_name: string; full_name: string; photo_url: string | null; position: string | null;
    checked_in_at: string | null; checked_out_at: string | null;
    check_in_source: Source | null; check_out_source: Source | null;
    worked_minutes: number;
    scheduled_start: string | null; scheduled_end: string | null; scheduled_minutes: number; shift_label: string | null;
    late_minutes: number | null; early_leave_minutes: number | null; overtime_minutes: number | null;
    status: DayStatus; no_checkout: boolean;
}
interface SummaryRow {
    employee_id: number; employee_name: string; full_name: string; position: string | null; photo_url: string | null;
    planned_days: number; planned_minutes: number; worked_days: number; worked_minutes: number;
    late_count: number; late_minutes: number; early_count: number; early_minutes: number;
    overtime_minutes: number; absent_days: number; leave_days: number; unscheduled_days: number; no_checkout: number;
}
interface Option { id: number; name: string; }
interface PageProps {
    logs: AttendanceLog[]; summary: SummaryRow[]; rules: { late_grace: number; overtime_min: number };
    employees: Option[]; branches: Option[];
    year: number; month: number; employee_id: number | null; branch_id: number | null;
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/dashboard' },
    { title: 'Ирцийн бүртгэл', href: '/hr/attendance' },
];

/** Ирц ямар аргаар бүртгэгдсэн — байршил (утас) эсвэл хурууны хээний төхөөрөмж. */
const SOURCE_META: Record<Source, { icon: React.ElementType; label: string }> = {
    gps:  { icon: MapPin,      label: 'Утсаар байршлаар' },
    pull: { icon: Fingerprint, label: 'Хурууны хээ (4370)' },
    push: { icon: Fingerprint, label: 'Хурууны хээ (Push)' },
    usb:  { icon: Usb,         label: 'USB файлаас' },
    manual: { icon: PencilLine, label: 'HR гараар нэмсэн' },
};

const AVATAR_TONES = [
    'from-sky-400 to-blue-600', 'from-violet-400 to-purple-600', 'from-emerald-400 to-teal-600',
    'from-amber-400 to-orange-600', 'from-rose-400 to-pink-600', 'from-cyan-400 to-sky-600',
];

/* ───────────────────────── Туслах функцууд ───────────────────────── */

function fmtMins(mins: number | null) {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (!h) return `${m}м`;
    return m ? `${h}ц ${m}м` : `${h}ц`;
}

const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const pct = (mins: number) => Math.min(100, Math.max(0, ((mins - DAY_START) / (DAY_END - DAY_START)) * 100));

function initials(name: string) {
    // "А.Цолмон" → "АЦ"
    return name.split(/[\s.]+/).filter(Boolean).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase();
}

function toneFor(id: number) {
    return AVATAR_TONES[id % AVATAR_TONES.length];
}

function useNowMinutes() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
    return now.getHours() * 60 + now.getMinutes();
}

type Tone = 'ok' | 'late' | 'neutral';
function toneOf(log: AttendanceLog): Tone {
    if (log.late_minutes || log.status === 'absent') return 'late';
    return log.scheduled_start ? 'ok' : 'neutral';
}

/* ───────────────────────── Жижиг бүрэлдэхүүн ───────────────────────── */

/** Ажилтны зураг; байхгүй эсвэл ачаалагдахгүй бол нэрийн эхний үсгүүд. */
function Avatar({ name, photoUrl, seed, size = 'size-8' }: { name: string; photoUrl: string | null; seed: number; size?: string }) {
    const [broken, setBroken] = useState(false);

    if (photoUrl && !broken) {
        return (
            <img src={photoUrl} alt={name} loading="lazy" onError={() => setBroken(true)}
                className={`${size} shrink-0 rounded-full object-cover object-top shadow-sm ring-2 ring-card`} />
        );
    }

    return (
        <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white shadow-sm ring-2 ring-card ${toneFor(seed)}`}>
            {initials(name)}
        </span>
    );
}

const fieldCls = 'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20';

/**
 * Нэг өдрийн бүх түүхий бүртгэл + гараар засах. Төхөөрөмж/утасны бүртгэлийг
 * устгахгүй — зөвхөн нэмэлт бүртгэл үүсгэнэ, шалтгаан ба хэн засав нь хадгалагдана.
 */
function DayEditor({ target, employees, onClose }: { target: EditTarget; employees: Option[]; onClose: () => void }) {
    const fixed = target.employee_id !== '';
    const [punches, setPunches] = useState<DayPunch[] | null>(null);

    const form = useForm({
        employee_id: target.employee_id as number | '',
        date: target.date,
        checked_in_at: '',
        checked_out_at: '',
        note: '',
    });

    const { employee_id, date } = form.data;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        if (!employee_id || !date) { setPunches(null); return; }
        let alive = true;
        setPunches(null);
        axios.get<{ punches: DayPunch[] }>('/hr/attendance/day', { params: { employee_id, date } })
            .then(r => { if (alive) setPunches(r.data.punches); })
            .catch(() => { if (alive) setPunches([]); });
        return () => { alive = false; };
    }, [employee_id, date]);

    function submit(e: FormEvent) {
        e.preventDefault();
        form.post('/hr/attendance/manual', { preserveScroll: true, onSuccess: onClose });
    }

    function remove(p: DayPunch) {
        if (!confirm(`${p.time.slice(0, 5)}-ийн гараар нэмсэн бүртгэлийг устгах уу?`)) return;
        router.delete(`/hr/attendance/punches/${p.id}`, {
            preserveScroll: true,
            onSuccess: () => setPunches(list => (list ?? []).filter(x => x.id !== p.id)),
        });
    }

    const d = date ? new Date(`${date}T00:00:00`) : null;
    const dateLabel = d ? `${d.getMonth() + 1}-р сарын ${d.getDate()}, ${WEEKDAYS[d.getDay()]}` : '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
            <form onSubmit={submit} onClick={e => e.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <header className="relative flex items-center gap-3 bg-gradient-to-br from-sky-50 via-white to-indigo-50/70 px-5 py-4 dark:from-sky-950/40 dark:via-background dark:to-indigo-950/30">
                    {fixed && target.name
                        ? <Avatar name={target.name} photoUrl={target.photo_url} seed={Number(target.employee_id)} size="size-10" />
                        : <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md"><Plus className="size-5" /></span>}
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{fixed ? target.name : 'Ирц нэмэх'}</p>
                        <p className="text-[11px] text-muted-foreground">{fixed ? dateLabel : 'Хуруу дарахаа мартсан ажилтанд'}</p>
                    </div>
                    <button type="button" onClick={onClose} className="ml-auto rounded-lg p-1.5 text-muted-foreground transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10">
                        <X className="size-4" />
                    </button>
                </header>

                <div className="space-y-4 px-5 py-4">
                    {!fixed && (
                        <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2">
                            <div>
                                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Ажилтан</label>
                                <select className={fieldCls} value={String(employee_id)}
                                    onChange={e => form.setData('employee_id', e.target.value ? Number(e.target.value) : '')}>
                                    <option value="">— Сонгох —</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                                {form.errors.employee_id && <p className="mt-1 text-[11px] text-rose-600">{form.errors.employee_id}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Огноо</label>
                                <input type="date" className={fieldCls} value={date} onChange={e => form.setData('date', e.target.value)} />
                                {form.errors.date && <p className="mt-1 text-[11px] text-rose-600">{form.errors.date}</p>}
                            </div>
                        </div>
                    )}

                    {/* Тухайн өдрийн бүртгэлүүд */}
                    {employee_id && date && (
                        <div>
                            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Бүртгэлүүд</p>
                            <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-muted/20">
                                {punches === null ? (
                                    <p className="px-3 py-3 text-xs text-muted-foreground">Ачаалж байна…</p>
                                ) : punches.length === 0 ? (
                                    <p className="px-3 py-3 text-xs text-muted-foreground">Энэ өдөр бүртгэл алга.</p>
                                ) : punches.map(p => {
                                    const meta = SOURCE_META[p.source];
                                    return (
                                        <div key={p.id} className="flex items-start gap-3 px-3 py-2">
                                            <span className="pt-px text-[13px] font-bold tabular-nums text-foreground">{p.time.slice(0, 5)}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="flex items-center gap-1 text-xs font-medium text-foreground">
                                                    {meta && <meta.icon className="size-3 text-sky-500/80" />}
                                                    {p.source === 'manual' ? meta.label : p.device_name ?? meta?.label}
                                                </p>
                                                {p.source === 'manual' && (
                                                    <p className="truncate text-[11px] text-muted-foreground" title={p.note ?? ''}>
                                                        {p.created_by ?? 'HR'}{p.note ? ` · ${p.note}` : ''}
                                                    </p>
                                                )}
                                            </div>
                                            {p.can_delete && (
                                                <button type="button" onClick={() => remove(p)} title="Гараар нэмсэн бүртгэлийг устгах"
                                                    className="rounded-md p-1 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600">
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Гараар нэмэх */}
                    <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Гараар нэмэх</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="mb-1 block text-[11px] text-muted-foreground">Ирсэн цаг</label>
                                <input type="time" className={fieldCls} value={form.data.checked_in_at} onChange={e => form.setData('checked_in_at', e.target.value)} />
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] text-muted-foreground">Тарсан цаг</label>
                                <input type="time" className={fieldCls} value={form.data.checked_out_at} onChange={e => form.setData('checked_out_at', e.target.value)} />
                            </div>
                        </div>
                        {(form.errors.checked_in_at || form.errors.checked_out_at) && (
                            <p className="mt-1 text-[11px] text-rose-600">{form.errors.checked_in_at ?? form.errors.checked_out_at}</p>
                        )}
                        <label className="mb-1 mt-2 block text-[11px] text-muted-foreground">Шалтгаан</label>
                        <input className={fieldCls} value={form.data.note} maxLength={255}
                            placeholder="Жишээ: тарахдаа хуруу дарахаа мартсан"
                            onChange={e => form.setData('note', e.target.value)} />
                        {form.errors.note && <p className="mt-1 text-[11px] text-rose-600">{form.errors.note}</p>}
                        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                            <Info className="mt-px size-3 shrink-0" />
                            Төхөөрөмжийн бүртгэл устахгүй — нэмэлт бүртгэл үүсч, хэн яагаад нэмсэн нь хадгалагдана.
                        </p>
                    </div>
                </div>

                <footer className="flex justify-end gap-2 border-t border-border/60 bg-muted/20 px-5 py-3">
                    <button type="button" onClick={onClose} className="h-9 rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">Болих</button>
                    <button type="submit" disabled={form.processing}
                        className="h-9 rounded-lg bg-gradient-to-b from-sky-500 to-blue-600 px-4 text-sm font-semibold text-white shadow-md shadow-blue-600/20 ring-1 ring-inset ring-white/20 transition hover:brightness-110 disabled:opacity-60">
                        Хадгалах
                    </button>
                </footer>
            </form>
        </div>
    );
}

const Dash = () => <span className="text-muted-foreground/40">—</span>;

function Time({ value, source }: { value: string | null; source: Source | null }) {
    if (!value) return <Dash />;
    const meta = source ? SOURCE_META[source] : undefined;
    return (
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums text-foreground" title={meta?.label}>
            {meta && <meta.icon className="size-3 text-sky-500/80" />}
            {value}
        </span>
    );
}

function CheckOut({ log }: { log: AttendanceLog }) {
    if (log.checked_out_at) return <Time value={log.checked_out_at} source={log.check_out_source} />;
    if (!log.checked_in_at) return <Dash />;
    return log.is_today ? (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-300">
            <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Ажиллаж байна
        </span>
    ) : (
        <span className="whitespace-nowrap rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:text-amber-300">Тараагүй</span>
    );
}

/** Нийтлэгдсэн хуваарьтай үед л хоцорсон/цагтаа гэж дүгнэнэ — хуваарьгүй бол дүгнэх суурь байхгүй. */
function Status({ log }: { log: AttendanceLog }) {
    const pill = 'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset';
    const main = {
        late: <span className={`${pill} bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300`}>{fmtMins(log.late_minutes)} хоцорсон</span>,
        on_time: <span className={`${pill} bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300`}>Цагтаа</span>,
        present: <span className={`${pill} bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300`}>Ирсэн</span>,
        absent: <span className={`${pill} bg-rose-600 text-white ring-rose-600`}>Ирээгүй</span>,
        missing: <span className={`${pill} bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300`}>Ирээгүй байна</span>,
        leave: <span className={`${pill} bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300`}>Чөлөөтэй</span>,
        unscheduled: <span className={`${pill} bg-muted text-muted-foreground ring-border`} title="Нийтлэгдсэн хуваарьгүй өдөр ажилласан">Хуваарьгүй</span>,
    };
    return (
        <div className="flex flex-wrap items-center justify-end gap-1 whitespace-nowrap">
            {log.status ? main[log.status] : <span className={`${pill} bg-muted text-muted-foreground ring-border`}>Хуваарьгүй</span>}
            {log.early_leave_minutes ? (
                <span className={`${pill} bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300`} title="Хуваарийн дуусахаас эрт тарсан">−{fmtMins(log.early_leave_minutes)} эрт</span>
            ) : null}
            {log.overtime_minutes ? (
                <span className={`${pill} bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300`} title="Илүү цаг">+{fmtMins(log.overtime_minutes)}</span>
            ) : null}
        </div>
    );
}

/**
 * Ажлын өдрийн цагийн шугам: саарал тасархай хүрээ = хуваарь, өнгөт зураас = бодит
 * ирсэн→тарсан. Өнөөдөр ажиллаж байгаа бол "одоо" хүртэл анивчиж үргэлжилнэ.
 */
function DayTimeline({ log, nowMins }: { log: AttendanceLog; nowMins: number }) {
    const tone = toneOf(log);
    const bar = { ok: 'from-emerald-400 to-emerald-500', late: 'from-rose-400 to-rose-500', neutral: 'from-sky-400 to-blue-500' }[tone];
    const dot = { ok: 'bg-emerald-500', late: 'bg-rose-500', neutral: 'bg-blue-500' }[tone];

    const inM = log.checked_in_at ? toMins(log.checked_in_at) : null;
    const ongoing = !!inM && !log.checked_out_at && log.is_today;
    const outM = log.checked_out_at ? toMins(log.checked_out_at) : ongoing ? Math.max(nowMins, (inM ?? 0) + 1) : null;

    return (
        <div className="relative h-5">
            {/* Суурь шугам ба цагийн тэмдэг */}
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
            {TICKS.map(h => (
                <div key={h} className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-border" style={{ left: `${pct(h * 60)}%` }} />
            ))}

            {/* Хуваарь */}
            {log.scheduled_start && log.scheduled_end && (
                <div className="absolute top-1/2 h-3.5 -translate-y-1/2 rounded-md border border-dashed border-sky-400/60 bg-sky-400/5"
                    style={{ left: `${pct(toMins(log.scheduled_start))}%`, width: `${pct(toMins(log.scheduled_end)) - pct(toMins(log.scheduled_start))}%` }} />
            )}

            {/* Бодит ажилласан хугацаа */}
            {inM !== null && outM !== null && (
                <div className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r ${bar} ${ongoing ? 'opacity-80' : ''}`}
                    style={{ left: `${pct(inM)}%`, width: `${Math.max(0.8, pct(outM) - pct(inM))}%` }} />
            )}
            {inM !== null && (
                <div className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card ${dot}`} style={{ left: `${pct(inM)}%` }} />
            )}
            {outM !== null && !ongoing && (
                <div className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card ${dot}`} style={{ left: `${pct(outM)}%` }} />
            )}
            {ongoing && (
                <span className="absolute top-1/2 flex size-2.5 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pct(outM!)}%` }}>
                    <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${dot}`} />
                    <span className={`relative inline-flex size-2.5 rounded-full ring-2 ring-card ${dot}`} />
                </span>
            )}
        </div>
    );
}

function Kpi({ icon: Icon, value, label, tone, hint }: {
    icon: React.ElementType; value: React.ReactNode; label: string; tone: string; hint?: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2.5 shadow-sm ring-1 ring-black/5 backdrop-blur dark:bg-white/[0.04] dark:ring-white/10">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-md ring-1 ring-inset ring-white/25 ${tone}`}>
                <Icon className="size-4" />
            </span>
            <div className="min-w-0">
                <p className="flex items-baseline gap-1.5 text-lg font-bold leading-none tabular-nums text-foreground">
                    {value}{hint && <span className="text-[11px] font-medium text-muted-foreground">{hint}</span>}
                </p>
                <p className="mt-1 truncate text-[11px] leading-none text-muted-foreground">{label}</p>
            </div>
        </div>
    );
}

const ROW_GRID = 'grid items-center gap-x-4 gap-y-2 grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1.3fr)_64px_124px_72px_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_64px_124px_72px_minmax(0,0.9fr)]';

/** Өнөөдөр ажиллаж байгаа хүний одоог хүртэл ажилласан хугацаа. */
function Worked({ log, nowMins }: { log: AttendanceLog; nowMins: number }) {
    if (log.worked_minutes) return <span className="text-xs font-semibold tabular-nums text-foreground">{fmtMins(log.worked_minutes)}</span>;
    if (log.is_today && log.checked_in_at && !log.checked_out_at) {
        const live = nowMins - toMins(log.checked_in_at);
        if (live > 0) return <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400" title="Одоог хүртэл">{fmtMins(live)}</span>;
    }
    return <Dash />;
}
const pillSelect = 'h-8 rounded-lg border-0 bg-white/80 px-2.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-black/5 backdrop-blur focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:bg-white/[0.06] dark:ring-white/10';
const ghostBtn = 'flex h-8 items-center gap-1.5 rounded-lg bg-white/80 px-2.5 text-xs font-medium text-muted-foreground shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:-translate-y-px hover:text-foreground hover:shadow dark:bg-white/[0.06] dark:ring-white/10';

/** Ажилтан бүрийн сарын нэгтгэл — төлөвлөсөн vs ажилласан, хоцролт, илүү цаг, ирээгүй. */
function SummaryTable({ rows, onPick }: { rows: SummaryRow[]; onPick: (employeeId: number) => void }) {
    if (rows.length === 0) {
        return <div className="rounded-2xl border border-dashed bg-card px-4 py-14 text-center text-sm text-muted-foreground">Энэ сард хуваарь ч, ирц ч алга.</div>;
    }
    const h = (m: number) => fmtMins(m) ?? '—';
    const sum = (k: keyof SummaryRow) => rows.reduce((a, r) => a + (r[k] as number), 0);
    const th = 'px-2 py-2 text-right font-semibold';
    const td = 'px-2 py-1.5 text-right tabular-nums';

    return (
        <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-sm">
            <table className="w-full min-w-[860px] text-xs">
                <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                        <th className="px-3 py-2 text-left font-semibold">Ажилтан</th>
                        <th className={th}>Төлөвлөсөн</th><th className={th}>Ирсэн өдөр</th><th className={th}>Ажилласан</th>
                        <th className={th}>Хоцорсон</th><th className={th}>Эрт явсан</th><th className={th}>Илүү цаг</th>
                        <th className={th}>Ирээгүй</th><th className={th}>Чөлөө</th><th className={th}>Тараагүй</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {rows.map(r => {
                        const ratio = r.planned_minutes ? Math.round((r.worked_minutes / r.planned_minutes) * 100) : null;
                        return (
                            <tr key={r.employee_id} onClick={() => onPick(r.employee_id)} className="cursor-pointer hover:bg-sky-50/60 dark:hover:bg-white/[0.03]" title="Дарж өдөр бүрийн бүртгэлийг харах">
                                <td className="px-3 py-1.5">
                                    <div className="flex items-center gap-2">
                                        <Avatar name={r.employee_name} photoUrl={r.photo_url} seed={r.employee_id} size="size-7" />
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold">{r.employee_name}</p>
                                            <p className="truncate text-[10px] text-muted-foreground">{r.position ?? '—'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className={td}>{r.planned_days} өдөр<br /><span className="text-[10px] text-muted-foreground">{h(r.planned_minutes)}</span></td>
                                <td className={td}>{r.worked_days}</td>
                                <td className={td}>{h(r.worked_minutes)}{ratio !== null && <><br /><span className={`text-[10px] ${ratio < 90 ? 'text-amber-600' : 'text-muted-foreground'}`}>{ratio}%</span></>}</td>
                                <td className={`${td} ${r.late_count ? 'font-semibold text-rose-600' : 'text-muted-foreground'}`}>{r.late_count ? <>{r.late_count} удаа<br /><span className="text-[10px]">{h(r.late_minutes)}</span></> : '—'}</td>
                                <td className={`${td} ${r.early_count ? 'text-amber-600' : 'text-muted-foreground'}`}>{r.early_count ? <>{r.early_count} удаа<br /><span className="text-[10px]">{h(r.early_minutes)}</span></> : '—'}</td>
                                <td className={`${td} ${r.overtime_minutes ? 'font-semibold text-violet-600' : 'text-muted-foreground'}`}>{r.overtime_minutes ? h(r.overtime_minutes) : '—'}</td>
                                <td className={`${td} ${r.absent_days ? 'font-bold text-rose-700' : 'text-muted-foreground'}`}>{r.absent_days || '—'}</td>
                                <td className={`${td} text-muted-foreground`}>{r.leave_days || '—'}</td>
                                <td className={`${td} ${r.no_checkout ? 'text-amber-600' : 'text-muted-foreground'}`}>{r.no_checkout || '—'}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="bg-muted/40 font-bold">
                    <tr>
                        <td className="px-3 py-2">Нийт · {rows.length} ажилтан</td>
                        <td className={td}>{h(sum('planned_minutes'))}</td>
                        <td className={td}>{sum('worked_days')}</td>
                        <td className={td}>{h(sum('worked_minutes'))}</td>
                        <td className={td}>{sum('late_count')}</td>
                        <td className={td}>{sum('early_count')}</td>
                        <td className={td}>{h(sum('overtime_minutes'))}</td>
                        <td className={td}>{sum('absent_days')}</td>
                        <td className={td}>{sum('leave_days')}</td>
                        <td className={td}>{sum('no_checkout')}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

/* ───────────────────────── Хуудас ───────────────────────── */

export default function HrAttendanceIndex() {
    const { logs, summary = [], rules, employees, branches, year, month, employee_id, branch_id } = usePage<PageProps>().props;
    const nowMins = useNowMinutes();
    const [mode, setMode] = useState<'days' | 'summary'>('days');

    const [selEmployee, setSelEmployee] = useState<number | ''>(employee_id ?? '');
    const [selBranch, setSelBranch] = useState<number | ''>(branch_id ?? '');
    const [editing, setEditing] = useState<EditTarget | null>(null);

    function openDay(log: AttendanceLog) {
        setEditing({ employee_id: log.employee_id, date: log.date, name: log.employee_name, photo_url: log.photo_url });
    }

    function openNew() {
        const t = new Date();
        const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
        setEditing({ employee_id: '', date: today, name: null, photo_url: null });
    }

    function apply(next: Partial<{ year: number; month: number; employee: number | ''; branch: number | '' }> = {}) {
        const emp = next.employee !== undefined ? next.employee : selEmployee;
        const br = next.branch !== undefined ? next.branch : selBranch;
        router.get('/hr/attendance', {
            year: next.year ?? year,
            month: next.month ?? month,
            employee_id: emp || undefined,
            branch_id: br || undefined,
        }, { preserveScroll: true, preserveState: true, replace: true });
    }

    function shiftMonth(delta: number) {
        let m = month + delta;
        let y = year;
        if (m < 1) { m = 12; y--; }
        if (m > 12) { m = 1; y++; }
        apply({ year: y, month: m });
    }

    function exportExcel() {
        const params = new URLSearchParams({ year: String(year), month: String(month) });
        if (selEmployee) params.set('employee_id', String(selEmployee));
        if (selBranch) params.set('branch_id', String(selBranch));
        window.location.href = `/hr/attendance/export-excel?${params.toString()}`;
    }

    const paged = usePaged(logs, 30);

    // Хуудсан дахь мөрүүдийг өдрөөр бүлэглэнэ (сервер огноогоор эрэмбэлж өгдөг)
    const groups: { date: string; isToday: boolean; rows: AttendanceLog[] }[] = [];
    for (const log of paged.data) {
        const last = groups[groups.length - 1];
        if (last && last.date === log.date) last.rows.push(log);
        else groups.push({ date: log.date, isToday: log.is_today, rows: [log] });
    }

    const present = logs.filter(l => l.checked_in_at);
    const scheduled = present.filter(l => l.scheduled_start);
    const lateCount = logs.filter(l => l.late_minutes).length;
    const onTimeCount = scheduled.length - scheduled.filter(l => l.late_minutes).length;
    const onTimeRate = scheduled.length ? Math.round((onTimeCount / scheduled.length) * 100) : null;
    const absentCount = logs.filter(l => l.status === 'absent').length;
    const notOutCount = logs.filter(l => l.no_checkout).length;
    const totalWorked = logs.reduce((s, l) => s + l.worked_minutes, 0);
    const totalOvertime = logs.reduce((s, l) => s + (l.overtime_minutes ?? 0), 0);
    const employeeCount = new Set(present.map(l => l.employee_id)).size;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ирцийн бүртгэл" />
            <div className="space-y-4 p-4 md:p-5">

                {/* ═══ Толгой ═══ */}
                <section className="relative isolate overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50/70 shadow-sm dark:border-white/10 dark:from-sky-950/40 dark:via-background dark:to-indigo-950/30">
                    <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 -z-10 size-72 rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-500/10" />
                    <div aria-hidden className="pointer-events-none absolute -bottom-28 left-1/4 -z-10 size-64 rounded-full bg-indigo-300/20 blur-3xl dark:bg-indigo-500/10" />

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 pt-4 md:px-5">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-600/25 ring-1 ring-inset ring-white/30">
                                <span aria-hidden className="absolute inset-x-1.5 top-1 h-1/3 rounded-full bg-white/25 blur-[2px]" />
                                <Clock className="relative size-5" />
                            </span>
                            <div className="min-w-0">
                                <h1 className="text-lg font-extrabold leading-tight tracking-tight text-foreground">Ирцийн бүртгэл</h1>
                                <p className="text-[11px] text-muted-foreground">Хурууны хээ болон утсаар бүртгэсэн ирсэн, тарсан цаг</p>
                            </div>
                        </div>

                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            <div className="flex h-8 items-center rounded-lg bg-white/80 shadow-sm ring-1 ring-black/5 backdrop-blur dark:bg-white/[0.06] dark:ring-white/10">
                                <button onClick={() => shiftMonth(-1)} title="Өмнөх сар" className="flex h-full w-8 items-center justify-center rounded-l-lg text-muted-foreground transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10">
                                    <ChevronLeft className="size-4" />
                                </button>
                                <span className="min-w-[118px] px-1 text-center text-xs font-bold tabular-nums text-foreground">{year} оны {month}-р сар</span>
                                <button onClick={() => shiftMonth(1)} title="Дараагийн сар" className="flex h-full w-8 items-center justify-center rounded-r-lg text-muted-foreground transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10">
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                            <button onClick={openNew} className={ghostBtn} title="Хуруу дарахаа мартсан ажилтанд ирц нэмэх">
                                <Plus className="size-3.5" /><span className="hidden sm:inline">Ирц нэмэх</span>
                            </button>
                            <a href="/hr/attendance/devices" className={ghostBtn} title="Хурууны хээний төхөөрөмжүүд">
                                <Fingerprint className="size-3.5" /><span className="hidden sm:inline">Төхөөрөмж</span>
                            </a>
                            <button onClick={exportExcel} className={ghostBtn} title="Excel татах">
                                <Download className="size-3.5" /><span className="hidden sm:inline">Excel</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 px-4 pt-4 sm:grid-cols-3 md:px-5 lg:grid-cols-6">
                        <Kpi icon={CalendarCheck2} value={present.length} hint={employeeCount ? `${employeeCount} ажилтан` : undefined} label="Ирсэн бүртгэл" tone="from-sky-400 to-blue-600" />
                        <Kpi icon={UserCheck} value={onTimeCount} hint={onTimeRate !== null ? `${onTimeRate}%` : undefined} label="Цагтаа ирсэн" tone="from-emerald-400 to-emerald-600" />
                        <Kpi icon={AlarmClock} value={lateCount} label={`Хоцорсон (>${rules?.late_grace ?? 0} мин)`} tone="from-rose-400 to-rose-600" />
                        <Kpi icon={UserX} value={absentCount} label="Ирээгүй (хуваарьтай)" tone="from-rose-500 to-red-700" />
                        <Kpi icon={DoorOpen} value={notOutCount} label="Тараагүй" tone="from-amber-400 to-orange-500" />
                        <Kpi icon={Hourglass} value={fmtMins(totalWorked) ?? '0'} hint={totalOvertime ? `+${fmtMins(totalOvertime)} илүү` : undefined} label="Нийт ажилласан" tone="from-violet-400 to-violet-600" />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 bg-white/40 px-4 py-2.5 backdrop-blur dark:border-white/10 dark:bg-white/[0.02] md:px-5">
                        {branches.length > 1 && (
                            <select className={pillSelect} value={String(selBranch)} title="Салбар"
                                onChange={e => {
                                    const br = e.target.value ? Number(e.target.value) : '';
                                    setSelBranch(br); setSelEmployee('');
                                    apply({ branch: br, employee: '' });
                                }}>
                                <option value="">Бүх салбар</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        )}
                        <select className={pillSelect} value={String(selEmployee)} title="Ажилтан"
                            onChange={e => {
                                const emp = e.target.value ? Number(e.target.value) : '';
                                setSelEmployee(emp); apply({ employee: emp });
                            }}>
                            <option value="">Бүх ажилтан</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>

                        <div className="flex h-8 items-center rounded-lg bg-white/80 p-0.5 shadow-sm ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10">
                            {([['days', 'Өдөр бүрээр', ListChecks], ['summary', 'Сарын нэгтгэл', Table2]] as const).map(([k, label, Icon]) => (
                                <button key={k} type="button" onClick={() => setMode(k)}
                                    className={`flex h-full items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition ${mode === k ? 'bg-sky-600 text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}>
                                    <Icon className="size-3.5" />{label}
                                </button>
                            ))}
                        </div>
                        <a href="/hr/schedule" className={ghostBtn} title="Хуваарийг засах — ирц нийтлэгдсэн хуваарьтай харьцуулагдана">
                            <CalendarDays className="size-3.5" /><span className="hidden sm:inline">Хуваарь</span>
                        </a>

                        <div className="ml-auto hidden items-center gap-4 text-[11px] text-muted-foreground md:flex">
                            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded border border-dashed border-sky-400/70 bg-sky-400/5" />Хуваарь</span>
                            <span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />Ажилласан</span>
                            <span className="flex items-center gap-1"><Fingerprint className="size-3 text-sky-500/80" />Хурууны хээ</span>
                            <span className="flex items-center gap-1"><MapPin className="size-3 text-sky-500/80" />Утсаар</span>
                            <span className="flex items-center gap-1"><PencilLine className="size-3 text-sky-500/80" />Гараар</span>
                        </div>
                    </div>
                </section>

                {/* ═══ Сарын нэгтгэл (ажилтан бүрээр — цалин бодоход) ═══ */}
                {mode === 'summary' ? (
                    <SummaryTable rows={summary} onPick={id => { setSelEmployee(id); setMode('days'); apply({ employee: id }); }} />
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-4 py-14 text-center">
                        <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-600 dark:from-sky-950/50 dark:to-indigo-950/50 dark:text-sky-300">
                            <Clock className="size-5" />
                        </span>
                        <p className="text-sm font-semibold text-foreground">Бүртгэл алга</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{year} оны {month}-р сард ирцийн бүртгэл ороогүй байна.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Баганын гарчиг — бүх өдрийн картад нийтлэг */}
                        <div className={`${ROW_GRID} hidden px-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid`}>
                            <span>Ажилтан</span>
                            <span className="relative hidden h-3 lg:block">
                                {TICKS.map(h => (
                                    <span key={h} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${pct(h * 60)}%` }}>{String(h).padStart(2, '0')}:00</span>
                                ))}
                            </span>
                            <span>Ирсэн</span>
                            <span>Тарсан</span>
                            <span>Ажилласан</span>
                            <span className="text-right">Төлөв</span>
                        </div>

                        {groups.map(g => {
                            const d = new Date(`${g.date}T00:00:00`);
                            const late = g.rows.filter(r => r.late_minutes).length;
                            const absent = g.rows.filter(r => r.status === 'absent').length;
                            return (
                                <section key={g.date} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                                    <header className="flex items-center gap-3 border-b border-border/60 bg-gradient-to-r from-muted/60 via-muted/20 to-transparent px-4 py-2">
                                        <div className={`flex size-10 shrink-0 flex-col items-center justify-center rounded-xl shadow-sm ring-1 ${g.isToday ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white ring-white/20' : 'bg-card ring-black/5 dark:ring-white/10'}`}>
                                            <span className={`text-[9px] font-bold uppercase leading-none tracking-wide ${g.isToday ? 'text-white/80' : 'text-sky-600 dark:text-sky-400'}`}>{WEEKDAYS_SHORT[d.getDay()]}</span>
                                            <span className="mt-0.5 text-base font-extrabold leading-none tabular-nums">{d.getDate()}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                                {d.getMonth() + 1}-р сарын {d.getDate()}, {WEEKDAYS[d.getDay()]}
                                                {g.isToday && <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:text-sky-300">Өнөөдөр</span>}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {g.rows.length - absent} ирсэн{late > 0 && <> · <span className="font-medium text-rose-600 dark:text-rose-400">{late} хоцорсон</span></>}
                                                {absent > 0 && <> · <span className="font-semibold text-rose-700 dark:text-rose-400">{absent} ирээгүй</span></>}
                                            </p>
                                        </div>
                                    </header>

                                    <div className="divide-y divide-border/50">
                                        {g.rows.map(log => (
                                            <div key={log.key} role="button" tabIndex={0} title={log.id ? 'Дарж бүртгэлүүдийг харах, засах' : 'Ирээгүй — хуруу дарахаа мартсан бол гараар нэмнэ'}
                                                onClick={() => openDay(log)} onKeyDown={e => { if (e.key === 'Enter') openDay(log); }}
                                                className={`${ROW_GRID} cursor-pointer px-4 py-2.5 transition-colors hover:bg-sky-50/60 focus-visible:bg-sky-50/60 focus-visible:outline-none dark:hover:bg-white/[0.03]`}>
                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    <Avatar name={log.employee_name} photoUrl={log.photo_url} seed={log.employee_id} />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{log.employee_name}</p>
                                                        <p className="truncate text-[11px] leading-tight text-muted-foreground">
                                                            {log.position ?? 'Албан тушаалгүй'}
                                                            {log.scheduled_start && log.scheduled_end && <span className="tabular-nums"> · {log.scheduled_start}–{log.scheduled_end}</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="hidden lg:block"><DayTimeline log={log} nowMins={nowMins} /></div>
                                                <div className="hidden sm:block"><Time value={log.checked_in_at} source={log.check_in_source} /></div>
                                                <div className="hidden sm:block"><CheckOut log={log} /></div>
                                                <div className="hidden sm:block"><Worked log={log} nowMins={nowMins} /></div>
                                                <div className="flex flex-col items-end gap-1">
                                                    {/* Гар утсанд цагууд статусын дээр */}
                                                    <span className="flex items-center gap-1.5 sm:hidden">
                                                        <Time value={log.checked_in_at} source={log.check_in_source} />
                                                        <span className="text-muted-foreground/50">→</span>
                                                        <CheckOut log={log} />
                                                    </span>
                                                    <Status log={log} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}

                        {paged.lastPage > 1 && (
                            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                                <HrPager page={paged.page} lastPage={paged.lastPage} from={paged.from} to={paged.to}
                                    total={paged.total} unit="бүртгэл" onPage={paged.setPage} />
                            </div>
                        )}
                    </div>
                )}
            </div>
            {editing && (
                <DayEditor key={`${editing.employee_id}-${editing.date}`} target={editing} employees={employees} onClose={() => setEditing(null)} />
            )}
            <ToastContainer />
        </AppLayout>
    );
}
