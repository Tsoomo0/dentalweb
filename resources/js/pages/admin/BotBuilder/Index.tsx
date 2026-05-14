import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
    Bot, ChevronRight, MessageSquare, Pencil, Plus, Save, Sparkles,
    Trash2, X,
} from 'lucide-react';
import { useState } from 'react';

/* ── Types ────────────────────────────────────────────────────────────────── */
interface BotButton {
    id: number; node_id: number; label: string; icon: string | null;
    action: 'next_node' | 'flow_start' | 'handoff' | 'url' | 'back' | 'close';
    target_node_id: number | null; target_flow_id: number | null;
    target_url: string | null; sort_order: number;
}
interface Node {
    id: number; flow_id: number | null; key: string;
    title: string | null; body: string; data_source: string | null;
    is_welcome: boolean; buttons: BotButton[];
}
interface Flow {
    id: number; key: string; name: string; icon: string | null;
    description: string | null; is_active: boolean; sort_order: number; nodes: Node[];
}
interface Props { flows: Flow[]; welcomeNode: Node | null }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Bot тохиргоо', href: '/admin/chatbot-flows' },
];
const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

/* ── Main ─────────────────────────────────────────────────────────────────── */
export default function BotBuilderIndex({ flows, welcomeNode }: Props) {
    // Selected: 'welcome' or flow.id
    const [selected, setSelected] = useState<'welcome' | number>('welcome');

    // Editing modals
    const [editingWelcome, setEditingWelcome] = useState(false);
    const [editingFlow, setEditingFlow] = useState<Flow | 'new' | null>(null);
    const [editingMenu, setEditingMenu] = useState<Flow | null>(null);
    const [editingQa, setEditingQa] = useState<{ flow: Flow; node: Node | null } | null>(null);

    const reload = () => router.reload({ only: ['flows', 'welcomeNode'] });

    const selectedFlow = typeof selected === 'number' ? flows.find((f) => f.id === selected) : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Bot тохиргоо" />

            <div className="flex h-[calc(100svh-4rem)] overflow-hidden bg-neutral-50 dark:bg-neutral-950 rounded-xl">

                {/* ════════ LEFT SIDEBAR ════════ */}
                <aside className="w-72 shrink-0 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-md shadow-red-600/20">
                            <Bot className="size-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">HR Туслах</p>
                            <p className="text-[10px] text-neutral-500">Bot тохиргоо</p>
                        </div>
                    </div>

                    {/* Welcome item */}
                    <div className="p-2">
                        <SidebarItem
                            icon={<Sparkles className="size-4" />}
                            iconBg="bg-gradient-to-br from-red-500 to-red-700"
                            title="Тавтай морил"
                            subtitle="Эхний мэндчилгээ"
                            active={selected === 'welcome'}
                            onClick={() => setSelected('welcome')}
                        />
                    </div>

                    {/* Topics list */}
                    <div className="flex-1 overflow-y-auto px-2 pb-2">
                        <div className="px-2 py-2 flex items-center justify-between">
                            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">📚 Сэдвүүд</p>
                            <span className="text-[10px] text-neutral-400">{flows.length}</span>
                        </div>
                        {flows.map((flow) => {
                            const count = flow.nodes.filter((n) => !n.is_welcome).length;
                            return (
                                <SidebarItem
                                    key={flow.id}
                                    icon={<span className="text-lg leading-none">{flow.icon || '📘'}</span>}
                                    iconBg="bg-neutral-100 dark:bg-neutral-800"
                                    title={flow.name}
                                    subtitle={`${count} асуулт`}
                                    badge={count}
                                    active={selected === flow.id}
                                    onClick={() => setSelected(flow.id)}
                                />
                            );
                        })}
                        <button
                            onClick={() => setEditingFlow('new')}
                            className="w-full mt-2 py-2.5 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 text-xs font-bold hover:border-red-500 hover:text-red-700 transition-colors flex items-center justify-center gap-1.5"
                        >
                            <Plus className="size-3.5" /> Шинэ сэдэв
                        </button>
                    </div>
                </aside>

                {/* ════════ MIDDLE — EDITOR ════════ */}
                <main className="flex-1 overflow-y-auto">
                    {selected === 'welcome' && welcomeNode && (
                        <WelcomeView
                            node={welcomeNode}
                            flows={flows}
                            onEdit={() => setEditingWelcome(true)}
                        />
                    )}
                    {selectedFlow && (
                        <TopicView
                            flow={selectedFlow}
                            onEditFlow={() => setEditingFlow(selectedFlow)}
                            onEditMenu={() => setEditingMenu(selectedFlow)}
                            onNewQa={() => setEditingQa({ flow: selectedFlow, node: null })}
                            onEditQa={(node) => setEditingQa({ flow: selectedFlow, node })}
                            onDeleted={() => { setSelected('welcome'); reload(); }}
                            onChanged={reload}
                        />
                    )}
                    {!welcomeNode && selected === 'welcome' && (
                        <div className="flex items-center justify-center h-full text-neutral-400">
                            <p>Тавтай морил алга байна.</p>
                        </div>
                    )}
                </main>

                {/* ════════ RIGHT — LIVE PREVIEW ════════ */}
                <BotPreview welcomeNode={welcomeNode} selectedFlow={selectedFlow} flows={flows} />
            </div>

            {/* ════════ MODALS ════════ */}
            {editingWelcome && welcomeNode && (
                <WelcomeModal node={welcomeNode} onClose={() => setEditingWelcome(false)} onSaved={() => { setEditingWelcome(false); reload(); }} />
            )}
            {editingFlow === 'new' && (
                <FlowModal flow={null} onClose={() => setEditingFlow(null)} onSaved={(id) => { setEditingFlow(null); if (id) setSelected(id); reload(); }} />
            )}
            {editingFlow && editingFlow !== 'new' && (
                <FlowModal flow={editingFlow} onClose={() => setEditingFlow(null)} onSaved={() => { setEditingFlow(null); reload(); }} />
            )}
            {editingMenu && (
                <MenuModal flow={editingMenu} onClose={() => setEditingMenu(null)} onSaved={() => { setEditingMenu(null); reload(); }} />
            )}
            {editingQa && (
                <QaModal
                    flow={editingQa.flow}
                    node={editingQa.node}
                    onClose={() => setEditingQa(null)}
                    onSaved={() => { setEditingQa(null); reload(); }}
                />
            )}
        </AppLayout>
    );
}

