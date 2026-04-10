import { Head, Link, usePage } from '@inertiajs/react';
import PublicLayout from '@/layouts/public-layout';
import { CheckCircle, Award, Users, Building2, Star, Calendar, ArrowRight, Shield, Clock, Heart, Zap } from 'lucide-react';

interface PageProps {
    auth: { user?: { name: string } };
    stats: { doctors: number; appointments: number; branches: number };
}

export default function AboutPage() {
    const { stats } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Бидний тухай — Cuticul" />
            <PublicLayout>

                {/* ── Hero ── */}
                <section className="min-h-[auto] lg:min-h-[80vh] flex items-center bg-[#16100A] relative overflow-hidden pt-20 sm:pt-24 pb-14 sm:pb-20">
                    <div className="absolute top-0 left-0 w-[700px] h-[700px] rounded-full blur-[160px] -translate-x-1/2 -translate-y-1/3 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.18) 0%, transparent 70%)' }}/>
                    <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(140,10,10,0.1) 0%, transparent 70%)' }}/>
                    <div className="absolute inset-0 opacity-[0.035]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}/>

                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                            {/* Left */}
                            <div>
                                <span className="inline-block text-red-500 text-xs font-bold uppercase tracking-widest mb-5 bg-red-500/10 px-3 py-1 rounded-full">
                                    Бидний тухай
                                </span>
                                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
                                    Таны инээмсэглэлийн<br />
                                    <span className="text-red-500">найдвартай түнш</span>
                                </h1>
                                <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-lg">
                                    Cuticul нь орчин үеийн технологи болон мэргэшсэн эмч нартайгаа хосолсон
                                    дэлхийн түвшинд гажиг заслын үйлчилгээ үзүүлдэг эмнэлэг юм.
                                </p>
                                <Link href="/booking"
                                    className="inline-flex items-center gap-2.5 bg-red-600 hover:bg-red-700 text-white font-bold px-7 py-3.5 rounded-2xl transition-all shadow-xl shadow-red-900/30 text-sm">
                                    <Calendar className="w-4 h-4"/> Үнэгүй зөвлөгөө авах
                                </Link>
                            </div>

                            {/* Right — Stats */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                {[
                                    { value: `${stats.appointments}+`, label: 'Амжилттай засал', icon: Star, color: 'text-red-400' },
                                    { value: `${stats.doctors}+`, label: 'Мэргэшсэн эмч', icon: Users, color: 'text-red-400' },
                                    { value: '10+', label: 'Жилийн туршлага', icon: Award, color: 'text-red-400' },
                                    { value: '98%', label: 'Сэтгэл ханамж', icon: Heart, color: 'text-red-400' },
                                ].map((s, i) => (
                                    <div key={i} className="bg-white/5 border border-white/8 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
                                        <s.icon className={`w-5 h-5 ${s.color} mb-2 sm:mb-3`}/>
                                        <p className="text-2xl sm:text-4xl font-black text-white mb-1">{s.value}</p>
                                        <p className="text-gray-500 text-sm">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Mission ── */}
                <section className="py-14 sm:py-20 lg:py-28 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
                            <div>
                                <span className="text-red-600 text-xs font-bold uppercase tracking-widest">Манай зорилго</span>
                                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3 mb-6 leading-tight">
                                    Орчин үеийн технологиор<br/>хамгийн сайн үр дүнд хүрэх
                                </h2>
                                <p className="text-gray-500 leading-relaxed mb-5">
                                    Бид гажиг засалд шинэ стандарт тогтоохыг зорьдог. Invisalign, металл болон мэлмий брекет
                                    зэрэг орчин үеийн аргуудыг ашиглан хамгийн сайн үр дүнд хүргэнэ.
                                </p>
                                <p className="text-gray-500 leading-relaxed mb-10">
                                    Хүн бүрийн нүүрний бүтэц, хэрэгцээ өөр байдаг тул бид тус бүрт тохируулсан
                                    хувийн засалтын төлөвлөгөө боловсруулдаг.
                                </p>
                                <div className="flex flex-col gap-4">
                                    {[
                                        'Олон улсын сертификаттай эмч нар',
                                        'Орчин үеийн 3D дижитал сканнер',
                                        'Invisalign мэргэшсэн Provider',
                                        'Үнэгүй анхан шатны зөвлөгөө',
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3.5">
                                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle className="w-3.5 h-3.5 text-red-600" />
                                            </div>
                                            <span className="text-gray-700 font-medium">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right visual */}
                            <div className="relative">
                                <div className="bg-[#16100A] rounded-3xl p-8 relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-[0.05]"
                                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }}/>
                                    <div className="absolute top-0 right-0 w-48 h-48 rounded-full"
                                        style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.2) 0%, transparent 70%)' }}/>
                                    <div className="relative">
                                        <p className="text-red-400 text-5xl font-black leading-none mb-6">"</p>
                                        <p className="text-white text-xl font-semibold leading-relaxed mb-6">
                                            Шүд засалт бол зөвхөн гоо үзэмж биш — энэ бол таны эрүүл мэнд, итгэл, амьдралын чанар.
                                        </p>
                                        <div className="flex items-center gap-3 pt-6 border-t border-white/10">
                                            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                                                <span className="text-white font-black text-sm">C</span>
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm">Cuticul Dental</p>
                                                <p className="text-gray-500 text-xs">Үндэслэгч, 2014</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Floating badge */}
                                <div className="absolute -bottom-5 -left-5 bg-white border border-gray-100 rounded-2xl shadow-xl px-5 py-4 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                        <Award className="w-5 h-5 text-red-600"/>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">Invisalign Provider</p>
                                        <p className="text-gray-400 text-xs">Олон улсын сертификат</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Values ── */}
                <section className="py-14 sm:py-20 lg:py-28 bg-[#F9F4F2]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-2xl mb-10 sm:mb-16">
                            <span className="text-red-600 text-xs font-bold uppercase tracking-widest">Яагаад биднийг сонгох вэ</span>
                            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3">Манай давуу талууд</h2>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { icon: Award, title: 'Мэргэжлийн ур чадвар', desc: 'Манай эмч нар олон улсын зэрэглэлд суралцан, тогтмол мэргэжлийн хөгжлийн сургалтад хамрагдаж байдаг.' },
                                { icon: Zap, title: 'Орчин үеийн технологи', desc: '3D сканнер, дижитал рентген, Invisalign ClinCheck зэрэг дэвшилтэт тоног төхөөрөмжийг ашигладаг.' },
                                { icon: Clock, title: 'Тохиромжтой хугацаа', desc: 'Эрт өглөөнөөс орой хүртэл, бямба гарагт ч үйлчилгээ үзүүлдэг.' },
                                { icon: Heart, title: 'Хувийн хандлага', desc: 'Хүн бүрт тусгай хандан, хувийн засалтын төлөвлөгөө боловсруулдаг.' },
                                { icon: Shield, title: 'Ил тод үнэ', desc: 'Нуугдмал нэмэлт хураамжгүй, бүх зардлыг урьдчилан тайлбарладаг.' },
                                { icon: Star, title: 'Дэмжлэг & Хяналт', desc: 'Засалтын явцад болон дуусгавар болсны дараа ч тогтмол хяналт шинжилгээ хийдэг.' },
                            ].map((v, i) => (
                                <div key={i}
                                    className="bg-white rounded-3xl p-7 border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all group">
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 bg-red-50 group-hover:bg-red-100 rounded-2xl flex items-center justify-center transition-colors">
                                            <v.icon className="w-5 h-5 text-red-600"/>
                                        </div>
                                        <span className="text-2xl font-black text-gray-100 group-hover:text-red-100 transition-colors">
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2 group-hover:text-red-700 transition-colors">{v.title}</h3>
                                    <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CTA ── */}
                <section className="py-14 sm:py-20 lg:py-28 bg-[#16100A] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.04]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}/>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse, rgba(180,20,20,0.15) 0%, transparent 70%)' }}/>
                    <div className="relative max-w-2xl mx-auto px-4 text-center">
                        <span className="inline-block text-red-500 text-xs font-bold uppercase tracking-widest mb-5">Эхлэцгээе</span>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">Үнэгүй зөвлөгөө авах</h2>
                        <p className="text-gray-400 mb-10 leading-relaxed">
                            Манай мэргэшсэн эмчтэй уулзаж, хувийн засалтын төлөвлөгөөгөө боловсруул.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/booking"
                                className="inline-flex items-center gap-2.5 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-2xl shadow-red-900/40 text-base">
                                <Calendar className="w-5 h-5"/> Цаг захиалах
                            </Link>
                            <Link href="/contact"
                                className="inline-flex items-center gap-2.5 bg-white/8 hover:bg-white/12 border border-white/10 text-white font-semibold px-8 py-4 rounded-2xl transition-all text-base">
                                Холбоо барих <ArrowRight className="w-4 h-4"/>
                            </Link>
                        </div>
                    </div>
                </section>

            </PublicLayout>
        </>
    );
}
