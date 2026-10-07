import { ChatIcon } from '@/components/chat-icon';
import { NotificationBell } from '@/components/notification-bell';
import MyLayout from '@/layouts/my-layout';
import { type PayrollColumn } from '@/lib/payroll-formula';
import { MyCard, MyDesktop, MyEmpty, MyHeader, MyStat, myTable } from '@/components/my/page-kit';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronDown, ChevronUp, DollarSign, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const RED = '#dc2626';
const RED2 = '#b91c1c';
const RED3 = '#7f1d1d';
const GRN = '#16a34a';

interface EmployeeInfo {
    full_name: string;
    employee_number: string;
    position: string | null;
    bank_account: string | null;
    bank_name: string | null;
    photo_url: string | null;
    initials: string;
}
interface PayrollEntry extends Record<string, unknown> {
    id: number;
    run_id: number;
    run_title: string;
    half: 'first' | 'second';
    half_label: string;
    year: number;
    month: number;
}
interface Props {
    employee: EmployeeInfo;
    entries: PayrollEntry[];
    /** Хагас тус бүрийн баганын бүтэц — серверийн PayrollSchema-аас ирнэ */
    schemas: Record<'first' | 'second', PayrollColumn[]>;
}

/**
 * Админы хүснэгттэй ижил дүрэм: ажилласан өдөр, гарт олгох, банкаар олгох
 * гурав л бутархайгаар — 2 орон хүртэл — харагдана.
 */
function fmt(n: number, decimal = false) {
    if (!n) return '—';
    const text = decimal ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : Math.round(n).toLocaleString('en-US');
    return text + '₮';
}

function num(entry: PayrollEntry, key: string): number {
    return Number(entry[key]) || 0;
}

/**
 * Баганын нэр.  Тоо ширхэгтэй бол дүнгийнх нь хажууд хаанаас гарсныг харуулна
 * — ажилтан суутгалаа өөрөө шалгах боломжтой (Хоцролт (55 минут)).
 */
function labelFor(entry: PayrollEntry, col: PayrollColumn): string {
    if (!col.counter) return col.label;

    const count = num(entry, col.counter.key);

    return count ? `${col.label} (${count} ${col.counter.unit})` : col.label;
}

/** Тухайн үүрэгтэй, тэгээс ялгаатай утгатай баганууд. */
function rowsByRole(entry: PayrollEntry, columns: PayrollColumn[], roles: string[]): Array<[string, number, boolean]> {
    return columns
        .filter((c) => roles.includes(c.role) && num(entry, c.key) !== 0)
        .map((c) => [labelFor(entry, c), num(entry, c.key), c.decimal] as [string, number, boolean]);
}

const GROUP_TEXT: Record<string, string> = {
    slate: 'text-slate-500',
    violet: 'text-violet-500',
    sky: 'text-sky-500',
    blue: 'text-blue-500',
    orange: 'text-orange-500',
    cyan: 'text-cyan-500',
    red: 'text-red-500',
    teal: 'text-teal-500',
    purple: 'text-purple-500',
    emerald: 'text-emerald-600',
};

