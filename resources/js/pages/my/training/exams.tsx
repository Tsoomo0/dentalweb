import {
    MobileBody, MobileCard, MobileEmpty, MobileHero, MobilePill, MobilePills,
    MobileSearch, MobileShell, MobileStatRow, SURFACE,
} from '@/components/my-mobile-ui';
import { Chip, EmptyState, FIELD, TONE, type Tone } from '@/components/lab-training-ui';
import ProgressRing from '@/components/progress-ring';
import MyLayout from '@/layouts/my-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    Award, CalendarClock, CheckCircle2, ChevronRight, Clock, FileQuestion,
    GraduationCap, History, Hourglass, Lock, PlayCircle, RotateCcw, Search,
    Target, X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type State = 'open' | 'upcoming' | 'closed';

interface Exam {
    id: number;
    title: string;
    description: string | null;
    course_title: string | null;
    lesson_id: number | null;
    lesson_title: string | null;
    questions_count: number;
    duration_minutes: number | null;
    pass_percent: number;
    opens_at: string | null;
    closes_at: string | null;
    state: State;
    is_open: boolean;
    best_percent: number | null;
    is_passed: boolean;
    status: string | null;
    last_attempt_at: string | null;
    open_attempt_id: number | null;
}

interface Props {
    exams: Exam[];
    stats: { total: number; open: number; passed: number; pending: number };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Дотоод сургалт', href: '/my/training' },
    { title: 'Шалгалт', href: '/my/training/exams' },
];

type Filter = 'all' | 'open' | 'upcoming' | 'closed' | 'passed';

const FILTERS: { key: Filter; label: string; match: (e: Exam) => boolean }[] = [
    { key: 'all',      label: 'Бүгд',     match: () => true },
    { key: 'open',     label: 'Нээлттэй', match: (e) => e.state === 'open' },
    { key: 'upcoming', label: 'Хугацаа болоогүй', match: (e) => e.state === 'upcoming' },
    { key: 'closed',   label: 'Хугацаа дууссан', match: (e) => e.state === 'closed' },
    { key: 'passed',   label: 'Тэнцсэн',  match: (e) => e.is_passed },
];

/** Төлөв бүрийн өнгө, нэр, тайлбар — хуудсанд бүхэлдээ нэг утгатай байна. */
const GROUPS: { state: State; label: string; tone: Tone; description: string }[] = [
    { state: 'open',     label: 'Нээлттэй', tone: 'violet', description: 'Одоо өгөх боломжтой' },
    { state: 'upcoming', label: 'Хугацаа болоогүй', tone: 'amber', description: 'Нээгдэх хугацаа нь хараахан болоогүй' },
    { state: 'closed',   label: 'Хугацаа дууссан', tone: 'slate', description: 'Хаагдах хугацаа нь өнгөрсөн' },
];

