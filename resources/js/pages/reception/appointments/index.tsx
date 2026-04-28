import { AptDetailModal, AptFormModal, DayMoreModal as AptDayMoreModal, type ModalAppt } from '@/components/cal-modals';
import ReceptionLayout from '@/layouts/reception-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Bell, CalendarClock, CheckCircle2, ChevronLeft,
    ChevronRight, Clock, Menu, Plus, Search, User, UserCheck, X, XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Doctor { id: number; name: string; specialization: string | null; branch_id: number | null; branch_ids: number[]; photo_url: string | null }
interface Branch { id: number; name: string }
interface Appointment {
    id: number;
    appointment_number: string;
    patient_name: string;
    patient_phone: string;
    patient_email: string | null;
    doctor_id: number | null;
    doctor_name: string | null;
    doctor_spec: string | null;
    branch_id: number | null;
    branch_name: string | null;
    service: string | null;
    type: 'online' | 'in_person';
    appointment_date: string;
    appointment_time: string;
    appointment_time_end: string | null;
    formatted_date: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    payment_status: string | null;
    notes: string | null;
    admin_notes: string | null;
    created_by: string | null;
    confirmed_by: string | null;
}
interface Treatment { id: number; title: string }
interface Stats { total: number; pending: number; confirmed: number; today: number; cancelled: number }
interface Props  { appointments: Appointment[]; doctors: Doctor[]; branches: Branch[]; treatments: Treatment[]; creators: string[]; filters: Record<string,string>; stats: Stats }

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар', href: '/reception/dashboard' },
    { title: 'Цаг захиалга', href: '/reception/appointments' },
];
const STATUS_DOT: Record<string, string> = {
    pending:   'bg-yellow-400',
    confirmed: 'bg-green-500',
    cancelled: 'bg-red-400',
    completed: 'bg-blue-400',
};
const STATUS_CHIP: Record<string, string> = {
    pending:   'bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300',
    confirmed: 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300',
    cancelled: 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
    completed: 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300',
};
const STATUS_LABEL: Record<string, string> = {
    pending:   'Хүлээгдэж байна',
    confirmed: 'Баталгаажсан',
    cancelled: 'Цуцлагдсан',
    completed: 'Дууссан',
};
const DAYS_MN   = ['Дав','Мяг','Лха','Пүр','Баа','Бям','Ням'];
const MONTHS_MN = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар','7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];
const DAY_PALETTE = [
    { bg: '#8b5cf6', light: 'rgba(139,92,246,0.18)', border: '#7c3aed' },
    { bg: '#22c55e', light: 'rgba(34,197,94,0.18)',  border: '#16a34a' },
    { bg: '#3b82f6', light: 'rgba(59,130,246,0.18)', border: '#2563eb' },
    { bg: '#f97316', light: 'rgba(249,115,22,0.18)', border: '#ea580c' },
    { bg: '#ec4899', light: 'rgba(236,72,153,0.18)', border: '#db2777' },
    { bg: '#14b8a6', light: 'rgba(20,184,166,0.18)', border: '#0d9488' },
    { bg: '#6366f1', light: 'rgba(99,102,241,0.18)', border: '#4f46e5' },
    { bg: '#eab308', light: 'rgba(234,179,8,0.18)',  border: '#ca8a04' },
    { bg: '#ef4444', light: 'rgba(239,68,68,0.18)',  border: '#dc2626' },
    { bg: '#0ea5e9', light: 'rgba(14,165,233,0.18)', border: '#0284c7' },
];
function dayPalette(id: number) { return DAY_PALETTE[id % DAY_PALETTE.length]; }

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function pad(y: number, m: number, d: number) {
    return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); }
function getFirstDow(y: number, m: number)    { return (new Date(y, m, 1).getDay() + 6) % 7; }
function toMins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function endMins<T extends { appointment_time: string; appointment_time_end: string | null }>(a: T) {
    return a.appointment_time_end ? toMins(a.appointment_time_end) : toMins(a.appointment_time) + 20;
}
function computeColumns<T extends { appointment_time: string; appointment_time_end: string | null }>(
    apts: T[]
): Array<{ apt: T; col: number; totalCols: number }> {
    if (!apts.length) return [];
    const sorted = [...apts].sort((a, b) => toMins(a.appointment_time) - toMins(b.appointment_time));
    const colEnd: number[] = [];
    const cols: number[] = [];
    for (const a of sorted) {
        const s = toMins(a.appointment_time);
        let c = colEnd.findIndex(e => e <= s);
        if (c === -1) c = colEnd.length;
        cols.push(c);
        colEnd[c] = endMins(a);
    }
    return sorted.map((apt, i) => {
        const s = toMins(apt.appointment_time), e = endMins(apt);
        const maxCol = Math.max(...sorted.map((o, j) => (toMins(o.appointment_time) < e && endMins(o) > s ? cols[j] : 0)));
        return { apt, col: cols[i], totalCols: maxCol + 1 };
    });
}
function doctorInitials(name: string)          { return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }


