import MyLayout from '@/layouts/my-layout';
import { NotificationBell } from '@/components/notification-bell';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
    MessageSquare, Plus, Send, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const RED  = '#dc2626';
const RED2 = '#b91c1c';
const RED3 = '#7f1d1d';
const ORG  = '#ea580c';

interface Employee { full_name: string; position: string | null; photo_url: string | null; initials: string; }
interface Feedback {
    id: number;
    type: string; type_label: string;
    subject: string; body: string;
    status: string; status_label: string;
    admin_response: string | null;
    reviewed_by: string | null; reviewed_at: string | null;
    created_at: string;
}
interface PageProps {
    employee: Employee | null;
    feedbacks: Feedback[];
    flash?: { success?: string; error?: string };
    [key: string]: unknown;
}

const TYPE_CFG = {
    suggestion: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Санал' },
    request:    { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Хүсэлт' },
    complaint:  { color: RED,       bg: '#fff5f5', border: '#fecaca', label: 'Гомдол' },
} as const;

const STATUS_CFG = {
    pending:  { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'Хүлээгдэж' },
    reviewed: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Хянагдсан' },
    resolved: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Шийдвэрлэсэн' },
    rejected: { color: RED,       bg: '#fff5f5', border: '#fecaca', label: 'Татгалзсан' },
} as const;

export default function MyFeedback() {
    const { employee, feedbacks, flash } = usePage<PageProps>().props;

    const [toast,     setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [showForm,  setShowForm]  = useState(false);
    const [expanded,  setExpanded]  = useState<number | null>(null);

    const form = useForm({ type: 'suggestion' as 'suggestion' | 'request' | 'complaint', subject: '', body: '' });

    useEffect(() => { const t = setInterval(() => router.reload({ only: ['feedbacks'] }), 15_000); return () => clearInterval(t); }, []);
    useEffect(() => {
        if (flash?.success) setToast({ msg: flash.success, type: 'success' });
        if (flash?.error)   setToast({ msg: flash.error,   type: 'error' });
    }, [flash]);
    useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.post('/my/feedback', { onSuccess: () => { setShowForm(false); form.reset(); } });
    }

    const pending  = feedbacks.filter(f => f.status === 'pending').length;
    const resolved = feedbacks.filter(f => f.status === 'resolved').length;

    /* ══════════════════════════ RENDER ══════════════════════════ */
    return (
        <MyLayout breadcrumbs={[{ title: 'Санал хүсэлт', href: '/my/feedback' }]}>
            <Head title="Санал хүсэлт" />

            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 60, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 14, background: toast.type === 'success' ? '#16a34a' : RED, color: 'white', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                    {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    {toast.msg}
                    <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, marginLeft: 4 }}><X size={13} color="white" /></button>
                </div>
            )}

            {/* ═══════════════════ MOBILE ═══════════════════ */}
            <div className="md:hidden print:hidden" style={{ flex: 1, background: 'var(--my-page-bg)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' } as React.CSSProperties}>
                <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

                {/* ─── RED HERO ─── */}
                <div style={{ background: `linear-gradient(160deg, #ef4444 0%, ${RED} 30%, ${RED2} 65%, ${RED3} 100%)`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -70, right: -70, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: 40, right: 40, pointerEvents: 'none' }} />

                    {/* Top bar */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 0', gap: 10, position: 'relative' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, flex: 1, letterSpacing: 0.3 }}>HR · САНАЛ ХҮСЭЛТ</span>
                        <NotificationBell variant="ghost" />
                        <Link href="/my/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {employee?.photo_url
                                    ? <img src={employee.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                                    : <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{employee?.initials ?? '?'}</span>
                                }
                            </div>
                        </Link>
                    </div>

                    {/* Title */}
                    <div style={{ padding: '14px 18px 18px', position: 'relative' }}>
                        <h1 style={{ margin: '0 0 5px', lineHeight: 1.1, letterSpacing: -0.8 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>Санал </span>
                            <span style={{ fontSize: 28, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontFamily: 'Georgia, "Times New Roman", serif' }}>хүсэлт</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 16px', fontWeight: 500 }}>
                            {employee?.full_name ?? '—'}{employee?.position ? ` · ${employee.position}` : ''}
                        </p>

                        {/* Glassmorphism stats */}
                        <div style={{ borderRadius: 20, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(12px)', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.12)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fdba74' }} />
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: 0.8 }}>ХҮСЭЛТҮҮД</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[
                                    { val: feedbacks.length, label: 'Нийт',          dot: 'rgba(255,255,255,0.4)' },
                                    { val: pending,          label: 'Хүлээгдэж',      dot: '#fbbf24' },
                                    { val: resolved,         label: 'Шийдвэрлэсэн',   dot: '#4ade80' },
                                ].map(({ val, label, dot }, i) => (
                                    <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 8px', textAlign: 'center' }}>
                                        <p style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{val}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 5 }}>
                                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
                                            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 600 }}>{label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* New feedback button */}
                        <button onClick={() => setShowForm(true)} style={{ marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 16, padding: '13px 0', fontSize: 14, fontWeight: 800, color: 'white', cursor: 'pointer' }}>
                            <Plus size={18} /> Шинэ хүсэлт илгээх
                        </button>
                    </div>
                </div>

                {/* ─── CONTENT ─── */}
                <div style={{ padding: '14px 14px 32px' }}>

                    {feedbacks.length === 0 ? (
                        <div style={{ background: 'var(--my-card-bg)', borderRadius: 22, padding: '52px 20px', textAlign: 'center', boxShadow: 'var(--my-shadow)' }}>
                            <div style={{ width: 64, height: 64, borderRadius: 20, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                                <MessageSquare size={28} color={ORG} />
                            </div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-muted)', margin: '0 0 4px' }}>Санал хүсэлт байхгүй</p>
                            <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: '0 0 18px' }}>HR хэсэгт санал, хүсэлт, гомдол илгээх</p>
                            <button onClick={() => setShowForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: `linear-gradient(135deg, ${ORG}, ${RED})`, borderRadius: 14, padding: '12px 22px', fontSize: 13, fontWeight: 800, color: 'white', border: 'none', cursor: 'pointer' }}>
                                <Plus size={15} /> Шинэ илгээх
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {feedbacks.map(f => {
                                const tCfg = TYPE_CFG[f.type as keyof typeof TYPE_CFG] ?? TYPE_CFG.suggestion;
                                const sCfg = STATUS_CFG[f.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
                                const isOpen = expanded === f.id;

                                return (
                                    <div key={f.id} style={{ background: 'var(--my-card-bg)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--my-shadow)', borderLeft: `4px solid ${sCfg.color}` }}>
                                        {/* Card header — tap to expand */}
                                        <button onClick={() => setExpanded(isOpen ? null : f.id)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 14px 14px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                                            {/* Type icon */}
                                            <div style={{ width: 44, height: 44, borderRadius: 14, background: tCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${tCfg.border}` }}>
                                                <MessageSquare size={20} color={tCfg.color} />
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                {/* Badges */}
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                                                    <span style={{ fontSize: 10, fontWeight: 800, color: tCfg.color, background: tCfg.bg, borderRadius: 99, padding: '3px 9px', border: `1px solid ${tCfg.border}` }}>
                                                        {tCfg.label}
                                                    </span>
                                                    <span style={{ fontSize: 10, fontWeight: 800, color: sCfg.color, background: sCfg.bg, borderRadius: 99, padding: '3px 9px', border: `1px solid ${sCfg.border}` }}>
                                                        {sCfg.label}
                                                    </span>
                                                    {f.status === 'pending' && (
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', alignSelf: 'center', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                                    )}
                                                </div>
                                                {/* Subject */}
                                                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--my-input-text)', margin: '0 0 3px', lineHeight: 1.35 }}>{f.subject}</p>
                                                <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: 0 }}>{f.created_at}</p>
                                            </div>

                                            <div style={{ flexShrink: 0, marginTop: 2 }}>
                                                {isOpen
                                                    ? <ChevronUp size={18} color="#bbb" />
                                                    : <ChevronDown size={18} color="#bbb" />
                                                }
                                            </div>
                                        </button>

                                        {/* Expanded body */}
                                        {isOpen && (
                                            <div style={{ borderTop: '1px solid var(--my-divider)', padding: '14px 14px' }}>
                                                {/* Body */}
                                                <div style={{ background: 'var(--my-pill-bg)', borderRadius: 14, padding: '12px 14px', marginBottom: f.admin_response ? 10 : 0 }}>
                                                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', letterSpacing: 1, margin: '0 0 6px' }}>АГУУЛГА</p>
                                                    <p style={{ fontSize: 13, color: 'var(--my-muted)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{f.body}</p>
                                                </div>

                                                {/* Admin response */}
                                                {f.admin_response && (
                                                    <div style={{ background: sCfg.bg, borderRadius: 14, padding: '12px 14px', border: `1px solid ${sCfg.border}` }}>
                                                        <p style={{ fontSize: 10, fontWeight: 700, color: sCfg.color, letterSpacing: 1, margin: '0 0 6px' }}>
                                                            HR ХАРИУ{f.reviewed_by ? ` · ${f.reviewed_by}` : ''}{f.reviewed_at ? ` · ${f.reviewed_at}` : ''}
                                                        </p>
                                                        <p style={{ fontSize: 13, color: 'var(--my-text)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{f.admin_response}</p>
                                                    </div>
                                                )}

                                                {/* Pending waiting label */}
                                                {f.status === 'pending' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                                        <p style={{ fontSize: 12, color: '#d97706', fontWeight: 600, margin: 0 }}>HR хянаж байна...</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════ DESKTOP ═══════════════════ */}
            <div className="hidden md:block p-4 md:p-6 space-y-5 print:hidden">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <MessageSquare className="size-5 text-orange-600" /> Санал хүсэлт
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">HR хэсэгт санал, хүсэлт, гомдол илгээх</p>
                    </div>
                    <button onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                        <Plus className="size-4" /> Шинэ илгээх
                    </button>
                </div>

                {feedbacks.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <MessageSquare className="size-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">Санал хүсэлт байхгүй байна</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {feedbacks.map(f => {
                            const tCfg = TYPE_CFG[f.type as keyof typeof TYPE_CFG] ?? TYPE_CFG.suggestion;
                            const sCfg = STATUS_CFG[f.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
                            return (
                                <div key={f.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                                    <button className="w-full text-left px-4 py-4 flex items-start gap-3"
                                        onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                                <span style={{ fontSize: 10, fontWeight: 700, color: tCfg.color, background: tCfg.bg, borderRadius: 99, padding: '2px 8px', border: `1px solid ${tCfg.border}` }}>{tCfg.label}</span>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: sCfg.color, background: sCfg.bg, borderRadius: 99, padding: '2px 8px', border: `1px solid ${sCfg.border}` }}>{sCfg.label}</span>
                                                <span className="text-[10px] text-muted-foreground">{f.created_at}</span>
                                            </div>
                                            <p className="text-sm font-semibold text-foreground">{f.subject}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{f.body}</p>
                                        </div>
                                        {expanded === f.id ? <ChevronUp className="size-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="size-4 text-muted-foreground shrink-0 mt-1" />}
                                    </button>
                                    {expanded === f.id && (
                                        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1">Агуулга</p>
                                                <p className="text-sm text-foreground whitespace-pre-wrap">{f.body}</p>
                                            </div>
                                            {f.admin_response && (
                                                <div style={{ background: sCfg.bg, borderRadius: 12, padding: '10px 14px', border: `1px solid ${sCfg.border}` }}>
                                                    <p className="text-xs font-semibold mb-1" style={{ color: sCfg.color }}>
                                                        HR хариу{f.reviewed_by ? ` · ${f.reviewed_by}` : ''}{f.reviewed_at ? ` · ${f.reviewed_at}` : ''}
                                                    </p>
                                                    <p className="text-sm text-foreground whitespace-pre-wrap">{f.admin_response}</p>
                                                </div>
                                            )}
                                            {f.status === 'pending' && (
                                                <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                                    <span className="size-1.5 rounded-full bg-yellow-500 animate-pulse inline-block" />
                                                    HR хянаж байна...
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── Form bottom sheet ─── */}
            {showForm && (
                <div onClick={() => { setShowForm(false); form.reset(); }} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: 'var(--my-sheet-bg)', borderRadius: '26px 26px 0 0', maxHeight: '92vh', overflowY: 'auto', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 24px)' }}>
                        {/* Handle */}
                        <div style={{ width: 36, height: 4, background: '#d1d5db', borderRadius: 99, margin: '14px auto 0' }} />

                        {/* Sheet header */}
                        <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--my-text)', margin: 0 }}>Хүсэлт илгээх</p>
                                <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0' }}>HR хэсэгт шууд хүрнэ</p>
                            </div>
                            <button onClick={() => { setShowForm(false); form.reset(); }} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f4f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={15} color="#888" />
                            </button>
                        </div>

                        <form onSubmit={submit} style={{ padding: '4px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

                            {/* Type selector */}
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--my-faint)', letterSpacing: 1, margin: '0 0 8px' }}>ТӨРӨЛ</p>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {([
                                        { value: 'suggestion' as const, label: 'Санал',  cfg: TYPE_CFG.suggestion },
                                        { value: 'request'    as const, label: 'Хүсэлт', cfg: TYPE_CFG.request },
                                        { value: 'complaint'  as const, label: 'Гомдол', cfg: TYPE_CFG.complaint },
                                    ]).map(({ value, label, cfg }) => {
                                        const active = form.data.type === value;
                                        return (
                                            <button key={value} type="button" onClick={() => form.setData('type', value)} style={{
                                                flex: 1, padding: '10px 0', borderRadius: 14, fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
                                                background: active ? cfg.bg : '#f4f4f6',
                                                color: active ? cfg.color : '#aaa',
                                                border: active ? `2px solid ${cfg.border}` : '2px solid transparent',
                                            }}>
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Subject */}
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--my-faint)', letterSpacing: 1, margin: '0 0 8px' }}>ГАРЧИГ *</p>
                                <input
                                    value={form.data.subject}
                                    onChange={e => form.setData('subject', e.target.value)}
                                    placeholder="Товч гарчиг..." required maxLength={200}
                                    style={{ width: '100%', borderRadius: 16, border: '1.5px solid #e5e7eb', background: 'var(--my-pill-bg)', color: 'var(--my-input-text)', padding: '13px 16px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties}
                                />
                                {form.errors.subject && <p style={{ fontSize: 12, color: RED, margin: '4px 0 0' }}>{form.errors.subject}</p>}
                            </div>

                            {/* Body */}
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--my-faint)', letterSpacing: 1, margin: '0 0 8px' }}>АГУУЛГА *</p>
                                <textarea
                                    value={form.data.body}
                                    onChange={e => form.setData('body', e.target.value)}
                                    placeholder="Дэлгэрэнгүй бичнэ үү..." required rows={5} maxLength={3000}
                                    style={{ width: '100%', borderRadius: 16, border: '1.5px solid #e5e7eb', background: 'var(--my-pill-bg)', color: 'var(--my-input-text)', padding: '13px 16px', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties}
                                />
                                <p style={{ fontSize: 10, color: '#ccc', textAlign: 'right', margin: '3px 0 0' }}>{form.data.body.length}/3000</p>
                                {form.errors.body && <p style={{ fontSize: 12, color: RED, margin: '4px 0 0' }}>{form.errors.body}</p>}
                            </div>

                            {/* Submit */}
                            <button type="submit" disabled={form.processing || !form.data.subject || !form.data.body}
                                style={{ width: '100%', background: `linear-gradient(135deg, ${ORG}, ${RED})`, color: 'white', borderRadius: 16, padding: '15px 0', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer', opacity: form.processing || !form.data.subject || !form.data.body ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 6px 20px ${ORG}55` }}>
                                {form.processing
                                    ? <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                                    : <Send size={16} />
                                }
                                Илгээх
                            </button>

                            <button type="button" onClick={() => { setShowForm(false); form.reset(); }}
                                style={{ width: '100%', background: 'var(--my-card-bg)', color: 'var(--my-muted)', borderRadius: 16, padding: '13px 0', fontSize: 15, fontWeight: 600, border: '1.5px solid var(--my-divider)', cursor: 'pointer' }}>
                                Болих
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </MyLayout>
    );
}
