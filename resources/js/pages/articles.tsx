import { Head } from '@inertiajs/react';
import { useState, useEffect, type CSSProperties } from 'react';
import PublicLayout from '@/layouts/public-layout';
import { X, Tag, Calendar } from 'lucide-react';

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

function ArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
    const img = imgOf(article);

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
                {article.published_at && (
                    <div className="mb-4 flex items-center border-b border-gray-100 pb-4">
                        <span className="flex items-center gap-1.5 text-sm text-gray-400">
                            <Calendar className="h-3.5 w-3.5" /> {article.published_at}
                        </span>
                    </div>
                )}

                <h2 className="mb-4 font-onest text-2xl font-extrabold leading-tight text-gray-900">{article.title}</h2>

                {article.excerpt && (
                    <p className="text-[15px] leading-relaxed text-gray-600">{article.excerpt}</p>
                )}
            </div>
        </Modal>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Articles({ articles = [] }: PageProps) {
    /* зөвхөн backend-ээс ирсэн жинхэнэ мэдээ — хуурамч контентгүй */
    const source = articles;

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

            {selected && <ArticleModal article={selected} onClose={() => setSelected(null)} />}
        </PublicLayout>
    );
}
