import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { CheckCircle2, Clock, Inbox, MessageCircle, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Handoff {
    id: number;
    status: 'pending' | 'assigned' | 'closed';
    reason: string | null;
    user: { id: number; name: string } | null;
    assigned_admin: { id: number; name: string } | null;
    bot_conversation_id: number;
    direct_conversation_id: number | null;
    assigned_at: string | null;
    closed_at: string | null;
    created_at: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Чатын хүсэлт', href: '/admin/chat-inbox' },
];

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

declare global {
    interface Window { Echo: any }
}

export default function ChatInboxIndex() {
    const [status, setStatus] = useState<'pending' | 'open' | 'closed' | 'all'>('open');
    const [handoffs, setHandoffs] = useState<Handoff[]>([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/admin/chat-inbox/handoffs', { params: { status } });
            setHandoffs(res.data?.handoffs ?? []);
        } finally { setLoading(false); }
    }, [status]);

    useEffect(() => { load(); }, [load]);

    // Realtime: refresh on new handoff event.
    useEffect(() => {
        if (!window.Echo) return;
        const chan = window.Echo.private('chat.handoff-inbox');
        chan.listen('.handoff.requested', () => load());
        return () => { try { window.Echo.leave('chat.handoff-inbox'); } catch {} };
    }, [load]);

    const claim = async (h: Handoff) => {
        try {
            const res = await axios.post(`/admin/chat-inbox/handoffs/${h.id}/claim`, {}, { headers: { 'X-CSRF-TOKEN': csrf() } });
            const cid = res.data?.handoff?.direct_conversation_id;
            await load();
            if (cid) router.visit('/admin/chat');
        } catch (e: any) {
            alert(e?.response?.data?.message ?? 'Алдаа');
        }
    };

    const close = async (h: Handoff) => {
        if (!confirm('Хүсэлтийг хаах уу?')) return;
        await axios.post(`/admin/chat-inbox/handoffs/${h.id}/close`, {}, { headers: { 'X-CSRF-TOKEN': csrf() } });
        load();
    };

    const statusColor = (s: Handoff['status']) =>
        s === 'pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        : s === 'assigned' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';

    const statusLabel = (s: Handoff['status']) =>
        s === 'pending' ? 'Хүлээгдэж буй' : s === 'assigned' ? 'Шилжүүлсэн' : 'Хаагдсан';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Чат — Inbox" />
            <div className="p-4 md:p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Inbox className="size-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-black text-gray-900 dark:text-gray-100">Чатын хүсэлт</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Ажилтнаас bot дамжуулан ирсэн админ-руу хүсэлтүүд</p>
                    </div>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                    {(['open', 'pending', 'closed', 'all'] as const).map((s) => (
                        <button key={s} onClick={() => setStatus(s)}
                            className={`h-9 px-3 rounded-xl text-xs font-bold ${status === s
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
                            {s === 'open' ? 'Идэвхтэй' : s === 'pending' ? 'Хүлээгдэж буй' : s === 'closed' ? 'Хаагдсан' : 'Бүгд'}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    {handoffs.length === 0 ? (
                        <div className="py-16 text-center text-gray-500">
                            <Inbox className="size-10 mx-auto opacity-30 mb-2" />
                            <p className="text-sm font-semibold">{loading ? 'Уншиж байна…' : 'Хүсэлт алга'}</p>
                        </div>
                    ) : (
                        handoffs.map((h) => (
                            <div key={h.id} className="p-4 border-b last:border-0 border-gray-100 dark:border-gray-800 flex items-center gap-3 flex-wrap">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-black text-sm shrink-0">
                                    {h.user?.name.slice(0, 2).toUpperCase() ?? '??'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-black text-gray-900 dark:text-gray-100">{h.user?.name ?? 'Хэрэглэгч'}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColor(h.status)}`}>{statusLabel(h.status)}</span>
                                        {h.assigned_admin && <span className="text-[11px] text-gray-500">→ {h.assigned_admin.name}</span>}
                                    </div>
                                    {h.reason && <p className="text-xs text-gray-500 mt-0.5">«{h.reason}»</p>}
                                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                        <Clock className="size-3" />
                                        {new Date(h.created_at).toLocaleString('mn-MN')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {h.status === 'pending' && (
                                        <button onClick={() => claim(h)}
                                            className="h-9 px-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5">
                                            <MessageCircle className="size-3.5" /> Хариулах
                                        </button>
                                    )}
                                    {h.status === 'assigned' && (
                                        <>
                                            <button onClick={() => router.visit('/admin/chat')}
                                                className="h-9 px-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5">
                                                <MessageCircle className="size-3.5" /> Чат руу
                                            </button>
                                            <button onClick={() => close(h)}
                                                className="h-9 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-xs font-bold flex items-center gap-1.5">
                                                <CheckCircle2 className="size-3.5" /> Хаах
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
