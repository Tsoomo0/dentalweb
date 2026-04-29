import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Building2, CalendarClock, ClipboardList, CreditCard, HelpCircle, Images, LayoutGrid, Newspaper, Settings, Smile, Stethoscope, Tag, UserRound, Users } from 'lucide-react';

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
    },
    {
        title: 'Тохиргоо',
        url: '/admin/settings',
        icon: Settings,
    },
];

interface SharedProps {
    pending_job_applications: number;
    site_settings?: { site_logo?: string; site_name?: string };
}

export function AppSidebar() {
    const { pending_job_applications, site_settings } = usePage<SharedProps>().props;
    const logoUrl = site_settings?.site_logo || '';

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
                            <Link href="/dashboard" className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                                    {logoUrl
                                        ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                        : <div className="w-full h-full bg-red-600 flex items-center justify-center">
                                            <Smile className="w-5 h-5 text-white" />
                                          </div>
                                    }
                                </div>
                                <span className="font-semibold text-sm truncate">
                                    {site_settings?.site_name || 'Admin'}
                                </span>
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
