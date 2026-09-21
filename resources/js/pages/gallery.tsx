import { Head, Link } from '@inertiajs/react';
import { useState, type CSSProperties } from 'react';
import { Bleed, SplitText, useMotionRoot } from '@/components/public/motion';
import PageHeroBig from '@/components/public/page-hero-big';
import PublicLayout from '@/layouts/public-layout';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES — backend-ээс ирэх жинхэнэ өгөгдөл
   ═══════════════════════════════════════════════════════════════════════════ */
interface GalleryItem {
    id: number; title: string | null; description: string | null;
    before_url: string | null; after_url: string | null; category_name: string | null;
}
interface TreatmentCategory { id: number; name: string }
interface PageProps {
    gallery?: GalleryItem[];
    categories?: TreatmentCategory[];
}

const d = (i: number, step = 80): CSSProperties => ({ '--d': `${i * step}ms` } as CSSProperties);

/* ═══════════════════════════════════════════════════════════════════════════
   BEFORE / AFTER КАРТ — гулсуурт харьцуулагч
   ═══════════════════════════════════════════════════════════════════════════ */
function ResultCard({ item, delay }: { item: GalleryItem; delay: CSSProperties }) {
    const [pos, setPos] = useState(50);

    return (
        <div data-reveal="up" style={delay}>
            <div className="cw-ba">
                {item.after_url ? <img src={item.after_url} alt="дараа" loading="lazy" /> : <div className="cw-ph">дараа</div>}
                <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
                    {item.before_url ? <img src={item.before_url} alt="өмнө" loading="lazy" /> : <div className="cw-ph">өмнө</div>}
                </div>
                <span className="cw-ba-tag l">ӨМНӨ</span>
                <span className="cw-ba-tag r">ДАРАА</span>
                <div className="cw-ba-bar" style={{ left: `${pos}%` }} />
                <div className="cw-ba-knob" style={{ left: `${pos}%` }}>⇆</div>
                <input
                    type="range" min={0} max={100} value={pos}
                    onChange={(e) => setPos(+e.target.value)}
                    aria-label={item.title || 'Өмнө/дараа харьцуулах'}
                />
            </div>
            <div className="pt-3.5">
                {item.title && <h3 className="mb-1.5 text-[15px] font-medium tracking-[-.02em]">{item.title}</h3>}
                {item.category_name && <p className="mb-1.5 text-[11px] font-semibold tracking-[.14em] text-[#c81e3a]">{item.category_name.toUpperCase()}</p>}
                {item.description && <p className="text-[13px] leading-[1.6] text-[#74787e]">{item.description}</p>}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Gallery({ gallery = [], categories = [] }: PageProps) {
    useMotionRoot();

    /* tab: null = Бүгд, эсвэл category нэр */
    const [activeCat, setActiveCat] = useState<string | null>(null);

    /* ангилалын tab-ууд — categories props эсвэл gallery-оос гаргана */
    const catNames = categories.length > 0
        ? categories.map((c) => c.name)
        : (Array.from(new Set(gallery.map((g) => g.category_name).filter(Boolean))) as string[]);

    const shown = activeCat === null ? gallery : gallery.filter((g) => g.category_name === activeCat);
    const tabs: (string | null)[] = [null, ...catNames];

    return (
        <PublicLayout heroOverlay editorial>
            <Head title="Үр дүн — Кутикул" />

            <PageHeroBig
                figure="compare"
                alt="Эмчилгээний үр дүн"
                ghost="RESULTS"
                eyebrow="ҮР ДҮН"
                title={['Өмнө', 'ба дараа']}
                mn="Бодит үйлчлүүлэгчдийн жинхэнэ үр дүн"
                lead="Манай эмнэлэгт эмчилгээ хийлгэсэн үйлчлүүлэгчдийн өмнөх, дараах байдлыг гулсуулж харьцуулна уу."
                stats={[
                    { num: '100', unit: '%', label: 'Бодит зураг' },
                    { num: '6', unit: 'ангилал', label: 'Эмчилгээний төрлөөр' },
                    { num: '4', unit: 'салбар', label: 'Бүх салбарт' },
                ]}
                marks={{
                    d1: { x: 42, y: 56 }, path1: 'M42 56 L 30 87 L 22 87', chip1: 'Өмнө / дараа',
                    d2: { x: 58, y: 40 }, path2: 'M58 40 L 80 17 L 98 17', chip2: 'Засварлаагүй зураг',
                }}
                cta={[
                    { label: 'Цаг захиалах', href: '/booking', primary: true },
                    { label: 'Үйлчилгээ үзэх', href: '/services' },
                ]}
            />

            {/* ── ҮР ДҮНГИЙН ЖАГСААЛТ ──────────────────────────────────────── */}
            <section className="cw-sec">
                {tabs.length > 1 && (
                    <div className="cw-tabs" data-reveal="fade">
                        {tabs.map((t) => (
                            <button key={t ?? '__all'} type="button" aria-pressed={t === activeCat} onClick={() => setActiveCat(t)}>
                                {t ?? 'Бүгд'}
                            </button>
                        ))}
                    </div>
                )}

                {shown.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {shown.map((item, i) => (
                            <ResultCard key={item.id} item={item} delay={d(i % 4, 80)} />
                        ))}
                    </div>
                ) : (
                    <p className="cw-empty">Энэ ангилалд үр дүн алга байна. Удахгүй шинэ үр дүнгүүд нэмэгдэнэ.</p>
                )}
            </section>

            {/* ── CTA ──────────────────────────────────────────────────────── */}
            <section className="cw-sec">
                <Bleed tone="red">
                    <div className="cw-cta">
                        <div>
                            <p className="cw-eyebrow" data-reveal="fade"><i />Цаг авах</p>
                            <h2 data-reveal="words"><SplitText text="Дараагийн амжилт тань байж магадгүй" accent /></h2>
                            <p data-reveal="up" style={d(1, 140)}>Анхны үзлэгийн цагаа захиалж, өөрийн инээмсэглэлийн өөрчлөлтийг эхлүүлээрэй.</p>
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
