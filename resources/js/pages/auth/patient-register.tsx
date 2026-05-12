import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { CalendarDays, Check, Eye, EyeOff, LoaderCircle, Lock, Mail, MapPin, Phone, Sparkles, User, X } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useMemo, useState } from 'react';
import InputError from '@/components/input-error';

interface RegisterForm {
    last_name: string;
    first_name: string;
    gender: string;
    date_of_birth: string;
    phone: string;
    address: string;
    email: string;
    password: string;
    password_confirmation: string;
    turnstile_token: string;
}

export default function PatientRegister() {
    const { props } = usePage<{ site_settings?: { site_logo?: string; site_name?: string } }>();
    const siteLogo = props.site_settings?.site_logo;
    const siteName = props.site_settings?.site_name ?? 'Кутикул';

    const { data, setData, post, processing, errors, reset } = useForm({
        last_name: '', first_name: '', gender: '', date_of_birth: '',
        phone: '', address: '', email: '',
        password: '', password_confirmation: '',
        turnstile_token: '',
    });

    const [showPw, setShowPw] = useState(false);
    const turnstileRef = useRef<HTMLDivElement>(null);
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

    useEffect(() => {
        if (!siteKey || !turnstileRef.current) return;
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.onload = () => {
            const w = window as any;
            if (w.turnstile && turnstileRef.current) {
                w.turnstile.render(turnstileRef.current, {
                    sitekey: siteKey,
                    theme: 'dark',
                    callback: (token: string) => setData('turnstile_token', token),
                    'expired-callback': () => setData('turnstile_token', ''),
                    'error-callback': () => setData('turnstile_token', ''),
                });
            }
        };
        document.head.appendChild(script);
        return () => { document.head.contains(script) && document.head.removeChild(script); };
    }, [siteKey]);

    const pwChecks = useMemo(() => {
        const pw = data.password;
        return {
            length:    pw.length >= 8,
            uppercase: /[A-Z]/.test(pw),
            lowercase: /[a-z]/.test(pw),
            number:    /\d/.test(pw),
            symbol:    /[^A-Za-z0-9]/.test(pw),
        };
    }, [data.password]);

    const pwScore = Object.values(pwChecks).filter(Boolean).length;
    const pwStrength = pwScore <= 1 ? { label: 'Маш сул', color: 'bg-red-500',     w: 'w-1/5' }
                     : pwScore === 2 ? { label: 'Сул',     color: 'bg-orange-500',  w: 'w-2/5' }
                     : pwScore === 3 ? { label: 'Дунд',    color: 'bg-yellow-400',  w: 'w-3/5' }
                     : pwScore === 4 ? { label: 'Сайн',    color: 'bg-lime-500',    w: 'w-4/5' }
                     :                 { label: 'Маш сайн', color: 'bg-emerald-500', w: 'w-full' };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/patient/register/send-otp', { onFinish: () => reset('password', 'password_confirmation') });
    };

    return (
        <>
            <Head title="Бүртгүүлэх" />

            <style>{`
                @keyframes fade-up { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
                @keyframes fade-down { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:translateY(0); } }
                @keyframes shimmer { 0%{background-position:-200% center;} 100%{background-position:200% center;} }
                .animate-fade-up { animation:fade-up 0.6s ease forwards; }
                .animate-fade-down { animation:fade-down 0.5s ease forwards; }
                .shimmer-text { background:linear-gradient(90deg,#fff 0%,#6ee7b7 40%,#fff 60%,#6ee7b7 100%); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; animation:shimmer 4s linear infinite; }
                .glass-card { background:rgba(255,255,255,0.04); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.12); }
                .input-glow:focus-within { box-shadow:0 0 0 3px rgba(52,211,153,0.25); }
                input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus { -webkit-box-shadow:0 0 0 1000px #1a1a2e inset !important; -webkit-text-fill-color:#f1f5f9 !important; transition:background-color 5000s ease-in-out 0s; }
            `}</style>

            <div className="relative flex min-h-screen w-full overflow-hidden bg-[#0d0d1a]">

                {/* ── Left panel ── */}
                <div className="relative hidden w-[55%] flex-col overflow-hidden lg:flex"
                    style={{ background: 'linear-gradient(135deg, #052e16 0%, #065f46 40%, #0d4f38 70%, #0d0d1a 100%)' }}>

                    <div className="absolute inset-0 opacity-[0.04]"
                        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
                    <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
                    <div className="absolute -bottom-20 right-10 h-[400px] w-[400px] rounded-full opacity-15"
                        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />

                    <div className="relative z-10 flex flex-1 flex-col items-start justify-center px-14 pb-20">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-xs font-medium text-emerald-300">Үйлчлүүлэгчийн портал</span>
                        </div>

                        <h1 className="mb-4 text-5xl font-black leading-tight tracking-tight text-white">
                            Бүртгүүлэх <br />
                            <span className="shimmer-text">Тавтай морилно</span>
                        </h1>

                        <p className="mb-10 max-w-sm text-base leading-relaxed text-white/50">
                            Бүртгүүлснээр та өөрийн захиалга,
                            эмчилгээний мэдээллийг хэдэн ч үед харах боломжтой.
                        </p>

                        <div className="flex gap-8">
                            {[
                                { num: '24/7', label: 'Онлайн хяналт' },
                                { num: '100%', label: 'Аюулгүй' },
                                { num: '∞',    label: 'Хандалт' },
                            ].map(s => (
                                <div key={s.label}>
                                    <p className="text-2xl font-black text-white">{s.num}</p>
                                    <p className="text-[11px] text-white/40">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Right panel ── */}
                <div className="flex flex-1 flex-col lg:items-center lg:justify-center lg:p-12"
                    style={{ background: 'linear-gradient(160deg, #111127 0%, #0d0d1a 100%)' }}>

                    {/* Mobile header */}
                    <div className="relative overflow-hidden lg:hidden"
                        style={{ background: 'linear-gradient(135deg, #065f46 0%, #10b981 50%, #6366f1 100%)' }}>
                        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
                        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
                        <div className="relative z-10 px-6 pb-10 pt-12">
                            <div className="mb-5 flex items-center gap-3 animate-fade-down">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-lg overflow-hidden">
                                    {siteLogo
                                        ? <img src={siteLogo} alt={siteName} className="h-12 w-12 object-contain" />
                                        : <span className="text-2xl text-white font-black">+</span>
                                    }
                                </div>
                                <div>
                                    <p className="text-lg font-black text-white leading-none">{siteName}</p>
                                    <p className="text-[11px] text-white/60 mt-0.5">Үйлчлүүлэгчийн портал</p>
                                </div>
                            </div>
                            <h2 className="text-3xl font-black text-white animate-fade-down" style={{ animationDelay: '0.1s', opacity: 0 }}>
                                Бүртгүүлэх 👋
                            </h2>
                        </div>
                        <svg viewBox="0 0 480 40" className="block w-full -mb-px" preserveAspectRatio="none" style={{ fill: '#0d0d1a', height: 36 }}>
                            <path d="M0,20 C120,40 240,0 360,20 C400,28 440,16 480,20 L480,40 L0,40 Z" />
                        </svg>
                    </div>

                    {/* Form */}
                    <div className="w-full max-w-md animate-fade-up px-5 py-7 lg:px-0 lg:py-0">

                        {/* Desktop logo */}
                        <div className="mb-8 hidden items-center gap-3 lg:flex">
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl overflow-hidden"
                                style={siteLogo ? {} : { background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                {siteLogo
                                    ? <img src={siteLogo} alt={siteName} className="h-14 w-14 object-contain" />
                                    : <span className="text-2xl font-black text-white">+</span>
                                }
                            </div>
                            <span className="text-base font-bold text-white">{siteName}</span>
                        </div>

                        <div className="mb-8 hidden lg:block">
                            <h2 className="text-3xl font-black text-white">Бүртгүүлэх</h2>
                            <p className="mt-1.5 text-sm text-white/40">Үйлчлүүлэгчийн портал нэвтрэх эрх үүсгэх</p>
                        </div>

                        <form onSubmit={submit} className="space-y-4">

                            {/* Name row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">Овог <span className="text-red-400">*</span></label>
                                    <div className="input-glow flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all focus-within:border-emerald-500/60">
                                        <User className="h-4 w-4 shrink-0 text-white/30" />
                                        <input type="text" value={data.last_name} onChange={e => setData('last_name', e.target.value)}
                                            placeholder="Овог" required
                                            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20" />
                                    </div>
                                    <InputError message={errors.last_name} />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">Нэр <span className="text-red-400">*</span></label>
                                    <div className="input-glow flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all focus-within:border-emerald-500/60">
                                        <input type="text" value={data.first_name} onChange={e => setData('first_name', e.target.value)}
                                            placeholder="Нэр" required
                                            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20" />
                                    </div>
                                    <InputError message={errors.first_name} />
                                </div>
                            </div>

                            {/* Gender + DOB row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">Хүйс</label>
                                    <div className="input-glow flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all focus-within:border-emerald-500/60">
                                        <select
                                            value={data.gender}
                                            onChange={e => setData('gender', e.target.value)}
                                            className="flex-1 bg-transparent text-sm text-white outline-none"
                                            style={{ colorScheme: 'dark' }}
                                        >
                                            <option value="" className="bg-gray-900">— Сонгох —</option>
                                            <option value="male" className="bg-gray-900">Эрэгтэй</option>
                                            <option value="female" className="bg-gray-900">Эмэгтэй</option>
                                            <option value="other" className="bg-gray-900">Бусад</option>
                                        </select>
                                    </div>
                                    <InputError message={errors.gender} />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">Төрсөн өдөр</label>
                                    <div className="input-glow flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all focus-within:border-emerald-500/60">
                                        <CalendarDays className="h-4 w-4 shrink-0 text-white/30" />
                                        <input type="date" value={data.date_of_birth}
                                            onChange={e => setData('date_of_birth', e.target.value)}
                                            max={new Date().toISOString().split('T')[0]}
                                            className="flex-1 bg-transparent text-sm text-white outline-none"
                                            style={{ colorScheme: 'dark' }}
                                        />
                                    </div>
                                    <InputError message={errors.date_of_birth} />
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">Утасны дугаар <span className="text-red-400">*</span></label>
                                <div className="input-glow flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 transition-all focus-within:border-emerald-500/60">
                                    <Phone className="h-4 w-4 shrink-0 text-white/30" />
                                    <input type="tel" value={data.phone} onChange={e => setData('phone', e.target.value)}
                                        placeholder="99112233" required
                                        className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20" />
                                </div>
                                <InputError message={errors.phone} />
                            </div>

                            {/* Address */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">Хаяг</label>
                                <div className="input-glow flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 transition-all focus-within:border-emerald-500/60">
                                    <MapPin className="h-4 w-4 shrink-0 text-white/30" />
                                    <input type="text" value={data.address} onChange={e => setData('address', e.target.value)}
                                        placeholder="Дүүрэг, хороо, байр..."
                                        className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20" />
                                </div>
                                <InputError message={errors.address} />
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">Имэйл хаяг <span className="text-red-400">*</span></label>
                                <div className="input-glow flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 transition-all focus-within:border-emerald-500/60">
                                    <Mail className="h-4 w-4 shrink-0 text-white/30" />
                                    <input type="email" value={data.email} onChange={e => setData('email', e.target.value)}
                                        placeholder="example@mail.com" required
                                        className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20" />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">Нууц үг <span className="text-red-400">*</span></label>
                                <div className="input-glow flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 transition-all focus-within:border-emerald-500/60">
                                    <Lock className="h-4 w-4 shrink-0 text-white/30" />
                                    <input type={showPw ? 'text' : 'password'} value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        placeholder="Хамгийн багадаа 8 тэмдэгт" required
                                        className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20" />
                                    <button type="button" onClick={() => setShowPw(v => !v)} className="text-white/30 hover:text-white/60">
                                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {/* Strength bar */}
                                {data.password.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-300 ${pwStrength.color} ${pwStrength.w}`} />
                                            </div>
                                            <span className="text-[11px] font-semibold text-white/50">{pwStrength.label}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1">
                                            {[
                                                { ok: pwChecks.length,    text: '8+ тэмдэгт' },
                                                { ok: pwChecks.uppercase, text: 'Том үсэг (A-Z)' },
                                                { ok: pwChecks.lowercase, text: 'Жижиг үсэг (a-z)' },
                                                { ok: pwChecks.number,    text: 'Тоо (0-9)' },
                                                { ok: pwChecks.symbol,    text: 'Тусгай тэмдэгт (!@#...)' },
                                            ].map(c => (
                                                <div key={c.text} className={`flex items-center gap-1.5 text-[11px] ${c.ok ? 'text-emerald-400' : 'text-white/30'}`}>
                                                    {c.ok ? <Check className="size-3 shrink-0" /> : <X className="size-3 shrink-0" />}
                                                    {c.text}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <InputError message={errors.password} />
                            </div>

                            {/* Confirm password */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">Нууц үг давтах <span className="text-red-400">*</span></label>
                                <div className="input-glow flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 transition-all focus-within:border-emerald-500/60">
                                    <Lock className="h-4 w-4 shrink-0 text-white/30" />
                                    <input type="password" value={data.password_confirmation}
                                        onChange={e => setData('password_confirmation', e.target.value)}
                                        placeholder="••••••••" required
                                        className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20" />
                                    {data.password_confirmation.length > 0 && (
                                        data.password === data.password_confirmation
                                            ? <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                            : <X className="h-4 w-4 text-red-400 shrink-0" />
                                    )}
                                </div>
                                <InputError message={errors.password_confirmation} />
                            </div>

                            {siteKey && (
                                <div className="space-y-1">
                                    <div ref={turnstileRef} />
                                    <InputError message={errors.turnstile_token} />
                                </div>
                            )}

                            <button type="submit" disabled={processing || (!!siteKey && !data.turnstile_token)}
                                className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-4 text-sm font-bold text-white transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' }}>
                                <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                                {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                {processing ? 'Бүртгэж байна...' : 'Бүртгүүлэх'}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-white/40">
                            Аль хэдийн бүртгэлтэй юу?{' '}
                            <Link href="/login" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                                Нэвтрэх
                            </Link>
                        </p>

                        <p className="mt-8 text-center text-xs text-white/20">
                            © {new Date().getFullYear()} {siteName}. Бүх эрх хуулиар хамгаалагдсан.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
