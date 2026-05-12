import MyLayout from '@/layouts/my-layout';
import { NotificationBell } from '@/components/notification-bell';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle, Box, CheckCircle2, ClipboardList,
    Package, Printer, RotateCcw, X, XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const RED  = '#dc2626';
const RED2 = '#b91c1c';
const RED3 = '#7f1d1d';

interface EmployeeHero { full_name: string; position: string | null; photo_url: string | null; initials: string; }
interface EquipmentInfo {
    id: number; name: string; serial_number: string | null;
    brand: string | null; model: string | null;
    condition: string; condition_label: string; category: string | null;
}
interface EmployeeInfo { full_name: string; position: string | null; branch: string | null; }
interface Assignment {
    id: number; status: string; rejection_reason: string | null; notes: string | null;
    accepted_at: string | null; returned_at: string | null;
    assigned_by: string | null; assigned_at: string;
    equipment: EquipmentInfo;
    employee: EmployeeInfo;
}
interface PageProps {
    employee: EmployeeHero | null;
    pending: Assignment[];
    history: Assignment[];
    site_name: string;
    flash?: { success?: string; error?: string };
    [key: string]: unknown;
}

const STATUS_CFG = {
    accepted: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Баталгаажсан', Icon: CheckCircle2 },
    rejected: { color: RED,       bg: '#fff5f5', border: '#fecaca', label: 'Татгалзсан',   Icon: XCircle },
    returned: { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Буцаасан',     Icon: RotateCcw },
} as const;

const CONDITION_COLOR: Record<string, string> = {
    new: '#16a34a', good: '#0ea5e9', fair: '#f59e0b', damaged: '#dc2626',
};

/* ── Print-only Act document ── */
function ActDocument({ assignment, siteName, showFooter = true }: { assignment: Assignment; siteName: string; showFooter?: boolean }) {
    const eq = assignment.equipment;
    const emp = assignment.employee;
    return (
        <div className="border rounded-xl bg-white dark:bg-gray-900 p-5 text-sm font-mono">
            <div className="text-center mb-4">
                <div className="text-base font-bold tracking-wide text-gray-800 dark:text-gray-100">ТОНОГ ТӨХӨӨРӨМЖ ХҮЛЭЭЛГЭН ӨГӨХ АКТ</div>
            </div>
            <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 flex justify-between">
                <span><span className="font-semibold">Байгууллагын нэр:</span> {siteName}</span>
                <span><span className="font-semibold">Огноо:</span> {assignment.assigned_at}</span>
            </div>
            <table className="w-full border-collapse text-xs mb-4">
                <tbody>
                    {[
                        ['Төхөөрөмжийн нэр', eq.name],
                        ['Серийн дугаар', eq.serial_number || '—'],
                        ['Брэнд / Загвар', [eq.brand, eq.model].filter(Boolean).join(' / ') || '—'],
                        ['Төлөв байдал', eq.condition_label],
                        ['Хүлээн авсан ажилтан', emp.full_name],
                        ['Алба/Хэлтэс', emp.branch || '—'],
                        ['Албан тушаал', emp.position || '—'],
                    ].map(([label, value]) => (
                        <tr key={label}>
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 font-semibold bg-gray-50 dark:bg-gray-800 w-44 text-gray-700 dark:text-gray-300">{label}</td>
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-gray-800 dark:text-gray-100">{value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="text-xs text-gray-700 dark:text-gray-300 mb-3">
                <div className="font-bold mb-1">ҮҮРЭГ ХАРИУЦЛАГА</div>
                <ol className="list-decimal pl-5 space-y-0.5 text-gray-600 dark:text-gray-400">
                    <li>Ажилтан нь төхөөрөмжийг зөвхөн ажлын зориулалтаар ашиглана.</li>
                    <li>Ашиглалтын зааврын дагуу ажиллуулна.</li>
                    <li>Эвдрэл гэмтэл гарвал нэн даруй удирдлагад мэдэгдэнэ.</li>
                    <li>Хайхрамжгүйгээс үүдэн гэмтээсэн бол нөхөн төлөх үүрэгтэй.</li>
                    <li>Ажлаас гарах/шилжих үед бүрэн бүтэн буцаан хүлээлгэн өгнө.</li>
                </ol>
            </div>
            {showFooter && (
                assignment.status === 'accepted' && assignment.accepted_at
                    ? <p className="text-center text-xs text-green-600 dark:text-green-400 font-semibold">✅ Баталгаажсан: {assignment.accepted_at}</p>
                    : <p className="text-center text-xs text-gray-400 italic">(Систем дээр ажилтан "Зөвшөөрөх" дарснаар баталгаажина)</p>
            )}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════ */
export default function MyEquipment() {
    const { employee, pending, history, site_name, flash } = usePage<PageProps>().props;

    const [toast,        setToast]        = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [rejectTarget, setRejectTarget] = useState<Assignment | null>(null);
    const [viewAct,      setViewAct]      = useState<Assignment | null>(null);
    const [activeTab,    setActiveTab]    = useState<'pending' | 'history'>(pending.length > 0 ? 'pending' : 'history');

    const rejectForm = useForm({ rejection_reason: '' });

    useEffect(() => { const t = setInterval(() => router.reload({ only: ['pending', 'history'] }), 15_000); return () => clearInterval(t); }, []);
    useEffect(() => {
        if (flash?.success) setToast({ msg: flash.success, type: 'success' });
        if (flash?.error)   setToast({ msg: flash.error,   type: 'error' });
    }, [flash]);
    useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);

    function accept(a: Assignment) {
        router.patch(`/my/equipment/${a.id}/accept`, {}, { onSuccess: () => setViewAct(null) });
    }
    function submitReject(e: React.FormEvent) {
        e.preventDefault();
        if (!rejectTarget) return;
        rejectForm.patch(`/my/equipment/${rejectTarget.id}/reject`, {
            onSuccess: () => { setRejectTarget(null); rejectForm.reset(); },
        });
    }

    const accepted = history.filter(a => a.status === 'accepted').length;

    /* ══════════════════════════ RENDER ══════════════════════════ */
    return (
        <MyLayout breadcrumbs={[{ title: 'Тоног төхөөрөмж', href: '/my/equipment' }]}>
            <Head title="Тоног төхөөрөмж" />

            {/* ─── Toast ─── */}
            {toast && (
                <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 60, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 14, background: toast.type === 'success' ? '#16a34a' : RED, color: 'white', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                    {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    {toast.msg}
                    <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, marginLeft: 4 }}><X size={13} color="white" /></button>
                </div>
            )}

            {/* ═══════════════════ MOBILE ═══════════════════ */}
            <div className="md:hidden print:hidden" style={{ flex: 1, background: 'var(--my-page-bg)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' } as React.CSSProperties}>
                <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

                {/* ─── RED HERO ─── */}
                <div style={{ background: `linear-gradient(160deg, #ef4444 0%, ${RED} 30%, ${RED2} 65%, ${RED3} 100%)`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -70, right: -70, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: 40, right: 40, pointerEvents: 'none' }} />

                    {/* Top bar */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 0', gap: 10, position: 'relative' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, flex: 1, letterSpacing: 0.3 }}>HR · ТОНОГ ТӨХӨӨРӨМЖ</span>
                        <NotificationBell variant="ghost" />
                        <Link href="/my/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {employee?.photo_url
                                    ? <img src={employee.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                                    : <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{employee?.initials ?? '?'}</span>
                                }
                            </div>
                        </Link>
                    </div>

                    {/* Title */}
                    <div style={{ padding: '14px 18px 18px', position: 'relative' }}>
                        <h1 style={{ margin: '0 0 5px', lineHeight: 1.1, letterSpacing: -0.8 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>Тоног </span>
                            <span style={{ fontSize: 28, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontFamily: 'Georgia, "Times New Roman", serif' }}>төхөөрөмж</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 16px', fontWeight: 500 }}>
                            {employee?.full_name ?? '—'}{employee?.position ? ` · ${employee.position}` : ''}
                        </p>

                        {/* Glassmorphism stats */}
                        <div style={{ borderRadius: 20, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(12px)', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.12)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#93c5fd' }} />
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: 0.8 }}>ХАРИУЦЛАГА</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[
                                    { val: history.length + pending.length, label: 'Нийт',         dot: 'rgba(255,255,255,0.4)' },
                                    { val: accepted,                         label: 'Хариуцаж буй', dot: '#4ade80' },
                                    { val: pending.length,                   label: 'Хүлээгдэж',    dot: '#fbbf24' },
                                ].map(({ val, label, dot }, i) => (
                                    <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 8px', textAlign: 'center' }}>
                                        <p style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{val}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 5 }}>
                                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
                                            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 600 }}>{label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── CONTENT ─── */}
                <div style={{ padding: '12px 14px 32px' }}>

                    {/* Tab strip */}
                    <div style={{ background: 'var(--my-card-bg)', borderRadius: 18, padding: 5, display: 'flex', gap: 4, marginBottom: 14, boxShadow: 'var(--my-shadow)' }}>
                        {([
                            { key: 'pending' as const, label: 'Хүлээгдэж байна', count: pending.length, alert: pending.length > 0 },
                            { key: 'history' as const, label: 'Түүх',             count: history.length, alert: false },
                        ]).map(({ key, label, count, alert }) => (
                            <button key={key} onClick={() => setActiveTab(key)} style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '10px 8px', borderRadius: 13, border: 'none', cursor: 'pointer',
                                background: activeTab === key ? (alert ? '#f59e0b' : '#1c1c1e') : 'transparent',
                            }}>
                                {alert && activeTab !== key && (
                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                )}
                                <span style={{ fontSize: 13, fontWeight: 700, color: activeTab === key ? 'white' : '#888' }}>{label}</span>
                                <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 99, background: activeTab === key ? 'rgba(255,255,255,0.22)' : '#f4f4f6', color: activeTab === key ? 'white' : '#888' }}>{count}</span>
                            </button>
                        ))}
                    </div>

                    {/* ── Pending tab ── */}
                    {activeTab === 'pending' && (
                        pending.length === 0 ? (
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 22, padding: '52px 20px', textAlign: 'center', boxShadow: 'var(--my-shadow)' }}>
                                <div style={{ width: 56, height: 56, borderRadius: 18, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                    <Package size={26} color="#f59e0b" />
                                </div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-muted)', margin: '0 0 4px' }}>Хүлээгдэж байгаа хүсэлт байхгүй</p>
                                <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0 }}>Шинэ тоног төхөөрөмж хариуцуулах үед энд харагдана</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {pending.map(a => (
                                    <div key={a.id} style={{ background: 'var(--my-card-bg)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--my-shadow)' }}>
                                        {/* Header with act number */}
                                        <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 11, color: '#ccc', fontWeight: 700, fontFamily: 'monospace' }}>
                                                АКТ-{a.assigned_at.slice(0, 4)}-{String(a.id).padStart(3, '0')}
                                            </span>
                                            <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', background: '#fffbeb', borderRadius: 99, padding: '3px 10px', border: '1px solid #fde68a' }}>ХҮЛЭЭГДЭЖ</span>
                                        </div>
                                        {/* Equipment info */}
                                        <div style={{ padding: '10px 16px 14px', display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                                            <div style={{ width: 50, height: 50, borderRadius: 16, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid #fde68a' }}>
                                                <Package size={22} color="#f59e0b" />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--my-input-text)', margin: '0 0 3px', lineHeight: 1.3 }}>{a.equipment.name}</p>
                                                {a.equipment.serial_number && (
                                                    <p style={{ fontSize: 11, color: '#bbb', margin: '0 0 8px', fontFamily: 'monospace' }}>{a.equipment.serial_number}</p>
                                                )}
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', background: '#f8fafc', borderRadius: 99, padding: '3px 9px', border: '1px solid #e2e8f0' }}>
                                                        {a.equipment.condition_label}
                                                    </span>
                                                    {a.equipment.category && (
                                                        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', background: '#f8fafc', borderRadius: 99, padding: '3px 9px', border: '1px solid #e2e8f0' }}>
                                                            {a.equipment.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Meta row */}
                                        <div style={{ margin: '0 16px', paddingBottom: 12, display: 'flex', gap: 16, borderTop: '1px solid var(--my-divider)', paddingTop: 10 }}>
                                            <div>
                                                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', letterSpacing: 1, margin: '0 0 3px' }}>ОГНОО</p>
                                                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-text)', margin: 0 }}>{a.assigned_at}</p>
                                            </div>
                                            {a.assigned_by && (
                                                <div>
                                                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', letterSpacing: 1, margin: '0 0 3px' }}>ОЛГОСОН</p>
                                                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-text)', margin: 0 }}>{a.assigned_by}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Notes */}
                                        {a.notes && (
                                            <div style={{ margin: '0 14px 12px', background: '#fffbeb', borderRadius: 13, padding: '10px 12px', border: '1px solid #fde68a' }}>
                                                <p style={{ fontSize: 11, fontWeight: 700, color: '#92400e', margin: '0 0 3px', letterSpacing: 0.4 }}>ТЭМДЭГЛЭЛ</p>
                                                <p style={{ fontSize: 12, color: '#78350f', margin: 0 }}>{a.notes}</p>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div style={{ borderTop: '1px solid var(--my-divider)', padding: '12px 14px', display: 'flex', gap: 10 }}>
                                            <button onClick={() => accept(a)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: `linear-gradient(135deg, #16a34a, #15803d)`, borderRadius: 14, padding: '13px 0', fontSize: 14, fontWeight: 800, color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
                                                <CheckCircle2 size={16} /> Зөвшөөрөх
                                            </button>
                                            <button onClick={() => setRejectTarget(a)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: '#fff5f5', borderRadius: 14, padding: '13px 0', fontSize: 14, fontWeight: 800, color: RED, border: `1.5px solid #fecaca`, cursor: 'pointer' }}>
                                                <XCircle size={16} /> Цуцлах
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* ── History tab ── */}
                    {activeTab === 'history' && (
                        history.length === 0 ? (
                            <div style={{ background: 'var(--my-card-bg)', borderRadius: 22, padding: '52px 20px', textAlign: 'center', boxShadow: 'var(--my-shadow)' }}>
                                <div style={{ width: 56, height: 56, borderRadius: 18, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                    <Box size={26} color="#d1d5db" />
                                </div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-muted)', margin: '0 0 4px' }}>Бүртгэл байхгүй</p>
                                <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0 }}>Тоног төхөөрөмжийн түүх энд харагдана</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {history.map(a => {
                                    const cfg  = STATUS_CFG[a.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.returned;
                                    const Icon = cfg.Icon;
                                    return (
                                        <div key={a.id} style={{ background: 'var(--my-card-bg)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--my-shadow)', borderLeft: `4px solid ${cfg.color}` }}>
                                            <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 11, color: '#ccc', fontWeight: 700, fontFamily: 'monospace' }}>
                                                    АКТ-{a.assigned_at.slice(0, 4)}-{String(a.id).padStart(3, '0')}
                                                </span>
                                                <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color, background: cfg.bg, borderRadius: 99, padding: '3px 9px', border: `1px solid ${cfg.border}` }}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <div style={{ padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                                <div style={{ width: 44, height: 44, borderRadius: 14, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${cfg.border}` }}>
                                                    <Icon size={20} color={cfg.color} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--my-input-text)', margin: '0 0 3px', lineHeight: 1.3 }}>{a.equipment.name}</p>
                                                    {a.equipment.serial_number && (
                                                        <p style={{ fontSize: 11, color: '#bbb', margin: '0 0 6px', fontFamily: 'monospace' }}>{a.equipment.serial_number}</p>
                                                    )}
                                                    <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
                                                        <div>
                                                            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', letterSpacing: 1, margin: '0 0 2px' }}>ОГНОО</p>
                                                            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--my-text)', margin: 0 }}>{a.assigned_at}</p>
                                                        </div>
                                                        {a.accepted_at && (
                                                            <div>
                                                                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', letterSpacing: 1, margin: '0 0 2px' }}>АВСАН</p>
                                                                <p style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', margin: 0 }}>{a.accepted_at}</p>
                                                            </div>
                                                        )}
                                                        {a.returned_at && (
                                                            <div>
                                                                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', letterSpacing: 1, margin: '0 0 2px' }}>БУЦААСАН</p>
                                                                <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: 0 }}>{a.returned_at}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {a.rejection_reason && (
                                                        <div style={{ background: '#fff5f5', borderRadius: 10, padding: '7px 10px', border: '1px solid #fecaca' }}>
                                                            <p style={{ fontSize: 12, color: RED, margin: 0 }}>{a.rejection_reason}</p>
                                                        </div>
                                                    )}
                                                    {a.status === 'accepted' && (
                                                        <button onClick={() => setViewAct(a)} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f8fafc', borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 700, color: '#374151', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                            <ClipboardList size={13} color="#64748b" /> Акт харах
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* ═══════════════════ DESKTOP ═══════════════════ */}
            <div className="hidden md:block p-4 md:p-6 space-y-6 print:hidden">
                <div>
                    <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Package className="size-5 text-blue-600" /> Тоног төхөөрөмж
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Танд хариуцуулсан тоног төхөөрөмжийн жагсаалт</p>
                </div>

                {pending.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span className="size-2 rounded-full bg-yellow-500 animate-pulse inline-block" />
                            Хүлээгдэж байгаа хүсэлт ({pending.length})
                        </h2>
                        {pending.map(a => (
                            <div key={a.id} className="rounded-2xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10 overflow-hidden">
                                <div className="p-4 md:p-5">
                                    <ActDocument assignment={a} siteName={site_name} />
                                    {a.notes && (
                                        <div className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                                            Тэмдэглэл: {a.notes}
                                        </div>
                                    )}
                                    <div className="flex gap-2 mt-4">
                                        <button onClick={() => accept(a)} className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                                            <CheckCircle2 className="size-4" /> Зөвшөөрөх
                                        </button>
                                        <button onClick={() => setRejectTarget(a)} className="flex-1 flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm font-semibold py-2.5 rounded-xl transition-colors">
                                            <XCircle className="size-4" /> Цуцлах
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div>
                    <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <ClipboardList className="size-4 text-muted-foreground" /> Хариуцлагын түүх
                    </h2>
                    {history.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Box className="size-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Бүртгэл байхгүй</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b border-border">
                                        <tr>
                                            {['ТОНОГ ТӨХӨӨРӨМЖ', 'СТАТУС', 'ОГНОО', 'ҮЙЛДЭЛ'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {history.map(a => {
                                            const cfg = STATUS_CFG[a.status as keyof typeof STATUS_CFG];
                                            return (
                                                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-foreground">{a.equipment.name}</div>
                                                        {a.equipment.serial_number && <div className="text-xs text-muted-foreground font-mono">{a.equipment.serial_number}</div>}
                                                        {a.equipment.category && <div className="text-xs text-blue-600 dark:text-blue-400">{a.equipment.category}</div>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {cfg && (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                                                                {cfg.label}
                                                            </span>
                                                        )}
                                                        {a.rejection_reason && <div className="text-xs text-red-500 mt-0.5 max-w-[200px]">{a.rejection_reason}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                                        <div>Олгосон: {a.assigned_at}</div>
                                                        {a.accepted_at && <div className="text-green-600">Авсан: {a.accepted_at}</div>}
                                                        {a.returned_at && <div>Буцаасан: {a.returned_at}</div>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {a.status === 'accepted' && (
                                                            <button onClick={() => setViewAct(a)} className="flex items-center gap-1 text-xs border hover:bg-muted px-2.5 py-1.5 rounded-lg transition-colors">
                                                                <ClipboardList className="size-3.5" /> Акт харах
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Reject bottom sheet ─── */}
            {rejectTarget && (
                <div onClick={() => { setRejectTarget(null); rejectForm.reset(); }} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--my-sheet-bg)', borderRadius: '26px 26px 0 0', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)' }}>
                        <div style={{ width: 36, height: 4, background: '#d1d5db', borderRadius: 99, margin: '14px auto 8px' }} />
                        <div style={{ padding: '0 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--my-text)', margin: 0 }}>Татгалзах шалтгаан</p>
                                <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>{rejectTarget.equipment.name}</p>
                            </div>
                            <button onClick={() => { setRejectTarget(null); rejectForm.reset(); }} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f4f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={15} color="#888" />
                            </button>
                        </div>
                        <form onSubmit={submitReject} style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <textarea
                                value={rejectForm.data.rejection_reason}
                                onChange={e => rejectForm.setData('rejection_reason', e.target.value)}
                                rows={3} required
                                placeholder="Татгалзсан шалтгаанаа бичнэ үү..."
                                style={{ width: '100%', borderRadius: 16, border: '1.5px solid var(--my-divider)', background: 'var(--my-pill-bg)', color: 'var(--my-input-text)', padding: '12px 14px', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties}
                            />
                            {rejectForm.errors.rejection_reason && (
                                <p style={{ fontSize: 12, color: RED, margin: 0 }}>{rejectForm.errors.rejection_reason}</p>
                            )}
                            <button type="submit" disabled={rejectForm.processing || !rejectForm.data.rejection_reason}
                                style={{ width: '100%', background: RED, color: 'white', borderRadius: 16, padding: '14px 0', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer', opacity: rejectForm.processing || !rejectForm.data.rejection_reason ? 0.5 : 1 }}>
                                {rejectForm.processing ? 'Илгээж байна...' : 'Татгалзах'}
                            </button>
                            <button type="button" onClick={() => { setRejectTarget(null); rejectForm.reset(); }}
                                style={{ width: '100%', background: 'var(--my-card-bg)', color: 'var(--my-muted)', borderRadius: 16, padding: '13px 0', fontSize: 15, fontWeight: 600, border: '1.5px solid var(--my-divider)', cursor: 'pointer' }}>
                                Болих
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Act view bottom sheet ─── */}
            {viewAct && (
                <div onClick={() => setViewAct(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: 'var(--my-sheet-bg)', borderRadius: '26px 26px 0 0', maxHeight: '90vh', overflowY: 'auto', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)' }}>
                        <div style={{ width: 36, height: 4, background: '#d1d5db', borderRadius: 99, margin: '14px auto 0' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 12px', borderBottom: '1px solid var(--my-divider)' }}>
                            <div>
                                <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--my-text)', margin: 0 }}>Хүлээлгэн өгөх акт</p>
                                <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0' }}>{viewAct.equipment.name}</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f4f4f6', borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 700, color: '#555', border: 'none', cursor: 'pointer' }}>
                                    <Printer size={13} /> Хэвлэх
                                </button>
                                <button onClick={() => setViewAct(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f4f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <X size={14} color="#888" />
                                </button>
                            </div>
                        </div>
                        <div style={{ padding: '14px 14px 0' }}>
                            <ActDocument assignment={viewAct} siteName={site_name} />
                        </div>
                    </div>
                </div>
            )}

            {viewAct && (
                <div className="hidden print:block p-8">
                    <ActDocument assignment={viewAct} siteName={site_name} />
                </div>
            )}
        </MyLayout>
    );
}
