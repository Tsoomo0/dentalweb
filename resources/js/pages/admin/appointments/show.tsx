import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Mail, Monitor, Phone } from 'lucide-react';
import { type FormEvent, useMemo } from 'react';

interface Doctor  { id: number; name: string; specialization: string | null; branch_id: number | null }
interface Branch  { id: number; name: string }

interface Appointment {
    id: number;
    appointment_number: string;
    patient_name: string;
    patient_phone: string;
    patient_email: string | null;
    doctor_id: number | null;
    branch_id: number | null;
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

interface Props { appointment: Appointment; doctors: Doctor[]; branches: Branch[] }

const STATUS_LABEL: Record<string, string> = {
    pending:   'Хүлээгдэж байна',
    confirmed: 'Баталгаажсан',
    cancelled: 'Цуцлагдсан',
    completed: 'Дууссан',
};
const STATUS_CLASS: Record<string, string> = {
    pending:   'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-500',
    completed: 'bg-blue-100 text-blue-700',
};

const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => {
    const h = Math.floor(i / 2) + 9;
    const m = i % 2 === 0 ? '00' : '30';
    return `${String(h).padStart(2, '0')}:${m}`;
});

const SERVICES = ['Ерөнхий үзлэг', 'Эмчилгээний зөвлөгөө', 'Invisalign', 'Цайруулалт', 'Имплант', 'Брекет', 'Хүүхдийн шүдний эмчилгээ'];

