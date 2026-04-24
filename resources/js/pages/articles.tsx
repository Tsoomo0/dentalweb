import { Head, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import PublicLayout from '@/layouts/public-layout';
import { ArrowRight, Smile, X, Tag, Calendar, User, Clock, Link2, Check, BookOpen } from 'lucide-react';

// ── Facebook & Instagram SVG icons ─────────────────────────────────────────
function IconFacebook() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
        </svg>
    );
}
function IconInstagram() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
    );
}

interface Article {
    id: number; title: string; slug: string; excerpt: string | null;
    category: string | null; featured_image: string | null;
    published_at: string | null; author: string | null;
}
interface PageProps {
    [key: string]: unknown;
    auth: { user?: { name: string } };
    articles: Article[];
}

// ── Modal Base ──────────────────────────────────────────────────────────────
function Modal({ open, onClose, children }: {
    open: boolean; onClose: () => void; children: React.ReactNode
}) {
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
            <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                {children}
            </div>
        </div>
    );
}

// ── Article Modal ───────────────────────────────────────────────────────────
function ArticleModal({ article, onClose }: { article: Article | null; onClose: () => void }) {
    const [copied, setCopied] = useState(false);
    if (!article) return null;

    const articleUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/articles/${article.slug}`
        : `/articles/${article.slug}`;

    const shareToFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`, '_blank', 'width=600,height=400');
    };

    const shareToInstagram = () => {
        navigator.clipboard.writeText(articleUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };

    return (
        <Modal open onClose={onClose}>
            {/* Header image */}
            <div className="relative">
                {article.featured_image ? (
                    <div className="aspect-[16/7] overflow-hidden rounded-t-3xl">
                        <img src={article.featured_image} alt={article.title} className="w-full h-full object-cover"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-t-3xl"/>
                    </div>
                ) : (
                    <div className="aspect-[16/7] bg-gradient-to-br from-rose-100 to-red-50 rounded-t-3xl flex items-center justify-center">
                        <Smile className="w-16 h-16 text-red-200"/>
                    </div>
                )}
                <button onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all">
                    <X className="w-5 h-5"/>
                </button>
                {article.category && (
                    <div className="absolute bottom-4 left-5">
                        <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30 flex items-center gap-1.5">
                            <Tag className="w-3 h-3"/> {article.category}
                        </span>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8">
                {/* Meta row — автор + огноо + цаг */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 pb-4 border-b border-gray-100">
                    {article.author && (
                        <span className="flex items-center gap-1.5 text-gray-700 text-sm font-semibold">
                            <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-red-600"/>
                            </span>
                            {article.author}
                        </span>
                    )}
                    {article.published_at && (
                        <span className="flex items-center gap-1.5 text-gray-400 text-sm">
                            <Calendar className="w-3.5 h-3.5"/> {article.published_at}
                        </span>
                    )}
                    {article.published_at && (
                        <span className="flex items-center gap-1.5 text-gray-400 text-sm">
                            <Clock className="w-3.5 h-3.5"/> {article.published_at.includes(':') ? '' : '09:00'}
                        </span>
                    )}
                </div>

                {/* Title */}
                <h2 className="text-2xl font-black text-gray-900 leading-tight mb-4">{article.title}</h2>

                {/* Excerpt */}
                {article.excerpt && (
                    <p className="text-gray-600 leading-relaxed text-[15px] mb-6">{article.excerpt}</p>
                )}

                {/* Share buttons */}
                <div className="pt-5 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Хуваалцах</p>
                    <div className="flex gap-2">
                        {/* Facebook */}
                        <button onClick={shareToFacebook}
                            className="flex-1 flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#166fe5] text-white text-sm font-bold py-3 rounded-xl transition-all shadow-sm">
                            <IconFacebook/> Facebook
                        </button>
                        {/* Instagram — link copy */}
                        <button onClick={shareToInstagram}
                            className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl transition-all shadow-sm ${
                                copied
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white hover:opacity-90'
                            }`}>
                            {copied ? <><Check className="w-4 h-4"/> Хуулагдлаа</> : <><IconInstagram/> Instagram</>}
                        </button>
                        {/* Copy link */}
                        <button onClick={shareToInstagram} title="Холбоос хуулах"
                            className={`w-12 flex items-center justify-center rounded-xl border transition-all ${
                                copied ? 'border-green-300 bg-green-50 text-green-600' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500'
                            }`}>
                            {copied ? <Check className="w-4 h-4"/> : <Link2 className="w-4 h-4"/>}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function ArticlesPage() {
    const { articles } = usePage<PageProps>().props;
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

    const fallback: Article[] = [
        { id: 1, title: 'Invisalign гэж юу вэ? Бүрэн гарын авлага', slug: 'invisalign', excerpt: 'Харагдахгүй шилэн тэгшлэгч системийн давуу тал, зардал, хугацааны талаар дэлгэрэнгүй мэдэж ав.', category: 'Эмчилгээ', featured_image: null, published_at: '2024.12.01', author: 'Cuticul' },
        { id: 2, title: 'Брекет тавиулсны дараа яаж арчилах вэ?', slug: 'breket', excerpt: 'Брекеттэй байхдаа шүдээ хэрхэн зөв цэвэрлэх, ямар хоол идвэл зохих талаар практик зөвлөгөө.', category: 'Зөвлөгөө', featured_image: null, published_at: '2024.11.15', author: 'Cuticul' },
        { id: 3, title: 'Хүүхдийн шүдний эрүүл мэнд', slug: 'kids', excerpt: 'Хүүхдийн сүү шүд, байнгын шүдийг яаж арчлах, хэзээ эмчид очих талаар эцэг эхчүүдэд зориулсан зөвлөгөө.', category: 'Урьдчилан сэргийлэлт', featured_image: null, published_at: '2024.11.01', author: 'Cuticul' },
        { id: 4, title: 'Шүд цайруулалт — Аюулгүй мөртлөө гоё', slug: 'whitening', excerpt: 'Мэргэжлийн шүд цайруулалтын тухай — гэрт хийдэг болон эмнэлэгт хийдэг аргуудын харьцуулалт.', category: 'Зөвлөгөө', featured_image: null, published_at: '2024.10.20', author: 'Cuticul' },
        { id: 5, title: 'Retainer — Яагаад чухал вэ?', slug: 'retainer', excerpt: 'Брекет засал дуусгасны дараа retainer зайлшгүй шаардлагатай байдаг шалтгааны талаар.', category: 'Эмчилгээ', featured_image: null, published_at: '2024.10.05', author: 'Cuticul' },
        { id: 6, title: 'Насанд хүрэгчдийн гажиг засал', slug: 'adult', excerpt: '30, 40 насандаа ч засал хийлгэх боломжтой — орчин үеийн аргуудыг танилцуулна.', category: 'Эмчилгээ', featured_image: null, published_at: '2024.09.18', author: 'Cuticul' },
    ];

    const source = articles.length > 0 ? articles : fallback;
    const categories = Array.from(new Set(source.map(a => a.category).filter(Boolean))) as string[];
    const filtered = activeCategory ? source.filter(a => a.category === activeCategory) : source;
    const [featured, ...rest] = filtered;

    return (
        <>
            <Head title="Мэдээ"/>
            <style>{`
                @keyframes modalIn { from{opacity:0;transform:translateY(32px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
            `}</style>
            <PublicLayout>

                {/* ── Hero ───────────────────────────────────── */}
                <section className="pt-20 sm:pt-28 pb-12 sm:pb-16 bg-[#16100A] relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[140px] -translate-x-1/3 translate-y-1/3 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.12) 0%, transparent 70%)' }}/>
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}/>
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-2xl">
                            <span className="inline-flex items-center gap-2 text-red-500 text-xs font-bold uppercase tracking-widest mb-5 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
                                <BookOpen className="w-3.5 h-3.5"/> Мэдээ мэдээлэл
                            </span>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-4">
                                Шүдний эрүүл<br/>
                                <span className="text-red-500">мэндийн мэдлэг</span>
                            </h1>
                            <p className="text-gray-400 text-base leading-relaxed">
                                Гажиг засал, ерөнхий шүдний арчлалтын талаар мэдэхэд хэрэгтэй бүхнийг тайлбарласан нийтлэлүүд.
                            </p>
                        </div>
                        {/* Stats row */}
                        <div className="flex gap-6 mt-8 pt-8 border-t border-white/8">
                            <div>
                                <p className="text-white font-black text-2xl">{source.length}</p>
                                <p className="text-gray-500 text-xs mt-0.5">Нийтлэл</p>
                            </div>
                            <div className="w-px bg-white/8"/>
                            <div>
                                <p className="text-white font-black text-2xl">{categories.length}</p>
                                <p className="text-gray-500 text-xs mt-0.5">Ангилал</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Category Filter ─────────────────────────── */}
                {categories.length > 0 && (
                    <div className="bg-white border-b border-gray-100 shadow-sm sticky top-[68px] z-40">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
                            <button onClick={() => setActiveCategory(null)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all ${activeCategory === null ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600'}`}>
                                Бүгд <span className="ml-1.5 text-[10px] opacity-70">{source.length}</span>
                            </button>
                            {categories.map(c => (
                                <button key={c} onClick={() => setActiveCategory(c)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all ${activeCategory === c ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600'}`}>
                                    {c}
                                    <span className="ml-1.5 text-[10px] opacity-70">
                                        {source.filter(a => a.category === c).length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Articles ────────────────────────────────── */}
                <section className="py-10 sm:py-14 bg-[#F9F4F2] min-h-[50vh]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {filtered.length > 0 ? (
                            <div className="flex flex-col gap-8">

                                {/* Featured */}
                                {featured && (
                                    <button onClick={() => setSelectedArticle(featured)}
                                        className="group w-full text-left bg-white rounded-3xl overflow-hidden border border-gray-100 hover:border-red-200 hover:shadow-xl transition-all duration-300"
                                        style={{ animation: 'fadeUp 0.4s ease forwards' }}>
                                        <div className="grid md:grid-cols-5">
                                            <div className="md:col-span-2 aspect-[4/3] md:aspect-auto bg-gradient-to-br from-rose-50 to-red-100 overflow-hidden min-h-[200px]">
                                                {featured.featured_image
                                                    ? <img src={featured.featured_image} alt={featured.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                                                    : <div className="w-full h-full flex items-center justify-center">
                                                        <Smile className="w-14 h-14 text-red-200"/>
                                                      </div>
                                                }
                                            </div>
                                            <div className="md:col-span-3 p-7 md:p-10 flex flex-col justify-center">
                                                <div className="flex items-center gap-3 mb-4">
                                                    {featured.category && (
                                                        <span className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                                            {featured.category}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Онцлох</span>
                                                </div>
                                                <h2 className="font-black text-gray-900 text-xl md:text-2xl leading-snug mb-3 group-hover:text-red-700 transition-colors">
                                                    {featured.title}
                                                </h2>
                                                {featured.excerpt && (
                                                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 mb-6">{featured.excerpt}</p>
                                                )}
                                                <div className="flex items-center justify-between mt-auto">
                                                    {featured.published_at && (
                                                        <span className="text-gray-400 text-xs flex items-center gap-1.5">
                                                            <Calendar className="w-3 h-3"/> {featured.published_at}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-2 text-red-600 font-bold text-sm ml-auto group-hover:gap-3 transition-all">
                                                        Дэлгэрэнгүй <ArrowRight className="w-4 h-4"/>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                )}

                                {/* Grid */}
                                {rest.length > 0 && (
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {rest.map((a, i) => (
                                            <button key={a.id} onClick={() => setSelectedArticle(a)}
                                                className="group w-full text-left bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all duration-300"
                                                style={{ animation: `fadeUp 0.4s ease ${i * 0.06}s both` }}>
                                                <div className="aspect-[16/9] bg-gradient-to-br from-rose-50 to-red-100 overflow-hidden">
                                                    {a.featured_image
                                                        ? <img src={a.featured_image} alt={a.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                                        : <div className="w-full h-full flex items-center justify-center">
                                                            <Smile className="w-9 h-9 text-red-200"/>
                                                          </div>
                                                    }
                                                </div>
                                                <div className="p-5">
                                                    {a.category && (
                                                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-[10px] font-bold px-2.5 py-1 rounded-full mb-3 uppercase tracking-wide">
                                                            <Tag className="w-2.5 h-2.5"/> {a.category}
                                                        </span>
                                                    )}
                                                    <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-2 group-hover:text-red-700 transition-colors">
                                                        {a.title}
                                                    </h3>
                                                    {a.excerpt && (
                                                        <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 mb-4">{a.excerpt}</p>
                                                    )}
                                                    <div className="flex items-center justify-between pt-3.5 border-t border-gray-50">
                                                        {a.published_at && (
                                                            <span className="text-gray-400 text-[11px] flex items-center gap-1">
                                                                <Calendar className="w-3 h-3"/> {a.published_at}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1 text-red-600 text-xs font-bold ml-auto group-hover:gap-1.5 transition-all">
                                                            Унших <ArrowRight className="w-3 h-3"/>
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-24 text-gray-400">
                                <Smile className="w-12 h-12 mx-auto mb-4 text-gray-200"/>
                                <p className="text-lg font-medium">Энэ ангилалд нийтлэл байхгүй байна.</p>
                                <button onClick={() => setActiveCategory(null)}
                                    className="mt-4 text-sm text-red-600 font-semibold hover:underline">
                                    Бүх нийтлэл харах
                                </button>
                            </div>
                        )}
                    </div>
                </section>

            </PublicLayout>

            {/* Article Modal */}
            {selectedArticle && (
                <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)}/>
            )}
        </>
    );
}
