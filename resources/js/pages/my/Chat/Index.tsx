import { ChatBody } from '@/components/chat/chat-body';
import MyLayout from '@/layouts/my-layout';

interface Props {
    currentUserId: number;
    isStaff: boolean;
    initialConversations?: unknown[];
}

export default function MyChatIndex({ currentUserId, isStaff, initialConversations }: Props) {
    return (
        <MyLayout breadcrumbs={[{ title: 'Чат', href: '/my/chat' }]}>
            {/* Mobile: top bar hidden → 100svh - bottom nav (5rem). Desktop: 100svh - sidebar header. */}
            <div className="flex w-full overflow-hidden h-[calc(100svh-5rem)] md:h-[calc(100svh-5rem)]">
                <ChatBody currentUserId={currentUserId} isStaff={isStaff} initialConversations={initialConversations as never} />
            </div>
        </MyLayout>
    );
}
