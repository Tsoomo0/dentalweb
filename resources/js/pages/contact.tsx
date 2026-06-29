import { Head, Link, usePage } from '@inertiajs/react';
import PublicLayout from '@/layouts/public-layout';
import { Phone, Mail, Clock, MapPin, Facebook, Instagram } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES — бүх мэдээлэл backend-ээс (хуурамч контентгүй)
   ═══════════════════════════════════════════════════════════════════════════ */
interface Branch { id: number; name: string; address: string | null; phone: string | null }
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
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Contact({ branches = [] }: PageProps) {
    const { site_settings: s = {} } = usePage<PageProps>().props;

    const phone = s.contact_phone?.trim() || '';
    const email = s.contact_email?.trim() || '';
    const workingHours = s.working_hours?.trim() || '';
    const address = s.address?.trim() || '';
    const facebook = s.facebook_url?.trim() || '';
    const instagram = s.instagram_url?.trim() || '';

    /* зөвхөн жинхэнэ утгатай мэдээллийн картууд */
    const infos = [
        phone && { icon: Phone, title: 'Утас', value: phone, href: `tel:${phone}` },
        email && { icon: Mail, title: 'И-мэйл', value: email, href: `mailto:${email}` },
        workingHours && { icon: Clock, title: 'Ажлын цаг', value: workingHours, href: null },
        address && { icon: MapPin, title: 'Хаяг', value: address, href: null },
    ].filter(Boolean) as { icon: React.ElementType; title: string; value: string; href: string | null }[];

    /* газрын зургийн эх — жинхэнэ хаяг (site эсвэл эхний салбар) */
    const mapAddress = address || branches.find((b) => b.address)?.address || '';

    const hasSocial = Boolean(facebook || instagram);

    return (
        <PublicLayout>
            <Head title="Холбоо барих — Кутикул" />

            {/* ── HERO ──────────────────────────────────────────────────────── */}
            <div className="relative mt-6 overflow-hidden rounded-[26px] border border-white/70 shadow-[0_18px_50px_rgba(120,30,50,0.14)] sm:rounded-[32px]">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 84% 20%, rgba(255,255,255,.2), transparent 48%), linear-gradient(125deg,#d62a48 0%,#b01533 52%,#7d1226 100%)' }} />
                <div className="pointer-events-none absolute right-[-50px] top-[-80px] h-[300px] w-[300px] rounded-full border-[1.5px] border-dashed border-white/20" style={{ animation: 'cuticulSpinSlow 46s linear infinite' }} />
                <div className="relative z-[3] p-6 sm:p-14">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-[40px] bg-white/85 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.05em] text-[#c81e3a] sm:text-[12px]">✦ Холбоо барих</div>
                    <h1 className="mb-3.5 font-onest text-[24px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[38px]">Бидэнтэй холбогдоорой</h1>
                    <p className="max-w-[520px] text-[14px] leading-[1.6] text-white/90 sm:text-[16px]">
                        Асуулт, санал хүсэлт байвал доорх мэдээллээр бидэнтэй холбогдоорой. Бид ажлын цагаар хариу өгнө.
                    </p>
                </div>
            </div>

            {/* ── CONTACT INFO + ACTION ────────────────────────────────────── */}
            <div className="mt-7 grid items-stretch gap-5 lg:grid-cols-[0.85fr_1.15fr]">
                {/* info column */}
                {infos.length > 0 && (
                    <div className="flex flex-col gap-4">
                        {infos.map((i, idx) => {
                            const Icon = i.icon;
                            const Inner = (
                                <>
                                    <div className="flex h-[48px] w-[48px] flex-none items-center justify-center rounded-[13px] text-[#c81e3a]" style={{ background: 'linear-gradient(150deg,#fde9ec,#fbd9df)' }}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="mb-1 font-onest text-[15px] font-bold text-[#1c1a1b]">{i.title}</div>
                                        <div className="break-words text-[14px] leading-[1.5] text-[#6b6360]">{i.value}</div>
                                    </div>
                                </>
                            );
                            const cls = 'flex items-start gap-4 rounded-[22px] border border-white/70 bg-white/50 p-5 shadow-[0_10px_30px_rgba(120,30,50,0.05)] backdrop-blur-xl sm:p-6';
                            return i.href ? (
                                <a key={idx} href={i.href} className={`${cls} transition-all hover:-translate-y-[2px] hover:border-[#f4d4da]`}>{Inner}</a>
                            ) : (
                                <div key={idx} className={cls}>{Inner}</div>
                            );
                        })}

                        {/* сошиал — зөвхөн backend дээр байвал */}
                        {hasSocial && (
                            <div className="flex gap-3">
                                {facebook && (
                                    <a href={facebook} target="_blank" rel="noreferrer" className="flex h-[48px] flex-1 items-center justify-center gap-2 rounded-[16px] border border-white/70 bg-white/50 text-[14px] font-bold text-[#1c1a1b] backdrop-blur-xl transition-all hover:-translate-y-[2px] hover:border-[#f4d4da]">
                                        <Facebook className="h-[18px] w-[18px] text-[#c81e3a]" /> Facebook
                                    </a>
                                )}
                                {instagram && (
                                    <a href={instagram} target="_blank" rel="noreferrer" className="flex h-[48px] flex-1 items-center justify-center gap-2 rounded-[16px] border border-white/70 bg-white/50 text-[14px] font-bold text-[#1c1a1b] backdrop-blur-xl transition-all hover:-translate-y-[2px] hover:border-[#f4d4da]">
                                        <Instagram className="h-[18px] w-[18px] text-[#c81e3a]" /> Instagram
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* action panel */}
                <div className={`flex h-full flex-col ${glassPanel} p-6 sm:p-10`}>
                    <SectionBadge>Цаг авах</SectionBadge>
                    <h2 className="mb-1.5 font-onest text-[22px] font-extrabold tracking-tight text-[#1c1a1b] sm:text-[30px]">Хамгийн хурдан холбоо</h2>
                    <p className="mb-6 max-w-[480px] text-[14px] leading-[1.6] text-[#6b6360]">
                        Шууд утсаар залгаж эсвэл онлайнаар цаг захиалснаар манай ажилтан тантай эргэн холбогдоно.
                    </p>

                    {(phone || email) && (
                        <div className="mb-6 grid gap-3 sm:grid-cols-2">
                            {phone && (
                                <a href={`tel:${phone}`} className="flex items-center gap-3.5 rounded-[16px] border border-[#f1e8e7] bg-white p-4 transition-all hover:-translate-y-[2px] hover:border-[#f4d4da] hover:shadow-[0_12px_28px_rgba(120,30,50,0.1)]">
                                    <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[12px] bg-[#fbeef0] text-[#c81e3a]"><Phone className="h-[18px] w-[18px]" /></span>
                                    <span className="min-w-0 leading-tight">
                                        <span className="block text-[12px] font-medium text-[#9a918d]">Утсаар залгах</span>
                                        <span className="block truncate font-onest text-[15px] font-bold text-[#1c1a1b]">{phone}</span>
                                    </span>
                                </a>
                            )}
                            {email && (
                                <a href={`mailto:${email}`} className="flex items-center gap-3.5 rounded-[16px] border border-[#f1e8e7] bg-white p-4 transition-all hover:-translate-y-[2px] hover:border-[#f4d4da] hover:shadow-[0_12px_28px_rgba(120,30,50,0.1)]">
                                    <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[12px] bg-[#fbeef0] text-[#c81e3a]"><Mail className="h-[18px] w-[18px]" /></span>
                                    <span className="min-w-0 leading-tight">
                                        <span className="block text-[12px] font-medium text-[#9a918d]">И-мэйл бичих</span>
                                        <span className="block truncate font-onest text-[15px] font-bold text-[#1c1a1b]">{email}</span>
                                    </span>
                                </a>
                            )}
                        </div>
                    )}

                    <div className="mt-auto flex flex-wrap gap-3">
                        <Link href="/booking" className="rounded-[14px] bg-[#c81e3a] px-6 py-3.5 text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(200,30,58,0.3)] transition-colors hover:bg-[#a91730] sm:text-[15px]">
                            Онлайн цаг захиалах →
                        </Link>
                        <Link href="/services" className="rounded-[14px] border-[1.5px] border-[#ece6e5] bg-white/70 px-6 py-3.5 text-[14px] font-bold text-[#1c1a1b] transition-colors hover:border-[#f4d4da] sm:text-[15px]">
                            Үйлчилгээ үзэх
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── MAP + BRANCHES (зөвхөн жинхэнэ хаяг/салбар байвал) ─────────── */}
            {(mapAddress || branches.length > 0) && (
                <div className={`mt-7 p-5 sm:p-11 ${glassPanel}`}>
                    <div className="grid items-stretch gap-5 lg:grid-cols-[1.25fr_0.75fr]">
                        {/* жинхэнэ Google газрын зураг (backend хаягаар) */}
                        {mapAddress ? (
                            <iframe
                                title="Байршил"
                                src={`https://www.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed`}
                                className="min-h-[280px] w-full rounded-[22px] border border-[#ece6e5] sm:min-h-[340px]"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        ) : <div />}

                        {/* branches — зөвхөн жинхэнэ */}
                        {branches.length > 0 && (
                            <div className="flex flex-col justify-center">
                                <SectionBadge>Салбарууд</SectionBadge>
                                <div className="flex flex-col gap-3.5">
                                    {branches.map((b) => (
                                        <div key={b.id} className="flex items-start gap-3.5 border-b border-[#f1e8e7] pb-3.5 last:border-0">
                                            <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-[#fbeef0] text-[#c81e3a]"><MapPin className="h-4 w-4" /></span>
                                            <div className="min-w-0">
                                                <div className="font-onest text-[14px] font-bold text-[#1c1a1b]">{b.name}</div>
                                                {b.address && <div className="text-[13px] leading-[1.45] text-[#6b6360]">{b.address}</div>}
                                                {b.phone && (
                                                    <a href={`tel:${b.phone}`} className="text-[13px] font-semibold text-[#c81e3a] transition-colors hover:text-[#a91730]">{b.phone}</a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </PublicLayout>
    );
}
