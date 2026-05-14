import MyLayout from '@/layouts/my-layout';
import { ChatIcon } from '@/components/chat-icon';
import { NotificationBell } from '@/components/notification-bell';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    CalendarDays, CheckCircle2, ChevronDown, Clock,
    MapPin, Phone, Plus, Search, Send, Umbrella, X, XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const RED  = '#dc2626';
const RED2 = '#b91c1c';
const RED3 = '#7f1d1d';

interface VacationRequest {
    id: number;
    start_date: string; end_date: string; days: number;
    replacement: string | null;
    location_during_leave: string;
    emergency_phone: string;
    had_annual_leave_this_year: boolean;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null;
    reviewed_at: string | null;
    created_at: string;
}
interface Employee {
    id: number; name: string; photo_url: string | null; initials: string;
    position: string | null; branch: string | null;
}
interface Balance {
    vacation_days: number; vacation_extra_days: number;
    allowed: number; used: number; remaining: number;
}
interface Replacement { id: number; name: string }
interface Props {
    employee: Employee;
    balance: Balance;
    requests: VacationRequest[];
    replacements: Replacement[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Ээлжийн амралт', href: '/my/vacation-requests' },
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

function calcDays(start: string, end: string): number {
    if (!start || !end) return 0;
    let days = 0;
    const cur = new Date(start);
    const end_ = new Date(end);
    if (cur > end_) return 0;
    while (cur <= end_) {
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 6) days++;
        cur.setDate(cur.getDate() + 1);
    }
    return days;
}

export default function MyVacationRequests({ employee, balance, requests, replacements }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab]   = useState<'new' | 'history'>('new');
    const [showPicker, setShowPicker] = useState(false);
    const [pickerSearch, setPickerSearch] = useState('');

    useEffect(() => {
        const t = setInterval(() => {
            router.reload({ only: ['requests', 'balance'] });
        }, 15_000);
        return () => clearInterval(t);
    }, []);

    const { data, setData, post, processing, errors, reset } = useForm({
        start_date: '', end_date: '',
        replacement_employee_id: '',
        location_during_leave: '',
        emergency_phone: '',
        had_annual_leave_this_year: false as boolean,
        reason: '',
    });

