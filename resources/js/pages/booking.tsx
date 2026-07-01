import { Head, Link, useForm, usePage } from '@inertiajs/react';
import PublicLayout from '@/layouts/public-layout';
import {
    Calendar, CheckCheck, ChevronLeft, ChevronRight, Clock, MessageSquare,
    Phone, Mail, User, Video, CheckCircle2, MapPin, FileText,
    Building2, Stethoscope, X, Sparkles, Sun, Sunset, Sunrise,
} from 'lucide-react';
import { type FormEvent, useMemo, useRef, useState } from 'react';

interface OnlineSlot {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    is_booked: boolean;
}

interface Doctor {
    id: number;
    name: string;
    specialization: string | null;
    branch_id: number | null;
    photo_url: string | null;
    online_slots: OnlineSlot[];
}

interface Branch {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
}

interface Treatment {
    id: number;
    title: string;
}

interface Props {
    doctors: Doctor[];
    branches: Branch[];
    treatments: Treatment[];
    consultation_fee: number;
}

type BookingType = 'online' | 'in_person';

/* Эмчийн нэрийг "А.Цолмон" маягаар — овог зөвхөн эхний үсэг */
function shortName(full: string): string {
    const parts = full.trim().replace(/\./g, ' ').split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0].charAt(0)}.${parts[parts.length - 1]}`;
    return full.trim();
}

const RED = '#c81e3a';

/* glass карт-н нийтлэг хүрээ */
const glassPanel =
    'rounded-[30px] border border-white/70 bg-white/50 shadow-[0_14px_40px_rgba(120,30,50,0.06)] backdrop-blur-xl';

// ── Section card wrapper (glass) ─────────────────────────────────────
function Card({ step, title, icon: Icon, children }: {
    step: number; title: string; icon: React.ElementType; children: React.ReactNode
}) {
    return (
        <div className={`p-6 sm:p-8 ${glassPanel}`}>
            <div className="mb-5 flex items-center gap-3">
                <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-[#c81e3a] font-onest text-[14px] font-extrabold text-white">
                    {step}
                </span>
                <Icon className="h-4 w-4 text-[#c81e3a]" />
                <h2 className="font-onest text-[18px] font-bold text-[#1c1a1b]">{title}</h2>
            </div>
            {children}
        </div>
    );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="mb-1.5 block text-[13px] font-semibold text-[#3a3533]">
            {children}{required && <span className="ml-0.5 text-[#c81e3a]">*</span>}
        </label>
    );
}

const inputCls = "w-full rounded-[10px] border-[1.5px] border-[#ece2e0] bg-white px-4 py-2.5 text-sm text-[#1c1a1b] outline-none transition-all focus:border-[#c81e3a] focus:ring-2 focus:ring-[#c81e3a]/15 placeholder:text-[#b3a7a3]";

const MN_WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
const MN_MONTHS_LONG = [
    '1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар',
    '7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар',
];

function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00');
    return `${d.getFullYear()} оны ${MN_MONTHS_LONG[d.getMonth()]} ${d.getDate()}-ний ${MN_WEEKDAYS[d.getDay()]}`;
}

export default function BookingPage({ doctors, branches, treatments, consultation_fee }: Props) {
    const { flash } = usePage<{ [key: string]: unknown; flash?: { booking_success?: string; inperson_success?: boolean } }>().props;

    const [bookingType,      setBookingType]      = useState<BookingType>('in_person');
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
    const [selectedSlotId,   setSelectedSlotId]   = useState<string>('');

    // ── In-person calendar picker state ─────────────────────────────
    const _today      = new Date();
    const todayDateStr = `${_today.getFullYear()}-${String(_today.getMonth()+1).padStart(2,'0')}-${String(_today.getDate()).padStart(2,'0')}`;
    const [calYear,  setCalYear]  = useState(_today.getFullYear());
    const [calMonth, setCalMonth] = useState(_today.getMonth()); // 0-based

    const MONTHS_MN = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар','7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];
    const DAYS_MN   = ['Дав','Мяг','Лха','Пүр','Баа','Бям','Ням'];

    function calDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
    function calFirstDow(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7; } // Mon=0

    const calCells = useMemo(() => {
        const cells: (string | null)[] = [];
        const offset = calFirstDow(calYear, calMonth);
        const days   = calDaysInMonth(calYear, calMonth);
        for (let i = 0; i < offset; i++) cells.push(null);
        for (let d = 1; d <= days; d++) {
            cells.push(`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
        }
        return cells;
    }, [calYear, calMonth]);

    const TIME_GROUPS = [
        { label: 'Өглөө', icon: Sunrise,  slots: ['09:00','09:30','10:00','10:30','11:00','11:30'] },
        { label: 'Өдөр',  icon: Sun,      slots: ['12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30'] },
        { label: 'Орой',  icon: Sunset,   slots: ['16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'] },
    ];

    // ── Patient autofill ─────────────────────────────────────────────
    const [foundPatient, setFoundPatient] = useState<{ name: string; email: string; last_name?: string; first_name?: string } | null>(null);
    const phoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    function lookupPhone(phone: string) {
        setFoundPatient(null);
        if (phoneTimer.current) clearTimeout(phoneTimer.current);
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 8) return;
        phoneTimer.current = setTimeout(async () => {
            try {
                const r = await fetch(`/booking/patient-lookup?phone=${encodeURIComponent(phone)}`);
                if (r.ok) {
                    const p = await r.json();
                    if (p.name) setFoundPatient(p);
                }
            } catch {}
        }, 500);
    }

    function applyFoundPatient(form: 'online' | 'ip') {
        if (!foundPatient) return;
        const last  = foundPatient.last_name  ?? foundPatient.name.split(' ')[0] ?? '';
        const first = foundPatient.first_name ?? foundPatient.name.split(' ').slice(1).join(' ');
        if (form === 'online') {
            setData(prev => ({
                ...prev,
                patient_last_name:  last,
                patient_first_name: first,
                patient_name:       foundPatient.name,
                patient_email:      foundPatient.email || prev.patient_email,
            }));
        } else {
            setIpData(prev => ({
                ...prev,
                patient_last_name:  last,
                patient_first_name: first,
                patient_name:       foundPatient.name,
                patient_email:      foundPatient.email || prev.patient_email,
            }));
        }
        setFoundPatient(null);
    }

    // ── Online form ──────────────────────────────────────────────────
    const { data, setData, post, processing, errors, reset } = useForm<{
        booking_type: BookingType;
        branch_id: string;
        patient_last_name: string; patient_first_name: string;
        patient_name: string; patient_phone: string; patient_email: string;
        doctor_id: string; online_slot_id: string;
        appointment_date: string; appointment_time: string; appointment_time_end: string;
        notes: string;
        _hp: string;
    }>({
        booking_type: 'online',
        branch_id: '',
        patient_last_name: '', patient_first_name: '',
        patient_name: '', patient_phone: '', patient_email: '',
        doctor_id: '', online_slot_id: '',
        appointment_date: '', appointment_time: '', appointment_time_end: '',
        notes: '',
        _hp: '',
    });

    // ── In-person form ───────────────────────────────────────────────
    const { data: ipData, setData: setIpData, post: ipPost, processing: ipProcessing, errors: ipErrors, reset: ipReset } = useForm<{
        booking_type: BookingType;
        branch_id: string; doctor_id: string;
        patient_last_name: string; patient_first_name: string;
        patient_name: string; patient_phone: string; patient_email: string;
        patient_address: string; reason: string; service: string;
        preferred_date: string; preferred_time: string;
        _hp: string;
    }>({
        booking_type: 'in_person',
        branch_id: '', doctor_id: '',
        patient_last_name: '', patient_first_name: '',
        patient_name: '', patient_phone: '', patient_email: '',
        patient_address: '', reason: '', service: '',
        preferred_date: '', preferred_time: '',
        _hp: '',
    });

    // ── Filtered doctors by branch ───────────────────────────────────
    const filteredDoctors = useMemo(() => {
        const result = bookingType === 'online'
            ? doctors.filter(d => d.online_slots.length > 0)
            : doctors;
        if (!selectedBranchId) return result;
        return result.filter(d => String(d.branch_id) === selectedBranchId);
    }, [doctors, selectedBranchId, bookingType]);

    const selectedDoctor = useMemo(
        () => doctors.find(d => String(d.id) === selectedDoctorId) ?? null,
        [doctors, selectedDoctorId]
    );

    const selectedBranch = useMemo(
        () => branches.find(b => String(b.id) === selectedBranchId) ?? null,
        [branches, selectedBranchId]
    );

    const slotsByDate = useMemo(() => {
        if (!selectedDoctor) return {};
        return selectedDoctor.online_slots.reduce<Record<string, OnlineSlot[]>>((acc, s) => {
            (acc[s.date] ??= []).push(s);
            return acc;
        }, {});
    }, [selectedDoctor]);

    const sortedDates = useMemo(
        () => Object.keys(slotsByDate).sort(),
        [slotsByDate]
    );

    function switchType(t: BookingType) {
        setBookingType(t);
        setData('booking_type', t);
        setIpData('booking_type', t);
        setFoundPatient(null);
    }

    function selectBranch(id: string) {
        const newId = selectedBranchId === id ? '' : id;
        setSelectedBranchId(newId);
        setData(prev => ({ ...prev, branch_id: newId, doctor_id: '', online_slot_id: '', appointment_date: '', appointment_time: '', appointment_time_end: '' }));
        setSelectedDoctorId('');
        setSelectedSlotId('');
    }

    function selectDoctor(id: string) {
        setSelectedDoctorId(id);
        setSelectedSlotId('');
        setData(prev => ({ ...prev, doctor_id: id, online_slot_id: '', appointment_date: '', appointment_time: '', appointment_time_end: '' }));
    }

    function selectSlot(slot: OnlineSlot) {
        setSelectedSlotId(slot.id);
        setData(prev => ({
            ...prev,
            online_slot_id: slot.id,
            appointment_date: slot.date,
            appointment_time: slot.start_time,
            appointment_time_end: slot.end_time,
        }));
    }

    function submitOnline(e: FormEvent) {
        e.preventDefault();
        post('/booking', {
            onSuccess: () => {
                reset();
                setSelectedBranchId('');
                setSelectedDoctorId('');
                setSelectedSlotId('');
            }
        });
    }

    function submitInPerson(e: FormEvent) {
        e.preventDefault();
        ipPost('/booking', {
            onSuccess: () => { ipReset(); setFoundPatient(null); },
        });
    }

    const onlineSteps  = ['Салбар сонгох', 'Эмч сонгох', 'Цаг сонгох', 'Мэдээлэл'];
    const inPersonSteps = ['Салбар сонгох', 'Мэдээлэл оруулах', 'Үзлэг', 'Хүсэлт илгээх'];

    // ── Autofill hint component ──────────────────────────────────────
    function AutofillHint({ form }: { form: 'online' | 'ip' }) {
        if (!foundPatient) return null;
        return (
            <div className="mt-2 flex items-center gap-2 rounded-[12px] border border-green-200 bg-green-50 px-3 py-2 text-xs">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-green-500"/>
                <span className="flex-1 text-green-700">Та өмнө захиалсан байна — <strong>{foundPatient.name}</strong></span>
                <button type="button" onClick={() => applyFoundPatient(form)}
                    className="rounded-lg bg-green-100 px-2.5 py-1 font-semibold text-green-800 transition-colors hover:bg-green-200">
                    Бөглөх
                </button>
                <button type="button" onClick={() => setFoundPatient(null)}
                    className="text-green-500 hover:text-green-700">
                    <X className="h-3.5 w-3.5"/>
                </button>
            </div>
        );
    }

    return (
        <>
            <Head title="Цаг авах — Кутикул"/>
            <PublicLayout>

                {/* ── HERO ──────────────────────────────────────────── */}
                <div className="relative mt-6 overflow-hidden rounded-[32px] border border-white/70 shadow-[0_18px_50px_rgba(120,30,50,0.14)]">
                    <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 84% 20%, rgba(255,255,255,.2), transparent 48%), linear-gradient(125deg,#d62a48 0%,#b01533 52%,#7d1226 100%)' }} />
                    <div className="absolute right-[-50px] top-[-80px] h-[300px] w-[300px] rounded-full border-[1.5px] border-dashed border-white/20" style={{ animation: 'cuticulSpinSlow 46s linear infinite' }} />
                    <div className="relative z-[3] max-w-[640px] p-8 sm:p-14">
                        <div className="mb-[18px] inline-flex items-center gap-2 rounded-[40px] bg-white/85 px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.05em] text-[#c81e3a]">
                            <Calendar className="h-3.5 w-3.5" /> Цаг авах
                        </div>
                        <h1 className="mb-3 font-onest text-[28px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[36px]">
                            {bookingType === 'online'
                                ? 'Цагаа онлайнаар захиалаарай'
                                : 'Биечлэн ирэх хүсэлтээ үлдээгээрэй'}
                        </h1>
                        <p className="max-w-[520px] text-[16px] leading-[1.65] text-white/90">
                            {bookingType === 'online'
                                ? 'Салбар, эмч, өдөр, цагаа сонгоод мэдээллээ үлдээхэд л болно. Манай ажилтан танд эргэн холбогдож баталгаажуулна.'
                                : 'Хүсэлтээ илгээгээрэй — манай ажилтан тантай холбогдож, тохиромжтой цагийг хамт олох болно.'}
                        </p>
                        {/* steps */}
                        <div className="mt-7 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-white/85">
                            {(bookingType === 'online' ? onlineSteps : inPersonSteps).map((stp, i, arr) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="flex items-center gap-1.5">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-extrabold">{i+1}</span>
                                        {stp}
                                    </span>
                                    {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-white/45"/>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Online success ────────────────────────────────── */}
                {flash?.booking_success && (
                    <div className="mt-7 flex items-start gap-4 rounded-[20px] border border-green-200 bg-green-50/80 p-5 backdrop-blur-md">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-green-100">
                            <CheckCheck className="h-5 w-5 text-green-600"/>
                        </div>
                        <div>
                            <p className="font-onest font-bold text-green-800">Цаг амжилттай захиалагдлаа!</p>
                            <p className="mt-1 text-sm text-green-700">Захиалгын дугаар: <strong>{flash.booking_success}</strong></p>
                            <p className="mt-0.5 text-sm text-green-600">Удахгүй бид тантай холбогдоно — та суугаад л байгаарай.</p>
                        </div>
                    </div>
                )}

                {/* ── In-person success ─────────────────────────────── */}
                {flash?.inperson_success && (
                    <div className="mt-7 flex items-start gap-4 rounded-[20px] border border-green-200 bg-green-50/80 p-5 backdrop-blur-md">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-green-100">
                            <CheckCheck className="h-5 w-5 text-green-600"/>
                        </div>
                        <div>
                            <p className="font-onest font-bold text-green-800">Хүсэлт хүрлээ!</p>
                            <p className="mt-1 text-sm text-green-700">
                                Манай ажилтан тантай удахгүй холбогдож, тохиромжтой цагийг тохиролцоно.
                            </p>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════
                    ONLINE BOOKING FORM
                ═════════════════════════════════════════════ */}
                {bookingType === 'online' && (
                    <form onSubmit={submitOnline} className="mt-7 flex flex-col gap-5">
                        {/* Honeypot — bot trap */}
                        <input name="_hp" type="text" value={data._hp} onChange={e => setData('_hp', e.target.value)}
                            tabIndex={-1} autoComplete="off" aria-hidden="true"
                            style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}/>

                        {/* 1. Салбар сонгох */}
                        <Card step={1} title="Салбараа сонгоно уу" icon={Building2}>
                            {branches.length === 0 ? (
                                <p className="py-4 text-center text-sm text-[#9a918d]">Салбарын мэдээлэл байхгүй байна.</p>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {branches.map(b => {
                                        const isSelected = String(b.id) === selectedBranchId;
                                        const docCount = doctors.filter(d => String(d.branch_id) === String(b.id) && d.online_slots.length > 0).length;
                                        return (
                                            <button key={b.id} type="button"
                                                onClick={() => selectBranch(String(b.id))}
                                                className="flex items-start gap-4 rounded-[18px] border-[1.5px] p-4 text-left transition-all"
                                                style={isSelected
                                                    ? { borderColor: RED, background: '#fbeef0' }
                                                    : { borderColor: '#ece2e0', background: '#fff' }}>
                                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px]" style={{ background: isSelected ? '#f9dbe1' : '#f3eceb' }}>
                                                    <Building2 className="h-5 w-5" style={{ color: isSelected ? RED : '#9a918d' }}/>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-onest text-sm font-bold text-[#1c1a1b]">{b.name}</p>
                                                    {b.address && (
                                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#9a918d]">
                                                            <MapPin className="h-3 w-3 flex-shrink-0"/> {b.address}
                                                        </p>
                                                    )}
                                                    <p className="mt-1 text-xs font-medium" style={{ color: docCount > 0 ? '#1f8a5b' : '#9a918d' }}>
                                                        {docCount > 0 ? `${docCount} эмч` : 'Эмч байхгүй'}
                                                    </p>
                                                </div>
                                                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all"
                                                    style={isSelected ? { borderColor: RED, background: RED } : { borderColor: '#d6cdcb' }}>
                                                    {isSelected && <div className="h-2 w-2 rounded-full bg-white"/>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {selectedBranchId && (
                                <button type="button" onClick={() => selectBranch(selectedBranchId)}
                                    className="mt-3 flex items-center gap-1.5 text-xs text-[#9a918d] transition-colors hover:text-[#c81e3a]">
                                    <X className="h-3 w-3"/> Салбарын сонголт арилгах
                                </button>
                            )}
                        </Card>

                        {/* 2. Эмч сонгох — only after branch selected */}
                        {selectedBranchId && (
                            <Card step={2} title="Эмчээ сонгоно уу" icon={User}>
                                {filteredDoctors.length === 0 ? (
                                    <p className="py-4 text-center text-sm text-[#9a918d]">
                                        Энэ салбарт одоогоор онлайн зөвлөгөө өгөх эмч байхгүй байна.
                                    </p>
                                ) : (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {filteredDoctors.map(d => {
                                            const isSelected = String(d.id) === selectedDoctorId;
                                            const availableCount = d.online_slots.length;
                                            return (
                                                <button key={d.id} type="button"
                                                    onClick={() => selectDoctor(String(d.id))}
                                                    className="flex items-center gap-4 rounded-[18px] border-[1.5px] p-4 text-left transition-all"
                                                    style={isSelected
                                                        ? { borderColor: RED, background: '#fbeef0' }
                                                        : { borderColor: '#ece2e0', background: '#fff' }}>
                                                    {d.photo_url ? (
                                                        <img src={d.photo_url} alt={d.name}
                                                            className="h-12 w-12 flex-shrink-0 rounded-full object-cover"/>
                                                    ) : (
                                                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full" style={{ background: '#f9dbe1' }}>
                                                            <span className="font-onest text-sm font-bold text-[#c81e3a]">
                                                                {d.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate font-onest text-sm font-bold text-[#1c1a1b]">{shortName(d.name)}</p>
                                                        {d.specialization && (
                                                            <p className="mt-0.5 truncate text-xs text-[#c81e3a]">{d.specialization}</p>
                                                        )}
                                                        <p className="mt-1 text-xs font-medium" style={{ color: availableCount > 0 ? '#1f8a5b' : '#9a918d' }}>
                                                            {availableCount > 0
                                                                ? `${availableCount} боломжтой цаг`
                                                                : 'Цаг байхгүй байна'}
                                                        </p>
                                                    </div>
                                                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all"
                                                        style={isSelected ? { borderColor: RED, background: RED } : { borderColor: '#d6cdcb' }}>
                                                        {isSelected && <div className="h-2 w-2 rounded-full bg-white"/>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {errors.doctor_id && <p className="mt-2 text-xs text-[#c81e3a]">{errors.doctor_id}</p>}
                            </Card>
                        )}

                        {/* 3. Цаг сонгох */}
                        {selectedDoctor && (
                            <Card step={3} title="Онлайн зөвлөгөөний цаг сонгох" icon={Clock}>
                                {sortedDates.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <Video className="mx-auto mb-3 h-12 w-12 text-[#e1d2d0]"/>
                                        <p className="font-onest font-bold text-[#1c1a1b]">Одоогоор нээлттэй цаг байхгүй байна</p>
                                        <p className="mt-1 text-sm text-[#9a918d]">Энэ эмч удахгүй цаг нэмэх болно. Эсвэл өөр эмчийг сонгоорой.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {sortedDates.map(date => (
                                            <div key={date}>
                                                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#9a918d]">
                                                    <Calendar className="h-3.5 w-3.5 text-[#c81e3a]"/>
                                                    {formatDate(date)}
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {slotsByDate[date].map(slot => {
                                                        const isSel = selectedSlotId === slot.id;
                                                        return (
                                                            <button key={slot.id} type="button"
                                                                onClick={() => selectSlot(slot)}
                                                                className="flex items-center gap-2 rounded-[12px] border-[1.5px] px-4 py-2.5 text-sm font-semibold transition-all"
                                                                style={isSel
                                                                    ? { borderColor: RED, background: RED, color: '#fff' }
                                                                    : { borderColor: '#ece2e0', background: '#fff', color: '#3a3533' }}>
                                                                <Clock className="h-3.5 w-3.5"/>
                                                                {slot.start_time} – {slot.end_time}
                                                                {isSel && <CheckCircle2 className="h-3.5 w-3.5"/>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {errors.online_slot_id && <p className="mt-2 text-xs text-[#c81e3a]">{errors.online_slot_id}</p>}
                            </Card>
                        )}

                        {/* 4. Таны мэдээлэл */}
                        {selectedSlotId && (
                            <Card step={4} title="Таны мэдээлэл" icon={User}>
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <Label required>Утасны дугаар</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b3a7a3]"/>
                                            <input type="tel" value={data.patient_phone}
                                                onChange={e => { setData('patient_phone', e.target.value); lookupPhone(e.target.value); }}
                                                placeholder="+976 9900 0000"
                                                className={inputCls + " pl-9"}/>
                                        </div>
                                        {errors.patient_phone && <p className="mt-1 text-xs text-[#c81e3a]">{errors.patient_phone}</p>}
                                        <AutofillHint form="online"/>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label>Овог</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b3a7a3]"/>
                                                <input type="text" value={data.patient_last_name}
                                                    onChange={e => setData('patient_last_name', e.target.value)}
                                                    placeholder="Болд"
                                                    className={inputCls + " pl-9"}/>
                                            </div>
                                            {errors.patient_last_name && <p className="mt-1 text-xs text-[#c81e3a]">{errors.patient_last_name}</p>}
                                        </div>
                                        <div>
                                            <Label required>Нэр</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b3a7a3]"/>
                                                <input type="text" value={data.patient_first_name}
                                                    onChange={e => setData('patient_first_name', e.target.value)}
                                                    placeholder="Бат"
                                                    className={inputCls + " pl-9"}/>
                                            </div>
                                            {errors.patient_first_name && <p className="mt-1 text-xs text-[#c81e3a]">{errors.patient_first_name}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <Label required>И-мэйл</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b3a7a3]"/>
                                            <input type="email" value={data.patient_email}
                                                onChange={e => setData('patient_email', e.target.value)}
                                                placeholder="example@mail.com"
                                                className={inputCls + " pl-9"}/>
                                        </div>
                                        <p className="mt-1 text-xs text-[#9a918d]">Google Meet линк энэ хаяг руу илгээгдэнэ</p>
                                        {errors.patient_email && <p className="mt-1 text-xs text-[#c81e3a]">{errors.patient_email}</p>}
                                    </div>

                                    <div>
                                        <Label>Нэмэлт мэдээлэл</Label>
                                        <div className="relative">
                                            <MessageSquare className="absolute left-3 top-3.5 h-4 w-4 text-[#b3a7a3]"/>
                                            <textarea value={data.notes}
                                                onChange={e => setData('notes', e.target.value)}
                                                rows={3}
                                                placeholder="Асуулт, хүсэлт эсвэл тайлбар..."
                                                className={inputCls + " resize-none pl-9"}/>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Summary + Submit */}
                        {selectedSlotId && data.appointment_date && (
                            <>
                                <div className="overflow-hidden rounded-[26px] bg-[#1c1a1b]/94 p-6 text-white shadow-[0_18px_50px_rgba(120,30,50,0.18)] sm:p-8">
                                    <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.1em] text-[#f4a9b6]">Захиалгын хураангуй</p>
                                    <div className="grid gap-3 sm:grid-cols-4">
                                        {selectedBranch && (
                                            <div className="flex items-center gap-3 rounded-[14px] bg-white/[0.06] p-3">
                                                <Building2 className="h-4 w-4 flex-shrink-0 text-[#f4a9b6]"/>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] text-[#9a918d]">Салбар</p>
                                                    <p className="truncate font-onest text-sm font-bold text-white">{selectedBranch.name}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 rounded-[14px] bg-white/[0.06] p-3">
                                            <Video className="h-4 w-4 flex-shrink-0 text-[#f4a9b6]"/>
                                            <div>
                                                <p className="text-[11px] text-[#9a918d]">Төрөл</p>
                                                <p className="font-onest text-sm font-bold text-white">💻 Онлайн</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 rounded-[14px] bg-white/[0.06] p-3">
                                            <Clock className="h-4 w-4 flex-shrink-0 text-[#f4a9b6]"/>
                                            <div>
                                                <p className="text-[11px] text-[#9a918d]">Цаг</p>
                                                <p className="font-onest text-sm font-bold text-white">
                                                    {data.appointment_date} {data.appointment_time}
                                                    {data.appointment_time_end && ` – ${data.appointment_time_end}`}
                                                </p>
                                            </div>
                                        </div>
                                        {selectedDoctor && (
                                            <div className="flex items-center gap-3 rounded-[14px] bg-white/[0.06] p-3">
                                                <User className="h-4 w-4 flex-shrink-0 text-[#f4a9b6]"/>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] text-[#9a918d]">Эмч</p>
                                                    <p className="truncate font-onest text-sm font-bold text-white">{shortName(selectedDoctor.name)}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-3 flex items-center gap-3 rounded-[14px] border border-amber-300/30 bg-amber-400/10 px-4 py-3">
                                        <span className="text-lg">💳</span>
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-amber-200">Захиалгын төлбөр</p>
                                            <p className="mt-0.5 text-xs text-amber-100/80">
                                                Цаг захиалсны дараа <strong>{consultation_fee.toLocaleString()} ₮</strong> QPay-аар төлнө үү.
                                                Төлбөр хийгдсэний дараа Google Meet линк и-мэйлээр ирнэ.
                                            </p>
                                        </div>
                                        <span className="whitespace-nowrap font-onest text-sm font-extrabold text-amber-200">{consultation_fee.toLocaleString()} ₮</span>
                                    </div>
                                </div>

                                <button type="submit"
                                    disabled={processing || !data.patient_first_name || !data.patient_phone || !data.patient_email}
                                    className="flex w-full items-center justify-center gap-2.5 rounded-[16px] bg-[#c81e3a] py-4 text-base font-bold text-white shadow-[0_10px_24px_rgba(200,30,58,0.35)] transition-all hover:bg-[#a91730] disabled:cursor-not-allowed disabled:opacity-50">
                                    {processing
                                        ? <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"/> Илгээж байна...</>
                                        : <><Calendar className="h-5 w-5"/> Цаг захиалах — {consultation_fee.toLocaleString()} ₮</>
                                    }
                                </button>
                            </>
                        )}

                    </form>
                )}

                {/* ════════════════════════════════════════════
                    IN-PERSON REQUEST FORM
                ═════════════════════════════════════════════ */}
                {bookingType === 'in_person' && (
                    <form onSubmit={submitInPerson} className="mt-7 flex flex-col gap-5">
                        {/* Honeypot — bot trap */}
                        <input name="_hp" type="text" value={ipData._hp} onChange={e => setIpData('_hp', e.target.value)}
                            tabIndex={-1} autoComplete="off" aria-hidden="true"
                            style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}/>

                        {/* 1. Салбар сонгох */}
                        <Card step={1} title="Салбараа сонгоно уу" icon={Building2}>
                            {branches.length === 0 ? (
                                <p className="py-4 text-center text-sm text-[#9a918d]">Салбарын мэдээлэл байхгүй байна.</p>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {branches.map(b => {
                                        const isSelected = String(b.id) === ipData.branch_id;
                                        return (
                                            <button key={b.id} type="button"
                                                onClick={() => setIpData('branch_id', isSelected ? '' : String(b.id))}
                                                className="flex items-start gap-4 rounded-[18px] border-[1.5px] p-4 text-left transition-all"
                                                style={isSelected
                                                    ? { borderColor: RED, background: '#fbeef0' }
                                                    : { borderColor: '#ece2e0', background: '#fff' }}>
                                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px]" style={{ background: isSelected ? '#f9dbe1' : '#f3eceb' }}>
                                                    <Building2 className="h-5 w-5" style={{ color: isSelected ? RED : '#9a918d' }}/>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-onest text-sm font-bold text-[#1c1a1b]">{b.name}</p>
                                                    {b.address && (
                                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#9a918d]">
                                                            <MapPin className="h-3 w-3 flex-shrink-0"/> {b.address}
                                                        </p>
                                                    )}
                                                    {b.phone && (
                                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#9a918d]">
                                                            <Phone className="h-3 w-3 flex-shrink-0"/> {b.phone}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all"
                                                    style={isSelected ? { borderColor: RED, background: RED } : { borderColor: '#d6cdcb' }}>
                                                    {isSelected && <div className="h-2 w-2 rounded-full bg-white"/>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>

                        {/* 2. Эмч сонгох (optional) */}
                        {ipData.branch_id && (() => {
                            const branchDoctors = doctors.filter(d => String(d.branch_id) === ipData.branch_id);
                            if (branchDoctors.length === 0) return null;
                            return (
                                <Card step={2} title="Эмч сонгох" icon={Stethoscope}>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {branchDoctors.map(d => {
                                            const isSel = String(d.id) === ipData.doctor_id;
                                            return (
                                                <button key={d.id} type="button"
                                                    onClick={() => setIpData('doctor_id', isSel ? '' : String(d.id))}
                                                    className="flex items-center gap-3 rounded-[18px] border-[1.5px] p-3 text-left transition-all"
                                                    style={isSel
                                                        ? { borderColor: RED, background: '#fbeef0' }
                                                        : { borderColor: '#ece2e0', background: '#fff' }}>
                                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-onest text-sm font-bold"
                                                        style={isSel ? { background: '#f9dbe1', color: '#c81e3a' } : { background: '#f3eceb', color: '#6b6360' }}>
                                                        {d.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate font-onest text-sm font-bold text-[#1c1a1b]">{shortName(d.name)}</p>
                                                        {d.specialization && <p className="truncate text-[11px] text-[#c81e3a]">{d.specialization}</p>}
                                                    </div>
                                                    <div className="h-4 w-4 flex-shrink-0 rounded-full border-2"
                                                        style={isSel ? { borderColor: RED, background: RED } : { borderColor: '#d6cdcb' }}>
                                                        {isSel && <div className="flex h-full w-full items-center justify-center rounded-full"><div className="h-1.5 w-1.5 rounded-full bg-white"/></div>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-2 text-xs text-[#9a918d]">✦ Заавал биш — сонгоогүй бол ресепшн тохируулна.</p>
                                </Card>
                            );
                        })()}

                        {/* 3. Таны мэдээлэл — only after branch selected */}
                        {ipData.branch_id && (
                            <Card step={3} title="Таны мэдээлэл" icon={User}>
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <Label required>Утасны дугаар</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b3a7a3]"/>
                                            <input type="tel" value={ipData.patient_phone}
                                                onChange={e => { setIpData('patient_phone', e.target.value); lookupPhone(e.target.value); }}
                                                placeholder="+976 9900 0000"
                                                className={inputCls + " pl-9"}/>
                                        </div>
                                        {ipErrors.patient_phone && <p className="mt-1 text-xs text-[#c81e3a]">{ipErrors.patient_phone}</p>}
                                        <AutofillHint form="ip"/>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label>Овог</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b3a7a3]"/>
                                                <input type="text" value={ipData.patient_last_name}
                                                    onChange={e => setIpData('patient_last_name', e.target.value)}
                                                    placeholder="Болд"
                                                    className={inputCls + " pl-9"}/>
                                            </div>
                                            {ipErrors.patient_last_name && <p className="mt-1 text-xs text-[#c81e3a]">{ipErrors.patient_last_name}</p>}
                                        </div>
                                        <div>
                                            <Label required>Нэр</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b3a7a3]"/>
                                                <input type="text" value={ipData.patient_first_name}
                                                    onChange={e => setIpData('patient_first_name', e.target.value)}
                                                    placeholder="Бат"
                                                    className={inputCls + " pl-9"}/>
                                            </div>
                                            {ipErrors.patient_first_name && <p className="mt-1 text-xs text-[#c81e3a]">{ipErrors.patient_first_name}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <Label>И-мэйл</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b3a7a3]"/>
                                            <input type="email" value={ipData.patient_email}
                                                onChange={e => setIpData('patient_email', e.target.value)}
                                                placeholder="example@mail.com"
                                                className={inputCls + " pl-9"}/>
                                        </div>
                                        {ipErrors.patient_email && <p className="mt-1 text-xs text-[#c81e3a]">{ipErrors.patient_email}</p>}
                                    </div>

                                </div>
                            </Card>
                        )}

                        {/* 4. Үзлэгийн мэдээлэл — only after branch + patient info entered */}
                        {ipData.branch_id && (
                            <Card step={4} title="Үзлэгийн мэдээлэл" icon={Stethoscope}>
                                <div className="flex flex-col gap-4">

                                    <div>
                                        <Label>Үзүүлэх шалтгаан</Label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-3.5 h-4 w-4 text-[#b3a7a3]"/>
                                            <textarea value={ipData.reason}
                                                onChange={e => setIpData('reason', e.target.value)}
                                                rows={3}
                                                placeholder="Ямар шалтгаанаар ирэх гэж байгаагаа товч тайлбарлана уу..."
                                                className={inputCls + " resize-none pl-9"}/>
                                        </div>
                                    </div>

                                    {/* ── Custom calendar date picker ── */}
                                    <div>
                                        <Label>Боломжтой өдөр</Label>
                                        <div className="overflow-hidden rounded-[18px] border border-[#ece2e0] bg-white">
                                            {/* Month nav */}
                                            <div className="flex items-center justify-between border-b border-[#f3ebea] px-4 py-3" style={{ background: 'linear-gradient(90deg,#fbeef0,#fdf4f5)' }}>
                                                <button type="button"
                                                    disabled={calYear === _today.getFullYear() && calMonth === _today.getMonth()}
                                                    onClick={() => calMonth === 0 ? (setCalMonth(11), setCalYear(y => y-1)) : setCalMonth(m => m-1)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/80 disabled:opacity-30">
                                                    <ChevronLeft className="h-4 w-4 text-[#6b6360]"/>
                                                </button>
                                                <div className="text-center">
                                                    <p className="font-onest text-sm font-bold text-[#1c1a1b]">{calYear} оны {MONTHS_MN[calMonth]}</p>
                                                    {ipData.preferred_date && (
                                                        <p className="mt-0.5 text-[11px] font-semibold text-[#c81e3a]">
                                                            {(() => { const d = new Date(ipData.preferred_date + 'T00:00'); return `${MN_MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${MN_WEEKDAYS[d.getDay()]}`; })()} сонгогдсон
                                                        </p>
                                                    )}
                                                </div>
                                                <button type="button"
                                                    onClick={() => calMonth === 11 ? (setCalMonth(0), setCalYear(y => y+1)) : setCalMonth(m => m+1)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/80">
                                                    <ChevronRight className="h-4 w-4 text-[#6b6360]"/>
                                                </button>
                                            </div>
                                            {/* Day headers */}
                                            <div className="grid grid-cols-7 px-3 pt-3">
                                                {DAYS_MN.map(d => (
                                                    <div key={d} className="pb-2 text-center text-[10px] font-bold text-[#9a918d]">{d[0]}</div>
                                                ))}
                                            </div>
                                            {/* Date cells */}
                                            <div className="grid grid-cols-7 gap-1 px-3 pb-3">
                                                {calCells.map((ds, idx) => {
                                                    if (!ds) return <div key={idx}/>;
                                                    const isToday = ds === todayDateStr;
                                                    const isPast  = ds < todayDateStr;
                                                    const isSel   = ds === ipData.preferred_date;
                                                    const dayNum  = Number(ds.split('-')[2]);
                                                    const dow     = (new Date(ds + 'T00:00').getDay() + 6) % 7; // Mon=0
                                                    const isWeekend = dow >= 5;
                                                    return (
                                                        <button key={ds} type="button"
                                                            disabled={isPast}
                                                            onClick={() => { setIpData('preferred_date', ds); setIpData('preferred_time', ''); }}
                                                            className="relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-all"
                                                            style={
                                                                isSel   ? { background: RED, color: '#fff', boxShadow: '0 6px 14px rgba(200,30,58,.32)', transform: 'scale(1.1)' } :
                                                                isPast  ? { color: '#d8cfcc', cursor: 'not-allowed' } :
                                                                isToday ? { color: RED, boxShadow: `inset 0 0 0 2px ${RED}`, fontWeight: 700 } :
                                                                isWeekend ? { color: '#e08593' } :
                                                                { color: '#3a3533' }
                                                            }>
                                                            {dayNum}
                                                            {isToday && !isSel && (
                                                                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#c81e3a]"/>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Time slot picker (shows after date selected) ── */}
                                    {ipData.preferred_date && (
                                        <div>
                                            <Label>Боломжтой цаг</Label>
                                            <div className="divide-y divide-[#f3ebea] overflow-hidden rounded-[18px] border border-[#ece2e0] bg-white">
                                                {TIME_GROUPS.map(({ label, icon: TIcon, slots }) => (
                                                    <div key={label} className="px-4 py-3">
                                                        <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#9a918d]">
                                                            <TIcon className="h-3.5 w-3.5 text-[#c81e3a]"/> {label}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {slots.map(t => {
                                                                const isSel = ipData.preferred_time === t;
                                                                return (
                                                                    <button key={t} type="button"
                                                                        onClick={() => setIpData('preferred_time', isSel ? '' : t)}
                                                                        className="flex items-center gap-1.5 rounded-[10px] border-[1.5px] px-3.5 py-2 text-xs font-bold transition-all"
                                                                        style={isSel
                                                                            ? { borderColor: RED, background: RED, color: '#fff' }
                                                                            : { borderColor: '#ece2e0', background: '#fff', color: '#6b6360' }}>
                                                                        <Clock className="h-3 w-3" style={{ color: isSel ? '#fff' : '#b3a7a3' }}/>
                                                                        {t}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {ipData.preferred_time && (
                                                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-[#c81e3a]">
                                                    <CheckCircle2 className="h-3 w-3"/> {ipData.preferred_date} · {ipData.preferred_time} сонгогдсон
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <p className="text-xs text-[#9a918d]">
                                        ✦ Хүссэн цаг заавал биш — манай ажилтан тантай тохиролцох болно.
                                    </p>
                                </div>
                            </Card>
                        )}

                        {ipData.branch_id && (
                            <button type="submit"
                                disabled={ipProcessing || !ipData.patient_first_name || !ipData.patient_phone}
                                className="flex w-full items-center justify-center gap-2.5 rounded-[16px] bg-[#c81e3a] py-4 text-base font-bold text-white shadow-[0_10px_24px_rgba(200,30,58,0.35)] transition-all hover:bg-[#a91730] disabled:cursor-not-allowed disabled:opacity-50">
                                {ipProcessing
                                    ? <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"/> Илгээж байна...</>
                                    : <><CheckCircle2 className="h-5 w-5"/> Хүсэлт илгээх</>
                                }
                            </button>
                        )}

                    </form>
                )}

            </PublicLayout>
        </>
    );
}
