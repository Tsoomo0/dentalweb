import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, Lock, Mail } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type FormEventHandler } from 'react';
import HeroGraphic from '@/components/public/hero-graphic';
import InputError from '@/components/input-error';

interface LoginProps { status?: string; canResetPassword?: boolean }

/* талбар тус бүрийн гарч ирэх дараалал */
const d = (i: number): CSSProperties => ({ '--d': `${i * 80}ms` } as CSSProperties);

/* Ажилтны нэвтрэх хуудас тул систем/аюулгүй байдлын мэдээлэл */
const STATS = [
    { num: 'SSL', label: 'шифрлэгдсэн холболт' },
    { num: '24/7', label: 'техникийн дэмжлэг' },
    { num: 'Авто', label: 'өдөр бүр нөөцлөлт' },
];

export default function Login({ status, canResetPassword = true }: LoginProps) {
    const { props } = usePage<{ site_settings?: { site_logo?: string; site_name?: string } }>();
    const siteLogo = props.site_settings?.site_logo;
    const siteName = props.site_settings?.site_name ?? 'Кутикул';

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '', password: '', remember: false,
    });
    const [showPw, setShowPw] = useState(false);

    /* SVG-ийн зурагдах анимэйшнийг асаана (.alh-anim) */
    const artRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const el = artRef.current;
        if (!el) return;
        el.classList.remove('alh-anim');
        void el.offsetWidth;
        el.classList.add('alh-anim');
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <>
            <Head title="Нэвтрэх" />

            <div className="lg">
                {/* ═══ ЗҮҮН — МАЯГТ ══════════════════════════════════════════ */}
                <div className="lg-form">
                    <div className="lg-inner">
                        {/* брэнд */}
                        <Link href="/" className="lg-brand" style={d(0)}>
                            {siteLogo
                                ? <img src={siteLogo} alt={siteName} />
                                : <span className="lg-brand-k">К</span>}
                            <span>
                                <b>{siteName}</b>
                                <i>Шүдний эмнэлэг</i>
                            </span>
                        </Link>

                        <p className="lg-eyebrow" style={d(1)}><i />НЭВТРЭХ</p>
                        <h1 className="lg-title" style={d(2)}>
                            <span><b>Тавтай морилно уу<em>.</em></b></span>
                        </h1>
                        <p className="lg-lead" style={d(3)}>
                            Ажилтны бүртгэлээрээ нэвтэрч, өөрийн хэсэгт нэвтэрнэ үү.
                        </p>

                        {status && <div className="lg-note" style={d(4)}>{status}</div>}

                        <form onSubmit={submit} className="lg-fields">
                            <div style={d(5)}>
                                <label htmlFor="email" className="lg-lb">Имэйл хаяг</label>
                                <div className="lg-wrap">
                                    <Mail className="lg-ic" />
                                    <input
                                        id="email" type="email" required autoFocus autoComplete="email"
                                        value={data.email} onChange={(e) => setData('email', e.target.value)}
                                        placeholder="example@email.com"
                                        aria-invalid={!!errors.email}
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <div style={d(6)}>
                                <div className="lg-lb-row">
                                    <label htmlFor="password" className="lg-lb">Нууц үг</label>
                                    {canResetPassword && (
                                        <Link href={route('password.request')} className="lg-forgot">Нууц үг мартсан?</Link>
                                    )}
                                </div>
                                <div className="lg-wrap">
                                    <Lock className="lg-ic" />
                                    <input
                                        id="password" type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                                        value={data.password} onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                        aria-invalid={!!errors.password}
                                    />
                                    <button type="button" className="lg-eye" onClick={() => setShowPw((v) => !v)}
                                        aria-label={showPw ? 'Нууц үгийг нуух' : 'Нууц үгийг харуулах'}>
                                        {showPw ? <EyeOff /> : <Eye />}
                                    </button>
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            <label className="lg-check" style={d(7)}>
                                <input type="checkbox" checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked as false)} />
                                <span className="lg-box">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </span>
                                Намайг сана
                            </label>

                            <button type="submit" disabled={processing} className="lg-btn" style={d(8)}>
                                {/* текстийг span-д ороов — эс тэгвээс hover үеийн улаан
                                    давхарга (::before) нь голын текстийг далдална */}
                                <span className="lg-btn-in">
                                    {processing
                                        ? <><LoaderCircle className="lg-spin" /> Нэвтэрч байна…</>
                                        : <>Нэвтрэх <ArrowRight className="lg-arrow" /></>}
                                </span>
                            </button>
                        </form>

                        <p className="lg-alt" style={d(9)}>
                            Үйлчлүүлэгч бүртгүүлэх үү?{' '}
                            <Link href="/patient/register">Бүртгүүлэх</Link>
                        </p>

                        <p className="lg-copy" style={d(10)}>
                            © {new Date().getFullYear()} {siteName}. Бүх эрх хуулиар хамгаалагдсан.
                        </p>
                    </div>
                </div>

                {/* ═══ БАРУУН — ХАР ГРАФИК САМБАР ═══════════════════════════ */}
                <div className="lg-art" ref={artRef}>
                    <div className="lg-grid" aria-hidden="true" />
                    <div className="lg-glow" aria-hidden="true" />

                    <div className="lg-gfx">
                        <HeroGraphic figure="tooth" />
                    </div>

                    {/* сканерын туяа */}
                    <div className="lg-scanwrap" aria-hidden="true">
                        <div className="lg-scanlines" />
                        <div className="lg-beam" />
                    </div>

                    {/* HUD — сканерын мэдээллийн давхарга */}
                    <div className="lg-hud" aria-hidden="true">
                        <div className="lg-hud-top">
                            <span>SCAN · 01</span>
                            <span className="lg-hud-live"><i />ХОЛБОЛТ ХАМГААЛАГДСАН</span>
                        </div>
                        <div className="lg-frame">
                            <b /><b /><b /><b />
                            <em>ACCESS</em>
                        </div>
                        <div className="lg-vlabel">{siteName.toUpperCase()} · ДОТООД СИСТЕМ</div>
                    </div>

                    <div className="lg-art-foot">
                        <p className="lg-art-t">
                            <i className="lg-dot" aria-hidden="true" />
                            Систем хэвийн ажиллаж байна
                        </p>
                        <div className="lg-art-stats">
                            {STATS.map((s) => (
                                <div key={s.label}>
                                    <b>{s.num}</b>
                                    <span>{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
