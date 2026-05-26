import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { MySidebar } from '@/components/my-sidebar';
import { NotificationBell } from '@/components/notification-bell';
import { ChatIcon } from '@/components/chat-icon';
import { ToastContainer } from '@/components/toast';
import { useAppearance } from '@/hooks/use-appearance';
import { type BreadcrumbItem } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle, ArrowLeftRight, BookOpen, Briefcase,
    CalendarCheck, CalendarDays, ChevronRight, DollarSign,
    Eye, EyeOff, FileText, Home, KeyRound,
    LayoutGrid, LogOut, MessageCircle, MessageSquare, Monitor, Moon,
    Package, Smile, Stethoscope, Sun, Umbrella, UserCircle2, X,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

interface Props {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}
interface PageProps {
    auth: { employee?: { full_name: string; position: string | null; extra_portals?: string[] } | null };
    [key: string]: unknown;
}

const RED = '#dc2626';

/* ── All menu items for "Дэлгэрэнгүй" sheet ─────────────────────────────── */
const MORE_ITEMS = [
    { label: 'Ажлын хуваарь',   Icon: CalendarCheck, href: '/my/work-schedule',    color: '#2563eb', bg: '#eff6ff' },
    { label: 'Чөлөөний хүсэлт', Icon: CalendarDays,  href: '/my/leave-requests',   color: RED,       bg: '#fef2f2' },
    { label: 'Ээлжийн амралтын хүсэлт', Icon: Umbrella, href: '/my/vacation-requests', color: '#059669', bg: '#f0fdf4' },
    { label: 'Цалингийн задаргаа', Icon: DollarSign, href: '/my/payroll',           color: '#059669', bg: '#f0fdf4' },
    { label: 'Номын сан',        Icon: BookOpen,      href: '/my/book-rentals',     color: '#7c3aed', bg: '#faf5ff' },
    { label: 'Тоног төхөөрөмж', Icon: Package,       href: '/my/equipment',        color: '#0891b2', bg: '#ecfeff' },
    { label: 'Санал хүсэлт',    Icon: MessageSquare, href: '/my/feedback',         color: '#ea580c', bg: '#fff7ed' },
    { label: 'Сануулга / Зөрчил', Icon: AlertTriangle, href: '/my/warnings',       color: '#d97706', bg: '#fffbeb' },
    { label: 'Баримт бичиг',    Icon: FileText,      href: '/my/documents',        color: '#475569', bg: '#f8fafc' },
];

