import PatientLayout from '@/layouts/patient-layout';
import SignaturePad, { type SignaturePadRef } from '@/components/signature-pad';
import { NotificationBell } from '@/components/notification-bell';
import { useIsMobile } from '@/hooks/use-mobile';
import { Head, router, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import {
    AlertCircle, CheckCircle2, Clock, PenLine,
    X, ShieldCheck, Eraser, Loader2,
} from 'lucide-react';
import axios from 'axios';
import { useEffect, useRef, useState, type FormEvent } from 'react';

/* ── Types ── */
interface OrthoVisitRow {
    id: number;
    visit_date: string | null;
    doctor_name: string | null;
    data: Record<string, unknown>;
}
interface Patient { id: number; patient_number: string; last_name: string; first_name: string; }
interface Props {
    patient: Patient | null;
    pending: OrthoVisitRow[];
    signed: OrthoVisitRow[];
    generalPending: OrthoVisitRow[];
    generalSigned: OrthoVisitRow[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Үйлчлүүлэгчийн портал', href: '/patient/dashboard' },
    { title: 'Гажиг заслын гарын үсэг', href: '/patient/ortho-signatures' },
];

const HERO_GRADIENT = 'linear-gradient(155deg, #7c3aed 0%, #8b5cf6 45%, #0891b2 100%)';
const BTN_GRADIENT  = 'linear-gradient(135deg, #7c3aed, #0891b2)';
const SIGN_GRADIENT = 'linear-gradient(135deg, #059669, #0891b2)';

function fmtDate(s: string | null) {
    if (!s) return '';
    return new Date(s).toLocaleDateString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ══════════════════════════════════════════════════════
   SIGNING MODAL
══════════════════════════════════════════════════════ */
function SignModal({ visit, kind, patient, onClose, onSigned }: {
    visit: OrthoVisitRow;
    kind: 'ortho' | 'general';
    patient: Patient | null;
    onClose: () => void;
    onSigned: (id: number, kind: 'ortho' | 'general') => void;
}) {
    const [processing, setProcessing] = useState(false);
    const [hasDrawn,   setHasDrawn]   = useState(false);
    const [signerName, setSignerName] = useState(
        `${patient?.last_name ?? ''} ${patient?.first_name ?? ''}`.trim()
    );
    const [formError, setFormError] = useState('');
    const sigRef = useRef<SignaturePadRef>(null);

    function clearSig() { sigRef.current?.clear(); setHasDrawn(false); setFormError(''); }

    function submit(e: FormEvent) {
        e.preventDefault();
        if (sigRef.current?.isEmpty()) { setFormError('Гарын үсэг зурна уу'); return; }
        const sig = sigRef.current?.toDataURL() ?? '';
        if (!sig || sig === 'data:,') { setFormError('Гарын үсэг зурна уу'); return; }
        setFormError('');
        setProcessing(true);
        const route = kind === 'ortho'
            ? `/patient/ortho-signatures/${visit.id}/sign`
            : `/patient/general-signatures/${visit.id}/sign`;
        router.post(route, {
            signer_name: signerName,
            patient_signature: sig,
        }, {
            onSuccess: () => { onSigned(visit.id, kind); onClose(); },
            onError:   (errs) => { setFormError(Object.values(errs)[0] as string ?? 'Алдаа гарлаа'); setProcessing(false); },
            onFinish:  () => setProcessing(false),
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 w-full sm:max-w-lg flex flex-col max-h-[96svh] rounded-t-3xl sm:rounded-2xl bg-card shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-600 px-5 pt-5 pb-4">
                    <div className="pointer-events-none absolute -right-6 -top-6 size-32 rounded-full bg-white/10" />
                    <div className="pointer-events-none absolute right-10 bottom-0 size-16 rounded-full bg-black/10" />
                    <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <span className="inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white">{kind === 'ortho' ? 'Гажиг заслын эмчилгээний явц' : 'Ерөнхий эмчилгээний үзлэг'}</span>
                            <h3 className="mt-1.5 text-base font-bold text-white leading-snug">Үзлэгийн тэмдэглэл</h3>
                            {visit.visit_date && <p className="mt-0.5 text-xs text-white/70">{fmtDate(visit.visit_date)}</p>}
                            {visit.doctor_name && <p className="text-xs text-white/60">Эмч: {visit.doctor_name}</p>}
                        </div>
                        <button onClick={onClose} className="shrink-0 flex size-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={submit} className="flex-1 overflow-y-auto flex flex-col">
                    <div className="flex-1 px-5 py-5 space-y-4">
                        <div>
                            <label className="text-sm font-semibold text-foreground">Гарын үсэг зурагчийн нэр</label>
                            <input type="text" value={signerName} onChange={e => setSignerName(e.target.value)}
                                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow" />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-semibold text-foreground">Гарын үсэг <span className="text-red-500">*</span></label>
                                <button type="button" onClick={clearSig} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors">
                                    <Eraser className="size-3.5" />Арилгах
                                </button>
                            </div>
                            <div className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
                                hasDrawn ? 'border-2 border-violet-500 shadow-md shadow-violet-500/10' : 'border-2 border-dashed border-muted-foreground/25'
                            } bg-white dark:bg-zinc-900`}>
                                <SignaturePad ref={sigRef} height={190} onBegin={() => { setHasDrawn(true); setFormError(''); }} />
                                {!hasDrawn && (
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
                                        <PenLine className="size-7 text-muted-foreground/20" />
                                        <p className="text-xs text-muted-foreground/40">Энд гарын үсгээ зурна уу</p>
                                    </div>
                                )}
                            </div>
                            <div className="mt-2 h-5 flex items-center justify-center">
                                {hasDrawn && !formError && (
                                    <p className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400">
                                        <CheckCircle2 className="size-3.5" />Гарын үсэг зурагдлаа
                                    </p>
                                )}
                            </div>
                        </div>

                        {formError && (
                            <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 px-4 py-3">
                                <AlertCircle className="size-4 shrink-0 text-red-500" />
                                <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
                            </div>
                        )}
                    </div>

                    <div className="sticky bottom-0 px-5 pb-6 pt-3 bg-card border-t border-border">
                        <button type="submit" disabled={processing}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 py-3.5 text-sm font-bold text-white shadow-md hover:opacity-90 disabled:opacity-60 transition-all active:scale-[0.98]">
                            {processing
                                ? <><Loader2 className="size-4 animate-spin" />Хадгалж байна...</>
                                : <><ShieldCheck className="size-4" />Гарын үсэг баталгаажуулах</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════
   MOBILE CARD — хүлээгдэж буй
══════════════════════════════════════════════════════ */
function MobilePendingCard({ visit, idx, label, accent, btnGradient, onSign }: {
    visit: OrthoVisitRow; idx: number; label: string; accent: string; btnGradient: string; onSign: () => void;
}) {
    return (
        <div style={{
            background: 'var(--my-card-bg)', borderRadius: 20, overflow: 'hidden',
            boxShadow: `0 4px 20px ${accent}22`,
            border: `1.5px solid ${accent}30`,
        }}>
            <div style={{ height: 3, background: btnGradient }} />
            <div style={{ padding: '14px 14px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 12, background: btnGradient, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 3px 10px ${accent}60`,
                    }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{idx + 1}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-text)', margin: '0 0 2px', lineHeight: 1.3 }}>{label}</p>
                        {visit.doctor_name && <p style={{ fontSize: 11, color: 'var(--my-muted)', margin: 0 }}>Эмч: {visit.doctor_name}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: `${accent}1a`, borderRadius: 999, padding: '3px 9px', flexShrink: 0 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, display: 'inline-block' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: accent }}>Хүлээгдэж буй</span>
                    </div>
                </div>
                {visit.visit_date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: `${accent}12`, borderRadius: 10, padding: '8px 11px', marginBottom: 12 }}>
                        <Clock style={{ width: 13, height: 13, color: accent, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: accent }}>{fmtDate(visit.visit_date)}</span>
                    </div>
                )}
                <button onClick={onSign} style={{
                    width: '100%', background: btnGradient, border: 'none', borderRadius: 12,
                    padding: '12px', color: '#fff', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: `0 4px 14px ${accent}66`,
                }}>
                    <PenLine style={{ width: 15, height: 15 }} />Гарын үсэг зурах
                </button>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════
   MOBILE CARD — баталгаажсан
