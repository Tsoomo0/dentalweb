import { Head, Link } from '@inertiajs/react';
import { useState, useEffect, type CSSProperties } from 'react';
import PublicLayout from '@/layouts/public-layout';
import { MapPin, Award, Calendar, X, Briefcase, GraduationCap, BadgeCheck, Star, Phone, Mail } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES — backend-ээс ирэх жинхэнэ өгөгдөл
   ═══════════════════════════════════════════════════════════════════════════ */
interface Experience { year?: string; title: string; institution?: string }
interface Doctor {
    id: number; name: string; specialization: string | null; degree: string | null;
    experience_years: number | null; description: string | null;
    phone?: string | null; email?: string | null;
    experiences: Experience[] | null;
    photo_url: string | null; branch_name: string | null; branch_id: number | null;
}
interface Branch { id: number; name: string; address: string | null; phone: string | null }
interface PageProps { doctors: Doctor[]; branches: Branch[] }

/* ═══════════════════════════════════════════════════════════════════════════
   ЖИЖИГ ТУСЛАХ КОМПОНЕНТУУД
   ═══════════════════════════════════════════════════════════════════════════ */
const RED = '#c81e3a';

const glassPanel =
    'rounded-[30px] border border-white/70 bg-white/50 shadow-[0_14px_40px_rgba(120,30,50,0.06)] backdrop-blur-xl';

function SectionBadge({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-4 inline-flex items-center gap-2 rounded-[30px] border border-[#c81e3a]/20 bg-[#c81e3a]/10 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#c81e3a] shadow-[0_8px_20px_rgba(120,30,50,0.1)] backdrop-blur-md">
            <span className="h-[7px] w-[7px] rounded-full bg-[#c81e3a]" />
            {children}
        </div>
    );
}

/* зураггүй эмчийн судалтай орлуулагч */
function PhotoPlaceholder({ label, className = '', style }: { label: string; className?: string; style?: CSSProperties }) {
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
   MODAL — эмчийн дэлгэрэнгүй (хуучин хувилбараас хадгалж, шинэ дизайнд тааруулав)
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
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
            <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[28px]"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                {children}
            </div>
        </div>
    );
}

