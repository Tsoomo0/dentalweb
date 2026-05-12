import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
    DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
    SidebarMenu, SidebarMenuButton, SidebarMenuItem,
    SidebarGroup, SidebarGroupContent,
    useSidebar,
} from '@/components/ui/sidebar';
import { useAppearance } from '@/hooks/use-appearance';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle, BookOpen, Briefcase, CalendarCheck, CalendarDays, ChevronsUpDown, DollarSign, Eye, EyeOff, FileText, KeyRound,
    LayoutGrid, LogOut, MessageSquare, Monitor, Moon, Package, Smile, Stethoscope, Sun, Umbrella, UserCircle2, X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import AppLogo from './app-logo';

interface PageProps {
    auth: {
        employee?: {
            full_name: string;
            photo_url: string | null;
            position: string | null;
        } | null;
    };
    [key: string]: unknown;
}

export function MySidebar() {
    const { url, props } = usePage<PageProps>();
    const employee = props.auth?.employee;

    const isReception = (employee?.position ?? '').toLowerCase().includes('ресепш');
    const isNurse     = (employee?.position ?? '').toLowerCase().includes('сувилагч');

    const navItems = [
        { title: 'Хяналтын самбар',       url: '/my/home',              icon: LayoutGrid },
        { title: 'Хувийн мэдээлэл',      url: '/my/profile',           icon: UserCircle2 },
        { title: 'Ажлын хуваарь',        url: '/my/work-schedule',     icon: CalendarCheck },
        { title: 'Чөлөөний хүсэлт',      url: '/my/leave-requests',    icon: CalendarDays },
        { title: 'Ээлжийн амралт',        url: '/my/vacation-requests', icon: Umbrella },
        { title: 'Цалингийн задаргаа',    url: '/my/payroll',           icon: DollarSign },
        ...(isReception ? [{ title: 'Урамшуулал', url: '/my/reception-bonus', icon: Smile }] : []),
        ...(isNurse ? [{ title: 'Урамшуулал', url: '/my/nurse-bonus', icon: Stethoscope }] : []),
        { title: 'Номын сан',             url: '/my/book-rentals',      icon: BookOpen },
        { title: 'Тоног төхөөрөмж',       url: '/my/equipment',         icon: Package },
        { title: 'Санал хүсэлт',          url: '/my/feedback',          icon: MessageSquare },
        { title: 'Сануулга / Зөрчил',     url: '/my/warnings',          icon: AlertTriangle },
        { title: 'Баримт бичиг',          url: '/my/documents',         icon: FileText },
    ];
    const { appearance, updateAppearance } = useAppearance();
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    const [showModal,    setShowModal]    = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({ password: '' });

    const AppearanceIcon  = appearance === 'dark' ? Moon : appearance === 'light' ? Sun : Monitor;
    const appearanceLabel = appearance === 'dark' ? 'Харанхуй' : appearance === 'light' ? 'Гэрэл' : 'Систем';

    function cycleAppearance() {
        if (appearance === 'light') updateAppearance('dark');
        else if (appearance === 'dark') updateAppearance('system');
        else updateAppearance('light');
    }

    function handleSwitch(e: FormEvent) {
        e.preventDefault();
        post('/portal/verify-switch', {
            onSuccess: () => { reset(); setShowModal(false); },
        });
    }

    function initials(name: string) {
        return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'HR';
    }

    return (
        <>
            <Sidebar collapsible="icon" variant="inset">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild>
                                <Link href="/my/home"><AppLogo /></Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {navItems.map(item => {
                                    const isActive = url === item.url || url.startsWith(item.url + '?');
                                    return (
                                        <SidebarMenuItem key={item.url}>
                                            <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                                                <Link href={item.url}>
                                                    <item.icon className="size-4 shrink-0" />
                                                    <span>{item.title}</span>
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
                        {/* Appearance */}
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={cycleAppearance} tooltip={appearanceLabel}>
                                <AppearanceIcon className="size-4 shrink-0" />
                                <span>{appearanceLabel}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        {/* Switch to work portal */}
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setShowModal(true)}
                                tooltip="Ажлын хэсэгт орох"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                                <Briefcase className="size-4 shrink-0" />
                                <span>Ажлын хэсэг</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        {/* User dropdown */}
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarMenuButton
                                        size="lg"
                                        className="data-[state=open]:bg-sidebar-accent text-sidebar-accent-foreground"
                                    >
                                        <Avatar className="h-8 w-8 overflow-hidden rounded-lg">
                                            <AvatarImage src={employee?.photo_url ?? undefined} className="object-cover object-top" />
                                            <AvatarFallback className="rounded-lg bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 text-xs font-bold">
                                                {initials(employee?.full_name ?? 'HR')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-medium">{employee?.full_name ?? '—'}</span>
                                            <span className="truncate text-xs text-muted-foreground">{employee?.position ?? 'HR хэсэг'}</span>
                                        </div>
                                        <ChevronsUpDown className="ml-auto size-4" />
                                    </SidebarMenuButton>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                    className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                                    align="end"
                                    side={isMobile ? 'bottom' : state === 'collapsed' ? 'left' : 'bottom'}
                                >
                                    <DropdownMenuLabel className="p-0 font-normal">
                                        <div className="flex items-center gap-2 px-2 py-2">
                                            <Avatar className="h-8 w-8 rounded-lg overflow-hidden">
                                                <AvatarImage src={employee?.photo_url ?? undefined} className="object-cover object-top" />
                                                <AvatarFallback className="rounded-lg bg-red-100 text-red-700 text-xs font-bold">
                                                    {initials(employee?.full_name ?? 'HR')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="grid flex-1 text-left text-sm leading-tight">
                                                <span className="truncate font-semibold">{employee?.full_name ?? '—'}</span>
                                                <span className="truncate text-xs text-muted-foreground">{employee?.position ?? 'HR хэсэг'}</span>
                                            </div>
                                        </div>
                                    </DropdownMenuLabel>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuGroup>
                                        <DropdownMenuItem asChild>
                                            <Link href="/my/change-password" className="cursor-pointer">
                                                <KeyRound className="mr-2 size-4" />
                                                Нууц үг солих
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                        onClick={() => router.post('/logout')}
                                        className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400"
                                    >
                                        <LogOut className="mr-2 size-4" />
                                        Системээс гарах
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>

            {/* Portal switch password modal */}
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
                                        : <Briefcase className="size-4" />}
                                    Ажлын хэсэгт орох
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