/* ── Sidebar item ─────────────────────────────────────────────────────────── */
function SidebarItem({
    icon, iconBg, title, subtitle, badge, active, onClick,
}: {
    icon: React.ReactNode; iconBg: string;
    title: string; subtitle?: string;
    badge?: number; active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${active
                ? 'bg-red-50 dark:bg-red-950/30 ring-1 ring-red-300 dark:ring-red-800/50'
                : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
        >
            <div className={`size-9 rounded-lg ${iconBg} flex items-center justify-center text-white shrink-0`}>{icon}</div>
            <div className="flex-1 min-w-0 text-left">
                <p className={`text-sm font-bold truncate ${active ? 'text-red-900 dark:text-red-200' : 'text-neutral-900 dark:text-neutral-100'}`}>{title}</p>
                {subtitle && <p className="text-[11px] text-neutral-500 truncate">{subtitle}</p>}
            </div>
            {badge !== undefined && badge > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">{badge}</span>
            )}
        </button>
    );
}

/* ── Welcome view ─────────────────────────────────────────────────────────── */
function WelcomeView({ node, flows, onEdit }: { node: Node; flows: Flow[]; onEdit: () => void }) {
    return (
        <div className="max-w-5xl mx-auto p-5 md:p-8 space-y-5">
            <header className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <p className="text-xs text-red-700 font-semibold uppercase tracking-wider">⭐ Тавтай морил</p>
                    <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mt-1">Эхний мэндчилгээ</h1>
                    <p className="text-sm text-neutral-500 mt-1">Ажилтан bot нээхэд анх харах screen</p>
                </div>
                <button onClick={onEdit} className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center gap-2 shadow-sm">
                    <Pencil className="size-4" /> Засах
                </button>
            </header>

            <section className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Bot хариулт</p>
                <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-xl p-4 text-sm whitespace-pre-wrap text-neutral-800 dark:text-neutral-200 border border-red-200 dark:border-red-900/40">
                    {node.body}
                </div>
            </section>

            <section className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Товчнууд</p>
                    <p className="text-[10px] text-neutral-400">Сэдэв нэмэх үед автоматаар үүсэн.</p>
                </div>
                <div className="space-y-2">
                    {node.buttons.map((b) => {
                        const target = b.action === 'flow_start'
                            ? flows.find((f) => f.id === b.target_flow_id)?.name ?? '—'
                            : b.action === 'handoff' ? 'Админтай холбогдох'
                            : b.action === 'back' ? 'Үндсэн цэс'
                            : '—';
                        return (
                            <div key={b.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                                <span className="text-lg shrink-0">{b.icon || '🔘'}</span>
                                <span className="flex-1 text-sm font-bold text-neutral-900 dark:text-neutral-100">{b.label}</span>
                                <ChevronRight className="size-3.5 text-neutral-300" />
                                <span className="text-xs text-neutral-500 font-semibold">{target}</span>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

/* ── Topic view ───────────────────────────────────────────────────────────── */
function TopicView({
    flow, onEditFlow, onEditMenu, onNewQa, onEditQa, onDeleted, onChanged,
}: {
    flow: Flow;
    onEditFlow: () => void;
    onEditMenu: () => void;
    onNewQa: () => void;
    onEditQa: (node: Node) => void;
    onDeleted: () => void;
    onChanged: () => void;
}) {
    const menu = flow.nodes.find((n) => n.is_welcome);
    const qaList = flow.nodes.filter((n) => !n.is_welcome);

    const deleteFlow = async () => {
        if (!confirm(`"${flow.name}" сэдвийг бүхэлд нь устгах уу? Бүх асуулт-хариулт устана.`)) return;
        await axios.delete(`/admin/chatbot/flows/${flow.id}`, { headers: { 'X-CSRF-TOKEN': csrf() } });
        onDeleted();
    };

    const deleteQa = async (node: Node) => {
        if (!confirm(`"${node.title}" асуултыг устгах уу?`)) return;
        await axios.delete(`/admin/chatbot/nodes/${node.id}`, { headers: { 'X-CSRF-TOKEN': csrf() } });
        onChanged();
    };

    return (
        <div className="max-w-5xl mx-auto p-5 md:p-8 space-y-5">
            {/* Header */}
            <header className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/20 flex items-center justify-center text-2xl">
                        {flow.icon || '📘'}
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Сэдэв</p>
                        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{flow.name}</h1>
                        <p className="text-xs text-neutral-500 mt-0.5">{qaList.length} асуулт · key: <span className="font-mono">{flow.key}</span></p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onEditFlow} className="h-10 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 text-sm font-bold flex items-center gap-2">
                        <Pencil className="size-4" /> Засах
                    </button>
                    <button onClick={deleteFlow} className="h-10 px-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-1.5">
                        <Trash2 className="size-4" />
                    </button>
                </div>
            </header>

            {/* Menu (topic intro) */}
            {menu && (
                <section className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">📋 Танилцуулга текст</p>
                        <button onClick={onEditMenu} className="h-8 px-3 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1.5">
                            <Pencil className="size-3" /> Засах
                        </button>
                    </div>
                    <p className="text-[11px] text-neutral-500 mb-2">Ажилтан энэ сэдэв нээхэд анх харах текст:</p>
                    <div className="bg-red-50/40 dark:bg-red-950/10 rounded-xl p-4 text-sm whitespace-pre-wrap text-neutral-800 dark:text-neutral-200 border border-red-100 dark:border-red-900/30">
                        {menu.body}
                    </div>
                </section>
            )}

            {/* Q&A list */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">💬 Асуулт-Хариултууд</h2>
                    <button onClick={onNewQa} className="h-9 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
                        <Plus className="size-3.5" /> Шинэ асуулт
                    </button>
                </div>

                <div className="space-y-2.5">
                    {qaList.map((node, i) => (
                        <QaItem key={node.id} node={node} index={i + 1} onEdit={() => onEditQa(node)} onDelete={() => deleteQa(node)} />
                    ))}

                    {qaList.length === 0 && (
                        <div className="text-center py-12 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800">
                            <MessageSquare className="size-10 mx-auto opacity-30 mb-2" />
                            <p className="text-sm font-semibold text-neutral-500">Асуулт алга</p>
                            <p className="text-xs text-neutral-400 mt-1">"+ Шинэ асуулт" дарж эхлүүлнэ үү.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function QaItem({ node, index, onEdit, onDelete }: { node: Node; index: number; onEdit: () => void; onDelete: () => void }) {
    return (
        <div className="rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-red-300 dark:hover:border-red-800/60 hover:shadow-md transition-all group overflow-hidden">
            <div className="flex items-stretch">
                <div className="w-12 shrink-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 flex items-center justify-center border-r border-red-100 dark:border-red-900/30">
                    <span className="text-base font-bold text-red-600 dark:text-red-400">{index}</span>
                </div>
                <button onClick={onEdit} className="flex-1 min-w-0 p-4 text-left">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <MessageSquare className="size-3.5 text-neutral-400 shrink-0" />
                        {node.title}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1.5 line-clamp-2 whitespace-pre-wrap pl-6">{node.body}</p>
                </button>
                <div className="flex items-center gap-0.5 pr-3 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={onEdit} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Засах">
                        <Pencil className="size-3.5" />
                    </button>
                    <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Устгах">
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── BotPreview — phone-style live preview ───────────────────────────────── */
function BotPreview({ welcomeNode, selectedFlow, flows }: { welcomeNode: Node | null; selectedFlow: Flow | null | undefined; flows: Flow[] }) {
    const isTopic = !!selectedFlow;
    const node = isTopic ? selectedFlow!.nodes.find((n) => n.is_welcome) : welcomeNode;
    const buttons = node?.buttons ?? [];

    const buttonStyle = (action: string) => {
        if (action === 'handoff') return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300';
        if (action === 'back' || action === 'close') return 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400';
        return 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200';
    };

    return (
        <aside className="w-80 shrink-0 hidden lg:flex flex-col border-l border-neutral-200 dark:border-neutral-800 bg-gradient-to-b from-neutral-100 to-neutral-200 dark:from-neutral-950 dark:to-neutral-900">
            <header className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Урьдчилан харах</p>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Ажилтан /my/chat-аас ингэж харна</p>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
                {/* Phone-like frame */}
                <div className="rounded-3xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                    {/* Phone header bar */}
                    <div className="bg-gradient-to-br from-red-500 to-red-700 px-4 py-3 flex items-center gap-2.5">
                        <div className="size-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-lg">🤖</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">HR Туслах</p>
                            <p className="text-[10px] text-white/80 flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-green-400" /> Онлайн
                            </p>
                        </div>
                    </div>

                    {/* Chat area */}
                    <div className="p-4 space-y-3 bg-neutral-50 dark:bg-neutral-950 min-h-[400px]">
                        {node ? (
                            <>
                                {/* Bot message bubble */}
                                <div className="flex gap-2">
                                    <div className="size-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs shrink-0">🤖</div>
                                    <div className="bg-white dark:bg-neutral-800 rounded-2xl rounded-tl-md px-3.5 py-2.5 shadow-sm border border-neutral-100 dark:border-neutral-700 max-w-[240px]">
                                        <p className="text-xs whitespace-pre-wrap leading-relaxed text-neutral-800 dark:text-neutral-200">{node.body}</p>
                                    </div>
                                </div>

                                {/* Buttons */}
                                {buttons.length > 0 && (
                                    <div className="ml-9 flex flex-wrap gap-1.5">
                                        {buttons.map((b) => (
                                            <button
                                                key={b.id}
                                                className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-colors ${buttonStyle(b.action)} hover:shadow-sm`}
                                            >
                                                {b.icon && <span className="mr-1">{b.icon}</span>}{b.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* For topic preview, also show one example Q&A */}
                                {isTopic && selectedFlow!.nodes.filter((n) => !n.is_welcome).slice(0, 1).map((q) => (
                                    <div key={q.id} className="pt-3 mt-3 border-t border-dashed border-neutral-200 dark:border-neutral-800 space-y-2 opacity-70">
                                        <p className="text-[9px] text-center text-neutral-400 uppercase tracking-wider">Жишээ хариулт</p>
                                        {/* User tap shown as user bubble */}
                                        <div className="flex justify-end">
                                            <div className="bg-red-500 text-white rounded-2xl rounded-tr-md px-3 py-2 text-[11px] font-semibold max-w-[200px]">
                                                {q.title}
                                            </div>
                                        </div>
                                        {/* Bot answer */}
                                        <div className="flex gap-2">
                                            <div className="size-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs shrink-0">🤖</div>
                                            <div className="bg-white dark:bg-neutral-800 rounded-2xl rounded-tl-md px-3.5 py-2.5 shadow-sm border border-neutral-100 dark:border-neutral-700 max-w-[240px]">
                                                <p className="text-xs whitespace-pre-wrap leading-relaxed text-neutral-800 dark:text-neutral-200">{q.body}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-40 text-neutral-400">
                                <p className="text-xs">Хариулт алга</p>
                            </div>
                        )}
                    </div>

                    {/* Phone input bar mockup */}
                    <div className="px-3 py-2 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                        <div className="flex-1 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center px-3">
                            <span className="text-[10px] text-neutral-400">Мессеж бичих…</span>
                        </div>
                        <div className="size-8 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">→</div>
                    </div>
                </div>

                <p className="text-[10px] text-neutral-400 text-center mt-3">
                    Энэ нь зөвхөн дотоод урьдчилан харах.<br />
                    Сонгосон сэдвээр шинэчлэгдэнэ.
                </p>
            </div>
        </aside>
    );
}

/* ── Modals ───────────────────────────────────────────────────────────────── */
function WelcomeModal({ node, onClose, onSaved }: { node: Node; onClose: () => void; onSaved: () => void }) {
    const [body, setBody] = useState(node.body);
    const [busy, setBusy] = useState(false);
    const save = async () => {
        setBusy(true);
        try {
            await axios.put('/admin/chatbot/welcome', { body }, { headers: { 'X-CSRF-TOKEN': csrf() } });
            onSaved();
        } finally { setBusy(false); }
    };
    return (
        <Modal title="Тавтай морил засах" onClose={onClose}>
            <Field label="Bot хариулт" hint="Bot эхэлэхэд ажилтанд хэлэх мэндчилгээ">
                <textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} className={textCls} placeholder="Сайн байна уу 👋&#10;Танд хэрхэн туслах вэ?" />
            </Field>
            <ModalActions onClose={onClose} onSave={save} busy={busy} />
        </Modal>
    );
}

function FlowModal({ flow, onClose, onSaved }: { flow: Flow | null; onClose: () => void; onSaved: (newId?: number) => void }) {
    const isNew = !flow;
    const [name, setName] = useState(flow?.name ?? '');
    const [icon, setIcon] = useState(flow?.icon ?? '');
    const [busy, setBusy] = useState(false);

    const save = async () => {
        setBusy(true);
        try {
            if (isNew) {
                const res = await axios.post('/admin/chatbot/flows', { name, icon: icon || null }, { headers: { 'X-CSRF-TOKEN': csrf() } });
                onSaved(res.data?.flow?.id);
            } else {
                await axios.put(`/admin/chatbot/flows/${flow!.id}`, { name, icon: icon || null }, { headers: { 'X-CSRF-TOKEN': csrf() } });
                onSaved();
            }
        } catch (e: any) {
            alert(e?.response?.data?.message ?? 'Алдаа');
        } finally { setBusy(false); }
    };

    return (
        <Modal title={isNew ? 'Шинэ сэдэв' : 'Сэдэв засах'} onClose={onClose}>
            <div className="grid grid-cols-[80px_1fr] gap-3">
                <Field label="Icon">
                    <input value={icon} onChange={(e) => setIcon(e.target.value)} className={inputCls + ' text-center text-xl'} placeholder="🏥" />
                </Field>
                <Field label="Сэдвийн нэр">
                    <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Эрүүл мэндийн даатгал" autoFocus />
                </Field>
            </div>
            {isNew && (
                <p className="text-[11px] text-neutral-500 bg-red-50/50 dark:bg-red-950/20 p-3 rounded-lg">
                    💡 Сэдэв үүсгэхэд автоматаар цэс + Тавтай морилд орох товч үүсгэгдэх болно.
                </p>
            )}
            <ModalActions onClose={onClose} onSave={save} busy={busy} />
        </Modal>
    );
}

function MenuModal({ flow, onClose, onSaved }: { flow: Flow; onClose: () => void; onSaved: () => void }) {
    const menu = flow.nodes.find((n) => n.is_welcome);
    const [body, setBody] = useState(menu?.body ?? '');
    const [busy, setBusy] = useState(false);
    const save = async () => {
        setBusy(true);
        try {
            await axios.put(`/admin/chatbot/flows/${flow.id}/menu`, { body }, { headers: { 'X-CSRF-TOKEN': csrf() } });
            onSaved();
        } finally { setBusy(false); }
    };
    return (
        <Modal title="Танилцуулга засах" onClose={onClose}>
            <Field label="Bot хариулт" hint="Ажилтан сэдэв нээхэд анх харах текст">
                <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} className={textCls} />
            </Field>
            <ModalActions onClose={onClose} onSave={save} busy={busy} />
        </Modal>
    );
}

function QaModal({ flow, node, onClose, onSaved }: { flow: Flow; node: Node | null; onClose: () => void; onSaved: () => void }) {
    const isNew = !node;
    const [title, setTitle] = useState(node?.title ?? '');
    const [body, setBody] = useState(node?.body ?? '');
    const [busy, setBusy] = useState(false);

    const save = async () => {
        setBusy(true);
        try {
            if (isNew) {
                await axios.post('/admin/chatbot/nodes', { flow_id: flow.id, title, body }, { headers: { 'X-CSRF-TOKEN': csrf() } });
            } else {
                await axios.put(`/admin/chatbot/nodes/${node!.id}`, { title, body }, { headers: { 'X-CSRF-TOKEN': csrf() } });
            }
            onSaved();
        } catch (e: any) {
            alert(e?.response?.data?.message ?? 'Алдаа');
        } finally { setBusy(false); }
    };

    return (
        <Modal title={isNew ? 'Шинэ асуулт нэмэх' : 'Асуулт засах'} onClose={onClose}>
            <Field label="Асуулт" hint="Ажилтан энэ нэрээр товч руу дарна">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Цалин хэзээ буух вэ?" autoFocus />
            </Field>
            <Field label="Bot хариулт" hint="Ажилтан асуулт дарвал bot ингэж хариулна">
                <textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} className={textCls} placeholder="📆 Сар болгоны 20, 05-нд цалин бууна..." />
            </Field>
            {isNew && (
                <p className="text-[11px] text-neutral-500 bg-red-50/50 dark:bg-red-950/20 p-3 rounded-lg">
                    💡 Хариултын доор "Өөр асуулт", "Админтай холбогдох", "Үндсэн цэс" товчнууд автоматаар нэмэгдэх болно.
                </p>
            )}
            <ModalActions onClose={onClose} onSave={save} busy={busy} />
        </Modal>
    );
}

/* ── Shared atoms ─────────────────────────────────────────────────────────── */
const inputCls = 'w-full h-11 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition';
const textCls  = 'w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition resize-y';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">{label}</span>
            <div className="mt-1.5">{children}</div>
            {hint && <p className="text-[10px] text-neutral-400 mt-1.5">{hint}</p>}
        </label>
    );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    return (
        <div onClick={onClose} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
                    <button onClick={onClose} className="size-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center hover:bg-neutral-200">
                        <X className="size-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4">{children}</div>
            </div>
        </div>
    );
}

function ModalActions({ onClose, onSave, busy }: { onClose: () => void; onSave: () => void; busy: boolean }) {
    return (
        <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="h-10 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold">Болих</button>
            <button onClick={onSave} disabled={busy} className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Save className="size-3.5" /> {busy ? 'Хадгалж байна...' : 'Хадгалах'}
            </button>
        </div>
    );
}
