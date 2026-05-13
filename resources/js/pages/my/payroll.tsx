import MyLayout from '@/layouts/my-layout';
import { NotificationBell } from '@/components/notification-bell';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';

const RED  = '#dc2626';
const RED2 = '#b91c1c';
const RED3 = '#7f1d1d';
const GRN  = '#16a34a';

interface EmployeeInfo {
    full_name: string; employee_number: string;
    position: string | null; bank_account: string | null; bank_name: string | null;
    photo_url: string | null; initials: string;
}
interface PayrollEntry {
    id: number; run_id: number; run_title: string; half_label: string;
    year: number; month: number;
    basic_salary: number; nd_salary: number; prev_paid: number; holiday_advance: number;
    ath_bonus: number; overtime_bonus: number; vacation_pay: number;
    working_days: number; worked_days: number; daily_rate: number;
    food: number; transport: number; milk: number;
    total_bonus: number; calc_salary: number; nd_total: number; ndsh: number;
    tardiness: number; no_fingerprint: number; other_deduction: number;
    income_tax: number; net_hand: number; bank_salary: number;
}
interface Props { employee: EmployeeInfo; entries: PayrollEntry[] }

function fmt(n: number) {
    if (!n) return '—';
    return Math.round(n).toLocaleString('en-US') + '₮';
}

