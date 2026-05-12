import MyLayout from '@/layouts/my-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EmployeeInfo { full_name: string; employee_number: string; position: string | null }

interface BonusEntry {
    id: number; run_id: number; run_title: string; half_label: string;
    year: number; month: number; half: string;
    registrations: number; calls_received: number; call_reminders: number;
    complaints: number; compliments: number; hubspot_regs: number; payments: number;
    total_amount: number;
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
    const criteriaList = Object.entries(criteria) as [string, CriterionDef][];

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <button onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-4 text-left active:bg-gray-50 dark:active:bg-zinc-800 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="size-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{entry.run_title}</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">{entry.half_label}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500">Нийт урамшуулал</p>
                        <p className="text-sm font-bold text-violet-600 dark:text-violet-400">{fmtMoney(entry.total_amount)}</p>
                    </div>
                    {open ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
                </div>
            </button>

            {open && (
                <div className="border-t border-gray-100 dark:border-zinc-800 px-4 py-4">
                    <div className="rounded-2xl bg-gray-50 dark:bg-zinc-800 overflow-hidden">
                        <div className="grid grid-cols-4 px-4 py-2.5 border-b border-gray-100 dark:border-zinc-700 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                            <div className="col-span-2">Шалгуур</div>
                            <div className="text-right">Тоо</div>
                            <div className="text-right">Дүн</div>
                        </div>
                        {criteriaList.map(([key, c], i) => {
                            const count  = entry[key as keyof BonusEntry] as number || 0;
                            const amount = count * c.price;
                            return (
                                <div key={key} className={`grid grid-cols-4 px-4 py-2.5 border-b border-gray-100 dark:border-zinc-700 last:border-0 text-xs ${i % 2 === 0 ? '' : 'bg-white/50 dark:bg-zinc-700/30'}`}>
                                    <div className="col-span-2">
                                        <p className="font-medium text-gray-800 dark:text-gray-200 leading-snug">{c.label}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                                            {c.price < 0 ? `-${Math.abs(c.price).toLocaleString('en-US')}₮` : `+${c.price.toLocaleString('en-US')}₮`} / {c.unit}
                                        </p>
                                    </div>
                                    <div className="text-right tabular-nums text-gray-400 dark:text-zinc-500 self-center">
                                        {count ? `${count} ${c.unit}` : '—'}
                                    </div>
                                    <div className={`text-right tabular-nums font-semibold self-center ${amount < 0 ? 'text-red-600' : amount > 0 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>
                                        {amount ? `${Math.round(amount).toLocaleString('en-US')}₮` : '—'}
                                    </div>
                                </div>
                            );
                        })}
                        <div className="grid grid-cols-4 px-4 py-3 bg-violet-50 dark:bg-violet-950/30 border-t-2 border-violet-200 dark:border-violet-800">
                            <div className="col-span-2 text-sm font-bold text-gray-900 dark:text-gray-100">Нийт</div>
                            <div />
                            <div className="text-right text-sm font-bold text-violet-700 dark:text-violet-400 tabular-nums">{fmtMoney(entry.total_amount)}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DesktopBonusCard({ entry, criteria }: { entry: BonusEntry; criteria: CriteriaMap }) {
    const [open, setOpen] = useState(false);
    const criteriaList = Object.entries(criteria) as [string, CriterionDef][];

    return (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <button onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/40">
                        <CheckCircle2 className="size-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground">{entry.run_title}</p>
                        <p className="text-xs text-muted-foreground">{entry.half_label}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">Нийт урамшуулал</p>
                        <p className="text-sm font-bold text-violet-600 dark:text-violet-400">{fmtMoney(entry.total_amount)}</p>
                    </div>
                    {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </div>
            </button>
            <div className="sm:hidden flex gap-4 px-5 pb-3 border-t pt-2">
                <div>
                    <p className="text-[10px] text-muted-foreground">Нийт урамшуулал</p>
                    <p className="text-sm font-bold text-violet-600">{fmtMoney(entry.total_amount)}</p>
                </div>
            </div>
            {open && (
                <div className="border-t px-5 py-4">
                    <div className="rounded-xl border overflow-hidden">
                        <div className="grid grid-cols-4 bg-muted/40 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b">
                            <div className="col-span-2">Шалгуур</div>
                            <div className="text-right">Тоо</div>
                            <div className="text-right">Дүн</div>
                        </div>
                        {criteriaList.map(([key, c], i) => {
                            const count  = entry[key as keyof BonusEntry] as number || 0;
                            const amount = count * c.price;
                            return (
                                <div key={key} className={`grid grid-cols-4 px-4 py-2.5 text-xs border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                    <div className="col-span-2">
                                        <p className="font-medium text-foreground leading-snug">{c.label}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {c.price < 0 ? `-${Math.abs(c.price).toLocaleString('en-US')}₮` : `+${c.price.toLocaleString('en-US')}₮`} / {c.unit}
                                        </p>
                                    </div>
                                    <div className="text-right tabular-nums text-muted-foreground self-center">{count ? `${count} ${c.unit}` : '—'}</div>
                                    <div className={`text-right tabular-nums font-semibold self-center ${amount < 0 ? 'text-red-600 dark:text-red-400' : amount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {amount ? `${Math.round(amount).toLocaleString('en-US')}₮` : '—'}
                                    </div>
                                </div>
                            );
                        })}
                        <div className="grid grid-cols-4 px-4 py-3 bg-violet-50/50 dark:bg-violet-950/10 border-t-2 border-violet-200 dark:border-violet-800">
                            <div className="col-span-2 text-sm font-bold text-foreground">Нийт</div>
                            <div />
                            <div className="text-right text-sm font-bold text-violet-700 dark:text-violet-400 tabular-nums">{fmtMoney(entry.total_amount)}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MyReceptionBonus({ employee, entries, criteria }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Хувийн мэдээлэл', href: '/my/profile' },
        { title: 'Урамшуулал', href: '/my/reception-bonus' },
    ];

    useEffect(() => {
        const timer = setInterval(() => { router.reload({ only: ['entries'] }); }, 15_000);
        return () => clearInterval(timer);
    }, []);

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title="Урамшуулал" />

            {/* ════ MOBILE ════ */}
            <div className="md:hidden min-h-full bg-[#f2f2f7] dark:bg-zinc-950">
                <div className="px-4 pt-6 pb-12">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 px-1 mb-3">
                        Урамшуулал · {employee.position}
                    </p>
                    {entries.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 bg-white dark:bg-zinc-900 rounded-2xl" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                            <CheckCircle2 className="size-10 text-gray-200 dark:text-zinc-700" />
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Баталгаажсан урамшуулал байхгүй байна.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {entries.map(e => <MobileBonusCard key={e.id} entry={e} criteria={criteria} />)}
                        </div>
                    )}
                </div>
            </div>

            {/* ════ DESKTOP ════ */}
            <div className="hidden md:flex flex-col gap-4 p-4 md:p-6">
                <div>
                    <h1 className="text-lg font-bold text-foreground">Урамшуулал</h1>
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
