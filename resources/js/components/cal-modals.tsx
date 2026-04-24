import { router, useForm } from '@inertiajs/react';
import {
    Building2, CalendarCheck2, CheckCircle2, Clock,
    Mail, Monitor, Pencil, Phone, Stethoscope,
    Trash2, User, UserCheck, X, XCircle, Eye,
    CalendarClock,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo } from 'react';

/* ── Types ──────────────────────────────────────────────────────── */
export interface ModalDoctor   { id: number; name: string; specialization: string | null; branch_id: number | null; branch_ids: number[] }
export interface ModalBranch   { id: number; name: string }
export interface ModalTreatment { id: number; title: string }
export interface ModalAppt {
    id: number; appointment_number: string;
    patient_name: string; patient_phone: string; patient_email: string | null;
    doctor_id: number | null; doctor_name: string | null; doctor_spec: string | null;
    branch_id: number | null; branch_name: string | null;
    service: string | null; type: 'online' | 'in_person';
    appointment_date: string; appointment_time: string;
    appointment_time_end: string | null;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    notes: string | null; admin_notes: string | null;
    created_by: string | null; confirmed_by: string | null;
}

/* ── Constants ──────────────────────────────────────────────────── */
export const STATUS_LABEL: Record<string, string> = {
    pending:   'Хүлээгдэж байна',
    confirmed: 'Баталгаажсан',
    cancelled: 'Цуцлагдсан',
    completed: 'Дууссан',
};
export const STATUS_DOT: Record<string, string> = {
    pending:   'bg-yellow-400',
    confirmed: 'bg-green-500',
    cancelled: 'bg-red-400',
    completed: 'bg-blue-400',
};
export const STATUS_CHIP: Record<string, string> = {
    pending:   'bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300',
    confirmed: 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300',
    cancelled: 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
    completed: 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300',
};
const MONTHS_MN = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар','7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];
const DAYS_MN   = ['Дав','Мяг','Лха','Пүр','Баа','Бям','Ням'];
const QUICK_TIMES = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

