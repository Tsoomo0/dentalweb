import { Head } from '@inertiajs/react';
import { useState, useEffect, type CSSProperties } from 'react';
import { useMotionRoot } from '@/components/public/motion';
import PageHeroBig from '@/components/public/page-hero-big';
import PublicLayout from '@/layouts/public-layout';
import { X } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES — backend-ээс ирэх жинхэнэ өгөгдөл
   ═══════════════════════════════════════════════════════════════════════════ */
interface Article {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    category: string | null;
    featured_image: string | null;
    image_url?: string | null; // backend нь image_url нэрээр илгээдэг
    published_at: string | null;
    author?: string | null;
}
interface PageProps {
    [key: string]: unknown;
    articles: Article[];
}

const d = (i: number, step = 90): CSSProperties => ({ '--d': `${i * step}ms` } as CSSProperties);

/* зургийн эх сурвалжийг нэгтгэх (featured_image эсвэл image_url) */
const imgOf = (a: Article): string | null => a.featured_image || a.image_url || null;

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL — мэдээний дэлгэрэнгүй (детал route байхгүй тул хуучин логикийг хадгалав)
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

function ArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
    const img = imgOf(article);

    return (
        <Modal onClose={onClose}>
            <div className="cw-modal-img">
                {img ? <img src={img} alt={article.title} /> : <div className="cw-ph">мэдээний зураг</div>}
                <button onClick={onClose} className="cw-modal-x" aria-label="Хаах"><X className="h-4 w-4" /></button>
                {article.category && <span className="cw-modal-cat">{article.category}</span>}
            </div>

            <div className="cw-modal-body">
                {article.published_at && (
                    <p className="mb-4 border-b border-[#e5e7ea] pb-4 text-[12px] font-medium tracking-[.08em] text-[#74787e]">
                        {article.published_at}
                    </p>
                )}
                <h2 className="mb-4">{article.title}</h2>
                {article.excerpt && <p className="text-[15px] leading-[1.75] text-[#26282c]">{article.excerpt}</p>}
            </div>
        </Modal>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Articles({ articles = [] }: PageProps) {
    useMotionRoot();

    /* зөвхөн backend-ээс ирсэн жинхэнэ мэдээ — хуурамч контентгүй */
    const source = articles;

    /* ангилалууд (жинхэнэ category утгуудаас) */
    const categories = Array.from(new Set(source.map((a) => a.category).filter(Boolean))) as string[];
    const tabs = ['Бүгд', ...categories];
    const [cat, setCat] = useState(0);

    const filtered = cat === 0 ? source : source.filter((a) => a.category === tabs[cat]);
    const [featured, ...rest] = filtered;

    const [selected, setSelected] = useState<Article | null>(null);

    return (
        <PublicLayout heroOverlay editorial>
            <Head title="Мэдээ — Кутикул" />

            <PageHeroBig
                figure="news"
                alt="Шүдний эрүүл мэнд"
                ghost="NEWS"
                eyebrow="МЭДЭЭ"
                title={['Мэдээ', 'зөвлөгөө']}
                mn="Шүдний эрүүл мэндийн ашигтай мэдээлэл"
                lead="Эмнэлгийн шинэ мэдээ, урамшуулал, шүдээ хэрхэн арчлах талаарх мэргэжлийн зөвлөгөөг эндээс уншаарай."
                stats={[
                    { num: '6', unit: 'ангилал', label: 'Сэдвээр ангилсан' },
                    { num: '10', unit: '+ жил', label: 'Мэргэжлийн туршлага' },
                    { num: '4', unit: 'салбар', label: 'Танд ойрхон' },
                ]}
                marks={{
                    d1: { x: 44, y: 58 }, path1: 'M44 58 L 30 87 L 22 87', chip1: 'Мэргэжлийн зөвлөгөө',
                    d2: { x: 58, y: 36 }, path2: 'M58 36 L 80 17 L 98 17', chip2: 'Шинэ мэдээ',
                }}
                cta={[
                    { label: 'Цаг захиалах', href: '/booking', primary: true },
                ]}
            />

            {/* ── ОНЦЛОХ МЭДЭЭ ─────────────────────────────────────────────── */}
            {featured && (
                <section className="cw-sec-tight">
                    <button
                        type="button"
                        onClick={() => setSelected(featured)}
                        className="cw-feature"
                        data-reveal="up"
                    >
                        <div className="cw-feature-img" data-parallax="26">
                            {imgOf(featured)
                                ? <img src={imgOf(featured)!} alt={featured.title} />
                                : <div className="cw-ph">онцлох мэдээний зураг</div>}
                        </div>
                        <div className="cw-feature-body">
                            <span className="cw-feature-tag">Онцлох</span>
                            <h2>{featured.title}</h2>
                            <p>
                                {featured.published_at}
                                {featured.published_at && featured.category ? ' · ' : ''}
                                {featured.category}
                            </p>
                        </div>
                    </button>
                </section>
            )}

            {/* ── МЭДЭЭНИЙ ЖАГСААЛТ ────────────────────────────────────────── */}
            <section className="cw-sec">
                {tabs.length > 1 && (
                    <div className="cw-tabs" data-reveal="fade">
                        {tabs.map((t, i) => (
                            <button key={t} type="button" aria-pressed={i === cat} onClick={() => setCat(i)}>{t}</button>
                        ))}
                    </div>
                )}

                {rest.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {rest.map((a, i) => {
                            const img = imgOf(a);
                            return (
                                <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => setSelected(a)}
                                    className="cw-card text-left"
                                    data-reveal="up"
                                    style={d(i % 3, 90)}
                                >
                                    <div className="cw-card-img aspect-[16/10]">
                                        {img ? <img src={img} alt={a.title} loading="lazy" /> : <div className="cw-ph">мэдээний зураг</div>}
                                        {a.category && <span className="cw-card-tag">{a.category}</span>}
                                    </div>
                                    <div className="cw-card-body">
                                        {a.published_at && <p className="mb-2 text-[11.5px] font-medium tracking-[.06em] text-[#74787e]">{a.published_at}</p>}
                                        <h3>{a.title}</h3>
                                        {a.excerpt && <p className="mb-3 line-clamp-2 text-[13.5px] leading-[1.65] text-[#74787e]">{a.excerpt}</p>}
                                        <div className="cw-card-meta"><span>Дэлгэрэнгүй унших</span><b>→</b></div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="cw-empty">
                        {featured ? 'Энэ ангилалд өөр мэдээ алга байна.' : 'Энэ ангилалд мэдээ байхгүй байна.'}
                    </p>
                )}
            </section>

            {selected && <ArticleModal article={selected} onClose={() => setSelected(null)} />}
        </PublicLayout>
    );
}
