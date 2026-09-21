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
    BarChart3,
    Braces,
    Briefcase,
    Building2,
    CalendarClock,
    ClipboardCheck,
    ClipboardList,
    CreditCard,
    DollarSign,
    FileSignature,
    FileText,
    FlaskConical,
    Globe,
    GraduationCap,
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
    Settings2,
    ShieldOff,
    PhoneCall,
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
    Video,
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
                ],
            },
        ],
    },
    {
        id: 'calls',
        label: 'Дуудлага',
        icon: PhoneCall,
        groups: [
            {
                items: [
                    { title: 'Хянах самбар', url: '/admin/calls/dashboard', icon: BarChart3 },
                    { title: 'Дуудлагын бүртгэл', url: '/admin/calls', icon: PhoneCall },
                    { title: 'Тайлан', url: '/admin/calls/reports', icon: FileText },
                    { title: 'Спам дугаар', url: '/admin/calls/blocked', icon: ShieldOff },
                    { title: 'Тохиргоо', url: '/admin/call-settings', icon: Settings2 },
                ],
            },
        ],
    },
    {
        id: 'lab',
        label: 'Лаборатори',
        icon: FlaskConical,
        groups: [
            {
                items: [
                    { title: 'Лабын тайлан', url: '/admin/lab-report', icon: LayoutGrid },
                    { title: 'Лаб бүртгэл', url: '/admin/lab-orders', icon: FlaskConical },
                    { title: 'Лаб ажилтан', url: '/admin/lab-employees', icon: Users },
                ],
            },
        ],
    },
    {
        id: 'training',
        label: 'Дотоод сургалт',
        icon: GraduationCap,
        groups: [
            {
                items: [
                    { title: 'Видео сургалт', url: '/admin/lab-training', icon: Video },
                    { title: 'Файл сургалт', url: '/admin/lab-training/documents', icon: FileText },
                    { title: 'Шалгалт', url: '/admin/lab-training/exams', icon: ClipboardCheck },
                    { title: 'Сургалтын тайлан', url: '/admin/lab-training/report', icon: BarChart3 },
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
                    {
                        title: 'Гэрээ / АБТ',
                        url: '/hr/employee-documents',
                        icon: FileSignature,
                        children: [
                            { title: 'Ажилтны гэрээ', url: '/hr/employee-documents', icon: FileSignature },
                            { title: 'Гэрээний загвар', url: '/hr/document-templates', icon: ScrollText },
                        ],
                    },
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
        <Sidebar collapsible="icon" variant="inset" className="app-sidebar-canvas overflow-hidden">
            <div className="flex h-full w-full flex-row overflow-hidden">
                {/* ── Icon rail ─────────────────────────────── */}
                <nav
                    aria-label="Үндсэн ангилал"
                    className="relative flex w-[52px] shrink-0 flex-col items-center gap-1 border-r border-sidebar-border/70 bg-black/[0.035] py-2 dark:bg-white/[0.03]"
                >
                    {/* Зурвасын дээд ирмэгийн нарийн туяа */}
                    <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-primary/40 via-sidebar-border/60 to-transparent" />

                    <Link
                        href="/admin/dashboard"
                        title="Нүүр хуудас"
                        className="group/logo relative mb-1.5 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm ring-1 ring-inset ring-black/5 transition-transform hover:scale-105 dark:ring-white/10"
                    >
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                        ) : (
                            <span className="relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30">
                                <span aria-hidden className="absolute inset-x-1.5 top-1 h-1/3 rounded-full bg-white/25 blur-[2px]" />
                                <Smile className="relative h-5 w-5 text-primary-foreground" />
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
                                            'relative flex size-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 active:scale-95',
                                            isActive
                                                ? 'bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-inset ring-white/25'
                                                : 'text-sidebar-foreground/60 hover:-translate-y-px hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                        )}
                                    >
                                        {isActive && (
                                            <span aria-hidden className="absolute inset-x-1.5 top-1 h-1/3 rounded-full bg-white/25 blur-[2px]" />
                                        )}

                                        <category.icon className="relative h-5 w-5" />

                                        {badge > 0 && (
                                            <span
                                                className={cn(
                                                    'absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums ring-2 ring-sidebar',
                                                    isActive ? 'bg-white text-primary' : 'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-sm',
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
                    <SidebarHeader className="pb-1">
                        <div className="relative flex items-center gap-2.5 px-2 pt-1">
                            <span className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-inset ring-white/25">
                                <span aria-hidden className="absolute inset-x-1.5 top-1 h-1/3 rounded-full bg-white/25 blur-[2px]" />
                                <activeCategory.icon className="relative size-4" />
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                                    {site_settings?.site_name || 'Admin'}
                                </p>
                                <p className="truncate bg-gradient-to-br from-sidebar-foreground via-sidebar-foreground to-sidebar-foreground/60 bg-clip-text text-sm font-extrabold tracking-tight text-transparent">
                                    {activeCategory.label}
                                </p>
                            </div>
                        </div>
                        <div aria-hidden className="mx-2 mt-2 h-px bg-gradient-to-r from-primary/40 via-sidebar-border to-transparent" />
                    </SidebarHeader>

                    <SidebarContent>
                        {activeCategory.groups.map((group, index) => (
                            <NavMain key={group.label ?? index} items={withBadges(group.items)} label={group.label} />
                        ))}
                    </SidebarContent>

                    <SidebarFooter className="border-t border-sidebar-border/60">
                        <NavUser />
                    </SidebarFooter>
                </div>
            </div>
        </Sidebar>
    );
}