export default function LabExamsIndex({ exams, stats }: Props) {
    const [query, setQuery]   = useState('');
    const [filter, setFilter] = useState<Filter>('all');

    const visible = useMemo(() => {
        const q     = query.trim().toLowerCase();
        const match = (FILTERS.find((f) => f.key === filter) ?? FILTERS[0]).match;

        return exams.filter(
            (e) =>
                match(e) &&
                (q === '' ||
                    e.title.toLowerCase().includes(q) ||
                    (e.course_title ?? '').toLowerCase().includes(q) ||
                    (e.lesson_title ?? '').toLowerCase().includes(q)),
        );
    }, [exams, query, filter]);

    // Төлвөөр нь бүлэглэнэ — нээлттэй нь үргэлж дээрээ
    const groups = GROUPS.map((g) => ({ ...g, items: visible.filter((e) => e.state === g.state) }))
        .filter((g) => g.items.length > 0);

    return (
        <MyLayout breadcrumbs={breadcrumbs}>
            <Head title="Шалгалт" />

            {/* ═══════════════════ MOBILE ═══════════════════ */}
            <MobileExams exams={exams} stats={stats} groups={groups} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} />

            {/* ═══════════════════ DESKTOP ═══════════════════ */}
            <div className="hidden w-full space-y-4 p-4 sm:p-6 md:block lg:p-8 2xl:px-10">
                {/* ── Толгой ─────────────────────────────────────────────── */}
                <section className="relative overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-lg ring-1 ring-white/10">
                    <div className="pointer-events-none absolute -right-28 -top-32 size-[26rem] rounded-full bg-indigo-600/25 blur-[100px]" />
                    <div className="pointer-events-none absolute -bottom-32 left-1/4 size-80 rounded-full bg-violet-500/15 blur-[90px]" />
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                    <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                        <div className="min-w-0 flex-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-200 ring-1 ring-inset ring-white/15 backdrop-blur">
                                <GraduationCap className="size-3" />
                                Лабораторийн сургалт
                            </span>

                            <h1 className="mt-3 bg-gradient-to-br from-white to-white/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-[30px]">
                                Шалгалт
                            </h1>

                            <p className="mt-1 text-sm text-white/45">
                                Хичээлээ үзсэний дараа мэдлэгээ шалгаж, дүнгээ энд хянана.
                            </p>
                        </div>

                        <div className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-4 rounded-2xl bg-white/[0.05] p-4 shadow-inner ring-1 ring-inset ring-white/10 backdrop-blur-md sm:grid-cols-4 sm:p-5">
                            <HeroStat value={stats.open}    label="нээлттэй"    tone={stats.open > 0 ? 'text-violet-300' : undefined} />
                            <HeroStat value={stats.passed}  label="тэнцсэн"     tone={stats.passed > 0 ? 'text-emerald-300' : undefined} />
                            <HeroStat value={stats.pending} label="үнэлж байна" tone={stats.pending > 0 ? 'text-amber-300' : undefined} />
                            <HeroStat value={stats.total}   label="нийт" />
                        </div>
                    </div>
                </section>

                {/* ── Хайлт, шүүлтүүр ────────────────────────────────────── */}
                <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-card p-2 shadow-sm dark:border-gray-800 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Шалгалт хайх…"
                            className={cn(FIELD, 'pl-10 pr-9')}
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition hover:bg-muted"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {FILTERS.map((f) => {
                            const count = exams.filter(f.match).length;

                            return (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                                        filter === f.key
                                            ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/20'
                                            : 'bg-muted/70 text-muted-foreground hover:bg-muted',
                                    )}
                                >
                                    {f.label}
                                    <span className="text-[10px] font-bold tabular-nums opacity-60">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Жагсаалт ───────────────────────────────────────────── */}
                {groups.length === 0 ? (
                    <EmptyState
                        icon={GraduationCap}
                        title={exams.length === 0 ? 'Одоогоор шалгалт байхгүй байна' : 'Илэрц олдсонгүй'}
                        description={
                            exams.length === 0
                                ? 'Шинэ шалгалт нээгдэхэд танд мэдэгдэл болон и-мэйл ирнэ.'
                                : 'Хайлт эсвэл шүүлтүүрээ өөрчилж үзнэ үү.'
                        }
                    />
                ) : (
                    groups.map((group) => (
                        <section
                            key={group.state}
                            className="overflow-hidden rounded-xl border border-gray-200 bg-card shadow-sm dark:border-gray-800"
                        >
                            {/* Бүлгийн толгой */}
                            <header className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-muted/30 px-4 py-3 dark:border-gray-800">
                                <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl shadow-sm', TONE[group.tone].tile)}>
                                    {group.state === 'open' ? <PlayCircle className="size-4.5" />
                                        : group.state === 'upcoming' ? <CalendarClock className="size-4.5" />
                                        : <Lock className="size-4.5" />}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate text-sm font-bold">{group.label}</h2>
                                    <p className="truncate text-[11px] text-muted-foreground">{group.description}</p>
                                </div>

                                <Chip tone={group.tone}>{group.items.length}</Chip>
                            </header>

                            <div className="divide-y divide-gray-200 dark:divide-gray-800">
                                {group.items.map((exam) => <ExamRow key={exam.id} exam={exam} />)}
                            </div>
                        </section>
                    ))
                )}
            </div>
        </MyLayout>
    );
}

/* ── Хэсгүүд ───────────────────────────────────────────────────────────── */

function HeroStat({ value, label, tone }: { value: number; label: string; tone?: string }) {
    return (
        <div className="min-w-0">
            <p className={cn('text-xl font-bold leading-none tabular-nums', tone ?? 'text-white')}>{value}</p>
            <p className="mt-1 truncate text-[10px] uppercase tracking-wide text-white/35">{label}</p>
        </div>
    );
}

