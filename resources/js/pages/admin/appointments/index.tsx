import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Bell, Building2, CalendarCheck2, CalendarClock, CheckCircle2, ChevronLeft,
    ChevronRight, Clock, Eye, Monitor, Plus, Trash2, User, X, XCircle,
} from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Doctor { id: number; name: string; specialization: string | null; branch_id: number | null }
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
    branch_name: string | null;
    service: string | null;
    type: 'online' | 'in_person';
    appointment_date: string;
    appointment_time: string;
    appointment_time_end: string | null;
    formatted_date: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    notes: string | null;
    admin_notes: string | null;
}
interface Treatment { id: number; title: string }
interface Stats { total: number; pending: number; confirmed: number; today: number; cancelled: number }
interface Props  { appointments: Appointment[]; doctors: Doctor[]; branches: Branch[]; treatments: Treatment[]; filters: Record<string,string>; stats: Stats }

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Цаг захиалга', href: '/admin/appointments' },
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
function doctorInitials(name: string)          { return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }

/* ================================================================== */
/*  Create modal                                                        */
/* ================================================================== */
interface CreateModalProps {
    date: string;
    initialTime?: string;
    initialDoctorId?: string;
    doctors: Doctor[];
    branches: Branch[];
    treatments: Treatment[];
    onClose: () => void;
}
function CreateModal({ date, initialTime = '09:00', initialDoctorId = '', doctors, branches, treatments, onClose }: CreateModalProps) {
    /* Auto-resolve branch from doctor */
    const initBranch = useMemo(() => {
        if (!initialDoctorId) return '';
        const doc = doctors.find(d => String(d.id) === String(initialDoctorId));
        return doc?.branch_id ? String(doc.branch_id) : '';
    }, [initialDoctorId, doctors]);

    const { data, setData, post, processing, errors, reset } = useForm<{
        patient_name: string; patient_phone: string; patient_email: string;
        branch_id: string; doctor_id: string; service: string;
        type: 'online' | 'in_person';
        appointment_date: string; appointment_time: string; appointment_time_end: string;
        status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
        notes: string; admin_notes: string;
    }>({
        patient_name: '', patient_phone: '', patient_email: '',
        branch_id: initBranch, doctor_id: initialDoctorId, service: '',
        type: 'online', appointment_date: date, appointment_time: initialTime || '09:00', appointment_time_end: '',
        status: 'confirmed', notes: '', admin_notes: '',
    });

    const filteredDoctors = useMemo(
        () => data.branch_id ? doctors.filter(d => String(d.branch_id) === data.branch_id) : doctors,
        [data.branch_id, doctors],
    );

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/admin/appointments', {
            preserveScroll: true,
            onSuccess: () => { reset(); onClose(); },
        });
    }

    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl border">
                <div className="flex items-center justify-between border-b px-5 py-4">
                    <div>
                        <h2 className="text-base font-bold">Шинэ цаг захиалах</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(date + 'T00:00').toLocaleDateString('mn-MN', { year:'numeric', month:'long', day:'numeric' })}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted transition-colors"><X className="size-4" /></button>
                </div>
                <form onSubmit={submit} className="flex-1 overflow-y-auto p-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Нэр *</label>
                            <input type="text" autoFocus value={data.patient_name}
                                onChange={e => setData('patient_name', e.target.value)} placeholder="Овог нэр"
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                            {errors.patient_name && <p className="text-xs text-red-500">{errors.patient_name}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Утас *</label>
                            <input type="tel" value={data.patient_phone}
                                onChange={e => setData('patient_phone', e.target.value)} placeholder="+976 9900 0000"
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                            {errors.patient_phone && <p className="text-xs text-red-500">{errors.patient_phone}</p>}
                        </div>
                                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Огноо *</label>
                            <input type="date" value={data.appointment_date}
                                onChange={e => setData('appointment_date', e.target.value)}
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                            {data.appointment_date && (
                                <p className="text-xs text-muted-foreground">
                                    {new Date(data.appointment_date + 'T00:00').toLocaleDateString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Цаг *</label>
                            <div className="flex items-center gap-2">
                                <div className="flex flex-1 flex-col gap-1">
                                    <span className="text-xs text-muted-foreground">Эхлэх</span>
                                    <input type="time" value={data.appointment_time}
                                        onChange={e => setData('appointment_time', e.target.value)}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                </div>
                                <span className="mt-5 text-muted-foreground">—</span>
                                <div className="flex flex-1 flex-col gap-1">
                                    <span className="text-xs text-muted-foreground">Дуусах</span>
                                    <input type="time" value={data.appointment_time_end}
                                        onChange={e => setData('appointment_time_end', e.target.value)}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Салбар</label>
                            <select value={data.branch_id}
                                onChange={e => { setData('branch_id', e.target.value); setData('doctor_id', ''); }}
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                                <option value="">Салбар сонгох</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Эмч</label>
                            <select value={data.doctor_id} onChange={e => setData('doctor_id', e.target.value)}
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                                <option value="">Эмч сонгох</option>
                                {filteredDoctors.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}{d.specialization ? ` — ${d.specialization}` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-sm font-medium">Үзлэгийн төрөл</label>
                            <div className="flex gap-3">
                                {([
                                    { value: 'online',    label: '💻 Онлайн үзлэг',  desc: 'Видео дуудлагаар' },
                                    { value: 'in_person', label: '🏥 Биечлэн үзлэг', desc: 'Клиникт ирж' },
                                ] as const).map(({ value, label, desc }) => (
                                    <button key={value} type="button" onClick={() => setData('type', value)}
                                        className={`flex flex-1 items-start gap-2 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all ${
                                            data.type === value ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-border hover:border-red-200'
                                        }`}>
                                        <div><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                                        {data.type === value && <CheckCircle2 className="ml-auto mt-0.5 size-4 shrink-0 text-red-500" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-sm font-medium">Үйлчилгээ</label>
                            <div className="flex flex-wrap gap-2">
                                {treatments.map(t => (
                                    <button key={t.id} type="button" onClick={() => setData('service', data.service === t.title ? '' : t.title)}
                                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                            data.service === t.title ? 'bg-red-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}>{t.title}</button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-sm font-medium">Захиалгын төлөв</label>
                            <div className="flex gap-2">
                                {([
                                    { value: 'pending',   label: 'Хүлээгдэж байна', dot: 'bg-yellow-400' },
                                    { value: 'confirmed', label: 'Баталгаажсан',     dot: 'bg-green-500' },
                                    { value: 'cancelled', label: 'Цуцлагдсан',       dot: 'bg-red-400'   },
                                    { value: 'completed', label: 'Дууссан',           dot: 'bg-blue-400'  },
                                ] as const).map(({ value, label, dot }) => (
                                    <button key={value} type="button" onClick={() => setData('status', value)}
                                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                                            data.status === value ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' : 'hover:bg-muted'
                                        }`}>
                                        <span className={`size-2 rounded-full ${dot}`} />{label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-sm font-medium">Тэмдэглэл</label>
                            <textarea value={data.notes} onChange={e => setData('notes', e.target.value)}
                                rows={2} placeholder="Нэмэлт тэмдэглэл..."
                                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                        </div>
                    </div>
                </form>
                <div className="flex gap-3 border-t px-5 py-4">
                    <button onClick={submit as any} disabled={processing}
                        className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                        {processing ? 'Хадгалж байна...' : 'Цаг захиалах'}
                    </button>
                    <button onClick={onClose} className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors">Цуцлах</button>
                </div>
            </div>
        </div>
    );
}

/* ================================================================== */
/*  Detail modal                                                        */
/* ================================================================== */
interface DetailModalProps {
    apt: Appointment;
    onClose: () => void;
    onStatusChange: (id: number, status: string) => void;
    onDelete: (id: number, num: string) => void;
}
function DetailModal({ apt, onClose, onStatusChange, onDelete }: DetailModalProps) {
    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, []);

    const pal = apt.doctor_id ? dayPalette(apt.doctor_id) : DAY_PALETTE[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-2xl border">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-5 py-4">
                    <div className="flex items-center gap-3">
                        {apt.doctor_id && (
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                                style={{ background: pal.bg }}>
                                {apt.doctor_name ? doctorInitials(apt.doctor_name) : '?'}
                            </div>
                        )}
                        <div>
                            <p className="font-bold text-base">{apt.patient_name}</p>
                            <p className="text-xs text-muted-foreground">{apt.appointment_number}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CHIP[apt.status]}`}>
                            {STATUS_LABEL[apt.status]}
                        </span>
                        <button onClick={onClose} className="ml-2 rounded-lg p-2 hover:bg-muted transition-colors"><X className="size-4" /></button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-muted/40 px-3 py-2.5 col-span-2">
                            <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">Огноо / Цаг</p>
                            <p className="font-semibold text-sm flex items-center gap-1.5">
                                <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                                {new Date(apt.appointment_date + 'T00:00').toLocaleDateString('mn-MN', {year:'numeric', month:'long', day:'numeric'})}
                            </p>
                            <p className="mt-1 text-sm font-bold">
                                {apt.appointment_time}
                                {apt.appointment_time_end && <span className="font-normal text-muted-foreground"> — {apt.appointment_time_end}</span>}
                            </p>
                        </div>
                        <div className={`rounded-xl px-3 py-2.5 col-span-2 ${apt.type === 'online' ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800' : 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'}`}>
                            <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">Үзлэгийн төрөл</p>
                            <p className={`font-semibold text-sm flex items-center gap-1.5 ${apt.type === 'online' ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300'}`}>
                                <Monitor className="size-3.5 shrink-0" />
                                {apt.type === 'online' ? '💻 Онлайн үзлэг' : '🏥 Биечлэн үзлэг'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-muted/40 px-3 py-2.5">
                            <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">Утас</p>
                            <p className="font-semibold text-sm">{apt.patient_phone}</p>
                        </div>
                        {apt.patient_email && (
                            <div className="rounded-xl bg-muted/40 px-3 py-2.5">
                                <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">И-мэйл</p>
                                <p className="font-semibold text-sm truncate">{apt.patient_email}</p>
                            </div>
                        )}
                    </div>

                    {apt.doctor_name && (
                        <div className="rounded-xl bg-muted/40 px-3 py-2.5 flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                style={{ background: pal.bg }}>
                                {doctorInitials(apt.doctor_name)}
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Эмч</p>
                                <p className="font-semibold text-sm">{apt.doctor_name}</p>
                                {apt.doctor_spec && <p className="text-xs text-muted-foreground">{apt.doctor_spec}</p>}
                            </div>
                        </div>
                    )}

                    {apt.service && (
                        <div className="rounded-xl bg-muted/40 px-3 py-2.5">
                            <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">Үйлчилгээ</p>
                            <p className="font-semibold text-sm">{apt.service}</p>
                        </div>
                    )}

                    {apt.notes && (
                        <div className="rounded-xl bg-muted/40 px-3 py-2.5">
                            <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">Тэмдэглэл</p>
                            <p className="text-sm">{apt.notes}</p>
                        </div>
                    )}

                    {/* Status change */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Төлөв өөрчлөх</p>
                        <div className="grid grid-cols-2 gap-2">
                            {([
                                { s: 'confirmed', label: 'Баталгаажуулах',   icon: CheckCircle2, cls: 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400' },
                                { s: 'pending',   label: 'Хүлээгдэж байна',  icon: CalendarClock, cls: 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-950/30' },
                                { s: 'completed', label: 'Дууссан',           icon: CalendarCheck2, cls: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30' },
                                { s: 'cancelled', label: 'Цуцлах',            icon: XCircle, cls: 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/20' },
                            ]).map(({ s, label, icon: Icon, cls }) => (
                                <button key={s} onClick={() => onStatusChange(apt.id, s)} disabled={apt.status === s}
                                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all ${cls} ${apt.status === s ? 'opacity-40 cursor-default ring-2 ring-offset-1' : ''}`}>
                                    <Icon className="size-3.5" /> {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 border-t px-5 py-4">
                    <Link href={`/admin/appointments/${apt.id}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                        <Eye className="size-4" /> Дэлгэрэнгүй засах
                    </Link>
                    <button onClick={() => { onDelete(apt.id, apt.appointment_number); onClose(); }}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950 transition-colors">
                        <Trash2 className="size-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ================================================================== */
/*  Main calendar page                                                  */
/* ================================================================== */
export default function AppointmentsIndex({ appointments: initialApts, doctors, branches, treatments, stats: initialStats }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();

    const [apts, setApts]   = useState<Appointment[]>(initialApts);
    const [stats, setStats] = useState(initialStats);

    useEffect(() => { setApts(initialApts); }, [initialApts]);
    useEffect(() => { setStats(initialStats); }, [initialStats]);

    const today    = new Date();
    const todayStr = pad(today.getFullYear(), today.getMonth(), today.getDate());

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
    const [detailApt,    setDetailApt]    = useState<Appointment | null>(null);
    const [createDate,   setCreateDate]   = useState<string | null>(null);
    const [expandedDate, setExpandedDate] = useState<string | null>(null);
    const [createTime, setCreateTime] = useState('10:00');
    const [createDocId, setCreateDocId] = useState('');

    /* ---- Real-time polling notification ---- */
    interface NewBooking { id: number; appointment_number: string; patient_name: string; patient_phone: string; appointment_date: string; appointment_time: string; doctor_name: string | null; type: string }
    const [notifications,  setNotifications]  = useState<NewBooking[]>([]);
    const [notifPerm,      setNotifPerm]      = useState<NotificationPermission>(() =>
        typeof Notification !== 'undefined' ? Notification.permission : 'denied'
    );
    /* Initialize from current max pending ID — existing ones don't trigger alerts */
    const latestIdRef  = useRef<number>(
        Math.max(0, ...initialApts.filter(a => a.status === 'pending').map(a => a.id), 0)
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
                const res  = await fetch(`/admin/appointments/pending-poll?since_id=${latestIdRef.current}`, { credentials: 'same-origin' });
                if (!res.ok) return;
                const data = await res.json() as { latest_id: number; new_items: NewBooking[] };

                if (data.new_items.length > 0) {
                    latestIdRef.current = data.latest_id;
                    setNotifications(prev => [...data.new_items, ...prev].slice(0, 5));
                    setApts(prev => {
                        const existingIds = new Set(prev.map(a => a.id));
                        const toAdd = data.new_items
                            .filter(n => !existingIds.has(n.id))
                            .map(n => ({
                                id: n.id, appointment_number: n.appointment_number,
                                patient_name: n.patient_name, patient_phone: n.patient_phone,
                                patient_email: null, doctor_id: null, doctor_name: n.doctor_name,
                                doctor_spec: null, branch_name: null, service: null,
                                type: n.type as 'online' | 'in_person',
                                appointment_date: n.appointment_date, appointment_time: n.appointment_time,
                                appointment_time_end: null,
                                formatted_date: n.appointment_date, status: 'pending' as const,
                                notes: null, admin_notes: null,
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
    const [filterBranches, setFilterBranches] = useState<Set<number>>(() => {
        try { const s = localStorage.getItem('cal_filter_branches'); return s ? new Set(JSON.parse(s) as number[]) : new Set(); }
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
    function toggleBranch(id: number) {
        const nid = Number(id);
        setFilterBranches(prev => {
            const n = new Set(prev); n.has(nid) ? n.delete(nid) : n.add(nid);
            try { localStorage.setItem('cal_filter_branches', JSON.stringify([...n])); } catch {}
            return n;
        });
    }

    function changeView(v: 'month' | 'week' | 'day') { setView(v); lsSet('cal_view', v); }
    function changeSelected(s: string | null) { setSelected(s); if (s) lsSet('cal_selected', s); else { try { localStorage.removeItem('cal_selected'); } catch {} } }

    /* Scroll day view to current hour on mount */
    useEffect(() => {
        if (view === 'day' && dayScrollRef.current) {
            const scrollTo = Math.max(0, (today.getHours() - 8) * 64 - 32);
            dayScrollRef.current.scrollTop = scrollTo;
        }
    }, [view]);

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


    /* ---- calendar data (confirmed/completed only, then filtered by doctor/branch) ---- */
    const visibleApts = useMemo(() => {
        let r = apts.filter(a => a.status !== 'pending');
        if (filterBranches.size > 0) {
            const docIds = new Set(doctors.filter(d => d.branch_id && filterBranches.has(Number(d.branch_id))).map(d => Number(d.id)));
            r = r.filter(a => a.doctor_id !== null && docIds.has(Number(a.doctor_id)));
        }
        if (filterDocs.size > 0) {
            r = r.filter(a => a.doctor_id !== null && filterDocs.has(Number(a.doctor_id)));
        }
        return r;
    }, [apts, filterDocs, filterBranches, doctors]);

    /* Sidebar doctors (filtered by selected branches) */
    const sidebarDoctors = useMemo(() =>
        filterBranches.size > 0
            ? doctors.filter(d => d.branch_id && filterBranches.has(d.branch_id))
            : doctors,
        [doctors, filterBranches]
    );

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
        router.patch(`/admin/appointments/${id}/status`, { status: newStatus }, { preserveScroll: true, preserveState: true });
    }

    function deleteApt(id: number, num: string) {
        if (!confirm(`${num} устгах уу?`)) return;
        setApts(prev => prev.filter(a => a.id !== id));
        if (detailApt?.id === id) setDetailApt(null);
        router.delete(`/admin/appointments/${id}`, { preserveScroll: true, preserveState: true });
    }

    function openCreate(dateStr: string, time = '09:00', docId = '') {
        changeSelected(dateStr);
        setCreateDate(dateStr);
        setCreateTime(time);
        setCreateDocId(docId);
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
    const nowTop = ((today.getHours() * 60 + today.getMinutes() - HOUR_START * 60) / 60) * HOUR_H;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Цаг захиалга" />

            {/* Modals */}
            {createDate && (
                <CreateModal date={createDate} initialTime={createTime} initialDoctorId={createDocId}
                    doctors={doctors} branches={branches} treatments={treatments} onClose={() => setCreateDate(null)} />
            )}
            {detailApt && (
                <DetailModal apt={detailApt} onClose={() => setDetailApt(null)}
                    onStatusChange={changeStatus} onDelete={deleteApt} />
            )}

            <div className="flex h-full flex-1 overflow-hidden">

                {/* ===== LEFT SIDEBAR ===== */}
                <div className="flex w-56 shrink-0 flex-col overflow-hidden border-r bg-card">

                    {/* ── TOP: real-time new booking alert ── */}
                    {notifications.length > 0 && (
                        <div className="shrink-0 border-b bg-yellow-50 dark:bg-yellow-950/30 px-3 py-2 space-y-1.5">
                            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-yellow-700 dark:text-yellow-400">
                                <Bell className="size-3 animate-pulse" />
                                Шинэ хүсэлт ирлээ!
                                <span className="ml-auto rounded-full bg-yellow-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{notifications.length}</span>
                            </p>
                            {notifications.map(n => (
                                <div key={n.id} className="rounded-lg border border-yellow-200 bg-white dark:bg-yellow-950/50 dark:border-yellow-800 p-2">
                                    <div className="flex items-start justify-between gap-1">
                                        <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-200 leading-tight">{n.patient_name}</p>
                                        <button onClick={() => dismissNotification(n.id)}
                                            className="shrink-0 rounded p-0.5 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors">
                                            <X className="size-3 text-yellow-500" />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-yellow-700 dark:text-yellow-400">{n.appointment_date} {n.appointment_time}</p>
                                    {n.doctor_name && <p className="text-[10px] text-yellow-600/80 dark:text-yellow-500/80 truncate">{n.doctor_name}</p>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Scrollable body ── */}
                    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">

                        {/* New appointment button */}
                        <button onClick={() => openCreate(selected ?? todayStr)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
                            <Plus className="size-4" /> Цаг нэмэх
                        </button>

                        {/* Branches */}
                        <div>
                            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <Building2 className="size-3.5" /> Салбар
                            </div>
                            <div className="space-y-0.5">
                                {branches.map(b => (
                                    <label key={b.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors">
                                        <input type="checkbox" checked={filterBranches.has(Number(b.id))} onChange={() => toggleBranch(b.id)}
                                            className="size-3.5 rounded accent-red-600 cursor-pointer" />
                                        <span className="text-xs truncate">{b.name}</span>
                                    </label>
                                ))}
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
                                    const count   = apts.filter(a => a.doctor_id === d.id).length;
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
                                .filter(a => a.status === 'pending')
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
                                            <div key={a.id}
                                                className="rounded-xl border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20 p-2.5 space-y-1.5">
                                                {/* Patient info */}
                                                <div className="flex items-start justify-between gap-1">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold truncate text-yellow-900 dark:text-yellow-200">{a.patient_name}</p>
                                                        <p className="text-[10px] text-yellow-700 dark:text-yellow-400">{a.patient_phone}</p>
                                                    </div>
                                                    <button onClick={() => setDetailApt(a)}
                                                        className="shrink-0 rounded p-0.5 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors text-yellow-600">
                                                        <Eye className="size-3" />
                                                    </button>
                                                </div>
                                                {/* Date / time */}
                                                <p className="text-[10px] text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                                                    <Clock className="size-3 shrink-0" />
                                                    {a.appointment_date} {a.appointment_time}
                                                    {a.type === 'online' && <span className="ml-1">💻</span>}
                                                </p>
                                                {a.doctor_name && (
                                                    <p className="text-[10px] flex items-center gap-1" style={{ color: pal.border }}>
                                                        <span className="size-3 rounded-full shrink-0 inline-block" style={{ background: pal.bg }} />
                                                        {a.doctor_name}
                                                    </p>
                                                )}
                                                {/* Actions */}
                                                <div className="flex gap-1.5 pt-0.5">
                                                    <button
                                                        onClick={() => changeStatus(a.id, 'confirmed')}
                                                        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-500 py-1.5 text-[10px] font-bold text-white hover:bg-green-600 transition-colors">
                                                        <CheckCircle2 className="size-3" /> Батлах
                                                    </button>
                                                    <button
                                                        onClick={() => changeStatus(a.id, 'cancelled')}
                                                        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-100 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60 transition-colors">
                                                        <XCircle className="size-3" /> Цуцлах
                                                    </button>
                                                </div>
                                            </div>
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
                        </div>

                    </div>
                </div>

                {/* ===== MAIN CONTENT ===== */}
                <div className="flex flex-1 flex-col gap-4 overflow-hidden p-6">

                    {props.flash?.success && (
                        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400">
                            <CheckCircle2 className="size-4 shrink-0" /> {props.flash.success}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid gap-3 sm:grid-cols-4">
                        {[
                            { label: 'Өнөөдөр',         value: stats.today,     icon: CalendarCheck2, color: 'text-red-500'    },
                            { label: 'Хүлээгдэж байна', value: stats.pending,   icon: CalendarClock,  color: 'text-yellow-500' },
                            { label: 'Баталгаажсан',     value: stats.confirmed, icon: CheckCircle2,   color: 'text-green-500'  },
                            { label: 'Нийт захиалга',    value: stats.total,     icon: CalendarClock,  color: 'text-blue-500'   },
                        ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
                                <Icon className={`size-5 ${color}`} />
                                <div>
                                    <p className="text-xs text-muted-foreground">{label}</p>
                                    <p className="text-2xl font-bold">{value}</p>
                                </div>
                            </div>
                        ))}
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
                                    <div className="grid flex-1 grid-cols-7 overflow-auto">
                                        {Array.from({length: totalCells}, (_, idx) => {
                                            const dayNum  = idx - firstWeekDay + 1;
                                            const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
                                            const dateStr = inMonth ? pad(year, month, dayNum) : '';
                                            const dayCellApts = dateStr ? (aptByDate[dateStr] ?? []) : [];
                                            const isToday = dateStr === todayStr;
                                            const isSel   = dateStr === selected;
                                            return (
                                                <div key={idx}
                                                    onClick={() => inMonth && changeSelected(isSel ? null : dateStr)}
                                                    onDoubleClick={() => inMonth && openCreate(dateStr)}
                                                    className={`group min-h-[90px] cursor-pointer border-b border-r p-1.5 transition-colors ${
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
                                                            <div className="space-y-0.5">
                                                                {(expandedDate === dateStr ? dayCellApts : dayCellApts.slice(0, 3)).map(a => (
                                                                    <div key={a.id}
                                                                        onClick={e => { e.stopPropagation(); changeSelected(dateStr); setDetailApt(a); }}
                                                                        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border cursor-pointer hover:opacity-80 ${STATUS_CHIP[a.status]} ${a.type === 'online' ? 'border-dashed' : ''}`}>
                                                                        {a.type === 'online' && <span>💻</span>}
                                                                        <span className="truncate">{a.appointment_time} {a.patient_name}</span>
                                                                    </div>
                                                                ))}
                                                                {dayCellApts.length > 3 && expandedDate !== dateStr && (
                                                                    <button onClick={e => { e.stopPropagation(); setExpandedDate(dateStr); }}
                                                                        className="w-full rounded px-1.5 py-0.5 text-left text-[10px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
                                                                        +{dayCellApts.length - 3} дахь
                                                                    </button>
                                                                )}
                                                                {expandedDate === dateStr && dayCellApts.length > 3 && (
                                                                    <button onClick={e => { e.stopPropagation(); setExpandedDate(null); }}
                                                                        className="w-full rounded px-1.5 py-0.5 text-left text-[10px] font-medium text-muted-foreground hover:bg-muted/60 transition-colors">
                                                                        ↑ хураах
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
                            {view === 'week' && (
                                <div className="flex flex-1 flex-col overflow-hidden">
                                    <div className="grid grid-cols-7 border-b">
                                        {weekDays.map(d => {
                                            const ds  = pad(d.getFullYear(), d.getMonth(), d.getDate());
                                            const isT = ds === todayStr;
                                            const isS = ds === selected;
                                            return (
                                                <div key={ds} onClick={() => changeSelected(isS ? null : ds)}
                                                    className={`cursor-pointer py-3 text-center transition-colors hover:bg-muted/30 ${isS ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                                                    <p className="text-xs text-muted-foreground">{DAYS_MN[(d.getDay()+6)%7]}</p>
                                                    <span className={`mx-auto mt-1 flex size-8 items-center justify-center rounded-full text-sm font-semibold ${isT ? 'bg-red-600 text-white' : ''}`}>
                                                        {d.getDate()}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="grid flex-1 grid-cols-7 overflow-auto">
                                        {weekDays.map(d => {
                                            const ds    = pad(d.getFullYear(), d.getMonth(), d.getDate());
                                            const wApts = (aptByDate[ds] ?? []).sort((a,b) => a.appointment_time.localeCompare(b.appointment_time));
                                            const isS   = ds === selected;
                                            return (
                                                <div key={ds}
                                                    onClick={() => changeSelected(isS ? null : ds)}
                                                    onDoubleClick={() => openCreate(ds)}
                                                    className={`group min-h-[200px] cursor-pointer border-r p-1.5 space-y-1 transition-colors ${isS ? 'bg-red-50 dark:bg-red-950/20' : 'hover:bg-muted/20'}`}>
                                                    {wApts.map(a => (
                                                        <div key={a.id}
                                                            onClick={e => { e.stopPropagation(); changeSelected(ds); setDetailApt(a); }}
                                                            className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity ${STATUS_CHIP[a.status]} ${a.type === 'online' ? 'border-dashed' : ''}`}>
                                                            <p className="font-semibold flex items-center gap-1">
                                                                {a.type === 'online' && <span>💻</span>}
                                                                {a.appointment_time}
                                                            </p>
                                                            <p className="truncate">{a.patient_name}</p>
                                                            {a.doctor_name && <p className="truncate opacity-70">Д-р {a.doctor_name}</p>}
                                                        </div>
                                                    ))}
                                                    <div className="hidden group-hover:flex justify-center pt-1">
                                                        <button onClick={e => { e.stopPropagation(); openCreate(ds); }}
                                                            className="flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-100 transition-colors">
                                                            <Plus className="size-3"/> Нэмэх
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

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
                                    : filterBranches.size > 0
                                        ? doctors.filter(d => d.branch_id !== null && filterBranches.has(Number(d.branch_id)))
                                        : dayDocIds.length > 0
                                            ? doctors.filter(d => dayDocIds.includes(Number(d.id)))
                                            : doctors;

                                /* Helper: safe doctor match regardless of string/number */
                                const sameDoc = (aptDocId: number | null, docId: number) =>
                                    aptDocId !== null && Number(aptDocId) === Number(docId);

                                return (
                                    /* Single scrollable area — vertical + horizontal together */
                                    <div ref={dayScrollRef} className="flex-1 overflow-auto">
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
                                                            <div className="flex size-9 items-center justify-center rounded-full text-xs font-bold text-white"
                                                                style={{ background: pal.bg }}>
                                                                {doctorInitials(d.name)}
                                                            </div>
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
                                                    const docApts = allDayApts
                                                        .filter(a => sameDoc(a.doctor_id, doc.id))
                                                        .sort((a,b) => a.appointment_time.localeCompare(b.appointment_time));
                                                    const pal = dayPalette(doc.id);
                                                    return (
                                                        <div key={doc.id}
                                                            className="relative flex-1 border-r last:border-r-0 cursor-pointer"
                                                            style={{ minWidth: COL_MIN, height: totalH }}
                                                            onClick={e => {
                                                                /* parentElement = grid body div (relative flex).
                                                                   Its getBoundingClientRect().top is the viewport-top of the grid,
                                                                   which already accounts for scroll position. */
                                                                const gridRect = (e.currentTarget as HTMLDivElement)
                                                                    .parentElement!.getBoundingClientRect();
                                                                const y = e.clientY - gridRect.top;
                                                                openCreate(dayStr, timeFromY(Math.max(0, y)), String(doc.id));
                                                            }}>
                                                            {/* Hour lines */}
                                                            {Array.from({length: HOUR_END - HOUR_START}, (_, i) => (
                                                                <div key={i} className="absolute left-0 right-0 border-t border-dashed border-border/30"
                                                                    style={{ top: i * HOUR_H }} />
                                                            ))}
                                                            {/* 10-min sub-lines */}
                                                            {Array.from({length: (HOUR_END - HOUR_START) * 6}, (_, i) => {
                                                                const mins = i * 10;
                                                                const isMajor = mins % 60 === 0;
                                                                const isHalf  = mins % 30 === 0 && !isMajor;
                                                                if (isMajor) return null;
                                                                return (
                                                                    <div key={`m${i}`}
                                                                        className={`absolute left-0 right-0 border-t ${isHalf ? 'border-border/20' : 'border-border/8'}`}
                                                                        style={{ top: mins * PX_PER_MIN }} />
                                                                );
                                                            })}
                                                            {/* Appointments — 10-min slot, exact position, stacked vertically */}
                                                            {(() => {
                                                                // 1 slot = 10 min = 20px → card = 18px → 6 cards/hour max
                                                                const SLOT_H = PX_PER_MIN * SLOT_MINS; // 20px
                                                                const APT_H  = SLOT_H - 2;             // 18px — single compact row

                                                                return docApts.map((a, idx) => {
                                                                    const top = aptTop(a.appointment_time);
                                                                    const isOnline = a.type === 'online';
                                                                    const accentColor = isOnline ? '#3b82f6' : pal.border;
                                                                    return (
                                                                        <div key={a.id}
                                                                            onClick={ev => { ev.stopPropagation(); setDetailApt(a); }}
                                                                            title={`${a.appointment_time}${a.appointment_time_end ? '–' + a.appointment_time_end : ''} · ${a.patient_name} · ${a.patient_phone ?? ''}`}
                                                                            className="absolute left-0.5 right-0.5 cursor-pointer overflow-hidden rounded-sm flex items-center gap-1 px-1 transition-all hover:z-20 hover:shadow-md"
                                                                            style={{
                                                                                top,
                                                                                height:      APT_H,
                                                                                zIndex:      idx + 1,
                                                                                background:  pal.light,
                                                                                color:       accentColor,
                                                                                borderTop:   `1px solid ${accentColor}`,
                                                                                borderRight: `1px solid ${accentColor}`,
                                                                                borderBottom:`1px solid ${accentColor}`,
                                                                                borderLeft:  `3px solid ${accentColor}`,
                                                                                borderStyle: isOnline ? 'dashed dashed dashed solid' : 'solid',
                                                                            }}>
                                                                            <span className="shrink-0 font-bold tabular-nums" style={{ fontSize: 9 }}>{a.appointment_time}</span>
                                                                            {a.appointment_time_end && (
                                                                                <span className="shrink-0 opacity-50" style={{ fontSize: 8 }}>–{a.appointment_time_end}</span>
                                                                            )}
                                                                            <span className="flex-1 truncate font-semibold" style={{ fontSize: 10 }}>{a.patient_name}</span>
                                                                            {isOnline && <span className="shrink-0" style={{ fontSize: 9 }}>💻</span>}
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
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
        </AppLayout>
    );
}
