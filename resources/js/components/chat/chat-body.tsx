import { ChatIcon } from '@/components/chat-icon';
import { NotificationBell } from '@/components/notification-bell';
import { usePushSubscribe } from '@/hooks/use-push-subscribe';
import { playChime } from '@/lib/chat-chime';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowLeft, Bot, Check, CheckCheck, Image as ImageIcon, MessageCircle, Mic, Paperclip, Phone, Plus, Search,
    Send, Smile, Trash2, Users, X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ──────────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────────── */
interface Conversation {
    id: number;
    type: 'direct' | 'group' | 'bot';
    title: string;
    avatar: string | null;
    photo: string | null;
    is_support?: boolean;
    other_user_id: number | null;
    other_online?: boolean;
    last_message: {
        id: number;
        body: string | null;
        type: string;
        sender_id: number | null;
        sender_type: 'user' | 'bot' | 'system';
        sender_name: string | null;
        created_at: string;
    } | null;
    last_message_at: string | null;
    unread_count: number;
    is_pinned: boolean;
    muted: boolean;
    participants_count: number;
}

interface Attachment {
    id: number;
    url: string;
    original_name: string;
    mime_type: string;
    size: number;
    width: number | null;
    height: number | null;
    is_image: boolean;
}

interface ReplyTo {
    id: number;
    body: string | null;
    type: string;
    sender_id: number | null;
    sender_name: string | null;
}

interface BotButton {
    id: number;
    label: string;
    icon: string | null;
    action: string;
    target_url: string | null;
}

interface Message {
    id: number;
    conversation_id: number;
    sender_id: number | null;
    sender_type: 'user' | 'bot' | 'system';
    sender: { id: number; name: string } | null;
    body: string | null;
    type: 'text' | 'image' | 'file' | 'bot_card' | 'system';
    bot_node_id: number | null;
    reply_to_id: number | null;
    reply_to: ReplyTo | null;
    meta: { title?: string; buttons?: BotButton[] } | null;
    attachments: Attachment[];
    edited_at: string | null;
    created_at: string;
}

interface ConversationDetail {
    conversation: { id: number; type: string; name: string | null; avatar: string | null; created_by: number };
    participants: Array<{ user_id: number; name: string; role: string; last_read_at: string | null }>;
    messages: Message[];
    has_more: boolean;
}

interface StaffOption {
    user_id: number;
    name: string;
    position: string | null;
    branch: string | null;
    photo: string | null;
}

interface Props {
    currentUserId: number;
    isStaff: boolean;
    /** 'employee' — bot чат харагдана. 'admin' — bot нуугдана, зөвхөн direct/group. */
    mode?: 'employee' | 'admin';
    initialConversations?: Conversation[];
}

declare global {
    interface Window {
        Echo: any;
    }
}

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────────── */
function formatTime(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Өчигдөр';
    return d.toLocaleDateString('mn-MN', { month: '2-digit', day: '2-digit' });
}

function formatTimeFull(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
}

