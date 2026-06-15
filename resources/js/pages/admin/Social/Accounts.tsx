import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle, CheckCircle2, Copy, Facebook, Instagram, Link2, Plug, RefreshCw, Trash2, Webhook, XCircle, Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface SocialAccount {
    id: number; page_id: string; page_name: string; ig_id: string | null; ig_username: string | null;
    avatar: string | null; is_active: boolean; webhook_subscribed: boolean; connected_at: string | null;
}
interface Props { accounts: SocialAccount[]; configured: boolean; webhook_url: string; callback_url: string; }
interface PageProps { flash?: { success?: string; error?: string }; [key: string]: unknown; }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Админ', href: '/admin/dashboard' },
    { title: 'Social Bot', href: '/admin/social/accounts' },
];
const reveal = 'animate-in fade-in-0 slide-in-from-bottom-3 duration-500 fill-mode-both';

/* ─── Copyable field ─────────────────────────────────────────────────────── */
function CopyField({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
            <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg border bg-muted/50 px-3 py-2 text-xs">{value}</code>
                <button type="button" onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-2 text-xs transition hover:bg-accent active:scale-95">
                    {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}{copied ? 'Хуулсан' : 'Хуулах'}
                </button>
            </div>
        </div>
    );
}

function Stat({ label, value, hint, color, delay }: { label: string; value: number; hint: string; color: string; delay: number }) {
    return (
        <div className={`${reveal} rounded-2xl border bg-card p-5 transition hover:shadow-sm`} style={{ animationDelay: `${delay}ms` }}>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: color }} /> {label}</div>
            <div className="mt-1.5 text-3xl font-bold tracking-tight">{value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Accounts({ accounts, configured, webhook_url, callback_url }: Props) {
    const { flash } = usePage<PageProps>().props;
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    useEffect(() => {
        if (flash?.success) setNotice({ type: 'success', text: flash.success });
        else if (flash?.error) setNotice({ type: 'error', text: flash.error });
    }, [flash]);

    const igCount = accounts.filter(a => a.ig_username).length;
    const liveCount = accounts.filter(a => a.webhook_subscribed).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Social Bot — Холболт" />
            <div className="font-warm w-full space-y-6 p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className={`${reveal} flex flex-wrap items-end justify-between gap-4`}>
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-card shadow-sm">
                            <div className="flex -space-x-1.5"><Facebook className="h-5 w-5 text-[#1877F2]" /><Instagram className="h-5 w-5 text-pink-500" /></div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Social Bot холболт</h1>
                            <p className="mt-0.5 text-sm text-muted-foreground">Facebook Page болон Instagram-аа холбож автомат хариулт идэвхжүүлнэ.</p>
                        </div>
                    </div>
                    <a href={configured ? '/admin/social/connect' : undefined}
                        className={`group inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-sm transition hover:opacity-90 active:scale-[0.98] ${configured ? '' : 'pointer-events-none opacity-50'}`}>
                        <Facebook className="h-4 w-4 transition group-hover:scale-110" /> Хуудас холбох
                    </a>
                </div>

                {notice && (
                    <div className={`${reveal} flex items-start gap-2 rounded-xl border p-3 text-sm ${notice.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' : 'border-red-500/30 bg-red-500/10 text-red-600'}`}>
                        {notice.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}<span>{notice.text}</span>
                    </div>
                )}
                {!configured && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span><strong>META_APP_ID / META_APP_SECRET тохируулаагүй.</strong> <code>.env</code>-д оруулаад <code>php artisan config:clear</code> ажиллуулна уу.</span>
                    </div>
                )}

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Stat label="Холбосон хуудас" value={accounts.length} hint="Facebook Page" color="#1877F2" delay={60} />
                    <Stat label="Instagram" value={igCount} hint="холбосон IG" color="#EC4899" delay={120} />
                    <Stat label="Webhook" value={liveCount} hint="идэвхтэй холболт" color="#10B981" delay={180} />
                </div>

                {/* Connected accounts */}
                <div className={reveal} style={{ animationDelay: '220ms' }}>
                    <h2 className="mb-3 text-sm font-semibold text-muted-foreground">ХОЛБОСОН ХУУДСУУД</h2>
                    {accounts.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card p-16 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted"><Plug className="h-8 w-8 text-muted-foreground" /></div>
                            <p className="text-sm text-muted-foreground">Одоогоор холбосон хуудас алга.</p>
                            <a href={configured ? '/admin/social/connect' : undefined} className={`inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 ${configured ? '' : 'pointer-events-none opacity-50'}`}><Facebook className="h-4 w-4" /> Эхний хуудсаа холбох</a>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {accounts.map((a, i) => (
                                <div key={a.id} className={`${reveal} group rounded-2xl border bg-card p-5 transition duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-xl`} style={{ animationDelay: `${260 + i * 60}ms` }}>
                                    <div className="flex items-start gap-3">
                                        <div className="relative">
                                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-muted ring-2 ring-transparent transition group-hover:ring-foreground/10">
                                                {a.avatar ? <img src={a.avatar} alt="" className="h-full w-full object-cover" /> : <Facebook className="h-6 w-6 text-[#1877F2]" />}
                                            </div>
                                            <span className="absolute -bottom-1 -right-1 rounded-full bg-card p-0.5 shadow-sm"><Facebook className="h-4 w-4 text-[#1877F2]" /></span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-semibold leading-tight">{a.page_name}</div>
                                            <div className="mt-0.5 text-[11px] text-muted-foreground">ID: {a.page_id}</div>
                                        </div>
                                        <button onClick={() => { if (confirm(`"${a.page_name}" хуудсыг салгах уу?`)) router.delete(`/admin/social/accounts/${a.id}`); }}
                                            title="Салгах" className="rounded-lg p-1.5 text-red-500 opacity-0 transition hover:bg-red-500/10 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {a.ig_username
                                            ? <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/10 px-2.5 py-1 text-xs font-medium text-pink-600"><Instagram className="h-3.5 w-3.5" /> @{a.ig_username}</span>
                                            : <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"><Instagram className="h-3.5 w-3.5" /> IG алга</span>}
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${a.webhook_subscribed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                            {a.webhook_subscribed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {a.webhook_subscribed ? 'Идэвхтэй' : 'Идэвхгүй'}
                                        </span>
                                    </div>

                                    <button onClick={() => router.post(`/admin/social/accounts/${a.id}/resubscribe`)} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-xs transition hover:bg-accent active:scale-[0.98]"><RefreshCw className="h-3.5 w-3.5 transition group-hover:rotate-180" /> Webhook дахин холбох</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Meta config */}
                <div className={`${reveal} space-y-3 rounded-2xl border bg-card p-5 sm:p-6`} style={{ animationDelay: '320ms' }}>
                    <div className="flex items-center gap-2 text-sm font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted"><Link2 className="h-4 w-4" /></span> Meta App тохиргоонд хуулах</div>
                    <p className="text-xs text-muted-foreground">developers.facebook.com → таны App → <span className="text-foreground">Facebook Login</span>-д Redirect URI, <span className="text-foreground">Webhooks</span>-д Callback URL + Verify Token оруулна.</p>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="flex items-start gap-2"><Webhook className="mt-6 h-4 w-4 shrink-0 text-muted-foreground" /><div className="flex-1"><CopyField label="Webhook Callback URL" value={webhook_url} /></div></div>
                        <div className="flex items-start gap-2"><Zap className="mt-6 h-4 w-4 shrink-0 text-muted-foreground" /><div className="flex-1"><CopyField label="OAuth Redirect URI" value={callback_url} /></div></div>
                    </div>
                    <p className="text-xs text-muted-foreground">Verify Token нь <code>.env</code>-ийн <code>META_VERIFY_TOKEN</code>-тэй яг ижил байх ёстой.</p>
                </div>
            </div>
        </AppLayout>
    );
}
