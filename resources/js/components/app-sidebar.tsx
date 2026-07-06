import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    BookOpen,
    Bot,
    Braces,
    Briefcase,
    Building2,
    CalendarClock,
    ClipboardList,
    CreditCard,
    DollarSign,
    FileText,
    FlaskConical,
    Globe,
    HelpCircle,
    Images,
    Landmark,
    LayoutGrid,
    LogOut,
    type LucideIcon,
    Megaphone,
    MessageCircle,
    MessageSquare,
    Newspaper,
    NotebookText,
    Package,
    ScrollText,
    Settings,
    Share2,
    Smile,
    Sparkles,
    Stethoscope,
    Tag,
    TrendingUp,
    Umbrella,
    Undo2,
    UserRound,
    Users,
    Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface NavGroup {
    label?: string;
    items: NavItem[];
}

interface Category {
    id: string;
    label: string;
    icon: LucideIcon;
    groups: NavGroup[];
}

const categories: Category[] = [
    {
        id: 'web',
        label: 'Вэб сайт',
        icon: Globe,
        groups: [
            {
                items: [{ title: 'Хянах самбар', url: '/admin/dashboard', icon: LayoutGrid }],
            },
            {
                label: 'Контент',
                items: [
                    {
                        title: 'Эмчилгээ & Үйлчилгээ',
                        url: '/admin/treatments',
                        icon: Stethoscope,
                        children: [
                            { title: 'Бүх эмчилгээ', url: '/admin/treatments', icon: Stethoscope },
                            { title: 'Ангилал', url: '/admin/treatment-categories', icon: Tag },
                        ],
                    },
                    { title: 'Мэдээ ба Нийтлэл', url: '/admin/articles', icon: Newspaper },
                    { title: 'Үр дүнгийн галерей', url: '/admin/gallery', icon: Images },
                    { title: 'Түгээмэл асуултууд', url: '/admin/faqs', icon: HelpCircle },
                ],
            },
            {
                label: 'Байгууллага',
                items: [
                    { title: 'Салбарууд', url: '/admin/branches', icon: Building2 },
                    { title: 'Эмч нар', url: '/admin/doctors', icon: UserRound },
                    { title: 'Ажлын анкет', url: '/admin/job-applications', icon: ClipboardList },
                ],
            },
        ],
    },
    {
        id: 'clinic',
        label: 'Цаг захиалга',
        icon: CalendarClock,
        groups: [
            {
                items: [
                    { title: 'Цаг захиалга', url: '/admin/appointments', icon: CalendarClock },
                    { title: 'Өвчтнүүд', url: '/admin/patients', icon: Users },
                    { title: 'Ортодонт бүртгэл', url: '/admin/ortho-appliances', icon: Braces },
                    { title: 'Лаб бүртгэл', url: '/admin/lab-orders', icon: FlaskConical },
                ],
            },
        ],
    },
    {
        id: 'money',
        label: 'Тооцоо',
        icon: Wallet,
        groups: [
            {
                label: 'Орлого',
                items: [
                    { title: 'Төлбөр', url: '/admin/payments', icon: CreditCard },
                    { title: 'Өдрийн тооцоо', url: '/admin/daily-sheets', icon: NotebookText },
                    { title: 'Банкны тулгалт', url: '/admin/bank-reconciliation', icon: Landmark },
                ],
            },
            {
                label: 'Хяналт',
                items: [
                    { title: 'Дутуу тооцоо', url: '/admin/outstanding', icon: AlertCircle },
                    { title: 'Илүү тооцоо', url: '/admin/overpaid', icon: TrendingUp },
                    { title: 'Буцаалт', url: '/admin/refunds', icon: Undo2 },
                ],
            },
        ],
    },
    {
        id: 'hr',
        label: 'Хүний нөөц',
        icon: Users,
        groups: [
            {
                label: 'Үндсэн',
                items: [
                    { title: 'Хянах самбар', url: '/hr/dashboard', icon: LayoutGrid },
                    { title: 'Ажилтнууд', url: '/hr/employees', icon: Users },
                    { title: 'Албан тушаал', url: '/hr/positions', icon: Briefcase },
                    { title: 'Ажлын хуваарь', url: '/hr/work-schedules', icon: CalendarClock },
                    { title: 'Ирцийн бүртгэл', url: '/hr/attendance', icon: ClipboardList },
                ],
            },
            {
                label: 'Чөлөө & Амралт',
                items: [
                    { title: 'Чөлөөний хүсэлт', url: '/hr/leave-requests', icon: CalendarClock },
                    {
                        title: 'Ээлжийн амралт',
                        url: '/hr/vacation-requests',
                        icon: Umbrella,
                        children: [
                            { title: 'Ээлжийн амралтын хүсэлт', url: '/hr/vacation-requests', icon: CalendarClock },
                            { title: 'Үлдэгдэл хоног', url: '/hr/vacation-balance', icon: Umbrella },
                        ],
                    },
                ],
            },
            {
                label: 'Цалин & Урамшуулал',
                items: [
                    { title: 'Цалингийн тооцоо', url: '/hr/payroll', icon: DollarSign },
                    { title: 'Ресепшний урамшуулал', url: '/hr/reception-bonus', icon: Smile },
                    { title: 'Сувилагчийн урамшуулал', url: '/hr/nurse-bonus', icon: Stethoscope },
                ],
            },
            {
                label: 'Чат',
                items: [
                    { title: 'Чатлах', url: '/admin/chat', icon: MessageCircle },
                    { title: 'Bot тохиргоо', url: '/admin/chatbot-flows', icon: Bot },
                ],
            },
            {
                label: 'Бусад',
                items: [
                    {
                        title: 'Номын сан',
                        url: '/hr/books',
                        icon: BookOpen,
                        children: [
                            { title: 'Номын жагсаалт', url: '/hr/books', icon: BookOpen },
                            { title: 'Түрээсийн хүсэлт', url: '/hr/book-rentals', icon: CalendarClock },
                        ],
                    },
                    { title: 'Тоног төхөөрөмж', url: '/hr/equipment', icon: Package },
                    { title: 'Санал хүсэлт', url: '/hr/feedback', icon: MessageSquare },
                    { title: 'Сануулга / Зөрчил', url: '/hr/warnings', icon: AlertTriangle },
                    { title: 'Баримт бичиг', url: '/hr/documents', icon: FileText },
                    { title: 'Гарах бүртгэл', url: '/hr/exit-checklists', icon: LogOut },
                ],
            },
        ],
    },
    {
        id: 'social',
        label: 'Social',
        icon: Share2,
        groups: [
            {
                items: [
                    { title: 'Хяналтын самбар', url: '/admin/social/dashboard', icon: TrendingUp },
                    { title: 'Холболт (FB/IG)', url: '/admin/social/accounts', icon: Share2 },
                    { title: 'AI туслах', url: '/admin/social/ai', icon: Sparkles },
                    { title: 'Social Inbox', url: '/admin/social/inbox', icon: MessageCircle },
                    { title: 'Маркетинг (Broadcast)', url: '/admin/social/broadcasts', icon: Megaphone },
                    { title: 'Social Flow', url: '/admin/social/flows', icon: Bot },
                    { title: 'Коммент автомат', url: '/admin/social/comment-rules', icon: MessageSquare },
                    { title: 'Вэбформ', url: '/admin/social/forms', icon: ClipboardList },
                ],
            },
        ],
    },
    {
        id: 'system',
        label: 'Систем',
        icon: Settings,
        groups: [
            {
                items: [
                    { title: 'Хэрэглэгчид', url: '/admin/users', icon: Users },
                    { title: 'Аудит лог', url: '/admin/audit-logs', icon: ScrollText },
                    { title: 'Тохиргоо', url: '/admin/settings', icon: Settings },
                ],
            },
        ],
    },
];

