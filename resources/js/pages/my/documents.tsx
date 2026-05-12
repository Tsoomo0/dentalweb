import MyLayout from '@/layouts/my-layout';
import { NotificationBell } from '@/components/notification-bell';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Download, Eye, File, FileArchive, FileImage,
    FileSpreadsheet, FileText, Printer, Search, X,
} from 'lucide-react';
import { useState } from 'react';

const RED  = '#dc2626';
const RED2 = '#b91c1c';
const RED3 = '#7f1d1d';

interface Employee { full_name: string; position: string | null; photo_url: string | null; initials: string; }
interface Category { id: number; name: string; color: string; }
interface Document {
    id: number; title: string;
    category_id: number | null; category_name: string | null; category_color: string | null;
    description: string | null; file_name: string; file_size: string; file_type: string;
    expires_at: string | null; download_count: number; created_at: string;
}
interface PageProps {
    employee: Employee | null;
    documents: Document[];
    categories: Category[];
    filters: { category_id?: string; q?: string };
    [key: string]: unknown;
}

const CAT_COLORS: Record<string, string> = {
    blue: '#3b82f6', violet: '#7c3aed', emerald: '#059669', orange: '#ea580c',
    sky: '#0284c7', green: '#16a34a', red: '#dc2626', pink: '#db2777',
    yellow: '#ca8a04', gray: '#6b7280',
};
const CAT_BG: Record<string, string> = {
    blue: '#eff6ff', violet: '#f5f3ff', emerald: '#ecfdf5', orange: '#fff7ed',
    sky: '#f0f9ff', green: '#f0fdf4', red: '#fff5f5', pink: '#fdf2f8',
    yellow: '#fefce8', gray: '#f9fafb',
};
const CAT_BORDER: Record<string, string> = {
    blue: '#bfdbfe', violet: '#ddd6fe', emerald: '#a7f3d0', orange: '#fed7aa',
    sky: '#bae6fd', green: '#bbf7d0', red: '#fecaca', pink: '#fbcfe8',
    yellow: '#fef08a', gray: '#e5e7eb',
};

function catColor(c: string | null) { return CAT_COLORS[c ?? 'gray'] ?? '#6b7280'; }
function catBg(c: string | null)    { return CAT_BG[c ?? 'gray']     ?? '#f9fafb'; }
function catBorder(c: string | null){ return CAT_BORDER[c ?? 'gray'] ?? '#e5e7eb'; }

function fileIcon(mime: string) {
    if (mime.includes('pdf'))   return { Icon: FileText,        color: '#dc2626', bg: '#fff5f5', label: 'PDF' };
    if (mime.includes('word') || mime.includes('msword'))
                                return { Icon: FileText,        color: '#2563eb', bg: '#eff6ff', label: 'DOC' };
    if (mime.includes('sheet') || mime.includes('excel'))
                                return { Icon: FileSpreadsheet, color: '#16a34a', bg: '#f0fdf4', label: 'XLS' };
    if (mime.startsWith('image/'))
                                return { Icon: FileImage,       color: '#7c3aed', bg: '#f5f3ff', label: 'IMG' };
    if (mime.includes('zip') || mime.includes('compressed'))
                                return { Icon: FileArchive,     color: '#d97706', bg: '#fffbeb', label: 'ZIP' };
    return                             { Icon: File,            color: '#6b7280', bg: '#f9fafb', label: 'FILE' };
}

function canView(mime: string) { return mime.includes('pdf') || mime.startsWith('image/'); }

