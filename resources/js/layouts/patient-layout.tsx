import { NotificationBell } from '@/components/notification-bell';
import { ToastContainer } from '@/components/toast';
import { useAppearance, type Appearance } from '@/hooks/use-appearance';
import { type BreadcrumbItem } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    CalendarDays, ChevronRight, FileText, LayoutGrid, LogOut,
    Monitor, Moon, Stethoscope, Sun, UserCircle2, Video, Smile,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

const EMERALD = '#10b981';

/* ── 4 main bottom-nav tabs ── */
const NAV = [
    { Icon: LayoutGrid,   label: 'Хянах самбар',             href: '/patient/dashboard' },
    { Icon: CalendarDays, label: 'Цаг захиалга',              href: '/patient/appointments' },
    { Icon: Stethoscope,  label: 'Эмчилгээ Төлбөрийн түүх',  href: '/patient/treatments' },
    { Icon: UserCircle2,  label: 'Профайл',                   href: '/patient/profile' },
];

/* ── "Дэлгэрэнгүй" sheet extra items ── */
const MORE_ITEMS = [
    { label: 'Онлайн үзлэг',                Icon: Video,    href: '/patient/online-consultation', color: '#10b981', bg: '#ecfdf5' },
    { label: 'Таниулсан зөвшөөрлийн хуудас', Icon: FileText, href: '/patient/consent-forms',       color: '#0891b2', bg: '#ecfeff' },
    { label: 'Үзлэгийн тэмдэглэл',            Icon: Smile,    href: '/patient/ortho-signatures',    color: '#7c3aed', bg: '#f5f3ff' },
];

/* ── Desktop theme-switcher pill ── */
const THEMES: { value: Appearance; icon: typeof Sun; label: string }[] = [
    { value: 'light',  icon: Sun,     label: 'Цайвар' },
    { value: 'system', icon: Monitor, label: 'Систем'  },
    { value: 'dark',   icon: Moon,    label: 'Бараан'  },
];

