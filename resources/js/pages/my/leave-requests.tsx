import MyLayout from '@/layouts/my-layout';
import { ChatIcon } from '@/components/chat-icon';
import { NotificationBell } from '@/components/notification-bell';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    CalendarDays, CheckCircle2,
    Clock, Plus, Send, X, XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const RED  = '#dc2626';
const RED2 = '#b91c1c';
const RED3 = '#7f1d1d';

interface LeaveRequest {
    id: number;
    start_date: string; end_date: string; days: number;
    leave_type: string; reason: string;
    replacement: string | null;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null;
    reviewed_at: string | null;
    created_at: string;
}
interface Employee { id: number; name: string; position: string | null; branch: string | null; initials: string; photo_url: string | null }
interface Replacement { id: number; name: string }
interface Props {
    employee: Employee;
    requests: LeaveRequest[];
    replacements: Replacement[];
}

const LEAVE_TYPES: Record<string, string> = {
    sick: 'Өвчтэй', personal: 'Хувийн',
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Чөлөөний хүсэлт', href: '/my/leave-requests' },
];

function StatusBadge({ status }: { status: string }) {
    if (status === 'approved') return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
            <CheckCircle2 className="size-3" /> Зөвшөөрсөн
        </span>
    );
    if (status === 'rejected') return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
            <XCircle className="size-3" /> Цуцалсан
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <Clock className="size-3" /> Хүлээгдэж байна
        </span>
    );
}

const INP = 'w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-shadow';

