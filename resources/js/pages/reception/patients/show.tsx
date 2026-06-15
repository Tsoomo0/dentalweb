import ReceptionLayout from '@/layouts/reception-layout';
import SignaturePad, { type SignaturePadRef } from '@/components/signature-pad';
import { shortDoctorName } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
    AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp,
    Clock, CreditCard, FileText, Mail, MapPin, PenLine, Phone,
    Send, ShieldAlert, Stethoscope, User, X, CalendarDays, Heart,
    Pill, ClipboardList,
} from 'lucide-react';

/* ── Types ── */
interface Service { name: string; price?: number }

interface MedHistory {
    has_heart_disease: boolean; has_diabetes: boolean; has_hypertension: boolean;
    has_hepatitis: boolean; has_bleeding_disorder: boolean; has_asthma: boolean;
    has_epilepsy: boolean; has_kidney_disease: boolean; has_hiv: boolean;
    has_mental_disorder: boolean; has_cancer: boolean; is_cancer_treatment: boolean;
    has_thyroid_disorder: boolean; has_anemia: boolean; takes_blood_thinners: boolean;
    has_tuberculosis: boolean; has_infectious_hepatitis: boolean; has_tonsils: boolean;
    is_pregnant: boolean; is_nursing: boolean; has_womens_condition: boolean;
    is_smoker: boolean; drinks_alcohol: boolean;
    other_conditions: string | null; organ_stones: string | null;
    allergy_penicillin: boolean; allergy_aspirin: boolean;
    allergy_latex: boolean; allergy_anesthetic: boolean; had_anesthetic_allergy: boolean;
    allergy_other: string | null; current_medications: string | null;
    special_ongoing_treatment: string | null;
    had_dental_complications: boolean; dental_complication_detail: string | null;
    previous_surgeries: string | null; previous_dental_treatments: string | null;
    last_checkup: string | null; previous_dental_clinics: string | null;
    [key: string]: boolean | string | null | undefined;
}

interface LeasingPlan {
    total_amount: number;
    months: number;
    monthly_amount: number;
    paid_months: number;
    last_installment_paid_at: string | null;
}

interface TreatmentRecord {
    id: number;
    services: Service[];
    doctor_notes: string | null;
    amount_charged: number | null;
    paid_amount: number | null;
    payment_status: string | null;
    payment_method: string | null;
    record_date: string;
    paid_at: string | null;
    doctor: { id: number; name: string } | null;
    leasing_plan: LeasingPlan | null;
}

interface ConsentFormItem {
    id: number; template_id: number; signer_name: string;
    signed_at: string | null; patient_signature: string | null;
    template: { code: string; title: string; category: string };
}
interface Template { id: number; code: string; category: string; title: string; content: string }

interface Appointment {
    id: number;
    appointment_number: string | null;
    appointment_date: string | null;
    appointment_time: string | null;
    appointment_time_end: string | null;
    status: string | null;
    service: string | null;
    type: string | null;
    notes: string | null;
    payment_status: string | null;
    payment_amount: number | null;
    doctor: { id: number; name: string } | null;
}

interface Patient {
    id: number; patient_number: string; last_name: string; first_name: string;
    gender: string | null; date_of_birth: string | null; register_number: string | null;
    phone: string; phone2: string | null; email: string | null; address: string | null;
    emergency_contact_name: string | null; emergency_contact_phone: string | null;
    emergency_contact_relation: string | null; notes: string | null;
    user_id: number | null;
    medical_history: MedHistory | null;
    ortho_assessment: { data: Record<string, unknown> } | null;
    consent_forms: ConsentFormItem[];
    treatment_records: TreatmentRecord[];
    appointments: Appointment[];
}
interface Props { patient: Patient; templates: Template[]; signedIds: number[]; pendingIds: number[] }

/* ── Constants ── */
const CAT_LABEL: Record<string, string> = {
    treat:   'Эмчилгээний таниулсан зөвшөөрлийн хуудас',
    endo:    'Сувгийн эмчилгээ',
    ortho:   'Гажиг заслын таниулсан зөвшөөрлийн хуудас',
    perio:   'Тулгуур эдийн эмчилгээний таниулсан зөвшөөрлийн хуудас',
    prostho: 'Хиймэл шүдний таниулсан зөвшөөрлийн хуудас',
    surg:    'Мэс заслын таниулсан зөвшөөрлийн хуудас',
    prevent: 'Урьдчилан сэргийлэх',
};
const CAT_LABEL_SHORT: Record<string, string> = {
    treat:   'Эмчилгээ',
    endo:    'Сувгийн',
    ortho:   'Гажиг засал',
    perio:   'Тулгуур эд',
    prostho: 'Хиймэл шүд',
    surg:    'Мэс засал',
    prevent: 'Урьдчилан',
};
const CAT_CHIP: Record<string, string> = {
    treat:   'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    endo:    'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    ortho:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    perio:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300',
    prostho: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
    surg:    'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
    prevent: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
};
const CAT_ICON_BG: Record<string, string> = {
    treat: 'from-blue-500 to-indigo-600', endo: 'from-purple-500 to-violet-600',
    ortho: 'from-emerald-500 to-teal-600', perio: 'from-yellow-500 to-amber-600',
    prostho: 'from-orange-500 to-amber-600', surg: 'from-red-500 to-rose-600',
    prevent: 'from-teal-500 to-cyan-600',
};

const GENDER: Record<string, string> = { male: 'Эрэгтэй', female: 'Эмэгтэй', other: 'Бусад' };
const GENDER_CHIP: Record<string, string> = {
    male:   'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    female: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',
    other:  'bg-muted text-muted-foreground',
};

