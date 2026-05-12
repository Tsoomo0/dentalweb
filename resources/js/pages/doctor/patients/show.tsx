import DoctorLayout from '@/layouts/doctor-layout';
import PatientMedicalForm from '@/components/patient-medical-form';
import PatientOrthoForm from '@/components/patient-ortho-form';
import PatientOrthoVisitForm, { type OrthoVisit } from '@/components/patient-ortho-visit-form';
import PatientGeneralVisitForm, { type GeneralVisit } from '@/components/patient-general-visit-form';
import { Head, Link, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    ArrowLeft, Calendar, CheckCircle2, ChevronDown, ChevronRight, ChevronUp,
    CreditCard, FileText, Heart, Image, Mail, MapPin, Minus,
    Phone, Plus, Send, Stethoscope, Trash2, Upload, User, X,
} from 'lucide-react';

/* ── Types ── */
interface Doctor { id: number; name: string }
interface Appointment {
    id: number; appointment_number: string; appointment_date: string;
    service: string | null; status: string;
}
interface ServiceItem { name: string; price: number | null }
interface LeasingPlan {
    id: number; months: number; paid_months: number; monthly_amount: number; total_amount: number;
}
interface TreatmentRecord {
    id: number; record_date: string; doctor: Doctor | null;
    services: ServiceItem[] | null;
    doctor_notes: string | null;
    amount_charged: number | null;
    payment_status: string | null;
    paid_amount: number | null;
    leasing_plan: LeasingPlan | null;
}
interface SignedForm {
    id: number; template_id: number; signer_name: string; signed_at: string;
    patient_signature: string | null;
    guardian_name: string | null;
    guardian_signature: string | null;
    template: { code: string; title: string; category: string; content: string };
}
interface MedHistory {
    id?: number; updated_at?: string;
    has_heart_disease: boolean; has_diabetes: boolean; has_hypertension: boolean;
    has_hepatitis: boolean; has_bleeding_disorder: boolean; has_asthma: boolean;
    has_epilepsy: boolean; has_kidney_disease: boolean; has_hiv: boolean;
    is_pregnant: boolean; is_nursing: boolean; other_conditions: string | null;
    allergy_penicillin: boolean; allergy_aspirin: boolean;
    allergy_latex: boolean; allergy_anesthetic: boolean;
    allergy_other: string | null; current_medications: string | null;
}
interface OrthoMedia {
    id: number; type: 'xray' | 'before' | 'after'; file_name: string; url: string; created_at: string;
}
interface Patient {
    id: number; patient_number: string; last_name: string; first_name: string;
    gender: string | null; date_of_birth: string | null; phone: string;
    phone2: string | null; email: string | null; address: string | null;
    register_number: string | null; notes: string | null;
    emergency_contact_name: string | null; emergency_contact_phone: string | null;
    emergency_contact_relation: string | null;
    medical_history: MedHistory | null;
    ortho_assessment: { id?: number; updated_at?: string; data: Record<string, unknown> } | null;
    ortho_visits: OrthoVisit[];
    general_visits: GeneralVisit[];
    ortho_media: OrthoMedia[];
    consent_forms: SignedForm[];
    treatment_records: TreatmentRecord[];
    appointments: Appointment[];
}
interface Props { patient: Patient; appointment_id: number | null }

/* ── Constants ── */
const CAT_LABEL: Record<string, string> = {
    treat: 'Ерөнхий', endo: 'Сувгийн', ortho: 'Зэр засал',
    perio: 'Буйл', prostho: 'Протез', surg: 'Мэс засал', prevent: 'Урьдчилан',
};
const CAT_CHIP: Record<string, string> = {
    treat:   'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    endo:    'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
    ortho:   'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300',
    perio:   'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300',
    prostho: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    surg:    'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    prevent: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
};

