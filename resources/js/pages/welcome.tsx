import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect, type CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import PublicLayout from '@/layouts/public-layout';

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
interface PageProps {
    doctors: Doctor[];
    treatments: TreatmentCategory[];
    gallery: GalleryItem[];
    branches: Branch[];
    faqs: Faq[];
}

/* ═══════════════════════════════════════════════════════════════════════════
   ЖИЖИГ ТУСЛАХ КОМПОНЕНТУУД
   ═══════════════════════════════════════════════════════════════════════════ */
const RED = '#c81e3a';

/* зураг байхгүй үед — судалтай орлуулагч */
function Placeholder({ label, className = '', style }: { label: string; className?: string; style?: CSSProperties }) {
    return (
        <div
            className={`flex items-center justify-center text-center text-[12px] font-medium text-[#b3a7a3] ${className}`}
            style={{ background: 'repeating-linear-gradient(45deg,#f3eceb,#f3eceb 11px,#eee3e2 11px,#eee3e2 22px)', ...style }}
        >
            {label}
        </div>
    );
}

function SectionBadge({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-4 inline-flex items-center gap-2 rounded-[30px] border border-[#c81e3a]/20 bg-[#c81e3a]/10 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#c81e3a] shadow-[0_8px_20px_rgba(120,30,50,0.1)] backdrop-blur-md">
            <span className="h-[7px] w-[7px] rounded-full bg-[#c81e3a]" />
            {children}
        </div>
    );
}

/* glass card-н нийтлэг хүрээ */
const glassPanel =
    'rounded-[30px] border border-white/70 bg-white/50 shadow-[0_14px_40px_rgba(120,30,50,0.06)] backdrop-blur-xl';

/* ═══════════════════════════════════════════════════════════════════════════
   HERO — анимэйшнтэй tooth scene-ууд (статик контент)
   ═══════════════════════════════════════════════════════════════════════════ */
const Ring = () => (
    <>
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle,rgba(255,225,230,.5),transparent 65%)', filter: 'blur(8px)', animation: 'cuticulPulseGlow 6s ease-in-out infinite' }} />
        <div className="absolute left-1/2 top-1/2 h-[296px] w-[296px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/30" style={{ animation: 'cuticulSpinSlow 38s linear infinite' }} />
        <div className="absolute left-1/2 top-1/2 h-[228px] w-[228px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" style={{ animation: 'cuticulSpinRev 28s linear infinite' }} />
    </>
);

function WhiteningScene() {
    const tooth: CSSProperties = { animation: 'cuticulWhiten 4s ease-in-out infinite' };
    return (
        <div className="relative flex h-[166px] w-[140px] items-center justify-center" style={{ animation: 'cuticulFloatyA 6s ease-in-out infinite' }}>
            <div className="relative h-[166px] w-[140px] overflow-hidden" style={{ filter: 'drop-shadow(0 16px 30px rgba(80,10,25,.32))' }}>
                <div className="absolute bottom-[2px] left-[30px] h-[78px] w-[36px]" style={{ ...tooth, borderRadius: '14px 14px 60% 60% / 14px 14px 42% 42%', boxShadow: 'inset 0 -11px 14px rgba(150,108,66,.22)' }} />
                <div className="absolute bottom-[2px] right-[30px] h-[78px] w-[36px]" style={{ ...tooth, borderRadius: '14px 14px 60% 60% / 14px 14px 42% 42%', boxShadow: 'inset 0 -11px 14px rgba(150,108,66,.22)' }} />
                <div className="absolute left-[16px] top-0 h-[94px] w-[108px]" style={{ ...tooth, borderRadius: '50% 50% 38% 38% / 60% 60% 46% 46%', boxShadow: 'inset 0 -13px 20px rgba(150,108,66,.22), inset 0 11px 16px rgba(255,255,255,.6)' }} />
                <div className="absolute left-[34px] top-[14px] z-[2] h-[30px] w-[38px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(255,255,255,.9),transparent 72%)', filter: 'blur(1px)' }} />
                <div className="absolute left-0 top-[-20px] z-[3] h-[210px] w-[34px]" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.8),transparent)', transform: 'rotate(20deg)', animation: 'cuticulSweepGloss 4s ease-in-out infinite' }} />
            </div>
            <div className="absolute right-0 top-[-8px] text-[24px] text-white" style={{ animation: 'cuticulTwinkle 2s ease-in-out infinite' }}>✦</div>
            <div className="absolute right-[-16px] top-[42px] text-[15px] text-white" style={{ animation: 'cuticulTwinkle 2.6s ease-in-out infinite .5s' }}>✦</div>
            <div className="absolute left-[-14px] top-[16px] text-[13px] text-white" style={{ animation: 'cuticulTwinkle 2.2s ease-in-out infinite 1s' }}>✦</div>
        </div>
    );
}

