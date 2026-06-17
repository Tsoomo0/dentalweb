import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    addEdge, Background, BackgroundVariant, type Connection, Controls, type Edge, Handle, MiniMap,
    type Node, type NodeProps, Position, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, useUpdateNodeInternals,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import {
    ArrowRightLeft, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardList, Clock, CornerDownRight, Eye, ExternalLink, File as FileIcon, Film, GalleryHorizontalEnd,
    GitBranch, Headset, Image as ImageIcon, Loader2, Maximize2, MessageSquare, MessageSquarePlus, Minimize2, MoreHorizontal, Pencil, Phone, Plus, Save,
    Send, Settings2, Sparkles, Star, Tag, Trash2, Upload, Workflow, X, Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Action = 'next_node' | 'flow_start' | 'handoff' | 'url' | 'web_form' | 'call';
type NodeType = 'message' | 'image' | 'question' | 'action' | 'condition' | 'delay' | 'carousel' | 'media' | 'file' | 'typing';
interface BtnT { id: number; node_id: number; label: string; action: Action; is_quick_reply: boolean; target_node_id: number | null; target_flow_id: number | null; target_form_id: number | null; url: string | null; phone: string | null; click_count: number; }
interface CardBtn { label: string; action: Action; url?: string | null; phone?: string | null; target_flow_id?: number | null; target_node_id?: number | null; target_form_id?: number | null; }
interface FormRef { id: number; name: string; }
interface Card { image?: string | null; title?: string; subtitle?: string; buttons?: CardBtn[]; }
interface NodeT {
    id: number; flow_id: number; type: NodeType; title: string | null; body: string; image_url: string | null; cards: Card[] | null;
    keywords: string[] | null;
    next_node_id: number | null; save_field: string | null;
    action_type: string | null; action_field: string | null; action_value: string | null; action_flow_id: number | null;
    delay_seconds: number | null; condition_type: string | null; condition_field: string | null; condition_value: string | null;
    yes_node_id: number | null; no_node_id: number | null;
    is_entry: boolean; position_x: number; position_y: number; sent_count: number; buttons: BtnT[];
}
interface FlowT { id: number; social_account_id: number | null; name: string; icon: string | null; trigger_type: 'welcome' | 'keyword' | 'default'; keywords: string[] | null; is_active: boolean; nodes: NodeT[]; }
interface Account { id: number; page_name: string; ig_username: string | null; }
interface Analytics { [id: number]: { sent: number; delivered: number; opened: number }; }
interface Props { flows: FlowT[]; accounts: Account[]; analytics: Analytics; tokens: string[]; forms: FormRef[]; }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Social Flow', href: '/admin/social/flows' },
];
const TRIGGER_LABEL: Record<string, string> = { welcome: 'Эхний мессеж', keyword: 'Түлхүүр үг', default: 'Анхдагч' };
const ACTION_META: Record<Action, { label: string; icon: typeof CornerDownRight }> = {
    next_node: { label: 'Дараагийн алхам', icon: CornerDownRight },
    flow_start: { label: 'Өөр урсгал', icon: ArrowRightLeft },
    handoff: { label: 'Оператор', icon: Headset },
    url: { label: 'Холбоос', icon: ExternalLink },
    web_form: { label: 'Вэбформ', icon: ClipboardList },
    call: { label: 'Залгах (утас)', icon: Phone },
};
const NODE_META: Record<NodeType, { label: string; icon: typeof MessageSquare; color: string }> = {
    message: { label: 'Мессеж', icon: MessageSquare, color: '#1877F2' },
    carousel: { label: 'Карусель', icon: GalleryHorizontalEnd, color: '#EC4899' },
    image: { label: 'Зураг', icon: ImageIcon, color: '#8B5CF6' },
    media: { label: 'Медиа', icon: Film, color: '#06B6D4' },
    file: { label: 'Файл', icon: FileIcon, color: '#64748B' },
    question: { label: 'Асуулт', icon: MessageSquarePlus, color: '#0EA5E9' },
    action: { label: 'Үйлдэл', icon: Zap, color: '#F59E0B' },
    condition: { label: 'Нөхцөл', icon: GitBranch, color: '#10B981' },
    delay: { label: 'Хүлээх', icon: Clock, color: '#6B7280' },
    typing: { label: 'Бичиж байна', icon: MoreHorizontal, color: '#94A3B8' },
};

/* ─── Урт текст — Цааш үзэх ──────────────────────────────────────────────── */
function ExpandableText({ text, limit = 160 }: { text: string; limit?: number }) {
    const [open, setOpen] = useState(false);
    if (text.length <= limit) return <span className="whitespace-pre-wrap">{text}</span>;
    return (
        <span className="whitespace-pre-wrap">
            {open ? text : text.slice(0, limit).trimEnd() + '… '}
            <button onClick={e => { e.stopPropagation(); setOpen(!open); }} className="font-medium text-[#1877F2] hover:underline">{open ? 'Хураах' : 'Цааш үзэх'}</button>
        </span>
    );
}

/* ─── Trigger node ───────────────────────────────────────────────────────── */
function TriggerNode({ data }: NodeProps<Node<{ flow: FlowT; onSettings: () => void }>>) {
    const { flow, onSettings } = data;
    return (
        <div className="w-52 rounded-xl border-2 border-emerald-500 bg-emerald-50 shadow-sm">
            <div className="flex items-center justify-between rounded-t-xl bg-emerald-500 px-3 py-2 text-white">
                <span className="flex items-center gap-1.5 text-xs font-semibold"><Zap className="h-3.5 w-3.5" /> Эхлэл (When)</span>
                <button onClick={onSettings} className="rounded p-0.5 hover:bg-white/20"><Settings2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="px-3 py-2 text-xs">
                <div className="font-medium">{TRIGGER_LABEL[flow.trigger_type]}</div>
                {flow.trigger_type === 'keyword' && <div className="mt-0.5 text-emerald-700">{(flow.keywords ?? []).map(k => `«${k}»`).join(' ') || 'түлхүүр үг алга'}</div>}
            </div>
            <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-emerald-500 !bg-white" />
        </div>
    );
}

