import { Head, Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import PublicLayout from '@/layouts/public-layout';
import { MapPin, Award, Calendar, X, Phone, Mail, Briefcase, GraduationCap, BadgeCheck, Star } from 'lucide-react';

interface Experience { year?: string; title: string; institution?: string }
interface Doctor {
    id: number; name: string; specialization: string | null; degree: string | null;
    experience_years: number | null; description: string | null;
    phone: string | null; email: string | null;
    experiences: Experience[] | null;
    photo_url: string | null; branch_name: string | null; branch_id: number | null;
}
interface Branch { id: number; name: string; address: string | null; phone: string | null }
interface PageProps {
    auth: { user?: { name: string } };
    doctors: Doctor[];
    branches: Branch[];
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
            <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                {children}
            </div>
        </div>
    );
}

// ── Doctor Modal ──────────────────────────────────────────────────────────────
function DoctorModal({ doctor, onClose }: { doctor: Doctor; onClose: () => void }) {
    const bookingUrl = `/booking?doctor_id=${doctor.id}`;
    const experiences = Array.isArray(doctor.experiences) ? doctor.experiences : [];

    return (
        <Modal open onClose={onClose}>
            {/* Dark header */}
            <div className="relative bg-[#16100A] rounded-t-3xl overflow-hidden">
                <div className="absolute inset-0 opacity-[0.05]"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}/>
                <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2"
                    style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.3) 0%, transparent 70%)' }}/>
                <button onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                    <X className="w-4 h-4"/>
                </button>
                <div className="relative p-7 flex items-end gap-5">
                    {/* Photo */}
                    <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0 bg-red-900">
                        {doctor.photo_url
                            ? <img src={doctor.photo_url} alt={doctor.name} className="w-full h-full object-cover"/>
                            : <div className="w-full h-full flex items-center justify-center">
                                <span className="text-white font-black text-4xl">{doctor.name.charAt(0)}</span>
                              </div>
                        }
                    </div>
                    {/* Info */}
                    <div className="pb-1">
                        <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-1">{doctor.specialization ?? 'Шүдний эмч'}</p>
                        <h2 className="text-2xl font-black text-white mb-2">{doctor.name}</h2>
                        <div className="flex flex-wrap gap-2">
                            {doctor.experience_years && (
                                <span className="flex items-center gap-1.5 bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                    <Award className="w-3.5 h-3.5 text-red-400"/> {doctor.experience_years} жил
                                </span>
                            )}
                            {doctor.branch_name && (
                                <span className="flex items-center gap-1.5 bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                    <MapPin className="w-3.5 h-3.5 text-red-400"/> {doctor.branch_name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-6">
                {doctor.degree && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl mb-5">
                        <GraduationCap className="w-5 h-5 text-red-500 flex-shrink-0"/>
                        <div>
                            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Боловсрол</p>
                            <p className="text-sm font-semibold text-gray-800">{doctor.degree}</p>
                        </div>
                    </div>
                )}

                {doctor.description && (
                    <p className="text-gray-500 text-sm leading-relaxed mb-5">{doctor.description}</p>
                )}

                {/* Experience timeline */}
                {experiences.length > 0 && (
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Briefcase className="w-4 h-4 text-red-500"/>
                            <h3 className="text-sm font-bold text-gray-800">Ажлын туршлага</h3>
                        </div>
                        <div className="relative pl-4">
                            <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-100"/>
                            <div className="flex flex-col gap-5">
                                {experiences.map((exp, i) => (
                                    <div key={i} className="relative">
                                        <div className="absolute -left-[17px] top-1 w-3 h-3 rounded-full border-2 border-red-500 bg-white"/>
                                        {exp.year && (
                                            <p className="text-[11px] font-bold text-red-500 uppercase tracking-wider mb-0.5">{exp.year}</p>
                                        )}
                                        <p className="text-sm font-semibold text-gray-800">{exp.title}</p>
                                        {exp.institution && (
                                            <p className="text-xs text-gray-400 mt-0.5">{exp.institution}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                        { icon: Star, label: 'Туршлага', value: doctor.experience_years ? `${doctor.experience_years} жил` : '—' },
                        { icon: BadgeCheck, label: 'Мэргэжил', value: doctor.specialization ?? 'Эмч' },
                        { icon: MapPin, label: 'Салбар', value: doctor.branch_name ?? '—' },
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="bg-gray-50 rounded-2xl p-3.5 text-center">
                            <Icon className="w-4 h-4 text-red-400 mx-auto mb-1.5"/>
                            <p className="text-[10px] text-gray-400 font-medium mb-0.5">{label}</p>
                            <p className="text-xs font-bold text-gray-700 leading-tight line-clamp-1">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Contact */}
                {(doctor.phone || doctor.email) && (
                    <div className="flex flex-col gap-2 mb-5">
                        {doctor.phone && (
                            <a href={`tel:${doctor.phone}`}
                                className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-100 border border-transparent transition-all">
                                <Phone className="w-4 h-4 text-red-500 flex-shrink-0"/>
                                <span className="text-sm font-medium text-gray-700">{doctor.phone}</span>
                            </a>
                        )}
                        {doctor.email && (
                            <a href={`mailto:${doctor.email}`}
                                className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-100 border border-transparent transition-all">
                                <Mail className="w-4 h-4 text-red-500 flex-shrink-0"/>
                                <span className="text-sm font-medium text-gray-700">{doctor.email}</span>
                            </a>
                        )}
                    </div>
                )}

                <Link href={bookingUrl}
                    className="w-full flex items-center justify-center gap-2.5 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-200 text-base">
                    <Calendar className="w-5 h-5"/>
                    {doctor.name}-д цаг захиалах
                </Link>
            </div>
        </Modal>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DoctorsPage() {
    const { doctors, branches } = usePage<PageProps>().props;
    const [activeBranch, setActiveBranch] = useState<number | null>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

    const fallbackDoctors: Doctor[] = [
        { id: 1, name: 'Б. Нарантуяа', specialization: 'Гажиг заслын эмч', degree: 'Стоматологийн ухааны доктор (DDS)', experience_years: 12, description: 'Invisalign болон орчин үеийн гажиг засалтын аргуудаар мэргэшсэн туршлагатай эмч.', phone: '+976 9900-1111', email: 'narantuya@cuticul.mn', experiences: [{ year: '2023', title: 'Cuticul Dental — Ахлах эмч', institution: 'Улаанбаатар' }, { year: '2018', title: 'Seoul Dental Hospital — Тэтгэлэгт оюутан', institution: 'Сөүл, Солонгос' }], photo_url: null, branch_name: 'Хан-Уул салбар', branch_id: 1 },
        { id: 2, name: 'Д. Эрдэнэбаяр', specialization: 'Имплантологи', degree: 'Стоматологийн мастер (MDS)', experience_years: 8, description: 'Имплант суулгалт болон хүнд тохиолдлын мэс заслын чиглэлд мэргэшсэн.', phone: '+976 9900-2222', email: null, experiences: [{ year: '2022', title: 'Cuticul Dental — Имплантологич', institution: 'Улаанбаатар' }], photo_url: null, branch_name: 'Баянзүрх салбар', branch_id: 2 },
        { id: 3, name: 'С. Уянга', specialization: 'Эстетик шүд судлал', degree: 'Стоматологийн бакалавр (BDS)', experience_years: 6, description: 'Венер, цайруулалт болон гоо үзэмжтэй холбоотой эмчилгээнд мэргэшсэн.', phone: null, email: 'uyanga@cuticul.mn', experiences: [], photo_url: null, branch_name: 'Хан-Уул салбар', branch_id: 1 },
        { id: 4, name: 'Ж. Болормаа', specialization: 'Хүүхдийн шүдний эмч', degree: 'Педодонтистийн зэрэг', experience_years: 5, description: 'Хүүхдийн насанд тохирсон аятайхан, айдасгүй орчинд эмчилгээ хийдэг.', phone: '+976 9900-4444', email: null, experiences: [], photo_url: null, branch_name: 'Сүхбаатар салбар', branch_id: 3 },
    ];

    const source = doctors.length > 0 ? doctors : fallbackDoctors;
    const filtered = activeBranch !== null ? source.filter(d => d.branch_id === activeBranch) : source;

    return (
        <>
            <Head title="Эмч нар">
                <style>{`@keyframes modalIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
            </Head>
            <PublicLayout>
                {/* ── Hero ── */}
                <section className="pt-20 sm:pt-28 pb-12 sm:pb-20 bg-[#16100A] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.15) 0%, transparent 70%)' }}/>
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}/>
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <span className="inline-block text-red-500 text-xs font-bold uppercase tracking-widest mb-4 bg-red-500/10 px-3 py-1 rounded-full">Манай баг</span>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
                            Мэргэшсэн<br />
                            <span className="text-red-500">эмч нар</span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-xl leading-relaxed">
                            Олон улсын сертификаттай, туршлагатай, халамжтай эмч нашид танд хамгийн сайн үйлчилгээ үзүүлэхэд бэлэн.
                        </p>
                    </div>
                </section>

                {/* ── Branch filter ── */}
                {branches.length > 0 && (
                    <div className="sticky top-[68px] z-40 bg-white border-b border-gray-100 shadow-sm">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-2 overflow-x-auto">
                            <button onClick={() => setActiveBranch(null)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all ${activeBranch === null ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'}`}>
                                Бүх салбар
                            </button>
                            {branches.map(b => (
                                <button key={b.id} onClick={() => setActiveBranch(b.id)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all ${activeBranch === b.id ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'}`}>
                                    {b.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Doctors grid ── */}
                <section className="py-10 sm:py-16 lg:py-20 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {filtered.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                                {filtered.map(doc => (
                                    <button key={doc.id}
                                        onClick={() => setSelectedDoctor(doc)}
                                        className="group text-left rounded-3xl overflow-hidden border border-gray-100 hover:border-red-200 hover:shadow-xl transition-all duration-300 bg-white">

                                        {/* Photo */}
                                        <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-[#1e1209] to-[#2d1a10]">
                                            {doc.photo_url
                                                ? <img src={doc.photo_url} alt={doc.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                                                : <div className="w-full h-full flex items-center justify-center">
                                                    <div className="w-20 h-20 rounded-full bg-red-900/50 border border-red-800/30 flex items-center justify-center">
                                                        <span className="text-white font-black text-3xl">{doc.name.charAt(0)}</span>
                                                    </div>
                                                  </div>
                                            }
                                            {/* Bottom gradient overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"/>

                                            {/* Experience badge */}
                                            {doc.experience_years && (
                                                <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                                    <Award className="w-3 h-3"/> {doc.experience_years}жил
                                                </div>
                                            )}

                                            {/* Name overlay at bottom */}
                                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                                <p className="text-red-400 text-[11px] font-bold uppercase tracking-wider mb-0.5">{doc.specialization ?? 'Шүдний эмч'}</p>
                                                <h3 className="font-black text-white text-base leading-tight">{doc.name}</h3>
                                            </div>
                                        </div>

                                        {/* Card footer */}
                                        <div className="p-4">
                                            {doc.degree && (
                                                <p className="text-gray-400 text-xs mb-3 flex items-start gap-1.5">
                                                    <GraduationCap className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5"/>
                                                    {doc.degree}
                                                </p>
                                            )}
                                            {doc.branch_name && (
                                                <p className="text-gray-400 text-xs flex items-center gap-1.5 mb-4">
                                                    <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0"/>
                                                    {doc.branch_name}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                                <span className="text-xs text-gray-400 font-medium">Дэлгэрэнгүй</span>
                                                <span className="w-8 h-8 rounded-full bg-red-50 border border-red-100 group-hover:bg-red-600 group-hover:border-red-600 flex items-center justify-center transition-all duration-300">
                                                    <Award className="w-3.5 h-3.5 text-red-500 group-hover:text-white transition-colors"/>
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-24 text-gray-400">
                                <p className="text-lg">Энэ салбарт эмч бүртгэлгүй байна.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── CTA ── */}
                <section className="py-24 bg-[#F9F4F2]">
                    <div className="max-w-xl mx-auto px-4 text-center">
                        <span className="inline-block text-red-600 text-xs font-bold uppercase tracking-widest mb-4">Цаг захиалах</span>
                        <h2 className="text-3xl font-black text-gray-900 mb-4">Танд тохирсон эмчийг сонго</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed">Манай мэргэшсэн эмч нарын аль нэгтэй уулзаж, өөрт тохирсон эмчилгээгээ эхлүүл.</p>
                        <Link href="/booking"
                            className="inline-flex items-center gap-2.5 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-red-200 text-base">
                            <Calendar className="w-5 h-5"/>
                            Цаг захиалах
                        </Link>
                    </div>
                </section>
            </PublicLayout>

            {/* Doctor modal */}
            {selectedDoctor && (
                <DoctorModal doctor={selectedDoctor} onClose={() => setSelectedDoctor(null)}/>
            )}
        </>
    );
}
