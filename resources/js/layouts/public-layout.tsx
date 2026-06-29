import { ToastContainer } from '@/components/toast';
import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Menu, Home, Sparkles, Users, CalendarPlus } from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface SiteSettings {
    site_name?: string;
    site_tagline?: string;
    contact_phone?: string;
    contact_email?: string;
    address?: string;
    working_hours?: string;
    facebook_url?: string;
    instagram_url?: string;
    booking_enabled?: string;
    site_logo?: string;
    site_favicon?: string;
}

interface SharedData {
    auth: { user?: { name: string } };
    site_settings?: SiteSettings;
    [key: string]: unknown;
}

/* ─── Nav ────────────────────────────────────────────────────────────────── */
const NAV_LINKS = [
    { label: 'Нүүр',          href: '/'                },
    { label: 'Бидний тухай',  href: '/about'           },
    { label: 'Эмч',           href: '/doctors'         },
    { label: 'Эмчилгээ үйлчилгээ', href: '/services'   },
    { label: 'Үр дүн',        href: '/gallery'         },
    { label: 'Мэдээ',         href: '/articles'        },
    { label: 'Холбоо барих',  href: '/contact'         },
    { label: 'Ажлын анкет',   href: '/job-application' },
];

const BOOKING_LINK = { label: 'Цаг авах', href: '/booking' };

