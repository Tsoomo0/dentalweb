import type { CSSProperties, ReactElement } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   HERO GRAPHIC — зураггүй hero-д зориулсан SVG дүрсүүд
   Нэгдсэн санаа: "3D сканердаж буй объект" — нимгэн шугам, ink + улаан өргөлт.
   Бүх path нь pathLength="1" тул урт нь ялгаатай ч ижил хурдаар зурагдана.
   ═══════════════════════════════════════════════════════════════════════════ */

export type HeroFigure = 'arch' | 'tooth' | 'rings' | 'compare' | 'calendar' | 'doc' | 'pin' | 'news' | 'lock' | 'fingerprint';

/* зурагдах дараалал — path бүрт ээлжилсэн саатал */
const step = (i: number): CSSProperties => ({ '--i': i } as CSSProperties);

/* ── Шүдний нум (дээд эрүү) — байрлалыг тооцоолж үүсгэнэ ───────────────── */
function Arch() {
    const cx = 200, cy = 232, rx = 148, ry = 132;
    const teeth = Array.from({ length: 14 }, (_, i) => {
        const a = Math.PI + (i / 13) * Math.PI;
        const x = cx + rx * Math.cos(a);
        const y = cy + ry * Math.sin(a);
        const rot = (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90;
        const dMid = Math.abs(i - 6.5) / 6.5;          // 0 = урд шүд, 1 = араа
        const w = 15 + dMid * 11;
        const h = 30 - dMid * 8;
        return { x, y, rot, w, h, i };
    });

    return (
        <>
            {/* нумын чиглүүлэгч */}
            <path className="alh-gl" pathLength="1" style={step(0)}
                d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`} />
            {teeth.map((t) => (
                <rect
                    key={t.i}
                    className={t.i === 6 || t.i === 7 ? 'alh-gs alh-gs-on' : 'alh-gs'}
                    style={step(2 + t.i * 0.6)}
                    x={-t.w / 2} y={-t.h / 2} width={t.w} height={t.h} rx={t.w * 0.36}
                    transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)}) rotate(${t.rot.toFixed(1)})`}
                    pathLength="1"
                />
            ))}
            {/* хэмжилтийн шугам */}
            <path className="alh-gl alh-gl-r" pathLength="1" style={step(14)} d={`M ${cx - rx} ${cy + 34} H ${cx + rx}`} />
            <path className="alh-gl alh-gl-r" pathLength="1" style={step(14)} d={`M ${cx - rx} ${cy + 28} v 12 M ${cx + rx} ${cy + 28} v 12`} />
        </>
    );
}

/* ── Нэг шүд — сувгийн огтлолтой ──────────────────────────────────────── */
function Tooth() {
    return (
        <>
            {/* гадна тойм */}
            <path className="alh-gl alh-gl-thick" pathLength="1" style={step(0)}
                d="M200 72C168 48 108 52 96 92c-10 34 4 66 12 100 8 34 10 76 20 108 8 26 30 30 38 6 6-20 10-56 34-56s28 36 34 56c8 24 30 20 38-6 10-32 12-74 20-108 8-34 22-66 12-100-12-40-72-44-104-20z" />

            {/* сувгийн хөндий — доошоо нээлттэй тул огтлолцохгүй */}
            <path className="alh-gl" pathLength="1" style={step(3)}
                d="M138 198c-6-28-10-56 2-72 14-18 46-20 60-6 14-14 46-12 60 6 12 16 8 44 2 72" />

            {/* үндсэн суваг */}
            <path className="alh-gl alh-gl-r alh-gl-thick" pathLength="1" style={step(6)} d="M200 120v128" />
            {/* хажуугийн нарийн суваг */}
            <path className="alh-gl alh-gl-r alh-gl-thin" pathLength="1" style={step(7)} d="M166 214c-3 22-5 40-7 52" />
            <path className="alh-gl alh-gl-r alh-gl-thin" pathLength="1" style={step(7)} d="M234 214c3 22 5 40 7 52" />
            <circle className="alh-gd alh-gd-on" cx="200" cy="120" r="6" style={step(9)} />

            {/* хэмжилтийн хаалт */}
            <path className="alh-gl alh-gl-r" pathLength="1" style={step(10)} d="M330 72v238" />
            <path className="alh-gl alh-gl-r" pathLength="1" style={step(10)} d="M322 72h16 M322 310h16" />
        </>
    );
}

/* ── Сканерын тойрог + тойрч буй цэгүүд ───────────────────────────────── */
function Rings() {
    const nodes = [
        { a: -32, r: 148 }, { a: 58, r: 118 }, { a: 152, r: 148 }, { a: 232, r: 92 },
    ];
    return (
        <>
            <circle className="alh-gl alh-gspin" cx="200" cy="200" r="150" pathLength="1" style={step(0)} />
            <circle className="alh-gl alh-gl-dash" cx="200" cy="200" r="118" pathLength="1" style={step(2)} />
            <circle className="alh-gl" cx="200" cy="200" r="86" pathLength="1" style={step(4)} />
            <circle className="alh-gl alh-gl-r" cx="200" cy="200" r="54" pathLength="1" style={step(6)} />
            <path className="alh-gl alh-gl-r" pathLength="1" style={step(7)} d="M200 128v144 M128 200h144" />
            {nodes.map((n, i) => {
                const rad = (n.a * Math.PI) / 180;
                return (
                    <circle
                        key={i}
                        className={i === 0 ? 'alh-gd alh-gd-on' : 'alh-gd'}
                        cx={(200 + n.r * Math.cos(rad)).toFixed(1)}
                        cy={(200 + n.r * Math.sin(rad)).toFixed(1)}
                        r="5"
                        style={step(8 + i)}
                    />
                );
            })}
        </>
    );
}

