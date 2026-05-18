import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Briefcase, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Position {
    id: number;
    name: string;
    portal: string;
    is_active: boolean;
    employees_count: number;
}

interface Props { positions: Position[] }

const PORTALS: { value: string; label: string; color: string }[] = [
    { value: 'doctor',    label: 'Эмчийн портал',   color: 'bg-blue-100 text-blue-700' },
    { value: 'reception', label: 'Ресепшн',          color: 'bg-purple-100 text-purple-700' },
    { value: 'lab',       label: 'Лабораторийн портал', color: 'bg-violet-100 text-violet-700' },
    { value: 'staff',     label: 'Ажилтны портал',   color: 'bg-muted text-muted-foreground' },
    { value: 'hr',        label: 'HR портал',        color: 'bg-orange-100 text-orange-700' },
    { value: 'admin',     label: 'Админ портал',     color: 'bg-red-100 text-red-700' },
];

function portalBadge(portal: string) {
    const p = PORTALS.find(x => x.value === portal);
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${p?.color ?? 'bg-muted text-muted-foreground'}`}>
            {p?.label ?? portal}
        </span>
    );
}

const BLANK = { name: '', portal: 'staff' };

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr/employees' },
    { title: 'Албан тушаал', href: '/hr/positions' },
];

export default function PositionsIndex({ positions }: Props) {
    const { props } = usePage<{ flash?: { success?: string; error?: string } }>();
    const flash = props.flash;

    const [showForm, setShowForm]         = useState(false);
    const [editing, setEditing]           = useState<Position | null>(null);
    const [form, setForm]                 = useState(BLANK);
    const [processing, setProcessing]     = useState(false);

    useEffect(() => {
        if (editing) {
            setForm({ name: editing.name, portal: editing.portal });
            setShowForm(true);
        }
    }, [editing]);

    function openCreate() { setEditing(null); setForm(BLANK); setShowForm(true); }
    function closeForm()  { setShowForm(false); setEditing(null); setForm(BLANK); }
    function set(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setProcessing(true);
        if (editing) {
            router.put(`/hr/positions/${editing.id}`, form, { onFinish: () => { setProcessing(false); closeForm(); } });
        } else {
            router.post('/hr/positions', form, { onFinish: () => { setProcessing(false); closeForm(); } });
        }
    }

    function handleDelete(p: Position) {
        if (p.employees_count > 0) {
            alert(`"${p.name}" тушаалтай ${p.employees_count} ажилтан байгаа тул устгах боломжгүй.`);
            return;
        }
        if (!confirm(`"${p.name}" тушаалыг устгах уу?`)) return;
        router.delete(`/hr/positions/${p.id}`);
    }

    const activeCount   = positions.filter(p => p.is_active).length;
    const inactiveCount = positions.filter(p => !p.is_active).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Албан тушаал" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* Flash */}
                {flash?.success && (
                    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {flash.error}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Албан тушаал</h1>
                        <p className="text-sm text-muted-foreground">Нийт {positions.length} тушаал</p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors"
                    >
                        <Plus className="size-4" /> Тушаал нэмэх
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="text-2xl font-bold text-foreground">{positions.length}</div>
                        <div className="text-sm text-muted-foreground">Нийт тушаал</div>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                        <div className="text-sm text-muted-foreground">Идэвхтэй</div>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="text-2xl font-bold text-muted-foreground">{inactiveCount}</div>
                        <div className="text-sm text-muted-foreground">Идэвхгүй</div>
                    </div>
                </div>

                {/* Add / Edit form */}
                {showForm && (
                    <div className="mb-6 rounded-xl border bg-card p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="font-bold text-foreground">
                                {editing ? 'Тушаал засах' : 'Шинэ тушаал нэмэх'}
                            </h2>
                            <button onClick={closeForm} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="size-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                                        Тушаалын нэр <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={form.name}
                                        onChange={e => set('name', e.target.value)}
                                        placeholder="Шүдний эмч"
                                        required
                                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                                        Нэвтрэх портал <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.portal}
                                        onChange={e => set('portal', e.target.value)}
                                        required
                                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                                    >
                                        {PORTALS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end gap-3">
                                <button
                                    type="button" onClick={closeForm}
                                    className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                                >
                                    Цуцлах
                                </button>
                                <button
                                    type="submit" disabled={processing}
                                    className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                                >
                                    <Save className="size-4" />
                                    {processing ? 'Хадгалж байна...' : (editing ? 'Шинэчлэх' : 'Нэмэх')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Table */}
                <div className="flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
                    {positions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Briefcase className="mb-3 size-10" />
                            <p className="text-sm">Албан тушаал бүртгэгдээгүй байна</p>
                            <button onClick={openCreate} className="mt-3 text-sm text-red-600 hover:underline">
                                + Тушаал нэмэх
                            </button>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 text-left">Тушаалын нэр</th>
                                    <th className="px-4 py-3 text-left">Нэвтрэх портал</th>
                                    <th className="px-4 py-3 text-center">Ажилтан</th>
                                    <th className="px-4 py-3 text-center">Статус</th>
                                    <th className="px-4 py-3 text-right">Үйлдэл</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {positions.map(p => (
                                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-foreground">{p.name}</td>
                                        <td className="px-4 py-3">{portalBadge(p.portal)}</td>
                                        <td className="px-4 py-3 text-center">
                                            {p.employees_count > 0
                                                ? <span className="font-semibold text-foreground">{p.employees_count}</span>
                                                : <span className="text-muted-foreground/40">—</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                p.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                                            }`}>
                                                {p.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setEditing(p)}
                                                className="mr-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                                            >
                                                <Edit2 className="inline size-3 mr-0.5" /> Засах
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p)}
                                                disabled={p.employees_count > 0}
                                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <Trash2 className="inline size-3 mr-0.5" /> Устгах
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
        </AppLayout>
    );
}
