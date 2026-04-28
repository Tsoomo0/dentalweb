import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { type FormEvent, useMemo } from 'react';

interface Doctor  { id: number; name: string; specialization: string | null; branch_id: number | null }
interface Branch  { id: number; name: string }
interface Props   { doctors: Doctor[]; branches: Branch[] }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Цаг захиалга', href: '/admin/appointments' },
    { title: 'Шинэ цаг', href: '/admin/appointments/create' },
];

const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => {
    const h = Math.floor(i / 2) + 9;
    const m = i % 2 === 0 ? '00' : '30';
    return `${String(h).padStart(2, '0')}:${m}`;
});

const SERVICES = ['Ерөнхий үзлэг', 'Эмчилгээний зөвлөгөө', 'Invisalign', 'Цайруулалт', 'Имплант', 'Брекет', 'Хүүхдийн шүдний эмчилгээ'];

export default function AppointmentCreate({ doctors, branches }: Props) {
    const { data, setData, post, processing, errors } = useForm<{
        patient_name: string;
        patient_phone: string;
        patient_email: string;
        branch_id: string;
        doctor_id: string;
        service: string;
        type: 'online' | 'in_person';
        appointment_date: string;
        appointment_time: string;
        status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
        notes: string;
        admin_notes: string;
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
        status: 'confirmed',
        notes: '',
        admin_notes: '',
    });

    const filteredDoctors = useMemo(
        () => data.branch_id ? doctors.filter(d => String(d.branch_id) === data.branch_id) : doctors,
        [data.branch_id, doctors],
    );

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/admin/appointments');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Шинэ цаг нэмэх" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/appointments" className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-5" />
                    </Link>
                    <h1 className="text-xl font-bold">Шинэ цаг нэмэх</h1>
                </div>

                <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
                    {/* Left — patient */}
                    <div className="space-y-5 lg:col-span-2">
                        <div className="rounded-xl border p-5 space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Үйлчлүүлэгчийн мэдээлэл</p>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Нэр *</label>
                                    <input
                                        type="text"
                                        value={data.patient_name}
                                        onChange={e => setData('patient_name', e.target.value)}
                                        placeholder="Овог нэр"
                                        autoFocus
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
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
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
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
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Тэмдэглэл (үйлчлүүлэгч)</label>
                                <textarea
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    rows={2}
                                    placeholder="Үйлчлүүлэгчийн хүсэлт, тэмдэглэл..."
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Админы тэмдэглэл</label>
                                <textarea
                                    value={data.admin_notes}
                                    onChange={e => setData('admin_notes', e.target.value)}
                                    rows={2}
                                    placeholder="Дотоод тэмдэглэл..."
                                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                        </div>

                        {/* Date / Time */}
                        <div className="rounded-xl border p-5 space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Цаг хугацаа</p>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Огноо *</label>
                                    <input
                                        type="date"
                                        value={data.appointment_date}
                                        onChange={e => setData('appointment_date', e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                    {errors.appointment_date && <p className="text-xs text-red-500">{errors.appointment_date}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Цаг *</label>
                                    <select
                                        value={data.appointment_time}
                                        onChange={e => setData('appointment_time', e.target.value)}
                                        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Type */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Үзлэгийн төрөл</label>
                                <div className="flex gap-3">
                                    {([
                                        { value: 'online',    label: 'Онлайн үзлэг',  desc: 'Видео дуудлагаар' },
                                        { value: 'in_person', label: 'Биечлэн үзлэг', desc: 'Клиникт ирж' },
                                    ] as const).map(({ value, label, desc }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setData('type', value)}
                                            className={`flex flex-1 items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
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
                            </div>
                        </div>
                    </div>

                    {/* Right — doctor & status */}
                    <div className="space-y-5">
                        {/* Doctor */}
                        <div className="rounded-xl border p-5 space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Эмч / Салбар</p>

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
                                {errors.doctor_id && <p className="text-xs text-red-500">{errors.doctor_id}</p>}
                            </div>

                        </div>

                        {/* Status */}
                        <div className="rounded-xl border p-5 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Захиалгын төлөв</p>
                            {([
                                { value: 'pending',   label: 'Хүлээгдэж байна', dot: 'bg-yellow-500' },
                                { value: 'confirmed', label: 'Баталгаажсан',     dot: 'bg-green-500' },
                                { value: 'cancelled', label: 'Цуцлагдсан',       dot: 'bg-red-500' },
                                { value: 'completed', label: 'Дууссан',           dot: 'bg-blue-500' },
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

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {processing ? 'Хадгалж байна...' : 'Хадгалах'}
                            </button>
                            <Link href="/admin/appointments" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                                Цуцлах
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
