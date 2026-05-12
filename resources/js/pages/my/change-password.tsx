import MyLayout from '@/layouts/my-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Shield } from 'lucide-react';
import { FormEvent, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR хэсэг', href: '/my/profile' },
    { title: 'Нууц үг солих', href: '/my/change-password' },
];

export default function MyChangePassword() {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const flash = props.flash;

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew,     setShowNew]     = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, post, processing, errors, reset, recentlySuccessful } = useForm({
        current_password:      '',
        password:              '',
        password_confirmation: '',
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post('/my/change-password', { onSuccess: () => reset() });
    }

    const showSuccess = recentlySuccessful || flash?.success;

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title="Нууц үг солих" />

            {/* ════ MOBILE ════ */}
            <div className="md:hidden min-h-full" style={{ background: 'var(--my-page-bg)', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' }}>

                {/* Red hero */}
                <div style={{ background: 'linear-gradient(160deg, #ef4444 0%, #dc2626 30%, #b91c1c 65%, #7f1d1d 100%)', paddingBottom: 32 }}>
                    {/* Back button */}
                    <div style={{ padding: '54px 20px 0' }}>
                        <button onClick={() => router.visit('/my/profile')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.22)', border: 'none', borderRadius: 20, padding: '7px 14px 7px 10px', cursor: 'pointer' }}>
                            <ArrowLeft style={{ width: 15, height: 15, color: '#fff' }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Буцах</span>
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 20px 0' }}>
                        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 6 }}>HR · АЮУЛГҮЙ БАЙДАЛ</p>
                            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.5px', margin: 0 }}>
                                Нууц үг <em style={{ fontStyle: 'italic', fontWeight: 900 }}>солих</em>
                            </h1>
                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8, marginBottom: 0 }}>Нэвтрэх нууц үгийг шинэчлэх</p>
                        </div>
                        <div style={{ width: 68, height: 68, borderRadius: 18, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
                            <Shield style={{ width: 30, height: 30, color: 'rgba(255,255,255,0.85)' }} />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '24px 16px 60px' }}>
                    {showSuccess && (
                        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, borderRadius: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px' }}>
                            <CheckCircle2 style={{ width: 18, height: 18, color: '#16a34a', flexShrink: 0 }} />
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#15803d', margin: 0 }}>Нууц үг амжилттай солигдлоо.</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ background: 'var(--my-card-bg)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--my-shadow)', marginBottom: 16 }}>
                            {/* Current */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderBottom: '1px solid var(--my-divider)' }}>
                                <KeyRound style={{ width: 16, height: 16, color: 'var(--my-faint)', flexShrink: 0 }} />
                                <div style={{ flex: 1, padding: '16px 0' }}>
                                    <p style={{ fontSize: 11, color: 'var(--my-faint)', marginBottom: 6, margin: '0 0 6px' }}>Одоогийн нууц үг</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type={showCurrent ? 'text' : 'password'}
                                            value={data.current_password}
                                            onChange={e => setData('current_password', e.target.value)}
                                            placeholder="••••••••"
                                            style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 15, color: 'var(--my-input-text)', outline: 'none' }} />
                                        <button type="button" onClick={() => setShowCurrent(v => !v)} style={{ color: '#9ca3af', padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
                                            {showCurrent ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                                        </button>
                                    </div>
                                    {errors.current_password && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6, marginBottom: 0 }}>{errors.current_password}</p>}
                                </div>
                            </div>

                            {/* New */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderBottom: '1px solid var(--my-divider)' }}>
                                <KeyRound style={{ width: 16, height: 16, color: 'var(--my-faint)', flexShrink: 0 }} />
                                <div style={{ flex: 1, padding: '16px 0' }}>
                                    <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: '0 0 6px' }}>Шинэ нууц үг</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type={showNew ? 'text' : 'password'}
                                            value={data.password}
                                            onChange={e => setData('password', e.target.value)}
                                            placeholder="Хамгийн багадаа 6 тэмдэгт"
                                            style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 15, color: 'var(--my-input-text)', outline: 'none' }} />
                                        <button type="button" onClick={() => setShowNew(v => !v)} style={{ color: '#9ca3af', padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
                                            {showNew ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                                        </button>
                                    </div>
                                    {errors.password && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6, marginBottom: 0 }}>{errors.password}</p>}
                                </div>
                            </div>

                            {/* Confirm */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
                                <KeyRound style={{ width: 16, height: 16, color: 'var(--my-faint)', flexShrink: 0 }} />
                                <div style={{ flex: 1, padding: '16px 0' }}>
                                    <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: '0 0 6px' }}>Нууц үг давтах</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type={showConfirm ? 'text' : 'password'}
                                            value={data.password_confirmation}
                                            onChange={e => setData('password_confirmation', e.target.value)}
                                            placeholder="••••••••"
                                            style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 15, color: 'var(--my-input-text)', outline: 'none' }} />
                                        <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ color: '#9ca3af', padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
                                            {showConfirm ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                                        </button>
                                    </div>
                                    {errors.password_confirmation && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6, marginBottom: 0 }}>{errors.password_confirmation}</p>}
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={processing}
                            className="active:scale-[0.98] transition-transform"
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 18, background: 'linear-gradient(135deg, #ef4444, #dc2626)', padding: '16px 0', fontSize: 15, fontWeight: 700, color: '#fff', border: 'none', boxShadow: '0 4px 14px rgba(220,38,38,0.35)', opacity: processing ? 0.6 : 1, cursor: processing ? 'not-allowed' : 'pointer' }}>
                            {processing
                                ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                : <Shield style={{ width: 18, height: 18 }} />}
                            Нууц үг солих
                        </button>
                    </form>
                </div>
            </div>

            {/* ════ DESKTOP ════ */}
            <div className="hidden md:flex h-full flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Нууц үг солих</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Нэвтрэх нууц үгийг шинэчлэх</p>
                </div>

                <div className="max-w-md">
                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                        <div className="border-b bg-muted/30 px-5 py-3 flex items-center gap-2">
                            <Shield className="size-4 text-muted-foreground" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Нууц үг солих</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {showSuccess && (
                                <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 px-4 py-3">
                                    <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Нууц үг амжилттай солигдлоо.</p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Одоогийн нууц үг</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                    <input type={showCurrent ? 'text' : 'password'} value={data.current_password}
                                        onChange={e => setData('current_password', e.target.value)} placeholder="••••••••"
                                        className="w-full rounded-xl border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                    <button type="button" onClick={() => setShowCurrent(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                        {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                                {errors.current_password && <p className="text-xs text-red-500">{errors.current_password}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Шинэ нууц үг</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                    <input type={showNew ? 'text' : 'password'} value={data.password}
                                        onChange={e => setData('password', e.target.value)} placeholder="Хамгийн багадаа 6 тэмдэгт"
                                        className="w-full rounded-xl border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                    <button type="button" onClick={() => setShowNew(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                        {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Нууц үг давтах</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                    <input type={showConfirm ? 'text' : 'password'} value={data.password_confirmation}
                                        onChange={e => setData('password_confirmation', e.target.value)} placeholder="••••••••"
                                        className="w-full rounded-xl border bg-background pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow" />
                                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                        {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                                {errors.password_confirmation && <p className="text-xs text-red-500">{errors.password_confirmation}</p>}
                            </div>

                            <button type="submit" disabled={processing}
                                className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
                                {processing
                                    ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    : <Shield className="size-4" />}
                                Нууц үг солих
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </MyLayout>
    );
}
