import { NavDoctorUser } from '@/components/nav-doctor-user';
import {
    Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
    SidebarMenu, SidebarMenuButton, SidebarMenuItem,
    SidebarGroup, SidebarGroupContent,
} from '@/components/ui/sidebar';
import { useAppearance } from '@/hooks/use-appearance';
import { Link, useForm, usePage } from '@inertiajs/react';
import { CalendarClock, CalendarDays, Eye, EyeOff, KeyRound, LayoutGrid, Lock, Monitor, Moon, Sun, UserCircle2, UserRound, Users, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import AppLogo from './app-logo';

const navItems = [
    { title: 'Хяналтын самбар', url: '/doctor/dashboard',    icon: LayoutGrid },
    { title: 'Календарь',       url: '/doctor/calendar',      icon: CalendarDays },
    { title: 'Онлайн цаг',      url: '/doctor/online-slots',  icon: CalendarClock },
    { title: 'Өвчтний карт',   url: '/doctor/patients',      icon: Users },
    { title: 'Миний профайл',   url: '/doctor/profile',       icon: UserCircle2 },
];

interface PageProps {
    auth: { doctor?: { has_online_booking?: boolean; employee_id?: number | null } | null };
    [key: string]: unknown;
}

export function DoctorSidebar() {
    const { url, props } = usePage<PageProps>();
    const hasOnlineBooking = props.auth?.doctor?.has_online_booking !== false;
    const hasEmployee = !!props.auth?.doctor?.employee_id;
    const { appearance, updateAppearance } = useAppearance();

    const [showModal,    setShowModal]    = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({ password: '', destination: 'hr' });

    const cycleAppearance = () => {
        if (appearance === 'light') updateAppearance('dark');
        else if (appearance === 'dark') updateAppearance('system');
        else updateAppearance('light');
    };

    function handleSwitch(e: FormEvent) {
        e.preventDefault();
        post('/portal/verify-switch', {
            onSuccess: () => { reset(); setShowModal(false); },
        });
    }

    const AppearanceIcon = appearance === 'dark' ? Moon : appearance === 'light' ? Sun : Monitor;
    const appearanceLabel = appearance === 'dark' ? 'Харанхуй горим' : appearance === 'light' ? 'Гэрэл горим' : 'Системийн горим';

    return (
        <>
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/doctor/dashboard">
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => {
                                const isActive =
                                    url === item.url ||
                                    url.startsWith(item.url + '?') ||
                                    (item.url !== '/doctor/dashboard' && url.startsWith(item.url));
                                const isLocked = item.url === '/doctor/online-slots' && !hasOnlineBooking;
                                return (
                                    <SidebarMenuItem key={item.url}>
                                        <SidebarMenuButton asChild isActive={isActive} tooltip={isLocked ? 'Нэвтрэх эрх байхгүй' : item.title}>
                                            <Link href={item.url} className={isLocked ? 'opacity-50' : ''}>
                                                <item.icon className="size-4 shrink-0" />
                                                <span>{item.title}</span>
                                                {isLocked && <Lock className="ml-auto size-3 shrink-0 text-muted-foreground" />}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={cycleAppearance} tooltip={appearanceLabel}>
                            <AppearanceIcon className="size-4 shrink-0" />
                            <span>{appearanceLabel}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    {hasEmployee && (
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setShowModal(true)}
                                tooltip="HR хэсэгт орох"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                                <UserRound className="size-4 shrink-0" />
                                <span>HR хэсэг</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
                <NavDoctorUser />
            </SidebarFooter>
        </Sidebar>

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
                                    className="w-full rounded-xl border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow"
                                />
                                <button type="button" onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" disabled={processing || !data.password}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {processing
                                    ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    : <UserRound className="size-4" />}
                                HR хэсэгт орох
                            </button>
                            <button type="button" onClick={() => { setShowModal(false); reset(); }}
                                className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
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
