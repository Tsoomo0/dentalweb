import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, ClipboardList, Eye, Filter, Search, X } from 'lucide-react';
import { useState } from 'react';

interface AuditLog {
    id: number;
    event: string;
    auditable_type: string | null;
    auditable_id: number | null;
    actor_name: string;
    actor_type: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    ip_address: string | null;
    description: string | null;
    created_at: string;
}
interface Paginated<T> { data: T[]; current_page: number; last_page: number; total: number; per_page: number }
interface Props {
    logs: Paginated<AuditLog>;
    filters: Record<string, string>;
    events: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Аудит лог', href: '/admin/audit-logs' },
];

const FIELD_LABELS: Record<string, string> = {
    name: 'Нэр', email: 'Имэйл', phone: 'Утас', status: 'Төлөв',
    patient_name: 'Өвчтөн', patient_phone: 'Утас', patient_email: 'Имэйл',
    doctor_id: 'Эмч ID', branch_id: 'Салбар ID', service: 'Үйлчилгээ',
    appointment_number: 'Захиалгын дугаар', appointment_date: 'Огноо',
    appointment_time: 'Цаг', type: 'Төрөл', is_active: 'Идэвхтэй',
    title: 'Гарчиг', group: 'Бүлэг', uploaded: 'Байршуулсан', description: 'Тайлбар',
};

const STATUS_LABELS: Record<string, string> = {
    pending: 'Хүлээгдэж байна', confirmed: 'Баталгаажсан',
    cancelled: 'Цуцлагдсан', completed: 'Дууссан',
    online: 'Онлайн', in_person: 'Биечлэн',
};

function renderValue(key: string, val: unknown): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Тийм' : 'Үгүй';
    const str = String(val);
    return STATUS_LABELS[str] ?? str;
}

function ValuesTable({ values, color }: { values: Record<string, unknown>; color: 'red' | 'green' }) {
    const entries = Object.entries(values);
    if (entries.length === 0) return null;
    const bg    = color === 'red'   ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                    : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
    const label = color === 'red'   ? 'text-red-600 dark:text-red-400'
                                    : 'text-green-700 dark:text-green-400';
    return (
        <div className={`rounded-lg border ${bg} overflow-hidden`}>
            {entries.map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 px-3 py-1.5 border-b last:border-0 border-inherit text-xs">
                    <span className="w-32 shrink-0 font-medium text-muted-foreground">{FIELD_LABELS[k] ?? k}</span>
                    <span className={`font-semibold ${label}`}>{renderValue(k, v)}</span>
                </div>
            ))}
        </div>
    );
}

const EVENT_COLORS: Record<string, string> = {
    created:        'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    updated:        'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    deleted:        'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    status_changed: 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
    login:          'bg-purple-50 border-purple-300 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
};
const EVENT_LABELS: Record<string, string> = {
    created: 'Үүсгэсэн', updated: 'Засварласан', deleted: 'Устгасан',
    status_changed: 'Статус өөрчилсөн', login: 'Нэвтэрсэн',
};

