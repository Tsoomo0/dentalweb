import { Chip, EmptyState, TONE, type Tone } from '@/components/lab-training-ui';
import ProgressRing from '@/components/progress-ring';
import LabLayout from '@/layouts/lab-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    Activity, AlertTriangle, ArrowRight, ArrowUpRight, Award, Brush, Building2,
    CalendarCheck2, CalendarClock, ChevronDown, ChevronUp, ClipboardCheck, Clock,
    FlaskConical, GraduationCap, Hammer, MapPin, Package, PieChart as PieIcon,
    Phone, PlayCircle, RotateCcw, Sparkles, TrendingDown, TrendingUp, Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

interface BranchInfo { id: number; name: string; address: string | null; phone: string | null }

interface Stats {
    active: number;
    completed: number;
    ready: number;
    overdue: number;
    arriving_today: number;
    returns: number;
    ready_month: number;
}

interface QueueItem {
    id: number;
    order_date: string | null;
    sent_to_lab_date: string | null;
    patient: string;
    doctor_name: string | null;
    branch_name: string | null;
    work_description: string;
    pickup_date: string | null;
    lab_ready_date: string | null;
    return_status: 'sent' | 'ready' | 'done' | null;
    return_reason: string | null;
    return_count: number;
    days_left: number | null;
}

interface Counts {
    bender: number; polisher: number; fixed: number;
    total: number; orders: number; returned: number; return_rate: number;
}

