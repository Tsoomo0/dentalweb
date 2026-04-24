import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
    Calendar, CheckCircle2, Clock, CreditCard, ExternalLink,
    Loader2, RefreshCw, User, Video, XCircle,
} from 'lucide-react';
import PublicLayout from '@/layouts/public-layout';
import { useCallback, useEffect, useRef, useState } from 'react';

interface AppointmentData {
    id: number;
    appointment_number: string;
    patient_name: string;
    patient_email: string | null;
    doctor_name: string | null;
    appointment_date: string;
    appointment_time: string;
    appointment_time_end: string | null;
    payment_status: string;
    payment_amount: number;
    meet_link: string | null;
}

interface Props {
    appointment: AppointmentData;
    already_paid: boolean;
    test_mode: boolean;
}

interface DeepLink {
    name: string;
    description: string;
    logo: string;
    link: string;
}

interface InvoiceData {
    invoice_id: string;
    qr_image: string | null;
    qpay_deeplink: DeepLink[];
}

// ── QPay банкны өнгө ─────────────────────────────────────────────────────────
const BANK_COLORS: Record<string, string> = {
    'Khan Bank':     '#1b8aca',
    'Golomt':        '#e21f26',
    'TDB':           '#004994',
    'XacBank':       '#f05a22',
    'State Bank':    '#00853f',
    'Capitron':      '#7b3ca5',
    'Most Money':    '#ff6b00',
    'M Bank':        '#00aeef',
};

function bankColor(name: string): string {
    for (const [k, v] of Object.entries(BANK_COLORS)) {
        if (name.toLowerCase().includes(k.toLowerCase())) return v;
    }
    return '#374151';
}

