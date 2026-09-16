import {
    Card, CardHead, CardNote, CallsHeader, Empty, FilterBar, INPUT, InlineStat, LABEL, Pill,
    Segmented, TABLE, TD, TH, THEAD, TR, TableWrap, type Tone,
} from '@/components/calls-ui';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Building2, CalendarRange, FileSpreadsheet, PieChart } from 'lucide-react';
import { useState } from 'react';

/* ── Types ─────────────────────────────────────────────── */
interface Row {
    period: string;
    label: string;
    total: number;
    answered: number;
    missed: number;
    unhandled: number;
    after_hours: number;
    spam: number;
    appointments: number;
    answer_rate: number | null;
    avg_talk: number | null;
}
interface BranchRow extends Row { branch_id: number | null }
interface Filters { from: string; to: string; branch_id: number | null; group_by: 'day' | 'week' | 'month' }

interface Props {
    filters: Filters;
    branches: { id: number; name: string }[];
    rows: Row[];
    totals: Row;
    byBranch: BranchRow[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Дуудлага', href: '/admin/calls' },
    { title: 'Тайлан', href: '/admin/calls/reports' },
];

const GROUPS: { key: Filters['group_by']; label: string }[] = [
    { key: 'day', label: 'Өдрөөр' },
    { key: 'week', label: '7 хоногоор' },
    { key: 'month', label: 'Сараар' },
];

function fmtTalk(sec: number | null) {
    if (sec === null || sec === undefined) return '—';
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function rateTone(rate: number | null): Tone {
    if (rate === null) return 'slate';
    if (rate >= 90) return 'emerald';
    if (rate >= 75) return 'amber';
    return 'red';
}

export default function CallReports({ filters, branches, rows, totals, byBranch }: Props) {
    const [form, setForm] = useState<Filters>(filters);

    function set<K extends keyof Filters>(key: K, value: Filters[K]) {
        const next = { ...form, [key]: value };
        setForm(next);
        router.get('/admin/calls/reports', { ...next }, { preserveState: true, replace: true });
    }

    const exportUrl = `/admin/calls/reports/export?${new URLSearchParams({
        from: form.from,
        to: form.to,
        group_by: form.group_by,
        ...(form.branch_id ? { branch_id: String(form.branch_id) } : {}),
    })}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Дуудлагын тайлан" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <CallsHeader
                    icon={PieChart}
                    title="Дуудлагын тайлан"
                    subtitle={`${form.from} — ${form.to}`}
                    current="reports"
                    actions={
                        /* Excel татах — Inertia-гүй энгийн холбоос байх ёстой */
                        <a
                            href={exportUrl}
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm shadow-emerald-500/25 transition hover:bg-emerald-700 active:scale-[0.98]"
                        >
                            <FileSpreadsheet className="size-3.5" /> Excel татах
                        </a>
                    }
                >
                    <div className="grid grid-cols-2 divide-x divide-indigo-100/70 border-t border-indigo-100/70 sm:grid-cols-5 dark:divide-white/5 dark:border-white/5">
                        <InlineStat label="Нийт" value={totals.total.toLocaleString()} />
                        <InlineStat label="Хариулсан" value={totals.answered.toLocaleString()} tone="emerald" />
                        <InlineStat label="Алдсан" value={totals.missed.toLocaleString()} tone={totals.missed > 0 ? 'red' : 'slate'} />
                        <InlineStat label="Цаг захиалга" value={totals.appointments.toLocaleString()} tone="indigo" />
                        <InlineStat
                            label="Хариулалт"
                            value={totals.answer_rate === null ? '—' : `${totals.answer_rate}%`}
                            tone={rateTone(totals.answer_rate)}
                        />
                    </div>
                </CallsHeader>

                {/* ── Шүүлтүүр ── */}
                <FilterBar>
                    <div>
                        <label className={LABEL}>Эхлэх</label>
                        <input type="date" value={form.from} onChange={(e) => set('from', e.target.value)} className={INPUT} />
                    </div>
                    <div>
                        <label className={LABEL}>Дуусах</label>
                        <input type="date" value={form.to} onChange={(e) => set('to', e.target.value)} className={INPUT} />
                    </div>
                    <div className="min-w-44">
                        <label className={LABEL}>Салбар</label>
                        <select
                            value={form.branch_id ?? ''}
                            onChange={(e) => set('branch_id', e.target.value ? Number(e.target.value) : null)}
                            className={INPUT}
                        >
                            <option value="">Бүх салбар</option>
                            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={LABEL}>Бүлэглэлт</label>
                        <Segmented value={form.group_by} options={GROUPS} onChange={(key) => set('group_by', key)} />
                    </div>
                </FilterBar>

                {/* ── Үндсэн хүснэгт ── */}
                <Card>
                    <CardHead icon={CalendarRange} title="Хугацаагаар" count={rows.length} />
                    <CardNote>
                        Спам гэж тэмдэглэсэн дуудлага хариулалтын хувийг тооцохоос хасагдана —
                        зар сурталчилгааны дуудлага ажилтны гүйцэтгэлийг гутаах ёсгүй.
                    </CardNote>

                    {rows.length === 0 ? (
                        <Empty
                            icon={CalendarRange}
                            title="Энэ хугацаанд дуудлага алга."
                            hint="Огнооны хязгаараа өргөтгөж эсвэл салбарын шүүлтүүрээ авч үзнэ үү."
                        />
                    ) : (
                        <TableWrap>
                            <table className={TABLE}>
                                <thead className={THEAD}>
                                    <tr>
                                        <th className={TH}>Хугацаа</th>
                                        <th className={cn(TH, 'text-right')}>Нийт</th>
                                        <th className={cn(TH, 'text-right')}>Хариулсан</th>
                                        <th className={cn(TH, 'text-right')}>Алдсан</th>
                                        <th className={cn(TH, 'text-right')}>Шийдээгүй</th>
                                        <th className={cn(TH, 'text-right')}>Цагаас гадуур</th>
                                        <th className={cn(TH, 'text-right')}>Спам</th>
                                        <th className={cn(TH, 'text-right')}>Цаг захиалга</th>
                                        <th className={cn(TH, 'text-right')}>Хариулалт</th>
                                        <th className={cn(TH, 'text-right')}>Дундаж яриа</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={r.period} className={TR}>
                                            <td className={cn(TD, 'font-semibold whitespace-nowrap')}>{r.label}</td>
                                            <td className={cn(TD, 'text-right tabular-nums')}>{r.total}</td>
                                            <td className={cn(TD, 'text-right tabular-nums text-emerald-600 dark:text-emerald-400')}>{r.answered}</td>
                                            <td className={cn(TD, 'text-right tabular-nums')}>{r.missed}</td>
                                            <td className={cn(TD, 'text-right tabular-nums', r.unhandled > 0 && 'font-bold text-red-600 dark:text-red-400')}>
                                                {r.unhandled}
                                            </td>
                                            <td className={cn(TD, 'text-right tabular-nums text-muted-foreground')}>{r.after_hours}</td>
                                            <td className={cn(TD, 'text-right tabular-nums text-muted-foreground')}>{r.spam}</td>
                                            <td className={cn(TD, 'text-right font-semibold tabular-nums')}>{r.appointments}</td>
                                            <td className={cn(TD, 'text-right')}>
                                                {r.answer_rate === null
                                                    ? <span className="text-muted-foreground">—</span>
                                                    : <Pill tone={rateTone(r.answer_rate)}>{r.answer_rate}%</Pill>}
                                            </td>
                                            <td className={cn(TD, 'text-right tabular-nums')}>{fmtTalk(r.avg_talk)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-indigo-500/20 bg-gradient-to-r from-indigo-50/70 to-sky-50/40 font-bold dark:from-indigo-950/30 dark:to-sky-950/20">
                                        <td className={cn(TD, 'whitespace-nowrap')}>Нийт</td>
                                        <td className={cn(TD, 'text-right tabular-nums')}>{totals.total}</td>
                                        <td className={cn(TD, 'text-right tabular-nums text-emerald-600 dark:text-emerald-400')}>{totals.answered}</td>
                                        <td className={cn(TD, 'text-right tabular-nums')}>{totals.missed}</td>
                                        <td className={cn(TD, 'text-right tabular-nums', totals.unhandled > 0 && 'text-red-600 dark:text-red-400')}>
                                            {totals.unhandled}
                                        </td>
                                        <td className={cn(TD, 'text-right tabular-nums')}>{totals.after_hours}</td>
                                        <td className={cn(TD, 'text-right tabular-nums')}>{totals.spam}</td>
                                        <td className={cn(TD, 'text-right tabular-nums')}>{totals.appointments}</td>
                                        <td className={cn(TD, 'text-right')}>
                                            {totals.answer_rate === null
                                                ? <span className="text-muted-foreground">—</span>
                                                : <Pill tone={rateTone(totals.answer_rate)}>{totals.answer_rate}%</Pill>}
                                        </td>
                                        <td className={cn(TD, 'text-right tabular-nums')}>{fmtTalk(totals.avg_talk)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </TableWrap>
                    )}
                </Card>

                {/* ── Салбараар ── */}
                <Card>
                    <CardHead
                        icon={Building2}
                        tone="sky"
                        title="Салбараар"
                        count={byBranch.length}
                        hint="Сонгосон хугацааны бүх салбар (салбарын шүүлтүүрээс хамаарахгүй)"
                    />
                    {byBranch.length === 0 ? (
                        <Empty icon={Building2} title="Дата алга." />
                    ) : (
                        <TableWrap>
                            <table className={TABLE}>
                                <thead className={THEAD}>
                                    <tr>
                                        <th className={TH}>Салбар</th>
                                        <th className={cn(TH, 'text-right')}>Нийт</th>
                                        <th className={cn(TH, 'text-right')}>Алдсан</th>
                                        <th className={cn(TH, 'text-right')}>Шийдээгүй</th>
                                        <th className={cn(TH, 'text-right')}>Цаг захиалга</th>
                                        <th className={cn(TH, 'text-right')}>Хариулалт</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byBranch.map((b) => (
                                        <tr key={b.branch_id ?? 'none'} className={TR}>
                                            <td className={cn(TD, 'font-medium')}>{b.period}</td>
                                            <td className={cn(TD, 'text-right tabular-nums')}>{b.total}</td>
                                            <td className={cn(TD, 'text-right tabular-nums')}>{b.missed}</td>
                                            <td className={cn(TD, 'text-right tabular-nums', b.unhandled > 0 && 'font-bold text-red-600 dark:text-red-400')}>
                                                {b.unhandled}
                                            </td>
                                            <td className={cn(TD, 'text-right font-semibold tabular-nums')}>{b.appointments}</td>
                                            <td className={cn(TD, 'text-right')}>
                                                {b.answer_rate === null
                                                    ? <span className="text-muted-foreground">—</span>
                                                    : <Pill tone={rateTone(b.answer_rate)}>{b.answer_rate}%</Pill>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableWrap>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