interface Props {
    branch: BranchInfo | null;
    me: { name: string; photo: string | null; position: string | null };
    stats: Stats;
    queue: QueueItem[];
    workload: { date: string; label: string; day: number; count: number; today: boolean }[];
    trend: { date: string; label: string; sent: number; ready: number }[];
    workTypes: { name: string; value: number }[];
    work: { month: Counts; prev_total: number; week: number; top_works: { work: string; count: number }[] } | null;
    monthly: { label: string; bender: number; polisher: number; fixed: number }[];
    training: {
        total: number; done: number; required: number; overdue: number; watch_min: number;
        resume: { lesson_id: number; title: string; percent: number } | null;
        exams_open: number; exams_pending: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Хяналтын самбар', href: '/lab/dashboard' }];

const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

/** Графикийн өнгө — TONE-той дүйнэ, гэхдээ SVG-д hex хэрэгтэй. */
const C = {
    violet:  '#8b5cf6',
    indigo:  '#6366f1',
    sky:     '#0ea5e9',
    emerald: '#10b981',
    amber:   '#f59e0b',
    rose:    '#f43f5e',
    slate:   '#94a3b8',
};

const DONUT = [C.violet, C.indigo, C.sky, C.emerald, C.amber, C.rose, C.slate];

/** Бүх графикийн tooltip нэг загвартай байна. */
const TIP = {
    contentStyle: {
        fontSize: 11,
        borderRadius: 10,
        border: '1px solid hsl(var(--border))',
        background: 'hsl(var(--card))',
        boxShadow: '0 4px 16px rgb(0 0 0 / 0.12)',
        padding: '6px 10px',
    },
    labelStyle: { fontWeight: 700, marginBottom: 2 },
};

const AXIS = { tick: { fontSize: 9.5 }, axisLine: false, tickLine: false } as const;

function greeting(hour: number): string {
    if (hour < 12) return 'Өглөөний мэнд';
    if (hour < 18) return 'Өдрийн мэнд';

    return 'Оройн мэнд';
}

/** Захиалгын явцын шошго — лаб бүртгэлийн хүснэгттэй ижил утгатай. */
function stage(o: QueueItem): { label: string; tone: Tone } {
    if (o.return_status === 'sent')  return { label: 'Буцаалт', tone: 'rose' };
    if (o.return_status === 'ready') return { label: 'Янзалсан', tone: 'amber' };
    if (o.lab_ready_date)            return { label: 'Бэлэн', tone: 'indigo' };
    if (o.sent_to_lab_date)          return { label: 'Хийгдэж буй', tone: 'violet' };

    return { label: 'Шинэ', tone: 'slate' };
}

/** Товлосон огноо хүртэлх хугацаа — үг болгож хэлнэ. */
function due(days: number | null): { label: string; tone: Tone } | null {
    if (days === null) return null;
    if (days < 0)   return { label: `${-days} хоног хэтэрсэн`, tone: 'rose' };
    if (days === 0) return { label: 'Өнөөдөр', tone: 'amber' };
    if (days === 1) return { label: 'Маргааш', tone: 'sky' };

    return { label: `${days} хоногт`, tone: 'slate' };
}

const QUEUE_TABS: { key: string; label: string; match: (o: QueueItem) => boolean }[] = [
    { key: 'all',     label: 'Бүгд',     match: () => true },
    { key: 'returns', label: 'Буцаалт',  match: (o) => o.return_status === 'sent' },
    { key: 'overdue', label: 'Хэтэрсэн', match: (o) => o.days_left !== null && o.days_left < 0 },
    { key: 'today',   label: 'Өнөөдөр',  match: (o) => o.days_left === 0 },
    { key: 'ready',   label: 'Бэлэн',    match: (o) => !!o.lab_ready_date },
];

export default function LabDashboard({
    branch, me, stats, queue, workload, trend, workTypes, work, monthly, training,
}: Props) {
    const now     = new Date();
    const dateStr = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()} · ${WEEKDAYS[now.getDay()]}`;

    const urgent  = stats.returns + stats.overdue;
    const donePct = training.total > 0 ? Math.round((training.done / training.total) * 100) : 0;
    const delta   = work ? work.month.total - work.prev_total : 0;

    const [range, setRange] = useState<7 | 14 | 30>(14);
    const [tab, setTab]     = useState('all');
    const [expanded, setExpanded] = useState(false);

    const chart = useMemo(() => trend.slice(-range), [trend, range]);
    const flow  = useMemo(() => ({
        sent:  chart.reduce((n, d) => n + d.sent, 0),
        ready: chart.reduce((n, d) => n + d.ready, 0),
    }), [chart]);

    const rows = useMemo(() => {
        const match = (QUEUE_TABS.find((t) => t.key === tab) ?? QUEUE_TABS[0]).match;

        return queue.filter(match);
    }, [queue, tab]);

    const shown = expanded ? rows : rows.slice(0, 7);

    return (
        <LabLayout breadcrumbs={breadcrumbs}>
            <Head title="Лабораторийн хяналтын самбар" />

            <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6 2xl:px-8">
                {/* ── Толгой ─────────────────────────────────────────────── */}
                <section className="relative overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-lg ring-1 ring-white/10">
                    <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-violet-600/25 blur-[90px]" />
                    <div className="pointer-events-none absolute -bottom-28 left-1/4 size-64 rounded-full bg-fuchsia-500/15 blur-[80px]" />
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                    <div className="relative flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
                        <div className="min-w-0 flex-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-violet-200 ring-1 ring-inset ring-white/15">
                                <FlaskConical className="size-2.5" />
                                Лабораторийн портал
                            </span>

                            <h1 className="mt-2 truncate text-lg font-bold tracking-tight sm:text-xl">
                                {greeting(now.getHours())}, {me.name}
                            </h1>

                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] text-white/40">
                                <span className="inline-flex items-center gap-1"><CalendarClock className="size-2.5" />{dateStr}</span>
                                {me.position && <span>{me.position}</span>}
                                {branch && <span className="inline-flex items-center gap-1"><Building2 className="size-2.5" />{branch.name}</span>}
                                {branch?.address && <span className="inline-flex items-center gap-1"><MapPin className="size-2.5" />{branch.address}</span>}
                                {branch?.phone && <span className="inline-flex items-center gap-1"><Phone className="size-2.5" />{branch.phone}</span>}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                <Link
                                    href="/lab/lab-orders"
                                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11.5px] font-bold text-neutral-950 shadow-md shadow-black/30 transition hover:bg-white/90 active:scale-95"
                                >
                                    <FlaskConical className="size-3.5" />
                                    Лаб бүртгэл
                                </Link>
                                <Link
                                    href="/my/training"
                                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11.5px] font-semibold text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/15"
                                >
                                    <GraduationCap className="size-3.5" />
                                    Сургалт
                                </Link>
                                <Link
                                    href="/my/training/exams"
                                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11.5px] font-semibold text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/15"
                                >
                                    <ClipboardCheck className="size-3.5" />
                                    Шалгалт
                                    {training.exams_open > 0 && (
                                        <span className="rounded-full bg-violet-500 px-1.5 text-[9px] font-bold tabular-nums">
                                            {training.exams_open}
                                        </span>
                                    )}
                                </Link>
                            </div>
                        </div>

                        <div className="grid shrink-0 grid-cols-3 gap-x-6 gap-y-3 rounded-xl bg-white/[0.05] p-3 shadow-inner ring-1 ring-inset ring-white/10 sm:p-4">
                            <HeroStat value={stats.active} label="идэвхтэй" />
                            <HeroStat value={stats.arriving_today} label="өнөөдөр авах" tone={stats.arriving_today > 0 ? 'text-sky-300' : undefined} />
                            <HeroStat value={urgent} label="яаралтай" tone={urgent > 0 ? 'text-rose-300' : undefined} />
                        </div>
                    </div>
                </section>

                {/* ── Яаралтай ───────────────────────────────────────────── */}
                {urgent > 0 && (
                    <Link
                        href={stats.returns > 0 ? '/lab/lab-orders?status=returned' : '/lab/lab-orders?status=active'}
                        className={cn('flex flex-wrap items-center gap-2.5 rounded-xl border px-3 py-2.5 transition hover:shadow-md', TONE.rose.edge, TONE.rose.surface)}
                    >
                        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', TONE.rose.tile)}>
                            <AlertTriangle className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className={cn('text-[12.5px] font-bold', TONE.rose.text)}>Яаралтай анхаарах ажил байна</p>
                            <p className="text-[10.5px] text-muted-foreground">
                                {[
                                    stats.returns > 0 ? `${stats.returns} янзлах буцаалт` : null,
                                    stats.overdue > 0 ? `${stats.overdue} хугацаа хэтэрсэн` : null,
                                ].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white">
                            Шалгах <ArrowRight className="size-3" />
                        </span>
                    </Link>
                )}

                {/* ── Үзүүлэлт ───────────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                    <Tile href="/lab/lab-orders?status=active"   tone="violet"  icon={FlaskConical}   label="Идэвхтэй"        value={stats.active} />
                    <Tile href="/lab/lab-orders?status=returned" tone="rose"    icon={RotateCcw}      label="Янзлах буцаалт"  value={stats.returns} alert={stats.returns > 0} />
                    <Tile href="/lab/lab-orders?status=ready"    tone="indigo"  icon={Package}        label="Бэлэн болсон"    value={stats.ready} />
                    <Tile href="/lab/lab-orders?status=active"   tone="sky"     icon={CalendarCheck2} label="Өнөөдөр авах"    value={stats.arriving_today} />
                    <Tile href="/lab/lab-orders?status=active"   tone="rose"    icon={AlertTriangle}  label="Хугацаа хэтэрсэн" value={stats.overdue} alert={stats.overdue > 0} />
                    <Tile href="/lab/lab-orders"                 tone="emerald" icon={Sparkles}       label="Энэ сард бэлэн"  value={stats.ready_month} />
                </div>

                {/* ── Графикууд ──────────────────────────────────────────── */}
                <div className="grid gap-3 xl:grid-cols-3">
                    <Card
                        className="xl:col-span-2"
                        icon={Activity}
                        tone="violet"
                        title="Ажлын урсгал"
                        subtitle={`Ирсэн ${flow.sent} · Дуусгасан ${flow.ready}`}
                        action={
                            <div className="flex rounded-lg bg-muted/70 p-0.5">
                                {([7, 14, 30] as const).map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => setRange(r)}
                                        className={cn(
                                            'rounded-md px-2 py-0.5 text-[10.5px] font-semibold transition',
                                            range === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {r} хоног
                                    </button>
                                ))}
                            </div>
                        }
                    >
                        <div className="h-48 p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chart} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={C.sky} stopOpacity={0.25} />
                                            <stop offset="100%" stopColor={C.sky} stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gReady" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={C.violet} stopOpacity={0.3} />
                                            <stop offset="100%" stopColor={C.violet} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="2 4" className="stroke-border" vertical={false} opacity={0.6} />
                                    <XAxis dataKey="label" {...AXIS} className="fill-muted-foreground" dy={4} interval="preserveStartEnd" minTickGap={16} />
                                    <YAxis {...AXIS} className="fill-muted-foreground" allowDecimals={false} width={28} />
                                    <Tooltip {...TIP} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} />
                                    <Legend wrapperStyle={{ fontSize: 10 }} iconType="plainline" iconSize={12} />
                                    <Area type="monotone" dataKey="sent"  name="Лаб руу ирсэн" stroke={C.sky} strokeWidth={2} fill="url(#gSent)" dot={false} activeDot={{ r: 3.5 }} />
                                    <Area type="monotone" dataKey="ready" name="Лаб дуусгасан" stroke={C.violet} strokeWidth={2} fill="url(#gReady)" dot={false} activeDot={{ r: 3.5 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card icon={PieIcon} tone="indigo" title="Ажлын төрөл" subtitle="Энэ сард дуусгасан">
                        {workTypes.length === 0 ? (
                            <p className="flex h-48 items-center justify-center text-[11px] text-muted-foreground">Өгөгдөл алга</p>
                        ) : (
                            <div className="h-48 p-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={workTypes} dataKey="value" nameKey="name" innerRadius={38} outerRadius={56} paddingAngle={3} cornerRadius={4} stroke="none">
                                            {workTypes.map((d, i) => <Cell key={d.name} fill={DONUT[i % DONUT.length]} />)}
                                        </Pie>
                                        <Tooltip {...TIP} />
                                        <Legend wrapperStyle={{ fontSize: 9.5, lineHeight: '14px' }} iconType="circle" iconSize={7} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </Card>
                </div>

                <div className="grid gap-3 xl:grid-cols-3">
                    {/* ── Хийх ажлын дараалал ────────────────────────────── */}
                    <Card
                        className="xl:col-span-2"
                        icon={Hammer}
                        tone="violet"
                        title="Хийх ажлын дараалал"
                        subtitle="Буцаалт → хэтэрсэн → товлосон огноогоор"
                        action={
                            <Link href="/lab/lab-orders" className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 transition hover:text-violet-700 dark:text-violet-400">
                                Бүгдийг үзэх <ArrowRight className="size-3" />
                            </Link>
                        }
                    >
                        <div className="flex flex-wrap gap-1 border-b px-3 py-2">
                            {QUEUE_TABS.map((t) => {
                                const count = queue.filter(t.match).length;

                                return (
                                    <button
                                        key={t.key}
                                        onClick={() => { setTab(t.key); setExpanded(false); }}
                                        className={cn(
                                            'flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-medium transition',
                                            tab === t.key
                                                ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/20'
                                                : 'bg-muted/70 text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        {t.label}
                                        <span className="text-[9px] font-bold tabular-nums opacity-60">{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {shown.length === 0 ? (
                            <EmptyState
                                icon={FlaskConical}
                                title="Ажил алга"
                                description="Энэ шүүлтэд тохирох идэвхтэй бүртгэл байхгүй байна."
                            />
                        ) : (
                            <>
                                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {shown.map((o) => <QueueRow key={o.id} order={o} />)}
                                </div>

                                {rows.length > 7 && (
                                    <button
                                        onClick={() => setExpanded((v) => !v)}
                                        className="flex w-full items-center justify-center gap-1 border-t py-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                                    >
                                        {expanded ? <>Хураах <ChevronUp className="size-3" /></> : <>Бүгдийг харах ({rows.length}) <ChevronDown className="size-3" /></>}
                                    </button>
                                )}
                            </>
                        )}
                    </Card>

                    <div className="space-y-3">
                        {/* ── 7 хоногийн ачаалал ─────────────────────────── */}
                        <Card icon={CalendarClock} tone="sky" title="Ирэх 7 хоног" subtitle="Товлосон огноогоор">
                            <Workload days={workload} />
                        </Card>

                        {/* ── Миний гүйцэтгэл ────────────────────────────── */}
                        <Card icon={Award} tone="emerald" title="Миний гүйцэтгэл" subtitle="Энэ сард хийсэн ажил">
                            {work ? (
                                <div className="space-y-3 p-3">
                                    <div className="flex items-end justify-between gap-2">
                                        <div>
                                            <p className="text-2xl font-bold leading-none tabular-nums">{work.month.total}</p>
                                            <p className="mt-1 text-[10px] text-muted-foreground">
                                                нийт ажил · энэ 7 хоногт {work.week}
                                            </p>
                                        </div>
                                        <span className={cn(
                                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                                            delta >= 0 ? TONE.emerald.chip : TONE.rose.chip,
                                        )}>
                                            {delta >= 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                                            {delta >= 0 ? `+${delta}` : delta}
                                            <span className="font-medium opacity-70">сараас</span>
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-1.5">
                                        <MiniStat icon={Wrench}    label="Нугалсан" value={work.month.bender}   tone="violet" />
                                        <MiniStat icon={Brush}     label="Өнгөлсөн" value={work.month.polisher} tone="indigo" />
                                        <MiniStat icon={RotateCcw} label="Янзалсан" value={work.month.fixed}    tone="amber" />
                                    </div>

                                    {/* 6 сарын хандлага */}
                                    {monthly.length > 0 && (
                                        <div className="h-28">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={monthly} margin={{ top: 4, right: 4, left: -28, bottom: -4 }} barCategoryGap="28%">
                                                    <CartesianGrid strokeDasharray="2 4" className="stroke-border" vertical={false} opacity={0.5} />
                                                    <XAxis dataKey="label" {...AXIS} className="fill-muted-foreground" dy={2} />
                                                    <YAxis {...AXIS} className="fill-muted-foreground" allowDecimals={false} width={26} />
                                                    <Tooltip {...TIP} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                                                    <Bar dataKey="bender"   name="Нугалсан" stackId="a" fill={C.violet} />
                                                    <Bar dataKey="polisher" name="Өнгөлсөн" stackId="a" fill={C.indigo} />
                                                    <Bar dataKey="fixed"    name="Янзалсан" stackId="a" fill={C.amber} radius={[3, 3, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    <div className="rounded-lg border bg-muted/25 p-2.5">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-semibold">Буцаалтын хувь</span>
                                            <span className={cn(
                                                'font-bold tabular-nums',
                                                work.month.return_rate === 0 ? TONE.emerald.text
                                                    : work.month.return_rate <= 10 ? TONE.amber.text : TONE.rose.text,
                                            )}>
                                                {work.month.return_rate}%
                                            </span>
                                        </div>
                                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className={cn(
                                                    'h-full rounded-full transition-all',
                                                    work.month.return_rate === 0 ? TONE.emerald.bar
                                                        : work.month.return_rate <= 10 ? TONE.amber.bar : TONE.rose.bar,
                                                )}
                                                style={{ width: `${Math.min(100, work.month.return_rate)}%` }}
                                            />
                                        </div>
                                        <p className="mt-1 text-[9.5px] text-muted-foreground">
                                            {work.month.orders} захиалгаас {work.month.returned} нь буцаагдсан
                                        </p>
                                    </div>

                                    {work.top_works.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {work.top_works.map((w) => (
                                                <Chip key={w.work} tone="slate">
                                                    {w.work}
                                                    <span className="ml-1 font-bold tabular-nums opacity-60">{w.count}</span>
                                                </Chip>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="p-3 text-[11px] text-muted-foreground">
                                    Таны хэрэглэгч ажилтны бүртгэлтэй холбогдоогүй тул хувийн гүйцэтгэл харагдахгүй байна.
                                </p>
                            )}
                        </Card>

                        {/* ── Сургалт ────────────────────────────────────── */}
                        <Card icon={GraduationCap} tone="indigo" title="Сургалт" subtitle={`${training.watch_min} минут үзсэн`}>
                            <div className="space-y-2.5 p-3">
                                <div className="flex items-center gap-3">
                                    <ProgressRing percent={donePct} size={46} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-bold tabular-nums">{training.done}/{training.total} хичээл</p>
                                        <p className="text-[10px] text-muted-foreground">үзэж дуусгасан</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5">
                                    <TrainingCell label="Заавал үзэх"      value={training.required}      tone={training.required > 0 ? 'amber' : 'slate'} />
                                    <TrainingCell label="Хугацаа хэтэрсэн" value={training.overdue}       tone={training.overdue > 0 ? 'rose' : 'slate'} />
                                    <TrainingCell label="Нээлттэй шалгалт" value={training.exams_open}    tone={training.exams_open > 0 ? 'violet' : 'slate'} />
                                    <TrainingCell label="Үнэлэгдэж буй"    value={training.exams_pending} tone={training.exams_pending > 0 ? 'sky' : 'slate'} />
                                </div>

                                {training.resume ? (
                                    <Link
                                        href={`/my/training/lessons/${training.resume.lesson_id}`}
                                        className="flex items-center gap-2.5 rounded-lg border bg-muted/25 p-2.5 transition hover:bg-muted/50"
                                    >
                                        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', TONE.violet.tile)}>
                                            <PlayCircle className="size-4" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[11.5px] font-semibold">{training.resume.title}</p>
                                            <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                                                <div className={cn('h-full rounded-full', TONE.violet.bar)} style={{ width: `${training.resume.percent}%` }} />
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold tabular-nums text-muted-foreground">{training.resume.percent}%</span>
                                    </Link>
                                ) : (
                                    <Link
                                        href="/my/training"
                                        className="flex items-center justify-center gap-1 rounded-lg border border-dashed py-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                                    >
                                        Хичээл үзэх <ArrowUpRight className="size-3" />
                                    </Link>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </LabLayout>
    );
}

/* ── Хэсгүүд ───────────────────────────────────────────────────────────── */

/** Самбарын нэгж хайрцаг — толгой нь бүх хэсэгт нэг хэмнэлтэй байна. */
function Card({ icon: Icon, tone, title, subtitle, action, children, className }: {
    icon: typeof Clock; tone: Tone; title: string; subtitle?: string;
    action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
    return (
        <section className={cn('overflow-hidden rounded-xl border border-gray-200 bg-card shadow-sm dark:border-gray-800', className)}>
            <header className="flex flex-wrap items-center gap-2.5 border-b border-gray-200 bg-muted/30 px-3 py-2 dark:border-gray-800">
                <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg', TONE[tone].tile)}>
                    <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[12.5px] font-bold leading-tight">{title}</h2>
                    {subtitle && <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>}
                </div>
                {action}
            </header>
            {children}
        </section>
    );
}

function HeroStat({ value, label, tone }: { value: number; label: string; tone?: string }) {
    return (
        <div className="min-w-0">
            <p className={cn('text-lg font-bold leading-none tabular-nums', tone ?? 'text-white')}>{value}</p>
            <p className="mt-0.5 truncate text-[9px] uppercase tracking-wide text-white/35">{label}</p>
        </div>
    );
}

function Tile({ href, icon: Icon, label, value, tone, alert }: {
    href: string; icon: typeof Clock; label: string; value: number; tone: Tone; alert?: boolean;
}) {
    return (
        <Link
            href={href}
            className={cn(
                'group relative flex items-center gap-2.5 overflow-hidden rounded-xl border bg-card p-2.5 shadow-sm transition hover:shadow-md',
                alert ? TONE[tone].edge : 'border-gray-200 dark:border-gray-800',
            )}
        >
            <span className={cn('absolute inset-y-0 left-0 w-0.5', TONE[tone].bar, alert ? 'opacity-100' : 'opacity-0 transition group-hover:opacity-100')} />

            <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', TONE[tone].tile)}>
                <Icon className="size-4" />
            </span>

            <div className="min-w-0 flex-1">
                <p className="truncate text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className={cn('text-lg font-bold leading-tight tabular-nums', value > 0 && alert ? TONE[tone].text : '')}>
                    {value}
                </p>
            </div>

            {alert && value > 0 && <span className="absolute right-1.5 top-1.5 size-1.5 animate-pulse rounded-full bg-rose-500" />}
        </Link>
    );
}

/** Дараалал дахь нэг ажил. */
function QueueRow({ order }: { order: QueueItem }) {
    const s        = stage(order);
    const d        = due(order.days_left);
    const isReturn = order.return_status === 'sent';

    return (
        <Link
            href="/lab/lab-orders"
            className={cn(
                'group relative flex flex-col gap-1.5 py-2 pl-4 pr-3 transition hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-3',
                isReturn && 'bg-rose-50/40 dark:bg-rose-950/10',
            )}
        >
            <span className={cn('absolute inset-y-0 left-0 w-0.5', TONE[s.tone].bar)} />

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <p className="truncate text-[12.5px] font-bold leading-tight transition group-hover:text-violet-600 dark:group-hover:text-violet-400">
                        {order.patient}
                    </p>
                    <Chip tone={s.tone}>{s.label}</Chip>
                    {order.return_count > 1 && <Chip tone="rose">{order.return_count}x</Chip>}
                </div>

                <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                    {[order.work_description, order.doctor_name && `Эмч: ${order.doctor_name}`, order.branch_name]
                        .filter(Boolean).join(' · ')}
                </p>

                {isReturn && order.return_reason && (
                    <p className={cn('mt-0.5 truncate text-[10px]', TONE.rose.text)} title={order.return_reason}>
                        Шалтгаан: {order.return_reason}
                    </p>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Товлосон</p>
                    <p className="text-[11px] font-bold tabular-nums">{order.pickup_date ?? '—'}</p>
                </div>
                {d && <Chip tone={d.tone} icon={Clock}>{d.label}</Chip>}
            </div>
        </Link>
    );
}

/** Ирэх 7 хоногийн жижиг баганан диаграм. */
function Workload({ days }: { days: Props['workload'] }) {
    const max   = Math.max(1, ...days.map((d) => d.count));
    const total = days.reduce((n, d) => n + d.count, 0);

    return (
        <div className="p-3">
            <div className="flex h-20 items-end gap-1">
                {days.map((d) => (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                        <span className={cn('text-[10px] font-bold tabular-nums', d.count === 0 ? 'text-muted-foreground/40' : 'text-foreground')}>
                            {d.count}
                        </span>
                        <div
                            className={cn(
                                'w-full rounded-t transition-all duration-500',
                                d.count === 0 ? 'bg-muted' : d.today ? 'bg-gradient-to-t from-violet-600 to-fuchsia-500' : 'bg-violet-500/45',
                            )}
                            style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
                        />
                    </div>
                ))}
            </div>

            <div className="mt-1.5 flex gap-1 border-t pt-1.5">
                {days.map((d) => (
                    <div key={d.date} className="flex-1 text-center">
                        <p className={cn('text-[9.5px] font-semibold', d.today ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground')}>
                            {d.label}
                        </p>
                        <p className="text-[9px] tabular-nums text-muted-foreground/60">{d.day}</p>
                    </div>
                ))}
            </div>

            <p className="mt-1.5 text-[10px] text-muted-foreground">
                Нийт <b className="font-bold tabular-nums text-foreground">{total}</b> ажил товлогдсон
            </p>
        </div>
    );
}

function MiniStat({ icon: Icon, label, value, tone }: {
    icon: typeof Clock; label: string; value: number; tone: Tone;
}) {
    return (
        <div className="rounded-lg border bg-muted/25 p-2 text-center">
            <span className={cn('mx-auto grid size-6 place-items-center rounded-md', TONE[tone].tile)}>
                <Icon className="size-3" />
            </span>
            <p className="mt-1 text-[15px] font-bold leading-none tabular-nums">{value}</p>
            <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{label}</p>
        </div>
    );
}

function TrainingCell({ label, value, tone }: { label: string; value: number; tone: Tone }) {
    return (
        <div className="rounded-lg border bg-muted/25 px-2.5 py-1.5">
            <p className="truncate text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={cn('text-[15px] font-bold leading-tight tabular-nums', value > 0 ? TONE[tone].text : '')}>{value}</p>
        </div>
    );
}
