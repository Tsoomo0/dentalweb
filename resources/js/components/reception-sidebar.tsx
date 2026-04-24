import { NavReceptionUser } from '@/components/nav-reception-user';
import {
    Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
    SidebarMenu, SidebarMenuButton, SidebarMenuItem,
    SidebarGroup, SidebarGroupContent,
} from '@/components/ui/sidebar';
import { useAppearance } from '@/hooks/use-appearance';
import { Link, usePage } from '@inertiajs/react';
import { CalendarClock, LayoutGrid, Monitor, Moon, Sun, UserCircle2 } from 'lucide-react';
import AppLogo from './app-logo';

const navItems = [
    {
        title: 'Хяналтын самбар',
        url:   '/reception/dashboard',
        icon:  LayoutGrid,
    },
    {
        title: 'Цаг захиалга',
        url:   '/reception/appointments',
        icon:  CalendarClock,
    },
    {
        title: 'Миний профайл',
        url:   '/reception/profile',
        icon:  UserCircle2,
    },
];

export function ReceptionSidebar() {
    const { url } = usePage();
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
                            <Link href="/reception/dashboard">
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
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={cycleAppearance} tooltip={appearanceLabel}>
                            <AppearanceIcon className="size-4 shrink-0" />
                            <span>{appearanceLabel}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <NavReceptionUser />
            </SidebarFooter>
        </Sidebar>
    );
}
