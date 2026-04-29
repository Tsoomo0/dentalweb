import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { DoctorSidebar } from '@/components/doctor-sidebar';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

type FullPageProps = PageProps & { site_settings?: { site_logo?: string; site_name?: string } };
import { CalendarClock, CalendarDays, LayoutGrid, Lock, UserCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PageProps {
    auth: { doctor?: { has_online_booking?: boolean } | null };
    [key: string]: unknown;
}

interface Props {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default function DoctorLayout({ children, breadcrumbs = [] }: Props) {
    const { url, props } = usePage<FullPageProps>();
    const hasOnlineBooking = props.auth?.doctor?.has_online_booking !== false;
    const logoUrl          = props.site_settings?.site_logo || '/img/black.png';

    const BOTTOM_NAV = [
        { icon: LayoutGrid,    label: 'Самбар',    href: '/doctor/dashboard',    locked: false },
        { icon: CalendarDays,  label: 'Календарь', href: '/doctor/calendar',     locked: false },
        { icon: CalendarClock, label: 'Онлайн',    href: '/doctor/online-slots', locked: !hasOnlineBooking },
        { icon: UserCircle2,   label: 'Профайл',   href: '/doctor/profile',      locked: false },
    ];

    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const pageTitle = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].title : 'Эмч';

    return (
        <>
            {isMobile ? (
                /* ── MOBILE ── */
                <div className="bg-background text-foreground"
                    style={{ height: '100svh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Top bar */}
                    <header className="bg-card border-b border-border"
                        style={{ height: '3.5rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, paddingInline: 16 }}>
                        <img src={logoUrl} alt="logo"
                            style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
                        <span className="text-foreground"
                            style={{ fontSize: 15, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pageTitle}
                        </span>
                    </header>

                    {/* Page content */}
                    <main style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                        {children}
                    </main>

                    {/* Bottom tab bar */}
                    <nav className="bg-card border-t border-border"
                        style={{ height: '3.5rem', flexShrink: 0, display: 'flex' }}>
                        {BOTTOM_NAV.map(({ icon: Icon, label, href, locked }) => {
                            const active = url === href
                                || url.startsWith(href + '?')
                                || (href !== '/doctor/dashboard' && url.startsWith(href));
                            return (
                                <Link key={href} href={href}
                                    style={{
                                        flex: 1, display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center', gap: 3,
                                        textDecoration: 'none',
                                        color: active ? '#22c55e' : 'hsl(var(--muted-foreground))',
                                        opacity: locked ? 0.45 : 1,
                                        position: 'relative',
                                    }}>
                                    <Icon style={{ width: 22, height: 22 }} />
                                    <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
                                    {locked && <Lock style={{ position: 'absolute', top: 4, right: '50%', transform: 'translateX(10px)', width: 10, height: 10 }} />}
                                </Link>
                            );
                        })}
                    </nav>

                    <ToastContainer />
                </div>
            ) : (
                /* ── DESKTOP: sidebar layout ── */
                <AppShell variant="sidebar">
                    <DoctorSidebar />
                    <AppContent variant="sidebar">
                        <AppSidebarHeader breadcrumbs={breadcrumbs} />
                        {children}
                    </AppContent>
                    <ToastContainer />
                </AppShell>
            )}
        </>
    );
}
