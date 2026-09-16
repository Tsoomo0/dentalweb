import {
    BTN, Card, CardHead, CallsHeader, Empty, FilterBar, INPUT, LABEL, Pill,
    Stat, TABLE, TD, TH, THEAD, TR, TableWrap, TONE, type Tone,
} from '@/components/calls-ui';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, CheckCircle2, Clock, Headphones,
    LayoutDashboard, ListChecks, PhoneMissed, Repeat, Building2, TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import {
    Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

/* ── Types ─────────────────────────────────────────────── */
interface Summary {
    total: number; inbound: number; outbound: number;
    missed: number; unhandled: number;
    answer_rate: number | null; avg_talk: number | null;
    avg_hold: number | null; avg_handle_minutes: number | null;
}
interface HourPoint { hour: number; label: string; answered: number; missed: number }
interface DayPoint { day: string; label: string; total: number; missed: number; answer_rate: number | null }
interface BranchRow {
    branch_id: number | null; branch_name: string; total: number;
    missed: number; unhandled: number; answer_rate: number | null; avg_talk: number | null;
}
interface AgentRow {
    agent: string; user_name: string | null; branch_name: string | null;
    answered: number; avg_talk: number | null; total_talk: number;
}
interface ResolutionRow { key: string; label: string; total: number }
interface RepeatRow { number: string; attempts: number; last_call: string | null }
interface Filters { from: string; to: string; branch_id: string | null }

interface Props {
    filters: Filters;
    branches: { id: number; name: string }[];
    summary: Summary;
    hourly: HourPoint[];
    daily: DayPoint[];
    byBranch: BranchRow[];
    byAgent: AgentRow[];
    resolutions: ResolutionRow[];
    repeatCallers: RepeatRow[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Дуудлага', href: '/admin/calls' },
    { title: 'Хянах самбар', href: '/admin/calls/dashboard' },
];

/* Хариулсан/алдсаныг ялгах өнгө.
   Улаан–ногооныг ЗОРИУД ашиглаагүй: өнгө ялгах бэрхшээлтэй уншигчид тэр хоёр
   бараг ялгарахгүй (deutan ΔE 4.1). Цэнхэр–улаан хос гэрэл ба харанхуй горим
   хоёуланд шалгалт давсан (ΔE 27.5). */
const C_ANSWERED = '#2563eb';
const C_MISSED = '#d03b3b';

function fmtSec(sec: number | null) {
    if (sec === null || sec === undefined) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtMinutes(min: number | null) {
    if (min === null || min === undefined) return '—';
    if (min < 60) return `${min} мин`;
    const h = Math.floor(min / 60);
    return `${h}ц ${min % 60}м`;
}

/* Recharts нь Tailwind классыг ойлгодоггүй тул CSS хувьсагчийг шууд өгнө.
   Энэ төслийн токенууд бүрэн `hsl(...)` утга агуулдаг — өөрөөр хэлбэл
   `var(--border)` гэж бичих ёстой, `hsl(var(--border))` гэвэл хүчингүй болно. */
const tooltipStyle = {
    fontSize: 12,
    borderRadius: 12,
    border: '1px solid var(--border)',
    background: 'var(--background)',
    boxShadow: '0 8px 24px -8px rgb(0 0 0 / 0.25)',
};
const axisTick = { fontSize: 10, fill: 'var(--muted-foreground)' };

function rateTone(rate: number | null): Tone {
    if (rate === null) return 'slate';
    if (rate >= 90) return 'emerald';
    if (rate >= 75) return 'amber';
    return 'red';
}

export default function CallDashboard({
    filters, branches, summary, hourly, daily, byBranch, byAgent, resolutions, repeatCallers,
}: Props) {
    const [form, setForm] = useState<Filters>(filters);

    function set<K extends keyof Filters>(key: K, value: Filters[K]) {
        const next = { ...form, [key]: value };
        setForm(next);
        router.get('/admin/calls/dashboard', { ...next }, { preserveState: true, replace: true });
    }

    const resolvedTotal = resolutions.reduce((a, r) => a + r.total, 0);
    const appointmentsMade = resolutions.find((r) => r.key === 'appointment_made')?.total ?? 0;
    const answered = summary.total - summary.missed;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Дуудлагын хянах самбар" />

            <div className="flex flex-col gap-4 p-4 md:p-6">
                <CallsHeader
                    icon={LayoutDashboard}
                    title="Дуудлагын хянах самбар"
                    subtitle={`${form.from} — ${form.to}`}
                    current="dashboard"
                    actions={
                        <Link href="/admin/calls?status=unhandled" className={BTN}>
                            <PhoneMissed className="size-3.5" /> Шийдэгдээгүй
                        </Link>
                    }
                >
                    <div className="grid grid-cols-2 divide-x divide-indigo-100/70 border-t border-indigo-100/70 sm:grid-cols-4 dark:divide-white/5 dark:border-white/5">
                        <MiniStat icon={ArrowDownLeft} tone="emerald" label="Ирсэн" value={summary.inbound} />
                        <MiniStat icon={ArrowUpRight} tone="sky" label="Явсан" value={summary.outbound} />
                        <MiniStat icon={Clock} tone="violet" label="Дундаж яриа" value={fmtSec(summary.avg_talk)} />
                        <MiniStat icon={ListChecks} tone="indigo" label="Цаг захиалга" value={appointmentsMade} />
                    </div>
                </CallsHeader>

                {/* ── Шүүлтүүр — бүх графикт нэг мөрөөс нөлөөлнө ── */}
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
                            onChange={(e) => set('branch_id', e.target.value || null)}
                            className={INPUT}
                        >
                            <option value="">Бүх салбар</option>
                            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                </FilterBar>

                {/* ── Хамгийн чухал тоо: шийдэгдээгүй алдсан дуудлага ── */}
                <div className="grid gap-4 lg:grid-cols-3">
                    <div
                        className={cn(
                            'relative overflow-hidden rounded-2xl border p-5 shadow-sm lg:col-span-1',
                            summary.unhandled > 0
                                ? 'border-red-300/70 bg-gradient-to-br from-red-50 via-white to-rose-50/60 dark:border-red-500/30 dark:from-red-950/40 dark:via-zinc-900 dark:to-rose-950/20'
                                : 'border-emerald-300/60 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 dark:border-emerald-500/25 dark:from-emerald-950/30 dark:via-zinc-900 dark:to-teal-950/20',
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                'grid size-8 place-items-center rounded-lg',
                                summary.unhandled > 0 ? TONE.red.tile : TONE.emerald.tile,
                            )}>
                                {summary.unhandled > 0 ? <PhoneMissed className="size-4" /> : <CheckCircle2 className="size-4" />}
                            </span>
                            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                Шийдэгдээгүй алдсан дуудлага
                            </p>
                        </div>

                        <p className={cn(
                            'mt-3 text-6xl font-black tracking-tighter tabular-nums',
                            summary.unhandled > 0 ? TONE.red.text : TONE.emerald.text,
                        )}>
                            {summary.unhandled}
                        </p>

                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {summary.unhandled > 0
                                ? 'Эдгээр хүн рүү хараахан эргэж холбогдоогүй байна.'
                                : 'Бүх алдсан дуудлага шийдэгдсэн.'}
                        </p>

                        {summary.unhandled > 0 && (
                            <Link
                                href="/admin/calls?status=unhandled"
                                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-red-500/25 transition hover:bg-red-700"
                            >
                                Жагсаалт харах <ArrowRight className="size-3.5" />
                            </Link>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                        <Stat
                            tone={rateTone(summary.answer_rate)}
                            icon={TrendingUp}
                            label="Хариулалтын хувь"
                            value={summary.answer_rate === null ? '—' : `${summary.answer_rate}%`}
                            hint={`${answered} / ${summary.total} дуудлага`}
                            percent={summary.answer_rate ?? 0}
                        />
                        <Stat
                            tone={summary.missed > 0 ? 'red' : 'slate'}
                            icon={PhoneMissed}
                            label="Алдсан дуудлага"
                            value={summary.missed}
                            hint={`нийт ${summary.total} дуудлагаас`}
                            percent={summary.total > 0 ? (summary.missed / summary.total) * 100 : 0}
                        />
                        <Stat
                            tone="amber"
                            icon={Clock}
                            label="Эргэж холбогдох дундаж"
                            value={fmtMinutes(summary.avg_handle_minutes)}
                            hint="алдсанаас шийдвэрлэх хүртэл"
                        />
                        <Stat
                            tone="sky"
                            icon={Headphones}
                            label="Дундаж яриа"
                            value={fmtSec(summary.avg_talk)}
                            hint={summary.avg_hold !== null ? `хүлээлт ${fmtSec(summary.avg_hold)}` : undefined}
                        />
                    </div>
                </div>

                {/* ── Цагийн хуваарилалт ── */}
                <Card>
                    <CardHead
                        icon={BarChart3}
                        title="Цагаар хуваарилалт"
                        hint="Аль цагт дуудлага их ирж, аль цагт алдагдаж байна вэ. Ажилтны ээлжийн хуваарь тааруулахад хэрэглэнэ."
                    />
                    <div className="h-72 p-4 pl-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourly} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval={1} />
                                <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={34} />
                                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)' }} />
                                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                                {/* Хуримтлагдсан багана: өндөр нь нийт ачаалал, хэсэг нь үр дүн.
                                    Дээд талын баганад л радиус өгснөөр багана бүр нэг л дугуй
                                    оройтой харагдана. */}
                                <Bar dataKey="answered" name="Хариулсан" stackId="calls" fill={C_ANSWERED} maxBarSize={26} />
                                <Bar dataKey="missed" name="Алдсан" stackId="calls" fill={C_MISSED} radius={[5, 5, 0, 0]} maxBarSize={26} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* ── Өдрийн хандлага ── */}
                <Card>
                    <CardHead
                        icon={TrendingUp}
                        tone="emerald"
                        title="Хариулалтын хувь — өдрөөр"
                        hint="Тасархай шугам нь 90% зорилтот түвшин. Түүнээс доош унасан өдрүүдийг шалгана уу."
                    />
                    <div className="h-64 p-4 pl-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={daily} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="rateLine" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor={C_ANSWERED} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
                                <YAxis
                                    domain={[0, 100]} tick={axisTick} tickLine={false} axisLine={false} width={38}
                                    tickFormatter={(v: number) => `${v}%`}
                                />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    formatter={((v: number | null) => [v === null ? '—' : `${v}%`, 'Хариулалт']) as never}
                                />
                                <ReferenceLine y={90} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
                                <Line
                                    type="monotone" dataKey="answer_rate" stroke="url(#rateLine)" strokeWidth={2.5}
                                    dot={{ r: 3, fill: C_ANSWERED, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                    {/* ── Салбараар ── */}
                    <Card>
                        <CardHead icon={Building2} tone="sky" title="Салбараар" count={byBranch.length} />
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
                                            <th className={cn(TH, 'text-right')}>Хариулалт</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {byBranch.map((b) => (
                                            <tr key={b.branch_id ?? 'none'} className={TR}>
                                                <td className={cn(TD, 'font-medium')}>{b.branch_name}</td>
                                                <td className={cn(TD, 'text-right tabular-nums')}>{b.total}</td>
                                                <td className={cn(TD, 'text-right tabular-nums')}>{b.missed}</td>
                                                <td className={cn(TD, 'text-right tabular-nums', b.unhandled > 0 && 'font-bold text-red-600 dark:text-red-400')}>
                                                    {b.unhandled}
                                                </td>
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

                    {/* ── Алдсан дуудлагын үр дүн ── */}
                    <Card>
                        <CardHead
                            icon={CheckCircle2}
                            tone="emerald"
                            title="Алдсан дуудлагын үр дүн"
                            hint={`Шийдвэрлэсэн ${resolvedTotal} дуудлагаас`}
                        />
                        {resolvedTotal === 0 ? (
                            <Empty icon={CheckCircle2} title="Шийдвэрлэсэн дуудлага алга." />
                        ) : (
                            <div className="space-y-3.5 p-4">
                                {resolutions.map((r) => {
                                    const pct = (r.total / resolvedTotal) * 100;
                                    const isWin = r.key === 'appointment_made';

                                    return (
                                        <div key={r.key}>
                                            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                                                <span className={cn('truncate', isWin && 'font-semibold')}>{r.label}</span>
                                                <span className="shrink-0 tabular-nums text-muted-foreground">
                                                    {r.total}
                                                    <span className="ml-1 text-xs">({pct.toFixed(0)}%)</span>
                                                </span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-gray-500/10">
                                                <div
                                                    className={cn(
                                                        'h-full rounded-full transition-[width] duration-700 ease-out',
                                                        isWin
                                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                                            : 'bg-gradient-to-r from-indigo-400/70 to-sky-400/70',
                                                    )}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    {/* ── Ажилтнаар ── */}
                    <Card>
                        <CardHead icon={Headphones} tone="violet" title="Ажилтны гүйцэтгэл" count={byAgent.length} />
                        {byAgent.length === 0 ? (
                            <Empty icon={Headphones} title="Дата алга." />
                        ) : (
                            <TableWrap>
                                <table className={TABLE}>
                                    <thead className={THEAD}>
                                        <tr>
                                            <th className={TH}>Дугаар</th>
                                            <th className={TH}>Ажилтан</th>
                                            <th className={cn(TH, 'text-right')}>Хариулсан</th>
                                            <th className={cn(TH, 'text-right')}>Дундаж яриа</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {byAgent.map((a) => (
                                            <tr key={a.agent} className={TR}>
                                                <td className={cn(TD, 'font-mono text-xs font-semibold')}>{a.agent}</td>
                                                <td className={TD}>
                                                    {a.user_name ?? <span className="text-muted-foreground">—</span>}
                                                    {a.branch_name && (
                                                        <div className="text-xs text-muted-foreground">{a.branch_name}</div>
                                                    )}
                                                </td>
                                                <td className={cn(TD, 'text-right font-bold tabular-nums')}>{a.answered}</td>
                                                <td className={cn(TD, 'text-right tabular-nums text-muted-foreground')}>{fmtSec(a.avg_talk)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableWrap>
                        )}
                    </Card>

                    {/* ── Давтан залгасан ── */}
                    <Card className="border-amber-300/60 dark:border-amber-500/25">
                        <CardHead
                            icon={Repeat}
                            tone="amber"
                            title="Давтан залгасан, баригдаагүй"
                            count={repeatCallers.length}
                            hint="2-оос дээш удаа залгаад нэг ч удаа хариу аваагүй хүмүүс. Эдгээр хамгийн эрсдэлтэй — өөр эмнэлэг рүү явах магадлалтай."
                        />
                        {repeatCallers.length === 0 ? (
                            <Empty icon={Repeat} title="Ийм дугаар алга." hint="Давтан залгасан бүх хүн хариу авсан байна." />
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-white/5">
                                {repeatCallers.map((c) => (
                                    <div key={c.number} className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-amber-500/[0.04]">
                                        <div className="min-w-0">
                                            <span className="font-mono text-sm font-semibold">{c.number}</span>
                                            <div className="truncate text-xs text-muted-foreground">сүүлд: {c.last_call ?? '—'}</div>
                                        </div>
                                        <Pill tone="red">{c.attempts} удаа</Pill>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

/* ── Толгойн доторх нягт үзүүлэлт ──────────────────────── */
function MiniStat({ icon: Icon, label, value, tone }: {
    icon: typeof ArrowDownLeft; label: string; value: number | string; tone: Tone;
}) {
    return (
        <div className="flex items-center gap-2 px-3 py-2.5">
            <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg', TONE[tone].tile)}>
                <Icon className="size-3.5" />
            </span>
            <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
                <p className="text-sm font-bold tabular-nums">{value}</p>
            </div>
        </div>
    );
}