    const totalDays = useMemo(() => calcDays(data.start_date, data.end_date), [data.start_date, data.end_date]);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/my/vacation-requests', { onSuccess: () => { reset(); setShowForm(false); } });
    }

    const balancePct  = balance.allowed > 0 ? Math.round((balance.remaining / balance.allowed) * 100) : 0;
    const barColorHex = balancePct > 50 ? '#22c55e' : balancePct > 20 ? '#f59e0b' : '#ef4444';

    const pending  = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title="Ээлжийн амралт" />

            {/* ════════════════ MOBILE ════════════════ */}
            <div className="md:hidden" style={{ flex: 1, background: 'var(--my-page-bg)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' } as React.CSSProperties}>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

                {/* ═══ RED HERO ══════════════════════════════════════════════ */}
                <div style={{ background: `linear-gradient(160deg, #ef4444 0%, ${RED} 30%, ${RED2} 65%, ${RED3} 100%)`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -60, right: -60, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: 40, right: 40, pointerEvents: 'none' }} />

                    {/* Top bar */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 0', gap: 10, position: 'relative' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, flex: 1, letterSpacing: 0.3 }}>
                            HR · ЭЭЛЖИЙН АМРАЛТ
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
                    <div style={{ padding: '14px 18px 14px', position: 'relative' }}>
                        <h1 style={{ margin: '0 0 5px', lineHeight: 1.1, letterSpacing: -0.8 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>Ээлжийн </span>
                            <span style={{ fontSize: 28, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontFamily: 'Georgia, "Times New Roman", serif' }}>амралт</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 14px', fontWeight: 500 }}>
                            {employee.name}{employee.position ? ` · ${employee.position}` : ''}
                        </p>

                        {/* Balance block — glassmorphism like home attendance */}
                        <div style={{ borderRadius: 18, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(10px)', padding: '13px 16px', marginBottom: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: 0.4 }}>АМРАЛТЫН ҮЛДЭГДЭЛ</span>
                                </div>
                                <span style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>
                                    {balance.remaining}
                                    <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginLeft: 4 }}>/ {balance.allowed} өдөр</span>
                                </span>
                            </div>
                            <div style={{ height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 99 }}>
                                <div style={{ height: '100%', width: `${balancePct}%`, background: barColorHex, borderRadius: 99, transition: 'width 0.4s' }} />
                            </div>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', margin: '6px 0 0' }}>
                                Үндсэн {balance.vacation_days} + Нэмэлт {balance.vacation_extra_days} · Ашигласан {balance.used}
                            </p>
                        </div>
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
                    {activeTab === 'new' && (() => {
                        const selectedReplacement = replacements.find(r => String(r.id) === data.replacement_employee_id);
                        const PILL: React.CSSProperties = { background: 'var(--my-pill-bg)', borderRadius: 14, padding: '11px 16px' };
                        const LABEL: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', margin: '0 0 4px', letterSpacing: 0.6, textTransform: 'uppercase' };
                        const INPUT: React.CSSProperties = { background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: 15, fontWeight: 600, color: 'var(--my-input-text)', padding: 0, fontFamily: 'inherit' };
                        return (
                        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                            {/* ── ХУГАЦАА ── */}
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--my-divider)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
                                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--my-muted)', letterSpacing: 0.5 }}>ХУГАЦАА</span>
                                    {totalDays > 0 && (
                                        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', borderRadius: 99, padding: '2px 10px' }}>
                                            {totalDays} өдөр · үлдэгдэл {balance.remaining}
                                        </span>
                                    )}
                                </div>
                                <div style={{ padding: '12px 16px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div style={PILL}>
                                        <p style={LABEL}>Эхлэх огноо</p>
                                        <input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)} style={INPUT} />
                                        {errors.start_date && <p style={{ fontSize: 10, color: RED, margin: '4px 0 0' }}>{errors.start_date}</p>}
                                    </div>
                                    <div style={PILL}>
                                        <p style={LABEL}>Дуусах огноо</p>
                                        <input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)} style={INPUT} />
                                        {errors.end_date && <p style={{ fontSize: 10, color: RED, margin: '4px 0 0' }}>{errors.end_date}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* ── БАЙРШИЛ + УТАС ── */}
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--my-divider)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1' }} />
                                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--my-muted)', letterSpacing: 0.5 }}>ХОЛБОО БАРИХ</span>
                                </div>
                                <div style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div style={PILL}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                            <MapPin size={10} color="#8e8e93" />
                                            <p style={{ ...LABEL, margin: 0 }}>Амралтын үед байх газар</p>
                                        </div>
                                        <input type="text" value={data.location_during_leave} onChange={e => setData('location_during_leave', e.target.value)}
                                            placeholder="Хот, улс, хаяг..." style={INPUT} />
                                        {errors.location_during_leave && <p style={{ fontSize: 10, color: RED, margin: '4px 0 0' }}>{errors.location_during_leave}</p>}
                                    </div>
                                    <div style={PILL}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                            <Phone size={10} color="#8e8e93" />
                                            <p style={{ ...LABEL, margin: 0 }}>Яаралтай холбоо барих утас</p>
                                        </div>
                                        <input type="tel" value={data.emergency_phone} onChange={e => setData('emergency_phone', e.target.value)}
                                            placeholder="9900-0000" style={INPUT} />
                                        {errors.emergency_phone && <p style={{ fontSize: 10, color: RED, margin: '4px 0 0' }}>{errors.emergency_phone}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* ── ОРЛОХ АЖИЛТАН ── */}
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--my-divider)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
                                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--my-muted)', letterSpacing: 0.5 }}>ОРЛОХ АЖИЛТАН</span>
                                </div>
                                <div style={{ padding: '12px 16px 14px' }}>
                                    <button type="button" onClick={() => setShowPicker(true)}
                                        style={{ ...PILL, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', cursor: 'pointer', textAlign: 'left' } as React.CSSProperties}>
                                        <div style={{ flex: 1 }}>
                                            <p style={LABEL}>Ажилтан сонгох</p>
                                            {selectedReplacement ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <span style={{ fontSize: 10, fontWeight: 800, color: RED }}>{selectedReplacement.name.charAt(0)}</span>
                                                    </div>
                                                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--my-input-text)' }}>{selectedReplacement.name}</span>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: 15, fontWeight: 500, color: '#aaa' }}>Сонгоогүй</span>
                                            )}
                                        </div>
                                        <ChevronDown size={18} color="#bbb" />
                                    </button>
                                </div>
                            </div>

                            {/* ── ЭНЭ ЖИЛ АМРАЛТ АВСАН (iOS toggle) ── */}
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                <button type="button" onClick={() => setData('had_annual_leave_this_year', !data.had_annual_leave_this_year)}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--my-input-text)', margin: '0 0 2px' }}>Энэ жил ээлжийн амралт авсан</p>
                                        <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0 }}>Өмнө авсан бол шалгана уу</p>
                                    </div>
                                    <div style={{ width: 50, height: 30, borderRadius: 15, background: data.had_annual_leave_this_year ? '#22c55e' : '#e5e7eb', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                                        <div style={{ position: 'absolute', top: 3, left: data.had_annual_leave_this_year ? 23 : 3, width: 24, height: 24, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                                    </div>
                                </button>
                            </div>

                            {/* ── ШАЛТГААН ── */}
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--my-divider)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#8b5cf6' }} />
                                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--my-muted)', letterSpacing: 0.5 }}>ШАЛТГААН</span>
                                </div>
                                <div style={{ padding: '12px 16px 14px' }}>
                                    <div style={PILL}>
                                        <textarea value={data.reason} onChange={e => setData('reason', e.target.value)}
                                            rows={4} placeholder="Ээлжийн амралт авах шалтгаанаа дэлгэрэнгүй бичнэ үү..."
                                            style={{ ...INPUT, resize: 'none', lineHeight: 1.6 } as React.CSSProperties} />
                                        {errors.reason && <p style={{ fontSize: 10, color: RED, margin: '4px 0 0' }}>{errors.reason}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Submit */}
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
                        );
                    })()}

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
                                    <div style={{ width: 56, height: 56, borderRadius: 18, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                        <Umbrella size={26} color="#86efac" />
                                    </div>
                                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-muted)', margin: '0 0 4px' }}>Хүсэлт байхгүй</p>
                                    <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0 }}>Шинэ хүсэлт дарж амралт хүсэнэ үү</p>
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
                                                        <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: '2px 0 0' }}>{r.days} өдөр</p>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: sColor, background: sBg, borderRadius: 99, padding: '4px 10px', flexShrink: 0, marginLeft: 8 }}>
                                                    {sLabel}
                                                </span>
                                            </div>
                                            <div style={{ padding: '12px 18px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                {r.location_during_leave && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <MapPin size={11} color="var(--my-faint)" />
                                                        <span style={{ fontSize: 12, color: 'var(--my-muted)' }}>{r.location_during_leave}</span>
                                                    </div>
                                                )}
                                                {r.emergency_phone && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <Phone size={11} color="var(--my-faint)" />
                                                        <span style={{ fontSize: 12, color: 'var(--my-muted)' }}>{r.emergency_phone}</span>
                                                    </div>
                                                )}
                                                {r.replacement && (
                                                    <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: 0 }}>Орлох: {r.replacement}</p>
                                                )}
                                                {r.status === 'rejected' && r.rejection_reason && (
                                                    <div style={{ marginTop: 4, background: '#fef2f2', borderRadius: 10, padding: '8px 12px' }}>
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

            {/* ── Replacement picker bottom sheet ── */}
            {showPicker && (
                <div className="md:hidden" style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.5)' }}
                    onClick={() => { setShowPicker(false); setPickerSearch(''); }}>
                    <div style={{ width: '100%', background: 'var(--my-sheet-bg)', borderRadius: '24px 24px 0 0', maxHeight: '75vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
                        onClick={e => e.stopPropagation()}>
                        {/* Handle */}
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
                            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--my-divider)' }} />
                        </div>
                        {/* Title */}
                        <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--my-text)', textAlign: 'center', margin: '0 0 14px' }}>Орлох ажилтан сонгох</p>
                        {/* Search */}
                        <div style={{ padding: '0 16px 12px' }}>
                            <div style={{ background: 'var(--my-pill-bg)', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Search size={15} color="var(--my-faint)" />
                                <input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                                    placeholder="Хайх..."
                                    style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--my-input-text)', flex: 1, fontFamily: 'inherit' }} />
                            </div>
                        </div>
                        {/* List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px' }}>
                            {/* None option */}
                            <button type="button" onClick={() => { setData('replacement_employee_id', ''); setShowPicker(false); setPickerSearch(''); }}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: !data.replacement_employee_id ? 'var(--my-pill-bg)' : 'transparent', borderRadius: 14, border: 'none', cursor: 'pointer', marginBottom: 4 }}>
                                <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--my-faint)' }}>Сонгоогүй</span>
                                {!data.replacement_employee_id && (
                                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                                        <path d="M1 6L5.5 10.5L15 1" stroke={RED} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>
                            {replacements
                                .filter(r => !pickerSearch || r.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                                .map(r => {
                                    const isSel = String(r.id) === data.replacement_employee_id;
                                    return (
                                        <button key={r.id} type="button"
                                            onClick={() => { setData('replacement_employee_id', String(r.id)); setShowPicker(false); setPickerSearch(''); }}
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: isSel ? '#fef2f2' : 'transparent', borderRadius: 16, border: 'none', cursor: 'pointer', marginBottom: 4 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: isSel ? '#fca5a5' : 'var(--my-pill-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 800, color: isSel ? RED : 'var(--my-faint)' }}>{r.name.charAt(0).toUpperCase()}</span>
                                                </div>
                                                <span style={{ fontSize: 15, fontWeight: 600, color: isSel ? RED : 'var(--my-input-text)' }}>{r.name}</span>
                                            </div>
                                            {isSel && (
                                                <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                                                    <path d="M1 6L5.5 10.5L15 1" stroke={RED} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════ DESKTOP ════════════════ */}
            <div className="hidden md:flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Ээлжийн амралтын хүсэлт</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{employee.name} · {employee.position}</p>
                    </div>
                    <button onClick={() => setShowForm(v => !v)}
                        className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors">
                        <Plus className="size-4" /> Ээлжийн амралт хүсэх
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: 'Үндсэн хоног',    value: balance.vacation_days,       color: 'text-foreground' },
                        { label: 'Нэмэлт хоног',    value: balance.vacation_extra_days, color: 'text-blue-500' },
                        { label: 'Ашигласан хоног', value: balance.used,                color: 'text-orange-500' },
                        { label: 'Үлдсэн хоног',    value: balance.remaining,           color: balance.remaining > 0 ? 'text-green-500' : 'text-red-500' },
                    ].map(s => (
                        <div key={s.label} className="rounded-2xl border bg-card shadow-sm px-5 py-4">
                            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl border bg-card shadow-sm px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-foreground">Амралтын хоногийн ашиглалт ({new Date().getFullYear()} он)</p>
                        <p className="text-sm text-muted-foreground">{balance.used} / {balance.allowed} өдөр</p>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${balancePct > 50 ? 'bg-green-500' : balancePct > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, balance.allowed > 0 ? (balance.used / balance.allowed) * 100 : 0)}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">Үлдсэн: {balance.remaining} өдөр ({balancePct}%)</p>
                </div>

                {showForm && (
                    <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/10 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-red-200/60 dark:border-red-900">
                            <p className="font-bold text-foreground">Шинэ ээлжийн амралтын хүсэлт</p>
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
                            {totalDays > 0 && (
                                <div className="col-span-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 px-4 py-2.5 text-sm text-blue-700 dark:text-blue-400 font-semibold flex items-center justify-between">
                                    <span>Нийт хоног: {totalDays} өдөр</span>
                                    <span className="text-xs font-normal">Үлдэгдэл: {balance.remaining} өдөр</span>
                                </div>
                            )}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground"><MapPin className="inline size-3 mr-0.5" /> Амралтын үед байх газар *</label>
                                <input type="text" value={data.location_during_leave} onChange={e => setData('location_during_leave', e.target.value)}
                                    placeholder="Хот, улс, хаяг..." className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-400" />
                                {errors.location_during_leave && <p className="mt-1 text-xs text-red-500">{errors.location_during_leave}</p>}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground"><Phone className="inline size-3 mr-0.5" /> Яаралтай холбоо барих утас *</label>
                                <input type="tel" value={data.emergency_phone} onChange={e => setData('emergency_phone', e.target.value)}
                                    placeholder="9900-0000" className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-400" />
                                {errors.emergency_phone && <p className="mt-1 text-xs text-red-500">{errors.emergency_phone}</p>}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Орлох ажилтан <span className="font-normal text-muted-foreground/60">(заавал биш)</span></label>
                                <select value={data.replacement_employee_id} onChange={e => setData('replacement_employee_id', e.target.value)}
                                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-400">
                                    <option value="">Сонгоогүй</option>
                                    {replacements.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={data.had_annual_leave_this_year} onChange={e => setData('had_annual_leave_this_year', e.target.checked)} className="size-4 rounded border-border" />
                                    <span className="text-sm text-foreground">Энэ жил ээлжийн амралт авсан</span>
                                </label>
                            </div>
                            <div className="col-span-2">
                                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Шалтгаан *</label>
                                <textarea value={data.reason} onChange={e => setData('reason', e.target.value)}
                                    rows={3} placeholder="Ээлжийн амралт авах шалтгаанаа бичнэ үү..."
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
                        <div className="py-14 text-center text-sm text-muted-foreground">Ээлжийн амралтын хүсэлт байхгүй байна</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50 text-xs text-muted-foreground">
                                    <th className="px-6 py-3 text-left font-semibold">Огноо</th>
                                    <th className="px-4 py-3 text-left font-semibold">Хоног</th>
                                    <th className="px-4 py-3 text-left font-semibold">Байршил</th>
                                    <th className="px-4 py-3 text-left font-semibold">Яаралтай утас</th>
                                    <th className="px-4 py-3 text-left font-semibold">Орлох</th>
                                    <th className="px-4 py-3 text-left font-semibold">Статус</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {requests.map(r => (
                                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-3 text-foreground whitespace-nowrap">{r.start_date} → {r.end_date}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{r.days}</td>
                                        <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate">{r.location_during_leave}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{r.emergency_phone}</td>
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
