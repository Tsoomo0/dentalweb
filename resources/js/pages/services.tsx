import { Head, Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import PublicLayout from '@/layouts/public-layout';
import { Calendar, X, CheckCircle, Image as ImageIcon, Clock, ArrowRight, ChevronRight } from 'lucide-react';

interface SubTreatment {
    id: number; title: string; description: string | null;
    price_min: number | null; price_max: number | null; duration_min: number | null;
}
interface Treatment {
    id: number; title: string; description: string | null;
    price_min: number | null; price_max: number | null; duration_min: number | null;
    image_url: string | null; sub_treatments: SubTreatment[];
}
interface TreatmentCategory {
    id: number; name: string; icon: string | null; treatments: Treatment[];
}
interface PageProps {
    auth: { user?: { name: string } };
    treatments: TreatmentCategory[];
}

// ── Modal base ────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                {children}
            </div>
        </div>
    );
}

// ── Treatment Modal ───────────────────────────────────────────────────────────
function TreatmentModal({ treatment, catName, onClose }: {
    treatment: Treatment; catName: string; onClose: () => void;
}) {
    const hasPrice = treatment.price_min || treatment.price_max;
    const bookingUrl = `/booking?service=${encodeURIComponent(treatment.title)}`;
    const includes = ['Мэргэжлийн үзлэг', 'Эмчилгээний төлөвлөгөө', 'Дараагийн үзлэгийн зөвлөгөө'];

    return (
        <Modal open onClose={onClose}>
            {/* Header */}
            <div className="relative h-52 overflow-hidden rounded-t-3xl bg-gradient-to-br from-rose-50 to-red-100 flex-shrink-0">
                {treatment.image_url
                    ? <img src={treatment.image_url} alt={treatment.title} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-16 h-16 text-red-200"/></div>
                }
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"/>
                <button onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-colors">
                    <X className="w-4 h-4"/>
                </button>
                <div className="absolute bottom-4 left-5">
                    <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">{catName}</span>
                </div>
            </div>

            {/* Body */}
            <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">{treatment.title}</h2>
                    {hasPrice && (
                        <div className="text-right flex-shrink-0">
                            <p className="text-xs text-gray-400 mb-0.5">Үнэ</p>
                            <p className="text-red-600 font-black text-lg">
                                {treatment.price_min && `${Number(treatment.price_min).toLocaleString()}₮`}
                                {treatment.price_min && treatment.price_max && '–'}
                                {treatment.price_max && `${Number(treatment.price_max).toLocaleString()}₮`}
                            </p>
                        </div>
                    )}
                </div>

                {treatment.duration_min && (
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                        <Clock className="w-4 h-4 text-red-400"/>
                        <span>Хугацаа: ~{treatment.duration_min} мин</span>
                    </div>
                )}

                {treatment.description && (
                    <p className="text-gray-600 text-sm leading-relaxed mb-5">{treatment.description}</p>
                )}

                {treatment.sub_treatments.length > 0 && (
                    <div className="mb-5">
                        <h3 className="text-sm font-bold text-gray-800 mb-3">Дэд төрлүүд</h3>
                        <div className="flex flex-col">
                            {treatment.sub_treatments.map(s => (
                                <div key={s.id} className="flex items-start justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                                        {s.description && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{s.description}</p>}
                                    </div>
                                    {(s.price_min || s.price_max) && (
                                        <span className="text-sm font-bold text-red-600 flex-shrink-0">
                                            {s.price_min && `${Number(s.price_min).toLocaleString()}₮`}
                                            {s.price_min && s.price_max && '–'}
                                            {s.price_max && `${Number(s.price_max).toLocaleString()}₮`}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Багтсан үйлчилгээ</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {includes.map((item, i) => (
                            <div key={i} className="flex items-center gap-2.5">
                                <CheckCircle className="w-4 h-4 text-red-500 flex-shrink-0"/>
                                <span className="text-sm text-gray-600">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <Link href={bookingUrl}
                    className="w-full flex items-center justify-center gap-2.5 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-200 text-base">
                    <Calendar className="w-5 h-5"/>
                    Эмч дээр цаг захиалах
                </Link>
            </div>
        </Modal>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ServicesPage() {
    const { treatments } = usePage<PageProps>().props;
    const [activeCat, setActiveCat] = useState<number | null>(null);
    const [selected, setSelected] = useState<{ t: Treatment; cat: string } | null>(null);

    const fallback: TreatmentCategory[] = [
        { id: 1, name: 'Гажиг засал', icon: null, treatments: [
            { id: 1, title: 'Invisalign', description: 'Харагдахгүй, авч хийж болдог шилэн тэгшлэгч систем. Өдөр тутмын амьдралд саад болохгүйгээр гажиг засаад явна.', price_min: 1500000, price_max: 3000000, duration_min: 60, image_url: null, sub_treatments: [] },
            { id: 2, title: 'Металл брекет', description: 'Хамгийн хүчтэй, тогтвортой уламжлалт брекет систем.', price_min: 800000, price_max: 1500000, duration_min: 45, image_url: null, sub_treatments: [] },
            { id: 3, title: 'Мэлмий брекет', description: 'Шүдний өнгөтэй хослуулсан гоо үзэмжтэй керамик брекет.', price_min: 1200000, price_max: 2000000, duration_min: 45, image_url: null, sub_treatments: [] },
            { id: 4, title: 'Retainer', description: 'Засал дууссаны дараах байрлалыг хадгалах аппарат.', price_min: 150000, price_max: 300000, duration_min: 30, image_url: null, sub_treatments: [] },
        ]},
        { id: 2, name: 'Ерөнхий эмчилгээ', icon: null, treatments: [
            { id: 5, title: 'Шүд авалт', description: 'Мэдээ алдуулан аюулгүй шүд авалт.', price_min: 50000, price_max: 150000, duration_min: 30, image_url: null, sub_treatments: [] },
            { id: 6, title: 'Цайруулалт', description: 'Мэргэжлийн орчин үеийн шүд цайруулах процедур.', price_min: 200000, price_max: 400000, duration_min: 60, image_url: null, sub_treatments: [] },
            { id: 7, title: 'Ерөнхий үзлэг', description: 'Бүрэн шинжилгээ, рентген, зөвлөгөө.', price_min: 30000, price_max: 80000, duration_min: 30, image_url: null, sub_treatments: [] },
        ]},
    ];

    const source = treatments.length > 0 ? treatments : fallback;
    const displayed = activeCat !== null ? source.filter(c => c.id === activeCat) : source;

    return (
        <>
            <Head title="Үйлчилгээ">
                <style>{`@keyframes modalIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
            </Head>
            <PublicLayout>
                {/* ── Hero ── */}
                <section className="pt-20 sm:pt-28 pb-12 sm:pb-20 bg-[#16100A] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-[140px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.15) 0%, transparent 70%)' }}/>
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}/>
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <span className="inline-block text-red-500 text-xs font-bold uppercase tracking-widest mb-4 bg-red-500/10 px-3 py-1 rounded-full">Үйлчилгээ</span>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
                            Манай эмчилгээний<br />
                            <span className="text-red-500">төрлүүд</span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-xl leading-relaxed">
                            Ямар асуудалтай байгаагаас үл хамааран — бид шийдлийг хамт олно.
                        </p>
                        <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-500">
                            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>Туршлагатай баг</span>
                            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>Таны хэрэгцээнд тохирсон шийдэл</span>
                            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>Ил тод үнэ</span>
                        </div>
                    </div>
                </section>

                {/* ── Category filter ── */}
                {source.length > 1 && (
                    <div className="sticky top-[68px] z-40 bg-white border-b border-gray-100 shadow-sm">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap gap-2">
                            <button onClick={() => setActiveCat(null)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeCat === null ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'}`}>
                                Бүгд
                            </button>
                            {source.map(c => (
                                <button key={c.id} onClick={() => setActiveCat(c.id)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeCat === c.id ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'}`}>
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Treatments ── */}
                <section className="py-10 sm:py-16 lg:py-20 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-12 sm:gap-16 lg:gap-20">
                            {displayed.map(cat => (
                                <div key={cat.id}>
                                    {/* Category header */}
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="flex-1 h-px bg-gray-100"/>
                                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4">{cat.name}</h2>
                                        <div className="flex-1 h-px bg-gray-100"/>
                                    </div>

                                    {/* Treatment cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                        {cat.treatments.map(t => (
                                            <button key={t.id}
                                                onClick={() => setSelected({ t, cat: cat.name })}
                                                className="group text-left rounded-3xl overflow-hidden border border-gray-100 hover:border-red-200 hover:shadow-xl transition-all duration-300 bg-white">

                                                {/* Image */}
                                                <div className="aspect-[4/3] overflow-hidden relative bg-gradient-to-br from-rose-50 to-red-100">
                                                    {t.image_url
                                                        ? <img src={t.image_url} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                                                        : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-12 h-12 text-red-200"/></div>
                                                    }
                                                    {/* Overlay on hover */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
                                                    <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                                        <span className="inline-flex items-center gap-1.5 bg-white text-red-600 text-xs font-bold px-3 py-1.5 rounded-full">
                                                            Дэлгэрэнгүй харах <ArrowRight className="w-3 h-3"/>
                                                        </span>
                                                    </div>
                                                    {/* Duration badge */}
                                                    {t.duration_min && (
                                                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                                                            <Clock className="w-3 h-3"/>{t.duration_min} мин
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="p-5">
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <h3 className="font-bold text-gray-900 text-base group-hover:text-red-700 transition-colors leading-snug">{t.title}</h3>
                                                        {(t.price_min || t.price_max) && (
                                                            <div className="flex-shrink-0 bg-red-50 border border-red-100 rounded-xl px-3 py-1 text-center">
                                                                <p className="text-red-600 font-black text-sm leading-none">
                                                                    {t.price_min ? `${Number(t.price_min).toLocaleString()}₮` : ''}
                                                                    {t.price_min && t.price_max ? '+' : ''}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {t.description && (
                                                        <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 mb-4">{t.description}</p>
                                                    )}
                                                    {t.sub_treatments.length > 0 && (
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                            <ChevronRight className="w-3.5 h-3.5 text-red-400"/>
                                                            {t.sub_treatments.length} дэд төрөл байгаа
                                                        </div>
                                                    )}
                                                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                                        <span className="text-xs font-semibold text-gray-400">Дэлгэрэнгүй</span>
                                                        <span className="w-7 h-7 rounded-full bg-red-50 border border-red-100 group-hover:bg-red-600 group-hover:border-red-600 flex items-center justify-center transition-colors">
                                                            <ArrowRight className="w-3.5 h-3.5 text-red-500 group-hover:text-white transition-colors"/>
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CTA ── */}
                <section className="py-24 bg-[#16100A] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.04]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}/>
                    <div className="relative max-w-xl mx-auto px-4 text-center">
                        <span className="inline-block text-red-400 text-xs font-bold uppercase tracking-widest mb-4">Цаг захиалах</span>
                        <h2 className="text-4xl font-black text-white mb-5">Эхний алхмаа<br/>хамт хийцгээе</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed">Шүдний асуудлаа шийдэх нь таны бодсоноос хялбар. Бидэнд хандаад эмчтэйгээ уулзаарай — үлдсэнийг бид шийдэрнэ.</p>
                        <Link href="/booking"
                            className="inline-flex items-center gap-2.5 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-2xl shadow-red-900/40 text-base">
                            <Calendar className="w-5 h-5"/>
                            Онлайн цаг захиалах
                        </Link>
                    </div>
                </section>
            </PublicLayout>

            {/* Modal */}
            {selected && (
                <TreatmentModal
                    treatment={selected.t}
                    catName={selected.cat}
                    onClose={() => setSelected(null)}
                />
            )}
        </>
    );
}
