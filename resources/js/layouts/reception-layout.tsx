import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { NotificationBell } from '@/components/notification-bell';
import { ReceptionSidebar } from '@/components/reception-sidebar';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';

type PageProps = { site_settings?: { site_logo?: string; site_name?: string }; notifications?: unknown; auth?: { employee?: { full_name: string } | null }; url: string; [key: string]: unknown };
import { CalendarClock, ClipboardList, Eye, EyeOff, KeyRound, LayoutGrid, UserCheck, UserCircle2, UserRound, Users, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

const BOTTOM_NAV = [
    { icon: LayoutGrid,    label: 'Самбар',       href: '/reception/dashboard' },
    { icon: CalendarClock, label: 'Цаг захиалга', href: '/reception/appointments' },
    { icon: Users,         label: 'Өвчтөн',       href: '/reception/patients' },
    { icon: UserCheck,     label: 'Хэрэглэгч',    href: '/reception/patient-users' },
    { icon: UserCircle2,   label: 'Профайл',      href: '/reception/profile' },
];

interface Props {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default function ReceptionLayout({ children, breadcrumbs = [] }: Props) {
    const { url, props } = usePage<PageProps>();
    const logoUrl    = props.site_settings?.site_logo || '/img/black.png';
    const hasNotif   = !!props.notifications;
    const hasEmployee = !!props.auth?.employee;

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
    const { data, setData, post, processing, errors, reset } = useForm({ password: '', destination: 'hr' });

    function handleSwitch(e: FormEvent) {
        e.preventDefault();
        post('/portal/verify-switch', {
            onSuccess: () => { reset(); setShowModal(false); },
        });
    }

    /* ── MOBILE: app-shell layout ── */
    if (isMobile) {
        const pageTitle = breadcrumbs.length > 0
            ? breadcrumbs[breadcrumbs.length - 1].title
            : 'Ресепшн';

        return (
            <>
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
                    {hasNotif && <NotificationBell />}
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
                                    color: active ? '#dc2626' : 'hsl(var(--muted-foreground))',
                                }}>
                                <Icon style={{ width: 22, height: 22 }} />
                                <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
                            </Link>
                        );
                    })}
                    {hasEmployee && (
                        <button
                            onClick={() => setShowModal(true)}
                            style={{
                                flex: 1, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: 3,
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#dc2626',
                            }}>
                            <UserRound style={{ width: 22, height: 22 }} />
                            <span style={{ fontSize: 10, fontWeight: 500 }}>HR хэсэг</span>
                        </button>
                    )}
                </nav>

                <ToastContainer />
            </div>

            {/* HR switch password modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-foreground">Нууц үгийг баталгаажуулна уу</h3>
                                <p className="mt-0.5 text-xs text-muted-foreground">HR хэсэгт орохын тулд нууц үгээ оруулна уу</p>
                            </div>
                            <button onClick={() => { setShowModal(false); reset(); }}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSwitch} className="space-y-4">
                            <div>
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
                                </div>
                                {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" disabled={processing || !data.password}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                                    {processing
                                        ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        : <UserRound className="size-4" />}
                                    HR хэсэгт орох
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