export default function AuditLogsIndex({ logs, filters, events }: Props) {
    const [event,     setEvent]     = useState(filters.event      ?? '');
    const [actorName, setActorName] = useState(filters.actor_name ?? '');
    const [date,      setDate]      = useState(filters.date       ?? '');
    const [expanded,  setExpanded]  = useState<number | null>(null);

    function doSearch(overrides?: Record<string, string>) {
        const params: Record<string, string> = {};
        if (event)     params.event      = event;
        if (actorName) params.actor_name = actorName;
        if (date)      params.date       = date;
        Object.assign(params, overrides);
        Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
        router.get('/admin/audit-logs', params, { preserveState: true, preserveScroll: true });
    }

    function clearAll() {
        setEvent(''); setActorName(''); setDate('');
        router.get('/admin/audit-logs', {}, { preserveState: false });
    }

    const hasFilter = event || actorName || date;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Аудит лог" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                            <ClipboardList className="size-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Аудит лог</h1>
                            <p className="text-sm text-muted-foreground">Системийн бүх үйлдлийн бүртгэл</p>
                        </div>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold">
                        Нийт {logs.total}
                    </span>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Filter className="size-4" /> Шүүлтүүр
                    </div>
                    <select value={event} onChange={e => setEvent(e.target.value)}
                        className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="">Бүх үйлдэл</option>
                        {events.map(ev => <option key={ev} value={ev}>{EVENT_LABELS[ev] ?? ev}</option>)}
                    </select>
                    <input type="text" value={actorName} onChange={e => setActorName(e.target.value)}
                        placeholder="Хэрэглэгчийн нэр"
                        className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-44"
                        onKeyDown={e => e.key === 'Enter' && doSearch()} />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                        className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <button onClick={() => doSearch()}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                        <Search className="size-3.5" /> Хайх
                    </button>
                    {hasFilter && (
                        <button onClick={clearAll}
                            className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
                            <X className="size-3.5" /> Цэвэрлэх
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Үйлдэл</th>
                                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Тайлбар</th>
                                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Хэрэглэгч</th>
                                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Обьект</th>
                                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">IP</th>
                                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Цаг</th>
                                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Дэлгэрэнгүй</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.data.length === 0 ? (
                                    <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Бүртгэл олдсонгүй</td></tr>
                                ) : logs.data.map(log => (
                                    <>
                                        <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${EVENT_COLORS[log.event] ?? 'bg-gray-100 text-gray-700'}`}>
                                                    {EVENT_LABELS[log.event] ?? log.event}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 max-w-xs">
                                                <span className="text-sm">{log.description ?? '—'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{log.actor_name}</div>
                                                {log.actor_type && <div className="text-xs text-muted-foreground">{log.actor_type}</div>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {log.auditable_type ? (
                                                    <span className="text-xs text-muted-foreground">
                                                        {log.auditable_type} #{log.auditable_id}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                                                {log.ip_address ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                {log.created_at}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {(log.old_values || log.new_values) && (
                                                    <button onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                                        className="rounded-lg border p-1.5 hover:bg-muted transition-colors">
                                                        <Eye className="size-3.5" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        {expanded === log.id && (
                                            <tr key={`${log.id}-detail`} className="bg-muted/20">
                                                <td colSpan={7} className="px-6 py-3">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {log.old_values && (
                                                            <div>
                                                                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Өмнөх утга</p>
                                                                <ValuesTable values={log.old_values} color="red" />
                                                            </div>
                                                        )}
                                                        {log.new_values && (
                                                            <div>
                                                                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Шинэ утга</p>
                                                                <ValuesTable values={log.new_values} color="green" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {logs.last_page > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <span className="text-xs text-muted-foreground">
                                Нийт {logs.total} — хуудас {logs.current_page}/{logs.last_page}
                            </span>
                            <div className="flex items-center gap-1">
                                <button disabled={logs.current_page === 1}
                                    onClick={() => doSearch({ page: String(logs.current_page - 1) })}
                                    className="rounded-lg border p-1.5 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                    <ChevronLeft className="size-4" />
                                </button>
                                {Array.from({ length: Math.min(5, logs.last_page) }, (_, i) => {
                                    const start = Math.max(1, Math.min(logs.current_page - 2, logs.last_page - 4));
                                    const page  = start + i;
                                    if (page > logs.last_page) return null;
                                    return (
                                        <button key={page} onClick={() => doSearch({ page: String(page) })}
                                            className={`min-w-[32px] rounded-lg border px-2 py-1 text-xs font-medium transition-colors
                                                ${page === logs.current_page ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>
                                            {page}
                                        </button>
                                    );
                                })}
                                <button disabled={logs.current_page === logs.last_page}
                                    onClick={() => doSearch({ page: String(logs.current_page + 1) })}
                                    className="rounded-lg border p-1.5 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
