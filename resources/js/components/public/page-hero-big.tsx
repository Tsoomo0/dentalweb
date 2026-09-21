import { Link } from '@inertiajs/react';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import HeroGraphic, { type HeroFigure } from '@/components/public/hero-graphic';

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE HERO (том) — дотоод хуудсуудад зориулсан, нүүр хуудасны hero-тэй
   ижил хэлээр: ghost үсэг, баруун талын зураг, сканерын туяа, тайлбар chip.
   Нүүрийнхээс ялгаатай нь слайдгүй, арай намхан, скан нь давтагдана.
   CSS нь resources/css/app.css доторх ".alh" блокийг дахин ашиглана.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface HeroMark {
    d1: { x: number; y: number }; path1: string; chip1: string;
    d2: { x: number; y: number }; path2: string; chip2: string;
}

export interface PageHeroBigProps {
    /** .alh-pic дээр нэмэгдэх класс — зургийг CSS сонгоно. figure өгвөл хэрэггүй. */
    pic?: string;
    /** зургийн оронд SVG график (бэлэн зураг байхгүй үед) */
    figure?: HeroFigure;
    alt: string;
    ghost: string;
    eyebrow: string;
    /** [эхний мөр, хоёр дахь мөр — улаан доогуур зураастай] */
    title: [string, string];
    mn: string;
    lead: string;
    stats?: { num: string; unit: string; label: string }[];
    marks?: HeroMark;
    cta?: { label: string; href: string; primary?: boolean }[];
    /** баруун доод буланд харагдах жижиг тэмдэг (default: 3D СКАНЕР) */
    badge?: [string, string];
}

export default function PageHeroBig({
    pic, figure, alt, ghost, eyebrow, title, mn, lead, stats, marks, cta, badge = ['3D', 'СКАНЕР'],
}: PageHeroBigProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const ghostRef = useRef<HTMLDivElement>(null);
    const photoRef = useRef<HTMLDivElement>(null);
    const badgeRef = useRef<HTMLDivElement>(null);

    const play = useCallback(() => {
        const el = rootRef.current;
        if (!el) return;
        el.classList.remove('alh-anim');
        void el.offsetWidth; // reflow → animation эхнээс нь
        el.classList.add('alh-anim');
    }, []);

    useLayoutEffect(() => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        play();
    }, [play]);

    /* хулгана дагасан зөөлөн parallax — зөвхөн заагчтай төхөөрөмж дээр */
    useEffect(() => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (!matchMedia('(pointer:fine)').matches) return;

        let tx = 0, ty = 0, x = 0, y = 0;
        let raf: number | null = null;

        const step = () => {
            x += (tx - x) * 0.06;
            y += (ty - y) * 0.06;
            if (ghostRef.current) ghostRef.current.style.translate = `${(-x * 26).toFixed(1)}px ${(-y * 12).toFixed(1)}px`;
            if (photoRef.current) photoRef.current.style.translate = `${(x * 12).toFixed(1)}px ${(y * 7).toFixed(1)}px`;
            if (badgeRef.current) badgeRef.current.style.translate = `${(-x * 18).toFixed(1)}px ${(-y * 12).toFixed(1)}px`;
            raf = Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001 ? requestAnimationFrame(step) : null;
        };

        const onMove = (e: PointerEvent) => {
            tx = e.clientX / window.innerWidth - 0.5;
            ty = e.clientY / window.innerHeight - 0.5;
            if (!raf) raf = requestAnimationFrame(step);
        };

        window.addEventListener('pointermove', onMove, { passive: true });
        return () => {
            window.removeEventListener('pointermove', onMove);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);

    return (
        <div ref={rootRef} className="alh alh-page">
            {/* ── дэвсгэрийн том үсэг ──────────────────────────────────── */}
            <div className="alh-ghost" ref={ghostRef}>{ghost}</div>

            {/* ── зураг + сканер ───────────────────────────────────────── */}
            <div className="alh-photo" ref={photoRef}>
                {figure
                    ? <div className="alh-gfx" role="img" aria-label={alt}><HeroGraphic figure={figure} /></div>
                    : <div className={`alh-pic ${pic}`} role="img" aria-label={alt} />}

                <div className="alh-scanwrap">
                    <div className="alh-scanlines" />
                    <div className="alh-beam" />
                </div>

                <div className="alh-lock">
                    <em>SCAN</em><b /><b /><b /><b />
                </div>

                {marks && (
                    <div className="alh-marks">
                        {/* Заагч шугам/цэг нь зурган hero-д л утгатай — график дээр
                            тодорхой цэг рүү заахгүй тул зөвхөн chip үлдээнэ. */}
                        {!figure && (
                            <>
                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                                    <path className="alh-m1" d={marks.path1} />
                                    <path className="alh-m2" d={marks.path2} />
                                </svg>
                                <span className="alh-dot alh-d1" style={{ left: `${marks.d1.x}%`, top: `${marks.d1.y}%` }} />
                                <span className="alh-dot alh-d2" style={{ left: `${marks.d2.x}%`, top: `${marks.d2.y}%` }} />
                            </>
                        )}
                        <div className="alh-chip alh-chip1"><i />{marks.chip1}</div>
                        <div className="alh-chip alh-chip2"><i />{marks.chip2}</div>
                    </div>
                )}
            </div>

            {/* ── тэмдэг ───────────────────────────────────────────────── */}
            <div className="alh-badge" ref={badgeRef}>
                <svg viewBox="0 0 86 86" aria-hidden="true"><circle cx="43" cy="43" r="40" /></svg>
                <u>{badge[0]}<small>{badge[1]}</small></u>
            </div>

            {/* ── гол текст ────────────────────────────────────────────── */}
            <div className="alh-copy">
                <p className="alh-eyebrow"><i />{eyebrow}</p>
                <h1 className="alh-title">
                    <span className="alh-l"><b>{title[0]}</b></span>
                    <span className="alh-l">
                        <b><span className="alh-u">{title[1]}</span><span className="alh-red">.</span></b>
                    </span>
                </h1>
                <p className="alh-mn">{mn}</p>
                <p className="alh-lead">{lead}</p>
                {cta && cta.length > 0 && (
                    <div className="alh-cta">
                        {cta.map((c) => (
                            <Link key={c.href + c.label} className={`alh-btn ${c.primary ? 'alh-btn-a' : 'alh-btn-b'}`} href={c.href}>
                                {c.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* ── тоон үзүүлэлт ────────────────────────────────────────── */}
            {stats && stats.length > 0 && (
                <div className="alh-stats">
                    {stats.map((s) => (
                        <div key={s.label}>
                            <b>{s.num}{s.unit && <em>{s.unit}</em>}</b>
                            <span>{s.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
