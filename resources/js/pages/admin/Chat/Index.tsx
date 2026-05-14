import { ChatBody } from '@/components/chat/chat-body';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';

interface Props {
    currentUserId: number;
    isStaff: boolean;
    initialConversations?: unknown[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Чат', href: '/admin/chat' },
];

export default function AdminChatIndex({ currentUserId, isStaff, initialConversations }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex w-full overflow-hidden" style={{ height: 'calc(100svh - 5rem)' }}>
                <ChatBody currentUserId={currentUserId} isStaff={isStaff} mode="admin" initialConversations={initialConversations as never} />
            </div>
        </AppLayout>
    );
}
