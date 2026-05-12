import PatientLayout from '@/layouts/patient-layout';
import SignaturePad, { type SignaturePadRef } from '@/components/signature-pad';
import { NotificationBell } from '@/components/notification-bell';
import { useIsMobile } from '@/hooks/use-mobile';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import {
    AlertCircle, CheckCircle2, Clock, FileText,
    PenLine, X, ShieldCheck, Eraser, Loader2, ArrowRight,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

/* ── Types ── */
interface ConsentForm {
    id: number;
    template_id: number;
    signer_name: string;
    signed_at: string | null;
    patient_signature: string | null;
    template?: { id: number; code: string; category: string; title: string; content: string };
}
interface Patient {
    id: number; patient_number: string;
    last_name: string; first_name: string;
}
interface Props {
    patient: Patient | null;
    pendingForms: ConsentForm[];
    signedForms: ConsentForm[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Үйлчлүүлэгчийн портал', href: '/patient/dashboard' },
    { title: 'Зөвшөөрлийн маягтууд',  href: '/patient/consent-forms' },
];

/* ── Category config ── */
const CAT_LABEL: Record<string, string> = {
    treat: 'Ерөнхий эмчилгээ', endo: 'Сувгийн эмчилгээ',
    ortho: 'Зэр засал', perio: 'Буйлны эмчилгээ',
    prostho: 'Протез', surg: 'Мэс засал', prevent: 'Урьдчилан сэргийлэх',
};
const CAT_COLOR: Record<string, { chip: string; grad: string; light: string }> = {
    treat:   { chip: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400',             grad: 'from-blue-500 to-indigo-600',    light: 'bg-blue-50 dark:bg-blue-950/20' },
    endo:    { chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400',         grad: 'from-amber-500 to-orange-500',   light: 'bg-amber-50 dark:bg-amber-950/20' },
    ortho:   { chip: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-400',   grad: 'from-violet-500 to-purple-600',  light: 'bg-violet-50 dark:bg-violet-950/20' },
    perio:   { chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400', grad: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50 dark:bg-emerald-950/20' },
    prostho: { chip: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-400',   grad: 'from-orange-500 to-rose-500',    light: 'bg-orange-50 dark:bg-orange-950/20' },
    surg:    { chip: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-400',                  grad: 'from-red-500 to-rose-600',       light: 'bg-red-50 dark:bg-red-950/20' },
    prevent: { chip: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-400',             grad: 'from-teal-500 to-cyan-600',      light: 'bg-teal-50 dark:bg-teal-950/20' },
};
const fallbackCat = { chip: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200', grad: 'from-gray-500 to-gray-600', light: 'bg-gray-50' };

function fmtDate(s: string) {
    return new Date(s).toLocaleDateString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric' });
}

type ModalTemplate = NonNullable<ConsentForm['template']>;

/* ── Shared theme ── */
const HERO_GRADIENT = 'linear-gradient(155deg, #059669 0%, #10b981 45%, #0891b2 100%)';
const BTN_GRADIENT  = 'linear-gradient(135deg, #059669, #0891b2)';
const ACCENT        = '#059669';

/* ══════════════════════════════════════════════════════
   SIGNING MODAL  — 2-алхамт
══════════════════════════════════════════════════════ */
function SignModal({ modal, patient, onClose }: {
    modal: ModalTemplate; patient: Patient | null; onClose: () => void;
}) {
    const c = CAT_COLOR[modal.category] ?? fallbackCat;
    const [step,       setStep]       = useState<1 | 2>(1);
    const [hasDrawn,   setHasDrawn]   = useState(false);
    const [processing, setProcessing] = useState(false);
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
        router.post('/patient/consent-forms', {
            template_id: modal.id, signer_name: signerName, patient_signature: sig,
        }, {
            onSuccess: () => onClose(),
            onError:   (errs) => { setFormError(Object.values(errs)[0] as string ?? 'Алдаа гарлаа'); setProcessing(false); },
            onFinish:  () => setProcessing(false),
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 w-full sm:max-w-lg flex flex-col max-h-[96svh] rounded-t-3xl sm:rounded-2xl bg-card shadow-2xl overflow-hidden">

                {/* Gradient header */}
                <div className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${c.grad} px-5 pt-5 pb-4`}>
                    <div className="pointer-events-none absolute -right-6 -top-6 size-32 rounded-full bg-white/10" />
                    <div className="pointer-events-none absolute right-10 bottom-0 size-16 rounded-full bg-black/10" />

                    <div className="relative flex items-start justify-between gap-3 mb-4">
                        <div className="min-w-0">
                            <span className="inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                                {CAT_LABEL[modal.category] ?? modal.category}
                            </span>
                            <h3 className="mt-1.5 text-base font-bold text-white leading-snug">{modal.title}</h3>
                        </div>
                        <button onClick={onClose}
                            className="shrink-0 flex size-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
                            <X className="size-4" />
                        </button>
                    </div>

                    {/* Step indicator */}
                    <div className="relative flex items-center gap-0">
                        {(['1. Уншина уу', '2. Гарын үсэг'] as const).map((label, i) => {
                            const num    = i + 1;
                            const done   = step > num;
                            const active = step === num;
                            return (
                                <div key={label} className="flex items-center">
                                    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                                        done   ? 'bg-white/30 text-white'
                                        : active ? 'bg-white text-gray-800 shadow-sm'
                                               : 'bg-white/10 text-white/50'
                                    }`}>
                                        {done
                                            ? <CheckCircle2 className="size-3" />
                                            : <span className={`size-4 rounded-full flex items-center justify-center text-[10px] font-bold ${active ? 'bg-gray-800 text-white' : 'bg-white/20 text-white'}`}>{num}</span>
                                        }
                                        {label}
                                    </div>
                                    {i === 0 && <div className={`w-6 h-px mx-1 ${step > 1 ? 'bg-white/60' : 'bg-white/20'}`} />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Step 1: Агуулга унших */}
                {step === 1 && (
                    <div className="flex-1 overflow-y-auto flex flex-col">
                        <div className="flex-1 px-5 py-5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Маягтын агуулга</p>
                            <div className="rounded-xl border bg-muted/30 px-4 py-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                {modal.content}
                            </div>
                        </div>
                        <div className="sticky bottom-0 px-5 pb-6 pt-3 bg-card border-t border-border">
                            <button onClick={() => setStep(2)}
                                className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${c.grad} py-3.5 text-sm font-bold text-white shadow-md hover:opacity-90 transition-all active:scale-[0.98]`}>
                                Уншсан, гарын үсэг зурах
                                <ArrowRight className="size-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Гарын үсэг */}
                {step === 2 && (
                    <form onSubmit={submit} className="flex-1 overflow-y-auto flex flex-col">
                        <div className="flex-1 px-5 py-5 space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-foreground">Гарын үсэг зурагчийн нэр</label>
                                <input type="text" value={signerName} onChange={e => setSignerName(e.target.value)}
                                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow" />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-semibold text-foreground">
                                        Гарын үсэг <span className="text-red-500">*</span>
                                    </label>
                                    <button type="button" onClick={clearSig}
                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors">
                                        <Eraser className="size-3.5" />Арилгах
                                    </button>
                                </div>
                                <div className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
                                    hasDrawn
                                        ? 'border-2 border-emerald-500 shadow-md shadow-emerald-500/10'
                                        : 'border-2 border-dashed border-muted-foreground/25'
                                } bg-white dark:bg-zinc-900`}>
                                    <SignaturePad ref={sigRef} height={190}
                                        onBegin={() => { setHasDrawn(true); setFormError(''); }} />
                                    {!hasDrawn && (
                                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
                                            <PenLine className="size-7 text-muted-foreground/20" />
                                            <p className="text-xs text-muted-foreground/40">Энд гарын үсгээ зурна уу</p>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 h-5 flex items-center justify-center">
                                    {hasDrawn && !formError && (
                                        <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
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

                        <div className="sticky bottom-0 px-5 pb-6 pt-3 bg-card border-t border-border space-y-2">
                            <button type="submit" disabled={processing}
                                className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${c.grad} py-3.5 text-sm font-bold text-white shadow-md hover:opacity-90 disabled:opacity-60 transition-all active:scale-[0.98]`}>
                                {processing
                                    ? <><Loader2 className="size-4 animate-spin" />Хадгалж байна...</>
                                    : <><ShieldCheck className="size-4" />Зөвшөөрлийг баталгаажуулах</>}
                            </button>
                            <button type="button" onClick={() => setStep(1)}
                                className="w-full rounded-xl py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                                ← Буцаж унших
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════
   MOBILE CARD — хүлээгдэж буй маягт
══════════════════════════════════════════════════════ */
function MobilePendingCard({ form, tpl, idx, onSign }: {
    form: ConsentForm; tpl: ModalTemplate; idx: number; onSign: () => void;
}) {
    return (
        <div style={{
            background: 'var(--my-card-bg)', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid var(--my-divider)',
            display: 'flex',
        }}>
            <div style={{ width: 4, background: 'linear-gradient(180deg, #f59e0b, #f97316)', flexShrink: 0 }} />
            <div style={{ flex: 1, padding: '13px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Step badge */}
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b' }}>{idx + 1}</span>
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-text)', margin: '0 0 4px', lineHeight: 1.3 }}>{tpl.title}</p>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--my-muted)', background: 'var(--my-pill-bg)', borderRadius: 999, padding: '2px 8px', display: 'inline-block' }}>
                        {CAT_LABEL[tpl.category] ?? tpl.category}
                    </span>
                </div>
                {/* Sign button */}
                <button onClick={onSign} style={{
                    background: 'linear-gradient(135deg, #f59e0b, #f97316)', border: 'none',
                    borderRadius: 12, padding: '8px 13px', color: '#fff', fontSize: 12,
                    fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
                    gap: 5, flexShrink: 0, whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
                }}>
                    <PenLine style={{ width: 12, height: 12 }} />
                    Зурах
                </button>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════
   MOBILE CARD — баталгаажсан маягт
══════════════════════════════════════════════════════ */
function MobileSignedCard({ form, tpl }: { form: ConsentForm; tpl: ModalTemplate }) {
    return (
        <div style={{
            background: 'var(--my-card-bg)', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid var(--my-divider)',
            display: 'flex',
        }}>
            <div style={{ width: 4, background: BTN_GRADIENT, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: '13px 14px 13px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-text)', margin: 0, lineHeight: 1.3, flex: 1 }}>{tpl.title}</p>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#059669', borderRadius: 999, padding: '3px 9px', flexShrink: 0 }}>
                        <CheckCircle2 style={{ width: 11, height: 11, color: '#fff' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>Зурсан</span>
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--my-muted)', background: 'var(--my-pill-bg)', borderRadius: 999, padding: '2px 8px' }}>
                        {CAT_LABEL[tpl.category] ?? tpl.category}
                    </span>
                    {form.signed_at && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--my-muted)' }}>
                            <Clock style={{ width: 11, height: 11 }} />
                            {fmtDate(form.signed_at)}
                        </span>
                    )}
                </div>
                {form.patient_signature && (
                    <div style={{
                        marginTop: 10, height: 38, borderRadius: 10,
                        border: '1px solid var(--my-divider)', background: 'var(--my-page-bg)',
                        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <img src={form.patient_signature} alt="Гарын үсэг"
                            style={{ maxHeight: 34, maxWidth: '100%', objectFit: 'contain', opacity: 0.7 }} />
                    </div>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════
   MOBILE MAIN
══════════════════════════════════════════════════════ */
function MobileConsentForms({ patient, pendingForms, signedForms, onSign, flash }: {
    patient: Patient | null;
    pendingForms: ConsentForm[];
    signedForms: ConsentForm[];
    onSign: (tpl: ModalTemplate) => void;
    flash?: { success?: string };
}) {
    const total      = pendingForms.length + signedForms.length;
    const pct        = total > 0 ? Math.round((signedForms.length / total) * 100) : 0;
    const R          = 26;
    const circ       = 2 * Math.PI * R;
    const dashOffset = circ * (1 - pct / 100);
    const initials   = patient ? `${patient.last_name} ${patient.first_name}`.trim() : 'Х';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--my-page-bg)' }}>

            {/* ── Hero ── */}
            <div style={{ background: HERO_GRADIENT, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: -20, bottom: -20, width: 110, height: 110, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', pointerEvents: 'none' }} />

                {/* Top bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 0', position: 'relative' }}>
                    <Link href="/patient/dashboard" style={{ textDecoration: 'none', flexShrink: 0 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{initials.charAt(0)}</span>
                        </div>
                    </Link>
                    <h1 style={{ flex: 1, fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, textAlign: 'center' }}>Зөвшөөрлүүд</h1>
                    <NotificationBell variant="ghost" />
                </div>

                {/* Hero body */}
                <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
                    {/* Completion ring */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <svg style={{ transform: 'rotate(-90deg)' }} width="68" height="68" viewBox="0 0 68 68">
                            <circle cx="34" cy="34" r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                            <circle cx="34" cy="34" r={R} fill="none" stroke="white" strokeWidth="4"
                                strokeDasharray={circ} strokeDashoffset={dashOffset}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{pct}%</span>
                        </div>
                    </div>

                    <div>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: '0 0 3px', fontWeight: 500 }}>Зөвшөөрлийн маягтууд</p>
                        <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                            {signedForms.length}/{total} баталгаажсан
                        </p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '3px 0 0', fontWeight: 400 }}>
                            {pendingForms.length > 0
                                ? `${pendingForms.length} маягт хүлээгдэж байна`
                                : total > 0 ? 'Бүх маягт баталгаажсан' : 'Маягт байхгүй'}
                        </p>
                    </div>
                </div>

                {/* Stat chips */}
                <div style={{ padding: '12px 20px 32px', display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
                    {pendingForms.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '5px 13px', border: '1px solid rgba(255,255,255,0.25)' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block', boxShadow: '0 0 0 3px rgba(255,255,255,0.3)' }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{pendingForms.length} хүлээгдэж буй</span>
                        </div>
                    )}
                    {signedForms.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 999, padding: '5px 13px', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <CheckCircle2 style={{ width: 13, height: 13, color: '#fff' }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{signedForms.length} баталгаажсан</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Summary tiles */}
            <div style={{ margin: '-28px 16px 14px', position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                    { label: 'Нийт',          value: total,                color: '#0891b2' },
                    { label: 'Хүлээгдэж буй', value: pendingForms.length,  color: '#f59e0b' },
                    { label: 'Баталгаажсан',  value: signedForms.length,   color: '#059669' },
                ].map(tile => (
                    <div key={tile.label} style={{ background: 'var(--my-card-bg)', borderRadius: 16, padding: '12px 8px', textAlign: 'center', boxShadow: '0 2px 14px rgba(0,0,0,0.09)', border: '1px solid var(--my-divider)' }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color: tile.color, margin: 0, lineHeight: 1 }}>{tile.value}</p>
                        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--my-muted)', margin: '4px 0 0', lineHeight: 1.2 }}>{tile.label}</p>
                    </div>
                ))}
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' }}>

                {/* Flash */}
                {flash?.success && (
                    <div style={{ margin: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 14, padding: '12px 16px' }}>
                        <CheckCircle2 style={{ width: 16, height: 16, color: '#10b981', flexShrink: 0 }} />
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#059669', margin: 0 }}>{flash.success}</p>
                    </div>
                )}

                {/* Pending section */}
                {pendingForms.length > 0 && (
                    <div style={{ margin: '0 16px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(245,158,11,0.3)', flexShrink: 0 }}>
                                <AlertCircle style={{ width: 18, height: 18, color: '#fff' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-text)', margin: 0 }}>Гарын үсэг шаардлагатай</p>
                                <p style={{ fontSize: 11, color: 'var(--my-muted)', margin: 0 }}>{pendingForms.length} маягт хүлээгдэж байна</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {pendingForms.map((form, idx) => {
                                const tpl = form.template;
                                if (!tpl) return null;
                                return <MobilePendingCard key={form.id} form={form} tpl={tpl} idx={idx} onSign={() => onSign(tpl)} />;
                            })}
                        </div>
                    </div>
                )}

                {/* Signed section */}
                {signedForms.length > 0 && (
                    <div style={{ margin: '0 16px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 12, background: BTN_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(5,150,105,0.3)', flexShrink: 0 }}>
                                <ShieldCheck style={{ width: 18, height: 18, color: '#fff' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-text)', margin: 0 }}>Баталгаажсан маягтууд</p>
                                <p style={{ fontSize: 11, color: 'var(--my-muted)', margin: 0 }}>{signedForms.length} маягт гарын үсгээр баталгаажсан</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {signedForms.map(form => {
                                const tpl = form.template;
                                if (!tpl) return null;
                                return <MobileSignedCard key={form.id} form={form} tpl={tpl} />;
                            })}
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {total === 0 && (
                    <div style={{ margin: '8px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--my-card-bg)', borderRadius: 20, padding: '48px 24px', textAlign: 'center', border: '1px solid var(--my-divider)' }}>
                        <div style={{ width: 76, height: 76, borderRadius: 24, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                            <FileText style={{ width: 34, height: 34, color: ACCENT }} />
                        </div>
                        <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--my-text)', margin: '0 0 8px' }}>Маягт байхгүй</p>
                        <p style={{ fontSize: 13, color: 'var(--my-muted)', margin: 0, lineHeight: 1.6, maxWidth: 260 }}>
                            Эмч эсвэл ресепшн маягт бэлтгэсний дараа энд харагдана. Та автоматаар мэдэгдэл хүлээн авна.
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
export default function PatientConsentForms({ patient, pendingForms, signedForms }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const isMobile  = useIsMobile();
    const [modal,    setModal]    = useState<ModalTemplate | null>(null);
    const modalRef  = useRef(false);
    const total     = pendingForms.length + signedForms.length;
    const pct       = total > 0 ? Math.round((signedForms.length / total) * 100) : 0;

    /* SVG ring for desktop */
    const R    = 28;
    const circ = 2 * Math.PI * R;
    const offset = circ * (1 - pct / 100);

    /* Polling */
    useEffect(() => {
        const id = setInterval(() => {
            if (!modalRef.current) router.reload({ only: ['pendingForms', 'signedForms'] });
        }, 15000);
        return () => clearInterval(id);
    }, []);

    function openModal(tpl: ModalTemplate) { modalRef.current = true;  setModal(tpl); }
    function closeModal()                   { modalRef.current = false; setModal(null); }

    const hasAny = total > 0;

    return (
        <PatientLayout breadcrumbs={isMobile ? [] : breadcrumbs}>
            <Head title="Зөвшөөрлийн маягтууд" />

            {/* ── Mobile ── */}
            {isMobile ? (
                <MobileConsentForms
                    patient={patient}
                    pendingForms={pendingForms}
                    signedForms={signedForms}
                    onSign={openModal}
                    flash={props.flash}
                />
            ) : (
                /* ── Desktop ── */
                <>
                    {/* Hero */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 px-6 pt-8 pb-16">
                        <div className="pointer-events-none absolute -right-10 -top-10 size-52 rounded-full bg-white/10" />
                        <div className="pointer-events-none absolute -left-6 bottom-0 size-36 rounded-full bg-black/10" />

                        <div className="relative flex items-center gap-5">
                            {/* Completion ring */}
                            <div className="relative shrink-0">
                                <svg className="-rotate-90" width="72" height="72" viewBox="0 0 72 72">
                                    <circle cx="36" cy="36" r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                                    <circle cx="36" cy="36" r={R} fill="none" stroke="white" strokeWidth="4"
                                        strokeDasharray={circ} strokeDashoffset={offset}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-sm font-bold text-white">{pct}%</span>
                                </div>
                            </div>

                            <div className="min-w-0">
                                <p className="text-sm font-medium text-white/60">Үйлчлүүлэгчийн портал</p>
                                <h1 className="text-xl font-bold text-white leading-tight">Зөвшөөрлийн маягтууд</h1>
                                <p className="mt-1 text-sm text-white/70">{signedForms.length}/{total} маягт баталгаажсан</p>
                            </div>
                        </div>

                        {/* Status chips */}
                        <div className="relative mt-5 flex flex-wrap gap-2">
                            {pendingForms.length > 0 && (
                                <div className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25">
                                    <span className="relative flex size-2">
                                        <span className="animate-ping absolute inline-flex size-full rounded-full bg-white opacity-75" />
                                        <span className="relative inline-flex size-2 rounded-full bg-white" />
                                    </span>
                                    {pendingForms.length} маягт хүлээгдэж байна
                                </div>
                            )}
                            {signedForms.length > 0 && (
                                <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white/80">
                                    <CheckCircle2 className="size-3.5" />
                                    {signedForms.length} баталгаажсан
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Flash */}
                    {props.flash?.success && (
                        <div className="relative z-10 mx-4 md:mx-6 -mt-4 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 shadow-lg">
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{props.flash.success}</p>
                        </div>
                    )}

                    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">

                        {/* Pending forms */}
                        {pendingForms.length > 0 && (
                            <div className="rounded-2xl overflow-hidden border-2 border-amber-400/70 dark:border-amber-600/40 shadow-md shadow-amber-500/10">
                                <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/20 border-b border-amber-200/60 dark:border-amber-800/30">
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
                                        <AlertCircle className="size-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-amber-900 dark:text-amber-100">Таны гарын үсэг шаардлагатай</p>
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{pendingForms.length} маягт дээр гарын үсэг зурж баталгаажуулна уу</p>
                                    </div>
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-sm font-bold shadow">{pendingForms.length}</span>
                                </div>
                                <div className="bg-card divide-y divide-amber-100/80 dark:divide-amber-900/20">
                                    {pendingForms.map((form, idx) => {
                                        const tpl = form.template;
                                        if (!tpl) return null;
                                        const c = CAT_COLOR[tpl.category] ?? fallbackCat;
                                        return (
                                            <div key={form.id} className="group flex items-center gap-4 px-5 py-4 hover:bg-amber-50/60 dark:hover:bg-amber-950/10 transition-colors">
                                                <div className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 text-xs font-bold text-amber-600">{idx + 1}</div>
                                                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.grad} text-white shadow-sm`}>
                                                    <FileText className="size-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-foreground leading-snug truncate">{tpl.title}</p>
                                                    <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.chip}`}>{CAT_LABEL[tpl.category] ?? tpl.category}</span>
                                                </div>
                                                <button onClick={() => openModal(tpl)}
                                                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 text-xs font-bold shadow-sm transition-all active:scale-95 group-hover:shadow-md">
                                                    <PenLine className="size-3.5" />Зурах
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Signed forms */}
                        {signedForms.length > 0 && (
                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                                        <ShieldCheck className="size-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-foreground">Баталгаажсан маягтууд</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{signedForms.length} маягт гарын үсгээр баталгаажсан</p>
                                    </div>
                                </div>
                                <div className="p-4 grid gap-3 sm:grid-cols-2">
                                    {signedForms.map(form => {
                                        const tpl = form.template;
                                        if (!tpl) return null;
                                        const c = CAT_COLOR[tpl.category] ?? fallbackCat;
                                        return (
                                            <div key={form.id} className={`relative rounded-xl border overflow-hidden p-4 ${c.light}`}>
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className={`flex size-9 items-center justify-center rounded-lg bg-gradient-to-br ${c.grad} text-white shadow-sm`}>
                                                        <FileText className="size-3.5" />
                                                    </div>
                                                    <span className="flex items-center gap-1 rounded-full bg-emerald-500 text-white px-2.5 py-0.5 text-[10px] font-bold shadow-sm">
                                                        <CheckCircle2 className="size-3" />Зурсан
                                                    </span>
                                                </div>
                                                <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 mb-2">{tpl.title}</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.chip}`}>{CAT_LABEL[tpl.category] ?? tpl.category}</span>
                                                    {form.signed_at && (
                                                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                            <Clock className="size-3" />{fmtDate(form.signed_at)}
                                                        </span>
                                                    )}
                                                </div>
                                                {form.patient_signature && (
                                                    <div className="mt-3 h-10 rounded-lg border border-border/50 bg-white dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
                                                        <img src={form.patient_signature} alt="Гарын үсэг" className="max-h-9 max-w-full object-contain opacity-70" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {!hasAny && (
                            <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center shadow-sm gap-6">
                                <div className="relative">
                                    <div className="flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/30 dark:to-teal-950/30">
                                        <FileText className="size-11 text-emerald-500" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 border-2 border-card">
                                        <Clock className="size-4 text-emerald-600" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-foreground">Зөвшөөрлийн маягт байхгүй</p>
                                    <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">
                                        Эмч эсвэл ресепшн маягт бэлтгэсний дараа энд харагдана. Та автоматаар мэдэгдэл хүлээн авна.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Signing modal */}
            {modal && <SignModal modal={modal} patient={patient} onClose={closeModal} />}
        </PatientLayout>
    );
}
