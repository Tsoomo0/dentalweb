import { Head, useForm, usePage } from '@inertiajs/react';
import PublicLayout from '@/layouts/public-layout';
import {
    Calendar, CheckCheck, ChevronLeft, ChevronRight, Clock, MessageSquare,
    Phone, Mail, User, Video, CheckCircle2, MapPin, FileText,
    Building2, Stethoscope, X, Sparkles, Sun, Sunset, Sunrise,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

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

// ── Section card wrapper ─────────────────────────────────────────────
function Card({ step, title, icon: Icon, children }: {
    step: number; title: string; icon: React.ElementType; children: React.ReactNode
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <span className="w-7 h-7 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                    {step}
                </span>
                <Icon className="w-4 h-4 text-red-500"/>
                <h2 className="font-bold text-gray-800 text-sm">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {children}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
    );
}

const inputCls = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all placeholder:text-gray-400";

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

    const [bookingType,      setBookingType]      = useState<BookingType>('online');
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
    const [foundPatient, setFoundPatient] = useState<{ name: string; email: string } | null>(null);
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
        if (form === 'online') {
            setData(prev => ({ ...prev, patient_name: foundPatient.name, patient_email: foundPatient.email || prev.patient_email }));
        } else {
            setIpData(prev => ({ ...prev, patient_name: foundPatient.name, patient_email: foundPatient.email || prev.patient_email }));
        }
        setFoundPatient(null);
    }

    // ── Online form ──────────────────────────────────────────────────
    const { data, setData, post, processing, errors, reset } = useForm<{
        booking_type: BookingType;
        branch_id: string;
        patient_name: string; patient_phone: string; patient_email: string;
        doctor_id: string; online_slot_id: string;
        appointment_date: string; appointment_time: string; appointment_time_end: string;
        notes: string;
        _hp: string;
    }>({
        booking_type: 'online',
        branch_id: '',
        patient_name: '', patient_phone: '', patient_email: '',
        doctor_id: '', online_slot_id: '',
        appointment_date: '', appointment_time: '', appointment_time_end: '',
        notes: '',
        _hp: '',
    });

    // ── In-person form ───────────────────────────────────────────────
    const { data: ipData, setData: setIpData, post: ipPost, processing: ipProcessing, errors: ipErrors, reset: ipReset } = useForm<{
        booking_type: BookingType;
        branch_id: string;
        patient_name: string; patient_phone: string; patient_email: string;
        patient_address: string; reason: string; service: string;
        preferred_date: string; preferred_time: string;
        _hp: string;
    }>({
        booking_type: 'in_person',
        branch_id: '',
        patient_name: '', patient_phone: '', patient_email: '',
        patient_address: '', reason: '', service: '',
        preferred_date: '', preferred_time: '',
        _hp: '',
    });

    // ── Filtered doctors by branch ───────────────────────────────────
    const filteredDoctors = useMemo(() => {
        let result = bookingType === 'online'
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
            <div className="flex items-center gap-2 mt-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-green-500 flex-shrink-0"/>
                <span className="text-green-700 flex-1">Та өмнө захиалсан байна — <strong>{foundPatient.name}</strong></span>
                <button type="button" onClick={() => applyFoundPatient(form)}
                    className="rounded-lg bg-green-100 hover:bg-green-200 text-green-800 font-semibold px-2.5 py-1 transition-colors">
                    Бөглөх
                </button>
                <button type="button" onClick={() => setFoundPatient(null)}
                    className="text-green-500 hover:text-green-700">
                    <X className="w-3.5 h-3.5"/>
                </button>
            </div>
        );
    }

    return (
        <>
            <Head title="Цаг захиалах"/>
            <style>{`
                @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
            `}</style>
            <PublicLayout>

                {/* ── Hero ──────────────────────────────────────────── */}
                <section className="pt-20 sm:pt-28 pb-12 sm:pb-16 bg-[#16100A] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-[140px] -translate-x-1/3 -translate-y-1/3 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.16) 0%, transparent 70%)' }}/>
                    <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(140,10,10,0.1) 0%, transparent 70%)' }}/>
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}/>

                    <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <span className="inline-flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest mb-5 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
                            <Calendar className="w-3.5 h-3.5"/> Цаг захиалах
                        </span>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight mb-4">
                            Хэдхэн минутад<br/>
                            <span className="text-red-500">цагаа авч болно</span>
                        </h1>
                        <p className="text-gray-400 text-base leading-relaxed max-w-md mx-auto">
                            {bookingType === 'online'
                                ? 'Эмчээ сонгоод, тохирох цагаа аваад болоо. Бусдыг бид шийдрэнэ.'
                                : 'Хүсэлтээ илгээгээрэй — манай ажилтан тантай холбогдож цагийг тохиролцоно.'}
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-8 text-xs text-gray-500 flex-wrap">
                            {(bookingType === 'online' ? onlineSteps : inPersonSteps).map((s, i, arr) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 text-[10px] font-black flex items-center justify-center">{i+1}</span>
                                        {s}
                                    </span>
                                    {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-gray-600"/>}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Form ──────────────────────────────────────────── */}
                <section className="py-10 sm:py-14 bg-[#F9F4F2]">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

                        {/* ── Type toggle ───────────────────────────── */}
                        <div className="flex gap-3 mb-6 p-1.5 bg-white rounded-2xl border border-gray-200 shadow-sm">
                            <button type="button" onClick={() => switchType('online')}
                                className={`flex-1 flex items-center justify-center gap-2.5 rounded-xl py-3 px-4 text-sm font-bold transition-all ${
                                    bookingType === 'online'
                                        ? 'bg-red-600 text-white shadow-md shadow-red-200'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}>
                                <Video className="w-4 h-4"/> Онлайн зөвлөгөө
                            </button>
                            <button type="button" onClick={() => switchType('in_person')}
                                className={`flex-1 flex items-center justify-center gap-2.5 rounded-xl py-3 px-4 text-sm font-bold transition-all ${
                                    bookingType === 'in_person'
                                        ? 'bg-red-600 text-white shadow-md shadow-red-200'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}>
                                <Building2 className="w-4 h-4"/> Биечлэн ирэх
                            </button>
                        </div>

                        {/* ── Online success ────────────────────────── */}
                        {flash?.booking_success && (
                            <div className="mb-6 flex items-start gap-4 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm"
                                style={{ animation: 'fadeUp 0.4s ease forwards' }}>
                                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <CheckCheck className="w-5 h-5 text-green-600"/>
                                </div>
                                <div>
                                    <p className="font-bold text-green-800">Цаг амжилттай захиалагдлаа!</p>
                                    <p className="mt-1 text-sm text-green-700">Захиалгын дугаар: <strong>{flash.booking_success}</strong></p>
                                    <p className="mt-0.5 text-sm text-green-600">Удахгүй бид тантай холбогдоно — та суугаад л байгаарай.</p>
                                </div>
                            </div>
                        )}

                        {/* ── In-person success ─────────────────────── */}
                        {flash?.inperson_success && (
                            <div className="mb-6 flex items-start gap-4 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm"
                                style={{ animation: 'fadeUp 0.4s ease forwards' }}>
                                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <CheckCheck className="w-5 h-5 text-green-600"/>
                                </div>
                                <div>
                                    <p className="font-bold text-green-800">Хүсэлт хүрлээ!</p>
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
                            <form onSubmit={submitOnline} className="flex flex-col gap-5">
                                {/* Honeypot — bot trap */}
                                <input name="_hp" type="text" value={data._hp} onChange={e => setData('_hp', e.target.value)}
                                    tabIndex={-1} autoComplete="off" aria-hidden="true"
                                    style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}/>

                                {/* 1. Салбар сонгох */}
                                <Card step={1} title="Салбар сонгох" icon={Building2}>
                                    {branches.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-4">Салбарын мэдээлэл байхгүй байна.</p>
                                    ) : (
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {branches.map(b => {
                                                const isSelected = String(b.id) === selectedBranchId;
                                                const docCount = doctors.filter(d => String(d.branch_id) === String(b.id) && d.online_slots.length > 0).length;
                                                return (
                                                    <button key={b.id} type="button"
                                                        onClick={() => selectBranch(String(b.id))}
                                                        className={`flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                                                            isSelected
                                                                ? 'border-red-500 bg-red-50'
                                                                : 'border-gray-200 hover:border-red-200 bg-white'
                                                        }`}>
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-red-100' : 'bg-gray-100'}`}>
                                                            <Building2 className={`w-5 h-5 ${isSelected ? 'text-red-600' : 'text-gray-500'}`}/>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-800 text-sm">{b.name}</p>
                                                            {b.address && (
                                                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3 flex-shrink-0"/> {b.address}
                                                                </p>
                                                            )}
                                                            <p className={`text-xs mt-1 font-medium ${docCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                                {docCount > 0 ? `${docCount} эмч` : 'Эмч байхгүй'}
                                                            </p>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                                                            isSelected ? 'border-red-500 bg-red-500' : 'border-gray-300'
                                                        }`}>
                                                            {isSelected && <div className="w-2 h-2 rounded-full bg-white"/>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {selectedBranchId && (
                                        <button type="button" onClick={() => selectBranch(selectedBranchId)}
                                            className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors">
                                            <X className="w-3 h-3"/> Салбарын сонголт арилгах
                                        </button>
                                    )}
                                </Card>

                                {/* 2. Эмч сонгох — only after branch selected */}
                                {selectedBranchId && (
                                    <Card step={2} title="Эмч сонгох" icon={User}>
                                        {filteredDoctors.length === 0 ? (
                                            <p className="text-sm text-gray-500 text-center py-4">
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
                                                            className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                                                                isSelected
                                                                    ? 'border-red-500 bg-red-50'
                                                                    : 'border-gray-200 hover:border-red-200 bg-white'
                                                            }`}>
                                                            {d.photo_url ? (
                                                                <img src={d.photo_url} alt={d.name}
                                                                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"/>
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                                                    <span className="text-red-600 font-bold text-sm">
                                                                        {d.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-gray-800 text-sm truncate">{d.name}</p>
                                                                {d.specialization && (
                                                                    <p className="text-xs text-gray-400 mt-0.5 truncate">{d.specialization}</p>
                                                                )}
                                                                <p className={`text-xs mt-1 font-medium ${availableCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                                    {availableCount > 0
                                                                        ? `${availableCount} боломжтой цаг`
                                                                        : 'Цаг байхгүй байна'}
                                                                </p>
                                                            </div>
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                                                isSelected ? 'border-red-500 bg-red-500' : 'border-gray-300'
                                                            }`}>
                                                                {isSelected && <div className="w-2 h-2 rounded-full bg-white"/>}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {errors.doctor_id && <p className="text-xs text-red-500 mt-2">{errors.doctor_id}</p>}
                                    </Card>
                                )}

                                {/* 3. Цаг сонгох */}
                                {selectedDoctor && (
                                    <Card step={3} title="Онлайн зөвлөгөөний цаг сонгох" icon={Clock}>
                                        {sortedDates.length === 0 ? (
                                            <div className="text-center py-8">
                                                <Video className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                                                <p className="font-medium text-gray-700">Одоогоор нээлттэй цаг байхгүй байна</p>
                                                <p className="text-sm text-gray-400 mt-1">Энэ эмч удахгүй цаг нэмэх болно. Эсвэл өөр эмчийг сонгоорой.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-5">
                                                {sortedDates.map(date => (
                                                    <div key={date}>
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                            <Calendar className="w-3.5 h-3.5 text-red-400"/>
                                                            {formatDate(date)}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {slotsByDate[date].map(slot => {
                                                                const isSel = selectedSlotId === slot.id;
                                                                return (
                                                                    <button key={slot.id} type="button"
                                                                        onClick={() => selectSlot(slot)}
                                                                        className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                                                                            isSel
                                                                                ? 'border-red-500 bg-red-600 text-white shadow-sm'
                                                                                : 'border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:text-red-600'
                                                                        }`}>
                                                                        <Clock className="w-3.5 h-3.5"/>
                                                                        {slot.start_time} – {slot.end_time}
                                                                        {isSel && <CheckCircle2 className="w-3.5 h-3.5"/>}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {errors.online_slot_id && <p className="text-xs text-red-500 mt-2">{errors.online_slot_id}</p>}
                                    </Card>
                                )}

                                {/* 4. Таны мэдээлэл */}
                                {selectedSlotId && (
                                    <Card step={4} title="Таны мэдээлэл" icon={User}>
                                        <div className="flex flex-col gap-4">
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <Label required>Утасны дугаар</Label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                                        <input type="tel" value={data.patient_phone}
                                                            onChange={e => { setData('patient_phone', e.target.value); lookupPhone(e.target.value); }}
                                                            placeholder="+976 9900 0000"
                                                            className={inputCls + " pl-9"}/>
                                                    </div>
                                                    {errors.patient_phone && <p className="text-xs text-red-500 mt-1">{errors.patient_phone}</p>}
                                                    <AutofillHint form="online"/>
                                                </div>
                                                <div>
                                                    <Label required>Нэр</Label>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                                        <input type="text" value={data.patient_name}
                                                            onChange={e => setData('patient_name', e.target.value)}
                                                            placeholder="Овог нэр"
                                                            className={inputCls + " pl-9"}/>
                                                    </div>
                                                    {errors.patient_name && <p className="text-xs text-red-500 mt-1">{errors.patient_name}</p>}
                                                </div>
                                            </div>

                                            <div>
                                                <Label required>И-мэйл</Label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                                    <input type="email" value={data.patient_email}
                                                        onChange={e => setData('patient_email', e.target.value)}
                                                        placeholder="example@mail.com"
                                                        className={inputCls + " pl-9"}/>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">Google Meet линк энэ хаяг руу илгээгдэнэ</p>
                                                {errors.patient_email && <p className="text-xs text-red-500 mt-1">{errors.patient_email}</p>}
                                            </div>

                                            <div>
                                                <Label>Нэмэлт мэдээлэл</Label>
                                                <div className="relative">
                                                    <MessageSquare className="absolute left-3 top-3.5 w-4 h-4 text-gray-400"/>
                                                    <textarea value={data.notes}
                                                        onChange={e => setData('notes', e.target.value)}
                                                        rows={3}
                                                        placeholder="Асуулт, хүсэлт эсвэл тайлбар..."
                                                        className={inputCls + " pl-9 resize-none"}/>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* Summary + Submit */}
                                {selectedSlotId && data.appointment_date && (
                                    <>
                                        <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm"
                                            style={{ animation: 'fadeUp 0.3s ease forwards' }}>
                                            <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3">Захиалгын хураангуй</p>
                                            <div className="grid sm:grid-cols-4 gap-3">
                                                {selectedBranch && (
                                                    <div className="flex items-center gap-2.5 bg-red-50 rounded-xl p-3">
                                                        <Building2 className="w-4 h-4 text-red-500 flex-shrink-0"/>
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] text-gray-400">Салбар</p>
                                                            <p className="text-sm font-bold text-gray-800 truncate">{selectedBranch.name}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2.5 bg-red-50 rounded-xl p-3">
                                                    <Video className="w-4 h-4 text-red-500 flex-shrink-0"/>
                                                    <div>
                                                        <p className="text-[11px] text-gray-400">Төрөл</p>
                                                        <p className="text-sm font-bold text-gray-800">💻 Онлайн</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5 bg-red-50 rounded-xl p-3">
                                                    <Clock className="w-4 h-4 text-red-500 flex-shrink-0"/>
                                                    <div>
                                                        <p className="text-[11px] text-gray-400">Цаг</p>
                                                        <p className="text-sm font-bold text-gray-800">
                                                            {data.appointment_date} {data.appointment_time}
                                                            {data.appointment_time_end && ` – ${data.appointment_time_end}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                {selectedDoctor && (
                                                    <div className="flex items-center gap-2.5 bg-red-50 rounded-xl p-3">
                                                        <User className="w-4 h-4 text-red-500 flex-shrink-0"/>
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] text-gray-400">Эмч</p>
                                                            <p className="text-sm font-bold text-gray-800 truncate">{selectedDoctor.name}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                                <span className="text-lg">💳</span>
                                                <div className="flex-1">
                                                    <p className="text-xs font-semibold text-amber-800">Захиалгын төлбөр</p>
                                                    <p className="text-xs text-amber-700 mt-0.5">
                                                        Цаг захиалсны дараа <strong>{consultation_fee.toLocaleString()} ₮</strong> QPay-аар төлнө үү.
                                                        Төлбөр хийгдсэний дараа Google Meet линк и-мэйлээр ирнэ.
                                                    </p>
                                                </div>
                                                <span className="text-sm font-black text-amber-800 whitespace-nowrap">{consultation_fee.toLocaleString()} ₮</span>
                                            </div>
                                        </div>

                                        <button type="submit"
                                            disabled={processing || !data.patient_name || !data.patient_phone || !data.patient_email}
                                            className="w-full flex items-center justify-center gap-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-200 text-base">
                                            {processing
                                                ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Илгээж байна...</>
                                                : <><Calendar className="w-5 h-5"/> Цаг захиалах — {consultation_fee.toLocaleString()} ₮</>
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
                            <form onSubmit={submitInPerson} className="flex flex-col gap-5">
                                {/* Honeypot — bot trap */}
                                <input name="_hp" type="text" value={ipData._hp} onChange={e => setIpData('_hp', e.target.value)}
                                    tabIndex={-1} autoComplete="off" aria-hidden="true"
                                    style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}/>

                                {/* Info banner */}
                                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 flex items-start gap-3">
                                    <Building2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"/>
                                    <div>
                                        <p className="text-sm font-semibold text-blue-800">Биечлэн ирэхийг хүсч байна уу?</p>
                                        <p className="text-xs text-blue-600 mt-0.5">
                                            Хүсэлтээ илгээгээрэй — манай ажилтан тантай холбогдож, тохиромжтой цагийг хамт олох болно.
                                        </p>
                                    </div>
                                </div>

                                {/* 1. Салбар сонгох */}
                                <Card step={1} title="Салбар сонгох" icon={Building2}>
                                    {branches.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-4">Салбарын мэдээлэл байхгүй байна.</p>
                                    ) : (
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {branches.map(b => {
                                                const isSelected = String(b.id) === ipData.branch_id;
                                                return (
                                                    <button key={b.id} type="button"
                                                        onClick={() => setIpData('branch_id', isSelected ? '' : String(b.id))}
                                                        className={`flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                                                            isSelected
                                                                ? 'border-red-500 bg-red-50'
                                                                : 'border-gray-200 hover:border-red-200 bg-white'
                                                        }`}>
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-red-100' : 'bg-gray-100'}`}>
                                                            <Building2 className={`w-5 h-5 ${isSelected ? 'text-red-600' : 'text-gray-500'}`}/>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-800 text-sm">{b.name}</p>
                                                            {b.address && (
                                                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3 flex-shrink-0"/> {b.address}
                                                                </p>
                                                            )}
                                                            {b.phone && (
                                                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                                    <Phone className="w-3 h-3 flex-shrink-0"/> {b.phone}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                                                            isSelected ? 'border-red-500 bg-red-500' : 'border-gray-300'
                                                        }`}>
                                                            {isSelected && <div className="w-2 h-2 rounded-full bg-white"/>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>

                                {/* 2. Таны мэдээлэл — only after branch selected */}
                                {ipData.branch_id && (
                                    <Card step={2} title="Таны мэдээлэл" icon={User}>
                                        <div className="flex flex-col gap-4">
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <Label required>Утасны дугаар</Label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                                        <input type="tel" value={ipData.patient_phone}
                                                            onChange={e => { setIpData('patient_phone', e.target.value); lookupPhone(e.target.value); }}
                                                            placeholder="+976 9900 0000"
                                                            className={inputCls + " pl-9"}/>
                                                    </div>
                                                    {ipErrors.patient_phone && <p className="text-xs text-red-500 mt-1">{ipErrors.patient_phone}</p>}
                                                    <AutofillHint form="ip"/>
                                                </div>
                                                <div>
                                                    <Label required>Нэр</Label>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                                        <input type="text" value={ipData.patient_name}
                                                            onChange={e => setIpData('patient_name', e.target.value)}
                                                            placeholder="Овог нэр"
                                                            className={inputCls + " pl-9"}/>
                                                    </div>
                                                    {ipErrors.patient_name && <p className="text-xs text-red-500 mt-1">{ipErrors.patient_name}</p>}
                                                </div>
                                            </div>

                                            <div>
                                                <Label>И-мэйл</Label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                                    <input type="email" value={ipData.patient_email}
                                                        onChange={e => setIpData('patient_email', e.target.value)}
                                                        placeholder="example@mail.com"
                                                        className={inputCls + " pl-9"}/>
                                                </div>
                                                {ipErrors.patient_email && <p className="text-xs text-red-500 mt-1">{ipErrors.patient_email}</p>}
                                            </div>

                                            <div>
                                                <Label>Хаяг</Label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                                    <input type="text" value={ipData.patient_address}
                                                        onChange={e => setIpData('patient_address', e.target.value)}
                                                        placeholder="Дүүрэг, хороо, гудамж..."
                                                        className={inputCls + " pl-9"}/>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* 3. Үзлэгийн мэдээлэл — only after branch + patient info entered */}
                                {ipData.branch_id && (
                                    <Card step={3} title="Үзлэгийн мэдээлэл" icon={Stethoscope}>
                                        <div className="flex flex-col gap-4">

                                            <div>
                                                <Label>Үзүүлэх шалтгаан</Label>
                                                <div className="relative">
                                                    <FileText className="absolute left-3 top-3.5 w-4 h-4 text-gray-400"/>
                                                    <textarea value={ipData.reason}
                                                        onChange={e => setIpData('reason', e.target.value)}
                                                        rows={3}
                                                        placeholder="Ямар шалтгаанаар ирэх гэж байгаагаа товч тайлбарлана уу..."
                                                        className={inputCls + " pl-9 resize-none"}/>
                                                </div>
                                            </div>

                                            {/* ── Custom calendar date picker ── */}
                                            <div>
                                                <Label>Боломжтой өдөр</Label>
                                                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                                                    {/* Month nav */}
                                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-red-50 to-rose-50">
                                                        <button type="button"
                                                            disabled={calYear === _today.getFullYear() && calMonth === _today.getMonth()}
                                                            onClick={() => calMonth === 0 ? (setCalMonth(11), setCalYear(y => y-1)) : setCalMonth(m => m-1)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/80 disabled:opacity-30 transition-colors">
                                                            <ChevronLeft className="w-4 h-4 text-gray-600"/>
                                                        </button>
                                                        <div className="text-center">
                                                            <p className="text-sm font-bold text-gray-800">{calYear} оны {MONTHS_MN[calMonth]}</p>
                                                            {ipData.preferred_date && (
                                                                <p className="text-[11px] text-red-500 font-semibold mt-0.5">
                                                                    {(() => { const d = new Date(ipData.preferred_date + 'T00:00'); return `${MN_MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${MN_WEEKDAYS[d.getDay()]}`; })()} сонгогдсон
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button type="button"
                                                            onClick={() => calMonth === 11 ? (setCalMonth(0), setCalYear(y => y+1)) : setCalMonth(m => m+1)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/80 transition-colors">
                                                            <ChevronRight className="w-4 h-4 text-gray-600"/>
                                                        </button>
                                                    </div>
                                                    {/* Day headers */}
                                                    <div className="grid grid-cols-7 px-3 pt-3">
                                                        {DAYS_MN.map(d => (
                                                            <div key={d} className="text-center text-[10px] font-bold text-gray-400 pb-2">{d[0]}</div>
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
                                                                    className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                                                                        isSel   ? 'bg-red-600 text-white shadow-md shadow-red-200 scale-110' :
                                                                        isPast  ? 'text-gray-300 cursor-not-allowed' :
                                                                        isToday ? 'ring-2 ring-red-500 text-red-600 font-bold hover:bg-red-50' :
                                                                        isWeekend ? 'text-red-400 hover:bg-red-50' :
                                                                        'text-gray-700 hover:bg-red-50 hover:text-red-600'
                                                                    }`}>
                                                                    {dayNum}
                                                                    {isToday && !isSel && (
                                                                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500"/>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Time slot picker (shows after date selected) ── */}
                                            {ipData.preferred_date && (
                                                <div style={{ animation: 'fadeUp 0.3s ease forwards' }}>
                                                    <Label>Боломжтой цаг</Label>
                                                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm divide-y divide-gray-100">
                                                        {TIME_GROUPS.map(({ label, icon: TIcon, slots }) => (
                                                            <div key={label} className="px-4 py-3">
                                                                <p className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2.5">
                                                                    <TIcon className="w-3.5 h-3.5 text-red-400"/> {label}
                                                                </p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {slots.map(t => {
                                                                        const isSel = ipData.preferred_time === t;
                                                                        return (
                                                                            <button key={t} type="button"
                                                                                onClick={() => setIpData('preferred_time', isSel ? '' : t)}
                                                                                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold border-2 transition-all ${
                                                                                    isSel
                                                                                        ? 'border-red-500 bg-red-600 text-white shadow-sm shadow-red-200 scale-105'
                                                                                        : 'border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50'
                                                                                }`}>
                                                                                <Clock className={`w-3 h-3 ${isSel ? 'text-white' : 'text-gray-400'}`}/>
                                                                                {t}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {ipData.preferred_time && (
                                                        <p className="text-xs text-red-600 mt-1.5 font-medium flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3"/> {ipData.preferred_date} · {ipData.preferred_time} сонгогдсон
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            <p className="text-xs text-gray-400">
                                                ✦ Хүссэн цаг заавал биш — манай ажилтан тантай тохиролцох болно.
                                            </p>
                                        </div>
                                    </Card>
                                )}

                                {ipData.branch_id && (
                                    <button type="submit"
                                        disabled={ipProcessing || !ipData.patient_name || !ipData.patient_phone}
                                        className="w-full flex items-center justify-center gap-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-200 text-base">
                                        {ipProcessing
                                            ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Илгээж байна...</>
                                            : <><CheckCircle2 className="w-5 h-5"/> Хүсэлт илгээх</>
                                        }
                                    </button>
                                )}

                            </form>
                        )}

                    </div>
                </section>

            </PublicLayout>
        </>
    );
}
