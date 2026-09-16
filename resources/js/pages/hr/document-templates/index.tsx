import AppLayout from '@/layouts/app-layout';
import RichTextEditor, { type RichTextEditorRef } from '@/components/rich-text-editor';
import DocumentViewer from '@/components/document-viewer';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Copy, Eye, FileSignature, FileText, Pencil, Plus, ScrollText, Trash2, X, Braces, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useRef, useState, FormEvent, useEffect } from 'react';

interface CatalogItem { key: string; label: string; }
interface CatalogGroup { group: string; items: CatalogItem[]; }
interface Position { id: number; name: string; }

interface Template {
    id: number;
    type: string;
    type_label: string;
    title: string;
    code: string | null;
    description: string | null;
    position_id: number | null;
    position: string | null;
    body: string;
    requires_employer_signature: boolean;
    requires_employee_signature: boolean;
    is_active: boolean;
    sort_order: number;
    documents_count: number;
    created_by: string | null;
    updated_at: string | null;
}

interface PageProps {
    templates: Template[];
    positions: Position[];
    types: Record<string, string>;
    catalog: CatalogGroup[];
    flash?: { success?: string; error?: string };
    [key: string]: unknown;
}

const TYPE_STYLES: Record<string, string> = {
    job_description: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    employment: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    liability: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    nda: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    training: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    other: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300',
};

/** Урьдчилан харахад {{талбар}}-уудыг өнгөөр ялгаж харуулна. */
function highlightPlaceholders(html: string): string {
    return html.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi,
        '<span style="background:#eef2ff;color:#4338ca;border-radius:4px;padding:1px 4px;font-family:monospace;font-size:0.85em">{{$1}}</span>');
}