/* ── Desktop row helper ─────────────────────────── */
function Row({ label, value, highlight, decimal }: { label: string; value: number; highlight?: boolean; decimal?: boolean }) {
    if (!value) return null;
    return (
        <div className={`border-border/30 flex items-center justify-between border-b py-1.5 last:border-0`}>
            <span className={`text-xs ${highlight ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{label}</span>
            <span className={`text-xs tabular-nums ${highlight ? 'text-foreground font-bold' : 'text-foreground'}`}>{fmt(value, decimal)}</span>
        </div>
    );
}

/* ── Mobile slip card ───────────────────────────── */
function MobileSlipCard({ entry, columns }: { entry: PayrollEntry; columns: PayrollColumn[] }) {
    const [open, setOpen] = useState(false);

    const workingDays = num(entry, 'working_days');
    const workedDays = num(entry, 'worked_days');
    const workedPct = workingDays > 0 ? Math.min(100, Math.round((workedDays / workingDays) * 100)) : 0;

    const earningsRows = rowsByRole(entry, columns, ['earning', 'total']);
    const deductionRows = rowsByRole(entry, columns, ['deduction']);

    return (
        <div
            style={{
                background: 'var(--my-card-bg)',
                borderRadius: 22,
                overflow: 'hidden',
                boxShadow: 'var(--my-shadow)',
                border: '1px solid var(--my-card-border)',
            }}
        >
            {/* Header */}
            <button
                onClick={() => setOpen((v) => !v)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 16px',
                    gap: 13,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                {/* Month badge */}
                <div
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: 16,
                        background: 'linear-gradient(145deg, #f0fdf4, #dcfce7)',
                        border: '1.5px solid #bbf7d0',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        gap: 1,
                    }}
                >
                    <span style={{ fontSize: 22, fontWeight: 900, color: GRN, lineHeight: 1 }}>{entry.month}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#4ade80', letterSpacing: 0.3 }}>{entry.year}</span>
                </div>
                {/* Labels */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                        style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: 'var(--my-input-text)',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {entry.month}-р сарын цалин
                    </p>
                    <p
                        style={{
                            fontSize: 11,
                            color: 'var(--my-faint)',
                            margin: '3px 0 0',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {entry.half_label}
                        {workingDays > 0 && (
                            <span style={{ marginLeft: 6, color: 'var(--my-faint)' }}>
                                · {workedDays}/{workingDays} өдөр
                            </span>
                        )}
                    </p>
                </div>
                {/* Amount + chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                        <p
                            style={{
                                fontSize: 'clamp(13px, 4vw, 16px)',
                                fontWeight: 900,
                                color: GRN,
                                margin: 0,
                                letterSpacing: -0.3,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {fmt(num(entry, 'net_hand'), true)}
                        </p>
                        <p style={{ fontSize: 9, color: 'var(--my-faint)', margin: '2px 0 0', fontWeight: 600 }}>ГАРТ ОЛГОХ</p>
                    </div>
                    <div
                        style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: open ? '#f0fdf4' : 'var(--my-pill-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {open ? <ChevronUp size={13} color={GRN} /> : <ChevronDown size={13} color="#999" />}
                    </div>
                </div>
            </button>

            {/* Expanded */}
            {open && (
                <div
                    style={{ borderTop: '1px solid var(--my-divider)', padding: '14px 14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                    {/* Dark green summary block */}
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)',
                            borderRadius: 18,
                            padding: '16px 18px',
                        }}
                    >
                        {/* Бутархайтай дүн урт болдог тул хажуу хажуугаас нь биш,
                            дээр доор нь байрлуулна — нарийн дэлгэц дээр ч шахагдахгүй */}
                        <div style={{ marginBottom: workingDays > 0 ? 14 : 0 }}>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: '0 0 2px', fontWeight: 700, letterSpacing: 0.6 }}>
                                ГАРТ ОЛГОХ
                            </p>
                            <p
                                style={{
                                    fontSize: 'clamp(20px, 7.5vw, 28px)',
                                    fontWeight: 900,
                                    color: 'white',
                                    margin: 0,
                                    letterSpacing: -0.5,
                                    lineHeight: 1.15,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {fmt(num(entry, 'net_hand'), true)}
                            </p>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    marginTop: 10,
                                    paddingTop: 10,
                                    borderTop: '1px solid rgba(255,255,255,0.15)',
                                }}
                            >
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: 0.6, flexShrink: 0 }}>
                                    БАНКААР
                                </span>
                                <span
                                    style={{
                                        fontSize: 'clamp(15px, 5vw, 19px)',
                                        fontWeight: 800,
                                        color: 'white',
                                        letterSpacing: -0.3,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {fmt(num(entry, 'bank_salary'), true)}
                                </span>
                            </div>
                        </div>
                        {workingDays > 0 && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Ажилласан өдөр</span>
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>
                                        {workedDays} / {workingDays} өдөр · {workedPct}%
                                    </span>
                                </div>
                                <div style={{ height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                                    <div
                                        style={{
                                            height: '100%',
                                            width: `${workedPct}%`,
                                            background: '#4ade80',
                                            borderRadius: 99,
                                            transition: 'width 0.5s ease',
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Earnings section */}
                    {earningsRows.length > 0 && (
                        <div style={{ background: 'var(--my-pill-bg)', borderRadius: 18, padding: '13px 15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                                <div
                                    style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: 7,
                                        background: '#dbeafe',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6' }} />
                                </div>
                                <p style={{ fontSize: 10, fontWeight: 800, color: '#3b82f6', margin: 0, letterSpacing: 0.8 }}>ОРЛОГО</p>
                            </div>
                            {earningsRows.map(([label, value, dec], i) => (
                                <div
                                    key={label}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '7px 0',
                                        borderBottom: i < earningsRows.length - 1 ? '1px solid var(--my-divider)' : 'none',
                                    }}
                                >
                                    <span style={{ fontSize: 12, color: 'var(--my-muted)', paddingRight: 10, lineHeight: 1.35 }}>{label}</span>
                                    <span
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: 'var(--my-input-text)',
                                            fontVariantNumeric: 'tabular-nums',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {fmt(value, dec)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Deductions section */}
                    {deductionRows.length > 0 && (
                        <div style={{ background: 'var(--my-pill-bg)', borderRadius: 18, padding: '13px 15px', border: '1px solid #fee2e2' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                                <div
                                    style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: 7,
                                        background: '#fee2e2',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: RED }} />
                                </div>
                                <p style={{ fontSize: 10, fontWeight: 800, color: RED, margin: 0, letterSpacing: 0.8 }}>СУУТГАЛ</p>
                            </div>
                            {deductionRows.map(([label, value, dec], i) => (
                                <div
                                    key={label}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '7px 0',
                                        borderBottom: i < deductionRows.length - 1 ? '1px solid #fecaca' : 'none',
                                    }}
                                >
                                    <span style={{ fontSize: 12, color: 'var(--my-muted)', paddingRight: 10, lineHeight: 1.35 }}>{label}</span>
                                    <span
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: RED,
                                            fontVariantNumeric: 'tabular-nums',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {fmt(value, dec)}
                                    </span>
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
/* ── Desktop: сонгосон тооцооны задаргаа ───────────────── */
function PayslipDetail({ entry, employee, columns }: { entry: PayrollEntry; employee: EmployeeInfo; columns: PayrollColumn[] }) {
    /**
     * Задаргааг баганын үүргээр хэсэглэнэ.  Ажилтанд админы 9 бүлэг хэрэггүй —
     * орлого / өдөр / дүн / суутгал гэсэн 4 хэсэг хангалттай.
     */
    const sections = useMemo(() => {
        const spec: Array<{ label: string; color: string; roles: string[] }> = [
            { label: 'Орлого · Нэмэгдэл', color: 'blue', roles: ['earning'] },
            { label: 'Тооцсон дүн', color: 'teal', roles: ['total'] },
            { label: 'Суутгал', color: 'red', roles: ['deduction'] },
        ];

        return spec
            .map((sec) => ({ ...sec, columns: columns.filter((c) => sec.roles.includes(c.role) && num(entry, c.key) !== 0) }))
            .filter((sec) => sec.columns.length > 0);
    }, [columns, entry]);

    return (
        <MyCard title={entry.run_title} icon={DollarSign} className="self-start lg:sticky lg:top-4"
            actions={<span className="text-[11px] text-muted-foreground">{entry.half_label}</span>}>
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                        <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Гарт олгох</p>
                        <p className="text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-400">{fmt(num(entry, 'net_hand'), true)}</p>
                    </div>
                    <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2">
                        <p className="text-[10px] font-semibold text-sky-700 dark:text-sky-300">Банкаар олгох</p>
                        <p className="text-lg font-black tabular-nums text-sky-700 dark:text-sky-400">{fmt(num(entry, 'bank_salary'), true)}</p>
                        {employee.bank_account && <p className="truncate text-[10px] text-muted-foreground">{employee.bank_name} · {employee.bank_account}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 px-3 py-2 text-center">
                    <div><p className="text-[10px] text-muted-foreground">Ажлын өдөр</p><p className="text-sm font-bold tabular-nums">{num(entry, 'working_days') || '—'}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Ажилласан</p><p className="text-sm font-bold tabular-nums">{num(entry, 'worked_days') || '—'}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">1 өдрийн цалин</p><p className="text-sm font-bold tabular-nums">{fmt(num(entry, 'daily_rate'))}</p></div>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                    {sections.map((section) => (
                        <div key={section.label} className={`rounded-lg border border-border/60 px-3 py-2 ${section.color === 'red' ? 'xl:col-span-2' : ''}`}>
                            <p className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${GROUP_TEXT[section.color] ?? GROUP_TEXT.slate}`}>{section.label}</p>
                            {section.columns.map((col) => (
                                <Row key={col.key} label={labelFor(entry, col)} value={num(entry, col.key)} highlight={col.role === 'total'} decimal={col.decimal} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </MyCard>
    );
}

/* ════════════════════════════════════════════════════════════════
   EXPORT
════════════════════════════════════════════════════════════════ */
export default function MyPayroll({ employee, entries, schemas }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Цалингийн задаргаа', href: '/my/payroll' }];

    useEffect(() => {
        const timer = setInterval(() => {
            router.reload({ only: ['entries'] });
        }, 15_000);
        return () => clearInterval(timer);
    }, []);

    const latest = entries[0];

    // Компьютерийн жагсаалт: шинээс нь хуучин руу (он → сар → сүүл/эхний хагас)
    const sorted = [...entries].sort((a, b) => b.year - a.year || b.month - a.month || (a.half === b.half ? 0 : a.half === 'second' ? -1 : 1));
    const latestSorted = sorted[0];
    const thisYear = new Date().getFullYear();
    const yearBank = sorted.filter(e => e.year === thisYear).reduce((sum, e) => sum + num(e, 'bank_salary'), 0);
    const [selId, setSelId] = useState<number | null>(null);
    const selected = sorted.find(e => e.id === selId) ?? latestSorted;

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title="Цалингийн задаргаа" />

            {/* ════════════════ MOBILE ════════════════ */}
            <div
                className="md:hidden"
                style={
                    {
                        flex: 1,
                        background: 'var(--my-page-bg)',
                        overflowY: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))',
                    } as React.CSSProperties
                }
            >
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

                {/* ═══ RED HERO ══════════════════════════════════════════════ */}
                <div
                    style={{
                        background: `linear-gradient(160deg, #ef4444 0%, ${RED} 30%, ${RED2} 65%, ${RED3} 100%)`,
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            width: 200,
                            height: 200,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)',
                            top: -60,
                            right: -60,
                            pointerEvents: 'none',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            width: 120,
                            height: 120,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.04)',
                            top: 40,
                            right: 40,
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Top bar */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 0', gap: 10, position: 'relative' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, flex: 1, letterSpacing: 0.3 }}>
                            HR · ЦАЛИНГИЙН ЗАДАРГАА
                        </span>
                        <ChatIcon variant="ghost" />
                        <NotificationBell variant="ghost" />
                        <Link href="/my/profile" style={{ textDecoration: 'none', flexShrink: 0 }}>
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: '2px solid rgba(255,255,255,0.5)',
                                    background: 'rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {employee.photo_url ? (
                                    <img
                                        src={employee.photo_url}
                                        alt={employee.full_name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                                    />
                                ) : (
                                    <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{employee.initials}</span>
                                )}
                            </div>
                        </Link>
                    </div>

                    {/* Title */}
                    <div style={{ padding: '14px 18px 14px', position: 'relative' }}>
                        <h1 style={{ margin: '0 0 5px', lineHeight: 1.1, letterSpacing: -0.8 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>Цалингийн </span>
                            <span
                                style={{
                                    fontSize: 28,
                                    fontWeight: 300,
                                    fontStyle: 'italic',
                                    color: 'rgba(255,255,255,0.7)',
                                    fontFamily: 'Georgia, "Times New Roman", serif',
                                }}
                            >
                                задаргаа
                            </span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 14px', fontWeight: 500 }}>
                            {employee.full_name}
                            {employee.position ? ` · ${employee.position}` : ''}
                        </p>

                        {/* Summary glassmorphism block */}
                        <div
                            style={{
                                borderRadius: 20,
                                background: 'rgba(0,0,0,0.28)',
                                backdropFilter: 'blur(12px)',
                                padding: '16px 18px',
                                marginBottom: 4,
                                border: '1px solid rgba(255,255,255,0.12)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: 12,
                                    marginBottom: latest ? 12 : 0,
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: 0.6 }}>
                                            СҮҮЛИЙН ЦАЛИН
                                        </span>
                                    </div>
                                    <p
                                        style={{
                                            fontSize: 'clamp(21px, 7vw, 30px)',
                                            fontWeight: 900,
                                            color: 'white',
                                            margin: 0,
                                            letterSpacing: -0.8,
                                            lineHeight: 1,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {latest ? fmt(num(latest, 'net_hand'), true) : '—'}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <p
                                        style={{
                                            fontSize: 10,
                                            color: 'rgba(255,255,255,0.45)',
                                            margin: '0 0 6px',
                                            letterSpacing: 0.5,
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        НИЙТ ТООЦОО
                                    </p>
                                    <p style={{ fontSize: 34, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{entries.length}</p>
                                </div>
                            </div>
                            {latest && (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingTop: 10,
                                        borderTop: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                >
                                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                                        {latest.month}-р сар · {latest.half_label}
                                    </p>
                                    {employee.bank_account && (
                                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                                            {employee.bank_name} · {employee.bank_account}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ═══ CONTENT AREA ══════════════════════════════════════════ */}
                <div style={{ padding: '12px 14px 32px' }}>
                    {entries.length === 0 ? (
                        <div
                            style={{
                                background: 'var(--my-card-bg)',
                                borderRadius: 24,
                                padding: '48px 20px',
                                textAlign: 'center',
                                boxShadow: 'var(--my-shadow)',
                            }}
                        >
                            <div
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 18,
                                    background: '#f0fdf4',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 12px',
                                }}
                            >
                                <DollarSign size={26} color="#86efac" />
                            </div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-muted)', margin: '0 0 4px' }}>Цалингийн мэдээлэл байхгүй</p>
                            <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0 }}>Баталгаажсан цалингийн тооцоо байхгүй байна</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {entries.map((e) => (
                                <MobileSlipCard key={e.id} entry={e} columns={schemas[e.half]} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ════════════════ DESKTOP ════════════════ */}
            <MyDesktop>
                <MyHeader icon={Wallet} title="Цалингийн задаргаа"
                    subtitle={<>
                        <span>{employee.full_name}</span>
                        <span className="tabular-nums">{employee.employee_number}</span>
                        {employee.position && <span>{employee.position}</span>}
                        {employee.bank_account && <span>{employee.bank_name} · {employee.bank_account}</span>}
                    </>}
                    stats={[
                        <MyStat key="h" label="Сүүлийн · гарт олгох" value={latestSorted ? fmt(num(latestSorted, 'net_hand'), true) : '—'} accent="emerald" title={latestSorted?.run_title} />,
                        <MyStat key="b" label="Сүүлийн · банкаар" value={latestSorted ? fmt(num(latestSorted, 'bank_salary'), true) : '—'} accent="emerald" />,
                        <MyStat key="y" label={`${thisYear} онд банкаар`} value={fmt(yearBank)} accent="sky" />,
                        <MyStat key="c" label="Тооцоо" value={sorted.length} sub="удаа" />,
                    ]} />

                {sorted.length === 0 ? (
                    <MyCard><MyEmpty icon={Wallet} title="Баталгаажсан цалингийн мэдээлэл байхгүй байна" hint="HR цалинг баталгаажуулсны дараа энд харагдана." /></MyCard>
                ) : (
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                        <MyCard title="Тооцоонууд" icon={DollarSign} count={sorted.length} bodyClassName="">
                            <table className={myTable.table}>
                                <thead className={myTable.thead}>
                                    <tr className="border-b border-border/50">
                                        <th className={myTable.th}>Хугацаа</th>
                                        <th className={`${myTable.th} text-right`}>Гарт олгох</th>
                                        <th className={`${myTable.th} text-right`}>Банкаар</th>
                                    </tr>
                                </thead>
                                <tbody className={myTable.tbody}>
                                    {sorted.map(e => {
                                        const sel = e.id === selected?.id;
                                        return (
                                            <tr key={e.id} onClick={() => setSelId(e.id)}
                                                className={`cursor-pointer transition-colors ${sel ? 'bg-red-50/70 dark:bg-red-950/20' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'}`}>
                                                <td className={myTable.td}>
                                                    <p className="font-semibold">{e.year} оны {e.month}-р сар</p>
                                                    <p className="text-[10px] text-muted-foreground">{e.half_label}</p>
                                                </td>
                                                <td className={`${myTable.td} text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400`}>{fmt(num(e, 'net_hand'), true)}</td>
                                                <td className={`${myTable.td} text-right tabular-nums`}>{fmt(num(e, 'bank_salary'), true)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </MyCard>

                        {selected && <PayslipDetail entry={selected} employee={employee} columns={schemas[selected.half]} />}
                    </div>
                )}
            </MyDesktop>
        </MyLayout>
    );
}