function ImplantScene() {
    const crown: CSSProperties = { background: 'linear-gradient(160deg,#ffffff,#ece5e1)' };
    return (
        <div className="relative h-[240px] w-[200px]">
            <div className="absolute bottom-0 left-1/2 ml-[-92px] h-[50px] w-[184px] rounded-[26px]" style={{ background: 'linear-gradient(180deg,#ef9aa8,#df7688)' }} />
            <div className="absolute bottom-[36px] left-1/2 ml-[-13px] h-[80px] w-[26px]" style={{ borderRadius: '6px 6px 4px 4px', background: 'repeating-linear-gradient(0deg,#dcd5d2,#dcd5d2 5px,#b3aaa6 5px,#b3aaa6 10px)', boxShadow: '0 4px 10px rgba(80,10,25,.25)' }} />
            <div className="absolute left-1/2 top-0 ml-[-58px] h-[150px] w-[116px]" style={{ animation: 'cuticulImplantDrop 4.2s ease-in-out infinite', filter: 'drop-shadow(0 14px 24px rgba(80,10,25,.32))' }}>
                <div className="absolute bottom-0 left-[18px] h-[70px] w-[34px]" style={{ ...crown, borderRadius: '13px 13px 58% 58% / 13px 13px 40% 40%', boxShadow: 'inset 0 -10px 13px rgba(150,108,66,.2)' }} />
                <div className="absolute bottom-0 right-[18px] h-[70px] w-[34px]" style={{ ...crown, borderRadius: '13px 13px 58% 58% / 13px 13px 40% 40%', boxShadow: 'inset 0 -10px 13px rgba(150,108,66,.2)' }} />
                <div className="absolute left-[4px] top-0 h-[90px] w-[108px]" style={{ ...crown, borderRadius: '50% 50% 38% 38% / 60% 60% 46% 46%', boxShadow: 'inset 0 -13px 20px rgba(150,108,66,.2), inset 0 11px 16px rgba(255,255,255,.7)' }} />
                <div className="absolute left-[24px] top-[14px] h-[28px] w-[36px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(255,255,255,.92),transparent 72%)', filter: 'blur(1px)' }} />
                <div className="absolute left-1/2 top-[30px] z-[3] ml-[-10px] text-[20px] text-[#ffd9df]" style={{ animation: 'cuticulClickPop 4.2s ease-in-out infinite' }}>✦</div>
            </div>
        </div>
    );
}

function BracesScene() {
    const stras = ['cuticulStraA', 'cuticulStraB', 'cuticulStraC', 'cuticulStraD', 'cuticulStraE'];
    return (
        <div className="relative flex h-[90px] w-[248px] items-end justify-center gap-[7px]" style={{ filter: 'drop-shadow(0 14px 24px rgba(80,10,25,.3))' }}>
            <div className="absolute left-[8px] right-[8px] top-[30px] z-[3] h-[4px] rounded-[3px] bg-white/90" style={{ boxShadow: '0 0 8px rgba(255,255,255,.5)' }} />
            {stras.map((a, i) => (
                <div key={i} className="relative h-[58px] w-[38px] origin-bottom" style={{ animation: `${a} 5s ease-in-out infinite` }}>
                    <div className="h-[52px] w-[38px]" style={{ borderRadius: '46% 46% 28% 28% / 56% 56% 32% 32%', background: 'linear-gradient(160deg,#ffffff,#ebe4e0)', boxShadow: 'inset 0 -8px 12px rgba(150,108,66,.18), inset 0 6px 9px rgba(255,255,255,.6)' }} />
                    <div className="absolute left-1/2 top-[16px] ml-[-7px] h-[11px] w-[14px] rounded-[3px] bg-[#c9bfbb]" />
                </div>
            ))}
        </div>
    );
}

