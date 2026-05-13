import ReceptionLayout from '@/layouts/reception-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface OrthoRecord {
    id: number; doctor_id: number;
    archive_code: string | null; card_number: string | null;
    register_number: string | null; last_name: string; first_name: string;
    phone: string | null; attached_date: string | null; removed_date: string | null;
    notes: string | null; is_active: boolean;
}
interface DoctorData {
    id: number; name: string; specialization: string | null;
    records: OrthoRecord[];
}
interface Props { doctors: DoctorData[] }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Ресепшн', href: '/reception/dashboard' },
    { title: 'Ортодонт бүртгэл', href: '/reception/ortho-appliances' },
];

const EMPTY_FORM = {
    doctor_id: '' as string | number,
    archive_code: '', card_number: '', register_number: '',
    last_name: '', first_name: '', phone: '',
    attached_date: '', removed_date: '', notes: '',
};

function RecordRow({ rec, onEdit, onDelete }: {
    rec: OrthoRecord;
    onEdit: (r: OrthoRecord) => void;
    onDelete: (id: number) => void;
}) {
    return (
        <tr className={`border-b border-border/40 text-xs transition-colors hover:bg-muted/20 ${!rec.is_active ? 'opacity-60' : ''}`}>
            <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{rec.archive_code || '—'}</td>
            <td className="px-3 py-2 whitespace-nowrap font-mono">{rec.card_number || '—'}</td>
            <td className="px-3 py-2 whitespace-nowrap font-mono text-muted-foreground">{rec.register_number || '—'}</td>
            <td className="px-3 py-2 whitespace-nowrap font-semibold">{rec.last_name}</td>
            <td className="px-3 py-2 whitespace-nowrap">{rec.first_name}</td>
            <td className="px-3 py-2 whitespace-nowrap">{rec.phone || '—'}</td>
            <td className="px-3 py-2 whitespace-nowrap">{rec.attached_date || '—'}</td>
            <td className="px-3 py-2 whitespace-nowrap">
                {rec.removed_date
                    ? <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{rec.removed_date}</span>
                    : <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">Идэвхтэй</span>
                }
            </td>
            <td className="px-3 py-2 max-w-[120px] truncate text-muted-foreground">{rec.notes || ''}</td>
            <td className="px-3 py-2 whitespace-nowrap">
                <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(rec)}
                        className="rounded p-1 text-muted-foreground hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 transition-colors">
                        <Edit2 className="size-3.5" />
                    </button>
                    <button onClick={() => onDelete(rec.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors">
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

function RecordForm({ doctorId, record, onClose }: {
    doctorId: number; record?: OrthoRecord; onClose: () => void;
}) {
    const isEdit = !!record;
    const { data, setData, post, put, processing, errors, reset } = useForm(
        record ? {
            archive_code:    record.archive_code    ?? '',
            card_number:     record.card_number     ?? '',
            register_number: record.register_number ?? '',
            last_name:       record.last_name,
            first_name:      record.first_name,
            phone:           record.phone           ?? '',
            attached_date:   record.attached_date   ?? '',
            removed_date:    record.removed_date    ?? '',
            notes:           record.notes           ?? '',
        } : {
            doctor_id:       doctorId,
            archive_code:    '', card_number:  '', register_number: '',
            last_name:       '', first_name:   '', phone:           '',
            attached_date:   '', removed_date: '', notes:           '',
        }
    );

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit) {
            put(`/reception/ortho-appliances/${record!.id}`, {
                onSuccess: onClose,
            });
        } else {
            post('/reception/ortho-appliances', {
                onSuccess: () => { reset(); onClose(); },
            });
        }
    }

    const inp = "border-input bg-background w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500";
    const lbl = "block text-xs font-medium text-muted-foreground mb-1";
    const err = "mt-0.5 text-[11px] text-red-500";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-900 shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <h2 className="text-sm font-bold">{isEdit ? 'Бичлэг засах' : 'Шинэ бичлэг нэмэх'}</h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                        <X className="size-4" />
                    </button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className={lbl}>Архив Код</label>
                            <input className={inp} value={data.archive_code} onChange={e => setData('archive_code', e.target.value)} placeholder="H, A..." />
                        </div>
                        <div>
                            <label className={lbl}>Картны дугаар</label>
                            <input className={inp} value={data.card_number} onChange={e => setData('card_number', e.target.value)} placeholder="001" />
                            {errors.card_number && <p className={err}>{errors.card_number}</p>}
                        </div>
                        <div>
                            <label className={lbl}>РД (Регистр)</label>
                            <input className={inp} value={data.register_number} onChange={e => setData('register_number', e.target.value)} placeholder="УБ12345678" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={lbl}>Овог *</label>
                            <input className={inp} value={data.last_name} onChange={e => setData('last_name', e.target.value)} placeholder="Батбаяр" required />
                            {errors.last_name && <p className={err}>{errors.last_name}</p>}
                        </div>
                        <div>
                            <label className={lbl}>Нэр *</label>
                            <input className={inp} value={data.first_name} onChange={e => setData('first_name', e.target.value)} placeholder="Энхжаргал" required />
                            {errors.first_name && <p className={err}>{errors.first_name}</p>}
                        </div>
                    </div>
                    <div>
                        <label className={lbl}>Утас</label>
                        <input className={inp} value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="9911 2233" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={lbl}>Зүүсэн он сар өдөр</label>
                            <input type="date" className={inp} value={data.attached_date} onChange={e => setData('attached_date', e.target.value)} />
                            {errors.attached_date && <p className={err}>{errors.attached_date}</p>}
                        </div>
                        <div>
                            <label className={lbl}>Салгасан он сар өдөр</label>
                            <input type="date" className={inp} value={data.removed_date} onChange={e => setData('removed_date', e.target.value)} />
                            {errors.removed_date && <p className={err}>{errors.removed_date}</p>}
                        </div>
                    </div>
                    <div>
                        <label className={lbl}>Тэмдэглэл</label>
                        <textarea className={inp} rows={2} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border px-4 py-2 text-xs font-medium hover:bg-muted transition-colors">
                            Болих
                        </button>
                        <button type="submit" disabled={processing}
                            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                            <Save className="size-3.5" />
                            {isEdit ? 'Хадгалах' : 'Нэмэх'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function OrthoAppliancesIndex({ doctors }: Props) {
    const [activeTab, setActiveTab]   = useState(doctors[0]?.id ?? null);
    const [showForm, setShowForm]     = useState(false);
    const [editRecord, setEditRecord] = useState<OrthoRecord | undefined>();

    const doctor = doctors.find(d => d.id === activeTab);
    const active   = doctor?.records.filter(r => r.is_active)  ?? [];
    const removed  = doctor?.records.filter(r => !r.is_active) ?? [];

    function handleDelete(id: number) {
        if (!confirm('Устгах уу?')) return;
        router.delete(`/reception/ortho-appliances/${id}`, { preserveScroll: true });
    }

    function openEdit(rec: OrthoRecord) {
        setEditRecord(rec);
        setShowForm(true);
    }

    function closeForm() {
        setShowForm(false);
        setEditRecord(undefined);
    }

    const thCls = "px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap";

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Ортодонт бүртгэл" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Ортодонтийн аппарат бүртгэл</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">Гажиг заслын эмч нарын аппарат бүртгэл</p>
                    </div>
                    {doctor && (
                        <button onClick={() => { setEditRecord(undefined); setShowForm(true); }}
                            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
                            <Plus className="size-4" /> Шинэ бичлэг
                        </button>
                    )}
                </div>

                {doctors.length === 0 ? (
                    <div className="rounded-2xl border bg-card p-12 text-center">
                        <p className="text-sm text-muted-foreground">Гажиг заслын их эмч олдсонгүй.</p>
                        <p className="text-xs text-muted-foreground mt-1">Эмчийн мэргэжилд "Гажиг засал" гэж тохируулна уу.</p>
                    </div>
                ) : (
                    <>
                        {/* Doctor tabs */}
                        <div className="flex flex-wrap gap-2">
                            {doctors.map(d => (
                                <button key={d.id} onClick={() => setActiveTab(d.id)}
                                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                                        activeTab === d.id
                                            ? 'bg-red-600 text-white shadow-sm'
                                            : 'border bg-card text-foreground hover:bg-muted'
                                    }`}>
                                    {d.name}
                                    <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                        activeTab === d.id ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {d.records.filter(r => r.is_active).length}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {doctor && (
                            <div className="space-y-5">
                                {/* ── Active table ── */}
                                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 border-b bg-amber-50/50 dark:bg-amber-950/10">
                                        <div>
                                            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Аппарат зүүсэн — идэвхтэй</p>
                                            <p className="text-xs text-muted-foreground">{active.length} хүн</p>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-xs">
                                            <thead>
                                                <tr className="border-b bg-muted/20">
                                                    <th className={thCls}>Архив Код</th>
                                                    <th className={thCls}>Картны №</th>
                                                    <th className={thCls}>РД</th>
                                                    <th className={thCls}>Овог</th>
                                                    <th className={thCls}>Нэр</th>
                                                    <th className={thCls}>Утас</th>
                                                    <th className={thCls}>Зүүсэн өдөр</th>
                                                    <th className={thCls}>Салгасан өдөр</th>
                                                    <th className={thCls}>Тэмдэглэл</th>
                                                    <th className={thCls}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {active.length === 0 ? (
                                                    <tr><td colSpan={10} className="px-4 py-6 text-center text-xs text-muted-foreground">Идэвхтэй бичлэг байхгүй</td></tr>
                                                ) : active.map(r => (
                                                    <RecordRow key={r.id} rec={r} onEdit={openEdit} onDelete={handleDelete} />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* ── Removed table ── */}
                                {removed.length > 0 && (
                                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 border-b bg-emerald-50/50 dark:bg-emerald-950/10">
                                            <div>
                                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Аппарат салгасан — дууссан</p>
                                                <p className="text-xs text-muted-foreground">{removed.length} хүн</p>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse text-xs">
                                                <thead>
                                                    <tr className="border-b bg-muted/20">
                                                        <th className={thCls}>Архив Код</th>
                                                        <th className={thCls}>Картны №</th>
                                                        <th className={thCls}>РД</th>
                                                        <th className={thCls}>Овог</th>
                                                        <th className={thCls}>Нэр</th>
                                                        <th className={thCls}>Утас</th>
                                                        <th className={thCls}>Зүүсэн өдөр</th>
                                                        <th className={thCls}>Салгасан өдөр</th>
                                                        <th className={thCls}>Тэмдэглэл</th>
                                                        <th className={thCls}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {removed.map(r => (
                                                        <RecordRow key={r.id} rec={r} onEdit={openEdit} onDelete={handleDelete} />
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {showForm && doctor && (
                <RecordForm
                    doctorId={doctor.id}
                    record={editRecord}
                    onClose={closeForm}
                />
            )}
        </ReceptionLayout>
    );
}
