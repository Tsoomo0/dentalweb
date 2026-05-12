import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
    MessageSquare, Send, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Feedback {
    id: number;
    type: string; type_label: string;
    subject: string; body: string;
    status: string; status_label: string;
    admin_response: string | null;
    employee_name: string; employee_position: string | null; employee_branch: string | null;
    reviewed_by: string | null; reviewed_at: string | null;
    created_at: string;
}
interface PageProps {
    feedbacks: Feedback[];
    flash?: { success?: string; error?: string };
    [key: string]: unknown;
}

const TYPE_COLORS: Record<string, string> = {
    suggestion: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    request:    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    complaint:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};
const STATUS_COLORS: Record<string, string> = {
    pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};
const STATUS_LABELS: Record<string, string> = {
    pending: 'Хүлээгдэж байна', reviewed: 'Хянагдсан',
    resolved: 'Шийдвэрлэсэн', rejected: 'Татгалзсан',
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Санал хүсэлт', href: '/hr/feedback' }];

export default function HrFeedback() {
    const { feedbacks, flash } = usePage<PageProps>().props;

    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [respondTarget, setRespondTarget] = useState<Feedback | null>(null);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const form = useForm({ status: 'resolved', admin_response: '' });

    useEffect(() => {
        const t = setInterval(() => router.reload({ only: ['feedbacks'] }), 15_000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (flash?.success) setToast({ msg: flash.success, type: 'success' });
        if (flash?.error)   setToast({ msg: flash.error,   type: 'error' });
    }, [flash]);
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
    }, [toast]);

    function openRespond(f: Feedback) {
        setRespondTarget(f);
        form.setData({ status: 'resolved', admin_response: f.admin_response ?? '' });
    }

    function submitRespond(e: React.FormEvent) {
        e.preventDefault();
        if (!respondTarget) return;
        form.patch(`/hr/feedback/${respondTarget.id}/respond`, {
            onSuccess: () => { setRespondTarget(null); form.reset(); },
        });
    }

    const pending = feedbacks.filter(f => f.status === 'pending').length;

    const filtered = feedbacks.filter(f => {
        const matchType   = typeFilter === 'all'   || f.type === typeFilter;
        const matchStatus = statusFilter === 'all' || f.status === statusFilter;
        return matchType && matchStatus;
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="p-4 md:p-6 space-y-4">

                {/* Toast */}
                {toast && (
                    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${
                        toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                        {toast.type === 'success' ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                        {toast.msg}
                        <button onClick={() => setToast(null)}><X className="size-3.5" /></button>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <MessageSquare className="size-5 text-violet-600" />
                            Санал хүсэлт
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Нийт {feedbacks.length}
                            {pending > 0 && (
                                <span className="ml-2 inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                                    <span className="size-1.5 rounded-full bg-yellow-500 animate-pulse inline-block" />
                                    {pending} хүлээгдэж байна
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option value="all">Бүх төрөл</option>
                        <option value="suggestion">Санал</option>
                        <option value="request">Хүсэлт</option>
                        <option value="complaint">Гомдол</option>
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option value="all">Бүх статус</option>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                </div>

                {/* List */}
                {filtered.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <MessageSquare className="size-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Санал хүсэлт байхгүй байна</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(f => (
                            <div key={f.id}
                                className={`rounded-2xl border transition-colors ${
                                    f.status === 'pending'
                                        ? 'border-yellow-300 dark:border-yellow-700 bg-card'
                                        : 'border-border bg-card'
                                }`}>
                                <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                                    <button className="flex-1 text-left min-w-0"
                                        onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[f.type] ?? ''}`}>
                                                {f.type_label}
                                            </span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[f.status] ?? ''}`}>
                                                {f.status_label}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">{f.created_at}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground">{f.subject}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {f.employee_name}
                                            {f.employee_position ? ` · ${f.employee_position}` : ''}
                                            {f.employee_branch ? ` · ${f.employee_branch}` : ''}
                                        </p>
                                    </button>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {f.status === 'pending' ? (
                                            <button onClick={() => openRespond(f)}
                                                className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
                                                <Send className="size-3.5" /> Хариу өгөх
                                            </button>
                                        ) : (
                                            <button onClick={() => openRespond(f)}
                                                className="flex items-center gap-1.5 text-xs border hover:bg-muted px-3 py-1.5 rounded-lg transition-colors text-muted-foreground">
                                                <Send className="size-3.5" /> Засах
                                            </button>
                                        )}
                                        <button onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                                            {expanded === f.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                        </button>
                                    </div>
                                </div>

                                {expanded === f.id && (
                                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground mb-1">Агуулга</p>
                                            <p className="text-sm text-foreground whitespace-pre-wrap">{f.body}</p>
                                        </div>
                                        {f.admin_response && (
                                            <div className={`rounded-xl p-3 text-sm border ${
                                                f.status === 'resolved'
                                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                                    : f.status === 'rejected'
                                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                                    : 'bg-muted border-border'
                                            }`}>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1">
                                                    Хариу {f.reviewed_by ? `· ${f.reviewed_by}` : ''} {f.reviewed_at ? `· ${f.reviewed_at}` : ''}
                                                </p>
                                                <p className="text-foreground whitespace-pre-wrap">{f.admin_response}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Respond Modal */}
            {respondTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-foreground">Хариу өгөх</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {respondTarget.employee_name} · {respondTarget.type_label}
                                </p>
                            </div>
                            <button onClick={() => { setRespondTarget(null); form.reset(); }}
                                className="p-1 rounded-lg text-muted-foreground hover:bg-muted">
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Subject preview */}
                        <div className="bg-muted/50 rounded-xl p-3 mb-4 text-sm">
                            <p className="font-semibold text-foreground">{respondTarget.subject}</p>
                            <p className="text-muted-foreground mt-1 text-xs line-clamp-3">{respondTarget.body}</p>
                        </div>

                        <form onSubmit={submitRespond} className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Шийдвэр *</label>
                                <div className="flex gap-2 mt-1.5">
                                    {([
                                        { value: 'reviewed', label: 'Хянагдсан', cls: 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                                        { value: 'resolved', label: 'Шийдвэрлэсэн', cls: 'border-green-400 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
                                        { value: 'rejected', label: 'Татгалзсан', cls: 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
                                    ] as const).map(({ value, label, cls }) => (
                                        <button key={value} type="button"
                                            onClick={() => form.setData('status', value)}
                                            className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                                                form.data.status === value ? cls : 'border-border text-muted-foreground hover:border-border/80'
                                            }`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                {form.errors.status && <p className="text-xs text-red-500 mt-1">{form.errors.status}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Хариу *</label>
                                <textarea
                                    value={form.data.admin_response}
                                    onChange={e => form.setData('admin_response', e.target.value)}
                                    placeholder="Ажилтанд хүргэх хариу мессеж..."
                                    required rows={4} maxLength={3000}
                                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                                />
                                <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{form.data.admin_response.length}/3000</p>
                                {form.errors.admin_response && <p className="text-xs text-red-500 mt-1">{form.errors.admin_response}</p>}
                            </div>
                            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 text-xs text-violet-700 dark:text-violet-300">
                                Хариу илгээхэд ажилтанд мэдэгдэл очно.
                            </div>
                            <div className="flex gap-2">
                                <button type="submit"
                                    disabled={form.processing || !form.data.admin_response}
                                    className="flex flex-1 items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors">
                                    {form.processing
                                        ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        : <Send className="size-4" />}
                                    Хариу илгээх
                                </button>
                                <button type="button" onClick={() => { setRespondTarget(null); form.reset(); }}
                                    className="px-4 py-2.5 border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                                    Болих
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