export default function MyLayout({ children, breadcrumbs = [] }: Props) {
    const page = usePage<PageProps>();
    const { url } = page;
    const employee    = page.props.auth?.employee;
    const positionLower = (employee?.position ?? '').toLowerCase();
    const extras       = (employee?.extra_portals ?? []) as string[];
    // Ресепшний урамшуулал: үндсэн ресепшн, ЭСВЭЛ extra_portals дотор 'reception' (сувилагч мөн ресепшний ажил хийдэг)
    const isReception = positionLower.includes('ресепш') || extras.includes('reception');
    const isNurse     = positionLower.includes('сувилагч');
    const moreItems = [
        ...MORE_ITEMS.slice(0, 4), // ажлын хуваарь, чөлөө, амралт, цалин
        ...(isReception ? [{ label: 'Ресепшний урамшуулал', Icon: Smile,        href: '/my/reception-bonus', color: '#ec4899', bg: '#fdf2f8' }] : []),
        ...(isNurse     ? [{ label: 'Сувилагчийн урамшуулал', Icon: Stethoscope, href: '/my/nurse-bonus',    color: '#0d9488', bg: '#f0fdfa' }] : []),
        ...MORE_ITEMS.slice(4), // номын сан, тоног, санал, сануулга, баримт
    ];
    const { appearance, updateAppearance } = useAppearance();

    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const [showModal,    setShowModal]    = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showMore,     setShowMore]     = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({ password: '' });

    function handleSwitch(e: FormEvent) {
        e.preventDefault();
        post('/portal/verify-switch', {
            onSuccess: () => { reset(); setShowModal(false); },
        });
    }

    function cycleAppearance() {
        if (appearance === 'light') updateAppearance('dark');
        else if (appearance === 'dark') updateAppearance('system');
        else updateAppearance('light');
    }
    const AppearanceIcon  = appearance === 'dark' ? Moon : appearance === 'light' ? Sun : Monitor;
    const appearanceLabel = appearance === 'dark' ? 'Харанхуй горим' : appearance === 'light' ? 'Гэрэл горим' : 'Системийн горим';

    const isHome = url === '/my/home'              || url.startsWith('/my/home?')
        || url === '/my/leave-requests'    || url.startsWith('/my/leave-requests?')
        || url === '/my/vacation-requests' || url.startsWith('/my/vacation-requests?')
        || url === '/my/payroll'           || url.startsWith('/my/payroll?')
        || url === '/my/work-schedule'     || url.startsWith('/my/work-schedule?')
        || url === '/my/book-rentals'      || url.startsWith('/my/book-rentals?')
        || url === '/my/equipment'         || url.startsWith('/my/equipment?')
        || url === '/my/feedback'          || url.startsWith('/my/feedback?')
        || url === '/my/warnings'          || url.startsWith('/my/warnings?')
        || url === '/my/documents'         || url.startsWith('/my/documents?')
        || url === '/my/profile'           || url.startsWith('/my/profile?')
        || url === '/my/nurse-bonus'       || url.startsWith('/my/nurse-bonus?')
        || url === '/my/reception-bonus'   || url.startsWith('/my/reception-bonus?')
        || url === '/my/change-password'   || url.startsWith('/my/change-password?');
    // Чат хуудсан дээр top bar + bottom nav-ыг нуугаад full-screen чат болгоно.
    const isChat = url === '/my/chat' || url.startsWith('/my/chat?');
    const pageTitle = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].title : 'HR хэсэг';

    /* ── nav tabs ── */
    const NAV = [
        { Icon: Home,          label: 'Нүүр',  href: '/my/home' },
        { Icon: MessageCircle, label: 'Чат',   href: '/my/chat' },
        { Icon: DollarSign,    label: 'Цалин', href: '/my/payroll' },
        { Icon: CalendarDays,  label: 'Чөлөө', href: '/my/leave-requests' },
    ];

    return (
        <>
            {isMobile ? (
                <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--my-page-bg)', position: 'relative' }}>

                    {/* Top bar — hidden on home + chat (has own hero banner) */}
                    {!isHome && !isChat && (
                        <header className="bg-card border-b border-border"
                            style={{ height: '3.25rem', flexShrink: 0, display: 'flex', alignItems: 'center', paddingInline: 16 }}>
                            <Link href="/my/profile" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}>
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <UserCircle2 size={17} color="#555" />
                                </div>
                            </Link>
                            <span className="text-foreground"
                                style={{ fontSize: 17, fontWeight: 700, flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {pageTitle}
                            </span>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                                <ChatIcon />
                                <NotificationBell />
                            </div>
                        </header>
                    )}

                    <main style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {children}
                    </main>

                    {/* ── Floating pill nav ── */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
                        padding: '0 20px',
                        paddingBottom: 'calc(14px + env(safe-area-inset-bottom,0px))',
                        pointerEvents: 'none',
                    }}>
                        <nav style={{
                            display: 'flex', alignItems: 'center',
                            background: 'var(--my-card-bg)',
                            borderRadius: 999,
                            padding: 5,
                            boxShadow: '0 4px 28px rgba(0,0,0,0.13), 0 1px 6px rgba(0,0,0,0.07)',
                            pointerEvents: 'auto',
                        }}>
                            {NAV.map(({ Icon, href }) => {
                                const active = url === href || url.startsWith(href + '?') || (href !== '/my/home' && url.startsWith(href));
                                return (
                                    <Link key={href} href={href} style={{
                                        flex: 1, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', textDecoration: 'none', padding: '4px 0',
                                    }}>
                                        <div style={{
                                            width: 46, height: 46, borderRadius: 999,
                                            background: active ? 'var(--my-text)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'background 0.18s ease',
                                        }}>
                                            <Icon style={{
                                                width: 22, height: 22,
                                                strokeWidth: active ? 2.3 : 1.7,
                                                color: active ? 'var(--my-card-bg)' : 'var(--my-muted)',
                                            }} />
                                        </div>
                                    </Link>
                                );
                            })}

                            {/* Дэлгэрэнгүй */}
                            <button onClick={() => setShowMore(true)} style={{
                                flex: 1, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', background: 'none',
                                border: 'none', cursor: 'pointer', padding: '4px 0',
                            }}>
                                <div style={{
                                    width: 46, height: 46, borderRadius: 999, background: 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <LayoutGrid style={{ width: 22, height: 22, strokeWidth: 1.7, color: 'var(--my-muted)' }} />
                                </div>
                            </button>

                            {/* Портал шилжих */}
                            <button onClick={() => setShowModal(true)} style={{
                                flex: 1, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', background: 'none',
                                border: 'none', cursor: 'pointer', padding: '4px 0',
                            }}>
                                <div style={{
                                    width: 46, height: 46, borderRadius: 999, background: 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <ArrowLeftRight style={{ width: 22, height: 22, strokeWidth: 1.7, color: RED }} />
                                </div>
                            </button>
                        </nav>
                    </div>

                    {/* ── "Дэлгэрэнгүй" bottom sheet ── */}
                    {showMore && (
                        <div
                            onClick={() => setShowMore(false)}
                            style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
                        >
                            <div
                                onClick={e => e.stopPropagation()}
                                style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'var(--my-sheet-bg)',
                                    borderRadius: '28px 28px 0 0',
                                    paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 12px)',
                                    boxShadow: '0 -4px 40px rgba(0,0,0,0.18)',
                                }}
                            >
                                {/* Handle */}
                                <div style={{ width: 40, height: 5, background: 'var(--my-divider)', borderRadius: 99, margin: '12px auto 16px' }} />

                                {/* Grid of menu items */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '0 16px 14px' }}>
                                    {moreItems.map(({ label, Icon: I, href, color, bg }) => (
                                        <Link key={href} href={href} onClick={() => setShowMore(false)} style={{ textDecoration: 'none' }}>
                                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 20, padding: '16px 10px 13px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
                                                <div style={{ width: 46, height: 46, borderRadius: 16, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <I size={21} color={color} />
                                                </div>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--my-text)', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>

                                {/* Action list */}
                                <div style={{ margin: '0 16px 0', background: 'var(--my-card-bg)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
                                    <button onClick={cycleAppearance} style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                                        padding: '15px 18px', background: 'none', border: 'none', cursor: 'pointer',
                                        borderBottom: '1px solid var(--my-divider)',
                                    }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--my-pill-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <AppearanceIcon size={18} color="var(--my-muted)" />
                                        </div>
                                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--my-text)', textAlign: 'left' }}>{appearanceLabel}</span>
                                        <ChevronRight size={16} color="var(--my-faint)" />
                                    </button>
                                    <Link href="/my/change-password" onClick={() => setShowMore(false)} style={{ textDecoration: 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px', borderBottom: '1px solid var(--my-divider)' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--my-pill-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <KeyRound size={18} color="var(--my-muted)" />
                                            </div>
                                            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--my-text)' }}>Нууц үг солих</span>
                                            <ChevronRight size={16} color="var(--my-faint)" />
                                        </div>
                                    </Link>
                                    <button
                                        onClick={() => { setShowMore(false); router.post('/logout'); }}
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <LogOut size={18} color={RED} />
                                        </div>
                                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: RED, textAlign: 'left' }}>Системээс гарах</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <ToastContainer />
                </div>
            ) : (
                <AppShell variant="sidebar">
                    <MySidebar />
                    <AppContent variant="sidebar">
                        <AppSidebarHeader breadcrumbs={breadcrumbs} />
                        {children}
                    </AppContent>
                    <ToastContainer />
                </AppShell>
            )}

            {/* ── Portal switch password modal ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-foreground">Нууц үгийг баталгаажуулна уу</h3>
                                <p className="mt-0.5 text-xs text-muted-foreground">Ажлын хэсэгт орохын тулд нууц үгээ оруулна уу</p>
                            </div>
                            <button onClick={() => { setShowModal(false); reset(); }}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSwitch} className="space-y-4">
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                    placeholder="Нууц үг"
                                    autoFocus
                                    className="w-full rounded-xl border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <button type="button" onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                                {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" disabled={processing || !data.password}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                                    {processing
                                        ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        : <Briefcase className="size-4" />}
                                    Ажлын хэсэгт орох
                                </button>
                                <button type="button" onClick={() => { setShowModal(false); reset(); }}
                                    className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
                                    Цуцлах
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
