import MyLayout from '@/layouts/my-layout';
import { ChatIcon } from '@/components/chat-icon';
import { NotificationBell } from '@/components/notification-bell';
import { MyCard, MyDesktop, MyEmpty, MyHeader, MyPill, MyStat, MyTabs, myBtn, myInput, myTable } from '@/components/my/page-kit';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    CalendarDays, CheckCircle2,
    Clock, History, Plus, Send, XCircle,
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
    makeup_date: string | null; makeup_note: string | null;
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

function LeaveStatus({ status }: { status: string }) {
    if (status === 'approved') return <MyPill tone="emerald" icon={CheckCircle2}>Зөвшөөрсөн</MyPill>;
    if (status === 'rejected') return <MyPill tone="rose" icon={XCircle}>Татгалзсан</MyPill>;
    return <MyPill tone="amber" icon={Clock}>Хүлээгдэж байна</MyPill>;
}


export default function MyLeaveRequests({ employee, requests, replacements }: Props) {
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
        makeup_date: '', makeup_note: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/my/leave-requests', { onSuccess: () => reset() });
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

                            {/* Replacement employee card */}
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--my-divider)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#0ea5e9' }} />
                                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--my-muted)', letterSpacing: 0.5 }}>ОРЛОХ АЖИЛТАН</span>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--my-faint)', marginLeft: 'auto' }}>(заавал биш)</span>
                                </div>
                                <div style={{ padding: '12px 18px 14px' }}>
                                    <select value={data.replacement_employee_id ?? ''} onChange={e => setData('replacement_employee_id', e.target.value)}
                                        style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, fontWeight: 600, color: 'var(--my-input-text)', padding: '4px 0', fontFamily: 'inherit', appearance: 'auto' } as React.CSSProperties}>
                                        <option value="">— Сонгоогүй —</option>
                                        {replacements.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
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

                            {/* Makeup day card */}
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--my-divider)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
                                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--my-muted)', letterSpacing: 0.5 }}>НӨХӨЖ АЖИЛЛАХ ӨДӨР</span>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--my-faint)', marginLeft: 'auto' }}>(заавал биш)</span>
                                </div>
                                <div style={{ padding: '14px 18px' }}>
                                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Огноо</p>
                                    <input type="date" value={data.makeup_date} onChange={e => setData('makeup_date', e.target.value)}
                                        style={{ fontSize: 15, fontWeight: 800, color: 'var(--my-input-text)', border: 'none', outline: 'none', background: 'transparent', width: '100%', padding: 0 }} />
                                    {errors.makeup_date && <p style={{ fontSize: 10, color: RED, margin: '4px 0 0' }}>{errors.makeup_date}</p>}
                                    <div style={{ height: 1, background: 'var(--my-divider)', margin: '12px 0' }} />
                                    <textarea value={data.makeup_note} onChange={e => setData('makeup_note', e.target.value)}
                                        rows={2} placeholder="Тайлбар..."
                                        style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--my-input-text)', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6, padding: 0, boxSizing: 'border-box' } as React.CSSProperties} />
                                    {errors.makeup_note && <p style={{ fontSize: 10, color: RED, margin: '4px 0 0' }}>{errors.makeup_note}</p>}
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
                                                {r.makeup_date && (
                                                    <div style={{ marginTop: 8, background: '#fffbeb', borderRadius: 10, padding: '8px 12px' }}>
                                                        <p style={{ fontSize: 11, fontWeight: 700, color: '#b45309', margin: 0 }}>Нөхөж ажиллах: {r.makeup_date}</p>
                                                        {r.makeup_note && <p style={{ fontSize: 11, color: '#92400e', margin: '2px 0 0' }}>{r.makeup_note}</p>}
                                                    </div>
                                                )}
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
            <MyDesktop>
                <MyHeader icon={CalendarDays} title="Чөлөөний хүсэлт"
                    subtitle={<><span>{employee.name}</span>{employee.position && <span>{employee.position}</span>}{employee.branch && <span>{employee.branch}</span>}</>}
                    stats={[
                        <MyStat key="t" label="Нийт хүсэлт" value={requests.length} />,
                        <MyStat key="p" label="Хүлээгдэж буй" value={pending} accent="amber" />,
                        <MyStat key="a" label="Зөвшөөрсөн" value={approved} accent="emerald" />,
                        <MyStat key="r" label="Татгалзсан" value={requests.filter(r => r.status === 'rejected').length} accent="rose" />,
                        <MyStat key="d" label="Чөлөөтэй өдөр" value={requests.filter(r => r.status === 'approved').reduce((a, r) => a + r.days, 0)} sub="өдөр" accent="violet" />,
                    ]} />

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <MyCard title="Хүсэлтийн түүх" icon={History} count={requests.length} bodyClassName="">
                        {requests.length === 0 ? (
                            <MyEmpty icon={CalendarDays} title="Чөлөөний хүсэлт байхгүй байна" hint="Баруун талын маягтаар шинэ хүсэлт илгээнэ." />
                        ) : (
                            <table className={myTable.table}>
                                <thead className={myTable.thead}>
                                    <tr className="border-b border-border/50">
                                        <th className={myTable.th}>Огноо</th>
                                        <th className={myTable.th}>Төрөл</th>
                                        <th className={myTable.th}>Шалтгаан</th>
                                        <th className={myTable.th}>Орлох</th>
                                        <th className={myTable.th}>Нөхөж ажиллах</th>
                                        <th className={`${myTable.th} text-right`}>Төлөв</th>
                                    </tr>
                                </thead>
                                <tbody className={myTable.tbody}>
                                    {requests.map(r => (
                                        <tr key={r.id} className={myTable.tr}>
                                            <td className={`${myTable.td} whitespace-nowrap`}>
                                                <p className="font-semibold tabular-nums">{r.start_date} → {r.end_date}</p>
                                                <p className="text-[10px] text-muted-foreground">{r.days} өдөр · илгээсэн {r.created_at}</p>
                                            </td>
                                            <td className={myTable.td}><MyPill tone={r.leave_type === 'sick' ? 'sky' : 'violet'}>{LEAVE_TYPES[r.leave_type] ?? r.leave_type}</MyPill></td>
                                            <td className={`${myTable.td} max-w-[260px]`}><p className="truncate text-muted-foreground" title={r.reason}>{r.reason}</p></td>
                                            <td className={`${myTable.td} text-muted-foreground`}>{r.replacement ?? '—'}</td>
                                            <td className={`${myTable.td} whitespace-nowrap text-muted-foreground`} title={r.makeup_note ?? ''}>
                                                {r.makeup_date ?? '—'}{r.makeup_note && <span className="block max-w-[160px] truncate text-[10px]">{r.makeup_note}</span>}
                                            </td>
                                            <td className={`${myTable.td} text-right`}>
                                                <LeaveStatus status={r.status} />
                                                {r.status === 'rejected' && r.rejection_reason && <p className="mt-0.5 text-[10px] text-rose-600">{r.rejection_reason}</p>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </MyCard>

                    <MyCard title="Шинэ хүсэлт" icon={Plus} className="self-start lg:sticky lg:top-4">
                        <form onSubmit={submit} className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <label className="block text-[11px] font-semibold text-muted-foreground">Эхлэх *
                                    <input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)} className={`${myInput} mt-1`} />
                                    {errors.start_date && <span className="mt-1 block text-[10px] text-rose-600">{errors.start_date}</span>}
                                </label>
                                <label className="block text-[11px] font-semibold text-muted-foreground">Дуусах *
                                    <input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)} className={`${myInput} mt-1`} />
                                    {errors.end_date && <span className="mt-1 block text-[10px] text-rose-600">{errors.end_date}</span>}
                                </label>
                            </div>
                            <div>
                                <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Төрөл *</p>
                                <MyTabs tabs={Object.entries(LEAVE_TYPES).map(([key, label]) => ({ key, label }))} value={data.leave_type} onChange={k => setData('leave_type', k)} />
                            </div>
                            <label className="block text-[11px] font-semibold text-muted-foreground">Шалтгаан *
                                <textarea value={data.reason} onChange={e => setData('reason', e.target.value)} rows={3}
                                    placeholder="Чөлөө хүсэх шалтгаанаа бичнэ үү..." className={`${myInput} mt-1 h-auto resize-none py-2`} />
                                {errors.reason && <span className="mt-1 block text-[10px] text-rose-600">{errors.reason}</span>}
                            </label>
                            <label className="block text-[11px] font-semibold text-muted-foreground">Орлох ажилтан <span className="font-normal">(заавал биш)</span>
                                <select value={data.replacement_employee_id} onChange={e => setData('replacement_employee_id', e.target.value)} className={`${myInput} mt-1`}>
                                    <option value="">Сонгоогүй</option>
                                    {replacements.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="block text-[11px] font-semibold text-muted-foreground">Нөхөж ажиллах
                                    <input type="date" value={data.makeup_date} onChange={e => setData('makeup_date', e.target.value)} className={`${myInput} mt-1`} />
                                    {errors.makeup_date && <span className="mt-1 block text-[10px] text-rose-600">{errors.makeup_date}</span>}
                                </label>
                                <label className="block text-[11px] font-semibold text-muted-foreground">Тайлбар
                                    <input type="text" value={data.makeup_note} onChange={e => setData('makeup_note', e.target.value)} placeholder="Тайлбар..." className={`${myInput} mt-1`} />
                                    {errors.makeup_note && <span className="mt-1 block text-[10px] text-rose-600">{errors.makeup_note}</span>}
                                </label>
                            </div>
                            <button type="submit" disabled={processing} className={`${myBtn.primary} w-full justify-center`}>
                                {processing ? <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send className="size-3.5" />}
                                Хүсэлт илгээх
                            </button>
                        </form>
                    </MyCard>
                </div>
            </MyDesktop>
        </MyLayout>
    );
}
