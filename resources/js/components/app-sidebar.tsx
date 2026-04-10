import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { Building2, CalendarClock, HelpCircle, Images, LayoutGrid, Newspaper, Stethoscope, Tag, UserRound } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/admin/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Эмчилгээ & Үйлчилгээ',
        url: '/admin/treatments',
        icon: Stethoscope,
        children: [
            {
                title: 'Бүх эмчилгээ',
                url: '/admin/treatments',
                icon: Stethoscope,
            },
            {
                title: 'Ангилал',
                url: '/admin/treatment-categories',
                icon: Tag,
            },
        ],
    },
    {
        title: 'Салбарууд',
        url: '/admin/branches',
        icon: Building2,
    },
    {
        title: 'Эмч нар',
        url: '/admin/doctors',
        icon: UserRound,
    },
    {
        title: 'Мэдээ ба Нийтлэл',
        url: '/admin/articles',
        icon: Newspaper,
    },
    {
        title: 'Цаг захиалга',
        url: '/admin/appointments',
        icon: CalendarClock,
    },
    {
        title: 'Үр дүнгийн галерей',
        url: '/admin/gallery',
        icon: Images,
    },
    {
        title: 'Түгээмэл асуултууд',
        url: '/admin/faqs',
        icon: HelpCircle,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard">
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