/** Мөрийн баруун талын үзүүлэлт — өргөн дэлгэцэд баганаар эгнэнэ. */
function Fact({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
    return (
        <div className="min-w-[78px]">
            <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Icon className="size-3 shrink-0" />
                {label}
            </p>
            <p className="mt-0.5 truncate text-sm font-bold tabular-nums">{value}</p>
        </div>
    );
}

/**
 * Нэг шалгалтын мөр — бүтэн өргөнөөр.
 *
 * Зүүн талд нэр, холбогдох сургалт/хичээл, хугацааны тайлбар; баруун талд
 * үзүүлэлт, дүнгийн бөгж, үйлдэл. Ингэснээр олон шалгалт нэмэгдэхэд ч
 * жагсаалт нь нэг л хэмнэлээр уншигдана.
 */
function ExamRow({ exam }: { exam: Exam }) {
    const accent: Tone = exam.is_passed ? 'emerald'
        : exam.state === 'open' ? 'violet'
        : exam.state === 'upcoming' ? 'amber'
        : 'slate';

    const canStart = exam.is_open;

    // Хугацааны тайлбар — яагаад өгөх боломжтой/боломжгүйг шууд хэлнэ
    const timing = exam.state === 'upcoming' && exam.opens_at ? `Нээгдэх: ${exam.opens_at}`
        : exam.state === 'closed' && exam.closes_at ? `Хаагдсан: ${exam.closes_at}`
        : exam.closes_at ? `Хаагдах: ${exam.closes_at}`
        : null;

    return (
        <Link
            href={`/my/training/exams/${exam.id}`}
            className="group relative flex flex-col gap-4 py-4 pl-5 pr-4 transition hover:bg-muted/40 sm:pl-6 lg:flex-row lg:items-center lg:gap-6"
        >
            {/* Төлвийн өнгөт зураас */}
            <span className={cn('absolute inset-y-0 left-0 w-1', TONE[accent].bar)} />

            {/* Зүүн — нэр, эх сурвалж, хугацаа */}
            <div className="flex min-w-0 flex-1 items-start gap-3.5">
                <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl shadow-sm', TONE[accent].tile)}>
                    {exam.is_passed ? <Award className="size-5" /> : <GraduationCap className="size-5" />}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate font-bold leading-tight transition group-hover:text-violet-600 dark:group-hover:text-violet-400">
                            {exam.title}
                        </p>
                        <StatusChip exam={exam} />
                    </div>

                    {(exam.course_title || exam.lesson_title) && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {[exam.course_title, exam.lesson_title].filter(Boolean).join(' · ')}
                        </p>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {timing && (
                            <span className="flex items-center gap-1">
                                <CalendarClock className="size-3 shrink-0" />
                                {timing}
                            </span>
                        )}
                        {exam.last_attempt_at && (
                            <span className="flex items-center gap-1">
                                <History className="size-3 shrink-0" />
                                Сүүлд: {exam.last_attempt_at}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Баруун — үзүүлэлт, дүн, үйлдэл */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pl-[3.65rem] lg:shrink-0 lg:pl-0">
                <div className="flex items-center gap-6">
                    <Fact icon={FileQuestion} label="Асуулт"  value={String(exam.questions_count)} />
                    <Fact icon={Clock}        label="Хугацаа" value={exam.duration_minutes ? `${exam.duration_minutes} мин` : '∞'} />
                    <Fact icon={Target}       label="Босго"   value={`${exam.pass_percent}%`} />
                </div>

                <div className="ml-auto flex items-center gap-4 lg:ml-0 lg:border-l lg:pl-6">
                    {exam.best_percent !== null && (
                        <div className="flex items-center gap-2">
                            <ProgressRing percent={exam.best_percent} size={40} />
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                миний
                                <br />
                                дүн
                            </span>
                        </div>
                    )}

                    {exam.open_attempt_id ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-amber-500/25">
                            <RotateCcw className="size-3.5" />
                            Үргэлжлүүлэх
                        </span>
                    ) : canStart ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-violet-600/25 transition group-hover:bg-violet-700">
                            <PlayCircle className="size-3.5" />
                            {exam.best_percent !== null ? 'Дахин өгөх' : 'Шалгалт өгөх'}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition group-hover:text-foreground">
                            Дэлгэрэнгүй
                            <ChevronRight className="size-4" />
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}

/** Нэрийн хажуугийн жижиг төлөв. */
function StatusChip({ exam }: { exam: Exam }) {
    if (exam.status === 'submitted') return <Chip tone="amber" icon={Hourglass}>Үнэлж байна</Chip>;
    if (exam.is_passed)              return <Chip tone="emerald" icon={CheckCircle2}>Тэнцсэн</Chip>;
    if (exam.state === 'upcoming')   return <Chip tone="amber" icon={Clock}>Хугацаа болоогүй</Chip>;
    if (exam.state === 'closed')     return <Chip tone="slate" icon={Lock}>Хугацаа дууссан</Chip>;

    return <Chip tone="violet" icon={PlayCircle}>Нээлттэй</Chip>;
}

/* ══════════════════════ MOBILE ══════════════════════ */
/**
 * HR хэсгийн бусад хуудасны загвар: улаан hero + шилэн үзүүлэлт, дараа нь
 * цагаан картан доторх мөрүүд.
 *
 * Ширээний мөр нь нэрийг зүүнд, гурван үзүүлэлт, дүнгийн бөгж, үйлдлийг
 * баруунд нэг эгнээнд тавьдаг — утсан дээр тэр нь шахагдаж уншигдахгүй болно.
 * Тиймээс энд хоёр давхар болгож: дээд мөрөнд нэр ба төлөв, доод мөрөнд
 * үзүүлэлт ба үйлдэл.
 */
function MobileExams({ exams, stats, groups, query, setQuery, filter, setFilter }: {
    exams: Exam[];
    stats: Props['stats'];
    groups: { state: State; label: string; tone: Tone; description: string; items: Exam[] }[];
    query: string;
    setQuery: (v: string) => void;
    filter: Filter;
    setFilter: (f: Filter) => void;
}) {
    const VIOLET = '#7c3aed';

    return (
        <MobileShell>
            <MobileHero
                eyebrow="HR · ШАЛГАЛТ"
                titleBold="Миний "
                titleLight="шалгалт"
                subtitle="Хичээлээ үзсэний дараа мэдлэгээ шалгаж, дүнгээ энд хянана."
            >
                <MobileStatRow
                    items={[
                        { val: stats.open,   label: 'нээлттэй',    dot: stats.open > 0 ? '#c4b5fd' : 'rgba(255,255,255,0.4)' },
                        { val: stats.passed, label: 'тэнцсэн',     dot: stats.passed > 0 ? '#4ade80' : 'rgba(255,255,255,0.4)' },
                        { val: stats.total,  label: 'нийт шалгалт', dot: 'rgba(255,255,255,0.45)' },
                    ]}
                />
            </MobileHero>

            <MobileBody>
                <MobileSearch value={query} onChange={setQuery} placeholder="Шалгалт хайх..." />

                <MobilePills>
                    {FILTERS.map((f) => (
                        <MobilePill
                            key={f.key}
                            active={filter === f.key}
                            color={VIOLET}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label} <span style={{ opacity: 0.7 }}>{exams.filter(f.match).length}</span>
                        </MobilePill>
                    ))}
                </MobilePills>

                {groups.length === 0 ? (
                    <MobileEmpty
                        icon={<GraduationCap size={28} color="#c4b5fd" />}
                        tint="#faf5ff"
                        title={exams.length === 0 ? 'Шалгалт байхгүй' : 'Илэрц олдсонгүй'}
                        text={exams.length === 0
                            ? 'Шинэ шалгалт нээгдэхэд танд мэдэгдэл ирнэ'
                            : 'Хайлт эсвэл шүүлтээ өөрчилж үзнэ үү'}
                    />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {groups.map((group) => {
                            const gc = group.state === 'open' ? VIOLET
                                : group.state === 'upcoming' ? '#d97706'
                                : '#64748b';

                            return (
                                <div key={group.state}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, paddingLeft: 2 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: gc, flexShrink: 0 }} />
                                        <p style={{ fontSize: 11, fontWeight: 800, color: gc, letterSpacing: 0.5, margin: 0, flex: 1 }}>
                                            {group.label}
                                        </p>
                                        <p style={{ fontSize: 10.5, color: SURFACE.faint, margin: 0, fontWeight: 700 }}>{group.items.length}</p>
                                    </div>

                                    <MobileCard>
                                        {group.items.map((exam, i) => (
                                            <MobileExamRow
                                                key={exam.id}
                                                exam={exam}
                                                last={i === group.items.length - 1}
                                                accent={gc}
                                            />
                                        ))}
                                    </MobileCard>
                                </div>
                            );
                        })}
                    </div>
                )}
            </MobileBody>
        </MobileShell>
    );
}

function MobileExamRow({ exam, last, accent }: { exam: Exam; last: boolean; accent: string }) {
    const passed = exam.is_passed;
    const tint   = passed ? '#059669' : accent;

    // Юу хийхээ нэг л үгээр — товч нь мөрийн хамгийн баруун доод булан дээр
    const action = exam.open_attempt_id ? { label: 'Үргэлжлүүлэх', bg: '#d97706' }
        : exam.is_open ? { label: exam.best_percent !== null ? 'Дахин өгөх' : 'Шалгалт өгөх', bg: '#7c3aed' }
        : null;

    const timing = exam.state === 'upcoming' && exam.opens_at ? `Нээгдэх: ${exam.opens_at}`
        : exam.state === 'closed' && exam.closes_at ? `Хаагдсан: ${exam.closes_at}`
        : exam.closes_at ? `Хаагдах: ${exam.closes_at}`
        : null;

    return (
        <Link href={`/my/training/exams/${exam.id}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ padding: '13px 14px', borderBottom: last ? 'none' : `1px solid ${SURFACE.divider}` }}>
                {/* Дээд мөр — нэр ба төлөв */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 14, background: `${tint}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {passed ? <Award size={19} color={tint} /> : <GraduationCap size={19} color={tint} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: SURFACE.strong, margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {exam.title}
                            </p>
                            <MobileStatusTag exam={exam} />
                        </div>

                        {(exam.course_title || exam.lesson_title) && (
                            <p style={{ fontSize: 11, color: SURFACE.faint, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {[exam.course_title, exam.lesson_title].filter(Boolean).join(' · ')}
                            </p>
                        )}

                        {timing && (
                            <p style={{ fontSize: 11, color: SURFACE.faint, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CalendarClock size={10} />
                                {timing}
                            </p>
                        )}
                    </div>

                    {exam.best_percent !== null && (
                        <div style={{ flexShrink: 0, textAlign: 'center' }}>
                            <p style={{ fontSize: 17, fontWeight: 900, color: passed ? '#059669' : SURFACE.muted, margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                                {exam.best_percent}%
                            </p>
                            <p style={{ fontSize: 8.5, color: SURFACE.faint, margin: '3px 0 0', fontWeight: 700, letterSpacing: 0.3 }}>МИНИЙ ДҮН</p>
                        </div>
                    )}
                </div>

                {/* Доод мөр — үзүүлэлт ба үйлдэл */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, paddingLeft: 53 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <MobileFact icon={<FileQuestion size={11} />} value={String(exam.questions_count)} label="асуулт" />
                        <MobileFact icon={<Clock size={11} />} value={exam.duration_minutes ? `${exam.duration_minutes}` : '∞'} label={exam.duration_minutes ? 'мин' : ''} />
                        <MobileFact icon={<Target size={11} />} value={`${exam.pass_percent}%`} label="босго" />
                    </div>

                    {action ? (
                        <span style={{ flexShrink: 0, background: action.bg, color: 'white', borderRadius: 99, padding: '7px 14px', fontSize: 11.5, fontWeight: 800 }}>
                            {action.label}
                        </span>
                    ) : (
                        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, fontSize: 11.5, fontWeight: 700, color: SURFACE.faint }}>
                            Дэлгэрэнгүй
                            <ChevronRight size={13} />
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}

function MobileFact({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: SURFACE.faint, flexShrink: 0 }}>
            {icon}
            <span style={{ fontSize: 11.5, fontWeight: 800, color: SURFACE.muted, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
            {label && <span style={{ fontSize: 10.5 }}>{label}</span>}
        </span>
    );
}

/** Нэрийн хажуугийн жижиг төлөв — утсанд зай багатай тул зөвхөн онцлохыг нь. */
function MobileStatusTag({ exam }: { exam: Exam }) {
    const tag = exam.status === 'submitted' ? { label: 'Үнэлж байна', fg: '#b45309', bg: '#fef3c7' }
        : exam.is_passed ? { label: 'Тэнцсэн', fg: '#047857', bg: '#d1fae5' }
        : exam.state === 'upcoming' ? { label: 'Болоогүй', fg: '#b45309', bg: '#fef3c7' }
        : exam.state === 'closed' ? { label: 'Дууссан', fg: '#475569', bg: 'var(--my-pill-bg)' }
        : null;

    if (!tag) return null;

    return (
        <span style={{ flexShrink: 0, background: tag.bg, color: tag.fg, borderRadius: 99, padding: '2px 7px', fontSize: 9.5, fontWeight: 800 }}>
            {tag.label}
        </span>
    );
}
