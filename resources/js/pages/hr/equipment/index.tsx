import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle, Box, CheckCircle2, ChevronDown, ChevronRight, ClipboardList,
    Edit2, Package, Plus, Printer, RotateCcw, Trash2, UserCheck, X, XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/* ── Types ── */
interface Employee { id: number; name: string; position: string | null; branch: string | null; }
interface ActiveAssignment { id: number; employee_id: number; employee_name: string; position: string | null; accepted_at: string | null; }
interface PendingAssignment { id: number; employee_id: number; employee_name: string; }
interface EquipmentItem {
    id: number; name: string; serial_number: string | null; brand: string | null; model: string | null;
    condition: string; condition_label: string; category: string | null;
    description: string | null; notes: string | null; purchased_at: string | null;
    status: string;
    active_assignment: ActiveAssignment | null;
    pending_assignment: PendingAssignment | null;
}
interface Assignment {
    id: number; equipment_id: number; equipment_name: string; equipment_serial: string | null;
    employee_id: number; employee_name: string; employee_position: string | null; employee_branch: string | null;
    status: string; rejection_reason: string | null; notes: string | null;
    accepted_at: string | null; returned_at: string | null;
    assigned_by: string | null; created_at: string;
}
interface PageProps {
    equipment: EquipmentItem[];
    assignments: Assignment[];
    employees: Employee[];
    site_name: string;
    flash?: { success?: string; error?: string };
    [key: string]: unknown;
}

/* ── Constants ── */
const CONDITION_COLORS: Record<string, string> = {
    new:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    good:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    fair:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    poor:    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    damaged: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};
const STATUS_COLORS: Record<string, string> = {
    available:   'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    assigned:    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    retired:     'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};
