import { Head, useForm, usePage } from '@inertiajs/react';
import { Eye, EyeOff, LoaderCircle, Lock, Mail, Sparkles } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import InputError from '@/components/input-error';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status }: LoginProps) {
    const { props } = usePage<{ site_settings?: { site_logo?: string; site_name?: string } }>();
    const siteLogo = props.site_settings?.site_logo;
    const siteName = props.site_settings?.site_name ?? 'Кутикул';

    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <>
            <Head title="Нэвтрэх" />

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    33%       { transform: translateY(-18px) rotate(3deg); }
                    66%       { transform: translateY(-8px) rotate(-2deg); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50%       { transform: translateY(-22px) rotate(-4deg); }
                }
                @keyframes shimmer {
                    0%   { background-position: -200% center; }
                    100% { background-position:  200% center; }
                }
                @keyframes fade-up {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-down {
                    from { opacity: 0; transform: translateY(-16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes wave {
                    0%   { d: path("M0,40 C80,80 160,0 240,40 C320,80 400,0 480,40 L480,100 L0,100 Z"); }
                    50%  { d: path("M0,60 C80,20 160,80 240,60 C320,20 400,80 480,60 L480,100 L0,100 Z"); }
                    100% { d: path("M0,40 C80,80 160,0 240,40 C320,80 400,0 480,40 L480,100 L0,100 Z"); }
                }
                .animate-float   { animation: float  6s ease-in-out infinite; }
                .animate-float2  { animation: float2 8s ease-in-out infinite; }
                .animate-fade-up { animation: fade-up  0.6s ease forwards; }
                .animate-fade-down { animation: fade-down 0.5s ease forwards; }
                .shimmer-text {
                    background: linear-gradient(90deg, #fff 0%, #fda4af 40%, #fff 60%, #fda4af 100%);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: shimmer 4s linear infinite;
                }
                .glass-card {
                    background: rgba(255,255,255,0.04);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255,255,255,0.12);
                }
                .input-glow:focus-within {
                    box-shadow: 0 0 0 3px rgba(251,113,133,0.25);
                }
                input:-webkit-autofill,
                input:-webkit-autofill:hover,
                input:-webkit-autofill:focus {
                    -webkit-box-shadow: 0 0 0 1000px #1a1a2e inset !important;
                    -webkit-text-fill-color: #f1f5f9 !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
            `}</style>

            <div className="relative flex min-h-screen w-full overflow-hidden bg-[#0d0d1a]">

                {/* ── Left panel (desktop only) ── */}
                <div className="relative hidden w-[55%] flex-col overflow-hidden lg:flex"
                    style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #2d0a1e 40%, #1a0520 70%, #0d0d1a 100%)' }}>

                    <div className="absolute inset-0 opacity-[0.04]"
                        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

                    <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, #e11d48 0%, transparent 70%)' }} />
                    <div className="absolute -bottom-20 right-10 h-[400px] w-[400px] rounded-full opacity-15"
                        style={{ background: 'radial-gradient(circle, #9333ea 0%, transparent 70%)' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #f43f5e 0%, transparent 60%)' }} />

                    <div className="relative z-10 flex flex-1 flex-col items-start justify-center px-14 pb-20">

                        <div className="animate-float absolute right-16 top-24 glass-card rounded-2xl p-4 shadow-xl">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20">
                                    <span className="text-lg">✓</span>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-white">Захиалга баталгаажлаа</p>
                                    <p className="text-[10px] text-white/50">өнөөдөр 09:30</p>
                                </div>
                            </div>
                        </div>

                        <div className="animate-float2 absolute right-8 bottom-40 glass-card rounded-2xl p-4 shadow-xl">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20">
                                    <span className="text-lg">📅</span>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-white">12 шинэ захиалга</p>
                                    <p className="text-[10px] text-white/50">энэ долоо хоног</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-rose-400" />
                            <span className="text-xs font-medium text-rose-300">Удирдлагын систем</span>
                        </div>

                        <h1 className="mb-4 text-5xl font-black leading-tight tracking-tight text-white">
                            Тавтай <br />
                            <span className="shimmer-text">морилно уу</span>
                        </h1>

                        <p className="mb-10 max-w-sm text-base leading-relaxed text-white/50">
                            Кутикулын удирдлагын системд нэвтэрч
                            цаг захиалга, эмч нар болон бусад зүйлийг хянаарай.
                        </p>

                        <div className="flex gap-8">
                            {[
                                { num: '500+', label: 'Жилийн захиалга' },
                                { num: '20+',  label: 'Мэргэжилтэн эмч' },
                                { num: '99%',  label: 'Үйлчлүүлэгчид сэтгэл ханасан' },
                            ].map(s => (
                                <div key={s.label}>
                                    <p className="text-2xl font-black text-white">{s.num}</p>
                                    <p className="text-[11px] text-white/40">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-32"
                        style={{ background: 'linear-gradient(to top, rgba(13,13,26,0.8), transparent)' }} />
                </div>

                {/* ── Right panel ── */}
                <div className="flex flex-1 flex-col lg:items-center lg:justify-center lg:p-12"
                    style={{ background: 'linear-gradient(160deg, #111127 0%, #0d0d1a 100%)' }}>

                    <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 opacity-20"
                        style={{ background: 'radial-gradient(circle at top right, #e11d48, transparent 70%)' }} />

                    {/* ── Mobile header ── */}
                    <div className="relative overflow-hidden lg:hidden"
                        style={{ background: 'linear-gradient(135deg, #be123c 0%, #e11d48 50%, #9333ea 100%)' }}>

                        {/* decorative circles */}
                        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
                        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
                        <div className="absolute top-8 right-24 h-12 w-12 rounded-full bg-white/10" />

                        <div className="relative z-10 px-6 pb-10 pt-12">
                            {/* Logo row */}
                            <div className="mb-5 flex items-center gap-3 animate-fade-down">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm overflow-hidden">
                                    {siteLogo
                                        ? <img src={siteLogo} alt={siteName} className="h-9 w-9 object-contain" />
                                        : <svg viewBox="0 0 40 42" className="h-6 w-6 fill-white">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M17.2 5.63325L8.6 0.855469L0 5.63325V32.1434L16.2 41.1434L32.4 32.1434V23.699L40 19.4767V9.85547L31.4 5.07769L22.8 9.85547V18.2999L17.2 21.411V5.63325ZM38 18.2999L32.4 21.411V15.2545L38 12.1434V18.2999ZM36.9409 10.4439L31.4 13.5221L25.8591 10.4439L31.4 7.36561L36.9409 10.4439ZM24.8 18.2999V12.1434L30.4 15.2545V21.411L24.8 18.2999ZM23.8 20.0323L29.3409 23.1105L16.2 30.411L10.6591 27.3328L23.8 20.0323ZM7.6 27.9212L15.2 32.1434V38.2999L2 30.9666V7.92116L7.6 11.0323V27.9212ZM8.6 9.29991L3.05913 6.22165L8.6 3.14339L14.1409 6.22165L8.6 9.29991ZM30.4 24.8101L17.2 32.1434V38.2999L30.4 30.9666V24.8101ZM9.6 11.0323L15.2 7.92117V22.5221L9.6 25.6333V11.0323Z" />
                                          </svg>
                                    }
                                </div>
                                <div>
                                    <p className="text-lg font-black text-white leading-none">{siteName}</p>
                                    <p className="text-[11px] text-white/60 leading-none mt-0.5">Удирдлагын систем</p>
                                </div>
                            </div>

                            {/* Welcome text */}
                            <div className="animate-fade-down" style={{ animationDelay: '0.1s', opacity: 0 }}>
                                <h2 className="text-3xl font-black text-white leading-tight">
                                    Тавтай <br />морилно уу 👋
                                </h2>
                                <p className="mt-2 text-sm text-white/60">
                                    Системдээ нэвтэрч ажлаа эхлээрэй
                                </p>
                            </div>

                            {/* Stats row */}
                            <div className="mt-6 flex gap-5 animate-fade-down" style={{ animationDelay: '0.2s', opacity: 0 }}>
                                {[
                                    { num: '500+', label: 'Захиалга' },
                                    { num: '20+',  label: 'Эмч' },
                                    { num: '99%',  label: 'Сэтгэл ханасан' },
                                ].map(s => (
                                    <div key={s.label} className="flex flex-col">
                                        <span className="text-xl font-black text-white leading-none">{s.num}</span>
                                        <span className="text-[10px] text-white/50 mt-0.5">{s.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Wave bottom */}
                        <svg viewBox="0 0 480 40" className="block w-full -mb-px" preserveAspectRatio="none" style={{ fill: '#0d0d1a', height: 36 }}>
                            <path d="M0,20 C120,40 240,0 360,20 C400,28 440,16 480,20 L480,40 L0,40 Z" />
                        </svg>
                    </div>

                    {/* ── Form area ── */}
                    <div className="w-full max-w-md animate-fade-up px-5 py-7 lg:px-0 lg:py-0">

                        {/* Desktop logo */}
                        <div className="mb-8 hidden items-center gap-3 lg:flex">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden"
                                style={siteLogo ? {} : { background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}>
                                {siteLogo
                                    ? <img src={siteLogo} alt={siteName} className="h-9 w-9 object-contain" />
                                    : <svg viewBox="0 0 40 42" className="h-5 w-5 fill-white">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M17.2 5.63325L8.6 0.855469L0 5.63325V32.1434L16.2 41.1434L32.4 32.1434V23.699L40 19.4767V9.85547L31.4 5.07769L22.8 9.85547V18.2999L17.2 21.411V5.63325ZM38 18.2999L32.4 21.411V15.2545L38 12.1434V18.2999ZM36.9409 10.4439L31.4 13.5221L25.8591 10.4439L31.4 7.36561L36.9409 10.4439ZM24.8 18.2999V12.1434L30.4 15.2545V21.411L24.8 18.2999ZM23.8 20.0323L29.3409 23.1105L16.2 30.411L10.6591 27.3328L23.8 20.0323ZM7.6 27.9212L15.2 32.1434V38.2999L2 30.9666V7.92116L7.6 11.0323V27.9212ZM8.6 9.29991L3.05913 6.22165L8.6 3.14339L14.1409 6.22165L8.6 9.29991ZM30.4 24.8101L17.2 32.1434V38.2999L30.4 30.9666V24.8101ZM9.6 11.0323L15.2 7.92117V22.5221L9.6 25.6333V11.0323Z" />
                                      </svg>
                                }
                            </div>
                            <span className="text-base font-bold text-white">{siteName}</span>
                        </div>

                        {/* Desktop heading */}
                        <div className="mb-8 hidden lg:block">
                            <h2 className="text-3xl font-black text-white">Нэвтрэх</h2>
                            <p className="mt-1.5 text-sm text-white/40">
                                Имэйл болон нууц үгээ оруулна уу
                            </p>
                        </div>

                        {status && (
                            <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-400">
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-5">

                            {/* Email */}
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-widest text-white/40">
                                    Имэйл хаяг
                                </label>
                                <div className="input-glow flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 transition-all duration-200 focus-within:border-rose-500/60">
                                    <Mail className="h-4 w-4 shrink-0 text-white/30" />
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        autoFocus
                                        autoComplete="email"
                                        value={data.email}
                                        onChange={e => setData('email', e.target.value)}
                                        placeholder="admin@cuticul.mn"
                                        className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-widest text-white/40">
                                    Нууц үг
                                </label>
                                <div className="input-glow flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 transition-all duration-200 focus-within:border-rose-500/60">
                                    <Lock className="h-4 w-4 shrink-0 text-white/30" />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        autoComplete="current-password"
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                        className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                                    />
                                    <button type="button" onClick={() => setShowPassword(v => !v)}
                                        className="text-white/30 hover:text-white/60 transition-colors">
                                        {showPassword
                                            ? <EyeOff className="h-4 w-4" />
                                            : <Eye className="h-4 w-4" />
                                        }
                                    </button>
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            {/* Remember me */}
                            <label className="flex cursor-pointer items-center gap-3">
                                <div className="relative">
                                    <input type="checkbox" checked={data.remember}
                                        onChange={e => setData('remember', e.target.checked)}
                                        className="sr-only peer" />
                                    <div className="h-5 w-5 rounded-md border border-white/20 bg-white/5 transition-all peer-checked:border-rose-500 peer-checked:bg-rose-500 flex items-center justify-center">
                                        {data.remember && (
                                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <span className="text-sm text-white/50">Намайг сана</span>
                            </label>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-4 text-sm font-bold text-white transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/30 disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)' }}>
                                <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                                {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                {processing ? 'Нэвтэрж байна...' : 'Нэвтрэх'}
                            </button>

                        </form>

                        <p className="mt-8 text-center text-xs text-white/20">
                            © {new Date().getFullYear()} Кутикул. Бүх эрх хуулиар хамгаалагдсан.
                        </p>

                    </div>
                </div>

            </div>
        </>
    );
}
