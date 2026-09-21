import { Head, Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import { Bleed, Counter, SectionHead, SplitText, useMotionRoot } from '@/components/public/motion';
import PageHeroBig from '@/components/public/page-hero-big';
import PublicLayout from '@/layouts/public-layout';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES — backend-ээс ирэх жинхэнэ өгөгдөл (about() нь зөвхөн stats дамжуулна)
   ═══════════════════════════════════════════════════════════════════════════ */
interface Branch { id: number; name: string; address: string | null; phone: string | null; image_url?: string | null }
interface PageProps {
    stats: { doctors: number; appointments: number; branches: number };
    branches: Branch[];
}

/* stagger */
const d = (i: number, step = 90): CSSProperties => ({ '--d': `${i * step}ms` } as CSSProperties);

const VALUES = [
    { n: '01', title: 'Мэргэжлийн хамт олон', text: 'Бид салбартаа тэргүүлэх чадвартай, олон жилийн туршлагатай эмч нартай.' },
    { n: '02', title: 'Орчин үеийн технологи', text: 'Сүүлийн үеийн дэвшилтэт техник, тоног төхөөрөмж ашиглан таныг эмчилнэ.' },
    { n: '03', title: 'Хүнлэг харьцаа', text: 'Өвчтөн бүртэй хүндэтгэлтэй, тэвчээртэй, айдасгүй орчинд харьцана.' },
];

/* backend салбар хоосон үед л харагдах нөөц жагсаалт */
const FALLBACK_BRANCHES: Branch[] = [
    { id: -1, name: 'Сансар салбар', address: 'БЗД, Сансар, Их дэлгүүрийн зүүн талд', phone: '+976 7700 8899' },
    { id: -2, name: 'Хороолол салбар', address: 'СБД, 1-р хороолол, 32-ын тойрон', phone: '+976 7701 8899' },
    { id: -3, name: 'Цамбагарав салбар', address: 'СХД, Цамбагарав зам дагуу', phone: '+976 7702 8899' },
    { id: -4, name: 'Яармаг салбар', address: 'ХУД, Яармаг, шинэ замын эхэнд', phone: '+976 7703 8899' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function About({ stats = { doctors: 0, appointments: 0, branches: 0 }, branches = [] }: PageProps) {
    useMotionRoot();

    /* жинхэнэ салбар — байхгүй үед л нөөц жагсаалт */
    const branchList = branches.length > 0 ? branches : FALLBACK_BRANCHES;
    const nDoctors = stats.doctors > 0 ? stats.doctors : 25;
    const nBranches = stats.branches > 0 ? stats.branches : 4;

    return (
        <PublicLayout heroOverlay editorial>
            <Head title="Бидний тухай — Кутикул" />

            <PageHeroBig
                figure="tooth"
                alt="Инээмсэглэж буй үйлчлүүлэгч"
                ghost="ABOUT"
                eyebrow="БИДНИЙ ТУХАЙ"
                title={['Инээмсэглэл', 'бүрийн төлөө']}
                mn="2012 оноос хойш тасралтгүй үйл ажиллагаатай"
                lead="«Кутикул» эрүү, нүүр ам, гажиг, согог заслын шүдний эмнэлэг. Таны инээмсэглэл бол биднийг өдөр бүр урамшуулдаг зүйл."
                stats={[
                    { num: '10', unit: '+ жил', label: 'Тасралтгүй үйл ажиллагаа' },
                    { num: '4', unit: 'салбар', label: 'Танд ойрхон байршил' },
                    { num: '25', unit: '+ эмч', label: 'Мэргэшсэн баг' },
                ]}
                marks={{
                    d1: { x: 46, y: 54 }, path1: 'M46 54 L 30 87 L 22 87', chip1: 'Хүнлэг харьцаа',
                    d2: { x: 58, y: 40 }, path2: 'M58 40 L 80 17 L 98 17', chip2: 'Орчин үеийн технологи',
                }}
                cta={[
                    { label: 'Цаг захиалах', href: '/booking', primary: true },
                    { label: 'Эмч нартай танилцах', href: '/doctors' },
                ]}
            />

            {/* ── ҮНЭТ ЗҮЙЛ ────────────────────────────────────────────────── */}
            <section className="cw-sec">
                <SectionHead eyebrow="Бидний үнэт зүйл" title="Биднийг тодотгох зүйлс" />
                <div className="cw-feat">
                    {VALUES.map((v, i) => (
                        <div key={v.n} data-reveal="up" style={d(i, 100)}>
                            <u>{v.n}</u>
                            <h3>{v.title}</h3>
                            <p>{v.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── ТООН ҮЗҮҮЛЭЛТ (хар самбар) ───────────────────────────────── */}
            <section className="cw-sec">
                <Bleed tone="ink" parallax={48}>
                    <div className="cw-nums">
                        <div data-reveal="up" style={d(0, 110)}>
                            <b><Counter to={10} /><em>+ жил</em></b>
                            <span>Тасралтгүй үйл ажиллагаа</span>
                        </div>
                        <div data-reveal="up" style={d(1, 110)}>
                            <b><Counter to={nDoctors} /><em>+ эмч</em></b>
                            <span>Мэргэшсэн эмч нарын баг</span>
                        </div>
                        <div data-reveal="up" style={d(2, 110)}>
                            <b><Counter to={nBranches} /><em>салбар</em></b>
                            <span>Танд ойрхон байршил</span>
                        </div>
                    </div>
                </Bleed>
            </section>

            {/* ── САЛБАРУУД ────────────────────────────────────────────────── */}
            <section className="cw-sec">
                <SectionHead eyebrow="Салбарууд" title="Танд ойрхон салбар" href="/contact" linkLabel="Байршил харах" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
                    {branchList.map((b, i) => (
                        <div key={b.id} className="cw-card" data-reveal="up" style={d(i % 4, 80)}>
                            <div className="cw-card-img aspect-[4/3]">
                                {b.image_url
                                    ? <img src={b.image_url} alt={b.name} loading="lazy" />
                                    : <div className="cw-ph">салбарын зураг</div>}
                            </div>
                            <div className="cw-card-body">
                                <h3>{b.name}</h3>
                                {b.address && <p className="mb-1.5 text-[13px] leading-[1.6] text-[#74787e]">{b.address}</p>}
                                {b.phone && <a href={`tel:${b.phone}`} className="text-[13.5px] font-semibold text-[#c81e3a]">{b.phone}</a>}
                            </div>
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
                            <h2 data-reveal="words"><SplitText text="Эрүүл инээмсэглэлээ бидэнд даатгаарай" accent /></h2>
                            <p data-reveal="up" style={d(1, 140)}>Анхны үзлэгийн цагаа онлайнаар захиалж, манай мэргэжлийн багтай танилцаарай.</p>
                        </div>
                        <Link href="/booking" className="cw-btn cw-btn-w" data-reveal="up" style={d(2, 140)}>
                            Цаг захиалах<span>→</span>
                        </Link>
                    </div>
                </Bleed>
            </section>
        </PublicLayout>
    );
}
