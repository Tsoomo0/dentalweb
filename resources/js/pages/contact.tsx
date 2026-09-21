import { Head, Link, usePage } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import { Bleed, SectionHead, SplitText, useMotionRoot } from '@/components/public/motion';
import PageHeroBig from '@/components/public/page-hero-big';
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

const d = (i: number, step = 90): CSSProperties => ({ '--d': `${i * step}ms` } as CSSProperties);

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Contact({ branches = [] }: PageProps) {
    useMotionRoot();
    const { site_settings: s = {} } = usePage<PageProps>().props;

    const phone = s.contact_phone?.trim() || '';
    const email = s.contact_email?.trim() || '';
    const workingHours = s.working_hours?.trim() || '';
    const address = s.address?.trim() || '';
    const facebook = s.facebook_url?.trim() || '';
    const instagram = s.instagram_url?.trim() || '';

    /* зөвхөн жинхэнэ утгатай мэдээллийн мөрүүд */
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
        <PublicLayout heroOverlay editorial>
            <Head title="Холбоо барих — Кутикул" />

            <PageHeroBig
                figure="pin"
                alt="Холбоо барих"
                ghost="CONTACT"
                eyebrow="ХОЛБОО БАРИХ"
                title={['Бидэнтэй', 'холбогдоорой']}
                mn="Асуулт, санал хүсэлтээ шууд илгээнэ үү"
                lead="Цаг захиалга, үнийн мэдээлэл, эмчилгээний талаарх асуултаа доорх сувгуудаар шууд асуугаарай."
                stats={[
                    { num: '4', unit: 'салбар', label: 'Улаанбаатар, Дархан' },
                    { num: '7', unit: 'хоног', label: 'Амралтын өдөр ч нээлттэй' },
                    { num: '10', unit: '+ жил', label: 'Салбарын туршлага' },
                ]}
                marks={{
                    d1: { x: 42, y: 58 }, path1: 'M42 58 L 30 87 L 22 87', chip1: 'Ажлын цагаар',
                    d2: { x: 58, y: 36 }, path2: 'M58 36 L 80 17 L 98 17', chip2: '4 салбар',
                }}
                cta={[
                    { label: 'Цаг захиалах', href: '/booking', primary: true },
                ]}
            />

            {/* ── ХОЛБОО БАРИХ МЭДЭЭЛЭЛ ───────────────────────────────────── */}
            {infos.length > 0 && (
                <section className="cw-sec">
                    <div className="cw-ct-grid">
                        {infos.map((i, idx) => {
                            const Icon = i.icon;
                            const inner = (
                                <>
                                    <Icon className="h-[18px] w-[18px] flex-none text-[#c81e3a]" />
                                    <div className="min-w-0">
                                        <p className="cw-ct-t">{i.title}</p>
                                        <p className="cw-ct-v">{i.value}</p>
                                    </div>
                                </>
                            );
                            return i.href
                                ? <a key={idx} href={i.href} className="cw-ct" data-reveal="up" style={d(idx, 80)}>{inner}</a>
                                : <div key={idx} className="cw-ct" data-reveal="up" style={d(idx, 80)}>{inner}</div>;
                        })}
                    </div>

                    {hasSocial && (
                        <div className="mt-8 flex flex-wrap gap-2.5" data-reveal="fade" style={d(4, 80)}>
                            {facebook && (
                                <a href={facebook} target="_blank" rel="noreferrer" className="cw-btn cw-btn-o cw-btn-sm">
                                    <Facebook className="h-[17px] w-[17px] text-[#c81e3a]" /> Facebook
                                </a>
                            )}
                            {instagram && (
                                <a href={instagram} target="_blank" rel="noreferrer" className="cw-btn cw-btn-o cw-btn-sm">
                                    <Instagram className="h-[17px] w-[17px] text-[#c81e3a]" /> Instagram
                                </a>
                            )}
                        </div>
                    )}
                </section>
            )}

            {/* ── ГАЗРЫН ЗУРАГ + САЛБАР ───────────────────────────────────── */}
            {(mapAddress || branches.length > 0) && (
                <section className="cw-sec">
                    <SectionHead eyebrow="Байршил" title="Танд ойрхон салбар" />
                    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                        {mapAddress && (
                            <div className="cw-map" data-reveal="up">
                                <iframe
                                    title="Байршил"
                                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed`}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>
                        )}
                        {branches.length > 0 && (
                            <div>
                                {branches.map((b, i) => (
                                    <div key={b.id} className="cw-branch cw-branch-sm" data-reveal="up" style={d(i, 70)}>
                                        <u>{String(i + 1).padStart(2, '0')}</u>
                                        <h3>{b.name}</h3>
                                        <p>{b.address || '—'}</p>
                                        {b.phone ? <a href={`tel:${b.phone}`}>{b.phone}</a> : <span />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ── CTA ──────────────────────────────────────────────────────── */}
            <section className="cw-sec">
                <Bleed tone="red">
                    <div className="cw-cta">
                        <div>
                            <p className="cw-eyebrow" data-reveal="fade"><i />Цаг авах</p>
                            <h2 data-reveal="words"><SplitText text="Хамгийн хурдан холбоо — онлайн захиалга" accent /></h2>
                            <p data-reveal="up" style={d(1, 140)}>Утсаар хүлээхгүйгээр салбар, эмчээ сонгож хэдхэн товшилтоор цагаа баталгаажуулаарай.</p>
                        </div>
                        <Link href="/booking" className="cw-btn cw-btn-w" data-reveal="up" style={d(2, 140)}>
                            Цаг захиалах<span>→</span>
                        </Link>
                    </div>
                </Bleed>
            </section>
        </PublicLayout>
    );
}