const STATUS_CFG: Record<string, { label: string; chip: string; dot: string }> = {
    pending:   { label: 'Хүлээгдэж байна', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',       dot: 'bg-amber-400' },
    confirmed: { label: 'Баталгаажсан',    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-400' },
    cancelled: { label: 'Цуцлагдсан',      chip: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',                dot: 'bg-red-400' },
    completed: { label: 'Дууссан',         chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',            dot: 'bg-blue-400' },
};

const PAYMENT_BADGE: Record<string, { label: string; cls: string }> = {
    sent:    { label: 'Ресепшнд',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    partial: { label: 'Хэсэгчлэн', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    leasing: { label: 'Лизинг',    cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
    paid:    { label: 'Төлөгдсөн', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

const GENDER: Record<string, string> = { male: 'Эрэгтэй', female: 'Эмэгтэй', other: 'Бусад' };

const BANNER_GRADS = [
    'from-rose-500 via-pink-600 to-rose-700',
    'from-blue-600 via-indigo-600 to-blue-700',
    'from-emerald-500 via-teal-600 to-emerald-700',
    'from-amber-500 via-orange-500 to-amber-600',
    'from-violet-600 via-purple-600 to-violet-700',
    'from-cyan-500 via-sky-600 to-cyan-700',
];
function bannerGrad(name: string) { return BANNER_GRADS[name.charCodeAt(0) % BANNER_GRADS.length]; }


function calcAge(dob: string | null): number | null {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

/* ── MobileInfoRow ── */
function MobileInfoRow({ icon: Icon, label, iconBg, iconColor, children }: {
    icon: React.ElementType; label: string; iconBg: string; iconColor: string; children: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--muted)', borderRadius: 14, padding: '11px 13px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: 15, height: 15, color: iconColor }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{label}</p>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{children}</div>
            </div>
        </div>
    );
}

/* ── InfoField – stylish mini card ── */
function InfoField({
    icon: Icon, label, children, iconBg, iconColor,
}: {
    icon: React.ElementType; label: string; children: React.ReactNode;
    iconBg: string; iconColor: string;
}) {
    return (
        <div className="flex items-center gap-3.5 rounded-2xl border border-border/70 bg-card hover:bg-muted/30 transition-colors px-4 py-3.5">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className={`size-4 ${iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
                <div className="text-sm font-semibold text-foreground truncate">{children}</div>
            </div>
        </div>
    );
}

type Tab = 'card' | 'medical' | 'records' | 'consent';
type MedType = 'general' | 'ortho';

/* ── OrthoMediaGallery ────────────────────────────────────────────────────── */
const MEDIA_CFG = {
    xray:   { label: 'Рентген зураг',  color: '#2563eb', bg: '#eff6ff' },
    before: { label: 'Before зураг',   color: '#d97706', bg: '#fffbeb' },
    after:  { label: 'After зураг',    color: '#16a34a', bg: '#f0fdf4' },
} as const;

function MediaUploadSection({
    type, media, patientId, lightbox, setLightbox,
}: {
    type: 'xray' | 'before' | 'after';
    media: { id: number; url: string; file_name: string }[];
    patientId: number;
    lightbox: { url: string; name: string } | null;
    setLightbox: (v: { url: string; name: string } | null) => void;
}) {
    const cfg = MEDIA_CFG[type];
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('type', type);
        Array.from(files).forEach(f => fd.append('files[]', f));
        router.post(`/doctor/patients/${patientId}/ortho-media`, fd, {
            forceFormData: true, preserveScroll: true,
            onFinish: () => setUploading(false),
        });
    }

    function handleDelete(id: number) {
        router.delete(`/doctor/patients/${patientId}/ortho-media/${id}`, { preserveScroll: true });
    }

    return (
        <div style={{ background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Image size={15} color={cfg.color} />
                    </div>
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>{cfg.label}</p>
                        <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: 0 }}>{media.length} зураг</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 12px', borderRadius: 10, border: 'none',
                        background: uploading ? 'var(--muted)' : cfg.bg,
                        color: uploading ? 'var(--muted-foreground)' : cfg.color,
                        fontSize: 12, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer',
                    }}>
                    {uploading
                        ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${cfg.color}30`, borderTopColor: cfg.color, animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                        : <Upload size={13} />}
                    {uploading ? 'Хадгалж байна...' : 'Зураг нэмэх'}
                </button>
                <input
                    ref={inputRef} type="file" multiple accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => handleFiles(e.target.files)}
                />
            </div>

            {media.length === 0 ? (
                <div
                    style={{ padding: '28px 16px', textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => inputRef.current?.click()}
                >
                    <Upload size={28} color="var(--muted-foreground)" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: 0 }}>Зураг оруулах</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, padding: 12 }}>
                    {media.map(m => (
                        <div key={m.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: 'var(--muted)' }}>
                            <img
                                src={m.url} alt={m.file_name}
                                onClick={() => setLightbox({ url: m.url, name: m.file_name })}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                            />
                            <button
                                type="button"
                                onClick={() => handleDelete(m.id)}
                                style={{
                                    position: 'absolute', top: 4, right: 4,
                                    width: 22, height: 22, borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.6)', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                }}>
                                <X size={11} color="white" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function OrthoSection({ patient }: { patient: Patient }) {
    const [showAssessment, setShowAssessment] = useState(false);
    const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);
    const routePrefix = `/doctor/patients/${patient.id}`;

    const xrayMedia   = patient.ortho_media.filter(m => m.type === 'xray');
    const beforeMedia = patient.ortho_media.filter(m => m.type === 'before');
    const afterMedia  = patient.ortho_media.filter(m => m.type === 'after');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

            {/* X-ray + Before (side by side on wide, stacked on narrow) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
                <MediaUploadSection type="xray"   media={xrayMedia}   patientId={patient.id} lightbox={lightbox} setLightbox={setLightbox} />
                <MediaUploadSection type="before" media={beforeMedia} patientId={patient.id} lightbox={lightbox} setLightbox={setLightbox} />
            </div>

            {/* Ortho-14 assessment (collapsible) */}
            <div style={{ background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <button
                    type="button"
                    onClick={() => setShowAssessment(v => !v)}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: showAssessment ? '1px solid var(--border)' : 'none',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Stethoscope size={15} color="#dc2626" />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>Гажиг заслын эмчилгээний карт</p>
                            <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: 0 }}>
                                {patient.ortho_assessment ? 'Бөглөгдсэн' : 'Бөглөгдээгүй'}
                            </p>
                        </div>
                    </div>
                    {showAssessment ? <ChevronUp size={16} color="var(--muted-foreground)" /> : <ChevronRight size={16} color="var(--muted-foreground)" />}
                </button>
                {showAssessment && (
                    <div style={{ padding: 16 }}>
                        <PatientOrthoForm
                            key={`ortho-${patient.ortho_assessment?.updated_at ?? 'new'}`}
                            patientId={patient.id}
                            ortho={patient.ortho_assessment as never}
                            route={`/doctor/patients/${patient.id}/ortho`}
                        />
                    </div>
                )}
            </div>

            {/* Ortho-08 visit history */}
            <div style={{ background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)', padding: '16px' }}>
                <PatientOrthoVisitForm
                    patientId={patient.id}
                    visits={patient.ortho_visits}
                    routePrefix={routePrefix}
                />
            </div>

            {/* After photos */}
            <MediaUploadSection type="after" media={afterMedia} patientId={patient.id} lightbox={lightbox} setLightbox={setLightbox} />

            {/* Lightbox */}
            {lightbox && (
                <div
                    onClick={() => setLightbox(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 100,
                        background: 'rgba(0,0,0,0.85)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', padding: 20,
                    }}>
                    <button
                        onClick={() => setLightbox(null)}
                        style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={18} color="white" />
                    </button>
                    <img
                        src={lightbox.url} alt={lightbox.name}
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }}
                    />
                </div>
            )}
        </div>
    );
}

export default function DoctorPatientShow({ patient, appointment_id: appointmentId }: Props) {
    const [tab, setTab]                   = useState<Tab>(appointmentId ? 'records' : 'card');
    const [consentModal, setConsentModal] = useState<SignedForm | null>(null);
    const [medType, setMedType]           = useState<MedType>('general');
    const [showMedForm, setShowMedForm]   = useState(false);
    const [addingRecord, setAddingRecord] = useState(!!appointmentId);
    const [expandedRecord, setExpandedRecord] = useState<number | null>(null);
    const [submitting, setSubmitting]     = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Хяналтын самбар', href: '/doctor/dashboard' },
        { title: 'Өвчтний карт',    href: '/doctor/patients' },
        { title: `${patient.last_name} ${patient.first_name}`, href: `/doctor/patients/${patient.id}` },
    ];

    const [selectedAppointment, setSelectedAppointment] = useState(appointmentId ? String(appointmentId) : '');
    const [services, setServices] = useState<{ name: string; price: string }[]>([{ name: '', price: '' }]);
    const [advice, setAdvice]     = useState('');

    const formTotal = services.reduce((s, r) => s + (Number(r.price) || 0), 0);

    function addService()    { setServices(prev => [...prev, { name: '', price: '' }]); }
    function removeService(i: number) { setServices(prev => prev.filter((_, j) => j !== i)); }
    function updateService(i: number, field: 'name' | 'price', val: string) {
        setServices(prev => prev.map((s, j) => j === i ? { ...s, [field]: val } : s));
    }
    function resetForm() {
        setSelectedAppointment(appointmentId ? String(appointmentId) : '');
        setServices([{ name: '', price: '' }]);
        setAdvice('');
    }
    function doSubmit(sendToReception: boolean) {
        setSubmitting(true);
        router.post(`/doctor/patients/${patient.id}/treatment-records`, {
            appointment_id:    selectedAppointment || null,
            services:          services.filter(s => s.name.trim()).map(s => ({ name: s.name, price: s.price === '' ? null : Number(s.price) })),
            doctor_notes:      advice,
            send_to_reception: sendToReception,
        }, {
            preserveScroll: true,
            onSuccess: () => { setAddingRecord(false); resetForm(); },
            onFinish:  () => setSubmitting(false),
        });
    }

    const isMobile   = useIsMobile();
    const med        = patient.medical_history;
    const totalSpent = patient.treatment_records.reduce((s, r) => s + (r.amount_charged ?? 0), 0);
    const age        = calcAge(patient.date_of_birth);
    const initials   = (patient.last_name[0] ?? '') + (patient.first_name[0] ?? '');
    const grad       = bannerGrad(patient.last_name);

    const inputCls = 'w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow';

    const TABS: { key: Tab; label: string; count?: number }[] = [
        { key: 'card',    label: 'Мэдээлэл' },
        { key: 'medical', label: 'Өвчний түүх' },
        { key: 'records', label: 'Эмчилгээ төлбөрийн түүх', count: patient.treatment_records.length },
        { key: 'consent', label: 'Таниулсан зөвшөөрлийн хуудас', count: patient.consent_forms.length },
    ];

    if (isMobile) {
        const dotColors: Record<string, string> = { pending: '#f59e0b', confirmed: '#22c55e', cancelled: '#ef4444', completed: '#3b82f6' };
        const pbColors: Record<string, string>  = { sent: '#d97706', partial: '#2563eb', leasing: '#0d9488', paid: '#059669' };
        const pbBgs:    Record<string, string>  = { sent: 'rgba(245,158,11,0.12)', partial: 'rgba(59,130,246,0.12)', leasing: 'rgba(20,184,166,0.12)', paid: 'rgba(16,185,129,0.12)' };
        return (
            <DoctorLayout breadcrumbs={breadcrumbs}>
                <Head title={`${patient.last_name} ${patient.first_name}`} />
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh', background: 'var(--background)' }}>

                    {/* ══ HERO ══ */}
                    <div style={{ background: 'linear-gradient(155deg,#0f172a 0%,#450a0a 55%,#0f172a 100%)', padding: '14px 16px 22px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                        <div style={{ position: 'absolute', bottom: 10, left: -30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                        <Link href="/doctor/patients" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 500, textDecoration: 'none', marginBottom: 16, position: 'relative', zIndex: 1 }}>
                            <ArrowLeft style={{ width: 14, height: 14 }} /> Өвчтний жагсаалт
                        </Link>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
                            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'white', flexShrink: 0, userSelect: 'none' }}>
                                {initials.toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                                <h1 style={{ color: 'white', fontSize: 19, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>{patient.last_name} {patient.first_name}</h1>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                                    {[patient.patient_number, patient.gender ? GENDER[patient.gender] : null, age !== null ? `${age} нас` : null].filter(Boolean).map((v, i) => (
                                        <span key={i} style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.9)', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{v}</span>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                                    <Phone style={{ width: 13, height: 13 }} />{patient.phone}{patient.phone2 ? ` / ${patient.phone2}` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ══ STATS ══ */}
                    <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                        {([
                            { Icon: Calendar,    value: patient.appointments.length,       label: 'Захиалга',   c: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                            { Icon: Stethoscope, value: patient.treatment_records.length,  label: 'Эмчилгээ',   c: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
                            { Icon: CreditCard,  value: `${totalSpent.toLocaleString()}₮`, label: 'Зарцуулсан', c: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                        ] as const).map(({ Icon, value, label, c, bg }, i) => (
                            <div key={i} style={{ flex: '1 0 0', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 10px', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
                                <div style={{ width: 34, height: 34, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Icon style={{ width: 15, height: 15, color: c }} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: c, lineHeight: 1.1 }}>{value}</p>
                                    <p style={{ margin: 0, fontSize: 10, color: 'var(--muted-foreground)', marginTop: 1 }}>{label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ══ TABS ══ */}
                    <div style={{ display: 'flex', overflowX: 'auto', gap: 7, padding: '10px 14px', background: 'var(--card)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                        {TABS.map(t => {
                            const active = tab === t.key;
                            return (
                                <button key={t.key} onClick={() => setTab(t.key)} style={{ background: active ? '#dc2626' : 'var(--muted)', color: active ? 'white' : 'var(--muted-foreground)', border: 'none', borderRadius: 999, cursor: 'pointer', padding: '8px 16px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, boxShadow: active ? '0 4px 12px rgba(220,38,38,0.35)' : 'none', transition: 'all 0.18s ease' }}>
                                    {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
                                </button>
                            );
                        })}
                    </div>

                    {/* ══ CONTENT ══ */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 'calc(96px + env(safe-area-inset-bottom,0px))' }}>

                        {/* ── CARD TAB ── */}
                        {tab === 'card' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User style={{ width: 14, height: 14, color: 'white' }} /></div>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Хувийн мэдээлэл</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <MobileInfoRow icon={Phone} label="Утас" iconBg="#eff6ff" iconColor="#3b82f6">{patient.phone}{patient.phone2 ? ` / ${patient.phone2}` : ''}</MobileInfoRow>
                                        {patient.date_of_birth && <MobileInfoRow icon={Calendar} label="Төрсөн огноо" iconBg="#f5f3ff" iconColor="#7c3aed">{patient.date_of_birth}{age !== null ? ` · ${age} нас` : ''}</MobileInfoRow>}
                                        {patient.register_number && <MobileInfoRow icon={User} label="Регистр" iconBg="#fffbeb" iconColor="#d97706"><span style={{ fontFamily: 'monospace' }}>{patient.register_number}</span></MobileInfoRow>}
                                        {patient.email && <MobileInfoRow icon={Mail} label="Имэйл" iconBg="#f0fdf4" iconColor="#16a34a">{patient.email}</MobileInfoRow>}
                                        {patient.address && <MobileInfoRow icon={MapPin} label="Хаяг" iconBg="#fff1f2" iconColor="#e11d48">{patient.address}</MobileInfoRow>}
                                    </div>
                                    {patient.notes && (
                                        <div style={{ marginTop: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, padding: '12px 14px' }}>
                                            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Тэмдэглэл</p>
                                            <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{patient.notes}</p>
                                        </div>
                                    )}
                                </div>
                                {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
                                    <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid rgba(249,115,22,0.3)', padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(249,115,22,0.2)' }}>
                                            <div style={{ width: 30, height: 30, borderRadius: 10, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone style={{ width: 14, height: 14, color: 'white' }} /></div>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Яаралтай холбоо</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {patient.emergency_contact_name && <MobileInfoRow icon={User} label="Нэр" iconBg="#fff7ed" iconColor="#ea580c">{patient.emergency_contact_name}{patient.emergency_contact_relation && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 400 }}>({patient.emergency_contact_relation})</span>}</MobileInfoRow>}
                                            {patient.emergency_contact_phone && <MobileInfoRow icon={Phone} label="Утас" iconBg="#fff7ed" iconColor="#ea580c">{patient.emergency_contact_phone}</MobileInfoRow>}
                                        </div>
                                    </div>
                                )}
                                {patient.appointments.length > 0 && (
                                    <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg,#60a5fa,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar style={{ width: 14, height: 14, color: 'white' }} /></div>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Захиалгын түүх</span>
                                            <span style={{ marginLeft: 'auto', background: 'var(--muted)', borderRadius: 999, padding: '2px 8px', fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600 }}>{patient.appointments.length}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {patient.appointments.map(apt => {
                                                const s = STATUS_CFG[apt.status] ?? { label: apt.status };
                                                const dc = dotColors[apt.status] ?? '#9ca3af';
                                                return (
                                                    <div key={apt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--muted)', borderRadius: 14, padding: '11px 13px' }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dc, flexShrink: 0 }} />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{apt.appointment_date}{apt.service && <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}> · {apt.service}</span>}</p>
                                                            <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>#{apt.appointment_number}</p>
                                                        </div>
                                                        <span style={{ background: `${dc}20`, color: dc, borderRadius: 999, padding: '3px 9px', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{s.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── MEDICAL TAB ── */}
                        {tab === 'medical' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg,#ef4444,#f43f5e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Heart style={{ width: 14, height: 14, color: 'white' }} /></div>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Өвчний түүх</span>
                                    </div>
                                    <div style={{ display: 'flex', background: 'var(--muted)', borderRadius: 14, padding: 4, gap: 4 }}>
                                        {([{ key: 'general' as MedType, label: 'Ерөнхий' }, { key: 'ortho' as MedType, label: 'Гажиг засал' }]).map(t => (
                                            <button key={t.key} onClick={() => setMedType(t.key)} style={{ flex: 1, borderRadius: 10, padding: '8px 12px', border: 'none', cursor: 'pointer', background: medType === t.key ? 'var(--card)' : 'transparent', color: medType === t.key ? 'var(--foreground)' : 'var(--muted-foreground)', fontWeight: 600, fontSize: 13, boxShadow: medType === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {medType === 'general' ? (
                                    <>
                                        {/* Өвчний түүх — accordion */}
                                        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
                                            <button type="button" onClick={() => setShowMedForm(v => !v)}
                                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: showMedForm ? '1px solid var(--border)' : 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 30, height: 30, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Heart size={14} color="#dc2626" />
                                                    </div>
                                                    <div style={{ textAlign: 'left' }}>
                                                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>Өвчний түүх</p>
                                                        <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: 0 }}>{patient.medical_history ? 'Бөглөгдсөн' : 'Бөглөгдээгүй'}</p>
                                                    </div>
                                                </div>
                                                {showMedForm ? <ChevronUp size={16} color="var(--muted-foreground)" /> : <ChevronRight size={16} color="var(--muted-foreground)" />}
                                            </button>
                                            {showMedForm && (
                                                <div style={{ padding: 16 }}>
                                                    <PatientMedicalForm
                                                        key={patient.medical_history?.updated_at ?? 'new'}
                                                        patientId={patient.id}
                                                        medical={patient.medical_history as never}
                                                        route={`/doctor/patients/${patient.id}/medical`}
                                                        onSuccess={() => setShowMedForm(false)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
                                            <PatientGeneralVisitForm
                                                patientId={patient.id}
                                                visits={patient.general_visits}
                                                routePrefix={`/doctor/patients/${patient.id}`}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <OrthoSection patient={patient} />
                                )}
                            </div>
                        )}

                        {/* ── RECORDS TAB ── */}
                        {tab === 'records' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>Эмчилгээ төлбөрийн түүх</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>{patient.treatment_records.length} бичлэг</p>
                                    </div>
                                    <button onClick={() => setAddingRecord(!addingRecord)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: addingRecord ? 'var(--muted)' : '#2563eb', color: addingRecord ? 'var(--muted-foreground)' : 'white', border: 'none', borderRadius: 14, padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                                        {addingRecord ? <ChevronUp style={{ width: 15, height: 15 }} /> : <Plus style={{ width: 15, height: 15 }} />}
                                        {addingRecord ? 'Хаах' : 'Нэмэх'}
                                    </button>
                                </div>
                                {addingRecord && (
                                    <div style={{ background: 'var(--card)', borderRadius: 20, border: '2px solid rgba(37,99,235,0.25)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Stethoscope style={{ width: 15, height: 15, color: 'white' }} /></div>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Шинэ тэмдэглэл</span>
                                        </div>
                                        {patient.appointments.length > 0 && !appointmentId && (
                                            <div>
                                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Холбогдох захиалга</label>
                                                <select value={selectedAppointment} onChange={e => setSelectedAppointment(e.target.value)} style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--background)', padding: '10px 12px', fontSize: 13, color: 'var(--foreground)', outline: 'none' }}>
                                                    <option value="">— Захиалга холбохгүй —</option>
                                                    {patient.appointments.map(apt => <option key={apt.id} value={apt.id}>{apt.appointment_date} · #{apt.appointment_number}{apt.service ? ` · ${apt.service}` : ''}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>Эмчилгээ / Үйлчилгээ</label>
                                                {formTotal > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>Нийт: {formTotal.toLocaleString()}₮</span>}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {services.map((s, i) => (
                                                    <div key={i} style={{ background: 'var(--muted)', borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        <input type="text" value={s.name} onChange={e => updateService(i, 'name', e.target.value)} placeholder="Үйлчилгээний нэр…" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', fontSize: 13, background: 'var(--background)', color: 'var(--foreground)', outline: 'none', boxSizing: 'border-box' }} />
                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            <input type="number" value={s.price} onChange={e => updateService(i, 'price', e.target.value)} placeholder="Үнэ (₮)" style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', fontSize: 13, background: 'var(--background)', color: 'var(--foreground)', outline: 'none' }} />
                                                            <button type="button" onClick={() => removeService(i)} disabled={services.length === 1} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: services.length === 1 ? 0.3 : 1 }}>
                                                                <Minus style={{ width: 14, height: 14, color: '#ef4444' }} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button type="button" onClick={addService} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}>
                                                <Plus style={{ width: 14, height: 14 }} /> Мөр нэмэх
                                            </button>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Өвчтөнд өгөх зөвлөгөө</label>
                                            <textarea value={advice} onChange={e => setAdvice(e.target.value)} rows={3} placeholder="Зөвлөгөө, тэмдэглэл…" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--background)', padding: '10px 12px', fontSize: 13, color: 'var(--foreground)', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                                            <button type="button" disabled={submitting} onClick={() => doSubmit(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#059669', color: 'white', border: 'none', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}>
                                                {submitting ? <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> : <Send style={{ width: 15, height: 15 }} />}
                                                Ресепшнрүү илгээх
                                            </button>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button type="button" disabled={submitting} onClick={() => doSubmit(false)} style={{ flex: 1, background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 14, padding: '11px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}>Хадгалах</button>
                                                <button type="button" onClick={() => { setAddingRecord(false); resetForm(); }} style={{ flex: 1, background: 'none', color: 'var(--muted-foreground)', border: '1px solid var(--border)', borderRadius: 14, padding: '11px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Цуцлах</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {patient.treatment_records.length === 0 ? (
                                    <div style={{ background: 'var(--card)', borderRadius: 20, border: '2px dashed var(--border)', padding: '40px 20px', textAlign: 'center' }}>
                                        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Stethoscope style={{ width: 26, height: 26, color: 'var(--muted-foreground)' }} /></div>
                                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--foreground)', fontSize: 14 }}>Эмчилгээний тэмдэглэл байхгүй</p>
                                        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted-foreground)' }}>Дээрх товчоор шинэ тэмдэглэл нэмнэ үү</p>
                                    </div>
                                ) : (
                                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div style={{ position: 'absolute', left: 17, top: 18, bottom: 18, width: 2, background: 'var(--border)', borderRadius: 1 }} />
                                        {patient.treatment_records.map(rec => {
                                            const filled   = (rec.services ?? []).filter(s => s.name);
                                            const expanded = expandedRecord === rec.id;
                                            const pb       = rec.payment_status ? PAYMENT_BADGE[rec.payment_status] : null;
                                            const isPaid   = rec.payment_status === 'paid';
                                            const dc = isPaid ? '#10b981' : '#3b82f6';
                                            return (
                                                <div key={rec.id} style={{ position: 'relative', display: 'flex', gap: 10 }}>
                                                    <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, width: 36, height: 36, borderRadius: 12, background: isPaid ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)', border: `2px solid ${dc}30`, boxShadow: `0 0 0 3px var(--background)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Stethoscope style={{ width: 16, height: 16, color: dc }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0, background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                                        <button type="button" onClick={() => setExpandedRecord(expanded ? null : rec.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                                                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{filled.length > 0 ? filled.map(s => s.name).join(', ') : 'Эмчилгээний тэмдэглэл'}</span>
                                                                    {pb && <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '2px 7px', background: pbBgs[rec.payment_status!] ?? 'var(--muted)', color: pbColors[rec.payment_status!] ?? 'var(--muted-foreground)' }}>{pb.label}</span>}
                                                                </div>
                                                                <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)' }}>{rec.record_date}{rec.doctor?.name ? ` · ${rec.doctor.name}` : ''}</p>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                                {rec.amount_charged !== null && rec.amount_charged > 0 && <span style={{ fontSize: 14, fontWeight: 700, color: isPaid ? '#10b981' : 'var(--foreground)' }}>{rec.amount_charged.toLocaleString()}₮</span>}
                                                                {expanded ? <ChevronUp style={{ width: 15, height: 15, color: 'var(--muted-foreground)' }} /> : <ChevronDown style={{ width: 15, height: 15, color: 'var(--muted-foreground)' }} />}
                                                            </div>
                                                        </button>
                                                        {expanded && (
                                                            <div style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                                {filled.length > 0 && (
                                                                    <div>
                                                                        <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Эмчилгээ / Үйлчилгээ</p>
                                                                        <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                                                                            {filled.map((s, i) => (
                                                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderBottom: i < filled.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--muted)' }}>
                                                                                    <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{s.name}</span>
                                                                                    {s.price != null && s.price > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{s.price.toLocaleString()}₮</span>}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {rec.doctor_notes && (
                                                                    <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '10px 12px' }}>
                                                                        <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Зөвлөгөө / Тэмдэглэл</p>
                                                                        <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{rec.doctor_notes}</p>
                                                                    </div>
                                                                )}
                                                                {rec.payment_status === 'leasing' && rec.leasing_plan && (() => {
                                                                    const lp = rec.leasing_plan;
                                                                    const pct = Math.round((lp.paid_months / lp.months) * 100);
                                                                    const rem = lp.months - lp.paid_months;
                                                                    return (
                                                                        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(20,184,166,0.3)', background: 'linear-gradient(135deg,rgba(20,184,166,0.07) 0%,rgba(6,182,212,0.05) 100%)' }}>
                                                                            {/* header */}
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px 8px', borderBottom: '1px solid rgba(20,184,166,0.15)' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                    <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(20,184,166,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                        <CreditCard style={{ width: 11, height: 11, color: '#0d9488' }} />
                                                                                    </div>
                                                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Лизингийн төлөлт</span>
                                                                                </div>
                                                                                <span style={{ fontSize: 11, fontWeight: 800, color: '#0d9488' }}>{pct}%</span>
                                                                            </div>
                                                                            {/* progress bar */}
                                                                            <div style={{ padding: '10px 13px 0' }}>
                                                                                <div style={{ height: 8, borderRadius: 999, background: 'rgba(20,184,166,0.15)', overflow: 'hidden' }}>
                                                                                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: 'linear-gradient(90deg,#10b981,#0d9488)', transition: 'width 0.5s ease' }} />
                                                                                </div>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 }}>
                                                                                    <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>{lp.paid_months} сар төлсөн</span>
                                                                                    <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{lp.months} сар нийт</span>
                                                                                </div>
                                                                            </div>
                                                                            {/* stat chips */}
                                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '0 10px 10px' }}>
                                                                                <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: 10, padding: '7px 8px', textAlign: 'center' }}>
                                                                                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#059669', lineHeight: 1 }}>{lp.paid_months}</p>
                                                                                    <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Төлсөн сар</p>
                                                                                </div>
                                                                                <div style={{ background: rem === 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: 10, padding: '7px 8px', textAlign: 'center' }}>
                                                                                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: rem === 0 ? '#059669' : '#ef4444', lineHeight: 1 }}>{rem}</p>
                                                                                    <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 600, color: rem === 0 ? '#059669' : '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Үлдсэн сар</p>
                                                                                </div>
                                                                                <div style={{ background: 'rgba(20,184,166,0.08)', borderRadius: 10, padding: '7px 8px', textAlign: 'center' }}>
                                                                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0d9488', lineHeight: 1, whiteSpace: 'nowrap' }}>{lp.monthly_amount.toLocaleString()}₮</p>
                                                                                    <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 600, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Сарын төлбөр</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                                {rec.payment_status !== 'paid' && (
                                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                                        {rec.payment_status === null && (
                                                                            <button type="button" onClick={() => router.patch(`/doctor/patients/${patient.id}/treatment-records/${rec.id}/send`, {}, { preserveScroll: true })} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#059669', color: 'white', border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                                                                <Send style={{ width: 12, height: 12 }} /> Ресепшн
                                                                            </button>
                                                                        )}
                                                                        <button type="button" onClick={() => { if (confirm('Энэ бичлэгийг устгах уу?')) { router.delete(`/doctor/patients/${patient.id}/treatment-records/${rec.id}`, { preserveScroll: true }); } }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                                                            <Trash2 style={{ width: 12, height: 12 }} /> Устгах
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── CONSENT TAB ── */}
                        {tab === 'consent' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {patient.consent_forms.length === 0 ? (
                                    <div style={{ background: 'var(--card)', borderRadius: 20, border: '2px dashed var(--border)', padding: '40px 20px', textAlign: 'center' }}>
                                        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><FileText style={{ width: 26, height: 26, color: 'var(--muted-foreground)' }} /></div>
                                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--foreground)', fontSize: 14 }}>Зөвшөөрлийн маягт байхгүй</p>
                                        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted-foreground)' }}>Ресепшн гарын үсэг авна</p>
                                    </div>
                                ) : (
                                    patient.consent_forms.map(cf => (
                                        <button key={cf.id} type="button" onClick={() => setConsentModal(cf)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)', padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', width: '100%', cursor: 'pointer', textAlign: 'left' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <CheckCircle2 style={{ width: 20, height: 20, color: '#10b981' }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{cf.template?.title}</p>
                                                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted-foreground)' }}>{cf.signer_name} · {new Date(cf.signed_at).toLocaleDateString('mn-MN')}</p>
                                            </div>
                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold shrink-0 ${CAT_CHIP[cf.template?.category] ?? 'bg-muted text-muted-foreground'}`}>
                                                {CAT_LABEL[cf.template?.category] ?? cf.template?.category}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

            {/* ── CONSENT MODAL ── */}
            {consentModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }} onClick={() => setConsentModal(null)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: '24px 24px 0 0', border: '1px solid var(--border)', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '20px 16px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div>
                                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{consentModal.template?.title}</p>
                                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--muted-foreground)' }}>{consentModal.signer_name} · {new Date(consentModal.signed_at).toLocaleDateString('mn-MN')}</p>
                            </div>
                            <button type="button" onClick={() => setConsentModal(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--muted)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                <X style={{ width: 15, height: 15, color: 'var(--muted-foreground)' }} />
                            </button>
                        </div>
                        {consentModal.template?.content && (
                            <div style={{ background: 'var(--muted)', borderRadius: 14, padding: '12px 14px', marginBottom: 14, fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                                {consentModal.template.content}
                            </div>
                        )}
                        {consentModal.patient_signature && (
                            <div style={{ marginBottom: 10 }}>
                                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Гарын үсэг</p>
                                <div style={{ height: 72, borderRadius: 12, border: '1px solid var(--border)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    <img src={consentModal.patient_signature} alt="Гарын үсэг" style={{ maxHeight: 64, maxWidth: '100%', objectFit: 'contain', opacity: 0.85 }} />
                                </div>
                            </div>
                        )}
                        {consentModal.guardian_signature && (
                            <div>
                                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Асран хамгаалагчийн гарын үсэг{consentModal.guardian_name ? ` (${consentModal.guardian_name})` : ''}</p>
                                <div style={{ height: 72, borderRadius: 12, border: '1px solid var(--border)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    <img src={consentModal.guardian_signature} alt="Асран хамгаалагчийн гарын үсэг" style={{ maxHeight: 64, maxWidth: '100%', objectFit: 'contain', opacity: 0.85 }} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            </DoctorLayout>
        );
    }

    return (
        <DoctorLayout breadcrumbs={breadcrumbs}>
            <Head title={`${patient.last_name} ${patient.first_name}`} />
            <div className="flex flex-1 flex-col min-h-0">

                {/* ══ HERO ══ */}
                <div className="shrink-0 border-b border-border">

                    {/* Gradient profile banner */}
                    <div className={`bg-gradient-to-r ${grad} px-6 pt-5 pb-7`}>
                        <Link href="/doctor/patients"
                            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-medium mb-5 transition-colors">
                            <ArrowLeft className="size-3.5" />
                            Өвчтний жагсаалт
                        </Link>
                        <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white text-2xl font-bold ring-2 ring-white/25 backdrop-blur-sm select-none">
                                {initials.toUpperCase()}
                            </div>
                            {/* Name + contact */}
                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-xl font-bold text-white leading-tight">
                                        {patient.last_name} {patient.first_name}
                                    </h1>
                                    <span className="rounded-full bg-white/20 border border-white/25 text-white/90 px-2.5 py-0.5 text-xs font-mono">
                                        {patient.patient_number}
                                    </span>
                                    {patient.gender && (
                                        <span className="rounded-full bg-white/20 border border-white/25 text-white/90 px-2.5 py-0.5 text-xs font-semibold">
                                            {GENDER[patient.gender]}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2">
                                    <span className="flex items-center gap-1.5 text-xs text-white/70">
                                        <Phone className="size-3.5 shrink-0" />
                                        {patient.phone}{patient.phone2 ? ` / ${patient.phone2}` : ''}
                                    </span>
                                    {patient.date_of_birth && (
                                        <span className="text-xs text-white/70">
                                            {patient.date_of_birth}{age !== null ? ` · ${age} нас` : ''}
                                        </span>
                                    )}
                                    {patient.email && (
                                        <span className="flex items-center gap-1.5 text-xs text-white/70">
                                            <Mail className="size-3.5 shrink-0" />
                                            {patient.email}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats strip */}
                    <div className="bg-card grid grid-cols-3 divide-x divide-border border-t border-border">
                        {[
                            { icon: Calendar,    value: patient.appointments.length,      label: 'Захиалга',        color: 'text-blue-600 dark:text-blue-400',    iconBg: 'bg-blue-50 dark:bg-blue-950/30',    iconCl: 'text-blue-500 dark:text-blue-400' },
                            { icon: Stethoscope, value: patient.treatment_records.length, label: 'Эмчилгээ',       color: 'text-violet-600 dark:text-violet-400', iconBg: 'bg-violet-50 dark:bg-violet-950/30', iconCl: 'text-violet-500 dark:text-violet-400' },
                            { icon: CreditCard,  value: `${totalSpent.toLocaleString()}₮`, label: 'Нийт зарцуулсан', color: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-950/30', iconCl: 'text-emerald-500 dark:text-emerald-400' },
                        ].map(s => (
                            <div key={s.label} className="flex items-center gap-3 px-5 py-3.5">
                                <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${s.iconBg}`}>
                                    <s.icon className={`size-4 ${s.iconCl}`} />
                                </div>
                                <div>
                                    <p className={`text-base font-bold tabular-nums leading-tight ${s.color}`}>{s.value}</p>
                                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="bg-card flex gap-0 px-4 border-t border-border">
                        {TABS.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                                    tab === t.key
                                        ? 'border-foreground text-foreground'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                }`}>
                                {t.label}
                                {t.count !== undefined && (
                                    <span className={`inline-flex items-center justify-center min-w-[1.1rem] h-4 rounded-full px-1 text-[10px] font-bold tabular-nums ${
                                        tab === t.key ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══ SCROLLABLE CONTENT ══ */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">

                    {/* ══ CARD TAB ══ */}
                    {tab === 'card' && (
                        <div className="space-y-4">

                            {/* Personal info — mini cards grid */}
                            <div className="rounded-2xl border bg-card shadow-sm p-5">
                                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border">
                                    <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                        <User className="size-3.5" />
                                    </div>
                                    <h2 className="font-semibold text-foreground text-sm">Хувийн мэдээлэл</h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <InfoField
                                        icon={Phone} label="Утас"
                                        iconBg="bg-blue-100 dark:bg-blue-950/40"
                                        iconColor="text-blue-600 dark:text-blue-400"
                                    >
                                        {patient.phone}{patient.phone2 ? ` / ${patient.phone2}` : ''}
                                    </InfoField>

                                    {patient.date_of_birth && (
                                        <InfoField
                                            icon={Calendar} label="Төрсөн огноо"
                                            iconBg="bg-violet-100 dark:bg-violet-950/40"
                                            iconColor="text-violet-600 dark:text-violet-400"
                                        >
                                            {patient.date_of_birth}
                                            {age !== null && (
                                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">({age} нас)</span>
                                            )}
                                        </InfoField>
                                    )}

                                    {patient.register_number && (
                                        <InfoField
                                            icon={User} label="Регистрийн №"
                                            iconBg="bg-amber-100 dark:bg-amber-950/40"
                                            iconColor="text-amber-600 dark:text-amber-400"
                                        >
                                            <span className="font-mono">{patient.register_number}</span>
                                        </InfoField>
                                    )}

                                    {patient.email && (
                                        <InfoField
                                            icon={Mail} label="Имэйл"
                                            iconBg="bg-emerald-100 dark:bg-emerald-950/40"
                                            iconColor="text-emerald-600 dark:text-emerald-400"
                                        >
                                            {patient.email}
                                        </InfoField>
                                    )}
                                </div>

                                {patient.address && (
                                    <div className="mt-3">
                                        <InfoField
                                            icon={MapPin} label="Хаяг"
                                            iconBg="bg-rose-100 dark:bg-rose-950/40"
                                            iconColor="text-rose-600 dark:text-rose-400"
                                        >
                                            {patient.address}
                                        </InfoField>
                                    </div>
                                )}

                                {patient.notes && (
                                    <div className="mt-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-3.5">
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">Тэмдэглэл</p>
                                        <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{patient.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Emergency contact */}
                            {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
                                <div className="rounded-2xl border border-orange-200 dark:border-orange-800 bg-card shadow-sm p-5">
                                    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-orange-200 dark:border-orange-800">
                                        <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500 text-white">
                                            <Phone className="size-3.5" />
                                        </div>
                                        <h2 className="font-semibold text-foreground text-sm">Яаралтай холбоо барих</h2>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {patient.emergency_contact_name && (
                                            <InfoField
                                                icon={User} label="Нэр"
                                                iconBg="bg-orange-100 dark:bg-orange-950/40"
                                                iconColor="text-orange-600 dark:text-orange-400"
                                            >
                                                {patient.emergency_contact_name}
                                                {patient.emergency_contact_relation && (
                                                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                                        ({patient.emergency_contact_relation})
                                                    </span>
                                                )}
                                            </InfoField>
                                        )}
                                        {patient.emergency_contact_phone && (
                                            <InfoField
                                                icon={Phone} label="Утас"
                                                iconBg="bg-orange-100 dark:bg-orange-950/40"
                                                iconColor="text-orange-600 dark:text-orange-400"
                                            >
                                                {patient.emergency_contact_phone}
                                            </InfoField>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Recent appointments */}
                            {patient.appointments.length > 0 && (
                                <div className="rounded-2xl border bg-card shadow-sm p-5">
                                    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border">
                                        <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 text-white">
                                            <Calendar className="size-3.5" />
                                        </div>
                                        <h2 className="font-semibold text-foreground text-sm">Захиалгын түүх</h2>
                                        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-medium">
                                            {patient.appointments.length}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {patient.appointments.map(apt => {
                                            const s = STATUS_CFG[apt.status] ?? { label: apt.status, chip: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' };
                                            return (
                                                <div key={apt.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors px-4 py-3">
                                                    <span className={`size-2 rounded-full shrink-0 ${s.dot}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground">
                                                            {apt.appointment_date}
                                                            {apt.service && <span className="text-muted-foreground ml-2 font-normal">· {apt.service}</span>}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">#{apt.appointment_number}</p>
                                                    </div>
                                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${s.chip}`}>{s.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══ MEDICAL TAB ══ */}
                    {tab === 'medical' && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border bg-card p-5 shadow-sm">
                                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border">
                                    <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white">
                                        <Heart className="size-3.5" />
                                    </div>
                                    <h2 className="font-semibold text-foreground text-sm">Өвчний түүх</h2>
                                </div>
                                <div className="flex rounded-xl border bg-muted/40 p-1 gap-0.5 w-fit">
                                    {([
                                        { key: 'general' as MedType, label: 'Ерөнхий эмчилгээ' },
                                        { key: 'ortho'   as MedType, label: 'Гажиг засал' },
                                    ]).map(t => (
                                        <button key={t.key} onClick={() => setMedType(t.key)}
                                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${medType === t.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {medType === 'general' ? (
                                <>
                                    {/* Өвчний түүх — accordion */}
                                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                        <button type="button" onClick={() => setShowMedForm(v => !v)}
                                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                                            style={{ borderBottom: showMedForm ? '1px solid var(--border)' : 'none' }}>
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30">
                                                    <Heart className="size-4 text-red-600" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-bold text-foreground">Өвчний түүх</p>
                                                    <p className="text-xs text-muted-foreground">{patient.medical_history ? 'Бөглөгдсөн · дарж засах' : 'Бөглөгдээгүй · дарж бөглөх'}</p>
                                                </div>
                                            </div>
                                            {showMedForm ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                                        </button>
                                        {showMedForm && (
                                            <div className="p-6">
                                                <PatientMedicalForm
                                                    key={patient.medical_history?.updated_at ?? 'new'}
                                                    patientId={patient.id}
                                                    medical={patient.medical_history as never}
                                                    route={`/doctor/patients/${patient.id}/medical`}
                                                    onSuccess={() => setShowMedForm(false)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                                        <PatientGeneralVisitForm
                                            patientId={patient.id}
                                            visits={patient.general_visits}
                                            routePrefix={`/doctor/patients/${patient.id}`}
                                        />
                                    </div>
                                </>
                            ) : (
                                <OrthoSection patient={patient} />
                            )}
                        </div>
                    )}

                    {/* ══ RECORDS TAB ══ */}
                    {tab === 'records' && (
                        <div className="space-y-4">

                            {/* Header row */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-semibold text-foreground">Эмчилгээ төлбөрийн түүх</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">{patient.treatment_records.length} бичлэг</p>
                                </div>
                                <button onClick={() => setAddingRecord(!addingRecord)}
                                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-sm ${
                                        addingRecord
                                            ? 'bg-muted text-muted-foreground hover:bg-muted/80 shadow-none'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}>
                                    {addingRecord ? <ChevronUp className="size-4" /> : <Plus className="size-4" />}
                                    {addingRecord ? 'Хаах' : 'Тэмдэглэл нэмэх'}
                                </button>
                            </div>

                            {/* Add record form */}
                            {addingRecord && (
                                <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800/60 bg-card p-6 shadow-sm space-y-5">
                                    <div className="flex items-center gap-3 pb-3 border-b border-border">
                                        <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                            <Stethoscope className="size-4" />
                                        </div>
                                        <h2 className="font-semibold text-foreground">Шинэ эмчилгээний тэмдэглэл</h2>
                                    </div>

                                    {patient.appointments.length > 0 && !appointmentId && (
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-foreground">Холбогдох захиалга</label>
                                            <select value={selectedAppointment} onChange={e => setSelectedAppointment(e.target.value)} className={inputCls}>
                                                <option value="">— Захиалга холбохгүй —</option>
                                                {patient.appointments.map(apt => (
                                                    <option key={apt.id} value={apt.id}>
                                                        {apt.appointment_date} · #{apt.appointment_number}{apt.service ? ` · ${apt.service}` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Services table */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-foreground">Эмчилгээ / Үйлчилгээ</label>
                                            {formTotal > 0 && (
                                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                    Нийт: {formTotal.toLocaleString()}₮
                                                </span>
                                            )}
                                        </div>
                                        <div className="rounded-xl border overflow-hidden">
                                            <div className="grid grid-cols-[1fr_140px_36px] bg-muted/50 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                                                <div className="px-3 py-2.5">Нэршил</div>
                                                <div className="px-3 py-2.5">Үнэ (₮)</div>
                                                <div />
                                            </div>
                                            {services.map((s, i) => (
                                                <div key={i} className="grid grid-cols-[1fr_140px_36px] border-b last:border-0 items-center">
                                                    <input type="text" value={s.name}
                                                        onChange={e => updateService(i, 'name', e.target.value)}
                                                        placeholder="Үйлчилгээний нэр…"
                                                        className="px-3 py-2.5 text-sm bg-transparent focus:outline-none focus:bg-blue-50/40 dark:focus:bg-blue-950/20 border-r"
                                                    />
                                                    <input type="number" value={s.price}
                                                        onChange={e => updateService(i, 'price', e.target.value)}
                                                        placeholder="0" min="0"
                                                        className="px-3 py-2.5 text-sm bg-transparent focus:outline-none focus:bg-blue-50/40 dark:focus:bg-blue-950/20 border-r text-right tabular-nums"
                                                    />
                                                    <button type="button" onClick={() => removeService(i)} disabled={services.length === 1}
                                                        className="flex items-center justify-center size-9 text-muted-foreground hover:text-red-500 disabled:opacity-30 transition-colors">
                                                        <Minus className="size-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button type="button" onClick={addService}
                                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                                            <Plus className="size-3.5" /> Мөр нэмэх
                                        </button>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-foreground">Өвчтөнд өгөх зөвлөгөө</label>
                                        <textarea value={advice} onChange={e => setAdvice(e.target.value)} rows={3}
                                            placeholder="Зөвлөгөө, тэмдэглэл…"
                                            className={`${inputCls} resize-none`}
                                        />
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border">
                                        <button type="button" disabled={submitting} onClick={() => doSubmit(true)}
                                            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors">
                                            {submitting
                                                ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                                : <Send className="size-4" />
                                            }
                                            Ресепшнрүү илгээх
                                        </button>
                                        <button type="button" disabled={submitting} onClick={() => doSubmit(false)}
                                            className="flex items-center gap-2 rounded-xl border bg-card hover:bg-muted disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors">
                                            Хадгалах
                                        </button>
                                        <button type="button" onClick={() => { setAddingRecord(false); resetForm(); }}
                                            className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                            Цуцлах
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Records list */}
                            {patient.treatment_records.length === 0 ? (
                                <div className="rounded-2xl border border-dashed bg-card p-16 text-center">
                                    <div className="flex size-14 items-center justify-center rounded-2xl bg-muted mx-auto mb-3">
                                        <Stethoscope className="size-7 text-muted-foreground" />
                                    </div>
                                    <p className="font-medium text-foreground">Эмчилгээний тэмдэглэл байхгүй</p>
                                    <p className="text-sm text-muted-foreground mt-1">Дээрх товчоор шинэ тэмдэглэл нэмнэ үү</p>
                                </div>
                            ) : (
                                <div className="relative space-y-3">
                                    {/* Timeline vertical line */}
                                    <div className="absolute left-[1.125rem] top-5 bottom-5 w-px bg-border" />

                                    {patient.treatment_records.map(rec => {
                                        const filled   = (rec.services ?? []).filter(s => s.name);
                                        const expanded = expandedRecord === rec.id;
                                        const pb       = rec.payment_status ? PAYMENT_BADGE[rec.payment_status] : null;
                                        const isPaid   = rec.payment_status === 'paid';

                                        return (
                                            <div key={rec.id} className="relative flex gap-3.5">
                                                {/* Timeline dot */}
                                                <div className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-xl ring-4 ring-background shadow-sm ${
                                                    isPaid
                                                        ? 'bg-emerald-100 dark:bg-emerald-950/40'
                                                        : 'bg-blue-100 dark:bg-blue-950/40'
                                                }`}>
                                                    <Stethoscope className={`size-4 ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`} />
                                                </div>

                                                {/* Card */}
                                                <div className="flex-1 min-w-0 rounded-2xl border bg-card shadow-sm overflow-hidden">
                                                    <button type="button"
                                                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
                                                        onClick={() => setExpandedRecord(expanded ? null : rec.id)}>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                                                <p className="font-semibold text-foreground text-sm">
                                                                    {filled.length > 0 ? filled.map(s => s.name).join(', ') : 'Эмчилгээний тэмдэглэл'}
                                                                </p>
                                                                {pb && (
                                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pb.cls}`}>
                                                                        {pb.label}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                {rec.record_date}
                                                                {rec.doctor?.name && ` · Эмч: ${rec.doctor.name}`}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {rec.amount_charged !== null && rec.amount_charged > 0 && (
                                                                <span className={`text-sm font-bold tabular-nums ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                                                                    {rec.amount_charged.toLocaleString()}₮
                                                                </span>
                                                            )}
                                                            {expanded
                                                                ? <ChevronUp  className="size-4 text-muted-foreground" />
                                                                : <ChevronDown className="size-4 text-muted-foreground" />
                                                            }
                                                        </div>
                                                    </button>

                                                    {expanded && (
                                                        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border/60">
                                                            {filled.length > 0 && (
                                                                <div>
                                                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                                                                        Эмчилгээ / Үйлчилгээ
                                                                    </p>
                                                                    <div className="rounded-xl border overflow-hidden">
                                                                        {filled.map((s, i) => (
                                                                            <div key={i} className="flex items-center justify-between px-3 py-2.5 border-b last:border-0 text-sm bg-muted/20">
                                                                                <span className="text-foreground">{s.name}</span>
                                                                                {s.price != null && s.price > 0 && (
                                                                                    <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                                                                                        {s.price.toLocaleString()}₮
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {rec.doctor_notes && (
                                                                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3.5 py-3">
                                                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1">
                                                                        Зөвлөгөө / Тэмдэглэл
                                                                    </p>
                                                                    <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{rec.doctor_notes}</p>
                                                                </div>
                                                            )}
                                                            {rec.payment_status === 'leasing' && rec.leasing_plan && (() => {
                                                                const lp = rec.leasing_plan;
                                                                const pct = Math.round((lp.paid_months / lp.months) * 100);
                                                                const rem = lp.months - lp.paid_months;
                                                                return (
                                                                    <div className="rounded-2xl overflow-hidden border border-teal-200/60 dark:border-teal-700/40" style={{ background: 'linear-gradient(135deg,rgba(20,184,166,0.06) 0%,rgba(6,182,212,0.04) 100%)' }}>
                                                                        {/* header */}
                                                                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-teal-100 dark:border-teal-800/40">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="flex size-6 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40">
                                                                                    <CreditCard className="size-3 text-teal-600 dark:text-teal-400" />
                                                                                </div>
                                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">Лизингийн төлөлт</span>
                                                                            </div>
                                                                            <span className="text-xs font-extrabold text-teal-600 dark:text-teal-400">{pct}%</span>
                                                                        </div>
                                                                        {/* progress */}
                                                                        <div className="px-4 pt-3 pb-1">
                                                                            <div className="h-2 rounded-full bg-teal-100 dark:bg-teal-900/40 overflow-hidden">
                                                                                <div className="h-full rounded-full transition-all duration-500"
                                                                                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#10b981,#0d9488)' }} />
                                                                            </div>
                                                                            <div className="flex justify-between mt-1 mb-2">
                                                                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{lp.paid_months} сар төлсөн</span>
                                                                                <span className="text-[10px] text-muted-foreground">{lp.months} сар нийт</span>
                                                                            </div>
                                                                        </div>
                                                                        {/* stat chips */}
                                                                        <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                                                                            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 p-2.5 text-center">
                                                                                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">{lp.paid_months}</p>
                                                                                <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-500 dark:text-emerald-500 mt-1">Төлсөн сар</p>
                                                                            </div>
                                                                            <div className={`rounded-xl border p-2.5 text-center ${rem === 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800/40' : 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-800/40'}`}>
                                                                                <p className={`text-xl font-extrabold leading-none ${rem === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>{rem}</p>
                                                                                <p className={`text-[9px] font-semibold uppercase tracking-wide mt-1 ${rem === 0 ? 'text-emerald-500' : 'text-red-400'}`}>Үлдсэн сар</p>
                                                                            </div>
                                                                            <div className="rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-800/40 p-2.5 text-center">
                                                                                <p className="text-base font-extrabold text-teal-600 dark:text-teal-400 leading-none tabular-nums">{lp.monthly_amount.toLocaleString()}₮</p>
                                                                                <p className="text-[9px] font-semibold uppercase tracking-wide text-teal-500 mt-1">Сарын төлбөр</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                            {rec.payment_status !== 'paid' && (
                                                                <div className="flex flex-wrap gap-2 pt-1">
                                                                    {rec.payment_status === null && (
                                                                        <button type="button"
                                                                            onClick={() => router.patch(`/doctor/patients/${patient.id}/treatment-records/${rec.id}/send`, {}, { preserveScroll: true })}
                                                                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors">
                                                                            <Send className="size-3.5" />
                                                                            Ресепшнрүү илгээх
                                                                        </button>
                                                                    )}
                                                                    <button type="button"
                                                                        onClick={() => {
                                                                            if (confirm('Энэ бичлэгийг устгах уу?')) {
                                                                                router.delete(`/doctor/patients/${patient.id}/treatment-records/${rec.id}`, { preserveScroll: true });
                                                                            }
                                                                        }}
                                                                        className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-1.5 text-xs font-semibold transition-colors">
                                                                        <Trash2 className="size-3.5" />
                                                                        Устгах
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══ CONSENT TAB ══ */}
                    {tab === 'consent' && (
                        <div className="space-y-3">
                            {patient.consent_forms.length === 0 ? (
                                <div className="rounded-2xl border border-dashed bg-card p-16 text-center">
                                    <div className="flex size-14 items-center justify-center rounded-2xl bg-muted mx-auto mb-3">
                                        <FileText className="size-7 text-muted-foreground" />
                                    </div>
                                    <p className="font-medium text-foreground">Зөвшөөрлийн маягт байхгүй</p>
                                    <p className="text-sm text-muted-foreground mt-1">Ресепшн гарын үсэг авна</p>
                                </div>
                            ) : (
                                patient.consent_forms.map(cf => (
                                    <button key={cf.id} type="button" onClick={() => setConsentModal(cf)}
                                        className="w-full rounded-2xl border bg-card p-4 shadow-sm flex items-center gap-4 hover:shadow-md hover:bg-muted/20 transition-all cursor-pointer text-left">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                                            <CheckCircle2 className="size-5 text-emerald-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{cf.template?.title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {cf.signer_name} · {new Date(cf.signed_at).toLocaleDateString('mn-MN')}
                                            </p>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold shrink-0 ${CAT_CHIP[cf.template?.category] ?? 'bg-muted text-muted-foreground'}`}>
                                            {CAT_LABEL[cf.template?.category] ?? cf.template?.category}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ══ CONSENT MODAL ══ */}
            {consentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConsentModal(null)}>
                    <div onClick={e => e.stopPropagation()} className="bg-card rounded-2xl border shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <div>
                                <p className="text-sm font-semibold text-foreground">{consentModal.template?.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{consentModal.signer_name} · {new Date(consentModal.signed_at).toLocaleDateString('mn-MN')}</p>
                            </div>
                            <button type="button" onClick={() => setConsentModal(null)}
                                className="flex size-8 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors">
                                <X className="size-4 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {consentModal.template?.content && (
                                <div className="rounded-xl bg-muted/50 border border-border px-4 py-3.5 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                    {consentModal.template.content}
                                </div>
                            )}
                            {consentModal.patient_signature && (
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Өвчтний гарын үсэг</p>
                                    <div className="h-20 rounded-xl border border-border bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                                        <img src={consentModal.patient_signature} alt="Гарын үсэг" className="max-h-16 max-w-full object-contain opacity-85" />
                                    </div>
                                </div>
                            )}
                            {consentModal.guardian_signature && (
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                                        Асран хамгаалагчийн гарын үсэг{consentModal.guardian_name ? ` — ${consentModal.guardian_name}` : ''}
                                    </p>
                                    <div className="h-20 rounded-xl border border-border bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                                        <img src={consentModal.guardian_signature} alt="Гарын үсэг" className="max-h-16 max-w-full object-contain opacity-85" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </DoctorLayout>
    );
}
