import { Head, Link } from '@inertiajs/react';
import PublicLayout from '@/layouts/public-layout';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES — backend-ээс ирэх жинхэнэ өгөгдөл (about() нь зөвхөн stats дамжуулна)
   ═══════════════════════════════════════════════════════════════════════════ */
interface PageProps {
    stats: { doctors: number; appointments: number; branches: number };
}

/* ═══════════════════════════════════════════════════════════════════════════
   ЖИЖИГ ТУСЛАХ КОМПОНЕНТУУД
   ═══════════════════════════════════════════════════════════════════════════ */
const RED = '#c81e3a';

const glassPanel =
    'rounded-[30px] border border-white/70 bg-white/50 shadow-[0_14px_40px_rgba(120,30,50,0.06)] backdrop-blur-xl';

const STRIPE = 'repeating-linear-gradient(45deg,#f3eceb,#f3eceb 11px,#eee3e2 11px,#eee3e2 22px)';

function SectionBadge({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-4 inline-flex items-center gap-2 rounded-[30px] border border-[#c81e3a]/20 bg-[#c81e3a]/10 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#c81e3a] shadow-[0_8px_20px_rgba(120,30,50,0.1)] backdrop-blur-md">
            <span className="h-[7px] w-[7px] rounded-full bg-[#c81e3a]" />
            {children}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   СТАТИК КОНТЕНТ — дизайны эх сурвалжаас
   ═══════════════════════════════════════════════════════════════════════════ */
const VALUES = [
    { icon: '✥', title: 'Мэргэжлийн хамт олон', text: 'Бид салбартаа тэргүүлэх чадвартай, олон жилийн туршлагатай эмч нартай.' },
    { icon: '◍', title: 'Орчин үеийн технологи', text: 'Сүүлийн үеийн дэвшилтэт техник, тоног төхөөрөмж ашиглан таныг эмчилнэ.' },
    { icon: '♡', title: 'Хүнлэг харьцаа', text: 'Өвчтөн бүртэй хүндэтгэлтэй, тэвчээртэй, айдасгүй орчинд харьцана.' },
];

const BRANCHES = [
    { name: 'Сансар салбар', addr: 'БЗД, Сансар, Их дэлгүүрийн зүүн талд', phone: '+976 7700 8899' },
    { name: 'Хороолол салбар', addr: 'СБД, 1-р хороолол, 32-ын тойрон', phone: '+976 7701 8899' },
    { name: 'Цамбагарав салбар', addr: 'СХД, Цамбагарав зам дагуу', phone: '+976 7702 8899' },
    { name: 'Яармаг салбар', addr: 'ХУД, Яармаг, шинэ замын эхэнд', phone: '+976 7703 8899' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function About({ stats = { doctors: 0, appointments: 0, branches: 0 } }: PageProps) {
    /* жинхэнэ stats-аас бүтсэн тоонууд (хоосон үед дизайн эвдрэхгүйн тулд fallback) */
    const statCards = [
        { num: '10+', label: 'жилийн туршлага' },
        { num: `${stats.doctors > 0 ? stats.doctors : 25}+`, label: 'мэргэжлийн эмч' },
        { num: `${stats.branches > 0 ? stats.branches : 4}`, label: 'салбар' },
    ];

    return (
        <PublicLayout>
            <Head title="Бидний тухай — Кутикул" />

            {/* ── HERO — Манай зорилго ─────────────────────────────────────── */}
            <div className="relative mt-6 overflow-hidden rounded-[32px] border border-white/70 shadow-[0_18px_50px_rgba(120,30,50,0.14)]">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 84% 20%, rgba(255,255,255,.2), transparent 48%), linear-gradient(125deg,#d62a48 0%,#b01533 52%,#7d1226 100%)' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg,rgba(20,6,10,.34) 0%,rgba(20,6,10,.04) 60%,transparent 100%)' }} />
                <div className="relative z-[3] grid items-center gap-10 p-8 sm:p-14 lg:grid-cols-[1.04fr_0.96fr]">
                    <div>
                        <div className="mb-5 inline-flex items-center gap-2 rounded-[40px] bg-white/85 px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.05em] text-[#c81e3a]">✦ Манай зорилго</div>
                        <h1 className="mb-4 font-onest text-[30px] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[40px]">
                            Инээмсэглэл бүрийн<br />төлөө бид
                        </h1>
                        <p className="max-w-[520px] text-[16px] leading-[1.65] text-white/90 sm:text-[17px]">
                            «Кутикул» эрүү, нүүр ам, гажиг, согог заслын шүдний эмнэлэг нь 2012 оноос одоог хүртэл 10 гаруй жил үйл ажиллагаагаа тасралтгүй явуулж байна. Таны инээмсэглэл бол биднийг өдөр бүр урамшуулдаг зүйл.
                        </p>
                    </div>
                    <div className="relative min-h-[300px] sm:min-h-[380px]">
                        {/* glow + rings */}
                        <div className="absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle,rgba(255,225,230,.4),transparent 65%)', filter: 'blur(8px)', animation: 'cuticulPulseGlow 6s ease-in-out infinite' }} />
                        <div className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-dashed border-white/30" style={{ animation: 'cuticulSpinSlow 44s linear infinite' }} />
                        {/* portrait placeholder */}
                        <div className="relative mx-auto flex h-[300px] w-[250px] items-center justify-center overflow-hidden rounded-[24px] border border-white/50 text-[13px] font-medium text-white/80 shadow-[0_24px_60px_rgba(60,8,18,0.4)] sm:h-[360px] sm:w-[300px]" style={{ background: 'repeating-linear-gradient(45deg,rgba(255,255,255,.16),rgba(255,255,255,.16) 12px,rgba(255,255,255,.07) 12px,rgba(255,255,255,.07) 24px)', animation: 'cuticulFloatyA 7s ease-in-out infinite' }}>
                            эмнэлгийн зураг
                        </div>
                        {/* floating chips */}
                        <div className="absolute left-[-6px] top-[30px] flex items-center gap-2.5 rounded-[15px] bg-white/95 px-4 py-2.5 shadow-[0_14px_30px_rgba(60,8,18,0.28)]" style={{ animation: 'cuticulFloatyA 6.5s ease-in-out infinite' }}>
                            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-[#fbeef0] font-onest text-[14px] font-bold text-[#c81e3a]">✥</span>
                            <span className="text-[13px] font-bold text-[#1c1a1b]">Мэргэжлийн баг</span>
                        </div>
                        <div className="absolute bottom-[48px] right-[-4px] flex items-center gap-2.5 rounded-[15px] bg-white/95 px-4 py-2.5 shadow-[0_14px_30px_rgba(60,8,18,0.28)]" style={{ animation: 'cuticulFloatyA 8s ease-in-out infinite' }}>
                            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-[#fbeef0] font-onest text-[13px] font-bold text-[#c81e3a]">◍</span>
                            <span className="text-[13px] font-bold text-[#1c1a1b]">Орчин үеийн технологи</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── VALUES ───────────────────────────────────────────────────── */}
            <div className={`mt-7 p-7 sm:p-11 ${glassPanel}`}>
                <div className="mb-8 text-center">
                    <div className="flex justify-center"><SectionBadge>Бидний үнэт зүйл</SectionBadge></div>
                    <h2 className="font-onest text-[28px] font-extrabold tracking-tight sm:text-[36px]">Биднийг тодотгох зүйлс</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {VALUES.map((v) => (
                        <div key={v.title} className="rounded-[22px] border border-[#f1e8e7] bg-white p-7 shadow-[0_1px_2px_rgba(120,30,50,0.04)]">
                            <div className="mb-4 flex h-[50px] w-[50px] items-center justify-center rounded-[14px] font-onest text-[22px] font-bold text-[#c81e3a]" style={{ background: 'linear-gradient(150deg,#fde9ec,#fbd9df)' }}>{v.icon}</div>
                            <h3 className="mb-2 font-onest text-[18px] font-bold text-[#1c1a1b]">{v.title}</h3>
                            <p className="text-[14px] leading-[1.62] text-[#6b6360]">{v.text}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── STATS ────────────────────────────────────────────────────── */}
            <div className="mt-7 overflow-hidden rounded-[30px] p-8 text-white shadow-[0_18px_50px_rgba(120,30,50,0.18)] sm:p-11" style={{ background: 'linear-gradient(125deg,#c81e3a,#9e1730)' }}>
                <div className="grid grid-cols-1 gap-5 text-center sm:grid-cols-3">
                    {statCards.map((s) => (
                        <div key={s.label} className="py-2">
                            <div className="mb-1.5 font-onest text-[40px] font-extrabold tracking-tight sm:text-[44px]">{s.num}</div>
                            <div className="text-[14px] font-medium text-white/85">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── BRANCHES ─────────────────────────────────────────────────── */}
            <div className={`mt-7 p-7 sm:p-11 ${glassPanel}`}>
                <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <SectionBadge>Салбарууд</SectionBadge>
                        <h2 className="font-onest text-[28px] font-extrabold tracking-tight sm:text-[36px]">Танд ойрхон салбар</h2>
                    </div>
                    <Link href="/contact" className="whitespace-nowrap text-[14px] font-bold text-[#c81e3a]">Байршил харах →</Link>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {BRANCHES.map((b) => (
                        <div key={b.name} className="overflow-hidden rounded-[22px] border border-[#f1e8e7] bg-white shadow-[0_1px_2px_rgba(120,30,50,0.04)]">
                            <div className="flex aspect-[4/3] w-full items-center justify-center text-[11px] font-medium text-[#b3a7a3]" style={{ background: STRIPE }}>салбарын зураг</div>
                            <div className="p-[18px]">
                                <h3 className="mb-1.5 font-onest text-[17px] font-bold text-[#1c1a1b]">{b.name}</h3>
                                <p className="mb-1 text-[13px] leading-[1.55] text-[#6b6360]">{b.addr}</p>
                                <p className="text-[13px] font-semibold text-[#c81e3a]">{b.phone}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── CTA ──────────────────────────────────────────────────────── */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-7 rounded-[30px] bg-[#1c1a1b]/95 px-8 py-12 text-white sm:px-12">
                <div>
                    <h2 className="mb-2.5 font-onest text-[26px] font-extrabold leading-[1.15] sm:text-[32px]">Эрүүл инээмсэглэлээ бидэнд даатгаарай</h2>
                    <p className="max-w-[480px] text-[15px] leading-[1.6] text-[#b6aeac]">Анхны үзлэгийн цагаа онлайнаар захиалж, манай мэргэжлийн багтай танилцаарай.</p>
                </div>
                <Link href="/booking" className="whitespace-nowrap rounded-[14px] bg-[#c81e3a] px-7 py-4 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(200,30,58,0.35)]">Цаг захиалах →</Link>
            </div>
        </PublicLayout>
    );
}
