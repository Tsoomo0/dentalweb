import { Head, useForm, usePage } from '@inertiajs/react';
import { CalendarClock, CheckCircle2, ChevronRight, Clock, Monitor, User } from 'lucide-react';
import { type FormEvent, useMemo } from 'react';

interface Doctor  { id: number; name: string; specialization: string | null; branch_id: number | null }
interface Branch  { id: number; name: string }
interface Props   { doctors: Doctor[]; branches: Branch[] }

const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => {
    const h = Math.floor(i / 2) + 9;
    const m = i % 2 === 0 ? '00' : '30';
    return `${String(h).padStart(2, '0')}:${m}`;
});

const SERVICES = ['Ерөнхий үзлэг', 'Эмчилгээний зөвлөгөө', 'Invisalign', 'Цайруулалт', 'Имплант', 'Брекет', 'Хүүхдийн шүдний эмчилгээ'];

export default function BookingPage({ doctors, branches }: Props) {
    const { props } = usePage<{ flash?: { booking_success?: string } }>();

    const { data, setData, post, processing, errors, reset } = useForm<{
        patient_name: string;
        patient_phone: string;
        patient_email: string;
        branch_id: string;
        doctor_id: string;
        service: string;
        type: 'online' | 'in_person';
        appointment_date: string;
        appointment_time: string;
        notes: string;
    }>({
        patient_name: '',
        patient_phone: '',
        patient_email: '',
        branch_id: '',
        doctor_id: '',
        service: '',
        type: 'online',
        appointment_date: '',
        appointment_time: '10:00',
        notes: '',
    });

    const filteredDoctors = useMemo(
        () => data.branch_id ? doctors.filter(d => String(d.branch_id) === data.branch_id) : doctors,
        [data.branch_id, doctors],
    );

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/booking', { onSuccess: () => reset() });
    }

    const today = new Date().toISOString().split('T')[0];

    return (
        <>
            <Head title="Цаг захиалах" />

            <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
                {/* Hero */}
                <div className="bg-white dark:bg-zinc-900 border-b">
                    <div className="mx-auto max-w-3xl px-4 py-10 text-center">
                        <div className="mb-3 flex justify-center">
                            <div className="flex size-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
                                <CalendarClock className="size-7 text-red-600" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold">Онлайн цаг захиалах</h1>
                        <p className="mt-2 text-muted-foreground">Эмч сонгоод тохирох цагаа захиалаарай. Бид таны хүсэлтийг хүлээн авмагц холбогдоно.</p>
                    </div>
                </div>

                <div className="mx-auto max-w-3xl px-4 py-10">
                    {/* Success */}
                    {props.flash?.booking_success && (
                        <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950/40">
                            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
                            <div>
                                <p className="font-semibold text-green-800 dark:text-green-300">Захиалга амжилттай илгээгдлээ!</p>
                                <p className="mt-0.5 text-sm text-green-700 dark:text-green-400">
                                    Таны захиалгын дугаар: <strong>{props.flash.booking_success}</strong>
                                </p>
                                <p className="mt-0.5 text-sm text-green-700 dark:text-green-400">
                                    Бид тантай удахгүй холбогдох болно.
                                </p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-6">
                        {/* Type */}
                        <div className="rounded-xl border bg-white p-6 dark:bg-zinc-900 space-y-4">
                            <h2 className="font-semibold">Үзлэгийн төрөл сонгох</h2>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {([
                                    { value: 'online',    label: 'Онлайн үзлэг',  desc: 'Видео дуудлагаар зөвлөгөө авах', icon: '💻' },
                                    { value: 'in_person', label: 'Биечлэн үзлэг', desc: 'Клиникт ирж үзлэгт орох',         icon: '🏥' },
                                ] as const).map(({ value, label, desc, icon }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setData('type', value)}
                                        className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                                            data.type === value
                                                ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                                                : 'border-border hover:border-red-200'
                                        }`}
                                    >
                                        <span className="text-2xl">{icon}</span>
                                        <div>
                                            <p className="font-semibold">{label}</p>
                                            <p className="text-sm text-muted-foreground">{desc}</p>
                                        </div>
                                        {data.type === value && (
                                            <CheckCircle2 className="ml-auto size-5 shrink-0 text-red-500" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Doctor / Branch */}
                        <div className="rounded-xl border bg-white p-6 dark:bg-zinc-900 space-y-4">
                            <h2 className="font-semibold">Эмч сонгох</h2>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Салбар</label>
                                <select
                                    value={data.branch_id}
                                    onChange={e => { setData('branch_id', e.target.value); setData('doctor_id', ''); }}
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="">Бүх салбар</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Эмч</label>
                                <select
                                    value={data.doctor_id}
                                    onChange={e => setData('doctor_id', e.target.value)}
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="">Эмч сонгох</option>
                                    {filteredDoctors.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}{d.specialization ? ` — ${d.specialization}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Үйлчилгээний төрөл</label>
                                <div className="flex flex-wrap gap-2">
                                    {SERVICES.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setData('service', data.service === s ? '' : s)}
                                            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                                                data.service === s
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Date / Time */}
                        <div className="rounded-xl border bg-white p-6 dark:bg-zinc-900 space-y-4">
                            <h2 className="font-semibold">Цаг сонгох</h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Огноо *</label>
                                    <input
                                        type="date"
                                        value={data.appointment_date}
                                        onChange={e => setData('appointment_date', e.target.value)}
                                        min={today}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                    {errors.appointment_date && <p className="text-xs text-red-500">{errors.appointment_date}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Цаг *</label>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {TIME_SLOTS.map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setData('appointment_time', t)}
                                                className={`rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                                                    data.appointment_time === t
                                                        ? 'border-red-500 bg-red-600 text-white'
                                                        : 'hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30'
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Patient info */}
                        <div className="rounded-xl border bg-white p-6 dark:bg-zinc-900 space-y-4">
                            <h2 className="font-semibold">Таны мэдээлэл</h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Нэр *</label>
                                    <input
                                        type="text"
                                        value={data.patient_name}
                                        onChange={e => setData('patient_name', e.target.value)}
                                        placeholder="Овог нэр"
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                    {errors.patient_name && <p className="text-xs text-red-500">{errors.patient_name}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Утасны дугаар *</label>
                                    <input
                                        type="tel"
                                        value={data.patient_phone}
                                        onChange={e => setData('patient_phone', e.target.value)}
                                        placeholder="+976 9900 0000"
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                    {errors.patient_phone && <p className="text-xs text-red-500">{errors.patient_phone}</p>}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">И-мэйл</label>
                                <input
                                    type="email"
                                    value={data.patient_email}
                                    onChange={e => setData('patient_email', e.target.value)}
                                    placeholder="example@mail.com"
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Нэмэлт мэдээлэл</label>
                                <textarea
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    rows={3}
                                    placeholder="Асуулт, хүсэлт эсвэл тайлбар..."
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                        </div>

                        {/* Summary + Submit */}
                        {data.appointment_date && data.appointment_time && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
                                <p className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">Захиалгын мэдээлэл</p>
                                <div className="space-y-1 text-sm">
                                    <p className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                        <Clock className="size-4" />
                                        {data.appointment_date} — {data.appointment_time}
                                    </p>
                                    {data.type && (
                                        <p className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                            <Monitor className="size-4" />
                                            {data.type === 'online' ? 'Онлайн үзлэг' : 'Биечлэн үзлэг'}
                                        </p>
                                    )}
                                    {data.doctor_id && (
                                        <p className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                            <User className="size-4" />
                                            {doctors.find(d => String(d.id) === data.doctor_id)?.name ?? ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={processing}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-base font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                            {processing ? 'Илгээж байна...' : (
                                <>Цаг захиалах <ChevronRight className="size-5" /></>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
