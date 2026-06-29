import { Head, Link } from '@inertiajs/react';
import { useState, type CSSProperties } from 'react';
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

const RED = '#c81e3a';
const glassPanel =
    'rounded-[30px] border border-white/70 bg-white/50 shadow-[0_14px_40px_rgba(120,30,50,0.06)] backdrop-blur-xl';

function SectionBadge({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-4 inline-flex items-center gap-2 rounded-[30px] border border-[#c81e3a]/20 bg-[#c81e3a]/10 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#c81e3a] shadow-[0_8px_20px_rgba(120,30,50,0.1)] backdrop-blur-md">
            <span className="h-[7px] w-[7px] rounded-full bg-[#c81e3a]" />
            {children}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BEFORE / AFTER КАРТ — гулсуурт харьцуулагч (welcome.tsx RESULTS-аас)
   ═══════════════════════════════════════════════════════════════════════════ */
function ResultCard({ item }: { item: GalleryItem }) {
    const [pos, setPos] = useState(50);
    const stripeAfter: CSSProperties = { background: 'repeating-linear-gradient(45deg,#fbeef0,#fbeef0 10px,#f6dfe3 10px,#f6dfe3 20px)' };
    const stripeBefore: CSSProperties = { background: 'repeating-linear-gradient(45deg,#ece4e2,#ece4e2 10px,#e1d6d3 10px,#e1d6d3 20px)' };

    return (
        <div className="overflow-hidden rounded-[20px] border border-[#f1e8e7] bg-white shadow-[0_1px_2px_rgba(120,30,50,0.04)]">
            <div className="relative aspect-[4/3] overflow-hidden">
                {/* after (base) */}
                {item.after_url ? (
                    <img src={item.after_url} alt="дараа" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                    <div className="absolute inset-0" style={stripeAfter} />
                )}
                {/* before (clipped overlay) */}
                {item.before_url ? (
                    <img src={item.before_url} alt="өмнө" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
                ) : (
                    <div className="absolute inset-0" style={{ ...stripeBefore, clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
                )}
                <div className="absolute left-3 top-3 rounded-[30px] bg-white/[0.88] px-2.5 py-1.5 text-[11px] font-bold text-[#6b6360]">Өмнө</div>
                <div className="absolute right-3 top-3 rounded-[30px] bg-white/[0.88] px-2.5 py-1.5 text-[11px] font-bold text-[#c81e3a]">Дараа</div>
                <div className="pointer-events-none absolute bottom-0 top-0 w-[3px] -translate-x-1/2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.25)]" style={{ left: `${pos}%` }} />
                <div className="pointer-events-none absolute top-1/2 flex h-[38px] w-[38px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white font-onest text-[14px] font-bold text-[#c81e3a] shadow-[0_4px_12px_rgba(0,0,0,0.22)]" style={{ left: `${pos}%` }}>⇆</div>
                <input
                    type="range" min={0} max={100} value={pos}
                    onChange={(e) => setPos(+e.target.value)}
                    className="cuticul-range absolute inset-0 m-0 h-full w-full cursor-ew-resize opacity-0"
                    aria-label="Өмнө дарааг харьцуулах"
                />
            </div>
            <div className="p-3.5">
                {item.title && <h3 className="mb-1.5 font-onest text-[14px] font-bold">{item.title}</h3>}
                {item.category_name && (
                    <span className="mb-2 inline-block rounded-[30px] bg-[#fbeef0] px-2.5 py-1 text-[10px] font-semibold text-[#c81e3a]">{item.category_name}</span>
                )}
                {item.description && <p className="text-[12px] leading-[1.5] text-[#6b6360]">{item.description}</p>}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Gallery({ gallery = [], categories = [] }: PageProps) {
    /* tab: null = Бүгд, эсвэл category нэр */
    const [activeCat, setActiveCat] = useState<string | null>(null);

    /* ангилалын tab-ууд — categories props эсвэл gallery-оос гаргана */
    const catNames = categories.length > 0
        ? categories.map((c) => c.name)
        : (Array.from(new Set(gallery.map((g) => g.category_name).filter(Boolean))) as string[]);

    const shown = activeCat === null
        ? gallery
        : gallery.filter((g) => g.category_name === activeCat);

    const tabs: (string | null)[] = [null, ...catNames];

    return (
        <PublicLayout>
            <Head title="Үр дүн — Кутикул" />

            {/* ── HERO ──────────────────────────────────────────────────────── */}
            <div className="relative mt-6 grid items-center gap-9 overflow-hidden rounded-[32px] border border-white/75 bg-white/55 p-8 shadow-[0_18px_50px_rgba(120,30,50,0.08)] backdrop-blur-xl sm:p-12 lg:grid-cols-[1.05fr_0.95fr]">
                <div>
                    <SectionBadge>Үр дүн</SectionBadge>
                    <h1 className="mb-4 font-onest text-[28px] font-extrabold leading-[1.1] tracking-tight text-[#1c1a1b] sm:text-[40px]">Бодит өмнө ба дараа</h1>
                    <p className="mb-7 max-w-[460px] text-[16px] leading-[1.65] text-[#6b6360]">
                        Манай үйлчлүүлэгчдийн эмчилгээний өмнөх ба дараах байдлыг зургийг нь гулсуулан харьцуулж үзээрэй.
                    </p>
                    <div className="flex items-stretch gap-8">
                        <div>
                            <div className="font-onest text-[30px] font-extrabold text-[#c81e3a]">{gallery.length || 30}+</div>
                            <div className="text-[13px] font-medium text-[#9a918d]">эмчилгээний үр дүн</div>
                        </div>
                        <div className="w-px bg-[#ece2e0]" />
                        <div>
                            <div className="font-onest text-[30px] font-extrabold text-[#c81e3a]">{catNames.length || 4}</div>
                            <div className="text-[13px] font-medium text-[#9a918d]">ангилал</div>
                        </div>
                    </div>
                </div>
                {/* glassmorphic split preview */}
                <div className="relative flex min-h-[300px] items-center justify-center">
                    <div className="absolute h-[300px] w-[300px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(246,160,176,.32),transparent 66%)', filter: 'blur(6px)', animation: 'cuticulPulseGlow 6s ease-in-out infinite' }} />
                    <div className="absolute h-[300px] w-[300px] rounded-full border-[1.5px] border-dashed border-[#c81e3a]/20" style={{ animation: 'cuticulSpinSlow 44s linear infinite' }} />
                    <div className="relative grid h-[280px] w-[280px] grid-cols-2 overflow-hidden rounded-[24px] border-[5px] border-white shadow-[0_22px_50px_rgba(120,30,50,0.18)]" style={{ animation: 'cuticulFloatyA 7s ease-in-out infinite' }}>
                        <div className="flex items-start justify-start p-3 font-onest text-[11px] font-semibold text-[#9a918d]" style={{ background: 'repeating-linear-gradient(45deg,#f3eceb,#f3eceb 10px,#eee3e2 10px,#eee3e2 20px)' }}>Өмнө</div>
                        <div className="flex items-start justify-end p-3 font-onest text-[11px] font-semibold text-[#c98a95]" style={{ background: 'repeating-linear-gradient(45deg,#fbeef0,#fbeef0 10px,#f6dfe3 10px,#f6dfe3 20px)' }}>Дараа</div>
                        <div className="absolute bottom-0 top-0 left-1/2 w-[3px] -translate-x-1/2 bg-white" />
                        <div className="absolute left-1/2 top-1/2 flex h-[40px] w-[40px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white font-onest text-[15px] font-bold text-[#c81e3a] shadow-[0_4px_12px_rgba(0,0,0,0.2)]">⇆</div>
                    </div>
                </div>
            </div>

            {/* ── RESULTS GRID ──────────────────────────────────────────────── */}
            <div className={`mt-7 p-7 sm:p-11 ${glassPanel}`}>
                {tabs.length > 1 && (
                    <div className="mb-7 flex flex-wrap gap-2.5">
                        {tabs.map((t, i) => {
                            const on = t === activeCat;
                            return (
                                <button
                                    key={t ?? '__all'}
                                    onClick={() => setActiveCat(t)}
                                    className="rounded-[40px] border-[1.5px] px-4 py-2 text-[14px] font-semibold transition-all"
                                    style={{ borderColor: on ? RED : '#ece6e5', background: on ? RED : 'rgba(255,255,255,.6)', color: on ? '#fff' : '#6b6360' }}
                                >
                                    {t ?? 'Бүгд'}
                                </button>
                            );
                        })}
                    </div>
                )}

                {shown.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {shown.map((item) => (
                                <ResultCard key={item.id} item={item} />
                            ))}
                        </div>
                        <div className="mt-5 text-center text-[13px] font-medium text-[#9a918d]">← Гулсуулж өмнө/дарааг харьцуулна уу →</div>
                    </>
                ) : (
                    <div className="py-20 text-center">
                        <div className="mb-3 font-onest text-[20px] font-bold text-[#1c1a1b]">Энэ ангилалд үр дүн алга байна.</div>
                        <p className="text-[14px] text-[#9a918d]">Удахгүй шинэ үр дүнгүүд нэмэгдэх болно.</p>
                    </div>
                )}
            </div>

            {/* ── CTA ───────────────────────────────────────────────────────── */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-7 rounded-[30px] bg-[#1c1a1b]/95 px-8 py-12 text-white sm:px-12">
                <div>
                    <h2 className="mb-2.5 font-onest text-[26px] font-extrabold leading-[1.15] sm:text-[32px]">Дараагийн амжилт тань байж магадгүй</h2>
                    <p className="max-w-[480px] text-[15px] leading-[1.6] text-[#b6aeac]">Анхны үзлэгийн цагаа захиалж, өөрийн инээмсэглэлийн өөрчлөлтийг эхлүүлээрэй.</p>
                </div>
                <Link href="/booking" className="whitespace-nowrap rounded-[14px] bg-[#c81e3a] px-7 py-4 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(200,30,58,0.35)]">Цаг захиалах →</Link>
            </div>
        </PublicLayout>
    );
}
