import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import PublicLayout from '@/layouts/public-layout';
import { Smile, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryItem {
    id: number; title: string | null; description: string | null;
    before_url: string | null; after_url: string | null; category_name: string | null;
}
interface TreatmentCategory { id: number; name: string }
interface PageProps {
    auth: { user?: { name: string } };
    gallery: GalleryItem[];
    categories: TreatmentCategory[];
}

function GalleryCard({ item }: { item: GalleryItem }) {
    const [after, setAfter] = useState(false);
    const hasImg = item.before_url || item.after_url;

    return (
        <div className="group rounded-3xl overflow-hidden bg-white border border-gray-100 hover:border-red-200 hover:shadow-xl transition-all duration-300">
            {/* Image area */}
            <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-rose-50 to-red-100">
                {hasImg ? (
                    <>
                        <img
                            src={after ? (item.after_url ?? '') : (item.before_url ?? '')}
                            alt=""
                            className="w-full h-full object-cover transition-all duration-500"
                        />
                        {/* Label */}
                        <div className="absolute top-3 left-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg ${after ? 'bg-red-600 text-white' : 'bg-gray-900/80 text-white backdrop-blur-sm'}`}>
                                {after ? 'Дараа' : 'Өмнө'}
                            </span>
                        </div>
                        {/* Toggle */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex items-center justify-center gap-2">
                            <button
                                onClick={() => setAfter(false)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${!after ? 'bg-white text-gray-900 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'}`}>
                                Өмнө
                            </button>
                            <button
                                onClick={() => setAfter(true)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${after ? 'bg-red-600 text-white shadow-lg' : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'}`}>
                                Дараа
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Smile className="w-12 h-12 text-red-200" />
                    </div>
                )}
            </div>
            {/* Info */}
            <div className="p-5">
                {item.category_name && (
                    <span className="text-red-600 text-[11px] font-bold uppercase tracking-wide">{item.category_name}</span>
                )}
                {item.title && <p className="font-bold text-gray-900 mt-1 text-sm">{item.title}</p>}
                {item.description && <p className="text-gray-400 text-xs mt-1 leading-relaxed line-clamp-2">{item.description}</p>}
            </div>
        </div>
    );
}

export default function GalleryPage() {
    const { gallery, categories } = usePage<PageProps>().props;
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const uniqueCategories = categories?.length > 0
        ? categories
        : Array.from(new Set(gallery.map(g => g.category_name).filter(Boolean))).map((n, i) => ({ id: i, name: n as string }));

    const filtered = activeCategory
        ? gallery.filter(g => g.category_name === activeCategory)
        : gallery;

    const fallback = [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({
        id: i, title: `Засалтын үр дүн #${i}`, description: 'Invisalign • 12 сар',
        before_url: null, after_url: null, category_name: i % 2 === 0 ? 'Invisalign' : 'Металл брекет',
    }));

    const data = gallery.length > 0 ? filtered : fallback;

    return (
        <>
            <Head title="Үр дүн — Cuticul" />
            <PublicLayout>

                {/* ── Hero ── */}
                <section className="pt-20 sm:pt-28 pb-14 sm:pb-24 bg-[#16100A] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[150px] translate-x-1/3 -translate-y-1/3 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.16) 0%, transparent 70%)' }}/>
                    <div className="absolute inset-0 opacity-[0.035]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}/>
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-end">
                            <div>
                                <span className="inline-block text-red-500 text-xs font-bold uppercase tracking-widest mb-5 bg-red-500/10 px-3 py-1 rounded-full">Галерей</span>
                                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
                                    Өмнө <span className="text-red-500">&amp;</span><br/>дараа нь
                                </h1>
                                <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                                    Манай эмч нарын бодит үр дүнг нүдээрээ үзэж, итгэлтэйгээр шийдвэр гар.
                                </p>
                            </div>
                            {/* Stats */}
                            <div className="flex gap-3 sm:gap-4 lg:justify-end">
                                {[
                                    { value: `${gallery.length || '100'}+`, label: 'Үр дүн' },
                                    { value: `${uniqueCategories.length || '5'}+`, label: 'Ангилал' },
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
                {uniqueCategories.length > 0 && (
                    <div className="sticky top-[68px] z-40 bg-white border-b border-gray-100 shadow-sm">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-2 overflow-x-auto">
                            <button onClick={() => setActiveCategory(null)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all ${activeCategory === null ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'}`}>
                                Бүгд
                            </button>
                            {uniqueCategories.map(c => (
                                <button key={c.id} onClick={() => setActiveCategory(c.name)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all ${activeCategory === c.name ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'}`}>
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Gallery grid ── */}
                <section className="py-10 sm:py-16 lg:py-20 bg-[#F9F4F2]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {data.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                                {data.map(item => (
                                    <GalleryCard key={item.id} item={item} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-24 text-gray-400">
                                <Smile className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                                <p className="text-lg font-medium">Энэ ангилалд үр дүн алга байна.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── CTA ── */}
                <section className="py-28 bg-[#16100A] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.04]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}/>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse, rgba(180,20,20,0.15) 0%, transparent 70%)' }}/>
                    <div className="relative max-w-xl mx-auto px-4 text-center">
                        <span className="inline-block text-red-500 text-xs font-bold uppercase tracking-widest mb-5">Та ч гэсэн болж чадна</span>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">Өөрийн засалтыг<br/>эхлүүл</h2>
                        <p className="text-gray-400 mb-10 leading-relaxed">Манай эмчтэй уулзаж, дуусгах хугацааны тооцоог нь мэдэж ав.</p>
                        <Link href="/booking"
                            className="inline-flex items-center gap-2.5 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-2xl shadow-red-900/40 text-base">
                            <Calendar className="w-5 h-5"/> Цаг захиалах
                        </Link>
                    </div>
                </section>

            </PublicLayout>
        </>
    );
}