function DoctorModal({ doctor, onClose }: { doctor: Doctor; onClose: () => void }) {
    const bookingUrl = `/booking?doctor_id=${doctor.id}`;
    const experiences = Array.isArray(doctor.experiences) ? doctor.experiences : [];

    return (
        <Modal open onClose={onClose}>
            {/* Glass-red header */}
            <div className="relative overflow-hidden rounded-t-[28px]" style={{ background: 'linear-gradient(150deg,#c81e3a,#9e1730)' }}>
                <div className="absolute left-[-60px] top-[-80px] h-[260px] w-[260px] rounded-full border border-dashed border-white/20" style={{ animation: 'cuticulSpinSlow 44s linear infinite' }} />
                <div className="absolute right-[-40px] top-[-40px] h-[200px] w-[200px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(255,255,255,.18),transparent 66%)' }} />
                <button onClick={onClose}
                    className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/35">
                    <X className="h-4 w-4" />
                </button>
                <div className="relative flex items-end gap-5 p-7">
                    {/* Photo */}
                    <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white/40 bg-white/10">
                        {doctor.photo_url
                            ? <img src={doctor.photo_url} alt={doctor.name} className="h-full w-full object-cover" />
                            : <PhotoPlaceholder label={doctor.name.trim().charAt(0)} className="h-full w-full font-onest !text-[34px] !font-extrabold !text-white" style={{ background: 'rgba(255,255,255,.12)' }} />}
                    </div>
                    {/* Info */}
                    <div className="pb-1">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/85">{doctor.specialization ?? 'Шүдний эмч'}</p>
                        <h2 className="mb-2 font-onest text-[24px] font-extrabold text-white">{doctor.name}</h2>
                        <div className="flex flex-wrap gap-2">
                            {doctor.experience_years != null && (
                                <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold text-white">
                                    <Award className="h-3.5 w-3.5" /> {doctor.experience_years} жил
                                </span>
                            )}
                            {doctor.branch_name && (
                                <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold text-white">
                                    <MapPin className="h-3.5 w-3.5" /> {doctor.branch_name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-7">
                {doctor.degree && (
                    <div className="mb-5 flex items-center gap-3 rounded-2xl bg-[#faf2f0] p-4">
                        <GraduationCap className="h-5 w-5 flex-shrink-0 text-[#c81e3a]" />
                        <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-[#9a918d]">Боловсрол</p>
                            <p className="text-[14px] font-semibold text-[#1c1a1b]">{doctor.degree}</p>
                        </div>
                    </div>
                )}

                {doctor.description && (
                    <p className="mb-5 text-[14px] leading-relaxed text-[#6b6360]">{doctor.description}</p>
                )}

                {/* Experience timeline */}
                {experiences.length > 0 && (
                    <div className="mb-5">
                        <div className="mb-4 flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-[#c81e3a]" />
                            <h3 className="font-onest text-[15px] font-bold text-[#1c1a1b]">Ажлын туршлага</h3>
                        </div>
                        <div className="relative pl-4">
                            <div className="absolute bottom-0 left-0 top-0 w-px bg-[#f1e3e1]" />
                            <div className="flex flex-col gap-5">
                                {experiences.map((exp, i) => (
                                    <div key={i} className="relative">
                                        <div className="absolute -left-[17px] top-1 h-3 w-3 rounded-full border-2 border-[#c81e3a] bg-white" />
                                        {exp.year && (
                                            <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-[#c81e3a]">{exp.year}</p>
                                        )}
                                        <p className="text-[14px] font-semibold text-[#1c1a1b]">{exp.title}</p>
                                        {exp.institution && (
                                            <p className="mt-0.5 text-[12px] text-[#9a918d]">{exp.institution}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats row */}
                <div className="mb-5 grid grid-cols-3 gap-3">
                    {[
                        { icon: Star, label: 'Туршлага', value: doctor.experience_years != null ? `${doctor.experience_years} жил` : '—' },
                        { icon: BadgeCheck, label: 'Мэргэжил', value: doctor.specialization ?? 'Эмч' },
                        { icon: MapPin, label: 'Салбар', value: doctor.branch_name ?? '—' },
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="rounded-2xl bg-[#faf2f0] p-3.5 text-center">
                            <Icon className="mx-auto mb-1.5 h-4 w-4 text-[#c81e3a]" />
                            <p className="mb-0.5 text-[10px] font-medium text-[#9a918d]">{label}</p>
                            <p className="line-clamp-1 text-[12px] font-bold leading-tight text-[#3a3533]">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Contact (props байвал) */}
                {(doctor.phone || doctor.email) && (
                    <div className="mb-5 flex flex-wrap gap-2.5">
                        {doctor.phone && (
                            <a href={`tel:${doctor.phone}`} className="flex items-center gap-2 rounded-[12px] border border-[#f1e3e1] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#3a3533] transition-colors hover:border-[#f4d4da]">
                                <Phone className="h-4 w-4 text-[#c81e3a]" /> {doctor.phone}
                            </a>
                        )}
                        {doctor.email && (
                            <a href={`mailto:${doctor.email}`} className="flex items-center gap-2 rounded-[12px] border border-[#f1e3e1] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#3a3533] transition-colors hover:border-[#f4d4da]">
                                <Mail className="h-4 w-4 text-[#c81e3a]" /> {doctor.email}
                            </a>
                        )}
                    </div>
                )}

                <Link href={bookingUrl}
                    className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#c81e3a] py-4 text-[16px] font-bold text-white shadow-[0_10px_24px_rgba(200,30,58,0.35)] transition-all hover:bg-[#a91730]">
                    <Calendar className="h-5 w-5" /> Цаг захиалах
                </Link>
            </div>
        </Modal>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
const HIGHLIGHTS = [
    { icon: '✦', title: 'Нарийн мэргэшил', text: 'Чиглэл тус бүрд тусгайлан мэргэшсэн эмч нар.' },
    { icon: '◍', title: 'Тасралтгүй сургалт', text: 'Гадаад дотоодын сургалтад тогтмол хамрагддаг.' },
    { icon: '♡', title: 'Найрсаг хандлага', text: 'Айдасгүй, тайван орчинд тэвчээртэй харьцана.' },
    { icon: '✚', title: 'Багийн хамтын ажиллагаа', text: 'Нийлмэл тохиолдолд эмч нар хамтран шийднэ.' },
];

export default function Doctors({ doctors = [], branches = [] }: PageProps) {
    /* fallback (хоосон үед дизайн эвдрэхгүйн тулд) */
    const fallbackDoctors: Doctor[] = [
        { id: 1, name: 'Б. Нарантуяа', specialization: 'Гажиг заслын эмч', degree: 'Стоматологийн ухааны доктор (DDS)', experience_years: 12, description: 'Invisalign болон орчин үеийн гажиг засалтын аргуудаар мэргэшсэн туршлагатай эмч.', phone: null, email: null, experiences: [{ year: '2023', title: 'Cuticul Dental — Ахлах эмч', institution: 'Улаанбаатар' }], photo_url: null, branch_name: 'Сансар салбар', branch_id: 1 },
        { id: 2, name: 'Д. Эрдэнэбаяр', specialization: 'Имплантологи', degree: 'Стоматологийн мастер (MDS)', experience_years: 8, description: 'Имплант суулгалт болон хүнд тохиолдлын мэс заслын чиглэлд мэргэшсэн.', phone: null, email: null, experiences: [], photo_url: null, branch_name: 'Хороолол салбар', branch_id: 2 },
        { id: 3, name: 'С. Уянга', specialization: 'Эстетик шүд судлал', degree: 'Стоматологийн бакалавр (BDS)', experience_years: 6, description: 'Венер, цайруулалт болон гоо үзэмжтэй холбоотой эмчилгээнд мэргэшсэн.', phone: null, email: null, experiences: [], photo_url: null, branch_name: 'Сансар салбар', branch_id: 1 },
        { id: 4, name: 'Ж. Болормаа', specialization: 'Хүүхдийн шүдний эмч', degree: 'Педодонтистийн зэрэг', experience_years: 5, description: 'Хүүхдийн насанд тохирсон аятайхан, айдасгүй орчинд эмчилгээ хийдэг.', phone: null, email: null, experiences: [], photo_url: null, branch_name: 'Цамбагарав салбар', branch_id: 3 },
    ];

    const source = doctors.length > 0 ? doctors : fallbackDoctors;

    /* ── Салбараар шүүх ── (0 = Бүгд) */
    const [activeBranch, setActiveBranch] = useState<number | null>(null);
    const [selected, setSelected] = useState<Doctor | null>(null);

    const shown = activeBranch === null ? source : source.filter((d) => d.branch_id === activeBranch);

    return (
        <PublicLayout>
            <Head title="Эмч нар — Кутикул">
                <style>{`@keyframes modalIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
            </Head>

            {/* ── HERO ──────────────────────────────────────────────────────── */}
            <div className="relative mt-6 grid items-center gap-9 overflow-hidden rounded-[32px] border border-white/70 bg-white/55 p-8 shadow-[0_18px_50px_rgba(120,30,50,0.08)] backdrop-blur-xl sm:p-12 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                    <SectionBadge>Эмч нар</SectionBadge>
                    <h1 className="mb-4 font-onest text-[34px] font-extrabold leading-[1.08] tracking-tight text-[#1c1a1b] sm:text-[44px]">Мэргэжлийн<br />хамт олон</h1>
                    <p className="mb-7 max-w-[460px] text-[16px] leading-[1.65] text-[#6b6360]">Манай эмч нар салбартаа олон жил мэргэшсэн, тасралтгүй суралцаж, өвчтөн бүртэй найрсаг харьцдаг. Та өөрт тохирох эмч, салбараа сонгон цагаа захиалаарай.</p>
                    <div className="flex flex-wrap items-center gap-7">
                        <div>
                            <div className="font-onest text-[30px] font-extrabold text-[#c81e3a]">{source.length}+</div>
                            <div className="text-[13px] font-medium text-[#9a918d]">мэргэжлийн эмч</div>
                        </div>
                        <div className="h-9 w-px bg-[#ece2e0]" />
                        <div>
                            <div className="font-onest text-[30px] font-extrabold text-[#c81e3a]">10+</div>
                            <div className="text-[13px] font-medium text-[#9a918d]">жилийн туршлага</div>
                        </div>
                        <div className="h-9 w-px bg-[#ece2e0]" />
                        <div>
                            <div className="font-onest text-[30px] font-extrabold text-[#c81e3a]">{Math.max(branches.length, 1)}</div>
                            <div className="text-[13px] font-medium text-[#9a918d]">салбар</div>
                        </div>
                    </div>
                </div>

                {/* Avatar cluster scene */}
                <div className="relative hidden min-h-[300px] items-center justify-center lg:flex">
                    <div className="absolute h-[300px] w-[300px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(246,160,176,.32),transparent 66%)', filter: 'blur(6px)', animation: 'cuticulPulseGlow 6s ease-in-out infinite' }} />
                    <div className="absolute h-[300px] w-[300px] rounded-full border-[1.5px] border-dashed border-[#c81e3a]/20" style={{ animation: 'cuticulSpinSlow 44s linear infinite' }} />
                    <div className="relative h-[300px] w-[300px]">
                        {[
                            { l: 90, t: 18, s: 120, a: 'cuticulFloatyA 7s ease-in-out infinite' },
                            { l: 14, t: 96, s: 104, a: 'cuticulFloatyA 6.4s ease-in-out infinite' },
                            { l: 200, t: 108, s: 96, a: 'cuticulFloatyA 8s ease-in-out infinite' },
                            { l: 84, t: 182, s: 112, a: 'cuticulFloatyA 7.4s ease-in-out infinite' },
                        ].map((p, i) => (
                            <div key={i} className="absolute overflow-hidden rounded-full border-4 border-white shadow-[0_14px_30px_rgba(120,30,50,0.16)]" style={{ left: p.l, top: p.t, width: p.s, height: p.s, animation: p.a }}>
                                <PhotoPlaceholder label="зураг" className="h-full w-full" />
                            </div>
                        ))}
                        <div className="absolute left-1/2 top-1/2 flex h-[54px] w-[54px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#c81e3a] font-onest text-[24px] font-extrabold text-white shadow-[0_8px_20px_rgba(200,30,58,0.4)]">✚</div>
                    </div>
                </div>
            </div>

            {/* ── FILTER + GRID ─────────────────────────────────────────────── */}
            <div className={`mt-7 p-7 sm:p-11 ${glassPanel}`}>
                {branches.length > 0 && (
                    <div className="mb-7 flex flex-wrap gap-2.5">
                        <button onClick={() => setActiveBranch(null)} className="rounded-[40px] border-[1.5px] px-4 py-2 text-[14px] font-semibold transition-all" style={{ borderColor: activeBranch === null ? RED : '#ece6e5', background: activeBranch === null ? RED : 'rgba(255,255,255,.6)', color: activeBranch === null ? '#fff' : '#6b6360' }}>
                            Бүгд
                        </button>
                        {branches.map((b) => {
                            const on = b.id === activeBranch;
                            return (
                                <button key={b.id} onClick={() => setActiveBranch(b.id)} className="rounded-[40px] border-[1.5px] px-4 py-2 text-[14px] font-semibold transition-all" style={{ borderColor: on ? RED : '#ece6e5', background: on ? RED : 'rgba(255,255,255,.6)', color: on ? '#fff' : '#6b6360' }}>
                                    {b.name}
                                </button>
                            );
                        })}
                    </div>
                )}

                {shown.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {shown.map((d) => (
                            <button key={d.id} onClick={() => setSelected(d)}
                                className="group overflow-hidden rounded-[18px] border border-[#f1e8e7] bg-white text-left shadow-[0_1px_2px_rgba(120,30,50,0.04)] transition-all hover:-translate-y-[3px] hover:border-[#f4d4da] hover:shadow-[0_14px_32px_rgba(120,30,50,0.13)]">
                                <div className="relative aspect-square overflow-hidden">
                                    {d.photo_url
                                        ? <img src={d.photo_url} alt={d.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        : <PhotoPlaceholder label="эмчийн зураг" className="h-full w-full" />}
                                    {d.branch_name && (
                                        <div className="absolute left-3 top-3 rounded-[30px] bg-white/92 px-2.5 py-1.5 text-[10px] font-bold text-[#c81e3a] backdrop-blur-sm">{d.branch_name}</div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="mb-0.5 font-onest text-[16px] font-bold tracking-tight">{d.name}</h3>
                                    <div className="mb-2.5 text-[12px] font-semibold text-[#c81e3a]">{d.specialization || 'Шүдний эмч'}</div>
                                    <div className="flex items-center justify-between border-t border-[#f3ebea] pt-3">
                                        <span className="text-[11px] font-medium text-[#9a918d]">{d.experience_years != null ? `${d.experience_years} жил туршлага` : 'Дэлгэрэнгүй'}</span>
                                        <span className="text-[12px] font-bold text-[#c81e3a]">Үзэх →</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center text-[15px] font-medium text-[#9a918d]">Энэ салбарт эмч бүртгэлгүй байна.</div>
                )}
            </div>

            {/* ── TEAM HIGHLIGHTS ───────────────────────────────────────────── */}
            <div className={`mt-7 p-7 sm:p-11 ${glassPanel}`}>
                <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
                    <div>
                        <SectionBadge>Яагаад бид гэж?</SectionBadge>
                        <h2 className="mb-3.5 font-onest text-[28px] font-extrabold leading-[1.16] sm:text-[32px]">Мэргэшсэн, нэгдмэл хамт олон</h2>
                        <p className="text-[15px] leading-[1.7] text-[#6b6360]">Манай баг зөвхөн ерөнхий эмчилгээ бус — имплант, гажиг засал, хүүхдийн эмчилгээ зэрэг тус бүрийн нарийн мэргэжлийн эмчтэй. Танд хамгийн тохирох мэргэжилтэн оношоо тавьж эмчилнэ.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {HIGHLIGHTS.map((h) => (
                            <div key={h.title} className="rounded-[20px] border border-[#f1e8e7] bg-white p-6 shadow-[0_1px_2px_rgba(120,30,50,0.04)]">
                                <div className="mb-3.5 flex h-[46px] w-[46px] items-center justify-center rounded-[13px] font-onest text-[20px] font-bold text-[#c81e3a]" style={{ background: 'linear-gradient(150deg,#fde9ec,#fbd9df)' }}>{h.icon}</div>
                                <h3 className="mb-1.5 font-onest text-[16px] font-bold">{h.title}</h3>
                                <p className="text-[13px] leading-[1.6] text-[#6b6360]">{h.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── CTA ───────────────────────────────────────────────────────── */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-7 rounded-[30px] bg-[#1c1a1b]/95 px-8 py-12 text-white sm:px-12">
                <div>
                    <h2 className="mb-2.5 font-onest text-[26px] font-extrabold leading-[1.15] sm:text-[32px]">Өөрт тохирох эмчээ сонгоорой</h2>
                    <p className="max-w-[480px] text-[15px] leading-[1.6] text-[#b6aeac]">Цагаа онлайнаар захиалж, сонгосон эмчтэйгээ ойрхон салбартаа уулзаарай.</p>
                </div>
                <Link href="/booking" className="whitespace-nowrap rounded-[14px] bg-[#c81e3a] px-7 py-4 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(200,30,58,0.35)]">Цаг захиалах →</Link>
            </div>

            {selected && <DoctorModal doctor={selected} onClose={() => setSelected(null)} />}
        </PublicLayout>
    );
}
