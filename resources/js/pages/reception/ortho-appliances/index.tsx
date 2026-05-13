import ReceptionLayout from '@/layouts/reception-layout';
import { shortDoctorName } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Check, Download, Plus, Trash2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface OrthoRecord {
    id: number;
    doctor_id: number;
    appliance_type: 'removable' | 'fixed';
    archive_code: string;
    card_number: string;
    register_number: string;
    last_name: string;
    first_name: string;
    phone: string;
    attached_date: string;
    removed_date: string;
    notes: string;
    is_active: boolean;
}

interface DoctorData {
    id: number;
    name: string;
    specialization: string | null;
    records: OrthoRecord[];
}

interface Props { doctors: DoctorData[] }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Ресепшн', href: '/reception/dashboard' },
    { title: 'Ортодонт бүртгэл', href: '/reception/ortho-appliances' },
];

type NewRow = {
    _key: string;
    isNew: true;
    doctor_id: number;
    appliance_type: 'removable' | 'fixed';
    archive_code: string; card_number: string; register_number: string;
    last_name: string; first_name: string; phone: string;
    attached_date: string; removed_date: string; notes: string;
};

type EditState = Record<number, Partial<OrthoRecord>>;

const inp = "border border-input bg-background rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400 w-full min-w-0";
const thCls = "px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap";

function emptyNew(doctorId: number, type: 'removable' | 'fixed'): NewRow {
    return {
        _key: `${Date.now()}-${Math.random()}`,
        isNew: true,
        doctor_id: doctorId,
        appliance_type: type,
        archive_code: '', card_number: '', register_number: '',
        last_name: '', first_name: '', phone: '',
        attached_date: '', removed_date: '', notes: '',
    };
}

