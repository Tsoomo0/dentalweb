import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft, CheckCircle2, ChevronDown, Facebook, Heart, Images, Instagram, Loader2, MessageCircle,
    MoreHorizontal, Plus, Reply, Send, Sparkles, Trash2, X, Zap,
} from 'lucide-react';
import axios from 'axios';
import { useEffect, useState } from 'react';

interface Post { id: string; channel: string; text: string; image: string | null; permalink: string | null; time: string | null; }

/* ─── Types ─────────────────────────────────────────────────────────────── */
type MatchType = 'any' | 'contains' | 'exact';
interface Rule {
    id: number; social_account_id: number | null; name: string; post_id: string | null;
    match_type: MatchType; keywords: string[]; public_reply: string | null; dm_template: string | null;
    dm_flow_id: number | null; dm_node_id: number | null; is_active: boolean; matched_count: number;
}
interface Account { id: number; page_name: string; }
interface FlowNode { id: number; label: string; }
interface Flow { id: number; name: string; nodes: FlowNode[]; }
interface Props { rules: Rule[]; accounts: Account[]; flows: Flow[]; }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Коммент автомат', href: '/admin/social/comment-rules' },
];
const MATCH_LABEL: Record<MatchType, string> = { any: 'Ямар ч коммент', contains: 'Тодорхой үг орвол', exact: 'Яг ийм бичвэл' };
const inputCls = 'w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20';
const reveal = 'animate-in fade-in-0 slide-in-from-bottom-3 duration-500 fill-mode-both';

/* ─── Keyword chips ──────────────────────────────────────────────────────── */
function KeywordChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
    const [text, setText] = useState('');
    function add() { const t = text.trim(); if (t && !value.includes(t)) onChange([...value, t]); setText(''); }
    return (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-background px-2.5 py-2 transition focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-[#1877F2]/20">
            {value.map(k => (
                <span key={k} className="inline-flex items-center gap-1 rounded-full bg-[#1877F2]/15 px-2.5 py-1 text-xs font-medium text-[#1877F2]">
                    {k}<button onClick={() => onChange(value.filter(x => x !== k))} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                </span>
            ))}
            <input value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
                onBlur={add} placeholder={value.length ? '' : 'үг бичээд Enter…'} className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none" />
        </div>
    );
}