// ── Захиалгын мэдээлэл мөр ───────────────────────────────────────────────────
function InfoRow({ icon, label, value, highlight }: {
    icon: React.ReactNode; label: string; value: string; highlight?: boolean
}) {
    return (
        <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3">
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div>
                <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                <p className={`text-sm font-semibold ${highlight ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
            </div>
        </div>
    );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function PaymentPage({ appointment, already_paid, test_mode }: Props) {

    type Phase = 'loading' | 'qr' | 'success' | 'error';

    const [phase, setPhase]         = useState<Phase>(already_paid ? 'success' : 'loading');
    const [invoice, setInvoice]     = useState<InvoiceData | null>(null);
    const [errorMsg, setErrorMsg]   = useState('');
    const [countdown, setCountdown] = useState(300); // 5 минут
    const [meetLink, setMeetLink]   = useState<string | null>(appointment.meet_link);

    const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
    const doneRef    = useRef(false);

    // ── Polling зогсоох ──────────────────────────────────────────────────────
    const stopPolling = useCallback(() => {
        if (pollRef.current)  clearInterval(pollRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        pollRef.current  = null;
        timerRef.current = null;
    }, []);

    // ── Статус шалгах ────────────────────────────────────────────────────────
    const checkStatus = useCallback(async () => {
        if (doneRef.current) return;
        try {
            const { data } = await axios.get<{ paid: boolean; meet_link?: string }>(
                `/payment/${appointment.id}/check`
            );
            if (data.paid) {
                doneRef.current = true;
                stopPolling();
                setMeetLink(data.meet_link ?? null);
                setPhase('success');
            }
        } catch { /* network blip — дараагийн polling-ийг хүлээх */ }
    }, [appointment.id, stopPolling]);

    // ── Polling эхлүүлэх ─────────────────────────────────────────────────────
    const startPolling = useCallback(() => {
        pollRef.current = setInterval(checkStatus, 3000);
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    if (!doneRef.current) {
                        doneRef.current = true;
                        stopPolling();
                        setPhase('error');
                        setErrorMsg('Төлбөрийн хугацаа (5 минут) дууссан. Дахин оролдоно уу.');
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [checkStatus, stopPolling]);

    // ── QPay invoice үүсгэх (auto, хуудас ачааллахад) ───────────────────────
    const createInvoice = useCallback(async () => {
        setPhase('loading');
        setErrorMsg('');
        try {
            const { data } = await axios.post<
                { paid: true; meet_link: string } |
                { paid: false; invoice_id: string; qr_image: string | null; qpay_deeplink: DeepLink[] } |
                { error: string }
            >(`/payment/${appointment.id}/invoice`);

            if ('error' in data) {
                setPhase('error');
                setErrorMsg(data.error);
                return;
            }
            if (data.paid) {
                setMeetLink(data.meet_link);
                setPhase('success');
                return;
            }
            setInvoice({
                invoice_id:     data.invoice_id,
                qr_image:       data.qr_image,
                qpay_deeplink:  data.qpay_deeplink ?? [],
            });
            setPhase('qr');
            startPolling();
        } catch (e: unknown) {
            setPhase('error');
            const msg = axios.isAxiosError(e)
                ? (e.response?.data?.error ?? 'Сервертэй холбогдоход алдаа гарлаа.')
                : 'Сервертэй холбогдоход алдаа гарлаа.';
            setErrorMsg(msg);
        }
    }, [appointment.id, startPolling]);

    // ── Хуудас ачааллахад автоматаар invoice үүсгэх ─────────────────────────
    useEffect(() => {
        if (already_paid) return;
        createInvoice();
        return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fmtCountdown = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    return (
        <>
            <Head title={`Төлбөр — ${appointment.appointment_number}`} />
            <PublicLayout>

                {/* ── Hero ── */}
                <section className="pt-20 sm:pt-28 pb-10 bg-[#16100A]">
                    <div className="max-w-xl mx-auto px-4 text-center">
                        <span className="inline-flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest mb-5 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
                            <CreditCard className="w-3.5 h-3.5" /> Захиалгын төлбөр
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
                            {appointment.appointment_number}
                        </h1>
                        <p className="text-gray-400 text-sm">
                            Захиалгаа баталгаажуулахын тулд <strong className="text-white">{appointment.payment_amount.toLocaleString()} ₮</strong> төлнө үү
                        </p>
                    </div>
                </section>

                <section className="py-10 bg-[#F9F4F2]">
                    <div className="max-w-xl mx-auto px-4 space-y-5">

                        {/* ── Тест горимын мэдэгдэл ── */}
                        {test_mode && (
                            <div className="flex items-start gap-3 rounded-2xl border border-yellow-300 bg-yellow-50 px-4 py-3">
                                <span className="text-lg mt-0.5">🧪</span>
                                <div>
                                    <p className="text-sm font-bold text-yellow-800">Тест горим идэвхтэй</p>
                                    <p className="text-xs text-yellow-700 mt-0.5">
                                        QPay-г тойрч шууд баталгаажуулна. Production-д <code className="bg-yellow-100 px-1 rounded">QPAY_TEST_MODE=false</code> болгоно уу.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ── Захиалгын хураангуй ── */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                                Захиалгын дэлгэрэнгүй
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <InfoRow icon={<User    className="w-4 h-4 text-red-400"/>} label="Үйлчлүүлэгч"    value={appointment.patient_name} />
                                <InfoRow icon={<User    className="w-4 h-4 text-red-400"/>} label="Эмч"            value={appointment.doctor_name ?? '—'} />
                                <InfoRow icon={<Calendar className="w-4 h-4 text-red-400"/>} label="Огноо"         value={appointment.appointment_date} />
                                <InfoRow icon={<Clock   className="w-4 h-4 text-red-400"/>} label="Цаг"
                                    value={appointment.appointment_time + (appointment.appointment_time_end ? ` – ${appointment.appointment_time_end}` : '')} />
                                <InfoRow icon={<CreditCard className="w-4 h-4 text-red-400"/>} label="Төлбөр"     value={`${appointment.payment_amount.toLocaleString()} ₮`} highlight />
                                <InfoRow icon={<Video   className="w-4 h-4 text-red-400"/>} label="Төрөл"         value="Онлайн зөвлөгөө" />
                            </div>
                        </div>

                        {/* ── Loading: invoice үүсгэж байна ── */}
                        {phase === 'loading' && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center gap-4">
                                <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
                                <p className="text-sm font-medium text-gray-600">QPay QR код бэлтгэж байна...</p>
                            </div>
                        )}

                        {/* ── QR + polling ── */}
                        {phase === 'qr' && invoice && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

                                {/* Гарчиг + тоолуур */}
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <p className="font-bold text-gray-800">QR код уншуулна уу</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Банкны аппаар {appointment.payment_amount.toLocaleString()} ₮ төлнө үү</p>
                                    </div>
                                    <span className="text-base font-mono font-black text-red-600 bg-red-50 px-3 py-1.5 rounded-xl">
                                        {fmtCountdown(countdown)}
                                    </span>
                                </div>

                                {/* QR зураг */}
                                <div className="flex justify-center mb-5">
                                    {invoice.qr_image ? (
                                        <div className="p-3 border-2 border-gray-100 rounded-2xl">
                                            <img
                                                src={`data:image/png;base64,${invoice.qr_image}`}
                                                alt="QPay QR"
                                                className="w-56 h-56 object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-56 h-56 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center">
                                            <p className="text-xs text-gray-400 text-center px-4">QR код ачааллаж байна...</p>
                                        </div>
                                    )}
                                </div>

                                {/* Банкны апп deeplinks */}
                                {invoice.qpay_deeplink.length > 0 && (
                                    <div>
                                        <p className="text-xs text-center text-gray-400 font-medium mb-3">
                                            Эсвэл банкны апп сонгоно уу
                                        </p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {invoice.qpay_deeplink.slice(0, 6).map((d, i) => (
                                                <a key={i} href={d.link} target="_blank" rel="noopener noreferrer"
                                                    className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 p-2.5 hover:border-gray-300 transition-colors">
                                                    {d.logo ? (
                                                        <img src={`data:image/png;base64,${d.logo}`} alt={d.name}
                                                            className="w-8 h-8 object-contain rounded-lg" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black"
                                                            style={{ background: bankColor(d.name) }}>
                                                            {d.name.slice(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="text-[10px] text-gray-500 text-center leading-tight">
                                                        {d.description || d.name}
                                                    </span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-400">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Төлбөр хүлээж байна...
                                </div>
                            </div>
                        )}

                        {/* ── Амжилттай ── */}
                        {phase === 'success' && (
                            <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-9 h-9 text-green-500" />
                                </div>
                                <h2 className="text-xl font-black text-gray-800 mb-2">Захиалга баталгаажлаа!</h2>
                                <p className="text-sm text-gray-500 mb-6">
                                    {appointment.patient_email
                                        ? <>Google Meet линк <strong className="text-gray-700">{appointment.patient_email}</strong> хаяг руу илгээгдлээ. Эмч мөн мэдэгдэл хүлээн авлаа.</>
                                        : 'Захиалга амжилттай баталгаажлаа.'}
                                </p>

                                {meetLink && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-left">
                                        <p className="text-xs font-bold text-blue-600 mb-2">🎥 Google Meet линк</p>
                                        <a href={meetLink} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors mb-2">
                                            <Video className="w-4 h-4" /> Meet-рүү орох <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                        <p className="text-[11px] text-blue-500 break-all">{meetLink}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    <a href="/"
                                        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                                        Нүүр хуудас
                                    </a>
                                    <a href="/booking"
                                        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 py-2.5 text-sm font-semibold text-white">
                                        Дахин захиалах
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* ── Алдаа ── */}
                        {phase === 'error' && (
                            <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                                    <XCircle className="w-9 h-9 text-red-500" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-800 mb-2">Алдаа гарлаа</h2>
                                <p className="text-sm text-gray-500 mb-5">{errorMsg}</p>
                                <button
                                    onClick={() => { doneRef.current = false; setCountdown(300); createInvoice(); }}
                                    className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
                                    <RefreshCw className="w-4 h-4" /> Дахин оролдох
                                </button>
                            </div>
                        )}

                    </div>
                </section>

            </PublicLayout>
        </>
    );
}
