import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, ImageIcon, Loader2, Megaphone, Send, Users, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Broadcast {
    id: number; name: string; text: string | null; image_url: string | null; status: string;
    total: number; sent_count: number; failed_count: number; created_at: string | null;
}
interface Props { broadcasts: Broadcast[]; tags: string[]; total_contacts: number; }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Маркетинг (Broadcast)', href: '/admin/social/broadcasts' },
];

function timeAgo(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('mn-MN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function statusBadge(s: string): { label: string; cls: string } {
    return ({
        draft: { label: 'Ноорог', cls: 'bg-muted text-muted-foreground' },
        sending: { label: 'Илгээж байна…', cls: 'bg-amber-500/15 text-amber-600' },
        done: { label: 'Дууссан', cls: 'bg-emerald-500/15 text-emerald-600' },
        failed: { label: 'Алдаа', cls: 'bg-red-500/15 text-red-600' },
    } as Record<string, { label: string; cls: string }>)[s] ?? { label: s, cls: 'bg-muted' };
}

/* ─── Сегмент сонгогч (chip toggle) ──────────────────────────────────── */
function Seg({ opts, val, set }: { opts: [string, string][]; val: string; set: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {opts.map(([k, lbl]) => (
                <button key={k} onClick={() => set(k)} className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${val === k ? 'border-[#1664db] bg-blue-500/10 text-[#1664db]' : 'text-muted-foreground hover:bg-muted'}`}>{lbl}</button>
            ))}
        </div>
    );
}

const TEXT_MAX = 1800;

export default function Broadcast({ broadcasts: initial, tags, total_contacts }: Props) {
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>(initial);
    const [name, setName] = useState('');
    const [text, setText] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [btnLabel, setBtnLabel] = useState('');
    const [btnUrl, setBtnUrl] = useState('');
    const [channel, setChannel] = useState<'all' | 'messenger' | 'instagram'>('all');
    const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
    const [audience, setAudience] = useState<'all' | 'new' | 'returning'>('all');
    const [tag, setTag] = useState('');
    const [onlyReachable, setOnlyReachable] = useState(false);
    const [aud, setAud] = useState<{ total: number; reachable: number } | null>(null);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const imgInput = useRef<HTMLInputElement>(null);

    const filters = useCallback(() => ({ channel, gender, audience, tag, only_reachable: onlyReachable }), [channel, gender, audience, tag, onlyReachable]);

    // Сегмент өөрчлөгдөхөд хүрэх тоог дахин тооцоо.
    useEffect(() => {
        const t = setTimeout(() => {
            axios.post('/admin/social/broadcasts/audience', filters()).then(r => setAud(r.data)).catch(() => setAud(null));
        }, 250);
        return () => clearTimeout(t);
    }, [filters]);

    function upload(file: File) {
        const fd = new FormData(); fd.append('image', file);
        setUploading(true); setError(null);
        axios.post('/admin/social/broadcasts/image', fd)
            .then(r => setImageUrl(r.data.url))
            .catch(() => setError('Зураг оруулж чадсангүй.'))
            .finally(() => setUploading(false));
    }

    function submit() {
        if (sending) return;
        if (!name.trim() || !text.trim()) { setError('Нэр болон текст шаардлагатай.'); return; }
        if (!window.confirm(`"${name}" broadcast-ийг ${aud?.total ?? 0} хүнд илгээх үү? (24ц хүрэх боломжтой: ${aud?.reachable ?? 0})`)) return;
        setSending(true); setError(null);
        axios.post('/admin/social/broadcasts', {
            name: name.trim(), text: text.trim(), image_url: imageUrl, button_label: btnLabel.trim() || null, button_url: btnUrl.trim() || null,
            ...filters(),
        })
            .then(r => {
                setBroadcasts(prev => [r.data.broadcast, ...prev]);
                setName(''); setText(''); setImageUrl(null); setBtnLabel(''); setBtnUrl('');
            })
            .catch(err => setError(err.response?.data?.error || 'Илгээж чадсангүй.'))
            .finally(() => setSending(false));
    }

    // Илгээж буй broadcast-уудын статусыг 4 сек тутам шинэчилнэ (ref-ээр — interval нэг л удаа үүснэ).
    const broadcastsRef = useRef(broadcasts);
    useEffect(() => { broadcastsRef.current = broadcasts; }, [broadcasts]);
    useEffect(() => {
        const iv = setInterval(() => {
            const sending = broadcastsRef.current.filter(b => b.status === 'sending');
            if (sending.length === 0) return;
            sending.forEach(b => {
                axios.get(`/admin/social/broadcasts/${b.id}`).then(r => setBroadcasts(prev => prev.map(x => x.id === b.id ? r.data.broadcast : x))).catch(() => { /* noop */ });
            });
        }, 4000);
        return () => clearInterval(iv);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Маркетинг Broadcast" />
            <div className="font-warm grid gap-4 p-4 lg:grid-cols-3">
                {/* Зохиох */}
                <div className="space-y-3 lg:col-span-2">
                    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Megaphone className="h-4 w-4 text-[#1664db]" /> Шинэ broadcast</div>

                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Нэр (дотоод)</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Жишээ: 6-р сарын урамшуулал" className="mb-3 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-[#3b8bf7]" />

                        <div className="mb-1 flex items-center justify-between">
                            <label className="block text-xs font-medium text-muted-foreground">Мессеж текст</label>
                            <span className={`text-[11px] tabular-nums ${text.length > TEXT_MAX ? 'text-red-500' : 'text-muted-foreground'}`}>{text.length}/{TEXT_MAX}</span>
                        </div>
                        <textarea value={text} onChange={e => setText(e.target.value)} maxLength={TEXT_MAX} rows={4} placeholder="Сайн байна уу! Энэ сарын онцгой урамшуулал…" className="mb-3 w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-[#3b8bf7]" />

                        {/* Зураг */}
                        <div className="mb-3">
                            {imageUrl ? (
                                <div className="relative inline-block">
                                    <img src={imageUrl} alt="" className="max-h-40 rounded-lg border" />
                                    <button onClick={() => setImageUrl(null)} className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"><X className="h-3 w-3" /></button>
                                </div>
                            ) : (
                                <button onClick={() => imgInput.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground transition hover:bg-muted disabled:opacity-50">
                                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />} Зураг нэмэх (сонголт)
                                </button>
                            )}
                            <input ref={imgInput} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
                        </div>

                        {/* CTA товч */}
                        <div className="mb-1 grid grid-cols-2 gap-2">
                            <input value={btnLabel} onChange={e => setBtnLabel(e.target.value)} placeholder="Товчны нэр (сонголт)" className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-[#3b8bf7]" />
                            <input value={btnUrl} onChange={e => setBtnUrl(e.target.value)} placeholder="https://холбоос" className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-[#3b8bf7]" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">CTA товч Facebook дээр товч болж, Instagram дээр текстэн холбоос болж харагдана.</p>
                    </div>

                    {/* Сегмент */}
                    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-[#1664db]" /> Хэнд илгээх (сегмент)</div>
                        <div className="space-y-3">
                            <div><div className="mb-1 text-xs text-muted-foreground">Суваг</div><Seg opts={[['all', 'Бүгд'], ['messenger', 'Facebook'], ['instagram', 'Instagram']]} val={channel} set={v => setChannel(v as typeof channel)} /></div>
                            <div><div className="mb-1 text-xs text-muted-foreground">Хүйс</div><Seg opts={[['all', 'Бүгд'], ['male', '♂ Эрэгтэй'], ['female', '♀ Эмэгтэй']]} val={gender} set={v => setGender(v as typeof gender)} /></div>
                            <div><div className="mb-1 text-xs text-muted-foreground">Үйлчлүүлэгч</div><Seg opts={[['all', 'Бүгд'], ['new', 'Шинэ (7 хоног)'], ['returning', 'Буцаж ирсэн']]} val={audience} set={v => setAudience(v as typeof audience)} /></div>
                            {tags.length > 0 && (
                                <div>
                                    <div className="mb-1 text-xs text-muted-foreground">Тэмдэг</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <button onClick={() => setTag('')} className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${tag === '' ? 'border-[#1664db] bg-blue-500/10 text-[#1664db]' : 'text-muted-foreground hover:bg-muted'}`}>Бүгд</button>
                                        {tags.map(t => (
                                            <button key={t} onClick={() => setTag(t)} className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${tag === t ? 'border-[#1664db] bg-blue-500/10 text-[#1664db]' : 'text-muted-foreground hover:bg-muted'}`}>{t}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <label className="flex items-center gap-2 text-xs">
                                <input type="checkbox" checked={onlyReachable} onChange={e => setOnlyReachable(e.target.checked)} />
                                Зөвхөн 24ц цонх нээлттэй хүмүүст (зөвхөн хүрэх боломжтой)
                            </label>
                        </div>

                        {/* Хүрэх тоо */}
                        <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5">
                            <div className="text-xs">
                                <div>Сонгосон: <b className="tabular-nums">{aud?.total ?? '…'}</b> хүн</div>
                                <div className="text-emerald-600">Одоо хүрэх боломжтой (24ц): <b className="tabular-nums">{aud?.reachable ?? '…'}</b></div>
                            </div>
                            <button onClick={submit} disabled={sending || !name.trim() || !text.trim() || aud?.total === 0} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#3b8bf7] to-[#1664db] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/30 transition hover:brightness-110 active:scale-95 disabled:opacity-50">
                                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Илгээх
                            </button>
                        </div>

                        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            Meta дүрмээр сурталчилгааны мессеж зөвхөн сүүлийн 24 цагт бичсэн хүмүүст хүрнэ. Цонх хаалттай хүмүүст хүрэхгүй (алдаа гэж бүртгэгдэнэ).
                        </div>
                        {error && <div className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</div>}
                    </div>
                </div>

                {/* Түүх */}
                <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4 text-[#1664db]" /> Түүх</div>
                    {broadcasts.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">Broadcast алга</div>
                    ) : (
                        <div className="social-scroll max-h-[70vh] space-y-2 overflow-y-auto">
                            {broadcasts.map(b => {
                                const sb = statusBadge(b.status);
                                const pct = b.total > 0 ? Math.round(((b.sent_count + b.failed_count) / b.total) * 100) : 0;
                                return (
                                    <div key={b.id} className="rounded-xl border border-border/60 p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-medium">{b.name}</span>
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${sb.cls}`}>{sb.label}</span>
                                        </div>
                                        {b.text && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{b.text}</div>}
                                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                            <span>📤 {b.sent_count} · ❌ {b.failed_count} / {b.total}</span>
                                            <span>{timeAgo(b.created_at)}</span>
                                        </div>
                                        {b.status === 'sending' && (
                                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                                                <div className="h-full rounded-full bg-gradient-to-r from-[#3b8bf7] to-[#1664db] transition-all" style={{ width: `${pct}%` }} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="mt-3 text-[11px] text-muted-foreground">Нийт контакт: {total_contacts.toLocaleString('mn-MN')}</div>
                </div>
            </div>
        </AppLayout>
    );
}
