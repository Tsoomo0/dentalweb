import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
    Bot, Check, ChevronLeft, ChevronRight, Facebook, FileText, ImageIcon, Instagram, Loader2, Mic, Paperclip, RotateCcw, Search, Send, Trash2, UserRound, X, Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Conversation {
    id: number; channel: 'messenger' | 'instagram'; status: string; name: string; avatar: string | null;
    page_name: string; last_message_text: string | null; last_message_at: string | null; unread_count: number; window_open: boolean;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Attachment = any;
interface Message { id: number; direction: 'in' | 'out'; sender: string; type: string; text: string | null; attachments?: Attachment[]; flow_node_id?: number | null; created_at: string | null; }
interface ContactInfo {
    name: string; username: string | null; avatar: string | null; channel: string; external_id: string | null;
    page_name: string | null; status: string; first_seen: string | null; last_interacted_at: string | null;
    message_count: number; attributes: Record<string, unknown>; tags: string[];
    op_phone: string | null; op_email: string | null; op_note: string | null;
    gender: 'male' | 'female' | null;
}
interface FlowBlock { id: number; type: string; label: string; }
interface Flow { id: number; name: string; icon: string | null; trigger_type: string; blocks: FlowBlock[]; }
interface Props { conversations: Conversation[]; }

declare global { interface Window { Echo: any } } // eslint-disable-line @typescript-eslint/no-explicit-any

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Social Inbox', href: '/admin/social/inbox' },
];

function ChannelIcon({ channel, className = '' }: { channel: string; className?: string }) {
    return channel === 'instagram' ? <Instagram className={`text-pink-500 ${className}`} /> : <Facebook className={`text-[#1877F2] ${className}`} />;
}
/** Avatar — зураг байвал зураг, үгүй бол нэрийн эхний үсэг (өнгөлөг дугуй), эс бол суваг icon. */
function Avatar({ name, avatar, channel, textCls = 'text-base' }: { name?: string | null; avatar?: string | null; channel: string; textCls?: string }) {
    if (avatar) return <img src={avatar} alt="" className="h-full w-full object-cover" />;
    const letter = name?.trim().charAt(0).toUpperCase();
    if (letter) return <span className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-[#3b8bf7] to-[#1664db] font-semibold text-white ${textCls}`}>{letter}</span>;
    return <ChannelIcon channel={channel} className="h-5 w-5" />;
}
function timeAgo(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('mn-MN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function attParts(a: Attachment): { url: string | null; type: string } {
    return { url: a?.url ?? a?.payload?.url ?? null, type: a?.type ?? 'file' };
}
function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex items-start justify-between gap-2">
            <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
            <span className="break-words text-right text-xs font-medium">{value || '—'}</span>
        </div>
    );
}
function blockIcon(type: string): string {
    return ({ message: '💬', image: '🖼️', carousel: '🎠', media: '🎬', file: '📎' } as Record<string, string>)[type] ?? '⚡';
}
function prettyPreview(text: string | null): string {
    if (!text) return '';
    const map: Record<string, string> = {
        '[карусель]': '🎠 Карусель', '[зураг]': '🖼️ Зураг', '[видео]': '🎬 Видео',
        '[файл]': '📎 Файл', '[дуу хоолой]': '🎤 Дуу хоолой', '[хавсралт]': '📎 Хавсралт',
    };
    return map[text.trim()] ?? text;
}

