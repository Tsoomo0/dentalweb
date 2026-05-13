import AppLayout from '@/layouts/app-layout';
import { shortDoctorName } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronUp,
    ClipboardList, FileText, Heart, Phone, Pill,
    ShieldAlert, Stethoscope, UserRound, X,
} from 'lucide-react';
import { useState } from 'react';

/* ── Types ── */
interface ServiceItem { name: string; price: number | null }
interface LeasingPlan {
    months: number; paid_months: number; monthly_amount: number; total_amount: number;
}
interface TreatmentRecord {
    id: number; record_date: string | null; services: ServiceItem[];
    doctor_notes: string | null; amount_charged: number | null;
    paid_amount: number | null; payment_status: string | null;
    payment_method: string | null; doctor: { name: string } | null;
    leasing_plan: LeasingPlan | null;
}
interface Appointment {
    id: number; appointment_number: string;
    appointment_date: string | null; appointment_time: string | null;
    status: string; service: string | null; type: string;
    notes: string | null; doctor: { name: string } | null; branch: { name: string } | null;
}
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
    allergy_penicillin: boolean; allergy_aspirin: boolean; allergy_latex: boolean;
    allergy_anesthetic: boolean; had_anesthetic_allergy: boolean; allergy_other: string | null;
    current_medications: string | null; special_ongoing_treatment: string | null;
    had_dental_complications: boolean; dental_complication_detail: string | null;
    previous_surgeries: string | null; previous_dental_treatments: string | null;
    last_checkup: string | null; previous_dental_clinics: string | null;
    [key: string]: boolean | string | null | undefined;
}
interface ConsentForm {
    id: number; template_id: number; signer_name: string;
    signed_at: string | null; patient_signature: string | null;
    guardian_name: string | null; guardian_signature: string | null;
    template: { code: string; title: string; category: string; content: string | null } | null;
}
interface Visit {
    id: number; visit_date: string | null;
    data: Record<string, unknown>;
    doctor: { name: string } | null;
    created_at: string | null;
}
interface Patient {
    id: number; patient_number: string; last_name: string; first_name: string;
    gender: 'male' | 'female' | 'other' | null; date_of_birth: string | null;
    register_number: string | null; phone: string; phone2: string | null;
    email: string | null; address: string | null;
    emergency_contact_name: string | null; emergency_contact_phone: string | null;
    emergency_contact_relation: string | null; notes: string | null; created_at: string;
    branch: { name: string } | null;
    appointments: Appointment[]; treatment_records: TreatmentRecord[];
    medical_history: MedHistory | null; consent_forms: ConsentForm[];
    ortho_visits: Visit[]; general_visits: Visit[];
}
interface Props { patient: Patient }

/* ── Constants ── */
const STATUS_LABEL: Record<string, string> = {
    pending: 'Хүлээгдэж байна', confirmed: 'Баталгаажсан',
    completed: 'Дууссан', cancelled: 'Цуцлагдсан',
};
const STATUS_COLOR: Record<string, string> = {
    pending:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    cancelled: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};
