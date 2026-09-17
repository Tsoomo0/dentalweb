import AppLayout from '@/layouts/app-layout';
import SignatureInput, { type SignatureInputRef } from '@/components/signature-input';
import RichTextEditor, { type RichTextEditorRef } from '@/components/rich-text-editor';
import DocumentViewer, { DOC_STYLES, signatureBlockHtml } from '@/components/document-viewer';
import CompanyStampManager from '@/components/company-stamp-manager';
import {
    Avatar, CompletionRing, HR_PANEL_FX, SignProgress, StatusPill, StepBadge, statusOf,
} from '@/components/hr/document-status';
import { csrfHeaders } from '@/lib/csrf';
import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertCircle, ArrowLeft, Ban, BellRing, CheckCircle2, ChevronLeft, ChevronRight,
    Download, Eye, FilePlus2, FileSignature, FileText, Loader2, MailCheck, MailWarning, MoreHorizontal,
    PenLine, Pencil, Plus, Search, Send, Stamp, Trash2, X, XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';

interface CatalogItem { key: string; label: string; }
interface CatalogGroup { group: string; items: CatalogItem[]; }

interface Employee {
    id: number;
    name: string;
    position: string | null;
    position_id: number | null;
    branch: string | null;
    email: string | null;
    has_account: boolean;
    variables: Record<string, string>;
}

interface Template {
    id: number;
    type: string;
    type_label: string;
    title: string;
    position_id: number | null;
    body: string;
    requires_employer_signature: boolean;
    requires_employee_signature: boolean;
}

/** Жагсаалтын мөр — агуулгыг (body) нээх үед тусад нь татна. */
interface Doc {
    id: number;
    type: string; type_label: string;
    title: string; doc_number: string | null;
    status: string; status_label: string;
    employee_id: number;
    employee_name: string | null;
    employee_position: string | null;
    employee_branch: string | null;
    employee_has_account: boolean;
    employee_email: string | null;
    template: string | null;
    employer_name: string | null;
    employer_position: string | null;
    employer_signature: string | null;
    employer_stamp: string | null;
    employer_signed_at: string | null;
    employee_signature: string | null;
    employee_signed_at: string | null;
    effective_date: string | null;
    expires_at: string | null;
    sent_at: string | null;
    completed_at: string | null;
    delivered_at: string | null;
    delivered_to: string[] | null;
    delivery_error: string | null;
    decline_reason: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface Stats {
    total: number; draft: number; pending_employee: number; completed: number; declined: number;
}

interface PageProps {
    documents: Paginated<Doc>;
    filters: { status: string; type: string; search: string };
    stats: Stats;
    employees: Employee[];
    templates: Template[];
    types: Record<string, string>;
    statuses: Record<string, string>;
    catalog: CatalogGroup[];
    employerDefaults: { name: string; position: string };
    companyStamp: string | null;
    flash?: { success?: string; error?: string };
    [key: string]: unknown;
}

/** Гэрээ бүрд HR-ээс гараар засах магадлалтай талбарууд. */
const OVERRIDE_FIELDS: Array<{ key: string; label: string; placeholder?: string }> = [
    { key: 'salary', label: 'Сарын үндсэн цалин', placeholder: '1200000' },
    { key: 'contract_term', label: 'Гэрээний хугацаа', placeholder: 'Хугацаагүй' },
    { key: 'work_condition', label: 'Хөдөлмөрийн нөхцөл', placeholder: 'Хэвийн' },
    { key: 'position', label: 'Албан тушаал' },
    { key: 'branch', label: 'Салбар / нэгж' },
    { key: 'employee_address', label: 'Оршин суух хаяг' },
    { key: 'employee_register', label: 'Регистрийн дугаар' },
    { key: 'employee_phone', label: 'Утасны дугаар' },
];

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c] as string));
}

/** Сервертэй ижил логикоор {{талбар}}-уудыг орлуулж урьдчилан харуулна. */
function renderBody(body: string, vars: Record<string, string>): string {
    return body.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (whole, key: string) => {
        const value = vars[key.toLowerCase()];
        if (value === undefined) return whole;
        return value === ''
            ? '<span style="background:#fef3c7;color:#92400e;border-radius:4px;padding:0 4px">………</span>'
            : escapeHtml(value);
    });
}

/**
 * Сонгосон «Хүчинтэй болох» огноогоор баримтын огнооны талбаруудыг тооцно —
 * сервер тал (DocumentRenderer) яг ижил утга бэлддэг тул урьдчилан харахад
 * харагдсан огноо гэрээ дээр буусан огноотой таарна. Огноо сонгоогүй бол
 * серверээс ирсэн өнөөдрийн утга хэвээр үлдэнэ.
 */
function dateVars(effectiveDate: string): Record<string, string> {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(effectiveDate);
    if (!m) return {};

    const [, year, month, day] = m;

    return {
        doc_date: `${year} оны ${month} сарын ${day}`,
        doc_year: year,
        doc_month: month,
        doc_day: day,
        effective_date: `${year}-${month}-${day}`,
    };
}

/** Гэрээний агуулгыг шаардлагатай үед нь татна. */
function useDocumentBody(id: number | null) {
    const [body, setBody] = useState<string | null>(null);

    useEffect(() => {
        if (!id) { setBody(null); return; }
        let alive = true;
        setBody(null);
        fetch(`/hr/employee-documents/${id}/content`, { headers: csrfHeaders() })
            .then(r => (r.ok ? r.json() : { body: '' }))
            .then((d: { body: string }) => { if (alive) setBody(d.body ?? ''); })
            .catch(() => { if (alive) setBody(''); });

        return () => { alive = false; };
    }, [id]);

    return body;
}

/** Агуулга ачаалж дуустал харуулах хэсэг. */
function BodyLoader() {
    return (
        <div className="flex min-h-0 flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Гэрээг ачаалж байна…
        </div>
    );
}

/** Хэсэгчилэн шинэчлэх талбарууд — ажилтан, загвар зэрэг хүндийг дахин татахгүй. */
const PARTIAL = ['documents', 'stats', 'filters'];

