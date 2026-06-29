import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import PublicLayout from '@/layouts/public-layout';
import { Calendar, X, CheckCircle, Image as ImageIcon, Clock } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */
interface SubTreatment {
    id: number; title: string; description: string | null;
    price_min: number | null; price_max: number | null; duration_min: number | null;
}
interface Treatment {
    id: number; title: string; description: string | null;
    price_min: number | null; price_max: number | null; duration_min: number | null;
    image_url: string | null; sub_treatments: SubTreatment[];
}
interface TreatmentCategory { id: number; name: string; icon: string | null; treatments: Treatment[] }
interface PageProps { treatments: TreatmentCategory[] }

const RED = '#c81e3a';
const glassPanel = 'rounded-[30px] border border-white/70 bg-white/50 shadow-[0_14px_40px_rgba(120,30,50,0.06)] backdrop-blur-xl';

function priceLabel(min: number | null, max: number | null): string | null {
    if (!min && !max) return null;
    const f = (n: number) => `${Number(n).toLocaleString()}₮`;
    if (min && max) return `${f(min)}–${f(max)}`;
    return f((min || max)!);
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL — эмчилгээний дэлгэрэнгүй (хуучин хувилбараас хадгалсан)
   ═══════════════════════════════════════════════════════════════════════════ */
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                {children}
            </div>
        </div>
    );
}