══════════════════════════════════════════════════════ */
function MobileSignedCard({ visit, label, accentGradient }: { visit: OrthoVisitRow; label: string; accentGradient: string; }) {
    const d = visit.data as Record<string, string>;
    return (
        <div style={{
            background: 'var(--my-card-bg)', borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid var(--my-divider)',
        }}>
            <div style={{ height: 3, background: accentGradient }} />
            <div style={{ padding: '14px 14px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 12, background: accentGradient, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 3px 10px rgba(5,150,105,0.3)',
                    }}>
                        <CheckCircle2 style={{ width: 17, height: 17, color: '#fff' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-text)', margin: '0 0 2px', lineHeight: 1.3 }}>{label}</p>
                        {visit.doctor_name && <p style={{ fontSize: 11, color: 'var(--my-muted)', margin: 0 }}>Эмч: {visit.doctor_name}</p>}
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(5,150,105,0.1)', borderRadius: 999, padding: '3px 9px', flexShrink: 0 }}>
                        <CheckCircle2 style={{ width: 10, height: 10, color: '#059669' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#059669' }}>Зурсан</span>
                    </span>
                </div>
                {visit.visit_date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(8,145,178,0.07)', borderRadius: 10, padding: '8px 11px', marginBottom: d.patient_signature ? 10 : 0 }}>
                        <Clock style={{ width: 13, height: 13, color: '#0891b2', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0891b2' }}>{fmtDate(visit.visit_date)}</span>
                        {d.patient_signer_name && <span style={{ fontSize: 11, color: 'var(--my-muted)', marginLeft: 'auto' }}>{d.patient_signer_name}</span>}
                    </div>
                )}
                {d.patient_signature && (
                    <div style={{ height: 48, borderRadius: 12, border: '1px solid var(--my-divider)', background: 'var(--my-page-bg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={d.patient_signature} alt="Гарын үсэг" style={{ maxHeight: 44, maxWidth: '100%', objectFit: 'contain', opacity: 0.8 }} />
                    </div>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════
   MOBILE SECTION HEADER
══════════════════════════════════════════════════════ */
function MobileSectionHeader({ gradient, shadow, title, sub, icon }: {
    gradient: string; shadow: string; title: string; sub: string; icon: 'alert' | 'shield';
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
                width: 32, height: 32, borderRadius: 10, background: gradient, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 3px 10px ${shadow}`,
            }}>
                {icon === 'alert'
                    ? <AlertCircle style={{ width: 15, height: 15, color: '#fff' }} />
                    : <ShieldCheck style={{ width: 15, height: 15, color: '#fff' }} />
                }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--my-text)', margin: 0, lineHeight: 1.3 }}>{title}</p>
                <p style={{ fontSize: 10, color: 'var(--my-muted)', margin: 0 }}>{sub}</p>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════
   MOBILE MAIN
══════════════════════════════════════════════════════ */
function MobileOrthoSignatures({ patient, pending, signed, generalPending, generalSigned, onSign, flash }: {
    patient: Patient | null;
    pending: OrthoVisitRow[];
    signed: OrthoVisitRow[];
    generalPending: OrthoVisitRow[];
    generalSigned: OrthoVisitRow[];
    onSign: (v: OrthoVisitRow, kind: 'ortho' | 'general') => void;
    flash?: { success?: string };
}) {
    const total      = pending.length + signed.length + generalPending.length + generalSigned.length;
    const totalSigned= signed.length + generalSigned.length;
    const pct        = total > 0 ? Math.round((totalSigned / total) * 100) : 0;
    const R          = 28;
    const circ       = 2 * Math.PI * R;
    const dashOffset = circ * (1 - pct / 100);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--my-page-bg)' }}>

            {/* ── Hero ── */}
            <div style={{ background: HERO_GRADIENT, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: -30, bottom: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', right: 50, bottom: -15, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

                {/* Notification bell */}
                <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 2 }}>
                    <NotificationBell variant="ghost" />
                </div>

                {/* Hero body */}
                <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <svg style={{ transform: 'rotate(-90deg)' }} width="72" height="72" viewBox="0 0 72 72">
                            <circle cx="36" cy="36" r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
                            <circle cx="36" cy="36" r={R} fill="none" stroke="white" strokeWidth="5"
                                strokeDasharray={circ} strokeDashoffset={dashOffset}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{pct}%</span>
                        </div>
                    </div>
                    <div>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: '0 0 2px', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>Гажиг заслын явц</p>
                        <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.15 }}>
                            {totalSigned}<span style={{ fontSize: 15, fontWeight: 500, opacity: 0.7 }}>/{total} баталгаажсан</span>
                        </p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '3px 0 0', fontWeight: 400 }}>
                            {(pending.length + generalPending.length) > 0 ? `${pending.length + generalPending.length} үзлэг хүлээгдэж байна` : total > 0 ? 'Бүх үзлэг баталгаажсан ✓' : 'Үзлэг байхгүй'}
                        </p>
                    </div>
                </div>

                <div style={{ padding: '12px 20px 32px', display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
                    {pending.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '5px 13px', border: '1px solid rgba(255,255,255,0.25)' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block', boxShadow: '0 0 0 3px rgba(255,255,255,0.3)' }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{pending.length} хүлээгдэж буй</span>
                        </div>
                    )}
                    {signed.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 999, padding: '5px 13px', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <CheckCircle2 style={{ width: 13, height: 13, color: '#fff' }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{signed.length} баталгаажсан</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Summary tiles */}
            <div style={{ margin: '-28px 16px 14px', position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                    { label: 'Нийт',          value: total,                                    color: '#0891b2' },
                    { label: 'Хүлээгдэж буй', value: pending.length + generalPending.length,   color: '#7c3aed' },
                    { label: 'Баталгаажсан',  value: totalSigned,                              color: '#059669' },
                ].map(t => (
                    <div key={t.label} style={{ background: 'var(--my-card-bg)', borderRadius: 16, padding: '12px 8px', textAlign: 'center', boxShadow: '0 2px 14px rgba(0,0,0,0.09)', border: '1px solid var(--my-divider)' }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: t.color, margin: 0, lineHeight: 1 }}>{t.value}</p>
                        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--my-muted)', margin: '4px 0 0', lineHeight: 1.2 }}>{t.label}</p>
                    </div>
                ))}
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' }}>

                {flash?.success && (
                    <div style={{ margin: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 14, padding: '12px 16px' }}>
                        <CheckCircle2 style={{ width: 16, height: 16, color: '#7c3aed', flexShrink: 0 }} />
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed', margin: 0 }}>{flash.success}</p>
                    </div>
                )}

                {/* Pending — гажиг засал */}
                {pending.length > 0 && (
                    <div style={{ margin: '0 16px 16px' }}>
                        <MobileSectionHeader gradient={BTN_GRADIENT} shadow="rgba(124,58,237,0.3)" title="Гажиг засал — гарын үсэг шаардлагатай" sub={`${pending.length} үзлэг`} icon="alert" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {pending.map((v, i) => <MobilePendingCard key={v.id} visit={v} idx={i} label="Гажиг заслын эмчилгээний явц" accent="#7c3aed" btnGradient={BTN_GRADIENT} onSign={() => onSign(v, 'ortho')} />)}
                        </div>
                    </div>
                )}

                {/* Pending — ерөнхий эмчилгээ */}
                {generalPending.length > 0 && (
                    <div style={{ margin: '0 16px 16px' }}>
                        <MobileSectionHeader gradient="linear-gradient(135deg,#2563eb,#0891b2)" shadow="rgba(37,99,235,0.3)" title="Ерөнхий эмчилгээ — гарын үсэг шаардлагатай" sub={`${generalPending.length} үзлэг`} icon="alert" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {generalPending.map((v, i) => <MobilePendingCard key={v.id} visit={v} idx={i} label="Ерөнхий эмчилгээний үзлэг" accent="#2563eb" btnGradient="linear-gradient(135deg,#2563eb,#0891b2)" onSign={() => onSign(v, 'general')} />)}
                        </div>
                    </div>
                )}

                {/* Signed — гажиг засал */}
                {signed.length > 0 && (
                    <div style={{ margin: '0 16px 16px' }}>
                        <MobileSectionHeader gradient={SIGN_GRADIENT} shadow="rgba(5,150,105,0.3)" title="Гажиг засал — баталгаажсан" sub={`${signed.length} үзлэг`} icon="shield" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {signed.map(v => <MobileSignedCard key={v.id} visit={v} label="Гажиг заслын эмчилгээний явц" accentGradient={SIGN_GRADIENT} />)}
                        </div>
                    </div>
                )}

                {/* Signed — ерөнхий эмчилгээ */}
                {generalSigned.length > 0 && (
                    <div style={{ margin: '0 16px 16px' }}>
                        <MobileSectionHeader gradient="linear-gradient(135deg,#2563eb,#0891b2)" shadow="rgba(37,99,235,0.3)" title="Ерөнхий эмчилгээ — баталгаажсан" sub={`${generalSigned.length} үзлэг`} icon="shield" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {generalSigned.map(v => <MobileSignedCard key={v.id} visit={v} label="Ерөнхий эмчилгээний үзлэг" accentGradient="linear-gradient(135deg,#2563eb,#0891b2)" />)}
                        </div>
                    </div>
                )}

                {/* Empty */}
                {total === 0 && (
                    <div style={{ margin: '8px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--my-card-bg)', borderRadius: 20, padding: '48px 24px', textAlign: 'center', border: '1px solid var(--my-divider)' }}>
                        <div style={{ width: 76, height: 76, borderRadius: 24, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                            <ShieldCheck style={{ width: 34, height: 34, color: '#7c3aed' }} />
                        </div>
                        <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--my-text)', margin: '0 0 8px' }}>Гарын үсэг хүлээгдэхгүй байна</p>
                        <p style={{ fontSize: 13, color: 'var(--my-muted)', margin: 0, lineHeight: 1.6, maxWidth: 260 }}>
                            Эмч үзлэгийн тэмдэглэл бэлтгэж гарын үсэг хүссэний дараа энд харагдана.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════ */
type ModalInfo = { visit: OrthoVisitRow; kind: 'ortho' | 'general' };

export default function PatientOrthoSignatures({ patient, pending: initPending, signed: initSigned, generalPending: initGP, generalSigned: initGS }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const isMobile  = useIsMobile();

    const [pending,        setPending]        = useState<OrthoVisitRow[]>(initPending);
    const [signed,         setSigned]         = useState<OrthoVisitRow[]>(initSigned);
    const [generalPending, setGeneralPending] = useState<OrthoVisitRow[]>(initGP);
    const [generalSigned,  setGeneralSigned]  = useState<OrthoVisitRow[]>(initGS);
    const [modal,          setModal]          = useState<ModalInfo | null>(null);

    /* 15-second poll */
    useEffect(() => {
        const poll = () => {
            axios.get('/patient/ortho-signatures/poll')
                .then(res => {
                    setPending(res.data.pending ?? []);
                    setSigned(res.data.signed ?? []);
                    setGeneralPending(res.data.generalPending ?? []);
                    setGeneralSigned(res.data.generalSigned ?? []);
                })
                .catch(() => {});
        };
        const id = setInterval(poll, 15000);
        return () => clearInterval(id);
    }, []);

    /* Optimistic update after signing */
    function handleSigned(visitId: number, kind: 'ortho' | 'general') {
        const now = new Date().toISOString();
        if (kind === 'ortho') {
            const v = pending.find(v => v.id === visitId);
            setPending(prev => prev.filter(v => v.id !== visitId));
            if (v) setSigned(prev => [{ ...v, data: { ...v.data, patient_signed_at: now } }, ...prev]);
        } else {
            const v = generalPending.find(v => v.id === visitId);
            setGeneralPending(prev => prev.filter(v => v.id !== visitId));
            if (v) setGeneralSigned(prev => [{ ...v, data: { ...v.data, patient_signed_at: now } }, ...prev]);
        }
    }

    const total = pending.length + signed.length + generalPending.length + generalSigned.length;
    const pct   = total > 0 ? Math.round(((signed.length + generalSigned.length) / total) * 100) : 0;
    const R     = 28;
    const circ  = 2 * Math.PI * R;
    const offset= circ * (1 - pct / 100);

    return (
        <PatientLayout breadcrumbs={isMobile ? [] : breadcrumbs}>
            <Head title="Гажиг заслын гарын үсэг" />

            {/* Mobile */}
            {isMobile ? (
                <MobileOrthoSignatures
                    patient={patient}
                    pending={pending}
                    signed={signed}
                    generalPending={generalPending}
                    generalSigned={generalSigned}
                    onSign={(v, kind) => setModal({ visit: v, kind })}
                    flash={props.flash}
                />
            ) : (
                /* Desktop */
                <>
                    {/* Hero */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-cyan-600 px-6 pt-8 pb-16">
                        <div className="pointer-events-none absolute -right-10 -top-10 size-52 rounded-full bg-white/10" />
                        <div className="pointer-events-none absolute -left-6 bottom-0 size-36 rounded-full bg-black/10" />
                        <div className="relative flex items-center gap-5">
                            <div className="relative shrink-0">
                                <svg className="-rotate-90" width="72" height="72" viewBox="0 0 72 72">
                                    <circle cx="36" cy="36" r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                                    <circle cx="36" cy="36" r={R} fill="none" stroke="white" strokeWidth="4"
                                        strokeDasharray={circ} strokeDashoffset={offset}
                                        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-sm font-bold text-white">{pct}%</span>
                                </div>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-white/60">Үйлчлүүлэгчийн портал</p>
                                <h1 className="text-xl font-bold text-white leading-tight">Гажиг заслын гарын үсэг</h1>
                                <p className="mt-1 text-sm text-white/70">{signed.length + generalSigned.length}/{total} үзлэг баталгаажсан</p>
                            </div>
                        </div>
                        <div className="relative mt-5 flex flex-wrap gap-2">
                            {(pending.length + generalPending.length) > 0 && (
                                <div className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25">
                                    <span className="relative flex size-2">
                                        <span className="animate-ping absolute inline-flex size-full rounded-full bg-white opacity-75" />
                                        <span className="relative inline-flex size-2 rounded-full bg-white" />
                                    </span>
                                    {pending.length + generalPending.length} үзлэг хүлээгдэж байна
                                </div>
                            )}
                        </div>
                    </div>

                    {props.flash?.success && (
                        <div className="relative z-10 mx-4 md:mx-6 -mt-4 flex items-center gap-3 rounded-2xl border border-violet-500/30 bg-violet-50 dark:bg-violet-950/30 px-4 py-3 shadow-lg">
                            <CheckCircle2 className="size-4 shrink-0 text-violet-600" />
                            <p className="text-sm font-semibold text-violet-700 dark:text-violet-400">{props.flash.success}</p>
                        </div>
                    )}

                    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">

                        {pending.length > 0 && (
                            <div className="rounded-2xl overflow-hidden border-2 border-violet-400/70 dark:border-violet-600/40 shadow-md shadow-violet-500/10">
                                <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50/80 dark:from-violet-950/30 dark:to-purple-950/20 border-b border-violet-200/60 dark:border-violet-800/30">
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 text-white shadow-md">
                                        <AlertCircle className="size-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-violet-900 dark:text-violet-100">Гажиг засал — гарын үсэг шаардлагатай</p>
                                        <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">{pending.length} үзлэгийн тэмдэглэл баталгаажуулна уу</p>
                                    </div>
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-sm font-bold shadow">{pending.length}</span>
                                </div>
                                <div className="bg-card divide-y divide-violet-100/80 dark:divide-violet-900/20">
                                    {pending.map((v, idx) => (
                                        <div key={v.id} className="flex items-center gap-4 px-5 py-4 hover:bg-violet-50/60 dark:hover:bg-violet-950/10 transition-colors">
                                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-violet-400 text-xs font-bold text-violet-600">{idx + 1}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-foreground">Гажиг заслын эмчилгээний явц</p>
                                                <div className="mt-0.5 flex items-center gap-3 flex-wrap">
                                                    {v.visit_date && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{fmtDate(v.visit_date)}</span>}
                                                    {v.doctor_name && <span className="text-xs text-muted-foreground">{v.doctor_name}</span>}
                                                </div>
                                            </div>
                                            <button onClick={() => setModal({ visit: v, kind: 'ortho' })}
                                                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:opacity-90 text-white px-4 py-2 text-xs font-bold shadow-sm transition-all active:scale-95">
                                                <PenLine className="size-3.5" />Зурах
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {generalPending.length > 0 && (
                            <div className="rounded-2xl overflow-hidden border-2 border-blue-400/70 dark:border-blue-600/40 shadow-md shadow-blue-500/10">
                                <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-50 to-cyan-50/80 dark:from-blue-950/30 dark:to-cyan-950/20 border-b border-blue-200/60 dark:border-blue-800/30">
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-md">
                                        <AlertCircle className="size-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-blue-900 dark:text-blue-100">Ерөнхий эмчилгээ — гарын үсэг шаардлагатай</p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{generalPending.length} үзлэгийн тэмдэглэл баталгаажуулна уу</p>
                                    </div>
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold shadow">{generalPending.length}</span>
                                </div>
                                <div className="bg-card divide-y divide-blue-100/80 dark:divide-blue-900/20">
                                    {generalPending.map((v, idx) => (
                                        <div key={v.id} className="flex items-center gap-4 px-5 py-4 hover:bg-blue-50/60 dark:hover:bg-blue-950/10 transition-colors">
                                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-blue-400 text-xs font-bold text-blue-600">{idx + 1}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-foreground">Ерөнхий эмчилгээний үзлэг</p>
                                                <div className="mt-0.5 flex items-center gap-3 flex-wrap">
                                                    {v.visit_date && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{fmtDate(v.visit_date)}</span>}
                                                    {v.doctor_name && <span className="text-xs text-muted-foreground">{v.doctor_name}</span>}
                                                </div>
                                            </div>
                                            <button onClick={() => setModal({ visit: v, kind: 'general' })}
                                                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white px-4 py-2 text-xs font-bold shadow-sm transition-all active:scale-95">
                                                <PenLine className="size-3.5" />Зурах
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {signed.length > 0 && (
                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 text-white shadow-sm">
                                        <ShieldCheck className="size-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-foreground">Гажиг засал — баталгаажсан</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{signed.length} үзлэг гарын үсгээр баталгаажсан</p>
                                    </div>
                                </div>
                                <div className="p-4 grid gap-3 sm:grid-cols-2">
                                    {signed.map(v => {
                                        const d = v.data as Record<string, string>;
                                        return (
                                            <div key={v.id} className="relative rounded-xl border overflow-hidden p-4 bg-violet-50 dark:bg-violet-950/20">
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600 text-white shadow-sm">
                                                        <ShieldCheck className="size-3.5" />
                                                    </div>
                                                    <span className="flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[10px] font-bold shadow-sm">
                                                        <CheckCircle2 className="size-3" />Зурсан
                                                    </span>
                                                </div>
                                                <p className="text-sm font-semibold text-foreground mb-2">Гажиг заслын эмчилгээний явц</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {v.visit_date && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="size-3" />{fmtDate(v.visit_date)}</span>}
                                                    {v.doctor_name && <span className="text-[11px] text-muted-foreground">{v.doctor_name}</span>}
                                                </div>
                                                {d.patient_signature && (
                                                    <div className="mt-3 h-10 rounded-lg border border-border/50 bg-white dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
                                                        <img src={d.patient_signature} alt="Гарын үсэг" className="max-h-9 max-w-full object-contain opacity-70" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {generalSigned.length > 0 && (
                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-sm">
                                        <ShieldCheck className="size-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-foreground">Ерөнхий эмчилгээ — баталгаажсан</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{generalSigned.length} үзлэг гарын үсгээр баталгаажсан</p>
                                    </div>
                                </div>
                                <div className="p-4 grid gap-3 sm:grid-cols-2">
                                    {generalSigned.map(v => {
                                        const d = v.data as Record<string, string>;
                                        return (
                                            <div key={v.id} className="relative rounded-xl border overflow-hidden p-4 bg-blue-50 dark:bg-blue-950/20">
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-sm">
                                                        <ShieldCheck className="size-3.5" />
                                                    </div>
                                                    <span className="flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[10px] font-bold shadow-sm">
                                                        <CheckCircle2 className="size-3" />Зурсан
                                                    </span>
                                                </div>
                                                <p className="text-sm font-semibold text-foreground mb-2">Ерөнхий эмчилгээний үзлэг</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {v.visit_date && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="size-3" />{fmtDate(v.visit_date)}</span>}
                                                    {v.doctor_name && <span className="text-[11px] text-muted-foreground">{v.doctor_name}</span>}
                                                </div>
                                                {d.patient_signature && (
                                                    <div className="mt-3 h-10 rounded-lg border border-border/50 bg-white dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
                                                        <img src={d.patient_signature} alt="Гарын үсэг" className="max-h-9 max-w-full object-contain opacity-70" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {total === 0 && (
                            <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center shadow-sm gap-6">
                                <div className="flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-950/30 dark:to-purple-950/30">
                                    <ShieldCheck className="size-11 text-violet-500" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-foreground">Гарын үсэг хүлээгдэхгүй байна</p>
                                    <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">
                                        Эмч үзлэгийн тэмдэглэл бэлтгэж гарын үсэг хүссэний дараа энд харагдана.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Signing modal */}
            {modal && (
                <SignModal
                    visit={modal.visit}
                    kind={modal.kind}
                    patient={patient}
                    onClose={() => setModal(null)}
                    onSigned={handleSigned}
                />
            )}
        </PatientLayout>
    );
}
