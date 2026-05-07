import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import PublicLayout from '@/layouts/public-layout';
import { Smile, Calendar } from 'lucide-react';

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

function GalleryCard({ item, delay = 0 }: { item: GalleryItem; delay?: number }) {
    const [showing, setShowing] = useState<'before' | 'after'>('before');
    const hasImg = item.before_url || item.after_url;

    useEffect(() => {
        if (!hasImg) return;
        let interval: ReturnType<typeof setInterval>;
        const init = setTimeout(() => {
            setShowing('after');
            interval = setInterval(() => setShowing(s => s === 'before' ? 'after' : 'before'), 3500);
        }, delay);
        return () => { clearTimeout(init); clearInterval(interval); };
    }, [delay, hasImg]);

    return (
        <div className="group rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-gray-100 hover:border-red-200 hover:shadow-xl transition-all duration-300">
            {/* Image area */}
            <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-rose-50 to-red-100">
                {hasImg ? (
                    <>
                        {item.before_url && (
                            <img src={item.before_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        )}
                        {item.after_url && (
                            <div className="absolute inset-0 overflow-hidden"
                                style={{
                                    clipPath: showing === 'after' ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)',
                                    transition: 'clip-path 1.1s cubic-bezier(0.4,0,0.2,1)',
                                }}>
                                <img src={item.after_url} alt="" className="w-full h-full object-cover" />
                            </div>
                        )}
                        {/* Badge */}
                        <div className="absolute top-2.5 left-2.5">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg shadow transition-colors duration-300 ${
                                showing === 'after' ? 'bg-red-600 text-white' : 'bg-gray-900/75 text-white backdrop-blur-sm'
                            }`}>
                                {showing === 'after' ? 'Дараа' : 'Өмнө'}
                            </span>
                        </div>
                        {/* Progress bar */}
                        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/20">
                            <div className={`h-full bg-red-500 transition-all duration-[3500ms] ease-linear ${showing === 'after' ? 'w-full' : 'w-0'}`} />
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Smile className="w-12 h-12 text-red-200" />
                    </div>
                )}
            </div>
            {/* Info */}
            <div className="p-3.5 sm:p-5">
                {item.category_name && (
                    <span className="text-red-600 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide">{item.category_name}</span>
                )}
                {item.title && <p className="font-bold text-gray-900 mt-1 text-xs sm:text-sm leading-snug">{item.title}</p>}
                {item.description && <p className="text-gray-400 text-[10px] sm:text-xs mt-1 leading-relaxed line-clamp-2 hidden sm:block">{item.description}</p>}
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
            <Head title="Үр дүн" />
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
                                <span className="inline-block text-red-500 text-xs font-bold uppercase tracking-widest mb-5 bg-red-500/10 px-3 py-1 rounded-full">Үр дүн</span>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
                                    Өмнө <span className="text-red-500">&amp;</span><br/>дараа нь
                                </h1>
                                <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                                    Манай эмч нарын бодит үр дүнтэй танилцаарай
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
                                {data.map((item, i) => (
                                    <GalleryCard key={item.id} item={item} delay={(i % 4) * 900} />
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
