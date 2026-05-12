import MyLayout from '@/layouts/my-layout';
import { NotificationBell } from '@/components/notification-bell';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { BookOpen, CheckCircle2, Clock, Search, Send, Tag, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

const RED    = '#dc2626';
const RED2   = '#b91c1c';
const RED3   = '#7f1d1d';
const PURPLE = '#7c3aed';

interface Employee {
    id: number; name: string; position: string | null; branch: string | null;
    photo_url: string | null; initials: string;
}
interface RentalItem {
    id: number; book_title: string; book_author: string | null;
    book_isbn: string | null; book_cover_url: string | null;
    category_name: string | null; category_color: string;
    status: 'pending' | 'approved' | 'rejected' | 'returned';
    rejection_reason: string | null; approved_at: string | null;
    returned_at: string | null; created_at: string;
}
interface BookItem {
    id: number; title: string; author: string | null; isbn: string | null;
    cover_url: string | null; total_copies: number; available_copies: number;
    category_name: string | null; category_color: string; already_requested: boolean;
}
interface Props { employee: Employee; rentals: RentalItem[]; books: BookItem[]; }

type Tab = 'books' | 'rentals';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Номын сан', href: '/my/book-rentals' }];

const COLOR_MAP: Record<string, string> = {
    blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    red:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    teal:   'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    gray:   'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
};

const STATUS_CFG = {
    pending:  { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'Хүлээгдэж байна', Icon: Clock },
    approved: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Зөвшөөрсөн',      Icon: CheckCircle2 },
    rejected: { color: RED,       bg: '#fff5f5', border: '#fecaca', label: 'Цуцалсан',         Icon: XCircle },
    returned: { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Буцаасан',         Icon: BookOpen },
} as const;

/* ── Desktop helpers (unchanged) ── */
function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG];
    if (!cfg) return null;
    const Icon = cfg.Icon;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            <Icon size={11} /> {cfg.label}
        </span>
    );
}
function BookCover({ url, title, size = 'md' }: { url: string | null; title: string; size?: 'sm' | 'md' }) {
    const ini = title.slice(0, 2).toUpperCase();
    const cls = size === 'sm' ? 'size-10' : 'size-14';
    return url
        ? <img src={url} alt={title} className={`${cls} rounded-lg object-cover shrink-0 shadow-sm border border-border/30`} />
        : <div className={`flex ${cls} shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-600 ${size === 'sm' ? 'text-xs' : 'text-sm'} font-bold border border-border/30`}>{ini}</div>;
}

