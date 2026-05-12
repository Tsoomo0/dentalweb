import PatientLayout from '@/layouts/patient-layout';
import { NotificationBell } from '@/components/notification-bell';
import { useIsMobile } from '@/hooks/use-mobile';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import {
    AlertCircle, BadgeCheck, Cake, Calendar, CheckCircle2,
    Eye, EyeOff, KeyRound, Mail, MapPin, Phone, Save, Shield, User,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';

/* ── Types ── */
interface Patient {
    id: number; patient_number: string;
    last_name: string; first_name: string;
    gender: string | null; date_of_birth: string | null;
    phone: string; phone2: string | null;
    email: string | null; address: string | null;
}
interface Props { patient: Patient | null }

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Үйлчлүүлэгчийн портал', href: '/patient/dashboard' },
    { title: 'Профайл', href: '/patient/profile' },
];

const GENDER_OPTIONS = [
    { value: 'male',   label: 'Эрэгтэй' },
    { value: 'female', label: 'Эмэгтэй' },
    { value: 'other',  label: 'Бусад' },
];

/* ── Shared theme ── */
const HERO_GRADIENT = 'linear-gradient(155deg, #059669 0%, #10b981 45%, #0891b2 100%)';
const BTN_GRADIENT  = 'linear-gradient(135deg, #059669, #0891b2)';
const ACCENT        = '#059669';

/* ── Helpers ── */
function calcAge(dob: string | null) {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
}
function pwStrength(pw: string): { score: number; label: string; color: string } {
    if (!pw) return { score: 0, label: '', color: '' };
    let s = 0;
    if (pw.length >= 8)           s++;
    if (pw.length >= 12)          s++;
    if (/[A-Z]/.test(pw))         s++;
    if (/[0-9]/.test(pw))         s++;
    if (/[^A-Za-z0-9]/.test(pw))  s++;
    if (s <= 1) return { score: s, label: 'Маш сул',     color: '#ef4444' };
    if (s <= 2) return { score: s, label: 'Сул',          color: '#f97316' };
    if (s <= 3) return { score: s, label: 'Дунд',         color: '#eab308' };
    if (s <= 4) return { score: s, label: 'Хүчтэй',      color: '#10b981' };
    return               { score: s, label: 'Маш хүчтэй', color: '#059669' };
}

