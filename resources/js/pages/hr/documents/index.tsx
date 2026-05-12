import AppLayout from '@/layouts/app-layout';
import { ToastContainer } from '@/components/toast';
import { useForm, usePage, router } from '@inertiajs/react';
import {
    File, FileText, FileSpreadsheet, FileImage, FileArchive,
    Upload, Trash2, Download, Eye, Search, X, Plus, Pencil, Tag,
} from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Category {
    id: number;
    name: string;
    color: string;
    documents_count: number;
}
interface Document {
    id: number;
    title: string;
    category_id: number | null;
    category_name: string | null;
    category_color: string | null;
    description: string | null;
    file_name: string;
    file_size: string;
    file_type: string;
    uploaded_by: string | null;
    expires_at: string | null;
    is_expired: boolean;
    download_count: number;
    created_at: string;
}
interface PageProps {
    documents: Document[];
    categories: Category[];
    filters: { category_id?: string; q?: string };
    [key: string]: unknown;
}

/* ─── Color palette ──────────────────────────────────────────────────────── */
const COLOR_PALETTE: Record<string, { bg: string; dot: string; label: string }> = {
    blue:    { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',         dot: 'bg-blue-500',    label: 'Хөх' },
    violet:  { bg: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', dot: 'bg-violet-500',  label: 'Нил ягаан' },
    emerald: { bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'Ногоон' },
    orange:  { bg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', dot: 'bg-orange-500',  label: 'Улбар' },
    sky:     { bg: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',             dot: 'bg-sky-500',     label: 'Тэнгэр' },
    green:   { bg: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',     dot: 'bg-green-500',   label: 'Цайвар ногоон' },
    red:     { bg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',             dot: 'bg-red-500',     label: 'Улаан' },
    pink:    { bg: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',         dot: 'bg-pink-500',    label: 'Ягаан' },
    yellow:  { bg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', dot: 'bg-yellow-500',  label: 'Шар' },
    gray:    { bg: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',            dot: 'bg-gray-400',    label: 'Саарал' },
};

function catStyle(color: string | null) {
    return COLOR_PALETTE[color ?? 'gray'] ?? COLOR_PALETTE.gray;
}

function fileIcon(mime: string) {
    if (mime.includes('pdf'))        return { Icon: FileText,        cls: 'text-red-500 bg-red-50 dark:bg-red-900/20' };
    if (mime.includes('word') || mime.includes('msword'))
                                     return { Icon: FileText,        cls: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' };
    if (mime.includes('sheet') || mime.includes('excel') || mime.includes('spreadsheet'))
                                     return { Icon: FileSpreadsheet, cls: 'text-green-500 bg-green-50 dark:bg-green-900/20' };
    if (mime.startsWith('image/'))   return { Icon: FileImage,       cls: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' };
    if (mime.includes('zip') || mime.includes('compressed'))
                                     return { Icon: FileArchive,     cls: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' };
    return { Icon: File, cls: 'text-gray-500 bg-gray-50 dark:bg-gray-800' };
}

function isPdf(mime: string) { return mime.includes('pdf'); }
function isImage(mime: string) { return mime.startsWith('image/'); }

/* ─── Category manage modal ──────────────────────────────────────────────── */
function CategoryModal({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
    const [editId,    setEditId]    = useState<number | null>(null);
    const [showAdd,   setShowAdd]   = useState(false);

    const addForm  = useForm({ name: '', color: 'blue' });
    const editForm = useForm({ name: '', color: 'blue' });

    function startEdit(c: Category) {
        setEditId(c.id);
        setShowAdd(false);
        editForm.setData({ name: c.name, color: c.color });
    }

    function submitAdd(e: FormEvent) {
        e.preventDefault();
        addForm.post('/hr/document-categories', {
            preserveScroll: true,
            onSuccess: () => { addForm.reset(); setShowAdd(false); },
        });
    }

    function submitEdit(e: FormEvent) {
        e.preventDefault();
        editForm.put(`/hr/document-categories/${editId}`, {
            preserveScroll: true,
            onSuccess: () => setEditId(null),
        });
    }

    function handleDelete(id: number) {
        if (!confirm('Устгах уу?')) return;
        router.delete(`/hr/document-categories/${id}`, { preserveScroll: true });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Tag className="size-4 text-blue-500" /> Ангилал удирдах
                    </h3>
                    <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors">
                        <X className="size-4" />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                    {categories.map(c => {
                        const col = catStyle(c.color);
                        const isEditing = editId === c.id;
                        return (
                            <div key={c.id} className="rounded-xl border bg-card overflow-hidden">
                                {isEditing ? (
                                    <form onSubmit={submitEdit} className="p-3 space-y-2">
                                        <input
                                            value={editForm.data.name}
                                            onChange={e => editForm.setData('name', e.target.value)}
                                            className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ангилалын нэр"
                                            autoFocus
                                        />
                                        <div className="flex flex-wrap gap-1.5">
                                            {Object.entries(COLOR_PALETTE).map(([key, val]) => (
                                                <button key={key} type="button"
                                                    onClick={() => editForm.setData('color', key)}
                                                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border transition-all
                                                        ${editForm.data.color === key ? val.bg + ' border-current ring-2 ring-offset-1 ring-current' : 'bg-muted text-muted-foreground border-transparent'}`}>
                                                    <span className={`size-2 rounded-full ${val.dot}`} />
                                                    {val.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="submit" disabled={editForm.processing || !editForm.data.name}
                                                className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                                Хадгалах
                                            </button>
                                            <button type="button" onClick={() => setEditId(null)}
                                                className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                                                Цуцлах
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex items-center gap-3 px-3 py-2.5">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${col.bg}`}>
                                            <span className={`size-1.5 rounded-full ${col.dot}`} />
                                            {c.name}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">{c.documents_count} файл</span>
                                        <div className="ml-auto flex items-center gap-1">
                                            <button onClick={() => startEdit(c)}
                                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                                                <Pencil className="size-3.5" />
                                            </button>
                                            {c.documents_count === 0 && (
                                                <button onClick={() => handleDelete(c.id)}
                                                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add new */}
                    {showAdd ? (
                        <form onSubmit={submitAdd} className="rounded-xl border bg-card p-3 space-y-2">
                            <input
                                value={addForm.data.name}
                                onChange={e => addForm.setData('name', e.target.value)}
                                className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Шинэ ангилалын нэр"
                                autoFocus
                            />
                            {addForm.errors.name && <p className="text-xs text-red-500">{addForm.errors.name}</p>}
                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(COLOR_PALETTE).map(([key, val]) => (
                                    <button key={key} type="button"
                                        onClick={() => addForm.setData('color', key)}
                                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border transition-all
                                            ${addForm.data.color === key ? val.bg + ' border-current ring-2 ring-offset-1 ring-current' : 'bg-muted text-muted-foreground border-transparent'}`}>
                                        <span className={`size-2 rounded-full ${val.dot}`} />
                                        {val.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" disabled={addForm.processing || !addForm.data.name}
                                    className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                    Нэмэх
                                </button>
                                <button type="button" onClick={() => { setShowAdd(false); addForm.reset(); }}
                                    className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                                    Цуцлах
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button onClick={() => { setShowAdd(true); setEditId(null); }}
                            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 py-2.5 text-xs font-semibold text-muted-foreground hover:border-blue-400 hover:text-blue-600 transition-colors">
                            <Plus className="size-3.5" /> Ангилал нэмэх
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function HrDocumentsIndex() {
    const { documents, categories, filters } = usePage<PageProps>().props;

    const [search,       setSearch]       = useState(filters.q ?? '');
    const [catFilter,    setCatFilter]    = useState(filters.category_id ? Number(filters.category_id) : 0);
    const [showUpload,   setShowUpload]   = useState(false);
    const [showCatModal, setShowCatModal] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        title:       '',
        category_id: categories[0]?.id ?? 0,
        description: '',
        expires_at:  '',
        file:        null as File | null,
    });

    function applyFilter(catId: number, q?: string) {
        const params: Record<string, string> = {};
        if (catId) params.category_id = String(catId);
        if (q ?? search) params.q = q ?? search;
        router.get('/hr/documents', params, { preserveState: true, only: ['documents', 'filters'] });
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post('/hr/documents', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => { reset(); setShowUpload(false); },
        });
    }
    function pickFile(f: File) {
        setData('file', f);
        if (!data.title) setData('title', f.name.replace(/\.[^.]+$/, ''));
    }
    function handleDelete(id: number) {
        if (!confirm('Устгах уу?')) return;
        router.delete(`/hr/documents/${id}`, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={[{ title: 'HR', href: '/hr/employees' }, { title: 'Баримт бичиг', href: '/hr/documents' }]}>
            <div className="p-4 md:p-6 space-y-4">

                {/* ── Top bar ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <FileText className="size-5 text-blue-500" />
                        Баримт бичиг
                        <span className="text-sm font-normal text-muted-foreground">({documents.length})</span>
                    </h1>
                    <div className="flex items-center gap-2 flex-wrap">
                        <form onSubmit={e => { e.preventDefault(); applyFilter(catFilter, search); }} className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Хайх..."
                                className="w-48 rounded-xl border bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            {search && (
                                <button type="button" onClick={() => { setSearch(''); applyFilter(catFilter, ''); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <X className="size-3.5 text-muted-foreground" />
                                </button>
                            )}
                        </form>
                        <button onClick={() => setShowCatModal(true)}
                            className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                            <Tag className="size-4" /> Ангилал
                        </button>
                        <button onClick={() => setShowUpload(true)}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                            <Plus className="size-4" /> Файл нэмэх
                        </button>
                    </div>
                </div>

                {/* ── Category filter pills ── */}
                <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => { setCatFilter(0); applyFilter(0); }}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${!catFilter ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                        Бүгд
                    </button>
                    {categories.map(c => {
                        const col = catStyle(c.color);
                        return (
                            <button key={c.id} onClick={() => { setCatFilter(c.id); applyFilter(c.id); }}
                                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors flex items-center gap-1.5
                                    ${catFilter === c.id ? col.bg + ' ring-2 ring-offset-1 ring-current' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                                <span className={`size-1.5 rounded-full ${col.dot}`} />
                                {c.name}
                            </button>
                        );
                    })}
                </div>

                {/* ── Document grid ── */}
                {documents.length === 0 ? (
                    <div className="py-20 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <FileText className="size-12 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
                        <p className="text-sm text-muted-foreground">Файл байхгүй байна</p>
                        <button onClick={() => setShowUpload(true)}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                            <Plus className="size-4" /> Файл нэмэх
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {documents.map(doc => {
                            const { Icon, cls } = fileIcon(doc.file_type);
                            const col = catStyle(doc.category_color);
                            return (
                                <div key={doc.id}
                                    className="rounded-2xl border bg-card hover:shadow-md transition-all group flex flex-col">
                                    <div className="p-4 flex items-start gap-3">
                                        <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${cls}`}>
                                            <Icon className="size-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">
                                                {doc.title}
                                            </p>
                                            {doc.category_name && (
                                                <span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${col.bg}`}>
                                                    <span className={`size-1.5 rounded-full ${col.dot}`} />
                                                    {doc.category_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {doc.description && (
                                        <p className="px-4 text-[11px] text-muted-foreground line-clamp-2 -mt-1">
                                            {doc.description}
                                        </p>
                                    )}

                                    <div className="px-4 pb-3 mt-auto pt-3 space-y-1">
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                            <span>{doc.file_name.length > 22 ? doc.file_name.slice(0, 20) + '…' : doc.file_name}</span>
                                            <span className="font-medium">{doc.file_size}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                            <span>{doc.created_at}</span>
                                            <span>{doc.download_count} татгалт</span>
                                        </div>
                                        {doc.expires_at && (
                                            <p className={`text-[11px] font-semibold ${doc.is_expired ? 'text-red-500' : 'text-yellow-600 dark:text-yellow-400'}`}>
                                                {doc.is_expired ? '⚠ Хугацаа дууссан' : `Дуусах: ${doc.expires_at}`}
                                            </p>
                                        )}
                                        {doc.uploaded_by && (
                                            <p className="text-[11px] text-muted-foreground">↑ {doc.uploaded_by}</p>
                                        )}
                                    </div>

                                    <div className="border-t px-3 py-2.5 flex items-center gap-1.5">
                                        {(isPdf(doc.file_type) || isImage(doc.file_type)) && (
                                            <a href={`/hr/documents/${doc.id}/view`} target="_blank" rel="noreferrer"
                                                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                                                <Eye className="size-3.5" /> Харах
                                            </a>
                                        )}
                                        <a href={`/hr/documents/${doc.id}/download`}
                                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                            <Download className="size-3.5" /> Татах
                                        </a>
                                        <button onClick={() => handleDelete(doc.id)}
                                            className="rounded-xl border border-red-200 dark:border-red-800 p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Upload Modal ── */}
            {showUpload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b">
                            <h3 className="font-bold text-foreground flex items-center gap-2">
                                <Upload className="size-4 text-blue-500" /> Файл байршуулах
                            </h3>
                            <button onClick={() => { setShowUpload(false); reset(); }}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

                            {/* File drop zone */}
                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
                                onClick={() => fileRef.current?.click()}
                                className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-all text-center py-6 px-4
                                    ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-muted/40'}`}>
                                <input ref={fileRef} type="file" className="sr-only"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip,.txt"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
                                {data.file ? (
                                    <div className="flex items-center justify-center gap-3">
                                        {(() => { const { Icon, cls } = fileIcon(data.file.type); return <div className={`size-10 rounded-xl flex items-center justify-center ${cls}`}><Icon className="size-5" /></div>; })()}
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.file.name}</p>
                                            <p className="text-xs text-muted-foreground">{(data.file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="size-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                        <p className="text-sm font-medium text-muted-foreground">Файл дарж сонгох эсвэл чирж оруулна уу</p>
                                        <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, PowerPoint, Image, ZIP · Дээд тал 20MB</p>
                                    </>
                                )}
                            </div>
                            {errors.file && <p className="text-xs text-red-500">{errors.file}</p>}

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Гарчиг *</label>
                                <input value={data.title} onChange={e => setData('title', e.target.value)}
                                    placeholder="Баримт бичгийн нэр..."
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ангилал *</label>
                                {categories.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        Ангилал байхгүй байна.{' '}
                                        <button type="button" onClick={() => { setShowUpload(false); setShowCatModal(true); }}
                                            className="text-blue-600 underline">Ангилал нэмэх</button>
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {categories.map(c => {
                                            const col = catStyle(c.color);
                                            return (
                                                <button key={c.id} type="button" onClick={() => setData('category_id', c.id)}
                                                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors text-left
                                                        ${data.category_id === c.id ? col.bg + ' border-current' : 'text-muted-foreground hover:bg-muted border-border'}`}>
                                                    <span className={`size-2 rounded-full shrink-0 ${col.dot}`} />
                                                    {c.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {errors.category_id && <p className="mt-1 text-xs text-red-500">{errors.category_id}</p>}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                    Тайлбар <span className="opacity-60">(заавал биш)</span>
                                </label>
                                <textarea value={data.description} onChange={e => setData('description', e.target.value)}
                                    rows={2} placeholder="Баримтын талаар товч мэдээлэл..."
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>

                            {/* Expires at */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                    Хүчинтэй хүртэл <span className="opacity-60">(заавал биш)</span>
                                </label>
                                <input type="date" value={data.expires_at} onChange={e => setData('expires_at', e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                {errors.expires_at && <p className="mt-1 text-xs text-red-500">{errors.expires_at}</p>}
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button type="submit" disabled={processing || !data.file || !data.title || !data.category_id}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                    {processing
                                        ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        : <Upload className="size-4" />}
                                    Байршуулах
                                </button>
                                <button type="button" onClick={() => { setShowUpload(false); reset(); }}
                                    className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                                    Цуцлах
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Category Modal ── */}
            {showCatModal && (
                <CategoryModal categories={categories} onClose={() => setShowCatModal(false)} />
            )}

            <ToastContainer />
        </AppLayout>
    );
}