export default function DocumentTemplatesIndex() {
    const { templates, positions, types, catalog, flash } = usePage<PageProps>().props;

    const [filterType, setFilterType] = useState('');
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<Template | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [preview, setPreview] = useState<Template | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const editorRef = useRef<RichTextEditorRef>(null);

    useEffect(() => {
        if (flash?.success) setToast({ msg: flash.success, type: 'success' });
        if (flash?.error) setToast({ msg: flash.error, type: 'error' });
    }, [flash]);
    useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        type: 'employment',
        title: '',
        code: '',
        position_id: '',
        description: '',
        body: '',
        requires_employer_signature: true as boolean,
        requires_employee_signature: true as boolean,
        is_active: true as boolean,
        sort_order: 0,
    });

    const filtered = templates.filter(t =>
        (!filterType || t.type === filterType) &&
        (!search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.code ?? '').toLowerCase().includes(search.toLowerCase()))
    );

    function openCreate() {
        clearErrors();
        reset();
        setData({
            type: 'employment', title: '', code: '', position_id: '', description: '', body: '',
            requires_employer_signature: true, requires_employee_signature: true, is_active: true, sort_order: 0,
        });
        setEditing(null);
        setShowForm(true);
    }

    function openEdit(t: Template) {
        clearErrors();
        setData({
            type: t.type,
            title: t.title,
            code: t.code ?? '',
            position_id: t.position_id ? String(t.position_id) : '',
            description: t.description ?? '',
            body: t.body,
            requires_employer_signature: t.requires_employer_signature,
            requires_employee_signature: t.requires_employee_signature,
            is_active: t.is_active,
            sort_order: t.sort_order,
        });
        setEditing(t);
        setShowForm(true);
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        // Засварлагчийн DOM нь эх сурвалж — илгээхийн өмнө хамгийн сүүлийн агуулгыг авна
        const body = editorRef.current?.getHTML() ?? data.body;
        setData('body', body);

        const opts = {
            preserveScroll: true,
            onSuccess: () => { setShowForm(false); reset(); setEditing(null); },
        };

        if (editing) {
            router.put(`/hr/document-templates/${editing.id}`, { ...data, body }, opts);
        } else {
            router.post('/hr/document-templates', { ...data, body }, opts);
        }
    }

    function duplicate(t: Template) {
        router.post(`/hr/document-templates/${t.id}/duplicate`, {}, { preserveScroll: true });
    }

    function destroy(t: Template) {
        if (!confirm(`«${t.title}» загварыг устгах уу?\n\nӨмнө нь гаргасан гэрээнүүд хэвээр үлдэнэ.`)) return;
        router.delete(`/hr/document-templates/${t.id}`, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={[{ title: 'HR', href: '/hr/employees' }, { title: 'Гэрээний загвар', href: '/hr/document-templates' }]}>
            <Head title="Гэрээний загвар" />

            {toast && (
                <div className={`fixed top-4 right-4 z-[70] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
                    {toast.msg}
                    <button onClick={() => setToast(null)}><X className="size-3.5" /></button>
                </div>
            )}

            <div className="p-4 md:p-6 space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <ScrollText className="size-5 text-indigo-500" />
                            Гэрээ / ажлын байрны тодорхойлолтын загвар
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Загвар үүсгээд ажилтан бүрд сонгож илгээнэ. {'{{талбар}}'} нь ажилтны мэдээллээр автоматаар орлуулагдана.
                        </p>
                    </div>
                    <button onClick={openCreate}
                        className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
                        <Plus className="size-4" /> Шинэ загвар
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className="rounded-lg border bg-background text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                        <option value="">Бүх төрөл</option>
                        {Object.entries(types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Нэр эсвэл кодоор хайх…"
                        className="flex-1 min-w-[180px] rounded-lg border bg-background text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>

                {/* List */}
                {filtered.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-10 text-center">
                        <FileText className="mx-auto size-8 text-muted-foreground/40" />
                        <p className="mt-2 text-sm text-muted-foreground">Загвар олдсонгүй.</p>
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {filtered.map(t => (
                            <div key={t.id} className="flex flex-col rounded-2xl border bg-card p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-2">
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_STYLES[t.type] ?? TYPE_STYLES.other}`}>
                                        {t.type_label}
                                    </span>
                                    {!t.is_active && (
                                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-zinc-700 dark:text-gray-300">Идэвхгүй</span>
                                    )}
                                </div>

                                <h3 className="mt-2 font-semibold text-foreground leading-snug">{t.title}</h3>
                                {t.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}

                                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                                    {t.code && <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{t.code}</span>}
                                    {t.position && <span className="rounded bg-muted px-1.5 py-0.5">{t.position}</span>}
                                    <span className="rounded bg-muted px-1.5 py-0.5">{t.documents_count} гэрээ гарсан</span>
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                                    <span className={t.requires_employer_signature ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                                        {t.requires_employer_signature ? '✓' : '—'} Захирлын гарын үсэг
                                    </span>
                                    <span className={t.requires_employee_signature ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                                        {t.requires_employee_signature ? '✓' : '—'} Ажилтны гарын үсэг
                                    </span>
                                </div>

                                <div className="mt-auto flex gap-1.5 pt-3">
                                    <button onClick={() => setPreview(t)} title="Урьдчилан харах"
                                        className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                                        <Eye className="size-3.5" /> Харах
                                    </button>
                                    <button onClick={() => openEdit(t)} title="Засах"
                                        className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                                        <Pencil className="size-3.5" /> Засах
                                    </button>
                                    <button onClick={() => duplicate(t)} title="Хуулбарлах"
                                        className="flex items-center justify-center rounded-lg border px-2 py-1.5 hover:bg-muted transition-colors">
                                        <Copy className="size-3.5" />
                                    </button>
                                    <button onClick={() => destroy(t)} title="Устгах"
                                        className="ml-auto flex items-center justify-center rounded-lg border border-red-200 px-2 py-1.5 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30 transition-colors">
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Form modal ── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4">
                    <form onSubmit={submit} className="flex max-h-full w-full min-w-0 max-w-5xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
                        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3.5">
                            <h2 className="flex items-center gap-2 font-semibold text-foreground">
                                <FileSignature className="size-4.5 text-indigo-500" />
                                {editing ? 'Загвар засах' : 'Шинэ загвар'}
                            </h2>
                            <button type="button" onClick={() => setShowForm(false)}><X className="size-4.5 text-muted-foreground" /></button>
                        </div>

                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium">Төрөл <span className="text-red-500">*</span></label>
                                    <select value={data.type} onChange={e => setData('type', e.target.value)}
                                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                        {Object.entries(types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                    {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Албан тушаал (заавал биш)</label>
                                    <select value={data.position_id} onChange={e => setData('position_id', e.target.value)}
                                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                        <option value="">— Бүх албан тушаалд —</option>
                                        {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-[1fr_180px_110px]">
                                <div>
                                    <label className="text-sm font-medium">Загварын нэр <span className="text-red-500">*</span></label>
                                    <input value={data.title} onChange={e => setData('title', e.target.value)}
                                        placeholder="Жишээ: Хөдөлмөрийн гэрээ — эмч"
                                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                    {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Код</label>
                                    <input value={data.code} onChange={e => setData('code', e.target.value)} placeholder="hr-employment"
                                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                    {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Эрэмбэ</label>
                                    <input type="number" min={0} value={data.sort_order} onChange={e => setData('sort_order', Number(e.target.value))}
                                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium">Тайлбар</label>
                                <input value={data.description} onChange={e => setData('description', e.target.value)}
                                    placeholder="Энэ загварыг хэзээ ашиглахыг товч бичнэ үү"
                                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                            </div>

                            <div className="flex flex-wrap gap-4 rounded-xl bg-muted/50 px-4 py-3">
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={data.requires_employer_signature}
                                        onChange={e => setData('requires_employer_signature', e.target.checked)} className="size-4 rounded" />
                                    Захирлын гарын үсэг шаардана
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={data.requires_employee_signature}
                                        onChange={e => setData('requires_employee_signature', e.target.checked)} className="size-4 rounded" />
                                    Ажилтны гарын үсэг шаардана
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={data.is_active}
                                        onChange={e => setData('is_active', e.target.checked)} className="size-4 rounded" />
                                    Идэвхтэй
                                </label>
                            </div>

                            <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <label className="text-sm font-medium">Гэрээний агуулга <span className="text-red-500">*</span></label>
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <Braces className="size-3" /> Ажилтны мэдээллийг {'{{талбар}}'}-аар оруулна
                                    </span>
                                </div>
                                <RichTextEditor
                                    ref={editorRef}
                                    value={data.body}
                                    onChange={html => setData('body', html)}
                                    catalog={catalog}
                                />
                                {errors.body && <p className="mt-1 text-xs text-red-500">{errors.body}</p>}
                            </div>
                        </div>

                        <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-3">
                            <button type="button" onClick={() => setShowForm(false)}
                                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Болих</button>
                            <button type="submit" disabled={processing}
                                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                                {editing ? 'Хадгалах' : 'Үүсгэх'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Preview modal ── */}
            {preview && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4" onClick={() => setPreview(null)}>
                    <div className="flex max-h-full w-full min-w-0 max-w-4xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3.5">
                            <div>
                                <h2 className="font-semibold text-foreground">{preview.title}</h2>
                                <p className="text-xs text-muted-foreground">{preview.type_label}</p>
                            </div>
                            <button onClick={() => setPreview(null)}><X className="size-4.5 text-muted-foreground" /></button>
                        </div>
                        <DocumentViewer key={preview.id} html={highlightPlaceholders(preview.body)} />
                    </div>
                </div>
            )}

            <style>{`
                .hr-doc-view h1 { font-size: 1.2rem; font-weight: 700; margin: 1rem 0 .45rem; }
                .hr-doc-view h2 { font-size: 1.05rem; font-weight: 700; margin: 1rem 0 .45rem; }
                .hr-doc-view h3 { font-size: .95rem; font-weight: 700; margin: .9rem 0 .4rem; }
                .hr-doc-view p  { margin: 0 0 .5rem; text-align: justify; }
                .hr-doc-view ul { list-style: disc;    margin: 0 0 .6rem 1.35rem; }
                .hr-doc-view ol { list-style: decimal; margin: 0 0 .6rem 1.35rem; }
                .hr-doc-view li { margin-bottom: .25rem; text-align: justify; }
                .hr-doc-view table { width: 100%; border-collapse: collapse; margin-bottom: .7rem; font-size: .82rem; }
                .hr-doc-view td, .hr-doc-view th { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
                .hr-doc-view th { background: #f1f5f9; font-weight: 600; }
                .hr-doc-view hr { border: none; border-top: 1px solid #cbd5e1; margin: .8rem 0; }
                .dark .hr-doc-view td, .dark .hr-doc-view th { border-color: #3f3f46; }
                .dark .hr-doc-view th { background: #27272a; }
            `}</style>
        </AppLayout>
    );
}
