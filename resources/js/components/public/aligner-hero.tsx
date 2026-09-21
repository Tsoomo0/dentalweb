import { Link } from '@inertiajs/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   HERO SLIDER — нүүр хуудасны эхний дэлгэц
   Загвар: цагаан (white) editorial, скан анимэйшнтэй.
   Сканерын туяа доошоо гүйж дуусмагц дараагийн слайд орж ирнэ —
   CSS-ийн animationend-ээр холбосон тул хугацаа хэзээ ч зөрөхгүй.
   Загварын CSS нь resources/css/app.css дотор ".alh" scope-оор байрлана.
   ═══════════════════════════════════════════════════════════════════════════ */

interface Slide {
    key: string;
    pic: string;                 // .alh-pic дээр нэмэгдэх класс — зургийг CSS сонгоно
    alt: string;
    ghost: string;
    eyebrow: string;
    title: [string, string];     // [эхний мөр, хоёр дахь мөр — улаан доогуур зураастай]
    mn: string;
    lead: string;
    stats: { num: string; unit: string; label: string }[];
    /* тайлбар заагч — зургийн суудалтай харьцангуй хувиар */
    marks: {
        d1: { x: number; y: number }; path1: string; chip1: string;
        d2: { x: number; y: number }; path2: string; chip2: string;
    };
}

const SLIDES: Slide[] = [
    {
        key: 'aligner',
        pic: 'alh-pic-aligner',
        alt: 'Тунгалаг аппарат зүүж буй үйлчлүүлэгч',
        ghost: 'ALIGNER',
        eyebrow: 'ЗӨӨЛӨН ЭМЧИЛГЭЭНИЙ ШИНЭ ҮЕ',
        title: ['Shape Memory', 'Aligner'],
        mn: 'Ой санамжтай тунгалаг авагддаг аппарат',
        lead: 'Металл брекет зүүхгүйгээр шүдийг зөв байрлалд нь оруулна. Хоол идэх, шүдээ угаахдаа сугалж, дараа нь буцааж зүүнэ.',
        stats: [
            { num: '20–22', unit: 'цаг', label: 'Өдөрт зүүх хугацаа' },
            { num: '6–18', unit: 'сар', label: 'Дундаж эмчилгээний хугацаа' },
            { num: '0.5', unit: 'мм', label: 'Аппаратын зузаан' },
        ],
        marks: {
            d1: { x: 52, y: 59 }, path1: 'M52 59 L 34 87 L 24 87', chip1: '0.5 мм — бараг үл мэдэгдэх',
            d2: { x: 84, y: 35 }, path2: 'M84 35 L 90 16 L 98 16', chip2: 'Ой санамжтай материал',
        },
    },
    {
        key: 'braces',
        pic: 'alh-pic-braces',
        alt: 'Металл брекет зүүсэн үйлчлүүлэгч',
        ghost: 'BRACES',
        eyebrow: 'БАТАЛГААЖСАН СОНГОДОГ ШИЙДЭЛ',
        title: ['Classic Metal', 'Braces'],
        mn: 'Найдвартай, өндөр үр дүнтэй сонгодог аппарат',
        lead: 'Шүдэнд бэхлэгдсэн тул тасралтгүй, тогтвортой хүч үйлчилнэ. Нарийн төвөгтэй хазалтын гажгийг ч үр дүнтэй засна.',
        stats: [
            { num: '18–30', unit: 'сар', label: 'Дундаж эмчилгээний хугацаа' },
            { num: '24/7', unit: '', label: 'Тасралтгүй үйлчилнэ' },
            { num: '4–6', unit: 'дол.хоног', label: 'Хяналтын давтамж' },
        ],
        marks: {
            d1: { x: 46, y: 50 }, path1: 'M46 50 L 30 87 L 22 87', chip1: 'Нарийн төвөгтэй тохиолдолд',
            d2: { x: 57, y: 38 }, path2: 'M57 38 L 80 17 L 98 17', chip2: 'Металл брекет систем',
        },
    },
    {
        key: 'ceramic',
        pic: 'alh-pic-ceramic',
        alt: 'Өөрөө түгжээтэй шаазан брекет зүүсэн үйлчлүүлэгч',
        ghost: 'CERAMIC',
        eyebrow: 'БАРАГ ҮЛ МЭДЭГДЭХ ЭСТЕТИК ШИЙДЭЛ',
        title: ['Self-Ligating', 'Ceramic'],
        mn: 'Өөрөө түгжээтэй шаазан аппарат',
        lead: 'Шүдний өнгөтэй ойролцоо шаазан брекет. Резин холбоосгүй, өөрөө түгждэг тул үрэлт бага, хяналтын уулзалт цөөрнө.',
        stats: [
            { num: '12–24', unit: 'сар', label: 'Дундаж эмчилгээний хугацаа' },
            { num: '6–10', unit: 'дол.хоног', label: 'Хяналтын давтамж' },
            { num: '0', unit: 'резин', label: 'Холбоосгүй систем' },
        ],
        marks: {
            d1: { x: 44, y: 49 }, path1: 'M44 49 L 30 87 L 22 87', chip1: 'Резин холбоосгүй',
            d2: { x: 59, y: 37 }, path2: 'M59 37 L 80 17 L 98 17', chip2: 'Шүдний өнгөтэй шаазан',
        },
    },
];

