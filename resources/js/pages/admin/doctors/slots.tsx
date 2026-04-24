import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Calendar, CalendarPlus, CheckCircle2, ChevronLeft, Clock, Edit2, Plus, Trash2, User, UserRound, X,
} from 'lucide-react';
import { useState } from 'react';

interface Slot {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    is_booked: boolean;
}

interface Doctor {
    id: number;
    name: string;
    specialization: string | null;
    email: string | null;
    photo_url: string | null;
}

interface Props {
    doctor: Doctor;
    slots: Slot[];
}

function formatDate(d: string) {
    return new Date(d + 'T00:00').toLocaleDateString('mn-MN', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });
}

const today = new Date().toISOString().slice(0, 10);

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ slot, doctorId, onClose }: { slot: Slot; doctorId: number; onClose: () => void }) {
    const { data, setData, put, processing, errors } = useForm({
        date:       slot.date,
        start_time: slot.start_time,
        end_time:   slot.end_time,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        put(`/admin/doctors/${doctorId}/slots/${slot.id}`, {
            onSuccess: onClose,
        });
    }

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl overflow-hidden border">
                    {/* Header */}
                    <div className="border-b">
                        <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-400" />
                        <div className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/40">
                                    <Edit2 className="size-3.5 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="font-bold">Цаг засах</h3>
                            </div>
                            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors"><X className="size-4" /></button>
                        </div>
                    </div>
                    <form onSubmit={submit} className="p-5 space-y-4">
                        {/* Date */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-sm font-semibold">
                                <Calendar className="size-3.5 text-muted-foreground" /> Огноо
                            </label>
                            <input type="date" value={data.date} onChange={e => setData('date', e.target.value)}
                                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>
                            {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                            {data.date && (
                                <p className="text-xs text-muted-foreground">
                                    {new Date(data.date + 'T00:00').toLocaleDateString('mn-MN', { year:'numeric', month:'long', day:'numeric', weekday:'long' })}
                                </p>
                            )}
                        </div>
                        {/* Time */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-sm font-semibold">
                                <Clock className="size-3.5 text-muted-foreground" /> Цаг
                            </label>
                            <div className="rounded-xl border bg-muted/20 p-3 space-y-2.5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Эхлэх</p>
                                        <input type="time" value={data.start_time} onChange={e => setData('start_time', e.target.value)}
                                            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-400"/>
                                        {errors.start_time && <p className="text-xs text-red-500">{errors.start_time}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Дуусах</p>
                                        <input type="time" value={data.end_time} onChange={e => setData('end_time', e.target.value)}
                                            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-400"/>
                                        {errors.end_time && <p className="text-xs text-red-500">{errors.end_time}</p>}
                                    </div>
                                </div>
                                {data.start_time && data.end_time && (() => {
                                    const [sh, sm] = data.start_time.split(':').map(Number);
                                    const [eh, em] = data.end_time.split(':').map(Number);
                                    const diff = (eh * 60 + em) - (sh * 60 + sm);
                                    if (diff <= 0) return null;
                                    return (
                                        <div className="flex items-center justify-center gap-2 rounded-lg bg-background border px-3 py-1.5">
                                            <span className="text-sm font-bold">{data.start_time}</span>
                                            <span className="text-muted-foreground text-xs">—</span>
                                            <span className="text-sm font-bold">{data.end_time}</span>
                                            <span className="ml-1 rounded-full bg-green-100 dark:bg-green-950/40 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">
                                                {diff >= 60 ? `${Math.floor(diff/60)} цаг${diff%60 ? ` ${diff%60} мин` : ''}` : `${diff} мин`}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button type="submit" disabled={processing}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
                                {processing ? 'Хадгалж байна...' : 'Хадгалах'}
                            </button>
                            <button type="button" onClick={onClose}
                                className="flex-1 border text-sm py-2.5 rounded-xl hover:bg-muted transition-colors font-medium">
                                Цуцлах
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DoctorSlotsPage({ doctor, slots }: Props) {
    const { props } = usePage<{ flash?: { success?: string }; errors?: Record<string, string> }>();
    const [editSlot, setEditSlot] = useState<Slot | null>(null);

    const { data, setData, post, processing, errors: addErrors, reset } = useForm({
        date:       '',
        start_time: '',
        end_time:   '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Админ',          href: '/admin/dashboard' },
        { title: 'Эмч нар',        href: '/admin/doctors' },
        { title: doctor.name,      href: `/admin/doctors/${doctor.id}/edit` },
        { title: 'Онлайн цагууд',  href: '#' },
    ];

    const upcoming = slots.filter(s => s.date >= today);
    const past     = slots.filter(s => s.date < today);

    // Огноогоор бүлэглэх
    function groupByDate(arr: Slot[]): Record<string, Slot[]> {
        return arr.reduce<Record<string, Slot[]>>((acc, s) => {
            (acc[s.date] ??= []).push(s);
            return acc;
        }, {});
    }

    function addSlot(e: React.FormEvent) {
        e.preventDefault();
        post(`/admin/doctors/${doctor.id}/slots`, {
            onSuccess: () => reset(),
        });
    }

    function deleteSlot(slotId: string) {
        if (!confirm('Энэ цагийг устгах уу?')) return;
        router.delete(`/admin/doctors/${doctor.id}/slots/${slotId}`, { preserveScroll: true });
    }

    const upcomingGroups = groupByDate(upcoming);
    const pastGroups     = groupByDate(past);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${doctor.name} — Онлайн цагууд`} />

            {editSlot && (
                <EditModal slot={editSlot} doctorId={doctor.id} onClose={() => setEditSlot(null)} />
            )}

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {/* Doctor avatar */}
                        <div className="size-14 overflow-hidden rounded-full border-2 border-border">
                            {doctor.photo_url ? (
                                <img src={doctor.photo_url} alt={doctor.name} className="h-full w-full object-cover object-top" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900">
                                    <UserRound className="size-7 text-blue-400" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">{doctor.name}</h1>
                            {doctor.specialization && (
                                <p className="text-sm font-medium text-red-600">{doctor.specialization}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Нийт цаг: <strong>{slots.length}</strong>
                                {' · '}Боломжтой: <strong className="text-green-600">{upcoming.filter(s => !s.is_booked).length}</strong>
                                {' · '}Захиалгатай: <strong className="text-orange-500">{slots.filter(s => s.is_booked).length}</strong>
                            </p>
                        </div>
                    </div>
                    <Link href="/admin/doctors"
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                        <ChevronLeft className="size-4" /> Буцах
                    </Link>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">

                    {/* ── Шинэ цаг нэмэх ── */}
                    <div className="lg:col-span-1">
                        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                            {/* Card header */}
                            <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-400" />
                            <div className="p-5">
                                <div className="flex items-center gap-2.5 mb-5">
                                    <div className="flex size-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/40">
                                        <CalendarPlus className="size-4 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-sm">Шинэ цаг нэмэх</h2>
                                        <p className="text-[10px] text-muted-foreground">Эмчийн хуваарийн цаг</p>
                                    </div>
                                </div>
                                <form onSubmit={addSlot} className="space-y-4">
                                    {/* Date */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                            <Calendar className="size-3.5" /> Огноо
                                        </label>
                                        <input type="date" value={data.date}
                                            onChange={e => setData('date', e.target.value)}
                                            min={today}
                                            className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-background font-medium"/>
                                        {addErrors.date && <p className="text-xs text-red-500">{addErrors.date}</p>}
                                        {data.date && (
                                            <p className="text-[10px] text-muted-foreground pl-0.5">
                                                {new Date(data.date + 'T00:00').toLocaleDateString('mn-MN', { year:'numeric', month:'long', day:'numeric', weekday:'long' })}
                                            </p>
                                        )}
                                    </div>

                                    {/* Time range */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                            <Clock className="size-3.5" /> Цагийн хуваарь
                                        </label>
                                        <div className="rounded-xl border bg-muted/20 p-3 space-y-2.5">
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Эхлэх</p>
                                                    <input type="time" value={data.start_time}
                                                        onChange={e => setData('start_time', e.target.value)}
                                                        className="w-full rounded-lg border bg-background px-2 py-2.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-400"/>
                                                    {addErrors.start_time && <p className="text-xs text-red-500">{addErrors.start_time}</p>}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Дуусах</p>
                                                    <input type="time" value={data.end_time}
                                                        onChange={e => setData('end_time', e.target.value)}
                                                        className="w-full rounded-lg border bg-background px-2 py-2.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-400"/>
                                                    {addErrors.end_time && <p className="text-xs text-red-500">{addErrors.end_time}</p>}
                                                </div>
                                            </div>
                                            {/* Duration display */}
                                            {data.start_time && data.end_time && (() => {
                                                const [sh, sm] = data.start_time.split(':').map(Number);
                                                const [eh, em] = data.end_time.split(':').map(Number);
                                                const diff = (eh * 60 + em) - (sh * 60 + sm);
                                                if (diff <= 0) return null;
                                                return (
                                                    <div className="flex items-center justify-center gap-2 rounded-lg bg-background border px-3 py-1.5">
                                                        <span className="text-sm font-bold text-red-600">{data.start_time}</span>
                                                        <span className="text-muted-foreground">—</span>
                                                        <span className="text-sm font-bold">{data.end_time}</span>
                                                        <span className="rounded-full bg-green-100 dark:bg-green-950/40 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">
                                                            {diff >= 60 ? `${Math.floor(diff/60)} цаг${diff%60 ? ` ${diff%60} мин` : ''}` : `${diff} мин`}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                            {/* Common time presets */}
                                            <div>
                                                <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Нийтлэг цагууд</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t => (
                                                        <button key={t} type="button"
                                                            onClick={() => setData('start_time', t)}
                                                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                                                                data.start_time === t
                                                                    ? 'bg-red-600 text-white'
                                                                    : 'bg-background border hover:border-red-300 hover:text-red-600 text-muted-foreground'
                                                            }`}>{t}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" disabled={processing || !data.date || !data.start_time || !data.end_time}
                                        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold py-3 rounded-xl transition-colors shadow-sm">
                                        <Plus className="size-4" />
                                        {processing ? 'Нэмж байна...' : 'Цаг нэмэх'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* ── Цагуудын жагсаалт ── */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Upcoming */}
                        <div>
                            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Calendar className="size-4 text-green-500" />
                                Ирэх цагууд ({upcoming.length})
                            </h2>

                            {upcoming.length === 0 ? (
                                <div className="rounded-xl border-2 border-dashed p-10 text-center">
                                    <Calendar className="size-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">Ирэх цаг байхгүй байна</p>
                                    <p className="text-xs text-muted-foreground mt-1">Зүүн талаас шинэ цаг нэмнэ үү</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {Object.entries(upcomingGroups).sort().map(([date, daySlots]) => (
                                        <div key={date} className="rounded-xl border bg-card overflow-hidden">
                                            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b">
                                                <Calendar className="size-3.5 text-red-500" />
                                                <span className="text-xs font-bold text-muted-foreground">{formatDate(date)}</span>
                                            </div>
                                            <div className="divide-y">
                                                {daySlots.map(slot => (
                                                    <SlotRow key={slot.id} slot={slot}
                                                        onEdit={() => setEditSlot(slot)}
                                                        onDelete={() => deleteSlot(slot.id)} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Past */}
                        {past.length > 0 && (
                            <div>
                                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <Clock className="size-4 text-gray-400" />
                                    Өнгөрсөн цагууд ({past.length})
                                </h2>
                                <div className="space-y-4 opacity-60">
                                    {Object.entries(pastGroups).sort().reverse().map(([date, daySlots]) => (
                                        <div key={date} className="rounded-xl border bg-card overflow-hidden">
                                            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b">
                                                <Calendar className="size-3.5 text-gray-400" />
                                                <span className="text-xs font-bold text-muted-foreground">{formatDate(date)}</span>
                                            </div>
                                            <div className="divide-y">
                                                {daySlots.map(slot => (
                                                    <SlotRow key={slot.id} slot={slot}
                                                        onEdit={() => setEditSlot(slot)}
                                                        onDelete={() => deleteSlot(slot.id)}
                                                        isPast />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

// ── Slot Row ──────────────────────────────────────────────────────────────────
function SlotRow({ slot, onEdit, onDelete, isPast }: {
    slot: Slot;
    onEdit: () => void;
    onDelete: () => void;
    isPast?: boolean;
}) {
    const [sh, sm] = slot.start_time.split(':').map(Number);
    const [eh, em] = slot.end_time.split(':').map(Number);
    const diffMins = (eh * 60 + em) - (sh * 60 + sm);
    const duration = diffMins > 0
        ? (diffMins >= 60 ? `${Math.floor(diffMins/60)}ц${diffMins%60 ? `${diffMins%60}м` : ''}` : `${diffMins}м`)
        : null;

    return (
        <div className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="flex items-center gap-3 min-w-0">
                <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                    slot.is_booked ? 'bg-orange-100 dark:bg-orange-950/30' :
                    isPast ? 'bg-gray-100 dark:bg-gray-800' : 'bg-green-100 dark:bg-green-950/30'
                }`}>
                    <Clock className={`size-3.5 ${
                        slot.is_booked ? 'text-orange-500' :
                        isPast ? 'text-gray-400' : 'text-green-600 dark:text-green-400'
                    }`} />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tabular-nums">
                            {slot.start_time} — {slot.end_time}
                        </span>
                        {duration && (
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
                                {duration}
                            </span>
                        )}
                    </div>
                    <div className="mt-0.5">
                        {slot.is_booked ? (
                            <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full font-semibold">
                                Захиалгатай
                            </span>
                        ) : isPast ? (
                            <span className="text-[10px] bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full font-semibold">
                                Өнгөрсөн
                            </span>
                        ) : (
                            <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold">
                                ✓ Боломжтой
                            </span>
                        )}
                    </div>
                </div>
            </div>
            {!slot.is_booked && (
                <div className="flex shrink-0 gap-1.5">
                    <button onClick={onEdit}
                        className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted hover:border-foreground/30 transition-colors">
                        <Edit2 className="size-3" /> Засах
                    </button>
                    <button onClick={onDelete}
                        className="flex items-center justify-center rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950 transition-colors">
                        <Trash2 className="size-3" />
                    </button>
                </div>
            )}
        </div>
    );
}