/* ── Inline-editable table for one appliance type ── */
function ApplianceTable({
    type, records, doctorId, editState, setEditState, newRows, setNewRows,
}: {
    type: 'removable' | 'fixed';
    records: OrthoRecord[];
    doctorId: number;
    editState: EditState;
    setEditState: React.Dispatch<React.SetStateAction<EditState>>;
    newRows: NewRow[];
    setNewRows: React.Dispatch<React.SetStateAction<NewRow[]>>;
}) {
    const typeRows  = records.filter(r => r.appliance_type === type);
    const typeNew   = newRows.filter(n => n.appliance_type === type && n.doctor_id === doctorId);
    const isRemovable = type === 'removable';

    const headerColor = isRemovable
        ? 'bg-sky-50/60 dark:bg-sky-950/15 border-sky-200/60 dark:border-sky-800/30'
        : 'bg-violet-50/60 dark:bg-violet-950/15 border-violet-200/60 dark:border-violet-800/30';
    const headerText = isRemovable
        ? 'text-sky-700 dark:text-sky-400'
        : 'text-violet-700 dark:text-violet-400';
    const addBtnColor = isRemovable
        ? 'text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 border-sky-200 dark:border-sky-800'
        : 'text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 border-violet-200 dark:border-violet-800';
    const label = isRemovable ? 'Авагддаг аппарат' : 'Авагддаггүй аппарат';
    const totalActive = typeRows.filter(r => r.is_active).length;

    function setField(id: number, field: keyof OrthoRecord, value: string) {
        setEditState(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    }

    function setNewField(key: string, field: keyof NewRow, value: string) {
        setNewRows(prev => prev.map(n => n._key === key ? { ...n, [field]: value } : n));
    }

    function saveRow(r: OrthoRecord) {
        const patch = editState[r.id];
        if (!patch || Object.keys(patch).length === 0) return;
        router.put(`/reception/ortho-appliances/${r.id}`,
            { ...r, ...patch },
            { preserveScroll: true, onSuccess: () => setEditState(prev => { const n = { ...prev }; delete n[r.id]; return n; }) }
        );
    }

    function saveNew(n: NewRow) {
        if (!n.last_name.trim() || !n.first_name.trim()) return;
        router.post('/reception/ortho-appliances',
            { doctor_id: n.doctor_id, appliance_type: n.appliance_type, archive_code: n.archive_code,
              card_number: n.card_number, register_number: n.register_number, last_name: n.last_name,
              first_name: n.first_name, phone: n.phone, attached_date: n.attached_date,
              removed_date: n.removed_date, notes: n.notes },
            { preserveScroll: true, onSuccess: () => setNewRows(prev => prev.filter(x => x._key !== n._key)) }
        );
    }

    function deleteRow(id: number) {
        if (!confirm('Устгах уу?')) return;
        router.delete(`/reception/ortho-appliances/${id}`, { preserveScroll: true });
    }

    function cancelNew(key: string) {
        setNewRows(prev => prev.filter(n => n._key !== key));
    }

    function cancelEdit(id: number) {
        setEditState(prev => { const n = { ...prev }; delete n[id]; return n; });
    }

    const val = (r: OrthoRecord, f: keyof OrthoRecord) =>
        editState[r.id]?.[f] !== undefined ? String(editState[r.id][f]) : String(r[f]);

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className={`flex items-center justify-between px-4 py-2.5 border-b ${headerColor}`}>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${headerText}`}>{label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isRemovable ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400' : 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400'}`}>
                        {totalActive} идэвхтэй
                    </span>
                    {typeRows.filter(r => !r.is_active).length > 0 && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                            {typeRows.filter(r => !r.is_active).length} дууссан
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setNewRows(prev => [...prev, emptyNew(doctorId, type)])}
                    className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${addBtnColor}`}>
                    <Plus className="size-3" /> Нэмэх
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                    <thead>
                        <tr className="border-b bg-muted/20">
                            <th className={thCls}>#</th>
                            <th className={thCls}>Архив</th>
                            <th className={thCls}>Карт №</th>
                            <th className={thCls}>РД</th>
                            <th className={thCls}>Овог</th>
                            <th className={thCls}>Нэр</th>
                            <th className={thCls}>Утас</th>
                            <th className={thCls}>Зүүсэн</th>
                            <th className={thCls}>Салгасан</th>
                            <th className={thCls}>Тэмдэглэл</th>
                            <th className={thCls + " w-16"}></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {typeRows.length === 0 && typeNew.length === 0 && (
                            <tr>
                                <td colSpan={11} className="px-4 py-5 text-center text-xs text-muted-foreground">
                                    Бичлэг байхгүй — "Нэмэх" дарж шинэ бичлэг оруулна уу
                                </td>
                            </tr>
                        )}

                        {typeRows.map((r, i) => {
                            const isDirty = !!editState[r.id] && Object.keys(editState[r.id]).length > 0;
                            const rowBg = !r.is_active ? 'opacity-60 bg-muted/10' : isDirty ? 'bg-amber-50/40 dark:bg-amber-950/10' : '';
                            return (
                                <tr key={r.id} className={`transition-colors hover:bg-muted/20 ${rowBg}`}>
                                    <td className="px-2 py-1.5 text-muted-foreground w-8">{i + 1}</td>
                                    <td className="px-1 py-1 w-20">
                                        <input className={inp} value={val(r, 'archive_code')}
                                            onChange={e => setField(r.id, 'archive_code', e.target.value)} placeholder="—" />
                                    </td>
                                    <td className="px-1 py-1 w-24">
                                        <input className={inp + " font-mono"} value={val(r, 'card_number')}
                                            onChange={e => setField(r.id, 'card_number', e.target.value)} placeholder="—" />
                                    </td>
                                    <td className="px-1 py-1 w-28">
                                        <input className={inp + " font-mono"} value={val(r, 'register_number')}
                                            onChange={e => setField(r.id, 'register_number', e.target.value)} placeholder="—" />
                                    </td>
                                    <td className="px-1 py-1 w-24">
                                        <input className={inp + " font-semibold"} value={val(r, 'last_name')}
                                            onChange={e => setField(r.id, 'last_name', e.target.value)} placeholder="Овог *" />
                                    </td>
                                    <td className="px-1 py-1 w-24">
                                        <input className={inp} value={val(r, 'first_name')}
                                            onChange={e => setField(r.id, 'first_name', e.target.value)} placeholder="Нэр *" />
                                    </td>
                                    <td className="px-1 py-1 w-28">
                                        <input className={inp} value={val(r, 'phone')}
                                            onChange={e => setField(r.id, 'phone', e.target.value)} placeholder="—" />
                                    </td>
                                    <td className="px-1 py-1 w-28">
                                        <input type="date" className={inp} value={val(r, 'attached_date')}
                                            onChange={e => setField(r.id, 'attached_date', e.target.value)} />
                                    </td>
                                    <td className="px-1 py-1 w-28">
                                        <input type="date" className={inp} value={val(r, 'removed_date')}
                                            onChange={e => setField(r.id, 'removed_date', e.target.value)} />
                                    </td>
                                    <td className="px-1 py-1">
                                        <input className={inp} value={val(r, 'notes')}
                                            onChange={e => setField(r.id, 'notes', e.target.value)} placeholder="—" />
                                    </td>
                                    <td className="px-2 py-1 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            {isDirty ? (
                                                <>
                                                    <button onClick={() => saveRow(r)} title="Хадгалах"
                                                        className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                                                        <Check className="size-3.5" />
                                                    </button>
                                                    <button onClick={() => cancelEdit(r.id)} title="Болих"
                                                        className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors">
                                                        <X className="size-3.5" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => deleteRow(r.id)} title="Устгах"
                                                    className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors">
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {typeNew.map((n, i) => (
                            <tr key={n._key} className="bg-amber-50/30 dark:bg-amber-950/10">
                                <td className="px-2 py-1.5 text-muted-foreground w-8">{typeRows.length + i + 1}</td>
                                <td className="px-1 py-1 w-20">
                                    <input className={inp} value={n.archive_code} autoFocus={i === 0}
                                        onChange={e => setNewField(n._key, 'archive_code', e.target.value)} placeholder="—" />
                                </td>
                                <td className="px-1 py-1 w-24">
                                    <input className={inp + " font-mono"} value={n.card_number}
                                        onChange={e => setNewField(n._key, 'card_number', e.target.value)} placeholder="—" />
                                </td>
                                <td className="px-1 py-1 w-28">
                                    <input className={inp + " font-mono"} value={n.register_number}
                                        onChange={e => setNewField(n._key, 'register_number', e.target.value)} placeholder="—" />
                                </td>
                                <td className="px-1 py-1 w-24">
                                    <input className={inp + " font-semibold"} value={n.last_name}
                                        onChange={e => setNewField(n._key, 'last_name', e.target.value)} placeholder="Овог *" />
                                </td>
                                <td className="px-1 py-1 w-24">
                                    <input className={inp} value={n.first_name}
                                        onChange={e => setNewField(n._key, 'first_name', e.target.value)} placeholder="Нэр *" />
                                </td>
                                <td className="px-1 py-1 w-28">
                                    <input className={inp} value={n.phone}
                                        onChange={e => setNewField(n._key, 'phone', e.target.value)} placeholder="—" />
                                </td>
                                <td className="px-1 py-1 w-28">
                                    <input type="date" className={inp} value={n.attached_date}
                                        onChange={e => setNewField(n._key, 'attached_date', e.target.value)} />
                                </td>
                                <td className="px-1 py-1 w-28">
                                    <input type="date" className={inp} value={n.removed_date}
                                        onChange={e => setNewField(n._key, 'removed_date', e.target.value)} />
                                </td>
                                <td className="px-1 py-1">
                                    <input className={inp} value={n.notes}
                                        onChange={e => setNewField(n._key, 'notes', e.target.value)} placeholder="—" />
                                </td>
                                <td className="px-2 py-1 whitespace-nowrap">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => saveNew(n)} title="Хадгалах"
                                            className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                                            <Check className="size-3.5" />
                                        </button>
                                        <button onClick={() => cancelNew(n._key)} title="Болих"
                                            className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors">
                                            <X className="size-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ── "Бүгд" combined read-only view ── */
function AllView({ doctors }: { doctors: DoctorData[] }) {
    const all = doctors.flatMap(d => d.records.map(r => ({ ...r, doctorName: d.name })));
    const active  = all.filter(r => r.is_active);
    const removed = all.filter(r => !r.is_active);

    return (
        <div className="space-y-5">
            <SummaryTable title="Идэвхтэй бүртгэл" rows={active} colorClass="amber" showRemoved={false} />
            {removed.length > 0 && (
                <SummaryTable title="Дууссан бүртгэл" rows={removed} colorClass="emerald" showRemoved={true} />
            )}
        </div>
    );
}

function SummaryTable({ title, rows, colorClass, showRemoved }: {
    title: string;
    rows: (OrthoRecord & { doctorName: string })[];
    colorClass: 'amber' | 'emerald';
    showRemoved: boolean;
}) {
    const hdr = colorClass === 'amber'
        ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-800/30 text-amber-700 dark:text-amber-400'
        : 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400';

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${hdr}`}>
                <span className="text-sm font-bold">{title}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${colorClass === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                    {rows.length}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                    <thead>
                        <tr className="border-b bg-muted/20">
                            <th className={thCls}>#</th>
                            <th className={thCls}>Эмч</th>
                            <th className={thCls}>Аппарат</th>
                            <th className={thCls}>Архив</th>
                            <th className={thCls}>Карт №</th>
                            <th className={thCls}>РД</th>
                            <th className={thCls}>Овог</th>
                            <th className={thCls}>Нэр</th>
                            <th className={thCls}>Утас</th>
                            <th className={thCls}>Зүүсэн</th>
                            {showRemoved && <th className={thCls}>Салгасан</th>}
                            <th className={thCls}>Тэмдэглэл</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {rows.length === 0 ? (
                            <tr><td colSpan={showRemoved ? 12 : 11} className="px-4 py-6 text-center text-muted-foreground">Бичлэг байхгүй</td></tr>
                        ) : rows.map((r, i) => (
                            <tr key={r.id} className={`hover:bg-muted/20 transition-colors ${!r.is_active ? 'opacity-70' : ''}`}>
                                <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                                <td className="px-2 py-1.5 font-medium whitespace-nowrap">{shortDoctorName(r.doctorName)}</td>
                                <td className="px-2 py-1.5">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.appliance_type === 'removable' ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400' : 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400'}`}>
                                        {r.appliance_type === 'removable' ? 'Авагддаг' : 'Авагддаггүй'}
                                    </span>
                                </td>
                                <td className="px-2 py-1.5">{r.archive_code || '—'}</td>
                                <td className="px-2 py-1.5 font-mono">{r.card_number || '—'}</td>
                                <td className="px-2 py-1.5 font-mono text-muted-foreground">{r.register_number || '—'}</td>
                                <td className="px-2 py-1.5 font-semibold">{r.last_name}</td>
                                <td className="px-2 py-1.5">{r.first_name}</td>
                                <td className="px-2 py-1.5">{r.phone || '—'}</td>
                                <td className="px-2 py-1.5 whitespace-nowrap">{r.attached_date || '—'}</td>
                                {showRemoved && (
                                    <td className="px-2 py-1.5 whitespace-nowrap">
                                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                            {r.removed_date}
                                        </span>
                                    </td>
                                )}
                                <td className="px-2 py-1.5 max-w-[140px] truncate text-muted-foreground">{r.notes || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ── Import modal ── */
function ImportModal({ doctors, onClose }: { doctors: DoctorData[]; onClose: () => void }) {
    const [doctorId, setDoctorId] = useState<string>(String(doctors[0]?.id ?? ''));
    const [file,     setFile]     = useState<File | null>(null);
    const [loading,  setLoading]  = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!file || !doctorId) return;
        setLoading(true);
        const fd = new FormData();
        fd.append('doctor_id', doctorId);
        fd.append('file', file);
        router.post('/reception/ortho-appliances/import', fd, {
            forceFormData: true,
            onFinish: () => { setLoading(false); onClose(); },
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <h2 className="text-sm font-bold">Excel импорт</h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors"><X className="size-4" /></button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Эмч сонгох</label>
                        <select className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                            value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Excel файл (.xlsx, .xls, .csv)</label>
                        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                            className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-red-700 hover:file:bg-red-100"
                            onChange={e => setFile(e.target.files?.[0] ?? null)} />
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">Файлын баганын дараалал:</p>
                        <p>Аппарат төрөл · Архив Код · Картны № · РД · Овог · Нэр · Утас · Зүүсэн өдөр · Салгасан өдөр · Тэмдэглэл</p>
                        <p className="mt-1">Аппарат төрөл: <span className="font-mono">Авагддаг</span> эсвэл <span className="font-mono">Авагддаггүй</span></p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border px-4 py-2 text-xs font-medium hover:bg-muted transition-colors">Болих</button>
                        <button type="submit" disabled={!file || loading}
                            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                            <Upload className="size-3.5" /> {loading ? 'Импортлож байна...' : 'Импортлох'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── Main page ── */
export default function OrthoAppliancesIndex({ doctors }: Props) {
    const [activeTab,    setActiveTab]    = useState<number | 'all'>(doctors[0]?.id ?? 'all');
    const [editState,    setEditState]    = useState<EditState>({});
    const [newRows,      setNewRows]      = useState<NewRow[]>([]);
    const [showImport,   setShowImport]   = useState(false);

    const totalActive = doctors.reduce((s, d) => s + d.records.filter(r => r.is_active).length, 0);
    const activeDoctor = typeof activeTab === 'number' ? doctors.find(d => d.id === activeTab) : null;

    function exportUrl(doctorId?: number) {
        const params = doctorId ? `?doctor_id=${doctorId}` : '';
        return `/reception/ortho-appliances/export${params}`;
    }

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title="Ортодонт бүртгэл" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Ортодонтийн аппарат бүртгэл</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Гажиг заслын эмч нарын аппарат бүртгэл — нийт <strong>{totalActive}</strong> идэвхтэй
                        </p>
                    </div>
                    {doctors.length > 0 && (
                        <div className="flex items-center gap-2">
                            <a href={exportUrl(activeDoctor?.id)}
                                className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                                <Download className="size-3.5" />
                                {activeDoctor ? `${shortDoctorName(activeDoctor.name)} татах` : 'Бүгд татах'}
                            </a>
                            <button onClick={() => setShowImport(true)}
                                className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50 transition-colors">
                                <Upload className="size-3.5" /> Import
                            </button>
                        </div>
                    )}
                </div>

                {doctors.length === 0 ? (
                    <div className="rounded-2xl border bg-card p-12 text-center">
                        <p className="text-sm text-muted-foreground">Гажиг заслын их эмч олдсонгүй.</p>
                        <p className="text-xs text-muted-foreground mt-1">Эмчийн мэргэжилд "Гажиг засал" гэж тохируулна уу.</p>
                    </div>
                ) : (
                    <>
                        {/* Tab bar */}
                        <div className="flex flex-wrap gap-1.5">
                            {/* "Бүгд" tab */}
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                                    activeTab === 'all'
                                        ? 'bg-zinc-800 text-white shadow-sm dark:bg-zinc-200 dark:text-zinc-900'
                                        : 'border bg-card text-foreground hover:bg-muted'
                                }`}>
                                Бүгд
                                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                    activeTab === 'all' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-zinc-900' : 'bg-muted text-muted-foreground'
                                }`}>
                                    {totalActive}
                                </span>
                            </button>

                            {/* Doctor tabs */}
                            {doctors.map(d => {
                                const activeCount = d.records.filter(r => r.is_active).length;
                                return (
                                    <button key={d.id}
                                        onClick={() => setActiveTab(d.id)}
                                        className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                                            activeTab === d.id
                                                ? 'bg-red-600 text-white shadow-sm'
                                                : 'border bg-card text-foreground hover:bg-muted'
                                        }`}>
                                        {shortDoctorName(d.name)}
                                        <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                            activeTab === d.id ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {activeCount}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content */}
                        {activeTab === 'all' ? (
                            <AllView doctors={doctors} />
                        ) : (
                            (() => {
                                const doctor = doctors.find(d => d.id === activeTab);
                                if (!doctor) return null;
                                return (
                                    <div className="space-y-4">
                                        <ApplianceTable
                                            type="removable"
                                            records={doctor.records}
                                            doctorId={doctor.id}
                                            editState={editState}
                                            setEditState={setEditState}
                                            newRows={newRows}
                                            setNewRows={setNewRows}
                                        />
                                        <ApplianceTable
                                            type="fixed"
                                            records={doctor.records}
                                            doctorId={doctor.id}
                                            editState={editState}
                                            setEditState={setEditState}
                                            newRows={newRows}
                                            setNewRows={setNewRows}
                                        />
                                    </div>
                                );
                            })()
                        )}
                    </>
                )}
            </div>

            {showImport && (
                <ImportModal doctors={doctors} onClose={() => setShowImport(false)} />
            )}
        </ReceptionLayout>
    );
}