export default function AlignerHero() {
    const rootRef = useRef<HTMLDivElement>(null);
    const ghostRef = useRef<HTMLDivElement>(null);
    const photoRef = useRef<HTMLDivElement>(null);
    const badgeRef = useRef<HTMLDivElement>(null);
    const beamRef = useRef<HTMLDivElement>(null);

    const [idx, setIdx] = useState(0);
    const slide = SLIDES[idx];
    const m = slide.marks;

    /* нээлтийн дараалал — эхнээс нь дахин тоглуулна */
    const play = useCallback(() => {
        const el = rootRef.current;
        if (!el) return;
        el.classList.remove('alh-anim');
        void el.offsetWidth; // reflow → animation эхнээс нь
        el.classList.add('alh-anim');
    }, []);

    /* Слайд солигдох бүрт анимэйшн эхнээс нь. useLayoutEffect ашигласан нь —
       шинэ зураг нэг ч кадр хальт харагдалгүй шууд wipe-аар орж ирнэ. */
    useLayoutEffect(() => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        play();
    }, [idx, play]);

    /* Скан доошоо гүйж дуусмагц → дараагийн слайд */
    useEffect(() => {
        const el = beamRef.current;
        if (!el) return;
        const onEnd = (e: AnimationEvent) => {
            if (e.animationName.includes('alh-scan')) setIdx((i) => (i + 1) % SLIDES.length);
        };
        el.addEventListener('animationend', onEnd);
        return () => el.removeEventListener('animationend', onEnd);
    }, []);

    /* хулгана дагасан зөөлөн parallax — зөвхөн заагчтай төхөөрөмж дээр */
    useEffect(() => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (!matchMedia('(pointer:fine)').matches) return;

        let tx = 0, ty = 0, x = 0, y = 0;
        let raf: number | null = null;

        const step = () => {
            x += (tx - x) * 0.06;
            y += (ty - y) * 0.06;
            if (ghostRef.current) ghostRef.current.style.translate = `${(-x * 30).toFixed(1)}px ${(-y * 14).toFixed(1)}px`;
            if (photoRef.current) photoRef.current.style.translate = `${(x * 14).toFixed(1)}px ${(y * 8).toFixed(1)}px`;
            if (badgeRef.current) badgeRef.current.style.translate = `${(-x * 22).toFixed(1)}px ${(-y * 14).toFixed(1)}px`;
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
        <div ref={rootRef} className="alh">
            {/* ── дэвсгэрийн том үсэг ──────────────────────────────────── */}
            <div className="alh-ghost" ref={ghostRef}>{slide.ghost}</div>

            {/* ── зураг + сканер ───────────────────────────────────────── */}
            <div className="alh-photo" ref={photoRef}>
                <div className={`alh-pic ${slide.pic}`} role="img" aria-label={slide.alt} />

                <div className="alh-scanwrap">
                    <div className="alh-scanlines" />
                    <div className="alh-beam" ref={beamRef} />
                </div>

                <div className="alh-lock">
                    <em>SCAN</em><b /><b /><b /><b />
                </div>

                <div className="alh-marks">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                        <path className="alh-m1" d={m.path1} />
                        <path className="alh-m2" d={m.path2} />
                    </svg>
                    <span className="alh-dot alh-d1" style={{ left: `${m.d1.x}%`, top: `${m.d1.y}%` }} />
                    <span className="alh-dot alh-d2" style={{ left: `${m.d2.x}%`, top: `${m.d2.y}%` }} />
                    <div className="alh-chip alh-chip1"><i />{m.chip1}</div>
                    <div className="alh-chip alh-chip2"><i />{m.chip2}</div>
                </div>
            </div>

            {/* ── 3D сканерын тэмдэг ───────────────────────────────────── */}
            <div className="alh-badge" ref={badgeRef}>
                <svg viewBox="0 0 86 86" aria-hidden="true"><circle cx="43" cy="43" r="40" /></svg>
                <u>3D<small>СКАНЕР</small></u>
            </div>

            {/* ── гол текст ────────────────────────────────────────────── */}
            <div className="alh-copy">
                <p className="alh-eyebrow"><i />{slide.eyebrow}</p>
                <h1 className="alh-title">
                    <span className="alh-l"><b>{slide.title[0]}</b></span>
                    <span className="alh-l">
                        <b><span className="alh-u">{slide.title[1]}</span><span className="alh-red">.</span></b>
                    </span>
                </h1>
                <p className="alh-mn">{slide.mn}</p>
                <p className="alh-lead">{slide.lead}</p>
                <div className="alh-cta">
                    <Link className="alh-btn alh-btn-a" href="/booking">Үнэгүй зөвлөгөө авах</Link>
                    <Link className="alh-btn alh-btn-b" href="/services">Хэрхэн ажилладаг вэ</Link>
                </div>
            </div>

            {/* ── тоон үзүүлэлт ────────────────────────────────────────── */}
            <div className="alh-stats">
                {slide.stats.map((s) => (
                    <div key={s.label}>
                        <b>{s.num}{s.unit && <em>{s.unit}</em>}</b>
                        <span>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* ── слайдын удирдлага ────────────────────────────────────── */}
            <div className="alh-slidenav">
                {SLIDES.map((s, i) => (
                    <button
                        key={s.key}
                        type="button"
                        className={i === idx ? 'alh-sn-on' : undefined}
                        onClick={() => setIdx(i)}
                        aria-label={`${i + 1}-р слайд: ${s.mn}`}
                        aria-current={i === idx}
                    >
                        {String(i + 1).padStart(2, '0')}
                    </button>
                ))}
                <button
                    type="button"
                    className="alh-sn-next"
                    onClick={() => setIdx((i) => (i + 1) % SLIDES.length)}
                    aria-label="Дараагийн слайд"
                >
                    <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
                        <path d="M2.5 8h11M9.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
