import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    BookOpen,
    Braces,
    FileText,
    Briefcase,
    Building2,
    CalendarClock,
    ClipboardList,
    CreditCard,
    DollarSign,
    HelpCircle,
    Images,
    LayoutGrid,
    LogOut,
    MessageSquare,
    Newspaper,
    NotebookText,
    Package,
    ScrollText,
    Settings,
    Smile,
    Stethoscope,
    Tag,
    Umbrella,
    UserRound,
    Users,
} from 'lucide-react';

const dashboardItems: NavItem[] = [
    {
        title: 'Хянах самбар',
        url: '/admin/dashboard',
        icon: LayoutGrid,
    },
];

const webItems: NavItem[] = [
    {
        title: 'Эмчилгээ & Үйлчилгээ',
        url: '/admin/treatments',
        icon: Stethoscope,
        children: [
            { title: 'Бүх эмчилгээ', url: '/admin/treatments', icon: Stethoscope },
            { title: 'Ангилал', url: '/admin/treatment-categories', icon: Tag },
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
];

const schedulingItems: NavItem[] = [
    {
        title: 'Цаг захиалга',
        url: '/admin/appointments',
        icon: CalendarClock,
    },
    {
        title: 'Өвчтнүүд',
        url: '/admin/patients',
        icon: Users,
    },
    {
        title: 'Ортодонт бүртгэл',
        url: '/admin/ortho-appliances',
        icon: Braces,
    },
    {
        title: 'Төлбөр',
        url: '/admin/payments',
        icon: CreditCard,
    },
    {
        title: 'Өдрийн тооцоо',
        url: '/admin/daily-sheets',
        icon: NotebookText,
    },
    {
        title: 'Дутуу тооцоо',
        url: '/admin/outstanding',
        icon: AlertCircle,
    },
];

const hrItems: NavItem[] = [
    {
        title: 'Хянах самбар',
        url: '/hr/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Ажилтнууд',
        url: '/hr/employees',
        icon: Users,
    },
    {
        title: 'Ажлын хуваарь',
        url: '/hr/work-schedules',
        icon: CalendarClock,
    },
    {
        title: 'Ирцийн бүртгэл',
        url: '/hr/attendance',
        icon: ClipboardList,
    },
    {
        title: 'Албан тушаал',
        url: '/hr/positions',
        icon: Briefcase,
    },
    {
        title: 'Чөлөөний хүсэлт',
        url: '/hr/leave-requests',
        icon: CalendarClock,
    },
    {
        title: 'Ээлжийн амралт',
        url: '/hr/vacation-requests',
        icon: Umbrella,
        children: [
            { title: 'Хүсэлт',          url: '/hr/vacation-requests',         icon: CalendarClock },
            { title: 'Үлдэгдэл хоног',  url: '/hr/vacation-balance',          icon: Umbrella },
        ],
    },
    { title: 'Цалингийн тооцоо',      url: '/hr/payroll',          icon: DollarSign },
    { title: 'Ресепшний урамшуулал',  url: '/hr/reception-bonus',  icon: Smile },
    { title: 'Сувилагчийн урамшуулал', url: '/hr/nurse-bonus',     icon: Stethoscope },
    {
        title: 'Номын сан',
        url: '/hr/books',
        icon: BookOpen,
        children: [
            { title: 'Номын жагсаалт',    url: '/hr/books',         icon: BookOpen },
            { title: 'Түрээсийн хүсэлт',  url: '/hr/book-rentals',  icon: CalendarClock },
        ],
    },
    {
        title: 'Тоног төхөөрөмж',
        url: '/hr/equipment',
        icon: Package,
    },
    {
        title: 'Санал хүсэлт',
        url: '/hr/feedback',
        icon: MessageSquare,
    },
    {
        title: 'Сануулга / Зөрчил',
        url: '/hr/warnings',
        icon: AlertTriangle,
    },
    {
        title: 'Баримт бичиг',
        url: '/hr/documents',
        icon: FileText,
    },
    {
        title: 'Гарах бүртгэл',
        url: '/hr/exit-checklists',
        icon: LogOut,
    },
];

const systemItems: NavItem[] = [
    {
        title: 'Хэрэглэгчид',
        url: '/admin/users',
        icon: Users,
    },
    {
        title: 'Аудит лог',
        url: '/admin/audit-logs',
        icon: ScrollText,
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
    [key: string]: unknown;
}

export function AppSidebar() {
    const { pending_job_applications, site_settings } = usePage<SharedProps>().props;
    const logoUrl = site_settings?.site_logo || '';

    const webNavItems = webItems.map(item =>
        item.url === '/admin/job-applications'
            ? { ...item, badge: pending_job_applications || undefined }
            : item
    );

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
                <NavMain items={dashboardItems} />
                <NavMain items={webNavItems} label="Вэб" />
                <NavMain items={schedulingItems} label="Цаг & Төлбөр" />
                <NavMain items={hrItems} label="HR" />
                <NavMain items={systemItems} label="Систем" />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
