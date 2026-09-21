import { Head, Link } from '@inertiajs/react';
import { useState, useEffect, type CSSProperties } from 'react';
import { Bleed, SectionHead, SplitText, useMotionRoot } from '@/components/public/motion';
import PageHeroBig from '@/components/public/page-hero-big';
import PublicLayout from '@/layouts/public-layout';
import { Calendar, X, Check, Image as ImageIcon } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */
interface SubTreatment {
    id: number; title: string; description: string | null;
    price_min: number | null; price_max: number | null; duration_min: number | null;
}
interface Treatment {
    id: number; title: string; description: string | null;
    price_min: number | null; price_max: number | null; duration_min: number | null;
    image_url: string | null; sub_treatments: SubTreatment[];
}
interface TreatmentCategory { id: number; name: string; icon: string | null; treatments: Treatment[] }
interface PageProps { treatments: TreatmentCategory[] }

const d = (i: number, step = 80): CSSProperties => ({ '--d': `${i * step}ms` } as CSSProperties);

function priceLabel(min: number | null, max: number | null): string | null {
    if (!min && !max) return null;
    const f = (n: number) => `${Number(n).toLocaleString()}₮`;
    if (min && max) return `${f(min)}–${f(max)}`;
    return f((min || max)!);
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL — эмчилгээний дэлгэрэнгүй
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

function TreatmentModal({ treatment, catName, onClose }: { treatment: Treatment; catName: string; onClose: () => void }) {
    const price = priceLabel(treatment.price_min, treatment.price_max);
    const bookingUrl = `/booking?service=${encodeURIComponent(treatment.title)}`;
    const includes = ['Мэргэжлийн үзлэг', 'Эмчилгээний төлөвлөгөө', 'Дараагийн үзлэгийн зөвлөгөө'];

    return (
        <Modal onClose={onClose}>
            <div className="cw-modal-img">
                {treatment.image_url
                    ? <img src={treatment.image_url} alt={treatment.title} />
                    : <div className="cw-ph"><ImageIcon className="h-8 w-8 opacity-50" /></div>}
                <button onClick={onClose} className="cw-modal-x" aria-label="Хаах"><X className="h-4 w-4" /></button>
                <span className="cw-modal-cat">{catName}</span>
            </div>

            <div className="cw-modal-body">
                <div className="mb-5 flex items-start justify-between gap-6">
                    <h2>{treatment.title}</h2>
                    {price && (
                        <div className="flex-none text-right">
                            <p className="mb-1 text-[10.5px] font-semibold tracking-[.16em] text-[#74787e]">ҮНЭ</p>
                            <p className="text-[17px] font-semibold tracking-[-.02em] text-[#c81e3a]">{price}</p>
                        </div>
                    )}
                </div>

                {treatment.duration_min && (
                    <p className="mb-4 text-[13px] text-[#74787e]">Үргэлжлэх хугацаа ~{treatment.duration_min} мин</p>
                )}
                {treatment.description && <p className="mb-6 text-[14.5px] leading-[1.72] text-[#26282c]">{treatment.description}</p>}

                {treatment.sub_treatments.length > 0 && (
                    <div className="mb-6">
                        <p className="cw-modal-h">Дэд төрлүүд</p>
                        {treatment.sub_treatments.map((s) => {
                            const sp = priceLabel(s.price_min, s.price_max);
                            return (
                                <div key={s.id} className="cw-modal-row">
                                    <div>
                                        <p className="text-[14px] font-medium">{s.title}</p>
                                        {s.description && <p className="mt-1 text-[12.5px] leading-[1.6] text-[#74787e]">{s.description}</p>}
                                    </div>
                                    {sp && <span className="flex-none text-[14px] font-semibold text-[#c81e3a]">{sp}</span>}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mb-7">
                    <p className="cw-modal-h">Багтсан үйлчилгээ</p>
                    {includes.map((item) => (
                        <div key={item} className="flex items-center gap-3 py-2 text-[14px] text-[#26282c]">
                            <Check className="h-4 w-4 flex-none text-[#c81e3a]" />{item}
                        </div>
                    ))}
                </div>

                <Link href={bookingUrl} className="cw-btn cw-btn-ink w-full">
                    <Calendar className="h-[18px] w-[18px]" /> Эмч дээр цаг захиалах
                </Link>
            </div>
        </Modal>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
const STEPS = [
    { n: '01', t: 'Цаг захиалах', d: 'Онлайнаар эсвэл утсаар өөрт тохирох цагаа сонгоно.' },
    { n: '02', t: 'Үзлэг, оношилгоо', d: 'Эмч амны хөндийг шалгаж, шаардлагатай оношилгоо хийнэ.' },
    { n: '03', t: 'Төлөвлөгөө', d: 'Тохирох эмчилгээний төлөвлөгөө, төсвийг тодорхой танилцуулна.' },
    { n: '04', t: 'Эмчилгээ, хяналт', d: 'Эмчилгээ хийж, дараа нь үр дүнг тогтмол хянана.' },
];

export default function ServicesPage({ treatments = [] }: PageProps) {
    useMotionRoot();

    const fallback: TreatmentCategory[] = [
        { id: 1, name: 'Гажиг засал', icon: null, treatments: [
            { id: 1, title: 'Invisalign', description: 'Харагдахгүй, авч хийж болдог шилэн тэгшлэгч систем.', price_min: 1500000, price_max: 3000000, duration_min: 60, image_url: null, sub_treatments: [] },
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

    const [activeCat, setActiveCat] = useState<number | null>(null);
    const [selected, setSelected] = useState<{ t: Treatment; cat: string } | null>(null);

    const allTreatments = source.flatMap((c) => c.treatments.map((t) => ({ t, catName: c.name, catId: c.id })));
    const shown = activeCat === null ? allTreatments : allTreatments.filter((x) => x.catId === activeCat);

    return (
        <PublicLayout heroOverlay editorial>
            <Head title="Эмчилгээ үйлчилгээ — Кутикул" />

            <PageHeroBig
                figure="arch"
                alt="Тунгалаг аппарат зүүж буй үйлчлүүлэгч"
                ghost="SERVICES"
                eyebrow="ЭМЧИЛГЭЭ ҮЙЛЧИЛГЭЭ"
                title={['Бүх төрлийн', 'шүдний эмчилгээ']}
                mn="Энгийн үзлэгээс имплант хүртэл нэг дороос"
                lead="Гажиг засал, имплант, цайруулалт, хүүхдийн эмчилгээ — танд ямар ч үед хэрэгтэй болж болох эмчилгээг найдвартай аваарай."
                stats={[
                    { num: '20', unit: '+', label: 'Эмчилгээний төрөл' },
                    { num: '3', unit: 'алхам', label: 'Онош хүртэл' },
                    { num: '10', unit: '+ жил', label: 'Салбарын туршлага' },
                ]}
                marks={{
                    d1: { x: 44, y: 56 }, path1: 'M44 56 L 30 87 L 22 87', chip1: 'Өвдөлтгүй, зөөлөн',
                    d2: { x: 58, y: 38 }, path2: 'M58 38 L 80 17 L 98 17', chip2: 'Дижитал оношилгоо',
                }}
                cta={[
                    { label: 'Цаг захиалах', href: '/booking', primary: true },
                    { label: 'Утсаар холбогдох', href: '/contact' },
                ]}
            />

            {/* ── ҮЙЛЧИЛГЭЭНҮҮД ────────────────────────────────────────────── */}
            <section className="cw-sec">
                <div className="cw-tabs" data-reveal="fade">
                    <button type="button" aria-pressed={activeCat === null} onClick={() => setActiveCat(null)}>Бүгд</button>
                    {source.map((c) => (
                        <button key={c.id} type="button" aria-pressed={c.id === activeCat} onClick={() => setActiveCat(c.id)}>{c.name}</button>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                    {shown.map(({ t, catName }, i) => {
                        const meta = t.duration_min ? `~${t.duration_min} мин` : priceLabel(t.price_min, t.price_max) || 'Зөвлөгөөтэй';
                        return (
                            <button
                                key={`${catName}-${t.id}`}
                                type="button"
                                onClick={() => setSelected({ t, cat: catName })}
                                className="cw-card text-left"
                                data-reveal="up"
                                style={d(i % 4, 80)}
                            >
                                <div className="cw-card-img aspect-[16/11]">
                                    {t.image_url
                                        ? <img src={t.image_url} alt={t.title} loading="lazy" />
                                        : <div className="cw-ph"><ImageIcon className="h-6 w-6 opacity-50" /></div>}
                                    <span className="cw-card-tag">{catName}</span>
                                </div>
                                <div className="cw-card-body">
                                    <h3>{t.title}</h3>
                                    {t.description && <p className="mb-3 line-clamp-2 text-[13px] leading-[1.6] text-[#74787e]">{t.description}</p>}
                                    <div className="cw-card-meta border-t border-[#eceef0] pt-3">
                                        <span>{meta}</span><b>→</b>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* ── ЭМЧИЛГЭЭНИЙ ЯВЦ ──────────────────────────────────────────── */}
            <section className="cw-sec">
                <SectionHead eyebrow="Эмчилгээний явц" title="Хэрхэн явагддаг вэ" />
                <div className="cw-steps">
                    <div className="cw-steps-line" data-reveal="line" />
                    {STEPS.map((st, i) => (
                        <div key={st.n} className="cw-step" data-reveal="up" style={d(i, 130)}>
                            <u>{st.n}</u>
                            <h3>{st.t}</h3>
                            <p>{st.d}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ──────────────────────────────────────────────────────── */}
            <section className="cw-sec">
                <Bleed tone="red">
                    <div className="cw-cta">
                        <div>
                            <p className="cw-eyebrow" data-reveal="fade"><i />Зөвлөгөө</p>
                            <h2 data-reveal="words"><SplitText text="Аль эмчилгээ танд тохирохыг эмч тодорхойлно" accent /></h2>
                            <p data-reveal="up" style={d(1, 140)}>Анхны үзлэгээр эмч таны амны хөндийг шалгаж, тохирох эмчилгээний төлөвлөгөө гаргаж өгнө.</p>
                        </div>
                        <Link href="/booking" className="cw-btn cw-btn-w" data-reveal="up" style={d(2, 140)}>
                            Цаг захиалах<span>→</span>
                        </Link>
                    </div>
                </Bleed>
            </section>

            {selected && <TreatmentModal treatment={selected.t} catName={selected.cat} onClose={() => setSelected(null)} />}
        </PublicLayout>
    );
}
