import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { DoctorSidebar } from '@/components/doctor-sidebar';
import { ToastContainer } from '@/components/toast';
import { type BreadcrumbItem } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeftRight, CalendarClock, CalendarDays, ChevronRight,
    Eye, EyeOff, Grid3x3, KeyRound, LayoutGrid, UserCircle2, UserRound, Users, X,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

type FullPageProps = PageProps & { site_settings?: { site_logo?: string; site_name?: string } };

interface PageProps {
    auth: { doctor?: { has_online_booking?: boolean; employee_id?: number | null } | null };
    [key: string]: unknown;
}

interface Props {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

const RED = '#dc2626';

export default function DoctorLayout({ children, breadcrumbs = [] }: Props) {
    const { url, props } = usePage<FullPageProps>();
    const hasOnlineBooking = props.auth?.doctor?.has_online_booking !== false;
    const hasEmployee      = !!props.auth?.doctor?.employee_id;
    const logoUrl          = props.site_settings?.site_logo || '/img/black.png';

    /* ── pill nav active check ── */
    const isActive = (href: string) =>
        url === href || url.startsWith(href + '?') ||
        (href !== '/doctor/dashboard' && url.startsWith(href));

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
    const { data, setData, post, processing, errors, reset } = useForm({ password: '', destination: 'hr' });

    function handleSwitch(e: FormEvent) {
        e.preventDefault();
        post('/portal/verify-switch', {
            onSuccess: () => { reset(); setShowModal(false); },
        });
    }

    /* ── "Дэлгэрэнгүй" sheet items ── */
    const sheetItems = [
        ...(hasOnlineBooking ? [{ label: 'Онлайн цагууд', Icon: CalendarClock, href: '/doctor/online-slots', color: '#2563eb', bg: '#eff6ff' }] : []),
        { label: 'Профайл', Icon: UserCircle2, href: '/doctor/profile', color: '#7c3aed', bg: '#faf5ff' },
    ];

    return (
        <>
            {isMobile ? (
                /* ══════════════════ MOBILE ══════════════════ */
                <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--background)', position: 'relative' }}>

                    {/* ── Page content ── */}
                    <main style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                        {children}
                    </main>

                    {/* ══ Floating pill nav ══ */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
                        padding: '0 18px',
                        paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
                        pointerEvents: 'none',
                    }}>
                        <nav style={{
                            display: 'flex', alignItems: 'center',
                            background: 'var(--card)',
                            borderRadius: 999,
                            padding: 5,
                            boxShadow: '0 4px 28px rgba(0,0,0,0.13), 0 1px 6px rgba(0,0,0,0.07)',
                            pointerEvents: 'auto',
                        }}>

                            {/* Самбар */}
                            {[
                                { href: '/doctor/dashboard', Icon: LayoutGrid },
                                { href: '/doctor/calendar',  Icon: CalendarDays },
                                { href: '/doctor/patients',  Icon: Users },
                            ].map(({ href, Icon }) => {
                                const active = isActive(href);
                                return (
                                    <Link key={href} href={href} style={{
                                        flex: 1, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', textDecoration: 'none', padding: '4px 0',
                                    }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 999,
                                            background: active ? RED : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'background 0.18s ease',
                                            boxShadow: active ? '0 4px 12px rgba(220,38,38,0.35)' : 'none',
                                        }}>
                                            <Icon style={{
                                                width: 22, height: 22,
                                                strokeWidth: active ? 2.4 : 1.7,
                                                color: active ? 'white' : 'var(--muted-foreground)',
                                                transition: 'color 0.18s ease',
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
                                    width: 48, height: 48, borderRadius: 999,
                                    background: 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Grid3x3 style={{ width: 22, height: 22, strokeWidth: 1.7, color: 'var(--muted-foreground)' }} />
                                </div>
                            </button>

                            {/* HR шилжих (only if employee) */}
                            {hasEmployee && (
                                <button onClick={() => setShowModal(true)} style={{
                                    flex: 1, display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', background: 'none',
                                    border: 'none', cursor: 'pointer', padding: '4px 0',
                                }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: 999,
                                        background: 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <ArrowLeftRight style={{ width: 22, height: 22, strokeWidth: 1.7, color: RED }} />
                                    </div>
                                </button>
                            )}

                        </nav>
                    </div>

                    {/* ══ "Дэлгэрэнгүй" bottom sheet ══ */}
                    {showMore && (
                        <div
                            onClick={() => setShowMore(false)}
                            style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
                        >
                            <div
                                onClick={e => e.stopPropagation()}
                                style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'var(--card)',
                                    borderRadius: '28px 28px 0 0',
                                    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
                                    boxShadow: '0 -4px 40px rgba(0,0,0,0.18)',
                                }}
                            >
                                {/* Handle */}
                                <div style={{ width: 40, height: 5, background: 'var(--border)', borderRadius: 99, margin: '12px auto 18px' }} />

                                {/* Label */}
                                <p style={{ margin: '0 20px 12px', fontSize: 13, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: 0.3 }}>
                                    ЦЭС
                                </p>

                                {/* Grid items */}
                                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sheetItems.length < 3 ? sheetItems.length : 3}, 1fr)`, gap: 10, padding: '0 16px 16px' }}>
                                    {sheetItems.map(({ label, Icon: I, href, color, bg }) => (
                                        <Link key={href} href={href} onClick={() => setShowMore(false)} style={{ textDecoration: 'none' }}>
                                            <div style={{
                                                background: 'var(--background)',
                                                borderRadius: 20, padding: '16px 10px 13px',
                                                boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
                                                border: `1px solid ${isActive(href) ? color : 'transparent'}`,
                                            }}>
                                                <div style={{ width: 48, height: 48, borderRadius: 16, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <I size={22} color={color} />
                                                </div>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground)', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>

                                {/* Action list */}
                                <div style={{ margin: '0 16px', background: 'var(--background)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                                    {hasEmployee && (
                                        <button
                                            onClick={() => { setShowMore(false); setShowModal(true); }}
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                        >
                                            <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <ArrowLeftRight size={18} color={RED} />
                                            </div>
                                            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: RED, textAlign: 'left' }}>HR хэсэгт шилжих</span>
                                            <ChevronRight size={16} color={RED} style={{ opacity: 0.5 }} />
                                        </button>
                                    )}
                                    <Link href="/doctor/profile" onClick={() => setShowMore(false)} style={{ textDecoration: 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px', borderBottom: hasEmployee ? 'none' : '1px solid var(--border)' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <UserCircle2 size={18} color="#7c3aed" />
                                            </div>
                                            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>Профайл харах</span>
                                            <ChevronRight size={16} color="var(--muted-foreground)" style={{ opacity: 0.5 }} />
                                        </div>
                                    </Link>
                                </div>

                                <div style={{ height: 8 }} />
                            </div>
                        </div>
                    )}

                    <ToastContainer />
                </div>

            ) : (
                /* ══════════════════ DESKTOP ══════════════════ */
                <AppShell variant="sidebar">
                    <DoctorSidebar />
                    <AppContent variant="sidebar">
                        <AppSidebarHeader breadcrumbs={breadcrumbs} />
                        {children}
                    </AppContent>
                    <ToastContainer />
                </AppShell>
            )}

            {/* ══ HR switch password modal ══ */}
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