/* ── Desktop row helper ─────────────────────────── */
function Row({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
    if (!value) return null;
    return (
        <div className={`flex items-center justify-between py-1.5 border-b border-border/30 last:border-0`}>
            <span className={`text-xs ${highlight ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{label}</span>
            <span className={`text-xs tabular-nums ${highlight ? 'font-bold text-foreground' : 'text-foreground'}`}>{fmt(value)}</span>
        </div>
    );
}

/* ── Mobile slip card ───────────────────────────── */
function MobileSlipCard({ entry }: { entry: PayrollEntry }) {
    const [open, setOpen] = useState(false);

    const workedPct = entry.working_days > 0
        ? Math.min(100, Math.round((entry.worked_days / entry.working_days) * 100))
        : 0;

    const earningsRows: [string, number][] = [
        ['Үндсэн цалин',   entry.basic_salary],
        ['НД цалин',       entry.nd_salary],
        ['А.Т.Х 40%',      entry.ath_bonus],
        ['Илүү цаг 10%',   entry.overtime_bonus],
        ['Ээлж.амр+хувь',  entry.vacation_pay],
        ['Хоол',           entry.food],
        ['Унаа',           entry.transport],
        ['Сүү',            entry.milk],
        ['Баярын урьд',    entry.holiday_advance],
    ].filter(([, v]) => Number(v) > 0) as [string, number][];

    const deductionRows: [string, number][] = [
        ['НДШ 11.5%',  entry.ndsh],
        ['ХХОАТ',      entry.income_tax],
        ['Урьд олгосон', entry.prev_paid],
        ['Хоцролт',    entry.tardiness],
        ['Хуруу',      entry.no_fingerprint],
        ['Бусад',      entry.other_deduction],
    ].filter(([, v]) => Number(v) > 0) as [string, number][];

    return (
        <div style={{ background: 'var(--my-card-bg)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--my-shadow)', border: '1px solid var(--my-card-border)' }}>
            {/* Header */}
            <button onClick={() => setOpen(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 13, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                {/* Month badge */}
                <div style={{ width: 50, height: 50, borderRadius: 16, background: 'linear-gradient(145deg, #f0fdf4, #dcfce7)', border: '1.5px solid #bbf7d0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, gap: 1 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: GRN, lineHeight: 1 }}>{entry.month}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#4ade80', letterSpacing: 0.3 }}>{entry.year}</span>
                </div>
                {/* Labels */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--my-input-text)', margin: 0 }}>{entry.month}-р сарын цалин</p>
                    <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: '3px 0 0' }}>{entry.half_label}
                        {entry.working_days > 0 && (
                            <span style={{ marginLeft: 6, color: 'var(--my-faint)' }}>· {entry.worked_days}/{entry.working_days} өдөр</span>
                        )}
                    </p>
                </div>
                {/* Amount + chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 16, fontWeight: 900, color: GRN, margin: 0, letterSpacing: -0.3 }}>{fmt(entry.net_hand)}</p>
                        <p style={{ fontSize: 9, color: 'var(--my-faint)', margin: '2px 0 0', fontWeight: 600 }}>ГАРТ ОЛГОХ</p>
                    </div>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: open ? '#f0fdf4' : 'var(--my-pill-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {open ? <ChevronUp size={13} color={GRN} /> : <ChevronDown size={13} color="#999" />}
                    </div>
                </div>
            </button>

            {/* Expanded */}
            {open && (
                <div style={{ borderTop: '1px solid var(--my-divider)', padding: '14px 14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>

                    {/* Dark green summary block */}
                    <div style={{ background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)', borderRadius: 18, padding: '16px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: entry.working_days > 0 ? 14 : 0 }}>
                            <div>
                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: '0 0 3px', fontWeight: 700, letterSpacing: 0.6 }}>ГАРТ ОЛГОХ</p>
                                <p style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, letterSpacing: -0.5 }}>{fmt(entry.net_hand)}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: '0 0 3px', fontWeight: 700, letterSpacing: 0.6 }}>БАНКААР</p>
                                <p style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, letterSpacing: -0.5 }}>{fmt(entry.bank_salary)}</p>
                            </div>
                        </div>
                        {entry.working_days > 0 && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Ажилласан өдөр</span>
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>{entry.worked_days} / {entry.working_days} өдөр · {workedPct}%</span>
                                </div>
                                <div style={{ height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${workedPct}%`, background: '#4ade80', borderRadius: 99, transition: 'width 0.5s ease' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Earnings section */}
                    {earningsRows.length > 0 && (
                        <div style={{ background: 'var(--my-pill-bg)', borderRadius: 18, padding: '13px 15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                                <div style={{ width: 22, height: 22, borderRadius: 7, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6' }} />
                                </div>
                                <p style={{ fontSize: 10, fontWeight: 800, color: '#3b82f6', margin: 0, letterSpacing: 0.8 }}>ОРЛОГО</p>
                            </div>
                            {earningsRows.map(([label, value], i) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < earningsRows.length - 1 ? '1px solid var(--my-divider)' : 'none' }}>
                                    <span style={{ fontSize: 12, color: 'var(--my-muted)' }}>{label}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--my-input-text)', fontVariantNumeric: 'tabular-nums' }}>{fmt(value)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Deductions section */}
                    {deductionRows.length > 0 && (
                        <div style={{ background: 'var(--my-pill-bg)', borderRadius: 18, padding: '13px 15px', border: '1px solid #fee2e2' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                                <div style={{ width: 22, height: 22, borderRadius: 7, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: RED }} />
                                </div>
                                <p style={{ fontSize: 10, fontWeight: 800, color: RED, margin: 0, letterSpacing: 0.8 }}>СУУТГАЛ</p>
                            </div>
                            {deductionRows.map(([label, value], i) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < deductionRows.length - 1 ? '1px solid #fecaca' : 'none' }}>
                                    <span style={{ fontSize: 12, color: 'var(--my-muted)' }}>{label}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: RED, fontVariantNumeric: 'tabular-nums' }}>{fmt(value)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Desktop slip card ──────────────────────────── */
function SlipCard({ entry, employee }: { entry: PayrollEntry; employee: EmployeeInfo }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <button onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/40">
                        <DollarSign className="size-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground">{entry.run_title}</p>
                        <p className="text-xs text-muted-foreground">{entry.half_label}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Гарт олгох</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(entry.net_hand)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Банкаар</p>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{fmt(entry.bank_salary)}</p>
                    </div>
                    {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </div>
            </button>
            {open && (
                <div className="border-t px-5 py-4 space-y-4">
                    <div className="rounded-xl border bg-muted/20 px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                        <div><span className="text-muted-foreground">Ажилтан: </span><span className="font-semibold">{employee.full_name}</span></div>
                        <div><span className="text-muted-foreground">Дугаар: </span><span className="font-semibold">{employee.employee_number}</span></div>
                        {employee.position && <div><span className="text-muted-foreground">Тушаал: </span><span className="font-semibold">{employee.position}</span></div>}
                        {employee.bank_account && <div><span className="text-muted-foreground">Данс: </span><span className="font-semibold">{employee.bank_account}</span></div>}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl border p-4">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Үндсэн</p>
                            <Row label="Үндсэн цалин" value={entry.basic_salary} />
                            <Row label="НД цалин" value={entry.nd_salary} />
                            <Row label="Урьд олгосон" value={entry.prev_paid} />
                            <Row label="Баярын урьд" value={entry.holiday_advance} />
                        </div>
                        <div className="rounded-xl border p-4">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">Нэмэгдэл</p>
                            <Row label="А.Т.Х 40%" value={entry.ath_bonus} />
                            <Row label="Илүү цаг 10%" value={entry.overtime_bonus} />
                            <Row label="Ээлж.амр+хувь" value={entry.vacation_pay} />
                            <Row label="Хоол" value={entry.food} />
                            <Row label="Унаа" value={entry.transport} />
                            <Row label="Сүү" value={entry.milk} />
                            <Row label="Нийт нэмэгдэл" value={entry.total_bonus} highlight />
                        </div>
                        <div className="rounded-xl border p-4">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-violet-500">Өдөр</p>
                            <div className="flex justify-between py-1.5 border-b border-border/30 text-xs">
                                <span className="text-muted-foreground">Ажлын өдөр</span>
                                <span className="font-semibold">{entry.working_days}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border/30 text-xs">
                                <span className="text-muted-foreground">Ажилласан</span>
                                <span className="font-semibold">{entry.worked_days}</span>
                            </div>
                            <Row label="1 өдрийн цалин" value={entry.daily_rate} />
                        </div>
                        <div className="rounded-xl border p-4">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-teal-500">Тооцоо</p>
                            <Row label="Тооцсон цалин" value={entry.calc_salary} highlight />
                            <Row label="НД цалин нийт" value={entry.nd_total} />
                        </div>
                        <div className="rounded-xl border p-4">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-red-500">Суутгал</p>
                            <Row label="Хоцролт" value={entry.tardiness} />
                            <Row label="Хуруу" value={entry.no_fingerprint} />
                            <Row label="Бусад" value={entry.other_deduction} />
                            <Row label="НДШ 11.5%" value={entry.ndsh} />
                            <Row label="ХХОАТ" value={entry.income_tax} />
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/10 p-4">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600">Олгох</p>
                            <div className="flex justify-between py-2 border-b border-emerald-200/50 text-xs">
                                <span className="font-semibold text-foreground">Гарт олгох</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{fmt(entry.net_hand)}</span>
                            </div>
                            <div className="flex justify-between py-2 text-xs">
                                <span className="font-semibold text-foreground">Банкаар олгох</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{fmt(entry.bank_salary)}</span>
                            </div>
                            {employee.bank_account && (
                                <p className="mt-1 text-[10px] text-muted-foreground">{employee.bank_name} · {employee.bank_account}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   EXPORT
════════════════════════════════════════════════════════════════ */
export default function MyPayroll({ employee, entries }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Цалингийн задаргаа', href: '/my/payroll' },
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            router.reload({ only: ['entries'] });
        }, 15_000);
        return () => clearInterval(timer);
    }, []);

    const latest = entries[0];

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title="Цалингийн задаргаа" />

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
                            HR · ЦАЛИНГИЙН ЗАДАРГАА
                        </span>
                        <NotificationBell variant="ghost" />
                        <Link href="/my/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {employee.photo_url
                                    ? <img src={employee.photo_url} alt={employee.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                                    : <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{employee.initials}</span>
                                }
                            </div>
                        </Link>
                    </div>

                    {/* Title */}
                    <div style={{ padding: '14px 18px 14px', position: 'relative' }}>
                        <h1 style={{ margin: '0 0 5px', lineHeight: 1.1, letterSpacing: -0.8 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>Цалингийн </span>
                            <span style={{ fontSize: 28, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontFamily: 'Georgia, "Times New Roman", serif' }}>задаргаа</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 14px', fontWeight: 500 }}>
                            {employee.full_name}{employee.position ? ` · ${employee.position}` : ''}
                        </p>

                        {/* Summary glassmorphism block */}
                        <div style={{ borderRadius: 20, background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(12px)', padding: '16px 18px', marginBottom: 4, border: '1px solid rgba(255,255,255,0.12)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: latest ? 12 : 0 }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: 0.6 }}>СҮҮЛИЙН ЦАЛИН</span>
                                    </div>
                                    <p style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: 0, letterSpacing: -0.8, lineHeight: 1 }}>
                                        {latest ? fmt(latest.net_hand) : '—'}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', margin: '0 0 6px', letterSpacing: 0.5, fontWeight: 600 }}>НИЙТ ТООЦОО</p>
                                    <p style={{ fontSize: 34, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{entries.length}</p>
                                </div>
                            </div>
                            {latest && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{latest.month}-р сар · {latest.half_label}</p>
                                    {employee.bank_account && (
                                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{employee.bank_name} · {employee.bank_account}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ═══ CONTENT AREA ══════════════════════════════════════════ */}
                <div style={{ padding: '12px 14px 32px' }}>
                    {entries.length === 0 ? (
                        <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, padding: '48px 20px', textAlign: 'center', boxShadow: 'var(--my-shadow)' }}>
                            <div style={{ width: 56, height: 56, borderRadius: 18, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                <DollarSign size={26} color="#86efac" />
                            </div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-muted)', margin: '0 0 4px' }}>Цалингийн мэдээлэл байхгүй</p>
                            <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0 }}>Баталгаажсан цалингийн тооцоо байхгүй байна</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {entries.map(e => <MobileSlipCard key={e.id} entry={e} />)}
                        </div>
                    )}
                </div>
            </div>

            {/* ════════════════ DESKTOP ════════════════ */}
            <div className="hidden md:flex flex-col gap-4 p-6">
                <div>
                    <h1 className="text-lg font-bold text-foreground">Цалингийн задаргаа</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Баталгаажсан цалингийн тооцоонууд</p>
                </div>
                {entries.length === 0 ? (
                    <div className="rounded-2xl border bg-card p-12 text-center">
                        <p className="text-sm text-muted-foreground">Баталгаажсан цалингийн мэдээлэл байхгүй байна.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {entries.map(e => <SlipCard key={e.id} entry={e} employee={employee} />)}
                    </div>
                )}
            </div>
        </MyLayout>
    );
}
