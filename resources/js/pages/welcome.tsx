import { Head, Link, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import PublicLayout from '@/layouts/public-layout';
import {
    ArrowRight, Calendar, CheckCircle, Award,
    ChevronRight, Smile, MapPin, ChevronLeft,
    X, Phone, Mail, Image as ImageIcon,
    GraduationCap, Briefcase, BadgeCheck
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SubTreatment {
    id: number; title: string; description: string | null;
    price_min: number | null; price_max: number | null; duration_min: number | null;
}
interface Treatment {
    id: number; title: string; description: string | null;
    price_min: number | null; price_max: number | null;
    duration_min: number | null; image_url: string | null;
    sub_treatments: SubTreatment[];
}
interface TreatmentCategory {
    id: number; name: string; icon: string | null; treatments: Treatment[];
}
interface Experience { year?: string; title: string; institution?: string }
interface Doctor {
    id: number; name: string; specialization: string | null; degree: string | null;
    experience_years: number | null; description: string | null;
    phone: string | null; email: string | null;
    experiences: Experience[] | null;
    photo_url: string | null; branch_name: string | null; branch_id: number | null;
}
interface GalleryItem {
    id: number; title: string | null; description: string | null;
    before_url: string | null; after_url: string | null; category_name: string | null;
}
interface Article {
    id: number; title: string; slug: string; excerpt: string | null;
    category: string | null; featured_image: string | null; published_at: string | null;
}
interface Faq { id: number; question: string; answer: string; category: string | null }
interface Branch { id: number; name: string; address: string | null; phone: string | null }
interface PageProps {
    [key: string]: unknown;
    auth: { user?: { name: string } };
    doctors: Doctor[]; treatments: TreatmentCategory[];
    gallery: GalleryItem[]; articles: Article[];
    faqs: Faq[]; branches: Branch[];
    stats: { doctors: number; appointments: number; branches: number };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL BASE — backdrop + scroll lock
// ═══════════════════════════════════════════════════════════════════════════

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
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            {/* Panel */}
            <div
                className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
            >
                {children}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// TREATMENT MODAL
// ═══════════════════════════════════════════════════════════════════════════

function TreatmentModal({ treatment, catName, onClose }: {
    treatment: Treatment | null; catName: string; onClose: () => void;
}) {
    if (!treatment) return null;

    const hasPrice = treatment.price_min || treatment.price_max;
    const bookingUrl = `/booking?service=${encodeURIComponent(treatment.title)}`;

    return (
        <Modal open onClose={onClose}>
            {/* Image or gradient header */}
            <div className="relative">
                {treatment.image_url ? (
                    <div className="aspect-[16/7] overflow-hidden rounded-t-3xl sm:rounded-t-3xl">
                        <img src={treatment.image_url} alt={treatment.title}
                            className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-t-3xl" />
                    </div>
                ) : (
                    <div className="aspect-[16/7] bg-gradient-to-br from-red-700 via-red-600 to-rose-500 rounded-t-3xl sm:rounded-t-3xl flex items-center justify-center">
                        <div className="text-white/20">
                            <ImageIcon className="w-20 h-20" />
                        </div>
                    </div>
                )}

                {/* Close btn */}
                <button onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all">
                    <X className="w-5 h-5" />
                </button>

                {/* Category badge */}
                <div className="absolute bottom-4 left-5">
                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30">
                        {catName}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8">
                {/* Title + price */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">{treatment.title}</h2>
                    {hasPrice && (
                        <div className="text-right flex-shrink-0">
                            <p className="text-red-600 font-black text-lg">
                                {treatment.price_min && `${Number(treatment.price_min).toLocaleString()}₮`}
                                {treatment.price_min && treatment.price_max && '–'}
                                {treatment.price_max && `${Number(treatment.price_max).toLocaleString()}₮`}
                            </p>
                            {treatment.duration_min && (
                                <p className="text-gray-400 text-xs mt-0.5">{treatment.duration_min} мин</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Description */}
                {treatment.description && (
                    <p className="text-gray-600 leading-relaxed mb-6 text-[15px]">{treatment.description}</p>
                )}

                {/* Sub-treatments */}
                {treatment.sub_treatments.length > 0 && (
                    <div className="mb-6">
                        <h3 className="font-bold text-gray-900 text-sm uppercase tracking-widest mb-3">
                            Дэлгэрэнгүй үйлчилгээ
                        </h3>
                        <div className="flex flex-col gap-2">
                            {treatment.sub_treatments.map(s => (
                                <div key={s.id}
                                    className="flex items-center justify-between px-4 py-3.5 bg-gray-50 hover:bg-rose-50 rounded-xl border border-gray-100 hover:border-red-100 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
                                            {s.description && (
                                                <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{s.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    {(s.price_min || s.price_max) && (
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <p className="text-red-600 font-bold text-sm">
                                                {s.price_min && `${Number(s.price_min).toLocaleString()}₮`}
                                                {s.price_min && s.price_max && '–'}
                                                {s.price_max && `${Number(s.price_max).toLocaleString()}₮`}
                                            </p>
                                            {s.duration_min && (
                                                <p className="text-gray-400 text-[11px]">{s.duration_min} мин</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* What's included */}
                <div className="flex flex-col gap-2 mb-7">
                    {['Мэргэшсэн эмчийн оролцоо', 'Орчин үеийн тоног төхөөрөмж', 'Дараагийн үзлэгийн зөвлөгөө'].map((f, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            {f}
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <Link href={bookingUrl}
                    className="w-full flex items-center justify-center gap-2.5 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-200 text-base">
                    <Calendar className="w-5 h-5" />
                    Эмч дээр цаг захиалах
                </Link>
            </div>
        </Modal>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCTOR MODAL
// ═══════════════════════════════════════════════════════════════════════════

function DoctorModal({ doctor, onClose }: { doctor: Doctor | null; onClose: () => void }) {
    if (!doctor) return null;

    const bookingUrl = `/booking?doctor_id=${doctor.id}`;

    return (
        <Modal open onClose={onClose}>
            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#16100A] to-[#2a1a10] rounded-t-3xl p-6 sm:p-8 pb-0">
                <button onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all">
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-end gap-5 pb-6">
                    {/* Photo */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-white/10 flex-shrink-0 border-2 border-white/20 shadow-xl">
                        {doctor.photo_url
                            ? <img src={doctor.photo_url} alt={doctor.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center bg-red-900/30">
                                <span className="text-white font-black text-4xl">{doctor.name.charAt(0)}</span>
                              </div>
                        }
                    </div>

                    <div className="min-w-0 pb-1">
                        <h2 className="text-2xl font-black text-white leading-tight">{doctor.name}</h2>
                        {doctor.specialization && (
                            <p className="text-red-400 font-semibold text-sm mt-1">{doctor.specialization}</p>
                        )}
                        {doctor.degree && (
                            <p className="text-gray-400 text-xs mt-0.5">{doctor.degree}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {doctor.experience_years && (
                                <span className="bg-white/10 text-white/80 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                                    <Award className="w-3 h-3" />
                                    {doctor.experience_years} жилийн туршлага
                                </span>
                            )}
                            {doctor.branch_name && (
                                <span className="bg-white/10 text-white/80 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3" />
                                    {doctor.branch_name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tab indicator line */}
                <div className="h-px bg-white/10" />
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 flex flex-col gap-6">

                {/* About */}
                {doctor.description && (
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                            <BadgeCheck className="w-4 h-4 text-red-400" /> Танилцуулга
                        </h3>
                        <p className="text-gray-700 leading-relaxed text-[15px]">{doctor.description}</p>
                    </div>
                )}

                {/* Experiences */}
                {doctor.experiences && doctor.experiences.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-red-400" /> Ажлын туршлага & Боловсрол
                        </h3>
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-3 top-2 bottom-2 w-px bg-red-100" />
                            <div className="flex flex-col gap-4">
                                {doctor.experiences.map((exp, i) => (
                                    <div key={i} className="flex gap-4 pl-1">
                                        {/* Dot */}
                                        <div className="w-6 h-6 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                        </div>
                                        <div className="pb-1">
                                            {exp.year && (
                                                <p className="text-red-500 text-xs font-bold mb-0.5">{exp.year}</p>
                                            )}
                                            <p className="font-semibold text-gray-800 text-sm">{exp.title}</p>
                                            {exp.institution && (
                                                <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                                                    <GraduationCap className="w-3 h-3" />
                                                    {exp.institution}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Туршлага', value: doctor.experience_years ? `${doctor.experience_years} жил` : '—' },
                        { label: 'Мэргэжил', value: doctor.specialization ?? '—' },
                        { label: 'Салбар', value: doctor.branch_name ?? '—' },
                    ].map((s, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="font-black text-gray-900 text-sm leading-snug">{s.value}</p>
                            <p className="text-gray-400 text-[11px] mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Contact */}
                {(doctor.phone || doctor.email) && (
                    <div className="flex flex-col gap-2">
                        {doctor.phone && (
                            <a href={`tel:${doctor.phone}`}
                                className="flex items-center gap-3 p-3.5 bg-gray-50 hover:bg-red-50 border border-gray-100 hover:border-red-200 rounded-xl transition-all group">
                                <div className="w-9 h-9 bg-red-100 group-hover:bg-red-200 rounded-lg flex items-center justify-center">
                                    <Phone className="w-4 h-4 text-red-600" />
                                </div>
                                <span className="text-gray-700 group-hover:text-red-700 font-medium text-sm transition-colors">{doctor.phone}</span>
                            </a>
                        )}
                        {doctor.email && (
                            <a href={`mailto:${doctor.email}`}
                                className="flex items-center gap-3 p-3.5 bg-gray-50 hover:bg-red-50 border border-gray-100 hover:border-red-200 rounded-xl transition-all group">
                                <div className="w-9 h-9 bg-red-100 group-hover:bg-red-200 rounded-lg flex items-center justify-center">
                                    <Mail className="w-4 h-4 text-red-600" />
                                </div>
                                <span className="text-gray-700 group-hover:text-red-700 font-medium text-sm transition-colors">{doctor.email}</span>
                            </a>
                        )}
                    </div>
                )}

                {/* CTA */}
                <Link href={bookingUrl}
                    className="w-full flex items-center justify-center gap-2.5 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-200 text-base">
                    <Calendar className="w-5 h-5" />
                    {doctor.name}-д цаг захиалах
                </Link>
            </div>
        </Modal>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// ARTICLE MODAL
// ═══════════════════════════════════════════════════════════════════════════

function ArticleModal({ article, onClose }: { article: Article | null; onClose: () => void }) {
    if (!article) return null;
    return (
        <Modal open onClose={onClose}>
            <div className="relative">
                {article.featured_image ? (
                    <div className="aspect-[16/7] overflow-hidden rounded-t-3xl">
                        <img src={article.featured_image} alt={article.title} className="w-full h-full object-cover"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-t-3xl"/>
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
                        <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30">
                            {article.category}
                        </span>
                    </div>
                )}
            </div>
            <div className="p-6 sm:p-8">
                {article.published_at && (
                    <p className="text-gray-400 text-sm mb-3">{article.published_at}</p>
                )}
                <h2 className="text-2xl font-black text-gray-900 leading-tight mb-4">{article.title}</h2>
                {article.excerpt && (
                    <p className="text-gray-600 leading-relaxed text-[15px]">{article.excerpt}</p>
                )}
            </div>
        </Modal>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// HERO SLIDE ILLUSTRATIONS
// ═══════════════════════════════════════════════════════════════════════════

function BracesIllustration() {
    return (
        <svg viewBox="0 0 480 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
            <ellipse cx="240" cy="475" rx="150" ry="16" fill="#C62828" opacity="0.12" />
            {[0,1,2,3,4,5,6,7,8].map(i => {
                const x = 18 + i * 50, isCen = i===3||i===4||i===5, isCan = i===2||i===6;
                const h = isCen?148:isCan?128:112, w = isCen?46:isCan?40:38, y = isCen?95:isCan?112:122;
                return (
                    <g key={`u${i}`}>
                        <rect x={x} y={y} width={w} height={h} rx={isCen?20:isCan?15:13} fill="url(#tg1)" stroke="#E5E7EB" strokeWidth="1.5"/>
                        <rect x={x+7} y={y+56} width={w-14} height={17} rx={4} fill="#C62828"/>
                        <rect x={x+7} y={y+63} width={w-14} height={2.5} rx={1} fill="#9B1B1B"/>
                        <rect x={x+9} y={y+54} width={5} height={4.5} rx={2} fill="#EF5350"/>
                        <rect x={x+w-14} y={y+54} width={5} height={4.5} rx={2} fill="#EF5350"/>
                        <rect x={x+4} y={y+6} width={7} height={20} rx={3.5} fill="white" opacity="0.22"/>
                    </g>
                );
            })}
            <path d="M28 208 Q240 184 452 208" stroke="#C62828" strokeWidth="5" strokeLinecap="round" fill="none"/>
            {[0,1,2,3,4,5,6,7,8].map(i => {
                const x = 18 + i * 50, isCen = i===3||i===4||i===5, isCan = i===2||i===6;
                const h = isCen?124:isCan?110:98, w = isCen?44:isCan?38:36;
                return (
                    <g key={`l${i}`}>
                        <rect x={x} y={278} width={w} height={h} rx={isCen?18:isCan?13:12} fill="url(#tg2)" stroke="#E5E7EB" strokeWidth="1.5"/>
                        <rect x={x+7} y={314} width={w-14} height={15} rx={3.5} fill="#C62828"/>
                        <rect x={x+7} y={320} width={w-14} height={2} rx={1} fill="#9B1B1B"/>
                        <rect x={x+9} y={312} width={4.5} height={4} rx={2} fill="#EF5350"/>
                        <rect x={x+w-13} y={312} width={4.5} height={4} rx={2} fill="#EF5350"/>
                        <rect x={x+4} y={284} width={6} height={16} rx={3} fill="white" opacity="0.18"/>
                    </g>
                );
            })}
            <path d="M28 318 Q240 338 452 318" stroke="#C62828" strokeWidth="5" strokeLinecap="round" fill="none"/>
            <defs>
                <linearGradient id="tg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#F0F0F0"/>
                </linearGradient>
                <linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F5F5F5"/><stop offset="100%" stopColor="#E4E4E4"/>
                </linearGradient>
            </defs>
        </svg>
    );
}

function ImplantIllustration() {
    return (
        <svg viewBox="0 0 480 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
            <ellipse cx="240" cy="475" rx="130" ry="14" fill="#C62828" opacity="0.10"/>
            <path d="M140 80 Q150 48 180 44 Q210 40 240 38 Q270 40 300 44 Q330 48 340 80 Q350 130 340 180 Q320 210 240 216 Q160 210 140 180 Q130 130 140 80Z"
                fill="url(#crownGrad)" stroke="#E5E7EB" strokeWidth="2"/>
            <path d="M170 70 Q190 54 220 52 Q240 50 240 70 Q220 72 200 76 Z" fill="white" opacity="0.35"/>
            <path d="M180 155 Q240 162 300 155" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x={120} y={200} width={240} height={40} rx={8} fill="#FECACA" opacity="0.6"/>
            <path d="M120 215 Q240 230 360 215" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M210 240 L218 280 L262 280 L270 240Z" fill="url(#abGrad)"/>
            <path d="M205 238 L275 238" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round"/>
            <rect x={222} y={280} width={36} height={130} rx={6} fill="url(#screwGrad)"/>
            {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
                <path key={i} d={`M216 ${290+i*10} Q240 ${287+i*10} 264 ${290+i*10}`}
                    stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7"/>
            ))}
            <path d="M222 410 L240 430 L258 410Z" fill="url(#screwGrad)"/>
            <rect x={100} y={330} width={280} height={100} rx={12} fill="#FEF3C7" opacity="0.4" stroke="#FDE68A" strokeWidth="1.5"/>
            <text x="240" y="392" textAnchor="middle" fontSize="11" fill="#D97706" fontWeight="600" opacity="0.7">Ясны эд</text>
            <rect x={228} y={288} width={8} height={110} rx={4} fill="white" opacity="0.25"/>
            <defs>
                <linearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF"/><stop offset="50%" stopColor="#F9FAFB"/><stop offset="100%" stopColor="#F0F0F0"/>
                </linearGradient>
                <linearGradient id="abGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#9CA3AF"/><stop offset="50%" stopColor="#E5E7EB"/><stop offset="100%" stopColor="#9CA3AF"/>
                </linearGradient>
                <linearGradient id="screwGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6B7280"/><stop offset="30%" stopColor="#D1D5DB"/>
                    <stop offset="60%" stopColor="#E5E7EB"/><stop offset="100%" stopColor="#9CA3AF"/>
                </linearGradient>
            </defs>
        </svg>
    );
}

function VeneerIllustration() {
    return (
        <svg viewBox="0 0 480 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
            <ellipse cx="240" cy="478" rx="145" ry="14" fill="#C62828" opacity="0.10"/>
            <path d="M148 72 Q152 42 180 38 Q200 34 230 34 Q236 38 236 72 Q238 160 234 240 Q216 258 190 258 Q162 256 152 238 Q142 210 148 72Z"
                fill="#FEF9EC" stroke="#E8DDB8" strokeWidth="2" opacity="0.7"/>
            <path d="M158 68 Q164 36 196 30 Q228 24 262 28 Q292 34 302 60 Q316 100 314 180 Q312 240 300 280 Q278 306 248 312 Q216 316 192 302 Q164 286 158 262 Q144 220 158 68Z"
                fill="url(#toothBase)" stroke="#E5E7EB" strokeWidth="2"/>
            <path d="M164 64 Q170 34 200 30 Q232 26 264 30 Q290 36 298 62 Q308 102 306 176 Q304 228 294 265 Q272 292 246 296 Q220 298 200 285 Q178 272 168 248 Q156 210 164 64Z"
                fill="url(#veneerGrad)" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
            <path d="M186 46 Q200 32 228 32 Q250 34 258 50 Q244 56 220 58 Q200 58 186 46Z" fill="white" opacity="0.55"/>
            <path d="M178 80 Q182 68 190 64" stroke="white" strokeWidth="6" strokeLinecap="round" opacity="0.4"/>
            <path d="M175 180 Q232 190 295 180" stroke="#E8E8E8" strokeWidth="1" strokeLinecap="round"/>
            <path d="M180 220 Q232 228 288 220" stroke="#E8E8E8" strokeWidth="1" strokeLinecap="round"/>
            <rect x={106} y={340} width={100} height={36} rx={10} fill="#FEF9EC" stroke="#E8DDB8" strokeWidth="1.5"/>
            <text x="156" y="363" textAnchor="middle" fontSize="12" fill="#B45309" fontWeight="700">Өмнө</text>
            <rect x={274} y={340} width={100} height={36} rx={10} fill="white" stroke="#E5E7EB" strokeWidth="1.5"/>
            <text x="324" y="363" textAnchor="middle" fontSize="12" fill="#C62828" fontWeight="700">Дараа ✨</text>
            <path d="M212 358 L268 358" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
            <path d="M260 353 L268 358 L260 363" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            {[[340,100],[380,160],[360,220]].map(([cx,cy],i) => (
                <g key={i}>
                    <path d={`M${cx} ${cy-8} L${cx+3} ${cy} L${cx} ${cy+8} L${cx-3} ${cy}Z`} fill="#C62828" opacity="0.3"/>
                    <path d={`M${cx-8} ${cy} L${cx} ${cy-3} L${cx+8} ${cy} L${cx} ${cy+3}Z`} fill="#C62828" opacity="0.3"/>
                </g>
            ))}
            <defs>
                <linearGradient id="toothBase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F5F0E4"/><stop offset="100%" stopColor="#EDE8D8"/>
                </linearGradient>
                <linearGradient id="veneerGrad" x1="0.1" y1="0" x2="0.9" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF"/><stop offset="40%" stopColor="#FAFAFA"/><stop offset="100%" stopColor="#F2F2F2"/>
                </linearGradient>
            </defs>
        </svg>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// HERO SLIDES CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const HERO_SLIDES = [
    { id: 0, tag: 'Гажиг засал', title: 'Гоё инээмсэглэл\nтаны эрхэм', highlight: 'инээмсэглэл', sub: 'Invisalign, брекет болон орчин үеийн гажиг засалтай аргуудаар хоёр жилд шинэ амьдрал эхлүүл.', badge: 'Invisalign™ Provider', Illustration: BracesIllustration },
    { id: 1, tag: 'Имплант шүд', title: 'Алдсан шүдийг\nсэргээх цаг', highlight: 'сэргээх', sub: 'Дэлхийн чанарын титан имплантаар байнгын шүдийг бүрэн сэргээ. Гэрэлтэх инээмсэглэлд буц.', badge: 'ISO Сертификаттай', Illustration: ImplantIllustration },
    { id: 2, tag: 'Шүдний шигтгээ', title: 'Алмаз мэт\nгэрэлтэх шүд', highlight: 'гэрэлтэх', sub: 'Порселан венер болон гоёлын шигтгээгээр шүдийг тань өнгө, хэлбэр, эгнээгээр нь төгс болгоно.', badge: 'Эстетик Шүд судлал', Illustration: VeneerIllustration },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// HERO SLIDESHOW
// ═══════════════════════════════════════════════════════════════════════════

function HeroSlideshow({ doctors }: { doctors: Doctor[] }) {
    const [current, setCurrent] = useState(0);
    const [animating, setAnimating] = useState(false);
    const [direction, setDirection] = useState<'next'|'prev'>('next');
    const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

    const goTo = useCallback((idx: number, dir: 'next'|'prev' = 'next') => {
        if (animating) return;
        setDirection(dir);
        setAnimating(true);
        setTimeout(() => { setCurrent(idx); setAnimating(false); }, 600);
    }, [animating]);

    const next = useCallback(() => goTo((current+1)%HERO_SLIDES.length,'next'), [current, goTo]);
    const prev = useCallback(() => goTo((current-1+HERO_SLIDES.length)%HERO_SLIDES.length,'prev'), [current, goTo]);

    useEffect(() => {
        timerRef.current = setInterval(next, 5000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [next]);

    const resetTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(next, 5000);
    };

    const slide = HERO_SLIDES[current];
    const Illu = slide.Illustration;
    const titleLines = slide.title.split('\n');

    return (
        <section className="relative min-h-screen bg-[#16100A] overflow-hidden flex items-center">
            <div className="absolute top-0 left-0 w-[700px] h-[700px] rounded-full blur-[150px] -translate-x-1/3 -translate-y-1/3 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.18) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(140,10,10,0.12) 0%, transparent 70%)' }} />
            <div className="absolute inset-0 opacity-[0.035]"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '30px 30px' }} />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20 sm:pt-24 pb-10 sm:pb-12">
                <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center min-h-[auto] lg:min-h-[88vh]">
                    {/* Left */}
                    <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6 order-2 lg:order-1">
                        <div key={`tag-${current}`} className="flex items-center gap-2 w-fit"
                            style={{ animation: 'fadeSlideIn 0.7s ease forwards' }}>
                            <span className="w-6 h-px bg-red-500" />
                            <span className="text-red-400 text-xs font-bold uppercase tracking-[0.2em]">{slide.tag}</span>
                        </div>
                        <div key={`title-${current}`} style={{ animation: 'fadeSlideIn 0.8s ease 0.1s both' }}>
                            <h1 className="text-3xl sm:text-4xl md:text-[3.5rem] lg:text-[3.8rem] font-black text-white leading-[1.05] tracking-tight">
                                {titleLines.map((line, li) =>
                                    line.includes(slide.highlight)
                                        ? <span key={li}>{line.split(slide.highlight)[0]}<span className="text-red-500">{slide.highlight}</span>{line.split(slide.highlight)[1]}{li < titleLines.length-1 && <br/>}</span>
                                        : <span key={li}>{line}{li < titleLines.length-1 && <br/>}</span>
                                )}
                            </h1>
                        </div>
                        <p key={`sub-${current}`} className="text-gray-400 leading-relaxed max-w-sm text-[15px]"
                            style={{ animation: 'fadeSlideIn 0.8s ease 0.2s both' }}>{slide.sub}</p>
                        <div className="flex gap-3 pt-1" style={{ animation: 'fadeSlideIn 0.8s ease 0.3s both' }}>
                            <Link href="/booking" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-red-900/30 text-sm">
                                <Calendar className="w-4 h-4" /> Цаг захиалах
                            </Link>
                            <Link href="/services" className="inline-flex items-center gap-2 border border-white/15 text-white/70 hover:text-white hover:border-white/30 font-semibold px-5 py-3.5 rounded-xl transition-all text-sm">
                                Үйлчилгээ <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="flex gap-6 pt-4 border-t border-white/8 mt-2">
                            {[{ v: '10+', l: 'Жилийн туршлага' }, { v: '98%', l: 'Сэтгэл ханамж' }].map((s,i) => (
                                <div key={i}>
                                    <p className="text-2xl font-black text-white">{s.v}</p>
                                    <p className="text-gray-500 text-xs mt-0.5">{s.l}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Center illustration */}
                    <div className="lg:col-span-5 flex justify-center items-center order-1 lg:order-2">
                        <div className="relative w-full max-w-[280px] sm:max-w-[380px] lg:max-w-none">
                            <div className="absolute inset-0 bg-red-600/6 rounded-full blur-3xl scale-95 translate-y-8 pointer-events-none" />
                            <div key={`illu-${current}`} className="relative"
                                style={{ animation: animating ? `slideOut${direction==='next'?'Left':'Right'} 0.6s ease forwards` : `slideIn${direction==='next'?'Right':'Left'} 0.7s ease forwards` }}>
                                <Illu />
                            </div>
                            <div key={`badge-${current}`} className="absolute top-2 -right-3 lg:-right-8 bg-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-2.5"
                                style={{ animation: 'fadeSlideIn 0.8s ease 0.4s both' }}>
                                <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                                    <CheckCircle className="w-4 h-4 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-medium">Мэргэжлийн</p>
                                    <p className="text-sm font-black text-gray-900">{slide.badge}</p>
                                </div>
                            </div>
                            <div className="absolute bottom-10 -left-3 lg:-left-8 bg-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <Award className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-medium">Баталгааллагдсан</p>
                                    <p className="text-sm font-black text-gray-900">ISO 9001</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right doctors */}
                    <div className="lg:col-span-3 order-3 hidden lg:flex flex-col gap-2">
                        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mb-2">Манай эмч нар</p>
                        {doctors.slice(0, 4).map(doc => (
                            <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/6 hover:bg-white/5 transition-all">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                                    {doc.photo_url ? <img src={doc.photo_url} alt={doc.name} className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-white/50 font-black text-lg">{doc.name.charAt(0)}</div>}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white/90 font-semibold text-xs truncate">{doc.name}</p>
                                    <p className="text-gray-500 text-[11px] truncate">{doc.specialization ?? 'Шүдний эмч'}</p>
                                </div>
                            </div>
                        ))}
                        <Link href="/doctors" className="mt-2 text-gray-500 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors group">
                            Бүгдийг харах <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* Slide controls */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6">
                    <button onClick={() => { prev(); resetTimer(); }}
                        className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                        {HERO_SLIDES.map((s,i) => (
                            <button key={s.id} onClick={() => { goTo(i, i>current?'next':'prev'); resetTimer(); }}
                                className="relative overflow-hidden rounded-full transition-all duration-300"
                                style={{ width: i===current?32:8, height:8, background: i===current?'transparent':'rgba(255,255,255,0.2)' }}>
                                {i===current && (
                                    <span className="absolute inset-0 rounded-full bg-white/25">
                                        <span className="absolute inset-y-0 left-0 bg-red-500 rounded-full animate-[progress_5s_linear_forwards]"/>
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => { next(); resetTimer(); }}
                        className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-all">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY CAROUSEL
// ═══════════════════════════════════════════════════════════════════════════

function CategoryCarousel({ categories }: { categories: TreatmentCategory[] }) {
    const fallback = ['Гажиг засал','Invisalign','Имплант','Шүд авалт','Цайруулалт','Ерөнхий үзлэг','Хүүхдийн засал','Шигтгээ'].map((n,i)=>({id:i,name:n,icon:null,treatments:[]}));
    const data = categories.length > 0 ? categories : fallback;
    const tripled = [...data,...data,...data];
    return (
        <div className="bg-[#0E0A06] border-y border-white/5 py-5 overflow-hidden">
            <div className="flex gap-3 w-max" style={{ animation:'marquee 35s linear infinite' }}>
                {tripled.map((cat,i) => (
                    <Link href="/services" key={i}
                        className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/8 hover:border-red-500/30 rounded-xl px-5 py-3 flex-shrink-0 transition-all group">
                        {cat.icon
                            ? <span className="text-xl">{cat.icon}</span>
                            : <span className="w-6 h-6 rounded-md bg-red-900/40 flex items-center justify-center text-red-400 text-xs font-black">{cat.name.charAt(0)}</span>
                        }
                        <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors whitespace-nowrap">{cat.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-red-400 transition-colors" />
                    </Link>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICES SECTION — with modal on click
// ═══════════════════════════════════════════════════════════════════════════

function ServicesSection({ treatments }: { treatments: TreatmentCategory[] }) {
    const [activeCat, setActiveCat] = useState(0);
    const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
    const [selectedCatName, setSelectedCatName] = useState('');

    const fallback: TreatmentCategory[] = [
        { id: 1, name: 'Гажиг засал', icon: null, treatments: [
            { id: 1, title: 'Invisalign', description: 'Харагдахгүй, авч хийж болдог шилэн тэгшлэгч систем. Өдөр тутмын амьдралд саад болохгүйгээр гажиг засаад явна.', price_min: 1500000, price_max: 3000000, duration_min: 60, image_url: null, sub_treatments: [] },
            { id: 2, title: 'Металл брекет', description: 'Тогтвортой, батуу уламжлалт гажиг засалтын брекет систем.', price_min: 800000, price_max: 1500000, duration_min: 45, image_url: null, sub_treatments: [] },
            { id: 3, title: 'Мэлмий брекет', description: 'Шүдтэй нийлэх өнгийн керамик брекет — гоо үзэмжтэй.', price_min: 1200000, price_max: 2000000, duration_min: 45, image_url: null, sub_treatments: [] },
        ]},
    ];
    const data = treatments.length > 0 ? treatments : fallback;
    const cat = data[activeCat] ?? data[0];

    function openTreatment(t: Treatment, catN: string) {
        setSelectedTreatment(t);
        setSelectedCatName(catN);
    }

    return (
        <>
            <section className="py-5 md:py-7 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="flex items-end justify-between gap-4 mb-4">
                        <div>
                            <span className="text-red-600 text-xs font-bold tracking-widest uppercase">Үйлчилгээ</span>
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">Эмчилгээний төрлүүд</h2>
                        </div>
                        <Link href="/services" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 flex-shrink-0 group">
                            Бүгд <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    {/* Category tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
                        {data.map((c,i) => (
                            <button key={c.id} onClick={() => setActiveCat(i)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${i===activeCat ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'}`}>
                                {c.name}
                            </button>
                        ))}
                    </div>

                    {/* Treatment cards — asymmetric grid */}
                    {cat && cat.treatments.length > 0 ? (
                        <div key={cat.id} style={{ animation:'fadeSlideIn 0.35s ease forwards' }}
                            className="grid lg:grid-cols-12 gap-3">

                            {/* FEATURED card */}
                            {cat.treatments[0] && (() => {
                                const t = cat.treatments[0];
                                return (
                                    <button onClick={() => openTreatment(t, cat.name)}
                                        className="lg:col-span-4 group rounded-2xl overflow-hidden border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all bg-white text-left w-full">
                                        <div className="aspect-[4/3] overflow-hidden relative">
                                            {t.image_url
                                                ? <img src={t.image_url} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                                : <div className="w-full h-full bg-gradient-to-br from-rose-50 to-red-100 flex items-center justify-center"><ImageIcon className="w-8 h-8 text-red-200"/></div>
                                            }
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
                                            <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                Дэлгэрэнгүй →
                                            </div>
                                        </div>
                                        <div className="p-2.5">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="text-sm font-bold text-gray-900 group-hover:text-red-700 transition-colors leading-snug">{t.title}</h3>
                                                {t.price_min && (
                                                    <span className="text-red-600 font-bold text-xs flex-shrink-0">
                                                        {Number(t.price_min).toLocaleString()}₮+
                                                    </span>
                                                )}
                                            </div>
                                            {t.description && (
                                                <p className="text-gray-400 text-[11px] leading-relaxed line-clamp-2">{t.description}</p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })()}

                            {/* Small cards */}
                            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-2 gap-3 content-start">
                                {cat.treatments.slice(1, 3).map(t => (
                                    <button key={t.id} onClick={() => openTreatment(t, cat.name)}
                                        className="group rounded-2xl overflow-hidden border border-gray-100 hover:border-red-200 hover:shadow-md transition-all bg-white text-left flex flex-col">
                                        <div className="aspect-[4/3] overflow-hidden relative">
                                            {t.image_url
                                                ? <img src={t.image_url} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                                : <div className="w-full h-full bg-gradient-to-br from-rose-50 to-red-100 flex items-center justify-center"><ImageIcon className="w-8 h-8 text-red-200"/></div>
                                            }
                                        </div>
                                        <div className="p-2.5 flex-1 flex flex-col">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-900 group-hover:text-red-700 transition-colors text-xs leading-snug">{t.title}</h3>
                                                {t.price_min && (
                                                    <span className="text-red-600 font-bold text-[10px] flex-shrink-0">
                                                        {Number(t.price_min).toLocaleString()}₮+
                                                    </span>
                                                )}
                                            </div>
                                            {t.description && (
                                                <p className="text-gray-400 text-[10px] leading-relaxed line-clamp-2 mt-auto">{t.description}</p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                                {cat.treatments.length > 3 && (
                                    <Link href="/services"
                                        className="rounded-2xl border-2 border-dashed border-gray-200 hover:border-red-300 bg-gray-50 hover:bg-red-50 flex flex-col items-center justify-center p-6 gap-2 transition-all group">
                                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors"/>
                                        <span className="text-xs font-semibold text-gray-500 group-hover:text-red-600 transition-colors text-center">
                                            {cat.treatments.length-3}+ үйлчилгээ
                                        </span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 py-10">Энэ ангилалд үйлчилгээ байхгүй байна.</p>
                    )}
                </div>
            </section>

            {/* Treatment Modal */}
            {selectedTreatment && (
                <TreatmentModal
                    treatment={selectedTreatment}
                    catName={selectedCatName}
                    onClose={() => setSelectedTreatment(null)}
                />
            )}
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function FaqItem({ faq }: { faq: Faq }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`border rounded-2xl overflow-hidden transition-all ${open ? 'border-red-200 shadow-sm' : 'border-gray-100'}`}>
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left gap-4">
                <span className={`font-medium text-base ${open ? 'text-red-700' : 'text-gray-800'}`}>{faq.question}</span>
                <ChevronRight className={`w-5 h-5 flex-shrink-0 text-red-400 transition-transform duration-300 ${open ? 'rotate-90' : ''}`}/>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-80' : 'max-h-0'}`}>
                <p className="px-6 pb-5 text-gray-500 text-sm leading-relaxed">{faq.answer}</p>
            </div>
        </div>
    );
}

function GalleryCard({ item }: { item: GalleryItem }) {
    const [after, setAfter] = useState(false);
    return (
        <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm group hover:shadow-md transition-all">
            <div className="relative aspect-[4/3] bg-rose-50 overflow-hidden">
                {(item.before_url||item.after_url) ? (
                    <>
                        <img src={after?(item.after_url??''):(item.before_url??'')} alt="" className="w-full h-full object-cover"/>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            <button onClick={() => setAfter(false)} className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${!after?'bg-gray-900 text-white':'bg-white/90 text-gray-600'}`}>Өмнө</button>
                            <button onClick={() => setAfter(true)} className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${after?'bg-red-600 text-white':'bg-white/90 text-gray-600'}`}>Дараа</button>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center"><Smile className="w-12 h-12 text-red-200"/></div>
                )}
            </div>
            {item.title && (
                <div className="p-4">
                    <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                    {item.category_name && <p className="text-red-500 text-xs font-medium mt-0.5">{item.category_name}</p>}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function Welcome() {
    const { doctors, treatments, gallery, articles, faqs, branches } =
        usePage<PageProps>().props;

    const [activeBranch, setActiveBranch] = useState<number|null>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor|null>(null);
    const [selectedArticle, setSelectedArticle] = useState<Article|null>(null);

    const filteredDoctors = (activeBranch
        ? doctors.filter(d => d.branch_id === activeBranch)
        : doctors).slice(0, 4);

    const defaultFaqs: Faq[] = [
        { id: 1, question: 'Брекет эмчилгээ хэр удаан үргэлжлэх вэ?', answer: 'Ихэнх тохиолдолд 12–24 сар. Гажигийн хэмжээ болон аргаас хамаарна.', category: null },
        { id: 2, question: 'Invisalign болон металл брекет хоёрын ялгаа юу вэ?', answer: 'Invisalign нь харагдахгүй, авч хийж болдог. Металл нь нарийн тохиолдолд илүү тохиромжтой.', category: null },
        { id: 3, question: 'Хэдэн насандаа эхлэж болох вэ?', answer: 'Хүүхдүүд 10–12 насандаа эхлэж болно. Насанд хүрэгчдэд насны хязгаар байхгүй.', category: null },
        { id: 4, question: 'Эмчилгээний явцад өвдөх үү?', answer: 'Тохируулалтын дараа 2–3 хоног хөнгөн мэдрэмж гарч болно, хурдан өнгөрдөг.', category: null },
    ];

    return (
        <>
            <Head title="Нүүр хуудас">
                <link rel="preconnect" href="https://fonts.bunny.net"/>
                <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700,800,900" rel="stylesheet"/>
                <style>{`
                    @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-33.333%)} }
                    @keyframes fadeSlideIn { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
                    @keyframes slideInRight { from{opacity:0;transform:translateX(60px) scale(0.97)} to{opacity:1;transform:translateX(0) scale(1)} }
                    @keyframes slideInLeft  { from{opacity:0;transform:translateX(-60px) scale(0.97)} to{opacity:1;transform:translateX(0) scale(1)} }
                    @keyframes slideOutLeft  { from{opacity:1;transform:translateX(0) scale(1)} to{opacity:0;transform:translateX(-60px) scale(0.97)} }
                    @keyframes slideOutRight { from{opacity:1;transform:translateX(0) scale(1)} to{opacity:0;transform:translateX(60px) scale(0.97)} }
                    @keyframes progress { from{width:0%} to{width:100%} }
                    @keyframes modalIn { from{opacity:0;transform:translateY(32px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
                `}</style>
            </Head>

            <PublicLayout>
                <HeroSlideshow doctors={doctors} />
                <CategoryCarousel categories={treatments} />
                <ServicesSection treatments={treatments} />

                {/* DOCTORS */}
                <section className="py-24 bg-[#F9F4F2]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                            <div>
                                <span className="text-red-600 text-xs font-bold tracking-widest uppercase">Эмч нар</span>
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 leading-tight">Мэргэшсэн баг</h2>
                            </div>
                            <Link href="/doctors" className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 flex-shrink-0 group">
                                Бүх эмчийг харах <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                            </Link>
                        </div>

                        {branches.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-7">
                                <button onClick={() => setActiveBranch(null)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${activeBranch===null?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                                    Бүх салбар
                                </button>
                                {branches.map(b => (
                                    <button key={b.id} onClick={() => setActiveBranch(b.id)}
                                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${activeBranch===b.id?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                                        {b.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {(filteredDoctors.length > 0 ? filteredDoctors : [1,2,3,4].map(i => ({
                                id: i, name: `Эмч ${i}`, specialization: 'Гажиг засалч', degree: null,
                                experience_years: 5, description: null, phone: null, email: null,
                                experiences: null, photo_url: null, branch_name: null, branch_id: null,
                            } as Doctor))).map(doc => (
                                <button key={doc.id} onClick={() => setSelectedDoctor(doc)}
                                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all group text-left">
                                    <div className="aspect-[3/4] bg-gradient-to-br from-rose-50 to-red-100 overflow-hidden relative">
                                        {doc.photo_url
                                            ? <img src={doc.photo_url} alt={doc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                            : <div className="w-full h-full flex items-center justify-center">
                                                <div className="w-20 h-20 bg-red-200 rounded-full flex items-center justify-center">
                                                    <span className="text-red-700 font-black text-3xl">{doc.name.charAt(0)}</span>
                                                </div>
                                              </div>
                                        }
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                            <span className="text-white text-xs font-bold bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                                                Дэлгэрэнгүй харах →
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-gray-900 text-sm group-hover:text-red-700 transition-colors">{doc.name}</h3>
                                        <p className="text-red-600 text-xs font-semibold mt-0.5">{doc.specialization ?? 'Шүдний эмч'}</p>
                                        {doc.experience_years && <p className="text-gray-400 text-xs mt-1">{doc.experience_years} жилийн туршлага</p>}
                                        {doc.branch_name && (
                                            <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                                                <MapPin className="w-3 h-3"/>{doc.branch_name}
                                            </div>
                                        )}
                                        <div className="mt-3 pt-2.5 border-t border-gray-50 flex items-center gap-1.5 text-xs font-semibold text-red-500">
                                            <Calendar className="w-3.5 h-3.5"/> Цаг захиалах
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Doctor Modal */}
                {selectedDoctor && (
                    <DoctorModal doctor={selectedDoctor} onClose={() => setSelectedDoctor(null)} />
                )}

                {/* Article Modal */}
                {selectedArticle && (
                    <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
                )}

                {/* GALLERY */}
                <section className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                            <div>
                                <span className="text-red-600 text-xs font-bold tracking-widest uppercase">Үр дүн</span>
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Өмнө ба дараа нь</h2>
                            </div>
                            <Link href="/gallery" className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 flex-shrink-0 group">
                                Бүгдийг харах <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                            </Link>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {(gallery.length > 0 ? gallery.slice(0,4) : [1,2,3,4] as any[]).map((item: any, i: number) =>
                                typeof item === 'object' && 'before_url' in item
                                    ? <GalleryCard key={item.id} item={item}/>
                                    : <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
                                        <div className="aspect-[4/3] bg-rose-50 flex items-center justify-center"><Smile className="w-12 h-12 text-red-200"/></div>
                                        <div className="p-4"><p className="font-semibold text-gray-700 text-sm">Засалтын үр дүн #{i+1}</p><p className="text-red-500 text-xs mt-0.5">Invisalign</p></div>
                                      </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ARTICLES */}
                <section className="py-24 bg-[#F9F4F2]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                            <div>
                                <span className="text-red-600 text-xs font-bold tracking-widest uppercase">Мэдээ</span>
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Сүүлийн үеийн мэдээ</h2>
                            </div>
                            <Link href="/articles" className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 flex-shrink-0 group">
                                Бүгдийг харах <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                            </Link>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(articles.length > 0 ? articles.slice(0,3) : [
                                { id:1, title:'Invisalign гэж юу вэ?', excerpt:'Орчин үеийн харагдахгүй тэгшлэгч систем.', category:'Эмчилгээ', featured_image:null, published_at:'2024.12.01', slug:'' },
                                { id:2, title:'Брекет тавиулсны дараа арчлалт', excerpt:'Шүдний цэвэрлэгээ, хоолны дэглэм.', category:'Зөвлөгөө', featured_image:null, published_at:'2024.11.15', slug:'' },
                                { id:3, title:'Хүүхдийн шүдний эрүүл мэнд', excerpt:'Сүү шүдний арчлалт.', category:'Урьдчилан сэргийлэлт', featured_image:null, published_at:'2024.11.01', slug:'' },
                            ] as Article[]).map(a => (
                                <button key={a.id} onClick={() => setSelectedArticle(a)}
                                    className="text-left bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-red-200 hover:shadow-md transition-all group w-full">
                                    <div className="aspect-[16/9] bg-rose-50 overflow-hidden">
                                        {a.featured_image
                                            ? <img src={a.featured_image} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                            : <div className="w-full h-full flex items-center justify-center"><Smile className="w-10 h-10 text-red-200"/></div>
                                        }
                                    </div>
                                    <div className="p-5">
                                        {a.category && <span className="inline-block bg-red-50 text-red-600 text-[11px] font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wide">{a.category}</span>}
                                        <h3 className="font-bold text-gray-900 mb-2 leading-snug line-clamp-2 group-hover:text-red-700 transition-colors">{a.title}</h3>
                                        {a.excerpt && <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed mb-4">{a.excerpt}</p>}
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                            {a.published_at && <span className="text-gray-400 text-xs">{a.published_at}</span>}
                                            <span className="text-red-600 text-sm font-semibold flex items-center gap-1 ml-auto">Унших <ArrowRight className="w-3.5 h-3.5"/></span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="py-24 bg-white">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="mb-10">
                            <span className="text-red-600 text-xs font-bold tracking-widest uppercase">Асуулт & Хариулт</span>
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Түгээмэл асуултууд</h2>
                        </div>
                        <div className="flex flex-col gap-3">
                            {(faqs.length > 0 ? faqs : defaultFaqs).map(f => <FaqItem key={f.id} faq={f}/>)}
                        </div>
                    </div>
                </section>

                {/* BOOKING CTA */}
                <section className="py-20 bg-[#16100A] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.04]"
                        style={{ backgroundImage:'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize:'28px 28px' }}/>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-red-900/20 rounded-full blur-3xl pointer-events-none"/>
                    <div className="relative max-w-2xl mx-auto px-4 text-center">
                        <span className="text-red-400 text-xs font-bold uppercase tracking-widest">Цаг захиалах</span>
                        <h2 className="text-4xl md:text-5xl font-black text-white mt-4 mb-5 leading-tight">Өнөөдөр эхлэх цаг болжээ</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed">Үнэгүй зөвлөгөө авч, хувийн засалтын төлөвлөгөөгөө боловсруул.</p>
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