const AVATAR_GRADIENTS = [
    'from-red-400 to-rose-600', 'from-blue-400 to-indigo-600',
    'from-emerald-400 to-teal-600', 'from-amber-400 to-orange-600',
    'from-violet-400 to-purple-600', 'from-cyan-400 to-sky-600',
];
function avatarGradient(name: string) {
    return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

/* Payment status */
type PayStatus = 'paid' | 'sent' | 'partial' | 'leasing' | null;
function PayBadge({ status }: { status: PayStatus }) {
    if (status === 'paid')
        return (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap">
                <CheckCircle2 className="size-3" /> Төлөгдсөн
            </span>
        );
    if (status === 'sent')
        return (
            <span className="flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap">
                <Clock className="size-3" /> Хүлээж байна
            </span>
        );
    if (status === 'partial')
        return (
            <span className="flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap">
                <CreditCard className="size-3" /> Хэсэгчлэн
            </span>
        );
    if (status === 'leasing')
        return (
            <span className="flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap">
                <CreditCard className="size-3" /> Лизинг
            </span>
        );
    return (
        <span className="rounded-full bg-muted text-muted-foreground px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap">
            Илгээгдээгүй
        </span>
    );
}

type Tab = 'info' | 'appointments' | 'records' | 'medical' | 'consent';

function calcAge(dob: string | null): string | null {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) + ' нас';
}


/* ── Medical history condition labels ── */
const CONDITIONS: { key: string; label: string }[] = [
    { key: 'has_heart_disease',      label: 'Зүрхний өвчин' },
    { key: 'has_diabetes',           label: 'Чихрийн шижин' },
    { key: 'has_hypertension',       label: 'Цусны даралт өндөр' },
    { key: 'has_hepatitis',          label: 'Элэгний өвчин (хепатит)' },
    { key: 'has_bleeding_disorder',  label: 'Цус зогсохгүй байх' },
    { key: 'has_asthma',             label: 'Гуурсан хоолойн багтраа' },
    { key: 'has_epilepsy',           label: 'Тайван бус (эпилепси)' },
    { key: 'has_kidney_disease',     label: 'Бөөрний өвчин' },
    { key: 'has_hiv',                label: 'ДОХН / ДХБ' },
    { key: 'has_mental_disorder',    label: 'Сэтгэцийн өвчин' },
    { key: 'has_cancer',             label: 'Хорт хавдар' },
    { key: 'is_cancer_treatment',    label: 'Хавдрын эмчилгээнд явж байна' },
    { key: 'has_thyroid_disorder',   label: 'Бамбай булчирхайн өвчин' },
    { key: 'has_anemia',             label: 'Цусны дутагдал (цус багадалт)' },
    { key: 'takes_blood_thinners',   label: 'Цус шингэлэх эм уудаг' },
    { key: 'has_tuberculosis',       label: 'Сүрьеэ' },
    { key: 'has_infectious_hepatitis', label: 'Халдварт гепатит' },
    { key: 'has_tonsils',            label: 'Тонзилл' },
    { key: 'is_pregnant',            label: 'Жирэмсэн' },
    { key: 'is_nursing',             label: 'Хөхүүл хүүхэдтэй' },
    { key: 'has_womens_condition',   label: 'Эмэгтэйчүүдийн өвчин' },
    { key: 'is_smoker',              label: 'Тамхи татдаг' },
    { key: 'drinks_alcohol',         label: 'Архи хэтрүүлэн хэрэглэдэг' },
];
const ALLERGIES: { key: string; label: string }[] = [
    { key: 'allergy_penicillin',    label: 'Пенициллин' },
    { key: 'allergy_aspirin',       label: 'Аспирин' },
    { key: 'allergy_latex',         label: 'Латекс' },
    { key: 'allergy_anesthetic',    label: 'Мэдээ алдуулагч' },
    { key: 'had_anesthetic_allergy', label: 'Өмнө мэдээ алдуулагчид харшилсан' },
];

