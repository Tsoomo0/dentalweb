import { Head, Link, usePage } from '@inertiajs/react';
import PublicLayout from '@/layouts/public-layout';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES — backend-ээс ирэх жинхэнэ өгөгдөл
   ═══════════════════════════════════════════════════════════════════════════ */
interface Branch {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    type?: string | null;
}
interface SiteSettings {
    contact_phone?: string;
    contact_email?: string;
    working_hours?: string;
    address?: string;
    facebook_url?: string;
    instagram_url?: string;
    [key: string]: unknown;
}
interface PageProps {
    branches?: Branch[];
    site_settings?: SiteSettings;
    [key: string]: unknown;
}

const RED = '#c81e3a';
const glassPanel =
    'rounded-[30px] border border-white/70 bg-white/50 shadow-[0_14px_40px_rgba(120,30,50,0.06)] backdrop-blur-xl';

/* welcome.tsx-тэй ижил SectionBadge */
function SectionBadge({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-4 inline-flex items-center gap-2 rounded-[30px] border border-[#c81e3a]/20 bg-[#c81e3a]/10 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#c81e3a] shadow-[0_8px_20px_rgba(120,30,50,0.1)] backdrop-blur-md">
            <span className="h-[7px] w-[7px] rounded-full bg-[#c81e3a]" />
            {children}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Contact({ branches = [] }: PageProps) {
    /* site_settings нь layout-аар shared болж ирдэг тул usePage-аас уншина */
    const { site_settings: s = {} } = usePage<PageProps>().props;

    const phone = s.contact_phone || '+976 7700 8899';
    const email = s.contact_email || 'info@cuticul.mn';
    const workingHours = s.working_hours || 'Даваа–Бямба: 09:00–20:00';
    const address = s.address || 'СБД, 1-р хороо, УБ';

    /* холбоо барих мэдээллийн картууд */
    const infos = [
        { icon: '☎', title: 'Утас', line1: phone, line2: 'Лавлах: 1800-8899', href: `tel:${phone}` },
        { icon: '✉', title: 'И-мэйл', line1: email, line2: 'help@cuticul.mn', href: `mailto:${email}` },
        { icon: '◷', title: 'Ажлын цаг', line1: workingHours, line2: 'Ням: 10:00–17:00', href: null },
        { icon: '◍', title: 'Хаяг', line1: address, line2: 'Улаанбаатар хот', href: null },
    ];

    /* салбарууд — жинхэнэ props, бага fallback */
    const fallbackBranches: Branch[] = [
        { id: 1, name: 'Сансар салбар', address: 'БЗД, Сансар, Их дэлгүүрийн зүүн талд', phone: null },
        { id: 2, name: 'Хороолол салбар', address: 'СБД, 1-р хороолол, 32-ын тойрон', phone: null },
    ];
    const branchList = branches.length > 0 ? branches : fallbackBranches;

    return (
        <PublicLayout>
            <Head title="Холбоо барих — Кутикул" />

            {/* ── HERO ──────────────────────────────────────────────────────── */}
            <div className="relative mt-6 overflow-hidden rounded-[32px] border border-white/70 shadow-[0_18px_50px_rgba(120,30,50,0.14)]">
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(circle at 84% 20%, rgba(255,255,255,.2), transparent 48%), linear-gradient(125deg,#d62a48 0%,#b01533 52%,#7d1226 100%)',
                    }}
                />
                <div
                    className="pointer-events-none absolute right-[-50px] top-[-80px] h-[300px] w-[300px] rounded-full border-[1.5px] border-dashed border-white/20"
                    style={{ animation: 'cuticulSpinSlow 46s linear infinite' }}
                />
                <div className="relative z-[3] p-8 sm:p-14">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-[40px] bg-white/85 px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.05em] text-[#c81e3a]">
                        ✦ Холбоо барих
                    </div>
                    <h1 className="mb-3.5 font-onest text-[28px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[38px]">
                        Бидэнтэй холбогдоорой
                    </h1>
                    <p className="max-w-[520px] text-[16px] leading-[1.65] text-white/90">
                        Асуулт, санал хүсэлт байвал утсаар залгах, эсвэл доорх мэдээллээр бидэнтэй холбогдоорой. Бид ажлын цагаар хариу өгнө.
                    </p>
                </div>
            </div>

            {/* ── CONTACT INFO + ACTION ────────────────────────────────────── */}
            <div className="mt-7 grid items-stretch gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                {/* info column */}
                <div className="flex flex-col gap-4">
                    {infos.map((i, idx) => {
                        const Inner = (
                            <>
                                <div className="flex h-[48px] w-[48px] flex-none items-center justify-center rounded-[13px] font-onest text-[20px] font-bold text-[#c81e3a]" style={{ background: 'linear-gradient(150deg,#fde9ec,#fbd9df)' }}>
                                    {i.icon}
                                </div>
                                <div>
                                    <div className="mb-1 font-onest text-[15px] font-bold text-[#1c1a1b]">{i.title}</div>
                                    <div className="text-[14px] leading-[1.5] text-[#6b6360]">{i.line1}</div>
                                    <div className="text-[14px] leading-[1.5] text-[#6b6360]">{i.line2}</div>
                                </div>
                            </>
                        );
                        const cls =
                            'flex items-start gap-4 rounded-[22px] border border-white/70 bg-white/50 p-6 shadow-[0_10px_30px_rgba(120,30,50,0.05)] backdrop-blur-xl';
                        return i.href ? (
                            <a key={idx} href={i.href} className={`${cls} transition-all hover:-translate-y-[2px] hover:border-[#f4d4da]`}>
                                {Inner}
                            </a>
                        ) : (
                            <div key={idx} className={cls}>
                                {Inner}
                            </div>
                        );
                    })}
                </div>

                {/* action panel */}
                <div className={`flex h-full flex-col ${glassPanel} p-7 sm:p-10`}>
                    <SectionBadge>Цаг авах</SectionBadge>
                        <h2 className="mb-1.5 font-onest text-[26px] font-extrabold tracking-tight text-[#1c1a1b] sm:text-[30px]">
                            Хамгийн хурдан холбоо
                        </h2>
                        <p className="mb-7 max-w-[480px] text-[14px] leading-[1.6] text-[#6b6360]">
                            Шууд утсаар залгаж эсвэл онлайнаар цаг захиалснаар манай ажилтан тантай эргэн холбогдоно.
                        </p>

                        <div className="mb-7 grid gap-3 sm:grid-cols-2">
                            <a
                                href={`tel:${phone}`}
                                className="flex items-center gap-3.5 rounded-[16px] border border-[#f1e8e7] bg-white p-4 transition-all hover:-translate-y-[2px] hover:border-[#f4d4da] hover:shadow-[0_12px_28px_rgba(120,30,50,0.1)]"
                            >
                                <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[12px] bg-[#fbeef0] font-onest text-[18px] font-bold text-[#c81e3a]">☎</span>
                                <span className="leading-tight">
                                    <span className="block text-[12px] font-medium text-[#9a918d]">Утсаар залгах</span>
                                    <span className="block font-onest text-[15px] font-bold text-[#1c1a1b]">{phone}</span>
                                </span>
                            </a>
                            <a
                                href={`mailto:${email}`}
                                className="flex items-center gap-3.5 rounded-[16px] border border-[#f1e8e7] bg-white p-4 transition-all hover:-translate-y-[2px] hover:border-[#f4d4da] hover:shadow-[0_12px_28px_rgba(120,30,50,0.1)]"
                            >
                                <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[12px] bg-[#fbeef0] font-onest text-[18px] font-bold text-[#c81e3a]">✉</span>
                                <span className="leading-tight">
                                    <span className="block text-[12px] font-medium text-[#9a918d]">И-мэйл бичих</span>
                                    <span className="block font-onest text-[15px] font-bold text-[#1c1a1b]">{email}</span>
                                </span>
                            </a>
                        </div>

                        <div className="mt-auto flex flex-wrap gap-3">
                            <Link
                                href="/booking"
                                className="rounded-[14px] bg-[#c81e3a] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(200,30,58,0.3)] transition-colors hover:bg-[#a91730]"
                            >
                                Онлайн цаг захиалах →
                            </Link>
                            <Link
                                href="/services"
                                className="rounded-[14px] border-[1.5px] border-[#ece6e5] bg-white/70 px-7 py-3.5 text-[15px] font-bold text-[#1c1a1b] transition-colors hover:border-[#f4d4da]"
                            >
                                Үйлчилгээ үзэх
                            </Link>
                        </div>
                </div>
            </div>

            {/* ── MAP / BRANCHES ────────────────────────────────────────────── */}
            <div className={`mt-7 p-7 sm:p-11 ${glassPanel}`}>
                <div className="grid items-stretch gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                    {/* map placeholder */}
                    <div
                        className="relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-[22px] border border-[#ece6e5]"
                        style={{ background: 'repeating-linear-gradient(45deg,#eef3ef,#eef3ef 16px,#e6ede8 16px,#e6ede8 32px)' }}
                    >
                        <div
                            className="absolute h-[20px] w-[20px] rounded-full bg-[#c81e3a]"
                            style={{ left: '38%', top: '44%', boxShadow: '0 0 0 8px rgba(200,30,58,.2)', animation: 'cuticulPulseGlow 3s ease-in-out infinite' }}
                        />
                        <div
                            className="absolute h-[16px] w-[16px] rounded-full bg-[#c81e3a]"
                            style={{ left: '64%', top: '60%', boxShadow: '0 0 0 6px rgba(200,30,58,.18)' }}
                        />
                        <span className="rounded-[30px] bg-white/85 px-4 py-2 text-[13px] font-semibold text-[#8a9a90]">газрын зураг</span>
                    </div>

                    {/* branches */}
                    <div className="flex flex-col justify-center">
                        <SectionBadge>Салбарууд</SectionBadge>
                        <div className="flex flex-col gap-3.5">
                            {branchList.map((b) => (
                                <div key={b.id} className="flex items-start gap-3.5 border-b border-[#f1e8e7] pb-3.5 last:border-0">
                                    <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-[#fbeef0] font-onest text-[13px] font-bold text-[#c81e3a]">
                                        ◍
                                    </span>
                                    <div>
                                        <div className="font-onest text-[14px] font-bold text-[#1c1a1b]">{b.name}</div>
                                        {b.address && <div className="text-[13px] leading-[1.45] text-[#6b6360]">{b.address}</div>}
                                        {b.phone && (
                                            <a href={`tel:${b.phone}`} className="text-[13px] font-semibold text-[#c81e3a] transition-colors hover:text-[#a91730]">
                                                {b.phone}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