export default function MyDocuments() {
    const { employee, documents, categories, filters } = usePage<PageProps>().props;

    const [search,    setSearch]    = useState(filters.q ?? '');
    const [catFilter, setCatFilter] = useState(filters.category_id ? Number(filters.category_id) : 0);

    function applyFilter(catId: number, q?: string) {
        const params: Record<string, string> = {};
        if (catId) params.category_id = String(catId);
        const qVal = q ?? search;
        if (qVal) params.q = qVal;
        router.get('/my/documents', params, { preserveState: true, only: ['documents', 'filters'] });
    }

    const grouped = catFilter
        ? { [catFilter]: documents }
        : categories.reduce<Record<number, Document[]>>((acc, c) => {
            const items = documents.filter(d => d.category_id === c.id);
            if (items.length > 0) acc[c.id] = items;
            return acc;
        }, {});
    const uncategorized = catFilter ? [] : documents.filter(d => !d.category_id);

    /* ══════════════════════════ RENDER ══════════════════════════ */
    return (
        <MyLayout breadcrumbs={[{ title: 'Баримт бичиг', href: '/my/documents' }]}>
            <Head title="Баримт бичиг" />

            {/* ═══════════════════ MOBILE ═══════════════════ */}
            <div className="md:hidden print:hidden" style={{ flex: 1, background: 'var(--my-page-bg)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' } as React.CSSProperties}>

                {/* ─── RED HERO ─── */}
                <div style={{ background: `linear-gradient(160deg, #ef4444 0%, ${RED} 30%, ${RED2} 65%, ${RED3} 100%)`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -70, right: -70, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: 40, right: 40, pointerEvents: 'none' }} />

                    {/* Top bar */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 0', gap: 10, position: 'relative' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, flex: 1, letterSpacing: 0.3 }}>HR · БАРИМТ БИЧИГ</span>
                        <NotificationBell variant="ghost" />
                        <Link href="/my/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {employee?.photo_url
                                    ? <img src={employee.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                                    : <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{employee?.initials ?? '?'}</span>
                                }
                            </div>
                        </Link>
                    </div>

                    {/* Title */}
                    <div style={{ padding: '14px 18px 14px', position: 'relative' }}>
                        <h1 style={{ margin: '0 0 5px', lineHeight: 1.1, letterSpacing: -0.8 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>Баримт </span>
                            <span style={{ fontSize: 28, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontFamily: 'Georgia, serif' }}>бичиг</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 16px', fontWeight: 500 }}>
                            {employee?.full_name ?? '—'}{employee?.position ? ` · ${employee.position}` : ''}
                        </p>

                        {/* Glassmorphism stats */}
                        <div style={{ borderRadius: 20, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(12px)', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.12)' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[
                                    { val: documents.length,   label: 'Нийт файл',    dot: 'rgba(255,255,255,0.4)' },
                                    { val: categories.filter(c => documents.some(d => d.category_id === c.id)).length, label: 'Категори', dot: '#93c5fd' },
                                    { val: documents.filter(d => d.expires_at).length, label: 'Дуусах хугацаатай', dot: '#fbbf24' },
                                ].map(({ val, label, dot }, i) => (
                                    <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 8px', textAlign: 'center' }}>
                                        <p style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{val}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 5 }}>
                                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
                                            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 600 }}>{label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── CONTENT ─── */}
                <div style={{ padding: '12px 14px 32px' }}>

                    {/* Search bar */}
                    <form onSubmit={e => { e.preventDefault(); applyFilter(catFilter, search); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--my-card-bg)', borderRadius: 16, padding: '0 14px', marginBottom: 10, boxShadow: 'var(--my-shadow)' }}>
                        <Search size={16} color="#bbb" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Хайх..."
                            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, padding: '13px 0', color: 'var(--my-input-text)' }} />
                        {search && (
                            <button type="button" onClick={() => { setSearch(''); applyFilter(catFilter, ''); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                                <X size={15} color="#bbb" />
                            </button>
                        )}
                    </form>

                    {/* Category pills */}
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' } as React.CSSProperties}>
                        <button onClick={() => { setCatFilter(0); applyFilter(0); }} style={{
                            flexShrink: 0, borderRadius: 99, padding: '7px 16px', fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer',
                            background: !catFilter ? RED : 'var(--my-card-bg)', color: !catFilter ? 'white' : '#888',
                            boxShadow: !catFilter ? `0 4px 12px ${RED}44` : 'var(--my-shadow)',
                        }}>Бүгд</button>
                        {categories.map(c => {
                            const count = documents.filter(d => d.category_id === c.id).length;
                            if (count === 0) return null;
                            const active = catFilter === c.id;
                            const cc = catColor(c.color);
                            return (
                                <button key={c.id} onClick={() => { setCatFilter(c.id); applyFilter(c.id); }} style={{
                                    flexShrink: 0, borderRadius: 99, padding: '7px 14px', fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer',
                                    background: active ? cc : 'var(--my-card-bg)', color: active ? 'white' : '#888',
                                    boxShadow: active ? `0 4px 12px ${cc}44` : 'var(--my-shadow)',
                                }}>{c.name} <span style={{ opacity: 0.7 }}>({count})</span></button>
                            );
                        })}
                    </div>

                    {/* Document list */}
                    {documents.length === 0 ? (
                        <div style={{ background: 'var(--my-card-bg)', borderRadius: 22, padding: '52px 20px', textAlign: 'center', boxShadow: 'var(--my-shadow)' }}>
                            <div style={{ width: 64, height: 64, borderRadius: 20, background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                                <FileText size={28} color="#fca5a5" />
                            </div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-muted)', margin: '0 0 4px' }}>Баримт бичиг байхгүй</p>
                            <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0 }}>Та хайлтаа өөрчлөх эсвэл бүх категориг харах</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {catFilter
                                ? <MobileGroup cat={null} items={documents} catFilter={catFilter} />
                                : <>
                                    {categories.map(c => {
                                        const items = grouped[c.id];
                                        if (!items) return null;
                                        return <MobileGroup key={c.id} cat={c} items={items} catFilter={catFilter} />;
                                    })}
                                    {uncategorized.length > 0 && <MobileGroup cat={null} items={uncategorized} catFilter={catFilter} />}
                                </>
                            }
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════ DESKTOP ═══════════════════ */}
            <div className="hidden md:block p-4 md:p-6 space-y-4 print:hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <FileText className="size-5 text-blue-500" /> Баримт бичиг
                    </h1>
                    <form onSubmit={e => { e.preventDefault(); applyFilter(catFilter, search); }} className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Хайх..."
                            className="w-52 rounded-xl border bg-background pl-8 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        {search && (
                            <button type="button" onClick={() => { setSearch(''); applyFilter(catFilter, ''); }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                <X className="size-3.5 text-muted-foreground" />
                            </button>
                        )}
                    </form>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => { setCatFilter(0); applyFilter(0); }}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${!catFilter ? 'bg-red-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                        Бүгд
                    </button>
                    {categories.map(c => {
                        const count = documents.filter(d => d.category_id === c.id).length;
                        if (count === 0 && catFilter !== c.id) return null;
                        const active = catFilter === c.id;
                        return (
                            <button key={c.id} onClick={() => { setCatFilter(c.id); applyFilter(c.id); }}
                                style={active ? { background: catBg(c.color), color: catColor(c.color), border: `1px solid ${catBorder(c.color)}` } : {}}
                                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${!active ? 'bg-muted text-muted-foreground hover:bg-muted/80' : ''}`}>
                                {c.name} {!catFilter && <span className="opacity-60">({count})</span>}
                            </button>
                        );
                    })}
                </div>

                {documents.length === 0 ? (
                    <div className="py-16 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <FileText className="size-10 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
                        <p className="text-sm text-muted-foreground">Баримт бичиг байхгүй байна</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {catFilter
                            ? <DesktopGroup cat={null} items={documents} catFilter={catFilter} />
                            : <>
                                {categories.map(c => {
                                    const items = grouped[c.id];
                                    if (!items) return null;
                                    return <DesktopGroup key={c.id} cat={c} items={items} catFilter={catFilter} />;
                                })}
                                {uncategorized.length > 0 && <DesktopGroup cat={null} items={uncategorized} catFilter={catFilter} />}
                            </>
                        }
                    </div>
                )}
            </div>
        </MyLayout>
    );
}

function MobileGroup({ cat, items, catFilter }: { cat: Category | null; items: Document[]; catFilter: number }) {
    const cc = catColor(cat?.color ?? null);
    return (
        <div>
            {!catFilter && cat && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, paddingLeft: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: cc }} />
                    <p style={{ fontSize: 11, fontWeight: 800, color: cc, letterSpacing: 0.5 }}>{cat.name} · {items.length} файл</p>
                </div>
            )}
            <div style={{ background: 'var(--my-card-bg)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                {items.map((doc, idx) => {
                    const { Icon, color, bg, label } = fileIcon(doc.file_type);
                    return (
                        <div key={doc.id} style={{ padding: '14px 14px', borderBottom: idx < items.length - 1 ? '1px solid var(--my-divider)' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {/* File type icon */}
                                <div style={{ width: 46, height: 46, borderRadius: 14, background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Icon size={18} color={color} />
                                    <span style={{ fontSize: 7, fontWeight: 900, color, opacity: 0.8, marginTop: 2 }}>{label}</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--my-input-text)', margin: '0 0 3px', lineHeight: 1.3 }}>{doc.title}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: 0 }}>{doc.file_size}</p>
                                        {doc.expires_at && (
                                            <p style={{ fontSize: 11, color: '#d97706', margin: 0, fontWeight: 600 }}>· {doc.expires_at} хүртэл</p>
                                        )}
                                    </div>
                                    {doc.description && (
                                        <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.description}</p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                    {canView(doc.file_type) && (
                                        <a href={`/my/documents/${doc.id}/view`} target="_blank" rel="noreferrer"
                                            style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--my-pill-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Eye size={16} color="#888" />
                                        </a>
                                    )}
                                    <a href={`/my/documents/${doc.id}/download`}
                                        style={{ width: 38, height: 38, borderRadius: '50%', background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 10px ${RED}44` }}>
                                        <Download size={16} color="white" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DesktopGroup({ cat, items, catFilter }: { cat: Category | null; items: Document[]; catFilter: number }) {
    const cc = catColor(cat?.color ?? null);
    return (
        <div>
            {!catFilter && cat && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, marginBottom: 12, background: catBg(cat.color), border: `1px solid ${catBorder(cat.color)}` }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: cc }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: cc }}>{cat.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: cc, opacity: 0.7 }}>{items.length} файл</span>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(doc => {
                    const { Icon, color, bg, label } = fileIcon(doc.file_type);
                    return (
                        <div key={doc.id} className="rounded-2xl border bg-card hover:shadow-md transition-all flex flex-col">
                            <div className="p-4 flex items-start gap-3">
                                <div style={{ width: 46, height: 46, borderRadius: 14, background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Icon size={18} color={color} />
                                    <span style={{ fontSize: 8, fontWeight: 900, color, opacity: 0.8, marginTop: 2 }}>{label}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{doc.title}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">{doc.file_size}</p>
                                </div>
                            </div>
                            {doc.description && <p className="px-4 -mt-1 text-[11px] text-muted-foreground line-clamp-2">{doc.description}</p>}
                            <div className="px-4 pb-2 mt-auto pt-1">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>{doc.created_at}</span>
                                    {doc.expires_at && <span className="text-amber-600 font-medium">хүртэл {doc.expires_at}</span>}
                                </div>
                            </div>
                            <div className="border-t px-3 py-2.5 flex gap-1.5">
                                {canView(doc.file_type) && (
                                    <a href={`/my/documents/${doc.id}/view`} target="_blank" rel="noreferrer"
                                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                                        <Eye className="size-3.5" /> Харах
                                    </a>
                                )}
                                {canView(doc.file_type) && (
                                    <a href={`/my/documents/${doc.id}/view`} target="_blank" rel="noreferrer"
                                        onClick={e => { e.preventDefault(); const w = window.open(`/my/documents/${doc.id}/view`, '_blank'); if (w) w.onload = () => w.print(); }}
                                        className="flex items-center justify-center gap-1 rounded-xl border py-2 px-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                                        <Printer className="size-3.5" />
                                    </a>
                                )}
                                <a href={`/my/documents/${doc.id}/download`}
                                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors">
                                    <Download className="size-3.5" /> Татах
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