const PAYMENT_COLOR: Record<string, string> = {
    paid: 'bg-emerald-50 text-emerald-700', pending: 'bg-amber-50 text-amber-700',
    partial: 'bg-orange-50 text-orange-700', leasing: 'bg-violet-50 text-violet-700',
    sent: 'bg-blue-50 text-blue-700',
};
const PAYMENT_LABEL: Record<string, string> = {
    paid: 'Төлсөн', pending: 'Хүлээгдэж байна',
    partial: 'Хэсэгчлэн', leasing: 'Лизинг', sent: 'Илгээсэн',
};
const GENDER: Record<string, string> = { male: 'Эрэгтэй', female: 'Эмэгтэй', other: 'Бусад' };
const CAT_LABEL: Record<string, string> = {
    treat: 'Ерөнхий эмчилгээ', endo: 'Сувгийн эмчилгээ', ortho: 'Ортодонт',
    perio: 'Буйлны эмчилгээ', prostho: 'Протез', surg: 'Мэс засал', prevent: 'Урьдчилан сэргийлэх',
};
const CAT_CHIP: Record<string, string> = {
    treat: 'bg-blue-100 text-blue-700', endo: 'bg-purple-100 text-purple-700',
    ortho: 'bg-emerald-100 text-emerald-700', perio: 'bg-yellow-100 text-yellow-700',
    prostho: 'bg-orange-100 text-orange-700', surg: 'bg-red-100 text-red-700',
    prevent: 'bg-teal-100 text-teal-700',
};
const CONDITIONS: { key: string; label: string }[] = [
    { key: 'has_heart_disease',        label: 'Зүрхний өвчин' },
    { key: 'has_diabetes',             label: 'Чихрийн шижин' },
    { key: 'has_hypertension',         label: 'Цусны даралт өндөр' },
    { key: 'has_hepatitis',            label: 'Элэгний өвчин (хепатит)' },
    { key: 'has_bleeding_disorder',    label: 'Цус зогсохгүй байх' },
    { key: 'has_asthma',               label: 'Гуурсан хоолойн багтраа' },
    { key: 'has_epilepsy',             label: 'Тайван бус (эпилепси)' },
    { key: 'has_kidney_disease',       label: 'Бөөрний өвчин' },
    { key: 'has_hiv',                  label: 'ДОХН / ДХБ' },
    { key: 'has_mental_disorder',      label: 'Сэтгэцийн өвчин' },
    { key: 'has_cancer',               label: 'Хорт хавдар' },
    { key: 'is_cancer_treatment',      label: 'Хавдрын эмчилгээнд явж байна' },
    { key: 'has_thyroid_disorder',     label: 'Бамбай булчирхайн өвчин' },
    { key: 'has_anemia',               label: 'Цусны дутагдал' },
    { key: 'takes_blood_thinners',     label: 'Цус шингэлэх эм уудаг' },
    { key: 'has_tuberculosis',         label: 'Сүрьеэ' },
    { key: 'has_infectious_hepatitis', label: 'Халдварт гепатит' },
    { key: 'has_tonsils',              label: 'Тонзилл' },
    { key: 'is_pregnant',              label: 'Жирэмсэн' },
    { key: 'is_nursing',               label: 'Хөхүүл хүүхэдтэй' },
    { key: 'has_womens_condition',     label: 'Эмэгтэйчүүдийн өвчин' },
    { key: 'is_smoker',                label: 'Тамхи татдаг' },
    { key: 'drinks_alcohol',           label: 'Архи хэтрүүлэн хэрэглэдэг' },
];
const ALLERGIES: { key: string; label: string }[] = [
    { key: 'allergy_penicillin',     label: 'Пенициллин' },
    { key: 'allergy_aspirin',        label: 'Аспирин' },
    { key: 'allergy_latex',          label: 'Латекс' },
    { key: 'allergy_anesthetic',     label: 'Мэдээ алдуулагч' },
    { key: 'had_anesthetic_allergy', label: 'Өмнө мэдээ алдуулагчид харшилсан' },
];

/* ── Helpers ── */
function fmtMoney(n: number | null) {
    if (!n) return '—';
    return n.toLocaleString('mn-MN') + '₮';
}
function InfoRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div className="flex gap-2 border-b border-border/50 py-2 last:border-0">
            <span className="w-40 shrink-0 text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-foreground">{value}</span>
        </div>
    );
}
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b pb-3">
                {icon}
                <h3 className="text-sm font-bold">{title}</h3>
            </div>
            {children}
        </div>
    );
}

type Tab = 'info' | 'appointments' | 'records' | 'medical' | 'visits' | 'consent';

