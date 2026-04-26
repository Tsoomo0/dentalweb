import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BadgeCheck, Building2, CalendarClock, ClipboardList, CreditCard, HelpCircle, Images, LayoutGrid, Newspaper, ReceiptText, RefreshCw, Settings, ShieldCheck, Stethoscope, Tag, UserRound, Users } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Хянах самбар',
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
        title: 'Төлбөр',
        url: '/admin/payments',
        icon: CreditCard,
        children: [
            {
                title: 'Бүх төлбөрүүд',
                url: '/admin/payments',
                icon: ReceiptText,
            },
            {
                title: 'Хүлээгдэж буй',
                url: '/admin/payments?payment_status=pending',
                icon: RefreshCw,
            },
            {
                title: 'Баталгаажсан',
                url: '/admin/payments?payment_status=paid',
                icon: BadgeCheck,
            },
        ],
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
    {
        title: 'Ажлын анкет',
        url: '/admin/job-applications',
        icon: ClipboardList,
    },
    {
        title: 'Хэрэглэгчид',
        url: '/admin/users',
        icon: Users,
        children: [
            {
                title: 'Бүх хэрэглэгч',
                url: '/admin/users',
                icon: Users,
            },
            {
                title: 'Шинэ хэрэглэгч',
                url: '/admin/users/create',
                icon: ShieldCheck,
            },
        ],
    },
    {
        title: 'Тохиргоо',
        url: '/admin/settings',
        icon: Settings,
    },
];

export function AppSidebar() {
    const { pending_job_applications } = usePage<{ pending_job_applications: number }>().props;

    const navItems: NavItem[] = [
        ...mainNavItems.map(item =>
            item.url === '/admin/job-applications'
                ? { ...item, badge: pending_job_applications || undefined }
                : item
        ),
    ];

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
                <NavMain items={navItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
