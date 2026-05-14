import MyLayout from '@/layouts/my-layout';
import { NotificationBell } from '@/components/notification-bell';
import { ChatIcon } from '@/components/chat-icon';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import {
    AlertTriangle, BookOpen, CalendarCheck, CalendarDays,
    ChevronRight, Clock, DollarSign, FileText, LayoutGrid,
    MessageSquare, Package, Umbrella, User, UserCircle2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const RED  = '#dc2626';
const RED2 = '#b91c1c';
const RED3 = '#7f1d1d';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Хяналтын самбар', href: '/my/home' }];

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Employee {
    number: string; name: string; full_name: string;
    initials: string; position: string | null; branch: string | null; photo_url: string | null;
}
interface TodaySchedule {
    shift_type: string; shift_label: string;
    start_time: string; end_time: string;
    room: string | null; assigned_doctor_name: string | null; notes: string | null;
}
interface WeekDay {
    date: string; day_num: number; day_label: string; is_today: boolean;
    shift_type: string | null; start_time: string | null; end_time: string | null;
}
interface Stats {
    pending_leave: number; pending_vacation: number;
    documents: number; warnings: number; vacation_days: number;
}
interface Attendance {
    checked_in_at: string | null;
    checked_out_at: string | null;
    worked_minutes: number;
}
interface Props {
    employee: Employee; today_schedule: TodaySchedule | null;
    week_days: WeekDay[]; stats: Stats;
    today: { date: string; day_label: string };
    attendance: Attendance | null;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function greeting(shiftType?: string | null) {
    const h = new Date().getHours();
    if (shiftType === 'morning' || h < 12) return 'Өглөөний мэнд,';
    if (shiftType === 'afternoon' || h < 18) return 'Өдрийн мэнд,';
    return 'Оройн мэнд,';
}
function timeToMinutes(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}
function useNow(ms = 1000) {
    const [now, setNow] = useState(new Date());
    useEffect(() => { const id = setInterval(() => setNow(new Date()), ms); return () => clearInterval(id); }, [ms]);
    return now;
}
function pad2(n: number) { return String(n).padStart(2, '0'); }

/* ════════════════════════════════════════════════════════════════════════════
   MOBILE HOME
════════════════════════════════════════════════════════════════════════════ */
function MobileHome({ employee, today_schedule, week_days, stats, today, attendance }: Props) {
    const now      = useNow();
    const [selDay, setSelDay] = useState(() => week_days.findIndex(d => d.is_today));
    const [loading, setLoading] = useState<'in' | 'out' | null>(null);
    const [geoError, setGeoError] = useState<string | null>(null);

    const nowMins     = now.getHours() * 60 + now.getMinutes();

    const hasSchedule = !!today_schedule && today_schedule.shift_type !== 'off';
    const startMins   = hasSchedule ? timeToMinutes(today_schedule!.start_time) : 0;
    const endMins     = hasSchedule ? timeToMinutes(today_schedule!.end_time) : 0;
    const progress    = hasSchedule && endMins > startMins
        ? Math.min(100, Math.max(0, ((nowMins - startMins) / (endMins - startMins)) * 100)) : 0;

    const checkedIn  = !!attendance?.checked_in_at;
    const checkedOut = !!attendance?.checked_out_at;

    const checkedInMins = checkedIn ? timeToMinutes(attendance!.checked_in_at!) : 0;
    const elapsedSecs = checkedIn && !checkedOut
        ? Math.max(0, now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() - checkedInMins * 60)
        : 0;
    const elapsed = `${pad2(Math.floor(elapsedSecs / 3600))}:${pad2(Math.floor((elapsedSecs % 3600) / 60))}:${pad2(elapsedSecs % 60)}`;

    function getLocation(): Promise<{ lat: number; lng: number } | null> {
        return new Promise((resolve) => {
            if (!navigator.geolocation) { resolve(null); return; }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve(null),
                { timeout: 10000, maximumAge: 0, enableHighAccuracy: true },
            );
        });
    }

    function handleCheckIn() {
        setLoading('in');
        setGeoError(null);
        getLocation().then((loc) => {
            if (!loc) {
                setGeoError('Байршил тогтоогдсонгүй. Утасны байршлын зөвшөөрлийг идэвхжүүлнэ үү.');
                setLoading(null);
                return;
            }
            router.post('/my/attendance/check-in', loc, {
                preserveScroll: true,
                onError: (errs) => { if (errs.geofence) setGeoError(errs.geofence); },
                onFinish: () => setLoading(null),
            });
        });
    }
    function handleCheckOut() {
        setLoading('out');
        setGeoError(null);
        getLocation().then((loc) => {
            if (!loc) {
                setGeoError('Байршил тогтоогдсонгүй. Утасны байршлын зөвшөөрлийг идэвхжүүлнэ үү.');
                setLoading(null);
                return;
            }
            router.post('/my/attendance/check-out', loc, {
                preserveScroll: true,
                onError: (errs) => { if (errs.geofence) setGeoError(errs.geofence); },
                onFinish: () => setLoading(null),
            });
        });
    }

    /* Weekly bar chart data */
    const weekBars = week_days.map(d => {
        if (!d.start_time || !d.end_time || d.shift_type === 'off') return { hours: 0, off: d.shift_type === 'off' };
        return { hours: Math.max(0, (timeToMinutes(d.end_time) - timeToMinutes(d.start_time)) / 60), off: false };
    });
    const maxHours = Math.max(...weekBars.map(b => b.hours), 8);

    const selectedDay = week_days[selDay];

    /* 4 stat cards */
    const statCards = [
        { label: 'Чөлөөний хүсэлт', val: stats.pending_leave,    Icon: CalendarDays,  color: RED,       bg: '#fef2f2', href: '/my/leave-requests',    sub: 'хүлээгдэж буй' },
        { label: 'Ээлжийн амралт',    val: stats.vacation_days,    Icon: Umbrella,      color: '#059669', bg: '#f0fdf4', href: '/my/vacation-requests', sub: 'өдөр байна' },
        { label: 'Сануулга',          val: stats.warnings,         Icon: AlertTriangle, color: stats.warnings > 0 ? '#d97706' : '#94a3b8', bg: stats.warnings > 0 ? '#fffbeb' : '#f8fafc', href: '/my/warnings', sub: 'шинэ байна' },
        { label: 'Баримт бичиг',     val: stats.documents,        Icon: FileText,      color: '#475569', bg: '#f8fafc', href: '/my/documents',         sub: 'нийт файл' },
    ];

    return (
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--my-page-bg)', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

            {/* ═══ RED HERO ═══════════════════════════════════════════════════ */}
            <div style={{ background: `linear-gradient(160deg, #ef4444 0%, ${RED} 30%, ${RED2} 65%, ${RED3} 100%)`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -60, right: -60, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: 40, right: 40, pointerEvents: 'none' }} />

                {/* Top info bar */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 0', gap: 10, position: 'relative' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, flex: 1, letterSpacing: 0.3 }}>
                        {employee.number} · {today.date} · {today.day_label}
                    </span>
                    {/* Chat icon */}
                    <ChatIcon variant="ghost" />
                    {/* Notification bell */}
                    <NotificationBell variant="ghost" />
                    {/* Photo or initials avatar — profile link */}
                    <Link href="/my/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {employee.photo_url
                                ? <img src={employee.photo_url} alt={employee.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                                : <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{employee.initials}</span>
                            }
                        </div>
                    </Link>
                </div>

                {/* Greeting + Name */}
                <div style={{ padding: '14px 18px 0', position: 'relative' }}>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '0 0 4px', fontWeight: 500 }}>{greeting(today_schedule?.shift_type)}</p>
                    <h1 style={{ margin: '0 0 6px', lineHeight: 1.15, letterSpacing: -0.8 }}>
                        <span style={{ fontSize: 34, fontWeight: 900, color: 'white' }}>{employee.name} </span>
                        <span style={{ fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>{employee.position ?? 'ажилтан'}</span>
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: '0 0 16px', fontWeight: 500 }}>
                        — {employee.position ?? ''}{employee.branch ? ` · ${employee.branch}` : ''}
                    </p>
                </div>

                {/* Attendance / Check-in block */}
                <div style={{ margin: '0 14px 14px', borderRadius: 18, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(10px)', padding: '14px 16px' }}>
                    {geoError && (
                        <div style={{ marginBottom: 10, background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ fontSize: 14 }}>📍</span>
                            <span style={{ fontSize: 11, color: '#fca5a5', fontWeight: 600 }}>{geoError}</span>
                        </div>
                    )}
                    {!checkedIn ? (
                        /* Not yet checked in */
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24' }} />
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: 0.4 }}>ИРЦИЙН БҮРТГЭЛ</span>
                                </div>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                                    {hasSchedule ? `Ажлын цаг: ${today_schedule!.start_time} – ${today_schedule!.end_time}` : 'Өнөөдрийн хуваарь байхгүй'}
                                </span>
                            </div>
                            <button
                                onClick={handleCheckIn}
                                disabled={loading === 'in'}
                                style={{ flexShrink: 0, background: '#4ade80', color: '#14532d', border: 'none', borderRadius: 14, padding: '10px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: loading === 'in' ? 0.7 : 1 }}
                            >
                                {loading === 'in'
                                    ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#14532d', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                                    : '▶'}
                                Ажил эхлэх
                            </button>
                        </div>
                    ) : !checkedOut ? (
                        /* Checked in, not yet checked out */
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 0 3px rgba(74,222,128,0.3)' }} />
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 700, letterSpacing: 0.5 }}>
                                        АЖИЛЛАЖ БАЙНА · {attendance!.checked_in_at}
                                    </span>
                                </div>
                                <span style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: 1, fontVariantNumeric: 'tabular-nums' }}>{elapsed}</span>
                            </div>
                            <button
                                onClick={handleCheckOut}
                                disabled={loading === 'out'}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 14, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: loading === 'out' ? 0.7 : 1 }}
                            >
                                {loading === 'out'
                                    ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                                    : '■'}
                                Тарах
                            </button>
                        </div>
                    ) : (
                        /* Checked out */
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: 18 }}>✓</span>
                            </div>
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 800, color: 'white', margin: '0 0 2px' }}>Ажил дууслаа</p>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                                    {attendance!.checked_in_at} – {attendance!.checked_out_at} ·{' '}
                                    {Math.floor(attendance!.worked_minutes / 60)}ц {attendance!.worked_minutes % 60}мин
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Week strip */}
                <div style={{ display: 'flex', padding: '0 10px' }}>
                    {week_days.map((d, i) => {
                        const isActive = i === selDay;
                        const hasShift = d.shift_type && d.shift_type !== 'off';
                        return (
                            <button key={d.date} onClick={() => setSelDay(i)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 2px 10px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? 'white' : 'rgba(255,255,255,0.5)', letterSpacing: 0.3 }}>{d.day_label}</span>
                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: isActive ? 'white' : 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: 14, fontWeight: 800, color: isActive ? RED : 'white' }}>{d.day_num}</span>
                                </div>
                                <div style={{ width: 4, height: 4, borderRadius: '50%', background: hasShift ? (isActive ? RED : 'rgba(255,255,255,0.5)') : 'transparent' }} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ═══ WHITE CONTENT ══════════════════════════════════════════════ */}
            <div style={{ padding: '10px 14px', marginTop: -2 }}>

                {/* ── Schedule card ── */}
                {selectedDay && (selectedDay.start_time || selectedDay.shift_type === 'off') ? (
                    <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, boxShadow: 'var(--my-shadow)', overflow: 'hidden', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px 11px', borderBottom: '1px solid var(--my-divider)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: selectedDay.shift_type === 'off' ? '#fbbf24' : '#22c55e' }} />
                                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--my-muted)', letterSpacing: 0.5 }}>
                                    {selectedDay.is_today ? 'ӨНӨӨДРИЙН ЦАГ' : 'АЖЛЫН ЦАГ'}
                                </span>
                            </div>
                            {selectedDay.start_time && selectedDay.end_time && (
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-input-text)' }}>{selectedDay.start_time} → {selectedDay.end_time}</span>
                            )}
                        </div>
                        {selectedDay.shift_type === 'off' ? (
                            <div style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 14, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: 20 }}>☀️</span>
                                </div>
                                <div>
                                    <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--my-input-text)', margin: '0 0 2px' }}>Амралтын өдөр</p>
                                    <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0 }}>{selectedDay.day_label} · {selectedDay.date}</p>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '13px 18px 15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: selectedDay.is_today && hasSchedule ? 12 : 0 }}>
                                    <div style={{ width: 42, height: 42, borderRadius: 13, background: `linear-gradient(135deg, #fca5a5, ${RED})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Clock size={19} color="white" strokeWidth={2} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--my-input-text)', margin: '0 0 2px' }}>
                                            {selectedDay.shift_type === 'morning' ? 'Өглөөний ээлж' : selectedDay.shift_type === 'afternoon' ? 'Өдрийн ээлж' : selectedDay.shift_type === 'full' ? 'Бүтэн өдөр' : 'Ажлын ээлж'}
                                        </p>
                                        <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0, fontWeight: 500 }}>
                                            {selectedDay.start_time} – {selectedDay.end_time}
                                            {today_schedule?.room && selectedDay.is_today ? ` · Каб. ${today_schedule.room}` : ''}
                                        </p>
                                    </div>
                                    <Link href="/my/work-schedule" style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--my-pill-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                                        <ChevronRight size={15} color="var(--my-faint)" />
                                    </Link>
                                </div>
                                {selectedDay.is_today && hasSchedule && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                            <span style={{ fontSize: 10, color: 'var(--my-faint)', fontWeight: 600 }}>Ахиц</span>
                                            <span style={{ fontSize: 10, color: RED, fontWeight: 700 }}>{Math.round(progress)}%</span>
                                        </div>
                                        <div style={{ height: 5, background: 'var(--my-pill-bg)', borderRadius: 99 }}>
                                            <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, #fca5a5, ${RED})`, borderRadius: 99 }} />
                                        </div>
                                        {today_schedule?.assigned_doctor_name && (
                                            <div style={{ marginTop: 10, background: 'var(--my-pill-bg)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
                                                <User size={12} color="var(--my-faint)" />
                                                <span style={{ fontSize: 11, color: 'var(--my-muted)', fontWeight: 600 }}>Эмч: {today_schedule.assigned_doctor_name}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, padding: '18px', marginBottom: 12, boxShadow: 'var(--my-shadow)', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--my-pill-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CalendarDays size={19} color="var(--my-faint)" />
                        </div>
                        <div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--my-muted)', margin: 0 }}>Хуваарь байхгүй</p>
                            <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: '3px 0 0' }}>{selectedDay?.day_label} · {selectedDay?.date}</p>
                        </div>
                    </div>
                )}

                {/* ── 4 Stat cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    {statCards.map(({ label, val, Icon: I, color, bg, href, sub }) => (
                        <Link key={label} href={href} style={{ textDecoration: 'none' }}>
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 20, padding: '15px 14px 13px', boxShadow: 'var(--my-shadow)' }}>
                                <div style={{ width: 38, height: 38, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 9 }}>
                                    <I size={17} color={color} />
                                </div>
                                <p style={{ fontSize: 26, fontWeight: 900, color: 'var(--my-input-text)', margin: '0 0 1px', lineHeight: 1 }}>{val}</p>
                                <p style={{ fontSize: 10, color: 'var(--my-faint)', margin: 0, fontWeight: 500 }}>{sub}</p>
                                <p style={{ fontSize: 10, color, margin: '3px 0 0', fontWeight: 700 }}>{label}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* ── Weekly bar chart ── */}
                <div style={{ background: 'var(--my-card-bg)', borderRadius: 22, padding: '16px 18px 18px', marginBottom: 12, boxShadow: 'var(--my-shadow)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--my-input-text)', margin: 0 }}>Энэ долоо хоногийн ажлын цаг</p>
                        <Link href="/my/work-schedule" style={{ fontSize: 11, fontWeight: 700, color: RED, textDecoration: 'none' }}>Дэлгэрэнгүй →</Link>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                        {weekBars.map((bar, i) => {
                            const d = week_days[i];
                            const isToday = d.is_today;
                            const barH = bar.hours > 0 ? Math.max(12, (bar.hours / maxHours) * 68) : bar.off ? 8 : 4;
                            return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 68 }}>
                                        {bar.hours > 0 && (
                                            <span style={{ fontSize: 8, fontWeight: 700, color: isToday ? RED : 'var(--my-faint)', marginBottom: 3 }}>{bar.hours % 1 === 0 ? bar.hours : bar.hours.toFixed(1)}ц</span>
                                        )}
                                        <div style={{
                                            width: '100%', height: barH, borderRadius: 6,
                                            background: bar.hours > 0
                                                ? (isToday ? `linear-gradient(180deg, #fca5a5, ${RED})` : 'var(--my-divider)')
                                                : (bar.off ? '#fef9c3' : 'var(--my-pill-bg)'),
                                        }} />
                                    </div>
                                    <span style={{ fontSize: 9, fontWeight: isToday ? 800 : 500, color: isToday ? RED : 'var(--my-faint)' }}>{d.day_label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Quick payroll/salary card ── */}
                <Link href="/my/payroll" style={{ textDecoration: 'none', display: 'block', marginBottom: 24 }}>
                    <div style={{ background: `linear-gradient(135deg, ${RED2}, ${RED3})`, borderRadius: 22, padding: '18px 20px', boxShadow: `0 8px 28px ${RED}40`, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <DollarSign size={22} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '0 0 3px', fontWeight: 600 }}>Цалингийн задаргаа</p>
                            <p style={{ fontSize: 16, fontWeight: 900, color: 'white', margin: 0 }}>Цалингаа харах</p>
                        </div>
                        <ChevronRight size={18} color="rgba(255,255,255,0.6)" />
                    </div>
                </Link>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════════
   DESKTOP HOME
════════════════════════════════════════════════════════════════════════════ */
function DesktopHome({ employee, today_schedule, week_days, stats, attendance }: Props) {
    const now = useNow();
    const [loading, setLoading] = useState<'in' | 'out' | null>(null);
    const [geoError, setGeoError] = useState<string | null>(null);
    const hasSchedule = !!today_schedule && today_schedule.shift_type !== 'off';

    const checkedIn  = !!attendance?.checked_in_at;
    const checkedOut = !!attendance?.checked_out_at;
    const checkedInMins = checkedIn ? timeToMinutes(attendance!.checked_in_at!) : 0;
    const elapsedSecs = checkedIn && !checkedOut
        ? Math.max(0, now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() - checkedInMins * 60)
        : 0;
    const elapsed = `${pad2(Math.floor(elapsedSecs / 3600))}:${pad2(Math.floor((elapsedSecs % 3600) / 60))}:${pad2(elapsedSecs % 60)}`;

    function getLocation(): Promise<{ lat: number; lng: number } | null> {
        return new Promise((resolve) => {
            if (!navigator.geolocation) { resolve(null); return; }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve(null),
                { timeout: 10000, maximumAge: 0, enableHighAccuracy: true },
            );
        });
    }

    function handleCheckIn() {
        setLoading('in');
        setGeoError(null);
        getLocation().then((loc) => {
            if (!loc) {
                setGeoError('Байршил тогтоогдсонгүй. Утасны байршлын зөвшөөрлийг идэвхжүүлнэ үү.');
                setLoading(null);
                return;
            }
            router.post('/my/attendance/check-in', loc, {
                preserveScroll: true,
                onError: (errs) => { if (errs.geofence) setGeoError(errs.geofence); },
                onFinish: () => setLoading(null),
            });
        });
    }
    function handleCheckOut() {
        setLoading('out');
        setGeoError(null);
        getLocation().then((loc) => {
            if (!loc) {
                setGeoError('Байршил тогтоогдсонгүй. Утасны байршлын зөвшөөрлийг идэвхжүүлнэ үү.');
                setLoading(null);
                return;
            }
            router.post('/my/attendance/check-out', loc, {
                preserveScroll: true,
                onError: (errs) => { if (errs.geofence) setGeoError(errs.geofence); },
                onFinish: () => setLoading(null),
            });
        });
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-muted-foreground font-medium">{greeting(today_schedule?.shift_type)}</p>
                    <h1 className="text-2xl font-bold text-foreground mt-0.5">
                        {employee.full_name}
                        {employee.position && <span className="text-muted-foreground font-normal text-lg ml-2">· {employee.position}</span>}
                    </h1>
                    {employee.branch && <p className="text-sm text-muted-foreground mt-1">{employee.branch}</p>}
                </div>
                <p className="text-xs text-muted-foreground">{employee.number}</p>
            </div>

            {/* Attendance card */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
                {geoError && (
                    <div className="flex items-center gap-2 px-5 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800">
                        <span className="text-base">📍</span>
                        <p className="text-sm font-medium text-red-600">{geoError}</p>
                    </div>
                )}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                    <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                        <Clock className="size-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-foreground leading-tight">Ирцийн бүртгэл</p>
                        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                            {hasSchedule ? `${today_schedule!.shift_label} · ${today_schedule!.start_time} – ${today_schedule!.end_time}` : 'Өнөөдрийн хуваарь байхгүй'}
                        </p>
                    </div>
                    {checkedIn && !checkedOut && (
                        <div className="flex items-center gap-2 text-sm font-mono font-bold text-foreground tabular-nums">
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                            {elapsed}
                        </div>
                    )}
                </div>

                <div className="px-5 py-4 flex items-center gap-4">
                    {!checkedIn ? (
                        <>
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Та одоогоор бүртгэгдээгүй байна</p>
                            </div>
                            <button
                                onClick={handleCheckIn}
                                disabled={loading === 'in'}
                                className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 px-5 py-2.5 text-sm font-bold text-white transition-colors"
                            >
                                {loading === 'in'
                                    ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    : <span>▶</span>}
                                Ажил эхлэх
                            </button>
                        </>
                    ) : !checkedOut ? (
                        <>
                            <div className="flex-1 flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground font-medium">Ирсэн:</span>
                                    <span className="text-sm font-bold text-emerald-600">{attendance!.checked_in_at}</span>
                                </div>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-xs text-muted-foreground font-medium">Одоо ажиллаж байна</span>
                            </div>
                            <button
                                onClick={handleCheckOut}
                                disabled={loading === 'out'}
                                className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 px-5 py-2.5 text-sm font-bold text-white transition-colors"
                            >
                                {loading === 'out'
                                    ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    : <span>■</span>}
                                Тарах
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="flex-1 flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground">Ирсэн:</span>
                                    <span className="text-sm font-bold text-emerald-600">{attendance!.checked_in_at}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground">Тарсан:</span>
                                    <span className="text-sm font-bold text-blue-600">{attendance!.checked_out_at}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground">Нийт:</span>
                                    <span className="text-sm font-bold text-foreground">
                                        {Math.floor(attendance!.worked_minutes / 60)}ц {attendance!.worked_minutes % 60}мин
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5">
                                <span className="text-emerald-600 text-sm font-bold">✓ Ажил дууслаа</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Чөлөөний хүсэлт', val: stats.pending_leave,   Icon: CalendarDays,  color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950/30',      href: '/my/leave-requests',    sub: 'хүлээгдэж буй' },
                    { label: 'Ээлжийн амралт',   val: stats.vacation_days,   Icon: Umbrella,      color: 'text-emerald-600',bg: 'bg-emerald-50 dark:bg-emerald-950/30',href: '/my/vacation-requests', sub: 'өдөр байна' },
                    { label: 'Баримт бичиг',     val: stats.documents,       Icon: FileText,      color: 'text-slate-600',  bg: 'bg-slate-50 dark:bg-slate-900/50',  href: '/my/documents',         sub: 'нийт файл' },
                    { label: 'Сануулга',          val: stats.warnings,        Icon: AlertTriangle, color: stats.warnings > 0 ? 'text-red-600' : 'text-slate-400', bg: stats.warnings > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-slate-50 dark:bg-slate-900/50', href: '/my/warnings', sub: 'шинэ байна' },
                ].map(({ label, val, Icon: I, color, bg, href, sub }) => (
                    <Link key={label} href={href} className="block no-underline">
                        <div className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-colors">
                            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                                <I className={`size-4 ${color}`} />
                            </div>
                            <p className="text-2xl font-bold text-foreground">{val}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                            <p className={`text-xs font-semibold mt-1 ${color}`}>{label}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Today's schedule */}
                <div className="bg-card rounded-xl border border-border p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                            <Clock className="size-4 text-red-600" />
                        </div>
                        <h2 className="font-semibold text-foreground">Өнөөдрийн хуваарь</h2>
                    </div>
                    {hasSchedule ? (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-foreground">{today_schedule!.shift_label}</span>
                                <span className="text-sm font-bold text-red-600">{today_schedule!.start_time} – {today_schedule!.end_time}</span>
                            </div>
                            {today_schedule!.room && <p className="text-xs text-muted-foreground mb-1">Кабинет: {today_schedule!.room}</p>}
                            {today_schedule!.assigned_doctor_name && <p className="text-xs text-muted-foreground mb-3">Эмч: {today_schedule!.assigned_doctor_name}</p>}
                            <Link href="/my/work-schedule" className="text-xs font-semibold text-red-600 hover:underline">Бүх хуваарь →</Link>
                        </div>
                    ) : today_schedule?.shift_type === 'off' ? (
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <span className="text-2xl">☀️</span>
                            <span className="text-sm font-medium">Амралтын өдөр</span>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Өнөөдрийн хуваарь байхгүй</p>
                    )}
                </div>

                {/* Quick links */}
                <div className="bg-card rounded-xl border border-border p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                            <LayoutGrid className="size-4 text-red-600" />
                        </div>
                        <h2 className="font-semibold text-foreground">Хурдан шилжих</h2>
                    </div>
                    <div className="space-y-1">
                        {[
                            { label: 'Ажлын хуваарь',    Icon: CalendarCheck, href: '/my/work-schedule',    color: 'text-blue-600' },
                            { label: 'Чөлөөний хүсэлт',  Icon: CalendarDays,  href: '/my/leave-requests',   color: 'text-red-600' },
                            { label: 'Ээлжийн амралтын хүсэлт', Icon: Umbrella, href: '/my/vacation-requests', color: 'text-emerald-600' },
                            { label: 'Цалингийн задаргаа',Icon: DollarSign,   href: '/my/payroll',           color: 'text-emerald-600' },
                            { label: 'Номын сан',          Icon: BookOpen,      href: '/my/book-rentals',     color: 'text-purple-600' },
                            { label: 'Тоног төхөөрөмж',   Icon: Package,       href: '/my/equipment',        color: 'text-cyan-600' },
                            { label: 'Санал хүсэлт',      Icon: MessageSquare, href: '/my/feedback',         color: 'text-orange-600' },
                        ].map(({ label, Icon: I, href, color }) => (
                            <Link key={label} href={href} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors no-underline group">
                                <I className={`size-4 ${color} shrink-0`} />
                                <span className="text-sm font-medium text-foreground">{label}</span>
                                <ChevronRight className="size-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════════
   EXPORT
════════════════════════════════════════════════════════════════════════════ */
export default function MyHome(props: Props) {
    const isMobile = useIsMobile();
    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            {isMobile ? <MobileHome {...props} /> : <DesktopHome {...props} />}
        </MyLayout>
    );
}