export default function MyLeaveRequests({ employee, requests, replacements }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

    useEffect(() => {
        const timer = setInterval(() => {
            router.reload({ only: ['requests'] });
        }, 15_000);
        return () => clearInterval(timer);
    }, []);

    const { data, setData, post, processing, errors, reset } = useForm({
        start_date: '', end_date: '', leave_type: 'sick',
        reason: '', replacement_employee_id: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/my/leave-requests', { onSuccess: () => { reset(); setShowForm(false); } });
    }

    const pending  = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title="Чөлөөний хүсэлт" />

            {/* ════════════════ MOBILE ════════════════ */}
            <div className="md:hidden" style={{ flex: 1, background: 'var(--my-page-bg)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' } as React.CSSProperties}>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

                {/* ═══ RED HERO ══════════════════════════════════════════════ */}
                <div style={{ background: `linear-gradient(160deg, #ef4444 0%, ${RED} 30%, ${RED2} 65%, ${RED3} 100%)`, position: 'relative', overflow: 'hidden' }}>
                    {/* Decorative circles */}
                    <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -60, right: -60, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: 40, right: 40, pointerEvents: 'none' }} />

                    {/* Top bar — home-тэй адил */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 0', gap: 10, position: 'relative' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, flex: 1, letterSpacing: 0.3 }}>
                            HR · ЧӨЛӨӨНИЙ ХҮСЭЛТ
                        </span>
                        <ChatIcon variant="ghost" />
                        <NotificationBell variant="ghost" />
                        <Link href="/my/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {employee.photo_url
                                    ? <img src={employee.photo_url} alt={employee.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                                    : <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{employee.initials}</span>
                                }
                            </div>
                        </Link>
                    </div>

                    {/* Title */}
                    <div style={{ padding: '14px 18px 16px', position: 'relative' }}>
                        <h1 style={{ margin: '0 0 5px', lineHeight: 1.1, letterSpacing: -0.8 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>Чөлөө </span>
                            <span style={{ fontSize: 28, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontFamily: 'Georgia, "Times New Roman", serif' }}>хүсэх</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0, fontWeight: 500 }}>
                            {employee.name}{employee.position ? ` · ${employee.position}` : ''}
                        </p>
                    </div>

                    {/* Tab strip */}
                    <div style={{ display: 'flex', padding: '0 12px 14px', gap: 6 }}>
                        {([{ key: 'new', label: 'Шинэ хүсэлт' }, { key: 'history', label: 'Түүх' }] as const).map(tab => {
                            const isActive = activeTab === tab.key;
                            return (
                                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                                    style={{
                                        flex: 1, padding: '10px 8px', borderRadius: 14, border: 'none', cursor: 'pointer',
                                        background: isActive ? 'white' : 'rgba(255,255,255,0.15)',
                                        color: isActive ? RED : 'rgba(255,255,255,0.75)',
                                        fontSize: 13, fontWeight: 800,
                                        transition: 'all 0.18s',
                                    }}>
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ═══ CONTENT AREA ══════════════════════════════════════════ */}
                <div style={{ padding: '12px 14px' }}>

                    {/* ── Шинэ хүсэлт ── */}
                    {activeTab === 'new' && (
                        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                            {/* Leave type card */}
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--my-divider)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: RED }} />
                                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--my-muted)', letterSpacing: 0.5 }}>ЧӨЛӨӨНИЙ ТӨРӨЛ</span>
                                </div>
                                <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {Object.entries(LEAVE_TYPES).map(([key, label]) => {
                                        const sel = data.leave_type === key;
                                        return (
                                            <button key={key} type="button" onClick={() => setData('leave_type', key)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px',
                                                    borderRadius: 16, border: 'none', cursor: 'pointer', textAlign: 'left',
                                                    background: sel ? `linear-gradient(135deg, #fca5a5, ${RED})` : 'var(--my-pill-bg)',
                                                    transition: 'all 0.15s',
                                                }}>
                                                <div style={{
                                                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                                    border: sel ? 'none' : '2px solid #d1d1d6',
                                                    background: sel ? 'rgba(255,255,255,0.3)' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    {sel && (
                                                        <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                                                            <path d="M1 4L3.8 7L10 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 15, fontWeight: 700, color: sel ? 'white' : 'var(--my-text)', margin: 0 }}>{label}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Date card */}
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--my-divider)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
                                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--my-muted)', letterSpacing: 0.5 }}>ХУГАЦАА</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', padding: '14px 18px' }}>
                                    <div>
                                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Эхлэх</p>
                                        <input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)}
                                            style={{ fontSize: 15, fontWeight: 800, color: 'var(--my-input-text)', border: 'none', outline: 'none', background: 'transparent', width: '100%', padding: 0 }} />
                                        {errors.start_date && <p style={{ fontSize: 10, color: RED, margin: '4px 0 0' }}>{errors.start_date}</p>}
                                    </div>
                                    <span style={{ fontSize: 20, color: '#ddd', fontWeight: 300 }}>—</span>
                                    <div>
                                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Дуусах</p>
                                        <input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)}
                                            style={{ fontSize: 15, fontWeight: 800, color: 'var(--my-input-text)', border: 'none', outline: 'none', background: 'transparent', width: '100%', padding: 0 }} />
                                        {errors.end_date && <p style={{ fontSize: 10, color: RED, margin: '4px 0 0' }}>{errors.end_date}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Reason card */}
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--my-divider)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1' }} />
                                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--my-muted)', letterSpacing: 0.5 }}>ШАЛТГААН</span>
                                </div>
                                <div style={{ padding: '12px 18px 14px' }}>
                                    <textarea value={data.reason} onChange={e => setData('reason', e.target.value)}
                                        rows={4} placeholder="Дэлгэрэнгүй бичнэ үү..."
                                        style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--my-input-text)', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6, padding: 0, boxSizing: 'border-box' } as React.CSSProperties} />
                                    {errors.reason && <p style={{ fontSize: 10, color: RED, margin: '4px 0 0' }}>{errors.reason}</p>}
                                </div>
                            </div>

                            {/* Submit — same style as payroll card in home */}
                            <button type="submit" disabled={processing}
                                style={{
                                    width: '100%', border: 'none', borderRadius: 22, padding: '18px 20px', marginBottom: 24,
                                    background: processing ? '#999' : `linear-gradient(135deg, ${RED2}, ${RED3})`,
                                    boxShadow: processing ? 'none' : `0 8px 28px ${RED}40`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                                    cursor: processing ? 'not-allowed' : 'pointer',
                                }}>
                                {processing
                                    ? <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                                    : <Send size={18} color="white" />}
                                <span style={{ fontSize: 16, fontWeight: 900, color: 'white' }}>Хүсэлт илгээх</span>
                            </button>
                        </form>
                    )}

                    {/* ── Түүх ── */}
                    {activeTab === 'history' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 24 }}>
                            {/* Mini stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                {[
                                    { label: 'Нийт',       value: requests.length, color: '#111',    bg: '#f8fafc' },
                                    { label: 'Хүлээгдэж', value: pending,          color: '#d97706', bg: '#fffbeb' },
                                    { label: 'Зөвшөөрсөн', value: approved,        color: '#16a34a', bg: '#f0fdf4' },
                                ].map(s => (
                                    <div key={s.label} style={{ background: 'var(--my-card-bg)', borderRadius: 20, padding: '14px 12px', boxShadow: 'var(--my-shadow)' }}>
                                        <p style={{ fontSize: 26, fontWeight: 900, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
                                        <p style={{ fontSize: 9, color: 'var(--my-faint)', margin: '4px 0 0', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {requests.length === 0 ? (
                                <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, padding: '48px 20px', textAlign: 'center', boxShadow: 'var(--my-shadow)' }}>
                                    <div style={{ width: 56, height: 56, borderRadius: 18, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                        <CalendarDays size={26} color="#fca5a5" />
                                    </div>
                                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-muted)', margin: '0 0 4px' }}>Хүсэлт байхгүй</p>
                                    <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0 }}>Шинэ хүсэлт дарж чөлөө хүсэнэ үү</p>
                                </div>
                            ) : (
                                requests.map(r => {
                                    const sColor = r.status === 'approved' ? '#16a34a' : r.status === 'rejected' ? RED : '#d97706';
                                    const sBg    = r.status === 'approved' ? '#f0fdf4' : r.status === 'rejected' ? '#fef2f2' : '#fffbeb';
                                    const sLabel = r.status === 'approved' ? 'Зөвшөөрсөн' : r.status === 'rejected' ? 'Цуцалсан' : 'Хүлээгдэж';
                                    const SIcon  = r.status === 'approved' ? CheckCircle2 : r.status === 'rejected' ? XCircle : Clock;
                                    return (
                                        <div key={r.id} style={{ background: 'var(--my-card-bg)', borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                            <div style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--my-divider)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 42, height: 42, borderRadius: 13, background: sBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <SIcon size={19} color={sColor} />
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--my-input-text)', margin: 0 }}>{r.start_date} → {r.end_date}</p>
                                                        <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: '2px 0 0' }}>{r.days} өдөр · {LEAVE_TYPES[r.leave_type] ?? r.leave_type}</p>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: sColor, background: sBg, borderRadius: 99, padding: '4px 10px', flexShrink: 0, marginLeft: 8 }}>
                                                    {sLabel}
                                                </span>
                                            </div>
                                            <div style={{ padding: '12px 18px 14px' }}>
                                                <p style={{ fontSize: 13, color: 'var(--my-muted)', margin: 0, lineHeight: 1.55 }}>{r.reason}</p>
                                                {r.status === 'rejected' && r.rejection_reason && (
                                                    <div style={{ marginTop: 8, background: '#fef2f2', borderRadius: 10, padding: '8px 12px' }}>
                                                        <p style={{ fontSize: 11, color: RED, margin: 0 }}>{r.rejection_reason}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ════════════════ DESKTOP ════════════════ */}
            <div className="hidden md:flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Чөлөөний хүсэлт</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{employee.name} · {employee.position}</p>
                    </div>
                    <button onClick={() => setShowForm(v => !v)}
                        className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors">
                        <Plus className="size-4" /> Чөлөө хүсэх
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Нийт хүсэлт',    value: requests.length, color: 'text-foreground' },
                        { label: 'Хүлээгдэж буй',   value: pending,          color: 'text-amber-500' },
                        { label: 'Зөвшөөрсөн',      value: approved,         color: 'text-green-500' },
                    ].map(s => (
                        <div key={s.label} className="rounded-2xl border bg-card shadow-sm px-5 py-4">
                            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>

                {showForm && (
                    <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/10 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-red-200/60 dark:border-red-900">
                            <p className="font-bold text-foreground">Шинэ чөлөөний хүсэлт</p>
                            <button onClick={() => { setShowForm(false); reset(); }}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>
                        <form onSubmit={submit} className="p-6 grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Эхлэх огноо *</label>
                                <input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-400" />
                                {errors.start_date && <p className="mt-1 text-xs text-red-500">{errors.start_date}</p>}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Дуусах огноо *</label>
                                <input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-400" />
                                {errors.end_date && <p className="mt-1 text-xs text-red-500">{errors.end_date}</p>}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Чөлөөний төрөл *</label>
                                <select value={data.leave_type} onChange={e => setData('leave_type', e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-400">
                                    {Object.entries(LEAVE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Орлох ажилтан <span className="font-normal text-muted-foreground/60">(заавал биш)</span></label>
                                <select value={data.replacement_employee_id} onChange={e => setData('replacement_employee_id', e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-400">
                                    <option value="">Сонгоогүй</option>
                                    {replacements.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Шалтгаан *</label>
                                <textarea value={data.reason} onChange={e => setData('reason', e.target.value)}
                                    rows={3} placeholder="Чөлөө хүсэх шалтгаанаа дэлгэрэнгүй бичнэ үү..."
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
                                {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason}</p>}
                            </div>
                            <div className="col-span-2 flex justify-end">
                                <button type="submit" disabled={processing}
                                    className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                                    {processing ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Send className="size-4" />}
                                    Хүсэлт илгээх
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className="border-b bg-muted/30 px-6 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Хүсэлтийн түүх</p>
                    </div>
                    {requests.length === 0 ? (
                        <div className="py-14 text-center text-sm text-muted-foreground">Чөлөөний хүсэлт байхгүй байна</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50 text-xs text-muted-foreground">
                                    <th className="px-6 py-3 text-left font-semibold">Огноо</th>
                                    <th className="px-4 py-3 text-left font-semibold">Өдөр</th>
                                    <th className="px-4 py-3 text-left font-semibold">Төрөл</th>
                                    <th className="px-4 py-3 text-left font-semibold">Шалтгаан</th>
                                    <th className="px-4 py-3 text-left font-semibold">Орлох</th>
                                    <th className="px-4 py-3 text-left font-semibold">Статус</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {requests.map(r => (
                                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-3 text-foreground whitespace-nowrap">{r.start_date} → {r.end_date}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{r.days}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{LEAVE_TYPES[r.leave_type] ?? r.leave_type}</td>
                                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{r.reason}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{r.replacement ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <StatusBadge status={r.status} />
                                                {r.status === 'rejected' && r.rejection_reason && (
                                                    <p className="mt-1 text-xs text-red-500">{r.rejection_reason}</p>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </MyLayout>
    );
}
