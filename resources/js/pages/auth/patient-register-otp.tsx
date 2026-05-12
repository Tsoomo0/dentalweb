import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, LoaderCircle, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';

interface PageProps {
    masked_email: string;
    status?: string;
    [key: string]: unknown;
}

export default function PatientRegisterOtp() {
    const { masked_email, status } = usePage<PageProps>().props;
    const { data, setData, post, processing, errors } = useForm({ code: '' });

    // 6 individual digit inputs
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Resend cooldown
    const [cooldown, setCooldown] = useState(0);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    // Keep form data in sync with digits
    useEffect(() => {
        setData('code', digits.join(''));
    }, [digits]);

    function handleDigit(i: number, val: string) {
        const v = val.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[i] = v;
        setDigits(next);
        if (v && i < 5) {
            inputRefs.current[i + 1]?.focus();
        }
    }

    function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Backspace' && !digits[i] && i > 0) {
            inputRefs.current[i - 1]?.focus();
            const next = [...digits];
            next[i - 1] = '';
            setDigits(next);
        }
    }

    function handlePaste(e: React.ClipboardEvent) {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        e.preventDefault();
        const next = [...digits];
        pasted.split('').forEach((c, i) => { if (i < 6) next[i] = c; });
        setDigits(next);
        const lastFilled = Math.min(pasted.length, 5);
        inputRefs.current[lastFilled]?.focus();
    }

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/patient/register/verify-otp');
    };

    function resend() {
        if (cooldown > 0 || resending) return;
        setResending(true);
        router.post('/patient/register/resend-otp', {}, {
            preserveState: true,
            onFinish: () => { setResending(false); setCooldown(60); },
        });
    }

    const filled = digits.every(d => d !== '');

    return (
        <>
            <Head title="Имэйл баталгаажуулах" />

            <style>{`
                @keyframes fade-up { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
                @keyframes pulse-ring { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.15);opacity:.15} }
                .animate-fade-up { animation:fade-up .6s ease forwards; }
                .digit-input { caret-color:transparent; }
                input:-webkit-autofill { -webkit-box-shadow:0 0 0 1000px #1a1a2e inset !important; -webkit-text-fill-color:#f1f5f9 !important; }
            `}</style>

            <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0d0d1a] px-4">

                {/* Background glow */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
                    <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
                </div>

                <div className="relative z-10 w-full max-w-md animate-fade-up">

                    {/* Card */}
                    <div className="rounded-3xl p-8" style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.1)' }}>

                        {/* Icon */}
                        <div className="mb-6 flex flex-col items-center gap-4">
                            <div className="relative flex size-20 items-center justify-center">
                                <div className="absolute inset-0 rounded-full animate-[pulse-ring_2s_ease-in-out_infinite]"
                                    style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
                                <div className="relative flex size-20 items-center justify-center rounded-full"
                                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                    <ShieldCheck className="size-9 text-white" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h1 className="text-2xl font-black text-white">Имэйл баталгаажуулах</h1>
                                <p className="mt-1.5 text-sm text-white/50">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Mail className="size-3.5" />
                                        <span className="font-mono font-semibold text-white/70">{masked_email}</span>
                                    </span>
                                    {' '}руу 6 оронтой код илгээлээ
                                </p>
                            </div>
                        </div>

                        {/* Status message */}
                        {status && (
                            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                                <CheckCircle2 className="size-4 shrink-0" />
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-6">

                            {/* 6 digit inputs */}
                            <div>
                                <label className="mb-3 block text-center text-xs font-semibold uppercase tracking-widest text-white/40">
                                    Баталгаажуулах код
                                </label>
                                <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
                                    {digits.map((d, i) => (
                                        <input
                                            key={i}
                                            ref={el => { inputRefs.current[i] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={d}
                                            onChange={e => handleDigit(i, e.target.value)}
                                            onKeyDown={e => handleKeyDown(i, e)}
                                            className={`digit-input size-12 rounded-2xl border text-center text-xl font-black text-white outline-none transition-all
                                                ${d
                                                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                                                    : 'border-white/10 bg-white/5 focus:border-emerald-500/60 focus:bg-emerald-500/5'
                                                }`}
                                        />
                                    ))}
                                </div>
                                {errors.code && (
                                    <p className="mt-2 text-center text-xs text-red-400">{errors.code}</p>
                                )}
                            </div>

                            {/* Submit */}
                            <button type="submit" disabled={processing || !filled}
                                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-4 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' }}>
                                <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                                {processing ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                                {processing ? 'Шалгаж байна...' : 'Баталгаажуулах'}
                            </button>
                        </form>

                        {/* Resend */}
                        <div className="mt-5 text-center">
                            <p className="text-sm text-white/40">Код ирээгүй юу?</p>
                            <button
                                type="button"
                                onClick={resend}
                                disabled={cooldown > 0 || resending}
                                className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors disabled:text-white/30 disabled:cursor-not-allowed"
                            >
                                <RefreshCw className={`size-3.5 ${resending ? 'animate-spin' : ''}`} />
                                {cooldown > 0 ? `${cooldown}с дараа дахин илгээх` : 'Код дахин илгээх'}
                            </button>
                        </div>

                        {/* Back */}
                        <div className="mt-6 flex items-center justify-center">
                            <Link href="/patient/register"
                                className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors">
                                <ArrowLeft className="size-3.5" />
                                Бүртгэлийн маягт руу буцах
                            </Link>
                        </div>
                    </div>

                    {/* Info */}
                    <p className="mt-5 text-center text-xs text-white/20">
                        Код 10 минутын дараа хугацаа дуусна · 5 буруу оролдлогоос хэтэрвэл бүртгэл цуцлагдана
                    </p>
                </div>
            </div>
        </>
    );
}