/* ══════════════════════════════════════════════════════════
   Floating-label inputs (shared mobile + desktop)
══════════════════════════════════════════════════════════ */
function FloatInput({ id, label, type = 'text', value, onChange, error, icon: Icon, required, suffix }: {
    id: string; label: string; type?: string; value: string;
    onChange: (v: string) => void; error?: string; icon?: any;
    required?: boolean; suffix?: React.ReactNode;
}) {
    const [focused, setFocused] = useState(false);
    const lifted = focused || value.length > 0;
    return (
        <div className="relative">
            <div className={`relative flex items-center rounded-xl border bg-background transition-all duration-200 ${
                error ? 'border-red-400 ring-1 ring-red-400/30'
                : focused ? 'border-emerald-500 ring-1 ring-emerald-500/20'
                : 'border-input hover:border-muted-foreground/40'
            }`}>
                {Icon && <div className={`ml-3 shrink-0 transition-colors duration-200 ${focused ? 'text-emerald-500' : 'text-muted-foreground/50'}`}><Icon className="size-4" /></div>}
                <div className="relative flex-1">
                    <label htmlFor={id} className={`pointer-events-none absolute left-3 transition-all duration-200 ${
                        lifted ? 'top-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400'
                               : 'top-1/2 -translate-y-1/2 text-sm text-muted-foreground'
                    }`}>
                        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
                    </label>
                    <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
                        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                        className={`w-full bg-transparent px-3 text-sm text-foreground focus:outline-none ${lifted ? 'pb-2 pt-5' : 'py-3'}`} />
                </div>
                {suffix && <div className="mr-2">{suffix}</div>}
            </div>
            {error && <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500"><AlertCircle className="size-3" />{error}</p>}
        </div>
    );
}

function FloatSelect({ id, label, value, onChange, error, icon: Icon, options, placeholder }: {
    id: string; label: string; value: string; onChange: (v: string) => void; error?: string;
    icon?: any; options: { value: string; label: string }[]; placeholder?: string;
}) {
    const [focused, setFocused] = useState(false);
    const lifted = focused || value.length > 0;
    return (
        <div className="relative">
            <div className={`relative flex items-center rounded-xl border bg-background transition-all duration-200 ${
                error ? 'border-red-400 ring-1 ring-red-400/30'
                : focused ? 'border-emerald-500 ring-1 ring-emerald-500/20'
                : 'border-input hover:border-muted-foreground/40'
            }`}>
                {Icon && <div className={`ml-3 shrink-0 transition-colors duration-200 ${focused ? 'text-emerald-500' : 'text-muted-foreground/50'}`}><Icon className="size-4" /></div>}
                <div className="relative flex-1">
                    <label htmlFor={id} className={`pointer-events-none absolute left-3 z-10 transition-all duration-200 ${
                        lifted ? 'top-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400'
                               : 'top-1/2 -translate-y-1/2 text-sm text-muted-foreground'
                    }`}>{label}</label>
                    <select id={id} value={value} onChange={e => onChange(e.target.value)}
                        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                        className={`w-full bg-transparent px-3 text-sm text-foreground focus:outline-none appearance-none ${lifted ? 'pb-2 pt-5' : 'py-3'}`}>
                        <option value="">{placeholder ?? ''}</option>
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>
            {error && <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500"><AlertCircle className="size-3" />{error}</p>}
        </div>
    );
}

function FloatTextarea({ id, label, value, onChange, error, icon: Icon, rows = 3 }: {
    id: string; label: string; value: string; onChange: (v: string) => void;
    error?: string; icon?: any; rows?: number;
}) {
    const [focused, setFocused] = useState(false);
    const lifted = focused || value.length > 0;
    return (
        <div className="relative">
            <div className={`relative flex rounded-xl border bg-background transition-all duration-200 ${
                error ? 'border-red-400 ring-1 ring-red-400/30'
                : focused ? 'border-emerald-500 ring-1 ring-emerald-500/20'
                : 'border-input hover:border-muted-foreground/40'
            }`}>
                {Icon && <div className={`ml-3 mt-3.5 shrink-0 transition-colors duration-200 ${focused ? 'text-emerald-500' : 'text-muted-foreground/50'}`}><Icon className="size-4" /></div>}
                <div className="relative flex-1">
                    <label htmlFor={id} className={`pointer-events-none absolute left-3 transition-all duration-200 ${
                        lifted ? 'top-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400'
                               : 'top-3.5 text-sm text-muted-foreground'
                    }`}>{label}</label>
                    <textarea id={id} value={value} rows={rows} onChange={e => onChange(e.target.value)}
                        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                        className={`w-full resize-none bg-transparent px-3 text-sm text-foreground focus:outline-none ${lifted ? 'pb-2 pt-5' : 'py-3'}`} />
                </div>
            </div>
            {error && <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500"><AlertCircle className="size-3" />{error}</p>}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   Mobile profile
══════════════════════════════════════════════════════════ */
function MobileProfile({ patient }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const flash = props.flash;

    const { data, setData, put, processing, errors } = useForm({
        last_name:     patient?.last_name     ?? '',
        first_name:    patient?.first_name    ?? '',
        gender:        patient?.gender        ?? '',
        date_of_birth: patient?.date_of_birth ?? '',
        phone:         patient?.phone         ?? '',
        phone2:        patient?.phone2        ?? '',
        email:         patient?.email         ?? '',
        address:       patient?.address       ?? '',
    });

    const pwForm = useForm({ current_password: '', password: '', password_confirmation: '' });
    const [showCur,  setShowCur]  = useState(false);
    const [showNew,  setShowNew]  = useState(false);
    const [showConf, setShowConf] = useState(false);

    const strength = useMemo(() => pwStrength(pwForm.data.password), [pwForm.data.password]);
    const age      = calcAge(data.date_of_birth);

    const completionFields = [data.last_name, data.first_name, data.gender, data.date_of_birth, data.phone, data.email, data.address];
    const completionPct    = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);
    const circ             = 2 * Math.PI * 34;
    const offset           = circ * (1 - completionPct / 100);
    const initials         = `${(data.last_name ?? '').charAt(0)}${(data.first_name ?? '').charAt(0)}`.toUpperCase() || 'Ү';
    const fullName         = `${data.last_name} ${data.first_name}`.trim() || 'Үйлчлүүлэгч';

    function submitProfile(e: FormEvent) { e.preventDefault(); put('/patient/profile'); }
    function submitPassword(e: FormEvent) { e.preventDefault(); pwForm.post('/patient/change-password', { onSuccess: () => pwForm.reset() }); }

    /* Card wrapper */
    function Card({ children }: { children: React.ReactNode }) {
        return (
            <div style={{ background: 'var(--my-card-bg)', borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 10, overflow: 'hidden', border: '1px solid var(--my-divider)' }}>
                {children}
            </div>
        );
    }

    /* Card section title */
    function CardTitle({ icon: Icon, title, color, bg }: { icon: any; title: string; color: string; bg: string }) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 12px', borderBottom: '1px solid var(--my-divider)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={color} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--my-text)' }}>{title}</span>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--my-page-bg)', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' }}>

            {/* ── Hero ── */}
            <div style={{ background: HERO_GRADIENT, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: -24, top: -24, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: '35%', bottom: -24, width: 90, height: 90, borderRadius: '50%', background: 'rgba(0,0,0,0.1)', pointerEvents: 'none' }} />

                {/* Top bar row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 0', position: 'relative' }}>
                    <Link href="/patient/dashboard" style={{ textDecoration: 'none', flexShrink: 0 }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            border: '2px solid rgba(255,255,255,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{initials.charAt(0)}</span>
                        </div>
                    </Link>
                    <h1 style={{ flex: 1, fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, textAlign: 'center' }}>Профайл</h1>
                    <NotificationBell variant="ghost" />
                </div>

                {/* Avatar + ring + name */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, padding: '16px 20px 22px', position: 'relative' }}>
                    {/* SVG ring + avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                            <circle cx="44" cy="44" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4.5" />
                            <circle cx="44" cy="44" r="34" fill="none" stroke="white" strokeWidth="4.5"
                                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
                        </svg>
                        <div style={{
                            width: 88, height: 88, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                            border: '2.5px solid rgba(255,255,255,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: 28, fontWeight: 900, color: 'white' }}>{initials}</span>
                        </div>
                        {/* % badge */}
                        <div style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: 26, height: 26, borderRadius: '50%',
                            background: 'white', color: ACCENT,
                            fontSize: 9, fontWeight: 900,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        }}>
                            {completionPct}%
                        </div>
                    </div>

                    {/* Name + meta */}
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 21, fontWeight: 900, color: 'white', letterSpacing: -0.4 }}>{fullName}</span>
                            {completionPct === 100 && <BadgeCheck size={18} color="rgba(255,255,255,0.85)" />}
                        </div>
                        <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                            {patient?.patient_number && (
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace', fontWeight: 600 }}>
                                    #{patient.patient_number}
                                </span>
                            )}
                            {age !== null && (
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <Cake size={11} />{age} нас
                                </span>
                            )}
                            {data.phone && (
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <Phone size={11} />{data.phone}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Completion card (overlaps hero) ── */}
            <div style={{
                margin: '-20px 16px 12px', position: 'relative', zIndex: 1,
                background: 'var(--my-card-bg)', borderRadius: 20,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)', padding: '14px 16px',
                border: '1px solid var(--my-divider)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--my-muted)' }}>Профайлын бүрэн байдал</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: completionPct === 100 ? ACCENT : '#d97706' }}>{completionPct}%</span>
                </div>
                <div style={{ height: 7, background: 'var(--my-pill-bg)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', borderRadius: 99, width: `${completionPct}%`,
                        background: completionPct === 100 ? BTN_GRADIENT : 'linear-gradient(90deg, #f59e0b, #10b981)',
                        transition: 'width 0.7s ease',
                    }} />
                </div>
                {completionPct < 100 ? (
                    <p style={{ marginTop: 6, fontSize: 11, color: 'var(--my-faint)' }}>
                        Бүрэн мэдээлэл оруулснаар эмчид тань хурдан туслах боломжтой
                    </p>
                ) : (
                    <p style={{ marginTop: 6, fontSize: 11, color: ACCENT, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12} color={ACCENT} /> Таны профайл бүрэн бөглөгдсөн
                    </p>
                )}
            </div>

            {/* ── Forms ── */}
            <div style={{ padding: '0 16px 32px' }}>

                {/* Flash */}
                {flash?.success && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                        borderRadius: 16, padding: '12px 14px',
                    }}>
                        <CheckCircle2 size={16} color="#10b981" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: ACCENT }}>{flash.success}</span>
                    </div>
                )}

                {/* ── Personal info ── */}
                <form onSubmit={submitProfile}>
                    <Card>
                        <CardTitle icon={User} title="Хувийн мэдээлэл" color={ACCENT} bg="rgba(16,185,129,0.12)" />
                        <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <FloatInput id="last_name"  label="Овог"  required value={data.last_name}  onChange={v => setData('last_name', v)}  error={errors.last_name}  icon={User} />
                                <FloatInput id="first_name" label="Нэр"   required value={data.first_name} onChange={v => setData('first_name', v)} error={errors.first_name} icon={User} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <FloatSelect id="gender" label="Хүйс" value={data.gender} onChange={v => setData('gender', v)} error={errors.gender} options={GENDER_OPTIONS} placeholder="— Сонгоно уу —" />
                                <FloatInput  id="date_of_birth" label="Төрсөн огноо" type="date" value={data.date_of_birth} onChange={v => setData('date_of_birth', v)} error={errors.date_of_birth} icon={Calendar} />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <CardTitle icon={Phone} title="Холбоо барих" color="#2563eb" bg="rgba(37,99,235,0.1)" />
                        <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <FloatInput id="phone"  label="Утасны дугаар" required type="tel" value={data.phone}         onChange={v => setData('phone', v)}  error={errors.phone}  icon={Phone} />
                                <FloatInput id="phone2" label="Нэмэлт утас"           type="tel" value={data.phone2 ?? ''}   onChange={v => setData('phone2', v)} error={errors.phone2} icon={Phone} />
                            </div>
                            <FloatInput    id="email"   label="Имэйл хаяг" type="email" value={data.email ?? ''}   onChange={v => setData('email', v)}   error={errors.email}   icon={Mail} />
                            <FloatTextarea id="address" label="Хаяг"                   value={data.address ?? ''} onChange={v => setData('address', v)} error={errors.address} icon={MapPin} rows={2} />
                        </div>
                    </Card>

                    <button type="submit" disabled={processing} style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        background: BTN_GRADIENT, border: 'none', borderRadius: 16, padding: '15px',
                        fontSize: 15, fontWeight: 800, color: 'white', cursor: 'pointer', marginBottom: 16,
                        boxShadow: '0 4px 16px rgba(5,150,105,0.32)', opacity: processing ? 0.7 : 1,
                    }}>
                        {processing
                            ? <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                            : <Save size={17} />}
                        Мэдээлэл хадгалах
                    </button>
                </form>

                {/* ── Password ── */}
                <form onSubmit={submitPassword}>
                    <Card>
                        <CardTitle icon={Shield} title="Нууц үг солих" color="#7c3aed" bg="rgba(124,58,237,0.1)" />
                        <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <FloatInput
                                id="current_password" label="Одоогийн нууц үг"
                                type={showCur ? 'text' : 'password'}
                                value={pwForm.data.current_password}
                                onChange={v => pwForm.setData('current_password', v)}
                                error={pwForm.errors.current_password} icon={KeyRound}
                                suffix={
                                    <button type="button" onClick={() => setShowCur(v => !v)} className="p-1 text-muted-foreground/60 hover:text-muted-foreground">
                                        {showCur ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                }
                            />
                            <FloatInput
                                id="new_password" label="Шинэ нууц үг"
                                type={showNew ? 'text' : 'password'}
                                value={pwForm.data.password}
                                onChange={v => pwForm.setData('password', v)}
                                error={pwForm.errors.password} icon={KeyRound}
                                suffix={
                                    <button type="button" onClick={() => setShowNew(v => !v)} className="p-1 text-muted-foreground/60 hover:text-muted-foreground">
                                        {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                }
                            />

                            {/* Strength bars */}
                            {pwForm.data.password && (
                                <div style={{ padding: '0 2px' }}>
                                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                                        {[1,2,3,4,5].map(i => (
                                            <div key={i} style={{
                                                flex: 1, height: 4, borderRadius: 99,
                                                background: i <= strength.score ? strength.color : 'var(--my-divider)',
                                                transition: 'background 0.3s',
                                            }} />
                                        ))}
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: strength.color }}>{strength.label}</span>
                                </div>
                            )}

                            <FloatInput
                                id="pw_confirm" label="Дахин оруулах"
                                type={showConf ? 'text' : 'password'}
                                value={pwForm.data.password_confirmation}
                                onChange={v => pwForm.setData('password_confirmation', v)}
                                error={pwForm.errors.password_confirmation} icon={KeyRound}
                                suffix={
                                    <button type="button" onClick={() => setShowConf(v => !v)} className="p-1 text-muted-foreground/60 hover:text-muted-foreground">
                                        {showConf ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                }
                            />

                            {/* Requirements checklist */}
                            <div style={{ background: 'var(--my-pill-bg)', borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--my-muted)', letterSpacing: 0.5 }}>ШААРДЛАГА</span>
                                {[
                                    { check: pwForm.data.password.length >= 8,           text: 'Хамгийн багадаа 8 тэмдэгт' },
                                    { check: /[A-Z]/.test(pwForm.data.password),         text: 'Том үсэг агуулсан (A–Z)' },
                                    { check: /[0-9]/.test(pwForm.data.password),         text: 'Тоо агуулсан (0–9)' },
                                    { check: /[^A-Za-z0-9]/.test(pwForm.data.password), text: 'Тусгай тэмдэгт (!@#...)' },
                                ].map(tip => (
                                    <div key={tip.text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                                            background: tip.check ? '#10b981' : 'var(--my-divider)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'background 0.2s',
                                        }}>
                                            {tip.check && <CheckCircle2 size={10} color="white" />}
                                        </div>
                                        <span style={{ fontSize: 12, color: tip.check ? ACCENT : 'var(--my-muted)', fontWeight: tip.check ? 600 : 400 }}>
                                            {tip.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <button type="submit" disabled={pwForm.processing} style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        border: 'none', borderRadius: 16, padding: '15px',
                        fontSize: 15, fontWeight: 800, color: 'white', cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(124,58,237,0.32)', opacity: pwForm.processing ? 0.7 : 1,
                    }}>
                        {pwForm.processing
                            ? <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                            : <Shield size={17} />}
                        Нууц үг солих
                    </button>
                </form>
            </div>

            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   Desktop profile
══════════════════════════════════════════════════════════ */
function DesktopProfile({ patient }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const flash = props.flash;

    const { data, setData, put, processing, errors } = useForm({
        last_name:     patient?.last_name     ?? '',
        first_name:    patient?.first_name    ?? '',
        gender:        patient?.gender        ?? '',
        date_of_birth: patient?.date_of_birth ?? '',
        phone:         patient?.phone         ?? '',
        phone2:        patient?.phone2        ?? '',
        email:         patient?.email         ?? '',
        address:       patient?.address       ?? '',
    });

    const pwForm = useForm({ current_password: '', password: '', password_confirmation: '' });
    const [showCur,  setShowCur]  = useState(false);
    const [showNew,  setShowNew]  = useState(false);
    const [showConf, setShowConf] = useState(false);

    const strength = useMemo(() => pwStrength(pwForm.data.password), [pwForm.data.password]);
    const age = calcAge(data.date_of_birth);

    const completionFields = [data.last_name, data.first_name, data.gender, data.date_of_birth, data.phone, data.email, data.address];
    const completionPct    = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);
    const circumference    = 2 * Math.PI * 28;
    const dashOffset       = circumference * (1 - completionPct / 100);
    const initials         = `${(data.last_name ?? '').charAt(0)}${(data.first_name ?? '').charAt(0)}`.toUpperCase() || 'Ү';

    function submitProfile(e: FormEvent) { e.preventDefault(); put('/patient/profile'); }
    function submitPassword(e: FormEvent) { e.preventDefault(); pwForm.post('/patient/change-password', { onSuccess: () => pwForm.reset() }); }

    return (
        <div className="flex flex-1 flex-col gap-0">
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 px-6 pb-16 pt-8">
                <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-black/10" />
                <div className="relative flex items-end gap-5">
                    <div className="relative shrink-0">
                        <svg className="absolute inset-0 -rotate-90" width="80" height="80" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                            <circle cx="40" cy="40" r="28" fill="none" stroke="white" strokeWidth="4"
                                strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                        </svg>
                        <div className="flex size-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white text-2xl font-bold border-2 border-white/30">
                            {initials}
                        </div>
                        <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-white text-emerald-600 text-[10px] font-bold shadow">
                            {completionPct}%
                        </div>
                    </div>
                    <div className="pb-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold text-white leading-tight">{data.last_name} {data.first_name}</h1>
                            {completionPct === 100 && <BadgeCheck className="size-5 text-white/80" />}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {patient?.patient_number && <span className="font-mono text-xs text-white/70">#{patient.patient_number}</span>}
                            {age !== null && <span className="flex items-center gap-1 text-xs text-white/70"><Cake className="size-3" />{age} нас</span>}
                            {data.phone && <span className="flex items-center gap-1 text-xs text-white/70"><Phone className="size-3" />{data.phone}</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative -mt-6 mx-6 rounded-2xl border bg-card px-5 py-3.5 shadow-md">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-foreground">Профайлын бүрэн байдал</p>
                    <span className={`text-xs font-semibold ${completionPct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{completionPct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${completionPct === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-amber-400 to-emerald-500'}`}
                        style={{ width: `${completionPct}%` }} />
                </div>
                {completionPct < 100
                    ? <p className="mt-1.5 text-[11px] text-muted-foreground">Бүрэн мэдээлэл оруулснаар эмчид тань хурдан туслах боломжтой болно</p>
                    : <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-600"><CheckCircle2 className="size-3" />Таны профайл бүрэн бөглөгдсөн байна</p>
                }
            </div>

            <div className="flex flex-1 flex-col gap-6 p-6">
                {flash?.success && (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 shadow-sm dark:bg-emerald-950/30">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{flash.success}</p>
                    </div>
                )}

                <form onSubmit={submitProfile} className="space-y-5">
                    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-5">
                        <div className="flex items-center gap-3 pb-4 border-b border-border">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm"><User className="size-4" /></div>
                            <h2 className="font-semibold text-foreground">Хувийн мэдээлэл</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FloatInput id="last_name2"  label="Овог" required value={data.last_name}  onChange={v => setData('last_name', v)}  error={errors.last_name}  icon={User} />
                            <FloatInput id="first_name2" label="Нэр"  required value={data.first_name} onChange={v => setData('first_name', v)} error={errors.first_name} icon={User} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FloatSelect id="gender2" label="Хүйс" value={data.gender} onChange={v => setData('gender', v)} error={errors.gender} options={GENDER_OPTIONS} placeholder="— Сонгоно уу —" />
                            <FloatInput  id="dob2" label="Төрсөн огноо" type="date" value={data.date_of_birth} onChange={v => setData('date_of_birth', v)} error={errors.date_of_birth} icon={Calendar} />
                        </div>
                    </div>
                    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-5">
                        <div className="flex items-center gap-3 pb-4 border-b border-border">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-sm"><Phone className="size-4" /></div>
                            <h2 className="font-semibold text-foreground">Холбоо барих</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FloatInput id="phone2d"  label="Утасны дугаар" required type="tel" value={data.phone}       onChange={v => setData('phone', v)}  error={errors.phone}  icon={Phone} />
                            <FloatInput id="phone22d" label="Нэмэлт утас"           type="tel" value={data.phone2 ?? ''} onChange={v => setData('phone2', v)} error={errors.phone2} icon={Phone} />
                        </div>
                        <FloatInput    id="email2"   label="Имэйл хаяг" type="email" value={data.email ?? ''}   onChange={v => setData('email', v)}   error={errors.email}   icon={Mail} />
                        <FloatTextarea id="address2" label="Хаяг"                   value={data.address ?? ''} onChange={v => setData('address', v)} error={errors.address} icon={MapPin} rows={2} />
                    </div>
                    <button type="submit" disabled={processing}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 transition-all duration-200 active:scale-95">
                        {processing ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Save className="size-4" />}
                        Мэдээлэл хадгалах
                    </button>
                </form>

                <form onSubmit={submitPassword} className="space-y-5">
                    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-5">
                        <div className="flex items-center gap-3 pb-4 border-b border-border">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm"><Shield className="size-4" /></div>
                            <h2 className="font-semibold text-foreground">Нууц үг солих</h2>
                        </div>
                        <FloatInput id="cp2" label="Одоогийн нууц үг" type={showCur ? 'text' : 'password'}
                            value={pwForm.data.current_password} onChange={v => pwForm.setData('current_password', v)}
                            error={pwForm.errors.current_password} icon={KeyRound}
                            suffix={<button type="button" onClick={() => setShowCur(v => !v)} className="p-1 text-muted-foreground/60 hover:text-muted-foreground">{showCur ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <FloatInput id="np2" label="Шинэ нууц үг" type={showNew ? 'text' : 'password'}
                                    value={pwForm.data.password} onChange={v => pwForm.setData('password', v)}
                                    error={pwForm.errors.password} icon={KeyRound}
                                    suffix={<button type="button" onClick={() => setShowNew(v => !v)} className="p-1 text-muted-foreground/60 hover:text-muted-foreground">{showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>} />
                                {pwForm.data.password && (
                                    <div className="space-y-1 px-1">
                                        <div className="flex gap-1">{[1,2,3,4,5].map(i => <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300" style={{ background: i <= strength.score ? strength.color : 'hsl(var(--muted))' }} />)}</div>
                                        <p className="text-[10px] font-medium" style={{ color: strength.color }}>{strength.label}</p>
                                    </div>
                                )}
                            </div>
                            <FloatInput id="pc2" label="Дахин оруулах" type={showConf ? 'text' : 'password'}
                                value={pwForm.data.password_confirmation} onChange={v => pwForm.setData('password_confirmation', v)}
                                error={pwForm.errors.password_confirmation} icon={KeyRound}
                                suffix={<button type="button" onClick={() => setShowConf(v => !v)} className="p-1 text-muted-foreground/60 hover:text-muted-foreground">{showConf ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>} />
                        </div>
                        <div className="rounded-xl bg-muted/50 p-3.5 space-y-1.5">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Нууц үгийн шаардлага</p>
                            {[
                                { check: pwForm.data.password.length >= 8,           text: 'Хамгийн багадаа 8 тэмдэгт' },
                                { check: /[A-Z]/.test(pwForm.data.password),         text: 'Том үсэг агуулсан (A-Z)' },
                                { check: /[0-9]/.test(pwForm.data.password),         text: 'Тоо агуулсан (0-9)' },
                                { check: /[^A-Za-z0-9]/.test(pwForm.data.password), text: 'Тусгай тэмдэгт (!@#...)' },
                            ].map(tip => (
                                <div key={tip.text} className="flex items-center gap-2">
                                    <div className={`size-3.5 rounded-full flex items-center justify-center transition-colors ${tip.check ? 'bg-emerald-500' : 'bg-muted-foreground/20'}`}>
                                        {tip.check && <CheckCircle2 className="size-2.5 text-white" />}
                                    </div>
                                    <p className={`text-[11px] transition-colors ${tip.check ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>{tip.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button type="submit" disabled={pwForm.processing}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:from-violet-600 hover:to-purple-700 disabled:opacity-60 transition-all duration-200 active:scale-95">
                        {pwForm.processing ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Shield className="size-4" />}
                        Нууц үг солих
                    </button>
                </form>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   Export
══════════════════════════════════════════════════════════ */
export default function PatientProfile({ patient }: Props) {
    const isMobile = useIsMobile();
    return (
        <PatientLayout breadcrumbs={isMobile ? [] : breadcrumbs}>
            <Head title="Профайл" />
            {isMobile
                ? <MobileProfile patient={patient} />
                : <DesktopProfile patient={patient} />
            }
        </PatientLayout>
    );
}