export default function AdminPatientShow({ patient: p }: Props) {
    const [tab, setTab]                   = useState<Tab>('info');
    const [consentModal, setConsentModal] = useState<ConsentForm | null>(null);
    const [expandedVisit, setExpandedVisit] = useState<string | null>(null);

    const allVisits = [
        ...p.ortho_visits.map(v => ({ ...v, kind: 'ortho' as const })),
        ...p.general_visits.map(v => ({ ...v, kind: 'general' as const })),
    ].sort((a, b) => (b.visit_date ?? '').localeCompare(a.visit_date ?? ''));

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Админ', href: '/admin/dashboard' },
        { title: 'Өвчтнүүд', href: '/admin/patients' },
        { title: `${p.last_name} ${p.first_name}`, href: `/admin/patients/${p.id}` },
    ];

    const signedCount = p.consent_forms.filter(cf => cf.patient_signature).length;
    const hasMedWarnings = p.medical_history && (
        p.medical_history.has_heart_disease || p.medical_history.has_diabetes ||
        p.medical_history.has_hypertension  || p.medical_history.has_hepatitis ||
        p.medical_history.has_bleeding_disorder || p.medical_history.is_pregnant ||
        p.medical_history.allergy_penicillin || p.medical_history.allergy_aspirin ||
        p.medical_history.allergy_anesthetic
    );

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: 'info',         label: 'Мэдээлэл' },
        { key: 'appointments', label: 'Захиалга',                    count: p.appointments.length },
        { key: 'records',      label: 'Эмчилгээ төлбөрийн түүх',    count: p.treatment_records.length },
        { key: 'medical',      label: 'Эмнэлгийн карт' },
        { key: 'visits',       label: 'Үзлэгийн явц',               count: allVisits.length },
        { key: 'consent',      label: 'Таниулсан зөвшөөрлийн хуудас', count: signedCount },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${p.last_name} ${p.first_name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.visit('/admin/patients')}
                            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <ChevronLeft className="size-4" /> Буцах
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary ring-2 ring-background shadow">
                                {(p.last_name?.[0] ?? '') + (p.first_name?.[0] ?? '')}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">{p.last_name} {p.first_name}</h1>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                    <span className="font-mono">{p.patient_number}</span>
                                    {p.branch && <><span>·</span><span>{p.branch.name}</span></>}
                                    {p.gender && <><span>·</span><span>{GENDER[p.gender]}</span></>}
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                                    <Phone className="size-3.5" /> {p.phone}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl border bg-card p-3 text-center shadow-sm">
                            <div className="text-2xl font-bold text-blue-600">{p.appointments.length}</div>
                            <div className="text-xs text-muted-foreground">Захиалга</div>
                        </div>
                        <div className="rounded-xl border bg-card p-3 text-center shadow-sm">
                            <div className="text-2xl font-bold text-emerald-600">{p.treatment_records.length}</div>
                            <div className="text-xs text-muted-foreground">Эмчилгээ</div>
                        </div>
                    </div>
                </div>

                {/* Medical warning */}
                {hasMedWarnings && (
                    <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 px-4 py-3 flex items-start gap-3">
                        <ShieldAlert className="size-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-red-700 mb-1.5 uppercase tracking-wide">Эрүүл мэндийн анхааруулга</p>
                            <div className="flex flex-wrap gap-1.5">
                                {p.medical_history!.has_heart_disease    && <MedBadge label="Зүрхний өвчин" color="red" />}
                                {p.medical_history!.has_diabetes          && <MedBadge label="Чихрийн шижин" color="red" />}
                                {p.medical_history!.has_hypertension      && <MedBadge label="Цусны даралт" color="red" />}
                                {p.medical_history!.has_hepatitis         && <MedBadge label="Элэгний өвчин" color="red" />}
                                {p.medical_history!.has_bleeding_disorder && <MedBadge label="Цус зогсохгүй" color="red" />}
                                {p.medical_history!.is_pregnant           && <MedBadge label="Жирэмсэн" color="pink" />}
                                {p.medical_history!.allergy_penicillin    && <MedBadge label="Пенициллин харшил" color="orange" />}
                                {p.medical_history!.allergy_aspirin       && <MedBadge label="Аспирин харшил" color="orange" />}
                                {p.medical_history!.allergy_anesthetic    && <MedBadge label="Мэдээ алдуулагч харшил" color="orange" />}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex flex-wrap rounded-xl border bg-muted/50 p-1 gap-1">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                                tab === t.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}>
                            {t.label}
                            {t.count !== undefined && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none min-w-[18px] text-center ${
                                    tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                }`}>{t.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── INFO TAB ── */}
                {tab === 'info' && (
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border bg-card p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2 border-b pb-3">
                                <UserRound className="size-4 text-primary" />
                                <h3 className="text-sm font-bold">Үндсэн мэдээлэл</h3>
                            </div>
                            <InfoRow label="Бүртгэлийн дугаар" value={p.patient_number} />
                            <InfoRow label="Хүйс" value={p.gender ? GENDER[p.gender] : null} />
                            <InfoRow label="Төрсөн өдөр" value={p.date_of_birth} />
                            <InfoRow label="Регистрийн дугаар" value={p.register_number} />
                            <InfoRow label="Утас" value={p.phone} />
                            <InfoRow label="Нэмэлт утас" value={p.phone2} />
                            <InfoRow label="Имэйл" value={p.email} />
                            <InfoRow label="Хаяг" value={p.address} />
                            <InfoRow label="Салбар" value={p.branch?.name} />
                        </div>
                        <div className="space-y-4">
                            {(p.emergency_contact_name || p.emergency_contact_phone) && (
                                <div className="rounded-xl border bg-card p-5 shadow-sm">
                                    <h3 className="mb-3 text-sm font-bold border-b pb-2">Яаралтай холбоо барих</h3>
                                    <InfoRow label="Нэр" value={p.emergency_contact_name} />
                                    <InfoRow label="Утас" value={p.emergency_contact_phone} />
                                    <InfoRow label="Хамаарал" value={p.emergency_contact_relation} />
                                </div>
                            )}
                            {p.notes && (
                                <div className="rounded-xl border bg-card p-5 shadow-sm">
                                    <h3 className="mb-2 text-sm font-bold">Тэмдэглэл</h3>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── APPOINTMENTS TAB ── */}
                {tab === 'appointments' && (
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 border-b px-5 py-4">
                            <CalendarDays className="size-4 text-blue-600" />
                            <h3 className="text-sm font-bold">Цаг захиалгын түүх</h3>
                            <span className="ml-auto rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{p.appointments.length}</span>
                        </div>
                        {p.appointments.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">Захиалга байхгүй</div>
                        ) : (
                            <div className="divide-y divide-border">
                                {p.appointments.map(a => (
                                    <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono text-xs text-muted-foreground">{a.appointment_number}</span>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[a.status] ?? 'bg-muted text-muted-foreground'}`}>
                                                    {STATUS_LABEL[a.status] ?? a.status}
                                                </span>
                                            </div>
                                            <div className="mt-0.5 text-sm font-medium">
                                                {a.appointment_date}
                                                {a.appointment_time && <span className="text-muted-foreground ml-1">{a.appointment_time}</span>}
                                            </div>
                                            {a.doctor && <div className="text-xs text-muted-foreground">{shortDoctorName(a.doctor.name)}</div>}
                                            {a.service && <div className="text-xs text-muted-foreground">{a.service}</div>}
                                            {a.branch && <div className="text-xs text-muted-foreground">{a.branch.name}</div>}
                                            {a.notes && <div className="text-xs text-muted-foreground italic">{a.notes}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TREATMENT RECORDS TAB ── */}
                {tab === 'records' && (
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 border-b px-5 py-4">
                            <ClipboardList className="size-4 text-emerald-600" />
                            <h3 className="text-sm font-bold">Эмчилгээ төлбөрийн түүх</h3>
                            <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{p.treatment_records.length}</span>
                        </div>
                        {p.treatment_records.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">Тэмдэглэл байхгүй</div>
                        ) : (
                            <div className="divide-y divide-border">
                                {p.treatment_records.map(r => (
                                    <div key={r.id} className="px-5 py-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-medium">{r.record_date ?? '—'}</span>
                                                    {r.doctor && <span className="text-xs text-muted-foreground">{shortDoctorName(r.doctor.name)}</span>}
                                                    {r.payment_status && (
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PAYMENT_COLOR[r.payment_status] ?? 'bg-muted text-muted-foreground'}`}>
                                                            {PAYMENT_LABEL[r.payment_status] ?? r.payment_status}
                                                        </span>
                                                    )}
                                                </div>
                                                {r.services && r.services.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {r.services.map((s, i) => (
                                                            <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                                                                {s.name}{s.price ? ` — ${s.price.toLocaleString()}₮` : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {r.doctor_notes && (
                                                    <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{r.doctor_notes}</p>
                                                )}
                                            </div>
                                            <div className="text-right text-xs shrink-0">
                                                <div className="font-semibold">{fmtMoney(r.amount_charged)}</div>
                                                {r.payment_status === 'partial' && r.paid_amount != null && (
                                                    <div className="text-muted-foreground">Төлсөн: {fmtMoney(r.paid_amount)}</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Leasing progress */}
                                        {r.payment_status === 'leasing' && r.leasing_plan && (() => {
                                            const lp = r.leasing_plan!;
                                            const pct = Math.round((lp.paid_months / lp.months) * 100);
                                            const rem = lp.months - lp.paid_months;
                                            const done = rem === 0;
                                            return (
                                                <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/60 dark:bg-violet-950/20 dark:border-violet-800 p-3 space-y-2.5">
                                                    <div className="flex items-center justify-between text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                                                        <span>Лизингийн төлөлт</span>
                                                        <span>{pct}%</span>
                                                    </div>
                                                    <div className="relative h-2 rounded-full bg-violet-200 dark:bg-violet-800 overflow-hidden">
                                                        <div
                                                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1.5 text-center">
                                                            <p className="text-[10px] text-emerald-600 font-semibold">Төлсөн сар</p>
                                                            <p className="text-sm font-bold text-emerald-700">{lp.paid_months}<span className="text-[10px] font-normal">/{lp.months}</span></p>
                                                        </div>
                                                        <div className={`flex-1 rounded-lg px-2.5 py-1.5 text-center ${done ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                                            <p className={`text-[10px] font-semibold ${done ? 'text-emerald-600' : 'text-red-500'}`}>Үлдсэн сар</p>
                                                            <p className={`text-sm font-bold ${done ? 'text-emerald-700' : 'text-red-600'}`}>{done ? '✓' : rem}</p>
                                                        </div>
                                                        <div className="flex-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 px-2.5 py-1.5 text-center">
                                                            <p className="text-[10px] text-violet-600 font-semibold">Сарын төлбөр</p>
                                                            <p className="text-[11px] font-bold text-violet-700">{lp.monthly_amount.toLocaleString()}₮</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── MEDICAL HISTORY TAB ── */}
                {tab === 'medical' && (
                    <div className="space-y-4">
                        {!p.medical_history ? (
                            <div className="rounded-xl border bg-card py-16 text-center shadow-sm">
                                <ClipboardList className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                                <p className="font-semibold text-foreground">Эмнэлгийн карт бөглөгдөөгүй</p>
                                <p className="mt-1 text-sm text-muted-foreground">Өвчтний эмнэлгийн карт бөглөсний дараа энд харагдана</p>
                            </div>
                        ) : (
                            <>
                                <Section icon={<Heart className="size-4 text-primary" />} title="Өвчний түүх">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {CONDITIONS.map(({ key, label }) => {
                                            const val = p.medical_history![key] as boolean | undefined;
                                            return (
                                                <div key={key} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                                                    val ? 'bg-red-50 text-red-700' : 'bg-muted/30 text-muted-foreground'
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
                                    {p.medical_history.other_conditions && (
                                        <div className="mt-2 rounded-lg border bg-muted/20 px-3 py-2">
                                            <p className="text-xs text-muted-foreground font-semibold mb-0.5">Бусад өвчин</p>
                                            <p className="text-sm">{p.medical_history.other_conditions}</p>
                                        </div>
                                    )}
                                </Section>

                                <Section icon={<ShieldAlert className="size-4 text-primary" />} title="Харшлын мэдээлэл">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {ALLERGIES.map(({ key, label }) => {
                                            const val = p.medical_history![key] as boolean | undefined;
                                            return (
                                                <div key={key} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                                                    val ? 'bg-orange-50 text-orange-700' : 'bg-muted/30 text-muted-foreground'
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
                                    {p.medical_history.allergy_other && (
                                        <div className="mt-2 rounded-lg border bg-muted/20 px-3 py-2">
                                            <p className="text-xs text-muted-foreground font-semibold mb-0.5">Бусад харшил</p>
                                            <p className="text-sm">{p.medical_history.allergy_other}</p>
                                        </div>
                                    )}
                                </Section>

                                <Section icon={<Pill className="size-4 text-primary" />} title="Эм, эмчилгээний мэдээлэл">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {p.medical_history.current_medications && (
                                            <InfoRow label="Одоо хэрэглэж буй эм" value={p.medical_history.current_medications} />
                                        )}
                                        {p.medical_history.special_ongoing_treatment && (
                                            <InfoRow label="Тусгай эмчилгээ" value={p.medical_history.special_ongoing_treatment} />
                                        )}
                                        {p.medical_history.previous_dental_treatments && (
                                            <InfoRow label="Өмнөх шүдний эмчилгээ" value={p.medical_history.previous_dental_treatments} />
                                        )}
                                        {p.medical_history.previous_surgeries && (
                                            <InfoRow label="Өмнөх мэс засал" value={p.medical_history.previous_surgeries} />
                                        )}
                                        {p.medical_history.last_checkup && (
                                            <InfoRow label="Сүүлд эмчид хэзээ очсон" value={p.medical_history.last_checkup} />
                                        )}
                                        {p.medical_history.previous_dental_clinics && (
                                            <InfoRow label="Өмнө очсон эмнэлгүүд" value={p.medical_history.previous_dental_clinics} />
                                        )}
                                        {p.medical_history.dental_complication_detail && (
                                            <InfoRow label="Эмчилгээний хүндрэл" value={p.medical_history.dental_complication_detail} />
                                        )}
                                    </div>
                                    {!p.medical_history.current_medications &&
                                     !p.medical_history.special_ongoing_treatment &&
                                     !p.medical_history.previous_dental_treatments &&
                                     !p.medical_history.previous_surgeries &&
                                     !p.medical_history.last_checkup &&
                                     !p.medical_history.previous_dental_clinics &&
                                     !p.medical_history.dental_complication_detail && (
                                        <p className="text-sm text-muted-foreground">Мэдээлэл оруулаагүй</p>
                                    )}
                                </Section>
                            </>
                        )}
                    </div>
                )}

                {/* ── VISITS TAB ── */}
                {tab === 'visits' && (
                    <div className="space-y-3">
                        {allVisits.length === 0 ? (
                            <div className="rounded-xl border bg-card py-16 text-center shadow-sm">
                                <Stethoscope className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                                <p className="font-semibold text-foreground">Үзлэгийн бичлэг байхгүй</p>
                                <p className="mt-1 text-sm text-muted-foreground">Эмч үзлэгийн бичлэг оруулсны дараа энд харагдана</p>
                            </div>
                        ) : (
                            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                <div className="flex items-center gap-2 border-b px-5 py-4">
                                    <Stethoscope className="size-4 text-indigo-600" />
                                    <h3 className="text-sm font-bold">Үзлэгийн явц</h3>
                                    <span className="ml-auto rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">{allVisits.length}</span>
                                </div>
                                <div className="divide-y divide-border">
                                    {allVisits.map(v => {
                                        const d = v.data as Record<string, string | boolean | undefined>;
                                        const vkey = `${v.kind}-${v.id}`;
                                        const expanded = expandedVisit === vkey;
                                        const hasSig = !!d.patient_signature;
                                        const isOrtho = v.kind === 'ortho';
                                        const summary = isOrtho
                                            ? (d.notes as string | undefined) || (d.chief_complaint as string | undefined) || ''
                                            : (d.chief_complaint as string | undefined) || (d.diagnosis as string | undefined) || '';
                                        return (
                                            <div key={vkey}>
                                                <button type="button"
                                                    className="w-full flex items-start gap-3 px-5 py-3.5 text-left hover:bg-muted/30 transition-colors"
                                                    onClick={() => setExpandedVisit(expanded ? null : vkey)}>
                                                    <div className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${isOrtho ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        <Stethoscope className="size-3.5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-semibold text-foreground">{v.visit_date ?? '—'}</span>
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isOrtho ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {isOrtho ? 'Ортодонт' : 'Ерөнхий'}
                                                            </span>
                                                            {hasSig && (
                                                                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                                                                    <CheckCircle2 className="size-3" /> Гарын үсэг
                                                                </span>
                                                            )}
                                                        </div>
                                                        {v.doctor && <p className="text-xs text-muted-foreground mt-0.5">Эмч: {shortDoctorName(v.doctor.name)}</p>}
                                                        {summary && <p className="text-xs text-muted-foreground mt-0.5 truncate">{summary}</p>}
                                                    </div>
                                                    {expanded ? <ChevronUp className="size-4 shrink-0 text-muted-foreground mt-0.5" /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground mt-0.5" />}
                                                </button>
                                                {expanded && (
                                                    <div className="px-5 pb-4 pt-1 border-t border-border/40 bg-muted/20 space-y-2.5">
                                                        {[
                                                            { key: 'chief_complaint', label: 'Гомдол' },
                                                            { key: 'diagnosis',       label: 'Оношилгоо' },
                                                            { key: 'tooth_numbers',   label: 'Шүдний дугаар' },
                                                            { key: 'treatment_done',  label: 'Хийгдсэн эмчилгээ' },
                                                            { key: 'materials',       label: 'Материал' },
                                                            { key: 'next_treatment',  label: 'Дараагийн эмчилгээ' },
                                                            { key: 'advice',          label: 'Зөвлөгөө' },
                                                            { key: 'notes',           label: 'Тэмдэглэл' },
                                                        ].filter(f => d[f.key]).map(f => (
                                                            <div key={f.key} className="rounded-lg bg-card border border-border/60 px-3 py-2">
                                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">{f.label}</p>
                                                                <p className="text-sm text-foreground whitespace-pre-wrap">{d[f.key] as string}</p>
                                                            </div>
                                                        ))}
                                                        {hasSig && (
                                                            <div className="rounded-lg bg-card border border-border/60 px-3 py-2">
                                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Гарын үсэг</p>
                                                                <div className="h-14 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden w-fit px-3">
                                                                    <img src={d.patient_signature as string} alt="Гарын үсэг" className="max-h-12 max-w-48 object-contain opacity-85" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── CONSENT FORMS TAB ── */}
                {tab === 'consent' && (
                    <div className="space-y-3">
                        {/* Summary */}
                        <div className="rounded-xl border bg-card px-5 py-4 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold">Зөвшөөрлийн хуудас</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    <span className="font-semibold text-emerald-600">{signedCount}</span> зөвшөөрөл гарын үсэг зурагдсан
                                </p>
                            </div>
                            <div className="text-right">
                                <p className={`text-2xl font-bold tabular-nums ${signedCount > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                    {signedCount}
                                </p>
                                <p className="text-[10px] text-muted-foreground">нийт</p>
                            </div>
                        </div>

                        {p.consent_forms.length === 0 ? (
                            <div className="rounded-xl border bg-card py-16 text-center shadow-sm">
                                <FileText className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                                <p className="font-semibold text-foreground">Зөвшөөрлийн хуудас байхгүй</p>
                                <p className="mt-1 text-sm text-muted-foreground">Өвчтний зөвшөөрлийн маягтууд энд харагдана</p>
                            </div>
                        ) : (
                            <div className="divide-y rounded-xl border bg-card shadow-sm overflow-hidden">
                                {p.consent_forms.map(cf => (
                                    <button
                                        key={cf.id}
                                        type="button"
                                        onClick={() => setConsentModal(cf)}
                                        className={`w-full text-left px-5 py-4 hover:bg-muted/30 transition-colors ${cf.patient_signature ? 'bg-emerald-50/30' : ''}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Status dot */}
                                            <div className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                                                cf.patient_signature ? 'bg-emerald-500 text-white' : 'border-2 border-muted-foreground/30'
                                            }`}>
                                                {cf.patient_signature && (
                                                    <svg className="size-2.5" viewBox="0 0 10 10" fill="none">
                                                        <path d="M2 5l2.5 2.5L8 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                {cf.template && (
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CAT_CHIP[cf.template.category] ?? 'bg-muted text-muted-foreground'}`}>
                                                            {CAT_LABEL[cf.template.category] ?? cf.template.category}
                                                        </span>
                                                        <span className="font-mono text-[10px] text-muted-foreground">{cf.template.code}</span>
                                                    </div>
                                                )}
                                                <p className="text-sm font-medium text-foreground">
                                                    {cf.template?.title ?? `Зөвшөөрөл #${cf.id}`}
                                                </p>
                                                {cf.patient_signature && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {cf.signer_name}
                                                        {cf.signed_at && ` · ${cf.signed_at}`}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Status badge */}
                                            <div className="shrink-0 flex items-center gap-1.5">
                                                {cf.patient_signature ? (
                                                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                                        <CheckCircle2 className="size-3.5" /> Зурсан
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                        Зураагүй
                                                    </span>
                                                )}
                                                <ChevronDown className="size-3.5 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* ── Consent Form Modal ── */}
            {consentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConsentModal(null)} />
                    <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border bg-card shadow-2xl">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 border-b px-6 py-4 shrink-0">
                            <div className="flex-1 min-w-0">
                                {consentModal.template && (
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${CAT_CHIP[consentModal.template.category] ?? 'bg-muted text-muted-foreground'}`}>
                                            {CAT_LABEL[consentModal.template.category] ?? consentModal.template.category}
                                        </span>
                                        <span className="font-mono text-[10px] text-muted-foreground">{consentModal.template.code}</span>
                                    </div>
                                )}
                                <h2 className="text-base font-bold text-foreground leading-tight">
                                    {consentModal.template?.title ?? `Зөвшөөрөл #${consentModal.id}`}
                                </h2>
                                {consentModal.patient_signature && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {consentModal.signer_name}
                                        {consentModal.signed_at && ` · ${consentModal.signed_at}`}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setConsentModal(null)}
                                className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                            {/* Template content */}
                            {consentModal.template?.content && (
                                <div className="rounded-xl border bg-muted/30 px-4 py-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Зөвшөөрлийн агуулга</p>
                                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{consentModal.template.content}</p>
                                </div>
                            )}

                            {/* Signatures */}
                            {consentModal.patient_signature && (
                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Гарын үсэг</p>
                                    <div className="flex flex-wrap gap-4">
                                        <div className="flex-1 min-w-[180px]">
                                            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Өвчтний гарын үсэг</p>
                                            <div className="rounded-xl border bg-white p-3 flex items-center justify-center min-h-[80px]">
                                                <img
                                                    src={consentModal.patient_signature}
                                                    alt="Өвчтний гарын үсэг"
                                                    className="max-h-24 max-w-full object-contain"
                                                />
                                            </div>
                                        </div>
                                        {consentModal.guardian_signature && (
                                            <div className="flex-1 min-w-[180px]">
                                                <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">
                                                    Асран хамгаалагч{consentModal.guardian_name ? ` · ${consentModal.guardian_name}` : ''}
                                                </p>
                                                <div className="rounded-xl border bg-white p-3 flex items-center justify-center min-h-[80px]">
                                                    <img
                                                        src={consentModal.guardian_signature}
                                                        alt="Асран хамгаалагчийн гарын үсэг"
                                                        className="max-h-24 max-w-full object-contain"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!consentModal.patient_signature && (
                                <div className="rounded-xl border bg-muted/20 px-4 py-6 text-center">
                                    <p className="text-sm text-muted-foreground">Гарын үсэг зурагдаагүй байна</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </AppLayout>
    );
}

function MedBadge({ label, color }: { label: string; color: 'red' | 'orange' | 'pink' }) {
    const cls = {
        red:    'bg-red-100 text-red-700',
        orange: 'bg-orange-100 text-orange-700',
        pink:   'bg-pink-100 text-pink-700',
    }[color];
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}
