import { Breadcrumbs } from '@/components/breadcrumbs';
import { ChatIcon } from '@/components/chat-icon';
import { NotificationBell } from '@/components/notification-bell';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { usePage } from '@inertiajs/react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const page = usePage<{ notifications?: boolean }>();
    const { notifications } = page.props;
    const isAdmin = page.url.startsWith('/admin');
    const isMy    = page.url.startsWith('/my');
    // Chat зөвхөн админ ба HR (/my) хэсэгт байна.
    const showChat = isAdmin || isMy;
    const chatTarget = isAdmin ? '/admin/chat' : '/my/chat';

    return (
        <header className="sticky top-0 z-20 bg-background border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="ml-auto flex items-center gap-1">
                {showChat && <ChatIcon redirectTo={chatTarget} />}
                {!!notifications && <NotificationBell />}
            </div>
        </header>
    );
}