/* ─── Attachment bubble ──────────────────────────────────────────────────── */
function AttachmentView({ a, out, onZoom }: { a: Attachment; out: boolean; onZoom?: (u: string) => void }) {
    const { url, type } = attParts(a);
    if (!url) return null;
    if (type === 'image') return (
        <button type="button" onClick={() => onZoom?.(url)} className="group block w-[262px] max-w-full overflow-hidden rounded-2xl border border-black/5 shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
            <img src={url} alt="" className="max-h-72 w-full cursor-zoom-in object-cover transition duration-300 group-hover:scale-[1.02]" />
        </button>
    );
    if (type === 'audio') return <audio controls src={url} className="h-10 w-56 max-w-full" />;
    if (type === 'video') return <video controls src={url} className="max-h-60 max-w-[260px] rounded-xl shadow-sm" />;
    return <a href={url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs underline ${out ? 'bg-white/15' : 'bg-background'}`}><FileText className="h-4 w-4" /> Файл татах</a>;
}

/* ─── Карусель (slide) — inbox дотор ──────────────────────────────────────── */
interface SlideCard { image?: string | null; url?: string | null; title?: string | null; subtitle?: string | null; buttons?: { label: string }[] }
function InboxCarousel({ cards, onZoom }: { cards: SlideCard[]; onZoom?: (u: string) => void }) {
    const [i, setI] = useState(0);
    if (!cards.length) return null;
    const active = Math.min(i, cards.length - 1);
    return (
        <div className="w-[262px] max-w-full">
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md">
                <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${active * 100}%)` }}>
                    {cards.map((c, ci) => {
                        const img = c.image ?? c.url; // хуучин формат (url) ч дэмжинэ
                        const hasBody = c.title || c.subtitle || (c.buttons ?? []).some(b => b.label);
                        return (
                            <div key={ci} className="w-full shrink-0">
                                {img && <img src={img} alt="" onClick={() => onZoom?.(img)} className="aspect-[1.91/1] w-full cursor-zoom-in object-cover" />}
                                {hasBody && (
                                    <div className="space-y-1 p-2.5">
                                        {c.title && <div className="text-[13px] font-semibold leading-tight">{c.title}</div>}
                                        {c.subtitle && <div className="text-[11px] leading-snug text-muted-foreground">{c.subtitle}</div>}
                                        {(c.buttons ?? []).map((b, bi) => b.label ? (
                                            <div key={bi} className="mt-1 truncate rounded-lg border border-border/70 bg-background py-1.5 text-center text-[12px] font-medium text-[#1664db]">{b.label}</div>
                                        ) : null)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {active > 0 && <button onClick={() => setI(active - 1)} className="absolute left-1.5 top-[28%] -translate-y-1/2 rounded-full bg-black/55 p-1 text-white backdrop-blur transition hover:bg-black/80"><ChevronLeft className="h-4 w-4" /></button>}
                {active < cards.length - 1 && <button onClick={() => setI(active + 1)} className="absolute right-1.5 top-[28%] -translate-y-1/2 rounded-full bg-black/55 p-1 text-white backdrop-blur transition hover:bg-black/80"><ChevronRight className="h-4 w-4" /></button>}
            </div>
            {cards.length > 1 && (
                <div className="mt-1.5 flex items-center justify-center gap-1">
                    {cards.map((_, di) => <button key={di} onClick={() => setI(di)} className={`h-1.5 rounded-full transition-all ${di === active ? 'w-3.5 bg-[#1664db]' : 'w-1.5 bg-muted-foreground/40'}`} />)}
                </div>
            )}
        </div>
    );
}

/* ─── Нэг мессежний хэсгүүд ────────────────────────────────────────────────── */
function msgParts(m: Message) {
    const atts: Attachment[] = Array.isArray(m.attachments) ? m.attachments : [];
    const isCarousel = m.type === 'carousel' && atts.length > 0;
    const placeholder = !!m.text && /^\[.*\]$/.test(m.text.trim());
    const showText = !!m.text && !placeholder;
    const attObj = m.attachments && !Array.isArray(m.attachments) ? (m.attachments as { quick_replies?: string[] }) : null;
    const btnLabels: string[] = attObj?.quick_replies ?? [];
    return { atts, isCarousel, showText, btnLabels };
}

/* ─── Нэг блокийн (flow node) олон мессежийг нэг карт болгож харуулна ──────── */
function GroupCard({ group, onZoom }: { group: Message[]; onZoom: (u: string) => void }) {
    const last = group[group.length - 1];
    return (
        <div className="w-[262px] max-w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md">
            {group.map(m => {
                const { atts, isCarousel, showText, btnLabels } = msgParts(m);
                return (
                    <div key={m.id}>
                        {isCarousel
                            ? <div className="p-2"><InboxCarousel cards={atts as SlideCard[]} onZoom={onZoom} /></div>
                            : atts.map((a, ai) => {
                                const { url, type } = attParts(a);
                                if (type === 'image' && url) return <img key={ai} src={url} alt="" onClick={() => onZoom(url)} className="block max-h-72 w-full cursor-zoom-in object-cover" />;
                                return <div key={ai} className="p-2.5"><AttachmentView a={a} out={false} onZoom={onZoom} /></div>;
                            })}
                        {(showText || btnLabels.length > 0) && (
                            <div className="space-y-1.5 px-3 py-2.5">
                                {showText && <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.text}</div>}
                                {btnLabels.map((label, bi) => (
                                    <div key={bi} className="w-full truncate rounded-xl border border-border bg-background py-2 text-center text-[12.5px] font-semibold text-[#1664db]">{label}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
            <div className="px-3 pb-2 text-[10px] text-muted-foreground">{timeAgo(last.created_at)} · бот</div>
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Inbox({ conversations: initial }: Props) {
    const [conversations, setConversations] = useState<Conversation[]>(initial);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [channelFilter, setChannelFilter] = useState<'all' | 'messenger' | 'instagram'>('all');
    const [statusFilter, setStatusFilter] = useState<'active' | 'done'>('active');
    const [lightbox, setLightbox] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [contact, setContact] = useState<ContactInfo | null>(null);
    const [flows, setFlows] = useState<Flow[]>([]);
    const [showFlows, setShowFlows] = useState(false);
    const [sendingFlow, setSendingFlow] = useState(false);
    const [editDetails, setEditDetails] = useState(false);
    const [cForm, setCForm] = useState({ name: '', phone: '', email: '', note: '' });
    const [tagInput, setTagInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const imgInput = useRef<HTMLInputElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const flowMenuRef = useRef<HTMLDivElement>(null);

    // voice
    const [recording, setRecording] = useState(false);
    const [recSec, setRecSec] = useState(0);
    const recRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const cancelRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const active = conversations.find(c => c.id === activeId) || null;
    const activeCount = conversations.filter(c => c.status !== 'closed').length;
    const doneCount = conversations.filter(c => c.status === 'closed').length;
    const filtered = conversations.filter(c => {
        if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
        if (statusFilter === 'active' && c.status === 'closed') return false;
        if (statusFilter === 'done' && c.status !== 'closed') return false;
        if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const reloadList = useCallback(() => { axios.get('/admin/social/inbox/conversations').then(r => setConversations(r.data.conversations)); }, []);
    const openConversation = useCallback((id: number) => {
        setActiveId(id); setError(null); setContact(null);
        axios.get(`/admin/social/inbox/conversations/${id}/messages`).then(r => setMessages(r.data.messages));
        axios.get(`/admin/social/inbox/conversations/${id}/contact`).then(r => setContact(r.data.contact)).catch(() => { /* noop */ });
        axios.post(`/admin/social/inbox/conversations/${id}/read`).then(() => setConversations(prev => prev.map(c => (c.id === id ? { ...c, unread_count: 0 } : c))));
    }, []);

    // Одоогийн state-г listener дотроос унших ref (stale closure-аас сэргийлнэ).
    const activeIdRef = useRef(activeId);
    const convRef = useRef(conversations);
    useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
    useEffect(() => { convRef.current = conversations; }, [conversations]);

    // Notification зөвшөөрөл асууна.
    useEffect(() => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => { /* noop */ });
        }
    }, []);

    useEffect(() => {
        if (!window.Echo) return;
        const chan = window.Echo.private('social.inbox');
        chan.listen('.social.message', (e: { conversation_id: number; message: Message }) => {
            reloadList();
            if (activeIdRef.current === e.conversation_id) {
                setMessages(prev => (prev.some(m => m.id === e.message.id) ? prev : [...prev, e.message]));
            }
            // Ирсэн (in) мессеж + энэ чат нээлттэй биш / цонх нуугдсан үед → notification + дуу
            const inactive = activeIdRef.current !== e.conversation_id || document.hidden;
            if (e.message.direction === 'in' && inactive) {
                const name = convRef.current.find(c => c.id === e.conversation_id)?.name || 'Шинэ мессеж';
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    try {
                        const n = new Notification('💬 ' + name, { body: e.message.text || '📎 Хавсралт илгээлээ', tag: 'social-' + e.conversation_id });
                        n.onclick = () => { window.focus(); openConversation(e.conversation_id); n.close(); };
                    } catch { /* noop */ }
                }
            }
        });
        return () => { try { window.Echo.leave('social.inbox'); } catch { /* noop */ } };
    }, [reloadList, openConversation]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // Flow popover-г гадна дарахад хаах.
    useEffect(() => {
        if (!showFlows) return;
        const onDown = (e: MouseEvent) => { if (flowMenuRef.current && !flowMenuRef.current.contains(e.target as Node)) setShowFlows(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [showFlows]);

    // Чат солиход Flow popover хаах.
    useEffect(() => { setShowFlows(false); }, [activeId]);

    function send() {
        if (!text.trim() || !active || sending) return;
        const body = text.trim();
        const tempId = -Date.now(); // түр (optimistic) мессеж — шууд харагдана
        setMessages(p => [...p, { id: tempId, direction: 'out', sender: 'agent', type: 'text', text: body, created_at: new Date().toISOString() }]);
        setText(''); setSending(true); setError(null);
        axios.post(`/admin/social/inbox/conversations/${active.id}/reply`, { text: body })
            .then(r => { setMessages(p => { const w = p.filter(m => m.id !== tempId); return w.some(m => m.id === r.data.message.id) ? w : [...w, r.data.message]; }); reloadList(); })
            .catch(err => { setMessages(p => p.filter(m => m.id !== tempId)); setError(err.response?.data?.error || 'Илгээж чадсангүй.'); })
            .finally(() => setSending(false));
    }
    function setStatus(status: 'bot' | 'open' | 'closed') {
        if (!active) return;
        axios.post(`/admin/social/inbox/conversations/${active.id}/status`, { status })
            .then(() => { setConversations(prev => prev.map(c => (c.id === active.id ? { ...c, status } : c))); reloadList(); });
    }
    function toggleFlows() {
        setShowFlows(s => {
            const next = !s;
            if (next && flows.length === 0) axios.get('/admin/social/inbox/flows').then(r => setFlows(r.data.flows)).catch(() => { /* noop */ });
            return next;
        });
    }
    function sendFlow(flowId: number) {
        if (!active || sendingFlow) return;
        setSendingFlow(true); setError(null); setShowFlows(false);
        axios.post(`/admin/social/inbox/conversations/${active.id}/send-flow`, { flow_id: flowId })
            .then(() => reloadList()) // мессежүүд Echo-оор ирнэ
            .catch(err => setError(err.response?.data?.error || 'Flow илгээж чадсангүй.'))
            .finally(() => setSendingFlow(false));
    }
    function sendNode(nodeId: number) {
        if (!active || sendingFlow) return;
        setSendingFlow(true); setError(null); setShowFlows(false);
        axios.post(`/admin/social/inbox/conversations/${active.id}/send-node`, { node_id: nodeId })
            .then(() => reloadList()) // мессежүүд Echo-оор ирнэ
            .catch(err => setError(err.response?.data?.error || 'Блок илгээж чадсангүй.'))
            .finally(() => setSendingFlow(false));
    }
    function del() {
        if (!active || deleting) return;
        if (!window.confirm(`"${active.name}"-ийн чатыг бүрэн устгах уу? Энэ үйлдлийг буцаах боломжгүй.`)) return;
        setDeleting(true);
        axios.delete(`/admin/social/inbox/conversations/${active.id}`)
            .then(() => { setConversations(prev => prev.filter(c => c.id !== active.id)); setActiveId(null); setMessages([]); })
            .catch(() => setError('Устгаж чадсангүй.')).finally(() => setDeleting(false));
    }
    // ── Контакт засвар (баруун самбар) ──
    function patchContact(payload: Record<string, unknown>) {
        if (!active) return;
        axios.patch(`/admin/social/inbox/conversations/${active.id}/contact`, payload)
            .then(() => axios.get(`/admin/social/inbox/conversations/${active.id}/contact`).then(r => setContact(r.data.contact)));
    }
    function openEditDetails() {
        setCForm({ name: contact?.name ?? '', phone: contact?.op_phone ?? '', email: contact?.op_email ?? '', note: contact?.op_note ?? '' });
        setEditDetails(true);
    }
    function saveDetails() { patchContact({ name: cForm.name, phone: cForm.phone, email: cForm.email, note: cForm.note }); setEditDetails(false); }
    function addTag(t: string) { const v = t.trim(); if (!v || !contact) return; patchContact({ tags: [...new Set([...contact.tags, v])] }); setTagInput(''); }
    function removeTag(t: string) { if (!contact) return; patchContact({ tags: contact.tags.filter(x => x !== t) }); }
    function sendFile(file: File, kind: 'image' | 'file' | 'audio') {
        if (!active) return;
        const fd = new FormData(); fd.append('file', file); fd.append('kind', kind);
        setSending(true); setError(null);
        axios.post(`/admin/social/inbox/conversations/${active.id}/attach`, fd)
            .then(r => { setMessages(p => p.some(m => m.id === r.data.message.id) ? p : [...p, r.data.message]); reloadList(); })
            .catch(err => setError(err.response?.data?.error || 'Илгээж чадсангүй.')).finally(() => setSending(false));
    }

    async function startRec() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            chunksRef.current = []; cancelRef.current = false;
            mr.ondataavailable = e => chunksRef.current.push(e.data);
            mr.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                if (timerRef.current) clearInterval(timerRef.current);
                if (!cancelRef.current && chunksRef.current.length) {
                    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    sendFile(new File([blob], 'voice.webm', { type: 'audio/webm' }), 'audio');
                }
                setRecording(false); setRecSec(0);
            };
            recRef.current = mr; mr.start(); setRecording(true); setRecSec(0);
            timerRef.current = setInterval(() => setRecSec(s => s + 1), 1000);
        } catch { setError('Микрофон ашиглах боломжгүй байна.'); }
    }
    function stopRec(sendIt: boolean) { cancelRef.current = !sendIt; recRef.current?.stop(); }

    // Нэг flow блокийн (flow_node_id) дараалсан bot мессежүүдийг нэг карт болгож бүлэглэнэ.
    const groups: Message[][] = [];
    messages.forEach(m => {
        const g = groups[groups.length - 1];
        const last = g?.[g.length - 1];
        if (last && last.direction === 'out' && m.direction === 'out' && m.flow_node_id != null && m.flow_node_id === last.flow_node_id) {
            g.push(m);
        } else {
            groups.push([m]);
        }
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Social Inbox" />
            <div className="font-warm flex h-[calc(100vh-5rem)] overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl shadow-black/[0.04]">
                {/* Conversations */}
                <div className="flex w-80 shrink-0 flex-col border-r">
                    <div className="space-y-2.5 border-b p-3">
                        {/* Идэвхтэй / Дууссан */}
                        <div className="flex gap-1 rounded-xl bg-muted p-1">
                            <button onClick={() => setStatusFilter('active')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${statusFilter === 'active' ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                                Идэвхтэй {activeCount > 0 && <span className="rounded-full bg-gradient-to-br from-[#3b8bf7] to-[#1664db] px-1.5 text-[10px] text-white">{activeCount}</span>}
                            </button>
                            <button onClick={() => setStatusFilter('done')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${statusFilter === 'done' ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                                <Check className="h-3.5 w-3.5" /> Дууссан {doneCount > 0 && <span className="rounded-full bg-muted-foreground/20 px-1.5 text-[10px]">{doneCount}</span>}
                            </button>
                        </div>
                        {/* Суваг шүүлт */}
                        <div className="flex gap-1.5">
                            {([['all', 'Бүгд'], ['messenger', 'Facebook'], ['instagram', 'Instagram']] as const).map(([k, lbl]) => (
                                <button key={k} onClick={() => setChannelFilter(k)} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${channelFilter === k ? 'border-foreground/30 bg-accent' : 'text-muted-foreground hover:bg-muted'}`}>
                                    {k === 'messenger' && <Facebook className="h-3 w-3 text-[#1877F2]" />}{k === 'instagram' && <Instagram className="h-3 w-3 text-pink-500" />}{lbl}
                                </button>
                            ))}
                        </div>
                        {/* Хайлт */}
                        <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Хайх…" className="flex-1 bg-transparent text-sm outline-none" />
                        </div>
                    </div>
                    <div key={`${statusFilter}-${channelFilter}`} className="social-scroll flex-1 overflow-y-auto">
                        {filtered.length === 0 ? <div className="animate-in fade-in p-10 text-center text-sm text-muted-foreground">Чат алга</div> : filtered.map((c, i) => (
                            <button key={c.id} onClick={() => openConversation(c.id)} style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }} className={`relative flex w-full items-center gap-3 border-b border-border/40 px-3 py-3 text-left duration-300 fade-in slide-in-from-left-3 fill-mode-both animate-in transition-all hover:bg-muted/40 ${activeId === c.id ? 'bg-gradient-to-r from-blue-500/10 to-transparent' : ''}`}>
                                {activeId === c.id && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-[#3b8bf7] to-[#1664db]" />}
                                <div className="relative">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-muted to-muted/60 ring-2 ring-background">
                                        <Avatar name={c.name} avatar={c.avatar} channel={c.channel} />
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-card p-0.5"><ChannelIcon channel={c.channel} className="h-3.5 w-3.5" /></span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className={`truncate text-sm ${c.unread_count > 0 ? 'font-bold' : 'font-medium'}`}>{c.name}</span>
                                        <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.last_message_at)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-1">
                                        <span className={`truncate text-xs ${c.unread_count > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{prettyPreview(c.last_message_text)}</span>
                                        {c.unread_count > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3b8bf7] to-[#1664db] px-1.5 text-[10px] font-bold text-white shadow-sm shadow-blue-600/30">{c.unread_count}</span>}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Thread */}
                <div className="flex flex-1 flex-col bg-gradient-to-b from-muted/40 via-background to-muted/25">
                    {!active ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted"><Send className="h-6 w-6" /></div>
                            Чат сонгоно уу
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 border-b border-border/60 bg-card/70 px-4 py-3 backdrop-blur-sm">
                                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-muted to-muted/60 ring-2 ring-background">
                                    <Avatar name={active.name} avatar={active.avatar} channel={active.channel} textCls="text-sm" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                                        {active.name} <ChannelIcon channel={active.channel} className="h-3.5 w-3.5" />
                                        {active.status === 'bot' && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600"><Bot className="h-3 w-3" /> Бот</span>}
                                        {active.status === 'closed' && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Хаагдсан</span>}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">{active.page_name}</div>
                                </div>
                                {active.status === 'bot'
                                    ? <button onClick={() => setStatus('open')} title="Ботыг зогсоож оператор хариулах" className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition hover:bg-muted active:scale-95"><UserRound className="h-3.5 w-3.5" /> Оператор авах</button>
                                    : <button onClick={() => setStatus('bot')} title="Бот руу буцаах" className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition hover:bg-muted active:scale-95"><Bot className="h-3.5 w-3.5" /> Бот руу</button>}
                                {active.status !== 'closed'
                                    ? <button onClick={() => { setStatus('closed'); setActiveId(null); }} title="Дуусгах" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"><Check className="h-3.5 w-3.5" /> Done</button>
                                    : <button onClick={() => setStatus('open')} title="Дахин нээх" className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition hover:bg-muted active:scale-95"><RotateCcw className="h-3.5 w-3.5" /> Дахин нээх</button>}
                                <button onClick={del} disabled={deleting} title="Чат устгах" className="inline-flex items-center justify-center rounded-lg border border-red-200 px-2.5 py-1.5 text-red-600 transition hover:bg-red-50 active:scale-95 disabled:opacity-50 dark:border-red-900/50 dark:hover:bg-red-950/30">{deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</button>
                            </div>

                            <div className="social-scroll flex-1 space-y-2 overflow-y-auto p-4">
                                {groups.map(group => {
                                    if (group.length > 1) {
                                        const gout = group[0].direction === 'out';
                                        return (
                                            <div key={group[0].id} className={`flex animate-in fade-in slide-in-from-bottom-2 duration-300 ${gout ? 'justify-end slide-in-from-right-2' : 'justify-start slide-in-from-left-2'}`}>
                                                <GroupCard group={group} onZoom={setLightbox} />
                                            </div>
                                        );
                                    }
                                    const m = group[0];
                                    const out = m.direction === 'out';
                                    const atts: Attachment[] = Array.isArray(m.attachments) ? m.attachments : [];
                                    const isCarousel = m.type === 'carousel' && atts.length > 0;
                                    const placeholder = !!m.text && /^\[.*\]$/.test(m.text.trim()); // [зураг] / [карусель] / [видео] …
                                    const showText = !!m.text && !placeholder;
                                    const mediaOnly = isCarousel || (atts.length > 0 && !showText);
                                    // Товчны labels — message/quick-reply мессежийн товчнууд
                                    const attObj = m.attachments && !Array.isArray(m.attachments) ? (m.attachments as { quick_replies?: string[] }) : null;
                                    const btnLabels: string[] = attObj?.quick_replies ?? [];
                                    return (
                                        <div key={m.id} className={`flex animate-in fade-in slide-in-from-bottom-2 duration-300 ${out ? 'justify-end slide-in-from-right-2' : 'justify-start slide-in-from-left-2'}`}>
                                            {mediaOnly ? (
                                                /* Медиа (карусель/зураг) — цэнхэр bubble-гүй, цэвэр */
                                                <div className={`flex max-w-[74%] flex-col gap-1 ${out ? 'items-end' : 'items-start'}`}>
                                                    {isCarousel
                                                        ? <InboxCarousel cards={atts as SlideCard[]} onZoom={setLightbox} />
                                                        : atts.map((a, i) => <AttachmentView key={i} a={a} out={out} onZoom={setLightbox} />)}
                                                    <div className="px-1 text-[10px] text-muted-foreground">{timeAgo(m.created_at)}{out && m.sender === 'bot' ? ' · бот' : ''}</div>
                                                </div>
                                            ) : (
                                                <div className={`space-y-1.5 rounded-[20px] px-3.5 py-2.5 text-sm ${btnLabels.length > 0 ? 'w-[262px]' : 'max-w-[68%]'} ${out ? 'rounded-br-[6px] bg-gradient-to-br from-[#3b8bf7] to-[#1664db] text-white shadow-[0_4px_14px_-3px_rgba(29,78,216,0.45)]' : 'rounded-bl-[6px] border border-border/60 bg-card shadow-[0_2px_8px_-3px_rgba(0,0,0,0.12)]'}`}>
                                                    {atts.map((a, i) => <AttachmentView key={i} a={a} out={out} onZoom={setLightbox} />)}
                                                    {showText && <div className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</div>}
                                                    {btnLabels.length > 0 && (
                                                        <div className="flex flex-col gap-1.5 pt-1">
                                                            {btnLabels.map((label, bi) => (
                                                                <div key={bi} className={`w-full truncate rounded-xl border py-2 text-center text-[12.5px] font-semibold ${out ? 'border-white/25 bg-white/15 text-white' : 'border-border bg-background text-[#1664db]'}`}>{label}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className={`flex items-center gap-1 text-[10px] ${out ? 'text-white/65' : 'text-muted-foreground'}`}>{timeAgo(m.created_at)}{out && m.sender === 'bot' ? <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-px font-medium"><Bot className="h-2.5 w-2.5" />бот</span> : ''}</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>

                            {error && <div className="border-t bg-red-500/10 px-4 py-2 text-xs text-red-600">{error}</div>}

                            {/* Composer */}
                            <div className="border-t bg-card p-3">
                                {recording ? (
                                    <div className="flex items-center gap-3 rounded-xl border px-3 py-2">
                                        <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                                        <span className="text-sm font-medium tabular-nums">Бичиж байна… {Math.floor(recSec / 60)}:{String(recSec % 60).padStart(2, '0')}</span>
                                        <button onClick={() => stopRec(false)} className="ml-auto rounded-lg p-2 text-muted-foreground hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                                        <button onClick={() => stopRec(true)} className="rounded-lg bg-[#1877F2] p-2 text-white hover:bg-[#166fe0]"><Send className="h-4 w-4" /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-end gap-1.5">
                                        {/* Flow picker — урсгал сонгож шууд илгээх */}
                                        <div className="relative" ref={flowMenuRef}>
                                            {showFlows && (
                                                <div className="absolute bottom-12 left-0 z-20 w-72 overflow-hidden rounded-xl border border-border/70 bg-card shadow-xl shadow-black/10 duration-150 animate-in fade-in slide-in-from-bottom-2">
                                                    <div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">⚡ Урсгал / блок илгээх</div>
                                                    <div className="social-scroll max-h-72 overflow-y-auto py-1">
                                                        {flows.length === 0
                                                            ? <div className="px-3 py-3 text-center text-xs text-muted-foreground">Урсгал алга</div>
                                                            : flows.map(f => (
                                                                <div key={f.id} className="border-b border-border/40 pb-1 last:border-0">
                                                                    {/* Урсгалын нэр — дарвал бүтэн урсгалыг эхлэлээс илгээнэ */}
                                                                    <button onClick={() => sendFlow(f.id)} disabled={sendingFlow} title="Бүтэн урсгалыг эхлэлээс илгээх" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold transition hover:bg-muted disabled:opacity-50">
                                                                        <span className="text-base leading-none">{f.icon || '⚡'}</span>
                                                                        <span className="flex-1 truncate">{f.name}</span>
                                                                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">бүтэн ▶</span>
                                                                    </button>
                                                                    {/* Урсгал доторх блокууд — дарвал зөвхөн тэр блокийг илгээнэ */}
                                                                    {f.blocks.map(b => (
                                                                        <button key={b.id} onClick={() => sendNode(b.id)} disabled={sendingFlow} title="Энэ блокийг илгээх" className="flex w-full items-center gap-2 py-1.5 pl-8 pr-3 text-left text-[13px] transition hover:bg-muted disabled:opacity-50">
                                                                            <span className="shrink-0 text-sm leading-none">{blockIcon(b.type)}</span>
                                                                            <span className="truncate text-muted-foreground">{b.label}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}
                                            <button onClick={toggleFlows} disabled={sending || sendingFlow} title="Урсгал илгээх" className={`rounded-lg p-2 transition hover:bg-muted disabled:opacity-40 ${showFlows ? 'bg-muted text-[#1664db]' : 'text-muted-foreground'}`}>{sendingFlow ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}</button>
                                        </div>
                                        <button onClick={() => imgInput.current?.click()} disabled={sending} title="Зураг" className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted disabled:opacity-40"><ImageIcon className="h-5 w-5" /></button>
                                        <button onClick={() => fileInput.current?.click()} disabled={sending} title="Файл" className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted disabled:opacity-40"><Paperclip className="h-5 w-5" /></button>
                                        <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                                            placeholder="Мессеж бичих…" disabled={sending} rows={1}
                                            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-border/70 bg-background px-4 py-2.5 text-sm outline-none transition focus:border-[#3b8bf7] focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60" />
                                        {text.trim()
                                            ? <button onClick={send} disabled={sending} className="rounded-2xl bg-gradient-to-br from-[#3b8bf7] to-[#1664db] p-3 text-white shadow-md shadow-blue-600/30 transition hover:brightness-110 active:scale-95 disabled:opacity-50">{sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button>
                                            : <button onClick={startRec} disabled={sending} title="Дуу хоолой" className="rounded-2xl bg-gradient-to-br from-[#3b8bf7] to-[#1664db] p-3 text-white shadow-md shadow-blue-600/30 transition hover:brightness-110 active:scale-95 disabled:opacity-40"><Mic className="h-5 w-5" /></button>}
                                    </div>
                                )}
                                <input ref={imgInput} type="file" accept="image/*" multiple className="hidden" onChange={e => { Array.from(e.target.files ?? []).forEach(f => sendFile(f, 'image')); e.target.value = ''; }} />
                                <input ref={fileInput} type="file" multiple className="hidden" onChange={e => { Array.from(e.target.files ?? []).forEach(f => sendFile(f, 'file')); e.target.value = ''; }} />
                            </div>
                        </>
                    )}
                </div>

                {/* Үйлчлүүлэгчийн профайл (баруун самбар) */}
                {active && (
                    <div className="hidden w-72 shrink-0 flex-col border-l border-border/60 bg-card/40 xl:flex">
                        <div className="flex flex-col items-center gap-2 border-b border-border/60 p-5 text-center">
                            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-muted to-muted/60 ring-2 ring-background">
                                <Avatar name={contact?.name ?? active.name} avatar={contact?.avatar} channel={active.channel} textCls="text-2xl" />
                            </div>
                            <div>
                                <div className="flex items-center justify-center gap-1.5 font-semibold">{contact?.name ?? active.name} <ChannelIcon channel={active.channel} className="h-3.5 w-3.5" /></div>
                                {contact?.username && <div className="text-xs text-muted-foreground">@{contact.username}</div>}
                            </div>
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${active.status === 'bot' ? 'bg-emerald-500/15 text-emerald-600' : active.status === 'closed' ? 'bg-muted text-muted-foreground' : 'bg-blue-500/15 text-blue-600'}`}>
                                {active.status === 'bot' ? '🤖 Бот' : active.status === 'closed' ? '✓ Хаагдсан' : '👤 Оператор'}
                            </span>
                            {/* Хүйс — гараар засах (Meta өгдөггүй тул нэрээр таамагласан байж болзошгүй) */}
                            <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
                                {([['male', '♂ Эр'], ['female', '♀ Эм'], ['', '—']] as const).map(([g, lbl]) => {
                                    const activeG = (contact?.gender ?? '') === g;
                                    return (
                                        <button key={g || 'none'} onClick={() => patchContact({ gender: g || null })}
                                            className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${activeG ? (g === 'male' ? 'bg-blue-500 text-white' : g === 'female' ? 'bg-pink-500 text-white' : 'bg-card shadow-sm') : 'text-muted-foreground hover:text-foreground'}`}>
                                            {lbl}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="social-scroll flex-1 space-y-4 overflow-y-auto p-4">
                            {/* Холбоо барих (оператор гараар) */}
                            <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground">📇 Холбоо барих</span>
                                    {!editDetails && <button onClick={openEditDetails} className="text-[11px] font-medium text-[#1664db] hover:underline">{(contact?.op_phone || contact?.op_email || contact?.op_note) ? 'Засах' : '+ Нэмэх'}</button>}
                                </div>
                                {editDetails ? (
                                    <div className="space-y-1.5">
                                        <input value={cForm.name} onChange={e => setCForm(f => ({ ...f, name: e.target.value }))} placeholder="Нэр" className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-[#3b8bf7]" />
                                        <input value={cForm.phone} onChange={e => setCForm(f => ({ ...f, phone: e.target.value }))} placeholder="📞 Утас" className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-[#3b8bf7]" />
                                        <input value={cForm.email} onChange={e => setCForm(f => ({ ...f, email: e.target.value }))} placeholder="✉️ Имэйл" className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-[#3b8bf7]" />
                                        <textarea value={cForm.note} onChange={e => setCForm(f => ({ ...f, note: e.target.value }))} placeholder="📝 Тэмдэглэл…" rows={2} className="w-full resize-none rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-[#3b8bf7]" />
                                        <div className="flex gap-1.5">
                                            <button onClick={saveDetails} className="flex-1 rounded-lg bg-gradient-to-br from-[#3b8bf7] to-[#1664db] py-1.5 text-xs font-semibold text-white">Хадгалах</button>
                                            <button onClick={() => setEditDetails(false)} className="rounded-lg border px-3 py-1.5 text-xs">Болих</button>
                                        </div>
                                    </div>
                                ) : (contact?.op_phone || contact?.op_email || contact?.op_note) ? (
                                    <div className="space-y-1.5 rounded-xl border border-border/60 bg-background/50 p-2.5">
                                        {contact?.op_phone && <InfoRow label="📞 Утас" value={contact.op_phone} />}
                                        {contact?.op_email && <InfoRow label="✉️ Имэйл" value={contact.op_email} />}
                                        {contact?.op_note && <div className="whitespace-pre-wrap break-words text-xs"><span className="text-muted-foreground">📝 </span>{contact.op_note}</div>}
                                    </div>
                                ) : <p className="text-[11px] text-muted-foreground">Утас, имэйл, тэмдэглэл нэмэх…</p>}
                            </div>

                            {/* Үндсэн мэдээлэл */}
                            <div className="space-y-2 border-t border-border/60 pt-3">
                                <InfoRow label="Хуудас" value={contact?.page_name} />
                                <InfoRow label="Суваг" value={active.channel === 'instagram' ? 'Instagram' : 'Facebook'} />
                                <InfoRow label="Анх холбогдсон" value={contact?.first_seen ? timeAgo(contact.first_seen) : '—'} />
                                <InfoRow label="Сүүлд идэвхтэй" value={contact?.last_interacted_at ? timeAgo(contact.last_interacted_at) : '—'} />
                                <InfoRow label="Нийт мессеж" value={String(contact?.message_count ?? 0)} />
                            </div>

                            {/* Бот цуглуулсан */}
                            {contact && Object.keys(contact.attributes).length > 0 && (
                                <div className="border-t border-border/60 pt-3">
                                    <div className="mb-1.5 text-xs font-semibold text-muted-foreground">📋 Цуглуулсан мэдээлэл</div>
                                    <div className="space-y-1.5 rounded-xl border border-border/60 bg-background/50 p-2.5">
                                        {Object.entries(contact.attributes).map(([k, v]) => <InfoRow key={k} label={k} value={v == null ? '—' : String(v)} />)}
                                    </div>
                                </div>
                            )}

                            {/* Тэмдэг + Lead */}
                            <div className="border-t border-border/60 pt-3">
                                <div className="mb-1.5 text-xs font-semibold text-muted-foreground">🏷️ Тэмдэг</div>
                                <div className="mb-2 flex flex-wrap gap-1.5">
                                    {(contact?.tags ?? []).map(t => (
                                        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[#1664db]/10 px-2 py-0.5 text-[11px] font-medium text-[#1664db]">
                                            {t}<button onClick={() => removeTag(t)} className="opacity-60 transition hover:opacity-100">×</button>
                                        </span>
                                    ))}
                                    {(contact?.tags ?? []).length === 0 && <span className="text-[11px] text-muted-foreground">Тэмдэг алга</span>}
                                </div>
                                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTag(tagInput); }} placeholder="Тэмдэг нэмэх + Enter" className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-[#3b8bf7]" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Зураг томруулах (lightbox) */}
            {lightbox && (
                <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm duration-200 animate-in fade-in">
                    <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"><X className="h-5 w-5" /></button>
                    <img src={lightbox} alt="" onClick={e => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl duration-200 animate-in zoom-in-95" />
                </div>
            )}
        </AppLayout>
    );
}