/**
 * Урьдчилан татах (prefetch) болон бодит зочлолт яг ижил параметртэй байж
 * кэш таарна. Тиймээс хоёулаа энэ нэг функцээс тохиргоогоо авна.
 */
function listVisit(data: Record<string, string | number>) {
    return {
        method: 'get' as const,
        data,
        only: PARTIAL,
        preserveState: true,
        preserveScroll: true,
    };
}

/** Жагсаалтын багануудыг гарчиг болон мөрд ижилхэн барина. */
const ROW_COLS = 'lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.65fr)_132px_142px_104px]';

export default function EmployeeDocumentsIndex() {
    const {
        documents, filters, stats, employees, templates, types, statuses,
        catalog, employerDefaults, companyStamp, flash,
    } = usePage<PageProps>().props;

    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');

    const [showCreate, setShowCreate] = useState(false);
    const [viewDoc, setViewDoc] = useState<Doc | null>(null);
    const [signDoc, setSignDoc] = useState<Doc | null>(null);
    const [editDoc, setEditDoc] = useState<Doc | null>(null);
    const [showStamp, setShowStamp] = useState(false);
    const [stamp, setStamp] = useState<string | null>(companyStamp);
    const [menuFor, setMenuFor] = useState<number | null>(null);
    // Серверийн хариу ирэхээс өмнө дарсан табыг шууд идэвхжүүлнэ
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);
    // Үйлдэл хийгдэх бүрд prefetch кэшийг шинэчлэхэд ашиглана
    const [cacheEpoch, setCacheEpoch] = useState(0);

    useEffect(() => {
        if (flash?.success) setToast({ msg: flash.success, type: 'success' });
        if (flash?.error) setToast({ msg: flash.error, type: 'error' });

        // Гэрээ үүсгэх/зурах/устгасны дараа хуучирсан кэшийг хаяна
        if (flash?.success || flash?.error) {
            router.flushAll();
            setCacheEpoch(e => e + 1);
        }
    }, [flash]);
    useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4500); return () => clearTimeout(t); }, [toast]);

    /**
     * Шүүлтүүрийг сервер рүү дамжуулна. Зөвхөн жагсаалт, тоо, шүүлтүүрийг
     * дахин татдаг тул (ажилтан/загваруудыг дахин ачаалахгүй) таб дарахад
     * хуудас ачаалагдалгүй шууд солигдоно.
     */
    function applyFilter(next: Partial<{ status: string; type: string; search: string }>) {
        if (next.status !== undefined) setPendingStatus(next.status);

        router.visit('/hr/employee-documents', {
            ...listVisit({ ...filters, ...next, page: 1 }),
            replace: true,
            showProgress: false,
        });
    }

    /** Хуудас солих — мөн зөвхөн жагсаалтаа шинэчилнэ. */
    function goToPage(page: number) {
        router.visit('/hr/employee-documents', {
            ...listVisit({ ...filters, page }),
            showProgress: false,
        });
    }

    // Серверээс төлөв батлагдмагц түр хадгалсан сонголтыг суллана
    useEffect(() => { setPendingStatus(null); }, [filters.status]);

    // Хайлтыг бичиж дуусахад нь илгээнэ
    useEffect(() => {
        if (search === (filters.search ?? '')) return;
        const t = setTimeout(() => applyFilter({ search }), 400);

        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    /** Түргэн шүүлтүүр — төлөв бүрийн тоог шууд харуулна. */
    const tabs: Array<{ key: string; label: string; value: number; Icon: typeof FileText; on: string }> = [
        { key: '', label: 'Бүгд', value: stats.total, Icon: FileText, on: 'bg-gradient-to-b from-slate-600 to-slate-700 shadow-slate-900/30' },
        { key: 'draft', label: 'Гэрээ үүссэн', value: stats.draft, Icon: FilePlus2, on: 'bg-gradient-to-b from-amber-400 to-amber-500 shadow-amber-500/40' },
        { key: 'pending_employee', label: 'Хүлээгдэж буй', value: stats.pending_employee, Icon: BellRing, on: 'bg-gradient-to-b from-blue-500 to-blue-600 shadow-blue-600/40' },
        { key: 'completed', label: 'Баталгаажсан', value: stats.completed, Icon: CheckCircle2, on: 'bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-emerald-600/40' },
        ...(stats.declined > 0
            ? [{ key: 'declined', label: 'Татгалзсан', value: stats.declined, Icon: XCircle, on: 'bg-gradient-to-b from-red-500 to-red-600 shadow-red-600/40' }]
            : []),
    ];

    /**
     * Табуудын өгөгдлийг урьдчилан татаж кэшлэнэ — дарахад сүлжээ хүлээхгүй,
     * шууд солигдоно. Аливаа үйлдэл хийгдсэн үед (flash) кэш шинэчлэгдэнэ.
     */
    useEffect(() => {
        const t = setTimeout(() => {
            for (const { key } of tabs) {
                if (key === (filters.status ?? '')) continue;
                router.prefetch(
                    '/hr/employee-documents',
                    listVisit({ ...filters, status: key, page: 1 }),
                    { cacheFor: ['20s', '2m'] },
                );
            }
        }, 150);

        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.status, filters.type, filters.search, cacheEpoch]);

    const hasFilter = !!(filters.status || filters.type || filters.search);

    return (
        <AppLayout breadcrumbs={[{ title: 'HR', href: '/hr/employees' }, { title: 'Гэрээ / АБТ', href: '/hr/employee-documents' }]}>
            <Head title="Ажилтны гэрээ" />

            {toast && (
                <div className={`fixed right-4 top-4 z-[80] flex max-w-md animate-in items-start gap-2.5 rounded-xl px-4 py-2.5 text-[13px] font-medium text-white shadow-2xl ring-1 ring-inset ring-white/20 backdrop-blur-xl slide-in-from-top-2 fade-in duration-300 ${
                    toast.type === 'success'
                        ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-emerald-900/30'
                        : 'bg-gradient-to-b from-red-500 to-red-600 shadow-red-900/30'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="mt-px size-4 shrink-0" /> : <AlertCircle className="mt-px size-4 shrink-0" />}
                    <span className="flex-1">{toast.msg}</span>
                    <button onClick={() => setToast(null)} className="opacity-70 transition-opacity hover:opacity-100"><X className="size-4" /></button>
                </div>
            )}

            <div className="space-y-3 p-4 md:p-5">

                {/* ── Толгой + түргэн шүүлтүүр (нэг самбар) ── */}
                <section className="relative isolate overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-emerald-50/80 via-card to-teal-50/50 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-24px_rgba(16,185,129,0.35)] dark:from-emerald-950/30 dark:via-card dark:to-teal-950/20">
                    {/* Гоёл — хөвөгч туяа ба нарийн торон бүтэц */}
                    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                        <div className="hr-drift absolute -left-20 -top-28 size-64 rounded-full bg-emerald-400/25 blur-3xl dark:bg-emerald-500/20" />
                        <div className="hr-drift-2 absolute -right-16 -top-32 size-64 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/15" />
                        <div className="hr-drift-2 absolute -bottom-32 left-1/3 size-56 rounded-full bg-sky-400/10 blur-3xl" />
                        <div className="hr-grid absolute inset-0 opacity-[0.55]" />
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
                    </div>

                    <div className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-3 px-4 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/35 ring-1 ring-inset ring-white/30">
                                <span aria-hidden className="absolute inset-x-1.5 top-1 h-1/3 rounded-full bg-white/25 blur-[2px]" />
                                <FileSignature className="relative size-5" />
                            </span>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h1 className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-lg font-extrabold leading-none tracking-tight text-transparent">
                                        Ажилтны гэрээ
                                    </h1>
                                    <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/25 sm:inline dark:text-emerald-300">
                                        цахим гарын үсэг
                                    </span>
                                </div>
                                <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] leading-none text-muted-foreground">
                                    {['Загвар', 'Захирал зурна', 'Ажилтан зурна', 'И-мэйл'].map((step, i) => (
                                        <span key={step} className="inline-flex items-center gap-1">
                                            {i > 0 && <ChevronRight className="size-3 text-emerald-500/50" />}
                                            {step}
                                        </span>
                                    ))}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-1 shrink-0 items-center justify-end gap-2">
                            <CompletionRing value={stats.completed} total={stats.total} />

                            <div className="relative min-w-[180px] max-w-xs flex-1 sm:w-56 sm:flex-none">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                <input value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Нэр, гэрээ, дугаараар хайх…"
                                    className="h-9 w-full rounded-xl border border-border/70 bg-background/70 pl-8 pr-7 text-xs shadow-sm backdrop-blur transition-all placeholder:text-muted-foreground focus:border-emerald-500/60 focus:outline-none focus:ring-4 focus:ring-emerald-500/10" />
                                {search && (
                                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            <button onClick={() => setShowStamp(true)} title={stamp ? 'Байгууллагын тамга' : 'Тамга оруулаагүй байна'}
                                className={`flex h-9 items-center gap-1.5 rounded-xl border bg-background/70 px-2.5 text-xs font-medium shadow-sm backdrop-blur transition-all hover:-translate-y-px hover:bg-muted active:translate-y-0 active:scale-[0.97] ${
                                    stamp ? 'border-border/70 text-muted-foreground' : 'border-amber-400/60 text-amber-600 dark:text-amber-400'}`}>
                                <Stamp className="size-3.5" />
                                <span className="hidden sm:inline">{stamp ? 'Тамга' : 'Тамга оруулах'}</span>
                            </button>

                            <button onClick={() => setShowCreate(true)}
                                className="group relative isolate flex h-9 items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-3.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/35 ring-1 ring-inset ring-white/25 transition-all hover:-translate-y-px hover:shadow-xl hover:shadow-emerald-600/45 hover:brightness-110 active:translate-y-0 active:scale-[0.97]">
                                <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                                <Plus className="relative size-3.5 transition-transform duration-300 group-hover:rotate-90" />
                                <span className="relative">Гэрээ үүсгэх</span>
                            </button>
                        </div>
                    </div>

                    <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-border/50 bg-background/40 px-3 py-2 backdrop-blur-sm">
                        <div className="flex items-center gap-1 overflow-x-auto">
                            {tabs.map(({ key, label, value, Icon, on }) => {
                                const active = (pendingStatus ?? filters.status ?? '') === key;

                                return (
                                    <button key={key || 'all'} onClick={() => applyFilter({ status: key })}
                                        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all active:scale-[0.97] ${
                                            active
                                                ? `${on} text-white shadow-md ring-1 ring-inset ring-white/25`
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                        <Icon className="size-3.5 shrink-0" />
                                        {label}
                                        <span className={`rounded px-1 text-[10px] font-semibold tabular-nums ${
                                            active ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'}`}>
                                            {value}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2">
                            <select value={filters.status} onChange={e => applyFilter({ status: e.target.value })}
                                className="h-8 rounded-lg border border-border/70 bg-background/70 px-2 text-xs text-foreground backdrop-blur focus:border-emerald-500/60 focus:outline-none focus:ring-4 focus:ring-emerald-500/10">
                                <option value="">Бүх төлөв</option>
                                {Object.entries(statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>

                            <select value={filters.type} onChange={e => applyFilter({ type: e.target.value })}
                                className="h-8 rounded-lg border border-border/70 bg-background/70 px-2 text-xs text-foreground backdrop-blur focus:border-emerald-500/60 focus:outline-none focus:ring-4 focus:ring-emerald-500/10">
                                <option value="">Бүх төрөл</option>
                                {Object.entries(types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>

                            {hasFilter && (
                                <button title="Шүүлтүүр цэвэрлэх"
                                    onClick={() => { setSearch(''); router.get('/hr/employee-documents', {}, { preserveScroll: true, replace: true }); }}
                                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.97]">
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── Жагсаалт ── */}
                {documents.data.length === 0 ? (
                    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-card/40 px-6 py-14 text-center">
                        <div aria-hidden className="pointer-events-none absolute left-1/2 top-8 size-40 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
                        <span className="relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/40 ring-1 ring-inset ring-border">
                            <FileSignature className="size-5 text-muted-foreground/70" />
                        </span>
                        <p className="relative mt-3 text-sm font-semibold text-foreground">
                            {hasFilter ? 'Хайлтад тохирох гэрээ олдсонгүй' : 'Одоогоор гэрээ үүсгээгүй байна'}
                        </p>
                        <p className="relative mt-1 max-w-sm text-xs text-muted-foreground">
                            {hasFilter
                                ? 'Шүүлтүүрээ өөрчилж эсвэл цэвэрлээд дахин үзнэ үү.'
                                : 'Загвараас гэрээ үүсгээд захирал гарын үсэг зурснаар ажилтан руу илгээгдэнэ.'}
                        </p>
                        {!hasFilter && (
                            <button onClick={() => setShowCreate(true)}
                                className="relative mt-4 flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-600 px-3 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 ring-1 ring-inset ring-white/20 transition-all hover:brightness-110 active:scale-[0.97]">
                                <Plus className="size-3.5" /> Эхний гэрээг үүсгэх
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-20px_rgba(0,0,0,0.25)]">
                        {/* Баганын гарчиг */}
                        <div className={`hidden gap-x-3 border-b border-border/60 rounded-t-2xl bg-gradient-to-b from-muted/70 to-muted/25 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur lg:grid ${ROW_COLS}`}>
                            <span>Ажилтан</span>
                            <span>Гэрээ</span>
                            <span>Төлөв</span>
                            <span>Гарын үсэг</span>
                            <span className="text-right">Үйлдэл</span>
                        </div>

                        <div className="divide-y divide-border/50 [&>*:first-child]:rounded-t-[15px] [&>*:last-child]:rounded-b-[15px] lg:[&>*:first-child]:rounded-t-none">
                            {documents.data.map((d, i) => (
                                <DocumentRow
                                    key={d.id}
                                    doc={d}
                                    index={i}
                                    menuOpen={menuFor === d.id}
                                    onMenu={() => setMenuFor(menuFor === d.id ? null : d.id)}
                                    onCloseMenu={() => setMenuFor(null)}
                                    onView={() => setViewDoc(d)}
                                    onSign={() => setSignDoc(d)}
                                    onEdit={() => setEditDoc(d)}
                                />
                            ))}
                        </div>

                        {documents.last_page > 1 && (
                            <div className="flex items-center justify-between gap-3 rounded-b-2xl border-t border-border/60 bg-gradient-to-b from-muted/10 to-muted/30 px-4 py-2">
                                <p className="text-[11px] text-muted-foreground">
                                    <span className="font-semibold tabular-nums text-foreground">{documents.from}–{documents.to}</span> / {documents.total} гэрээ
                                </p>
                                <div className="flex items-center gap-1">
                                    <PageBtn disabled={documents.current_page === 1}
                                        onClick={() => goToPage(documents.current_page - 1)}>
                                        <ChevronLeft className="size-3.5" />
                                    </PageBtn>
                                    <span className="px-2 text-[11px] font-medium tabular-nums text-muted-foreground">
                                        {documents.current_page} / {documents.last_page}
                                    </span>
                                    <PageBtn disabled={documents.current_page === documents.last_page}
                                        onClick={() => goToPage(documents.current_page + 1)}>
                                        <ChevronRight className="size-3.5" />
                                    </PageBtn>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showCreate && (
                <CreateModal employees={employees} templates={templates} catalog={catalog} onClose={() => setShowCreate(false)} />
            )}
            {editDoc && <EditModal doc={editDoc} catalog={catalog} onClose={() => setEditDoc(null)} />}
            {signDoc && <EmployerSignModal doc={signDoc} defaults={employerDefaults} stamp={stamp} onClose={() => setSignDoc(null)} />}
            {showStamp && <CompanyStampManager onClose={() => setShowStamp(false)} onChange={setStamp} />}
            {viewDoc && <ViewModal doc={viewDoc} onClose={() => setViewDoc(null)} />}

            <style>{DOC_STYLES}</style>
            <style>{HR_PANEL_FX}</style>
        </AppLayout>
    );
}

function PageBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} disabled={disabled}
            className="flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-background">
            {children}
        </button>
    );
}

/* ───────────────────────── Жагсаалтын мөр ───────────────────────── */

function DocumentRow({ doc: d, index, menuOpen, onMenu, onCloseMenu, onView, onSign, onEdit }: {
    doc: Doc;
    index: number;
    menuOpen: boolean;
    onMenu: () => void;
    onCloseMenu: () => void;
    onView: () => void;
    onSign: () => void;
    onEdit: () => void;
}) {
    const s = statusOf(d.status);
    const canSign = d.status === 'draft' || d.status === 'declined';
    const isCompleted = d.status === 'completed';
    const isWaiting = d.status === 'pending_employee' || d.status === 'pending_employer';

    function go(url: string, method: 'post' | 'patch' | 'delete', confirmText?: string, data: Record<string, boolean> = {}) {
        onCloseMenu();
        if (confirmText && !confirm(confirmText)) return;

        // router.delete нь өгөгдлөө options дотроос авдаг
        if (method === 'delete') router.delete(url, { data, preserveScroll: true });
        else router[method](url, data, { preserveScroll: true });
    }

    /** Анхаарах зүйлс — зай эзлэхгүйн тулд зөвхөн жижиг тэмдэгээр. */
    const flags: Array<{ Icon: typeof Eye; hint: string; tone: string; spin?: boolean }> = [];
    if (isCompleted && d.delivered_at) {
        flags.push({ Icon: MailCheck, tone: 'text-emerald-600 dark:text-emerald-400', hint: `И-мэйл хүрсэн${d.delivered_to?.length ? ' · ' + d.delivered_to.join(', ') : ''}` });
    }
    if (isCompleted && !d.delivered_at && !d.delivery_error) {
        flags.push({ Icon: Loader2, tone: 'text-amber-500', hint: 'И-мэйл илгээж байна', spin: true });
    }
    if (d.delivery_error) {
        flags.push({ Icon: MailWarning, tone: 'text-red-500', hint: `И-мэйл алдаа · ${d.delivery_error}` });
    }
    if (!d.employee_has_account) {
        flags.push({ Icon: AlertCircle, tone: 'text-amber-500', hint: 'Ажилтан нэвтрэх эрхгүй' });
    }
    if (d.status === 'declined' && d.decline_reason) {
        flags.push({ Icon: XCircle, tone: 'text-red-500', hint: `Татгалзсан · ${d.decline_reason}` });
    }

    return (
        <div
            style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
            className={`group relative grid animate-in items-center gap-x-3 gap-y-2 px-4 py-2 transition-colors duration-200 fade-in slide-in-from-bottom-1 fill-mode-backwards hover:bg-gradient-to-r hover:from-muted/70 hover:via-muted/40 hover:to-transparent ${menuOpen ? 'z-30' : ''} ${ROW_COLS}`}>

            {/* Хулганаар дээгүүр очиход төлвийн өнгө сэмхэн гарч ирнэ */}
            <span aria-hidden className={`absolute inset-y-1.5 left-0 w-[3px] rounded-r-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${s.accent}`} />

            {/* Ажилтан */}
            <div className="flex min-w-0 items-center gap-2.5">
                <span className="relative shrink-0" title={s.label}>
                    <Avatar name={d.employee_name} className="size-8 shadow-sm ring-1 ring-inset ring-black/5 transition-transform duration-200 group-hover:scale-105 dark:ring-white/10" />
                    <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card ${s.dot}`} />
                    {isWaiting && <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 animate-ping rounded-full opacity-60 ${s.dot}`} />}
                </span>
                <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{d.employee_name ?? '—'}</p>
                    <p className="truncate text-[11px] leading-tight text-muted-foreground">
                        {[d.employee_position, d.employee_branch].filter(Boolean).join(' · ') || '—'}
                    </p>
                </div>
            </div>

            {/* Гэрээ */}
            <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-[13px] leading-tight text-foreground">{d.title}</p>
                    {d.doc_number && (
                        <span className="shrink-0 rounded bg-muted px-1 py-px font-mono text-[10px] leading-tight text-muted-foreground ring-1 ring-inset ring-border/60">{d.doc_number}</span>
                    )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] leading-tight text-muted-foreground">
                    <span className="tabular-nums">{d.created_at}</span>
                    {flags.map(({ Icon, hint, tone, spin }, i) => (
                        <span key={i} title={hint} className={`inline-flex cursor-default items-center transition-transform hover:scale-125 ${tone}`}>
                            <Icon className={`size-3.5 ${spin ? 'animate-spin' : ''}`} />
                        </span>
                    ))}
                </div>
            </div>

            {/* Төлөв */}
            <div className="min-w-0"><StatusPill status={d.status} /></div>

            {/* Гарын үсгийн явц */}
            <div className="min-w-0">
                <SignProgress employerAt={d.employer_signed_at} employeeAt={d.employee_signed_at} status={d.status} />
            </div>

            {/* Үйлдэл */}
            <div className="flex items-center justify-end gap-1">
                {canSign ? (
                    <button onClick={onSign} title="Захирлын гарын үсэг зурах"
                        className="flex h-7 items-center gap-1 rounded-md bg-gradient-to-b from-emerald-500 to-emerald-600 px-2.5 text-[11px] font-semibold text-white shadow-sm shadow-emerald-600/30 ring-1 ring-inset ring-white/20 transition-all hover:shadow-md hover:shadow-emerald-600/40 hover:brightness-110 active:scale-95">
                        <PenLine className="size-3" /> Зурах
                    </button>
                ) : (
                    <button onClick={onView} title="Гэрээг харах"
                        className="flex h-7 items-center gap-1 rounded-md border bg-background/60 px-2.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-emerald-500/40 hover:bg-muted hover:text-foreground active:scale-95">
                        <Eye className="size-3" /> Харах
                    </button>
                )}

                <div className="relative">
                    <button onClick={onMenu} title="Бусад үйлдэл"
                        className={`flex size-7 items-center justify-center rounded-md border text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 ${
                            menuOpen ? 'bg-muted text-foreground' : 'bg-background/60'}`}>
                        <MoreHorizontal className="size-3.5" />
                    </button>

                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={onCloseMenu} />
                            <div className="absolute right-0 z-50 mt-1 w-52 origin-top-right animate-in overflow-hidden rounded-xl border bg-popover py-1 shadow-2xl ring-1 ring-black/5 zoom-in-95 fade-in duration-150 dark:ring-white/10">
                                {canSign && (
                                    <MenuItem icon={Eye} onClick={() => { onCloseMenu(); onView(); }}>Гэрээг харах</MenuItem>
                                )}
                                <MenuLink icon={Download} href={`/hr/employee-documents/${d.id}/pdf`} onClick={onCloseMenu}>PDF татах</MenuLink>

                                {canSign && (
                                    <MenuItem icon={Pencil} onClick={() => { onCloseMenu(); onEdit(); }}>Засах</MenuItem>
                                )}
                                {d.status === 'pending_employee' && (
                                    <MenuItem icon={BellRing} onClick={() => go(`/hr/employee-documents/${d.id}/remind`, 'post')}>
                                        Ажилтанд сануулах
                                    </MenuItem>
                                )}
                                {isCompleted && (
                                    <MenuItem icon={Send} onClick={() => go(`/hr/employee-documents/${d.id}/redeliver`, 'post')}>
                                        И-мэйл дахин илгээх
                                    </MenuItem>
                                )}

                                <div className="my-1 h-px bg-border" />

                                {(d.status !== 'completed' && d.status !== 'cancelled') && (
                                    <MenuItem icon={Ban} onClick={() => go(`/hr/employee-documents/${d.id}/cancel`, 'patch', 'Энэ гэрээг цуцлах уу?')}>
                                        Цуцлах
                                    </MenuItem>
                                )}

                                {isCompleted ? (
                                    <MenuItem icon={Trash2} danger
                                        onClick={() => go(
                                            `/hr/employee-documents/${d.id}`, 'delete',
                                            `«${d.title}» — баталгаажсан гэрээг бүрмөсөн устгах уу?

Хоёр талын гарын үсэгтэй PDF хамт устах бөгөөд буцаах боломжгүй.`,
                                            { confirm: true },
                                        )}>
                                        Бүрмөсөн устгах
                                    </MenuItem>
                                ) : (
                                    <MenuItem icon={Trash2} danger
                                        onClick={() => go(`/hr/employee-documents/${d.id}`, 'delete', 'Энэ гэрээг устгах уу?')}>
                                        Устгах
                                    </MenuItem>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function MenuItem({ icon: Icon, children, onClick, danger = false }: {
    icon: typeof Eye; children: React.ReactNode; onClick: () => void; danger?: boolean;
}) {
    return (
        <button onClick={onClick}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                danger ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30' : 'text-foreground'}`}>
            <Icon className="size-4 shrink-0 opacity-70" /> {children}
        </button>
    );
}

function MenuLink({ icon: Icon, children, href, onClick }: {
    icon: typeof Eye; children: React.ReactNode; href: string; onClick: () => void;
}) {
    return (
        <a href={href} onClick={onClick}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted">
            <Icon className="size-4 shrink-0 opacity-70" /> {children}
        </a>
    );
}

/* ───────────────────────── Гэрээ харах ───────────────────────── */

function ViewModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
    const body = useDocumentBody(doc.id);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="flex max-h-full w-full min-w-0 max-w-4xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 fade-in duration-200 dark:ring-white/10"
                onClick={e => e.stopPropagation()}>
                <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={doc.employee_name} className="size-9" />
                        <div className="min-w-0">
                            <h2 className="truncate font-semibold text-foreground">{doc.title}</h2>
                            <p className="truncate text-xs text-muted-foreground">
                                {doc.employee_name} · {doc.type_label}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <StatusPill status={doc.status} />
                        <a href={`/hr/employee-documents/${doc.id}/pdf`}
                            className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
                            <Download className="size-3.5" /> PDF
                        </a>
                        <button onClick={onClose}><X className="size-5 text-muted-foreground" /></button>
                    </div>
                </div>

                {body === null
                    ? <BodyLoader />
                    : <DocumentViewer html={body} footerHtml={signatureBlockHtml(doc)} />}
            </div>
        </div>
    );
}

/* ───────────────────────── Гэрээ үүсгэх ───────────────────────── */

function CreateModal({ employees, templates, catalog, onClose }: {
    employees: Employee[];
    templates: Template[];
    catalog: CatalogGroup[];
    onClose: () => void;
}) {
    const [employeeId, setEmployeeId] = useState('');
    const [templateId, setTemplateId] = useState('');
    const [title, setTitle] = useState('');
    const [docNumber, setDocNumber] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [notes, setNotes] = useState('');
    const [overrides, setOverrides] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const employee = employees.find(e => String(e.id) === employeeId) ?? null;
    const template = templates.find(t => String(t.id) === templateId) ?? null;

    // Сонгосон ажилтанд тохирох загварыг эхэнд нь харуулна
    const sortedTemplates = useMemo(() => {
        if (!employee) return templates;
        return [...templates].sort((a, b) => {
            const am = a.position_id === employee.position_id ? 0 : a.position_id === null ? 1 : 2;
            const bm = b.position_id === employee.position_id ? 0 : b.position_id === null ? 1 : 2;
            return am - bm;
        });
    }, [templates, employee]);

    const mergedVars = useMemo(() => {
        if (!employee) return {};
        const vars: Record<string, string> = { ...employee.variables, ...dateVars(effectiveDate) };
        if (docNumber) vars.doc_number = docNumber;
        for (const [k, v] of Object.entries(overrides)) {
            if (v.trim() !== '') vars[k] = v.trim();
        }
        return vars;
    }, [employee, overrides, docNumber, effectiveDate]);

    const previewHtml = useMemo(
        () => (template && employee ? renderBody(template.body, mergedVars) : ''),
        [template, employee, mergedVars]
    );

    /** Загварт байгаа боловч утга нь хоосон талбарууд. */
    const emptyKeys = useMemo(() => {
        if (!template) return [];
        const found = new Set<string>();
        for (const m of template.body.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) {
            const key = m[1].toLowerCase();
            if ((mergedVars[key] ?? '') === '') found.add(key);
        }
        return [...found];
    }, [template, mergedVars]);

    const labelOf = (key: string) =>
        catalog.flatMap(g => g.items).find(i => i.key === key)?.label ?? key;

    function submit(e: FormEvent) {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        router.post('/hr/employee-documents', {
            employee_id: employeeId,
            template_id: templateId,
            title: title || template?.title || '',
            doc_number: docNumber,
            effective_date: effectiveDate,
            expires_at: expiresAt,
            notes,
            variables: overrides,
        }, {
            preserveScroll: true,
            onSuccess: onClose,
            onError: setErrors,
            onFinish: () => setProcessing(false),
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <form onSubmit={submit} className="flex max-h-full w-full min-w-0 max-w-6xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 fade-in duration-200 dark:ring-white/10">
                <div className="flex shrink-0 items-center justify-between border-b px-5 py-3.5">
                    <h2 className="flex items-center gap-2 font-semibold text-foreground">
                        <FileSignature className="size-4.5 text-emerald-600" /> Шинэ гэрээ үүсгэх
                    </h2>
                    <button type="button" onClick={onClose}><X className="size-4.5 text-muted-foreground" /></button>
                </div>

                <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(200px,1fr)] gap-0 overflow-hidden lg:grid-cols-[380px_minmax(0,1fr)] lg:grid-rows-1">
                    {/* Left — тохиргоо */}
                    <div className="min-h-0 min-w-0 max-h-[46vh] space-y-3.5 overflow-y-auto border-b px-5 py-4 lg:max-h-none lg:border-b-0 lg:border-r">
                        <div>
                            <label className="text-sm font-medium">Ажилтан <span className="text-red-500">*</span></label>
                            <select value={employeeId} onChange={e => { setEmployeeId(e.target.value); setOverrides({}); }}
                                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                                <option value="">— Сонгоно уу —</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>
                                        {e.name}{e.position ? ` — ${e.position}` : ''}
                                    </option>
                                ))}
                            </select>
                            {errors.employee_id && <p className="mt-1 text-xs text-red-500">{errors.employee_id}</p>}
                            {employee && !employee.has_account && (
                                <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                                    <AlertCircle className="mt-px size-3.5 shrink-0" />
                                    Энэ ажилтан системд нэвтрэх эрхгүй тул гарын үсэг зурж чадахгүй. Эхлээд хэрэглэгчийн эрх үүсгэнэ үү.
                                </p>
                            )}
                            {employee && !employee.email && (
                                <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                                    <AlertCircle className="mt-px size-3.5 shrink-0" />
                                    И-мэйл хаяг бүртгэгдээгүй тул баталгаажсан гэрээ ажилтанд и-мэйлээр очихгүй.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium">Загвар <span className="text-red-500">*</span></label>
                            <select value={templateId} onChange={e => setTemplateId(e.target.value)}
                                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                                <option value="">— Сонгоно уу —</option>
                                {sortedTemplates.map(t => (
                                    <option key={t.id} value={t.id}>{t.type_label} — {t.title}</option>
                                ))}
                            </select>
                            {errors.template_id && <p className="mt-1 text-xs text-red-500">{errors.template_id}</p>}
                        </div>

                        <div>
                            <label className="text-sm font-medium">Гэрээний нэр</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={template?.title ?? 'Загварын нэрийг ашиглана'}
                                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium">Гэрээний дугаар</label>
                                <input value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="2026/01"
                                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Хүчинтэй болох</label>
                                <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)}
                                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Дуусах хугацаа (хугацаатай гэрээнд)</label>
                            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                            {errors.expires_at && <p className="mt-1 text-xs text-red-500">{errors.expires_at}</p>}
                        </div>

                        {/* Талбаруудыг гараар засах */}
                        {employee && (
                            <div className="rounded-xl border bg-muted/40 p-3">
                                <p className="mb-2 text-xs font-semibold text-foreground">Гэрээний нөхцөл</p>
                                <p className="mb-2.5 text-[11px] text-muted-foreground">
                                    Хоосон орхивол ажилтны бүртгэлийн мэдээллийг ашиглана.
                                </p>
                                <div className="space-y-2">
                                    {OVERRIDE_FIELDS.map(f => (
                                        <div key={f.key} className="flex items-center gap-2">
                                            <label className="w-36 shrink-0 text-[11px] text-muted-foreground">{f.label}</label>
                                            <input
                                                value={overrides[f.key] ?? ''}
                                                onChange={e => setOverrides(o => ({ ...o, [f.key]: e.target.value }))}
                                                placeholder={employee.variables[f.key] || f.placeholder || '—'}
                                                className="min-w-0 flex-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium">Дотоод тэмдэглэл (ажилтанд харагдахгүй)</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                        </div>

                        {emptyKeys.length > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                                    <AlertCircle className="size-3.5" /> Дараах талбар хоосон байна
                                </p>
                                <ul className="mt-1.5 space-y-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                                    {emptyKeys.map(k => <li key={k}>• {labelOf(k)}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Right — урьдчилан харах */}
                    <div className="flex min-h-0 min-w-0 flex-col bg-muted/20">
                        {template && employee ? (
                            <>
                                <p className="shrink-0 border-b px-4 py-2 text-center text-sm font-bold uppercase tracking-wide text-foreground">
                                    {title || template.title}
                                </p>
                                <DocumentViewer key={`${templateId}-${employeeId}`} html={previewHtml} />
                            </>
                        ) : (
                            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                                <FileText className="size-10 text-muted-foreground/30" />
                                <p className="mt-3 text-sm text-muted-foreground">Ажилтан болон загвараа сонгоход<br />гэрээ энд хуудсаар харагдана.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-2 border-t px-5 py-3">
                    <p className="hidden text-[11px] text-muted-foreground sm:block">
                        Үүсгэсний дараа «Гэрээ үүссэн» төлөвт орно — захирал гарын үсэг зурснаар ажилтан руу илгээгдэнэ.
                    </p>
                    <div className="ml-auto flex gap-2">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Болих</button>
                        <button type="submit" disabled={processing || !employeeId || !templateId}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                            <Send className="size-4" /> Гэрээ үүсгэх
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

/* ───────────────────────── Гэрээ засах ───────────────────────── */

function EditModal({ doc, catalog, onClose }: { doc: Doc; catalog: CatalogGroup[]; onClose: () => void }) {
    const editorRef = useRef<RichTextEditorRef>(null);
    const loaded = useDocumentBody(doc.id);
    const [body, setBody] = useState('');
    // Агуулга ирмэгц засварлагчийг дүүргэнэ
    useEffect(() => { if (loaded !== null) setBody(loaded); }, [loaded]);
    const [title, setTitle] = useState(doc.title);
    const [docNumber, setDocNumber] = useState(doc.doc_number ?? '');
    const [effectiveDate, setEffectiveDate] = useState(doc.effective_date ?? '');
    const [expiresAt, setExpiresAt] = useState(doc.expires_at ?? '');
    const [notes, setNotes] = useState(doc.notes ?? '');
    const [processing, setProcessing] = useState(false);

    function submit(e: FormEvent) {
        e.preventDefault();
        setProcessing(true);
        router.put(`/hr/employee-documents/${doc.id}`, {
            title,
            doc_number: docNumber,
            effective_date: effectiveDate,
            expires_at: expiresAt,
            notes,
            body: editorRef.current?.getHTML() ?? body,
        }, {
            preserveScroll: true,
            onSuccess: onClose,
            onFinish: () => setProcessing(false),
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <form onSubmit={submit} className="flex max-h-full w-full min-w-0 max-w-5xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 fade-in duration-200 dark:ring-white/10">
                <div className="flex shrink-0 items-center justify-between border-b px-5 py-3.5">
                    <h2 className="flex items-center gap-2 font-semibold text-foreground">
                        <Pencil className="size-4.5 text-amber-500" /> Гэрээ засах — {doc.employee_name}
                    </h2>
                    <button type="button" onClick={onClose}><X className="size-4.5 text-muted-foreground" /></button>
                </div>

                <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_150px_150px_150px]">
                        <div>
                            <label className="text-sm font-medium">Нэр</label>
                            <input value={title} onChange={e => setTitle(e.target.value)}
                                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Дугаар</label>
                            <input value={docNumber} onChange={e => setDocNumber(e.target.value)}
                                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Хүчинтэй болох</label>
                            <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)}
                                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Дуусах</label>
                            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Агуулга</label>
                        <div className="mt-1">
                            {loaded === null
                                ? <div className="flex h-[360px] items-center justify-center rounded-xl border text-sm text-muted-foreground">
                                      <Loader2 className="mr-2 size-4 animate-spin" /> Агуулгыг ачаалж байна…
                                  </div>
                                : <RichTextEditor ref={editorRef} value={body} onChange={setBody} catalog={catalog} minHeight={360} />}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                            Ажилтны мэдээлэл аль хэдийн орлуулагдсан. Шинээр {'{{талбар}}'} нэмбэл орлуулагдахгүй, шууд текст болж харагдана.
                        </p>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Дотоод тэмдэглэл</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                </div>

                <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-3">
                    <button type="button" onClick={onClose}
                        className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Болих</button>
                    <button type="submit" disabled={processing || loaded === null}
                        className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors">
                        Хадгалах
                    </button>
                </div>
            </form>
        </div>
    );
}

/* ───────────────────────── Захирлын гарын үсэг ───────────────────────── */

function EmployerSignModal({ doc, defaults, stamp, onClose }: {
    doc: Doc;
    defaults: { name: string; position: string };
    stamp: string | null;
    onClose: () => void;
}) {
    const sigRef = useRef<SignatureInputRef>(null);
    const body = useDocumentBody(doc.id);
    // Гэрээг тав тухтай уншихын тулд гарын үсгийн хэсгийг тусад нь 2 дахь алхам болгов
    const [step, setStep] = useState<'read' | 'sign'>('read');
    const [signature, setSignature] = useState('');
    const [name, setName] = useState(doc.employer_name || defaults.name);
    const [position, setPosition] = useState(doc.employer_position || defaults.position);
    const [applyStamp, setApplyStamp] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    function submit(e: FormEvent) {
        e.preventDefault();
        const value = sigRef.current?.getValue() ?? '';
        if (!value) {
            setError('Гарын үсгээ зурах, зургаар оруулах эсвэл хадгалсанаас сонгоно уу');

            return;
        }
        setProcessing(true);
        router.post(`/hr/employee-documents/${doc.id}/sign`, {
            signature: value,
            employer_name: name,
            employer_position: position,
            apply_stamp: applyStamp,
        }, {
            preserveScroll: true,
            onSuccess: onClose,
            onFinish: () => setProcessing(false),
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex max-h-full w-full min-w-0 max-w-4xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 fade-in duration-200 dark:ring-white/10">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3.5">
                    <div className="min-w-0">
                        <h2 className="truncate font-semibold text-foreground">{doc.title}</h2>
                        <p className="text-xs text-muted-foreground">{doc.employee_name} · {doc.type_label}</p>
                    </div>
                    <StepBadge step={step} labels={['Уншиж танилцах', 'Гарын үсэг']} />
                    <button type="button" onClick={onClose}><X className="size-4.5 text-muted-foreground" /></button>
                </div>

                {step === 'read' ? (
                    <>
                        {body === null
                            ? <BodyLoader />
                            : <DocumentViewer html={body} footerHtml={signatureBlockHtml(doc)} />}

                        <div className="flex shrink-0 items-center justify-between gap-2 border-t px-5 py-3">
                            <p className="hidden text-[11px] text-muted-foreground sm:block">
                                Гэрээтэй танилцсаны дараа гарын үсэг зурах алхам руу шилжинэ үү.
                            </p>
                            <div className="ml-auto flex gap-2">
                                <button type="button" onClick={onClose}
                                    className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Болих</button>
                                <button type="button" onClick={() => setStep('sign')}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
                                    <PenLine className="size-4" /> Гарын үсэг зурах
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
                            <button type="button" onClick={() => setStep('read')}
                                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">
                                <ArrowLeft className="size-3.5" /> Гэрээг дахин харах
                            </button>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium">Гарын үсэг зурагчийн албан тушаал</label>
                                    <input value={position} onChange={e => setPosition(e.target.value)}
                                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Нэр</label>
                                    <input value={name} onChange={e => setName(e.target.value)}
                                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium">Гарын үсэг <span className="text-red-500">*</span></label>
                                <SignatureInput
                                    ref={sigRef}
                                    height={200}
                                    onChange={value => { setSignature(value); if (value) setError(''); }}
                                />
                                {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
                            </div>

                            {/* Тамга */}
                            <div className="rounded-xl border bg-muted/40 p-3">
                                {stamp ? (
                                    <label className="flex items-center gap-3">
                                        <input type="checkbox" checked={applyStamp} className="size-4 shrink-0 rounded"
                                            onChange={e => setApplyStamp(e.target.checked)} />
                                        <img src={stamp} alt="Тамга" className="h-14 w-14 shrink-0 object-contain" />
                                        <span className="text-sm text-foreground">
                                            Байгууллагын тамга дарах
                                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                                Гарын үсгийн хажууд гэрээнд дарагдана
                                            </span>
                                        </span>
                                    </label>
                                ) : (
                                    <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
                                        <Stamp className="mt-px size-3.5 shrink-0" />
                                        Байгууллагын тамга оруулаагүй байна. Дээд талын «Тамга оруулах» товчоор нэг удаа оруулбал цаашид бүх гэрээнд автоматаар дарагдана.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center justify-between gap-2 border-t px-5 py-3">
                            <p className="hidden text-[11px] text-muted-foreground sm:block">
                                Гарын үсэг зурмагц гэрээ ажилтан руу илгээгдэж, мэдэгдэл очно.
                            </p>
                            <div className="ml-auto flex gap-2">
                                <button type="button" onClick={() => setStep('read')}
                                    className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Буцах</button>
                                <button type="submit" disabled={processing || !signature}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                    <PenLine className="size-4" /> Зурж илгээх
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
