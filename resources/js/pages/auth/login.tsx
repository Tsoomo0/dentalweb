import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Eye, EyeOff, LoaderCircle, Lock, Mail } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import InputError from '@/components/input-error';

interface LoginForm { email: string; password: string; remember: boolean }
interface LoginProps { status?: string; canResetPassword: boolean }

/* fixed particle positions — no Math.random() to avoid SSR mismatch */
const PARTICLES = [
    { x: 8,  sz: 2.5, dr: 12, dl: 0.0, op: 0.45 },
    { x: 18, sz: 1.5, dr: 16, dl: 1.4, op: 0.30 },
    { x: 27, sz: 3.0, dr: 10, dl: 2.9, op: 0.50 },
    { x: 35, sz: 1.5, dr: 14, dl: 0.6, op: 0.35 },
    { x: 44, sz: 2.0, dr: 11, dl: 3.6, op: 0.40 },
    { x: 53, sz: 2.5, dr: 13, dl: 1.9, op: 0.35 },
    { x: 62, sz: 3.0, dr:  9, dl: 4.3, op: 0.50 },
    { x: 70, sz: 1.5, dr: 15, dl: 0.9, op: 0.28 },
    { x: 79, sz: 2.0, dr: 12, dl: 2.3, op: 0.38 },
    { x: 87, sz: 2.5, dr: 11, dl: 3.1, op: 0.42 },
    { x: 93, sz: 1.5, dr: 10, dl: 1.6, op: 0.32 },
    { x: 13, sz: 3.0, dr: 14, dl: 4.9, op: 0.45 },
    { x: 48, sz: 2.0, dr: 13, dl: 2.6, op: 0.35 },
    { x: 59, sz: 1.5, dr: 11, dl: 5.3, op: 0.28 },
    { x: 23, sz: 2.5, dr: 15, dl: 3.9, op: 0.40 },
    { x: 72, sz: 2.0, dr: 10, dl: 0.3, op: 0.33 },
    { x: 41, sz: 3.0, dr: 12, dl: 2.1, op: 0.48 },
    { x: 84, sz: 1.5, dr: 16, dl: 4.5, op: 0.27 },
];

