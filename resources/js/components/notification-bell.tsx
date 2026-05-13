import { shortDoctorName } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertTriangle, Bell, BookOpen, BriefcaseBusiness, CalendarClock,
    CalendarDays, CheckCheck, CheckCircle2, DollarSign, MessageSquare,
    Package, RotateCcw, ShieldAlert, Smile, Stethoscope, Trash2,
    Umbrella, X, XCircle,
} from 'lucide-react';
import { usePage } from '@inertiajs/react';
import axios from 'axios';

/* ── Types ────────────────────────────────────────────────────────────── */
interface NotifData {
    branch_name?: string; date?: string; receptionist_name?: string;
    sheet_id?: number; entry_count?: number; total_amount?: number;
    patient_name?: string; amount?: number;
    appointment_number?: string; patient_phone?: string;
    appointment_type?: string; appointment_date?: string;
    appointment_time?: string; doctor_name?: string;
    applicant_name?: string; phone?: string; email?: string;
    position?: string; submitted_at?: string;
    employee_name?: string; employee_number?: string;
    leave_request_id?: number; vacation_request_id?: number;
    start_date?: string; end_date?: string; days?: number;
    leave_type?: string; status?: string; rejection_reason?: string;
    message?: string; run_id?: number; run_title?: string;
    net_hand?: number; bank_salary?: number; url?: string;
    half_label?: string; book_rental_id?: number;
    book_title?: string; book_author?: string;
    equipment_assignment_id?: number; equipment_name?: string;
    equipment_serial?: string; feedback_id?: number;
    feedback_type?: string; type_label?: string; subject?: string;
    status_label?: string; admin_response?: string;
    warning_id?: number; warning_type?: string; severity?: string;
    severity_label?: string; title?: string; action_label?: string;
    incident_date?: string; employee_response?: string;
    // Consent
    template_title?: string; reception_name?: string;
    // Ortho signature
    visit_date?: string;
    signer_name?: string;
    // Treatment
    preferred_date?: string; preferred_time?: string; notes?: string;
}
interface NotifItem {
    id: string; notif_type: string;
    data: NotifData; read_at: string | null; created_at: string;
}
interface NotificationsShared { unread_count: number; items: NotifItem[] }
type Tab = 'all' | 'apt' | 'billing' | 'job' | 'leave' | 'payroll' | 'library' | 'equipment' | 'feedback' | 'warning' | 'consent' | 'treatment';

/* ── Filters ──────────────────────────────────────────────────────────── */
const isApt        = (n: NotifItem) => ['NewAppointment','AppointmentBookedPatient','AppointmentConfirmedPatient','PatientAppointmentRequested'].includes(n.notif_type);
const isBilling    = (n: NotifItem) => n.notif_type === 'DailySheetConfirmed' || n.notif_type === 'OutstandingPaid';
const isJob        = (n: NotifItem) => n.notif_type === 'NewJobApplication';
const isLeave      = (n: NotifItem) => ['LeaveRequestSubmitted','LeaveRequestDecision','VacationRequestSubmitted','VacationRequestDecision'].includes(n.notif_type);
const isPayroll    = (n: NotifItem) => n.notif_type === 'PayrollSlipSent';
const isBonus      = (n: NotifItem) => n.notif_type === 'ReceptionBonusSent';
const isNurseBonus = (n: NotifItem) => n.notif_type === 'NurseBonusSent';
const isLibrary    = (n: NotifItem) => n.notif_type === 'BookRentalSubmitted' || n.notif_type === 'BookRentalDecision';
const isEquipment  = (n: NotifItem) => ['EquipmentAssigned','EquipmentAssignmentResponse','EquipmentReturnedByAdmin'].includes(n.notif_type);
const isFeedback   = (n: NotifItem) => n.notif_type === 'FeedbackSubmitted' || n.notif_type === 'FeedbackResponded';
const isWarning    = (n: NotifItem) => n.notif_type === 'WarningIssued' || n.notif_type === 'WarningAcknowledged';
const isConsent    = (n: NotifItem) => n.notif_type === 'ConsentRequestSent' || n.notif_type === 'ConsentFormSigned' || n.notif_type === 'OrthoSignatureRequested';
const isTreatment  = (n: NotifItem) => n.notif_type === 'TreatmentSentToReception';
const portalOf = () => {
    const p = window.location.pathname;
    if (p.startsWith('/patient/'))   return 'patient';
    if (p.startsWith('/my/'))        return 'my';
    if (p.startsWith('/reception/')) return 'reception';
    if (p.startsWith('/doctor/'))    return 'doctor';
    if (p.startsWith('/hr/'))        return 'hr';
    if (p.startsWith('/admin/'))     return 'admin';
    return 'other';
};
/* ── Tab config ───────────────────────────────────────────────────────── */
const TAB_META: Record<Tab, { label: string; icon: React.ElementType; color: string }> = {
    all:       { label: 'Бүгд',            icon: Bell,              color: '#6b7280' },
    apt:       { label: 'Цаг захиалга',    icon: CalendarClock,     color: '#3b82f6' },
    billing:   { label: 'Тооцоо',          icon: DollarSign,        color: '#eab308' },
    job:       { label: 'Анкет',           icon: BriefcaseBusiness, color: '#8b5cf6' },
    leave:     { label: 'Чөлөө/Амралт',   icon: CalendarDays,      color: '#f97316' },
    payroll:   { label: 'Цалин',           icon: DollarSign,        color: '#10b981' },
    library:   { label: 'Номын сан',       icon: BookOpen,          color: '#7c3aed' },
    equipment: { label: 'Тоног төхөөрөмж', icon: Package,           color: '#0ea5e9' },
    feedback:  { label: 'Санал хүсэлт',   icon: MessageSquare,     color: '#7c3aed' },
    warning:   { label: 'Сануулга',        icon: AlertTriangle,     color: '#ef4444' },
    consent:   { label: 'Зөвшөөрөл',      icon: CheckCircle2,      color: '#10b981' },
    treatment: { label: 'Эмчилгээ',        icon: Stethoscope,       color: '#06b6d4' },
};

