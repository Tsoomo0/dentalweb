import PatientLayout from '@/layouts/patient-layout';
import { NotificationBell } from '@/components/notification-bell';
import { useIsMobile } from '@/hooks/use-mobile';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    Banknote, Calendar, CheckCircle2, Clock, CreditCard,
    Loader2, NotebookPen, QrCode, RefreshCw, Smartphone,
    Stethoscope, Wallet, X, TrendingUp,
    ChevronDown, ChevronUp,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ── Types ── */
interface ServiceItem { name: string; price?: number }

interface TreatmentRecord {
    id: number;
    record_date: string | null;
    services: ServiceItem[];
    treatment_type: string | null;
    doctor: { name: string } | null;
    amount_charged: number | null;
    paid_amount: number | null;
    payment_status: string | null;
    payment_method: string | null;
    paid_at: string | null;
    discount_amount: number | null;
    doctor_notes: string | null;
    leasing_plan_id: number | null;
    leasing_paid_months: number | null;
    leasing_total_months: number | null;
    leasing_monthly_amount: number | null;
}

interface Props {
    records: TreatmentRecord[];
    total_charged: number;
    total_paid: number;
    total_pending: number;
}

interface DeepLink { name: string; logo: string; link: string }

interface InvoiceState {
    invoice_id: string;
    qr_image: string | null;
    qpay_deeplink: DeepLink[];
    amount: number;
    installment_number?: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Үйлчлүүлэгчийн портал', href: '/patient/dashboard' },
    { title: 'Эмчилгээний түүх', href: '/patient/treatments' },
];

/* ── Shared theme ── */
const HERO_GRADIENT = 'linear-gradient(155deg, #059669 0%, #10b981 45%, #0891b2 100%)';
const BTN_GRADIENT  = 'linear-gradient(135deg, #059669, #0891b2)';
const ACCENT        = '#059669';

