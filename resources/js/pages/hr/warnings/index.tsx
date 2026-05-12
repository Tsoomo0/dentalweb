import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle, ChevronDown, ChevronUp, Plus, Trash2, X,
    ShieldAlert, Shield, User, CalendarDays,
} from 'lucide-react';
import { useState, FormEvent } from 'react';

interface Employee { id: number; name: string; position: string | null; }
interface Warning {
    id: number;
    type: string; type_label: string;
    severity: string; severity_label: string;
    title: string; description: string;
    incident_date: string;
    action: string; action_label: string;
    action_detail: string | null;
    status: string; status_label: string;
    employee_response: string | null;
    acknowledged_at: string | null;
    employee_name: string;
    employee_position: string | null;
    employee_branch: string | null;
    issued_by: string | null;
    created_at: string;
}

interface PageProps { warnings: Warning[]; employees: Employee[]; [key: string]: unknown; }

const TYPE_COLORS: Record<string, string> = {
    warning:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    violation: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};
const SEV_COLORS: Record<string, string> = {
    low:    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    medium: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    high:   'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};
const STATUS_COLORS: Record<string, string> = {
    sent:         'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    acknowledged: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const ACTIONS = [
    { value: 'written_warning',  label: 'Бичгээр сануулга' },
    { value: 'salary_deduction', label: 'Цалин суутгал' },
    { value: 'suspension',       label: 'Түр чөлөөлөх' },
    { value: 'termination',      label: 'Ажлаас халах' },
    { value: 'other',            label: 'Бусад' },
];

export default function WarningsIndex() {
    const { warnings, employees } = usePage<PageProps>().props;

    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [expanded, setExpanded]   = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);

    const filtered = warnings.filter(w =>
        (!filterType   || w.type   === filterType) &&
        (!filterStatus || w.status === filterStatus)
    );

    const { data, setData, post, processing, errors, reset } = useForm({
        employee_id:   '',
        type:          'warning',
        severity:      'low',
        title:         '',
        description:   '',
        incident_date: '',
        action:        'written_warning',
        action_detail: '',
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post('/hr/warnings', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setShowModal(false);
            },
        });
    }

    function handleDelete(id: number) {
        if (!confirm('Устгах уу?')) return;
        router.delete(`/hr/warnings/${id}`, {
            preserveScroll: true,
            onSuccess: () => {},
        });
    }

    return (
        <AppLayout breadcrumbs={[{ title: 'HR', href: '/hr/employees' }, { title: 'Сануулга / Зөрчил', href: '/hr/warnings' }]}>
            <div className="p-4 md:p-6 space-y-4">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <AlertTriangle className="size-5 text-yellow-500" />
                        Сануулга / Зөрчил
                    </h1>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
                        <Plus className="size-4" /> Шинэ сануулга
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className="rounded-lg border bg-background text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400">
                        <option value="">Бүх төрөл</option>
                        <option value="warning">Сануулга</option>
                        <option value="violation">Зөрчил</option>
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="rounded-lg border bg-background text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400">
                        <option value="">Бүх статус</option>
                        <option value="sent">Илгээгдсэн</option>
                        <option value="acknowledged">Хүлээн зөвшөөрсөн</option>
                    </select>
                    <span className="ml-auto text-sm text-muted-foreground self-center">{filtered.length} бичлэг</span>
                </div>

                {/* List */}
                <div className="space-y-3">
                    {filtered.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground">
                            <Shield className="size-10 mx-auto mb-3 opacity-30" />
                            <p>Сануулга байхгүй байна</p>
                        </div>
                    ) : filtered.map(w => (
                        <div key={w.id}
                            className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-all ${
                                w.status === 'sent' ? 'border-yellow-300 dark:border-yellow-700' : 'border-border'
                            }`}>
                            <button
                                onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                                className="w-full text-left px-4 py-3 flex items-start gap-3">

                                <div className={`mt-0.5 rounded-full p-1.5 ${w.type === 'violation' ? 'bg-red-100 dark:bg-red-900/40' : 'bg-yellow-100 dark:bg-yellow-900/40'}`}>
                                    {w.type === 'violation'
                                        ? <ShieldAlert className="size-4 text-red-600 dark:text-red-400" />
                                        : <AlertTriangle className="size-4 text-yellow-600 dark:text-yellow-400" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[w.type]}`}>{w.type_label}</span>
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${SEV_COLORS[w.severity]}`}>{w.severity_label}</span>
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[w.status]}`}>{w.status_label}</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{w.title}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                            <User className="size-3" />{w.employee_name}{w.employee_position ? ` · ${w.employee_position}` : ''}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                            <CalendarDays className="size-3" />{w.incident_date}
                                        </span>
                                    </div>
                                </div>

                                {expanded === w.id
                                    ? <ChevronUp className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                                    : <ChevronDown className="size-4 text-muted-foreground shrink-0 mt-0.5" />}
                            </button>

                            {expanded === w.id && (
                                <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-[11px] text-muted-foreground mb-0.5">Арга хэмжээ</p>
                                            <p className="font-medium">{w.action_label}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted-foreground mb-0.5">Илгээсэн</p>
                                            <p className="font-medium">{w.issued_by ?? '—'}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[11px] text-muted-foreground mb-0.5">Тайлбар</p>
                                        <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/40 p-3">{w.description}</p>
                                    </div>

                                    {w.action_detail && (
                                        <div>
                                            <p className="text-[11px] text-muted-foreground mb-0.5">Арга хэмжээний дэлгэрэнгүй</p>
                                            <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/40 p-3">{w.action_detail}</p>
                                        </div>
                                    )}

                                    {w.status === 'acknowledged' && (
                                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3">
                                            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5">
                                                Ажилтны хариу · {w.acknowledged_at}
                                            </p>
                                            <p className="text-sm text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap">
                                                {w.employee_response || '—'}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-1">
                                        <button onClick={() => handleDelete(w.id)}
                                            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors">
                                            <Trash2 className="size-3.5" /> Устгах
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Create modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border bg-card shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b">
                            <h3 className="font-bold text-foreground">Шинэ сануулга / зөрчил</h3>
                            <button onClick={() => { setShowModal(false); reset(); }}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

                            {/* Employee */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Ажилтан *</label>
                                <select value={data.employee_id} onChange={e => setData('employee_id', e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                                    <option value="">— Ажилтан сонгох —</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.name}{e.position ? ` (${e.position})` : ''}</option>
                                    ))}
                                </select>
                                {errors.employee_id && <p className="mt-1 text-xs text-red-500">{errors.employee_id}</p>}
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Төрөл *</label>
                                <div className="flex gap-2">
                                    {[{ v: 'warning', l: 'Сануулга' }, { v: 'violation', l: 'Зөрчил' }].map(({ v, l }) => (
                                        <button key={v} type="button"
                                            onClick={() => setData('type', v)}
                                            className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                                                data.type === v
                                                    ? v === 'violation'
                                                        ? 'bg-red-600 border-red-600 text-white'
                                                        : 'bg-yellow-500 border-yellow-500 text-white'
                                                    : 'text-muted-foreground hover:bg-muted'
                                            }`}>{l}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Severity */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Ноцтой байдал *</label>
                                <div className="flex gap-2">
                                    {[{ v: 'low', l: 'Бага' }, { v: 'medium', l: 'Дунд' }, { v: 'high', l: 'Өндөр' }].map(({ v, l }) => (
                                        <button key={v} type="button"
                                            onClick={() => setData('severity', v)}
                                            className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                                                data.severity === v
                                                    ? v === 'high' ? 'bg-red-600 border-red-600 text-white'
                                                    : v === 'medium' ? 'bg-orange-500 border-orange-500 text-white'
                                                    : 'bg-green-600 border-green-600 text-white'
                                                    : 'text-muted-foreground hover:bg-muted'
                                            }`}>{l}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Гарчиг *</label>
                                <input value={data.title} onChange={e => setData('title', e.target.value)}
                                    placeholder="Сануулгын гарчиг"
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                            </div>

                            {/* Incident date */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Тохиолдлын огноо *</label>
                                <input type="date" value={data.incident_date} onChange={e => setData('incident_date', e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                                {errors.incident_date && <p className="mt-1 text-xs text-red-500">{errors.incident_date}</p>}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Тайлбар *</label>
                                <textarea value={data.description} onChange={e => setData('description', e.target.value)}
                                    rows={4} placeholder="Дэлгэрэнгүй тайлбар..."
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500" />
                                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
                            </div>

                            {/* Action */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Арга хэмжээ *</label>
                                <select value={data.action} onChange={e => setData('action', e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                                    {ACTIONS.map(a => (
                                        <option key={a.value} value={a.value}>{a.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Action detail */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Арга хэмжээний дэлгэрэнгүй</label>
                                <textarea value={data.action_detail} onChange={e => setData('action_detail', e.target.value)}
                                    rows={2} placeholder="Нэмэлт тайлбар (заавал биш)"
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500" />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button type="submit" disabled={processing || !data.employee_id || !data.title || !data.incident_date || !data.description}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                                    {processing
                                        ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        : <AlertTriangle className="size-4" />}
                                    Илгээх
                                </button>
                                <button type="button" onClick={() => { setShowModal(false); reset(); }}
                                    className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                                    Цуцлах
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ToastContainer />
        </AppLayout>
    );
}