/* ── Notif icon + color helper ────────────────────────────────────────── */
function getNotifMeta(n: NotifItem): { icon: React.ElementType; bg: string; fg: string } {
    switch (n.notif_type) {
        case 'DailySheetConfirmed':       return { icon: CheckCircle2,     bg: 'bg-green-100 dark:bg-green-900/30',   fg: 'text-green-600 dark:text-green-400' };
        case 'OutstandingPaid':           return { icon: DollarSign,        bg: 'bg-yellow-100 dark:bg-yellow-900/30', fg: 'text-yellow-600 dark:text-yellow-400' };
        case 'NewJobApplication':         return { icon: BriefcaseBusiness, bg: 'bg-purple-100 dark:bg-purple-900/30', fg: 'text-purple-600 dark:text-purple-400' };
        case 'LeaveRequestSubmitted':     return { icon: CalendarDays,      bg: 'bg-orange-100 dark:bg-orange-900/30', fg: 'text-orange-600 dark:text-orange-400' };
        case 'VacationRequestSubmitted':  return { icon: Umbrella,          bg: 'bg-sky-100 dark:bg-sky-900/30',       fg: 'text-sky-600 dark:text-sky-400' };
        case 'LeaveRequestDecision':
        case 'VacationRequestDecision':
            return n.data.status === 'approved'
                ? { icon: CheckCircle2, bg: 'bg-green-100 dark:bg-green-900/30', fg: 'text-green-600 dark:text-green-400' }
                : { icon: XCircle,     bg: 'bg-red-100 dark:bg-red-900/30',     fg: 'text-red-600 dark:text-red-400' };
        case 'PayrollSlipSent':           return { icon: DollarSign,   bg: 'bg-emerald-100 dark:bg-emerald-900/30', fg: 'text-emerald-600 dark:text-emerald-400' };
        case 'ReceptionBonusSent':        return { icon: Smile,         bg: 'bg-violet-100 dark:bg-violet-900/30',  fg: 'text-violet-600 dark:text-violet-400' };
        case 'NurseBonusSent':            return { icon: Stethoscope,   bg: 'bg-cyan-100 dark:bg-cyan-900/30',      fg: 'text-cyan-600 dark:text-cyan-400' };
        case 'BookRentalSubmitted':       return { icon: BookOpen,      bg: 'bg-violet-100 dark:bg-violet-900/30',  fg: 'text-violet-600 dark:text-violet-400' };
        case 'BookRentalDecision':
            return n.data.status === 'approved'
                ? { icon: BookOpen, bg: 'bg-green-100 dark:bg-green-900/30', fg: 'text-green-600 dark:text-green-400' }
                : { icon: BookOpen, bg: 'bg-red-100 dark:bg-red-900/30',    fg: 'text-red-600 dark:text-red-400' };
        case 'EquipmentAssigned':         return { icon: Package,    bg: 'bg-blue-100 dark:bg-blue-900/30',   fg: 'text-blue-600 dark:text-blue-400' };
        case 'EquipmentReturnedByAdmin':  return { icon: RotateCcw,  bg: 'bg-amber-100 dark:bg-amber-900/30', fg: 'text-amber-600 dark:text-amber-400' };
        case 'EquipmentAssignmentResponse':
            return n.data.status === 'accepted'
                ? { icon: CheckCircle2, bg: 'bg-green-100 dark:bg-green-900/30', fg: 'text-green-600 dark:text-green-400' }
                : { icon: XCircle,     bg: 'bg-red-100 dark:bg-red-900/30',     fg: 'text-red-600 dark:text-red-400' };
        case 'FeedbackSubmitted':
        case 'FeedbackResponded':         return { icon: MessageSquare, bg: 'bg-violet-100 dark:bg-violet-900/30', fg: 'text-violet-600 dark:text-violet-400' };
        case 'WarningIssued':
            return n.data.warning_type === 'violation'
                ? { icon: ShieldAlert,   bg: 'bg-red-100 dark:bg-red-900/30',     fg: 'text-red-600 dark:text-red-400' }
                : { icon: AlertTriangle, bg: 'bg-yellow-100 dark:bg-yellow-900/30', fg: 'text-yellow-600 dark:text-yellow-400' };
        case 'WarningAcknowledged':            return { icon: CheckCircle2,     bg: 'bg-emerald-100 dark:bg-emerald-900/30', fg: 'text-emerald-600 dark:text-emerald-400' };
        case 'OrthoSignatureRequested':         return { icon: Smile,        bg: 'bg-violet-100 dark:bg-violet-900/30',  fg: 'text-violet-600 dark:text-violet-400' };
        case 'OrthoVisitSigned':               return { icon: CheckCircle2, bg: 'bg-violet-100 dark:bg-violet-900/30',  fg: 'text-violet-600 dark:text-violet-400' };
        case 'GeneralVisitSignatureRequested': return { icon: Stethoscope,  bg: 'bg-blue-100 dark:bg-blue-900/30',      fg: 'text-blue-600 dark:text-blue-400' };
        case 'GeneralVisitSigned':             return { icon: CheckCircle2, bg: 'bg-blue-100 dark:bg-blue-900/30',      fg: 'text-blue-600 dark:text-blue-400' };
        case 'ConsentRequestSent':             return { icon: CheckCircle2,     bg: 'bg-emerald-100 dark:bg-emerald-900/30', fg: 'text-emerald-600 dark:text-emerald-400' };
        case 'ConsentFormSigned':              return { icon: CheckCircle2,     bg: 'bg-green-100 dark:bg-green-900/30',    fg: 'text-green-600 dark:text-green-400' };
        case 'TreatmentSentToReception':       return { icon: Stethoscope,      bg: 'bg-cyan-100 dark:bg-cyan-900/30',      fg: 'text-cyan-600 dark:text-cyan-400' };
        case 'AppointmentBookedPatient':       return { icon: CalendarClock,    bg: 'bg-blue-100 dark:bg-blue-900/30',      fg: 'text-blue-600 dark:text-blue-400' };
        case 'AppointmentConfirmedPatient':    return { icon: CheckCircle2,     bg: 'bg-green-100 dark:bg-green-900/30',    fg: 'text-green-600 dark:text-green-400' };
        case 'PatientAppointmentRequested':    return { icon: CalendarClock,    bg: 'bg-indigo-100 dark:bg-indigo-900/30',  fg: 'text-indigo-600 dark:text-indigo-400' };
        default:                               return { icon: CalendarClock,    bg: 'bg-blue-100 dark:bg-blue-900/30',      fg: 'text-blue-600 dark:text-blue-400' };
    }
}