/* ════════════════════════════════════════════════════════════ */
export default function MyBookRentals({ employee, rentals, books }: Props) {
    const [requestBookId, setRequestBookId] = useState<number | null>(null);
    const [search,        setSearch]        = useState('');
    const [activeTab,     setActiveTab]     = useState<Tab>('books');
    const [processing,    setProcessing]    = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            router.reload({ only: ['rentals', 'books'] });
        }, 15_000);
        return () => clearInterval(timer);
    }, []);

    function submitRequest(bookId: number) {
        setProcessing(true);
        router.post('/my/book-rentals', { book_id: bookId }, {
            preserveScroll: true,
            onSuccess: () => { setRequestBookId(null); setProcessing(false); },
            onError:   () => setProcessing(false),
        });
    }

    const pending  = rentals.filter(r => r.status === 'pending').length;
    const approved = rentals.filter(r => r.status === 'approved').length;

    const filteredBooks = search.trim()
        ? books.filter(b =>
            b.title.toLowerCase().includes(search.toLowerCase()) ||
            (b.author ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (b.isbn ?? '').toLowerCase().includes(search.toLowerCase())
          )
        : books;

    const requestingBook = books.find(b => b.id === requestBookId);

    /* ══════════════════════════ RENDER ══════════════════════════ */
    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title="Номын сан" />

            {/* ═══════════════════ MOBILE ═══════════════════ */}
            <div className="md:hidden" style={{ flex: 1, background: 'var(--my-page-bg)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' } as React.CSSProperties}>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

                {/* ─── RED HERO ──────────────────────────────── */}
                <div style={{ background: `linear-gradient(160deg, #ef4444 0%, ${RED} 30%, ${RED2} 65%, ${RED3} 100%)`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -60, right: -60, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: 40, right: 40, pointerEvents: 'none' }} />

                    {/* Top bar */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 0', gap: 10, position: 'relative' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, flex: 1, letterSpacing: 0.3 }}>HR · НОМЫН САН</span>
                        <NotificationBell variant="ghost" />
                        <Link href="/my/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {employee.photo_url
                                    ? <img src={employee.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                                    : <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{employee.initials}</span>
                                }
                            </div>
                        </Link>
                    </div>

                    {/* Title */}
                    <div style={{ padding: '14px 18px 14px', position: 'relative' }}>
                        <h1 style={{ margin: '0 0 5px', lineHeight: 1.1, letterSpacing: -0.8 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>Номын </span>
                            <span style={{ fontSize: 28, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontFamily: 'Georgia, "Times New Roman", serif' }}>сан</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 14px', fontWeight: 500 }}>
                            {employee.name}{employee.position ? ` · ${employee.position}` : ''}
                        </p>

                        {/* Glassmorphism stats */}
                        <div style={{ borderRadius: 20, background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(12px)', padding: '14px 16px', marginBottom: 4, border: '1px solid rgba(255,255,255,0.12)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#c4b5fd' }} />
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: 0.6 }}>НОМЫН ХҮСЭЛТ</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[
                                    { val: rentals.length, label: 'Нийт',      dot: 'rgba(255,255,255,0.5)' },
                                    { val: pending,         label: 'Хүлээгдэж', dot: '#fbbf24' },
                                    { val: approved,        label: 'Зөвшөөрсөн',dot: '#4ade80' },
                                ].map(({ val, label, dot }, i) => (
                                    <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 13, padding: '10px 8px', textAlign: 'center' }}>
                                        <p style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{val}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
                                            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 600 }}>{label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── CONTENT ───────────────────────────────── */}
                <div style={{ padding: '12px 14px 32px' }}>

                    {/* Tab strip */}
                    <div style={{ background: 'var(--my-card-bg)', borderRadius: 18, padding: 5, display: 'flex', gap: 4, marginBottom: 14, boxShadow: 'var(--my-shadow)' }}>
                        {([
                            { key: 'books',   label: 'Номын жагсаалт', count: books.length },
                            { key: 'rentals', label: 'Хүсэлтүүд',      count: rentals.length },
                        ] as { key: Tab; label: string; count: number }[]).map(({ key, label, count }) => (
                            <button key={key} onClick={() => setActiveTab(key)} style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '10px 8px', borderRadius: 13, border: 'none', cursor: 'pointer',
                                background: activeTab === key ? PURPLE : 'transparent',
                                transition: 'all 0.15s',
                            }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: activeTab === key ? 'white' : 'var(--my-muted)' }}>{label}</span>
                                <span style={{
                                    fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 99,
                                    background: activeTab === key ? 'rgba(255,255,255,0.25)' : 'var(--my-pill-bg)',
                                    color: activeTab === key ? 'white' : 'var(--my-muted)',
                                }}>{count}</span>
                            </button>
                        ))}
                    </div>

                    {/* ── Books tab ── */}
                    {activeTab === 'books' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {/* Search */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--my-card-bg)', borderRadius: 16, padding: '11px 14px', boxShadow: 'var(--my-shadow)' }}>
                                <Search size={16} color="var(--my-faint)" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Номын нэр, зохиогчоор хайх..."
                                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: 'var(--my-input-text)', background: 'transparent' }}
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                                        <X size={15} color="#aaa" />
                                    </button>
                                )}
                            </div>

                            {filteredBooks.length === 0 ? (
                                <div style={{ background: 'var(--my-card-bg)', borderRadius: 22, padding: '48px 20px', textAlign: 'center', boxShadow: 'var(--my-shadow)' }}>
                                    <div style={{ width: 56, height: 56, borderRadius: 18, background: '#f3f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                        <BookOpen size={26} color={PURPLE} />
                                    </div>
                                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-muted)', margin: '0 0 4px' }}>Ном олдсонгүй</p>
                                    <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0 }}>Хайлтын үр дүн байхгүй байна</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {filteredBooks.map(b => {
                                        const COVER_COLORS = ['#1e3a5f','#3b1a08','#1a3828','#3b0e1a','#1f1f42','#2a3812','#1a2d3d','#3d1f00'];
                                        const coverBg = COVER_COLORS[b.id % COVER_COLORS.length];
                                        return (
                                            <div key={b.id} style={{ background: 'var(--my-card-bg)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                                {/* Cover */}
                                                <div style={{ position: 'relative', paddingBottom: '138%' }}>
                                                    {b.cover_url ? (
                                                        <img src={b.cover_url} alt={b.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ position: 'absolute', inset: 0, background: coverBg, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '14px 13px' }}>
                                                            {/* subtle spine line */}
                                                            <div style={{ position: 'absolute', top: 0, left: 10, bottom: 0, width: 4, background: 'rgba(255,255,255,0.07)' }} />
                                                            <p style={{ color: 'rgba(255,255,255,0.93)', fontSize: 13, fontWeight: 800, lineHeight: 1.4, margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>{b.title}</p>
                                                            {b.author && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: 0, fontStyle: 'italic' }}>{b.author}</p>}
                                                        </div>
                                                    )}
                                                    {/* Available badge top-right */}
                                                    {b.available_copies > 0 && !b.already_requested && (
                                                        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', borderRadius: 99, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80' }} />
                                                            <span style={{ fontSize: 10, fontWeight: 800, color: 'white' }}>{b.available_copies}</span>
                                                        </div>
                                                    )}
                                                    {b.available_copies <= 0 && (
                                                        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', borderRadius: 99, padding: '3px 9px' }}>
                                                            <span style={{ fontSize: 10, fontWeight: 800, color: '#f87171' }}>Дууссан</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info below cover */}
                                                <div style={{ padding: '11px 12px 12px' }}>
                                                    <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--my-input-text)', margin: '0 0 2px', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{b.title}</p>
                                                    {b.author && <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: '0 0 9px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.author}</p>}

                                                    {b.already_requested ? (
                                                        <div style={{ background: '#fffbeb', borderRadius: 10, padding: '7px 8px', textAlign: 'center', border: '1px solid #fde68a' }}>
                                                            <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', letterSpacing: 0.3 }}>ХҮСЭЛТ ИЛГЭЭСЭН</span>
                                                        </div>
                                                    ) : b.available_copies <= 0 ? (
                                                        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '7px 8px', textAlign: 'center' }}>
                                                            <span style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 0.3 }}>БОЛОМЖГҮЙ</span>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => setRequestBookId(b.id)} style={{ width: '100%', background: 'var(--my-text)', borderRadius: 11, padding: '10px 0', color: 'var(--my-card-bg)', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                                            Авах <span style={{ fontSize: 15 }}>→</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Rentals tab ── */}
                    {activeTab === 'rentals' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {rentals.length === 0 ? (
                                <div style={{ background: 'var(--my-card-bg)', borderRadius: 22, padding: '52px 20px', textAlign: 'center', boxShadow: 'var(--my-shadow)' }}>
                                    <div style={{ width: 56, height: 56, borderRadius: 18, background: '#f3f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                        <BookOpen size={26} color={PURPLE} />
                                    </div>
                                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-muted)', margin: '0 0 6px' }}>Хүсэлт байхгүй</p>
                                    <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0 }}>Номын жагсаалтаас номоо сонгон хүсэлт илгээнэ үү</p>
                                </div>
                            ) : (
                                rentals.map(r => {
                                    const cfg  = STATUS_CFG[r.status] ?? STATUS_CFG.returned;
                                    const Icon = cfg.Icon;
                                    return (
                                        <div key={r.id} style={{ background: 'var(--my-card-bg)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--my-shadow)', borderLeft: `4px solid ${cfg.color}` }}>
                                            <div style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                                {/* Status icon */}
                                                <div style={{ width: 44, height: 44, borderRadius: 14, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${cfg.border}` }}>
                                                    <Icon size={20} color={cfg.color} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                                                        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--my-input-text)', flex: 1, lineHeight: 1.3, margin: 0 }}>{r.book_title}</p>
                                                        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: cfg.color, background: cfg.bg, borderRadius: 99, padding: '3px 9px', border: `1px solid ${cfg.border}` }}>
                                                            {cfg.label}
                                                        </span>
                                                    </div>
                                                    {r.book_author && <p style={{ fontSize: 12, color: 'var(--my-muted)', margin: '0 0 6px' }}>{r.book_author}</p>}
                                                    <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: 0 }}>Илгээсэн: {r.created_at}</p>
                                                    {r.approved_at && <p style={{ fontSize: 11, color: '#16a34a', margin: '2px 0 0' }}>Зөвшөөрсөн: {r.approved_at}</p>}
                                                    {r.returned_at && <p style={{ fontSize: 11, color: 'var(--my-muted)', margin: '2px 0 0' }}>Буцаасан: {r.returned_at}</p>}
                                                    {r.status === 'rejected' && r.rejection_reason && (
                                                        <div style={{ marginTop: 8, background: '#fff5f5', borderRadius: 10, padding: '7px 10px', border: '1px solid #fecaca' }}>
                                                            <p style={{ fontSize: 12, color: RED, margin: 0 }}>{r.rejection_reason}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════ DESKTOP ═══════════════════ */}
            <div className="hidden md:flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Номын сан</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{employee.name}</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Нийт хүсэлт',  value: rentals.length, color: 'text-foreground' },
                        { label: 'Хүлээгдэж буй', value: pending,         color: 'text-amber-500' },
                        { label: 'Зөвшөөрсөн',    value: approved,        color: 'text-green-500' },
                    ].map(s => (
                        <div key={s.label} className="rounded-2xl border bg-card shadow-sm px-5 py-4">
                            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Book catalog */}
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Номын жагсаалт</p>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Хайх..."
                            className="rounded-lg border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 w-52" />
                    </div>
                    {filteredBooks.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">Ном байхгүй байна</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="border-b bg-muted/20">
                                <tr className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <th className="px-5 py-3 text-left">НОМ</th>
                                    <th className="px-4 py-3 text-left">АНГИЛАЛ</th>
                                    <th className="px-4 py-3 text-center">НИЙТ</th>
                                    <th className="px-4 py-3 text-center">БОЛОМЖИТ</th>
                                    <th className="px-4 py-3 text-right">ҮЙЛДЭЛ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredBooks.map(b => (
                                    <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <BookCover url={b.cover_url} title={b.title} size="sm" />
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-foreground">{b.title}</p>
                                                    {b.author && <p className="text-xs text-muted-foreground">{b.author}{b.isbn ? ` · ${b.isbn}` : ''}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {b.category_name ? (
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_MAP[b.category_color] ?? COLOR_MAP.blue}`}>
                                                    <Tag className="size-3" /> {b.category_name}
                                                </span>
                                            ) : <span className="text-muted-foreground text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center"><span className="font-semibold">{b.total_copies}</span></td>
                                        <td className="px-4 py-3 text-center">
                                            {b.available_copies > 0 ? (
                                                <span className="inline-flex items-center justify-center size-7 rounded-full bg-teal-500 text-white text-xs font-bold">{b.available_copies}</span>
                                            ) : (
                                                <span className="inline-flex items-center justify-center size-7 rounded-full bg-red-100 dark:bg-red-950/30 text-red-500 text-xs font-bold">0</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {b.already_requested ? (
                                                <span className="rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 px-3 py-1.5 text-xs font-medium text-amber-600">Хүсэлт илгээсэн</span>
                                            ) : b.available_copies <= 0 ? (
                                                <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">Боломжгүй</span>
                                            ) : (
                                                <button onClick={() => setRequestBookId(b.id)}
                                                    className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors ml-auto">
                                                    <Send className="size-3" /> Түрээслэх
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Rental history */}
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className="border-b bg-muted/30 px-6 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Миний хүсэлтүүд</p>
                    </div>
                    {rentals.length === 0 ? (
                        <div className="py-14 text-center text-sm text-muted-foreground">Хүсэлт байхгүй байна</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50 text-xs text-muted-foreground">
                                    <th className="px-6 py-3 text-left font-semibold">НОМ</th>
                                    <th className="px-4 py-3 text-left font-semibold">СТАТУС</th>
                                    <th className="px-4 py-3 text-left font-semibold">ОГНОО</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {rentals.map(r => (
                                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <BookCover url={r.book_cover_url} title={r.book_title} size="sm" />
                                                <div>
                                                    <p className="font-semibold text-foreground">{r.book_title}</p>
                                                    {r.book_author && <p className="text-xs text-muted-foreground">{r.book_author}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <StatusBadge status={r.status} />
                                                {r.status === 'rejected' && r.rejection_reason && (
                                                    <p className="mt-1 text-xs text-red-500">{r.rejection_reason}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            <p>Илгээсэн: {r.created_at}</p>
                                            {r.approved_at && <p className="mt-0.5 text-green-600 dark:text-green-400">Зөвшөөрсөн: {r.approved_at}</p>}
                                            {r.returned_at && <p className="mt-0.5">Буцаасан: {r.returned_at}</p>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ─── Confirm bottom sheet (mobile) ─── */}
            {requestBookId !== null && requestingBook && (
                <div className="md:hidden" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={() => setRequestBookId(null)} />
                    <div style={{ position: 'relative', width: '100%', background: 'var(--my-sheet-bg)', borderRadius: '26px 26px 0 0', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)' }}>
                        <div style={{ width: 36, height: 4, background: 'var(--my-divider)', borderRadius: 99, margin: '14px auto 6px' }} />

                        {/* Book preview */}
                        <div style={{ margin: '0 14px 14px', background: 'var(--my-card-bg)', borderRadius: 20, padding: '16px', display: 'flex', gap: 14, alignItems: 'flex-start', boxShadow: 'var(--my-shadow)' }}>
                            {requestingBook.cover_url ? (
                                <img src={requestingBook.cover_url} alt={requestingBook.title} style={{ width: 54, height: 74, borderRadius: 10, objectFit: 'cover', boxShadow: '0 4px 14px rgba(0,0,0,0.18)', flexShrink: 0 }} />
                            ) : (
                                <div style={{ width: 54, height: 74, borderRadius: 10, background: 'linear-gradient(145deg, #ede9fe, #ddd6fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(124,58,237,0.2)' }}>
                                    <span style={{ fontSize: 18, fontWeight: 900, color: PURPLE }}>{requestingBook.title.slice(0, 2).toUpperCase()}</span>
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--my-text)', margin: '0 0 3px', lineHeight: 1.3 }}>{requestingBook.title}</p>
                                {requestingBook.author && <p style={{ fontSize: 13, color: 'var(--my-muted)', margin: '0 0 8px' }}>{requestingBook.author}</p>}
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 700, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                                    {requestingBook.available_copies} хувь боломжтой
                                </span>
                            </div>
                            <button onClick={() => setRequestBookId(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--my-pill-bg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                <X size={14} color="var(--my-muted)" />
                            </button>
                        </div>

                        <p style={{ fontSize: 13, color: 'var(--my-muted)', margin: '0 14px 16px', lineHeight: 1.55 }}>
                            Энэ номыг түрээслэх хүсэлт илгээхдээ итгэлтэй байна уу? HR администратор зөвшөөрсний дараа авах боломжтой болно.
                        </p>

                        <div style={{ display: 'flex', gap: 10, padding: '0 14px' }}>
                            <button
                                onClick={() => submitRequest(requestBookId)}
                                disabled={processing}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`, padding: '14px 0', fontSize: 15, fontWeight: 700, color: 'white', border: 'none', cursor: 'pointer', opacity: processing ? 0.6 : 1, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}
                            >
                                {processing
                                    ? <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                                    : <Send size={17} />}
                                Хүсэлт илгээх
                            </button>
                            <button onClick={() => setRequestBookId(null)} style={{ borderRadius: 16, background: 'var(--my-card-bg)', padding: '14px 20px', fontSize: 15, fontWeight: 600, color: 'var(--my-muted)', border: '1px solid var(--my-divider)', cursor: 'pointer' }}>
                                Болих
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Confirm modal (desktop) ─── */}
            {requestBookId !== null && requestingBook && (
                <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border bg-card shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b">
                            <h3 className="font-bold text-foreground">Түрээслэх хүсэлт</h3>
                            <button onClick={() => setRequestBookId(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <BookCover url={requestingBook.cover_url} title={requestingBook.title} />
                                <div>
                                    <p className="font-semibold text-foreground">{requestingBook.title}</p>
                                    {requestingBook.author && <p className="text-xs text-muted-foreground">{requestingBook.author}</p>}
                                    <p className="mt-1 text-xs text-teal-600 font-medium">{requestingBook.available_copies} хувь боломжтой</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-5">
                                Энэ номыг түрээслэх хүсэлт илгээхдээ итгэлтэй байна уу? HR администратор зөвшөөрсний дараа авах боломжтой болно.
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => submitRequest(requestBookId)} disabled={processing}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                                    {processing ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Send className="size-4" />}
                                    Хүсэлт илгээх
                                </button>
                                <button onClick={() => setRequestBookId(null)} className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                                    Болих
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </MyLayout>
    );
}
