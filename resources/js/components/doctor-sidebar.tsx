import { NavDoctorUser } from '@/components/nav-doctor-user';
import {
    Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
    SidebarMenu, SidebarMenuButton, SidebarMenuItem,
    SidebarGroup, SidebarGroupContent,
} from '@/components/ui/sidebar';
import { useAppearance } from '@/hooks/use-appearance';
import { Link, usePage } from '@inertiajs/react';
import { CalendarClock, CalendarDays, LayoutGrid, Lock, Monitor, Moon, Sun, UserCircle2 } from 'lucide-react';
import AppLogo from './app-logo';

const navItems = [
    {
        title: 'Хяналтын самбар',
        url:   '/doctor/dashboard',
        icon:  LayoutGrid,
    },
    {
        title: 'Календарь',
        url:   '/doctor/calendar',
        icon:  CalendarDays,
    },
    {
        title: 'Онлайн цаг',
        url:   '/doctor/online-slots',
        icon:  CalendarClock,
    },
    {
        title: 'Миний профайл',
        url:   '/doctor/profile',
        icon:  UserCircle2,
    },
];

interface PageProps {
    auth: { doctor?: { has_online_booking?: boolean } | null };
    [key: string]: unknown;
}

export function DoctorSidebar() {
    const { url, props } = usePage<PageProps>();
    const hasOnlineBooking = props.auth?.doctor?.has_online_booking !== false;
    const { appearance, updateAppearance } = useAppearance();

    const cycleAppearance = () => {
        if (appearance === 'light') updateAppearance('dark');
        else if (appearance === 'dark') updateAppearance('system');
        else updateAppearance('light');
    };

    const AppearanceIcon = appearance === 'dark' ? Moon : appearance === 'light' ? Sun : Monitor;
    const appearanceLabel = appearance === 'dark' ? 'Харанхуй горим' : appearance === 'light' ? 'Гэрэл горим' : 'Системийн горим';

    return (
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
                </SidebarMenu>
                <NavDoctorUser />
            </SidebarFooter>
        </Sidebar>
    );
}
