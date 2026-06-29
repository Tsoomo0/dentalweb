import { Head } from '@inertiajs/react';
import { useState, useEffect, type CSSProperties } from 'react';
import PublicLayout from '@/layouts/public-layout';
import { X, Tag, Calendar, Link2, Check } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES — backend-ээс ирэх жинхэнэ өгөгдөл
   ═══════════════════════════════════════════════════════════════════════════ */
interface Article {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    category: string | null;
    featured_image: string | null;
    image_url?: string | null; // backend нь image_url нэрээр илгээдэг
    published_at: string | null;
    author?: string | null;
}
interface PageProps {
    [key: string]: unknown;
    articles: Article[];
}

const RED = '#c81e3a';

/* glass card-н нийтлэг хүрээ */
const glassPanel =
    'rounded-[30px] border border-white/70 bg-white/50 shadow-[0_14px_40px_rgba(120,30,50,0.06)] backdrop-blur-xl';

/* зургийн эх сурвалжийг нэгтгэх (featured_image эсвэл image_url) */
const imgOf = (a: Article): string | null => a.featured_image || a.image_url || null;

function SectionBadge({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-4 inline-flex items-center gap-2 rounded-[30px] border border-[#c81e3a]/20 bg-[#c81e3a]/10 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#c81e3a] shadow-[0_8px_20px_rgba(120,30,50,0.1)] backdrop-blur-md">
            <span className="h-[7px] w-[7px] rounded-full bg-[#c81e3a]" />
            {children}
        </div>
    );
}

/* зураг байхгүй үед — судалтай орлуулагч */
function Placeholder({ label, className = '', style }: { label: string; className?: string; style?: CSSProperties }) {
    return (
        <div
            className={`flex items-center justify-center text-center text-[12px] font-medium text-[#b3a7a3] ${className}`}
            style={{ background: 'repeating-linear-gradient(45deg,#f3eceb,#f3eceb 11px,#eee3e2 11px,#eee3e2 22px)', ...style }}
        >
            {label}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL — мэдээний дэлгэрэнгүй (детал route байхгүй тул хуучин логикийг хадгалав)
   ═══════════════════════════════════════════════════════════════════════════ */
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'cuticulModalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
            >
                {children}
            </div>
        </div>
    );
}

function IconFacebook() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </svg>
    );
}

function ArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
    const [copied, setCopied] = useState(false);
    const img = imgOf(article);
    const articleUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/articles/${article.slug}`
        : `/articles/${article.slug}`;

    const shareToFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`, '_blank', 'width=600,height=400');
    };
    const copyLink = () => {
        navigator.clipboard.writeText(articleUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };

    return (
        <Modal open onClose={onClose}>
            <div className="relative">
                {img ? (
                    <div className="aspect-[16/7] overflow-hidden rounded-t-3xl">
                        <img src={img} alt={article.title} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 rounded-t-3xl bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                ) : (
                    <Placeholder label="мэдээний зураг" className="aspect-[16/7] w-full rounded-t-3xl" />
                )}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-all hover:bg-black/50"
                >
                    <X className="h-5 w-5" />
                </button>
                {article.category && (
                    <div className="absolute bottom-4 left-5">
                        <span className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                            <Tag className="h-3 w-3" /> {article.category}
                        </span>
                    </div>
                )}
            </div>

            <div className="p-6 sm:p-8">
                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-100 pb-4">
                    {article.author && (
                        <span className="text-sm font-semibold text-gray-700">{article.author}</span>
                    )}
                    {article.published_at && (
                        <span className="flex items-center gap-1.5 text-sm text-gray-400">
                            <Calendar className="h-3.5 w-3.5" /> {article.published_at}
                        </span>
                    )}
                </div>

                <h2 className="mb-4 font-onest text-2xl font-extrabold leading-tight text-gray-900">{article.title}</h2>

                {article.excerpt && (
                    <p className="mb-6 text-[15px] leading-relaxed text-gray-600">{article.excerpt}</p>
                )}

                <div className="border-t border-gray-100 pt-5">
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Хуваалцах</p>
                    <div className="flex gap-2">
                        <button
                            onClick={shareToFacebook}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1877F2] py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#166fe5]"
                        >
                            <IconFacebook /> Facebook
                        </button>
                        <button
                            onClick={copyLink}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
                                copied ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {copied ? <><Check className="h-4 w-4" /> Хуулагдлаа</> : <><Link2 className="h-4 w-4" /> Холбоос хуулах</>}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Articles({ articles = [] }: PageProps) {
    const fallback: Article[] = [
        { id: 1, title: 'Шинэ салбар Яармагт нээлтээ хийлээ', slug: 'yarmag-salbar', excerpt: 'Хотын баруун хэсэгт байрлах шинэ салбараа нээлээ. Орчин үеийн тоног төхөөрөмжөөр тоноглогдсон.', category: 'Эмнэлгийн мэдээ', featured_image: null, published_at: '2026.06.10', author: 'Кутикул' },
        { id: 2, title: 'Шүдээ өдөрт хэдэн удаа угаах нь зөв вэ?', slug: 'shudee-ugaah', excerpt: 'Өглөө, оройд хоёр удаа, наад зах нь 2 минут угаах нь чухал. Зөв техникийн талаар.', category: 'Зөвлөгөө', featured_image: null, published_at: '2026.06.08', author: 'Кутикул' },
        { id: 3, title: 'Зуны хямдрал: цайруулалт 30%-иар', slug: 'zuny-khyamdral', excerpt: '6-р сарын турш бүх төрлийн цайруулалтын үйлчилгээнд онцгой хямдрал.', category: 'Урамшуулал', featured_image: null, published_at: '2026.06.05', author: 'Кутикул' },
    ];

    const source = articles.length > 0 ? articles : fallback;

    /* ангилалууд (жинхэнэ category утгуудаас) */
    const categories = Array.from(new Set(source.map((a) => a.category).filter(Boolean))) as string[];
    const tabs = ['Бүгд', ...categories];
    const [cat, setCat] = useState(0);

    const filtered = cat === 0 ? source : source.filter((a) => a.category === tabs[cat]);
    const [featured, ...rest] = filtered;

    const [selected, setSelected] = useState<Article | null>(null);

    return (
        <PublicLayout>
            <Head title="Мэдээ — Кутикул">
                <style>{`@keyframes cuticulModalIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
            </Head>

            {/* ── HERO + FEATURED ───────────────────────────────────────────── */}
            <div className="mt-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[0.78fr_1.22fr]">
                <div className={`flex flex-col justify-center p-8 sm:p-11 ${glassPanel}`}>
                    <SectionBadge>Мэдээ</SectionBadge>
                    <h1 className="mb-3.5 font-onest text-[32px] font-extrabold leading-[1.12] tracking-tight text-[#1c1a1b] sm:text-[38px]">
                        Мэдээ, зөвлөгөө
                    </h1>
                    <p className="text-[15px] leading-[1.7] text-[#6b6360]">
                        Эмнэлгийн шинэ мэдээ, урамшуулал, шүдний эрүүл мэндийн талаарх ашигтай зөвлөгөөг эндээс уншаарай.
                    </p>
                </div>

                {featured ? (
                    <button
                        onClick={() => setSelected(featured)}
                        className="group relative flex min-h-[320px] items-end overflow-hidden rounded-[30px] border border-white/60 text-left shadow-[0_16px_44px_rgba(120,30,50,0.12)]"
                    >
                        {imgOf(featured) ? (
                            <img
                                src={imgOf(featured)!}
                                alt={featured.title}
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                        ) : (
                            <Placeholder label="онцлох мэдээний зураг" className="absolute inset-0 h-full w-full" />
                        )}
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg,rgba(20,6,10,.72) 0%,rgba(20,6,10,.1) 55%,transparent 100%)' }} />
                        <div className="relative p-8 sm:p-9">
                            <span className="mb-3.5 inline-block rounded-[30px] bg-[#c81e3a] px-3.5 py-1.5 text-[11px] font-bold text-white">Онцлох</span>
                            <h2 className="mb-2.5 max-w-[560px] font-onest text-[24px] font-extrabold leading-[1.2] text-white sm:text-[28px]">{featured.title}</h2>
                            <div className="text-[13px] font-medium text-white/80">
                                {featured.published_at}{featured.published_at && featured.category ? ' · ' : ''}{featured.category}
                            </div>
                        </div>
                    </button>
                ) : (
                    <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[30px] border border-white/60">
                        <Placeholder label="онцлох мэдээ алга" className="absolute inset-0 h-full w-full" />
                    </div>
                )}
            </div>

            {/* ── NEWS GRID ─────────────────────────────────────────────────── */}
            <div className={`mt-7 p-7 sm:p-11 ${glassPanel}`}>
                {tabs.length > 1 && (
                    <div className="mb-7 flex flex-wrap gap-2.5">
                        {tabs.map((t, i) => {
                            const on = i === cat;
                            return (
                                <button
                                    key={t}
                                    onClick={() => setCat(i)}
                                    className="rounded-[40px] border-[1.5px] px-4 py-2 text-[14px] font-semibold transition-all"
                                    style={{ borderColor: on ? RED : '#ece6e5', background: on ? RED : 'rgba(255,255,255,.6)', color: on ? '#fff' : '#6b6360' }}
                                >
                                    {t}
                                </button>
                            );
                        })}
                    </div>
                )}

                {rest.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {rest.map((a) => {
                            const img = imgOf(a);
                            return (
                                <button
                                    key={a.id}
                                    onClick={() => setSelected(a)}
                                    className="group block overflow-hidden rounded-[20px] border border-[#f1e8e7] bg-white text-left shadow-[0_1px_2px_rgba(120,30,50,0.04)] transition-all hover:-translate-y-1 hover:border-[#f4d4da] hover:shadow-[0_16px_38px_rgba(120,30,50,0.13)]"
                                >
                                    <div className="relative aspect-[16/10] overflow-hidden">
                                        {img ? (
                                            <img src={img} alt={a.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        ) : (
                                            <Placeholder label="мэдээний зураг" className="h-full w-full" />
                                        )}
                                        {a.category && (
                                            <div className="absolute left-3 top-3 rounded-[30px] bg-white/90 px-3 py-1.5 text-[11px] font-bold text-[#c81e3a] backdrop-blur-sm">{a.category}</div>
                                        )}
                                    </div>
                                    <div className="p-5 sm:p-[22px]">
                                        {a.published_at && <div className="mb-2 text-[12px] font-medium text-[#9a918d]">{a.published_at}</div>}
                                        <h3 className="mb-2.5 font-onest text-[18px] font-bold leading-[1.3]">{a.title}</h3>
                                        {a.excerpt && <p className="mb-3.5 line-clamp-2 text-[14px] leading-[1.6] text-[#6b6360]">{a.excerpt}</p>}
                                        <span className="text-[13px] font-bold text-[#c81e3a]">Дэлгэрэнгүй унших →</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-16 text-center text-[15px] font-medium text-[#9a918d]">
                        {featured ? 'Энэ ангилалд өөр мэдээ алга байна.' : 'Энэ ангилалд мэдээ байхгүй байна.'}
                    </div>
                )}
            </div>

            {/* ── NEWSLETTER ────────────────────────────────────────────────── */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-7 rounded-[30px] bg-[#1c1a1b]/95 px-8 py-12 text-white sm:px-12">
                <div>
                    <h2 className="mb-2.5 font-onest text-[26px] font-extrabold leading-[1.18] sm:text-[30px]">Шинэ мэдээ, урамшууллыг хүлээж аваарай</h2>
                    <p className="max-w-[440px] text-[15px] leading-[1.6] text-[#b6aeac]">И-мэйл хаягаа үлдээгээд эмнэлгийн шинэ мэдээ, хямдралын мэдээллийг хүлээн авна уу.</p>
                </div>
                <div className="flex flex-none gap-2.5">
                    <input
                        type="email"
                        placeholder="И-мэйл хаяг"
                        className="w-[240px] rounded-[13px] border border-[#3a3533] bg-[#26221f] px-[18px] py-3.5 text-[14px] font-medium text-white outline-none placeholder:text-[#9a918d]"
                    />
                    <button
                        type="button"
                        className="whitespace-nowrap rounded-[13px] bg-[#c81e3a] px-6 py-3.5 text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(200,30,58,0.3)]"
                    >
                        Бүртгүүлэх
                    </button>
                </div>
            </div>

            {selected && <ArticleModal article={selected} onClose={() => setSelected(null)} />}
        </PublicLayout>
    );
}
