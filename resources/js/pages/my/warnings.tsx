import MyLayout from '@/layouts/my-layout';
import { NotificationBell } from '@/components/notification-bell';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
    Shield, ShieldAlert, X,
} from 'lucide-react';
import { useState, useEffect, FormEvent } from 'react';

const RED  = '#dc2626';
const RED2 = '#b91c1c';
const RED3 = '#7f1d1d';

interface Employee { full_name: string; position: string | null; photo_url: string | null; initials: string; }
interface Warning {
    id: number;
    type: string; type_label: string;
    severity: string; severity_label: string;
    title: string; description: string;
    incident_date: string;
    action: string; action_label: string;
    action_detail: string | null;
    status: string; status_label: string;
    employee_response: string | null;
    acknowledged_at: string | null;
    issued_by: string | null;
    created_at: string;
}
interface PageProps {
    employee: Employee | null;
    warnings: Warning[];
    flash?: { success?: string; error?: string };
    [key: string]: unknown;
}

const SEV_CFG = {
    low:    { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Бага' },
    medium: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Дунд' },
    high:   { color: RED,       bg: '#fff5f5', border: '#fecaca', label: 'Өндөр' },
} as const;

export default function MyWarnings() {
    const { employee, warnings, flash } = usePage<PageProps>().props;

    const [toast,    setToast]    = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [ackModal, setAckModal] = useState<Warning | null>(null);

    const { data, setData, patch, processing, reset } = useForm({ employee_response: '' });

    useEffect(() => { const t = setInterval(() => router.reload({ only: ['warnings'] }), 15_000); return () => clearInterval(t); }, []);
    useEffect(() => {
        if (flash?.success) setToast({ msg: flash.success, type: 'success' });
        if (flash?.error)   setToast({ msg: flash.error,   type: 'error' });
    }, [flash]);
    useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);

    function handleAcknowledge(e: FormEvent) {
        e.preventDefault();
        if (!ackModal) return;
        patch(`/my/warnings/${ackModal.id}/acknowledge`, {
            preserveScroll: true,
            onSuccess: () => { reset(); setAckModal(null); },
        });
    }

    const unread     = warnings.filter(w => w.status === 'sent').length;
    const ackCount   = warnings.filter(w => w.status === 'acknowledged').length;

    /* ══════════════════════════ RENDER ══════════════════════════ */
    return (
        <MyLayout breadcrumbs={[{ title: 'Сануулга / Зөрчил', href: '/my/warnings' }]}>
            <Head title="Сануулга / Зөрчил" />

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
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, flex: 1, letterSpacing: 0.3 }}>HR · САНУУЛГА / ЗӨРЧИЛ</span>
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
                            <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>Сануулга </span>
                            <span style={{ fontSize: 28, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontFamily: 'Georgia, "Times New Roman", serif' }}>зөрчил</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 16px', fontWeight: 500 }}>
                            {employee?.full_name ?? '—'}{employee?.position ? ` · ${employee.position}` : ''}
                        </p>

                        {/* Glassmorphism stats */}
                        <div style={{ borderRadius: 20, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(12px)', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.12)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fca5a5' }} />
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: 0.8 }}>БҮРТГЭЛ</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[
                                    { val: warnings.length, label: 'Нийт',        dot: 'rgba(255,255,255,0.4)' },
                                    { val: unread,          label: 'Хүлээгдэж',   dot: '#fbbf24' },
                                    { val: ackCount,        label: 'Зөвшөөрсөн',  dot: '#4ade80' },
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
                    </div>
                </div>

                {/* ─── CONTENT ─── */}
                <div style={{ padding: '14px 14px 32px' }}>

                    {warnings.length === 0 ? (
                        <div style={{ background: 'var(--my-card-bg)', borderRadius: 22, padding: '52px 20px', textAlign: 'center', boxShadow: 'var(--my-shadow)' }}>
                            <div style={{ width: 64, height: 64, borderRadius: 20, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                                <Shield size={28} color="#16a34a" />
                            </div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-muted)', margin: '0 0 4px' }}>Сануулга байхгүй</p>
                            <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0 }}>Сайн байлаа! Сануулга зөрчил бүртгэгдээгүй байна</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {warnings.map(w => {
                                const sevCfg   = SEV_CFG[w.severity as keyof typeof SEV_CFG] ?? SEV_CFG.medium;
                                const isViol   = w.type === 'violation';
                                const isAck    = w.status === 'acknowledged';
                                const isOpen   = expanded === w.id;

                                const iconBg    = isViol ? '#fff5f5' : '#fffbeb';
                                const iconBdr   = isViol ? '#fecaca' : '#fde68a';
                                const iconColor = isViol ? RED : '#d97706';

                                return (
                                    <div key={w.id} style={{ background: 'var(--my-card-bg)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--my-shadow)', borderLeft: `4px solid ${sevCfg.color}` }}>

                                        {/* Card header */}
                                        <button onClick={() => setExpanded(isOpen ? null : w.id)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                                            {/* Type icon */}
                                            <div style={{ width: 46, height: 46, borderRadius: 15, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1.5px solid ${iconBdr}` }}>
                                                {isViol
                                                    ? <ShieldAlert size={20} color={iconColor} />
                                                    : <AlertTriangle size={20} color={iconColor} />
                                                }
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                {/* Badges row */}
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                                                    <span style={{ fontSize: 10, fontWeight: 800, color: sevCfg.color, background: sevCfg.bg, borderRadius: 99, padding: '3px 9px', border: `1px solid ${sevCfg.border}` }}>
                                                        {sevCfg.label}
                                                    </span>
                                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#888', background: '#f4f4f6', borderRadius: 99, padding: '3px 9px' }}>
                                                        {w.type_label}
                                                    </span>
                                                </div>
                                                {/* Title */}
                                                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--my-input-text)', margin: '0 0 4px', lineHeight: 1.35 }}>{w.title}</p>
                                                {/* Meta */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: 0 }}>{w.incident_date}</p>
                                                    {isAck
                                                        ? <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>✓ Зөвшөөрсөн</span>
                                                        : <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', animation: 'pulse 1.5s ease-in-out infinite' }}>● Хүлээгдэж</span>
                                                    }
                                                </div>
                                            </div>

                                            <div style={{ flexShrink: 0, marginTop: 2 }}>
                                                {isOpen ? <ChevronUp size={18} color="#bbb" /> : <ChevronDown size={18} color="#bbb" />}
                                            </div>
                                        </button>

                                        {/* Expanded section */}
                                        {isOpen && (
                                            <div style={{ borderTop: '1px solid var(--my-divider)', padding: '14px 14px' }}>

                                                {/* Info grid */}
                                                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                                    <div style={{ flex: 1, background: 'var(--my-pill-bg)', borderRadius: 13, padding: '10px 12px' }}>
                                                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', letterSpacing: 1, margin: '0 0 4px' }}>АРГА ХЭМЖЭЭ</p>
                                                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-text)', margin: 0 }}>{w.action_label}</p>
                                                    </div>
                                                    <div style={{ flex: 1, background: 'var(--my-pill-bg)', borderRadius: 13, padding: '10px 12px' }}>
                                                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', letterSpacing: 1, margin: '0 0 4px' }}>ИЛГЭЭСЭН</p>
                                                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-text)', margin: 0 }}>{w.issued_by ?? '—'}</p>
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                <div style={{ background: 'var(--my-pill-bg)', borderRadius: 14, padding: '12px 14px', marginBottom: w.action_detail ? 10 : 12 }}>
                                                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', letterSpacing: 1, margin: '0 0 6px' }}>ТАЙЛБАР</p>
                                                    <p style={{ fontSize: 13, color: 'var(--my-muted)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{w.description}</p>
                                                </div>

                                                {/* Action detail */}
                                                {w.action_detail && (
                                                    <div style={{ background: '#fff7ed', borderRadius: 14, padding: '12px 14px', marginBottom: 12, border: '1px solid #fed7aa' }}>
                                                        <p style={{ fontSize: 10, fontWeight: 700, color: '#c2410c', letterSpacing: 1, margin: '0 0 6px' }}>АРГА ХЭМЖЭЭНИЙ ДЭЛГЭРЭНГҮЙ</p>
                                                        <p style={{ fontSize: 13, color: '#7c2d12', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{w.action_detail}</p>
                                                    </div>
                                                )}

                                                {/* Acknowledged state */}
                                                {isAck ? (
                                                    <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '12px 14px', border: '1px solid #bbf7d0' }}>
                                                        <p style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', letterSpacing: 1, margin: '0 0 6px' }}>
                                                            ТАНЫ ХАРИУ · {w.acknowledged_at}
                                                        </p>
                                                        <p style={{ fontSize: 13, color: '#14532d', margin: 0, lineHeight: 1.6 }}>{w.employee_response || '—'}</p>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => { setAckModal(w); setData('employee_response', ''); }}
                                                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #16a34a, #15803d)', borderRadius: 16, padding: '14px 0', fontSize: 14, fontWeight: 800, color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(22,163,74,0.3)' }}>
                                                        <CheckCircle2 size={17} /> Хүлээн зөвшөөрөх
                                                    </button>
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
            <div className="hidden md:block p-4 md:p-6 space-y-4 print:hidden">
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <AlertTriangle className="size-5 text-yellow-500" /> Сануулга / Зөрчил
                </h1>

                {warnings.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground">
                        <Shield className="size-10 mx-auto mb-3 opacity-30" />
                        <p>Сануулга байхгүй байна</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {warnings.map(w => {
                            const sevCfg = SEV_CFG[w.severity as keyof typeof SEV_CFG] ?? SEV_CFG.medium;
                            const isViol = w.type === 'violation';
                            const isAck  = w.status === 'acknowledged';
                            return (
                                <div key={w.id} className="rounded-xl border bg-card shadow-sm overflow-hidden"
                                    style={{ borderLeft: `4px solid ${sevCfg.color}` }}>
                                    <button onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                                        className="w-full text-left px-4 py-3 flex items-start gap-3">
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: isViol ? '#fff5f5' : '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${isViol ? '#fecaca' : '#fde68a'}` }}>
                                            {isViol ? <ShieldAlert size={16} color={RED} /> : <AlertTriangle size={16} color="#d97706" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span style={{ fontSize: 10, fontWeight: 700, color: sevCfg.color, background: sevCfg.bg, borderRadius: 99, padding: '2px 8px', border: `1px solid ${sevCfg.border}` }}>{sevCfg.label}</span>
                                                <span className="text-[10px] text-muted-foreground">{w.incident_date}</span>
                                                {isAck
                                                    ? <span className="text-[11px] font-semibold text-emerald-600">✓ Зөвшөөрсөн</span>
                                                    : <span className="text-[11px] font-semibold text-yellow-600 animate-pulse">● Хүлээгдэж</span>
                                                }
                                            </div>
                                            <p className="text-sm font-semibold text-foreground">{w.title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{w.type_label}</p>
                                        </div>
                                        {expanded === w.id ? <ChevronUp className="size-4 text-muted-foreground shrink-0" /> : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
                                    </button>

                                    {expanded === w.id && (
                                        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div><p className="text-[11px] text-muted-foreground mb-0.5">Арга хэмжээ</p><p className="font-medium">{w.action_label}</p></div>
                                                <div><p className="text-[11px] text-muted-foreground mb-0.5">Илгээсэн</p><p className="font-medium">{w.issued_by ?? '—'}</p></div>
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-muted-foreground mb-0.5">Тайлбар</p>
                                                <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/40 p-3">{w.description}</p>
                                            </div>
                                            {w.action_detail && (
                                                <div>
                                                    <p className="text-[11px] text-muted-foreground mb-0.5">Арга хэмжээний дэлгэрэнгүй</p>
                                                    <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/40 p-3">{w.action_detail}</p>
                                                </div>
                                            )}
                                            {isAck ? (
                                                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3">
                                                    <p className="text-[11px] font-semibold text-emerald-700 mb-0.5">Таны хариу · {w.acknowledged_at}</p>
                                                    <p className="text-sm text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap">{w.employee_response || '—'}</p>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setAckModal(w); setData('employee_response', ''); }}
                                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
                                                    <CheckCircle2 className="size-4" /> Хүлээн зөвшөөрөх
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── Acknowledge bottom sheet ─── */}
            {ackModal && (
                <div onClick={() => { setAckModal(null); reset(); }} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--my-sheet-bg)', borderRadius: '26px 26px 0 0', maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 24px)' }}>
                        <div style={{ width: 36, height: 4, background: '#d1d5db', borderRadius: 99, margin: '14px auto 0' }} />

                        {/* Sheet header */}
                        <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--my-text)', margin: 0 }}>Хүлээн зөвшөөрөх</p>
                                <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0' }}>«{ackModal.title}»</p>
                            </div>
                            <button onClick={() => { setAckModal(null); reset(); }} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f4f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={15} color="#888" />
                            </button>
                        </div>

                        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Info box */}
                            <div style={{ background: '#fffbeb', borderRadius: 16, padding: '12px 14px', border: '1px solid #fde68a' }}>
                                <p style={{ fontSize: 13, color: '#78350f', margin: 0, lineHeight: 1.5 }}>
                                    Та энэ {ackModal.type_label}-г хүлээн зөвшөөрч байна. Нэмэлт тайлбар бичих боломжтой.
                                </p>
                            </div>

                            <form onSubmit={handleAcknowledge} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: 1, margin: '0 0 8px' }}>ТАЙЛБАР (заавал биш)</p>
                                    <textarea
                                        value={data.employee_response}
                                        onChange={e => setData('employee_response', e.target.value)}
                                        rows={3}
                                        placeholder="Таны хариу тайлбар..."
                                        style={{ width: '100%', borderRadius: 16, border: '1.5px solid var(--my-divider)', background: 'var(--my-pill-bg)', color: 'var(--my-input-text)', padding: '13px 16px', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties}
                                    />
                                </div>
                                <button type="submit" disabled={processing}
                                    style={{ width: '100%', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', borderRadius: 16, padding: '15px 0', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer', opacity: processing ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(22,163,74,0.3)' }}>
                                    {processing
                                        ? <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                                        : <CheckCircle2 size={17} />
                                    }
                                    Зөвшөөрөх
                                </button>
                                <button type="button" onClick={() => { setAckModal(null); reset(); }}
                                    style={{ width: '100%', background: 'var(--my-card-bg)', color: 'var(--my-muted)', borderRadius: 16, padding: '13px 0', fontSize: 15, fontWeight: 600, border: '1.5px solid var(--my-divider)', cursor: 'pointer' }}>
                                    Болих
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </MyLayout>
    );
}