/* ================================================================== */
/*  Main calendar page                                                  */
/* ================================================================== */
export default function AppointmentsIndex({ appointments: initialApts, doctors, branches, treatments, creators, stats: initialStats }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();

    const [apts, setApts]   = useState<Appointment[]>(initialApts);
    const [stats, setStats] = useState(initialStats);

    useEffect(() => { setApts(initialApts); }, [initialApts]);
    useEffect(() => { setStats(initialStats); }, [initialStats]);

    const today    = new Date();
    const todayStr = pad(today.getFullYear(), today.getMonth(), today.getDate());

    const [nowTime, setNowTime] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNowTime(new Date()), 60_000);
        return () => clearInterval(id);
    }, []);

    const lsGet = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
    const lsSet = (key: string, val: string) => { try { localStorage.setItem(key, val); } catch {} };

    const [view, setView] = useState<'month' | 'week' | 'day'>(() => {
        const v = lsGet('cal_view');
        return (v === 'month' || v === 'week' || v === 'day') ? v : 'month';
    });
    const [selected, setSelected] = useState<string | null>(() => lsGet('cal_selected'));
    const [year,  setYear]  = useState(() => {
        const s = lsGet('cal_selected'); if (s) return new Date(s + 'T00:00').getFullYear();
        return today.getFullYear();
    });
    const [month, setMonth] = useState(() => {
        const s = lsGet('cal_selected'); if (s) return new Date(s + 'T00:00').getMonth();
        return today.getMonth();
    });
    const dayScrollRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    const [detailApt,    setDetailApt]    = useState<Appointment | null>(null);
    const [editApt,      setEditApt]      = useState<Appointment | null>(null);
    const [createDate,   setCreateDate]   = useState<string | null>(null);
    const [expandedDate, setExpandedDate] = useState<string | null>(null);
    const [moreDateModal, setMoreDateModal] = useState<string | null>(null);
    const [createTime, setCreateTime] = useState('10:00');
    const [createDocId, setCreateDocId] = useState('');
    const [doctorPanelOpen, setDoctorPanelOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [mobileSearchQ, setMobileSearchQ] = useState('');

    /* ---- Search state ---- */
    const [searchOpen,       setSearchOpen]       = useState(false);
    const [searchQuery,      setSearchQuery]      = useState('');
    const [searchCreator,    setSearchCreator]    = useState('');
    const [searchDateFrom,   setSearchDateFrom]   = useState('');
    const [searchDateTo,     setSearchDateTo]     = useState('');

    /* ---- Real-time polling notification ---- */
    interface NewBooking { id: number; appointment_number: string; patient_name: string; patient_phone: string; patient_email: string | null; appointment_date: string; appointment_time: string; doctor_name: string | null; type: string }
    const [notifications,  setNotifications]  = useState<NewBooking[]>([]);
    const [notifPerm,      setNotifPerm]      = useState<NotificationPermission>(() =>
        typeof Notification !== 'undefined' ? Notification.permission : 'denied'
    );
    /* Initialize from current max pending ID — existing ones don't trigger alerts */
    const latestIdRef  = useRef<number>(
        Math.max(0, ...initialApts.filter(a => a.status === 'pending' && a.type === 'in_person').map(a => a.id), 0)
    );
    const audioCtxRef  = useRef<AudioContext | null>(null);

    /* Unlock AudioContext on first user interaction (browser autoplay policy) */
    useEffect(() => {
        const unlock = () => {
            try {
                if (!audioCtxRef.current) {
                    audioCtxRef.current = new AudioContext();
                } else if (audioCtxRef.current.state === 'suspended') {
                    audioCtxRef.current.resume();
                }
            } catch {}
        };
        document.addEventListener('click',   unlock);
        document.addEventListener('keydown', unlock);
        return () => {
            document.removeEventListener('click',   unlock);
            document.removeEventListener('keydown', unlock);
        };
    }, []);

    /* Play a two-tone beep — create AudioContext on demand, resume if suspended */
    const playBeep = useCallback(() => {
        const doPlay = (ctx: AudioContext) => {
            try {
                ([[880, 0, 0.13], [1100, 0.16, 0.30]] as [number, number, number][]).forEach(([freq, start, end]) => {
                    const osc  = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + end);
                    osc.start(ctx.currentTime + start);
                    osc.stop(ctx.currentTime + end + 0.05);
                });
            } catch {}
        };
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new AudioContext();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume().then(() => doPlay(ctx));
            } else {
                doPlay(ctx);
            }
        } catch {}
    }, []);

    /* Request browser notification permission (must be called on user gesture) */
    async function requestNotifPermission() {
        if (typeof Notification === 'undefined') return;
        const perm = await Notification.requestPermission();
        setNotifPerm(perm);
    }

    /* Poll every 10 seconds */
    useEffect(() => {
        async function poll() {
            try {
                const res  = await fetch(`/reception/appointments/pending-poll?since_id=${latestIdRef.current}`, { credentials: 'same-origin' });
                if (!res.ok) return;
                const data = await res.json() as { latest_id: number; new_items: NewBooking[] };

                if (data.new_items.length > 0) {
                    latestIdRef.current = data.latest_id;
                    setNotifications(prev => [...data.new_items, ...prev].slice(0, 5));
                    // Auto-dismiss each new toast after 5 seconds
                    data.new_items.forEach(n => {
                        setTimeout(() => setNotifications(prev => prev.filter(x => x.id !== n.id)), 5000);
                    });
                    setApts(prev => {
                        const existingIds = new Set(prev.map(a => a.id));
                        const toAdd = data.new_items
                            .filter(n => !existingIds.has(n.id))
                            .map(n => ({
                                id: n.id, appointment_number: n.appointment_number,
                                patient_name: n.patient_name, patient_phone: n.patient_phone,
                                patient_email: n.patient_email, doctor_id: null, doctor_name: n.doctor_name,
                                doctor_spec: null, branch_id: null, branch_name: null, service: null,
                                type: n.type as 'online' | 'in_person',
                                appointment_date: n.appointment_date, appointment_time: n.appointment_time,
                                appointment_time_end: null,
                                formatted_date: n.appointment_date, status: 'pending' as const,
                                notes: null, admin_notes: null, created_by: null, confirmed_by: null,
                            }));
                        return [...prev, ...toAdd];
                    });
                    setStats(s => ({ ...s, pending: s.pending + data.new_items.length, total: s.total + data.new_items.length }));
                    playBeep();
                    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                        new Notification('🦷 Шинэ захиалга ирлээ!', {
                            body: data.new_items.map(n => `${n.patient_name} — ${n.appointment_date} ${n.appointment_time}`).join('\n'),
                            icon: '/favicon.ico',
                            tag: 'new-booking',
                        });
                    }
                }
            } catch { /* network errors are silent */ }
        }

        poll();
        const id = setInterval(poll, 10_000);
        return () => clearInterval(id);
    }, [playBeep]);

    function dismissNotification(id: number) {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }

    /* Multi-select filters — persisted to localStorage */
    const [filterDocs, setFilterDocs] = useState<Set<number>>(() => {
        try { const s = localStorage.getItem('cal_filter_docs'); return s ? new Set(JSON.parse(s) as number[]) : new Set(); }
        catch { return new Set(); }
    });
    function toggleDoc(id: number) {
        const nid = Number(id);
        setFilterDocs(prev => {
            const n = new Set(prev); n.has(nid) ? n.delete(nid) : n.add(nid);
            try { localStorage.setItem('cal_filter_docs', JSON.stringify([...n])); } catch {}
            return n;
        });
    }
    function changeView(v: 'month' | 'week' | 'day') { setView(v); lsSet('cal_view', v); }
    function changeSelected(s: string | null) { setSelected(s); if (s) lsSet('cal_selected', s); else { try { localStorage.removeItem('cal_selected'); } catch {} } }

    /* Lock page scroll — desktop only */
    useEffect(() => {
        if (isMobile) return;
        const prev = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        return () => { document.documentElement.style.overflow = prev; };
    }, [isMobile]);

    /* Scroll day view / mobile timeline to current hour */
    useEffect(() => {
        if ((view === 'day' || isMobile) && dayScrollRef.current) {
            const scrollTo = Math.max(0, (today.getHours() - 8) * 120 - 60);
            dayScrollRef.current.scrollTop = scrollTo;
        }
    }, [view, isMobile]);

    /* ---- navigation ---- */
    function prevMonth() { month === 0 ? (setMonth(11), setYear(y=>y-1)) : setMonth(m=>m-1); }
    function nextMonth() { month === 11 ? (setMonth(0), setYear(y=>y+1)) : setMonth(m=>m+1); }
    function prevDay() {
        const d = new Date((selected ?? todayStr) + 'T00:00'); d.setDate(d.getDate() - 1);
        const ds = pad(d.getFullYear(), d.getMonth(), d.getDate());
        changeSelected(ds); setYear(d.getFullYear()); setMonth(d.getMonth());
    }
    function nextDay() {
        const d = new Date((selected ?? todayStr) + 'T00:00'); d.setDate(d.getDate() + 1);
        const ds = pad(d.getFullYear(), d.getMonth(), d.getDate());
        changeSelected(ds); setYear(d.getFullYear()); setMonth(d.getMonth());
    }
    function prevWeek() {
        const d = new Date((selected ?? todayStr) + 'T00:00'); d.setDate(d.getDate() - 7);
        const ds = pad(d.getFullYear(), d.getMonth(), d.getDate());
        changeSelected(ds); setYear(d.getFullYear()); setMonth(d.getMonth());
    }
    function nextWeek() {
        const d = new Date((selected ?? todayStr) + 'T00:00'); d.setDate(d.getDate() + 7);
        const ds = pad(d.getFullYear(), d.getMonth(), d.getDate());
        changeSelected(ds); setYear(d.getFullYear()); setMonth(d.getMonth());
    }


    /* ---- calendar data: баталгаажсан цагууд ---- */
    const visibleApts = useMemo(() => {
        let r = apts.filter(a => a.status === 'confirmed');
        if (filterDocs.size > 0) {
            r = r.filter(a => a.doctor_id !== null && filterDocs.has(Number(a.doctor_id)));
        }
        return r;
    }, [apts, filterDocs]);


    const sidebarDoctors = doctors;

    const aptByDate = useMemo(() => {
        const map: Record<string, Appointment[]> = {};
        for (const a of visibleApts) (map[a.appointment_date] ??= []).push(a);
        return map;
    }, [visibleApts]);

    /* ---- week days ---- */
    const weekStart = useMemo(() => {
        const d = selected ? new Date(selected + 'T00:00') : new Date(year, month, 1);
        const s = new Date(d); s.setDate(d.getDate() - (d.getDay() + 6) % 7); return s;
    }, [selected, year, month]);
    const weekDays = useMemo(() =>
        Array.from({length:7}, (_,i) => { const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); return d; }),
        [weekStart]
    );

    /* ---- calendar grid ---- */
    const daysInMonth  = getDaysInMonth(year, month);
    const firstWeekDay = getFirstDow(year, month);
    const totalCells   = Math.ceil((firstWeekDay + daysInMonth) / 7) * 7;

    /* ---- search results (client-side filter across all apts) ---- */
    const searchResults = useMemo(() => {
        const hasFilter = searchQuery.trim() || searchCreator || searchDateFrom || searchDateTo;
        if (!hasFilter) return [];
        const q = searchQuery.trim().toLowerCase();
        return apts.filter(a => {
            if (q && !a.patient_name.toLowerCase().includes(q) && !a.patient_phone.includes(q) && !a.appointment_number.toLowerCase().includes(q)) return false;
            if (searchCreator && (a.created_by ?? '') !== searchCreator) return false;
            if (searchDateFrom && a.appointment_date < searchDateFrom) return false;
            if (searchDateTo   && a.appointment_date > searchDateTo)   return false;
            return true;
        }).sort((a,b) => a.appointment_date.localeCompare(b.appointment_date) || a.appointment_time.localeCompare(b.appointment_time));
    }, [apts, searchQuery, searchCreator, searchDateFrom, searchDateTo]);

    /* ---- actions ---- */
    function changeStatus(id: number, newStatus: string) {
        setApts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus as Appointment['status'] } : a));
        if (detailApt?.id === id) setDetailApt(d => d ? { ...d, status: newStatus as Appointment['status'] } : d);
        setStats(s => {
            const old = apts.find(a => a.id === id);
            if (!old) return s;
            const next = { ...s };
            if (old.status === 'pending')   next.pending   = Math.max(0, s.pending - 1);
            if (old.status === 'confirmed') next.confirmed = Math.max(0, s.confirmed - 1);
            if (newStatus === 'pending')   next.pending   += 1;
            if (newStatus === 'confirmed') next.confirmed += 1;
            return next;
        });
        router.patch(`/reception/appointments/${id}/status`, { status: newStatus }, { preserveScroll: true, preserveState: true });
    }

    function deleteApt(id: number, num: string) {
        if (!confirm(`${num} устгах уу?`)) return;
        setApts(prev => prev.filter(a => a.id !== id));
        if (detailApt?.id === id) setDetailApt(null);
        router.delete(`/reception/appointments/${id}`, { preserveScroll: true, preserveState: true });
    }

    function openCreate(dateStr: string, time = '09:00', docId = '') {
        changeSelected(dateStr);
        setCreateDate(dateStr);
        setCreateTime(time);
        setCreateDocId(docId);
    }

    function openApt(a: Appointment) {
        if (a.status === 'pending' && a.type === 'in_person') {
            setEditApt(a);
        } else {
            setDetailApt(a);
        }
    }

    /* ---- day view helpers ---- */
    const HOUR_START = 8;       // grid starts at 08:00
    const HOUR_END   = 21;      // grid ends at 21:00
    const HOUR_H     = 120;     // px per hour — 6 slots × 20px = 120px
    const CAL_START_MINS = 8 * 60;        // 08:00
    const CAL_END_MINS   = 20 * 60 + 50; // 20:50
    const SLOT_MINS      = 10;            // 10-min slots
    const PX_PER_MIN     = HOUR_H / 60;  // px per minute

    function timeFromY(y: number): string {
        const rawMins = HOUR_START * 60 + Math.max(0, (y / HOUR_H) * 60);
        const snapped = Math.round(rawMins / SLOT_MINS) * SLOT_MINS;
        const clamped = Math.max(CAL_START_MINS, Math.min(CAL_END_MINS, snapped));
        const h = Math.floor(clamped / 60);
        const m = clamped % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }
    function aptTop(time: string) {
        const [h, m] = time.split(':').map(Number);
        return ((h * 60 + m - HOUR_START * 60) / 60) * HOUR_H;
    }
    const nowTop = ((nowTime.getHours() * 60 + nowTime.getMinutes() - HOUR_START * 60) / 60) * HOUR_H;
    const selDay = selected ?? todayStr;

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Цаг захиалга" />

            {/* Modals */}
            {createDate && (
                <AptFormModal routePrefix="/reception/appointments"
                    date={createDate} initialTime={createTime} initialDoctorId={createDocId}
                    doctors={doctors} branches={branches} treatments={treatments}
                    onClose={() => setCreateDate(null)} />
            )}
            {detailApt && (
                <AptDetailModal apt={detailApt as ModalAppt} onClose={() => setDetailApt(null)}
                    onStatusChange={changeStatus} onDelete={deleteApt}
                    onEdit={a => { setDetailApt(null); setEditApt(a as Appointment); }} />
            )}
            {editApt && (
                <AptFormModal routePrefix="/reception/appointments"
                    apt={editApt as ModalAppt} date={editApt.appointment_date}
                    doctors={doctors} branches={branches} treatments={treatments}
                    onClose={() => setEditApt(null)}
                    onSaved={updated => {
                        setApts(prev => prev.map(a => a.id === updated.id ? updated as unknown as Appointment : a));
                        setEditApt(null);
                    }} />
            )}
            {moreDateModal && (
                <AptDayMoreModal
                    dateStr={moreDateModal}
                    apts={(aptByDate[moreDateModal] ?? []) as ModalAppt[]}
                    onClose={() => setMoreDateModal(null)}
                    onSelect={a => { changeSelected(moreDateModal); openApt(a as unknown as Appointment); }}
                    onAdd={openCreate}
                />
            )}

            {/* ── Toast notifications (top-right) ── */}
            {notifications.length > 0 && (
                <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 pointer-events-none">
                    {notifications.map(n => (
                        <div key={n.id}
                            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-orange-200 bg-white dark:bg-zinc-900 dark:border-orange-800 shadow-xl shadow-orange-100/50 dark:shadow-orange-950/30 px-4 py-3 min-w-[280px] max-w-[340px]"
                            style={{ animation: 'toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                            {/* Icon */}
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/40">
                                <Bell className="size-4 text-orange-600 dark:text-orange-400 animate-pulse" />
                            </div>
                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-orange-700 dark:text-orange-400 uppercase tracking-wide">Шинэ цагийн хүсэлт ирлээ</p>
                                <p className="text-sm font-bold text-foreground truncate mt-0.5">{n.patient_name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                    <Clock className="size-3 shrink-0" />
                                    {n.appointment_date
                                        ? `${n.appointment_date}${n.appointment_time ? ' ' + n.appointment_time : ''}`
                                        : 'Цаг тохироогүй'}
                                    {n.type === 'online' && <span className="ml-1">💻</span>}
                                    {n.type === 'in_person' && <span className="ml-1">🏥</span>}
                                </p>
                                {n.doctor_name && (
                                    <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{n.doctor_name}</p>
                                )}
                            </div>
                            {/* Close */}
                            <button onClick={() => dismissNotification(n.id)}
                                className="shrink-0 rounded-lg p-1 hover:bg-muted transition-colors mt-0.5">
                                <X className="size-3.5 text-muted-foreground" />
                            </button>
                            {/* Progress bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl overflow-hidden">
                                <div className="h-full bg-orange-400 dark:bg-orange-600 origin-left"
                                    style={{ animation: 'toast-progress 5s linear forwards' }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <style>{`
                @keyframes toast-in {
                    from { opacity: 0; transform: translateX(100%) scale(0.9); }
                    to   { opacity: 1; transform: translateX(0) scale(1); }
                }
                @keyframes toast-progress {
                    from { transform: scaleX(1); }
                    to   { transform: scaleX(0); }
                }
            `}</style>

            {isMobile ? (
                /* ══════════════════════════════════════════════════════
                   MOBILE — Dark calendar (Сар / 7х / Өдөр views)
                ══════════════════════════════════════════════════════ */
                <div className="bg-background text-foreground" style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

                    {/* ── HEADER ── */}
                    <div className="bg-background border-b border-border" style={{ flexShrink:0, padding:'10px 16px 0', userSelect:'none' }}>
                        {/* Top row: hamburger · date · view toggle · search */}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                            <button onClick={() => setDoctorPanelOpen(true)}
                                className="bg-muted hover:bg-muted/80 transition-colors"
                                style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
                                <Menu className="text-foreground" style={{ width:18, height:18 }} />
                            </button>
                            <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); changeSelected(todayStr); }}
                                style={{ textAlign:'center', background:'none', border:'none', cursor:'pointer' }}>
                                <div className="text-muted-foreground" style={{ fontSize:11, fontWeight:500 }}>{year} · {MONTHS_MN[month]}</div>
                                <div className="text-foreground" style={{ fontSize:17, fontWeight:700 }}>
                                    {new Date(selDay + 'T00:00').getDate()}-ны өдөр
                                </div>
                            </button>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <div className="bg-muted" style={{ display:'flex', borderRadius:10, padding:2, gap:1 }}>
                                    {(['month','week','day'] as const).map((v, vi) => (
                                        <button key={v} onClick={() => { changeView(v); if (v === 'day' && !selected) changeSelected(todayStr); }}
                                            style={{
                                                padding:'4px 9px', borderRadius:8, fontSize:11, fontWeight:700, border:'none', cursor:'pointer',
                                                background: view === v ? '#22c55e' : 'transparent',
                                                color: view === v ? 'white' : 'hsl(var(--muted-foreground))',
                                            }}>
                                            {['Сар','7х','Өдөр'][vi]}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setMobileSearchOpen(o => !o)}
                                    className="bg-muted hover:bg-muted/80 transition-colors"
                                    style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
                                    <Search className="text-foreground" style={{ width:16, height:16 }} />
                                </button>
                            </div>
                        </div>

                        {/* Mobile search bar */}
                        {mobileSearchOpen && (
                            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 0 10px', marginTop:-4 }}>
                                <div className="bg-muted" style={{ flex:1, display:'flex', alignItems:'center', gap:8, borderRadius:10, padding:'8px 12px' }}>
                                    <Search className="text-muted-foreground" style={{ width:14, height:14, flexShrink:0 }} />
                                    <input
                                        autoFocus
                                        type="text"
                                        value={mobileSearchQ}
                                        onChange={e => setMobileSearchQ(e.target.value)}
                                        placeholder="Нэр эсвэл утасны дугаар..."
                                        className="bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                                        style={{ flex:1, fontSize:13, border:'none' }}
                                    />
                                    {mobileSearchQ && (
                                        <button onClick={() => setMobileSearchQ('')} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
                                            <X className="text-muted-foreground" style={{ width:14, height:14 }} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Week strip (Sun→Sat) */}
                        {(() => {
                            const selDate = new Date(selDay + 'T00:00');
                            const dow = selDate.getDay(); // 0=Sun
                            const weekSun = new Date(selDate);
                            weekSun.setDate(selDate.getDate() - dow);
                            return (
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', paddingBottom:8 }}>
                                    {['Ня','Да','Мя','Лх','Пу','Ба','Бя'].map((dn, i) => {
                                        const d = new Date(weekSun); d.setDate(weekSun.getDate() + i);
                                        const ds = pad(d.getFullYear(), d.getMonth(), d.getDate());
                                        const isT = ds === todayStr;
                                        const isSel = ds === selDay;
                                        const cnt = aptByDate[ds]?.length ?? 0;
                                        return (
                                            <button key={ds} onClick={() => { changeSelected(ds); setYear(d.getFullYear()); setMonth(d.getMonth()); }}
                                                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'none', border:'none', cursor:'pointer', padding:'2px 0' }}>
                                                <span style={{ fontSize:9, color:'hsl(var(--muted-foreground))', fontWeight:600, textTransform:'uppercase' }}>{dn}</span>
                                                <span style={{
                                                    width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                                                    fontSize:14, fontWeight: isSel || isT ? 700 : 400,
                                                    background: isSel ? '#22c55e' : 'transparent',
                                                    color: isSel ? 'white' : isT ? '#22c55e' : 'hsl(var(--foreground))',
                                                }}>{d.getDate()}</span>
                                                <span style={{ width:5, height:5, borderRadius:'50%', background: cnt > 0 ? (isSel ? 'white' : '#22c55e') : 'transparent' }} />
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>

                    {/* ── CONTENT AREA ── */}
                    <div style={{ flex:1, overflow:'hidden', position:'relative' }}>

                        {/* ── MOBILE SEARCH RESULTS ── */}
                        {mobileSearchOpen && mobileSearchQ.trim() && (() => {
                            const q = mobileSearchQ.trim().toLowerCase();
                            const results = visibleApts.filter(a =>
                                a.patient_name.toLowerCase().includes(q) ||
                                a.patient_phone.includes(q)
                            ).sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.appointment_time.localeCompare(b.appointment_time));
                            return (
                                <div style={{ position:'absolute', inset:0, zIndex:30, overflowY:'auto', background:'hsl(var(--background))' }}>
                                    {results.length === 0 ? (
                                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:'60px 0', color:'hsl(var(--muted-foreground))' }}>
                                            <Search style={{ width:36, height:36, opacity:0.2 }} />
                                            <p style={{ fontSize:14 }}>Үр дүн олдсонгүй</p>
                                        </div>
                                    ) : results.map(a => {
                                        const pal = a.doctor_id ? dayPalette(a.doctor_id) : DAY_PALETTE[0];
                                        return (
                                            <button key={a.id} onClick={() => { openApt(a); changeSelected(a.appointment_date); setMobileSearchOpen(false); setMobileSearchQ(''); }}
                                                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid hsl(var(--border))', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
                                                <div style={{ width:4, alignSelf:'stretch', borderRadius:99, background: pal.bg, flexShrink:0 }} />
                                                <div style={{ flex:1, minWidth:0 }}>
                                                    <p style={{ fontSize:14, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'hsl(var(--foreground))', marginBottom:2 }}>{a.patient_name}</p>
                                                    <p style={{ fontSize:11, color:'hsl(var(--muted-foreground))' }}>
                                                        {a.appointment_date} · {a.appointment_time}
                                                        {a.doctor_name && <span style={{ color: pal.bg }}> · {a.doctor_name.split(' ')[0]}</span>}
                                                    </p>
                                                </div>
                                                <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background: pal.light, color: pal.border, flexShrink:0 }}>
                                                    {STATUS_LABEL[a.status]}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                        {/* ── DAY VIEW ── */}
                        {view === 'day' && (
                            <div ref={dayScrollRef} style={{ height:'100%', overflowY:'auto' }}>
                                {(() => {
                                    const dapts = (aptByDate[selDay] ?? []).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
                                    const totalH = (HOUR_END - HOUR_START) * HOUR_H;
                                    const isToday = selDay === todayStr;
                                    const cols = computeColumns(dapts);
                                    return (
                                        <div style={{ minHeight: totalH + 48 }}>
                                            <div style={{ position:'relative', display:'flex', height: totalH }}>
                                                {/* Hour labels */}
                                                <div style={{ width:52, flexShrink:0, position:'relative' }}>
                                                    {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
                                                        <div key={i} style={{ position:'absolute', right:8, top: i * HOUR_H - 7, fontSize:10, color:'hsl(var(--muted-foreground))', fontWeight:500, userSelect:'none' }}>
                                                            {String(HOUR_START + i).padStart(2,'0')}:00
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Event area */}
                                                <div style={{ flex:1, position:'relative', borderLeft:'1px solid var(--cal-line-hour)' }}>
                                                    {/* Hour lines */}
                                                    {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                                                        <div key={i} style={{ position:'absolute', left:0, right:0, top: i * HOUR_H, borderTop:'1px solid var(--cal-line-hour)' }} />
                                                    ))}
                                                    {/* Half-hour lines */}
                                                    {Array.from({ length: (HOUR_END - HOUR_START) * 2 }, (_, i) => {
                                                        if (i % 2 === 0) return null;
                                                        return <div key={`hh${i}`} style={{ position:'absolute', left:0, right:0, top: i * (HOUR_H / 2), borderTop:'1px solid var(--cal-line-half)' }} />;
                                                    })}
                                                    {/* Appointment cards */}
                                                    {cols.map(({ apt: a, col, totalCols }) => {
                                                        const pal2 = a.doctor_id ? dayPalette(a.doctor_id) : DAY_PALETTE[0];
                                                        const top = aptTop(a.appointment_time);
                                                        const durMins = endMins(a) - toMins(a.appointment_time);
                                                        const h = Math.max(26, Math.round(durMins * PX_PER_MIN));
                                                        const colW = `calc((100% - 6px) / ${totalCols})`;
                                                        const colL = `calc(${col} * (100% - 6px) / ${totalCols} + 3px)`;
                                                        const compact = h < 46;
                                                        const doc = a.doctor_id ? doctors.find(d => d.id === a.doctor_id) : null;
                                                        return (
                                                            <div key={a.id} onClick={() => openApt(a)}
                                                                style={{
                                                                    position:'absolute', top, height: h, width: colW, left: colL,
                                                                    zIndex: col + 1,
                                                                    background: compact
                                                                        ? `${pal2.bg}28`
                                                                        : `linear-gradient(145deg, ${pal2.bg}55, ${pal2.bg}33)`,
                                                                    borderLeft: `3px solid ${pal2.bg}`,
                                                                    borderRadius: compact ? 6 : 10,
                                                                    cursor:'pointer', overflow:'hidden',
                                                                    display:'flex',
                                                                    alignItems: compact ? 'center' : 'flex-start',
                                                                    gap: compact ? 4 : 7,
                                                                    padding: compact ? '0 6px' : '6px 8px 5px',
                                                                    backdropFilter: compact ? undefined : 'blur(4px)',
                                                                }}>
                                                                {!compact && (
                                                                    <div style={{
                                                                        width:24, height:24, borderRadius:'50%', flexShrink:0,
                                                                        background: pal2.bg, overflow:'hidden',
                                                                        display:'flex', alignItems:'center', justifyContent:'center',
                                                                        fontSize:9, fontWeight:800, color:'white', marginTop:1,
                                                                    }}>
                                                                        {doc?.photo_url
                                                                            ? <img src={doc.photo_url} alt={a.doctor_name ?? ''} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                                                            : (a.doctor_name ? doctorInitials(a.doctor_name) : '?')
                                                                        }
                                                                    </div>
                                                                )}
                                                                <div style={{ flex:1, minWidth:0 }}>
                                                                    {compact ? (
                                                                        <p style={{ fontSize:10, fontWeight:700, color: pal2.bg, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1 }}>
                                                                            {a.appointment_time} {a.patient_name.split(' ')[0]}
                                                                        </p>
                                                                    ) : (
                                                                        <>
                                                                            <p style={{ fontSize:12, fontWeight:700, color:'hsl(var(--foreground))', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1.3, marginBottom:2 }}>
                                                                                {a.patient_name}
                                                                            </p>
                                                                            <p style={{ fontSize:10, color: pal2.bg, fontWeight:600, lineHeight:1.2 }}>
                                                                                {a.appointment_time}{a.appointment_time_end ? `–${a.appointment_time_end}` : ''}
                                                                            </p>
                                                                            {h > 80 && a.service && (
                                                                                <span style={{
                                                                                    display:'inline-block', marginTop:3,
                                                                                    padding:'1px 7px', borderRadius:99,
                                                                                    fontSize:9, fontWeight:700,
                                                                                    background:`${pal2.bg}35`, color: pal2.bg,
                                                                                }}>{a.service}</span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {/* Current time indicator */}
                                                    {isToday && nowTop >= 0 && nowTop <= totalH && (
                                                        <div style={{ position:'absolute', left:0, right:0, top: nowTop, zIndex:20, display:'flex', alignItems:'center', pointerEvents:'none' }}>
                                                            <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444', marginLeft:-5, flexShrink:0 }} />
                                                            <div style={{ flex:1, borderTop:'2px solid #ef4444' }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {dapts.length === 0 && (
                                                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:'80px 0', color:'hsl(var(--muted-foreground))' }}>
                                                    <CalendarClock style={{ width:40, height:40, opacity:0.25 }} />
                                                    <p style={{ fontSize:14 }}>Энэ өдөр захиалга байхгүй</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* ── MONTH VIEW ── */}
                        {view === 'month' && (
                            <div style={{ height:'100%', overflowY:'auto', display:'flex', flexDirection:'column' }}>
                                {/* Month navigation */}
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px 4px', flexShrink:0 }}>
                                    <button onClick={prevMonth} style={{ padding:6, borderRadius:8, background:'hsl(var(--muted))', border:'none', cursor:'pointer' }}>
                                        <ChevronLeft style={{ width:18, height:18, color:'hsl(var(--foreground))' }} />
                                    </button>
                                    <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); changeSelected(todayStr); }}
                                        style={{ fontSize:14, fontWeight:700, color:'hsl(var(--foreground))', background:'none', border:'none', cursor:'pointer' }}>
                                        {year} · {MONTHS_MN[month]}
                                    </button>
                                    <button onClick={nextMonth} style={{ padding:6, borderRadius:8, background:'hsl(var(--muted))', border:'none', cursor:'pointer' }}>
                                        <ChevronRight style={{ width:18, height:18, color:'hsl(var(--foreground))' }} />
                                    </button>
                                </div>
                                {/* Day headers Sun-Sat */}
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 12px', flexShrink:0 }}>
                                    {['Ня','Да','Мя','Лх','Пу','Ба','Бя'].map(dn => (
                                        <div key={dn} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'hsl(var(--muted-foreground))', padding:'4px 0', textTransform:'uppercase' }}>{dn}</div>
                                    ))}
                                </div>
                                {/* Calendar grid (Sun-first) */}
                                {(() => {
                                    const firstDowSun = new Date(year, month, 1).getDay();
                                    const daysInMo = getDaysInMonth(year, month);
                                    const totalCellsMo = Math.ceil((firstDowSun + daysInMo) / 7) * 7;
                                    return (
                                        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 12px 4px', flexShrink:0 }}>
                                            {Array.from({ length: totalCellsMo }, (_, idx) => {
                                                const dayNum = idx - firstDowSun + 1;
                                                const inMonth = dayNum >= 1 && dayNum <= daysInMo;
                                                const dateStr = inMonth ? pad(year, month, dayNum) : '';
                                                const isT2 = dateStr === todayStr;
                                                const isSel2 = dateStr === selDay;
                                                const cnt = dateStr ? (aptByDate[dateStr]?.length ?? 0) : 0;
                                                return (
                                                    <button key={idx} disabled={!inMonth}
                                                        onClick={() => inMonth && changeSelected(dateStr)}
                                                        style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'3px 1px', gap:2, background:'none', border:'none', borderTop: idx >= 7 ? '1px solid var(--cal-line-hour)' : undefined, borderRight: (idx % 7) < 6 ? '1px solid var(--cal-line-half)' : undefined, cursor: inMonth ? 'pointer' : 'default', opacity: inMonth ? 1 : 0 }}>
                                                        <span style={{
                                                            width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                                                            fontSize:13, fontWeight: isSel2 || isT2 ? 700 : 400,
                                                            background: isSel2 ? '#22c55e' : 'transparent',
                                                            color: isSel2 ? 'white' : isT2 ? '#22c55e' : 'hsl(var(--foreground))',
                                                        }}>{dayNum}</span>
                                                        <div style={{ display:'flex', gap:2, minHeight:5 }}>
                                                            {Array.from({ length: Math.min(cnt, 3) }, (_, j) => (
                                                                <span key={j} style={{ width:4, height:4, borderRadius:'50%', background: isSel2 ? 'rgba(255,255,255,0.7)' : '#22c55e' }} />
                                                            ))}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                                {/* Appointment list for selected date */}
                                <div style={{ flex:1, borderTop:'1px solid hsl(var(--border))', padding:'10px 16px 16px', overflowY:'auto' }}>
                                    <p style={{ fontSize:11, fontWeight:700, color:'hsl(var(--muted-foreground))', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                                        {MONTHS_MN[new Date(selDay+'T00:00').getMonth()]} {new Date(selDay+'T00:00').getDate()}
                                    </p>
                                    {(() => {
                                        const dapts = (aptByDate[selDay] ?? []).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
                                        if (dapts.length === 0) return <p style={{ fontSize:13, color:'hsl(var(--muted-foreground))', fontStyle:'italic' }}>Захиалга байхгүй</p>;
                                        return (
                                            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                                                {dapts.map(a => {
                                                    const pal = a.doctor_id ? dayPalette(a.doctor_id) : DAY_PALETTE[0];
                                                    return (
                                                        <button key={a.id} onClick={() => openApt(a)}
                                                            style={{
                                                                width:'100%', display:'flex', alignItems:'center', gap:12,
                                                                padding:'10px 12px', textAlign:'left', cursor:'pointer',
                                                                background: pal.light,
                                                                border: `1.5px solid ${pal.bg}55`,
                                                                borderLeft: `4px solid ${pal.bg}`,
                                                                borderRadius:12,
                                                            }}>
                                                            <span style={{ fontSize:12, fontWeight:700, color: pal.bg, width:44, flexShrink:0 }}>
                                                                {a.appointment_time}
                                                            </span>
                                                            <div style={{ flex:1, minWidth:0 }}>
                                                                <p className="text-foreground" style={{ fontSize:14, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:2 }}>
                                                                    {a.patient_name}
                                                                </p>
                                                                <p style={{ fontSize:11, color:'hsl(var(--muted-foreground))' }}>
                                                                    {a.doctor_name && <span style={{ color: pal.bg }}>{a.doctor_name.split(' ')[0]}</span>}
                                                                    {a.service && ` · ${a.service}`}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* ── WEEK VIEW (7х) ── */}
                        {view === 'week' && (
                            <div style={{ height:'100%', overflowY:'auto', overflowX:'hidden' }}>
                                {(() => {
                                    const selDate = new Date(selDay + 'T00:00');
                                    const dow = selDate.getDay();
                                    const weekSun2 = new Date(selDate);
                                    weekSun2.setDate(selDate.getDate() - dow);
                                    const wdays = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekSun2); d.setDate(weekSun2.getDate() + i); return d; });
                                    const totalH = (HOUR_END - HOUR_START) * HOUR_H;
                                    return (
                                        <>
                                            <div style={{ position:'relative', display:'flex', height: totalH }}>
                                                <div style={{ width:36, flexShrink:0, position:'relative' }}>
                                                    {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
                                                        <div key={i} style={{ position:'absolute', right:4, top: i * HOUR_H - 7, fontSize:9, color:'hsl(var(--muted-foreground))', fontWeight:500, userSelect:'none' }}>
                                                            {String(HOUR_START + i).padStart(2,'0')}
                                                        </div>
                                                    ))}
                                                </div>
                                                {wdays.map((d) => {
                                                    const ds = pad(d.getFullYear(), d.getMonth(), d.getDate());
                                                    const isT = ds === todayStr;
                                                    const colApts = (aptByDate[ds] ?? []).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
                                                    return (
                                                        <div key={ds} style={{ flex:1, position:'relative', borderLeft:'1px solid var(--cal-line-hour)' }}>
                                                            {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                                                                <div key={i} style={{ position:'absolute', left:0, right:0, top: i * HOUR_H, borderTop:'1px solid var(--cal-line-hour)' }} />
                                                            ))}
                                                            {computeColumns(colApts).map(({ apt: a, col, totalCols }) => {
                                                                const pal2 = a.doctor_id ? dayPalette(a.doctor_id) : DAY_PALETTE[0];
                                                                const top2 = aptTop(a.appointment_time);
                                                                const endM3 = (() => {
                                                                    if (!a.appointment_time_end) return null;
                                                                    const [eh, em] = a.appointment_time_end.split(':').map(Number);
                                                                    const [sh, sm] = a.appointment_time.split(':').map(Number);
                                                                    return (eh * 60 + em) - (sh * 60 + sm);
                                                                })();
                                                                const h3 = endM3 && endM3 > 10 ? Math.max(28, endM3 * PX_PER_MIN) : 28;
                                                                return (
                                                                    <div key={a.id} onClick={() => { changeSelected(ds); openApt(a); }}
                                                                        style={{
                                                                            position:'absolute',
                                                                            left: `calc(${col} * 100% / ${totalCols} + 1px)`,
                                                                            right: `calc(${totalCols - col - 1} * 100% / ${totalCols} + 1px)`,
                                                                            top: top2, height: h3,
                                                                            zIndex: col + 1,
                                                                            background: pal2.light,
                                                                            borderLeft: `3px solid ${pal2.bg}`,
                                                                            borderRadius:6, cursor:'pointer', overflow:'hidden',
                                                                            padding:'3px 5px',
                                                                        }}>
                                                                        <p style={{ fontSize:9, fontWeight:700, color: pal2.border, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }}>
                                                                            {a.patient_name.split(' ')[0]}
                                                                        </p>
                                                                        {h3 > 40 && (
                                                                            <p style={{ fontSize:8, color: pal2.border, opacity:0.75, lineHeight:1.2 }}>{a.appointment_time}</p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            {isT && nowTop >= 0 && nowTop <= totalH && (
                                                                <div style={{ position:'absolute', left:0, right:0, top: nowTop, zIndex:20, borderTop:'1.5px solid #ef4444', pointerEvents:'none' }} />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* ── FAB ── */}
                    <button onClick={() => openCreate(selDay)}
                        style={{
                            position:'fixed', bottom:66, right:18,
                            width:54, height:54, borderRadius:'50%',
                            background:'#22c55e', color:'white', border:'none',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            boxShadow:'0 4px 20px rgba(34,197,94,0.4)', cursor:'pointer', zIndex:40,
                        }}>
                        <Plus style={{ width:24, height:24 }} />
                    </button>

                    {/* ── DOCTOR FILTER PANEL ── */}
                    {doctorPanelOpen && (
                        <div style={{ position:'fixed', inset:0, zIndex:60 }} onClick={() => setDoctorPanelOpen(false)}>
                            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.65)' }} />
                            <div className="bg-card" style={{
                                position:'absolute', bottom:0, left:0, right:0,
                                borderRadius:'20px 20px 0 0',
                                maxHeight:'80vh', display:'flex', flexDirection:'column',
                                overflow:'hidden',
                            }} onClick={e => e.stopPropagation()}>
                                {/* Panel header */}
                                <div className="border-b border-border" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px' }}>
                                    <div>
                                        <p className="text-muted-foreground" style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>Харагдах</p>
                                        <p className="text-foreground" style={{ fontSize:18, fontWeight:700 }}>Эмч нар</p>
                                    </div>
                                    <button onClick={() => setDoctorPanelOpen(false)}
                                        className="bg-muted hover:bg-muted/80 transition-colors"
                                        style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
                                        <X className="text-foreground" style={{ width:16, height:16 }} />
                                    </button>
                                </div>
                                {/* Toggle all */}
                                <div style={{ padding:'10px 20px', borderBottom:'1px solid hsl(var(--border))' }}>
                                    <button
                                        onClick={() => {
                                            if (filterDocs.size > 0) {
                                                setFilterDocs(new Set());
                                                try { localStorage.removeItem('cal_filter_docs'); } catch {}
                                            } else {
                                                const all = new Set(sidebarDoctors.map(d => d.id));
                                                setFilterDocs(all);
                                                try { localStorage.setItem('cal_filter_docs', JSON.stringify([...all])); } catch {}
                                            }
                                        }}
                                        className="bg-muted hover:bg-muted/80 text-foreground transition-colors"
                                        style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, border:'none', cursor:'pointer', width:'100%' }}>
                                        <span style={{ fontSize:16, lineHeight:1 }}>≡</span>
                                        <span style={{ fontSize:13, fontWeight:500 }}>Бүгдийг {filterDocs.size > 0 ? 'харуулах' : 'нуух'}</span>
                                    </button>
                                </div>
                                {/* Doctor list */}
                                <div style={{ overflowY:'auto', flex:1 }}>
                                    {sidebarDoctors.map(d => {
                                        const pal = dayPalette(d.id);
                                        const checked = filterDocs.has(Number(d.id));
                                        const dayCount = (aptByDate[selDay] ?? []).filter(a => a.doctor_id === d.id).length;
                                        return (
                                            <button key={d.id} onClick={() => toggleDoc(d.id)}
                                                style={{
                                                    width:'100%', display:'flex', alignItems:'center', gap:12,
                                                    padding:'11px 20px', border:'none', cursor:'pointer',
                                                    background: checked ? pal.bg + '22' : 'transparent',
                                                    borderBottom:'1px solid hsl(var(--border))',
                                                    textAlign:'left',
                                                }}>
                                                <div style={{
                                                    width:20, height:20, borderRadius:5, border:`2px solid ${checked ? pal.bg : 'rgba(255,255,255,0.25)'}`,
                                                    background: checked ? pal.bg : 'transparent', flexShrink:0,
                                                    display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s',
                                                }}>
                                                    {checked && <span style={{ color:'white', fontSize:11, fontWeight:900, lineHeight:1 }}>✓</span>}
                                                </div>
                                                <div style={{
                                                    width:36, height:36, borderRadius:'50%', flexShrink:0,
                                                    background: pal.bg, overflow:'hidden',
                                                    display:'flex', alignItems:'center', justifyContent:'center',
                                                    fontSize:12, fontWeight:800, color:'white',
                                                }}>
                                                    {d.photo_url
                                                        ? <img src={d.photo_url} alt={d.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                                        : doctorInitials(d.name)
                                                    }
                                                </div>
                                                <span className="text-foreground" style={{ flex:1, fontSize:14, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                                    {d.name}
                                                </span>
                                                {dayCount > 0 && (
                                                    <span style={{
                                                        flexShrink:0, borderRadius:99, padding:'3px 8px',
                                                        background: pal.light, color: pal.border,
                                                        fontSize:11, fontWeight:700,
                                                    }}>
                                                        {dayCount} цаг
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
            <div className="flex overflow-hidden" style={{ height: 'calc(100svh - 4rem)' }}>

                {/* ===== LEFT SIDEBAR ===== */}
                <div className="flex w-56 shrink-0 flex-col overflow-hidden border-r bg-card">

                    {/* ── Scrollable body ── */}
                    <div className="cal-scroll flex flex-1 flex-col gap-4 overflow-y-auto p-3">

                        {/* New appointment button */}
                        <button onClick={() => openCreate(selected ?? todayStr)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm">
                            <Plus className="size-4" /> Цаг нэмэх
                        </button>

                        {/* ── Mini calendar (Google Calendar style) ── */}
                        <div className="select-none">
                            {/* Mini calendar header */}
                            <div className="flex items-center justify-between mb-1.5">
                                <button onClick={() => { month === 0 ? (setMonth(11), setYear(y=>y-1)) : setMonth(m=>m-1); }}
                                    className="rounded p-0.5 hover:bg-muted transition-colors">
                                    <ChevronLeft className="size-3.5 text-muted-foreground" />
                                </button>
                                <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); changeSelected(todayStr); }}
                                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                                    {year} · {MONTHS_MN[month]}
                                </button>
                                <button onClick={() => { month === 11 ? (setMonth(0), setYear(y=>y+1)) : setMonth(m=>m+1); }}
                                    className="rounded p-0.5 hover:bg-muted transition-colors">
                                    <ChevronRight className="size-3.5 text-muted-foreground" />
                                </button>
                            </div>
                            {/* Day headers */}
                            <div className="grid grid-cols-7 mb-0.5">
                                {DAYS_MN.map(d => (
                                    <div key={d} className="text-center text-[9px] font-semibold text-muted-foreground/60 py-0.5">{d[0]}</div>
                                ))}
                            </div>
                            {/* Day cells */}
                            <div className="grid grid-cols-7 gap-y-0.5">
                                {Array.from({length: Math.ceil((getFirstDow(year,month) + getDaysInMonth(year,month)) / 7) * 7}, (_, idx) => {
                                    const dayNum  = idx - getFirstDow(year,month) + 1;
                                    const inMonth = dayNum >= 1 && dayNum <= getDaysInMonth(year,month);
                                    const dateStr = inMonth ? pad(year, month, dayNum) : '';
                                    const isToday = dateStr === todayStr;
                                    const isSel   = dateStr === selected;
                                    const hasCnt  = dateStr ? (aptByDate[dateStr]?.length ?? 0) : 0;
                                    return (
                                        <button key={idx}
                                            disabled={!inMonth}
                                            onClick={() => { if (inMonth) { changeSelected(isSel ? null : dateStr); } }}
                                            className={`relative flex flex-col items-center justify-center rounded-full text-[10px] font-medium h-6 w-6 mx-auto transition-colors ${
                                                !inMonth  ? 'opacity-0 pointer-events-none' :
                                                isToday   ? 'bg-red-600 text-white font-bold' :
                                                isSel     ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-bold' :
                                                'text-foreground hover:bg-muted'
                                            }`}>
                                            {dayNum}
                                            {hasCnt > 0 && !isToday && (
                                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 size-1 rounded-full bg-red-500" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="border-t" />

                        {/* Doctors */}
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    <User className="size-3.5" /> Эмч нар
                                </div>
                                {filterDocs.size > 0 && (
                                    <button onClick={() => { setFilterDocs(new Set()); try { localStorage.removeItem('cal_filter_docs'); } catch {} }}
                                        className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors">бүгд</button>
                                )}
                            </div>
                            <div className="space-y-0.5">
                                {sidebarDoctors.map(d => {
                                    const pal     = dayPalette(d.id);
                                    const count   = (() => {
                                        if (view === 'day') {
                                            const day = selected ?? todayStr;
                                            return visibleApts.filter(a => a.doctor_id === d.id && a.appointment_date === day).length;
                                        }
                                        if (view === 'week') {
                                            const weekDates = new Set(weekDays.map(wd => pad(wd.getFullYear(), wd.getMonth(), wd.getDate())));
                                            return visibleApts.filter(a => a.doctor_id === d.id && weekDates.has(a.appointment_date)).length;
                                        }
                                        const mo = String(month + 1).padStart(2, '0');
                                        return visibleApts.filter(a => a.doctor_id === d.id && a.appointment_date.startsWith(`${year}-${mo}`)).length;
                                    })();
                                    const checked = filterDocs.has(Number(d.id));
                                    return (
                                        <label key={d.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${checked ? 'bg-muted/80' : 'hover:bg-muted/60'}`}>
                                            <input type="checkbox" checked={checked} onChange={() => toggleDoc(d.id)}
                                                className="size-3.5 rounded cursor-pointer" style={{ accentColor: pal.bg }} />
                                            <div className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                                                style={{ background: pal.bg }}>
                                                {doctorInitials(d.name)}
                                            </div>
                                            <span className="flex-1 truncate text-xs">{d.name}</span>
                                            {count > 0 && (
                                                <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                                                    style={{ background: pal.light, color: pal.border }}>{count}</span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Pending requests — below doctors ── */}
                        {(() => {
                            const pending = apts
                                .filter(a => a.status === 'pending' && a.type === 'in_person')
                                .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.appointment_time.localeCompare(b.appointment_time));
                            return (
                                <div className="border-t pt-3 space-y-2">
                                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        <CalendarClock className="size-3.5" />
                                        Хүсэлтүүд
                                        {pending.length > 0 && (
                                            <span className="ml-auto rounded-full bg-yellow-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{pending.length}</span>
                                        )}
                                    </p>
                                    {pending.length === 0 ? (
                                        <p className="text-[10px] text-muted-foreground/60 italic">Хүлээгдэж буй хүсэлт байхгүй</p>
                                    ) : pending.map(a => {
                                        const pal = a.doctor_id ? dayPalette(a.doctor_id) : DAY_PALETTE[0];
                                        return (
                                            <button key={a.id}
                                                onClick={() => openApt(a)}
                                                className="w-full flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800/60 dark:bg-yellow-950/20 px-2.5 py-2 text-left hover:bg-yellow-100 dark:hover:bg-yellow-950/30 transition-colors group">
                                                {/* Color dot */}
                                                <span className="size-1.5 rounded-full shrink-0" style={{ background: a.doctor_id ? pal.bg : '#eab308' }} />
                                                {/* Main info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold truncate text-yellow-900 dark:text-yellow-200 leading-tight">{a.patient_name}</p>
                                                    <p className="text-[10px] text-yellow-700/70 dark:text-yellow-400/70 leading-tight truncate">
                                                        {a.appointment_date
                                                            ? <>{a.appointment_time}{a.type === 'online' ? ' 💻' : ''}</>
                                                            : <span className="italic">Цаг тохироогүй</span>
                                                        }
                                                        {a.doctor_name && <span className="ml-1 opacity-60">· {a.doctor_name.split(' ')[0]}</span>}
                                                    </p>
                                                </div>
                                                {/* Arrow indicator */}
                                                <ChevronRight className="size-3 shrink-0 text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                        {/* Legend */}
                        <div className="mt-auto space-y-1.5 border-t pt-3">
                            {Object.entries(STATUS_LABEL).map(([k,v]) => (
                                <span key={k} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <span className={`size-2 rounded-full ${STATUS_DOT[k]}`}/> {v}
                                </span>
                            ))}
                            <div className="border-t pt-1.5 space-y-1">
                                <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <span className="size-2 rounded-full bg-blue-400"/> 📅 Онлайн цаг
                                </span>
                                <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <span className="size-2 rounded-full bg-green-500"/> ✓ Захиалагдсан цаг
                                </span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ===== MAIN CONTENT ===== */}
                <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">

                    {/* ── Search bar ── */}
                    <div className="relative shrink-0 flex items-center gap-2">
                        {/* Search input */}
                        <div className="flex flex-1 items-center gap-2 rounded-xl border bg-card shadow-sm px-3 py-2">
                            <Search className="size-3.5 shrink-0 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(!!e.target.value || !!searchCreator || !!searchDateFrom || !!searchDateTo); }}
                                onKeyDown={e => { if (e.key === 'Enter') { const p: Record<string,string> = {}; if (searchQuery) p.q = searchQuery; if (searchCreator) p.created_by = searchCreator; if (searchDateFrom) p.date_from = searchDateFrom; if (searchDateTo) p.date_to = searchDateTo; router.get('/reception/appointments/search', p); } }}
                                placeholder="Нэр, утас, дугаар хайх..."
                                className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                            />
                            {searchQuery && (
                                <button onClick={() => { setSearchQuery(''); setSearchOpen(!!(searchCreator || searchDateFrom || searchDateTo)); }}
                                    className="rounded-full p-0.5 hover:bg-muted text-muted-foreground">
                                    <X className="size-3" />
                                </button>
                            )}
                        </div>

                        {/* Creator filter chip */}
                        <div className="flex items-center gap-1.5 rounded-xl border bg-card shadow-sm px-3 py-2">
                            <UserCheck className="size-3.5 shrink-0 text-muted-foreground" />
                            <select value={searchCreator}
                                onChange={e => { setSearchCreator(e.target.value); setSearchOpen(!!searchQuery || !!e.target.value || !!searchDateFrom || !!searchDateTo); }}
                                className="text-xs outline-none cursor-pointer bg-card text-foreground [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-900 dark:[&>option]:text-gray-100 min-w-[80px]">
                                <option value="">Бүх бүртгэгч</option>
                                {creators.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            {searchCreator && (
                                <button onClick={() => { setSearchCreator(''); setSearchOpen(!!(searchQuery || searchDateFrom || searchDateTo)); }}
                                    className="text-muted-foreground hover:text-foreground">
                                    <X className="size-3" />
                                </button>
                            )}
                        </div>

                        {/* Date range chip */}
                        <div className="flex items-center gap-1.5 rounded-xl border bg-card shadow-sm px-3 py-2">
                            <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                            <input type="date" value={searchDateFrom}
                                onChange={e => { setSearchDateFrom(e.target.value); setSearchOpen(!!searchQuery || !!searchCreator || !!e.target.value || !!searchDateTo); }}
                                className="bg-transparent text-xs outline-none text-foreground cursor-pointer w-[110px]" />
                            <span className="text-muted-foreground/50 text-xs">–</span>
                            <input type="date" value={searchDateTo}
                                onChange={e => { setSearchDateTo(e.target.value); setSearchOpen(!!searchQuery || !!searchCreator || !!searchDateFrom || !!e.target.value); }}
                                className="bg-transparent text-xs outline-none text-foreground cursor-pointer w-[110px]" />
                            {(searchDateFrom || searchDateTo) && (
                                <button onClick={() => { setSearchDateFrom(''); setSearchDateTo(''); setSearchOpen(!!(searchQuery || searchCreator)); }}
                                    className="text-muted-foreground hover:text-foreground">
                                    <X className="size-3" />
                                </button>
                            )}
                        </div>

                        {/* Go to full search page */}
                        <button
                            onClick={() => { const p: Record<string,string> = {}; if (searchQuery) p.q = searchQuery; if (searchCreator) p.created_by = searchCreator; if (searchDateFrom) p.date_from = searchDateFrom; if (searchDateTo) p.date_to = searchDateTo; router.get('/reception/appointments/search', p); }}
                            className="flex items-center gap-1.5 rounded-xl border bg-card shadow-sm px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap shrink-0">
                            <Search className="size-3.5" />
                            Хайх хуудас
                        </button>

                        {/* Results dropdown */}
                        {searchOpen && (
                            <div className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl border bg-card shadow-xl overflow-hidden">
                                {searchResults.length > 0 ? (
                                    <div className="cal-scroll max-h-72 overflow-y-auto divide-y">
                                        {searchResults.map(a => {
                                            const pal = a.doctor_id ? dayPalette(a.doctor_id) : DAY_PALETTE[0];
                                            return (
                                                <button key={a.id}
                                                    onClick={() => { openApt(a); changeSelected(a.appointment_date); setYear(new Date(a.appointment_date+'T00:00').getFullYear()); setMonth(new Date(a.appointment_date+'T00:00').getMonth()); setSearchOpen(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors">
                                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                                        style={{ background: pal.bg }}>
                                                        {a.doctor_name ? doctorInitials(a.doctor_name) : '?'}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold truncate">
                                                            {a.patient_name}
                                                            <span className="ml-2 text-xs font-normal text-muted-foreground">{a.patient_phone}</span>
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                                                            {a.appointment_date}&nbsp;&nbsp;{a.appointment_time}{a.appointment_time_end ? `–${a.appointment_time_end}` : ''}
                                                            {a.doctor_name && <span className="ml-2 opacity-70">{a.doctor_name}</span>}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 flex flex-col items-end gap-1">
                                                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CHIP[a.status]}`}>
                                                            {STATUS_LABEL[a.status]}
                                                        </span>
                                                        {a.created_by && (
                                                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                <UserCheck className="size-2.5" />{a.created_by}
                                                            </span>
                                                        )}
                                                        {a.confirmed_by && (
                                                            <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                                                                <CheckCircle2 className="size-2.5" />{a.confirmed_by}
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-muted-foreground">
                                        <Search className="size-5 opacity-30" />
                                        <p className="text-sm">Үр дүн олдсонгүй</p>
                                    </div>
                                )}
                                {searchResults.length > 0 && (
                                    <button
                                        onClick={() => { const p: Record<string,string> = {}; if (searchQuery) p.q = searchQuery; if (searchCreator) p.created_by = searchCreator; if (searchDateFrom) p.date_from = searchDateFrom; if (searchDateTo) p.date_to = searchDateTo; router.get('/reception/appointments/search', p); }}
                                        className="w-full border-t px-4 py-2.5 text-xs font-medium text-primary hover:bg-muted/50 transition-colors text-center">
                                        Бүгдийг харах ({searchResults.length}) →
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Calendar */}
                    <div className="flex flex-1 overflow-hidden rounded-xl border bg-card">

                        {/* Toolbar */}
                        <div className="flex w-full flex-col overflow-hidden">
                            <div className="flex items-center justify-between border-b px-5 py-3">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); changeSelected(todayStr); }}
                                        className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                                        Өнөөдөр
                                    </button>
                                    <div className="flex items-center gap-0.5">
                                        <button onClick={view === 'day' ? prevDay : view === 'week' ? prevWeek : prevMonth} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                                            <ChevronLeft className="size-4"/>
                                        </button>
                                        <button onClick={view === 'day' ? nextDay : view === 'week' ? nextWeek : nextMonth} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                                            <ChevronRight className="size-4"/>
                                        </button>
                                    </div>
                                    {view === 'day' ? (() => {
                                        const d = new Date((selected ?? todayStr) + 'T00:00');
                                        return (
                                            <h2 className="text-base font-bold">
                                                {d.getFullYear()} оны {MONTHS_MN[d.getMonth()]} {d.getDate()}, {DAYS_MN[(d.getDay() + 6) % 7]}
                                            </h2>
                                        );
                                    })() : view === 'week' ? (() => {
                                        const wEnd = new Date(weekStart); wEnd.setDate(weekStart.getDate() + 6);
                                        const sameMonth = weekStart.getMonth() === wEnd.getMonth();
                                        return (
                                            <h2 className="text-base font-bold">
                                                {weekStart.getFullYear()} оны {MONTHS_MN[weekStart.getMonth()]} {weekStart.getDate()}
                                                {!sameMonth && ` — ${MONTHS_MN[wEnd.getMonth()]}`} – {wEnd.getDate()}
                                            </h2>
                                        );
                                    })() : (
                                        <h2 className="text-base font-bold">{year} оны {MONTHS_MN[month]}</h2>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex overflow-hidden rounded-lg border text-xs font-medium">
                                        {([
                                            { v: 'month', label: 'Сар' },
                                            { v: 'week',  label: '7 хоног' },
                                            { v: 'day',   label: 'Өдөр' },
                                        ] as const).map(({ v, label }) => (
                                            <button key={v} onClick={() => {
                                                changeView(v);
                                                if (v === 'day' && !selected) changeSelected(todayStr);
                                            }}
                                                className={`px-3 py-1.5 transition-colors ${view===v ? 'bg-red-600 text-white' : 'hover:bg-muted'}`}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Notification permission button */}
                                    <button
                                        onClick={requestNotifPermission}
                                        title={
                                            notifPerm === 'granted'  ? 'Мэдэгдэл идэвхтэй' :
                                            notifPerm === 'denied'   ? 'Мэдэгдэл хаагдсан — browser-ийн тохиргооноос зөвшөөрнө үү' :
                                            'Мэдэгдэл зөвшөөрөх'
                                        }
                                        className={`flex size-8 items-center justify-center rounded-lg border transition-colors ${
                                            notifPerm === 'granted' ? 'border-green-300 bg-green-50 text-green-600 dark:border-green-800 dark:bg-green-950/30' :
                                            notifPerm === 'denied'  ? 'border-red-200 bg-red-50 text-red-400 dark:border-red-900 dark:bg-red-950/20 cursor-not-allowed' :
                                            'hover:bg-muted text-muted-foreground'
                                        }`}>
                                        <Bell className="size-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* ---- MONTH VIEW ---- */}
                            {view === 'month' && (
                                <div className="flex flex-1 flex-col overflow-hidden">
                                    <div className="grid grid-cols-7 border-b">
                                        {DAYS_MN.map(d => (
                                            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
                                        ))}
                                    </div>
                                    <div className="cal-scroll grid flex-1 grid-cols-7 overflow-auto">
                                        {Array.from({length: totalCells}, (_, idx) => {
                                            const dayNum  = idx - firstWeekDay + 1;
                                            const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
                                            const dateStr = inMonth ? pad(year, month, dayNum) : '';
                                            const dayCellApts  = dateStr ? (aptByDate[dateStr] ?? []) : [];
                                            const isToday = dateStr === todayStr;
                                            const isSel   = dateStr === selected;
                                            return (
                                                <div key={idx}
                                                    onClick={() => inMonth && changeSelected(isSel ? null : dateStr)}
                                                    onDoubleClick={() => inMonth && openCreate(dateStr)}
                                                    className={`group h-[160px] overflow-hidden cursor-pointer border-b border-r p-1.5 transition-colors ${
                                                        !inMonth ? 'bg-muted/20 opacity-30' :
                                                        isSel    ? 'bg-red-50 dark:bg-red-950/20' : 'hover:bg-muted/20'
                                                    }`}>
                                                    {inMonth && (
                                                        <>
                                                            <div className="mb-1 flex items-center justify-between">
                                                                <span className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                                                                    isToday ? 'bg-red-600 text-white' :
                                                                    isSel   ? 'text-red-600 font-bold' : 'text-foreground'
                                                                }`}>{dayNum}</span>
                                                                <button onClick={e => { e.stopPropagation(); openCreate(dateStr); }}
                                                                    className="hidden size-5 items-center justify-center rounded-full hover:bg-red-100 text-red-500 group-hover:flex transition-colors">
                                                                    <Plus className="size-3"/>
                                                                </button>
                                                            </div>
                                                            <div className="space-y-px">
                                                                {/* Appointments — Google Calendar style: colored left-border pill */}
                                                                {dayCellApts.slice(0, 5).map(a => {
                                                                    const pal = a.doctor_id ? dayPalette(a.doctor_id) : DAY_PALETTE[0];
                                                                    const isOnline = a.type === 'online';
                                                                    const accentColor = isOnline ? '#3b82f6' : pal.border;
                                                                    return (
                                                                        <div key={a.id}
                                                                            onClick={e => { e.stopPropagation(); changeSelected(dateStr); openApt(a); }}
                                                                            className="flex items-center gap-1 rounded-sm py-0.5 pl-1.5 pr-1 text-[10px] font-semibold cursor-pointer overflow-hidden transition-opacity hover:opacity-75"
                                                                            style={{
                                                                                background: isOnline ? 'rgba(59,130,246,0.12)' : pal.light,
                                                                                borderLeft: `3px solid ${accentColor}`,
                                                                            }}>
                                                                            <span className="shrink-0 tabular-nums" style={{ color: accentColor }}>
                                                                                {a.appointment_time}{a.appointment_time_end ? `–${a.appointment_time_end}` : ''}
                                                                            </span>
                                                                            <span className="truncate" style={{ color: accentColor }}>{a.patient_name}</span>
                                                                            {isOnline && <span className="shrink-0 opacity-70" style={{ fontSize: 9 }}>💻</span>}
                                                                        </div>
                                                                    );
                                                                })}
                                                                {dayCellApts.length > 5 && (
                                                                    <button onClick={e => { e.stopPropagation(); setMoreDateModal(dateStr); }}
                                                                        className="w-full rounded-sm py-0.5 px-1.5 text-left text-[10px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                                                                        +{dayCellApts.length - 5} дэлгэрэнгүй
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ---- WEEK VIEW ---- */}
                            {view === 'week' && (() => {
                                const wTotalH  = (HOUR_END - HOUR_START) * HOUR_H;
                                const WCOL_MIN = 110;
                                return (
                                <div className="flex flex-1 flex-col overflow-hidden">
                                    {/* Time grid — single scrollable area */}
                                    <div ref={dayScrollRef} className="cal-scroll flex-1 overflow-auto">
                                        <div style={{ minWidth: '100%', width: 56 + 7 * WCOL_MIN }}>

                                            {/* Sticky day headers */}
                                            <div className="sticky top-0 z-20 flex border-b bg-card shadow-sm">
                                                <div className="w-14 shrink-0 border-r bg-card" />
                                                {weekDays.map(d => {
                                                    const ds  = pad(d.getFullYear(), d.getMonth(), d.getDate());
                                                    const isT = ds === todayStr;
                                                    const isS = ds === selected;
                                                    const cnt = (aptByDate[ds] ?? []).length;
                                                    return (
                                                        <div key={ds}
                                                            onClick={() => { changeSelected(ds); changeView('day'); }}
                                                            className={`flex flex-1 cursor-pointer flex-col items-center border-r py-2 last:border-r-0 transition-colors hover:bg-muted/30 ${isS ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
                                                            style={{ minWidth: WCOL_MIN }}>
                                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{DAYS_MN[(d.getDay()+6)%7]}</p>
                                                            <span className={`mt-1 flex size-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                                                                isT ? 'bg-red-600 text-white' : 'text-foreground'
                                                            }`}>{d.getDate()}</span>
                                                            {cnt > 0 && (
                                                                <span
                                                                    onClick={ev => { ev.stopPropagation(); setMoreDateModal(ds); }}
                                                                    className="mt-0.5 text-[9px] font-medium text-red-500 hover:text-red-600 hover:underline cursor-pointer transition-colors">
                                                                    {cnt} захиалга
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Grid body */}
                                            <div className="relative flex" style={{ height: wTotalH }}>

                                                {/* Shared time-grid lines */}
                                                <div className="pointer-events-none absolute inset-0">
                                                    {Array.from({length: HOUR_END - HOUR_START}, (_, i) => (
                                                        <div key={i} style={{ position:'absolute', left:0, right:0, top: i * HOUR_H, borderTop:'1px solid var(--cal-line-hour)' }} />
                                                    ))}
                                                    {Array.from({length: HOUR_END - HOUR_START}, (_, i) => (
                                                        <div key={`h${i}`} style={{ position:'absolute', left:0, right:0, top: i * HOUR_H + HOUR_H / 2, borderTop:'1px solid var(--cal-line-half)' }} />
                                                    ))}
                                                </div>

                                                {/* Time gutter */}
                                                <div className="relative w-14 shrink-0 border-r">
                                                    {Array.from({length: HOUR_END - HOUR_START + 1}, (_, i) => (
                                                        <div key={i}>
                                                            <div className="absolute right-2 text-[10px] font-medium text-muted-foreground select-none"
                                                                style={{ top: i * HOUR_H - 7 }}>
                                                                {String(HOUR_START + i).padStart(2,'0')}:00
                                                            </div>
                                                            {i < HOUR_END - HOUR_START && (
                                                                <div className="absolute right-2 text-[9px] text-muted-foreground/40 select-none"
                                                                    style={{ top: i * HOUR_H + HOUR_H / 2 - 6 }}>
                                                                    :30
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Day columns */}
                                                {weekDays.map(d => {
                                                    const ds     = pad(d.getFullYear(), d.getMonth(), d.getDate());
                                                    const isT    = ds === todayStr;
                                                    const wApts  = (aptByDate[ds] ?? []).sort((a,b) => a.appointment_time.localeCompare(b.appointment_time));
                                                    return (
                                                        <div key={ds}
                                                            className="relative flex-1 border-r last:border-r-0 cursor-pointer"
                                                            style={{ minWidth: WCOL_MIN, height: wTotalH }}
                                                            onClick={e => {
                                                                const gridRect = (e.currentTarget as HTMLDivElement).parentElement!.getBoundingClientRect();
                                                                const y = e.clientY - gridRect.top;
                                                                openCreate(ds, timeFromY(Math.max(0, y)));
                                                            }}>

                                                            {/* Appointments — column layout for overlaps */}
                                                            {computeColumns(wApts).map(({ apt: a, col, totalCols }) => {
                                                                const top = aptTop(a.appointment_time);
                                                                const h = Math.max(22, (endMins(a) - toMins(a.appointment_time)) * PX_PER_MIN);
                                                                const p2 = a.doctor_id ? dayPalette(a.doctor_id) : DAY_PALETTE[0];
                                                                const isOnline = a.type === 'online';
                                                                const ac = isOnline ? '#3b82f6' : p2.border;
                                                                return (
                                                                    <div key={a.id}
                                                                        onClick={ev => { ev.stopPropagation(); openApt(a); }}
                                                                        title={`${a.appointment_time}${a.appointment_time_end ? '–'+a.appointment_time_end : ''} · ${a.patient_name}`}
                                                                        className="absolute cursor-pointer overflow-hidden rounded px-1 pt-0.5 transition-all hover:brightness-95 hover:shadow-md"
                                                                        style={{
                                                                            top, height: h,
                                                                            left: `calc(${col * 100 / totalCols}% + 1px)`,
                                                                            width: `calc(${100 / totalCols}% - 2px)`,
                                                                            zIndex: col + 1,
                                                                            background: p2.light,
                                                                            border: `1px solid ${ac}50`,
                                                                            borderLeftWidth: 3,
                                                                            borderLeftColor: ac,
                                                                        }}>
                                                                        <p className="font-bold tabular-nums truncate leading-tight" style={{ fontSize: 9, color: ac }}>
                                                                            {a.appointment_time}{a.appointment_time_end ? `–${a.appointment_time_end}` : ''}{isOnline ? ' 💻' : ''}
                                                                        </p>
                                                                        {h > 30 && <p className="truncate font-semibold leading-tight" style={{ fontSize: 10, color: ac }}>{a.patient_name}</p>}
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Current time line */}
                                                            {isT && nowTop >= 0 && nowTop <= wTotalH && (
                                                                <div className="pointer-events-none absolute left-0 right-0 z-10 flex items-center" style={{ top: nowTop }}>
                                                                    <div className="size-2 shrink-0 rounded-full bg-red-500 -ml-1" />
                                                                    <div className="flex-1 border-t-2 border-red-500" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                );
                            })()}

                            {/* ---- DAY VIEW ---- */}
                            {view === 'day' && (() => {
                                const dayStr  = selected ?? todayStr;
                                /* Always use ALL apts for the day regardless of filter.
                                   Filter only controls which doctor COLUMNS to show. */
                                const allDayApts = apts.filter(a => a.appointment_date === dayStr);
                                const isToday    = dayStr === todayStr;
                                const totalH     = (HOUR_END - HOUR_START) * HOUR_H;
                                const COL_MIN    = 130; // minimum px per column

                                /* Which doctors to show as columns — use Number() for safe comparison */
                                const dayDocIds  = [...new Set(
                                    allDayApts.map(a => a.doctor_id).filter(id => id !== null)
                                )] as number[];

                                const dayDoctors = filterDocs.size > 0
                                    ? doctors.filter(d => filterDocs.has(Number(d.id)))
                                    : dayDocIds.length > 0
                                        ? doctors.filter(d => dayDocIds.includes(Number(d.id)))
                                        : doctors;

                                /* Helper: safe doctor match regardless of string/number */
                                const sameDoc = (aptDocId: number | null, docId: number) =>
                                    aptDocId !== null && Number(aptDocId) === Number(docId);

                                return (
                                    /* Single scrollable area — vertical + horizontal together */
                                    <div ref={dayScrollRef} className="cal-scroll flex-1 overflow-auto">
                                        {/* Width: fills 100% when few doctors, grows wider when many */}
                                        <div style={{ minWidth: '100%', width: 56 + dayDoctors.length * COL_MIN, minHeight: totalH + 90 }}>

                                            {/* Sticky column headers */}
                                            <div className="sticky top-0 z-20 flex border-b bg-card">
                                                <div className="w-14 shrink-0 border-r bg-card" />
                                                {dayDoctors.map(d => {
                                                    const pal   = dayPalette(d.id);
                                                    const count = allDayApts.filter(a => sameDoc(a.doctor_id, d.id)).length;
                                                    return (
                                                        <div key={d.id}
                                                            className="flex flex-1 flex-col items-center border-r py-2 px-2 last:border-r-0 bg-card"
                                                            style={{ minWidth: COL_MIN }}>
                                                            {d.photo_url ? (
                                                                <div className="size-9 shrink-0 overflow-hidden rounded-full"
                                                                    style={{ boxShadow: `0 0 0 2px ${pal.bg}` }}>
                                                                    <img src={d.photo_url} alt={d.name} className="h-full w-full object-cover object-top" />
                                                                </div>
                                                            ) : (
                                                                <div className="flex size-9 items-center justify-center rounded-full text-xs font-bold text-white"
                                                                    style={{ background: pal.bg }}>
                                                                    {doctorInitials(d.name)}
                                                                </div>
                                                            )}
                                                            <p className="mt-1 w-full truncate text-center text-[11px] font-semibold">{d.name}</p>
                                                            {d.specialization && <p className="w-full truncate text-center text-[10px] text-muted-foreground">{d.specialization}</p>}
                                                            {count > 0 && (
                                                                <span className="mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
                                                                    style={{ background: pal.bg }}>{count} захиалга</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Grid body */}
                                            <div className="relative flex" style={{ height: totalH }}>

                                                {/* Shared time-grid lines */}
                                                <div className="pointer-events-none absolute inset-0">
                                                    {Array.from({length: HOUR_END - HOUR_START}, (_, i) => (
                                                        <div key={i} style={{ position:'absolute', left:0, right:0, top: i * HOUR_H, borderTop:'1px solid var(--cal-line-hour)' }} />
                                                    ))}
                                                    {Array.from({length: HOUR_END - HOUR_START}, (_, i) => (
                                                        <div key={`h${i}`} style={{ position:'absolute', left:0, right:0, top: i * HOUR_H + HOUR_H / 2, borderTop:'1px solid var(--cal-line-half)' }} />
                                                    ))}
                                                    {Array.from({length: (HOUR_END - HOUR_START) * 3}, (_, i) => {
                                                        const mins = i * 20;
                                                        if (mins % 60 === 0 || mins % 30 === 0) return null;
                                                        return <div key={`s${i}`} style={{ position:'absolute', left:0, right:0, top: mins * PX_PER_MIN, borderTop:'1px solid var(--cal-line-sub)' }} />;
                                                    })}
                                                </div>

                                                {/* Time gutter */}
                                                <div className="relative w-14 shrink-0 border-r">
                                                    {Array.from({length: HOUR_END - HOUR_START + 1}, (_, i) => (
                                                        <div key={i}>
                                                            {/* Full hour label */}
                                                            <div className="absolute right-2 text-[10px] font-medium text-muted-foreground select-none"
                                                                style={{ top: i * HOUR_H - 7 }}>
                                                                {String(HOUR_START + i).padStart(2,'0')}:00
                                                            </div>
                                                            {/* Half hour label — don't show after last hour */}
                                                            {i < HOUR_END - HOUR_START && (
                                                                <div className="absolute right-2 text-[9px] text-muted-foreground/50 select-none"
                                                                    style={{ top: i * HOUR_H + HOUR_H / 2 - 6 }}>
                                                                    {String(HOUR_START + i).padStart(2,'0')}:30
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Doctor columns */}
                                                {dayDoctors.map(doc => {
                                                    const docApts  = allDayApts
                                                        .filter(a => sameDoc(a.doctor_id, doc.id))
                                                        .sort((a,b) => a.appointment_time.localeCompare(b.appointment_time));
                                                    const pal = dayPalette(doc.id);
                                                    return (
                                                        <div key={doc.id}
                                                            className="relative flex-1 border-r last:border-r-0 cursor-pointer"
                                                            style={{ minWidth: COL_MIN, height: totalH }}
                                                            onClick={e => {
                                                                const gridRect = (e.currentTarget as HTMLDivElement)
                                                                    .parentElement!.getBoundingClientRect();
                                                                const y = e.clientY - gridRect.top;
                                                                openCreate(dayStr, timeFromY(Math.max(0, y)), String(doc.id));
                                                            }}>
                                                            {/* Appointments — column layout for overlaps */}
                                                            {computeColumns(docApts).map(({ apt: a, col, totalCols }) => {
                                                                const top = aptTop(a.appointment_time);
                                                                const h = Math.max(24, (endMins(a) - toMins(a.appointment_time)) * PX_PER_MIN);
                                                                const isOnline = a.type === 'online';
                                                                const ac = isOnline ? '#3b82f6' : pal.border;
                                                                return (
                                                                    <div key={a.id}
                                                                        onClick={ev => { ev.stopPropagation(); openApt(a); }}
                                                                        title={`${a.appointment_time}${a.appointment_time_end ? '–' + a.appointment_time_end : ''} · ${a.patient_name} · ${a.patient_phone ?? ''}`}
                                                                        className="absolute cursor-pointer overflow-hidden rounded px-1.5 pt-0.5 transition-all hover:brightness-95 hover:shadow-md"
                                                                        style={{
                                                                            top, height: h,
                                                                            left: `calc(${col * 100 / totalCols}% + 1px)`,
                                                                            width: `calc(${100 / totalCols}% - 2px)`,
                                                                            zIndex: col + 1,
                                                                            background: pal.light,
                                                                            border: `1px solid ${ac}50`,
                                                                            borderLeftWidth: 3,
                                                                            borderLeftColor: ac,
                                                                            color: ac,
                                                                        }}>
                                                                        <p className="font-bold tabular-nums truncate leading-tight" style={{ fontSize: 9 }}>
                                                                            {a.appointment_time}{a.appointment_time_end ? `–${a.appointment_time_end}` : ''}{isOnline ? ' 💻' : ''}
                                                                        </p>
                                                                        {h > 30 && <p className="truncate font-semibold leading-tight" style={{ fontSize: 10 }}>{a.patient_name}</p>}
                                                                        {h > 46 && <p className="truncate opacity-70 leading-tight" style={{ fontSize: 9 }}>{a.patient_phone}</p>}
                                                                    </div>
                                                                );
                                                            })}
                                                            {/* Current time line */}
                                                            {isToday && nowTop >= 0 && nowTop <= totalH && (
                                                                <div className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
                                                                    style={{ top: nowTop }}>
                                                                    <div className="size-2.5 shrink-0 rounded-full bg-red-500 -ml-1.5" />
                                                                    <div className="flex-1 border-t-2 border-red-500" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                        </div>
                    </div>

                    <p className="text-center text-[11px] text-muted-foreground opacity-60">
                        Нүд дарах — сонгох • Давхар дарах — цаг нэмэх • Өдрийн view дахь нүд дарах — тухайн цагт нэмэх
                    </p>
                </div>
            </div>
            )}
        </ReceptionLayout>
    );
}
