import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import PublicLayout from '@/layouts/public-layout';
import { ArrowRight, Smile, Calendar } from 'lucide-react';

interface Article {
    id: number; title: string; slug: string; excerpt: string | null;
    category: string | null; featured_image: string | null; published_at: string | null;
}
interface PageProps {
    auth: { user?: { name: string } };
    articles: Article[];
}

export default function ArticlesPage() {
    const { articles } = usePage<PageProps>().props;
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const categories = Array.from(new Set(articles.map(a => a.category).filter(Boolean))) as string[];

    const filtered = activeCategory
        ? articles.filter(a => a.category === activeCategory)
        : articles;

    const fallback: Article[] = [
        { id: 1, title: 'Invisalign гэж юу вэ? Бүрэн гарын авлага', slug: 'invisalign', excerpt: 'Харагдахгүй шилэн тэгшлэгч системийн давуу тал, зардал, хугацааны талаар дэлгэрэнгүй мэдэж ав.', category: 'Эмчилгээ', featured_image: null, published_at: '2024.12.01' },
        { id: 2, title: 'Брекет тавиулсны дараа яаж арчилах вэ?', slug: 'breket', excerpt: 'Брекеттэй байхдаа шүдээ хэрхэн зөв цэвэрлэх, ямар хоол идвэл зохих талаар практик зөвлөгөө.', category: 'Зөвлөгөө', featured_image: null, published_at: '2024.11.15' },
        { id: 3, title: 'Хүүхдийн шүдний эрүүл мэнд', slug: 'kids', excerpt: 'Хүүхдийн сүү шүд, байнгын шүдийг яаж арчлах, хэзээ эмчид очих талаар эцэг эхчүүдэд зориулсан зөвлөгөө.', category: 'Урьдчилан сэргийлэлт', featured_image: null, published_at: '2024.11.01' },
        { id: 4, title: 'Шүд цайруулалт — Аюулгүй мөртлөө гоё', slug: 'whitening', excerpt: 'Мэргэжлийн шүд цайруулалтын тухай — гэрт хийдэг болон эмнэлэгт хийдэг аргуудын харьцуулалт.', category: 'Зөвлөгөө', featured_image: null, published_at: '2024.10.20' },
        { id: 5, title: 'Retainer — Яагаад чухал вэ?', slug: 'retainer', excerpt: 'Брекет засал дуусгасны дараа retainer зайлшгүй шаардлагатай байдаг шалтгааны талаар.', category: 'Эмчилгээ', featured_image: null, published_at: '2024.10.05' },
        { id: 6, title: 'Насанд хүрэгчдийн гажиг засал', slug: 'adult', excerpt: '30, 40 насандаа ч засал хийлгэх боломжтой — орчин үеийн аргуудыг танилцуулна.', category: 'Эмчилгээ', featured_image: null, published_at: '2024.09.18' },
    ];

    const data = articles.length > 0 ? filtered : fallback;
    const allCategories = articles.length > 0 ? categories : ['Эмчилгээ', 'Зөвлөгөө', 'Урьдчилан сэргийлэлт'];

    const [featured, ...rest] = data;

    return (
        <>
            <Head title="Мэдээ — Cuticul" />
            <PublicLayout>

                {/* ── Hero ── */}
                <section className="pt-20 sm:pt-28 pb-14 sm:pb-24 bg-[#16100A] relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[150px] -translate-x-1/3 translate-y-1/3 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.14) 0%, transparent 70%)' }}/>
                    <div className="absolute inset-0 opacity-[0.035]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}/>
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <span className="inline-block text-red-500 text-xs font-bold uppercase tracking-widest mb-5 bg-red-500/10 px-3 py-1 rounded-full">
                            Мэдээ мэдээлэл
                        </span>
                        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-end">
                            <div>
                                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
                                    Шүдний эрүүл<br/>
                                    <span className="text-red-500">мэндийн мэдлэг</span>
                                </h1>
                                <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                                    Гажиг засал, ерөнхий шүдний арчлалтын талаар мэдэхэд хэрэгтэй бүхнийг тайлбарласан нийтлэлүүд.
                                </p>
                            </div>
                            <div className="flex gap-3 sm:gap-4 lg:justify-end">
                                {[
                                    { value: `${(articles.length || fallback.length)}`, label: 'Нийтлэл' },
                                    { value: `${allCategories.length}`, label: 'Ангилал' },
                                ].map(s => (
                                    <div key={s.label} className="bg-white/5 border border-white/8 rounded-2xl px-5 sm:px-8 py-4 sm:py-6 text-center">
                                        <p className="text-white font-black text-3xl">{s.value}</p>
                                        <p className="text-gray-500 text-sm mt-1">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Category filter ── */}
                {allCategories.length > 0 && (
                    <div className="sticky top-[68px] z-40 bg-white border-b border-gray-100 shadow-sm">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-2 overflow-x-auto">
                            <button onClick={() => setActiveCategory(null)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all ${activeCategory === null ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'}`}>
                                Бүгд
                            </button>
                            {allCategories.map(c => (
                                <button key={c} onClick={() => setActiveCategory(c)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all ${activeCategory === c ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Articles ── */}
                <section className="py-10 sm:py-16 lg:py-20 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {data.length > 0 ? (
                            <div className="flex flex-col gap-6">
                                {/* Featured article */}
                                {featured && (
                                    <Link href={featured.slug ? `/articles/${featured.slug}` : '/articles'}
                                        className="group block bg-[#F9F4F2] rounded-3xl overflow-hidden border border-gray-100 hover:border-red-200 hover:shadow-xl transition-all duration-300">
                                        <div className="grid md:grid-cols-5">
                                            <div className="md:col-span-2 aspect-[4/3] md:aspect-auto bg-gradient-to-br from-rose-100 to-red-50 overflow-hidden">
                                                {featured.featured_image
                                                    ? <img src={featured.featured_image} alt={featured.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                                                    : <div className="w-full h-full flex items-center justify-center min-h-[240px]">
                                                        <Smile className="w-16 h-16 text-red-200"/>
                                                      </div>
                                                }
                                            </div>
                                            <div className="md:col-span-3 p-8 md:p-10 flex flex-col justify-center">
                                                {featured.category && (
                                                    <span className="inline-block bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide w-fit">
                                                        {featured.category}
                                                    </span>
                                                )}
                                                <h2 className="font-black text-gray-900 text-2xl md:text-3xl leading-snug mb-4 group-hover:text-red-700 transition-colors">
                                                    {featured.title}
                                                </h2>
                                                {featured.excerpt && (
                                                    <p className="text-gray-500 text-base leading-relaxed line-clamp-3 mb-6">{featured.excerpt}</p>
                                                )}
                                                <div className="flex items-center justify-between mt-auto">
                                                    {featured.published_at && (
                                                        <span className="text-gray-400 text-sm">{featured.published_at}</span>
                                                    )}
                                                    <span className="flex items-center gap-2 text-red-600 font-bold text-sm ml-auto group-hover:gap-3 transition-all">
                                                        Унших <ArrowRight className="w-4 h-4"/>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                )}

                                {/* Grid of rest */}
                                {rest.length > 0 && (
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {rest.map(a => (
                                            <Link key={a.id} href={a.slug ? `/articles/${a.slug}` : '/articles'}
                                                className="group bg-[#F9F4F2] rounded-3xl overflow-hidden border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all duration-300">
                                                <div className="aspect-[16/9] bg-gradient-to-br from-rose-100 to-red-50 overflow-hidden">
                                                    {a.featured_image
                                                        ? <img src={a.featured_image} alt={a.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                                        : <div className="w-full h-full flex items-center justify-center">
                                                            <Smile className="w-10 h-10 text-red-200"/>
                                                          </div>
                                                    }
                                                </div>
                                                <div className="p-6">
                                                    {a.category && (
                                                        <span className="inline-block bg-red-50 text-red-600 text-[11px] font-bold px-2.5 py-1 rounded-full mb-3 uppercase tracking-wide">
                                                            {a.category}
                                                        </span>
                                                    )}
                                                    <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 mb-3 group-hover:text-red-700 transition-colors">
                                                        {a.title}
                                                    </h3>
                                                    {a.excerpt && (
                                                        <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 mb-4">{a.excerpt}</p>
                                                    )}
                                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                                        {a.published_at && <span className="text-gray-400 text-xs">{a.published_at}</span>}
                                                        <span className="flex items-center gap-1 text-red-600 text-sm font-bold ml-auto group-hover:gap-2 transition-all">
                                                            Унших <ArrowRight className="w-3.5 h-3.5"/>
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-24 text-gray-400">
                                <Smile className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                                <p className="text-lg font-medium">Энэ ангилалд нийтлэл байхгүй байна.</p>
                            </div>
                        )}
                    </div>
                </section>

            </PublicLayout>
        </>
    );
}