export default function AppointmentShow({ appointment, doctors, branches }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Админ', href: '/admin/dashboard' },
        { title: 'Цаг захиалга', href: '/admin/appointments' },
        { title: appointment.appointment_number, href: `/admin/appointments/${appointment.id}` },
    ];

    const { data, setData, put, processing, errors } = useForm<{
        patient_name: string;
        patient_phone: string;
        patient_email: string;
        branch_id: string;
        doctor_id: string;
        service: string;
        type: 'online' | 'in_person';
        appointment_date: string;
        appointment_time: string;
        appointment_time_end: string;
        status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
        notes: string;
        admin_notes: string;
    }>({
        patient_name:         appointment.patient_name,
        patient_phone:        appointment.patient_phone,
        patient_email:        appointment.patient_email ?? '',
        branch_id:            appointment.branch_id ? String(appointment.branch_id) : '',
        doctor_id:            appointment.doctor_id ? String(appointment.doctor_id) : '',
        service:              appointment.service ?? '',
        type:                 appointment.type,
        appointment_date:     appointment.appointment_date,
        appointment_time:     appointment.appointment_time,
        appointment_time_end: appointment.appointment_time_end ?? '',
        status:               appointment.status,
        notes:                appointment.notes ?? '',
        admin_notes:          appointment.admin_notes ?? '',
    });

    const filteredDoctors = useMemo(
        () => data.branch_id ? doctors.filter(d => String(d.branch_id) === data.branch_id) : doctors,
        [data.branch_id, doctors],
    );

    function submit(e: FormEvent) {
        e.preventDefault();
        put(`/admin/appointments/${appointment.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={appointment.appointment_number} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/appointments" className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold">{appointment.appointment_number}</h1>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[appointment.status]}`}>
                                    {STATUS_LABEL[appointment.status]}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {appointment.formatted_date} • {appointment.appointment_time}
                                {appointment.appointment_time_end && <span> — {appointment.appointment_time_end}</span>}
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
                    {/* Left */}
                    <div className="space-y-5 lg:col-span-2">
                        {/* Patient info display */}
                        <div className="rounded-xl border p-5">
                            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Үйлчлүүлэгч</p>
                            <div className="flex items-center gap-4">
                                <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 text-lg font-bold text-white">
                                    {appointment.patient_name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="space-y-0.5">
                                    <p className="font-semibold text-base">{appointment.patient_name}</p>
                                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Phone className="size-3.5" /> {appointment.patient_phone}
                                    </p>
                                    {appointment.patient_email && (
                                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <Mail className="size-3.5" /> {appointment.patient_email}
                                        </p>
                                    )}
                                </div>
                                <div className="ml-auto flex flex-col items-end gap-1">
                                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                        data.type === 'online'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-purple-100 text-purple-700'
                                    }`}>
                                        <Monitor className="size-3" />
                                        {data.type === 'online' ? 'Онлайн' : 'Биечлэн'}
                                    </span>
                                    {appointment.doctor_name && (
                                        <p className="text-xs text-muted-foreground">Д-р {appointment.doctor_name}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Edit fields */}
                        <div className="rounded-xl border p-5 space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Мэдээлэл засах</p>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Нэр *</label>
                                    <input
                                        type="text"
                                        value={data.patient_name}
                                        onChange={e => setData('patient_name', e.target.value)}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                    {errors.patient_name && <p className="text-xs text-red-500">{errors.patient_name}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Утас *</label>
                                    <input
                                        type="tel"
                                        value={data.patient_phone}
                                        onChange={e => setData('patient_phone', e.target.value)}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Огноо *</label>
                                    <input
                                        type="date"
                                        value={data.appointment_date}
                                        onChange={e => setData('appointment_date', e.target.value)}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Цаг *</label>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={data.appointment_time}
                                            onChange={e => setData('appointment_time', e.target.value)}
                                            className="border-input bg-background flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                        >
                                            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <span className="shrink-0 text-muted-foreground text-sm">—</span>
                                        <input
                                            type="time"
                                            value={data.appointment_time_end}
                                            onChange={e => setData('appointment_time_end', e.target.value)}
                                            placeholder="Дуусах"
                                            className="border-input bg-background flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Салбар</label>
                                    <select
                                        value={data.branch_id}
                                        onChange={e => { setData('branch_id', e.target.value); setData('doctor_id', ''); }}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="">Салбар сонгох</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Эмч</label>
                                    <select
                                        value={data.doctor_id}
                                        onChange={e => setData('doctor_id', e.target.value)}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="">Эмч сонгох</option>
                                        {filteredDoctors.map(d => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}{d.specialization ? ` — ${d.specialization}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Тэмдэглэл</label>
                                    <textarea
                                        value={data.notes}
                                        onChange={e => setData('notes', e.target.value)}
                                        rows={3}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Админы тэмдэглэл</label>
                                    <textarea
                                        value={data.admin_notes}
                                        onChange={e => setData('admin_notes', e.target.value)}
                                        rows={3}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="space-y-5">
                        {/* Type */}
                        <div className="rounded-xl border p-5 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Үзлэгийн төрөл</p>
                            {([
                                { value: 'online',    label: 'Онлайн үзлэг',  desc: 'Видео дуудлагаар' },
                                { value: 'in_person', label: 'Биечлэн үзлэг', desc: 'Клиникт ирж' },
                            ] as const).map(({ value, label, desc }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setData('type', value)}
                                    className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                                        data.type === value
                                            ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                                            : 'hover:bg-muted'
                                    }`}
                                >
                                    <span className={`mt-0.5 size-2 shrink-0 rounded-full ${data.type === value ? 'bg-red-500' : 'bg-zinc-300'}`} />
                                    <div>
                                        <p className="font-medium">{label}</p>
                                        <p className="text-xs text-muted-foreground">{desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Status */}
                        <div className="rounded-xl border p-5 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Төлөв өөрчлөх</p>
                            {([
                                { value: 'pending',   label: 'Хүлээгдэж байна', dot: 'bg-yellow-500' },
                                { value: 'confirmed', label: 'Баталгаажуулах',   dot: 'bg-green-500' },
                                { value: 'cancelled', label: 'Цуцлах',            dot: 'bg-red-500'   },
                                { value: 'completed', label: 'Дууссан',            dot: 'bg-blue-500'  },
                            ] as const).map(({ value, label, dot }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setData('status', value)}
                                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                                        data.status === value
                                            ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                                            : 'hover:bg-muted'
                                    }`}
                                >
                                    <span className={`size-2 rounded-full ${dot}`} />
                                    <span className="font-medium">{label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Service */}
                        <div className="rounded-xl border p-5 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Үйлчилгээ</p>
                            <div className="flex flex-wrap gap-2">
                                {SERVICES.map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setData('service', data.service === s ? '' : s)}
                                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                            data.service === s
                                                ? 'bg-red-600 text-white'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {processing ? 'Хадгалж байна...' : 'Шинэчлэх'}
                            </button>
                            <Link href="/admin/appointments" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                                Буцах
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