function TreatmentModal({ treatment, catName, onClose }: { treatment: Treatment; catName: string; onClose: () => void }) {
    const price = priceLabel(treatment.price_min, treatment.price_max);
    const bookingUrl = `/booking?service=${encodeURIComponent(treatment.title)}`;
    const includes = ['Мэргэжлийн үзлэг', 'Эмчилгээний төлөвлөгөө', 'Дараагийн үзлэгийн зөвлөгөө'];
    return (
        <Modal open onClose={onClose}>
            <div className="relative h-52 flex-shrink-0 overflow-hidden rounded-t-3xl bg-gradient-to-br from-rose-50 to-red-100">
                {treatment.image_url
                    ? <img src={treatment.image_url} alt={treatment.title} className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center"><ImageIcon className="h-16 w-16 text-red-200" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <button onClick={onClose} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/40">
                    <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-4 left-5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">{catName}</span>
                </div>
            </div>
            <div className="p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <h2 className="font-onest text-2xl font-extrabold leading-tight text-gray-900">{treatment.title}</h2>
                    {price && (
                        <div className="flex-shrink-0 text-right">
                            <p className="mb-0.5 text-xs text-gray-400">Үнэ</p>
                            <p className="text-lg font-extrabold text-[#c81e3a]">{price}</p>
                        </div>
                    )}
                </div>
                {treatment.duration_min && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4 text-red-400" /><span>Хугацаа: ~{treatment.duration_min} мин</span>
                    </div>
                )}
                {treatment.description && <p className="mb-5 text-sm leading-relaxed text-gray-600">{treatment.description}</p>}
                {treatment.sub_treatments.length > 0 && (
                    <div className="mb-5">
                        <h3 className="mb-3 text-sm font-bold text-gray-800">Дэд төрлүүд</h3>
                        <div className="flex flex-col">
                            {treatment.sub_treatments.map((s) => {
                                const sp = priceLabel(s.price_min, s.price_max);
                                return (
                                    <div key={s.id} className="flex items-start justify-between gap-4 border-b border-gray-50 py-3 last:border-0">
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                                            {s.description && <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{s.description}</p>}
                                        </div>
                                        {sp && <span className="flex-shrink-0 text-sm font-bold text-[#c81e3a]">{sp}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="mb-5 rounded-2xl bg-gray-50 p-4">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Багтсан үйлчилгээ</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {includes.map((item, i) => (
                            <div key={i} className="flex items-center gap-2.5">
                                <CheckCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                                <span className="text-sm text-gray-600">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <Link href={bookingUrl} className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#c81e3a] py-4 text-base font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-[#a91730]">
                    <Calendar className="h-5 w-5" /> Эмч дээр цаг захиалах
                </Link>
            </div>
        </Modal>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
const HERO_ICONS = ['◍', '✦', '⬚', '◎', '♨'];
const STEPS = [
    { num: '01', title: 'Цаг захиалах', text: 'Онлайнаар эсвэл утсаар өөрт тохирох цагаа сонгоно.' },
    { num: '02', title: 'Үзлэг, оношилгоо', text: 'Эмч амны хөндийг шалгаж, шаардлагатай оношилгоо хийнэ.' },
    { num: '03', title: 'Төлөвлөгөө', text: 'Тохирох эмчилгээний төлөвлөгөө, төсвийг тодорхой танилцуулна.' },
    { num: '04', title: 'Эмчилгээ, хяналт', text: 'Эмчилгээ хийж, дараа нь үр дүнг тогтмол хянана.' },
];

export default function ServicesPage({ treatments = [] }: PageProps) {
    const fallback: TreatmentCategory[] = [
        { id: 1, name: 'Гажиг засал', icon: null, treatments: [
            { id: 1, title: 'Invisalign', description: 'Харагдахгүй, авч хийж болдог шилэн тэгшлэгч систем.', price_min: 1500000, price_max: 3000000, duration_min: 60, image_url: null, sub_treatments: [] },
            { id: 2, title: 'Металл брекет', description: 'Хамгийн хүчтэй, тогтвортой уламжлалт брекет систем.', price_min: 800000, price_max: 1500000, duration_min: 45, image_url: null, sub_treatments: [] },
            { id: 3, title: 'Мэлмий брекет', description: 'Шүдний өнгөтэй хослуулсан гоо үзэмжтэй керамик брекет.', price_min: 1200000, price_max: 2000000, duration_min: 45, image_url: null, sub_treatments: [] },
            { id: 4, title: 'Retainer', description: 'Засал дууссаны дараах байрлалыг хадгалах аппарат.', price_min: 150000, price_max: 300000, duration_min: 30, image_url: null, sub_treatments: [] },
        ]},
        { id: 2, name: 'Ерөнхий эмчилгээ', icon: null, treatments: [
            { id: 5, title: 'Шүд авалт', description: 'Мэдээ алдуулан аюулгүй шүд авалт.', price_min: 50000, price_max: 150000, duration_min: 30, image_url: null, sub_treatments: [] },
            { id: 6, title: 'Цайруулалт', description: 'Мэргэжлийн орчин үеийн шүд цайруулах процедур.', price_min: 200000, price_max: 400000, duration_min: 60, image_url: null, sub_treatments: [] },
            { id: 7, title: 'Ерөнхий үзлэг', description: 'Бүрэн шинжилгээ, рентген, зөвлөгөө.', price_min: 30000, price_max: 80000, duration_min: 30, image_url: null, sub_treatments: [] },
        ]},
    ];

    const source = treatments.length > 0 ? treatments : fallback;

    /* tab: 0 = Бүгд, эсвэл category.id */
    const [activeCat, setActiveCat] = useState<number | null>(null);
    const [selected, setSelected] = useState<{ t: Treatment; cat: string } | null>(null);

    /* бүх эмчилгээ (тэгшлэсэн), category нэртэйгээ */
    const allTreatments = source.flatMap((c) => c.treatments.map((t) => ({ t, catName: c.name, catId: c.id })));
    const shown = activeCat === null ? allTreatments : allTreatments.filter((x) => x.catId === activeCat);

    /* hero жагсаалт — эхний 5 ангилал */
    const heroList = source.slice(0, 5).map((c, i) => ({
        icon: c.icon || HERO_ICONS[i % HERO_ICONS.length],
        title: c.name,
        meta: `${c.treatments.length} үйлчилгээ`,
    }));

    return (
        <PublicLayout>
            <Head title="Эмчилгээ үйлчилгээ — Кутикул">
                <style>{`@keyframes modalIn { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
            </Head>

            {/* ── HERO ──────────────────────────────────────────────────────── */}
            <div className="relative mt-6 overflow-hidden rounded-[32px] border border-white/70 shadow-[0_18px_50px_rgba(120,30,50,0.14)]">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 18% 12%, rgba(255,255,255,.18), transparent 46%), linear-gradient(125deg,#d62a48 0%,#b01533 54%,#7d1226 100%)' }} />
                <div className="absolute left-[-50px] top-[-90px] h-[280px] w-[280px] rounded-full border border-dashed border-white/20" style={{ animation: 'cuticulSpinSlow 48s linear infinite' }} />
                <div className="relative z-[3] grid items-center gap-10 p-8 sm:p-14 lg:grid-cols-[1.06fr_0.94fr]">
                    <div>
                        <div className="mb-5 inline-flex items-center gap-2 rounded-[40px] bg-white/85 px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.05em] text-[#c81e3a]">✦ Эмчилгээ үйлчилгээ</div>
                        <h1 className="mb-3.5 font-onest text-[28px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[36px]">Бүх төрлийн шүдний эмчилгээ</h1>
                        <p className="mb-7 max-w-[460px] text-[16px] leading-[1.65] text-white/90">Энгийн үзлэгээс эхлээд гажиг засал, имплант хүртэл — танд ямар ч үед хэрэгтэй болж болох эмчилгээг найдвартай, нэг дороос аваарай.</p>
                        <div className="flex flex-wrap gap-3">
                            <Link href="/booking" className="rounded-[14px] bg-white px-6 py-3.5 text-[15px] font-bold text-[#c81e3a]">Цаг захиалах →</Link>
                            <Link href="/contact" className="rounded-[14px] border-[1.5px] border-white/40 bg-white/15 px-6 py-3.5 text-[15px] font-bold text-white">Утсаар холбогдох</Link>
                        </div>
                    </div>
                    <div className="rounded-[22px] bg-white/95 p-6 shadow-[0_20px_50px_rgba(60,8,18,0.3)] sm:p-7">
                        <div className="mb-4 text-[13px] font-bold uppercase tracking-[0.04em] text-[#9a918d]">Манай үндсэн чиглэлүүд</div>
                        <div className="flex flex-col">
                            {heroList.map((hl, i) => (
                                <div key={i} className="flex items-center gap-3.5 border-b border-[#f3ebea] py-3 last:border-0">
                                    <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-[#fbeef0] font-onest text-[16px] font-bold text-[#c81e3a]">{hl.icon}</span>
                                    <span className="flex-1 text-[15px] font-semibold text-[#1c1a1b]">{hl.title}</span>
                                    <span className="text-[12px] font-medium text-[#9a918d]">{hl.meta}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SERVICES ──────────────────────────────────────────────────── */}
            <div className={`mt-7 p-7 sm:p-11 ${glassPanel}`}>
                <div className="mb-7 flex flex-wrap gap-2.5">
                    <button onClick={() => setActiveCat(null)} className="rounded-[40px] border-[1.5px] px-4 py-2 text-[14px] font-semibold transition-all" style={{ borderColor: activeCat === null ? RED : '#ece6e5', background: activeCat === null ? RED : 'rgba(255,255,255,.6)', color: activeCat === null ? '#fff' : '#6b6360' }}>
                        Бүгд
                    </button>
                    {source.map((c) => {
                        const on = c.id === activeCat;
                        return (
                            <button key={c.id} onClick={() => setActiveCat(c.id)} className="rounded-[40px] border-[1.5px] px-4 py-2 text-[14px] font-semibold transition-all" style={{ borderColor: on ? RED : '#ece6e5', background: on ? RED : 'rgba(255,255,255,.6)', color: on ? '#fff' : '#6b6360' }}>
                                {c.name}
                            </button>
                        );
                    })}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {shown.map(({ t, catName }) => {
                        const meta = t.duration_min ? `~${t.duration_min} мин` : priceLabel(t.price_min, t.price_max) || 'Зөвлөгөөтэй';
                        return (
                            <button key={`${catName}-${t.id}`} onClick={() => setSelected({ t, cat: catName })}
                                className="group overflow-hidden rounded-[18px] border border-[#f1e8e7] bg-white text-left shadow-[0_1px_2px_rgba(120,30,50,0.04)] transition-all hover:-translate-y-[3px] hover:border-[#f4d4da] hover:shadow-[0_14px_32px_rgba(120,30,50,0.13)]">
                                <div className="relative aspect-[16/11] overflow-hidden">
                                    {t.image_url
                                        ? <img src={t.image_url} alt={t.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        : <div className="flex h-full w-full items-center justify-center" style={{ background: 'repeating-linear-gradient(45deg,#f3eceb,#f3eceb 10px,#eee3e2 10px,#eee3e2 20px)' }}><ImageIcon className="h-7 w-7 text-[#d9b9bd]" /></div>}
                                    <div className="absolute left-3 top-3 rounded-[30px] bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#c81e3a] backdrop-blur-sm">{catName}</div>
                                </div>
                                <div className="p-4">
                                    <h3 className="mb-1.5 font-onest text-[16px] font-bold">{t.title}</h3>
                                    {t.description && <p className="mb-3 line-clamp-2 text-[13px] leading-[1.55] text-[#6b6360]">{t.description}</p>}
                                    <div className="flex items-center justify-between border-t border-[#f3ebea] pt-3">
                                        <span className="text-[11px] font-medium text-[#9a918d]">{meta}</span>
                                        <span className="text-[12px] font-bold text-[#c81e3a]">Дэлгэрэнгүй →</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── PROCESS ───────────────────────────────────────────────────── */}
            <div className={`mt-7 p-7 sm:p-11 ${glassPanel}`}>
                <div className="mb-9 text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-[30px] border border-[#c81e3a]/20 bg-[#c81e3a]/10 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#c81e3a]">
                        <span className="h-[7px] w-[7px] rounded-full bg-[#c81e3a]" />Эмчилгээний явц
                    </div>
                    <h2 className="font-onest text-[28px] font-extrabold sm:text-[36px]">Хэрхэн явагддаг вэ?</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {STEPS.map((st) => (
                        <div key={st.num} className="rounded-[20px] border border-[#f1e8e7] bg-white p-7 shadow-[0_1px_2px_rgba(120,30,50,0.04)]">
                            <div className="mb-3 font-onest text-[34px] font-extrabold text-[#f0b8c1]">{st.num}</div>
                            <h3 className="mb-2 font-onest text-[17px] font-bold">{st.title}</h3>
                            <p className="text-[13px] leading-[1.6] text-[#6b6360]">{st.text}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── CTA ───────────────────────────────────────────────────────── */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-7 rounded-[30px] bg-[#1c1a1b]/95 px-8 py-12 text-white sm:px-12">
                <div>
                    <h2 className="mb-2.5 font-onest text-[26px] font-extrabold leading-[1.15] sm:text-[32px]">Аль эмчилгээ танд тохирохыг эмч тодорхойлно</h2>
                    <p className="max-w-[480px] text-[15px] leading-[1.6] text-[#b6aeac]">Анхны үзлэгээр эмч таны амны хөндийг шалгаж, тохирох эмчилгээний төлөвлөгөө гаргаж өгнө.</p>
                </div>
                <Link href="/booking" className="whitespace-nowrap rounded-[14px] bg-[#c81e3a] px-7 py-4 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(200,30,58,0.35)]">Цаг захиалах →</Link>
            </div>

            {selected && <TreatmentModal treatment={selected.t} catName={selected.cat} onClose={() => setSelected(null)} />}
        </PublicLayout>
    );
}
