import { playChime } from '@/lib/chat-chime';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { MessageCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PageProps {
    auth?: { user?: { id: number } | null; chat_user_id?: number | null };
    [key: string]: unknown;
}

declare global {
    interface Window {
        Echo: any;
    }
}

/* ── Toast container (single instance) ──────────────────────────────────── */
function ensureToastContainer(): HTMLElement {
    let host = document.getElementById('chat-toast-host');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'chat-toast-host';
    host.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:340px;';
    document.body.appendChild(host);
    return host;
}

function showChatToast(senderName: string, preview: string, onClick: () => void) {
    const host = ensureToastContainer();
    const toast = document.createElement('div');
    toast.style.cssText = [
        'background:linear-gradient(135deg, #dc2626, #b91c1c)',
        'color:white',
        'padding:14px 16px',
        'border-radius:16px',
        'box-shadow:0 12px 32px rgba(220,38,38,0.4)',
        'cursor:pointer',
        'pointer-events:auto',
        'animation:chat-toast-in 0.25s ease-out',
        'max-width:320px',
        'font-family:inherit',
    ].join(';');
    toast.innerHTML = `
        <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px;">💬</div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:800;margin-bottom:2px;">${senderName}</div>
                <div style="font-size:12px;opacity:0.95;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escapeHtml(preview)}</div>
            </div>
        </div>
    `;
    toast.onclick = () => { onClick(); toast.remove(); };
    host.appendChild(toast);

    // Add keyframes if not exists.
    if (!document.getElementById('chat-toast-style')) {
        const style = document.createElement('style');
        style.id = 'chat-toast-style';
        style.textContent = '@keyframes chat-toast-in{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}';
        document.head.appendChild(style);
    }

    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s, transform 0.3s';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 320);
    }, 5000);
}

function escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

export function ChatIcon({ variant = 'default', redirectTo = '/my/chat' }: { variant?: 'default' | 'ghost'; redirectTo?: string }) {
    const page = usePage<PageProps>();
    const userId = page.props.auth?.chat_user_id ?? page.props.auth?.user?.id;
    const [unread, setUnread] = useState(0);
    const isMounted = useRef(true);

    const refresh = useCallback(async () => {
        try {
            const res = await axios.get('/my/chat/conversations');
            const total = (res.data?.conversations ?? []).reduce(
                (sum: number, c: { unread_count?: number }) => sum + (c.unread_count ?? 0),
                0
            );
            if (isMounted.current) setUnread(total);
        } catch {
            /* silent */
        }
    }, []);

    useEffect(() => {
        isMounted.current = true;
        if (!userId) return;
        refresh();
        const t = setInterval(refresh, 30_000);
        return () => {
            isMounted.current = false;
            clearInterval(t);
        };
    }, [userId, refresh]);

    // Reverb realtime: listen for incoming messages on the user inbox channel.
    useEffect(() => {
        if (!userId || !window.Echo) return;
        const channel = window.Echo.private(`chat.user.${userId}`);

        channel.listen('.message.sent', (e: { message: { sender_id: number | null; body: string | null; type: string; sender?: { name: string } | null; conversation_id: number } }) => {
            console.log('[chat-icon] inbox message.sent', e);
            refresh();
            // Show toast if user is not on the chat page and message isn't from them.
            const onChatPage = /\/(my|admin)\/chat(?!-)/.test(window.location.pathname);
            if (onChatPage) return;
            if (!e.message || e.message.sender_id === userId) return;

            const senderName = e.message.sender?.name ?? 'HR Туслах';
            const preview = e.message.body
                ?? (e.message.type === 'image' ? '📷 Зураг'
                : e.message.type === 'file' ? '📎 Файл'
                : e.message.type === 'bot_card' ? '🤖 Сонголт'
                : 'Шинэ мессеж');

            showChatToast(senderName, preview, () => router.visit(redirectTo));
            playChime();
            // Native browser notification when tab is hidden.
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
                try {
                    const n = new Notification(senderName, {
                        body: preview,
                        icon: '/img/icon-192.png',
                        badge: '/img/icon-192.png',
                        tag: `chat-${e.message.conversation_id}`,
                    });
                    n.onclick = () => { window.focus(); router.visit(redirectTo); n.close(); };
                } catch { /* silent */ }
            }
        });

        channel.listen('.conversation.updated', () => refresh());

        return () => {
            try { window.Echo.leave(`chat.user.${userId}`); } catch { /* silent */ }
        };
    }, [userId, refresh]);

    const goChat = () => router.visit(redirectTo);

    if (!userId) return null;

    if (variant === 'ghost') {
        return (
            <button
                onClick={goChat}
                aria-label="Чат"
                style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1.5px solid rgba(255,255,255,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                }}
            >
                <MessageCircle style={{ width: 17, height: 17, color: 'white', strokeWidth: 2 }} />
                {unread > 0 && (
                    <span
                        style={{
                            position: 'absolute',
                            top: -3,
                            right: -3,
                            minWidth: 18,
                            height: 18,
                            background: '#fbbf24',
                            color: '#1c1917',
                            borderRadius: 99,
                            fontSize: 9,
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 4px',
                            border: '2px solid rgba(255,255,255,0.6)',
                            lineHeight: 1,
                        }}
                    >
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>
        );
    }

    return (
        <button
            onClick={goChat}
            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Чат"
        >
            <MessageCircle className="size-5 text-gray-600 dark:text-gray-300" />
            {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                    {unread > 99 ? '99+' : unread}
                </span>
            )}
        </button>
    );
}
