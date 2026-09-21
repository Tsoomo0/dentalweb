import { Head, Link } from '@inertiajs/react';
import { useState, useEffect, type CSSProperties } from 'react';
import { Bleed, Counter, SectionHead, SplitText, useMotionRoot } from '@/components/public/motion';
import PageHeroBig from '@/components/public/page-hero-big';
import PublicLayout from '@/layouts/public-layout';
import { shortDoctorName } from '@/lib/utils';
import { Calendar, X, Phone, Mail } from 'lucide-react';

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

const d = (i: number, step = 80): CSSProperties => ({ '--d': `${i * step}ms` } as CSSProperties);

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL — эмчийн дэлгэрэнгүй
   ═══════════════════════════════════════════════════════════════════════════ */
function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
    }, [onClose]);

    return (
        <div className="cw-modal-wrap" onClick={onClose} role="dialog" aria-modal="true">
            <div className="cw-modal-bd" />
            <div className="cw-modal" onClick={(e) => e.stopPropagation()}>{children}</div>
        </div>
    );
}

function DoctorModal({ doctor, onClose }: { doctor: Doctor; onClose: () => void }) {
    const bookingUrl = `/booking?doctor_id=${doctor.id}`;
    const experiences = Array.isArray(doctor.experiences) ? doctor.experiences : [];

    return (
        <Modal onClose={onClose}>
            <div className="cw-dm-head">
                <button onClick={onClose} className="cw-modal-x" aria-label="Хаах"><X className="h-4 w-4" /></button>
                <div className="cw-dm-photo">
                    {doctor.photo_url
                        ? <img src={doctor.photo_url} alt={doctor.name} />
                        : <div className="cw-ph">{doctor.name.trim().charAt(0)}</div>}
                </div>
                <div>
                    <p className="cw-dm-spec">{doctor.specialization ?? 'Шүдний эмч'}</p>
                    <h2>{shortDoctorName(doctor.name)}</h2>
                    <div className="cw-dm-chips">
                        {doctor.experience_years != null && <span>{doctor.experience_years} жил туршлага</span>}
                        {doctor.branch_name && <span>{doctor.branch_name}</span>}
                    </div>
                </div>
            </div>

            <div className="cw-modal-body">
                {doctor.degree && (
                    <div className="mb-6">
                        <p className="cw-modal-h">Боловсрол</p>
                        <p className="text-[14.5px] font-medium">{doctor.degree}</p>
                    </div>
                )}

                {doctor.description && <p className="mb-7 text-[14.5px] leading-[1.72] text-[#26282c]">{doctor.description}</p>}

                {experiences.length > 0 && (
                    <div className="mb-7">
                        <p className="cw-modal-h">Ажлын туршлага</p>
                        <div className="cw-tl">
                            {experiences.map((exp, i) => (
                                <div key={i} className="cw-tl-item">
                                    {exp.year && <u>{exp.year}</u>}
                                    <p className="text-[14px] font-medium">{exp.title}</p>
                                    {exp.institution && <p className="mt-1 text-[12.5px] text-[#74787e]">{exp.institution}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(doctor.phone || doctor.email) && (
                    <div className="mb-7 flex flex-wrap gap-2.5">
                        {doctor.phone && (
                            <a href={`tel:${doctor.phone}`} className="cw-btn cw-btn-o cw-btn-sm">
                                <Phone className="h-4 w-4 text-[#c81e3a]" />{doctor.phone}
                            </a>
                        )}
                        {doctor.email && (
                            <a href={`mailto:${doctor.email}`} className="cw-btn cw-btn-o cw-btn-sm">
                                <Mail className="h-4 w-4 text-[#c81e3a]" />{doctor.email}
                            </a>
                        )}
                    </div>
                )}

                <Link href={bookingUrl} className="cw-btn cw-btn-ink w-full">
                    <Calendar className="h-[18px] w-[18px]" /> Цаг захиалах
                </Link>
            </div>
        </Modal>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
const HIGHLIGHTS = [
    { n: '01', title: 'Нарийн мэргэшил', text: 'Чиглэл тус бүрд тусгайлан мэргэшсэн эмч нар.' },
    { n: '02', title: 'Тасралтгүй сургалт', text: 'Гадаад дотоодын сургалтад тогтмол хамрагддаг.' },
    { n: '03', title: 'Найрсаг хандлага', text: 'Айдасгүй, тайван орчинд тэвчээртэй харьцана.' },
    { n: '04', title: 'Багийн хамтын ажиллагаа', text: 'Нийлмэл тохиолдолд эмч нар хамтран шийднэ.' },
];

export default function Doctors({ doctors = [], branches = [] }: PageProps) {
    useMotionRoot();

    /* fallback (хоосон үед дизайн эвдрэхгүйн тулд) */
    const fallbackDoctors: Doctor[] = [
        { id: 1, name: 'Б. Нарантуяа', specialization: 'Гажиг заслын эмч', degree: 'Стоматологийн ухааны доктор (DDS)', experience_years: 12, description: 'Invisalign болон орчин үеийн гажиг засалтын аргуудаар мэргэшсэн туршлагатай эмч.', phone: null, email: null, experiences: [{ year: '2023', title: 'Cuticul Dental — Ахлах эмч', institution: 'Улаанбаатар' }], photo_url: null, branch_name: 'Сансар салбар', branch_id: 1 },
        { id: 2, name: 'Д. Эрдэнэбаяр', specialization: 'Имплантологи', degree: 'Стоматологийн мастер (MDS)', experience_years: 8, description: 'Имплант суулгалт болон хүнд тохиолдлын мэс заслын чиглэлд мэргэшсэн.', phone: null, email: null, experiences: [], photo_url: null, branch_name: 'Хороолол салбар', branch_id: 2 },
        { id: 3, name: 'С. Уянга', specialization: 'Эстетик шүд судлал', degree: 'Стоматологийн бакалавр (BDS)', experience_years: 6, description: 'Венер, цайруулалт болон гоо үзэмжтэй холбоотой эмчилгээнд мэргэшсэн.', phone: null, email: null, experiences: [], photo_url: null, branch_name: 'Сансар салбар', branch_id: 1 },
        { id: 4, name: 'Ж. Болормаа', specialization: 'Хүүхдийн шүдний эмч', degree: 'Педодонтистийн зэрэг', experience_years: 5, description: 'Хүүхдийн насанд тохирсон аятайхан, айдасгүй орчинд эмчилгээ хийдэг.', phone: null, email: null, experiences: [], photo_url: null, branch_name: 'Цамбагарав салбар', branch_id: 3 },
    ];

    const source = doctors.length > 0 ? doctors : fallbackDoctors;

    const [activeBranch, setActiveBranch] = useState<number | null>(null);
    const [selected, setSelected] = useState<Doctor | null>(null);

    const shown = activeBranch === null ? source : source.filter((doc) => doc.branch_id === activeBranch);

    return (
        <PublicLayout heroOverlay editorial>
            <Head title="Эмч нар — Кутикул" />

            <PageHeroBig
                figure="rings"
                alt="Брекет зүүсэн үйлчлүүлэгч"
                ghost="DOCTORS"
                eyebrow="ЭМЧ НАР"
                title={['Мэргэжлийн', 'хамт олон']}
                mn="Чиглэл тус бүрд мэргэшсэн эмч нар"
                lead="Манай эмч нар салбартаа олон жил мэргэшсэн, тасралтгүй суралцаж, өвчтөн бүртэй найрсаг харьцдаг."
                stats={[
                    { num: '8', unit: '+ эмч', label: 'Мэргэжлийн баг' },
                    { num: '10', unit: '+ жил', label: 'Дундаж туршлага' },
                    { num: '4', unit: 'салбар', label: 'Ойрхон байршил' },
                ]}
                marks={{
                    d1: { x: 44, y: 58 }, path1: 'M44 58 L 30 87 L 22 87', chip1: 'Нарийн мэргэшил',
                    d2: { x: 58, y: 38 }, path2: 'M58 38 L 80 17 L 98 17', chip2: 'Тасралтгүй сургалт',
                }}
                cta={[
                    { label: 'Цаг захиалах', href: '/booking', primary: true },
                    { label: 'Бидний тухай', href: '/about' },
                ]}
            />

            {/* ── ТООН ҮЗҮҮЛЭЛТ ────────────────────────────────────────────── */}
            <section className="cw-sec-tight">
                <Bleed tone="ink" parallax={48}>
                    <div className="cw-nums">
                        <div data-reveal="up" style={d(0, 110)}>
                            <b><Counter to={source.length} /><em>+ эмч</em></b>
                            <span>Мэргэжлийн эмч нарын баг</span>
                        </div>
                        <div data-reveal="up" style={d(1, 110)}>
                            <b><Counter to={10} /><em>+ жил</em></b>
                            <span>Дундаж салбарын туршлага</span>
                        </div>
                        <div data-reveal="up" style={d(2, 110)}>
                            <b><Counter to={Math.max(branches.length, 1)} /><em>салбар</em></b>
                            <span>Танд ойрхон байршил</span>
                        </div>
                    </div>
                </Bleed>
            </section>

            {/* ── ЭМЧ НАР ──────────────────────────────────────────────────── */}
            <section className="cw-sec">
                {branches.length > 0 && (
                    <div className="cw-tabs" data-reveal="fade">
                        <button type="button" aria-pressed={activeBranch === null} onClick={() => setActiveBranch(null)}>Бүгд</button>
                        {branches.map((b) => (
                            <button key={b.id} type="button" aria-pressed={b.id === activeBranch} onClick={() => setActiveBranch(b.id)}>{b.name}</button>
                        ))}
                    </div>
                )}

                {shown.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                        {shown.map((doc, i) => (
                            <button
                                key={doc.id}
                                type="button"
                                onClick={() => setSelected(doc)}
                                className="cw-card text-left"
                                data-reveal="up"
                                style={d(i % 4, 80)}
                            >
                                <div className="cw-card-img aspect-square">
                                    {doc.photo_url
                                        ? <img src={doc.photo_url} alt={doc.name} loading="lazy" />
                                        : <div className="cw-ph">эмчийн зураг</div>}
                                    {doc.branch_name && <span className="cw-card-tag">{doc.branch_name}</span>}
                                </div>
                                <div className="cw-card-body">
                                    <h3>{shortDoctorName(doc.name)}</h3>
                                    <p className="mb-3 text-[12.5px] font-medium text-[#c81e3a]">{doc.specialization || 'Шүдний эмч'}</p>
                                    <div className="cw-card-meta border-t border-[#eceef0] pt-3">
                                        <span>{doc.experience_years != null ? `${doc.experience_years} жил туршлага` : 'Дэлгэрэнгүй'}</span><b>→</b>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="cw-empty">Энэ салбарт эмч бүртгэлгүй байна.</p>
                )}
            </section>

            {/* ── ЯАГААД БИД ───────────────────────────────────────────────── */}
            <section className="cw-sec">
                <SectionHead
                    eyebrow="Яагаад бид гэж?"
                    title="Мэргэшсэн, нэгдмэл хамт олон"
                    lead="Манай баг зөвхөн ерөнхий эмчилгээ бус — имплант, гажиг засал, хүүхдийн эмчилгээ зэрэг тус бүрийн нарийн мэргэжлийн эмчтэй. Танд хамгийн тохирох мэргэжилтэн оношоо тавьж эмчилнэ."
                />
                <div className="cw-feat cw-feat-4">
                    {HIGHLIGHTS.map((h, i) => (
                        <div key={h.n} data-reveal="up" style={d(i, 90)}>
                            <u>{h.n}</u>
                            <h3>{h.title}</h3>
                            <p>{h.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ──────────────────────────────────────────────────────── */}
            <section className="cw-sec">
                <Bleed tone="red">
                    <div className="cw-cta">
                        <div>
                            <p className="cw-eyebrow" data-reveal="fade"><i />Цаг авах</p>
                            <h2 data-reveal="words"><SplitText text="Өөрт тохирох эмчээ сонгоорой" accent /></h2>
                            <p data-reveal="up" style={d(1, 140)}>Цагаа онлайнаар захиалж, сонгосон эмчтэйгээ ойрхон салбартаа уулзаарай.</p>
                        </div>
                        <Link href="/booking" className="cw-btn cw-btn-w" data-reveal="up" style={d(2, 140)}>
                            Цаг захиалах<span>→</span>
                        </Link>
                    </div>
                </Bleed>
            </section>

            {selected && <DoctorModal doctor={selected} onClose={() => setSelected(null)} />}
        </PublicLayout>
    );
}