/* ─── Block node ─────────────────────────────────────────────────────────── */
type BlockData = { node: NodeT; stats?: { sent: number; delivered: number; opened: number }; onEdit: (id: number) => void; flows: FlowT[]; onOpenFlow: (id: number) => void };
function BlockNode({ id, data, selected }: NodeProps<Node<BlockData>>) {
    const { node, stats, onEdit, flows, onOpenFlow } = data;
    const flowName = (id: number | null) => flows.find(f => f.id === id)?.name ?? 'урсгал';
    const meta = NODE_META[node.type];
    const Icon = meta.icon;
    const hasButtons = node.type === 'message' && node.buttons.length > 0;

    return (
        <div className={`w-64 cursor-pointer rounded-xl border bg-background shadow-sm transition ${selected ? 'ring-2 ring-[#1877F2] ring-offset-2 ring-offset-background' : ''}`} style={{ borderColor: node.is_entry ? meta.color : undefined, borderWidth: node.is_entry ? 2 : 1 }}>
            <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !bg-background" style={{ borderColor: meta.color }} />
            <div className="flex items-center gap-1.5 rounded-t-xl border-b px-3 py-2" style={{ background: meta.color + '14' }}>
                <Icon className="h-4 w-4 shrink-0" style={{ color: meta.color }} />
                <span className="flex-1 truncate text-[13px] font-bold tracking-tight" style={{ color: meta.color }}>{node.title || meta.label}</span>
                {node.is_entry && <span className="flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: meta.color }}><Star className="h-2.5 w-2.5" /> Эхлэх</span>}
                <button onClick={() => onEdit(node.id)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
            </div>

            {(node.type === 'message' || node.type === 'image') && node.image_url && <img src={node.image_url} alt="" className="max-h-28 w-full object-cover" />}

            <div className="whitespace-pre-wrap px-3 py-2 text-[13px] leading-relaxed">
                {node.type === 'action' && <ActionSummary node={node} />}
                {node.type === 'condition' && <span className="text-muted-foreground">{node.condition_type}: {node.condition_field || node.condition_value || '—'}</span>}
                {node.type === 'delay' && <span className="text-muted-foreground">⏳ {node.delay_seconds ?? 0} секунд хүлээнэ</span>}
                {node.type === 'carousel' && <CarouselMini cards={node.cards} nodeId={id} />}
                {node.type === 'media' && <span className="text-muted-foreground">🎬 {node.image_url ? 'Видео хавсаргасан' : 'Видео сонгоогүй'}</span>}
                {node.type === 'file' && <span className="text-muted-foreground">📄 {node.image_url ? 'Файл хавсаргасан' : 'Файл сонгоогүй'}</span>}
                {node.type === 'typing' && <span className="text-muted-foreground">⌛ «Бичиж байна…» харуулна</span>}
                {(node.type === 'message' || node.type === 'question' || node.type === 'image') && (node.body ? <ExpandableText text={node.body} /> : <span className="italic text-muted-foreground">{node.type === 'image' ? '(зураг)' : '(хоосон)'}</span>)}
                {node.type === 'question' && node.save_field && <div className="mt-1 text-[10px] text-sky-600">→ хадгалах: {node.save_field}</div>}
            </div>

            {hasButtons && (
                <div className="space-y-1 border-t px-2 py-2">
                    {node.buttons.map(b => {
                        const BIcon = ACTION_META[b.action].icon;
                        return (
                            <div key={b.id} className="relative rounded-md border bg-muted/30 px-2 py-1 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                    <BIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <span className="flex-1 truncate">{b.label}</span>
                                    {b.click_count > 0 && <span className="shrink-0 text-[9px] text-muted-foreground">{b.click_count}↗</span>}
                                    {b.action === 'next_node' && <Handle type="source" id={`btn-${b.id}`} position={Position.Right} className="!right-[-14px] !h-3 !w-3 !border-2 !border-[#1877F2] !bg-background" />}
                                </div>
                                {b.action === 'flow_start' && b.target_flow_id && (
                                    <button onClick={e => { e.stopPropagation(); onOpenFlow(b.target_flow_id!); }} className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-[#1877F2] hover:underline">
                                        <ArrowRightLeft className="h-2.5 w-2.5" /> {flowName(b.target_flow_id)}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Гаралтын цэгүүд (товчгүй node-уудад) */}
            {node.type === 'condition' ? (
                <div className="flex justify-between border-t px-3 py-1.5 text-[10px]">
                    <span className="text-red-500">Үгүй</span><span className="text-emerald-600">Тийм</span>
                    <Handle type="source" id="no" position={Position.Right} style={{ top: '50%' }} className="!right-[-7px] !h-3 !w-3 !border-2 !border-red-500 !bg-background" />
                    <Handle type="source" id="yes" position={Position.Bottom} className="!bottom-[-7px] !h-3 !w-3 !border-2 !border-emerald-500 !bg-background" />
                </div>
            ) : !hasButtons && (
                <Handle type="source" id="next" position={Position.Right} className="!right-[-7px] !h-3 !w-3 !border-2 !bg-background" style={{ borderColor: meta.color }} />
            )}

            {stats && stats.sent > 0 && (
                <div className="flex items-center gap-2 border-t px-3 py-1 text-[9px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Send className="h-2.5 w-2.5" /> {stats.sent}</span>
                    <span className="flex items-center gap-0.5"><CheckCircle2 className="h-2.5 w-2.5" /> {stats.delivered}</span>
                    <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" /> {stats.opened}</span>
                </div>
            )}
        </div>
    );
}
function ActionSummary({ node }: { node: NodeT }) {
    const map: Record<string, string> = {
        set_field: `Талбар: ${node.action_field} = ${node.action_value}`,
        add_tag: `Тэмдэг нэмэх: ${node.action_value}`,
        remove_tag: `Тэмдэг хасах: ${node.action_value}`,
        mark_open: 'Оператор руу шилжүүлэх',
        start_flow: 'Өөр урсгал эхлүүлэх',
    };
    return <span className="flex items-center gap-1 text-muted-foreground"><Tag className="h-3 w-3" /> {map[node.action_type ?? ''] ?? 'Үйлдэл тохируулаагүй'}</span>;
}
function CarouselMini({ cards, nodeId }: { cards: Card[] | null; nodeId: string }) {
    const cs = cards ?? [];
    const updateNodeInternals = useUpdateNodeInternals();
    const [idx, setIdx] = useState(0);
    if (!cs.length) return <span className="italic text-muted-foreground">(карт алга)</span>;
    const active = Math.min(idx, cs.length - 1);
    const go = (e: React.MouseEvent, d: number) => { e.stopPropagation(); setIdx(i => Math.max(0, Math.min(cs.length - 1, i + d))); };
    return (
        <div className="nodrag">
            {/* Viewport — нэг карт харагдана, ◄ ► сумаар гулсуулна (жинхэнэ slide) */}
            <div className="relative overflow-hidden rounded-lg">
                <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${active * 100}%)` }} onTransitionEnd={() => updateNodeInternals(nodeId)}>
                    {cs.map((c, ci) => (
                        <div key={ci} className="w-full shrink-0">
                            <div className="overflow-hidden rounded-lg border bg-muted/20">
                                {c.image && <img src={c.image} alt="" className="h-24 w-full object-cover" />}
                                <div className="space-y-1 px-2 py-1.5">
                                    <div className="truncate text-[12px] font-semibold">{c.title || `Карт ${ci + 1}`}</div>
                                    {c.subtitle && <div className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">{c.subtitle}</div>}
                                    {(c.buttons ?? []).map((b, bi) => b.label ? (
                                        <div key={bi} className="relative rounded-md border bg-background px-2 py-1 text-center text-[10px] font-medium text-[#1877F2]">
                                            <span className="block truncate">{b.label}</span>
                                            {b.action === 'next_node' && <Handle type="source" id={`card-${ci}-btn-${bi}`} position={Position.Right} className="!right-[-15px] !h-3.5 !w-3.5 !border-2 !border-pink-500 !bg-background" />}
                                        </div>
                                    ) : null)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {active > 0 && <button onClick={e => go(e, -1)} className="absolute left-1 top-[42px] z-10 rounded-full bg-black/55 p-0.5 text-white shadow transition hover:bg-black/80"><ChevronLeft className="h-4 w-4" /></button>}
                {active < cs.length - 1 && <button onClick={e => go(e, 1)} className="absolute right-1 top-[42px] z-10 rounded-full bg-black/55 p-0.5 text-white shadow transition hover:bg-black/80"><ChevronRight className="h-4 w-4" /></button>}
            </div>
            {/* Цэгүүд (slide indicator) */}
            <div className="mt-1.5 flex items-center justify-center gap-1">
                {cs.map((_, di) => (
                    <button key={di} onClick={e => { e.stopPropagation(); setIdx(di); }} className={`h-1.5 rounded-full transition-all ${di === active ? 'w-3.5 bg-[#1877F2]' : 'w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70'}`} />
                ))}
            </div>
            <div className="text-center text-[9px] text-muted-foreground">{active + 1} / {cs.length}</div>
        </div>
    );
}
const nodeTypes = { block: BlockNode, trigger: TriggerNode };

/* ─── Add block menu (цэвэрхэн dropdown) ─────────────────────────────────── */
function AddBlockMenu({ onAdd }: { onAdd: (t: NodeType) => void }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1877F2] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#166fe0]"><Plus className="h-4 w-4" /> Блок нэмэх</button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-full z-20 mt-1.5 w-56 rounded-xl border bg-card p-1.5 shadow-xl duration-150 animate-in fade-in-0 zoom-in-95">
                        {(Object.keys(NODE_META) as NodeType[]).map(t => {
                            const M = NODE_META[t]; const I = M.icon;
                            return (
                                <button key={t} onClick={() => { onAdd(t); setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition hover:bg-muted">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: M.color + '1a', color: M.color }}><I className="h-4 w-4" /></span>
                                    {M.label}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

/* ─── Flow switcher (дээд бар dropdown) ──────────────────────────────────── */
function FlowSwitcher({ flows, activeId, setActiveId, onCreate, onDelete }: { flows: FlowT[]; activeId: number | null; setActiveId: (id: number) => void; onCreate: () => void; onDelete: (f: FlowT) => void }) {
    const [open, setOpen] = useState(false);
    const active = flows.find(f => f.id === activeId);
    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm font-medium transition hover:bg-muted">
                <Workflow className="h-4 w-4 text-[#1877F2]" />
                <span className="max-w-44 truncate">{active ? `${active.icon ? active.icon + ' ' : ''}${active.name}` : 'Урсгал сонгох'}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-full z-20 mt-1.5 w-72 overflow-hidden rounded-xl border bg-card p-1 shadow-xl duration-150 animate-in fade-in-0 zoom-in-95">
                        <div className="max-h-80 overflow-y-auto">
                            {flows.length === 0 && <div className="px-2 py-4 text-center text-xs text-muted-foreground">Урсгал алга</div>}
                            {flows.map(f => (
                                <div key={f.id} className={`group flex items-center rounded-lg ${activeId === f.id ? 'bg-[#1877F2]/10' : 'hover:bg-muted'}`}>
                                    <button onClick={() => { setActiveId(f.id); setOpen(false); }} className="flex flex-1 items-center gap-2 px-2.5 py-2 text-left">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-sm">{f.icon || '💬'}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className={`block truncate text-sm ${activeId === f.id ? 'font-semibold text-[#1877F2]' : 'font-medium'}`}>{f.name}</span>
                                            <span className="block text-[10px] text-muted-foreground">{TRIGGER_LABEL[f.trigger_type]}{!f.is_active && ' · унтраалттай'}</span>
                                        </span>
                                    </button>
                                    <button onClick={() => onDelete(f)} title="Устгах" className="mr-1 rounded-md p-1.5 text-red-500 opacity-0 transition hover:bg-red-500/10 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => { onCreate(); setOpen(false); }} className="mt-1 flex w-full items-center gap-1.5 rounded-lg border-t px-2.5 py-2.5 text-sm font-medium text-[#1877F2] hover:bg-muted"><Plus className="h-4 w-4" /> Шинэ урсгал үүсгэх</button>
                    </div>
                </>
            )}
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function FlowBuilder({ flows: initial, accounts, analytics, tokens, forms }: Props) {
    const [flows, setFlows] = useState<FlowT[]>(initial);
    const [activeId, setActiveId] = useState<number | null>(initial[0]?.id ?? null);
    const active = flows.find(f => f.id === activeId) || null;

    const patchFlow = useCallback((flow: FlowT) => setFlows(prev => prev.map(f => (f.id === flow.id ? flow : f))), []);
    const removeFlow = useCallback((id: number) => setFlows(prev => prev.filter(f => f.id !== id)), []);

    function createFlow() {
        const name = prompt('Урсгалын нэр:');
        if (!name) return;
        axios.post('/admin/social/flows', { name, trigger_type: 'keyword', keywords: [] })
            .then(r => { setFlows(prev => [...prev, r.data.flow]); setActiveId(r.data.flow.id); });
    }
    function deleteFlow(f: FlowT) {
        if (!confirm(`"${f.name}" урсгалыг бүхэлд нь устгах уу?`)) return;
        axios.delete(`/admin/social/flows/${f.id}`).then(() => { removeFlow(f.id); if (activeId === f.id) setActiveId(null); });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Social Flow" />
            <div className="font-warm flex h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-xl border">
                {/* Дээд бар: урсгал сэлгүүр */}
                <div className="flex items-center gap-3 border-b bg-card px-3 py-2">
                    <FlowSwitcher flows={flows} activeId={activeId} setActiveId={setActiveId} onCreate={createFlow} onDelete={deleteFlow} />
                    <span className="hidden text-xs text-muted-foreground sm:inline">Урсгал бол нэг бүрэн автомат харилцааны замнал юм</span>
                </div>

                <div className="relative flex-1">
                    {active
                        ? <ReactFlowProvider><Canvas key={active.id} flow={active} allFlows={flows} accounts={accounts} analytics={analytics} tokens={tokens} forms={forms} patchFlow={patchFlow} removeFlow={removeFlow} clearActive={() => setActiveId(null)} onOpenFlow={setActiveId} /></ReactFlowProvider>
                        : <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1877F2]/10"><Workflow className="h-7 w-7 text-[#1877F2]" /></div>
                            Урсгал сонгоно уу, эсвэл шинээр үүсгэе
                            <button onClick={createFlow} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#166fe0]"><Plus className="h-4 w-4" /> Шинэ урсгал</button>
                        </div>}
                </div>
            </div>
        </AppLayout>
    );
}

/** html.dark класс ажиглаж dark mode эсэхийг буцаана. */
function useIsDark() {
    const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
    useEffect(() => {
        const el = document.documentElement;
        const obs = new MutationObserver(() => setDark(el.classList.contains('dark')));
        obs.observe(el, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);
    return dark;
}

/* ─── Canvas ─────────────────────────────────────────────────────────────── */
function Canvas({ flow, allFlows, accounts, analytics, tokens, forms, patchFlow, removeFlow, clearActive, onOpenFlow }:
{ flow: FlowT; allFlows: FlowT[]; accounts: Account[]; analytics: Analytics; tokens: string[]; forms: FormRef[]; patchFlow: (f: FlowT) => void; removeFlow: (id: number) => void; clearActive: () => void; onOpenFlow: (id: number) => void; }) {
    const [editNodeId, setEditNodeId] = useState<number | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const isDark = useIsDark();
    const [fs, setFs] = useState(false);
    // CSS fullscreen — Fullscreen API нь файл сонгох цонхонд тасалддаг тул overlay ашиглана.
    useEffect(() => {
        if (!fs) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFs(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [fs]);
    const onEdit = useCallback((id: number) => setEditNodeId(id), []);
    const openSettings = useCallback(() => setShowSettings(true), []);

    const { rfNodes, rfEdges } = useMemo(() => {
        const entry = flow.nodes.find(n => n.is_entry);
        const nodes: Node[] = flow.nodes.map(n => ({
            id: String(n.id), type: 'block', position: { x: n.position_x, y: n.position_y }, data: { node: n, stats: analytics[n.id], onEdit, flows: allFlows, onOpenFlow },
        }));
        if (entry) nodes.unshift({ id: 'trigger', type: 'trigger', draggable: false, deletable: false, selectable: false, position: { x: entry.position_x - 280, y: entry.position_y }, data: { flow, onSettings: openSettings } });

        const edges: Edge[] = [];
        if (entry) edges.push({ id: 'trig', source: 'trigger', target: String(entry.id), animated: true, style: { stroke: '#10B981' } });
        flow.nodes.forEach(n => {
            n.buttons.forEach(b => { if (b.action === 'next_node' && b.target_node_id) edges.push({ id: `b${b.id}`, source: String(n.id), sourceHandle: `btn-${b.id}`, target: String(b.target_node_id), animated: true, style: { stroke: '#1877F2' } }); });
            if (n.type !== 'condition' && !(n.type === 'message' && n.buttons.length) && n.next_node_id) edges.push({ id: `n${n.id}`, source: String(n.id), sourceHandle: 'next', target: String(n.next_node_id), animated: true });
            if (n.type === 'condition') {
                if (n.yes_node_id) edges.push({ id: `y${n.id}`, source: String(n.id), sourceHandle: 'yes', target: String(n.yes_node_id), animated: true, style: { stroke: '#10B981' } });
                if (n.no_node_id) edges.push({ id: `no${n.id}`, source: String(n.id), sourceHandle: 'no', target: String(n.no_node_id), animated: true, style: { stroke: '#EF4444' } });
            }
            if (n.type === 'carousel') {
                (n.cards ?? []).forEach((card, ci) => (card.buttons ?? []).forEach((b, bi) => {
                    if (b.action === 'next_node' && b.target_node_id) edges.push({ id: `cc-${n.id}-${ci}-${bi}`, source: String(n.id), sourceHandle: `card-${ci}-btn-${bi}`, target: String(b.target_node_id), animated: true, style: { stroke: '#EC4899' } });
                }));
            }
        });
        return { rfNodes: nodes, rfEdges: edges };
    }, [flow, analytics, onEdit, openSettings, allFlows, onOpenFlow]);

    const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);
    useEffect(() => { setNodes(rfNodes); setEdges(rfEdges); }, [rfNodes, rfEdges, setNodes, setEdges]);

    const onNodeDragStop = useCallback((_e: React.MouseEvent, node: Node) => {
        if (node.id === 'trigger') return;
        const x = Math.round(node.position.x), y = Math.round(node.position.y);
        axios.post('/admin/social/flow-nodes/positions', { positions: [{ id: Number(node.id), x, y }] });
        patchFlow({ ...flow, nodes: flow.nodes.map(n => (n.id === Number(node.id) ? { ...n, position_x: x, position_y: y } : n)) });
    }, [flow, patchFlow]);

    const onConnect = useCallback((conn: Connection) => {
        const target = Number(conn.target);
        const handle = String(conn.sourceHandle);
        if (conn.source === 'trigger') { // entry node болгох
            axios.put(`/admin/social/flow-nodes/${target}`, { is_entry: true }).then(() => patchFlow({ ...flow, nodes: flow.nodes.map(n => ({ ...n, is_entry: n.id === target })) }));
            return;
        }
        const src = Number(conn.source);
        if (handle.startsWith('btn-')) {
            const btnId = Number(handle.replace('btn-', ''));
            axios.put(`/admin/social/flow-buttons/${btnId}/link`, { target_node_id: target }).then(() => patchFlow({ ...flow, nodes: flow.nodes.map(n => ({ ...n, buttons: n.buttons.map(b => (b.id === btnId ? { ...b, action: 'next_node' as Action, target_node_id: target } : b)) })) }));
            setEdges(eds => addEdge({ ...conn, id: `b${btnId}`, animated: true, style: { stroke: '#1877F2' } }, eds.filter(e => e.sourceHandle !== handle)));
            return;
        }
        if (handle.startsWith('card-')) { // карусель картын товч → блок
            const [, ciS, , biS] = handle.split('-');
            const ci = Number(ciS), bi = Number(biS);
            const node = flow.nodes.find(n => n.id === src);
            if (node) {
                const cards = (node.cards ?? []).map((c, cidx) => (cidx === ci ? { ...c, buttons: (c.buttons ?? []).map((b, bidx) => (bidx === bi ? { ...b, target_node_id: target } : b)) } : c));
                axios.put(`/admin/social/flow-nodes/${src}`, { cards }).then(() => patchFlow({ ...flow, nodes: flow.nodes.map(n => (n.id === src ? { ...n, cards } : n)) }));
                setEdges(eds => addEdge({ ...conn, id: `cc-${src}-${ci}-${bi}`, animated: true, style: { stroke: '#EC4899' } }, eds.filter(e => e.sourceHandle !== handle)));
            }
            return;
        }
        const field = handle === 'yes' ? 'yes_node_id' : handle === 'no' ? 'no_node_id' : 'next_node_id';
        axios.put(`/admin/social/flow-nodes/${src}`, { [field]: target }).then(() => patchFlow({ ...flow, nodes: flow.nodes.map(n => (n.id === src ? { ...n, [field]: target } : n)) }));
        const eid = field === 'yes_node_id' ? `y${src}` : field === 'no_node_id' ? `no${src}` : `n${src}`;
        setEdges(eds => addEdge({ ...conn, id: eid, animated: true }, eds.filter(e => !(e.source === conn.source && e.sourceHandle === handle))));
    }, [flow, patchFlow, setEdges]);

    const onNodesDelete = useCallback((deleted: Node[]) => {
        const ids = deleted.filter(n => n.id !== 'trigger').map(n => Number(n.id));
        ids.forEach(id => axios.delete(`/admin/social/flow-nodes/${id}`));
        if (ids.length) patchFlow({ ...flow, nodes: flow.nodes.filter(n => !ids.includes(n.id)) });
    }, [flow, patchFlow]);

    const onEdgesDelete = useCallback((removed: Edge[]) => {
        removed.forEach(e => {
            if (e.id === 'trig') return;
            if (e.id.startsWith('cc-')) {
                const [, nidS, ciS, biS] = e.id.split('-');
                const nodeId = Number(nidS), ci = Number(ciS), bi = Number(biS);
                const node = flow.nodes.find(n => n.id === nodeId);
                if (node) {
                    const cards = (node.cards ?? []).map((c, cidx) => (cidx === ci ? { ...c, buttons: (c.buttons ?? []).map((b, bidx) => (bidx === bi ? { ...b, target_node_id: null } : b)) } : c));
                    axios.put(`/admin/social/flow-nodes/${nodeId}`, { cards });
                    patchFlow({ ...flow, nodes: flow.nodes.map(n => (n.id === nodeId ? { ...n, cards } : n)) });
                }
                return;
            }
            if (e.id.startsWith('b')) { const id = Number(e.id.slice(1)); axios.put(`/admin/social/flow-buttons/${id}/unlink`); patchFlow({ ...flow, nodes: flow.nodes.map(n => ({ ...n, buttons: n.buttons.map(b => (b.id === id ? { ...b, target_node_id: null } : b)) })) }); return; }
            const isYes = e.id.startsWith('y'), isNo = e.id.startsWith('no'), src = Number(e.id.replace(/^(no|n|y)/, ''));
            const field = isNo ? 'no_node_id' : isYes ? 'yes_node_id' : 'next_node_id';
            axios.put(`/admin/social/flow-nodes/${src}`, { [field]: null }); patchFlow({ ...flow, nodes: flow.nodes.map(n => (n.id === src ? { ...n, [field]: null } : n)) });
        });
    }, [flow, patchFlow]);

    function addNode(type: NodeType) {
        // Шинэ блокийг хамгийн сүүлд нэмсэн (хамгийн өндөр id) блокийн баруун хажууд тавина —
        // эхлэл хэсгийн хажууд овоорч давхцахаас сэргийлнэ.
        const last = flow.nodes.length ? flow.nodes.reduce((a, b) => (b.id > a.id ? b : a)) : null;
        const px = last ? last.position_x + 320 : 360;
        const py = last ? last.position_y + 40 : 80;
        const body = type === 'message' ? 'Шинэ мессеж' : type === 'question' ? 'Асуултаа бичнэ үү...' : '';
        axios.post('/admin/social/flow-nodes', { flow_id: flow.id, type, body, position_x: px, position_y: py })
            .then(r => { patchFlow({ ...flow, nodes: [...flow.nodes, { ...r.data.node, buttons: r.data.node.buttons ?? [] }] }); setEditNodeId(r.data.node.id); });
    }

    const editNode = flow.nodes.find(n => n.id === editNodeId) || null;

    return (
        <div className={`bg-background ${fs ? 'fixed inset-0 z-50' : 'h-full w-full'}`}>
            <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
                <AddBlockMenu onAdd={addNode} />
                <button onClick={() => setShowSettings(true)} className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-sm shadow-sm transition hover:bg-accent"><Settings2 className="h-4 w-4" /> Тохиргоо</button>
            </div>

            <button onClick={() => setFs(f => !f)} title={fs ? 'Гарах (Esc)' : 'Бүтэн дэлгэц'} className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-sm shadow-sm transition hover:bg-accent active:scale-95">
                {fs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />} {fs ? 'Гарах' : 'Бүтэн дэлгэц'}
            </button>

            <ReactFlow colorMode={isDark ? 'dark' : 'light'} nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onEdgesDelete={onEdgesDelete} onNodesDelete={onNodesDelete} onNodeDragStop={onNodeDragStop}
                onNodeClick={(_e, node) => { if (node.id !== 'trigger') setEditNodeId(Number(node.id)); }}
                nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }} deleteKeyCode={['Backspace', 'Delete']}>
                <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
                <Controls />
                <MiniMap pannable zoomable className="!bottom-3 !right-3" />
            </ReactFlow>

            {editNode && <NodeDrawer key={editNode.id} flow={flow} allFlows={allFlows} forms={forms} node={editNode} tokens={tokens} patchFlow={patchFlow} onClose={() => setEditNodeId(null)} />}
            {showSettings && <SettingsDrawer flow={flow} accounts={accounts} patchFlow={patchFlow} removeFlow={removeFlow} onClose={() => setShowSettings(false)} clearActive={clearActive} />}
        </div>
    );
}

/* ─── Image uploader (файл upload + preview) ─────────────────────────────── */
function ImageUploader({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [mode, setMode] = useState<'standard' | 'original'>('standard');
    const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
    type Variant = { url: string; w: number | null; h: number | null };
    const [variants, setVariants] = useState<{ standard?: Variant; original?: Variant }>({});

    function pick(file: File | null) {
        if (!file) return;
        setErr(null); setUploading(true); setDims(null);
        const fd = new FormData(); fd.append('image', file); fd.append('mode', mode);
        axios.post('/admin/social/flow-image', fd)
            .then(r => {
                setVariants({ standard: r.data.standard, original: r.data.original });
                const v = mode === 'original' ? r.data.original : r.data.standard;
                onChange(v.url);
            })
            .catch(e => setErr(e.response?.data?.message || 'Хуулж чадсангүй'))
            .finally(() => setUploading(false));
    }

    // Toggle хийхэд тухайн хувилбарын зураг руу шууд солино (дахин upload хийхгүй).
    function switchMode(m: 'standard' | 'original') {
        setMode(m);
        const v = variants[m];
        if (v) { onChange(v.url); setDims(v.w && v.h ? { w: v.w, h: v.h } : null); }
    }

    return (
        <div className="space-y-1.5">
            <div className="flex gap-1 rounded-lg border bg-muted/40 p-0.5 text-[11px]">
                <button type="button" onClick={() => switchMode('standard')}
                    className={`flex-1 rounded-md px-2 py-1 transition ${mode === 'standard' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>
                    ✨ Жигд хэмжээ
                </button>
                <button type="button" onClick={() => switchMode('original')}
                    className={`flex-1 rounded-md px-2 py-1 transition ${mode === 'original' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>
                    🖼️ Оригинал
                </button>
            </div>
            <p className="text-[10px] text-muted-foreground">{mode === 'standard' ? 'Бүх зураг 1.91:1 харьцаагаар жигд, цэвэрхэн харагдана (ManyChat шиг).' : 'Зургийг оригинал хэмжээгээр нь хадгална.'}</p>
            {value ? (
                <div className="group relative overflow-hidden rounded-lg border bg-[repeating-conic-gradient(#0000000a_0%_25%,transparent_0%_50%)] [background-size:16px_16px]">
                    <img src={value} alt="" onLoad={e => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} className="mx-auto max-h-56 w-auto max-w-full object-contain" />
                    {dims && <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">{dims.w}×{dims.h}px{Math.abs(dims.w / dims.h - 1.91) < 0.03 ? ' · 1.91:1' : ''}</span>}
                    <button onClick={() => { onChange(null); setDims(null); }} className="absolute right-1.5 top-1.5 rounded-md bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
            ) : (
                <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
                    className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed py-6 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50">
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                    {uploading ? 'Хуулж байна…' : 'Зураг оруулах (чирэх эсвэл сонгох)'}
                </button>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files?.[0] ?? null)} />
            {value && <button type="button" onClick={() => inputRef.current?.click()} className="text-[10px] text-[#1877F2] hover:underline">Өөр зураг сонгох</button>}
            {err && <p className="text-[10px] text-red-600">{err}</p>}
        </div>
    );
}

/* ─── File uploader (видео/файл) ─────────────────────────────────────────── */
function FileUploader({ value, onChange, accept, label }: { value: string | null; onChange: (url: string | null) => void; accept: string; label: string }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    function pick(file: File | null) {
        if (!file) return;
        setUploading(true);
        const fd = new FormData(); fd.append('file', file);
        axios.post('/admin/social/flow-file', fd).then(r => onChange(r.data.url)).catch(() => { /* noop */ }).finally(() => setUploading(false));
    }
    return (
        <div className="space-y-1.5">
            {value ? (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-green-600" /> Хавсаргасан
                    <button onClick={() => onChange(null)} className="ml-auto text-red-500 hover:underline">Устгах</button>
                </div>
            ) : (
                <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-4 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {uploading ? 'Хуулж байна…' : label}
                </button>
            )}
            <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => pick(e.target.files?.[0] ?? null)} />
        </div>
    );
}

/* ─── Carousel editor (босоо карт өрөх) ──────────────────────────────────── */
function CarouselEditor({ cards, allFlows, forms, onChange }: { cards: Card[]; allFlows: FlowT[]; forms: FormRef[]; onChange: (c: Card[]) => void }) {
    function update(i: number, patch: Partial<Card>) { onChange(cards.map((c, idx) => (idx === i ? { ...c, ...patch } : c))); }
    function addCard() { onChange([...cards, { title: 'Шинэ карт', subtitle: '', image: null, buttons: [] }]); }
    function delCard(i: number) { onChange(cards.filter((_, idx) => idx !== i)); }
    function setBtns(i: number, btns: CardBtn[]) { update(i, { buttons: btns }); }

    return (
        <div className="space-y-3">
            {cards.map((card, i) => (
                <div key={i} className="space-y-2 rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Карт {i + 1}</span>
                        <button onClick={() => delCard(i)} className="rounded p-1 text-red-500 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <ImageUploader value={card.image ?? null} onChange={url => update(i, { image: url })} />
                    <input value={card.title ?? ''} onChange={e => update(i, { title: e.target.value })} placeholder="Гарчиг" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
                    <input value={card.subtitle ?? ''} onChange={e => update(i, { subtitle: e.target.value })} placeholder="Дэд гарчиг" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
                    <CardButtons buttons={card.buttons ?? []} allFlows={allFlows} forms={forms} onChange={b => setBtns(i, b)} />
                </div>
            ))}
            <button onClick={addCard} className="flex w-full items-center justify-center gap-1 rounded-xl border-2 border-dashed py-2.5 text-xs font-medium hover:bg-muted"><Plus className="h-3.5 w-3.5" /> Карт нэмэх</button>
        </div>
    );
}
function CardButtons({ buttons, allFlows, forms, onChange }: { buttons: CardBtn[]; allFlows: FlowT[]; forms: FormRef[]; onChange: (b: CardBtn[]) => void }) {
    function upd(i: number, patch: Partial<CardBtn>) { onChange(buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b))); }
    return (
        <div className="space-y-1.5 border-t pt-2">
            <div className="text-[11px] font-medium text-muted-foreground">Товчнууд (3 хүртэл)</div>
            {buttons.map((b, i) => (
                <div key={i} className="space-y-1 rounded-lg border p-1.5">
                    <div className="flex items-center gap-1.5">
                        <div className="flex flex-col">
                            <button onClick={() => { if (i > 0) { const a = [...buttons];[a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange(a); } }} disabled={i === 0} className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"><ChevronUp className="h-3 w-3" /></button>
                            <button onClick={() => { if (i < buttons.length - 1) { const a = [...buttons];[a[i], a[i + 1]] = [a[i + 1], a[i]]; onChange(a); } }} disabled={i === buttons.length - 1} className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"><ChevronDown className="h-3 w-3" /></button>
                        </div>
                        <input value={b.label} onChange={e => upd(i, { label: e.target.value })} maxLength={30} placeholder="Товч" className="flex-1 rounded-md border px-2 py-1 text-xs" />
                        <EmojiButton onPick={em => upd(i, { label: `${em} ${b.label}`.slice(0, 30).trimStart() })} />
                        <button onClick={() => onChange(buttons.filter((_, idx) => idx !== i))} className="rounded p-1 text-red-500 hover:bg-red-500/10"><Trash2 className="h-3 w-3" /></button>
                    </div>
                    <Sel size="sm" value={b.action} onChange={v => upd(i, { action: v as Action })} options={(Object.keys(ACTION_META) as Action[]).map(a => ({ value: a, label: ACTION_META[a].label }))} />
                    {b.action === 'next_node' && <p className="text-[10px] text-pink-600">→ Canvas дээр энэ товчны ягаан цэгээс чирж блок руу холбоно.</p>}
                    {b.action === 'url' && <input value={b.url ?? ''} onChange={e => upd(i, { url: e.target.value })} placeholder="https://… (ж: Google Maps линк)" className="w-full rounded-md border px-2 py-1 text-xs" />}
                    {b.action === 'call' && <input value={b.phone ?? ''} onChange={e => upd(i, { phone: e.target.value })} placeholder="Утас: +97699112233" className="w-full rounded-md border px-2 py-1 text-xs" />}
                    {b.action === 'web_form' && <Sel size="sm" placeholder="— форм —" value={b.target_form_id ? String(b.target_form_id) : ''} onChange={v => upd(i, { target_form_id: v ? Number(v) : null })} options={forms.map(f => ({ value: String(f.id), label: f.name }))} />}
                    {b.action === 'flow_start' && <Sel size="sm" placeholder="— урсгал —" value={b.target_flow_id ? String(b.target_flow_id) : ''} onChange={v => upd(i, { target_flow_id: v ? Number(v) : null })} options={allFlows.map(f => ({ value: String(f.id), label: f.name }))} />}
                </div>
            ))}
            {buttons.length < 3 && <button onClick={() => onChange([...buttons, { label: 'Товч', action: 'url', url: '' }])} className="text-[11px] text-[#1877F2] hover:underline">+ Товч нэмэх</button>}
        </div>
    );
}

/* ─── Emoji picker (товчны icon) ─────────────────────────────────────────── */
const BTN_EMOJIS = ['📋', '📞', '📍', '🦷', '✅', '❤️', '🕐', '💬', '📅', '💰', '🎁', '👍', '🔥', '⭐', '📷', '🎉', '🙏', '👉', '✨', '🛒', '😊', '📝', '🚕', '➡️'];
function EmojiButton({ onPick }: { onPick: (e: string) => void }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(!open)} title="Icon нэмэх" className="rounded-md border px-2 py-1 text-sm hover:bg-muted">😊</button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 grid w-48 grid-cols-6 gap-0.5 rounded-xl border bg-card p-2 shadow-xl duration-150 animate-in fade-in-0 zoom-in-95">
                        {BTN_EMOJIS.map(e => <button key={e} type="button" onClick={() => { onPick(e); setOpen(false); }} className="rounded-md p-1 text-lg transition hover:bg-muted">{e}</button>)}
                    </div>
                </>
            )}
        </div>
    );
}

/* ─── Custom dropdown (portal — тайрагдахгүй, dark-д зөв) ─────────────────── */
function Sel({ value, onChange, options, placeholder, size = 'md' }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; size?: 'sm' | 'md' }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const current = options.find(o => o.value === value);
    const pad = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';

    function toggle() {
        if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect());
        setOpen(o => !o);
    }
    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
    }, [open]);

    const below = rect ? window.innerHeight - rect.bottom > 240 : true;

    return (
        <div className="w-full">
            <button ref={btnRef} type="button" onClick={toggle} className={`flex w-full items-center justify-between gap-1.5 rounded-lg border bg-background ${pad} text-left transition hover:border-[#1877F2]`}>
                <span className={`truncate ${current ? '' : 'text-muted-foreground'}`}>{current ? current.label : (placeholder ?? 'Сонгох')}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && rect && createPortal(
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
                    <div
                        className="fixed z-[61] max-h-60 overflow-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-2xl duration-150 animate-in fade-in-0 zoom-in-95"
                        style={{
                            left: rect.left,
                            width: rect.width,
                            top: below ? rect.bottom + 6 : undefined,
                            bottom: below ? undefined : window.innerHeight - rect.top + 6,
                        }}
                    >
                        {options.map(o => (
                            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }} className={`block w-full truncate rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-accent ${o.value === value ? 'bg-accent font-semibold text-[#1877F2]' : ''}`}>{o.label}</button>
                        ))}
                    </div>
                </>,
                document.body,
            )}
        </div>
    );
}

/* ─── Token inserter (хувийн хувьсагч) ───────────────────────────────────── */
function TokenBar({ tokens, onInsert }: { tokens: string[]; onInsert: (t: string) => void }) {
    return (
        <div className="flex flex-wrap items-center gap-1">
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Sparkles className="h-3 w-3" /> Хувьсагч:</span>
            {tokens.map(t => <button key={t} type="button" onClick={() => onInsert(`{{${t}}}`)} className="rounded bg-muted px-1.5 py-0.5 text-[10px] hover:bg-accent">{`{{${t}}}`}</button>)}
        </div>
    );
}

/* ─── Node drawer (төрлөөр salaalna) ─────────────────────────────────────── */
function NodeDrawer({ flow, allFlows, forms, node, tokens, patchFlow, onClose }: { flow: FlowT; allFlows: FlowT[]; forms: FormRef[]; node: NodeT; tokens: string[]; patchFlow: (f: FlowT) => void; onClose: () => void; }) {
    const [d, setD] = useState<NodeT>(node);
    // Түлхүүр үгийн түүхий текст — бичих явцад зай/таслал арилахаас сэргийлнэ (массив руу зөвхөн задлана).
    const [kwText, setKwText] = useState((node.keywords ?? []).join(', '));
    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const replaceNode = (n: NodeT) => patchFlow({ ...flow, nodes: flow.nodes.map(x => (x.id === n.id ? n : x)) });
    const set = (k: keyof NodeT, v: unknown) => setD(prev => ({ ...prev, [k]: v }));

    function save() {
        axios.put(`/admin/social/flow-nodes/${node.id}`, {
            type: d.type, title: d.title || null, body: d.body, image_url: d.image_url || null,
            save_field: d.save_field || null, action_type: d.action_type || null, action_field: d.action_field || null,
            action_value: d.action_value || null, action_flow_id: d.action_flow_id || null, delay_seconds: d.delay_seconds || null,
            condition_type: d.condition_type || null, condition_field: d.condition_field || null, condition_value: d.condition_value || null,
            cards: d.cards ?? [], keywords: d.keywords ?? [],
        }).then(r => replaceNode({ ...d, ...r.data.node }));
    }
    function setEntry() { axios.put(`/admin/social/flow-nodes/${node.id}`, { is_entry: true }).then(() => { patchFlow({ ...flow, nodes: flow.nodes.map(x => ({ ...x, is_entry: x.id === node.id })) }); set('is_entry', true); }); }
    function del() { if (confirm('Энэ блокийг устгах уу?')) axios.delete(`/admin/social/flow-nodes/${node.id}`).then(() => { patchFlow({ ...flow, nodes: flow.nodes.filter(x => x.id !== node.id) }); onClose(); }); }
    function addButton() { axios.post('/admin/social/flow-buttons', { node_id: node.id, label: 'Шинэ товч', action: 'handoff' }).then(r => replaceNode({ ...node, buttons: [...node.buttons, r.data.button] })); }
    function moveButton(i: number, dir: number) {
        const j = i + dir;
        if (j < 0 || j >= node.buttons.length) return;
        const arr = [...node.buttons];
        [arr[i], arr[j]] = [arr[j], arr[i]];
        replaceNode({ ...node, buttons: arr });
        axios.post('/admin/social/flow-buttons/reorder', { ids: arr.map(b => b.id) });
    }
    function insertToken(t: string) {
        const ta = bodyRef.current; const pos = ta?.selectionStart ?? d.body.length;
        const next = d.body.slice(0, pos) + t + d.body.slice(pos); set('body', next);
    }
    const M = NODE_META[d.type];

    return (
        <Drawer title={`${M.label} засах`} onClose={onClose}>
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    {node.is_entry ? <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px]"><Star className="h-3 w-3" /> Эхлэл</span>
                        : <button onClick={setEntry} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] hover:bg-accent"><Star className="h-3 w-3" /> Эхлэл болгох</button>}
                    <button onClick={del} className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" /> Устгах</button>
                </div>
                <div>
                    <div className="mb-1 text-xs font-medium text-muted-foreground">Блокийн гарчиг</div>
                    <input value={d.title ?? ''} onChange={e => set('title', e.target.value)} placeholder="Ж: Угтах мессеж" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
                </div>

                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-700"><Zap className="h-3.5 w-3.5" /> Түлхүүр үг (автомат таних)</div>
                    <input value={kwText} onChange={e => { setKwText(e.target.value); set('keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean)); }}
                        placeholder="металл, metal, металл аппарат" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
                    <p className="mt-1 text-[10px] text-muted-foreground">Хэрэглэгч чөлөөтэй бичихэд эдгээр үг таарвал → шууд энэ блок руу үсэрнэ (таслалаар тусгаарла).</p>
                </div>

                {(d.type === 'message' || d.type === 'image') && (
                    <ImageUploader value={d.image_url} onChange={url => {
                        set('image_url', url);
                        axios.put(`/admin/social/flow-nodes/${node.id}`, { image_url: url }).then(() => replaceNode({ ...node, ...d, image_url: url }));
                    }} />
                )}

                {(d.type === 'media' || d.type === 'file') && (
                    <FileUploader value={d.image_url} accept={d.type === 'media' ? 'video/*,image/*' : '*'} label={d.type === 'media' ? 'Видео оруулах' : 'Файл оруулах'}
                        onChange={url => { set('image_url', url); axios.put(`/admin/social/flow-nodes/${node.id}`, { image_url: url }).then(() => replaceNode({ ...node, ...d, image_url: url })); }} />
                )}

                {d.type === 'carousel' && <CarouselEditor cards={d.cards ?? []} allFlows={allFlows} forms={forms} onChange={c => set('cards', c)} />}

                {d.type === 'typing' && <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">Энэ блок хэрэглэгчид «Бичиж байна…» гэж харуулаад дараагийн блок руу шилжинэ.</p>}

                {(d.type === 'message' || d.type === 'question') && <>
                    <TokenBar tokens={tokens} onInsert={insertToken} />
                    <textarea ref={bodyRef} value={d.body} onChange={e => set('body', e.target.value)} rows={4} placeholder={d.type === 'question' ? 'Асуултаа бичнэ үү…' : 'Мессежийн текст'} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </>}

                {d.type === 'question' && <input value={d.save_field ?? ''} onChange={e => set('save_field', e.target.value)} placeholder="Хариуг хадгалах талбарын нэр (ж: phone)" className="w-full rounded-lg border px-3 py-2 text-sm" />}

                {d.type === 'action' && <>
                    <Sel placeholder="— үйлдэл сонгох —" value={d.action_type ?? ''} onChange={v => set('action_type', v)} options={[
                        { value: 'add_tag', label: 'Тэмдэг нэмэх' }, { value: 'remove_tag', label: 'Тэмдэг хасах' },
                        { value: 'set_field', label: 'Талбар тохируулах' }, { value: 'mark_open', label: 'Оператор руу шилжүүлэх' },
                        { value: 'start_flow', label: 'Өөр урсгал эхлүүлэх' },
                    ]} />
                    {(d.action_type === 'add_tag' || d.action_type === 'remove_tag') && <input value={d.action_value ?? ''} onChange={e => set('action_value', e.target.value)} placeholder="Тэмдгийн нэр" className="w-full rounded-lg border px-3 py-2 text-sm" />}
                    {d.action_type === 'set_field' && <div className="grid grid-cols-2 gap-2"><input value={d.action_field ?? ''} onChange={e => set('action_field', e.target.value)} placeholder="Талбар" className="rounded-lg border px-3 py-2 text-sm" /><input value={d.action_value ?? ''} onChange={e => set('action_value', e.target.value)} placeholder="Утга" className="rounded-lg border px-3 py-2 text-sm" /></div>}
                    {d.action_type === 'start_flow' && <Sel placeholder="— урсгал —" value={d.action_flow_id ? String(d.action_flow_id) : ''} onChange={v => set('action_flow_id', v ? Number(v) : null)} options={allFlows.map(f => ({ value: String(f.id), label: f.name }))} />}
                </>}

                {d.type === 'condition' && <>
                    <Sel placeholder="— нөхцөл сонгох —" value={d.condition_type ?? ''} onChange={v => set('condition_type', v)} options={[
                        { value: 'has_tag', label: 'Тэмдэгтэй эсэх' }, { value: 'field_equals', label: 'Талбар тэнцүү' }, { value: 'field_contains', label: 'Талбар агуулсан' },
                    ]} />
                    {d.condition_type === 'has_tag' && <input value={d.condition_value ?? ''} onChange={e => set('condition_value', e.target.value)} placeholder="Тэмдгийн нэр" className="w-full rounded-lg border px-3 py-2 text-sm" />}
                    {(d.condition_type === 'field_equals' || d.condition_type === 'field_contains') && <div className="grid grid-cols-2 gap-2"><input value={d.condition_field ?? ''} onChange={e => set('condition_field', e.target.value)} placeholder="Талбар" className="rounded-lg border px-3 py-2 text-sm" /><input value={d.condition_value ?? ''} onChange={e => set('condition_value', e.target.value)} placeholder="Утга" className="rounded-lg border px-3 py-2 text-sm" /></div>}
                    <p className="text-[11px] text-muted-foreground">Canvas дээр "Тийм"/"Үгүй" цэгээс чирж салаалуулна.</p>
                </>}

                {d.type === 'delay' && <label className="block text-xs"><span className="mb-1 block text-muted-foreground">Хүлээх хугацаа (секунд)</span><input type="number" min={1} value={d.delay_seconds ?? ''} onChange={e => set('delay_seconds', e.target.value ? Number(e.target.value) : null)} className="w-full rounded-lg border px-3 py-2 text-sm" /></label>}

                <button onClick={save} className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#1877F2] px-3 py-2 text-sm font-medium text-white hover:bg-[#166fe0]"><Save className="h-4 w-4" /> Хадгалах</button>

                {d.type === 'message' && <div className="border-t pt-3">
                    <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Товчнууд</span><button onClick={addButton} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] hover:bg-accent"><Plus className="h-3 w-3" /> Товч</button></div>
                    <div className="space-y-2">
                        {node.buttons.map((b, bi) => <ButtonEditor key={b.id} allFlows={allFlows} forms={forms} node={node} button={b} index={bi} total={node.buttons.length} onMove={dir => moveButton(bi, dir)} replaceNode={replaceNode} />)}
                        {node.buttons.length === 0 && <p className="text-[11px] text-muted-foreground">Товчгүй бол доорх "next" цэгээс шууд дараагийн блок руу холбоно.</p>}
                    </div>
                </div>}
            </div>
        </Drawer>
    );
}

/* ─── Button editor ──────────────────────────────────────────────────────── */
function ButtonEditor({ allFlows, forms, node, button, index, total, onMove, replaceNode }: { allFlows: FlowT[]; forms: FormRef[]; node: NodeT; button: BtnT; index: number; total: number; onMove: (dir: number) => void; replaceNode: (n: NodeT) => void; }) {
    const [label, setLabel] = useState(button.label);
    const [action, setAction] = useState<Action>(button.action);
    const [targetFlow, setTargetFlow] = useState(button.target_flow_id ? String(button.target_flow_id) : '');
    const [targetForm, setTargetForm] = useState(button.target_form_id ? String(button.target_form_id) : '');
    const [url, setUrl] = useState(button.url ?? '');
    const [phone, setPhone] = useState(button.phone ?? '');
    const [quickReply, setQuickReply] = useState(button.is_quick_reply ?? false);
    const isNav = action === 'next_node' || action === 'flow_start' || action === 'handoff';
    function save() {
        axios.put(`/admin/social/flow-buttons/${button.id}`, { label, action, is_quick_reply: isNav ? quickReply : false, target_node_id: action === 'next_node' ? button.target_node_id : null, target_flow_id: action === 'flow_start' && targetFlow ? Number(targetFlow) : null, target_form_id: action === 'web_form' && targetForm ? Number(targetForm) : null, url: action === 'url' ? url : null, phone: action === 'call' ? phone : null })
            .then(r => replaceNode({ ...node, buttons: node.buttons.map(b => (b.id === button.id ? r.data.button : b)) }));
    }
    function del() { axios.delete(`/admin/social/flow-buttons/${button.id}`).then(() => replaceNode({ ...node, buttons: node.buttons.filter(b => b.id !== button.id) })); }
    return (
        <div className="space-y-1.5 rounded-lg border p-2">
            <div className="flex items-center gap-1.5">
                <div className="flex flex-col">
                    <button onClick={() => onMove(-1)} disabled={index === 0} className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"><ChevronUp className="h-3 w-3" /></button>
                    <button onClick={() => onMove(1)} disabled={index === total - 1} className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"><ChevronDown className="h-3 w-3" /></button>
                </div>
                <input value={label} onChange={e => setLabel(e.target.value)} maxLength={40} placeholder="Товчны бичвэр" className="flex-1 rounded-md border px-2 py-1 text-xs" />
                <EmojiButton onPick={em => setLabel(l => `${em} ${l}`.slice(0, 40).trimStart())} />
                <button onClick={del} className="rounded-md p-1 text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            {label.length > 20 && <p className="text-[10px] text-amber-600">Meta дээр эхний ~20 тэмдэгт харагдана.</p>}
            <Sel size="sm" value={action} onChange={v => setAction(v as Action)} options={(Object.keys(ACTION_META) as Action[]).map(a => ({ value: a, label: ACTION_META[a].label }))} />
            {action === 'next_node' && <p className="text-[10px] text-muted-foreground">→ Canvas дээр энэ товчны цэгээс чирж холбоно.</p>}
            {action === 'flow_start' && <Sel size="sm" placeholder="— урсгал —" value={targetFlow} onChange={setTargetFlow} options={allFlows.map(f => ({ value: String(f.id), label: f.name }))} />}
            {action === 'web_form' && <Sel size="sm" placeholder="— форм сонгох —" value={targetForm} onChange={setTargetForm} options={forms.map(f => ({ value: String(f.id), label: f.name }))} />}
            {action === 'url' && <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className="w-full rounded-md border px-2 py-1 text-xs" />}
            {action === 'call' && <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Утас: +97699112233" className="w-full rounded-md border px-2 py-1 text-xs" />}
            {isNav && (
                <label className="flex cursor-pointer items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-[11px]">
                    <input type="checkbox" checked={quickReply} onChange={e => setQuickReply(e.target.checked)} className="h-3.5 w-3.5 accent-[#1877F2]" />
                    <span className="flex-1">Quick reply (хөнгөн чип) <span className="text-muted-foreground">— дарсны дараа алга болно, навигацид тохиромжтой</span></span>
                </label>
            )}
            <button onClick={save} className="w-full rounded-md border px-2 py-1 text-xs hover:bg-accent">Товч хадгалах</button>
        </div>
    );
}

/* ─── Settings drawer ────────────────────────────────────────────────────── */
function SettingsDrawer({ flow, accounts, patchFlow, removeFlow, onClose, clearActive }: { flow: FlowT; accounts: Account[]; patchFlow: (f: FlowT) => void; removeFlow: (id: number) => void; onClose: () => void; clearActive: () => void; }) {
    const [name, setName] = useState(flow.name);
    const [icon, setIcon] = useState(flow.icon ?? '');
    const [trigger, setTrigger] = useState(flow.trigger_type);
    const [keywords, setKeywords] = useState((flow.keywords ?? []).join(', '));
    const [accountId, setAccountId] = useState(flow.social_account_id ? String(flow.social_account_id) : '');
    const [active, setActive] = useState(flow.is_active);
    function save() {
        axios.put(`/admin/social/flows/${flow.id}`, { name, icon: icon || null, trigger_type: trigger, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), social_account_id: accountId ? Number(accountId) : null, is_active: active })
            .then(r => { patchFlow({ ...flow, ...r.data.flow, nodes: flow.nodes }); onClose(); });
    }
    function del() { if (confirm(`"${flow.name}" урсгалыг устгах уу?`)) axios.delete(`/admin/social/flows/${flow.id}`).then(() => { removeFlow(flow.id); clearActive(); }); }
    return (
        <Drawer title="Урсгалын тохиргоо" onClose={onClose}>
            <div className="space-y-3">
                <div className="grid grid-cols-[3rem_1fr] gap-2"><input value={icon} onChange={e => setIcon(e.target.value)} placeholder="🦷" className="rounded-lg border px-2 py-2 text-center text-sm" /><input value={name} onChange={e => setName(e.target.value)} placeholder="Нэр" className="rounded-lg border px-3 py-2 text-sm" /></div>
                <label className="block text-xs"><span className="mb-1 block text-muted-foreground">Trigger</span><Sel value={trigger} onChange={v => setTrigger(v as FlowT['trigger_type'])} options={[{ value: 'welcome', label: 'Эхний мессеж (welcome)' }, { value: 'keyword', label: 'Түлхүүр үг' }, { value: 'default', label: 'Анхдагч (fallback)' }]} /></label>
                {trigger === 'keyword' && <label className="block text-xs"><span className="mb-1 block text-muted-foreground">Түлхүүр үгс (таслалаар)</span><input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="үнэ, цаг авах" className="w-full rounded-lg border px-3 py-2 text-sm" /></label>}
                <label className="block text-xs"><span className="mb-1 block text-muted-foreground">Хуудас (хоосон = бүгд)</span><Sel value={accountId} onChange={setAccountId} options={[{ value: '', label: 'Бүх хуудас' }, ...accounts.map(a => ({ value: String(a.id), label: a.page_name }))]} /></label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-4 w-4 accent-[#1877F2]" /> Идэвхтэй</label>
                <button onClick={save} className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#1877F2] px-3 py-2 text-sm font-medium text-white hover:bg-[#166fe0]"><Save className="h-4 w-4" /> Хадгалах</button>
                <button onClick={del} className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Урсгал устгах</button>
            </div>
        </Drawer>
    );
}

/* ─── Generic drawer ─────────────────────────────────────────────────────── */
function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="absolute right-0 top-0 z-20 flex h-full w-80 flex-col border-l bg-background shadow-xl duration-300 animate-in slide-in-from-right-5">
            <div className="flex items-center justify-between border-b px-4 py-3"><span className="text-sm font-semibold">{title}</span><button onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-4 w-4" /></button></div>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </div>
    );
}