/* ── Status config ── */
const STATUS_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
    sent:    { label: 'Хүлээгдэж байна', classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400',   dot: 'bg-amber-400' },
    partial: { label: 'Дутуу төлбөр',    classes: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-400', dot: 'bg-orange-400' },
    leasing: { label: 'Лизинг',          classes: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-400',           dot: 'bg-teal-400' },
    paid:    { label: 'Төлөгдсөн',       classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

const STATUS_STRIPE: Record<string, string> = {
    paid: 'from-emerald-400 to-teal-500',
    leasing: 'from-teal-400 to-cyan-500',
    partial: 'from-orange-400 to-amber-400',
    sent: 'from-amber-400 to-yellow-400',
};

const METHOD_CONFIG: Record<string, { label: string; icon: React.ElementType; classes: string }> = {
    cash:     { label: 'Бэлэн',    icon: Banknote,   classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    card:     { label: 'Карт',     icon: CreditCard, classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    bank:     { label: 'Данс',     icon: Smartphone, classes: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
    qpay:     { label: 'QPay',     icon: Smartphone, classes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    storepay: { label: 'StorePay', icon: Wallet,     classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
};

const BANK_COLORS: Record<string, string> = {
    'Khan Bank': '#1b8aca', 'Golomt': '#e21f26', 'TDB': '#004994',
    'XacBank': '#f05a22', 'State Bank': '#00853f',
    'Capitron': '#7b3ca5', 'Most Money': '#ff6b00', 'M Bank': '#00aeef',
};
function bankColor(name: string) {
    for (const [k, v] of Object.entries(BANK_COLORS))
        if (name.toLowerCase().includes(k.toLowerCase())) return v;
    return '#374151';
}

/* ── Formatters ── */
function fmtMnt(n: number | null) {
    if (n == null) return '—';
    return new Intl.NumberFormat('mn-MN').format(n) + '₮';
}
function fmtDate(s: string | null) {
    if (!s) return '—';
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
function fmtMonth(s: string) { return new Date(s).toLocaleDateString('mn-MN', { month: 'short' }); }
function fmtDay(s: string)   { return new Date(s).getDate(); }

/* ── Mobile inline style helpers ── */
function mStatusBg(status: string) {
    const m: Record<string, string> = {
        paid: 'rgba(16,185,129,0.12)', leasing: 'rgba(20,184,166,0.12)',
        partial: 'rgba(249,115,22,0.12)', sent: 'rgba(245,158,11,0.12)',
    };
    return m[status] ?? 'var(--my-pill-bg)';
}
function mStatusColor(status: string) {
    const m: Record<string, string> = {
        paid: '#059669', leasing: '#0d9488', partial: '#ea580c', sent: '#d97706',
    };
    return m[status] ?? 'var(--my-muted)';
}

/* ══════════════════════════════════════════════════════════
   QPay body
══════════════════════════════════════════════════════════ */
function QPayBody({
    phase, invoice, countdown, errorMsg, accentColor, label,
    onRetry, onSuccess, onClose, stopPolling,
}: {
    phase: 'loading' | 'qr' | 'success' | 'error';
    invoice: InvoiceState | null;
    countdown: number;
    errorMsg: string;
    accentColor: string;
    label: string;
    onRetry: () => void;
    onSuccess: () => void;
    onClose: () => void;
    stopPolling: () => void;
}) {
    const fmtCD = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    if (phase === 'loading') return (
        <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-9 animate-spin" style={{ color: accentColor }} />
            <p className="text-sm text-muted-foreground">Invoice үүсгэж байна…</p>
        </div>
    );

    if (phase === 'qr' && invoice) return (
        <div className="flex flex-col items-center gap-4">
            <div className="text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold tabular-nums text-foreground">{fmtMnt(invoice.amount)}</p>
            </div>
            {invoice.qr_image ? (
                <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-border">
                    <img src={`data:image/png;base64,${invoice.qr_image}`} alt="QR" className="size-48 object-contain" />
                </div>
            ) : (
                <div className="flex size-48 items-center justify-center rounded-2xl bg-muted">
                    <QrCode className="size-16 text-muted-foreground/30" />
                </div>
            )}
            <div className="flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                <Clock className="size-3.5" />
                Хугацаа: <span className="font-mono font-bold ml-0.5">{fmtCD(countdown)}</span>
            </div>
            {invoice.qpay_deeplink.length > 0 && (
                <div className="w-full">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">Банкны апп-аас нэвтрэх</p>
                    <div className="grid grid-cols-3 gap-2">
                        {invoice.qpay_deeplink.slice(0, 6).map((dl, i) => (
                            <a key={i} href={dl.link} target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1.5 rounded-xl p-2 border hover:bg-muted transition-colors"
                                style={{ borderColor: bankColor(dl.name) + '40' }}>
                                {dl.logo
                                    ? <img src={dl.logo} alt={dl.name} className="size-8 rounded-lg object-contain" />
                                    : <div className="size-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: bankColor(dl.name) }}>{dl.name.slice(0, 2).toUpperCase()}</div>
                                }
                                <span className="text-[9px] text-center text-muted-foreground line-clamp-1">{dl.name}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
            <p className="text-[10px] text-muted-foreground text-center">Төлсний дараа автоматаар шинэчлэгдэнэ</p>
        </div>
    );

    if (phase === 'success') return (
        <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="size-10 text-emerald-500" />
            </div>
            <div className="text-center">
                <p className="text-lg font-bold text-foreground">Амжилттай!</p>
                <p className="text-sm text-muted-foreground mt-1">Төлбөр бүртгэгдлээ</p>
            </div>
            <button onClick={() => { stopPolling(); onSuccess(); }}
                className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 text-sm transition-colors">
                Хаах
            </button>
        </div>
    );

    return (
        <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex size-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <X className="size-10 text-red-400" />
            </div>
            <div className="text-center">
                <p className="text-lg font-bold text-foreground">Алдаа гарлаа</p>
                {errorMsg && <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>}
            </div>
            <button onClick={onRetry}
                className="w-full flex items-center justify-center gap-2 rounded-xl text-white font-semibold py-3 text-sm transition-colors"
                style={{ background: accentColor }}>
                <RefreshCw className="size-4" />Дахин оролдох
            </button>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   QPay modal wrapper
══════════════════════════════════════════════════════════ */
function QPayModal({
    title, accentColor, label, onClose, onSuccess, createFn, checkFn,
}: {
    title: string; accentColor: string; label: string;
    onClose: () => void; onSuccess: () => void;
    createFn: () => Promise<InvoiceState | 'paid' | 'error'>;
    checkFn: () => Promise<boolean>;
}) {
    type Phase = 'loading' | 'qr' | 'success' | 'error';
    const [phase, setPhase]         = useState<Phase>('loading');
    const [invoice, setInvoice]     = useState<InvoiceState | null>(null);
    const [errorMsg, setErrorMsg]   = useState('');
    const [countdown, setCountdown] = useState(300);
    const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const doneRef  = useRef(false);

    const stopPolling = useCallback(() => {
        if (pollRef.current)  clearInterval(pollRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        pollRef.current = timerRef.current = null;
    }, []);

    const startPolling = useCallback(() => {
        pollRef.current = setInterval(async () => {
            if (doneRef.current) return;
            const paid = await checkFn();
            if (paid) { doneRef.current = true; stopPolling(); setPhase('success'); }
        }, 3000);
        timerRef.current = setInterval(() => {
            setCountdown(p => {
                if (p <= 1) {
                    if (!doneRef.current) { doneRef.current = true; stopPolling(); setPhase('error'); setErrorMsg('Төлбөрийн хугацаа (5 минут) дууссан.'); }
                    return 0;
                }
                return p - 1;
            });
        }, 1000);
    }, [checkFn, stopPolling]);

    const run = useCallback(async () => {
        setPhase('loading'); setErrorMsg(''); doneRef.current = false; setCountdown(300);
        const result = await createFn();
        if (result === 'paid') { setPhase('success'); return; }
        if (result === 'error') { setPhase('error'); return; }
        setInvoice(result); setPhase('qr'); startPolling();
    }, [createFn, startPolling]);

    useEffect(() => { run(); return () => stopPolling(); }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) { stopPolling(); onClose(); } }}>
            <div className="relative w-full max-w-sm rounded-2xl bg-card border shadow-2xl overflow-hidden">
                <div className="h-1 w-full" style={{ background: accentColor }} />
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div className="flex items-center gap-2">
                        <QrCode className="size-5" style={{ color: accentColor }} />
                        <span className="font-semibold text-sm">{title}</span>
                    </div>
                    <button onClick={() => { stopPolling(); onClose(); }}
                        className="flex size-7 items-center justify-center rounded-full hover:bg-muted transition-colors">
                        <X className="size-4 text-muted-foreground" />
                    </button>
                </div>
                <div className="p-5">
                    <QPayBody phase={phase} invoice={invoice} countdown={countdown} errorMsg={errorMsg}
                        accentColor={accentColor} label={label}
                        onRetry={run} onSuccess={onSuccess} onClose={onClose} stopPolling={stopPolling} />
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   Mobile record card
══════════════════════════════════════════════════════════ */
function MobileRecordCard({ record, onLeasingPay, onOutstandingPay }: {
    record: TreatmentRecord;
    onLeasingPay: (planId: number) => void;
    onOutstandingPay: (id: number, amount: number) => void;
}) {
    const [notesOpen, setNotesOpen] = useState(false);

    const isPaid    = record.payment_status === 'paid';
    const isLeasing = record.payment_status === 'leasing';
    const isPartial = record.payment_status === 'partial';
    const isSent    = record.payment_status === 'sent';
    const remaining = Math.max(0, (record.amount_charged ?? 0) - (record.paid_amount ?? 0));
    const services  = record.services.filter(s => s.name?.trim());
    const status    = record.payment_status ?? 'sent';
    const cfg       = STATUS_CONFIG[status];
    const paidPct   = record.amount_charged
        ? Math.min(100, Math.round(((record.paid_amount ?? 0) / record.amount_charged) * 100))
        : 0;

    const stripeColor: Record<string, string> = {
        paid: '#10b981', leasing: '#14b8a6', partial: '#f97316', sent: '#f59e0b',
    };

    return (
        <div style={{
            background: 'var(--my-card-bg)', borderRadius: 18, overflow: 'hidden',
            boxShadow: '0 2px 14px rgba(0,0,0,0.07)', border: '1px solid var(--my-divider)',
        }}>
            {/* Header row */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 14px', background: 'var(--my-pill-bg)',
                borderBottom: '1px solid var(--my-divider)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 3, height: 16, borderRadius: 99, background: stripeColor[status] ?? '#94a3b8', flexShrink: 0 }} />
                    <Calendar size={13} style={{ color: 'var(--my-muted)' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-text)' }}>
                        {record.record_date ? fmtDate(record.record_date) : '—'}
                    </span>
                </div>
                {cfg && (
                    <span style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '3px 10px',
                        background: mStatusBg(status), color: mStatusColor(status),
                    }}>
                        {isPaid && <CheckCircle2 size={10} />}
                        {cfg.label}
                    </span>
                )}
            </div>

            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Doctor */}
                {record.doctor && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Stethoscope size={16} style={{ color: ACCENT }} />
                        </div>
                        <div>
                            <p style={{ fontSize: 10, color: 'var(--my-muted)', margin: 0 }}>Эмч</p>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-text)', margin: 0 }}>{record.doctor.name}</p>
                        </div>
                    </div>
                )}

                {/* Services */}
                {services.length > 0 && (
                    <div>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--my-muted)', margin: '0 0 8px' }}>
                            Хийгдсэн үйлчилгээ
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {services.map((svc, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--my-pill-bg)', border: '1px solid var(--my-divider)', borderRadius: 10, padding: '5px 10px' }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--my-text)' }}>{svc.name}</span>
                                    {svc.price != null && svc.price > 0 && (
                                        <span style={{ fontSize: 11, color: 'var(--my-muted)' }}>{fmtMnt(svc.price)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Payment section */}
                {record.amount_charged != null && record.amount_charged > 0 && (
                    <div style={{
                        borderRadius: 14, padding: '14px',
                        background: isPaid ? 'rgba(16,185,129,0.07)' : isLeasing ? 'rgba(20,184,166,0.07)' : 'rgba(245,158,11,0.07)',
                        border: `1px solid ${isPaid ? 'rgba(16,185,129,0.18)' : isLeasing ? 'rgba(20,184,166,0.18)' : 'rgba(245,158,11,0.18)'}`,
                        display: 'flex', flexDirection: 'column', gap: 10,
                    }}>

                        {/* PAID */}
                        {isPaid && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <p style={{ fontSize: 10, color: 'var(--my-muted)', margin: '0 0 2px' }}>Нийт төлбөр</p>
                                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--my-text)', margin: 0 }}>{fmtMnt(record.amount_charged)}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {record.payment_method && (() => {
                                        const m = METHOD_CONFIG[record.payment_method];
                                        if (!m) return null;
                                        const Icon = m.icon;
                                        return (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, background: 'rgba(16,185,129,0.12)', color: '#059669', borderRadius: 99, padding: '3px 10px' }}>
                                                <Icon size={11} />{m.label}
                                            </span>
                                        );
                                    })()}
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: BTN_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CheckCircle2 size={18} style={{ color: '#fff' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* LEASING */}
                        {isLeasing && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                    <div>
                                        <p style={{ fontSize: 10, color: 'var(--my-muted)', margin: '0 0 2px' }}>Нийт дүн</p>
                                        <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--my-text)', margin: 0 }}>{fmtMnt(record.amount_charged)}</p>
                                    </div>
                                    {record.leasing_monthly_amount != null && (
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: 10, color: 'var(--my-muted)', margin: '0 0 2px' }}>Сарын төлбөр</p>
                                            <p style={{ fontSize: 18, fontWeight: 800, color: '#0d9488', margin: 0 }}>{fmtMnt(record.leasing_monthly_amount)}</p>
                                        </div>
                                    )}
                                </div>
                                {record.leasing_total_months != null && record.leasing_paid_months != null && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                                            <span style={{ color: '#0d9488', fontWeight: 600 }}>{record.leasing_paid_months} сар төлсөн</span>
                                            <span style={{ color: 'var(--my-muted)' }}>{record.leasing_total_months - record.leasing_paid_months} сар үлдсэн</span>
                                        </div>
                                        <div style={{ height: 6, width: '100%', borderRadius: 99, background: 'rgba(20,184,166,0.2)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #14b8a6, #0891b2)', transition: 'width 0.7s', width: `${(record.leasing_paid_months / record.leasing_total_months) * 100}%` }} />
                                        </div>
                                    </div>
                                )}
                                {record.leasing_plan_id != null && (
                                    <button onClick={() => onLeasingPay(record.leasing_plan_id!)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #0d9488, #0891b2)', borderRadius: 12, padding: '12px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(13,148,136,0.28)' }}>
                                        <QrCode size={15} style={{ color: '#fff' }} />
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Сарын төлбөр QPay-р төлөх</span>
                                    </button>
                                )}
                            </>
                        )}

                        {/* PARTIAL / SENT */}
                        {(isPartial || isSent) && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <div style={{ background: 'var(--my-pill-bg)', borderRadius: 12, padding: '10px 12px', border: '1px solid var(--my-divider)' }}>
                                        <p style={{ fontSize: 10, color: 'var(--my-muted)', margin: '0 0 2px' }}>Нийт дүн</p>
                                        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--my-text)', margin: 0 }}>{fmtMnt(record.amount_charged)}</p>
                                    </div>
                                    <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(245,158,11,0.22)' }}>
                                        <p style={{ fontSize: 10, color: '#d97706', margin: '0 0 2px' }}>Үлдэгдэл</p>
                                        <p style={{ fontSize: 15, fontWeight: 800, color: '#d97706', margin: 0 }}>{fmtMnt(remaining)}</p>
                                    </div>
                                </div>
                                {isPartial && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--my-muted)', marginBottom: 6 }}>
                                            <span>{fmtMnt(record.paid_amount)} төлсөн</span>
                                            <span style={{ fontWeight: 700, color: '#d97706' }}>{paidPct}%</span>
                                        </div>
                                        <div style={{ height: 6, width: '100%', borderRadius: 99, background: 'rgba(245,158,11,0.18)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #f59e0b, #f97316)', transition: 'width 0.7s', width: `${paidPct}%` }} />
                                        </div>
                                    </div>
                                )}
                                {isPartial && remaining > 0 && (
                                    <button onClick={() => onOutstandingPay(record.id, remaining)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: 12, padding: '12px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(245,158,11,0.28)' }}>
                                        <QrCode size={15} style={{ color: '#fff' }} />
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Үлдэгдэл {fmtMnt(remaining)} QPay-р төлөх</span>
                                    </button>
                                )}
                            </>
                        )}

                        {/* Discount */}
                        {(record.discount_amount ?? 0) > 0 && (
                            <p style={{ fontSize: 11, color: 'var(--my-muted)', textAlign: 'right', margin: 0 }}>
                                Хөнгөлөлт: <span style={{ fontWeight: 700, color: '#f43f5e' }}>-{fmtMnt(record.discount_amount)}</span>
                            </p>
                        )}
                    </div>
                )}

                {/* Doctor notes */}
                {record.doctor_notes && (
                    <div>
                        <button onClick={() => setNotesOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <NotebookPen size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#3b82f6', textAlign: 'left' }}>
                                Эмчийн тэмдэглэгээ / Жор
                            </span>
                            {notesOpen
                                ? <ChevronUp size={14} style={{ color: 'var(--my-muted)' }} />
                                : <ChevronDown size={14} style={{ color: 'var(--my-muted)' }} />}
                        </button>
                        {notesOpen && (
                            <div style={{ marginTop: 8, borderRadius: 12, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)', padding: '12px 14px' }}>
                                <p style={{ fontSize: 13, color: '#2563eb', whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>{record.doctor_notes}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   Desktop record card (unchanged)
══════════════════════════════════════════════════════════ */
function RecordCard({ record, onLeasingPay, onOutstandingPay }: {
    record: TreatmentRecord;
    onLeasingPay: (planId: number) => void;
    onOutstandingPay: (id: number, amount: number) => void;
}) {
    const [notesOpen, setNotesOpen] = useState(false);

    const isPaid    = record.payment_status === 'paid';
    const isLeasing = record.payment_status === 'leasing';
    const isPartial = record.payment_status === 'partial';
    const isSent    = record.payment_status === 'sent';
    const remaining = Math.max(0, (record.amount_charged ?? 0) - (record.paid_amount ?? 0));
    const services  = record.services.filter(s => s.name?.trim());
    const status    = record.payment_status ?? 'sent';
    const cfg       = STATUS_CONFIG[status];
    const paidPct   = record.amount_charged
        ? Math.min(100, Math.round(((record.paid_amount ?? 0) / record.amount_charged) * 100))
        : 0;

    return (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="size-4 shrink-0" />
                    <span className="font-semibold text-foreground">
                        {record.record_date ? fmtDate(record.record_date) : '—'}
                    </span>
                </div>
                {cfg && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.classes}`}>
                        {isPaid && <CheckCircle2 className="size-3" />}
                        {cfg.label}
                    </span>
                )}
            </div>

            <div className="px-5 py-4 space-y-4">
                {record.doctor && (
                    <div className="flex items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                            <Stethoscope className="size-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground">Эмч</p>
                            <p className="text-sm font-semibold text-foreground leading-tight">{record.doctor.name}</p>
                        </div>
                    </div>
                )}

                {services.length > 0 && (
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Хийгдсэн үйлчилгээ
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {services.map((svc, i) => (
                                <div key={i} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5">
                                    <span className="text-sm font-medium text-foreground">{svc.name}</span>
                                    {svc.price != null && svc.price > 0 && (
                                        <span className="text-xs text-muted-foreground">{fmtMnt(svc.price)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {record.amount_charged != null && record.amount_charged > 0 && (
                    <div className={`rounded-xl p-4 space-y-3 ${
                        isPaid    ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30' :
                        isLeasing ? 'bg-teal-50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/30' :
                                    'bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30'
                    }`}>
                        {isPaid && (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">Нийт төлбөр</p>
                                    <p className="text-xl font-bold text-foreground tabular-nums">{fmtMnt(record.amount_charged)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {record.payment_method && (() => {
                                        const m = METHOD_CONFIG[record.payment_method];
                                        if (!m) return null;
                                        const Icon = m.icon;
                                        return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${m.classes}`}><Icon className="size-3" />{m.label}</span>;
                                    })()}
                                    <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                                        <CheckCircle2 className="size-5" />
                                    </div>
                                </div>
                            </div>
                        )}
                        {isLeasing && (
                            <>
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Нийт дүн</p>
                                        <p className="text-xl font-bold text-foreground tabular-nums">{fmtMnt(record.amount_charged)}</p>
                                    </div>
                                    {record.leasing_monthly_amount != null && (
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Сарын төлбөр</p>
                                            <p className="text-lg font-bold text-teal-700 dark:text-teal-400 tabular-nums">{fmtMnt(record.leasing_monthly_amount)}</p>
                                        </div>
                                    )}
                                </div>
                                {record.leasing_total_months != null && record.leasing_paid_months != null && (
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="text-teal-700 dark:text-teal-400 font-medium">{record.leasing_paid_months} сар төлсөн</span>
                                            <span className="text-muted-foreground">{record.leasing_total_months - record.leasing_paid_months} сар үлдсэн</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-teal-200/60 dark:bg-teal-900/40 overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 transition-all duration-700"
                                                style={{ width: `${(record.leasing_paid_months / record.leasing_total_months) * 100}%` }} />
                                        </div>
                                    </div>
                                )}
                                {record.leasing_plan_id != null && (
                                    <button onClick={() => onLeasingPay(record.leasing_plan_id!)}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2.5 transition-colors active:scale-[0.98] shadow-sm">
                                        <QrCode className="size-4" />Сарын төлбөр QPay-р төлөх
                                    </button>
                                )}
                            </>
                        )}
                        {(isPartial || isSent) && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-background/70 px-3 py-2.5 border border-border/50">
                                        <p className="text-[11px] text-muted-foreground">Нийт дүн</p>
                                        <p className="text-base font-bold text-foreground tabular-nums mt-0.5">{fmtMnt(record.amount_charged)}</p>
                                    </div>
                                    <div className="rounded-lg bg-amber-100/60 dark:bg-amber-900/20 px-3 py-2.5 border border-amber-200/50 dark:border-amber-800/30">
                                        <p className="text-[11px] text-amber-700 dark:text-amber-400">Үлдэгдэл</p>
                                        <p className="text-base font-bold text-amber-700 dark:text-amber-400 tabular-nums mt-0.5">{fmtMnt(remaining)}</p>
                                    </div>
                                </div>
                                {isPartial && (
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5 text-muted-foreground">
                                            <span>{fmtMnt(record.paid_amount)} төлсөн</span>
                                            <span>{paidPct}%</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-amber-200/60 dark:bg-amber-900/30 overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700" style={{ width: `${paidPct}%` }} />
                                        </div>
                                    </div>
                                )}
                                {isPartial && remaining > 0 && (
                                    <button onClick={() => onOutstandingPay(record.id, remaining)}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2.5 transition-colors active:scale-[0.98] shadow-sm">
                                        <QrCode className="size-4" />Үлдэгдэл {fmtMnt(remaining)} QPay-р төлөх
                                    </button>
                                )}
                            </>
                        )}
                        {(record.discount_amount ?? 0) > 0 && (
                            <p className="text-xs text-muted-foreground text-right">
                                Хөнгөлөлт: <span className="font-semibold text-rose-500">-{fmtMnt(record.discount_amount)}</span>
                            </p>
                        )}
                    </div>
                )}

                {record.doctor_notes && (
                    <div>
                        <button onClick={() => setNotesOpen(v => !v)} className="flex w-full items-center gap-2 text-left">
                            <NotebookPen className="size-4 text-blue-500 shrink-0" />
                            <span className="flex-1 text-sm font-medium text-blue-700 dark:text-blue-400">Эмчийн тэмдэглэгээ / Жор</span>
                            {notesOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                        </button>
                        {notesOpen && (
                            <div className="mt-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 px-4 py-3">
                                <p className="text-sm text-blue-900 dark:text-blue-200 whitespace-pre-wrap leading-relaxed">{record.doctor_notes}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   Mobile treatments view
══════════════════════════════════════════════════════════ */
function MobileTreatments({ records, total_charged, total_paid, total_pending, onLeasingPay, onOutstandingPay }: {
    records: TreatmentRecord[];
    total_charged: number; total_paid: number; total_pending: number;
    onLeasingPay: (planId: number) => void;
    onOutstandingPay: (id: number, amount: number) => void;
}) {
    const { props } = usePage<{ auth?: any }>();
    const userName: string = (props as any)?.auth?.user?.name ?? 'Үйлчлүүлэгч';
    const paidPct = total_charged > 0 ? Math.round((total_paid / total_charged) * 100) : 0;

    return (
        <div style={{
            flex: 1, overflowY: 'auto', background: 'var(--my-page-bg)',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))',
        }}>
            {/* ── Hero ── */}
            <div style={{ background: HERO_GRADIENT, padding: '20px 20px 64px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: -24, top: -24, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: '35%', bottom: -24, width: 90, height: 90, borderRadius: '50%', background: 'rgba(0,0,0,0.1)', pointerEvents: 'none' }} />

                {/* Top bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, position: 'relative' }}>
                    <Link href="/patient/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{userName.charAt(0).toUpperCase()}</span>
                        </div>
                    </Link>
                    <h1 style={{ flex: 1, fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, textAlign: 'center' }}>Эмчилгээ</h1>
                    <NotificationBell variant="ghost" />
                </div>

                {/* Subtitle + chips */}
                <div style={{ position: 'relative' }}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '0 0 10px' }}>
                        Нийт <span style={{ fontWeight: 800, color: '#fff' }}>{records.length}</span> бичлэг
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {[
                            { label: 'Төлөгдсөн',   count: records.filter(r => r.payment_status === 'paid').length,    bg: 'rgba(255,255,255,0.18)', text: '#fff',    border: 'rgba(255,255,255,0.3)' },
                            { label: 'Үлдэгдэлтэй', count: records.filter(r => ['partial','sent'].includes(r.payment_status ?? '')).length, bg: 'rgba(251,191,36,0.2)', text: '#fde68a', border: 'rgba(251,191,36,0.35)' },
                            { label: 'Лизинг',       count: records.filter(r => r.payment_status === 'leasing').length,  bg: 'rgba(20,184,166,0.2)',  text: '#99f6e4', border: 'rgba(20,184,166,0.35)' },
                        ].filter(s => s.count > 0).map(s => (
                            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '4px 10px' }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: s.text }}>{s.count}</span>
                                <span style={{ fontSize: 11, color: s.text }}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Summary tiles (overlap hero) ── */}
            <div style={{ margin: '-28px 16px 14px', position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {([
                    { label: 'Нийт дүн', value: fmtMnt(total_charged),  iconColor: ACCENT,   bg: 'rgba(16,185,129,0.1)', Icon: Stethoscope },
                    { label: 'Төлсөн',   value: fmtMnt(total_paid),     iconColor: '#059669', bg: 'rgba(16,185,129,0.1)', Icon: CheckCircle2 },
                    { label: 'Үлдэгдэл', value: fmtMnt(total_pending),  iconColor: total_pending > 0 ? '#d97706' : '#059669', bg: total_pending > 0 ? 'rgba(217,119,6,0.1)' : 'rgba(16,185,129,0.1)', Icon: TrendingUp },
                ] as const).map(tile => (
                    <div key={tile.label} style={{ background: 'var(--my-card-bg)', borderRadius: 16, padding: '12px 10px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 5, border: '1px solid var(--my-divider)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 9, background: tile.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <tile.Icon size={14} style={{ color: tile.iconColor }} />
                        </div>
                        <p style={{ fontSize: 9, color: 'var(--my-muted)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3 }}>{tile.label}</p>
                        <p style={{ fontSize: 12, fontWeight: 800, color: tile.iconColor, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tile.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Progress card ── */}
            {total_charged > 0 && (
                <div style={{ margin: '0 16px 16px', background: 'var(--my-card-bg)', borderRadius: 16, padding: '14px', border: '1px solid var(--my-divider)', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--my-text)', margin: 0 }}>Нийт төлбөрийн явц</p>
                        <span style={{ fontSize: 13, fontWeight: 800, color: paidPct === 100 ? ACCENT : '#d97706' }}>{paidPct}%</span>
                    </div>
                    <div style={{ height: 8, width: '100%', borderRadius: 99, background: 'var(--my-pill-bg)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: paidPct === 100 ? BTN_GRADIENT : 'linear-gradient(90deg, #f59e0b, #10b981)', transition: 'width 0.7s', width: `${paidPct}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--my-muted)' }}>
                        <span>{fmtMnt(total_paid)} төлсөн</span>
                        <span>{fmtMnt(total_charged)} нийт</span>
                    </div>
                </div>
            )}

            {/* ── Record list ── */}
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {records.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 16, textAlign: 'center' }}>
                        <div style={{ width: 72, height: 72, borderRadius: 24, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Stethoscope size={32} style={{ color: ACCENT }} />
                        </div>
                        <div>
                            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--my-text)', margin: '0 0 6px' }}>Эмчилгээний бичлэг байхгүй</p>
                            <p style={{ fontSize: 13, color: 'var(--my-muted)', margin: 0 }}>Эмчилгээ хийлгэсний дараа энд харагдана</p>
                        </div>
                    </div>
                ) : records.map(record => (
                    <MobileRecordCard
                        key={record.id}
                        record={record}
                        onLeasingPay={onLeasingPay}
                        onOutstandingPay={onOutstandingPay}
                    />
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   Main export
══════════════════════════════════════════════════════════ */
export default function PatientTreatments({ records, total_charged, total_paid, total_pending }: Props) {
    const isMobile = useIsMobile();
    const [leasingPlanId,     setLeasingPlanId]     = useState<number | null>(null);
    const [outstandingId,     setOutstandingId]     = useState<number | null>(null);
    const [outstandingAmount, setOutstandingAmount] = useState(0);
    const paidPct = total_charged > 0 ? Math.round((total_paid / total_charged) * 100) : 0;

    return (
        <PatientLayout breadcrumbs={isMobile ? [] : breadcrumbs}>
            <Head title="Эмчилгээний түүх" />

            {/* QPay modals (shared between mobile & desktop) */}
            {leasingPlanId !== null && (
                <QPayModal
                    title="QPay лизинг төлөх" accentColor="#10b981" label="Сарын лизингийн төлбөр"
                    onClose={() => setLeasingPlanId(null)}
                    onSuccess={() => { setLeasingPlanId(null); router.reload({ only: ['records', 'total_charged', 'total_paid', 'total_pending'] }); }}
                    createFn={async () => {
                        try {
                            const { data } = await axios.post<any>(`/patient/leasing/${leasingPlanId}/invoice`);
                            if ('error' in data) return 'error';
                            if (data.paid) return 'paid';
                            return { invoice_id: data.invoice_id, qr_image: data.qr_image, qpay_deeplink: data.qpay_deeplink ?? [], amount: data.amount, installment_number: data.installment_number };
                        } catch { return 'error'; }
                    }}
                    checkFn={async () => {
                        try { const { data } = await axios.get<{ paid: boolean }>(`/patient/leasing/${leasingPlanId}/check`); return data.paid; }
                        catch { return false; }
                    }}
                />
            )}
            {outstandingId !== null && (
                <QPayModal
                    title="Дутуу тооцоо төлөх" accentColor="#f59e0b" label="Үлдэгдэл дүн"
                    onClose={() => setOutstandingId(null)}
                    onSuccess={() => { setOutstandingId(null); router.reload({ only: ['records', 'total_charged', 'total_paid', 'total_pending'] }); }}
                    createFn={async () => {
                        try {
                            const { data } = await axios.post<any>(`/patient/outstanding/${outstandingId}/invoice`);
                            if ('error' in data) return 'error';
                            if (data.paid) return 'paid';
                            return { invoice_id: data.invoice_id, qr_image: data.qr_image, qpay_deeplink: data.qpay_deeplink ?? [], amount: data.amount };
                        } catch { return 'error'; }
                    }}
                    checkFn={async () => {
                        try { const { data } = await axios.get<{ paid: boolean }>(`/patient/outstanding/${outstandingId}/check`); return data.paid; }
                        catch { return false; }
                    }}
                />
            )}

            {isMobile ? (
                <MobileTreatments
                    records={records}
                    total_charged={total_charged}
                    total_paid={total_paid}
                    total_pending={total_pending}
                    onLeasingPay={setLeasingPlanId}
                    onOutstandingPay={(id, amount) => { setOutstandingId(id); setOutstandingAmount(amount); }}
                />
            ) : (
                <>
                    {/* ── Desktop Hero ── */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 px-6 pt-8 pb-16">
                        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/10" />
                        <div className="pointer-events-none absolute left-1/4 -bottom-8 size-36 rounded-full bg-black/10" />
                        <div className="relative">
                            <p className="text-sm font-medium text-white/60">Үйлчлүүлэгчийн портал</p>
                            <h1 className="mt-1 text-2xl font-bold text-white">Эмчилгээний түүх</h1>
                            <p className="mt-0.5 text-sm text-white/60">
                                Нийт <span className="font-semibold text-white">{records.length}</span> бичлэг
                            </p>
                        </div>
                        <div className="relative mt-5 flex gap-2 flex-wrap">
                            {[
                                { label: 'Төлөгдсөн',   count: records.filter(r => r.payment_status === 'paid').length,    color: 'bg-white/20 text-white ring-1 ring-white/30' },
                                { label: 'Лизинг',       count: records.filter(r => r.payment_status === 'leasing').length, color: 'bg-teal-400/20 text-teal-200 ring-1 ring-teal-400/30' },
                                { label: 'Үлдэгдэлтэй', count: records.filter(r => ['partial','sent'].includes(r.payment_status ?? '')).length, color: 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/30' },
                            ].map(c => (
                                <div key={c.label} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${c.color}`}>
                                    <span className="font-bold tabular-nums">{c.count}</span>
                                    <span>{c.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Desktop summary cards ── */}
                    <div className="relative -mt-6 mx-4 md:mx-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-2xl border bg-card p-4 shadow-lg flex items-center gap-3">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                                <Stethoscope className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Нийт дүн</p>
                                <p className="text-xl font-bold tabular-nums truncate">{fmtMnt(total_charged)}</p>
                            </div>
                        </div>
                        <div className="rounded-2xl border bg-card p-4 shadow-lg flex items-center gap-3">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                                <CheckCircle2 className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Нийт төлсөн</p>
                                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums truncate">{fmtMnt(total_paid)}</p>
                            </div>
                        </div>
                        <div className="rounded-2xl border bg-card p-4 shadow-lg flex items-center gap-3">
                            <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm bg-gradient-to-br ${total_pending > 0 ? 'from-amber-400 to-orange-500' : 'from-emerald-500 to-teal-600'}`}>
                                <TrendingUp className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Үлдэгдэл</p>
                                <p className={`text-xl font-bold tabular-nums truncate ${total_pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {fmtMnt(total_pending)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Desktop progress bar ── */}
                    {total_charged > 0 && (
                        <div className="mx-4 md:mx-6 mt-3 rounded-2xl border bg-card px-5 py-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-foreground">Нийт төлбөрийн явц</p>
                                <span className={`text-sm font-bold tabular-nums ${paidPct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{paidPct}%</span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 ${paidPct === 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-amber-400 to-emerald-500'}`}
                                    style={{ width: `${paidPct}%` }} />
                            </div>
                            <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground">
                                <span>{fmtMnt(total_paid)} төлсөн</span>
                                <span>{fmtMnt(total_charged)} нийт</span>
                            </div>
                        </div>
                    )}

                    {/* ── Desktop record list ── */}
                    <div className="flex flex-col gap-3 p-4 md:p-6">
                        {records.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
                                <div className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40">
                                    <Stethoscope className="size-9 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-foreground">Эмчилгээний бичлэг байхгүй</p>
                                    <p className="mt-1 text-sm text-muted-foreground max-w-xs">Эмчилгээ хийлгэсний дараа энд харагдана</p>
                                </div>
                            </div>
                        ) : records.map(record => (
                            <RecordCard
                                key={record.id}
                                record={record}
                                onLeasingPay={setLeasingPlanId}
                                onOutstandingPay={(id, amount) => { setOutstandingId(id); setOutstandingAmount(amount); }}
                            />
                        ))}
                    </div>
                </>
            )}
        </PatientLayout>
    );
}