const HERO_SLIDES = [
    { badge: 'Цайруулалт', grad: 'radial-gradient(circle at 82% 20%, rgba(255,255,255,.20), transparent 44%), linear-gradient(125deg, #d62a48 0%, #b01533 48%, #7d1226 100%)', text: 'Өдөр бүрийн кофе, цай, хүнсний нөлөөгөөр өөрчлөгдсөн шүдний өнгийг аюулгүй аргаар цайруулж, инээмсэглэлд тань шинэ өнгө төрх бэлэглэнэ.', scene: <WhiteningScene /> },
    { badge: 'Имплант', grad: 'radial-gradient(circle at 80% 22%, rgba(255,255,255,.20), transparent 44%), linear-gradient(125deg, #d9543c 0%, #b8351f 50%, #872312 100%)', text: 'Алдагдсан шүд зөвхөн инээмсэглэлд биш, өдөр тутмын амьдралд нөлөөлдөг. Имплант эмчилгээ нь байгалийн шүдтэй ойролцоо мэдрэмж, тав тухыг эргүүлэн авчрах орчин үеийн шийдэл юм.', scene: <ImplantScene /> },
    { badge: 'Гажиг засал', grad: 'radial-gradient(circle at 82% 20%, rgba(255,255,255,.20), transparent 44%), linear-gradient(125deg, #c0274f 0%, #951a3c 50%, #650f2a 100%)', text: 'Шүдний зөв байрлал нь зөвхөн гоо сайхан биш, эрүүл инээмсэглэлийн үндэс юм. Гажиг заслын эмчилгээ нь шүдийг зөв байрлалд оруулж, өөртөө итгэх итгэлийг нэмэгдүүлдэг.', scene: <BracesScene /> },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Welcome({ doctors = [], treatments = [], gallery = [], branches = [], faqs = [] }: PageProps) {
    /* ── Hero slider ── */
    const [hero, setHero] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setHero((h) => (h + 1) % HERO_SLIDES.length), 5500);
        return () => clearInterval(t);
    }, []);
    const go = (n: number) => setHero((HERO_SLIDES.length + (n % HERO_SLIDES.length)) % HERO_SLIDES.length);

    /* ── Services (жинхэнэ эмчилгээ) ── */
    const allTreatments = treatments.flatMap((c) => c.treatments.map((t) => ({ ...t, category: c.name })));
    const serviceCards = allTreatments.slice(0, 5);

    /* ── Doctors (салбараар шүүх) ── */
    const [docBranch, setDocBranch] = useState<number | null>(branches[0]?.id ?? null);
    const branchDoctors = docBranch == null ? doctors : doctors.filter((d) => d.branch_id === docBranch);

    /* ── Results (gallery, ангилалаар) ── */
    const galleryCats = Array.from(new Set(gallery.map((g) => g.category_name).filter(Boolean))) as string[];
    const resTabs = ['Бүгд', ...galleryCats];
    const [resCat, setResCat] = useState(0);
    const shownResults = (resCat === 0 ? gallery : gallery.filter((g) => g.category_name === resTabs[resCat])).slice(0, 6);
    const [cmp, setCmp] = useState<Record<number, number>>({});
    const posOf = (id: number) => cmp[id] ?? 50;

    /* ── FAQ ── */
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const showFaqs = faqs.length > 0;

    /* ── Appointment widget ── */
    const [apBranch, setApBranch] = useState<number | null>(branches[0]?.id ?? null);
    const apDoctors = apBranch == null ? doctors : doctors.filter((d) => d.branch_id === apBranch);
    const [apDoc, setApDoc] = useState<number | null>(apDoctors[0]?.id ?? null);
    const today = new Date();
    const [apDay, setApDay] = useState<number | null>(null);
    const [apTime, setApTime] = useState<string | null>(null);
    const SAMPLE_TIMES = ['09:30', '11:00', '13:30', '15:00', '16:30'];

    const selBranchObj = branches.find((b) => b.id === apBranch);
    const selDocObj = apDoctors.find((d) => d.id === apDoc);
    const monthNames = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
    const y = today.getFullYear(), m = today.getMonth();
    const firstOffset = (new Date(y, m, 1).getDay() + 6) % 7; // Даваа эхэлсэн
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const canConfirm = apDoc != null && apDay != null && apTime != null;
    const goBooking = () => router.visit('/booking');

    /* fallback (хоосон үед дизайн эвдрэхгүйн тулд) */
    const showServices = serviceCards.length > 0;
    const showDoctors = branchDoctors.length > 0;
    const showResults = shownResults.length > 0;

    return (
        <PublicLayout>
            <Head title="Кутикул шүдний эмнэлэг" />

            {/* ── HERO SLIDER ──────────────────────────────────────────────── */}
            <div className="relative mt-6 h-[440px] overflow-hidden rounded-[26px] shadow-[0_24px_60px_rgba(120,30,50,0.16)] sm:h-[600px] sm:rounded-[32px]">
                {HERO_SLIDES.map((s, i) => (
                    <div
                        key={i}
                        className="absolute inset-0 transition-opacity duration-700"
                        style={{ opacity: i === hero ? 1 : 0, zIndex: i === hero ? 5 : 1, pointerEvents: i === hero ? 'auto' : 'none' }}
                    >
                        <div className="absolute inset-0" style={{ background: s.grad }} />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg,rgba(20,6,10,.34) 0%,rgba(20,6,10,.05) 55%,transparent 100%)' }} />
                        {/* right scene */}
                        <div className="absolute bottom-0 right-0 top-0 z-[6] hidden w-[46%] min-w-[400px] items-center justify-center md:flex">
                            <div className="relative flex h-[320px] w-[320px] items-center justify-center">
                                <Ring />
                                {s.scene}
                            </div>
                        </div>
                        {/* text panel */}
                        <div className="absolute left-4 top-1/2 z-[9] max-w-[300px] -translate-y-1/2 rounded-[20px] border border-white/35 bg-white/15 p-5 backdrop-blur-xl sm:left-12 sm:max-w-[460px] sm:rounded-[26px] sm:p-8">
                            <div className="mb-3.5 inline-flex items-center gap-2 rounded-[40px] bg-white/85 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#c81e3a] sm:mb-5 sm:px-3.5 sm:py-2 sm:text-[12px]">✦ {s.badge}</div>
                            <p className="mb-4 text-[13px] leading-[1.6] text-white/90 sm:mb-6 sm:max-w-[400px] sm:text-[15px]">{s.text}</p>
                            <div className="flex flex-wrap gap-2.5 sm:gap-3">
                                <Link href="/booking" className="rounded-[12px] bg-[#c81e3a] px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(200,30,58,0.35)] sm:rounded-[14px] sm:px-6 sm:py-3.5 sm:text-[15px]">Цаг захиалах →</Link>
                                <Link href="/services" className="rounded-[12px] bg-white/90 px-4 py-2.5 text-[13px] font-bold text-[#1c1a1b] sm:rounded-[14px] sm:px-6 sm:py-3.5 sm:text-[15px]">Үйлчилгээ</Link>
                            </div>
                        </div>
                    </div>
                ))}

                {/* floating chips */}
                <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-[8] hidden w-[46%] min-w-[400px] md:block">
                    <div className="absolute right-6 top-[84px] flex items-center gap-2.5 rounded-[15px] bg-white/95 px-4 py-2.5 shadow-[0_14px_30px_rgba(80,10,25,0.22)]" style={{ animation: 'cuticulFloatyB 6.5s ease-in-out infinite' }}>
                        <span className="flex h-[25px] w-[25px] items-center justify-center rounded-lg bg-[#fbeef0] text-[13px] font-bold text-[#c81e3a]">✦</span>
                        <span className="text-[13px] font-bold text-[#1c1a1b]">Найрсаг, зөөлөн хандлага</span>
                    </div>
                    <div className="absolute bottom-20 right-10 flex items-center gap-2.5 rounded-[15px] bg-white/95 px-4 py-2.5 shadow-[0_14px_30px_rgba(80,10,25,0.22)]" style={{ animation: 'cuticulFloatyA 7.5s ease-in-out infinite' }}>
                        <span className="flex h-[25px] w-[25px] items-center justify-center rounded-lg bg-[#fbeef0] text-[13px] font-bold text-[#c81e3a]">◍</span>
                        <span className="text-[13px] font-bold text-[#1c1a1b]">Орчин үеийн технологи</span>
                    </div>
                </div>

                {/* arrows */}
                <button onClick={() => go(hero - 1)} className="absolute bottom-7 left-6 z-20 flex h-[46px] w-[46px] items-center justify-center rounded-[14px] border border-white/70 bg-white/55 font-onest text-[20px] text-[#1c1a1b] backdrop-blur-md">‹</button>
                <button onClick={() => go(hero + 1)} className="absolute bottom-7 left-[80px] z-20 flex h-[46px] w-[46px] items-center justify-center rounded-[14px] border border-white/70 bg-white/55 font-onest text-[20px] text-[#1c1a1b] backdrop-blur-md">›</button>
                {/* dots */}
                <div className="absolute bottom-[34px] right-8 z-20 flex gap-2.5">
                    {HERO_SLIDES.map((_, i) => (
                        <button key={i} onClick={() => go(i)} className="h-[9px] rounded-[20px] transition-all" style={{ width: i === hero ? 26 : 9, background: i === hero ? '#fff' : 'rgba(255,255,255,.55)' }} />
                    ))}
                </div>
            </div>

            {/* ── FEATURE BAND ─────────────────────────────────────────────── */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                    { n: '01', t: 'Арав гаруй жил ажилласан', d: '2012 оноос хойш үйлчилгээ үзүүлж ирсэн. Туршлагатай хамт олон.' },
                    { n: '02', t: 'Шинэ тоног төхөөрөмж', d: '3D сканнер, дижитал рентгенийг ашиглан таны шүдэнд нарийн оношилгоо хийнэ.' },
                    { n: '03', t: 'Цагийн хувьд уян хатан', d: 'Амралтын өдрүүдэд ч нээлттэй. Ажил, сургуультайгаа зохицуулаад ирээрэй.' },
                ].map((f) => (
                    <div key={f.n} className="rounded-[22px] border border-white/75 bg-white/60 p-7 shadow-[0_10px_30px_rgba(120,30,50,0.05)] backdrop-blur-lg">
                        <div className="mb-3 font-onest text-[30px] font-extrabold text-[#f0b8c1]">{f.n}</div>
                        <h3 className="mb-2 font-onest text-[19px] font-bold text-[#1c1a1b]">{f.t}</h3>
                        <p className="text-[14px] leading-[1.65] text-[#6b6360]">{f.d}</p>
                    </div>
                ))}
            </div>

            {/* ── SERVICES ─────────────────────────────────────────────────── */}
            {showServices && (
                <div className={`mt-10 p-5 sm:p-11 ${glassPanel}`}>
                    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <SectionBadge>Эмчилгээ үйлчилгээ</SectionBadge>
                            <h2 className="font-onest text-[22px] font-extrabold tracking-tight sm:text-[40px]">Бидний санал болгох үйлчилгээ</h2>
                        </div>
                        <Link href="/services" className="whitespace-nowrap text-[14px] font-bold text-[#c81e3a]">Бүх үйлчилгээ →</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                        {serviceCards.map((sv) => (
                            <Link key={sv.id} href="/services" className="group overflow-hidden rounded-[20px] border border-[#f1e8e7] bg-white shadow-[0_1px_2px_rgba(120,30,50,0.04)] transition-all hover:-translate-y-1 hover:border-[#f4d4da] hover:shadow-[0_16px_36px_rgba(120,30,50,0.13)]">
                                {sv.image_url ? (
                                    <img src={sv.image_url} alt={sv.title} className="aspect-square w-full object-cover" />
                                ) : (
                                    <Placeholder label={sv.title} className="aspect-square w-full px-2" />
                                )}
                                <div className="p-4">
                                    <h3 className="mb-1.5 font-onest text-[16px] font-bold tracking-tight">{sv.title}</h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[12px] font-medium text-[#9a918d]">{sv.category}</span>
                                        <span className="text-[14px] font-bold text-[#c81e3a]">→</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ── DOCTORS ──────────────────────────────────────────────────── */}
            {showDoctors && (
                <div className={`mt-7 p-5 sm:p-11 ${glassPanel}`}>
                    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <SectionBadge>Эмч нар</SectionBadge>
                            <h2 className="font-onest text-[22px] font-extrabold sm:text-[40px]">Туршлагатай эмч нарын баг</h2>
                        </div>
                        <Link href="/doctors" className="whitespace-nowrap text-[14px] font-bold text-[#c81e3a]">Бүх эмч →</Link>
                    </div>
                    {branches.length > 1 && (
                        <div className="mb-6 flex flex-wrap gap-2.5">
                            {branches.map((b) => {
                                const on = b.id === docBranch;
                                return (
                                    <button key={b.id} onClick={() => setDocBranch(b.id)} className="rounded-[40px] border-[1.5px] px-4 py-2 text-[14px] font-semibold transition-all" style={{ borderColor: on ? RED : '#ece6e5', background: on ? RED : 'rgba(255,255,255,.6)', color: on ? '#fff' : '#6b6360' }}>
                                        {b.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {branchDoctors.slice(0, 8).map((d) => (
                            <Link key={d.id} href="/doctors" className="rounded-[22px] border border-white/75 bg-white/60 p-3.5 shadow-[0_10px_30px_rgba(120,30,50,0.06)] backdrop-blur-lg">
                                {d.photo_url ? (
                                    <img src={d.photo_url} alt={d.name} className="mb-3.5 aspect-[1/1.12] w-full rounded-2xl object-cover" />
                                ) : (
                                    <Placeholder label="эмчийн зураг" className="mb-3.5 aspect-[1/1.12] w-full rounded-2xl" />
                                )}
                                <div className="px-1.5 pb-2">
                                    <div className="font-onest text-[17px] font-bold">{d.name}</div>
                                    <div className="text-[13px] font-medium text-[#c81e3a]">{d.specialization || 'Шүдний эмч'}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ── RESULTS (before / after) ─────────────────────────────────── */}
            {showResults && (
                <div className={`mt-7 p-5 sm:p-11 ${glassPanel}`}>
                    <div className="mb-6 text-center">
                        <div className="flex justify-center"><SectionBadge>Үр дүн</SectionBadge></div>
                        <h2 className="font-onest text-[22px] font-extrabold sm:text-[40px]">Өмнө ба дараа</h2>
                    </div>
                    {resTabs.length > 1 && (
                        <div className="mb-7 flex flex-wrap justify-center gap-2.5">
                            {resTabs.map((t, i) => {
                                const on = i === resCat;
                                return (
                                    <button key={t} onClick={() => setResCat(i)} className="rounded-[40px] border-[1.5px] px-4 py-2 text-[14px] font-semibold transition-all" style={{ borderColor: on ? RED : '#ece6e5', background: on ? RED : 'rgba(255,255,255,.6)', color: on ? '#fff' : '#6b6360' }}>
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {shownResults.map((r) => {
                            const pos = posOf(r.id);
                            return (
                                <div key={r.id}>
                                    <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-[#ece6e5] shadow-[0_10px_30px_rgba(120,30,50,0.06)]">
                                        {/* after (base) */}
                                        {r.after_url ? (
                                            <img src={r.after_url} alt="дараа" className="absolute inset-0 h-full w-full object-cover" />
                                        ) : (
                                            <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg,#fbeef0,#fbeef0 10px,#f6dfe3 10px,#f6dfe3 20px)' }} />
                                        )}
                                        {/* before (clipped overlay) */}
                                        {r.before_url ? (
                                            <img src={r.before_url} alt="өмнө" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
                                        ) : (
                                            <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg,#ece4e2,#ece4e2 10px,#e1d6d3 10px,#e1d6d3 20px)', clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
                                        )}
                                        <div className="absolute left-3 top-3 rounded-[30px] bg-white/85 px-2.5 py-1.5 text-[11px] font-bold text-[#6b6360]">Өмнө</div>
                                        <div className="absolute right-3 top-3 rounded-[30px] bg-white/85 px-2.5 py-1.5 text-[11px] font-bold text-[#c81e3a]">Дараа</div>
                                        <div className="pointer-events-none absolute bottom-0 top-0 w-[3px] -translate-x-1/2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.25)]" style={{ left: `${pos}%` }} />
                                        <div className="pointer-events-none absolute top-1/2 flex h-[38px] w-[38px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white font-onest text-[14px] font-bold text-[#c81e3a] shadow-[0_4px_12px_rgba(0,0,0,0.22)]" style={{ left: `${pos}%` }}>⇆</div>
                                        <input type="range" min={0} max={100} value={pos} onChange={(e) => setCmp((c) => ({ ...c, [r.id]: +e.target.value }))} className="cuticul-range absolute inset-0 m-0 h-full w-full cursor-ew-resize opacity-0" />
                                    </div>
                                    {r.title && <div className="px-1 pt-3.5 text-[15px] font-semibold">{r.title}</div>}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-5 text-center text-[13px] font-medium text-[#9a918d]">← Гулсуулж өмнө/дарааг харьцуулна уу →</div>
                </div>
            )}

            {/* ── FAQ ──────────────────────────────────────────────────────── */}
            {showFaqs && (
                <div className={`mt-7 p-5 sm:p-11 ${glassPanel}`}>
                    <div className="mb-7 text-center">
                        <div className="flex justify-center"><SectionBadge>Түгээмэл асуулт</SectionBadge></div>
                        <h2 className="font-onest text-[22px] font-extrabold sm:text-[40px]">Асуулт хариулт</h2>
                    </div>
                    <div className="mx-auto flex max-w-[800px] flex-col gap-3">
                        {faqs.map((f, i) => {
                            const open = openFaq === i;
                            return (
                                <div
                                    key={f.id}
                                    className="overflow-hidden rounded-[18px] border bg-white/70 backdrop-blur-md transition-all"
                                    style={{ borderColor: open ? '#f4d4da' : '#f1e8e7', boxShadow: open ? '0 12px 30px rgba(120,30,50,0.08)' : 'none' }}
                                >
                                    <button
                                        onClick={() => setOpenFaq(open ? null : i)}
                                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                                    >
                                        <span className="font-onest text-[16px] font-bold text-[#1c1a1b] sm:text-[17px]">{f.question}</span>
                                        <span
                                            className="flex h-8 w-8 flex-none items-center justify-center rounded-full transition-all"
                                            style={{ background: open ? RED : '#fbeef0', color: open ? '#fff' : RED, transform: open ? 'rotate(180deg)' : 'none' }}
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </span>
                                    </button>
                                    <div className="grid transition-all duration-300" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
                                        <div className="overflow-hidden">
                                            <p className="px-6 pb-5 text-[14px] leading-[1.7] text-[#6b6360]">{f.answer}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── APPOINTMENT WIDGET ───────────────────────────────────────── */}
            <div className="mt-7 overflow-hidden rounded-[30px] border border-white/75 bg-white/55 shadow-[0_24px_60px_rgba(120,30,50,0.12)] backdrop-blur-xl">
                <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
                    {/* left: branch + doctor select */}
                    <div className="p-6 text-white sm:p-10" style={{ background: 'linear-gradient(160deg,#c81e3a,#9e1730)' }}>
                        <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.1em] opacity-85">Цаг авах</div>
                        <h2 className="mb-2.5 font-onest text-[22px] font-extrabold leading-tight sm:text-[34px]">Эхлээд салбараа сонгоно уу</h2>
                        <p className="mb-5 text-[15px] leading-[1.6] opacity-90">Салбар, эмчээ сонгоод доорх календараас өдөр, цагаа сонгоорой.</p>
                        {branches.length > 0 && (
                            <div className="mb-5 flex flex-wrap gap-2">
                                {branches.map((b) => {
                                    const on = b.id === apBranch;
                                    return (
                                        <button key={b.id} onClick={() => { setApBranch(b.id); setApDoc(doctors.find((d) => d.branch_id === b.id)?.id ?? null); setApDay(null); setApTime(null); }} className="rounded-[30px] border-[1.5px] px-3.5 py-2 text-[13px] font-semibold transition-all" style={{ borderColor: on ? '#fff' : 'rgba(255,255,255,.32)', background: on ? '#fff' : 'rgba(255,255,255,.08)', color: on ? RED : '#fff' }}>
                                            {b.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        <div className="flex flex-col gap-2.5">
                            {apDoctors.map((d) => {
                                const on = d.id === apDoc;
                                return (
                                    <button key={d.id} onClick={() => { setApDoc(d.id); setApDay(null); setApTime(null); }} className="flex items-center gap-3 rounded-2xl border-[1.5px] px-3.5 py-3 text-left transition-all" style={{ borderColor: on ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.22)', background: on ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.04)' }}>
                                        <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl bg-white/20 font-onest text-[17px] font-bold">{d.name.trim()[0]}</span>
                                        <span className="leading-tight">
                                            <span className="block font-onest text-[15px] font-bold">{d.name}</span>
                                            <span className="block text-[12px] font-medium opacity-85">{d.specialization || 'Шүдний эмч'}</span>
                                        </span>
                                        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-bold" style={{ background: on ? '#fff' : 'transparent', color: on ? RED : 'transparent' }}>✓</span>
                                    </button>
                                );
                            })}
                            {apDoctors.length === 0 && <div className="text-[14px] opacity-80">Энэ салбарт бүртгэлтэй эмч алга байна.</div>}
                        </div>
                    </div>

                    {/* right: calendar + times */}
                    <div className="bg-white/60 p-6 sm:p-10">
                        <div className="mb-1.5 flex items-center justify-between">
                            <span className="font-onest text-[18px] font-bold">{y} оны {monthNames[m]}</span>
                            {selDocObj && <span className="text-[13px] font-semibold text-[#c81e3a]">{selDocObj.name}</span>}
                        </div>
                        <div className="mb-4 text-[12px] font-medium text-[#9a918d]">{selBranchObj?.name ?? 'Салбар сонгоно уу'}</div>
                        <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[12px] font-semibold text-[#9a918d]">
                            {['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'].map((w) => <span key={w}>{w}</span>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1.5 text-center">
                            {Array.from({ length: firstOffset }).map((_, i) => <div key={`e${i}`} className="h-[42px]" />)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const isPast = day < today.getDate();
                                const sel = apDay === day;
                                return (
                                    <button
                                        key={day}
                                        disabled={isPast}
                                        onClick={() => { setApDay(day); setApTime(null); }}
                                        className="flex h-[42px] items-center justify-center rounded-[11px] text-[14px] font-semibold transition-all"
                                        style={
                                            sel ? { background: RED, color: '#fff', boxShadow: '0 6px 14px rgba(200,30,58,.32)' }
                                                : isPast ? { color: '#cdc6c3', cursor: 'default' }
                                                : { background: 'rgba(200,30,58,.09)', color: '#1c1a1b' }
                                        }
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="my-5 h-px bg-[#ece6e5]" />
                        <div className="mb-3 text-[13px] font-semibold text-[#6b6360]">
                            {apDay ? `Боломжит цаг — ${monthNames[m]}ын ${apDay}` : 'Эхлээд өдрөө сонгоно уу'}
                        </div>
                        <div className="mb-5 flex flex-wrap gap-2.5">
                            {(apDay ? SAMPLE_TIMES : []).map((t) => {
                                const on = apTime === t;
                                return (
                                    <button key={t} onClick={() => setApTime(t)} className="rounded-[12px] border-[1.5px] px-4 py-2.5 text-[13px] font-semibold transition-all" style={{ borderColor: on ? RED : '#ece6e5', background: on ? RED : '#fff', color: on ? '#fff' : '#1c1a1b' }}>
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div className="text-[13px] leading-tight text-[#6b6360]">
                                {canConfirm ? `${selDocObj?.name} · ${monthNames[m]}ын ${apDay} · ${apTime}` : 'Эмч, өдөр, цагаа сонгоно уу'}
                            </div>
                            <button onClick={goBooking} disabled={!canConfirm} className="whitespace-nowrap rounded-[14px] px-6 py-3.5 text-[15px] font-bold text-white transition-all" style={{ background: canConfirm ? RED : '#d9cfcd', boxShadow: canConfirm ? '0 8px 20px rgba(200,30,58,.3)' : 'none' }}>
                                Цаг авах →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
