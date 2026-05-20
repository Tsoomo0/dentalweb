import { ChatIcon } from '@/components/chat-icon';
import { NotificationBell } from '@/components/notification-bell';
import MyLayout from '@/layouts/my-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, ChevronDown, ChevronUp, Stethoscope } from 'lucide-react';
import { useEffect, useState } from 'react';

const RED  = '#dc2626';
const RED2 = '#b91c1c';
const RED3 = '#7f1d1d';
const ACCENT = '#4ade80';

interface EmployeeInfo {
    full_name: string;
    employee_number: string;
    position: string | null;
    photo_url?: string | null;
    initials?: string;
}

interface BonusEntry {
    id: number; run_id: number; run_title: string; half_label: string;
    date: string | null;
    year: number; month: number; half: string;
    visit_count: number;
    clothing: number; hand_hygiene: number; chair_sterilization: number;
    equipment_prep: number; material_prep: number; card_issued: number;
    card_collected: number; pre_exam_prep: number; exam_chair_prep: number;
    post_exam_chair_sterilize: number; tube_sterilization: number; suction_filter: number;
    quartz_before: number; quartz_after: number; xray: number; model_cast: number;
    implant: number; blood_pressure: number; complaint: number; absent: number;
    total_amount: number;
}

const PRE_KEYS = ['clothing', 'hand_hygiene', 'chair_sterilization', 'equipment_prep', 'material_prep'];
const DEDUCT_KEYS = ['complaint', 'absent'];

/**
 * Эмчилгээний урамшууллын мөр бүрийн бодит хувь нэмрийг тооцно (админ талтай ижил логик):
 *  - Pre-key (хувцаслалт, гарын ариун цэвэр, ...): visit_count × count
 *  - Deduct-key (complaint, absent): count × -10,000₮
 *  - Бусад (post-key — карт, рентген, ...): зөвхөн count (үнэгүй нэмэгдэх оноо)
 */
function rowAmount(entry: BonusEntry, key: string): number {
    const count = (entry[key as keyof BonusEntry] as number) || 0;
    if (!count) return 0;
    if (PRE_KEYS.includes(key)) return count * (entry.visit_count || 0);
    if (DEDUCT_KEYS.includes(key)) return -count * 10000;
    return count;
}

interface CriterionDef { label: string; unit: string; price: number }
type CriteriaMap = Record<string, CriterionDef>;

interface Props { employee: EmployeeInfo; entries: BonusEntry[]; criteria: CriteriaMap }

function fmtMoney(n: number) {
    if (!n) return '—';
    return Math.round(n).toLocaleString('en-US') + '₮';
}