function DesktopThemeSwitcher() {
    const { appearance, updateAppearance } = useAppearance();
    return (
        <div className="px-3 pb-3">
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Харагдах байдал
            </p>
            <div className="flex gap-0.5 rounded-xl bg-muted p-1">
                {THEMES.map(({ value, icon: Icon, label }) => {
                    const active = appearance === value;
                    return (
                        <button
                            key={value}
                            onClick={() => updateAppearance(value)}
                            title={label}
                            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold transition-all ${
                                active
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Icon className="size-3.5" />
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Desktop nav items ── */
const DESKTOP_NAV = [
    { Icon: LayoutGrid,   label: 'Хянах самбар',                  href: '/patient/dashboard' },
    { Icon: CalendarDays, label: 'Цаг захиалга',                   href: '/patient/appointments' },
    { Icon: Video,        label: 'Онлайн үзлэг',                   href: '/patient/online-consultation' },
    { Icon: Stethoscope,  label: 'Эмчилгээ Төлбөрийн түүх',       href: '/patient/treatments' },
    { Icon: FileText,     label: 'Таниулсан зөвшөөрлийн хуудас',   href: '/patient/consent-forms' },
    { Icon: Smile,        label: 'Үзлэгийн тэмдэглэл',             href: '/patient/ortho-signatures' },
    { Icon: UserCircle2,  label: 'Профайл',                        href: '/patient/profile' },
];

export default function PatientLayout({ children, breadcrumbs = [] }: Props) {
    const { url, props } = usePage<{
        site_settings?: { site_logo?: string; site_name?: string };
        auth?: { user?: { name?: string } };
    }>();

    const logoUrl  = (props.site_settings as any)?.site_logo || '/img/black.png';
    const siteName = (props.site_settings as any)?.site_name ?? 'Кутикул';
    const userName = (props.auth as any)?.user?.name ?? 'Үйлчлүүлэгч';
    const pageTitle = breadcrumbs.length > 0
        ? breadcrumbs[breadcrumbs.length - 1].title
        : 'Үйлчлүүлэгчийн портал';

    const { appearance, updateAppearance } = useAppearance();

    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const [showMore, setShowMore] = useState(false);

    function isActive(href: string) {
        return url === href
            || url.startsWith(href + '?')
            || (href !== '/patient/dashboard' && url.startsWith(href + '/'));
    }

    const isDashboard = url === '/patient/dashboard'            || url.startsWith('/patient/dashboard?')
        || url === '/patient/appointments'                      || url.startsWith('/patient/appointments?')
        || url === '/patient/treatments'                        || url.startsWith('/patient/treatments?')
        || url === '/patient/profile'                           || url.startsWith('/patient/profile?')
        || url === '/patient/consent-forms'                     || url.startsWith('/patient/consent-forms?')
        || url === '/patient/ortho-signatures'                  || url.startsWith('/patient/ortho-signatures?')
        || url === '/patient/online-consultation'               || url.startsWith('/patient/online-consultation?');

    function cycleAppearance() {
        if (appearance === 'light') updateAppearance('dark');
        else if (appearance === 'dark') updateAppearance('system');
        else updateAppearance('light');
    }
    const AppearanceIcon  = appearance === 'dark' ? Moon : appearance === 'light' ? Sun : Monitor;
    const appearanceLabel = appearance === 'dark' ? 'Бараан горим' : appearance === 'light' ? 'Цайвар горим' : 'Системийн горим';

    /* ══════════════════════════════════════════════════════════════════
       MOBILE LAYOUT
    ══════════════════════════════════════════════════════════════════ */
    if (isMobile) {
        return (
            <>
                <div style={{
                    height: '100svh', display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', position: 'relative',
                }}>
                    {/* ── Top bar (hidden on dashboard/home) ── */}
                    {!isDashboard && (
                        <header style={{
                            height: '3.25rem', flexShrink: 0,
                            display: 'flex', alignItems: 'center', paddingInline: 16,
                            background: 'var(--my-page-bg)',
                            borderBottom: '1px solid var(--my-divider)',
                        }}>
                            <Link href="/patient/profile" style={{
                                width: 36, height: 36, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', textDecoration: 'none', flexShrink: 0,
                            }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #10b981, #0891b2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
                                }}>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
                                        {userName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </Link>
                            <span style={{
                                fontSize: 17, fontWeight: 700, flex: 1,
                                textAlign: 'center', overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                color: 'var(--my-text)',
                            }}>
                                {pageTitle}
                            </span>
                            <div style={{ width: 36, display: 'flex', justifyContent: 'flex-end' }}>
                                <NotificationBell />
                            </div>
                        </header>
                    )}

                    {/* ── Content (fills remaining height) ── */}
                    <main style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {children}
                    </main>

                    {/* ── Floating pill nav (overlays content) ── */}
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
                                const active = isActive(href);
                                return (
                                    <Link key={href} href={href} style={{
                                        flex: 1, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', textDecoration: 'none',
                                        padding: '4px 0',
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

                            {/* Цэс */}
                            <button onClick={() => setShowMore(true)} style={{
                                flex: 1, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', background: 'none',
                                border: 'none', cursor: 'pointer', padding: '4px 0',
                            }}>
                                <div style={{
                                    width: 46, height: 46, borderRadius: 999,
                                    background: 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <LayoutGrid style={{ width: 22, height: 22, strokeWidth: 1.7, color: 'var(--my-muted)' }} />
                                </div>
                            </button>
                        </nav>
                    </div>

                    {/* ── App-style bottom sheet ── */}
                    {showMore && (
                        <div
                            onClick={() => setShowMore(false)}
                            style={{
                                position: 'absolute', inset: 0, zIndex: 40,
                                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
                            }}
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
                                <div style={{
                                    width: 40, height: 5, background: 'var(--my-divider)',
                                    borderRadius: 99, margin: '12px auto 16px',
                                }} />

                                {/* Grid items */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 10, padding: '0 16px 14px',
                                }}>
                                    {MORE_ITEMS.map(({ label, Icon: I, href, color, bg }) => (
                                        <Link key={href} href={href} onClick={() => setShowMore(false)} style={{ textDecoration: 'none' }}>
                                            <div style={{
                                                background: 'var(--my-card-bg)', borderRadius: 20,
                                                padding: '16px 10px 13px',
                                                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
                                            }}>
                                                <div style={{
                                                    width: 46, height: 46, borderRadius: 16, background: bg,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <I size={21} color={color} />
                                                </div>
                                                <span style={{
                                                    fontSize: 11, fontWeight: 700,
                                                    color: 'var(--my-text)', textAlign: 'center', lineHeight: 1.3,
                                                }}>
                                                    {label}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>

                                {/* Action list */}
                                <div style={{
                                    margin: '0 16px 0', background: 'var(--my-card-bg)',
                                    borderRadius: 20, overflow: 'hidden',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                                }}>
                                    {/* Theme */}
                                    <button onClick={cycleAppearance} style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                                        padding: '15px 18px', background: 'none', border: 'none', cursor: 'pointer',
                                        borderBottom: '1px solid var(--my-divider)',
                                    }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 13,
                                            background: 'var(--my-pill-bg)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <AppearanceIcon size={18} color="var(--my-muted)" />
                                        </div>
                                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--my-text)', textAlign: 'left' }}>
                                            {appearanceLabel}
                                        </span>
                                        <ChevronRight size={16} color="var(--my-faint)" />
                                    </button>

                                    {/* Logout */}
                                    <button
                                        onClick={() => { setShowMore(false); router.post('/logout'); }}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                                            padding: '15px 18px', background: 'none', border: 'none', cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 13,
                                            background: 'rgba(16,185,129,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <LogOut size={18} color={EMERALD} />
                                        </div>
                                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: EMERALD, textAlign: 'left' }}>
                                            Системээс гарах
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <ToastContainer />
                </div>
            </>
        );
    }

    /* ══════════════════════════════════════════════════════════════════
       DESKTOP LAYOUT  (sidebar unchanged)
    ══════════════════════════════════════════════════════════════════ */
    return (
        <div className="min-h-screen bg-background text-foreground">

            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card">

                {/* Logo */}
                <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
                    <img src={logoUrl} alt={siteName} className="size-8 rounded-lg object-contain" />
                    <div>
                        <p className="text-sm font-bold leading-none text-foreground">{siteName}</p>
                        <p className="text-[10px] leading-none text-muted-foreground mt-0.5">Үйлчлүүлэгчийн портал</p>
                    </div>
                </div>

                {/* User card */}
                <div className="shrink-0 px-4 py-4 border-b border-border">
                    <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs font-bold">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
                            <p className="text-[10px] text-muted-foreground">Үйлчлүүлэгч</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
                    {DESKTOP_NAV.map(({ Icon, label, href }) => (
                        <Link key={href} href={href}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                                isActive(href)
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}>
                            <Icon className="size-4 shrink-0" />
                            {label}
                        </Link>
                    ))}
                </nav>

                {/* Theme switcher */}
                <DesktopThemeSwitcher />

                {/* Logout */}
                <div className="shrink-0 border-t border-border p-3">
                    <Link href="/logout" method="post" as="button"
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                        <LogOut className="size-4 shrink-0" />
                        Гарах
                    </Link>
                </div>
            </aside>

            {/* Content */}
            <div className="ml-64">
                <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-6">
                    <nav className="flex flex-1 items-center gap-1 text-sm">
                        {breadcrumbs.map((b, i) => (
                            <span key={i} className="flex items-center gap-1">
                                {i > 0 && <span className="text-muted-foreground">/</span>}
                                {i < breadcrumbs.length - 1
                                    ? <Link href={b.href ?? '#'} className="text-muted-foreground hover:text-foreground transition-colors">{b.title}</Link>
                                    : <span className="font-medium text-foreground">{b.title}</span>
                                }
                            </span>
                        ))}
                    </nav>
                    <NotificationBell />
                </header>
                <main>{children}</main>
            </div>

            <ToastContainer />
        </div>
    );
}
