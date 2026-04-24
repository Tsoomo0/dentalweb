import { Head, Link, usePage } from '@inertiajs/react';
import PublicLayout from '@/layouts/public-layout';
import { MapPin, Phone, Clock, Mail, Calendar, Facebook, Instagram, Youtube, ArrowRight } from 'lucide-react';

interface Branch { id: number; name: string; address: string | null; phone: string | null; type: string | null }
interface SiteSettings {
    contact_phone?: string; contact_email?: string;
    working_hours?: string; facebook_url?: string; instagram_url?: string;
    [key: string]: unknown;
}
interface PageProps {
    auth: { user?: { name: string } };
    branches: Branch[];
    site_settings?: SiteSettings;
    [key: string]: unknown;
}

export default function ContactPage() {
    const { branches, site_settings: s = {} } = usePage<PageProps>().props;

    const fallbackBranches: Branch[] = [
        { id: 1, name: 'Хан-Уул салбар', address: 'Хан-Уул дүүрэг, 15-р хороо, Нарны зам', phone: '+976 9900-0000', type: 'main' },
        { id: 2, name: 'Баянзүрх салбар', address: 'Баянзүрх дүүрэг, 16-р хороо, Баянгол зам', phone: '+976 9911-1111', type: 'branch' },
        { id: 3, name: 'Сүхбаатар салбар', address: 'Сүхбаатар дүүрэг, 1-р хороо, Энхтайваны өргөн чөлөө', phone: '+976 9922-2222', type: 'branch' },
    ];

    const data = branches.length > 0 ? branches : fallbackBranches;
    const main = data.find(b => b.type === 'main') ?? data[0];

    return (
        <>
            <Head title="Холбоо барих" />
            <PublicLayout>

                {/* ── Hero ── */}
                <section className="pt-20 sm:pt-28 pb-14 sm:pb-24 bg-[#16100A] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-[150px] -translate-x-1/3 -translate-y-1/3 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.18) 0%, transparent 70%)' }}/>
                    <div className="absolute inset-0 opacity-[0.035]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}/>
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-end">
                            <div>
                                <span className="inline-block text-red-500 text-xs font-bold uppercase tracking-widest mb-5 bg-red-500/10 px-3 py-1 rounded-full">
                                    Холбоо барих
                                </span>
                                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
                                    Бидэнтэй<br/>
                                    <span className="text-red-500">холбогдох</span>
                                </h1>
                                <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                                    Асуулт байна уу? Манай салбаруудаас танд ойр байгааг олж, утсаар эсвэл онлайнаар холбогдоорой.
                                </p>
                            </div>
                            {/* Quick contact */}
                            <div className="flex flex-col gap-3">
                                {[
                                    { icon: Phone, label: 'Утас', value: s.contact_phone ?? main?.phone ?? '', href: `tel:${s.contact_phone ?? main?.phone ?? ''}` },
                                    { icon: Mail, label: 'И-мэйл', value: s.contact_email ?? '', href: `mailto:${s.contact_email ?? ''}` },
                                    { icon: Clock, label: 'Ажлын цаг', value: s.working_hours ?? '', href: null },
                                ].map((item, i) => (
                                    <div key={i} className="bg-white/5 border border-white/8 rounded-2xl px-5 py-4 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center flex-shrink-0">
                                            <item.icon className="w-4 h-4 text-red-400"/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-gray-500 text-xs font-medium mb-0.5">{item.label}</p>
                                            {item.href
                                                ? <a href={item.href} className="text-white font-semibold text-sm hover:text-red-400 transition-colors">{item.value}</a>
                                                : <p className="text-white font-semibold text-sm">{item.value}</p>
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Branches ── */}
                <section className="py-12 sm:py-16 lg:py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="mb-8 sm:mb-12">
                            <span className="text-red-600 text-xs font-bold uppercase tracking-widest">Салбарууд</span>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mt-2">Манай байршилууд</h2>
                        </div>

                        <div className="flex flex-col gap-4 sm:gap-5">
                            {/* Main branch — featured */}
                            {data.filter(b => b.type === 'main').map(b => (
                                <div key={b.id}
                                    className="bg-[#16100A] rounded-3xl p-6 sm:p-8 relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-[0.04]"
                                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }}/>
                                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full"
                                        style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.2) 0%, transparent 70%)' }}/>
                                    <div className="relative grid md:grid-cols-2 gap-8 items-center">
                                        <div>
                                            <span className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
                                                Төв салбар
                                            </span>
                                            <h3 className="text-2xl font-black text-white mb-4">{b.name}</h3>
                                            <div className="flex flex-col gap-3">
                                                {b.address && (
                                                    <div className="flex items-start gap-3 text-gray-300 text-sm">
                                                        <MapPin className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"/>
                                                        <span>{b.address}</span>
                                                    </div>
                                                )}
                                                {b.phone && (
                                                    <a href={`tel:${b.phone}`}
                                                        className="flex items-center gap-3 text-gray-300 hover:text-white text-sm transition-colors">
                                                        <Phone className="w-4 h-4 text-red-400 flex-shrink-0"/>
                                                        <span>{b.phone}</span>
                                                    </a>
                                                )}
                                                <div className="flex items-center gap-3 text-gray-500 text-sm">
                                                    <Clock className="w-4 h-4 text-red-800 flex-shrink-0"/>
                                                    <span>{s.working_hours ?? ''}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            {b.phone && (
                                                <a href={`tel:${b.phone}`}
                                                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-2xl transition-all text-sm">
                                                    <Phone className="w-4 h-4"/> Залгах
                                                </a>
                                            )}
                                            <Link href="/booking"
                                                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold py-3.5 rounded-2xl transition-all text-sm">
                                                <Calendar className="w-4 h-4"/> Цаг захиалах
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Branch cards */}
                            <div className="grid sm:grid-cols-2 gap-5">
                                {data.filter(b => b.type !== 'main').map(b => (
                                    <div key={b.id}
                                        className="bg-[#F9F4F2] rounded-3xl p-6 border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all group">
                                        <div className="flex items-start gap-4 mb-5">
                                            <div className="w-12 h-12 bg-red-100 group-hover:bg-red-600 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors">
                                                <MapPin className="w-5 h-5 text-red-600 group-hover:text-white transition-colors"/>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-base">{b.name}</h3>
                                                <span className="text-xs font-semibold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full mt-1 inline-block">Салбар</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2.5 mb-5">
                                            {b.address && (
                                                <div className="flex items-start gap-3 text-sm text-gray-600">
                                                    <MapPin className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"/>
                                                    <span>{b.address}</span>
                                                </div>
                                            )}
                                            {b.phone && (
                                                <a href={`tel:${b.phone}`}
                                                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-red-600 transition-colors">
                                                    <Phone className="w-4 h-4 text-red-400 flex-shrink-0"/>
                                                    <span>{b.phone}</span>
                                                </a>
                                            )}
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <Clock className="w-4 h-4 text-red-400 flex-shrink-0"/>
                                                <span>Да–Ба: 09:00–18:00 &nbsp;|&nbsp; Бя: 10:00–15:00</span>
                                            </div>
                                        </div>
                                        {b.phone && (
                                            <a href={`tel:${b.phone}`}
                                                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 group-hover:border-red-200 group-hover:bg-red-600 group-hover:text-white text-gray-700 font-semibold py-2.5 rounded-xl transition-all text-sm">
                                                <Phone className="w-4 h-4"/> Залгах
                                            </a>
                                        )}
                                    </div>
                                ))}
                                {/* No branches of type branch */}
                                {data.filter(b => b.type !== 'main').length === 0 &&
                                    data.slice(1).map(b => (
                                    <div key={b.id}
                                        className="bg-[#F9F4F2] rounded-3xl p-6 border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all group">
                                        <div className="flex items-start gap-4 mb-5">
                                            <div className="w-12 h-12 bg-red-100 group-hover:bg-red-600 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors">
                                                <MapPin className="w-5 h-5 text-red-600 group-hover:text-white transition-colors"/>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-base">{b.name}</h3>
                                                <span className="text-xs font-semibold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full mt-1 inline-block">Салбар</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2.5 mb-5">
                                            {b.address && (
                                                <div className="flex items-start gap-3 text-sm text-gray-600">
                                                    <MapPin className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"/>
                                                    <span>{b.address}</span>
                                                </div>
                                            )}
                                            {b.phone && (
                                                <a href={`tel:${b.phone}`}
                                                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-red-600 transition-colors">
                                                    <Phone className="w-4 h-4 text-red-400 flex-shrink-0"/>
                                                    <span>{b.phone}</span>
                                                </a>
                                            )}
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <Clock className="w-4 h-4 text-red-400 flex-shrink-0"/>
                                                <span>Да–Ба: 09:00–18:00 &nbsp;|&nbsp; Бя: 10:00–15:00</span>
                                            </div>
                                        </div>
                                        {b.phone && (
                                            <a href={`tel:${b.phone}`}
                                                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 group-hover:border-red-200 group-hover:bg-red-600 group-hover:text-white text-gray-700 font-semibold py-2.5 rounded-xl transition-all text-sm">
                                                <Phone className="w-4 h-4"/> Залгах
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Social ── */}
                <section className="py-20 bg-[#F9F4F2]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <span className="text-red-600 text-xs font-bold uppercase tracking-widest">Сошиал медиа</span>
                                <h2 className="text-3xl font-black text-gray-900 mt-2 mb-3">Биднийг дага</h2>
                                <p className="text-gray-500 leading-relaxed">
                                    Шинэ мэдээ, урамшуулал, зөвлөмжийг эхний хандан мэдэхийн тулд манай сошиал медиаг дага.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                {[
                                    { Icon: Facebook,  label: 'Facebook',  href: s.facebook_url  || '#', color: 'hover:bg-blue-600 hover:border-blue-600' },
                                    { Icon: Instagram, label: 'Instagram', href: s.instagram_url || '#', color: 'hover:bg-gradient-to-br hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 hover:border-pink-500' },
                                    { Icon: Youtube,   label: 'YouTube',   href: '#',                    color: 'hover:bg-red-600 hover:border-red-600' },
                                ].map(({ Icon, label, href, color }) => (
                                    <a key={label} href={href} target="_blank" rel="noreferrer"
                                        className={`flex-1 flex flex-col items-center gap-3 bg-white border-2 border-gray-100 ${color} hover:text-white px-6 py-6 rounded-2xl transition-all font-medium text-gray-700 text-center group`}>
                                        <Icon className="w-6 h-6"/>
                                        <p className="font-bold text-sm">{label}</p>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── CTA ── */}
                <section className="py-24 bg-[#16100A] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.04]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}/>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse, rgba(180,20,20,0.15) 0%, transparent 70%)' }}/>
                    <div className="relative max-w-xl mx-auto px-4 text-center">
                        <span className="inline-block text-red-500 text-xs font-bold uppercase tracking-widest mb-5">Онлайн цаг захиалах</span>
                        <h2 className="text-4xl font-black text-white mb-5 leading-tight">Өнөөдөр эхлэх<br/>цаг болжээ</h2>
                        <p className="text-gray-400 mb-10 leading-relaxed">
                            Онлайнаар цаг захиалж, манай мэргэшсэн эмчтэй уулзаарай.
                        </p>
                        <Link href="/booking"
                            className="inline-flex items-center gap-2.5 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-2xl shadow-red-900/40 text-base">
                            <Calendar className="w-5 h-5"/> Онлайн цаг захиалах
                        </Link>
                    </div>
                </section>

            </PublicLayout>
        </>
    );
}