/* ── Notification content renderer ───────────────────────────────────── */
function NotifContent({ n }: { n: NotifItem }) {
    const d = n.data;
    switch (n.notif_type) {
        case 'DailySheetConfirmed':
            return <><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">{d.branch_name} — өдрийн тооцоо баталгаажлаа</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.receptionist_name} · {d.entry_count} бүртгэл · {d.total_amount?.toLocaleString()}₮</p></>;
        case 'OutstandingPaid':
            return <><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Дутуу тооцоо төлөгдлөө — {d.patient_name}</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.receptionist_name} · {d.branch_name} · {d.amount?.toLocaleString()}₮</p></>;
        case 'NewJobApplication':
            return <><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Шинэ ажлын анкет — {d.applicant_name}</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.phone}{d.position ? ` · ${d.position}` : ''}</p></>;
        case 'LeaveRequestSubmitted':
            return <><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Чөлөөний хүсэлт — {d.employee_name}</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.start_date} → {d.end_date} · {d.days} өдөр</p></>;
        case 'LeaveRequestDecision':
            return <><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">{d.status === 'approved' ? 'Чөлөө зөвшөөрөгдлөө' : 'Чөлөө татгалзагдлаа'}</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.start_date} → {d.end_date}{d.rejection_reason ? ` · ${d.rejection_reason}` : ''}</p></>;
        case 'VacationRequestSubmitted':
            return <><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Ээлжийн амралт — {d.employee_name}</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.start_date} → {d.end_date} · {d.days} өдөр</p></>;
        case 'VacationRequestDecision':
            return <><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">{d.status === 'approved' ? 'Ээлжийн амралт зөвшөөрөгдлөө' : 'Ээлжийн амралт татгалзагдлаа'}</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.start_date} → {d.end_date}{d.rejection_reason ? ` · ${d.rejection_reason}` : ''}</p></>;
        case 'PayrollSlipSent':
            return <a href="/my/payroll" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Цалингийн задаргаа ирлээ</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.run_title}</p>{(d.net_hand || d.bank_salary) && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-semibold">{d.net_hand ? `Гарт: ${d.net_hand.toLocaleString()}₮` : ''}{d.net_hand && d.bank_salary ? ' · ' : ''}{d.bank_salary ? `Банк: ${d.bank_salary.toLocaleString()}₮` : ''}</p>}</a>;
        case 'ReceptionBonusSent':
            return <a href="/my/reception-bonus" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Урамшуулал ирлээ</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.run_title}</p>{d.total_amount ? <p className="text-[11px] text-violet-600 dark:text-violet-400 mt-0.5 font-semibold">Нийт: {d.total_amount.toLocaleString()}₮</p> : null}</a>;
        case 'NurseBonusSent':
            return <a href="/my/nurse-bonus" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Сувилагчийн урамшуулал ирлээ</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.run_title}</p>{d.total_amount ? <p className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-0.5 font-semibold">Нийт: {d.total_amount.toLocaleString()}₮</p> : null}</a>;
        case 'BookRentalSubmitted':
            return <a href="/hr/book-rentals" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Номын түрээс — {d.employee_name}</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.book_title}</p></a>;
        case 'BookRentalDecision':
            return <a href="/my/book-rentals" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">{d.status === 'approved' ? 'Номын түрээс зөвшөөрөгдлөө' : 'Номын түрээс татгалзагдлаа'}</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.book_title}</p>{d.rejection_reason ? <p className="text-[11px] text-red-500 mt-0.5">{d.rejection_reason}</p> : null}</a>;
        case 'EquipmentAssigned':
            return <a href="/my/equipment" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Тоног төхөөрөмж хүлээн авах хүсэлт</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.equipment_name}{d.equipment_serial ? ` · ${d.equipment_serial}` : ''}</p></a>;
        case 'EquipmentReturnedByAdmin':
            return <a href="/my/equipment" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Тоног төхөөрөмж буцааж авагдлаа</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.equipment_name}{d.equipment_serial ? ` · ${d.equipment_serial}` : ''}</p></a>;
        case 'EquipmentAssignmentResponse':
            return <a href="/hr/equipment" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">{d.status === 'accepted' ? `${d.employee_name} тоног хүлээн авлаа` : `${d.employee_name} татгалзлаа`}</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.equipment_name}</p>{d.rejection_reason ? <p className="text-[11px] text-red-500 mt-0.5">{d.rejection_reason}</p> : null}</a>;
        case 'FeedbackSubmitted':
            return <a href="/hr/feedback" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">{d.employee_name} — {d.type_label}</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.subject}</p></a>;
        case 'FeedbackResponded':
            return <a href="/my/feedback" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">{d.type_label} хариу ирлээ — {d.status_label}</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.subject}</p>{d.admin_response ? <p className="text-[11px] text-violet-600 dark:text-violet-400 mt-0.5 line-clamp-1">{d.admin_response}</p> : null}</a>;
        case 'WarningIssued':
            return <a href="/my/warnings" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">{d.type_label} — {d.title}</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.severity_label} ноцтой · {d.action_label}</p>{d.incident_date ? <p className="text-[11px] text-muted-foreground mt-0.5">Огноо: {d.incident_date}</p> : null}</a>;
        case 'WarningAcknowledged':
            return <a href="/hr/warnings" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">{d.employee_name} — {d.type_label} хүлээн зөвшөөрлөө</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.title}</p>{d.employee_response ? <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 line-clamp-1">{d.employee_response}</p> : null}</a>;
        case 'OrthoSignatureRequested':
            return <a href="/patient/ortho-signatures" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Гажиг заслын үзлэг — гарын үсэг хүлээгдэж байна</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.doctor_name ? shortDoctorName(d.doctor_name) : ''}{d.visit_date ? ` · ${d.visit_date}` : ''}</p><p className="text-[11px] text-violet-600 dark:text-violet-400 mt-0.5">Портал руу орж гарын үсэг зурна уу →</p></a>;
        case 'GeneralVisitSignatureRequested':
            return <a href="/patient/ortho-signatures" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Ерөнхий эмчилгээний үзлэг — гарын үсэг хүлээгдэж байна</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.doctor_name ? shortDoctorName(d.doctor_name) : ''}{d.visit_date ? ` · ${d.visit_date}` : ''}</p><p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Портал руу орж гарын үсэг зурна уу →</p></a>;
        case 'GeneralVisitSigned':
            return <><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Ерөнхий үзлэг гарын үсгээр баталгаажлаа</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.patient_name}{d.visit_date ? ` · ${d.visit_date}` : ''}</p><p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Зурагч: {(d as any).signer_name}</p></>;
        case 'OrthoVisitSigned':
            return <><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Гажиг заслын үзлэг гарын үсгээр баталгаажлаа</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.patient_name}{d.visit_date ? ` · ${d.visit_date}` : ''}</p><p className="text-[11px] text-violet-600 dark:text-violet-400 mt-0.5">Зурагч: {d.signer_name}</p></>;
        case 'ConsentRequestSent':
            return <a href="/patient/consent-forms" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Зөвшөөрлийн маягт гарын үсэг зурах хүсэлт</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.template_title}</p><p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Портал руу орж гарын үсэг зурна уу</p></a>;
        case 'ConsentFormSigned':
            return <a href="/reception/patients" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">{d.patient_name} — зөвшөөрлийн маягт зуралаа</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.template_title}</p></a>;
        case 'TreatmentSentToReception':
            return <a href="/reception/treatment-payments" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Эмчилгээний тооцоо ирлээ — {d.patient_name}</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.doctor_name ? shortDoctorName(d.doctor_name) : ''}{d.appointment_number ? ` · ${d.appointment_number}` : ''}</p>{d.amount ? <p className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-0.5 font-semibold">{d.amount.toLocaleString()}₮</p> : null}</a>;
        case 'AppointmentBookedPatient':
            return <a href="/patient/appointments" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Цаг захиалга бүртгэгдлээ — {d.appointment_number}</p><p className="text-[11px] text-muted-foreground mt-0.5">{[d.appointment_date, d.appointment_time, d.doctor_name ? shortDoctorName(d.doctor_name) : undefined, d.branch_name].filter(Boolean).join(' · ')}</p></a>;
        case 'AppointmentConfirmedPatient':
            return <a href="/patient/appointments" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Цаг захиалга баталгаажлаа ✓ — {d.appointment_number}</p><p className="text-[11px] text-muted-foreground mt-0.5">{[d.appointment_date, d.appointment_time, d.doctor_name ? shortDoctorName(d.doctor_name) : undefined, d.branch_name].filter(Boolean).join(' · ')}</p></a>;
        case 'PatientAppointmentRequested':
            return <a href="/reception/appointments" className="block"><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Өвчтөний цагийн хүсэлт — {d.patient_name}</p><p className="text-[11px] text-muted-foreground mt-0.5">{d.patient_phone}{d.preferred_date ? ` · ${d.preferred_date}` : ''}{d.preferred_time ? ` ${d.preferred_time}` : ''}</p>{d.notes ? <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{d.notes}</p> : null}</a>;
        default:
            return <><p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">Шинэ цаг захиалга — {d.patient_name}{d.appointment_type === 'online' ? ' (онлайн)' : ' (биечлэн)'}</p><p className="text-[11px] text-muted-foreground mt-0.5">{[d.appointment_number, d.doctor_name ? shortDoctorName(d.doctor_name) : undefined, d.branch_name, d.appointment_date, d.appointment_time].filter(Boolean).join(' · ')}</p></>;
    }
}

