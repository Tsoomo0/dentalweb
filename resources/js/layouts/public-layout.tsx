import { ToastContainer } from '@/components/toast';
import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect, type ReactNode } from 'react';
import {
    Menu, X, Phone, Clock, ChevronRight, Calendar,
    Facebook, Instagram, Youtube, Mail, Smile, MapPin,
} from 'lucide-react';

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
    { label: 'Үйлчилгээ',     href: '/services'        },
    { label: 'Эмч нар',       href: '/doctors'         },
    { label: 'Үр дүн',        href: '/gallery'         },
    { label: 'Мэдээ',         href: '/articles'        },
    { label: 'Холбоо барих',  href: '/contact'         },
    { label: 'Ажлын анкет',   href: '/job-application' },
];

const BOOKING_LINK = { label: 'Цаг авах', href: '/booking' };

export default function PublicLayout({ children }: { children: ReactNode }) {
    const { auth, site_settings: s = {} } = usePage<SharedData>().props;

    const siteName    = s.site_name     || '';
    const logoUrl     = s.site_logo     || '';
    const faviconUrl  = s.site_favicon  || '';
    const phone       = s.contact_phone || '';
    const email       = s.contact_email || '';
    const address     = s.address       || '';
    const workHours   = s.working_hours || '';
    const fbUrl       = s.facebook_url  || '#';
    const igUrl       = s.instagram_url || '#';
    const bookingOn   = s.booking_enabled !== '0';

    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Favicon динамикаар солих
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

    return (
        <div className="text-gray-900 bg-white">

            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <header className={`fixed top-0 left-0 right-0 z-50 antialiased transition-all duration-300 ${
                scrolled
                    ? 'bg-white/96 backdrop-blur-md shadow-sm border-b border-gray-100'
                    : 'bg-transparent'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-[68px]">

                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2.5">
                            <div className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden">
                                {logoUrl
                                    ? <img src={logoUrl} alt={siteName} className="w-full h-full object-contain" />
                                    : <div className="w-full h-full bg-red-600 flex items-center justify-center shadow-sm">
                                        <Smile className="w-9 h-9 text-white" />
                                      </div>
                                }
                            </div>
                            <span className={`text-sm font-semibold transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>
                                {siteName}
                            </span>
                        </Link>

                        {/* Desktop nav */}
                        <nav className="hidden lg:flex items-center gap-0.5">
                            {NAV_LINKS.map((l) => {
                                const active = currentPath === l.href;
                                return (
                                    <Link key={l.href} href={l.href}
                                        className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                                            active
                                                ? (scrolled ? 'text-red-600 bg-red-50' : 'text-white bg-white/15')
                                                : (scrolled ? 'text-gray-600 hover:text-red-600 hover:bg-red-50' : 'text-white/80 hover:text-white hover:bg-white/10')
                                        }`}>
                                        {l.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* CTA */}
                        <div className="hidden lg:flex items-center gap-2">
                            {bookingOn && (
                                <Link href={BOOKING_LINK.href}
                                    className={`flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md ${
                                        currentPath === BOOKING_LINK.href
                                            ? 'bg-red-700 text-white'
                                            : 'bg-red-600 hover:bg-red-700 text-white'
                                    }`}>
                                    <Calendar className="w-4 h-4" />
                                    {BOOKING_LINK.label}
                                </Link>
                            )}
                        </div>

                        {/* Mobile btn */}
                        <button onClick={() => setMenuOpen(!menuOpen)}
                            className={`lg:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-gray-700' : 'text-white'}`}>
                            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                <div className={`lg:hidden transition-all duration-300 overflow-hidden ${menuOpen ? 'max-h-screen bg-white border-b border-gray-100 shadow-lg' : 'max-h-0'}`}>
                    <div className="px-4 py-4 flex flex-col gap-1">
                        {NAV_LINKS.map((l) => (
                            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                                className={`px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                                    currentPath === l.href ? 'text-red-600 bg-red-50' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                                }`}>
                                {l.label}
                            </Link>
                        ))}
                        <div className="mt-2 flex flex-col gap-2">
                            {bookingOn && (
                                <Link href={BOOKING_LINK.href} onClick={() => setMenuOpen(false)}
                                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-3 rounded-xl transition-all text-center flex items-center justify-center gap-2">
                                    <Calendar className="w-4 h-4" /> {BOOKING_LINK.label}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── PAGE CONTENT ────────────────────────────────────────────── */}
            <main>{children}</main>

            {/* ── FOOTER ──────────────────────────────────────────────────── */}
            <footer className="bg-[#111111] text-gray-400">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

                        {/* Brand */}
                        <div>
                            <div className="flex items-center gap-2.5 mb-5">
                                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                                    {logoUrl
                                        ? <img src={logoUrl} alt={siteName} className="w-full h-full object-contain" />
                                        : <div className="w-full h-full bg-red-600 flex items-center justify-center shadow-sm">
                                            <Smile className="w-9 h-9 text-white" />
                                          </div>
                                    }
                                </div>
                                <span className="text-white text-sm font-semibold">{siteName}</span>
                            </div>
                            <p className="text-sm leading-relaxed mb-6 text-gray-500">
                                {s.site_tagline || 'Таны инээмсэглэл бол биднийг урам зориулдаг зүйл.'}
                            </p>
                            {/* Social links */}
                            <div className="flex gap-2.5">
                                <a href={fbUrl} target="_blank" rel="noreferrer"
                                    className="w-9 h-9 bg-white/5 hover:bg-red-600 border border-white/10 rounded-lg flex items-center justify-center transition-all">
                                    <Facebook className="w-4 h-4" />
                                </a>
                                <a href={igUrl} target="_blank" rel="noreferrer"
                                    className="w-9 h-9 bg-white/5 hover:bg-red-600 border border-white/10 rounded-lg flex items-center justify-center transition-all">
                                    <Instagram className="w-4 h-4" />
                                </a>
                                <a href="#"
                                    className="w-9 h-9 bg-white/5 hover:bg-red-600 border border-white/10 rounded-lg flex items-center justify-center transition-all">
                                    <Youtube className="w-4 h-4" />
                                </a>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div>
                            <h4 className="text-white font-semibold mb-5 text-xs uppercase tracking-widest">Навигаци</h4>
                            <ul className="flex flex-col gap-2.5">
                                {NAV_LINKS.map((l) => (
                                    <li key={l.href}>
                                        <Link href={l.href}
                                            className="text-sm text-gray-500 hover:text-white transition-colors inline-flex items-center gap-1.5 group">
                                            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-0 transition-all" />
                                            {l.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Services */}
                        <div>
                            <h4 className="text-white font-semibold mb-5 text-xs uppercase tracking-widest">Үйлчилгээ</h4>
                            <ul className="flex flex-col gap-2.5">
                                {['Invisalign', 'Металл брекет', 'Мэлмий брекет', 'Retainer', 'Хүүхдийн засал', 'Шүд авалт'].map((sv) => (
                                    <li key={sv}>
                                        <Link href="/services"
                                            className="text-sm text-gray-500 hover:text-white transition-colors inline-flex items-center gap-1.5 group">
                                            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-0 transition-all" />
                                            {sv}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Contact — settings-оос */}
                        <div>
                            <h4 className="text-white font-semibold mb-5 text-xs uppercase tracking-widest">Холбоо барих</h4>
                            <ul className="flex flex-col gap-4">
                                {phone && (
                                    <li className="flex items-center gap-3 text-sm text-gray-500 hover:text-white transition-colors">
                                        <Phone className="w-4 h-4 text-red-500/70 flex-shrink-0" />
                                        <a href={`tel:${phone}`}>{phone}</a>
                                    </li>
                                )}
                                {email && (
                                    <li className="flex items-center gap-3 text-sm text-gray-500 hover:text-white transition-colors">
                                        <Mail className="w-4 h-4 text-red-500/70 flex-shrink-0" />
                                        <a href={`mailto:${email}`}>{email}</a>
                                    </li>
                                )}
                                {workHours && (
                                    <li className="flex items-start gap-3 text-sm text-gray-500">
                                        <Clock className="w-4 h-4 text-red-500/70 flex-shrink-0 mt-0.5" />
                                        <span>{workHours}</span>
                                    </li>
                                )}
                                {address && (
                                    <li className="flex items-start gap-3 text-sm text-gray-500">
                                        <MapPin className="w-4 h-4 text-red-500/70 flex-shrink-0 mt-0.5" />
                                        <span>{address}</span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-gray-600">
                            © {new Date().getFullYear()} {siteName}. Бүх эрх хуулиар хамгаалагдсан.
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                            <a href="#" className="hover:text-gray-400 transition-colors">Нууцлалын бодлого</a>
                            <span>·</span>
                            <a href="#" className="hover:text-gray-400 transition-colors">Үйлчилгээний нөхцөл</a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* ── TOAST ───────────────────────────────────────────────────── */}
            <ToastContainer />
        </div>
    );
}
