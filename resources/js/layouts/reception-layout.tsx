import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { ReceptionSidebar } from '@/components/reception-sidebar';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

type PageProps = { site_settings?: { site_logo?: string; site_name?: string }; url: string; [key: string]: unknown };
import { CalendarClock, LayoutGrid, UserCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const BOTTOM_NAV = [
    { icon: LayoutGrid,    label: 'Самбар',       href: '/reception/dashboard' },
    { icon: CalendarClock, label: 'Цаг захиалга', href: '/reception/appointments' },
    { icon: UserCircle2,   label: 'Профайл',      href: '/reception/profile' },
];

interface Props {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default function ReceptionLayout({ children, breadcrumbs = [] }: Props) {
    const { url, props } = usePage<PageProps>();
    const logoUrl = props.site_settings?.site_logo || '/img/black.png';

    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    /* ── MOBILE: app-shell layout ── */
    if (isMobile) {
        const pageTitle = breadcrumbs.length > 0
            ? breadcrumbs[breadcrumbs.length - 1].title
            : 'Ресепшн';

        return (
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
                    {BOTTOM_NAV.map(({ icon: Icon, label, href }) => {
                        const active = url === href
                            || url.startsWith(href + '?')
                            || (href !== '/reception/dashboard' && url.startsWith(href));
                        return (
                            <Link key={href} href={href}
                                style={{
                                    flex: 1, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', gap: 3,
                                    textDecoration: 'none',
                                    color: active ? '#22c55e' : 'hsl(var(--muted-foreground))',
                                }}>
                                <Icon style={{ width: 22, height: 22 }} />
                                <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <ToastContainer />
            </div>
        );
    }

    /* ── DESKTOP: sidebar layout ── */
    return (
        <AppShell variant="sidebar">
            <ReceptionSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
            <ToastContainer />
        </AppShell>
    );
}
