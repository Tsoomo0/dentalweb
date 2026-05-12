import DoctorLayout from '@/layouts/doctor-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import {
    Award, Briefcase, Building2, CalendarDays, CheckCircle2,
    Eye, EyeOff, KeyRound, Mail, MapPin, Phone, Shield,
    Stethoscope, UserRound,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { FormEvent, useState } from 'react';

interface Experience {
    year: string;
    title: string;
    institution: string;
}

interface Doctor {
    id: number;
    name: string;
    email: string;
    specialization: string | null;
    degree: string | null;
    experience_years: number;
    experiences: Experience[] | null;
    description: string | null;
    phone: string | null;
    is_active: boolean;
    photo_url: string | null;
    branch_name: string | null;
    employee_id: number | null;
}

interface Props {
    doctor: Doctor;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Хяналтын самбар', href: '/doctor/dashboard' },
    { title: 'Миний профайл', href: '/doctor/profile' },
];

export default function DoctorProfile({ doctor }: Props) {
    const isMobile = useIsMobile();
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew,     setShowNew]     = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, put, processing, errors, reset, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    function submitPassword(e: FormEvent) {
        e.preventDefault();
        put('/doctor/profile/password', {
            onSuccess: () => reset(),
        });
    }

    function initials(name: string) {
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }

    const infoItems = [
        doctor.specialization && { icon: Stethoscope, label: 'Мэргэжил',       value: doctor.specialization },
        doctor.degree         && { icon: Award,       label: 'Зэрэг',          value: doctor.degree },
        doctor.experience_years && { icon: Briefcase, label: 'Туршлага',       value: `${doctor.experience_years} жил` },
        doctor.branch_name    && { icon: Building2,   label: 'Салбар',         value: doctor.branch_name },
        doctor.phone          && { icon: Phone,       label: 'Утас',           value: doctor.phone },
        doctor.email          && { icon: Mail,        label: 'И-мэйл',         value: doctor.email },
    ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

    /* ════════ MOBILE ════════ */
    if (isMobile) {
        const inpBase: React.CSSProperties = { width: '100%', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--background)', padding: '11px 12px 11px 40px', fontSize: 14, color: 'var(--foreground)', outline: 'none', boxSizing: 'border-box' };
        const iconCfg: Record<string, { bg: string; color: string }> = {
            Мэргэжил: { bg: '#eff6ff', color: '#3b82f6' },
            Зэрэг:    { bg: '#f5f3ff', color: '#7c3aed' },
            Туршлага: { bg: '#fff7ed', color: '#f97316' },
            Салбар:   { bg: '#f0fdf4', color: '#16a34a' },
            Утас:     { bg: '#fefce8', color: '#ca8a04' },
            'И-мэйл': { bg: '#fdf2f8', color: '#db2777' },
        };
        return (
            <DoctorLayout breadcrumbs={breadcrumbs}>
                <Head title="Миний профайл" />
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh', background: 'var(--background)' }}>

                    {/* ══ HERO ══ */}
                    <div style={{ background: 'linear-gradient(155deg,#0f172a 0%,#450a0a 55%,#0f172a 100%)', padding: '22px 20px 28px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                        {/* decorative blobs */}
                        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(220,38,38,0.1)' }} />
                        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                        <div style={{ position: 'absolute', top: '30%', left: '55%', width: 70, height: 70, borderRadius: '50%', background: 'rgba(220,38,38,0.07)' }} />
                        {/* dot grid */}
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

                        {/* Avatar */}
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                            <div style={{ position: 'relative' }}>
                                {doctor.photo_url ? (
                                    <img src={doctor.photo_url} alt={doctor.name} style={{ width: 88, height: 88, borderRadius: 26, objectFit: 'cover', objectPosition: 'top', border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }} />
                                ) : (
                                    <div style={{ width: 88, height: 88, borderRadius: 26, background: 'linear-gradient(135deg,rgba(220,38,38,0.3),rgba(239,68,68,0.15))', border: '3px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                                        <span style={{ fontSize: 30, fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>{initials(doctor.name)}</span>
                                    </div>
                                )}
                                {/* active dot */}
                                <div style={{ position: 'absolute', bottom: -3, right: -3, width: 20, height: 20, borderRadius: '50%', background: doctor.is_active ? '#22c55e' : '#6b7280', border: '3px solid #0f172a', boxShadow: doctor.is_active ? '0 0 8px rgba(34,197,94,0.6)' : 'none' }} />
                            </div>

                            {/* Name + status */}
                            <div style={{ textAlign: 'center' }}>
                                <h1 style={{ margin: 0, color: 'white', fontSize: 22, fontWeight: 800, lineHeight: 1.15 }}>{doctor.name}</h1>
                                {doctor.specialization && (
                                    <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 500 }}>{doctor.specialization}</p>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: doctor.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(107,114,128,0.2)', border: `1px solid ${doctor.is_active ? 'rgba(34,197,94,0.35)' : 'rgba(107,114,128,0.35)'}`, color: doctor.is_active ? '#86efac' : 'rgba(255,255,255,0.5)', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: doctor.is_active ? '#22c55e' : '#6b7280' }} />
                                        {doctor.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                                    </span>
                                    {doctor.branch_name && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.7)', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                                            <MapPin style={{ width: 11, height: 11 }} />{doctor.branch_name}
                                        </span>
                                    )}
                                    {doctor.experience_years > 0 && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', color: '#fde68a', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                                            <Briefcase style={{ width: 11, height: 11 }} />{doctor.experience_years} жил
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ══ SCROLLABLE CONTENT ══ */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 'calc(100px + env(safe-area-inset-bottom,0px))', display: 'flex', flexDirection: 'column', gap: 14 }}>

                        {/* ── INFO CARD ── */}
                        {infoItems.length > 0 && (
                            <div style={{ background: 'var(--card)', borderRadius: 22, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <UserRound style={{ width: 13, height: 13, color: 'white' }} />
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Мэдээлэл</span>
                                </div>
                                <div>
                                    {infoItems.map(({ icon: Icon, label, value }, i) => {
                                        const cfg = iconCfg[label] ?? { bg: 'var(--muted)', color: 'var(--muted-foreground)' };
                                        return (
                                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', borderBottom: i < infoItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                                <div style={{ width: 38, height: 38, borderRadius: 12, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Icon style={{ width: 16, height: 16, color: cfg.color }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
                                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{value}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── DESCRIPTION ── */}
                        {doctor.description && (
                            <div style={{ background: 'var(--card)', borderRadius: 22, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg,#8b5cf6,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <UserRound style={{ width: 13, height: 13, color: 'white' }} />
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Товч танилцуулга</span>
                                </div>
                                <p style={{ margin: 0, padding: '14px 16px', fontSize: 14, color: 'var(--foreground)', lineHeight: 1.65, opacity: 0.85 }}>{doctor.description}</p>
                            </div>
                        )}

                        {/* ── EXPERIENCES ── */}
                        {doctor.experiences && doctor.experiences.length > 0 && (
                            <div style={{ background: 'var(--card)', borderRadius: 22, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg,#f59e0b,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CalendarDays style={{ width: 13, height: 13, color: 'white' }} />
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Туршлага & боловсрол</span>
                                </div>
                                {/* Timeline */}
                                <div style={{ padding: '14px 16px', position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: 33, top: 14, bottom: 14, width: 2, background: 'var(--border)', borderRadius: 1 }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        {doctor.experiences.map((exp, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                                {/* Year chip */}
                                                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,rgba(220,38,38,0.12),rgba(239,68,68,0.06))', border: '1px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 800, color: '#dc2626', position: 'relative', zIndex: 1 }}>
                                                    {exp.year}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.3 }}>{exp.title}</p>
                                                    {exp.institution && (
                                                        <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>{exp.institution}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── PASSWORD ── */}
                        {doctor.employee_id ? (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: 'var(--card)', borderRadius: 22, border: '1px solid var(--border)', padding: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Shield style={{ width: 18, height: 18, color: '#3b82f6' }} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Нууц үг солих</p>
                                    <p style={{ margin: '4px 0 10px', fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>Нууц үгийг HR хэсэгт солино уу.</p>
                                    <a href="/portal/hr" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                                        HR хэсэгт орох →
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div style={{ background: 'var(--card)', borderRadius: 22, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg,#dc2626,#9f1239)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Shield style={{ width: 13, height: 13, color: 'white' }} />
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Нууц үг солих</span>
                                </div>
                                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {recentlySuccessful && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 14, padding: '11px 14px' }}>
                                            <CheckCircle2 style={{ width: 16, height: 16, color: '#22c55e', flexShrink: 0 }} />
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#16a34a' }}>Нууц үг амжилттай өөрчлөгдлөө.</p>
                                        </div>
                                    )}
                                    {([
                                        { label: 'Одоогийн нууц үг', field: 'current_password' as const, show: showCurrent, setShow: setShowCurrent, val: data.current_password, err: errors.current_password, ph: '••••••••' },
                                        { label: 'Шинэ нууц үг',     field: 'password'          as const, show: showNew,     setShow: setShowNew,     val: data.password,          err: errors.password,          ph: 'Хамгийн багадаа 6 тэмдэгт' },
                                        { label: 'Нууц үг давтах',   field: 'password_confirmation' as const, show: showConfirm, setShow: setShowConfirm, val: data.password_confirmation, err: errors.password_confirmation, ph: '••••••••' },
                                    ]).map(({ label, field, show, setShow, val, err, ph }) => (
                                        <div key={field}>
                                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 7 }}>{label}</label>
                                            <div style={{ position: 'relative' }}>
                                                <KeyRound style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--muted-foreground)' }} />
                                                <input type={show ? 'text' : 'password'} value={val} onChange={e => setData(field, e.target.value)} placeholder={ph} style={inpBase} />
                                                <button type="button" onClick={() => setShow(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}>
                                                    {show ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                                                </button>
                                            </div>
                                            {err && <p style={{ margin: '5px 0 0', fontSize: 11, color: '#ef4444' }}>{err}</p>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={e => submitPassword(e as unknown as FormEvent)} disabled={processing} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#dc2626', color: 'white', border: 'none', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: processing ? 0.6 : 1, boxShadow: '0 4px 16px rgba(220,38,38,0.35)', transition: 'all 0.15s' }}>
                                        {processing ? <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> : <Shield style={{ width: 16, height: 16 }} />}
                                        {processing ? 'Хадгалж байна…' : 'Нууц үг солих'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── ADMIN NOTE ── */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 18, padding: '14px 16px' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                <Shield style={{ width: 14, height: 14, color: '#3b82f6' }} />
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: '#3b82f6', lineHeight: 1.6 }}>
                                Таны мэргэжлийн мэдээлэл (зураг, мэргэжил, туршлага гэх мэт)-ийг зөвхөн систем хариуцсан <strong>администратор</strong> өөрчлөх боломжтой. Өөрчлөлт хийлгэхийг хүсвэл администратортай холбогдоно уу.
                            </p>
                        </div>
                    </div>
                </div>
            </DoctorLayout>
        );
    }

    return (
        <DoctorLayout breadcrumbs={breadcrumbs}>
            <Head title="Миний профайл" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* ── Page header ── */}
                <div>
                    <h1 className="text-2xl font-bold">Миний профайл</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Таны мэргэжлийн мэдээлэл болон тохиргоо</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">

                    {/* ── LEFT: Profile card ── */}
                    <div className="lg:col-span-1 space-y-4">

                        {/* Photo + name card */}
                        <div className="rounded-2xl border bg-card shadow-sm">
                            {/* Gradient banner */}
                            <div className="h-24 bg-gradient-to-br from-red-500 via-red-600 to-rose-700 relative rounded-t-2xl overflow-hidden">
                                <div className="pointer-events-none absolute inset-0 opacity-20"
                                    style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                            </div>

                            {/* Avatar — overlaps banner */}
                            <div className="px-6 pb-5">
                                <div className="relative -mt-10 mb-4 w-fit">
                                    {doctor.photo_url ? (
                                        <img src={doctor.photo_url} alt={doctor.name}
                                            className="size-20 rounded-2xl object-cover object-top ring-4 ring-card shadow-lg" />
                                    ) : (
                                        <div className="flex size-20 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/50 ring-4 ring-card shadow-lg">
                                            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                {initials(doctor.name)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h2 className="text-lg font-bold leading-tight">{doctor.name}</h2>
                                        {doctor.specialization && (
                                            <p className="text-sm text-muted-foreground mt-0.5">{doctor.specialization}</p>
                                        )}
                                    </div>
                                    {doctor.is_active ? (
                                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-100 dark:bg-green-950/40 px-2.5 py-1 text-[11px] font-semibold text-green-700 dark:text-green-400">
                                            <span className="size-1.5 rounded-full bg-green-500" />
                                            Идэвхтэй
                                        </span>
                                    ) : (
                                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                                            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                                            Идэвхгүй
                                        </span>
                                    )}
                                </div>

                                {doctor.branch_name && (
                                    <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <MapPin className="size-3.5 shrink-0" />
                                        {doctor.branch_name}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contact & info list */}
                        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                            <div className="border-b bg-muted/30 px-5 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Мэдээлэл</p>
                            </div>
                            <div className="divide-y">
                                {infoItems.map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="flex items-center gap-3 px-5 py-3">
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                            <Icon className="size-3.5 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                                            <p className="truncate text-sm font-medium">{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Details + password ── */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Description */}
                        {doctor.description && (
                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                <div className="border-b bg-muted/30 px-5 py-3 flex items-center gap-2">
                                    <UserRound className="size-4 text-muted-foreground" />
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Товч танилцуулга</p>
                                </div>
                                <div className="px-5 py-4">
                                    <p className="text-sm leading-relaxed text-foreground/80">{doctor.description}</p>
                                </div>
                            </div>
                        )}

                        {/* Experiences */}
                        {doctor.experiences && doctor.experiences.length > 0 && (
                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                <div className="border-b bg-muted/30 px-5 py-3 flex items-center gap-2">
                                    <CalendarDays className="size-4 text-muted-foreground" />
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Туршлага & боловсрол</p>
                                </div>
                                <div className="divide-y">
                                    {doctor.experiences.map((exp, i) => (
                                        <div key={i} className="flex items-start gap-4 px-5 py-4">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30 text-[11px] font-bold text-red-600 dark:text-red-400">
                                                {exp.year}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-sm leading-tight">{exp.title}</p>
                                                {exp.institution && (
                                                    <p className="text-sm text-muted-foreground mt-0.5">{exp.institution}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Password change — зөвхөн HR-д бүртгэлгүй эмчид харагдана */}
                        {doctor.employee_id ? (
                            <div className="flex items-start gap-3 rounded-2xl border bg-card shadow-sm px-5 py-4">
                                <Shield className="size-4 text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Нууц үг солих</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Нууц үгийг HR хэсэгт солино уу.
                                    </p>
                                    <a href="/portal/hr"
                                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                                        HR хэсэгт орох →
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                <div className="border-b bg-muted/30 px-5 py-3 flex items-center gap-2">
                                    <Shield className="size-4 text-muted-foreground" />
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Нууц үг солих</p>
                                </div>

                                <form onSubmit={submitPassword} className="p-5 space-y-4">
                                    {recentlySuccessful && (
                                        <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 px-4 py-3">
                                            <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0" />
                                            <p className="text-sm font-medium text-green-700 dark:text-green-400">Нууц үг амжилттай өөрчлөгдлөө.</p>
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Одоогийн нууц үг</label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                            <input type={showCurrent ? 'text' : 'password'} value={data.current_password}
                                                onChange={e => setData('current_password', e.target.value)} placeholder="••••••••"
                                                className="w-full rounded-xl border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                            <button type="button" onClick={() => setShowCurrent(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                                {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </div>
                                        {errors.current_password && <p className="text-xs text-red-500">{errors.current_password}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Шинэ нууц үг</label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                            <input type={showNew ? 'text' : 'password'} value={data.password}
                                                onChange={e => setData('password', e.target.value)} placeholder="Хамгийн багадаа 6 тэмдэгт"
                                                className="w-full rounded-xl border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                            <button type="button" onClick={() => setShowNew(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </div>
                                        {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Нууц үг давтах</label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                            <input type={showConfirm ? 'text' : 'password'} value={data.password_confirmation}
                                                onChange={e => setData('password_confirmation', e.target.value)} placeholder="••••••••"
                                                className="w-full rounded-xl border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                            <button type="button" onClick={() => setShowConfirm(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </div>
                                        {errors.password_confirmation && <p className="text-xs text-red-500">{errors.password_confirmation}</p>}
                                    </div>
                                    <button type="submit" disabled={processing}
                                        className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
                                        {processing
                                            ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                            : <Shield className="size-4" />}
                                        Нууц үг солих
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Admin info note */}
                        <div className="flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 px-4 py-3.5">
                            <Shield className="size-4 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                                Таны мэргэжлийн мэдээлэл (зураг, мэргэжил, туршлага гэх мэт)-ийг зөвхөн систем хариуцсан <strong>администратор</strong> өөрчлөх боломжтой. Өөрчлөлт хийлгэхийг хүсвэл администратортай холбогдоно уу.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </DoctorLayout>
    );
}