/* ── Өмнө / дараа — хуваагдсан тойрог ─────────────────────────────────── */
function Compare() {
    return (
        <>
            <circle className="alh-gl" cx="200" cy="200" r="142" pathLength="1" style={step(0)} />
            {/* зүүн тал — судалтай (өмнө) */}
            {Array.from({ length: 11 }, (_, i) => {
                const x = 70 + i * 12;
                const half = Math.sqrt(Math.max(0, 142 * 142 - (x - 200) ** 2));
                return (
                    <path key={i} className="alh-gl alh-gl-thin" pathLength="1" style={step(2 + i * 0.5)}
                        d={`M ${x} ${(200 - half).toFixed(1)} V ${(200 + half).toFixed(1)}`} />
                );
            })}
            {/* хуваагч */}
            <path className="alh-gl alh-gl-r alh-gl-thick" pathLength="1" style={step(9)} d="M200 58v284" />
            <circle className="alh-gd alh-gd-on" cx="200" cy="200" r="16" style={step(11)} />
            {/* баруун тал — инээмсэглэлийн нум (дараа) */}
            <path className="alh-gl" pathLength="1" style={step(12)} d="M226 186c22 34 58 34 80 0" />
            <path className="alh-gl" pathLength="1" style={step(13)} d="M232 192h68" />
        </>
    );
}

/* ── Хуанли — сонгосон цагтай ─────────────────────────────────────────── */
function Calendar() {
    const cells = Array.from({ length: 28 }, (_, i) => ({
        x: 76 + (i % 7) * 36,
        y: 150 + Math.floor(i / 7) * 38,
        on: i === 16,
        i,
    }));
    return (
        <>
            <rect className="alh-gl" x="60" y="94" width="280" height="222" rx="16" pathLength="1" style={step(0)} />
            <path className="alh-gl" pathLength="1" style={step(2)} d="M60 136h280" />
            <path className="alh-gl alh-gl-r" pathLength="1" style={step(3)} d="M112 78v32 M288 78v32" />
            {cells.map((c) => (
                <rect key={c.i} className={c.on ? 'alh-gs alh-gs-on' : 'alh-gs'} style={step(4 + c.i * 0.25)}
                    x={c.x} y={c.y} width="24" height="24" rx="7" pathLength="1" />
            ))}
            <circle className="alh-gd alh-gd-on" cx={76 + (16 % 7) * 36 + 12} cy={150 + Math.floor(16 / 7) * 38 + 12} r="15" style={step(13)} />
        </>
    );
}

/* ── Анкет / баримт ───────────────────────────────────────────────────── */
function Doc() {
    return (
        <>
            <path className="alh-gl" pathLength="1" style={step(0)} d="M104 62h134l60 60v216a16 16 0 0 1-16 16H104a16 16 0 0 1-16-16V78a16 16 0 0 1 16-16z" />
            <path className="alh-gl" pathLength="1" style={step(2)} d="M238 62v60h60" />
            {[168, 200, 232, 264].map((y, i) => (
                <path key={y} className="alh-gl alh-gl-thin" pathLength="1" style={step(4 + i)}
                    d={`M124 ${y}h${i === 3 ? 96 : 152}`} />
            ))}
            <circle className="alh-gl alh-gl-r" cx="288" cy="296" r="40" pathLength="1" style={step(9)} />
            <path className="alh-gl alh-gl-r alh-gl-thick" pathLength="1" style={step(11)} d="M268 296l14 15 26-30" />
        </>
    );
}

/* ── Байршлын тэмдэг + давалгаа ───────────────────────────────────────── */
function Pin() {
    return (
        <>
            <ellipse className="alh-gl alh-gl-dash" cx="200" cy="306" rx="140" ry="42" pathLength="1" style={step(0)} />
            <ellipse className="alh-gl" cx="200" cy="306" rx="92" ry="28" pathLength="1" style={step(2)} />
            <ellipse className="alh-gl alh-gl-r" cx="200" cy="306" rx="44" ry="13" pathLength="1" style={step(4)} />
            <path className="alh-gl alh-gl-thick" pathLength="1" style={step(6)}
                d="M200 72c-45 0-82 36-82 81 0 58 82 141 82 141s82-83 82-141c0-45-37-81-82-81z" />
            <circle className="alh-gl alh-gl-r" cx="200" cy="152" r="31" pathLength="1" style={step(9)} />
            <circle className="alh-gd alh-gd-on" cx="200" cy="152" r="8" style={step(11)} />
        </>
    );
}

