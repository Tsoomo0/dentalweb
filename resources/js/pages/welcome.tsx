import { Head, Link, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { Facebook, X } from 'lucide-react';
import AlignerHero from '@/components/public/aligner-hero';
import { Bleed, Counter, SectionHead, SplitText, useMotionRoot } from '@/components/public/motion';
import PublicLayout from '@/layouts/public-layout';
import { shortDoctorName } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES — backend-ээс ирэх жинхэнэ өгөгдөл
   ═══════════════════════════════════════════════════════════════════════════ */
interface SubTreatment { id: number; title: string }
interface Treatment {
    id: number; title: string; description: string | null;
    price_min: number | null; price_max: number | null; duration_min: number | null;
    image_url: string | null; sub_treatments: SubTreatment[];
}
interface TreatmentCategory { id: number; name: string; icon: string | null; treatments: Treatment[] }
interface Doctor {
    id: number; name: string; specialization: string | null;
    photo_url: string | null; branch_name: string | null; branch_id: number | null;
}
interface GalleryItem {
    id: number; title: string | null; description: string | null;
    before_url: string | null; after_url: string | null; category_name: string | null;
}
interface Branch { id: number; name: string; address: string | null; phone: string | null }
interface Faq { id: number; question: string; answer: string; category: string | null }
interface Article {
    id: number; title: string; slug: string; excerpt: string | null;
    image_url?: string | null; published_at: string | null;
}
interface Stats { doctors: number; appointments: number; branches: number }
interface Reel { image: string; permalink: string | null; text: string }
interface PageProps {
    doctors: Doctor[];
    treatments: TreatmentCategory[];
    gallery: GalleryItem[];
    branches: Branch[];
    faqs: Faq[];
    articles: Article[];
    stats: Stats;
    reels: Reel[];
}

/* зураг байхгүй үед — судалтай орлуулагч */
const Ph = ({ label }: { label: string }) => <div className="cw-ph">{label}</div>;

/* stagger — картуудыг ээлжлэн гаргах */
const d = (i: number, step = 80): CSSProperties => ({ '--d': `${i * step}ms` } as CSSProperties);

const FEATURES = [
    { n: '01', t: 'Арав гаруй жил ажилласан', d: '2012 оноос хойш үйлчилгээ үзүүлж ирсэн. Туршлагатай хамт олон.' },
    { n: '02', t: 'Шинэ тоног төхөөрөмж', d: '3D сканнер, дижитал рентгенийг ашиглан таны шүдэнд нарийн оношилгоо хийнэ.' },
    { n: '03', t: 'Цагийн хувьд уян хатан', d: 'Амралтын өдрүүдэд ч нээлттэй. Ажил, сургуультайгаа зохицуулаад ирээрэй.' },
];

const STEPS = [
    { n: '01', t: 'Цаг захиалах', d: 'Онлайнаар эсвэл утсаар өөрт тохирох цагаа сонгоно.' },
    { n: '02', t: 'Үзлэг, оношилгоо', d: 'Эмч амны хөндийг шалгаж, шаардлагатай оношилгоо хийнэ.' },
    { n: '03', t: 'Төлөвлөгөө', d: 'Тохирох эмчилгээний төлөвлөгөө, төсвийг танилцуулна.' },
    { n: '04', t: 'Эмчилгээ, хяналт', d: 'Эмчилгээ хийж, үр дүнг тогтмол хянана.' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Welcome({ doctors = [], treatments = [], gallery = [], branches = [], faqs = [], articles = [], stats = { doctors: 0, appointments: 0, branches: 0 }, reels = [] }: PageProps) {
    useMotionRoot();

    /* ── Services (жинхэнэ эмчилгээ) ── */
    const allTreatments = treatments.flatMap((c) => c.treatments.map((t) => ({ ...t, category: c.name })));
    const serviceCards = allTreatments.slice(0, 6);

    /* ── Doctors (салбараар шүүх) ── */
    const [docBranch, setDocBranch] = useState<number | null>(branches[0]?.id ?? null);
    const branchDoctors = docBranch == null ? doctors : doctors.filter((doc) => doc.branch_id === docBranch);

    /* ── Results (gallery, ангилалаар) ── */
    const galleryCats = Array.from(new Set(gallery.map((g) => g.category_name).filter(Boolean))) as string[];
    const resTabs = ['Бүгд', ...galleryCats];
    const [resCat, setResCat] = useState(0);
    const shownResults = (resCat === 0 ? gallery : gallery.filter((g) => g.category_name === resTabs[resCat])).slice(0, 6);
    const [cmp, setCmp] = useState<Record<number, number>>({});
    const posOf = (id: number) => cmp[id] ?? 50;

    /* ── FAQ ── */
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    /* Facebook хуудасны линк (site_settings-ээс) */
    const { site_settings: siteSettings = {} } = usePage<{ site_settings?: { facebook_url?: string } }>().props;
    const fbUrl = siteSettings.facebook_url?.trim() || '';
    const [lightbox, setLightbox] = useState<Reel | null>(null);
    const reelScroll = useRef<HTMLDivElement>(null);
    const reelPaused = useRef(false);
    const scrollReels = (dir: number) => reelScroll.current?.scrollBy({ left: dir * 256, behavior: 'smooth' });

    /* Автоматаар гүйдэг carousel (hover дээр түр зогсоно) */
    useEffect(() => {
        if (reels.length === 0) return;
        const id = setInterval(() => {
            const el = reelScroll.current;
            if (!el || reelPaused.current) return;
            const max = el.scrollWidth - el.clientWidth;
            if (el.scrollLeft >= max - 8) el.scrollTo({ left: 0, behavior: 'smooth' });
            else el.scrollBy({ left: 256, behavior: 'smooth' });
        }, 3200);
        return () => clearInterval(id);
    }, [reels.length]);

    /* fallback (хоосон үед дизайн эвдрэхгүйн тулд) */
    const showServices = serviceCards.length > 0;
    const showDoctors = branchDoctors.length > 0;
    const showResults = shownResults.length > 0;
    const showFaqs = faqs.length > 0;

    return (
        <PublicLayout heroOverlay editorial>
            <Head title="Кутикул шүдний эмнэлэг" />

            {/* ── HERO SLIDER ──────────────────────────────────────────────── */}
            <AlignerHero />

            {/* ── ДАВУУ ТАЛ 01/02/03 ───────────────────────────────────────── */}
            <section className="cw-sec-tight">
                <div className="cw-feat">
                    {FEATURES.map((f, i) => (
                        <div key={f.n} data-reveal="up" style={d(i, 100)}>
                            <u>{f.n}</u>
                            <h3>{f.t}</h3>
                            <p>{f.d}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── ТООН ҮЗҮҮЛЭЛТ (хар самбар) ───────────────────────────────── */}
            <section className="cw-sec-tight">
                <Bleed tone="ink" parallax={48}>
                    <div className="cw-nums">
                        <div data-reveal="up" style={d(0, 110)}>
                            <b><Counter to={10} /><em>+ жил</em></b>
                            <span>Салбартаа ажилласан хугацаа</span>
                        </div>
                        <div data-reveal="up" style={d(1, 110)}>
                            <b><Counter to={stats.doctors || 0} /><em>эмч</em></b>
                            <span>Мэргэшсэн эмч нарын баг</span>
                        </div>
                        <div data-reveal="up" style={d(2, 110)}>
                            <b><Counter to={stats.branches || 0} /><em>салбар</em></b>
                            <span>Танд ойрхон байршил</span>
                        </div>
                    </div>
                </Bleed>
            </section>

            {/* ── ЭМЧИЛГЭЭ ҮЙЛЧИЛГЭЭ ───────────────────────────────────────── */}
            {showServices && (
                <section className="cw-sec">
                    <SectionHead
                        eyebrow="Эмчилгээ үйлчилгээ"
                        title="Бидний санал болгох үйлчилгээ"
                        href="/services"
                        linkLabel="Бүх үйлчилгээ"
                    />
                    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
                        {serviceCards.map((sv, i) => (
                            <Link key={sv.id} href="/services" className="cw-card" data-reveal="up" style={d(i % 3, 90)}>
                                <div className="cw-card-img aspect-[4/3]" data-reveal="wipe">
                                    {sv.image_url ? <img src={sv.image_url} alt={sv.title} loading="lazy" /> : <Ph label={sv.title} />}
                                </div>
                                <div className="cw-card-body">
                                    <h3>{sv.title}</h3>
                                    <div className="cw-card-meta"><span>{sv.category}</span><b>→</b></div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* ── ЭМЧ НАР ──────────────────────────────────────────────────── */}
            {showDoctors && (
                <section className="cw-sec">
                    <SectionHead
                        eyebrow="Эмч нар"
                        title="Туршлагатай эмч нарын баг"
                        href="/doctors"
                        linkLabel="Бүх эмч"
                    />
                    {branches.length > 1 && (
                        <div className="cw-tabs" data-reveal="fade">
                            {branches.map((b) => (
                                <button key={b.id} type="button" aria-pressed={b.id === docBranch} onClick={() => setDocBranch(b.id)}>
                                    {b.name}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
                        {branchDoctors.slice(0, 8).map((doc, i) => (
                            <Link key={doc.id} href="/doctors" className="cw-card" data-reveal="up" style={d(i % 4, 80)}>
                                <div className="cw-card-img aspect-[1/1.14]">
                                    {doc.photo_url ? <img src={doc.photo_url} alt={doc.name} loading="lazy" /> : <Ph label="эмчийн зураг" />}
                                </div>
                                <div className="cw-card-body">
                                    <h3>{shortDoctorName(doc.name)}</h3>
                                    <div className="cw-card-meta"><span>{doc.specialization || 'Шүдний эмч'}</span></div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* ── ҮР ДҮН (өмнө / дараа) ────────────────────────────────────── */}
            {showResults && (
                <section className="cw-sec">
                    <SectionHead eyebrow="Үр дүн" title="Өмнө ба дараа" center
                        lead="Гулсуулагчийг хөдөлгөж эмчилгээний өмнөх, дараах байдлыг харьцуулна уу." />
                    {resTabs.length > 1 && (
                        <div className="cw-tabs" data-reveal="fade">
                            {resTabs.map((t, i) => (
                                <button key={t} type="button" aria-pressed={i === resCat} onClick={() => setResCat(i)}>{t}</button>
                            ))}
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {shownResults.map((r, i) => {
                            const pos = posOf(r.id);
                            return (
                                <div key={r.id} data-reveal="up" style={d(i % 3, 90)}>
                                    <div className="cw-ba">
                                        {r.after_url ? <img src={r.after_url} alt="дараа" loading="lazy" /> : <Ph label="дараа" />}
                                        <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
                                            {r.before_url ? <img src={r.before_url} alt="өмнө" loading="lazy" /> : <Ph label="өмнө" />}
                                        </div>
                                        <span className="cw-ba-tag l">ӨМНӨ</span>
                                        <span className="cw-ba-tag r">ДАРАА</span>
                                        <div className="cw-ba-bar" style={{ left: `${pos}%` }} />
                                        <div className="cw-ba-knob" style={{ left: `${pos}%` }}>⇆</div>
                                        <input
                                            type="range" min={0} max={100} value={pos}
                                            aria-label={r.title || 'Өмнө/дараа харьцуулах'}
                                            onChange={(e) => setCmp((c) => ({ ...c, [r.id]: +e.target.value }))}
                                        />
                                    </div>
                                    {r.title && <div className="pt-3.5 text-[14.5px] font-medium">{r.title}</div>}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

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

            {/* ── АСУУЛТ ХАРИУЛТ ───────────────────────────────────────────── */}
            {showFaqs && (
                <section className="cw-sec">
                    <SectionHead eyebrow="Түгээмэл асуулт" title="Асуулт хариулт" center />
                    <div className="cw-faq">
                        {faqs.map((f, i) => (
                            <div key={f.id} className="cw-faq-item" data-open={openFaq === i ? '1' : '0'} data-reveal="fade" style={d(i, 55)}>
                                <button type="button" className="cw-faq-q" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                                    {f.question}<i />
                                </button>
                                <div className="cw-faq-a"><div><p>{f.answer}</p></div></div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── МЭДЭЭ ────────────────────────────────────────────────────── */}
            {articles.length > 0 && (
                <section className="cw-sec">
                    <SectionHead eyebrow="Мэдээ" title="Сүүлийн үеийн мэдээ" href="/articles" linkLabel="Бүх мэдээ" />
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {articles.slice(0, 3).map((a, i) => (
                            <Link key={a.id} href="/articles" className="cw-card" data-reveal="up" style={d(i, 90)}>
                                <div className="cw-card-img aspect-[16/10]">
                                    {a.image_url ? <img src={a.image_url} alt={a.title} loading="lazy" /> : <Ph label="мэдээний зураг" />}
                                </div>
                                <div className="cw-card-body">
                                    {a.published_at && <div className="mb-2 text-[11.5px] font-medium tracking-[0.06em] text-[#74787e]">{a.published_at}</div>}
                                    <h3>{a.title}</h3>
                                    {a.excerpt && <p className="mb-3 line-clamp-2 text-[13.5px] leading-[1.65] text-[#74787e]">{a.excerpt}</p>}
                                    <div className="cw-card-meta"><span>Унших</span><b>→</b></div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* ── САЛБАРУУД ────────────────────────────────────────────────── */}
            {branches.length > 0 && (
                <section className="cw-sec">
                    <SectionHead eyebrow="Салбарууд" title="Танд ойрхон салбар" href="/contact" linkLabel="Байршил харах" />
                    <div>
                        {branches.map((b, i) => (
                            <div key={b.id} className="cw-branch" data-reveal="up" style={d(i, 70)}>
                                <u>{String(i + 1).padStart(2, '0')}</u>
                                <h3>{b.name}</h3>
                                <p>{b.address || '—'}</p>
                                {b.phone ? <a href={`tel:${b.phone}`}>{b.phone}</a> : <span />}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── СОШИАЛ ───────────────────────────────────────────────────── */}
            {reels.length > 0 && (
                <section className="cw-sec">
                    <div className="cw-head">
                        <div>
                            <p className="cw-eyebrow" data-reveal="fade"><i />Сошиал</p>
                            <h2 className="cw-title" data-reveal="words"><SplitText text="Шинэ мэдээ, урамшуулал" accent /></h2>
                            <p className="cw-lead" data-reveal="up" style={d(1, 120)}>Facebook хуудсаа дагаж, шинэ мэдээллийг түрүүлж хүлээн аваарай.</p>
                        </div>
                        <div className="flex items-center gap-2.5" data-reveal="fade" style={d(2, 120)}>
                            <button type="button" className="cw-arrow" onClick={() => scrollReels(-1)} aria-label="Өмнөх">‹</button>
                            <button type="button" className="cw-arrow" onClick={() => scrollReels(1)} aria-label="Дараах">›</button>
                            {fbUrl && (
                                <a href={fbUrl} target="_blank" rel="noreferrer" className="cw-more ml-2">
                                    <Facebook className="h-4 w-4" />Facebook<span>↗</span>
                                </a>
                            )}
                        </div>
                    </div>
                    <div
                        ref={reelScroll}
                        className="cw-reels"
                        onMouseEnter={() => { reelPaused.current = true; }}
                        onMouseLeave={() => { reelPaused.current = false; }}
                        onTouchStart={() => { reelPaused.current = true; }}
                    >
                        {reels.map((r, i) => (
                            <button key={i} type="button" className="cw-reel" onClick={() => setLightbox(r)} data-reveal="fade" style={d(Math.min(i, 5), 70)}>
                                <img src={r.image} alt="" loading="lazy" />
                                <span className="cw-reel-sh" />
                                {r.text && <p>{r.text}</p>}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* ── ЦАГ АВАХ CTA ─────────────────────────────────────────────── */}
            <section className="cw-sec">
                <Bleed tone="red">
                    <div className="cw-cta">
                        <div>
                            <p className="cw-eyebrow" data-reveal="fade"><i />Цаг авах</p>
                            <h2 data-reveal="words"><SplitText text="Онлайнаар хялбар цаг захиалаарай" accent /></h2>
                            <p data-reveal="up" style={d(1, 140)}>Салбар, эмчээ сонгож, өөрт тохирох цагаа хэдхэн товшилтоор баталгаажуулаарай.</p>
                        </div>
                        <Link href="/booking" className="cw-btn cw-btn-w" data-reveal="up" style={d(2, 140)}>
                            Цаг авах<span>→</span>
                        </Link>
                    </div>
                </Bleed>
            </section>

            {/* ── LIGHTBOX (пост зургийг сайт дотор томруулж харуулна) ──────── */}
            {lightbox && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
                    <div className="absolute inset-0 bg-[#08090a]/75 backdrop-blur-sm" />
                    <div className="relative max-h-[92vh] w-full max-w-[440px] overflow-hidden rounded-[22px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setLightbox(null)} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60" aria-label="Хаах">
                            <X className="h-5 w-5" />
                        </button>
                        <img src={lightbox.image} alt="" className="max-h-[68vh] w-full bg-[#08090a] object-contain" />
                        <div className="p-5">
                            {lightbox.text && <p className="mb-4 text-[14px] leading-[1.65] text-[#26282c]">{lightbox.text}</p>}
                            {lightbox.permalink && (
                                <a href={lightbox.permalink} target="_blank" rel="noreferrer" className="flex h-[52px] items-center justify-center gap-2 rounded-full bg-[#08090a] text-[14px] font-medium text-white transition-colors hover:bg-[#c81e3a]">
                                    <Facebook className="h-4 w-4" /> Facebook дээр нээх ↗
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </PublicLayout>
    );
}