function fileSizeStr(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const csrfToken = (): string => (document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '');

/* ──────────────────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────────────────── */
export function ChatBody({ currentUserId, isStaff, mode = 'employee', initialConversations }: Props) {
    const hideBot = mode === 'admin';
    const page = usePage<{ auth?: { employee?: { full_name?: string; photo_url?: string | null; position?: string | null } | null } }>();
    const employee = page.props.auth?.employee;
    const firstName = (employee?.full_name ?? '').split(' ').pop() ?? '';
    const employeeInitials = (employee?.full_name ?? '')
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
    const [conversations, setConversations] = useState<Conversation[]>(() => {
        const init = initialConversations ?? [];
        if (init.length === 0) return [];
        return [...init].sort((a, b) => {
            if (!hideBot) {
                if (a.type === 'bot' && b.type !== 'bot') return -1;
                if (b.type === 'bot' && a.type !== 'bot') return 1;
            }
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
            const at = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const bt = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return bt - at;
        }).filter((c) => !hideBot || c.type !== 'bot');
    });
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [detail, setDetail] = useState<ConversationDetail | null>(null);
    const [draft, setDraft] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState('');
    const [showNew, setShowNew] = useState(false);

    const threadRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Subscribe browser to Web Push the first time the user opens chat.
    usePushSubscribe(true);

    // Heartbeat: mark this user as online every 30 seconds.
    useEffect(() => {
        const ping = () => axios.post('/my/chat/heartbeat', {}, { headers: { 'X-CSRF-TOKEN': csrfToken() } }).catch(() => {});
        ping();
        const t = setInterval(ping, 30_000);
        return () => clearInterval(t);
    }, []);

    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    /* ── Load conversation list ──────────────────────────────────────── */
    const loadConversations = useCallback(async () => {
        try {
            const res = await axios.get('/my/chat/conversations');
            let list: Conversation[] = res.data?.conversations ?? [];
            // Admin mode: hide bot conversation entirely (admin chats only with people).
            if (hideBot) list = list.filter((c) => c.type !== 'bot');
            // Pinned-then-newest order; bot conv first as pin-like (employee only).
            list.sort((a, b) => {
                if (!hideBot) {
                    if (a.type === 'bot' && b.type !== 'bot') return -1;
                    if (b.type === 'bot' && a.type !== 'bot') return 1;
                }
                if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
                const at = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
                const bt = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
                return bt - at;
            });
            setConversations(list);
        } catch { /* silent */ }
    }, [hideBot]);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    /* ── Load thread ────────────────────────────────────────────────── */
    const loadThread = useCallback(async (id: number) => {
        try {
            const res = await axios.get(`/my/chat/conversations/${id}`);
            setDetail(res.data);
            // mark read
            await axios.post(`/my/chat/conversations/${id}/read`).catch(() => {});
            setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)));
            // If bot conversation and empty, request welcome.
            const d: ConversationDetail = res.data;
            if (d.conversation.type === 'bot' && d.messages.length === 0) {
                axios.post(`/my/chat/conversations/${id}/bot/start`).then(() => loadThread(id));
            }
            // Scroll to bottom
            requestAnimationFrame(() => {
                if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
            });
        } catch (err: any) {
            console.error('loadThread error', id, err?.response?.status, err?.response?.data);
            if (err?.response?.status === 403) {
                alert('Энэ чат руу нэвтрэх эрх алга. Жагсаалт шинэчилнэ.');
                setSelectedId(null);
                setDetail(null);
                await loadConversations();
            }
        }
    }, [loadConversations]);

    useEffect(() => {
        if (selectedId) loadThread(selectedId);
        else setDetail(null);
    }, [selectedId, loadThread]);

    /* ── Reverb realtime listeners ───────────────────────────────────── */
    useEffect(() => {
        if (!currentUserId || !window.Echo) return;
        const userChan = window.Echo.private(`chat.user.${currentUserId}`);
        userChan.listen('.message.sent', () => loadConversations());
        userChan.listen('.conversation.updated', () => loadConversations());
        return () => { try { window.Echo.leave(`chat.user.${currentUserId}`); } catch {} };
    }, [currentUserId, loadConversations]);

    useEffect(() => {
        if (!selectedId || !window.Echo) return;
        const chan = window.Echo.private(`chat.conversation.${selectedId}`);
        chan.listen('.message.sent', (e: { message: Message }) => {
            console.log('[chat] message.sent on conv', selectedId, e.message);
            setDetail((prev) => {
                if (!prev || prev.conversation.id !== selectedId) return prev;
                // Avoid duplicate
                if (prev.messages.some((m) => m.id === e.message.id)) return prev;
                return { ...prev, messages: [...prev.messages, e.message] };
            });
            // Chime if the message is from someone else
            if (e.message?.sender_id && e.message.sender_id !== currentUserId) {
                playChime();
            }
            // mark as read since we're viewing
            axios.post(`/my/chat/conversations/${selectedId}/read`).catch(() => {});
            requestAnimationFrame(() => {
                if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
            });
        });
        chan.listen('.message.read', (e: { user_id: number; last_message_id: number; read_at: string }) => {
            setDetail((prev) => {
                if (!prev) return prev;
                const updated = prev.participants.map((p) =>
                    p.user_id === e.user_id ? { ...p, last_read_at: e.read_at } : p
                );
                return { ...prev, participants: updated };
            });
        });
        return () => { try { window.Echo.leave(`chat.conversation.${selectedId}`); } catch {} };
    }, [selectedId]);

    /* ── Send message ────────────────────────────────────────────────── */
    const send = async () => {
        if (!selectedId) return;
        if (!draft.trim() && files.length === 0) return;
        setSending(true);
        try {
            const fd = new FormData();
            if (draft.trim()) fd.append('body', draft.trim());
            if (replyTo) fd.append('reply_to_id', String(replyTo.id));
            files.forEach((f) => fd.append('files[]', f));
            const res = await axios.post(`/my/chat/conversations/${selectedId}/messages`, fd, {
                headers: { 'X-CSRF-TOKEN': csrfToken() },
            });
            const newMessage: Message = res.data.message;
            setDetail((prev) => {
                if (!prev) return prev;
                if (prev.messages.some((m) => m.id === newMessage.id)) return prev;
                return { ...prev, messages: [...prev.messages, newMessage] };
            });
            setDraft('');
            setFiles([]);
            setReplyTo(null);
            requestAnimationFrame(() => {
                if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
            });
            loadConversations();
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    /* ── Bot button click ────────────────────────────────────────────── */
    const clickBotButton = async (button: BotButton) => {
        if (!selectedId) return;
        if (button.action === 'url' && button.target_url) {
            window.open(button.target_url, '_blank');
            return;
        }
        try {
            await axios.post(`/my/chat/conversations/${selectedId}/bot/button/${button.id}`, {}, {
                headers: { 'X-CSRF-TOKEN': csrfToken() },
            });
            loadThread(selectedId);
        } catch (e) { console.error(e); }
    };

    /* ── Filtered conversation list ──────────────────────────────────── */
    const filtered = useMemo(() => {
        if (!search.trim()) return conversations;
        const q = search.trim().toLowerCase();
        return conversations.filter((c) => c.title.toLowerCase().includes(q));
    }, [conversations, search]);

    /* ── Selected conversation handle ────────────────────────────────── */
    const selectedConv = conversations.find((c) => c.id === selectedId);

    /* ──────────────────────────────────────────────────────────────────
       Render
       ──────────────────────────────────────────────────────────────── */
    return (
        <>
            <Head title="Чат" />
            <style>{`
                .chat-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(127,127,127,0.25) transparent;
                }
                .chat-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                .chat-scroll::-webkit-scrollbar-track { background: transparent; }
                .chat-scroll::-webkit-scrollbar-thumb {
                    background: rgba(127,127,127,0.25);
                    border-radius: 99px;
                    transition: background 0.2s;
                }
                .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(220,38,38,0.5); }
                .chat-scroll:hover::-webkit-scrollbar-thumb { background: rgba(127,127,127,0.4); }
                .chat-scroll::-webkit-scrollbar-corner { background: transparent; }
                .dark .chat-scroll { scrollbar-color: rgba(255,255,255,0.18) transparent; }
                .dark .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); }
                .dark .chat-scroll:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.28); }
                .dark .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(220,38,38,0.7); }
            `}</style>
            <div style={{ height: '100%', width: '100%', flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', background: 'var(--my-page-bg)', overflow: 'hidden' }}>
                {/* ── Conversation list ── */}
                {(!isMobile || selectedId === null) && (
                    <aside
                        style={{
                            width: isMobile ? '100%' : 340,
                            flex: isMobile ? '1 1 0' : '0 0 auto',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                            borderRight: isMobile ? 'none' : '1px solid var(--my-card-border)',
                            background: 'var(--my-card-bg)',
                            position: 'relative',
                        }}
                    >
                        {/* Hero banner — Mobile + employee mode only */}
                        {isMobile && mode === 'employee' ? (
                            <div style={{
                                background: 'linear-gradient(160deg, #ef4444 0%, #dc2626 30%, #b91c1c 65%, #7f1d1d 100%)',
                                padding: '14px 18px 22px',
                                position: 'relative', overflow: 'hidden',
                            }}>
                                <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -60, right: -60, pointerEvents: 'none' }} />
                                <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: 40, right: 40, pointerEvents: 'none' }} />

                                {/* Top row — icons + avatar */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, position: 'relative' }}>
                                    <ChatIcon variant="ghost" />
                                    <NotificationBell variant="ghost" />
                                    <Link href="/my/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                                        <div style={{
                                            width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
                                            border: '2px solid rgba(255,255,255,0.5)',
                                            background: employee?.photo_url ? `url(${employee.photo_url}) center/cover` : 'rgba(255,255,255,0.2)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {!employee?.photo_url && (
                                                <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{employeeInitials || 'HR'}</span>
                                            )}
                                        </div>
                                    </Link>
                                </div>

                                {/* Greeting */}
                                <div style={{ marginTop: 18, position: 'relative' }}>
                                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 500, margin: 0 }}>
                                        Сайн байна уу{firstName ? `, ${firstName}` : ''}!
                                    </p>
                                    <h1 style={{
                                        color: 'white', fontSize: 28, fontWeight: 900, margin: '6px 0 0',
                                        lineHeight: 1.15, letterSpacing: -0.6,
                                    }}>
                                        Танд <u style={{ textDecorationColor: 'rgba(255,255,255,0.4)', textDecorationThickness: 2, textUnderlineOffset: 4 }}>{conversations.reduce((s, c) => s + (c.unread_count ?? 0), 0)}</u> шинэ мессеж
                                    </h1>
                                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: '6px 0 0', fontWeight: 600 }}>
                                        {conversations.length} харилцан яриа
                                    </p>
                                </div>
                            </div>
                        ) : (
                            /* Desktop / admin header */
                            <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid var(--my-card-border)' }}>
                                <div>
                                    <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--my-input-text)', margin: 0, letterSpacing: -0.3 }}>Чат</h1>
                                    <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: '2px 0 0', fontWeight: 500 }}>
                                        {conversations.length} харилцан яриа
                                    </p>
                                </div>
                                {!isMobile && (
                                    <button
                                        onClick={() => setShowNew(true)}
                                        title="Шинэ чат"
                                        style={{
                                            width: 38, height: 38, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                            border: 'none', cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white',
                                        }}
                                    >
                                        <Plus size={18} strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Search */}
                        <div style={{ padding: '12px 18px 8px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={15} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--my-faint)' }} />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Хайх…"
                                    style={{
                                        width: '100%', height: 38, paddingLeft: 38, paddingRight: 12,
                                        borderRadius: 12, border: '1px solid transparent',
                                        background: 'var(--my-pill-bg)',
                                        color: 'var(--my-input-text)', fontSize: 13, outline: 'none',
                                        transition: 'all 0.15s',
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.background = 'var(--my-input-bg)'; e.currentTarget.style.borderColor = 'var(--my-card-border)'; }}
                                    onBlur={(e) => { e.currentTarget.style.background = 'var(--my-pill-bg)'; e.currentTarget.style.borderColor = 'transparent'; }}
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', paddingBottom: isMobile ? 100 : 16 }}>
                            {filtered.length === 0 ? (
                                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--my-faint)' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--my-pill-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                        <MessageCircle size={28} style={{ opacity: 0.4 }} />
                                    </div>
                                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Харилцан яриа алга</p>
                                    <p style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>Шинэ чат эхлүүлэхийн тулд + товч дарна уу</p>
                                </div>
                            ) : (
                                filtered.map((c) => (
                                    <ConversationRow key={c.id} conv={c} selected={c.id === selectedId} onClick={() => setSelectedId(c.id)} />
                                ))
                            )}
                        </div>

                        {/* Mobile FAB only */}
                        {isMobile && (
                            <button
                                onClick={() => setShowNew(true)}
                                style={{
                                    position: 'absolute', right: 20, bottom: 88,
                                    width: 56, height: 56, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                    border: 'none', cursor: 'pointer',
                                    boxShadow: '0 10px 24px rgba(220,38,38,0.4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', zIndex: 30,
                                }}
                                aria-label="Шинэ чат"
                            >
                                <Plus size={26} strokeWidth={2.5} />
                            </button>
                        )}
                    </aside>
                )}

                {/* ── Thread panel ── */}
                {(selectedId !== null || !isMobile) && (
                    <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, background: 'var(--my-page-bg)' }}>
                        {selectedId && selectedConv && detail ? (
                            <ThreadPanel
                                isMobile={isMobile}
                                conv={selectedConv}
                                detail={detail}
                                currentUserId={currentUserId}
                                onBack={() => setSelectedId(null)}
                                threadRef={threadRef}
                                replyTo={replyTo}
                                setReplyTo={setReplyTo}
                                onBotButtonClick={clickBotButton}
                            />
                        ) : (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--my-faint)', padding: 32 }}>
                                <div style={{
                                    width: 120, height: 120, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(220,38,38,0.02))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 20, position: 'relative',
                                }}>
                                    <MessageCircle size={56} style={{ color: '#dc2626', opacity: 0.5 }} />
                                    <div style={{
                                        position: 'absolute', top: 8, right: 14,
                                        width: 16, height: 16, borderRadius: '50%',
                                        background: '#16a34a', border: '3px solid var(--my-page-bg)',
                                    }} />
                                </div>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--my-input-text)', margin: 0, letterSpacing: -0.3 }}>
                                    Cuticul Dental Чат
                                </h2>
                                <p style={{ fontSize: 13, marginTop: 6, fontWeight: 500, opacity: 0.8 }}>
                                    Харилцан яриа сонгож эхлүүлнэ үү
                                </p>
                                <div style={{ display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
                                    <FeaturePill icon="🔒" label="End-to-end" />
                                    <FeaturePill icon="⚡" label="Realtime" />
                                    <FeaturePill icon="🤖" label="HR Bot" />
                                </div>
                            </div>
                        )}

                        {/* Composer */}
                        {selectedId && detail && (
                            <Composer
                                isBot={detail.conversation.type === 'bot'}
                                draft={draft}
                                setDraft={setDraft}
                                files={files}
                                setFiles={setFiles}
                                replyTo={replyTo}
                                setReplyTo={setReplyTo}
                                sending={sending}
                                onSend={send}
                                inputRef={inputRef}
                            />
                        )}
                    </section>
                )}

                {/* ── New chat bottom sheet ── */}
                {showNew && (
                    <NewChatSheet
                        canCreateGroup={mode === 'admin'}
                        onClose={() => setShowNew(false)}
                        onPicked={async (userIds, groupName) => {
                            try {
                                if (groupName && userIds.length >= 1) {
                                    const res = await axios.post('/my/chat/groups', {
                                        name: groupName, user_ids: userIds,
                                    }, { headers: { 'X-CSRF-TOKEN': csrfToken() } });
                                    setShowNew(false);
                                    await loadConversations();
                                    setSelectedId(res.data?.conversation_id ?? null);
                                } else if (userIds.length === 1) {
                                    const res = await axios.post('/my/chat/conversations/direct', {
                                        user_id: userIds[0],
                                    }, { headers: { 'X-CSRF-TOKEN': csrfToken() } });
                                    setShowNew(false);
                                    await loadConversations();
                                    setSelectedId(res.data?.conversation_id ?? null);
                                }
                            } catch (e: any) {
                                console.error('Чат үүсгэх алдаа:', e?.response?.status, e?.response?.data);
                                alert(e?.response?.data?.message ?? `Чат үүсгэхэд алдаа гарлаа (${e?.response?.status ?? '?'})`);
                            }
                        }}
                    />
                )}
            </div>
        </>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   HeaderIconBtn — round icon button for thread header
   ──────────────────────────────────────────────────────────────────────── */
function HeaderIconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--my-faint)', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--my-pill-bg)'; e.currentTarget.style.color = 'var(--my-input-text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--my-faint)'; }}
        >
            {children}
        </button>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   FeaturePill — empty state badge
   ──────────────────────────────────────────────────────────────────────── */
function FeaturePill({ icon, label }: { icon: string; label: string }) {
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 99,
            background: 'var(--my-card-bg)',
            border: '1px solid var(--my-card-border)',
            fontSize: 11, fontWeight: 700, color: 'var(--my-input-text)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
            <span>{icon}</span>
            <span>{label}</span>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   ConversationRow
   ──────────────────────────────────────────────────────────────────────── */
function ConversationRow({ conv, selected, onClick }: { conv: Conversation; selected: boolean; onClick: () => void }) {
    const isBot = conv.type === 'bot';
    const isGroup = conv.type === 'group';
    const lastBody = conv.last_message?.body
        ?? (conv.last_message?.type === 'image' ? '📷 Зураг'
            : conv.last_message?.type === 'file' ? '📎 Файл'
            : conv.last_message?.type === 'bot_card' ? '🤖 Сонголт'
            : '');
    const hasUnread = conv.unread_count > 0;
    return (
        <div style={{ padding: '0 8px' }}>
            <button
                onClick={onClick}
                style={{
                    width: '100%', padding: '10px 12px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: selected ? 'linear-gradient(135deg, rgba(220,38,38,0.10), rgba(220,38,38,0.04))' : 'transparent',
                    border: selected ? '1px solid rgba(220,38,38,0.2)' : '1px solid transparent',
                    borderRadius: 14,
                    cursor: 'pointer', textAlign: 'left',
                    marginBottom: 2, marginTop: 2,
                    transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--my-pill-bg)'; }}
                onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
            >
                {/* Avatar with online dot for bot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                        width: 46, height: 46, borderRadius: '50%',
                        background: conv.photo
                            ? `url(${conv.photo}) center/cover`
                            : isBot
                                ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                                : (isGroup && !conv.is_support)
                                    ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                                    : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 15,
                        boxShadow: selected ? '0 4px 10px rgba(220,38,38,0.25)' : 'none',
                        overflow: 'hidden',
                    }}>
                        {!conv.photo && (isBot ? <Bot size={20} /> : (isGroup && !conv.is_support) ? <Users size={20} /> : getInitials(conv.title))}
                    </div>
                    {(isBot || conv.other_online) && (
                        <span style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: 12, height: 12, borderRadius: '50%',
                            background: '#16a34a', border: '2px solid var(--my-card-bg)',
                        }} />
                    )}
                </div>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            fontSize: 14, fontWeight: hasUnread ? 800 : 700,
                            color: 'var(--my-input-text)', flex: 1,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {conv.title}
                        </span>
                        <span style={{
                            fontSize: 10,
                            color: hasUnread ? '#dc2626' : 'var(--my-faint)',
                            fontWeight: hasUnread ? 800 : 600, flexShrink: 0,
                        }}>
                            {formatTime(conv.last_message_at)}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span style={{
                            fontSize: 12,
                            color: hasUnread ? 'var(--my-input-text)' : 'var(--my-faint)',
                            fontWeight: hasUnread ? 600 : 500,
                            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {conv.last_message?.sender_name && !isBot && conv.type !== 'direct'
                                ? <span style={{ fontWeight: 700 }}>{conv.last_message.sender_name}: </span> : null}
                            {lastBody || '—'}
                        </span>
                        {hasUnread && (
                            <span style={{
                                minWidth: 20, height: 20, borderRadius: 10,
                                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                color: 'white',
                                fontSize: 10, fontWeight: 800, padding: '0 6px',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(220,38,38,0.4)',
                            }}>
                                {conv.unread_count > 99 ? '99+' : conv.unread_count}
                            </span>
                        )}
                    </div>
                </div>
            </button>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   ThreadPanel
   ──────────────────────────────────────────────────────────────────────── */
function ThreadPanel({
    isMobile, conv, detail, currentUserId, onBack, threadRef, replyTo, setReplyTo, onBotButtonClick,
}: {
    isMobile: boolean;
    conv: Conversation;
    detail: ConversationDetail;
    currentUserId: number;
    onBack: () => void;
    threadRef: React.RefObject<HTMLDivElement | null>;
    replyTo: Message | null;
    setReplyTo: (m: Message | null) => void;
    onBotButtonClick: (b: BotButton) => void;
}) {
    const isBot = conv.type === 'bot';
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchText, setSearchText] = useState('');

    const filteredMessages = searchText.trim()
        ? detail.messages.filter((m) => (m.body ?? '').toLowerCase().includes(searchText.trim().toLowerCase()))
        : detail.messages;

    return (
        <>
            {/* Thread header */}
            <header style={{
                height: 64, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '0 16px',
                background: 'var(--my-card-bg)',
                borderBottom: '1px solid var(--my-card-border)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}>
                {isMobile && (
                    <button onClick={onBack} style={{
                        width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--my-pill-bg)', border: 'none', cursor: 'pointer',
                        color: 'var(--my-input-text)', borderRadius: '50%',
                    }}>
                        <ArrowLeft size={18} />
                    </button>
                )}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: '50%',
                        background: conv.photo
                            ? `url(${conv.photo}) center/cover`
                            : isBot ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                            : (conv.type === 'group' && !conv.is_support) ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                            : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 14,
                        overflow: 'hidden',
                    }}>
                        {!conv.photo && (isBot ? <Bot size={20} /> : (conv.type === 'group' && !conv.is_support) ? <Users size={20} /> : getInitials(conv.title))}
                    </div>
                    {(isBot || conv.other_online) && (
                        <span style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: 12, height: 12, borderRadius: '50%',
                            background: '#16a34a', border: '2.5px solid var(--my-card-bg)',
                        }} />
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--my-input-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: -0.2 }}>
                        {conv.title}
                    </p>
                    {isBot ? (
                        <p style={{ fontSize: 11, color: '#16a34a', margin: '2px 0 0', fontWeight: 600 }}>● Онлайн туслах</p>
                    ) : (conv.type === 'group' && !conv.is_support) ? (
                        <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: '2px 0 0', fontWeight: 600 }}>
                            {conv.participants_count} гишүүн
                        </p>
                    ) : conv.other_online ? (
                        <p style={{ fontSize: 11, color: '#16a34a', margin: '2px 0 0', fontWeight: 600 }}>● Онлайн</p>
                    ) : null}
                </div>
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <HeaderIconBtn title="Хайх" onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setSearchText(''); }}>
                        {searchOpen ? <X size={17} /> : <Search size={17} />}
                    </HeaderIconBtn>
                    {!isBot && (
                        <HeaderIconBtn
                            title="Чат устгах"
                            onClick={async () => {
                                if (!confirm('Энэ чатыг устгах уу?')) return;
                                try {
                                    await axios.delete(`/my/chat/conversations/${conv.id}`, { headers: { 'X-CSRF-TOKEN': csrfToken() } });
                                    window.location.reload();
                                } catch (e: any) { alert(e?.response?.data?.message ?? 'Алдаа'); }
                            }}
                        >
                            <Trash2 size={17} />
                        </HeaderIconBtn>
                    )}
                </div>
            </header>

            {/* Search bar */}
            {searchOpen && (
                <div style={{
                    flexShrink: 0,
                    padding: '8px 16px',
                    background: 'var(--my-card-bg)',
                    borderBottom: '1px solid var(--my-card-border)',
                }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--my-faint)' }} />
                        <input
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Чат дотроос хайх..."
                            autoFocus
                            style={{
                                width: '100%', height: 36, paddingLeft: 36, paddingRight: 12,
                                borderRadius: 10, border: '1px solid var(--my-card-border)',
                                background: 'var(--my-input-bg)',
                                color: 'var(--my-input-text)', fontSize: 13, outline: 'none',
                            }}
                        />
                    </div>
                    {searchText.trim() && (
                        <p style={{ fontSize: 10, color: 'var(--my-faint)', margin: '6px 0 0', fontWeight: 600 }}>
                            {filteredMessages.length} илэрц
                        </p>
                    )}
                </div>
            )}

            {/* Messages */}
            <div ref={threadRef} className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 12px' }}>
                {filteredMessages.map((m, i) => {
                    const prev = i > 0 ? filteredMessages[i - 1] : null;
                    const showDate = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
                    return (
                        <div key={m.id}>
                            {showDate && (
                                <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
                                    <span style={{
                                        fontSize: 10, color: 'var(--my-faint)',
                                        background: 'var(--my-pill-bg)', padding: '4px 10px',
                                        borderRadius: 99, fontWeight: 700,
                                    }}>
                                        {new Date(m.created_at).toLocaleDateString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                            )}
                            <MessageBubble
                                msg={m}
                                isMine={m.sender_id === currentUserId}
                                isGroup={conv.type === 'group'}
                                participants={detail.participants}
                                currentUserId={currentUserId}
                                onReply={() => setReplyTo(m)}
                                onBotButtonClick={onBotButtonClick}
                            />
                        </div>
                    );
                })}
                {filteredMessages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--my-faint)' }}>
                        <MessageCircle size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                        <p style={{ fontSize: 13, fontWeight: 600 }}>Мессеж бичээрэй</p>
                    </div>
                )}
            </div>
        </>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   MessageBubble
   ──────────────────────────────────────────────────────────────────────── */