/* ── Мэдээний карт ─────────────────────────────────────────────────────── */
function News() {
    return (
        <>
            <rect className="alh-gl alh-gl-thin" x="92" y="76" width="216" height="140" rx="14" pathLength="1" style={step(0)} />
            <rect className="alh-gl alh-gl-thin" x="76" y="98" width="248" height="164" rx="15" pathLength="1" style={step(2)} />
            <rect className="alh-gl alh-gl-thick" x="58" y="124" width="284" height="196" rx="16" pathLength="1" style={step(4)} />
            <path className="alh-gl" pathLength="1" style={step(6)} d="M58 218h284" />
            <circle className="alh-gl alh-gl-r" cx="106" cy="171" r="22" pathLength="1" style={step(7)} />
            {[252, 280].map((y, i) => (
                <path key={y} className="alh-gl alh-gl-thin" pathLength="1" style={step(9 + i)} d={`M92 ${y}h${i === 0 ? 216 : 138}`} />
            ))}
            <circle className="alh-gd alh-gd-on" cx="106" cy="171" r="6" style={step(11)} />
        </>
    );
}

/* ── Түгжээ + сканерын тойрог (нэвтрэх хуудас) ────────────────────────── */
function Lock() {
    return (
        <>
            <circle className="alh-gl alh-gspin" cx="200" cy="200" r="168" pathLength="1" style={step(0)} />
            <circle className="alh-gl alh-gl-dash" cx="200" cy="200" r="138" pathLength="1" style={step(1)} />
            {/* нум — түгжээний гогцоо */}
            <path className="alh-gl alh-gl-thick" pathLength="1" style={step(3)}
                d="M142 176v-32a58 58 0 0 1 116 0v32" />
            {/* их бие */}
            <rect className="alh-gl alh-gl-thick" x="112" y="176" width="176" height="140" rx="26" pathLength="1" style={step(5)} />
            {/* түлхүүрийн нүх */}
            <circle className="alh-gl alh-gl-r" cx="200" cy="232" r="19" pathLength="1" style={step(8)} />
            <path className="alh-gl alh-gl-r alh-gl-thick" pathLength="1" style={step(9)} d="M200 251v28" />
            <circle className="alh-gd alh-gd-on" cx="200" cy="232" r="7" style={step(11)} />
            {/* хэмжилтийн зураас */}
            <path className="alh-gl alh-gl-r" pathLength="1" style={step(12)} d="M76 316h24 M300 316h24" />
        </>
    );
}

/* ── Хурууны хээ — нэвтрэлтийн баталгаа ───────────────────────────────── */
function Fingerprint() {
    /* Бүх нуруу (200, CY) төвтэй, ижил төвлөрсөн нуман — rx/ry өсөхөд
       оройн цэг нь дээшилнэ. Хоёр үзүүрт нь богино сүүл унжина. */
    const CY = 250;      /* дүрсийг 400×400 талбайн голд байрлуулав */
    const ridges = Array.from({ length: 9 }, (_, i) => ({
        i,
        rx: 20 + i * 15.2,
        ry: 28 + i * 18.2,
        tail: 10 + i * 6,
    }));

    return (
        <>
            {ridges.map((r) => (
                <path
                    key={r.i}
                    className={r.i === 0 ? 'alh-gl alh-gl-r alh-gl-thick' : 'alh-gl'}
                    pathLength="1"
                    style={step(r.i * 1.2)}
                    d={`M ${200 - r.rx} ${CY + r.tail} V ${CY}`
                        + ` A ${r.rx} ${r.ry} 0 0 1 ${200 + r.rx} ${CY}`
                        + ` V ${CY + r.tail}`}
                />
            ))}

            {/* тасархай богино нуруу — жинхэнэ хээ шиг */}
            <path className="alh-gl alh-gl-thin" pathLength="1" style={step(10)}
                d="M140.4 205.1 A 72.8 91.3 0 0 1 177.4 165.7" />
            <path className="alh-gl alh-gl-thin" pathLength="1" style={step(11)}
                d="M266.3 152.9 A 103.3 127.9 0 0 1 299.4 217.2" />

            {/* сканерын хөндлөн зураас + төвийн цэг */}
            <path className="alh-gl alh-gl-r" pathLength="1" style={step(12)} d="M42 196h316" />
            <path className="alh-gl alh-gl-r" pathLength="1" style={step(12)} d="M42 188v16 M358 188v16" />
            <circle className="alh-gd alh-gd-on" cx="200" cy="230" r="6" style={step(14)} />
        </>
    );
}

const FIGURES: Record<HeroFigure, () => ReactElement> = {
    arch: Arch, tooth: Tooth, rings: Rings, compare: Compare,
    calendar: Calendar, doc: Doc, pin: Pin, news: News, lock: Lock, fingerprint: Fingerprint,
};

export default function HeroGraphic({ figure }: { figure: HeroFigure }) {
    const Figure = FIGURES[figure];
    return (
        <svg className="alh-gsvg" viewBox="0 0 400 400" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
            <Figure />
        </svg>
    );
}
