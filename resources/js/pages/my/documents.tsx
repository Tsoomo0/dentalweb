import MyLayout from '@/layouts/my-layout';
import { ChatIcon } from '@/components/chat-icon';
import { NotificationBell } from '@/components/notification-bell';
import { MyCard, MyDesktop, MyEmpty, MyHeader, MyPill, MyStat, myBtn, myTable } from '@/components/my/page-kit';
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

function catColor(c: string | null) { return CAT_COLORS[c ?? 'gray'] ?? '#6b7280'; }

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
                        <ChatIcon variant="ghost" />
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
            <MyDesktop>
                <MyHeader icon={FileText} title="Баримт бичиг"
                    subtitle={<><span>{employee?.full_name}</span><span>Байгууллагын журам, маягт, заавар</span></>}
                    actions={
                        <form onSubmit={e => { e.preventDefault(); applyFilter(catFilter, search); }} className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Баримт хайх…"
                                className="h-8 w-56 rounded-lg border border-border bg-background pl-8 pr-7 text-xs shadow-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20" />
                            {search && (
                                <button type="button" onClick={() => { setSearch(''); applyFilter(catFilter, ''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </form>
                    }
                    tabs={
                        <>
                            <button type="button" onClick={() => { setCatFilter(0); applyFilter(0); }}
                                className={`h-7 rounded-lg px-2.5 text-[11px] font-semibold shadow-sm ring-1 transition ${!catFilter ? 'bg-red-600 text-white ring-red-600' : 'bg-white/80 text-muted-foreground ring-black/5 hover:text-foreground dark:bg-white/[0.06] dark:ring-white/10'}`}>
                                Бүгд
                            </button>
                            {categories.map(c => {
                                const count = documents.filter(d => d.category_id === c.id).length;
                                if (count === 0 && catFilter !== c.id) return null;
                                const active = catFilter === c.id;
                                return (
                                    <button key={c.id} type="button" onClick={() => { setCatFilter(c.id); applyFilter(c.id); }}
                                        className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold shadow-sm ring-1 transition ${active ? 'bg-red-600 text-white ring-red-600' : 'bg-white/80 text-muted-foreground ring-black/5 hover:text-foreground dark:bg-white/[0.06] dark:ring-white/10'}`}>
                                        <span className="size-2 rounded-full" style={{ background: catColor(c.color) }} />{c.name}
                                        {!catFilter && <span className="tabular-nums opacity-70">{count}</span>}
                                    </button>
                                );
                            })}
                        </>
                    }
                    stats={[
                        <MyStat key="t" label="Нийт файл" value={documents.length} />,
                        <MyStat key="c" label="Ангилал" value={categories.filter(c => documents.some(d => d.category_id === c.id)).length} accent="sky" />,
                        <MyStat key="e" label="Хугацаатай" value={documents.filter(d => d.expires_at).length} accent="amber" />,
                        <MyStat key="p" label="PDF" value={documents.filter(d => d.file_type.includes('pdf')).length} accent="red" />,
                    ]} />

                <MyCard title={catFilter ? categories.find(c => c.id === catFilter)?.name ?? 'Баримт' : 'Бүх баримт'} icon={FileText} count={documents.length} bodyClassName="">
                    {documents.length === 0 ? (
                        <MyEmpty icon={FileText} title={search ? 'Хайлтад тохирох баримт алга' : 'Баримт бичиг байхгүй байна'} />
                    ) : (
                        <table className={myTable.table}>
                            <thead className={myTable.thead}>
                                <tr className="border-b border-border/50">
                                    <th className={myTable.th}>Файл</th>
                                    <th className={myTable.th}>Хэмжээ</th>
                                    <th className={myTable.th}>Нэмсэн</th>
                                    <th className={myTable.th}>Хүчинтэй</th>
                                    <th className={`${myTable.th} text-right`}>Үйлдэл</th>
                                </tr>
                            </thead>
                            {(catFilter
                                ? [{ cat: null as Category | null, items: documents }]
                                : [...categories.filter(c => grouped[c.id]).map(c => ({ cat: c as Category | null, items: grouped[c.id] })),
                                    ...(uncategorized.length ? [{ cat: null as Category | null, items: uncategorized }] : [])]
                            ).map(({ cat, items }) => (
                                <tbody key={cat?.id ?? 'none'} className={`${myTable.tbody} border-t border-border/60`}>
                                    {!catFilter && (
                                        <tr className="bg-muted/30">
                                            <td colSpan={5} className="px-3 py-1.5">
                                                <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: catColor(cat?.color ?? null) }}>
                                                    <span className="size-2 rounded-full" style={{ background: catColor(cat?.color ?? null) }} />
                                                    {cat?.name ?? 'Ангилалгүй'}<span className="font-medium text-muted-foreground">· {items.length} файл</span>
                                                </span>
                                            </td>
                                        </tr>
                                    )}
                                    {items.map(doc => {
                                        const { Icon, color, bg, label } = fileIcon(doc.file_type);
                                        return (
                                            <tr key={doc.id} className={myTable.tr}>
                                                <td className={myTable.td}>
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg" style={{ background: bg }}>
                                                            <Icon className="size-4" style={{ color }} />
                                                            <span className="text-[7px] font-black" style={{ color }}>{label}</span>
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="truncate font-semibold">{doc.title}</p>
                                                            {doc.description && <p className="max-w-[420px] truncate text-[10px] text-muted-foreground">{doc.description}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`${myTable.td} whitespace-nowrap tabular-nums text-muted-foreground`}>{doc.file_size}</td>
                                                <td className={`${myTable.td} whitespace-nowrap tabular-nums text-muted-foreground`}>{doc.created_at}</td>
                                                <td className={`${myTable.td} whitespace-nowrap`}>
                                                    {doc.expires_at ? <MyPill tone="amber">{doc.expires_at} хүртэл</MyPill> : <span className="text-muted-foreground">Хугацаагүй</span>}
                                                </td>
                                                <td className={`${myTable.td} text-right`}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        {canView(doc.file_type) && (
                                                            <>
                                                                <a href={`/my/documents/${doc.id}/view`} target="_blank" rel="noreferrer" className={myBtn.subtle} title="Харах"><Eye className="size-3.5" />Харах</a>
                                                                <a href={`/my/documents/${doc.id}/view`} target="_blank" rel="noreferrer" title="Хэвлэх" className={myBtn.subtle}
                                                                    onClick={e => { e.preventDefault(); const w = window.open(`/my/documents/${doc.id}/view`, '_blank'); if (w) w.onload = () => w.print(); }}>
                                                                    <Printer className="size-3.5" />
                                                                </a>
                                                            </>
                                                        )}
                                                        <a href={`/my/documents/${doc.id}/download`} className={`${myBtn.primary} h-7`}><Download className="size-3.5" />Татах</a>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            ))}
                        </table>
                    )}
                </MyCard>
            </MyDesktop>
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