function MessageBubble({
    msg, isMine, isGroup, participants, currentUserId, onReply, onBotButtonClick,
}: {
    msg: Message;
    isMine: boolean;
    isGroup: boolean;
    participants: Array<{ user_id: number; name: string; last_read_at: string | null }>;
    currentUserId: number;
    onReply: () => void;
    onBotButtonClick: (b: BotButton) => void;
}) {
    const isBot = msg.sender_type === 'bot';
    const isSystem = msg.sender_type === 'system';

    if (isSystem) {
        return (
            <div style={{ textAlign: 'center', margin: '6px 0' }}>
                <span style={{ fontSize: 11, color: 'var(--my-faint)', fontWeight: 600 }}>{msg.body}</span>
            </div>
        );
    }

    // Read receipt: count other-participants whose last_read_at >= this message
    const others = participants.filter((p) => p.user_id !== currentUserId);
    const readBy = others.filter((p) => p.last_read_at && new Date(p.last_read_at).getTime() >= new Date(msg.created_at).getTime());
    const allRead = others.length > 0 && readBy.length === others.length;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: isMine ? 'flex-end' : 'flex-start',
            gap: 8,
            marginBottom: 6,
        }}>
            {/* Bot avatar — only for incoming bot messages */}
            {isBot && (
                <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800,
                    boxShadow: '0 2px 6px rgba(245,158,11,0.3)',
                    marginBottom: 2,
                }}>
                    <Bot size={16} />
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
                {isGroup && !isMine && !isBot && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', marginLeft: 10, marginBottom: 2 }}>
                        {msg.sender?.name}
                    </span>
                )}
                {isBot && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', marginLeft: 4, marginBottom: 2 }}>
                        HR Туслах
                    </span>
                )}
                <div
                    onDoubleClick={() => onReply()}
                    style={{
                        background: isBot
                            ? 'var(--my-card-bg)'
                            : isMine
                                ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                                : 'var(--my-card-bg)',
                        color: isBot ? 'var(--my-input-text)' : isMine ? 'white' : 'var(--my-input-text)',
                        padding: msg.type === 'image' && msg.attachments.length > 0 ? 4 : '10px 14px',
                        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        border: isBot ? '1px solid rgba(245,158,11,0.25)' : !isMine ? '1px solid var(--my-card-border)' : 'none',
                        position: 'relative', cursor: 'default',
                    }}
                >
                {/* Reply preview */}
                {msg.reply_to && (
                    <div style={{
                        background: isMine ? 'rgba(255,255,255,0.18)' : 'var(--my-pill-bg)',
                        borderLeft: `3px solid ${isMine ? 'rgba(255,255,255,0.6)' : '#dc2626'}`,
                        padding: '4px 8px', borderRadius: 6, marginBottom: 6, fontSize: 11,
                    }}>
                        <div style={{ fontWeight: 700, opacity: 0.9 }}>{msg.reply_to.sender_name ?? 'Хариу'}</div>
                        <div style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
                            {msg.reply_to.body || (msg.reply_to.type === 'image' ? '📷 Зураг' : '📎 Файл')}
                        </div>
                    </div>
                )}

                {/* Attachments */}
                {msg.attachments.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: msg.attachments.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 4, marginBottom: msg.body ? 6 : 0 }}>
                        {msg.attachments.map((a) =>
                            a.is_image ? (
                                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer">
                                    <img src={a.url} alt={a.original_name} style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
                                </a>
                            ) : (
                                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                                    background: isMine ? 'rgba(255,255,255,0.15)' : 'var(--my-pill-bg)',
                                    borderRadius: 10, textDecoration: 'none',
                                    color: isMine ? 'white' : 'var(--my-input-text)',
                                }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: isMine ? 'rgba(255,255,255,0.2)' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Paperclip size={14} color={isMine ? 'white' : '#dc2626'} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.original_name}</div>
                                        <div style={{ fontSize: 10, opacity: 0.7 }}>{fileSizeStr(a.size)}</div>
                                    </div>
                                </a>
                            )
                        )}
                    </div>
                )}

                {/* Body */}
                {msg.body && (
                    <div style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.body}
                    </div>
                )}

                {/* Time + read state */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end', opacity: 0.7 }}>
                    <span style={{ fontSize: 10, color: isMine && !isBot ? 'rgba(255,255,255,0.9)' : 'var(--my-faint)' }}>
                        {formatTimeFull(msg.created_at)}
                    </span>
                    {isMine && !isBot && (
                        allRead
                            ? <CheckCheck size={13} color="#86efac" />
                            : <Check size={13} color="rgba(255,255,255,0.7)" />
                    )}
                </div>
                </div>

                {/* Bot buttons — outside the bubble for a cleaner look */}
                {msg.type === 'bot_card' && msg.meta?.buttons && msg.meta.buttons.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, marginLeft: 4 }}>
                        {msg.meta.buttons.map((b) => {
                            const isHandoff = b.action === 'handoff';
                            const isBack = b.action === 'back' || b.action === 'close';
                            return (
                                <button
                                    key={b.id}
                                    onClick={() => onBotButtonClick(b)}
                                    style={{
                                        background: isHandoff
                                            ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                                            : isBack
                                                ? 'var(--my-pill-bg)'
                                                : 'var(--my-card-bg)',
                                        color: isHandoff ? 'white' : 'var(--my-input-text)',
                                        border: isHandoff ? 'none' : '1px solid var(--my-card-border)',
                                        padding: '8px 14px',
                                        borderRadius: 999,
                                        fontSize: 12, fontWeight: 700,
                                        cursor: 'pointer',
                                        boxShadow: isHandoff ? '0 2px 8px rgba(220,38,38,0.25)' : '0 1px 2px rgba(0,0,0,0.04)',
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isHandoff) {
                                            e.currentTarget.style.borderColor = '#dc2626';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isHandoff) {
                                            e.currentTarget.style.borderColor = 'var(--my-card-border)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }
                                    }}
                                >
                                    {b.icon && <span>{b.icon}</span>}
                                    {b.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   Composer
   ──────────────────────────────────────────────────────────────────────── */
function Composer({
    isBot, draft, setDraft, files, setFiles, replyTo, setReplyTo, sending, onSend, inputRef,
}: {
    isBot: boolean;
    draft: string;
    setDraft: (s: string) => void;
    files: File[];
    setFiles: (f: File[]) => void;
    replyTo: Message | null;
    setReplyTo: (m: Message | null) => void;
    sending: boolean;
    onSend: () => void;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
    const fileRef = useRef<HTMLInputElement>(null);

    const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div style={{
            flexShrink: 0,
            background: 'var(--my-card-bg)',
            borderTop: '1px solid var(--my-card-border)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
            {replyTo && (
                <div style={{
                    padding: '8px 12px',
                    background: 'var(--my-pill-bg)',
                    borderBottom: '1px solid var(--my-card-border)',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <div style={{ flex: 1, minWidth: 0, borderLeft: '3px solid #dc2626', paddingLeft: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626' }}>
                            {replyTo.sender?.name ?? 'Хариу'}-д хариу
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--my-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {replyTo.body || (replyTo.type === 'image' ? '📷 Зураг' : '📎 Файл')}
                        </div>
                    </div>
                    <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--my-faint)' }}>
                        <X size={18} />
                    </button>
                </div>
            )}
            {files.length > 0 && (
                <div style={{ padding: '8px 12px', display: 'flex', gap: 6, overflowX: 'auto', borderBottom: '1px solid var(--my-card-border)' }}>
                    {files.map((f, i) => (
                        <div key={i} style={{
                            position: 'relative',
                            background: 'var(--my-pill-bg)', borderRadius: 10,
                            padding: '6px 24px 6px 10px', fontSize: 11, fontWeight: 700,
                            color: 'var(--my-input-text)', whiteSpace: 'nowrap',
                        }}>
                            {f.type.startsWith('image/') ? '📷 ' : '📎 '}{f.name.length > 24 ? f.name.slice(0, 22) + '…' : f.name}
                            <button onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{
                                position: 'absolute', right: 4, top: 4, width: 16, height: 16, borderRadius: '50%',
                                background: 'rgba(0,0,0,0.1)', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--my-faint)',
                            }}>
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 12px' }}>
                {!isBot && (
                    <>
                        <input
                            ref={fileRef}
                            type="file"
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const list = Array.from(e.target.files ?? []);
                                setFiles([...files, ...list]);
                                e.target.value = '';
                            }}
                        />
                        <button
                            onClick={() => fileRef.current?.click()}
                            style={{
                                width: 38, height: 38, borderRadius: '50%',
                                background: 'var(--my-pill-bg)', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--my-faint)', flexShrink: 0,
                            }}
                            aria-label="Файл"
                        >
                            <Paperclip size={18} />
                        </button>
                    </>
                )}
                <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={isBot ? 'Bot товчоор хариулна уу…' : 'Мессеж бичих…'}
                    rows={1}
                    style={{
                        flex: 1, resize: 'none', minHeight: 38, maxHeight: 120,
                        padding: '9px 14px', borderRadius: 19,
                        border: '1px solid var(--my-card-border)',
                        background: 'var(--my-input-bg)',
                        color: 'var(--my-input-text)', fontSize: 14, outline: 'none', lineHeight: 1.4,
                    }}
                />
                <button
                    onClick={onSend}
                    disabled={sending || (!draft.trim() && files.length === 0)}
                    style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: (sending || (!draft.trim() && files.length === 0)) ? 'var(--my-pill-bg)' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                        color: (sending || (!draft.trim() && files.length === 0)) ? 'var(--my-faint)' : 'white',
                        border: 'none', cursor: 'pointer', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: (!draft.trim() && files.length === 0) ? 'none' : '0 4px 12px rgba(220,38,38,0.35)',
                    }}
                    aria-label="Илгээх"
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   NewChatSheet
   ──────────────────────────────────────────────────────────────────────── */
function NewChatSheet({
    canCreateGroup, onClose, onPicked,
}: {
    canCreateGroup: boolean;
    onClose: () => void;
    onPicked: (userIds: number[], groupName?: string) => void;
}) {
    const [tab, setTab] = useState<'direct' | 'group'>('direct');
    const [staff, setStaff] = useState<StaffOption[]>([]);
    const [search, setSearch] = useState('');
    const [picked, setPicked] = useState<number[]>([]);
    const [groupName, setGroupName] = useState('');

    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        let active = true;
        axios.get('/my/chat/staff', { params: { q: search } })
            .then((r) => { if (active) setStaff(r.data?.employees ?? []); })
            .catch(() => {});
        return () => { active = false; };
    }, [search]);

    const toggle = (id: number) => {
        if (tab === 'direct') {
            onPicked([id]);
            return;
        }
        setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const pickedSet = new Set(picked);

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: isMobile ? 'flex-end' : 'center',
                justifyContent: 'center',
                padding: isMobile ? 0 : 20,
                animation: 'newchat-fade 0.2s ease-out',
            }}
        >
            <style>{`
                @keyframes newchat-fade { from { opacity: 0 } to { opacity: 1 } }
                @keyframes newchat-slide { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
            `}</style>
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: isMobile ? 'none' : 520,
                    height: isMobile ? '85svh' : 'auto',
                    maxHeight: isMobile ? '85svh' : '80vh',
                    background: 'var(--my-card-bg)',
                    borderRadius: isMobile ? '24px 24px 0 0' : 20,
                    display: 'flex', flexDirection: 'column',
                    paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : 0,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
                    border: '1px solid var(--my-card-border)',
                    overflow: 'hidden',
                    animation: 'newchat-slide 0.25s ease-out',
                }}
            >
                {isMobile && (
                    <div style={{ width: 40, height: 4, background: '#d1d1d6', borderRadius: 99, margin: '12px auto 4px', flexShrink: 0 }} />
                )}

                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid var(--my-card-border)',
                    flexShrink: 0,
                }}>
                    <div>
                        <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--my-input-text)', letterSpacing: -0.3 }}>
                            Шинэ чат
                        </h3>
                        <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: '2px 0 0', fontWeight: 500 }}>
                            Ажилтнаа сонгож яриа эхлүүлнэ үү
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'var(--my-pill-bg)', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--my-input-text)',
                    }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Tabs (admin only) */}
                {canCreateGroup && (
                    <div style={{ display: 'flex', gap: 4, padding: '12px 20px 0', flexShrink: 0 }}>
                        <button
                            onClick={() => setTab('direct')}
                            style={{
                                flex: 1, padding: '10px', borderRadius: 12,
                                background: tab === 'direct' ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'transparent',
                                color: tab === 'direct' ? 'white' : 'var(--my-faint)',
                                fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                boxShadow: tab === 'direct' ? '0 4px 12px rgba(220,38,38,0.25)' : 'none',
                                transition: 'all 0.15s',
                            }}
                        >
                            <MessageCircle size={15} />
                            1-on-1
                        </button>
                        <button
                            onClick={() => setTab('group')}
                            style={{
                                flex: 1, padding: '10px', borderRadius: 12,
                                background: tab === 'group' ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'transparent',
                                color: tab === 'group' ? 'white' : 'var(--my-faint)',
                                fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                boxShadow: tab === 'group' ? '0 4px 12px rgba(220,38,38,0.25)' : 'none',
                                transition: 'all 0.15s',
                            }}
                        >
                            <Users size={15} />
                            Группын чат
                        </button>
                    </div>
                )}

                {/* Group name */}
                {tab === 'group' && (
                    <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Группын нэр
                        </label>
                        <input
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Жишээ нь: Маркетингийн баг"
                            style={{
                                width: '100%', height: 42, padding: '0 14px', marginTop: 6,
                                borderRadius: 12, border: '1px solid var(--my-card-border)',
                                background: 'var(--my-input-bg)',
                                color: 'var(--my-input-text)', fontSize: 13, outline: 'none',
                            }}
                        />
                    </div>
                )}

                {/* Search */}
                <div style={{ padding: '14px 20px 12px', flexShrink: 0 }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={15} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--my-faint)' }} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Ажилтнаар хайх..."
                            style={{
                                width: '100%', height: 40, paddingLeft: 38, paddingRight: 12,
                                borderRadius: 12, border: '1px solid var(--my-card-border)',
                                background: 'var(--my-input-bg)',
                                color: 'var(--my-input-text)', fontSize: 13, outline: 'none',
                            }}
                        />
                    </div>
                </div>

                {/* Picked summary (group) */}
                {tab === 'group' && picked.length > 0 && (
                    <div style={{
                        padding: '0 20px 10px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0,
                    }}>
                        {picked.map((id) => {
                            const s = staff.find((x) => x.user_id === id);
                            if (!s) return null;
                            return (
                                <div key={id} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '4px 4px 4px 10px', borderRadius: 99,
                                    background: 'rgba(220,38,38,0.1)', color: '#dc2626',
                                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                                }}>
                                    {s.name.split(' ')[0]}
                                    <button onClick={() => toggle(id)} style={{
                                        width: 18, height: 18, borderRadius: '50%',
                                        background: '#dc2626', color: 'white', border: 'none',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <X size={11} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Staff list */}
                <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 12px 8px', minHeight: 0 }}>
                    {staff.length === 0 && (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--my-faint)' }}>
                            <Users size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                            <p style={{ fontSize: 12, fontWeight: 600 }}>Ажилтан олдсонгүй</p>
                        </div>
                    )}
                    {staff.map((s) => {
                        const isPicked = pickedSet.has(s.user_id);
                        return (
                            <button
                                key={s.user_id}
                                onClick={() => toggle(s.user_id)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 12px',
                                    background: isPicked ? 'rgba(220,38,38,0.08)' : 'transparent',
                                    border: isPicked ? '1px solid rgba(220,38,38,0.25)' : '1px solid transparent',
                                    cursor: 'pointer', textAlign: 'left',
                                    borderRadius: 12, marginBottom: 4,
                                    transition: 'all 0.12s',
                                }}
                                onMouseEnter={(e) => { if (!isPicked) e.currentTarget.style.background = 'var(--my-pill-bg)'; }}
                                onMouseLeave={(e) => { if (!isPicked) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <div style={{
                                    width: 42, height: 42, borderRadius: '50%',
                                    background: s.photo ? `url(${s.photo}) center/cover` : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: 14, flexShrink: 0,
                                    overflow: 'hidden',
                                }}>
                                    {!s.photo && getInitials(s.name)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--my-input-text)' }}>{s.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--my-faint)', marginTop: 1 }}>
                                        {[s.position, s.branch].filter(Boolean).join(' · ') || '—'}
                                    </div>
                                </div>
                                {tab === 'group' ? (
                                    <div style={{
                                        width: 22, height: 22, borderRadius: 6,
                                        border: isPicked ? 'none' : '2px solid var(--my-card-border)',
                                        background: isPicked ? '#dc2626' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {isPicked && <Check size={14} color="white" />}
                                    </div>
                                ) : (
                                    <MessageCircle size={16} style={{ color: 'var(--my-faint)' }} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Group create button */}
                {tab === 'group' && (
                    <div style={{
                        padding: '12px 20px',
                        borderTop: '1px solid var(--my-card-border)',
                        flexShrink: 0,
                    }}>
                        <button
                            disabled={!groupName.trim() || picked.length === 0}
                            onClick={() => onPicked(picked, groupName.trim())}
                            style={{
                                width: '100%', height: 46, borderRadius: 14,
                                background: groupName.trim() && picked.length > 0
                                    ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'var(--my-pill-bg)',
                                color: groupName.trim() && picked.length > 0 ? 'white' : 'var(--my-faint)',
                                border: 'none', cursor: groupName.trim() && picked.length > 0 ? 'pointer' : 'not-allowed',
                                fontSize: 14, fontWeight: 800,
                                boxShadow: groupName.trim() && picked.length > 0 ? '0 6px 18px rgba(220,38,38,0.3)' : 'none',
                            }}
                        >
                            {picked.length > 0 ? `${picked.length} хүнтэй групп үүсгэх` : 'Хамаатан сонгоно уу'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
