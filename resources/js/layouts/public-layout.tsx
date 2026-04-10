import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect, type ReactNode } from 'react';
import {
    Menu, X, Phone, Clock, ChevronRight, Calendar,
    Facebook, Instagram, Youtube, Mail, Smile, MapPin, Building2
} from 'lucide-react';

interface Branch { id: number; name: string; phone: string | null; address: string | null }
interface SharedData { auth: { user?: { name: string } }; branches?: Branch[] }

const NAV_LINKS = [
    { label: 'Нүүр', href: '/' },
    { label: 'Бидний тухай', href: '/about' },
    { label: 'Үйлчилгээ', href: '/services' },
    { label: 'Эмч нар', href: '/doctors' },
    { label: 'Үр дүн', href: '/gallery' },
    { label: 'Мэдээ', href: '/articles' },
    { label: 'Холбоо барих', href: '/contact' },
];

export default function PublicLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage<SharedData>().props;
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="text-gray-900 bg-white">
            {/* ── HEADER ── */}
            <header className={`fixed top-0 left-0 right-0 z-50 antialiased transition-all duration-300 ${
                scrolled
                    ? 'bg-white/96 backdrop-blur-md shadow-sm border-b border-gray-100'
                    : 'bg-transparent'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-[68px]">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Smile className="w-5 h-5 text-white" />
                            </div>
                            <span className={`text-xl font-bold transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>
                                Кутикул
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
                        <div className="hidden lg:flex items-center gap-3">
                            {auth.user ? (
                                <Link href="/admin/dashboard"
                                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm">
                                    Хянах самбар
                                </Link>
                            ) : (
                                <Link href="/booking"
                                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Цаг захиалах
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
                        <Link href="/booking" onClick={() => setMenuOpen(false)}
                            className="mt-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all text-center">
                            Цаг захиалах
                        </Link>
                    </div>
                </div>
            </header>

            {/* ── PAGE CONTENT ── */}
            <main>{children}</main>

            {/* ── FOOTER ── */}
            <footer className="bg-[#111111] text-gray-400">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                        {/* Brand */}
                        <div>
                            <div className="flex items-center gap-2.5 mb-5">
                                <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-sm">
                                    <Smile className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white text-xl font-bold">Cuticul</span>
                            </div>
                            <p className="text-sm leading-relaxed mb-6 text-gray-500">
                                Мэргэшсэн гажиг заслын эмнэлэг. Таны гоё инээмсэглэл — манай эрхэм зорилго.
                            </p>
                            <div className="flex gap-2.5">
                                {[Facebook, Instagram, Youtube].map((Icon, i) => (
                                    <a key={i} href="#"
                                        className="w-9 h-9 bg-white/5 hover:bg-red-600 border border-white/10 rounded-lg flex items-center justify-center transition-all">
                                        <Icon className="w-4 h-4" />
                                    </a>
                                ))}
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
                                {['Invisalign', 'Металл брекет', 'Мэлмий брекет', 'Retainer', 'Хүүхдийн засал', 'Шүд авалт'].map((s) => (
                                    <li key={s}>
                                        <Link href="/services"
                                            className="text-sm text-gray-500 hover:text-white transition-colors inline-flex items-center gap-1.5 group">
                                            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-0 transition-all" />
                                            {s}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Contact */}
                        <div>
                            <h4 className="text-white font-semibold mb-5 text-xs uppercase tracking-widest">Холбоо барих</h4>
                            <ul className="flex flex-col gap-4">
                                <li className="flex items-center gap-3 text-sm text-gray-500 hover:text-white transition-colors">
                                    <Phone className="w-4 h-4 text-red-500/70 flex-shrink-0" />
                                    <a href="tel:+97699000000">+976 9900-0000</a>
                                </li>
                                <li className="flex items-center gap-3 text-sm text-gray-500 hover:text-white transition-colors">
                                    <Mail className="w-4 h-4 text-red-500/70 flex-shrink-0" />
                                    <a href="mailto:info@cuticul.mn">info@cuticul.mn</a>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-gray-500">
                                    <Clock className="w-4 h-4 text-red-500/70 flex-shrink-0 mt-0.5" />
                                    <span>Да–Ба: 09:00–18:00<br/>Бя: 10:00–15:00</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-gray-600">
                            © {new Date().getFullYear()} Cuticul. Бүх эрх хуулиар хамгаалагдсан.
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                            <a href="#" className="hover:text-gray-400 transition-colors">Нууцлалын бодлого</a>
                            <span>·</span>
                            <a href="#" className="hover:text-gray-400 transition-colors">Үйлчилгээний нөхцөл</a>
                            {auth.user && (
                                <>
                                    <span>·</span>
                                    <Link href="/admin/dashboard" className="text-red-500 hover:text-red-400">Хянах самбар</Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