export default function Login({ status }: LoginProps) {
    const { props } = usePage<{ site_settings?: { site_logo?: string; site_name?: string } }>();
    const siteLogo = props.site_settings?.site_logo;
    const siteName = props.site_settings?.site_name ?? 'Кутикул';

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '', password: '', remember: false,
    });
    const [showPw, setShowPw] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <>
            <Head title="Нэвтрэх" />

            <style>{`
                /* ── keyframes ── */
                @keyframes blob1 {
                    0%,100% { transform: translate(0,0)   scale(1);    }
                    30%     { transform: translate(60px,-40px) scale(1.12); }
                    65%     { transform: translate(-40px,30px) scale(0.92); }
                }
                @keyframes blob2 {
                    0%,100% { transform: translate(0,0)    scale(1);    }
                    40%     { transform: translate(-50px,35px) scale(1.1);  }
                    70%     { transform: translate(35px,-25px) scale(0.94); }
                }
                @keyframes blob3 {
                    0%,100% { transform: translate(0,0)   scale(1);   }
                    50%     { transform: translate(40px,40px) scale(1.08); }
                }
                @keyframes blob4 {
                    0%,100% { transform: translate(0,0)    scale(1);    }
                    45%     { transform: translate(-30px,-35px) scale(1.06); }
                }
                @keyframes particle-rise {
                    0%   { transform: translateY(0);   opacity: 0; }
                    10%  { opacity: 1; }
                    90%  { opacity: .6; }
                    100% { transform: translateY(-520px); opacity: 0; }
                }
                @keyframes spin-ring {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                @keyframes spin-ring-rev {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(-360deg); }
                }
                @keyframes logo-pulse {
                    0%,100% { box-shadow: 0 0 0 0 rgba(244,63,94,0.5); }
                    50%     { box-shadow: 0 0 0 18px rgba(244,63,94,0); }
                }
                @keyframes shimmer {
                    0%   { background-position: -300% center; }
                    100% { background-position:  300% center; }
                }
                @keyframes float-up {
                    0%,100% { transform: translateY(0px);  }
                    50%     { transform: translateY(-12px); }
                }
                @keyframes float-up2 {
                    0%,100% { transform: translateY(0px);  }
                    50%     { transform: translateY(-16px); }
                }
                @keyframes fade-up {
                    from { opacity:0; transform:translateY(24px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                @keyframes fade-down {
                    from { opacity:0; transform:translateY(-16px); }
                    to   { opacity:1; transform:translateY(0);     }
                }
                @keyframes card-in {
                    from { opacity:0; transform:translateY(32px) scale(.97); }
                    to   { opacity:1; transform:translateY(0)    scale(1);   }
                }
                @keyframes border-spin {
                    from { --angle: 0deg; }
                    to   { --angle: 360deg; }
                }
                @keyframes glow-pulse {
                    0%,100% { opacity:.5; }
                    50%     { opacity:1;  }
                }

                /* ── helpers ── */
                .blob-1 { animation: blob1 14s ease-in-out infinite; }
                .blob-2 { animation: blob2 18s ease-in-out infinite; }
                .blob-3 { animation: blob3 11s ease-in-out infinite; }
                .blob-4 { animation: blob4 16s ease-in-out infinite; }

                .ring-spin    { animation: spin-ring     22s linear infinite; }
                .ring-spin-r  { animation: spin-ring-rev 16s linear infinite; }
                .logo-pulse   { animation: logo-pulse 2.6s ease-out infinite; }

                .shimmer-text {
                    background: linear-gradient(90deg,#fff 0%,#fda4af 30%,#fff 55%,#fda4af 85%,#fff 100%);
                    background-size: 300% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: shimmer 5s linear infinite;
                }

                .float-card-1 { animation: float-up  5.5s ease-in-out infinite; }
                .float-card-2 { animation: float-up2 7.0s ease-in-out infinite; }

                .a0 { animation: fade-up 0.65s 0.00s ease both; }
                .a1 { animation: fade-up 0.65s 0.08s ease both; }
                .a2 { animation: fade-up 0.65s 0.16s ease both; }
                .a3 { animation: fade-up 0.65s 0.24s ease both; }
                .a4 { animation: fade-up 0.65s 0.32s ease both; }
                .a5 { animation: fade-up 0.65s 0.40s ease both; }
                .a6 { animation: fade-up 0.65s 0.48s ease both; }
                .card-appear { animation: card-in 0.7s 0.1s cubic-bezier(.22,.68,0,1.2) both; }

                .mob-d0 { animation: fade-down 0.55s 0.00s ease both; }
                .mob-d1 { animation: fade-down 0.55s 0.10s ease both; }
                .mob-d2 { animation: fade-down 0.55s 0.20s ease both; }

                .glass {
                    background: rgba(255,255,255,0.055);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255,255,255,0.11);
                }
                .glass-card {
                    background: rgba(255,255,255,0.04);
                    backdrop-filter: blur(28px);
                    -webkit-backdrop-filter: blur(28px);
                    border: 1px solid rgba(255,255,255,0.09);
                    box-shadow: 0 32px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07);
                }
                .input-wrap {
                    display: flex; align-items: center; gap: 12px;
                    border-radius: 14px; padding: 14px 16px;
                    background: rgba(255,255,255,0.045);
                    border: 1px solid rgba(255,255,255,0.09);
                    transition: border-color .2s, box-shadow .2s;
                }
                .input-wrap:focus-within {
                    border-color: rgba(244,63,94,0.55);
                    box-shadow: 0 0 0 3px rgba(244,63,94,0.18);
                }
                input:-webkit-autofill,
                input:-webkit-autofill:focus {
                    -webkit-box-shadow: 0 0 0 1000px #16050e inset !important;
                    -webkit-text-fill-color: #f5f0f2 !important;
                }
                .btn-main {
                    position:relative; width:100%; overflow:hidden;
                    border-radius:14px; padding:15px;
                    background: linear-gradient(135deg,#f43f5e 0%,#e11d48 50%,#be123c 100%);
                    box-shadow: 0 8px 32px rgba(244,63,94,0.40), 0 2px 8px rgba(244,63,94,0.25);
                    font-size:14px; font-weight:800; color:#fff; border:none; cursor:pointer;
                    transition: transform .15s, box-shadow .15s, opacity .15s;
                }
                .btn-main:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 12px 40px rgba(244,63,94,0.50), 0 4px 12px rgba(244,63,94,0.30);
                }
                .btn-main:active:not(:disabled) { transform:translateY(1px); }
                .btn-main:disabled { opacity:.55; cursor:not-allowed; }
                .btn-sweep {
                    position:absolute; inset:0;
                    background: linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent);
                    transform: translateX(-100%);
                    transition: transform .75s ease;
                }
                .btn-main:hover .btn-sweep { transform: translateX(100%); }

                .stat-num {
                    font-size:26px; font-weight:900; color:#fff; line-height:1;
                    text-shadow: 0 0 24px rgba(244,63,94,0.6);
                }
            `}</style>

            <div style={{ minHeight: '100svh', display: 'flex', background: '#080010', overflow: 'hidden', position: 'relative' }}>

                {/* ══════════════════════════════════════════
                    LEFT PANEL
                ══════════════════════════════════════════ */}
                <div className="relative hidden lg:flex lg:w-[56%] flex-col overflow-hidden"
                    style={{ background: 'linear-gradient(145deg,#1a0a2e 0%,#2d0a1e 45%,#1a0520 80%,#080010 100%)' }}>

                    {/* ── aurora blobs ── */}
                    <div className="blob-1 pointer-events-none absolute -top-48 -left-36 rounded-full opacity-30"
                        style={{ width:600, height:600, background:'radial-gradient(circle,#e11d48,transparent 68%)' }} />
                    <div className="blob-2 pointer-events-none absolute -bottom-40 -right-20 rounded-full opacity-22"
                        style={{ width:520, height:520, background:'radial-gradient(circle,#9333ea,transparent 65%)' }} />
                    <div className="blob-3 pointer-events-none absolute top-1/3 right-1/4 rounded-full opacity-15"
                        style={{ width:380, height:380, background:'radial-gradient(circle,#f43f5e,transparent 60%)' }} />
                    <div className="blob-4 pointer-events-none absolute bottom-1/4 left-1/3 rounded-full opacity-12"
                        style={{ width:280, height:280, background:'radial-gradient(circle,#c026d3,transparent 65%)' }} />

                    {/* ── grid overlay ── */}
                    <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
                        style={{ backgroundImage:'linear-gradient(rgba(255,255,255,.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.7) 1px,transparent 1px)', backgroundSize:'56px 56px' }} />

                    {/* ── rising particles ── */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        {PARTICLES.map((p, i) => (
                            <div key={i} style={{
                                position:'absolute', bottom:-10, left:`${p.x}%`,
                                width: p.sz, height: p.sz,
                                borderRadius:'50%',
                                background:'rgba(244,63,94,0.9)',
                                boxShadow:`0 0 ${p.sz*3}px rgba(244,63,94,0.8)`,
                                animation:`particle-rise ${p.dr}s ${p.dl}s ease-in infinite`,
                                opacity: p.op,
                            }} />
                        ))}
                    </div>

                    {/* ── floating notification cards ── */}
                    <div className="float-card-1 absolute right-10 top-20 glass rounded-2xl px-4 py-3.5 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl"
                                style={{ background:'rgba(34,197,94,0.2)', boxShadow:'0 0 12px rgba(34,197,94,0.3)' }}>
                                <span className="text-base">✓</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">Захиалга баталгаажлаа</p>
                                <p className="text-[10px] text-white/45 mt-0.5">өнөөдөр 09:30</p>
                            </div>
                        </div>
                    </div>

                    <div className="float-card-2 absolute right-6 bottom-40 glass rounded-2xl px-4 py-3.5 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl"
                                style={{ background:'rgba(244,63,94,0.2)', boxShadow:'0 0 12px rgba(244,63,94,0.3)' }}>
                                <span className="text-base">📅</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">12 шинэ захиалга</p>
                                <p className="text-[10px] text-white/45 mt-0.5">энэ долоо хоног</p>
                            </div>
                        </div>
                    </div>

                    {/* ── main content ── */}
                    <div className="relative z-10 flex flex-1 flex-col justify-center px-14 pb-16">

                        {/* logo with spinning rings */}
                        <div className="mb-10 relative w-fit">
                            {/* outer ring */}
                            <div className="ring-spin absolute -inset-4 rounded-full"
                                style={{ border:'1px dashed rgba(244,63,94,0.3)' }} />
                            {/* inner ring */}
                            <div className="ring-spin-r absolute -inset-2 rounded-full"
                                style={{ border:'1.5px solid rgba(244,63,94,0.2)' }} />

                            <div className="logo-pulse relative flex size-20 items-center justify-center rounded-2xl overflow-hidden"
                                style={{
                                    background: siteLogo ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg,#f43f5e,#be123c)',
                                    border:'2px solid rgba(255,255,255,0.18)',
                                    boxShadow:'0 0 40px rgba(244,63,94,0.4)',
                                }}>
                                {siteLogo
                                    ? <img src={siteLogo} alt={siteName} style={{ width:68, height:68, objectFit:'contain' }} />
                                    : <span style={{ fontSize:28, fontWeight:900, color:'#fff' }}>{siteName.charAt(0)}</span>
                                }
                            </div>
                        </div>

                        {/* name */}
                        <p style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.45)', letterSpacing:3, textTransform:'uppercase', marginBottom:12 }}>
                            {siteName}
                        </p>

                        <h1 style={{ fontSize:54, fontWeight:900, lineHeight:1.1, color:'#fff', marginBottom:16, letterSpacing:-1 }}>
                            Тавтай<br />
                            <span className="shimmer-text">морилно уу</span>
                        </h1>

                        <p style={{ fontSize:15, color:'rgba(255,255,255,0.42)', maxWidth:300, lineHeight:1.7, marginBottom:48 }}>
                            Цаг захиалга, эмч нар болон өвчтөнүүдийг хялбархан удирдаарай.
                        </p>

                        {/* stats */}
                        <div style={{ display:'flex', gap:40 }}>
                            {[
                                { num:'500+', label:'Жилийн захиалга' },
                                { num:'20+',  label:'Мэргэжилтэн эмч' },
                                { num:'99%',  label:'Сэтгэл ханасан'  },
                            ].map(s => (
                                <div key={s.label}>
                                    <p className="stat-num">{s.num}</p>
                                    <p style={{ fontSize:11, color:'rgba(255,255,255,0.32)', marginTop:4 }}>{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* bottom fade */}
                    <div className="pointer-events-none absolute bottom-0 inset-x-0 h-32"
                        style={{ background:'linear-gradient(to top,rgba(8,0,16,0.7),transparent)' }} />
                </div>

                {/* ══════════════════════════════════════════
                    RIGHT PANEL
                ══════════════════════════════════════════ */}
                <div className="flex flex-1 flex-col overflow-hidden"
                    style={{ background:'linear-gradient(160deg,#100820 0%,#080010 100%)' }}>

                    {/* glow top-right */}
                    <div className="pointer-events-none absolute right-0 top-0 opacity-20"
                        style={{ width:400, height:400, background:'radial-gradient(circle at top right,#e11d48,transparent 68%)' }} />

                    {/* ── Mobile hero ── */}
                    <div className="relative overflow-hidden lg:hidden"
                        style={{ background:'linear-gradient(135deg,#be123c 0%,#e11d48 55%,#9333ea 100%)' }}>

                        {/* particles mobile */}
                        <div className="pointer-events-none absolute inset-0 overflow-hidden">
                            {PARTICLES.slice(0,8).map((p,i) => (
                                <div key={i} style={{
                                    position:'absolute', bottom:-4, left:`${p.x}%`,
                                    width:p.sz, height:p.sz, borderRadius:'50%',
                                    background:'rgba(255,255,255,0.7)',
                                    animation:`particle-rise ${p.dr}s ${p.dl}s ease-in infinite`,
                                    opacity: p.op * 0.7,
                                }} />
                            ))}
                        </div>

                        {/* decorative circles */}
                        <div className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full"
                            style={{ background:'rgba(255,255,255,0.08)' }} />
                        <div className="pointer-events-none absolute -bottom-8 -left-8 size-28 rounded-full"
                            style={{ background:'rgba(255,255,255,0.07)' }} />

                        <div className="relative z-10 px-6 pb-10 pt-10">
                            <div className="mob-d0 mb-5 flex items-center gap-3">
                                <div className="logo-pulse flex size-14 items-center justify-center rounded-2xl overflow-hidden"
                                    style={{ background: siteLogo ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.25)', border:'2px solid rgba(255,255,255,0.35)', boxShadow:'0 4px 20px rgba(0,0,0,0.3)' }}>
                                    {siteLogo
                                        ? <img src={siteLogo} alt={siteName} style={{ width:48, height:48, objectFit:'contain' }} />
                                        : <span style={{ fontSize:20, fontWeight:900, color:'#fff' }}>{siteName.charAt(0)}</span>
                                    }
                                </div>
                                <div>
                                    <p style={{ fontSize:18, fontWeight:900, color:'#fff', lineHeight:1 }}>{siteName}</p>
                                    <p style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:2 }}>Шүдний эмнэлэг</p>
                                </div>
                            </div>

                            <div className="mob-d1">
                                <h2 style={{ fontSize:30, fontWeight:900, color:'#fff', lineHeight:1.2 }}>
                                    Тавтай морилно уу 👋
                                </h2>
                                <p style={{ marginTop:8, fontSize:13, color:'rgba(255,255,255,0.55)' }}>
                                    Нэвтэрч ажлаа эхлээрэй
                                </p>
                            </div>

                            <div className="mob-d2 flex gap-6 mt-6">
                                {[{num:'500+',label:'Захиалга'},{num:'20+',label:'Эмч'},{num:'99%',label:'Сэтгэл ханасан'}].map(s => (
                                    <div key={s.label}>
                                        <p style={{ fontSize:20, fontWeight:900, color:'#fff', lineHeight:1 }}>{s.num}</p>
                                        <p style={{ fontSize:10, color:'rgba(255,255,255,0.5)', marginTop:2 }}>{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <svg viewBox="0 0 480 36" style={{ display:'block', width:'100%', height:30, fill:'#100820', marginBottom:-1 }} preserveAspectRatio="none">
                            <path d="M0,18 C120,36 240,0 360,18 C420,28 460,10 480,18 L480,36 L0,36 Z" />
                        </svg>
                    </div>

                    {/* ── Form area ── */}
                    <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-8 lg:px-10">
                        <div className="card-appear w-full max-w-sm">

                            {/* Desktop logo + heading */}
                            <div className="hidden lg:block mb-8 a0">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex size-12 items-center justify-center rounded-xl overflow-hidden"
                                        style={{ background: siteLogo ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#f43f5e,#be123c)', border:'1px solid rgba(255,255,255,0.12)', boxShadow:'0 4px 16px rgba(244,63,94,0.25)' }}>
                                        {siteLogo
                                            ? <img src={siteLogo} alt={siteName} style={{ width:40, height:40, objectFit:'contain' }} />
                                            : <span style={{ fontSize:14, fontWeight:900, color:'#fff' }}>{siteName.charAt(0)}</span>
                                        }
                                    </div>
                                    <span style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.55)' }}>{siteName}</span>
                                </div>
                                <h2 style={{ fontSize:32, fontWeight:900, color:'#fff', lineHeight:1.1 }}>Нэвтрэх</h2>
                                <p style={{ marginTop:6, fontSize:13, color:'rgba(255,255,255,0.32)' }}>
                                    Имэйл болон нууц үгээ оруулна уу
                                </p>
                            </div>

                            {status && (
                                <div className="mb-5 a0 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-400">
                                    {status}
                                </div>
                            )}

                            <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>

                                {/* Email */}
                                <div className="a1">
                                    <label htmlFor="email" style={{ display:'block', marginBottom:6, fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.32)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                                        Имэйл хаяг
                                    </label>
                                    <div className="input-wrap">
                                        <Mail style={{ width:16, height:16, flexShrink:0, color:'rgba(255,255,255,0.28)' }} />
                                        <input
                                            id="email" type="email" required autoFocus autoComplete="email"
                                            value={data.email} onChange={e => setData('email', e.target.value)}
                                            placeholder="example@email.com"
                                            style={{ flex:1, background:'transparent', fontSize:14, color:'#f0eaf0', outline:'none', border:'none' }}
                                        />
                                    </div>
                                    <InputError message={errors.email} />
                                </div>

                                {/* Password */}
                                <div className="a2">
                                    <label htmlFor="password" style={{ display:'block', marginBottom:6, fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.32)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                                        Нууц үг
                                    </label>
                                    <div className="input-wrap">
                                        <Lock style={{ width:16, height:16, flexShrink:0, color:'rgba(255,255,255,0.28)' }} />
                                        <input
                                            id="password" type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                                            value={data.password} onChange={e => setData('password', e.target.value)}
                                            placeholder="••••••••"
                                            style={{ flex:1, background:'transparent', fontSize:14, color:'#f0eaf0', outline:'none', border:'none' }}
                                        />
                                        <button type="button" onClick={() => setShowPw(v => !v)}
                                            style={{ color:'rgba(255,255,255,0.28)', cursor:'pointer', background:'none', border:'none', padding:0, transition:'color .2s' }}
                                            onMouseEnter={e => (e.currentTarget.style.color='rgba(255,255,255,0.65)')}
                                            onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.28)')}>
                                            {showPw ? <EyeOff style={{ width:16, height:16 }} /> : <Eye style={{ width:16, height:16 }} />}
                                        </button>
                                    </div>
                                    <InputError message={errors.password} />
                                </div>

                                {/* Remember */}
                                <div className="a3">
                                    <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                                        <div style={{
                                            width:18, height:18, borderRadius:6, flexShrink:0,
                                            display:'flex', alignItems:'center', justifyContent:'center',
                                            border: `1.5px solid ${data.remember ? '#f43f5e' : 'rgba(255,255,255,0.18)'}`,
                                            background: data.remember ? '#f43f5e' : 'rgba(255,255,255,0.05)',
                                            transition:'all .18s',
                                        }}>
                                            <input type="checkbox" checked={data.remember}
                                                onChange={e => setData('remember', e.target.checked as false)}
                                                style={{ position:'absolute', opacity:0, width:0, height:0 }} />
                                            {data.remember && (
                                                <svg style={{ width:10, height:10, color:'#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <span style={{ fontSize:13, color:'rgba(255,255,255,0.38)' }}>Намайг сана</span>
                                    </label>
                                </div>

                                {/* Submit */}
                                <div className="a4" style={{ paddingTop:4 }}>
                                    <button type="submit" disabled={processing} className="btn-main">
                                        <span className="btn-sweep" />
                                        <span style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                                            {processing && <LoaderCircle style={{ width:16, height:16 }} className="animate-spin" />}
                                            {processing ? 'Нэвтэрж байна...' : 'Нэвтрэх'}
                                        </span>
                                    </button>
                                </div>

                            </form>

                            {/* Register box */}
                            <div className="a5" style={{ marginTop:24, borderRadius:18, padding:16, textAlign:'center', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                                {siteLogo && (
                                    <img src={siteLogo} alt={siteName} style={{ width:28, height:28, objectFit:'contain', display:'block', margin:'0 auto 10px', opacity:.5 }} />
                                )}
                                <p style={{ fontSize:13, color:'rgba(255,255,255,0.36)' }}>
                                    Үйлчлүүлэгч бүртгүүлэх үү?{' '}
                                    <Link href="/patient/register"
                                        style={{ fontWeight:700, color:'#fb7185', textDecoration:'none', transition:'color .2s' }}
                                        onMouseEnter={e => (e.currentTarget.style.color='#fda4af')}
                                        onMouseLeave={e => (e.currentTarget.style.color='#fb7185')}>
                                        Бүртгүүлэх
                                    </Link>
                                </p>
                            </div>

                            <p className="a6" style={{ marginTop:20, textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.15)' }}>
                                © {new Date().getFullYear()} {siteName}. Бүх эрх хамгаалагдсан.
                            </p>

                        </div>
                    </div>
                </div>

            </div>
        </>
    );
}