function MobileBonusCard({ entry, criteria }: { entry: BonusEntry; criteria: CriteriaMap }) {
    const [open, setOpen] = useState(false);
    // Зөвхөн тоо оруулсан шалгуурыг харуулна (бөглөөгүй мөрийг харуулахгүй)
    const criteriaList = (Object.entries(criteria) as [string, CriterionDef][])
        .filter(([key]) => ((entry[key as keyof BonusEntry] as number) || 0) > 0);

    return (
        <div style={{ background: 'var(--my-card-bg)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--my-shadow)', border: '1px solid var(--my-card-border)' }}>
            <button onClick={() => setOpen(v => !v)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 13, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 50, height: 50, borderRadius: 16, background: 'linear-gradient(145deg, #fef2f2, #fee2e2)', border: '1.5px solid #fecaca', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, gap: 1 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: RED, lineHeight: 1 }}>{entry.date ? Number(entry.date.split('-')[2]) : entry.month}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: RED2, letterSpacing: 0.3 }}>{entry.month}-р сар</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--my-input-text)', margin: 0 }}>
                        {entry.date ? `${entry.month}-р сарын ${Number(entry.date.split('-')[2])}` : `${entry.month}-р сар`}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--my-faint)', margin: '3px 0 0' }}>
                        {entry.date ? `${entry.year} он · ${entry.date}` : entry.half_label}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 16, fontWeight: 900, color: RED, margin: 0, letterSpacing: -0.3 }}>{fmtMoney(entry.total_amount)}</p>
                        <p style={{ fontSize: 9, color: 'var(--my-faint)', margin: '2px 0 0', fontWeight: 600 }}>УРАМШУУЛАЛ</p>
                    </div>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: open ? '#fef2f2' : 'var(--my-pill-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {open ? <ChevronUp size={13} color={RED} /> : <ChevronDown size={13} color="#999" />}
                    </div>
                </div>
            </button>

            {open && (
                <div style={{ borderTop: '1px solid var(--my-divider)', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ background: `linear-gradient(135deg, ${RED3} 0%, ${RED2} 60%, ${RED} 100%)`, borderRadius: 18, padding: '16px 18px' }}>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: '0 0 4px', fontWeight: 700, letterSpacing: 0.6 }}>НИЙТ УРАМШУУЛАЛ</p>
                        <p style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: 0, letterSpacing: -0.6, lineHeight: 1 }}>{fmtMoney(entry.total_amount)}</p>
                    </div>

                    <div style={{ background: 'var(--my-page-bg)', borderRadius: 16, overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--my-divider)' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Шалгуур</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--my-faint)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Дүн</span>
                        </div>
                        {criteriaList.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: 'var(--my-faint)' }}>
                                Бүртгэгдсэн ажил байхгүй
                            </div>
                        ) : criteriaList.map(([key, c]) => {
                            const amount = rowAmount(entry, key);
                            return (
                                <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--my-divider)', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--my-input-text)', margin: 0, lineHeight: 1.2 }}>{c.label}</p>
                                        <p style={{ fontSize: 10, color: 'var(--my-faint)', margin: '2px 0 0' }}>
                                            {PRE_KEYS.includes(key) ? `× ${entry.visit_count || 0} үзлэг` : DEDUCT_KEYS.includes(key) ? '−10,000₮ тус бүр' : '+1 оноо / тус бүр'}
                                        </p>
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: amount < 0 ? '#dc2626' : amount > 0 ? 'var(--my-input-text)' : 'var(--my-faint)' }}>
                                        {amount !== 0 ? (amount < 0 ? `${Math.round(amount).toLocaleString('en-US')}₮` : `+${Math.round(amount).toLocaleString('en-US')}`) : '—'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function DesktopBonusCard({ entry, criteria }: { entry: BonusEntry; criteria: CriteriaMap }) {
    const [open, setOpen] = useState(false);
    // Зөвхөн тоо оруулсан шалгуурыг харуулна
    const criteriaList = (Object.entries(criteria) as [string, CriterionDef][])
        .filter(([key]) => ((entry[key as keyof BonusEntry] as number) || 0) > 0);

    return (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <button onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/40">
                        <CheckCircle2 className="size-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground">{entry.run_title}</p>
                        <p className="text-xs text-muted-foreground">{entry.date ?? entry.half_label}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Нийт урамшуулал</p>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">{fmtMoney(entry.total_amount)}</p>
                    </div>
                    {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </div>
            </button>
            {open && (
                <div className="border-t px-5 py-4">
                    <div className="rounded-xl border overflow-hidden">
                        <div className="grid grid-cols-3 bg-muted/40 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b">
                            <div className="col-span-2">Шалгуур</div>
                            <div className="text-right">Дүн</div>
                        </div>
                        {criteriaList.length === 0 ? (
                            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                                Бүртгэгдсэн ажил байхгүй
                            </div>
                        ) : criteriaList.map(([key, c], i) => {
                            const amount = rowAmount(entry, key);
                            return (
                                <div key={key} className={`grid grid-cols-3 px-4 py-2.5 text-xs border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                    <div className="col-span-2">
                                        <p className="font-medium text-foreground leading-snug">{c.label}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {PRE_KEYS.includes(key) ? `× ${entry.visit_count || 0} үзлэг` : DEDUCT_KEYS.includes(key) ? '−10,000₮ тус бүр' : '+1 оноо / тус бүр'}
                                        </p>
                                    </div>
                                    <div className={`text-right tabular-nums font-semibold self-center ${amount < 0 ? 'text-red-600 dark:text-red-400' : amount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {amount !== 0 ? (amount < 0 ? `${Math.round(amount).toLocaleString('en-US')}₮` : `+${Math.round(amount).toLocaleString('en-US')}`) : '—'}
                                    </div>
                                </div>
                            );
                        })}
                        <div className="grid grid-cols-3 px-4 py-3 bg-red-50/50 dark:bg-red-950/10 border-t-2 border-red-200 dark:border-red-800">
                            <div className="col-span-2 text-sm font-bold text-foreground">Нийт</div>
                            <div className="text-right text-sm font-bold text-red-700 dark:text-red-400 tabular-nums">{fmtMoney(entry.total_amount)}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MyNurseBonus({ employee, entries, criteria }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Хувийн мэдээлэл', href: '/my/profile' },
        { title: 'Сувилагчийн урамшуулал', href: '/my/nurse-bonus' },
    ];

    useEffect(() => {
        const timer = setInterval(() => { router.reload({ only: ['entries'] }); }, 15_000);
        return () => clearInterval(timer);
    }, []);

    const totalAllTime = entries.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);
    const latest = entries[0];

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title="Сувилагчийн урамшуулал" />

            {/* ════════════════ MOBILE ════════════════ */}
            <div className="md:hidden" style={{ flex: 1, background: 'var(--my-page-bg)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(88px + env(safe-area-inset-bottom,0px))' } as React.CSSProperties}>
                {/* ═══ RED HERO ════════════════════════════════════ */}
                <div style={{ background: `linear-gradient(160deg, #ef4444 0%, ${RED} 30%, ${RED2} 65%, ${RED3} 100%)`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -60, right: -60, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: 40, right: 40, pointerEvents: 'none' }} />

                    {/* Top icons */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '14px 18px 0', position: 'relative', zIndex: 2 }}>
                        <ChatIcon variant="ghost" />
                        <NotificationBell variant="ghost" />
                    </div>

                    <div style={{ padding: '6px 18px 18px', position: 'relative' }}>
                        <h1 style={{ margin: '0 0 5px', lineHeight: 1.1, letterSpacing: -0.8 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>Сувилагчийн </span>
                            <span style={{ fontSize: 28, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontFamily: 'Georgia, "Times New Roman", serif' }}>урамшуулал</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 14px', fontWeight: 500 }}>
                            {employee.full_name}{employee.position ? ` · ${employee.position}` : ''}
                        </p>

                        <div style={{ borderRadius: 20, background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(12px)', padding: '16px 18px', border: '1px solid rgba(255,255,255,0.12)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT }} />
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: 0.6 }}>СҮҮЛИЙН УРАМШУУЛАЛ</span>
                                    </div>
                                    <p style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: 0, letterSpacing: -0.6, lineHeight: 1 }}>
                                        {latest ? fmtMoney(latest.total_amount) : '—'}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', margin: '0 0 6px', letterSpacing: 0.5, fontWeight: 600 }}>НИЙТ ТООЦОО</p>
                                    <p style={{ fontSize: 34, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>{entries.length}</p>
                                </div>
                            </div>
                            {totalAllTime > 0 && (
                                <div style={{ paddingTop: 10, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: 0, fontWeight: 600 }}>
                                        Нийт авсан: <span style={{ color: 'white', fontWeight: 800 }}>{fmtMoney(totalAllTime)}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '12px 14px 32px' }}>
                    {entries.length === 0 ? (
                        <div style={{ background: 'var(--my-card-bg)', borderRadius: 24, padding: '48px 20px', textAlign: 'center', boxShadow: 'var(--my-shadow)' }}>
                            <div style={{ width: 56, height: 56, borderRadius: 18, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                <Stethoscope size={26} color="#fca5a5" />
                            </div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--my-muted)', margin: '0 0 4px' }}>Урамшуулал байхгүй</p>
                            <p style={{ fontSize: 12, color: 'var(--my-faint)', margin: 0 }}>Баталгаажсан урамшуулал байхгүй байна</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {entries.map(e => <MobileBonusCard key={e.id} entry={e} criteria={criteria} />)}
                        </div>
                    )}
                </div>
            </div>

            {/* ════════════════ DESKTOP ════════════════ */}
            <div className="hidden md:flex flex-col gap-4 p-4 md:p-6">
                <div>
                    <h1 className="text-lg font-bold text-foreground">Сувилагчийн урамшуулал</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Баталгаажсан урамшуулал · {employee.position}</p>
                </div>
                {entries.length === 0 ? (
                    <div className="rounded-2xl border bg-card p-12 text-center">
                        <p className="text-sm text-muted-foreground">Баталгаажсан урамшуулал байхгүй байна.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {entries.map(e => <DesktopBonusCard key={e.id} entry={e} criteria={criteria} />)}
                    </div>
                )}
            </div>
        </MyLayout>
    );
}