export default function PublicLayout({ children }: { children: ReactNode }) {
    const { site_settings: s = {} } = usePage<SharedData>().props;

    const siteName    = s.site_name     || 'Кутикул';
    const logoUrl     = s.site_logo     || '';
    const faviconUrl  = s.site_favicon  || '';
    const phone       = s.contact_phone || '+976 7700 8899';
    const email       = s.contact_email || 'info@cuticul.mn';
    const address     = s.address       || 'СБД, 1-р хороо, УБ';
    const tagline     = s.site_tagline  || 'Бүх насны хүмүүст зориулсан мэргэжлийн шүдний тусламж үйлчилгээ.';
    const bookingOn   = s.booking_enabled !== '0';

    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';

    /* Лого 2 удаа дармагц admin login руу (нууц товчлол) */
    const logoClickCount = useRef(0);
    const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleLogoClick = () => {
        logoClickCount.current += 1;
        if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
        if (logoClickCount.current >= 2) {
            logoClickCount.current = 0;
            router.visit('/login');
        } else {
            logoClickTimer.current = setTimeout(() => {
                logoClickCount.current = 0;
                router.visit('/');
            }, 300);
        }
    };

    /* Scroll-reactive aurora дэвсгэр */
    useEffect(() => {
        const onScroll = () => {
            const el = document.getElementById('cuticul-bgflow');
            if (!el) return;
            const doc = document.scrollingElement || document.documentElement;
            const y = window.scrollY || window.pageYOffset || doc.scrollTop || 0;
            const max = (doc.scrollHeight - window.innerHeight) || 1;
            const p = Math.min(1, Math.max(0, y / max));
            el.style.filter = `hue-rotate(${p * 70}deg) saturate(${1 + p * 0.5}) brightness(${1.04 - p * 0.1})`;
            el.style.transform = `translateY(${p * -70}px) scale(${1 + p * 0.12}) rotate(${p * 4}deg)`;
            setScrolled(y > 24);
        };
        window.addEventListener('scroll', onScroll, { passive: true, capture: true });
        window.addEventListener('resize', onScroll, { passive: true });
        onScroll();
        return () => {
            window.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    /* Favicon динамикаар солих */
    useEffect(() => {
        if (!faviconUrl) return;
        let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = faviconUrl;
    }, [faviconUrl]);

    const Logo = ({ size = 38 }: { size?: number }) => (
        <div
            className="flex items-center justify-center rounded-xl bg-[#c81e3a] font-onest font-extrabold text-white overflow-hidden"
            style={{ width: size, height: size, fontSize: size * 0.5 }}
        >
            {logoUrl ? <img src={logoUrl} alt={siteName} className="w-full h-full object-cover" /> : 'К'}
        </div>
    );

    return (
        <div className="cuticul relative min-h-screen overflow-x-clip">

            {/* ── ANIMATED AURORA BACKDROP ────────────────────────────────── */}
            <div id="cuticul-bgflow" className="cuticul-bgflow">
                <div className="hue">
                    <div className="blob b1" />
                    <div className="blob b2" />
                    <div className="blob b3" />
                    <div className="blob b4" />
                </div>
            </div>

            {/* ── CONTENT WRAPPER (1240 max) ──────────────────────────────── */}
            <div className="relative z-[1] mx-auto w-full max-w-[1240px] px-4 pb-28 sm:px-7 xl:pb-16">

                {/* ── GLASS NAVBAR ──────────────────────────────────────────── */}
                <header className={`sticky top-3 z-40 mt-4 flex items-center justify-between gap-3 rounded-[20px] border px-3 py-3 pl-5 backdrop-blur-lg transition-all duration-300 ${
                    scrolled
                        ? 'border-[#ded6d2] bg-[#ebe6e3]/90 shadow-[0_10px_34px_rgba(60,40,45,0.14)]'
                        : 'border-white/75 bg-white/55 shadow-[0_8px_30px_rgba(120,30,50,0.08)]'
                }`}>
                    {/* Brand */}
                    <div onClick={handleLogoClick} className="flex cursor-pointer select-none items-center gap-3">
                        <Logo />
                        <div className="leading-tight">
                            <div className="font-onest text-[18px] font-extrabold text-[#1c1a1b]">{siteName}</div>
                            <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#9a918d]">Шүдний эмнэлэг</div>
                        </div>
                    </div>

                    {/* Desktop nav */}
                    <nav className="hidden items-center gap-5 text-[14px] font-semibold text-[#3a3533] xl:flex">
                        {NAV_LINKS.map((l) => {
                            const active = currentPath === l.href;
                            return (
                                <Link
                                    key={l.href}
                                    href={l.href}
                                    className={`transition-colors hover:text-[#c81e3a] ${active ? 'text-[#c81e3a]' : 'text-[#3a3533]'}`}
                                >
                                    {l.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* CTA (desktop / tablet) */}
                    <div className="flex items-center gap-2">
                        {bookingOn && (
                            <Link
                                href={BOOKING_LINK.href}
                                className="hidden whitespace-nowrap rounded-[13px] bg-[#c81e3a] px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_6px_16px_rgba(200,30,58,0.28)] transition-colors hover:bg-[#a91730] sm:block"
                            >
                                {BOOKING_LINK.label}
                            </Link>
                        )}
                    </div>
                </header>

                {/* ── PAGE CONTENT ──────────────────────────────────────────── */}
                <main>{children}</main>

                {/* ── FOOTER ────────────────────────────────────────────────── */}
                <footer className="mt-8 rounded-[26px] bg-[#1c1a1b]/95 px-6 py-10 text-[#e8e2e0] sm:px-10">
                    <div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
                        <div className="max-w-[280px]">
                            <div className="mb-3.5 flex items-center gap-2.5">
                                <Logo size={34} />
                                <span className="font-onest text-[17px] font-extrabold text-white">{siteName}</span>
                            </div>
                            <p className="text-[13px] leading-relaxed text-[#9a918d]">{tagline}</p>
                        </div>

                        <div className="flex flex-wrap gap-10 text-[13px] font-medium text-[#b6aeac] sm:gap-14">
                            <div className="flex flex-col gap-2.5">
                                <span className="mb-1 text-[13px] font-bold text-white">Цэс</span>
                                <Link href="/about" className="transition-colors hover:text-white">Бидний тухай</Link>
                                <Link href="/doctors" className="transition-colors hover:text-white">Эмч</Link>
                                <Link href="/services" className="transition-colors hover:text-white">Эмчилгээ</Link>
                                <Link href="/gallery" className="transition-colors hover:text-white">Үр дүн</Link>
                            </div>
                            <div className="flex flex-col gap-2.5">
                                <span className="mb-1 text-[13px] font-bold text-white">Бусад</span>
                                <Link href="/articles" className="transition-colors hover:text-white">Мэдээ</Link>
                                <Link href="/job-application" className="transition-colors hover:text-white">Ажлын анкет</Link>
                                <Link href="/contact" className="transition-colors hover:text-white">Холбоо барих</Link>
                            </div>
                            <div className="flex flex-col gap-2.5">
                                <span className="mb-1 text-[13px] font-bold text-white">Холбоо барих</span>
                                {phone && <a href={`tel:${phone}`} className="transition-colors hover:text-white">{phone}</a>}
                                {email && <a href={`mailto:${email}`} className="transition-colors hover:text-white">{email}</a>}
                                {address && <span>{address}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 border-t border-white/10 pt-5 text-[12px] text-[#7d7572]">
                        © {new Date().getFullYear()} {siteName}. Бүх эрх хуулиар хамгаалагдсан.
                    </div>
                </footer>
            </div>

            {/* ── MOBILE: bottom sheet (бүтэн цэс) ──────────────────────────── */}
            {menuOpen && (
                <div className="fixed inset-0 z-[60] xl:hidden" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)} />
                    <div
                        className="absolute inset-x-0 bottom-0 rounded-t-[28px] border-t border-white/70 bg-white/95 p-5 pb-8 shadow-[0_-12px_44px_rgba(0,0,0,0.22)] backdrop-blur-xl"
                        style={{ animation: 'cuticulSheetUp .28s cubic-bezier(0.34,1.3,0.64,1) both' }}
                    >
                        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#e2d8d5]" />
                        <div className="grid grid-cols-2 gap-2.5">
                            {NAV_LINKS.map((l) => {
                                const active = currentPath === l.href;
                                return (
                                    <Link
                                        key={l.href}
                                        href={l.href}
                                        onClick={() => setMenuOpen(false)}
                                        className={`rounded-2xl border px-4 py-3.5 text-[14px] font-semibold transition-all ${
                                            active ? 'border-[#c81e3a] bg-[#fbeef0] text-[#c81e3a]' : 'border-[#f0e8e6] bg-white text-[#3a3533]'
                                        }`}
                                    >
                                        {l.label}
                                    </Link>
                                );
                            })}
                        </div>
                        {bookingOn && (
                            <Link
                                href={BOOKING_LINK.href}
                                onClick={() => setMenuOpen(false)}
                                className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-[#c81e3a] px-4 py-4 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(200,30,58,0.3)]"
                            >
                                <CalendarPlus className="h-[18px] w-[18px]" /> {BOOKING_LINK.label}
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* ── MOBILE: апп шиг доод цэс ──────────────────────────────────── */}
            <nav className="fixed inset-x-0 bottom-0 z-50 xl:hidden">
                <div className="mx-auto max-w-[1240px] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]">
                    <div className="flex items-end justify-around rounded-[24px] border border-white/70 bg-white/90 px-2 py-2.5 shadow-[0_-8px_30px_rgba(120,30,50,0.14)] backdrop-blur-xl">
                        {[
                            { href: '/', label: 'Нүүр', Icon: Home },
                            { href: '/services', label: 'Үйлчилгээ', Icon: Sparkles },
                        ].map(({ href, label, Icon }) => {
                            const active = currentPath === href;
                            return (
                                <Link key={href} href={href} className="flex flex-1 flex-col items-center gap-1 py-1">
                                    <Icon className="h-[22px] w-[22px]" style={{ color: active ? '#c81e3a' : '#9a918d' }} strokeWidth={active ? 2.4 : 2} />
                                    <span className="text-[10px] font-bold" style={{ color: active ? '#c81e3a' : '#9a918d' }}>{label}</span>
                                </Link>
                            );
                        })}

                        {/* Center booking */}
                        <Link href={BOOKING_LINK.href} className="flex flex-1 flex-col items-center">
                            <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-[#c81e3a] text-white shadow-[0_8px_20px_rgba(200,30,58,0.42)]">
                                <CalendarPlus className="h-6 w-6" />
                            </span>
                            <span className="mt-0.5 text-[10px] font-bold text-[#c81e3a]">Цаг авах</span>
                        </Link>

                        {[
                            { href: '/doctors', label: 'Эмч', Icon: Users },
                        ].map(({ href, label, Icon }) => {
                            const active = currentPath === href;
                            return (
                                <Link key={href} href={href} className="flex flex-1 flex-col items-center gap-1 py-1">
                                    <Icon className="h-[22px] w-[22px]" style={{ color: active ? '#c81e3a' : '#9a918d' }} strokeWidth={active ? 2.4 : 2} />
                                    <span className="text-[10px] font-bold" style={{ color: active ? '#c81e3a' : '#9a918d' }}>{label}</span>
                                </Link>
                            );
                        })}

                        <button onClick={() => setMenuOpen(true)} className="flex flex-1 flex-col items-center gap-1 py-1">
                            <Menu className="h-[22px] w-[22px]" style={{ color: menuOpen ? '#c81e3a' : '#9a918d' }} strokeWidth={2} />
                            <span className="text-[10px] font-bold" style={{ color: menuOpen ? '#c81e3a' : '#9a918d' }}>Цэс</span>
                        </button>
                    </div>
                </div>
            </nav>

            <ToastContainer />
        </div>
    );
}