export default function PatientShow({ patient, templates, signedIds, pendingIds }: Props) {
    const [tab, setTab] = useState<Tab>('info');
    const [consentModal, setConsentModal] = useState<Template | null>(null);
    const [expandedCat, setExpandedCat] = useState<string | null>(null);

    // Зөвшөөрлийн таб нээлттэй үед 15 секунд тутамд шинэчилнэ
    useEffect(() => {
        if (tab !== 'consent') return;
        const id = setInterval(() => {
            if (!document.hidden) {
                router.reload({ only: ['patient', 'signedIds', 'pendingIds'] });
            }
        }, 15000);
        return () => clearInterval(id);
    }, [tab]);

    const patSigRef  = useRef<SignaturePadRef>(null);
    const guarSigRef = useRef<SignaturePadRef>(null);
    const [patHasDrawn, setPatHasDrawn]   = useState(false);
    const [consentSignerName, setConsentSignerName] = useState('');
    const [consentTemplateId, setConsentTemplateId] = useState(0);
    const [consentProcessing, setConsentProcessing] = useState(false);
    const [consentError, setConsentError] = useState('');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Хяналтын самбар', href: '/reception/dashboard' },
        { title: 'Өвчтний карт',    href: '/reception/patients' },
        { title: `${patient.last_name} ${patient.first_name}`, href: `/reception/patients/${patient.id}` },
    ];

    function openConsent(t: Template) {
        setPatHasDrawn(false);
        setConsentError('');
        setConsentTemplateId(t.id);
        setConsentSignerName(`${patient.last_name} ${patient.first_name}`);
        patSigRef.current?.clear();
        guarSigRef.current?.clear();
        setConsentModal(t);
    }

    function submitConsent(e: FormEvent) {
        e.preventDefault();
        if (!patHasDrawn) { setConsentError('Өвчтний гарын үсэг зурна уу'); return; }
        const sig = patSigRef.current?.toDataURL() ?? '';
        if (!sig || sig === 'data:,') { setConsentError('Өвчтний гарын үсэг зурна уу'); return; }
        setConsentError('');
        setConsentProcessing(true);
        const payload: Record<string, string | number> = {
            template_id:       consentTemplateId,
            signer_name:       consentSignerName,
            patient_signature: sig,
        };
        if (guarSigRef.current && !guarSigRef.current.isEmpty()) {
            payload.guardian_signature = guarSigRef.current.toDataURL();
        }
        router.post(`/reception/patients/${patient.id}/consent`, payload, {
            onSuccess: () => { setConsentModal(null); setPatHasDrawn(false); },
            onError: (errors) => { setConsentError(Object.values(errors)[0] as string ?? 'Алдаа гарлаа'); },
            onFinish: () => setConsentProcessing(false),
        });
    }

    const grouped = templates.reduce<Record<string, Template[]>>((acc, t) => {
        (acc[t.category] ??= []).push(t);
        return acc;
    }, {});

    const signedCount   = patient.consent_forms.filter(cf => cf.patient_signature).length;
    const totalConsents = templates.length;
    const paidTotal     = patient.treatment_records
        .filter(r => r.payment_status === 'paid')
        .reduce((s, r) => s + (r.amount_charged ?? 0), 0);

    const hasMedWarnings = patient.medical_history && (
        patient.medical_history.has_heart_disease || patient.medical_history.has_diabetes ||
        patient.medical_history.has_hypertension  || patient.medical_history.has_hepatitis ||
        patient.medical_history.has_bleeding_disorder || patient.medical_history.is_pregnant ||
        patient.medical_history.allergy_penicillin || patient.medical_history.allergy_aspirin ||
        patient.medical_history.allergy_anesthetic
    );

    const hasMedical = !!patient.medical_history;

    const initials = (patient.last_name[0] ?? '') + (patient.first_name[0] ?? '');
    const age      = calcAge(patient.date_of_birth);

    const tabConfig: { key: Tab; label: string; count?: number }[] = [
        { key: 'info',         label: 'Мэдээлэл' },
        { key: 'appointments', label: 'Захиалга',   count: patient.appointments.length },
        { key: 'records',      label: 'Эмчилгээ',   count: patient.treatment_records.length },
        { key: 'medical',      label: 'Эмнэлгийн карт' },
        { key: 'consent',      label: 'Зөвшөөрөл',  count: signedCount },
    ];

    return (
        <ReceptionLayout breadcrumbs={breadcrumbs}>
            <Head title={`${patient.last_name} ${patient.first_name}`} />
            <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">

                {/* ── Back ── */}
                <Link href="/reception/patients"
                    className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="size-4" />
                    Өвчтний карт жагсаалт
                </Link>

                {/* ══ PROFILE CARD ══ */}
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className={`h-16 bg-gradient-to-r ${avatarGradient(patient.last_name)}`} />
                    <div className="px-5 pb-5">
                        <div className="flex items-end justify-between -mt-8 mb-3">
                            <div className={`flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGradient(patient.last_name)} text-white text-xl font-bold shadow-md ring-4 ring-card`}>
                                {initials.toUpperCase()}
                            </div>
                            <div className="flex gap-2 mb-1">
                                <div className="rounded-xl border bg-muted/50 px-3 py-1.5 text-center min-w-[52px]">
                                    <p className="text-sm font-bold text-foreground">{patient.treatment_records.length}</p>
                                    <p className="text-[10px] text-muted-foreground">Эмчилгээ</p>
                                </div>
                                <div className="rounded-xl border bg-muted/50 px-3 py-1.5 text-center min-w-[52px]">
                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{signedCount}</p>
                                    <p className="text-[10px] text-muted-foreground">Зөвшөөрөл</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h1 className="text-lg font-bold tracking-tight text-foreground">
                                {patient.last_name} {patient.first_name}
                            </h1>
                            {patient.gender && (
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${GENDER_CHIP[patient.gender]}`}>
                                    {GENDER[patient.gender]}
                                </span>
                            )}
                            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                {patient.patient_number}
                            </span>
                        </div>
                        {(age || patient.date_of_birth) && (
                            <p className="text-sm text-muted-foreground mb-3">
                                {age}{age && patient.date_of_birth && <span className="mx-1.5 text-border">·</span>}{patient.date_of_birth}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            <a href={`tel:${patient.phone}`}
                                className="flex items-center gap-1.5 rounded-lg border bg-muted/40 hover:bg-muted px-2.5 py-1.5 text-xs text-foreground transition-colors">
                                <Phone className="size-3 text-muted-foreground" />{patient.phone}
                            </a>
                            {patient.phone2 && (
                                <a href={`tel:${patient.phone2}`}
                                    className="flex items-center gap-1.5 rounded-lg border bg-muted/40 hover:bg-muted px-2.5 py-1.5 text-xs text-foreground transition-colors">
                                    <Phone className="size-3 text-muted-foreground" />{patient.phone2}
                                </a>
                            )}
                            {patient.email && (
                                <a href={`mailto:${patient.email}`}
                                    className="flex items-center gap-1.5 rounded-lg border bg-muted/40 hover:bg-muted px-2.5 py-1.5 text-xs text-foreground transition-colors">
                                    <Mail className="size-3 text-muted-foreground" />{patient.email}
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Medical warning ── */}
                {hasMedWarnings && (
                    <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800/50 px-4 py-3 flex items-start gap-3">
                        <ShieldAlert className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1.5 uppercase tracking-wide">Эрүүл мэндийн анхааруулга</p>
                            <div className="flex flex-wrap gap-1.5">
                                {patient.medical_history!.has_heart_disease    && <MedBadge label="Зүрхний өвчин" color="red" />}
                                {patient.medical_history!.has_diabetes          && <MedBadge label="Чихрийн шижин" color="red" />}
                                {patient.medical_history!.has_hypertension      && <MedBadge label="Цусны даралт" color="red" />}
                                {patient.medical_history!.has_hepatitis         && <MedBadge label="Элэгний өвчин" color="red" />}
                                {patient.medical_history!.has_bleeding_disorder && <MedBadge label="Цус зогсохгүй" color="red" />}
                                {patient.medical_history!.is_pregnant           && <MedBadge label="Жирэмсэн" color="pink" />}
                                {patient.medical_history!.allergy_penicillin    && <MedBadge label="Пенициллин харшил" color="orange" />}
                                {patient.medical_history!.allergy_aspirin       && <MedBadge label="Аспирин харшил" color="orange" />}
                                {patient.medical_history!.allergy_anesthetic    && <MedBadge label="Мэдээ алдуулагч харшил" color="orange" />}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Tabs ── */}
                <div className="flex flex-wrap rounded-xl border bg-muted/50 p-1 gap-1">
                    {tabConfig.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                                tab === t.key
                                    ? 'bg-card shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}>
                            {t.label}
                            {t.count !== undefined && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none min-w-[18px] text-center ${
                                    tab === t.key ? 'bg-red-600 text-white' : 'bg-muted text-muted-foreground'
                                }`}>{t.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ══ INFO TAB ══ */}
                {tab === 'info' && (
                    <div className="space-y-4">
                        <Section icon={<Phone className="size-3.5" />} iconBg="from-blue-500 to-indigo-600" title="Холбоо барих мэдээлэл">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                                <Field label="Утас">{patient.phone}</Field>
                                {patient.phone2     && <Field label="Нэмэлт утас">{patient.phone2}</Field>}
                                {patient.email      && <Field label="Имэйл">{patient.email}</Field>}
                                {patient.register_number && <Field label="Регистр"><span className="font-mono">{patient.register_number}</span></Field>}
                                {patient.address    && (
                                    <div className="col-span-2 sm:col-span-3">
                                        <Field label="Хаяг">
                                            <span className="flex items-start gap-1">
                                                <MapPin className="size-3 mt-0.5 shrink-0 text-muted-foreground" />{patient.address}
                                            </span>
                                        </Field>
                                    </div>
                                )}
                            </div>
                        </Section>

                        {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/50 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
                                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Яаралтай холбогдох хүн</p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                                    {patient.emergency_contact_name && <Field label="Нэр">{patient.emergency_contact_name}</Field>}
                                    {patient.emergency_contact_relation && <Field label="Холбоо">{patient.emergency_contact_relation}</Field>}
                                    {patient.emergency_contact_phone && <Field label="Утас">{patient.emergency_contact_phone}</Field>}
                                </div>
                            </div>
                        )}

                        {patient.notes && (
                            <Section icon={<FileText className="size-3.5" />} iconBg="from-violet-500 to-purple-600" title="Тэмдэглэл">
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{patient.notes}</p>
                            </Section>
                        )}

                        {!patient.emergency_contact_name && !patient.emergency_contact_phone && !patient.notes && (
                            <div className="rounded-xl border bg-card py-12 text-center shadow-sm">
                                <User className="size-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">Нэмэлт мэдээлэл байхгүй</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ══ APPOINTMENTS TAB ══ */}
                {tab === 'appointments' && (
                    <div className="space-y-3">
                        {patient.appointments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card py-16 text-center shadow-sm">
                                <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/30 mb-3">
                                    <CalendarDays className="size-7 text-blue-400" />
                                </div>
                                <p className="text-base font-semibold text-foreground">Захиалга байхгүй</p>
                                <p className="text-sm text-muted-foreground mt-1">Энэ өвчтний цаг захиалгуудыг энд харна</p>
                            </div>
                        ) : (
                            patient.appointments.map(appt => {
                                const isUpcoming = appt.appointment_date && appt.appointment_date >= new Date().toISOString().slice(0, 10);
                                const statusConfig: Record<string, { label: string; cls: string }> = {
                                    pending:   { label: 'Хүлээгдэж буй', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                                    confirmed: { label: 'Баталгаажсан',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                                    completed: { label: 'Дууссан',       cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
                                    cancelled: { label: 'Цуцлагдсан',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
                                    no_show:   { label: 'Ирээгүй',       cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400' },
                                };
                                const sc = statusConfig[appt.status ?? ''] ?? { label: appt.status ?? '—', cls: 'bg-muted text-muted-foreground' };
                                return (
                                    <div
                                        key={appt.id}
                                        className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border bg-card px-5 py-4 shadow-sm transition-shadow hover:shadow-md ${isUpcoming ? 'border-l-4 border-l-blue-400' : ''}`}
                                    >
                                        {/* Date block */}
                                        <div className={`flex flex-col items-center justify-center rounded-xl px-3 py-2.5 min-w-[64px] shrink-0 ${isUpcoming ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-muted/50'}`}>
                                            {appt.appointment_date ? (
                                                <>
                                                    <span className={`text-xl font-bold tabular-nums leading-none ${isUpcoming ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>
                                                        {new Date(appt.appointment_date + 'T00:00').getDate()}
                                                    </span>
                                                    <span className={`text-[10px] font-semibold mt-0.5 ${isUpcoming ? 'text-blue-500 dark:text-blue-400' : 'text-muted-foreground'}`}>
                                                        {new Date(appt.appointment_date + 'T00:00').toLocaleDateString('mn-MN', { month: 'short' })}
                                                    </span>
                                                    {appt.appointment_time && (
                                                        <span className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">
                                                            {appt.appointment_time.slice(0, 5)}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <CalendarDays className="size-5 text-muted-foreground" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {appt.appointment_number && (
                                                    <span className="rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                                                        #{appt.appointment_number}
                                                    </span>
                                                )}
                                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${sc.cls}`}>
                                                    {sc.label}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                                {appt.doctor?.name && (
                                                    <span className="flex items-center gap-1">
                                                        <Stethoscope className="size-3" />
                                                        <span className="font-medium text-foreground">{shortDoctorName(appt.doctor.name)}</span>
                                                    </span>
                                                )}
                                                {appt.service && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="size-1 rounded-full bg-muted-foreground/40" />
                                                        {appt.service}
                                                    </span>
                                                )}
                                            </div>
                                            {appt.notes && (
                                                <p className="text-xs text-muted-foreground italic truncate">{appt.notes}</p>
                                            )}
                                        </div>

                                        {/* Payment — зөвхөн онлайн, төлбөртэй захиалгад */}
                                        {appt.payment_amount != null && appt.payment_amount > 0
                                            && appt.type === 'online'
                                            && appt.payment_status !== 'free' && (
                                            <div className="shrink-0 text-right">
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Урьдчилгаа</p>
                                                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                    {appt.payment_amount.toLocaleString()}₮
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* ══ RECORDS TAB ══ */}
                {tab === 'records' && (
                    <div className="space-y-4">
                        {patient.treatment_records.length === 0 ? (
                            <div className="rounded-2xl border bg-card py-20 shadow-sm text-center">
                                <Stethoscope className="size-10 text-muted-foreground mx-auto mb-3" />
                                <p className="font-semibold text-foreground">Эмчилгээний түүх байхгүй</p>
                                <p className="text-sm text-muted-foreground mt-1">Эмч эмчилгээний тэмдэглэл нэмэхэд энд харагдана</p>
                            </div>
                        ) : (
                            <>
                                {/* Summary */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { icon: <Stethoscope className="size-4 text-blue-600 dark:text-blue-400" />, bg: 'bg-blue-50 dark:bg-blue-950/30', value: patient.treatment_records.length, label: 'Нийт эмчилгээ' },
                                        { icon: <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />, bg: 'bg-emerald-50 dark:bg-emerald-950/30', value: patient.treatment_records.filter(r => r.payment_status === 'paid').length, label: 'Төлөгдсөн' },
                                        { icon: <CreditCard className="size-4 text-violet-600 dark:text-violet-400" />, bg: 'bg-violet-50 dark:bg-violet-950/30', value: paidTotal.toLocaleString() + '₮', label: 'Нийт орлого' },
                                    ].map(s => (
                                        <div key={s.label} className="rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-1">
                                            <div className={`flex size-8 items-center justify-center rounded-lg ${s.bg} mb-1`}>{s.icon}</div>
                                            <p className="text-base font-bold text-foreground leading-tight">{s.value}</p>
                                            <p className="text-xs text-muted-foreground">{s.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Table */}
                                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                    {/* Desktop header */}
                                    <div className="border-b bg-muted/40 px-4 py-3 hidden sm:grid gap-3"
                                        style={{ gridTemplateColumns: '96px 1fr 120px 90px 120px 100px' }}>
                                        {['Огноо', 'Хийгдсэн эмчилгээ', 'Эмч', 'Үнэ', 'Төлөлт', 'Төлсөн огноо'].map(h => (
                                            <span key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</span>
                                        ))}
                                    </div>

                                    <div className="divide-y divide-border">
                                        {patient.treatment_records.map((rec, idx) => (
                                            <div key={rec.id}
                                                className={`px-4 py-3.5 hover:bg-muted/20 transition-colors ${idx % 2 === 1 ? 'bg-muted/10' : ''}`}>

                                                {/* Desktop */}
                                                <div className="hidden sm:grid gap-3 items-start"
                                                    style={{ gridTemplateColumns: '96px 1fr 120px 90px 120px 100px' }}>

                                                    {/* Огноо */}
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
                                                        <CalendarDays className="size-3 shrink-0" />
                                                        {rec.record_date}
                                                    </div>

                                                    {/* Хийгдсэн эмчилгээ */}
                                                    <div className="min-w-0 space-y-1">
                                                        {rec.services && rec.services.length > 0 ? (
                                                            <div className="space-y-0.5">
                                                                {rec.services.map((svc, i) => (
                                                                    <div key={i} className="flex items-center justify-between gap-2">
                                                                        <span className="text-sm text-foreground leading-snug">{svc.name}</span>
                                                                        {svc.price !== undefined && svc.price > 0 && (
                                                                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                                                                                {Number(svc.price).toLocaleString()}₮
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">Эмчилгээ бүртгэгдээгүй</span>
                                                        )}
                                                        {rec.doctor_notes && (
                                                            <p className="text-xs text-muted-foreground border-t border-dashed border-border pt-1 mt-1 line-clamp-2">
                                                                Тэмдэглэл: {rec.doctor_notes}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Эмч */}
                                                    <div className="flex items-center gap-1.5 pt-0.5">
                                                        {rec.doctor ? (
                                                            <>
                                                                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
                                                                    {rec.doctor.name[0]}
                                                                </div>
                                                                <span className="text-xs text-foreground truncate">{shortDoctorName(rec.doctor.name)}</span>
                                                            </>
                                                        ) : <span className="text-xs text-muted-foreground">—</span>}
                                                    </div>

                                                    {/* Үнэ */}
                                                    <div className="text-right pt-0.5">
                                                        {rec.amount_charged !== null && rec.amount_charged > 0 ? (
                                                            <span className="text-sm font-semibold text-foreground tabular-nums">
                                                                {rec.amount_charged.toLocaleString()}₮
                                                            </span>
                                                        ) : <span className="text-xs text-muted-foreground">—</span>}
                                                    </div>

                                                    {/* Төлөлт */}
                                                    <div className="pt-0.5">
                                                        <PayBadge status={rec.payment_status as PayStatus} />
                                                    </div>

                                                    {/* Төлсөн огноо / Лизинг мэдээлэл */}
                                                    <div className="pt-0.5 text-xs">
                                                        {rec.payment_status === 'leasing' && rec.leasing_plan ? (
                                                            <div className="space-y-0.5">
                                                                {rec.leasing_plan.last_installment_paid_at ? (
                                                                    <span className="text-violet-700 dark:text-violet-400 font-medium">
                                                                        {rec.leasing_plan.last_installment_paid_at}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground">—</span>
                                                                )}
                                                                <p className="text-muted-foreground">
                                                                    {rec.leasing_plan.paid_months} / {rec.leasing_plan.months} сар
                                                                </p>
                                                            </div>
                                                        ) : rec.paid_at ? (
                                                            <span className="text-emerald-700 dark:text-emerald-400">{rec.paid_at}</span>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Mobile */}
                                                <div className="sm:hidden space-y-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <CalendarDays className="size-3" />{rec.record_date}
                                                        </span>
                                                        <PayBadge status={rec.payment_status as PayStatus} />
                                                    </div>
                                                    {rec.services && rec.services.length > 0 ? (
                                                        <div className="space-y-0.5">
                                                            {rec.services.map((svc, i) => (
                                                                <div key={i} className="flex justify-between gap-2">
                                                                    <span className="text-sm text-foreground">{svc.name}</span>
                                                                    {svc.price !== undefined && svc.price > 0 && (
                                                                        <span className="text-xs text-muted-foreground tabular-nums">{Number(svc.price).toLocaleString()}₮</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                    <div className="flex items-center justify-between">
                                                        {rec.doctor
                                                            ? <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="size-3" />{shortDoctorName(rec.doctor.name)}</span>
                                                            : <span />}
                                                        {rec.amount_charged !== null && rec.amount_charged > 0 && (
                                                            <span className="text-sm font-bold text-foreground tabular-nums">{rec.amount_charged.toLocaleString()}₮</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Footer total */}
                                    <div className="border-t bg-muted/30 px-4 py-3 flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            Нийт <span className="font-semibold text-foreground">{patient.treatment_records.length}</span> бичлэг
                                        </span>
                                        <span className="text-sm font-bold text-foreground">
                                            Нийт: <span className="text-emerald-600 dark:text-emerald-400">{paidTotal.toLocaleString()}₮</span>
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ══ MEDICAL CARD TAB (read-only) ══ */}
                {tab === 'medical' && (
                    <div className="space-y-4">
                        {!hasMedical ? (
                            <div className="rounded-2xl border bg-card py-20 shadow-sm text-center">
                                <ClipboardList className="size-10 text-muted-foreground mx-auto mb-3" />
                                <p className="font-semibold text-foreground">Эмнэлгийн карт бөглөгдөөгүй</p>
                                <p className="text-sm text-muted-foreground mt-1">Эмч эмнэлгийн картыг бөглөсний дараа энд харагдана</p>
                            </div>
                        ) : (
                            <>
                                {/* Conditions */}
                                <Section icon={<Heart className="size-3.5" />} iconBg="from-red-500 to-rose-600" title="Өвчний түүх">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {CONDITIONS.map(({ key, label }) => {
                                            const val = patient.medical_history![key] as boolean | undefined;
                                            return (
                                                <div key={key} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                                                    val
                                                        ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
                                                        : 'bg-muted/30 text-muted-foreground'
                                                }`}>
                                                    <div className={`size-4 rounded flex items-center justify-center shrink-0 ${
                                                        val ? 'bg-red-600 text-white' : 'border border-border bg-background'
                                                    }`}>
                                                        {val && <svg className="size-2.5" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                                    </div>
                                                    {label}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {patient.medical_history!.other_conditions && (
                                        <div className="mt-2 rounded-lg border bg-muted/20 px-3 py-2">
                                            <p className="text-xs text-muted-foreground font-semibold mb-0.5">Бусад өвчин</p>
                                            <p className="text-sm text-foreground">{patient.medical_history!.other_conditions}</p>
                                        </div>
                                    )}
                                </Section>

                                {/* Allergies */}
                                <Section icon={<ShieldAlert className="size-3.5" />} iconBg="from-orange-500 to-amber-600" title="Харшлын мэдээлэл">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {ALLERGIES.map(({ key, label }) => {
                                            const val = patient.medical_history![key] as boolean | undefined;
                                            return (
                                                <div key={key} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                                                    val
                                                        ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300'
                                                        : 'bg-muted/30 text-muted-foreground'
                                                }`}>
                                                    <div className={`size-4 rounded flex items-center justify-center shrink-0 ${
                                                        val ? 'bg-orange-500 text-white' : 'border border-border bg-background'
                                                    }`}>
                                                        {val && <svg className="size-2.5" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                                    </div>
                                                    {label}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {patient.medical_history!.allergy_other && (
                                        <div className="mt-2 rounded-lg border bg-muted/20 px-3 py-2">
                                            <p className="text-xs text-muted-foreground font-semibold mb-0.5">Бусад харшил</p>
                                            <p className="text-sm text-foreground">{patient.medical_history!.allergy_other}</p>
                                        </div>
                                    )}
                                </Section>

                                {/* Medications & treatments */}
                                <Section icon={<Pill className="size-3.5" />} iconBg="from-blue-500 to-indigo-600" title="Эм, эмчилгээ">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {patient.medical_history!.current_medications && (
                                            <Field label="Одоо хэрэглэж буй эм">
                                                {patient.medical_history!.current_medications}
                                            </Field>
                                        )}
                                        {patient.medical_history!.special_ongoing_treatment && (
                                            <Field label="Тусгай эмчилгээ">
                                                {patient.medical_history!.special_ongoing_treatment}
                                            </Field>
                                        )}
                                        {patient.medical_history!.previous_dental_treatments && (
                                            <Field label="Өмнөх шүдний эмчилгээ">
                                                {patient.medical_history!.previous_dental_treatments}
                                            </Field>
                                        )}
                                        {patient.medical_history!.previous_surgeries && (
                                            <Field label="Өмнөх мэс засал">
                                                {patient.medical_history!.previous_surgeries}
                                            </Field>
                                        )}
                                        {patient.medical_history!.last_checkup && (
                                            <Field label="Сүүлд шүдний эмчид хэзээ очсон">
                                                {patient.medical_history!.last_checkup}
                                            </Field>
                                        )}
                                        {patient.medical_history!.previous_dental_clinics && (
                                            <Field label="Өмнө очсон эмнэлгүүд">
                                                {patient.medical_history!.previous_dental_clinics}
                                            </Field>
                                        )}
                                        {patient.medical_history!.dental_complication_detail && (
                                            <div className="sm:col-span-2">
                                                <Field label="Шүдний эмчилгээний хүндрэл">
                                                    {patient.medical_history!.dental_complication_detail}
                                                </Field>
                                            </div>
                                        )}
                                    </div>
                                    {!patient.medical_history!.current_medications &&
                                     !patient.medical_history!.special_ongoing_treatment &&
                                     !patient.medical_history!.previous_dental_treatments &&
                                     !patient.medical_history!.previous_surgeries &&
                                     !patient.medical_history!.last_checkup &&
                                     !patient.medical_history!.previous_dental_clinics &&
                                     !patient.medical_history!.dental_complication_detail && (
                                        <p className="text-sm text-muted-foreground">Мэдээлэл оруулаагүй</p>
                                    )}
                                </Section>

                                <p className="text-xs text-center text-muted-foreground py-1">
                                    Энэхүү эмнэлгийн карт нь зөвхөн харах боломжтой — зөвхөн эмч засах боломжтой
                                </p>
                            </>
                        )}
                    </div>
                )}

                {/* ══ CONSENT TAB ══ */}
                {tab === 'consent' && (
                    <div className="space-y-4">

                        {/* ── Progress header card ── */}
                        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                            <div className="px-5 py-4 flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-foreground mb-0.5">Зөвшөөрлийн хуудас</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Нийт <span className="font-semibold text-foreground">{totalConsents}</span> маягтаас{' '}
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{signedCount}</span> нь гарын үсэг зурагдсан
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-right">
                                        <p className={`text-2xl font-bold tabular-nums ${signedCount === totalConsents && totalConsents > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                            {totalConsents > 0 ? Math.round((signedCount / totalConsents) * 100) : 0}%
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">гүйцэтгэл</p>
                                    </div>
                                </div>
                            </div>
                            {/* Progress bar */}
                            <div className="h-1.5 bg-muted">
                                <div className={`h-full transition-all ${signedCount === totalConsents && totalConsents > 0 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                    style={{ width: totalConsents > 0 ? `${(signedCount / totalConsents) * 100}%` : '0%' }} />
                            </div>
                            {/* Category quick overview */}
                            <div className="px-5 py-3 flex flex-wrap gap-2 border-t bg-muted/20">
                                {Object.entries(grouped).map(([cat, items]) => {
                                    const cs = items.filter(t => signedIds.includes(t.id)).length;
                                    const full = cs === items.length;
                                    return (
                                        <button key={cat}
                                            onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
                                            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
                                                full
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                                                    : `${CAT_CHIP[cat]} border-transparent`
                                            }`}>
                                            {full && <CheckCircle2 className="size-3" />}
                                            {CAT_LABEL_SHORT[cat] ?? cat}
                                            <span className={`rounded-full px-1 text-[10px] font-bold leading-tight ${full ? 'bg-emerald-200/60 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-black/10 dark:bg-white/15'}`}>
                                                {cs}/{items.length}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Category accordion panels ── */}
                        <div className="space-y-3">
                            {Object.entries(grouped).map(([cat, items]) => {
                                const catSigned = items.filter(t => signedIds.includes(t.id)).length;
                                const isOpen    = expandedCat === cat;
                                const allSigned = catSigned === items.length && items.length > 0;
                                return (
                                    <div key={cat} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                        {/* Category header */}
                                        <button type="button"
                                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                                            onClick={() => setExpandedCat(isOpen ? null : cat)}>
                                            <div className="flex items-center gap-3">
                                                <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${CAT_ICON_BG[cat] ?? 'from-gray-500 to-gray-600'} text-white shadow-sm`}>
                                                    <FileText className="size-4" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-semibold text-foreground">{CAT_LABEL[cat]}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {/* Mini progress dots */}
                                                        <div className="flex gap-0.5">
                                                            {items.map(t => (
                                                                <div key={t.id} className={`size-1.5 rounded-full ${
                                                                    signedIds.includes(t.id)  ? 'bg-emerald-500' :
                                                                    pendingIds.includes(t.id) ? 'bg-amber-400'   : 'bg-muted-foreground/30'
                                                                }`} />
                                                            ))}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">
                                                            {catSigned}/{items.length} маягт
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {allSigned
                                                    ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 className="size-4" /> Бүгд зурсан
                                                    </span>
                                                    : <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${CAT_CHIP[cat]}`}>
                                                        {items.length - catSigned} үлдсэн
                                                    </span>
                                                }
                                                {isOpen
                                                    ? <ChevronUp className="size-4 text-muted-foreground" />
                                                    : <ChevronDown className="size-4 text-muted-foreground" />}
                                            </div>
                                        </button>

                                        {/* Template list */}
                                        {isOpen && (
                                            <div className="border-t border-border">
                                                {items.map((t, i) => {
                                                    const signed  = signedIds.includes(t.id);
                                                    const pending = pendingIds.includes(t.id);
                                                    return (
                                                        <div key={t.id}
                                                            className={`flex items-start gap-3 px-5 py-3.5 ${i < items.length - 1 ? 'border-b border-border/60' : ''} ${signed ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>

                                                            {/* Status indicator */}
                                                            <div className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                                                                signed  ? 'bg-emerald-500 text-white' :
                                                                pending ? 'bg-amber-400 text-white'   :
                                                                'border-2 border-muted-foreground/30 bg-background'
                                                            }`}>
                                                                {signed && <svg className="size-2.5" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                                                {pending && <Clock className="size-2.5" />}
                                                            </div>

                                                            {/* Title + meta */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm leading-snug ${signed ? 'text-foreground font-medium' : 'text-foreground'}`}>
                                                                    {t.title}
                                                                </p>
                                                                {(() => {
                                                                    const cf = patient.consent_forms.find(c => c.template_id === t.id && c.patient_signature);
                                                                    if (!cf) return null;
                                                                    return (
                                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                                            {cf.signer_name}
                                                                            {cf.signed_at ? ` · ${new Date(cf.signed_at).toLocaleDateString('mn-MN')}` : ''}
                                                                        </p>
                                                                    );
                                                                })()}
                                                            </div>

                                                            {/* Action / status */}
                                                            <div className="shrink-0 flex items-center gap-2 mt-0.5">
                                                                {signed ? (
                                                                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                                        <CheckCircle2 className="size-3.5" /> Зурсан
                                                                    </span>
                                                                ) : pending ? (
                                                                    <span className="flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400 px-2.5 py-1 text-xs font-semibold">
                                                                        <Clock className="size-3" /> Хүлээж байна
                                                                    </span>
                                                                ) : (
                                                                    <div className="flex items-center gap-1.5">
                                                                        {patient.user_id && (
                                                                            <Link href={`/reception/patients/${patient.id}/request-consent/${t.id}`}
                                                                                method="post" as="button"
                                                                                className="flex items-center gap-1 rounded-lg border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground px-2.5 py-1.5 text-xs font-medium transition-colors">
                                                                                <Send className="size-3" /> Хүсэлт
                                                                            </Link>
                                                                        )}
                                                                        <button onClick={() => openConsent(t)}
                                                                            className="flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 text-xs font-semibold transition-colors shadow-sm">
                                                                            <PenLine className="size-3" /> Зурах
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ══ CONSENT MODAL ══ */}
            {consentModal && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setConsentModal(null)} />
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl ring-1 ring-border overflow-hidden flex flex-col max-h-[95vh]">
                            <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
                                <div className="flex items-start gap-3">
                                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${CAT_ICON_BG[consentModal.category] ?? 'from-gray-500 to-gray-600'} text-white`}>
                                        <FileText className="size-4" />
                                    </div>
                                    <div>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CAT_CHIP[consentModal.category]}`}>
                                            {CAT_LABEL_SHORT[consentModal.category]}
                                        </span>
                                        <h3 className="font-semibold text-foreground text-sm mt-0.5 leading-snug max-w-xs">{consentModal.title}</h3>
                                    </div>
                                </div>
                                <button onClick={() => setConsentModal(null)}
                                    className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-3 shrink-0">
                                    <X className="size-4" />
                                </button>
                            </div>
                            <form onSubmit={submitConsent} className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
                                <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-foreground leading-relaxed max-h-44 overflow-y-auto whitespace-pre-wrap">
                                    {consentModal.content}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-foreground">Гарын үсэг зурагчийн нэр</label>
                                    <input type="text" value={consentSignerName}
                                        onChange={e => setConsentSignerName(e.target.value)}
                                        className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-foreground">
                                            Өвчтний гарын үсэг <span className="text-red-500">*</span>
                                        </label>
                                        <button type="button"
                                            onClick={() => { patSigRef.current?.clear(); setPatHasDrawn(false); }}
                                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                                            <X className="size-3" /> Арилгах
                                        </button>
                                    </div>
                                    <div className={`rounded-xl border-2 border-dashed overflow-hidden transition-colors ${patHasDrawn ? 'border-emerald-400 dark:border-emerald-700' : 'border-border'}`}>
                                        <SignaturePad ref={patSigRef} height={140}
                                            onBegin={() => { setPatHasDrawn(true); setConsentError(''); }} />
                                    </div>
                                    {!patHasDrawn && <p className="text-xs text-muted-foreground text-center">Дээрх хайрцагт гарын үсэг зурна уу</p>}
                                </div>
                                <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 space-y-3">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Насанд хүрээгүй / Асран хамгаалагч (заавал биш)</p>
                                    <input type="text" placeholder="Асран хамгаалагчийн нэр"
                                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                    <div className="rounded-xl border overflow-hidden bg-background">
                                        <SignaturePad ref={guarSigRef} height={100} />
                                    </div>
                                    <button type="button" onClick={() => guarSigRef.current?.clear()}
                                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                                        <X className="size-3" /> Арилгах
                                    </button>
                                </div>
                                {consentError && (
                                    <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                                        <AlertTriangle className="size-4 shrink-0" />{consentError}
                                    </div>
                                )}
                                <button type="submit" disabled={consentProcessing}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 text-sm font-semibold shadow-sm transition-colors">
                                    {consentProcessing
                                        ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        : <CheckCircle2 className="size-4" />}
                                    Зөвшөөрлийг баталгаажуулах
                                </button>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </ReceptionLayout>
    );
}

/* ── Helpers ── */
function MedBadge({ label, color }: { label: string; color: 'red' | 'orange' | 'pink' }) {
    const cls = {
        red:    'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
        orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
        pink:   'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',
    }[color];
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

function Section({ icon, iconBg, title, children }: {
    icon: React.ReactNode; iconBg: string; title: string; children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
                <div className={`flex size-6 items-center justify-center rounded-lg bg-gradient-to-br ${iconBg} text-white`}>{icon}</div>
                <h2 className="font-semibold text-foreground text-sm">{title}</h2>
            </div>
            {children}
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-sm text-foreground">{children}</p>
        </div>
    );
}