/* ── Notification row (shared between sheet & dropdown) ───────────────── */
function NotifRow({ n, onRead }: { n: NotifItem; onRead: (id: string) => void }) {
    const { icon: NIcon, bg, fg } = getNotifMeta(n);
    return (
        <button
            onClick={() => { if (!n.read_at) onRead(n.id); }}
            className={`w-full text-left px-4 py-3.5 flex gap-3 items-start transition-colors
                ${!n.read_at
                    ? 'bg-blue-50/60 dark:bg-blue-950/15 hover:bg-blue-50 dark:hover:bg-blue-950/25'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
        >
            <div className={`mt-0.5 shrink-0 size-9 rounded-2xl ${bg} flex items-center justify-center`}>
                <NIcon className={`size-4 ${fg}`} />
            </div>
            <div className="flex-1 min-w-0">
                <NotifContent n={n} />
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 font-medium">{n.created_at}</p>
            </div>
            {!n.read_at && (
                <div className="mt-2 size-2 rounded-full bg-blue-500 shrink-0 ring-2 ring-white dark:ring-gray-900" />
            )}
        </button>
    );
}

/* ── Main component ───────────────────────────────────────────────────── */
export function NotificationBell({ variant = 'default' }: { variant?: 'default' | 'ghost' }) {
    const page      = usePage<{ notifications?: NotificationsShared; auth: any }>();
    const initial   = page.props.notifications;
    const auth      = page.props.auth as any;
    const sessionKey= auth?.user?.id ?? auth?.doctor?.id ?? null;
    const portal = typeof window !== 'undefined' ? portalOf() : 'other';

    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    /* ── Portal-specific filters ─────────────────────────────────────────── */
    const RECEPTION_TYPES = ['NewAppointment','DailySheetConfirmed','OutstandingPaid','TreatmentSentToReception','ConsentFormSigned','PatientAppointmentRequested'];
    const ADMIN_TYPES     = [...RECEPTION_TYPES,'NewJobApplication','LeaveRequestSubmitted','VacationRequestSubmitted','BookRentalSubmitted','EquipmentAssignmentResponse','FeedbackSubmitted','WarningAcknowledged'];
    const HR_TYPES        = ['NewJobApplication','LeaveRequestSubmitted','VacationRequestSubmitted','BookRentalSubmitted','EquipmentAssignmentResponse','FeedbackSubmitted','WarningAcknowledged'];
    const DOCTOR_TYPES    = ['PayrollSlipSent','ReceptionBonusSent','NurseBonusSent','LeaveRequestDecision','VacationRequestDecision','BookRentalDecision','EquipmentAssigned','FeedbackResponded','WarningIssued','OrthoVisitSigned','GeneralVisitSigned'];
    const PATIENT_TYPES   = ['ConsentRequestSent','AppointmentBookedPatient','AppointmentConfirmedPatient','OrthoSignatureRequested','GeneralVisitSignatureRequested'];
    const MY_TYPES        = ['PayrollSlipSent','ReceptionBonusSent','NurseBonusSent','LeaveRequestDecision','VacationRequestDecision','BookRentalDecision','EquipmentAssigned','FeedbackResponded','WarningIssued'];

    const filterNotifs = (list: NotifItem[]) => {
        const allowed =
            portal === 'patient'   ? PATIENT_TYPES   :
            portal === 'my'        ? MY_TYPES         :
            portal === 'reception' ? RECEPTION_TYPES  :
            portal === 'admin'     ? ADMIN_TYPES      :
            portal === 'hr'        ? HR_TYPES         :
            portal === 'doctor'    ? DOCTOR_TYPES     :
            null;
        return allowed ? list.filter(n => allowed.includes(n.notif_type)) : list;
    };

    const filteredInitial          = filterNotifs(initial?.items ?? []);
    const [items, setItems]        = useState<NotifItem[]>(filteredInitial);
    const [unreadCount, setUnread] = useState(filteredInitial.filter(n => !n.read_at).length);
    const [open, setOpen]          = useState(false);
    const [tab, setTab]            = useState<Tab>('all');
    const ref          = useRef<HTMLDivElement>(null);
    const prevUnread   = useRef(initial?.unread_count ?? 0);
    const isFirstPoll  = useRef(true);

    /* Notification chime — Web Audio API, no file needed */
    const playChime = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const play = (freq: number, t: number, dur: number, vol: number) => {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(vol, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
                osc.start(t);
                osc.stop(t + dur);
            };
            const now = ctx.currentTime;
            play(880,    now,        0.25, 0.25);
            play(1108.7, now + 0.13, 0.35, 0.18);
        } catch { /* silent */ }
    }, []);

    /* Polling */
    const poll = useCallback(async () => {
        try {
            const res = await axios.get<NotificationsShared>(`/notifications?portal=${portal}`);
            const filtered  = filterNotifs(res.data.items);
            const newUnread = filtered.filter(n => !n.read_at).length;
            setItems(filtered);
            setUnread(newUnread);
            if (!isFirstPoll.current && newUnread > prevUnread.current) {
                playChime();
            }
            prevUnread.current  = newUnread;
            isFirstPoll.current = false;
        } catch { /* silent */ }
    }, [portal, playChime]);

    useEffect(() => {
        if (!sessionKey) return;
        poll();
        const t = setInterval(poll, 15_000);
        return () => clearInterval(t);
    }, [sessionKey, poll]);

    /* Click outside (desktop only) */
    useEffect(() => {
        if (isMobile) return;
        const h = (e: MouseEvent) => {
            const inBtn      = ref.current?.contains(e.target as Node);
            const inDropdown = dropdownRef.current?.contains(e.target as Node);
            if (!inBtn && !inDropdown) setOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [isMobile]);

    /* Lock body scroll when mobile sheet open */
    useEffect(() => {
        if (isMobile && open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobile, open]);

    const visibleTabs: Tab[] =
        portal === 'patient'   ? ['all', 'apt'] :
        portal === 'my'        ? ['all', 'leave', 'payroll', 'library', 'equipment', 'feedback', 'warning'] :
        portal === 'reception' ? ['all', 'apt', 'billing', 'treatment', 'consent'] :
        portal === 'admin'     ? ['all', 'apt', 'billing', 'job', 'treatment', 'consent', 'leave', 'library', 'equipment', 'feedback', 'warning'] :
        portal === 'hr'        ? ['all', 'job', 'leave', 'library', 'equipment', 'feedback', 'warning'] :
        portal === 'doctor'    ? ['all', 'leave', 'payroll', 'library', 'equipment', 'feedback', 'warning'] :
        ['all', 'apt', 'billing', 'job', 'treatment', 'consent', 'leave', 'library', 'equipment', 'feedback', 'warning'];

    const filteredItems = useMemo(() => {
        switch (tab) {
            case 'apt':       return items.filter(isApt);
            case 'billing':   return items.filter(isBilling);
            case 'job':       return items.filter(isJob);
            case 'leave':     return items.filter(isLeave);
            case 'payroll':   return items.filter(n => isPayroll(n) || isBonus(n) || isNurseBonus(n));
            case 'library':   return items.filter(isLibrary);
            case 'equipment': return items.filter(isEquipment);
            case 'feedback':  return items.filter(isFeedback);
            case 'warning':   return items.filter(isWarning);
            case 'consent':   return items.filter(isConsent);
            case 'treatment': return items.filter(isTreatment);
            default:          return items;
        }
    }, [items, tab]);

    const tabUnread: Record<Tab, number> = {
        all:       items.filter(n => !n.read_at).length,
        apt:       items.filter(n => isApt(n)        && !n.read_at).length,
        billing:   items.filter(n => isBilling(n)    && !n.read_at).length,
        job:       items.filter(n => isJob(n)         && !n.read_at).length,
        leave:     items.filter(n => isLeave(n)       && !n.read_at).length,
        payroll:   items.filter(n => (isPayroll(n) || isBonus(n) || isNurseBonus(n)) && !n.read_at).length,
        library:   items.filter(n => isLibrary(n)    && !n.read_at).length,
        equipment: items.filter(n => isEquipment(n)  && !n.read_at).length,
        feedback:  items.filter(n => isFeedback(n)   && !n.read_at).length,
        warning:   items.filter(n => isWarning(n)    && !n.read_at).length,
        consent:   items.filter(n => isConsent(n)    && !n.read_at).length,
        treatment: items.filter(n => isTreatment(n)  && !n.read_at).length,
    };

    const markRead = async (id: string) => {
        try {
            await axios.patch(`/notifications/${id}/read`);
            setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
            setUnread(prev => Math.max(0, prev - 1));
        } catch { /* silent */ }
    };
    const markAllRead = async () => {
        try {
            await axios.post('/notifications/read-all');
            setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
            setUnread(0);
        } catch { /* silent */ }
    };
    const clearAll = async () => {
        try {
            await axios.delete('/notifications/clear-all');
            setItems([]); setUnread(0);
        } catch { /* silent */ }
    };

    if (!initial) return null;

    /* ── Bell button ─────────────────────────────────────────────────── */
    const bellBtn = variant === 'ghost' ? (
        <button
            onClick={() => setOpen(o => !o)}
            aria-label="Мэдэгдэл"
            style={{
                width: 38, height: 38, borderRadius: '50%',
                background: open ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', cursor: 'pointer',
                transition: 'background 0.15s',
            }}
        >
            <Bell style={{ width: 17, height: 17, color: 'white', strokeWidth: 2 }} />
            {unreadCount > 0 && (
                <span style={{
                    position: 'absolute', top: -3, right: -3,
                    minWidth: 18, height: 18,
                    background: '#fbbf24', color: '#1c1917',
                    borderRadius: 99, fontSize: 9, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px',
                    border: '2px solid rgba(255,255,255,0.6)',
                    lineHeight: 1,
                }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    ) : (
        <button
            onClick={() => setOpen(o => !o)}
            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Мэдэгдэл"
        >
            <Bell className="size-5 text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </button>
    );

    /* ── Tab bar (shared) ────────────────────────────────────────────── */
    const TabBar = ({ mobile }: { mobile?: boolean }) => (
        <div className={`flex items-center gap-1 px-3 py-2 border-b border-gray-100 dark:border-gray-800 ${mobile ? 'bg-gray-50/80 dark:bg-gray-800/60 overflow-x-auto' : 'bg-gray-50/60 dark:bg-gray-800/40'}`}
            style={{ scrollbarWidth: 'none' }}>
            {visibleTabs.map(t => {
                const meta    = TAB_META[t];
                const Icon    = meta.icon;
                const isActive= tab === t;
                const cnt     = tabUnread[t];
                return (
                    <button key={t} onClick={() => setTab(t)}
                        title={meta.label}
                        style={{ flexShrink: 0 }}
                        className={`relative flex items-center gap-1.5 rounded-xl px-2.5 h-9 transition-all text-[11px] font-semibold whitespace-nowrap
                            ${isActive
                                ? 'bg-white dark:bg-gray-700 shadow-sm ring-1 ring-gray-200 dark:ring-gray-600'
                                : 'hover:bg-white/70 dark:hover:bg-gray-700/50'}`}>
                        <Icon style={{ width: 13, height: 13, color: isActive ? meta.color : undefined }}
                            className={isActive ? '' : 'text-gray-400 dark:text-gray-500'} />
                        {isActive && <span style={{ color: meta.color }}>{meta.label}</span>}
                        {cnt > 0 && (
                            <span className="min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 leading-none">
                                {cnt > 9 ? '9+' : cnt}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );

    /* ── Notification list (shared) ───────────────────────────────────── */
    const NotifList = ({ maxH }: { maxH: string }) => (
        <div className="overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/80" style={{ maxHeight: maxH }}>
            {filteredItems.length === 0 ? (
                <div className="py-14 text-center">
                    <div className="size-14 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                        <Bell className="size-7 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">Мэдэгдэл байхгүй</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">{TAB_META[tab].label} ангиллаар</p>
                </div>
            ) : (
                filteredItems.map(n => <NotifRow key={n.id} n={n} onRead={markRead} />)
            )}
        </div>
    );

    /* ── Header actions (shared) ─────────────────────────────────────── */
    const HeaderActions = () => (
        <div className="flex items-center gap-1">
            {unreadCount > 0 && (
                <button onClick={markAllRead}
                    className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2.5 py-1.5 rounded-lg transition-colors font-semibold">
                    <CheckCheck className="size-3.5" /> Уншсан
                </button>
            )}
            {items.length > 0 && (
                <button onClick={clearAll}
                    className="flex items-center gap-1.5 text-[11px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1.5 rounded-lg transition-colors font-semibold">
                    <Trash2 className="size-3.5" /> Цэвэрлэх
                </button>
            )}
        </div>
    );

    const btnRef      = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const dropdownStyle = useMemo(() => {
        if (!btnRef.current) return {};
        const rect = btnRef.current.getBoundingClientRect();
        return {
            position: 'fixed' as const,
            top: rect.bottom + 8,
            right: window.innerWidth - rect.right,
            zIndex: 9999,
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <div ref={btnRef}>{bellBtn}</div>

            {/* ══════════════════════════════════════════════════════════
                MOBILE BOTTOM SHEET
            ══════════════════════════════════════════════════════════ */}
            {open && isMobile && (
                <div
                    onClick={() => setOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 200,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="bg-white dark:bg-gray-900"
                        style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            borderRadius: '24px 24px 0 0',
                            maxHeight: '88svh',
                            display: 'flex', flexDirection: 'column',
                            boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
                            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                        }}
                    >
                        {/* Handle */}
                        <div style={{ width: 40, height: 4, background: '#d1d1d6', borderRadius: 99, margin: '14px auto 0', flexShrink: 0 }} />

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800" style={{ flexShrink: 0 }}>
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                                    <Bell className="size-4 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">Мэдэгдэл</p>
                                    {unreadCount > 0 && (
                                        <p className="text-[11px] text-red-500 font-semibold leading-tight">{unreadCount} шинэ мэдэгдэл</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <HeaderActions />
                                <button
                                    onClick={() => setOpen(false)}
                                    className="ml-1 w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                                >
                                    <X className="size-4 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* Tab bar */}
                        <div style={{ flexShrink: 0 }}>
                            <TabBar mobile />
                        </div>

                        {/* List */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
                                {filteredItems.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <div className="size-16 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                                            <Bell className="size-8 text-gray-300 dark:text-gray-600" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">Мэдэгдэл байхгүй</p>
                                        <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">{TAB_META[tab].label} ангиллаар</p>
                                    </div>
                                ) : (
                                    filteredItems.map(n => (
                                        <button
                                            key={n.id}
                                            onClick={() => { if (!n.read_at) markRead(n.id); }}
                                            className={`w-full text-left px-5 py-4 flex gap-3.5 items-start transition-colors
                                                ${!n.read_at
                                                    ? 'bg-blue-50/60 dark:bg-blue-950/15 active:bg-blue-100'
                                                    : 'active:bg-gray-50 dark:active:bg-gray-800/50'}`}
                                        >
                                            {(() => {
                                                const { icon: NIcon, bg, fg } = getNotifMeta(n);
                                                return (
                                                    <div className={`mt-0.5 shrink-0 size-10 rounded-2xl ${bg} flex items-center justify-center`}>
                                                        <NIcon className={`size-4.5 ${fg}`} />
                                                    </div>
                                                );
                                            })()}
                                            <div className="flex-1 min-w-0">
                                                <NotifContent n={n} />
                                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 font-medium">{n.created_at}</p>
                                            </div>
                                            {!n.read_at && (
                                                <div className="mt-2.5 size-2.5 rounded-full bg-blue-500 shrink-0 ring-2 ring-white dark:ring-gray-900" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                DESKTOP DROPDOWN
            ══════════════════════════════════════════════════════════ */}
            {open && !isMobile && createPortal(
                <div ref={dropdownRef} style={dropdownStyle} className="w-[400px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                                <Bell className="size-4 text-red-500" />
                            </div>
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Мэдэгдэл</span>
                            {unreadCount > 0 && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 font-semibold">
                                    {unreadCount} шинэ
                                </span>
                            )}
                        </div>
                        <HeaderActions />
                    </div>

                    {/* Tab bar */}
                    <TabBar />

                    {/* List */}
                    <NotifList maxH="440px" />
                </div>,
                document.body
            )}
        </div>
    );
}