const STATUS_LABELS: Record<string, string> = {
    available: 'Боломжтой', assigned: 'Хариуцуулсан',
    maintenance: 'Засварт', retired: 'Ашиглагдахгүй',
};
const ASN_STATUS_LABELS: Record<string, string> = {
    pending: 'Хүлээгдэж байна', accepted: 'Баталгаажсан',
    rejected: 'Татгалзсан', returned: 'Буцаасан',
};
const ASN_STATUS_COLORS: Record<string, string> = {
    pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    accepted: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    returned: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

/* ── Act Document ── */
function ActDocument({
    equipment, employee, assignedAt, acceptedAt, status, siteName,
}: {
    equipment: { name: string; serial_number: string | null; condition_label: string; brand: string | null; model: string | null };
    employee: { name: string; position: string | null; branch: string | null };
    assignedAt: string;
    acceptedAt: string | null;
    status: string;
    siteName: string;
}) {
    return (
        <div className="border rounded-xl bg-white dark:bg-gray-900 p-6 text-sm font-mono print:shadow-none print:border-gray-300">
            <div className="text-center mb-5">
                <div className="text-base font-bold tracking-wide text-gray-800 dark:text-gray-100">
                    ТОНОГ ТӨХӨӨРӨМЖ ХҮЛЭЭЛГЭН ӨГӨХ АКТ
                </div>
            </div>
            <div className="mb-4 text-xs text-gray-600 dark:text-gray-400 grid grid-cols-2 gap-1">
                <div><span className="font-semibold">Байгууллагын нэр:</span> {siteName}</div>
                <div><span className="font-semibold">Огноо:</span> {assignedAt}</div>
            </div>
            <table className="w-full border-collapse text-xs mb-4">
                <tbody>
                    {[
                        ['Төхөөрөмжийн нэр',  equipment.name],
                        ['Серийн дугаар',      equipment.serial_number || '—'],
                        ['Брэнд / Загвар',     [equipment.brand, equipment.model].filter(Boolean).join(' / ') || '—'],
                        ['Төлөв байдал',       equipment.condition_label],
                        ['Хүлээн авсан ажилтан', employee.name],
                        ['Алба/Хэлтэс',        employee.branch || '—'],
                        ['Албан тушаал',        employee.position || '—'],
                    ].map(([label, value]) => (
                        <tr key={label}>
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 font-semibold bg-gray-50 dark:bg-gray-800 w-44 text-gray-700 dark:text-gray-300">{label}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-gray-800 dark:text-gray-100">{value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="text-xs text-gray-700 dark:text-gray-300">
                <div className="font-bold mb-1">ҮҮРЭГ ХАРИУЦЛАГА</div>
                <ol className="list-decimal pl-5 space-y-0.5 text-gray-600 dark:text-gray-400">
                    <li>Ажилтан нь төхөөрөмжийг зөвхөн ажлын зориулалтаар ашиглана.</li>
                    <li>Ашиглалтын зааврын дагуу ажиллуулна.</li>
                    <li>Эвдрэл гэмтэл гарвал нэн даруй удирдлагад мэдэгдэнэ.</li>
                    <li>Хайхрамжгүйгээс үүдэн гэмтээсэн бол нөхөн төлөх үүрэгтэй.</li>
                    <li>Ажлаас гарах/шилжих үед бүрэн бүтэн буцаан хүлээлгэн өгнө.</li>
                </ol>
            </div>
            {status === 'accepted' && acceptedAt ? (
                <p className="mt-3 text-center text-xs text-green-600 dark:text-green-400 font-semibold">
                    ✅ Баталгаажсан: {acceptedAt}
                </p>
            ) : status === 'pending' ? (
                <p className="mt-3 text-center text-xs text-gray-400 italic">
                    (Систем дээр ажилтан "Зөвшөөрөх" дарснаар баталгаажина)
                </p>
            ) : null}
        </div>
    );
}

/* ── Main ── */
export default function EquipmentIndex() {
    const { equipment, assignments, employees, site_name, flash } = usePage<PageProps>().props;

    const [tab, setTab] = useState<'equipment' | 'assignments'>('equipment');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Equipment form modal
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<EquipmentItem | null>(null);

    // Assign modal
    const [assignTarget, setAssignTarget] = useState<EquipmentItem | null>(null);

    // Act preview modal
    const [actAssignment, setActAssignment] = useState<Assignment | null>(null);

    // Return confirm
    const [returnTarget, setReturnTarget] = useState<Assignment | null>(null);

    // Print list
    const [printingList, setPrintingList] = useState(false);

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState<EquipmentItem | null>(null);

    // Filter
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [asnStatusFilter, setAsnStatusFilter] = useState<string>('all');
    const [search, setSearch] = useState('');

    /* polling */
    useEffect(() => {
        const t = setInterval(() => router.reload({ only: ['equipment', 'assignments'] }), 15_000);
        return () => clearInterval(t);
    }, []);

    /* flash toast */
    useEffect(() => {
        if (flash?.success) { setToast({ msg: flash.success, type: 'success' }); }
        if (flash?.error)   { setToast({ msg: flash.error,   type: 'error' }); }
    }, [flash]);
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
    }, [toast]);

    /* Equipment form */
    const equipForm = useForm({
        name: '', serial_number: '', brand: '', model: '',
        condition: 'good', category: '', description: '', notes: '', purchased_at: '',
    });

    function openAdd() {
        setEditItem(null);
        equipForm.reset();
        setShowForm(true);
    }
    function openEdit(item: EquipmentItem) {
        setEditItem(item);
        equipForm.setData({
            name: item.name, serial_number: item.serial_number ?? '',
            brand: item.brand ?? '', model: item.model ?? '',
            condition: item.condition, category: item.category ?? '',
            description: item.description ?? '', notes: item.notes ?? '',
            purchased_at: item.purchased_at ?? '',
        });
        setShowForm(true);
    }
    function submitEquip(e: React.FormEvent) {
        e.preventDefault();
        if (editItem) {
            equipForm.put(`/hr/equipment/${editItem.id}`, {
                onSuccess: () => { setShowForm(false); equipForm.reset(); },
            });
        } else {
            equipForm.post('/hr/equipment', {
                onSuccess: () => { setShowForm(false); equipForm.reset(); },
            });
        }
    }

    /* Assign form */
    const assignForm = useForm({ employee_id: '', notes: '' });
    function submitAssign(e: React.FormEvent) {
        e.preventDefault();
        if (!assignTarget) return;
        assignForm.post(`/hr/equipment/${assignTarget.id}/assign`, {
            onSuccess: () => { setAssignTarget(null); assignForm.reset(); },
        });
    }

    /* Return */
    const { patch: doReturn, processing: returning } = useForm({});
    function confirmReturn() {
        if (!returnTarget) return;
        router.patch(`/hr/equipment-assignments/${returnTarget.id}/return`, {}, {
            onSuccess: () => setReturnTarget(null),
        });
    }

    /* Delete */
    function confirmDelete() {
        if (!deleteTarget) return;
        router.delete(`/hr/equipment/${deleteTarget.id}`, {
            onSuccess: () => setDeleteTarget(null),
        });
    }

    /* Print act */
    function printAct() {
        window.print();
    }

    /* Print assignments list */
    function printList() {
        setPrintingList(true);
        setTimeout(() => {
            window.print();
            window.onafterprint = () => { setPrintingList(false); window.onafterprint = null; };
        }, 50);
    }

    /* Filtered lists */
    const filteredEquipment = equipment.filter(e => {
        const matchStatus = statusFilter === 'all' || e.status === statusFilter;
        const matchSearch = !search
            || e.name.toLowerCase().includes(search.toLowerCase())
            || (e.serial_number ?? '').toLowerCase().includes(search.toLowerCase())
            || (e.brand ?? '').toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const filteredAssignments = assignments.filter(a => {
        const matchStatus = asnStatusFilter === 'all' || a.status === asnStatusFilter;
        const matchSearch = !search
            || a.equipment_name.toLowerCase().includes(search.toLowerCase())
            || a.employee_name.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Тоног төхөөрөмж', href: '/hr/equipment' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="p-4 md:p-6 space-y-4 print:hidden">
                {/* Toast */}
                {toast && (
                    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
                        toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                        {toast.type === 'success' ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                        {toast.msg}
                        <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X className="size-3.5" /></button>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Package className="size-5 text-blue-600" />
                            Тоног төхөөрөмж
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Нийт {equipment.length} тоног төхөөрөмж · {equipment.filter(e => e.status === 'available').length} боломжтой
                        </p>
                    </div>
                    <button onClick={openAdd}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                        <Plus className="size-4" /> Тоног төхөөрөмж нэмэх
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-border">
                    {([
                        { key: 'equipment',   label: 'Тоног төхөөрөмж', icon: Package },
                        { key: 'assignments', label: 'Актын бүртгэл',   icon: ClipboardList },
                    ] as const).map(({ key, label, icon: Icon }) => (
                        <button key={key} onClick={() => setTab(key)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                tab === key
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}>
                            <Icon className="size-4" /> {label}
                        </button>
                    ))}
                </div>

                {/* Search + Filter */}
                <div className="flex gap-2 flex-wrap">
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Хайх..."
                        className="border rounded-lg px-3 py-2 text-sm bg-background w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {tab === 'equipment' && (
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="all">Бүх статус</option>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    )}
                    {tab === 'assignments' && (
                        <select value={asnStatusFilter} onChange={e => setAsnStatusFilter(e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="all">Бүх статус</option>
                            {Object.entries(ASN_STATUS_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Equipment Table */}
                {tab === 'equipment' && (
                    <div className="rounded-xl border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b border-border">
                                    <tr>
                                        {['НЭР', 'СЕРИЙН №', 'ТӨЛӨВ БАЙДАЛ', 'СТАТУС', 'ХАРИУЦАГЧ', 'ҮЙЛДЭЛ'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredEquipment.length === 0 ? (
                                        <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                            <Package className="size-10 mx-auto mb-2 opacity-30" />
                                            Тоног төхөөрөмж байхгүй
                                        </td></tr>
                                    ) : filteredEquipment.map(item => (
                                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground">{item.name}</div>
                                                {(item.brand || item.model) && (
                                                    <div className="text-xs text-muted-foreground">{[item.brand, item.model].filter(Boolean).join(' / ')}</div>
                                                )}
                                                {item.category && (
                                                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{item.category}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                                                {item.serial_number || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CONDITION_COLORS[item.condition] ?? ''}`}>
                                                    {item.condition_label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] ?? ''}`}>
                                                    {STATUS_LABELS[item.status] ?? item.status}
                                                </span>
                                                {item.pending_assignment && (
                                                    <div className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-0.5">⏳ Хүлээгдэж байна</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.active_assignment ? (
                                                    <div>
                                                        <div className="font-medium text-foreground">{item.active_assignment.employee_name}</div>
                                                        {item.active_assignment.position && (
                                                            <div className="text-xs text-muted-foreground">{item.active_assignment.position}</div>
                                                        )}
                                                        {item.active_assignment.accepted_at && (
                                                            <div className="text-xs text-green-600">{item.active_assignment.accepted_at}</div>
                                                        )}
                                                    </div>
                                                ) : item.pending_assignment ? (
                                                    <div className="text-xs text-yellow-600">{item.pending_assignment.employee_name}</div>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {item.status === 'available' && !item.pending_assignment && (
                                                        <button onClick={() => setAssignTarget(item)}
                                                            className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg transition-colors">
                                                            <UserCheck className="size-3.5" /> Хүлээлгэн өгөх
                                                        </button>
                                                    )}
                                                    <button onClick={() => openEdit(item)}
                                                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                                        <Edit2 className="size-3.5" />
                                                    </button>
                                                    <button onClick={() => setDeleteTarget(item)}
                                                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors">
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Assignments Table */}
                {tab === 'assignments' && (
                    <div className="flex justify-end mb-2">
                        <button onClick={printList}
                            className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                            <Printer className="size-4" /> Жагсаалт хэвлэх
                        </button>
                    </div>
                )}
                {tab === 'assignments' && (
                    <div className="rounded-xl border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b border-border">
                                    <tr>
                                        {['ТОНОГ ТӨХӨӨРӨМЖ', 'АЖИЛТАН', 'СТАТУС', 'ОГНОО', 'ҮЙЛДЭЛ'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredAssignments.length === 0 ? (
                                        <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                            <ClipboardList className="size-10 mx-auto mb-2 opacity-30" />
                                            Бүртгэл байхгүй
                                        </td></tr>
                                    ) : filteredAssignments.map(a => (
                                        <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground">{a.equipment_name}</div>
                                                {a.equipment_serial && (
                                                    <div className="text-xs text-muted-foreground font-mono">{a.equipment_serial}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground">{a.employee_name}</div>
                                                {a.employee_position && (
                                                    <div className="text-xs text-muted-foreground">{a.employee_position}</div>
                                                )}
                                                {a.employee_branch && (
                                                    <div className="text-xs text-muted-foreground">{a.employee_branch}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ASN_STATUS_COLORS[a.status] ?? ''}`}>
                                                    {ASN_STATUS_LABELS[a.status] ?? a.status}
                                                </span>
                                                {a.rejection_reason && (
                                                    <div className="text-xs text-red-500 mt-0.5 max-w-[200px] truncate">{a.rejection_reason}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                <div>Олгосон: {a.created_at}</div>
                                                {a.accepted_at && <div className="text-green-600">Авсан: {a.accepted_at}</div>}
                                                {a.returned_at && <div className="text-gray-500">Буцаасан: {a.returned_at}</div>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => setActAssignment(a)}
                                                        className="flex items-center gap-1 text-xs border hover:bg-muted px-2 py-1.5 rounded-lg transition-colors">
                                                        <ClipboardList className="size-3.5" /> Акт
                                                    </button>
                                                    {a.status === 'accepted' && (
                                                        <button onClick={() => setReturnTarget(a)}
                                                            className="flex items-center gap-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1.5 rounded-lg transition-colors">
                                                            <RotateCcw className="size-3.5" /> Буцааж авах
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Equipment Form Modal ── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
                    <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-foreground">{editItem ? 'Тоног төхөөрөмж засах' : 'Тоног төхөөрөмж нэмэх'}</h3>
                            <button onClick={() => { setShowForm(false); equipForm.reset(); }}
                                className="p-1 rounded-lg text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
                        </div>
                        <form onSubmit={submitEquip} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-muted-foreground">Нэр *</label>
                                    <input value={equipForm.data.name}
                                        onChange={e => equipForm.setData('name', e.target.value)}
                                        required className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    {equipForm.errors.name && <p className="text-xs text-red-500 mt-1">{equipForm.errors.name}</p>}
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Серийн дугаар</label>
                                    <input value={equipForm.data.serial_number}
                                        onChange={e => equipForm.setData('serial_number', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Ангилал</label>
                                    <input value={equipForm.data.category}
                                        onChange={e => equipForm.setData('category', e.target.value)}
                                        placeholder="жнь: Компьютер"
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Брэнд</label>
                                    <input value={equipForm.data.brand}
                                        onChange={e => equipForm.setData('brand', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Загвар</label>
                                    <input value={equipForm.data.model}
                                        onChange={e => equipForm.setData('model', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Төлөв байдал *</label>
                                    <select value={equipForm.data.condition}
                                        onChange={e => equipForm.setData('condition', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="new">Шинэ</option>
                                        <option value="good">Сайн</option>
                                        <option value="fair">Хэвийн</option>
                                        <option value="poor">Муу</option>
                                        <option value="damaged">Эвдэрсэн</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Худалдан авсан огноо</label>
                                    <input type="date" value={equipForm.data.purchased_at}
                                        onChange={e => equipForm.setData('purchased_at', e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-muted-foreground">Тайлбар</label>
                                    <textarea value={equipForm.data.description}
                                        onChange={e => equipForm.setData('description', e.target.value)}
                                        rows={2}
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-muted-foreground">Тэмдэглэл</label>
                                    <textarea value={equipForm.data.notes}
                                        onChange={e => equipForm.setData('notes', e.target.value)}
                                        rows={2}
                                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="submit" disabled={equipForm.processing}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors">
                                    {equipForm.processing ? 'Хадгалж байна...' : (editItem ? 'Хадгалах' : 'Нэмэх')}
                                </button>
                                <button type="button" onClick={() => { setShowForm(false); equipForm.reset(); }}
                                    className="px-4 py-2.5 border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                                    Цуцлах
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Assign Modal ── */}
            {assignTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
                    <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-foreground">Хүлээлгэн өгөх</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">{assignTarget.name}</p>
                            </div>
                            <button onClick={() => { setAssignTarget(null); assignForm.reset(); }}
                                className="p-1 rounded-lg text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
                        </div>
                        <form onSubmit={submitAssign} className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Ажилтан *</label>
                                <select value={assignForm.data.employee_id}
                                    onChange={e => assignForm.setData('employee_id', e.target.value)}
                                    required
                                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">— Ажилтан сонгох —</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.name}{emp.position ? ` · ${emp.position}` : ''}
                                        </option>
                                    ))}
                                </select>
                                {assignForm.errors.employee_id && <p className="text-xs text-red-500 mt-1">{assignForm.errors.employee_id}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Тэмдэглэл</label>
                                <textarea value={assignForm.data.notes}
                                    onChange={e => assignForm.setData('notes', e.target.value)}
                                    rows={2}
                                    placeholder="Нэмэлт тэмдэглэл..."
                                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
                                Ажилтанд мэдэгдэл илгээгдэх бөгөөд тэд системд зөвшөөрөх эсвэл татгалзах боломжтой.
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" disabled={assignForm.processing || !assignForm.data.employee_id}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors">
                                    {assignForm.processing ? 'Илгээж байна...' : 'Хүсэлт илгээх'}
                                </button>
                                <button type="button" onClick={() => { setAssignTarget(null); assignForm.reset(); }}
                                    className="px-4 py-2.5 border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                                    Цуцлах
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Act Preview Modal ── */}
            {actAssignment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
                    <div className="w-full max-w-xl rounded-2xl border bg-card shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b">
                            <h3 className="font-bold text-foreground">Хүлээлгэн өгөх акт</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={printAct}
                                    className="flex items-center gap-1.5 text-sm border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
                                    <Printer className="size-4" /> Хэвлэх
                                </button>
                                <button onClick={() => setActAssignment(null)}
                                    className="p-1 rounded-lg text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
                            </div>
                        </div>
                        <div className="p-6">
                            <ActDocument
                                equipment={{
                                    name: actAssignment.equipment_name,
                                    serial_number: actAssignment.equipment_serial,
                                    condition_label: '—',
                                    brand: null, model: null,
                                }}
                                employee={{
                                    name: actAssignment.employee_name,
                                    position: actAssignment.employee_position,
                                    branch: actAssignment.employee_branch,
                                }}
                                assignedAt={actAssignment.created_at}
                                acceptedAt={actAssignment.accepted_at}
                                status={actAssignment.status}
                                siteName={site_name}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Return Confirm ── */}
            {returnTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
                    <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                                <RotateCcw className="size-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Буцааж авах уу?</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">{returnTarget.equipment_name} · {returnTarget.employee_name}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={confirmReturn}
                                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                                Буцааж авах
                            </button>
                            <button onClick={() => setReturnTarget(null)}
                                className="px-4 py-2.5 border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                                Болих
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm ── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
                    <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                                <Trash2 className="size-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Устгах уу?</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">{deleteTarget.name}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={confirmDelete}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                                Устгах
                            </button>
                            <button onClick={() => setDeleteTarget(null)}
                                className="px-4 py-2.5 border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                                Болих
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print-only Assignments List */}
            {printingList && (
                <div className="hidden print:block p-8 font-mono text-sm">
                    <div className="text-center mb-6">
                        <div className="text-base font-bold">{site_name}</div>
                        <div className="text-sm font-semibold mt-1">ТОНОГ ТӨХӨӨРӨМЖИЙН ХАРИУЦАГЧДЫН ЖАГСААЛТ</div>
                        <div className="text-xs text-gray-500 mt-0.5">Хэвлэсэн огноо: {new Date().toLocaleDateString('mn-MN')}</div>
                    </div>
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr>
                                {['№', 'ТОНОГ ТӨХӨӨРӨМЖ', 'СЕРИЙН №', 'АЖИЛТАН', 'АЛБАН ТУШААЛ', 'СТАТУС', 'ОГНОО'].map(h => (
                                    <th key={h} className="border border-gray-400 px-2 py-1.5 text-left bg-gray-100 font-semibold">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {assignments.filter(a => a.status === 'accepted').map((a, i) => (
                                <tr key={a.id}>
                                    <td className="border border-gray-300 px-2 py-1.5 text-center">{i + 1}</td>
                                    <td className="border border-gray-300 px-2 py-1.5 font-medium">{a.equipment_name}</td>
                                    <td className="border border-gray-300 px-2 py-1.5">{a.equipment_serial || '—'}</td>
                                    <td className="border border-gray-300 px-2 py-1.5">{a.employee_name}</td>
                                    <td className="border border-gray-300 px-2 py-1.5">{a.employee_position || '—'}</td>
                                    <td className="border border-gray-300 px-2 py-1.5">Баталгаажсан</td>
                                    <td className="border border-gray-300 px-2 py-1.5">{a.accepted_at || a.created_at}</td>
                                </tr>
                            ))}
                            {assignments.filter(a => a.status === 'accepted').length === 0 && (
                                <tr><td colSpan={7} className="border border-gray-300 px-4 py-3 text-center text-gray-500">Идэвхтэй хариуцагч байхгүй</td></tr>
                            )}
                        </tbody>
                    </table>
                    <div className="mt-6 text-xs text-gray-500">
                        Нийт: {assignments.filter(a => a.status === 'accepted').length} тоног төхөөрөмж
                    </div>
                </div>
            )}

            {/* Print-only Act — hidden on screen */}
            {actAssignment && !printingList && (
                <div className="hidden print:block p-8">
                    <ActDocument
                        equipment={{
                            name: actAssignment.equipment_name,
                            serial_number: actAssignment.equipment_serial,
                            condition_label: '—',
                            brand: null, model: null,
                        }}
                        employee={{
                            name: actAssignment.employee_name,
                            position: actAssignment.employee_position,
                            branch: actAssignment.employee_branch,
                        }}
                        assignedAt={actAssignment.created_at}
                        acceptedAt={actAssignment.accepted_at}
                        status={actAssignment.status}
                        siteName={site_name}
                    />
                </div>
            )}
            <ToastContainer />
        </AppLayout>
    );
}