/* ─── Post picker (5 + see more) ─────────────────────────────────────────── */
function PostPicker({ accountId, value, onChange, onPostImage }: { accountId: string; value: string; onChange: (id: string) => void; onPostImage: (img: string | null) => void }) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (!accountId) { setPosts([]); setLoaded(false); return; }
        setLoading(true); setLoaded(false); setExpanded(false);
        axios.get(`/admin/social/comment-rules/accounts/${accountId}/posts`)
            .then(r => setPosts(r.data.posts)).catch(() => setPosts([])).finally(() => { setLoading(false); setLoaded(true); });
    }, [accountId]);

    if (!accountId) return <p className="text-xs text-muted-foreground">Постоо сонгохын тулд дээрээс хуудас сонгоно уу.</p>;
    if (loading) return <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Постуудыг ачаалж байна…</div>;

    const shown = expanded ? posts : posts.slice(0, 5);
    return (
        <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                <button onClick={() => { onChange(''); onPostImage(null); }} className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-[10px] transition ${!value ? 'border-[#1877F2] bg-[#1877F2]/10 font-semibold text-[#1877F2]' : 'hover:bg-muted'}`}>
                    <Images className="h-5 w-5" /> Бүх пост
                </button>
                {shown.map(p => (
                    <button key={p.id} onClick={() => { onChange(p.id); onPostImage(p.image); }} className={`group relative aspect-square overflow-hidden rounded-xl border transition hover:shadow-md ${value === p.id ? 'ring-2 ring-[#1877F2] ring-offset-1 ring-offset-background' : ''}`}>
                        {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-muted p-1 text-center text-[9px] text-muted-foreground">{p.text.slice(0, 30) || 'пост'}</div>}
                        <span className="absolute left-1 top-1 rounded-md bg-black/50 p-0.5 text-white backdrop-blur">{p.channel === 'instagram' ? <Instagram className="h-3 w-3" /> : <Facebook className="h-3 w-3" />}</span>
                        {value === p.id && <span className="absolute right-1 top-1 rounded-full bg-[#1877F2] p-0.5 text-white shadow"><CheckCircle2 className="h-3 w-3" /></span>}
                    </button>
                ))}
            </div>
            {loaded && posts.length > 5 && (
                <button onClick={() => setExpanded(!expanded)} className="inline-flex items-center gap-1 text-xs font-medium text-[#1877F2] hover:underline">
                    {expanded ? 'Хураах' : `Цааш үзэх (${posts.length - 5})`} <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} />
                </button>
            )}
            {loaded && posts.length === 0 && (
                <div className="rounded-xl border border-dashed p-3 text-center text-[11px] text-muted-foreground">
                    Пост ачаалагдсангүй (зөвшөөрөл шаардлагатай байж магадгүй). Доор пост ID гараар оруулж болно:
                    <input value={value} onChange={e => onChange(e.target.value)} placeholder="Пост ID" className="mt-2 w-full rounded-lg border bg-background px-2 py-1.5 text-xs" />
                </div>
            )}
        </div>
    );
}

/* ─── Step section ───────────────────────────────────────────────────────── */
function Step({ n, title, hint, icon: Icon, color, children }: { n: number; title: string; hint: string; icon: typeof Zap; color: string; children: React.ReactNode }) {
    return (
        <div className={`${reveal} overflow-hidden rounded-2xl border bg-card shadow-sm`} style={{ animationDelay: `${n * 80}ms` }}>
            <div className="flex items-center gap-3 border-b px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm" style={{ background: color }}>{n}</span>
                <div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold"><Icon className="h-4 w-4" style={{ color }} /> {title}</div>
                    <div className="text-xs text-muted-foreground">{hint}</div>
                </div>
            </div>
            <div className="space-y-3 p-4">{children}</div>
        </div>
    );
}

/* ─── Rule editor ────────────────────────────────────────────────────────── */
function RuleEditor({ rule, accounts, flows, onBack }: { rule: Rule | null; accounts: Account[]; flows: Flow[]; onBack: () => void }) {
    const isNew = !rule;
    const [postImage, setPostImage] = useState<string | null>(null);
    const { data, setData, post, put, processing } = useForm({
        social_account_id: rule?.social_account_id ?? (accounts[0]?.id ?? ''),
        name: rule?.name ?? '',
        post_id: rule?.post_id ?? '',
        match_type: (rule?.match_type ?? 'contains') as MatchType,
        keywords: rule?.keywords ?? [],
        public_reply: rule?.public_reply ?? 'Танд хувийн мессеж илгээлээ 📩',
        dm_template: rule?.dm_template ?? 'Сайн байна уу! Дэлгэрэнгүй мэдээллийг энд бичлээ 👇',
        dm_flow_id: rule?.dm_flow_id ?? '',
        dm_node_id: rule?.dm_node_id ?? '',
        is_active: rule?.is_active ?? true,
    });

    // Урсгал/блок сонголтыг нэг dropdown-оор: "" | flow:{id} | node:{id}
    const dmValue = data.dm_node_id ? `node:${data.dm_node_id}` : (data.dm_flow_id ? `flow:${data.dm_flow_id}` : '');
    function setDm(v: string) {
        if (!v) { setData({ ...data, dm_flow_id: '', dm_node_id: '' }); return; }
        if (v.startsWith('flow:')) { setData({ ...data, dm_flow_id: v.slice(5), dm_node_id: '' }); return; }
        const nodeId = Number(v.slice(5));
        const flow = flows.find(f => f.nodes.some(n => n.id === nodeId));
        setData({ ...data, dm_flow_id: flow ? String(flow.id) : '', dm_node_id: String(nodeId) });
    }

    function submit() {
        const payload = { ...data, social_account_id: data.social_account_id || null, dm_flow_id: data.dm_flow_id || null, dm_node_id: data.dm_node_id || null, post_id: data.post_id || null, keywords: data.match_type === 'any' ? [] : data.keywords };
        if (isNew) post('/admin/social/comment-rules', { data: payload, onSuccess: onBack });
        else put(`/admin/social/comment-rules/${rule!.id}`, { data: payload, onSuccess: onBack });
    }
    const sampleComment = data.match_type === 'any' ? 'Сайхан байна!' : (data.keywords[0] ?? 'үнэ');
    const accName = accounts.find(a => String(a.id) === String(data.social_account_id))?.page_name ?? 'таны хуудас';

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
            <div className="space-y-4">
                <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Буцах</button>
                <input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Нэр өгөөрэй (ж: Үнэ асуувал хариулах)" className="w-full rounded-xl border bg-background px-4 py-3 text-base font-medium outline-none transition focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20" />

                <Step n={1} title="Ямар коммент дээр ажиллах вэ?" hint="Доорх нөхцөл таарвал автоматаар хариулна" icon={Zap} color="#10B981">
                    <div>
                        <div className="mb-1 text-xs font-medium text-muted-foreground">Аль хуудасны</div>
                        <select value={data.social_account_id} onChange={e => { setData('social_account_id', e.target.value); setData('post_id', ''); setPostImage(null); }} className={inputCls}>
                            <option value="">Бүх холбосон хуудас</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.page_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <div className="mb-1.5 text-xs font-medium text-muted-foreground">Аль постын коммент</div>
                        <PostPicker accountId={String(data.social_account_id)} value={data.post_id} onChange={v => setData('post_id', v)} onPostImage={setPostImage} />
                    </div>
                    <div>
                        <div className="mb-1.5 text-xs font-medium text-muted-foreground">Хэзээ хариулах вэ</div>
                        <div className="grid grid-cols-3 gap-1.5">
                            {(Object.keys(MATCH_LABEL) as MatchType[]).map(m => (
                                <button key={m} onClick={() => setData('match_type', m)} className={`rounded-xl border px-2 py-2.5 text-xs transition ${data.match_type === m ? 'border-[#1877F2] bg-[#1877F2]/10 font-semibold text-[#1877F2]' : 'hover:bg-muted'}`}>{MATCH_LABEL[m]}</button>
                            ))}
                        </div>
                    </div>
                    {data.match_type !== 'any' && (
                        <div>
                            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Ямар үг орвол ажиллах вэ</div>
                            <KeywordChips value={data.keywords} onChange={v => setData('keywords', v)} />
                            <p className="mt-1 text-[11px] text-muted-foreground">Эдгээр үгийн аль нэг нь комментод орвол хариулна. Ж: <span className="text-foreground">үнэ, хаяг, захиалга</span></p>
                        </div>
                    )}
                </Step>

                <Step n={2} title="Коммент дор ил хариу бичих" hint="Энэ хариуг бүх хүн харна (заавал биш)" icon={Reply} color="#1877F2">
                    <textarea value={data.public_reply} onChange={e => setData('public_reply', e.target.value)} rows={2} placeholder="Ж: Танд хувийн мессеж илгээлээ 📩 (хоосон үлдээвэл ил хариу бичихгүй)" className={inputCls} />
                </Step>

                <Step n={3} title="Хувийн зурвас илгээх" hint="Зөвхөн тэр хүнд inbox-оор очно" icon={Send} color="#8B5CF6">
                    <textarea value={data.dm_template} onChange={e => setData('dm_template', e.target.value)} rows={3} placeholder="Ж: Сайн байна уу! Үнийн мэдээллийг доор бичлээ 👇" className={inputCls} />
                    <div>
                        <div className="mb-1 text-xs font-medium text-muted-foreground">Эсвэл бэлэн ботын урсгал/блок явуулах</div>
                        <select value={dmValue} onChange={e => setDm(e.target.value)} className={inputCls}>
                            <option value="">Зөвхөн дээрх текст илгээх</option>
                            {flows.map(f => (
                                <optgroup key={f.id} label={`«${f.name}» урсгал`}>
                                    <option value={`flow:${f.id}`}>↳ Эхнээс бүтэн урсгал</option>
                                    {f.nodes.map(n => <option key={n.id} value={`node:${n.id}`}>↳ {n.label}</option>)}
                                </optgroup>
                            ))}
                        </select>
                        <p className="mt-1 text-[11px] text-muted-foreground">Урсгалын тодорхой блокийг (ж: «Металл аппарат») сонгож шууд явуулж болно.</p>
                    </div>
                </Step>

                <div className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
                    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} className="h-4 w-4 accent-[#1877F2]" /> Идэвхтэй</label>
                    <button onClick={submit} disabled={processing || !data.name.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1877F2] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#166fe0] disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Хадгалах</button>
                </div>
            </div>

            {/* Phone preview (themed) */}
            <div className="lg:sticky lg:top-4 lg:self-start">
                <div className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-[#1877F2]" /> Урьдчилан харах</div>
                <div className="overflow-hidden rounded-[2rem] border-4 border-border bg-card shadow-xl ring-1 ring-border">
                    <div className="flex items-center gap-2 border-b px-3 py-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-orange-400" />
                        <span className="text-xs font-semibold">{accName}</span>
                        <MoreHorizontal className="ml-auto h-4 w-4 text-muted-foreground" />
                    </div>
                    {postImage ? <img src={postImage} alt="" className="h-36 w-full object-cover" /> : <div className="flex h-24 items-center justify-center bg-muted text-[10px] text-muted-foreground">постын зураг</div>}
                    <div className="flex items-center gap-3 px-3 py-1.5 text-muted-foreground"><Heart className="h-4 w-4" /><MessageCircle className="h-4 w-4" /><Send className="h-4 w-4" /></div>
                    <div className="space-y-2.5 border-t bg-muted/30 px-3 py-2.5 text-[11px]">
                        <div className="flex gap-2">
                            <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400" />
                            <div><span className="font-semibold">хэрэглэгч</span> {sampleComment}</div>
                        </div>
                        {data.public_reply && (
                            <div className="flex gap-2 pl-5">
                                <div className="h-5 w-5 shrink-0 rounded-full bg-foreground" />
                                <div className="rounded-2xl bg-[#1877F2]/10 px-2.5 py-1 text-[#1877F2]"><span className="font-semibold">{accName}</span> {data.public_reply}</div>
                            </div>
                        )}
                    </div>
                    {(data.dm_template || data.dm_flow_id) && (
                        <div className="border-t p-3">
                            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-violet-500"><Send className="h-3 w-3" /> Хувийн мессеж (inbox)</div>
                            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-[11px]">
                                {data.dm_flow_id
                                    ? <span className="italic text-muted-foreground">{data.dm_node_id
                                        ? `«${flows.find(f => f.nodes.some(n => String(n.id) === String(data.dm_node_id)))?.nodes.find(n => String(n.id) === String(data.dm_node_id))?.label}» блок явна`
                                        : `«${flows.find(f => String(f.id) === String(data.dm_flow_id))?.name}» урсгал эхэлнэ`}</span>
                                    : data.dm_template}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Stat card ──────────────────────────────────────────────────────────── */
function Stat({ label, value, color, delay = 0 }: { label: string; value: number; color: string; delay?: number }) {
    return (
        <div className={`${reveal} flex-1 rounded-xl border bg-card px-4 py-3`} style={{ animationDelay: `${delay}ms` }}>
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function CommentRules({ rules, accounts, flows }: Props) {
    const [editing, setEditing] = useState<Rule | 'new' | null>(null);

    function toggle(rule: Rule) {
        router.put(`/admin/social/comment-rules/${rule.id}`, {
            social_account_id: rule.social_account_id, name: rule.name, post_id: rule.post_id, match_type: rule.match_type,
            keywords: rule.keywords, public_reply: rule.public_reply, dm_template: rule.dm_template, dm_flow_id: rule.dm_flow_id, dm_node_id: rule.dm_node_id, is_active: !rule.is_active,
        }, { preserveScroll: true });
    }
    function del(rule: Rule) { if (confirm(`"${rule.name}" автомат хариултыг устгах уу?`)) router.delete(`/admin/social/comment-rules/${rule.id}`); }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Коммент автомат" />
            <div className="font-warm w-full p-4 sm:p-6">
                {editing ? (
                    <RuleEditor rule={editing === 'new' ? null : editing} accounts={accounts} flows={flows} onBack={() => setEditing(null)} />
                ) : (
                    <div className="space-y-5">
                        {/* Header */}
                        <div className={`${reveal} flex flex-wrap items-end justify-between gap-3`}>
                            <div>
                                <h1 className="flex items-center gap-2 text-2xl font-bold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1877F2]/10 text-[#1877F2]"><MessageCircle className="h-5 w-5" /></span> Коммент автомат хариулт</h1>
                                <p className="mt-1 text-sm text-muted-foreground">Хэн нэг таны постод коммент бичихэд автоматаар хариу өгч, хувийн зурвас илгээнэ.</p>
                            </div>
                            <button onClick={() => setEditing('new')} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#166fe0]"><Plus className="h-4 w-4" /> Шинэ хариулт нэмэх</button>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-3">
                            <Stat label="Нийт хариулт" value={rules.length} color="#1877F2" delay={60} />
                            <Stat label="Идэвхтэй" value={rules.filter(r => r.is_active).length} color="#10B981" delay={120} />
                            <Stat label="Хэдэн удаа ажилласан" value={rules.reduce((s, r) => s + r.matched_count, 0)} color="#8B5CF6" delay={180} />
                        </div>

                        {rules.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card p-12 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1877F2]/10"><MessageCircle className="h-7 w-7 text-[#1877F2]" /></div>
                                <div>
                                    <p className="font-medium">Одоохондоо автомат хариулт алга</p>
                                    <p className="mt-0.5 text-sm text-muted-foreground">Постын комментод автоматаар хариулдаг болгоё.</p>
                                </div>
                                <button onClick={() => setEditing('new')} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1877F2] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#166fe0]"><Plus className="h-4 w-4" /> Анхны хариултаа үүсгэх</button>
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                                {rules.map((rule, i) => (
                                    <div key={rule.id} className={`${reveal} group relative overflow-hidden rounded-2xl border bg-card p-4 transition duration-300 hover:-translate-y-1 hover:shadow-lg`} style={{ animationDelay: `${240 + i * 60}ms` }}>
                                        <span className="absolute left-0 top-0 h-full w-1" style={{ background: rule.is_active ? '#1877F2' : 'var(--border)' }} />
                                        <div className="flex items-start justify-between pl-1">
                                            <button onClick={() => setEditing(rule)} className="flex-1 text-left">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-semibold">{rule.name}</span>
                                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{MATCH_LABEL[rule.match_type]}</span>
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {rule.match_type !== 'any' && rule.keywords.slice(0, 4).map(k => <span key={k} className="rounded-md bg-[#1877F2]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#1877F2]">{k}</span>)}
                                                </div>
                                            </button>
                                            <button onClick={() => toggle(rule)} title={rule.is_active ? 'Идэвхтэй' : 'Идэвхгүй'} className={`relative h-6 w-11 shrink-0 rounded-full transition ${rule.is_active ? 'bg-[#1877F2]' : 'bg-muted-foreground/30'}`}>
                                                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${rule.is_active ? 'left-[22px]' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-[11px] text-muted-foreground">
                                            <div className="flex items-center gap-3">
                                                {rule.public_reply && <span className="flex items-center gap-1"><Reply className="h-3 w-3" /> Ил хариу</span>}
                                                {(rule.dm_template || rule.dm_flow_id) && <span className="flex items-center gap-1 text-violet-500"><Send className="h-3 w-3" /> Хувийн зурвас</span>}
                                                <span className="rounded-full bg-muted px-1.5 py-0.5">{rule.matched_count} удаа ажилласан</span>
                                            </div>
                                            <button onClick={() => del(rule)} className="rounded-lg p-1 text-red-500 opacity-0 transition hover:bg-red-500/10 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