/* ── Helpers ────────────────────────────────────────────────────── */
function addMins(time: string, mins: number): string {
    const [h, m] = time.split(':').map(Number);
    const t = h * 60 + m + mins;
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
function diffLabel(start: string, end: string): string | null {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const d = (eh * 60 + em) - (sh * 60 + sm);
    if (d <= 0) return null;
    return d >= 60 ? `${Math.floor(d / 60)}ц${d % 60 ? `${d % 60}м` : ''}` : `${d}м`;
}

/* ── Shared input style ─────────────────────────────────────────── */
const inp = 'w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-colors';
const sel = inp + ' cursor-pointer';

/* ══════════════════════════════════════════════════════════════════
   FORM MODAL  (Create / Edit)
══════════════════════════════════════════════════════════════════ */
interface FormModalProps {
    routePrefix: string;          // e.g. '/reception/appointments' or '/admin/appointments'
    apt?: ModalAppt;              // present = edit mode
    date: string;
    initialTime?: string;
    initialDoctorId?: string;
    doctors: ModalDoctor[];
    branches: ModalBranch[];
    treatments: ModalTreatment[];
    onClose: () => void;
    onSaved?: (updated: ModalAppt) => void;
}
export function AptFormModal({
    routePrefix, apt, date, initialTime = '09:00', initialDoctorId = '',
    doctors, branches, treatments, onClose, onSaved,
}: FormModalProps) {
    const isEdit = !!apt;

    const initBranch = useMemo(() => {
        if (apt?.branch_id) return String(apt.branch_id);
        if (initialDoctorId) {
            const doc = doctors.find(d => String(d.id) === initialDoctorId);
            return doc?.branch_id ? String(doc.branch_id) : '';
        }
        return '';
    }, [apt, initialDoctorId, doctors]);

    const initTime = apt?.appointment_time ?? initialTime;
    const initEnd  = apt?.appointment_time_end ?? addMins(initTime, 20);

    const { data, setData, post, put, processing, errors, reset } = useForm<{
        patient_name: string; patient_phone: string; patient_email: string;
        branch_id: string; doctor_id: string; service: string;
        type: 'online' | 'in_person';
        appointment_date: string; appointment_time: string; appointment_time_end: string;
        status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
        notes: string; admin_notes: string;
    }>({
        patient_name:         apt?.patient_name         ?? '',
        patient_phone:        apt?.patient_phone        ?? '',
        patient_email:        apt?.patient_email        ?? '',
        branch_id:            initBranch,
        doctor_id:            apt?.doctor_id ? String(apt.doctor_id) : initialDoctorId,
        service:              apt?.service              ?? '',
        type:                 apt?.type                 ?? 'in_person',
        appointment_date:     apt?.appointment_date     ?? date,
        appointment_time:     initTime,
        appointment_time_end: initEnd,
        status:               apt?.status               ?? 'confirmed',
        notes:                apt?.notes                ?? '',
        admin_notes:          apt?.admin_notes          ?? '',
    });

    const filteredDoctors = useMemo(
        () => data.branch_id
            ? doctors.filter(d => d.branch_ids?.includes(Number(data.branch_id)) || String(d.branch_id) === data.branch_id)
            : doctors,
        [data.branch_id, doctors],
    );

    function setStartTime(v: string) {
        setData(prev => ({ ...prev, appointment_time: v, appointment_time_end: addMins(v, 20) }));
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        if (isEdit && apt) {
            put(`${routePrefix}/${apt.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    onSaved?.({
                        ...apt,
                        patient_name:         data.patient_name,
                        patient_phone:        data.patient_phone,
                        patient_email:        data.patient_email  || null,
                        doctor_id:            data.doctor_id      ? Number(data.doctor_id) : null,
                        doctor_name:          doctors.find(d => String(d.id) === data.doctor_id)?.name ?? null,
                        doctor_spec:          doctors.find(d => String(d.id) === data.doctor_id)?.specialization ?? null,
                        branch_id:            data.branch_id      ? Number(data.branch_id) : null,
                        branch_name:          branches.find(b => String(b.id) === data.branch_id)?.name ?? null,
                        service:              data.service        || null,
                        type:                 data.type,
                        appointment_date:     data.appointment_date,
                        appointment_time:     data.appointment_time,
                        appointment_time_end: data.appointment_time_end || null,
                        status:               data.status,
                        notes:                data.notes          || null,
                        admin_notes:          data.admin_notes    || null,
                    });
                    onClose();
                },
            });
        } else {
            post(routePrefix, {
                preserveScroll: true,
                onSuccess: () => { reset(); onClose(); },
            });
        }
    }

    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, []);

    const dateStr = data.appointment_date
        ? new Date(data.appointment_date + 'T00:00').toLocaleDateString('mn-MN', { month: 'long', day: 'numeric', weekday: 'short' })
        : '';
    const dur = data.appointment_time && data.appointment_time_end
        ? diffLabel(data.appointment_time, data.appointment_time_end)
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl border max-h-[88vh]">

                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/40 shrink-0">
                            {isEdit
                                ? <Pencil className="size-4 text-red-600 dark:text-red-400" />
                                : <CalendarCheck2 className="size-4 text-red-600 dark:text-red-400" />}
                        </div>
                        <div>
                            <p className="text-sm font-bold leading-tight">{isEdit ? 'Захиалга засах' : 'Шинэ цаг захиалах'}</p>
                            {dateStr && <p className="text-[11px] text-muted-foreground">{dateStr}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                        <X className="size-4" />
                    </button>
                </div>

                <form onSubmit={submit} className="cal-scroll flex-1 overflow-y-auto p-4 space-y-3">

                    {/* Төрөл */}
                    <div className="flex rounded-lg border overflow-hidden text-xs font-semibold">
                        {(['in_person', 'online'] as const).map(v => (
                            <button key={v} type="button" onClick={() => setData('type', v)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
                                    data.type === v ? 'bg-red-600 text-white' : 'hover:bg-muted text-muted-foreground'
                                }`}>
                                {v === 'in_person' ? <><Building2 className="size-3.5" /> Биечлэн</> : <><Monitor className="size-3.5" /> Онлайн</>}
                            </button>
                        ))}
                    </div>

                    {/* Нэр + Утас */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Нэр <span className="text-red-500">*</span></label>
                            <input autoFocus type="text" value={data.patient_name}
                                onChange={e => setData('patient_name', e.target.value)}
                                placeholder="Овог нэр" className={inp} />
                            {errors.patient_name && <p className="text-[10px] text-red-500 mt-0.5">{errors.patient_name}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Утас <span className="text-red-500">*</span></label>
                            <input type="tel" value={data.patient_phone}
                                onChange={e => setData('patient_phone', e.target.value)}
                                placeholder="9900 0000" className={inp} />
                            {errors.patient_phone && <p className="text-[10px] text-red-500 mt-0.5">{errors.patient_phone}</p>}
                        </div>
                    </div>

                    {/* И-мэйл */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">И-мэйл</label>
                        <input type="email" value={data.patient_email}
                            onChange={e => setData('patient_email', e.target.value)}
                            placeholder="example@mail.com" className={inp} />
                    </div>

                    {/* Огноо + Цаг */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Огноо <span className="text-red-500">*</span></label>
                            <input type="date" value={data.appointment_date}
                                onChange={e => setData('appointment_date', e.target.value)}
                                className={inp} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Цаг {dur && <span className="ml-1 rounded-full bg-green-100 dark:bg-green-950/40 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">{dur}</span>}
                            </label>
                            <div className="flex items-center gap-1">
                                <input type="time" value={data.appointment_time}
                                    onChange={e => setStartTime(e.target.value)}
                                    className={inp + ' text-center font-medium flex-1'} />
                                <span className="text-muted-foreground text-xs shrink-0">–</span>
                                <input type="time" value={data.appointment_time_end}
                                    onChange={e => setData('appointment_time_end', e.target.value)}
                                    className={inp + ' text-center font-medium flex-1'} />
                            </div>
                        </div>
                    </div>

                    {/* Quick time presets */}
                    <div className="flex flex-wrap gap-1">
                        {QUICK_TIMES.map(t => (
                            <button key={t} type="button" onClick={() => setStartTime(t)}
                                className={`rounded px-2 py-0.5 text-[11px] font-medium border transition-colors ${
                                    data.appointment_time === t
                                        ? 'bg-red-600 text-white border-red-600'
                                        : 'border-input text-muted-foreground hover:border-red-400 hover:text-red-600 bg-background'
                                }`}>{t}</button>
                        ))}
                    </div>

                    {/* Салбар + Эмч */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Салбар</label>
                            <select value={data.branch_id}
                                onChange={e => { setData('branch_id', e.target.value); setData('doctor_id', ''); }}
                                className={sel}>
                                <option value="">— Сонгох —</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Эмч</label>
                            <select value={data.doctor_id} onChange={e => setData('doctor_id', e.target.value)} className={sel}>
                                <option value="">— Сонгох —</option>
                                {filteredDoctors.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}{d.specialization ? ` · ${d.specialization}` : ''}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Үйлчилгээ */}
                    {treatments.length > 0 && (
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Үйлчилгээ</label>
                            <div className="flex flex-wrap gap-1.5">
                                {treatments.map(t => (
                                    <button key={t.id} type="button"
                                        onClick={() => setData('service', data.service === t.title ? '' : t.title)}
                                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                            data.service === t.title
                                                ? 'bg-red-600 text-white border-red-600'
                                                : 'border-input text-muted-foreground hover:border-red-400 hover:text-red-600 bg-background'
                                        }`}>{t.title}</button>
                                ))}
                                <input type="text"
                                    value={treatments.some(t => t.title === data.service) ? '' : data.service}
                                    onChange={e => setData('service', e.target.value)}
                                    placeholder="Өөр..."
                                    className="rounded-full border border-dashed border-input px-2.5 py-1 text-xs bg-background focus:outline-none focus:border-red-400 w-24" />
                            </div>
                        </div>
                    )}

                    {/* Статус */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Төлөв</label>
                        <div className="flex gap-1.5">
                            {([
                                { v: 'pending',   label: 'Хүлээгдэж байна', dot: 'bg-yellow-400' },
                                { v: 'confirmed', label: 'Баталгаажсан',    dot: 'bg-green-500'  },
                            ] as const).map(({ v, label, dot }) => (
                                <button key={v} type="button" onClick={() => setData('status', v)}
                                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold transition-colors ${
                                        data.status === v
                                            ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                                            : 'border-input bg-background text-muted-foreground hover:border-red-300'
                                    }`}>
                                    <span className={`size-1.5 rounded-full shrink-0 ${dot}`} />
                                    <span className="hidden sm:inline">{label}</span>
                                    <span className="sm:hidden">{label.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Тэмдэглэл */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Тэмдэглэл</label>
                            <textarea value={data.notes} onChange={e => setData('notes', e.target.value)}
                                rows={2} placeholder="Хүсэлт, шалтгаан..."
                                className={inp + ' resize-none'} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Дотоод тэмдэглэл</label>
                            <textarea value={data.admin_notes} onChange={e => setData('admin_notes', e.target.value)}
                                rows={2} placeholder="Ажилтанд..."
                                className={inp + ' resize-none'} />
                        </div>
                    </div>

                </form>

                {/* Footer */}
                <div className="flex gap-2 border-t px-4 py-3">
                    <button onClick={submit as any} disabled={processing}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 text-sm transition-colors">
                        {processing
                            ? <><div className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Хадгалж байна...</>
                            : isEdit ? <><CheckCircle2 className="size-3.5" /> Хадгалах</> : <><CalendarCheck2 className="size-3.5" /> Захиалах</>
                        }
                    </button>
                    <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                        Болих
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   DETAIL MODAL
══════════════════════════════════════════════════════════════════ */
interface DetailModalProps {
    apt: ModalAppt;
    onClose: () => void;
    onStatusChange?: (id: number, status: string) => void;
    onDelete?: (id: number, num: string) => void;
    onEdit?: (apt: ModalAppt) => void;
    readonly?: boolean;
}
export function AptDetailModal({ apt, onClose, onStatusChange, onDelete, onEdit, readonly }: DetailModalProps) {
    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, []);

    const dur = apt.appointment_time && apt.appointment_time_end
        ? diffLabel(apt.appointment_time, apt.appointment_time_end)
        : null;

    const dateObj = apt.appointment_date ? new Date(apt.appointment_date + 'T00:00') : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-card shadow-2xl border max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                        <p className="text-sm font-bold leading-tight">{apt.patient_name}</p>
                        <p className="text-[11px] text-muted-foreground">{apt.appointment_number}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_CHIP[apt.status]}`}>
                            <span className={`inline-block size-1.5 rounded-full ${STATUS_DOT[apt.status]} mr-1`} />
                            {STATUS_LABEL[apt.status]}
                        </span>
                        <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors">
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                <div className="cal-scroll flex-1 overflow-y-auto p-3 space-y-2">

                    {/* Цаг */}
                    {dateObj ? (
                        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2.5">
                            <div className="text-center min-w-[44px]">
                                <p className="text-2xl font-black leading-none">{dateObj.getDate()}</p>
                                <p className="text-[10px] text-muted-foreground">{MONTHS_MN[dateObj.getMonth()]}</p>
                                <p className="text-[10px] text-muted-foreground/60">{DAYS_MN[(dateObj.getDay() + 6) % 7]}</p>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <Clock className="size-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-base font-black text-foreground">{apt.appointment_time}</span>
                                    {apt.appointment_time_end && (
                                        <><span className="text-muted-foreground text-xs">–</span>
                                        <span className="text-sm font-semibold text-muted-foreground">{apt.appointment_time_end}</span></>
                                    )}
                                    {dur && <span className="rounded-full bg-green-100 dark:bg-green-950/40 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">{dur}</span>}
                                </div>
                                <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${apt.type === 'online' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                                    <Monitor className="size-2.5" />
                                    {apt.type === 'online' ? 'Онлайн' : 'Биечлэн'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-orange-300 bg-orange-50 dark:bg-orange-950/20 px-3 py-2.5 flex items-center gap-2">
                            <span className="text-lg">📋</span>
                            <div>
                                <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">Биечлэн ирэх хүсэлт</p>
                                <p className="text-[11px] text-orange-600 dark:text-orange-400">Цаг тохироогүй байна</p>
                            </div>
                        </div>
                    )}

                    {/* Холбоо барих */}
                    <div className="grid grid-cols-2 gap-1.5">
                        <a href={`tel:${apt.patient_phone}`}
                            className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-2 hover:bg-muted/50 transition-colors group">
                            <Phone className="size-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[9px] text-muted-foreground">Утас</p>
                                <p className="text-xs font-bold truncate group-hover:text-green-600">{apt.patient_phone}</p>
                            </div>
                        </a>
                        {apt.patient_email ? (
                            <a href={`mailto:${apt.patient_email}`}
                                className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-2 hover:bg-muted/50 transition-colors group">
                                <Mail className="size-3.5 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[9px] text-muted-foreground">И-мэйл</p>
                                    <p className="text-[11px] font-semibold truncate group-hover:text-blue-600">{apt.patient_email}</p>
                                </div>
                            </a>
                        ) : (
                            <div className="flex items-center justify-center rounded-lg border border-dashed bg-muted/10 px-2.5 py-2">
                                <p className="text-[10px] text-muted-foreground/40">И-мэйл байхгүй</p>
                            </div>
                        )}
                    </div>

                    {/* Эмч */}
                    {apt.doctor_name && (
                        <div className="flex items-center gap-2.5 rounded-lg border bg-background px-2.5 py-2">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/40 text-[11px] font-black text-red-600 dark:text-red-400">
                                {apt.doctor_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] text-muted-foreground">Эмч</p>
                                <p className="text-xs font-bold truncate">{apt.doctor_name}</p>
                                {apt.doctor_spec && <p className="text-[10px] text-muted-foreground truncate">{apt.doctor_spec}</p>}
                            </div>
                            {apt.branch_name && <p className="text-[10px] text-muted-foreground shrink-0">{apt.branch_name}</p>}
                        </div>
                    )}

                    {/* Үйлчилгээ / Тэмдэглэл */}
                    {(apt.service || apt.notes || apt.admin_notes) && (
                        <div className="rounded-lg border divide-y overflow-hidden">
                            {apt.service && (
                                <div className="flex items-center gap-2 px-2.5 py-2 bg-background">
                                    <Stethoscope className="size-3.5 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[9px] text-muted-foreground">Үйлчилгээ</p>
                                        <p className="text-xs font-semibold">{apt.service}</p>
                                    </div>
                                </div>
                            )}
                            {apt.notes && (
                                <div className="flex items-start gap-2 px-2.5 py-2 bg-background">
                                    <User className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[9px] text-muted-foreground">Тэмдэглэл</p>
                                        <p className="text-xs leading-relaxed">{apt.notes}</p>
                                    </div>
                                </div>
                            )}
                            {apt.admin_notes && (
                                <div className="flex items-start gap-2 px-2.5 py-2 bg-amber-50/60 dark:bg-amber-950/10">
                                    <UserCheck className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[9px] text-muted-foreground">Дотоод тэмдэглэл</p>
                                        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">{apt.admin_notes}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Аудит */}
                    {(apt.created_by || apt.confirmed_by) && (
                        <div className="flex gap-3 rounded-lg bg-muted/20 px-2.5 py-1.5">
                            {apt.created_by && (
                                <p className="text-[10px] text-muted-foreground">
                                    Үүсгэсэн: <span className="font-semibold text-foreground">{apt.created_by}</span>
                                </p>
                            )}
                            {apt.confirmed_by && (
                                <p className="text-[10px] text-muted-foreground">
                                    Баталсан: <span className="font-semibold text-green-700 dark:text-green-400">{apt.confirmed_by}</span>
                                </p>
                            )}
                        </div>
                    )}

                    {/* Төлөв өөрчлөх */}
                    {!readonly && onStatusChange && (
                        <div>
                            <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Төлөв өөрчлөх</p>
                            <div className="flex gap-1.5">
                                {([
                                    { s: 'confirmed', label: 'Баталгаажуулах',   icon: CheckCircle2,   cls: 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400' },
                                    { s: 'pending',   label: 'Хүлээгдэж байна',  icon: CalendarClock,  cls: 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-950/30' },
                                ] as const).map(({ s, label, icon: Icon, cls }) => (
                                    <button key={s} onClick={() => onStatusChange(apt.id, s)} disabled={apt.status === s}
                                        className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all ${cls} ${apt.status === s ? 'opacity-40 cursor-default' : ''}`}>
                                        <Icon className="size-3.5" /> {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-1.5 border-t px-3 py-3">
                    {!readonly && onEdit && (
                        <button onClick={() => { onEdit(apt); onClose(); }}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white py-2 text-sm font-semibold transition-colors">
                            <Pencil className="size-3.5" /> Засах
                        </button>
                    )}
                    <a href={`${window.location.pathname.includes('/admin') ? '/admin' : window.location.pathname.includes('/doctor') ? '/doctor' : '/reception'}/appointments/${apt.id}`}
                        className="flex items-center justify-center rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors">
                        <Eye className="size-3.5" />
                    </a>
                    {!readonly && onDelete && (
                        <button onClick={() => { onDelete(apt.id, apt.appointment_number); onClose(); }}
                            className="flex items-center justify-center rounded-lg border border-red-200 dark:border-red-900 px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                            <Trash2 className="size-3.5" />
                        </button>
                    )}
                    {readonly && (
                        <button onClick={onClose}
                            className="flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-muted transition-colors">
                            Хаах
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── DayMore modal ────────────────────────────────────────────────── */
interface DayMoreProps {
    dateStr: string;
    apts: ModalAppt[];
    onClose: () => void;
    onSelect: (a: ModalAppt) => void;
    onAdd?: (dateStr: string) => void;
}
export function DayMoreModal({ dateStr, apts, onClose, onSelect, onAdd }: DayMoreProps) {
    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, []);

    const d = new Date(dateStr + 'T00:00');
    const sorted = [...apts].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-card shadow-2xl border max-h-[80vh]">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                        <p className="text-sm font-bold">{d.getFullYear()} · {MONTHS_MN[d.getMonth()]} {d.getDate()}</p>
                        <p className="text-[11px] text-muted-foreground">{DAYS_MN[(d.getDay() + 6) % 7]} · {sorted.length} захиалга</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {onAdd && (
                            <button onClick={() => { onAdd(dateStr); onClose(); }}
                                className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors">
                                + Нэмэх
                            </button>
                        )}
                        <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors">
                            <X className="size-4" />
                        </button>
                    </div>
                </div>
                <div className="cal-scroll flex-1 overflow-y-auto divide-y">
                    {sorted.map(a => (
                        <button key={a.id} onClick={() => { onSelect(a); onClose(); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors">
                            <div className="text-center min-w-[28px]">
                                <p className="text-xs font-bold text-foreground">{a.appointment_time}</p>
                                {a.appointment_time_end && <p className="text-[9px] text-muted-foreground">{a.appointment_time_end}</p>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{a.patient_name}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{a.doctor_name ?? (a.service ?? '—')}</p>
                            </div>
                            <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${STATUS_CHIP[a.status]}`}>
                                {STATUS_LABEL[a.status].split(' ')[0]}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