/** Одоогийн URL аль ангилалд хамаарахыг хамгийн урт таарсан замаар олно. */
function findCategoryIdForUrl(url: string): string {
    let best = 'web';
    let bestLength = 0;

    for (const category of categories) {
        for (const group of category.groups) {
            for (const item of group.items) {
                const urls = [item.url, ...(item.children?.map((child) => child.url) ?? [])];
                for (const candidate of urls) {
                    const matches = url === candidate || url.startsWith(candidate + '/') || url.startsWith(candidate + '?');
                    if (matches && candidate.length > bestLength) {
                        best = category.id;
                        bestLength = candidate.length;
                    }
                }
            }
        }
    }

    return best;
}

interface SharedProps {
    pending_job_applications: number;
    site_settings?: { site_logo?: string; site_name?: string };
    [key: string]: unknown;
}

export function AppSidebar() {
    const page = usePage<SharedProps>();
    const { pending_job_applications, site_settings } = page.props;
    const { setOpen } = useSidebar();
    const logoUrl = site_settings?.site_logo || '';

    const urlCategoryId = useMemo(() => findCategoryIdForUrl(page.url), [page.url]);
    const [activeCategoryId, setActiveCategoryId] = useState(urlCategoryId);

    // Хуудас солигдоход идэвхтэй ангиллыг URL-аас дахин тогтооно.
    useEffect(() => {
        setActiveCategoryId(urlCategoryId);
    }, [urlCategoryId]);

    const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0];

    const railBadges: Record<string, number> = {
        web: pending_job_applications || 0,
    };

    const withBadges = (items: NavItem[]): NavItem[] =>
        items.map((item) =>
            item.url === '/admin/job-applications' ? { ...item, badge: pending_job_applications || undefined } : item,
        );

    return (
        <Sidebar collapsible="icon" variant="inset" className="overflow-hidden">
            <div className="flex h-full w-full flex-row overflow-hidden">
                {/* ── Icon rail ─────────────────────────────── */}
                <nav
                    aria-label="Үндсэн ангилал"
                    className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border py-2"
                >
                    <Link
                        href="/admin/dashboard"
                        className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                    >
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                        ) : (
                            <span className="flex h-full w-full items-center justify-center rounded-lg bg-primary">
                                <Smile className="h-5 w-5 text-primary-foreground" />
                            </span>
                        )}
                    </Link>

                    {categories.map((category) => {
                        const isActive = category.id === activeCategoryId;
                        const badge = railBadges[category.id] || 0;

                        return (
                            <Tooltip key={category.id}>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label={category.label}
                                        onClick={() => {
                                            setActiveCategoryId(category.id);
                                            setOpen(true);
                                        }}
                                        className={cn(
                                            'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                                            isActive
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                        )}
                                    >
                                        <category.icon className="h-5 w-5" />
                                        {badge > 0 && (
                                            <span
                                                className={cn(
                                                    'absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold',
                                                    isActive ? 'bg-white text-primary' : 'bg-primary text-white',
                                                )}
                                            >
                                                {badge > 99 ? '99+' : badge}
                                            </span>
                                        )}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">{category.label}</TooltipContent>
                            </Tooltip>
                        );
                    })}
                </nav>

                {/* ── Идэвхтэй ангиллын цэс ─────────────────── */}
                <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
                    <SidebarHeader>
                        <div className="px-2 pt-1">
                            <div className="truncate text-[11px] font-medium text-sidebar-foreground/60">
                                {site_settings?.site_name || 'Admin'}
                            </div>
                            <div className="truncate text-sm font-bold">{activeCategory.label}</div>
                        </div>
                    </SidebarHeader>

                    <SidebarContent>
                        {activeCategory.groups.map((group, index) => (
                            <NavMain key={group.label ?? index} items={withBadges(group.items)} label={group.label} />
                        ))}
                    </SidebarContent>

                    <SidebarFooter>
                        <NavUser />
                    </SidebarFooter>
                </div>
            </div>
        </Sidebar>
    );
}
